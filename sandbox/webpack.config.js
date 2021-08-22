const { version } = require('./package.json');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'sw': './src/worker.js',
  },
  output: {
    path: path.resolve(__dirname, 'bundles'),
    filename: `[name]-${version}.js`,
  },
};
