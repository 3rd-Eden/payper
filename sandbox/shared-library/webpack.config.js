const path = require('path');

module.exports = {
  mode: 'production',

  //
  // Generate the entry object by iterating over the standalone bundles that we
  // want to expose to our users. We're going to expose these libraries as
  // globals on the page where the name of library is also their global name.
  //
  entry: [
    'url-parse',
    'koekiemonster',
    'eventemitter3',
    'react',
    'react-dom'
  ].reduce(function reduce(entry, name) {
    entry[name] = {
      import: require.resolve(name),
      library: { type: 'umd', name }
    };

    return entry;
  }, {}),
  output: {
    path: path.resolve(__dirname, '..', 'bundles'),

    /**
     * Look up the name of each bundled library and use their installed version
     * by requiring their `package.json` * to generate the right version suffix.
     *
     * @param {pathData} pathData File information.
     * @returns {String} file name.
     * @private
     */
    filename: function filename(pathData) {
      const chunk = pathData.chunk;
      const name = chunk.name;
      const version = require(`${name}/package.json`).version;

      return `${name}-${version}.js`
    }
  },
};
