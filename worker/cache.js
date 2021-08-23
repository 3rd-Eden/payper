const format = require('../utils/format.js');

/**
 * Normalized `cache.match(url, opts)` options so we don't have to write it
 * multiple times because I'm lazy.
 *
 * @type {Object}
 * @private
 */
const matchOpts = {
  ignoreVary: true,     // We have a custom invalidation process.
  ignoreMethod: true,   // By all means, give us content.
  ignoreSearch: true    // Technically not needed due to full URL control.
};

/**
 * CacheStorage provides an interface that allows optimization of various
 * CacheStorage API related tasks within a Service Worker context.
 *
 * @class CacheStorage
 * @public
 */
class CacheStorage {
  constructor(version = '0.0.0') {
    this.name = `payper@${version}`;
    this.version = version;
    this.format = format;
  }

  /**
   * Searches the CacheStorage API for out of date cache versions and deletes
   * them. This will only delete the caches that are created by this module, not
   * our users caches.
   *
   * @public
   */
  async clean() {
    const keys = await caches.keys();
    const current = this.version;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[0];

      if (key.startsWith('payper@') && key.split('@')[0] !== current) {
        await caches.delete(key);
      }
    }
  }

  /**
   * Check which of the requested bundles are not cached by our service worker
   * and needs to be forwarded to the API point. This allows us to make smaller
   * requests as certain bundles might already be cached by this system.
   *
   * @param {Array} requested Array with name/version objects.
   * @returns {Array} List of names/values that are not in our cache.
   * @public
   */
  async missing(requested) {
    const cache = await caches.open(this.name);

    const bundles = await Promise.all(requested.map(async (data) => {
      const has = await cache.match(this.format(data.bundle), matchOpts);
      return has ? null : data;
    }));

    return bundles.filter(Boolean);
  }

  /**
   * Gather all the requested cached items.
   *
   * @param {Array} requested Array with name/version objects.
   * @returns {Object} All the responses.
   * @public
   */
  async gather(requested) {
    const cache = await caches.open(this.name);

    const bundles = await Promise.all(requested.map(async (data) => {
      const response = await cache.match(this.format(data.bundle), matchOpts);

      if (!response) return;
      return { ...data, response };
    }));

    this.hit(requested);

    return bundles.filter(Boolean).reduce(function toObject(result, data) {
      result[data.bundle] = data;
      return result;
    }, {});
  }

  /**
   * Update the requested bundles with a fresh `payper-hit` header where the
   * value is the current EPOCH so it can be used later for cache invalidation.
   *
   * @param {Array} requested Array with name/version objects.
   * @private
   */
  async hit(requested) {
    const cache = await caches.open(this.name);

    requested.map(async (data) => {
      const url = this.format(data.bundle);
      const response = await cache.match(url, matchOpts);

      if (!response) return;

      //
      // This is where the magic happens. We're introducing a new header to the
      // response object that will allow us to track when the asset was used for
      // the last time. This allows us to iterate over the cache and evict items
      // based on a predefined TTL. This ensures that the most requested items
      // will stay in our cache and edge cases might be discarded to conserve
      // space on user devices.
      //
      // Once the alterations to the header have been made we update our cache
      // again so it's stored with the request and can be asserted later. It's
      // worth noting that do NEED a fresh response instance that not yet has
      // been consumed (res.text() etc used) in order to store it.
      //S
      // With this setup we assume that cache interaction is CHEAP. If this is
      // no longer the case we might need to adopt a secondary cache in
      // IndexedDB.
      //
      response.headers.set('payper-hit', Date.now());
      await cache.put(url, response);
    });
  }

  /**
   * Add the newly requested bundles to the cache so service worker can start
   * assembling responses from the cache.
   *
   * @param {Object} bundles Object containing
   * @public
   */
  async fill(bundles) {
    const cache = await caches.open(this.name);

    await Promise.all(Object.keys(bundles).map((bundle) => {
      const chunk = bundles[bundle];
      if (!chunk.cache) return;

      const url = this.format(bundle);

      chunk.response.headers.set('payper-hit', Date.now());
      return cache.put(url, chunk.response);
    }));
  }

  /**
   * Run through the existing list of cache items and figure out if we need to
   * remove items from the cache. This allows us to be more mindful of our users
   * storage.
   *
   * @param {Number} ttl The Time To Live of a given item in the cache in ms.
   * @private
   */
  async invalidate(ttl) {
    const cache = await caches.open(this.name);
    const keys = await cache.keys();
    const now = Date.now();

    keys.forEach(async function checkKeys(url) {
      const response = await cache.match(url, matchOpts);
      const hit = +response.headers.get('payper-hit');

      if (!hit || now - hit > ttl) {
        await cache.delete(url, matchOpts);
      }
    });
  }
}

//
// Expose our caching layer.
//
module.exports = CacheStorage;
