/**
 * Creates the bundle id.
 *
 * @param {String} name Name of the bundle.
 * @param {String} version Version of the bundle.
 * @returns {String} The bundle identifier.
 */
module.exports = function identifier(...args) {
  return args.filter(Boolean).join('@');
}
