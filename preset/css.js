const stars = require('./stars');

module.exports = {
  ...stars,

  //
  // We're wrapping the response in an @media wrapper for identification
  // purposes. 
  //
  prefix: '@media all, (__PAYPER_CSS_BUNDLE_WRAPPER__) {',
  suffix: '}'
};
