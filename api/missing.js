/**
 * In the case of an unknown bundle name, missing version, we want to present
 * our users with detailed information what might have caused the issue and how
 * they could fix this problem. We don't want this to be too disruptive so we're
 * only going to log this to the console.
 *
 * @param {String} bundle The unsanitized name and version of the bundle
 * @returns {String} Notification for the user about the missing requested bundle.
 * @public
 */
module.exports = async function missing({ bundle }) {
  const payload = `
    if (typeof console !== 'undefined' && console.error && console.group) {
      [
        ['graup', '404: Could not find the requested bundle '+ ${JSON.stringify(bundle)}],
        ['error', 'The following issues cause'],
        ['error', '1. (client-side) You misspelled the name of the bundle'],
        ['error', '2. (server-side) The bundle is not registered with the server'],
        ['error', '3. (client/server-side) The requested version is not available'],
        ['error', 'Additional info: https://github.com/3rd-Eden/payper/tree/main/api#missing'],
        ['groupEnd']
      ].forEach(function missing(line) {
        console[line[0]](line[1] ? '[PAYPER] '+ line[1] : undefined);
      });
    }
  `;

  return payload;
}
