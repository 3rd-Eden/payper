const { version } = require('../package.json');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    'sw': './sw/worker.js',
    'workbox': './sw/workbox.js'
  },
  output: {
    path: path.resolve(__dirname, '..', 'bundles'),
    filename: `[name]-${version}.js`,
  },
};
