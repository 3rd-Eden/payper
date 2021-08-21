/**
 * In the case of an unknown bundle name, missing version, we want to present
 * our users with detailed information what might have caused the issue and how
 * they could fix this problem. We don't want this to be too disruptive so we're
 * only going to log this to the console.
 *
 * @param {String} bundle The unsanitized name and version of the bundle
 * @param {String} error The generated error message without stack.
 * @returns {String} Notification for the user about the failed requested bundle.
 * @public
 */
module.exports = async function failure({ bundle, error }) {
  const payload = `
    if (typeof console !== 'undefined' && console.error && console.group) {
      [
        ['group', '500: An error occured while loading bundle: '+ ${JSON.stringify(bundle)}],
        ['error', 'Error message: '+ ${JSON.stringify(error)}],
        ['error', 'This is most likely caused by an error in your bundle handler'],
        ['error', 'Additional info: https://github.com/3rd-Eden/payper/tree/main/api#failure'],
        ['groupEnd']
      ].forEach(function missing(line) {
        console[line[0]](line[1] ? '[PAYPER] '+ line[1] : undefined);
      });
    }
  `;

  return payload;
}
