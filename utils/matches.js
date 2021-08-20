/**
 * Check if the request we're intercepting is a request for the Payper API so
 * we know if we need to intercept the request.
 *
 * @param {Request} request Fetch request.
 * @returns {Boolean} Indication if we need to intercept.
 * @public
 */
module.exports = function matches({ url, method }) {
  const payper = /\/payper\//.test(url);

  return payper && (method === 'GET' || method === 'HEAD');
};
