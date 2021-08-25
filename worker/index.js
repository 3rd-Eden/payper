const format = require('../utils/format.js');
const matches = require('../utils/matches');
const extract = require('../utils/extract');
const CacheStorage = require('./cache.js');

/**
 * The Payper Service Worker is our request optimization strategy. It allows
 * each page to define the bundles they need to render/interact with the page
 * without having to worry about creating too large bundle which potentially
 * contains code the current page doesn't need or having to worry about too many
 * small bundles as they will be reduced to a single HTTP request.
 *
 * The Service Worker intercepts requests for the `/payper` scope and checks
 * which bundles are requested to be concatenated. From all those bundles it
 * checks which are already cached locally, and removes them from the original
 * request. Only the bundles that are not cached will be requested resulting in
 * less bytes over the wire. Once the request is completed all the new bundles
 * are cached and the full response (including the previously cached bundles) is
 * returned to the browser.
 *
 * @class PayperWorker
 * @public
 */
class PayperWorker {
  /**
   * Creates a new Payper instance.
   *
   * @param {String} version The version of the cache we want to use.
   * @param {String} path The path the `payper/server` is working on.
   * @param {Number} ttl Milliseconds indicating how long stale items are kept
   * @public
   */
  constructor({ version='0.0.0', path='payper', ttl=2.628e+9 } = {}) {
    this.cache = new CacheStorage(version);
    this.settings = { ttl, path };

    this.format = format.bind(path);
    this.matches = matches.bind(path);
    this.extract = extract.bind(path);
  }

  /**
   * When our Service Worker is used as standalone we need to assign the
   * listeners so we can start intercepting
   *
   * @public
   */
  register() {
    [
      'fetch',        // Intercept the requests.
      'activate',     // Clean our caches.
      'install',      // Speeds up activation of our Service Worker.
      'message',      // Listens to postMessage to cache executed bundles.
    ].forEach(method => self.addEventListener(method, this[method].bind(this)));
  }

  /**
   * Listen to the `postMessage` message event. This allows developers to
   * communicate with the worker and interact with the exposed API.
   *
   * @param {ExtendableMessageEvent} event Service Worker's incoming message.
   * @private
   */
  async message(event) {
    if (!event.data || typeof event.data !== 'object') return;

    switch (event.data.type) {
      //
      // On the first visit of the page the Service Worker will not be loaded
      // yet so the requested bundles will be downloaded and executed normally.
      // In order to still cache the contents without having to make another
      // HTTP request the response will include this "postMessage" call to the
      // Service Worker with contents of the bundle so it can be cached.
      //
      case 'payper:paste':
        const fresh = this.parse(event.data.contents);
        event.waitUntil(this.cache.fill(fresh));
      break;
    }
  }

  /**
   * The Service Worker was installed, so we want to notify the Service Worker
   * that we should be activated as soon as possible to be able to intercept and
   * transform the outgoing Payper requests.
   *
   * @private
   */
  install() {
    //
    // Normally a Service Worker would only activate on install after a refresh
    // but want to enhance the requests as quickly as possible so we can start
    // building our cache and "improve" the next visit.
    //
    self.skipWaiting();
  }

  /**
   * The Service Worker has become active, we want to purge the cache to see if
   * anything needs invalidation.
   *
   * @private
   */
  async activate() {
    self.clients.claim();

    //
    // Calling the `event.waitUntil` during the `activation` phase could cause
    // Service Workers to buffer the `push` and more importantly, the `fetch`
    // events until passed Promises settles. Old or state cache does not affect
    // the functioning of our code. If the cache version is increased we're
    // going to have a clean cache anyways, and the invalidation pass will only
    // evict old cached items to be "nice" for our users devices. The bundles
    // that we store have individual versioning assigned to them for
    // cache-busting reasons.
    //
    await this.cache.clean();
    await this.cache.invalidate(this.settings.ttl);
  }

  /**
   * Handle the fetch event of the service worker.
   *
   * @param {FetchEvent} event Incoming fetch event.
   * @private
   */
  fetch(event) {
    if (!this.matches(event.request)) return;
    event.respondWith(this.concat(event));
  }

