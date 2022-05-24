const extract = require('../utils/extract.js');
const matches = require('../utils/matches.js');
const { prefix, suffix } = require('./iife');
const missing = require('./missing.js');
const failure = require('./failure.js');
const { Readable } = require('stream');

/**
 * The Payper Server is basically a server-side bundle bundler as it combines
 * multiple bundles into a single request that understood by browsers, and our
 * Payper Worker.
 *
 * @class PayperServer
 * @public
 */
class PayperServer {
  /**
   * Creates a new Payper instance.
   *
   * @param {String} path The path the `payper/server` is working on.
   * @private
   */
  constructor({ path='payper', logger=console } = {}) {
    this.bundles = new Map();
    this.asterisk = [];

    this.logger = logger;
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
    if (typeof name === 'function' || name === '*') {
      return this.asterisk.push(handler || name);
    }

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

    this.respond(req, res);
    return true;
  }

  /**
   * Respond to a matching HTTP request.
   *
   * @param {HTTPRequest} req Incoming HTTP request
   * @param {HTTPResponse} res Outgoing HTTP response
   * @private
   */
  async respond(req, res) {
    const { source } = await this.concat(req.url);

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
      'Content-Length': Buffer.byteLength(source)
    });

    res.end(source);
  }

  /**
   * Transforms the request in to an array of promises that can
   * resolved to bundle contents.
   *
   * @param {Array} url The `/payper/*` URL that we need to concatenate
   * @param {Object} additional Additional props that the handlers should receive.
   * @returns {Array} Ordered array of Promises.
   * @private
   */
  request(url, additional = {}) {
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
      const payload = { ...additional, name, version, bundle };
      const handler = this.bundles.get('bundle:'+ name);
      const asterisk = this.asterisk.slice(0);

      let comment = this.comment({ name, version, cache: true });
      let contents = '';
      let cache = true;

      try {
        //
        // If we've found a handler for the bundle name we're going to invoke it
        // with the version that is requested. The handler then fetch the required
        // contents and return it. When nothing is returned we assume that the
        // version is missing and no bundle could be generated.
        //
        if (handler) {
          contents = await handler(payload);
        }

        //
        // We do allow a catch-all handler for when a bundle specific handler is
        // not specified. This can be useful in the case where your assets are
        // externally hosted e.g. in a database and you just to use that for
        // lookups instead.
        //
        if (!handler && asterisk.length) {
          while (asterisk.length && !contents) {
            contents = await asterisk.shift()(payload);
          }
        }
      } catch (e) {
        this.logger.error('Failed to generate the contents of bundle'+ bundle, e);

        contents = await this.failure({ name, version, bundle, error: e.message });
        comment = this.comment({ name, version, cache: false });
        cache = false;
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
        comment = this.comment({ name, version, cache: false });
        cache = false;
      }

      //
      // Force an addition \n after the comment, just make it clear when inspecting
      // the generated bundles where the bundles end. Spending 1 new-line to
      // improve readability of the code is a fine trade-off.
      //
      return {
        source: [contents, comment, ''].join('\n'),   // Source of the bundle.
        version,                                      // Version of the bundle.
        bundle,                                       // Name version pair.
        cache,                                        // Cache response.
        name                                          // Name of the bundle.
      };
    }

    return requested.map(gatherSources);
  }

  /**
   * Concatenate the requested bundles into a singular request that can be
   * returned to our users.
   *
   * @param {Array} url The `/payper/*` URL that we need to concatenate
   * @param {Object} additional Additional props that the handlers should receive.
   * @returns {String} The bundle that we need to write.
   * @public
   */
  async concat(url, additional) {
    const responses = await Promise.all(this.request(url, additional));
    const payload = [];
    const issues = [];

    //
    // Process the responses of each bundle request as we want to tell the
    // developer if it's safe to cache this response e.g. when there aren't
    // any issue during the bundling process.
    //
    // When a 404, or 500 error happend we want signal the developer that it
    // might not be safe to cache this response as we were unable to create
    // a successful response.
    //
    responses.forEach(function process(response) {
      payload.push(response.source);

      if (!response.cache) issues.push(response.bundle);
    });

    return {
      source: [ prefix, ...payload, suffix ].join('\n'),
      cache: !issues.length,
      issues
    }
  }

  /**
   * Creates the trailing comment banner for each included bundle. The banner is
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
  comment(data) {
    return `/*! Payper meta(${JSON.stringify(data)}) */`;
  }
}

//
// Expose the handler.
//
module.exports = PayperServer;
