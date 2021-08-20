const format = require('../utils/format.js');
const matches = require('../utils/matches');
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
class Payper {
  constructor({ version, ttl } = {}) {
    this.cache = new CacheStorage(version);
    this.settings = { ttl };
    this.format = format;
    this.matches = matches;
  }

  /**
   * When our Service Worker is used as standalone we need to assign the
   * listeners so we can start intercepting
   *
   * @public
   */
  register() {
    [
      'fetch',
      'activate'
    ].forEach(method => self.addEventListener(method, this[method].bind(this)));
  }

  /**
   * The ServiceWorker has become active, we want to purge the cache to see if
   * anything needs invalidation.
   *
   * @param {ActivationEvent} event
   * @private
   */
  activate(event) {
    event.waitUntil(
      this.cache.clean().then(this.cache.invalidate(this.settings.ttl))
    );
  }

  /**
   * Handle the fetch event of the service worker.
   *
   * @param {FetchEvent} event Incoming fetch event.
   * @private
   */
  fetch(event) {
    const { request } = event;

    event.respondWith(async () => {
      const requested = this.extract(request.url);

      if (!this.matches(request) || !requested.length) return fetch(request);

      const missing = await this.cache.missing(requested);

      if (missing.length) {
        try {
          await this.preload(missing, { url: request.url });
        } catch (e) {
          //
          // We are unable to create an optimized Payper bundle request so we must
          // assume the worse case scenario and fall back to the full bundle
          // request. We'll try later again, or not. At least the site will
          // continue to function.
          //
          return fetch(request);
        }
      }

      return this.respond(requested);
    });
  }

  /**
   * Request the missing bundles from the API. If we had any cache hits we've
   * successfully reduced additional bytes over the wire.
   *
   * @param {Array} missing List of missing packages that need to be requested.
   * @param {String} url The root URL which we request.
   * @private
   */
  async preload(missing, { url }) {
    const bundles = missing.map(({ bundle }) => bundle);
    let response = await fetch(this.format(bundles, url));

    if (!response.ok || !(response.status < 400)) {
      throw new Error('Unable to fetch the optimized payer bundle');
    }

    const contents = await response.text();
    const chunks = this.parse(contents);

    await this.cache.fill(chunks);
  }

  /**
   * Craft a custom cache response based on the requested bundles. This assumes
   * that all bundles were previously cached by the system in order to return a
   * full response.
   *
   * @returns {Response} The cached bundles.
   * @private
   */
  async respond(requested) {
    const files = await this.cache.gather(requested);
    const contents = new Blob(files, { type: 'text/javascript'});

    return new Response(contents, { status: 200, statusText: 'OK' });
  }

  /**
   * Parses the multi bundle response into smaller chunks which all represent
   * a single bundle as payload so they can be individually addressed in the
   * cache to promote re-use of bundles across multiple requests.
   *
   * @param {String} contents The HTTP response.
   * @returns {Array} Parsed bundles.
   * @private
   */
  parse(contents) {
    const chunks = [];
    const comment = '/*! Payper meta(';

    let start = contents.indexOf(comment);

    while (!!~start) {
      const end = contents.indexOf('\n', start);
      const meta = contents.slice(start, end);
      const blob = new Blob([contents.slice(0, end)], { type: 'text/javascript'});
      const response = new Response(blob, { status: 200, statusText: 'OK' })

      const metadata = /meta\(([^)]+?)\)/.exec(meta)[1];
      const { name, version, cache } = JSON.parse(meta);
      const bundle = `${name}@${version}`;

      //
      // Include the meta data, bundle name, and data as chunk information so we
      // have enough information to construct a single API response.
      //
      if (cache) chunks.push({ name, version, bundle, response });

      //
      // Remove the discovered bundle from the contents and search for the next
      // index of our meta comment.
      //
      contents = contents.slice(end + 1);
      start = contents.indexOf(comment);
    }

    return chunks;
  }
}

//
// Expose the worker interface so it can be consumed by test suites.
//
module.exports = Payper;
