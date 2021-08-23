/**
 * Check if the request we're intercepting is a request for the Payper API so
 * we know if we need to intercept the request.
 *
 * @param {Request} request Fetch request.
 * @returns {Boolean} Indication if we need to intercept.
 * @public
 */
module.exports = function matches({ url, method = 'GET' } = {}) {
  const payper = (new RegExp(`/${this}/[\\._\\@\\-a-z0-9]+`)).test(url);

  return payper && (method === 'GET' || method === 'HEAD');
};
