const extract = require('../utils/extract.js');
const missing = require('./missing.js');

/**
 *
 * @class Payper
 * @public
 */
class Payper {
  constructor() {
    this.bundles = new Map();
  }

  /**
   * Registers a new bundle with the service.
   *
   * @param {String} name A unique name of the bundle.
   * @param {AsyncFunction} handler Function that returns the bundle contents.
   * @public
   */
  add(name, handler) {
    if (this.bundles.has(name)) {
      throw new Error(`Duplicate bundle(${name}) added`);
    }

    this.bundles.set(name, handler);
  }

  /**
   * Respond to a matching HTTP request.
   *
   * @param {HTTPRequest} req Incoming HTTP request
   * @param {HTTPResponse} res Outgoing HTTP response
   * @private
   */
  async respond(req, res) {
    const requested = extract(req.url);
    const contents = await this.concat(requested);

    res.writeHead(200, {
      'Content-Type': 'text/javascript',
      'Content-Length': Buffer.byteLength(contents)
    });

    res.end(contents);
  }

  /**
   * Concat the requested bundles into a singular request that can be returned
   * to our users.
   *
   * @param {Array} requested Array with name/version bundle information.
   * @returns {Array}
   * @public
   */
  async concat(requested) {
    /**
     * Gather the source of the requested bundle.
     *
     * @param {String} name Name of the bundle.
     * @param {String} version Version that is requested.
     * @returns {String} Gathered bundle source.
     * @private
     */
    const gatherSources = async ({ name, version }) => {
      const handler = this.bundles.get(name);

      let meta = this.meta({ name, version, cache: true });
      let bundle = '';

      //
      // If we've found a handler for the bundle name we're going to invoke it
      // with the version that is requested. The handler then fetch the required
      // contents and return it. When nothing is returned we assume that the
      // version is missing and no bundle could be generated.
      //
      // When no handler or bundle could be generated we default to our missing
      // bundle payload which informs the developer that a bundle failed to
      // load. We want to continue loading the rest of the bundles in an attempt
      // to prime the rest of the cache and *hope* that the missing bundle
      // wasn't missing critical.
      //
      if (handler) {
        bundle = await handler({ name, version });
      }

      if (!bundle) {
        bundle = await missing({ name, version });
        meta = this.meta({ name, version, cache: false });
      }

      return [bundle, meta].join('\n');
    }

    const payload = await Promise.all(requested.map(gatherSources));
    return payload.join('\n');
  }

  /**
   * Creates the trailing meta banner for each included bundle. The banner is
   * used for bundle identification purposes as it provides the following
   * information to the service worker about the code is included above it:
   *
   * - `name` The name bundle.
   * - `version` The specific version of the bundle.
   *
   * This is the minimum required information that the ServiceWorker needs to
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
module.exports = Payper;
