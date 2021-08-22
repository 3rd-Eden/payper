const devcert = require('devcert');

/**
 * The port numbers that will be assigned to the various of HTTP servers that we
 * support.
 *
 * @type {Number}
 * @private
 */
let port = 3210;
let ssl;

module.exports = async function bootstrap(fn) {
  ssl = ssl || await devcert.certificateFor('payper.test');

  await fn({ ssl, port, url: `https://payper.test:${port}/` });
  port++;
};
