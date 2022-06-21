const SVG = require('payper/preset/svg');
const CSS = require('payper/preset/css');
const JS = require('payper/preset/js');
const assume = require('assume');

describe('Payper Preset', function () {
  Object.entries({ SVG, CSS, JS }).forEach(function each([key, preset]) {
    describe(key, function () {
      it('has the required keys', function () {
        assume(preset).is.a('object');
        assume(preset).is.length(4);

        assume(preset.suffix).is.a('string');
        assume(preset.prefix).is.a('string');
        assume(preset.start).is.a('string');
        assume(preset.end).is.a('string');
      });
    });
  });
})
