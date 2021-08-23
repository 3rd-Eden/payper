const { version } = require('./package.json');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'sw': './src/worker.js',
    'workbox': './src/workbox.js'
  },
  output: {
    path: path.resolve(__dirname, 'bundles'),
    filename: `[name]-${version}.js`,
  },
};
