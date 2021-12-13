const matches = require('../utils/matches.js');
const extract = require('../utils/extract.js');
const format = require('../utils/format.js');
const CacheStorage = require('./cache.js');
const id = require('../utils/id.js');

/**
 * The Payper ServiceWorker is our request optimization strategy. It allows
 * each page to define the bundles they need to render/interact with the page
 * without having to worry about creating too large bundle which potentially
 * contains code the current page doesn't need or having to worry about too many
 * small bundles as they will be reduced to a single HTTP request.
 *
 * The ServiceWorker intercepts requests for the `/payper` scope and checks
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
  constructor(custom) {
    const settings = this.config(custom);
    const path = settings.path;

    this.cache = new CacheStorage(settings);
    this.settings = settings;

    this.matches = matches.bind(path);
    this.extract = extract.bind(path);
    this.format = format.bind(path);
  }

  /**
   * Generates the our base configuration by taking the developers provided
   * configuration, any querystring based configuration on our SW file and
   * our base configuration, and merging it into one single config.
   *
   * @param {Object} [custom={}] Custom configuration.
   * @returns {Object} Merged configuration.
   * @private
   */
  config(custom = {}) {
    const url = new URL(location);
    const params = Object.fromEntries(url.searchParams);

    return Object.assign({
      type:'text/javascript',     // We're a JavaScript loader by default.
      version:'0.0.0',            // Controls the cache version.
      path:'payper',              // Path prefix.
      ttl:2.628e+9,               // Month represented in ms.
      root: ''                    // Root domain we force our cache under.
    }, params, custom);
  }

  /**
   * Our ServiceWorker only works when it's listening to specific ServiceWorker
   * events. This method registers those listeners so we can start intercepting
   * the events. The following listeners can be added:
   *
   * - fetch: Intercept the requests.
   * - activate: Clean our caches.
   * - install: Speeds up activation of our ServiceWorker.
   * - message: Listens to postMessage to cache executed bundles.
   *
   * When no listeners are provided as argument, we will assign all of our
   * required listeners.
   *
   * @param {Array} [listeners] Listeners that we should interact with.
   * @public
   */
  register(listeners = ['fetch', 'activate', 'install', 'message']) {
    listeners.forEach(method => self.addEventListener(method, this[method].bind(this)));
  }

  /**
   * Listen to the `postMessage` message event. This allows developers to
   * communicate with the worker and interact with the exposed API.
   *
   * @param {ExtendableMessageEvent} event ServiceWorker's incoming message.
   * @returns {Boolean} Indication that message is handled by Payper.
   * @public
   */
  async message(event) {
    const { data } = event;
    const { root } = this.settings;

    if (
       !data
    || typeof data !== 'object'
    || typeof data.type !== 'string'
    || !data.type.startsWith('payper:')) return false;

    switch (data.type) {
      //
      // On the first visit of the page the ServiceWorker will not be loaded
      // yet so the requested bundles will be downloaded and executed normally.
      // In order to still cache the contents without having to make another
      // HTTP request the response will include this "postMessage" call to the
      // ServiceWorker with contents of the bundle so it can be cached.
      //
      case 'payper:raw':
        const fresh = this.parse(data.payload);
        event.waitUntil(this.cache.fill(fresh, root || data.base));
      break;

      //
      // Allow requests to be pre-fetched/cached by the ServiceWorker so
      // future bundle requests can be served from cache as well.
      //
      case 'payper:precache':
        const { fetched } = await this.request(data.payload);
        if (fetched) event.waitUntil(this.cache.fill(fetched, root || data.payload));
      break;
    }

    return true;
  }

  /**
   * The ServiceWorker was installed, so we want to notify the ServiceWorker
   * that we should be activated as soon as possible to be able to intercept and
   * transform the outgoing Payper requests.
   *
   * @private
   */
  install() {
    //
    // Normally a ServiceWorker would only activate on install after a refresh
    // but want to enhance the requests as quickly as possible so we can start
    // building our cache and "improve" the next visit.
    //
    self.skipWaiting();
  }

  /**
   * The ServiceWorker has become active, we want to purge the cache to see if
   * anything needs invalidation.
   *
   * @private
   */
  async activate() {
    self.clients.claim();

    //
    // Calling the `event.waitUntil` during the `activation` phase could cause
    // ServiceWorkers to buffer the `push` and more importantly, the `fetch`
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
    if (!this.matches(event.request)) return false;

    event.respondWith(this.respond(event));
    return true;
  }

  /**
   * Concatenate all requested bundles into a single response.
   *
   * @param {FetchEvent} event Fetch event.
   * @returns {Response} Response for the ServiceWorker, guaranteed.
   * @public
   */
  async respond(event) {
    const { root } = this.settings;
    const url = event.request.url;
    let data;

    try {
      data = await this.request(url, 'text');
    } catch (failure) {
      return failure;
    }

    //
    // Update the cache with the freshly requested bundles so we can do a fully
    // requested and tag all old request for a cache hit.
    //
    event.waitUntil(
      Promise.all([
        this.cache.fill(data.fetched, root || url),
        this.cache.hit(Object.keys(data.cached), root || url)
      ])
    );

    const contents = new Blob(await Promise.all(data.responses), {
      type: this.settings.type
    });

    return new Response(contents, {
      headers: this.headers(data),
      statusText: 'OK',
      status: 200
    });
  }

  /**
   * Generate Payper specific headers that gives developers some additional
   * information about the request and response were processed by Payper.
   *
   * The Server-Timing header is used as this also allows the browser to read
   * out these values using the `Performance.getEntries` API.
   *
   * @param {Object} data Object containing the data required for the headers.
   * @returns {Object}
   * @private
   */
  headers({ fetched, requested, cached, timing }) {
    return {
      'Content-Type': this.settings.type,
      'Server-Timing': [
        `requested;desc="${requested.map(({ bundle }) => bundle).join(',')}";dur=0`,
        `fetched;desc="${Object.keys(fetched).join(',') || 'none'}";dur=${timing.fetched || 0}`,
        `cached;desc="${Object.keys(cached).join(',') || 'none'}";dur=${timing.cached || 0}`
      ].join(',')
    };
  }

  /**
   * Requests the missing bundles from the given URL and returns them as parsed
   * chunks so the be cached later if required.
   *
   * @param {String} url The original URL that we've intercepted.
   * @param {String} [type='text'] The response type that was requested.
   * @returns {Object} Object containing requested, missing bundles and chunks.
   * @private
   */
  async request(url, type='text') {
    let fetched = {};
    let now = Date.now();

    const { root } = this.settings;
    const requested = this.extract(url);
    const cached = await this.cache.read(requested, root || url);
    const missing = requested.filter(({ bundle }) => !(bundle in cached));
    const timing = { cached: Date.now() - now };

    if (missing.length) {
      now = Date.now();
      const bundles = missing.map(({ bundle }) => bundle);
      const payperapi = this.format(bundles, url);
      const response = await fetch(payperapi);

      try {
        //
        // The clone is an optimization because the calling the `text method
        // "consumes" the response meaning that it cannot be re-used again. We
        // want to keep the original fetched response as backup when for some
        // reason our request building fails.
        //
        const contents = await response.clone().text();
        fetched = this.parse(contents);
      } catch (e) {
        //
        // We are unable to create an optimized Payper bundle request so we must
        // assume the worse case scenario and fall back to the full bundle
        // request. We'll try later again, or not. At least the site will
        // continue to function. As optimization we can check if the requested
        // URL is the same as our optimized URL because then we can just return
        // the previous response.
        //
        if (url === payperapi) throw response;
        throw await fetch(url);
      }

      timing.fetched = Date.now() - now;
    }

    //
    // By using the `requested` array as map we can guarantee that the files are
    // included in exactly the same order as the original HTTP requested in case
    // ordering matters for the execution of the bundles.
    //
    const responses = requested.map(function merge({ bundle }) {
      //
      // Fresh responses need to be cloned as the same object of data is going
      // to be passed into our cache storage which assumes that the responses
      // are not yet consumed.
      //
      const response = bundle in cached
      ? cached[bundle].response
      : fetched[bundle].response.clone()

      return response[type]();
    });

    return { requested, fetched, cached, responses, timing };
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

    //
    // Our parser assumes that **everything** above the /* Payper meta() */
    // comment is part of the bundle, so when we wrap our bundle with an IFFE
    // this is seen as part of the first bundle leading to JS errors. So we
    // to remove this from the contents.
    //
    // We don't need to worry about the contents that are included at the
    // bottom of our IFFE as that gets ignored automatically by the parser
    // as there is no /* Payper meta() */ comment following it.
    //
    contents = contents.replace(PayperWorker.iffe, '');

    //
    // This indicates where the beginning of the bundle is. And increases once
    // our bundle separator has been detected so a new bundle could be formed.
    //
    let start = 0;
    const lines = contents.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (!PayperWorker.comment.test(lines[i])) continue;

      const end = i + 1;
      const data = lines.slice(start, end).join('\n');
      const metadata = /meta\(([^)]+?)\)/.exec(lines[i])[1];
      const blob = new Blob([data], { type: this.settings.type });
      const response = new Response(blob, { status: 200, statusText: 'OK' });
      const { name, version, cache } = JSON.parse(metadata);
      const bundle = id(name, version);

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

/**
 * Detects the IFFE wrapper from the Payper Server.
 *
 * @type {RegExp}
 * @private
 */
PayperWorker.iffe = /^\(?function __PAYPER_IFFE_BUNDLE_WRAPPER__\(\)\s\{/;

/**
 * Detects the meta comment which contains the bundle information.
 *
 * @type {RegExp}
 * @private
 */
PayperWorker.comment = /\/\*! Payper meta\(["{}:,\._\@\-a-z0-9]+\) \*\//i;

//
// Expose the worker interface so it can be consumed by test suites.
//
module.exports = PayperWorker;
