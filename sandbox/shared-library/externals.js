//
// List of dependencies that are getting transformed into separate bundles.
//
const dependencies = [
  'url-parse',
  'koekiemonster',
  'eventemitter3',
  'react',
  'react-dom'
];

module.exports = {
  dependencies,

  //
  // Have our externals object follow the same output format as we've specified
  // in the webpack.config.js that is hosted in this same directory. A
  // consuming application would only need to add our externals object to
  // their WebPack configuration to prevent them from being bundled in with
  // their application code.
  //
  externals: dependencies.reduce(function generate(externals, name) {
    externals[name] = {
      root: name,
      commonjs: name,
      commonjs2: name,
      amd: name
    };
    return externals;
  }, {})
}
