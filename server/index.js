const extract = require('../utils/extract.js');
const matches = require('../utils/matches.js');
const missing = require('./missing.js');
const failure = require('./failure.js');

/**
 *
 * @class PayperServer
 * @public
 */
class PayperServer {
  /**
   * Creates a new Payper instance.
   *
   * @param {String} version The version of the cache we want to use.
   * @param {String} path The path the `payper/server` is working on.
   * @param {Number} ttl Milliseconds indicating how long stale items are kept
   * @public
   */
  constructor({ path='payper' } = {}) {
    this.bundles = new Map();

    this.missing = missing;
    this.failure = failure;
    this.extract = extract.bind(path);
    this.matches = matches.bind(path);
  }

  /**
   * Registers a new bundle with the service.
   *
   * Registers a new bundle and handler with the service. We assume that the
   * name of the bundle is unique. In the case where the first argument of this
   * function is a function we assume that it's a **catch-all** handler that can
   * handle all bundle requests.
   *
   * @param {String} name A unique name of the bundle.
   * @param {AsyncFunction} handler Function that returns the bundle contents.
   * @public
   */
  add(name, handler) {
    if (typeof name === 'function') return this.bundles.set('*', name);

    if (this.bundles.has('bundle:'+ name)) {
      throw new Error(`Duplicate bundle(${name}) added`);
    }

    this.bundles.set('bundle:'+ name, handler);
  }

  /**
   * Intercepts an incoming HTTP requests and checks if it matches our API
   * namespace so we can process the pathname.
   *
   * @param {HTTPRequest} req Incoming HTTP request
   * @param {HTTPResponse} res Outgoing HTTP response
   * @returns {Boolean|Promise} False when it doesn't matches, Promise when it does.
   * @public
   */
  intercept(req, res) {
    if (!this.matches(req)) return false;
    return this.respond(req, res);
  }

  /**
   * Respond to a matching HTTP request.
   *
   * @param {HTTPRequest} req Incoming HTTP request
   * @param {HTTPResponse} res Outgoing HTTP response
   * @private
   */
  async respond(req, res) {
    const contents = await this.concat(req.url);

    //
    // @TODO: Optimize the response, check if response streaming makes more
    // sense given that we have multiple "chunks" that we can write so the
    // browser start downloading the chunks at the rate that they come in.
    //
    // In addition to response streaming we should invest in brotli/gzip
    // compressing of the response to reduce the amount of bytes over the wire.
    //
    // Finally, caching the responses on disk as caching optimization to prevent
    // multiple lookups, but that might just all be done through plugins rather
    // than making this module that much more complex
    //
    res.writeHead(200, {
      'Content-Type': 'text/javascript',
      'Content-Length': Buffer.byteLength(contents)
    });

    res.end(contents);
  }

  /**
   * Concatenate the requested bundles into a singular request that can be returned
   * to our users.
   *
   * @param {Array} url The `/payper/*` URL that we need to concatenate
   * @returns {Array}
   * @public
   */
  async concat(url) {
    const asterisk = this.bundles.get('*');
    const requested = this.extract(url);

    /**
     * Gather the source of the requested bundle.
     *
     * @param {String} name Name of the bundle.
     * @param {String} version Version that is requested.
     * @returns {String} Gathered bundle source.
     * @private
     */
    const gatherSources = async ({ name, version, bundle }) => {
      const handler = this.bundles.get('bundle:'+ name);

      let meta = this.meta({ name, version, cache: true });
      let contents = '';

      try {
        //
        // If we've found a handler for the bundle name we're going to invoke it
        // with the version that is requested. The handler then fetch the required
        // contents and return it. When nothing is returned we assume that the
        // version is missing and no bundle could be generated.
        //
        if (handler) {
          contents = await handler({ name, version, bundle });
        }

        //
        // We do allow a catch-all handler for when a bundle specific handler is
        // not specified. This can be useful in the case where your assets are
        // externally hosted e.g. in a database and you just to use that for
        // lookups instead.
        //
        if (!handler && asterisk) {
          contents = await asterisk({ name, version, bundle });
        }
      } catch (e) {
        contents = await this.failure({ name, version, bundle, error: e.message });
        meta = this.meta({ name, version, cache: false });
      }

      //
      // When no handler or bundle could be generated we default to our missing
      // bundle payload which informs the developer that a bundle failed to
      // load. We want to continue loading the rest of the bundles in an attempt
      // to prime the rest of the cache and *hope* that the missing bundle
      // wasn't missing critical.
      //
      if (!contents) {
        contents = await this.missing({ name, version, bundle });
        meta = this.meta({ name, version, cache: false });
      }

      return [contents, meta].join('\n');
    }

    const payload = await Promise.all(requested.map(gatherSources));
    return this.wrap(payload.join('\n'));
  }

  /**
   * When a user visits the page for the first time our Service Worker is not
   * active yet, that means that our requests are not cached by the system and
   * that only on the next reload/visit will the resource be cached. To optimize
   * this flow we're wrapping the payload in a **named** function so we can
   * extract the contents of the bundle by simply calling `toString()` on the
   * function. We can then pass the contents of the bundle down the Service
   * Worker to have it cache the result **before** the next visit happens.
   *
   * @param {String} payload Concatenated bundles.
   * @returns {String} IIF wrapper.
   * @private
   */
  wrap(payload) {
    return `(function __payper__wrap__() {
      ${payload}

      ;if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(function ready(sw) {
          sw.active.postMessage({
            type: 'payper:paste',
            contents: __payper__wrap__.toString()
          });
        });
      }
    }());`
  }

  /**
   * Creates the trailing meta banner for each included bundle. The banner is
   * used for bundle identification purposes as it provides the following
   * information to the service worker about the code is included above it:
   *
   * - `name` The name bundle.
   * - `version` The specific version of the bundle.
   *
   * This is the minimum required information that the Service Worker needs to
   * split the code into it's own chunk and identify it accordingly.
   *
   * @param {Object} data Meta data to be send with the bundle request
   * @returns {String}
   * @private
   */
  meta(data) {
    return `/*! Payper meta(${JSON.stringify(data)}) */`;
  }
}

//
// Expose the handler.
//
module.exports = PayperServer;
