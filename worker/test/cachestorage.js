/**
 * Polyfill for the `caches` API that is available in browsers. But instead of
 * persisting data we just cache it using a Map() as this is only meant for
 * testing purposes.
 *
 * NOTE that does not 100% match the specification. It's simply here to
 * polyfill API that we're using so we can test our Service Worker logic.
 *
 * @constructor
 */
class Caches {
  constructor() {
    this.storage = new Map();
  }

  /**
   * Returns an array of keys()
   *
   * @returns {Promise<>Array} Array of stored keys.
   * @public
   */
  async keys() {
    return Array.from(this.storage.keys());
  }

  /**
   * Opens a new or re-uses an existing cache matching the name.
   *
   * @param {String} key Name of the cache we want.
   * @returns {Promise<>Cache} The cache instance matching the name.
   * @public
   */
  async open(key) {
    if (this.storage.has(key)) return this.storage.get(key);

    const cache = new Cache();
    this.storage.set(key, cache);

    return cache;
  }

  /**
   * Removes the given key from the cache.
   *
   * @param {String} key Name of the cache we want to delete.
   * @returns {Promise} Completion indicator.
   * @public
   */
  async delete(key) {
    this.storage.delete(key);
  }
}

/**
 * Representation of an opened cache. Inherits from the Caches API because
 * there is a lot of overlap in terms of API.
 *
 * @extends Caches
 * @public
 */
class Cache extends Caches {
  /**
   * Returns the stored content for the given key.
   *
   * @param {String|Request} key URL to retrieve .
   * @returns {Promise<>Response} Completion indicator.
   * @public
   */
  async match(key) {
    return this.storage.get(key);
  }

  /**
   * Stores content for the given key.
   *
   * @param {String|Response} key URL to store .
   * @param {Response} response Data to cache
   * @returns {Promise} Completion indicator.
   */
  async put(key, response) {
    this.storage.set(key, response);
  }
}

//
// Expose our API
//
module.exports = Caches;