  /**
   * Concatenate all requested bundles into a single response.
   *
   * @param {FetchEvent} event Fetch event.
   * @returns {Response} Response for the Service Worker, guaranteed.
   * @public
   */
  async concat(event) {
    const url = event.request.url;
    let response

    //
    // Our request handler **always** returns something useful. In case of
    // a successful execution it will return the parsed information and in case
    // on error that happens during fetching, or parsing it will return the
    // original response that we made or a new response.
    //
    try {
      response = await this.request(url);
    } catch (failure) {
      return failure;
    }

    const { fresh, requested } = response;

    //
    // Now that we have all the freshly requested bundles we want to gather the
    // previously cached bundles (if they exist) so we can assemble a full
    // response.
    //
    const old = requested.filter((data) => !(data.bundle in fresh));
    const cached = await this.cache.gather(old);

    //
    // By using the `requested` array as map we can guarantee that the files are
    // included in exactly the same order as the original HTTP requested in case
    // ordering matters for the execution of the bundles.
    //
    const responses = await Promise.all(requested.map(async function merge(data) {
      if (data.bundle in cached) {
        return await cached[data.bundle].response.text();
      }

      //
      // Fresh responses need to be cloned as the same object of data is going
      // to be passed into our cache storage which assumes that the responses
      // are not yet consumed.
      //
      return await fresh[data.bundle].response.clone().text();
    }));

    //
    // Update the cache with the freshly requested bundles so we can do a fully
    // requested and tag all old request for a cache hit.
    //
    event.waitUntil(
      Promise.all([
        this.cache.fill(fresh),
        this.cache.hit(old)
      ])
    );

    const contents = new Blob(responses, { type: 'text/javascript'});
    return new Response(contents, {
      statusText: 'OK',
      status: 200,

      //
      // Introduce an additional set of headers to provide some information
      // on how the response was constructed.
      //
      headers: {
        'payper-requested': requested.map(({ bundle }) => bundle).join(','),
        'payper-fetched': Object.keys(fresh).join(',') || 'none',
        'payper-cached': Object.keys(cached).join(',') || 'none'
      }
    });
  }

  /**
   * Requests the missing bundles from the given URL and returns them as parsed
   * chunks so the be cached later if required.
   *
   * @param {String} url The original URL that we've intercepted.
   * @returns {Object} Object containing requested, missing bundles and chunks
   * @private
   */
  async request(url) {
    let fresh = {};
    const requested = this.extract(url)
    const missing = await this.cache.missing(requested);

    //
    // In the case where we everything cached, we want to return early so no
    // empty request is made to the server as this would result in /payper/
    // request without any bundle data.
    //
    if (!missing.length) return { requested, fresh };

    const bundles = missing.map(({ bundle }) => bundle);
    const payperapi = this.format(bundles, url);
    const response = await fetch(payperapi);

    try {
      //
      // The clone is an optimization because the calling the `text method
      // "consumes" the response meaning that it cannot be re-used again.
      // We want to keep the original fetched response as backup when for some
      // reason our request building fails.
      //
      const contents = await response.clone().text();
      fresh = this.parse(contents);
    } catch (e) {
      //
      // We are unable to create an optimized Payper bundle request so we must
      // assume the worse case scenario and fall back to the full bundle
      // request. We'll try later again, or not. At least the site will
      // continue to function. As optimization we can check if the requested URL
      // is the same as our optimized URL because then we can just return the
      // previous response.
      if (url === payperapi) throw response;
      throw await fetch(url);
    }

    return { requested, fresh };
  }

  /**
   * Parses the multi bundle response into smaller chunks which all represent
   * a single bundle as payload so they can be individually addressed in the
   * cache to promote re-use of bundles across multiple requests.
   *
   * @param {String} contents The HTTP response.
   * @returns {Object} Parsed bundles mapped by bundle.
   * @private
   */
  parse(contents) {
    const chunks = {};
    const iff = '(function __payper__wrap__() {';
    const comment = /\/\*! Payper meta\(["{}:,\._\-a-z0-9]+\) \*\//i

    //
    // Our parser assumes that **everything** above the /* Payper meta() */
    // comment is part of the bundle, so when we wrap our bundle with an IFF
    // this is seen as part of the first bundle leading to JS errors. So we
    // to remove this from the contents.
    //
    // We don't need to worry about the contents that are included at the
    // bottom of our IFF as that gets ignored automatically by the parser
    // as there is no /* Payper meta() */ comment following it.
    //
    if (contents.startsWith(iff)) {
      contents = contents.slice(iff.length);
    }

    //
    // This indicates where the beginning of the bundle is. And increases once
    // our bundle separator has been detected so a new bundle could be formed.
    //
    let start = 0;
    const lines = contents.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (!comment.test(lines[i])) continue;

      const end = i + 1;
      const data = lines.slice(start, end).join('\n');
      const metadata = /meta\(([^)]+?)\)/.exec(lines[i])[1];
      const blob = new Blob([data], { type: 'text/javascript'});
      const response = new Response(blob, { status: 200, statusText: 'OK' });
      const { name, version, cache } = JSON.parse(metadata);
      const bundle = `${name}@${version}`;

      //
      // Include the meta data, bundle name, and data as chunk information so we
      // have enough information to construct a single API response.
      //
      chunks[bundle] = { name, version, bundle, response, cache: !!cache };
      start = end;
    }

    return chunks;
  }
}

//
// Expose the worker interface so it can be consumed by test suites.
//
module.exports = PayperWorker;
