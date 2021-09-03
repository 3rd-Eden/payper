const { externals } = require('../shared-library/externals.js');
const { version } = require('../package.json');
const path = require('path');

module.exports = {
  mode: 'production',
  devtool: false,
  entry: {
    'client': './components/client.js'
  },
  externals: {
    ...externals
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, '..', 'bundles'),
    filename: `[name]-${version}.js`,

    //
    // Required when using the externals object
    // @SEE https://webpack.js.org/configuration/externals/#object
    //
    libraryTarget: 'umd'
  }
};
