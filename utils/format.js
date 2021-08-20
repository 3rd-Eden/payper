/**
 * Reformats bundle that often originates from a multi-bundle request into a
 * single bundle URL so the resources are individually cacheable. Consistency
 * is king when it comes to naming so we're using a dedicated function to
 * create our URL cache structure for the sake of consistency.
 *
 * @param {String} path The path we need to call on the Payper API.
 * @param {String} origin The root URL we should apply our path against.
 * @returns {String} URL string that can be used in the cache API.
 * @public
 */
module.exports = function format(path, origin = self.registration.scope) {
  //
  // We need to have access to some sort of base URL on which we are hosted
  // or retrieving the files from as the `caches` API requires the request to
  // be either a `http` or `https` protocol otherwise these interactions will
  // throw a TypeError.
  //
  const root = new URL(origin);

  root.pathname = `/payper/${[].concat(path).join('/')}`;
  root.search = '';

  return root.href;
}

