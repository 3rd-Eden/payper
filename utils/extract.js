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
  return (url.split(`/${this}/`).pop() || '').split('/')
  .map(function parse(bundle) {
    //
    // We need to cautious with version parsing here. If for some case we have
    // a bundle with an `@` in the name we don't want to mistake it for
    // a version pair. So the assumption we make is that the last @ that we
    // encounter in the string is the version separator as it's less likely
    // that this character would appear in a version string (e.g a semver or
    // a fingerprint/hash of the bundle).
    //
    const lastIndex = bundle.lastIndexOf('@');
    const versioned = !!~lastIndex;

    return {
      name: bundle.slice(0,  versioned ? lastIndex : bundle.length),
      version: versioned ? bundle.slice(lastIndex +1) : '',
      bundle
    };
  });
}

