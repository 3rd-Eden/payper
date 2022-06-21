const arrow = require('./arrow');

//
// Expose the SVG preset which consists of a simple SVG wrapper so you can
// export everything as symbol definitions.
//
module.exports = {
  ...arrow,

  prefix: '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">',
  suffix: '</svg>'
};
