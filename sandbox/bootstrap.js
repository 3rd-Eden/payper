const devcert = require('devcert');

let ssl;

module.exports = async function bootstrap(fn, port) {
  ssl = ssl || await devcert.certificateFor('payper.test');
  await fn({ ssl, port, url: `https://payper.test:${port}/` });
};
