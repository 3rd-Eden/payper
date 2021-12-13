/**
 * Extract the list of requested bundles from the URL structure. We assume
 * that every path after the `/payper/` route is an `@` separated bundle name
 * and version pair that a user wants to have to on their site.
 *
 * Example URL's:
 *
 *  - `/payper/foo@1.2.3/bar@1.3.9`
 *  - `/payper/vendor@adf8091/form@0ua7139a`
 *
 * We do not care about the bundle names, or versioning scheme that our users
 * decided upon. It's merely there for identification purposes.
 *
 * @param {String} url The request URL that we've intercepted.
 * @returns {Array} Parsed requested bundleds.
 * @public
 */
module.exports = function extract(url) {
  const pathnames = (url.split(`/${this}/`).pop() || '');
  const matcher = /((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?/g;
  const bundles = [];
  const dedupe = {};
  let match;

  while ((match = matcher.exec(pathnames)) !== null) {
    const [bundle, name, version] = match;

    if (bundle in dedupe) continue;

    bundles.push({ name, version, bundle });
    dedupe[bundle] = true;
  }

  return bundles;
}
