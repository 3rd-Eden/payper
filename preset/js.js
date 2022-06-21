const stars = require('./stars');

//
// Expose the JS preset. It wraps all the given code in an IIFE that takes
// the contents of the file, and sends it to the worker when it's executed
//
module.exports = {
  //
  // When a user visits the page for the first time our Service Worker is not
  // active yet, that means that our requests are not cached by the system and
  // that only on the next reload/visit will the resource be cached. To optimize
  // this flow we're wrapping the payload in a **named** function so we can
  // extract the contents of the bundle by simply calling `toString()` on the
  // function. We can then pass the contents of the bundle down the Service
  // Worker to have it cache the result **before** the next visit happens.
  //
  prefix: `(function __PAYPER_IFFE_BUNDLE_WRAPPER__() {`,
  suffix: `
;if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(function ready(sw) {
    sw.active.postMessage({
      type: 'payper:raw',
      base: document.baseURI,
      payload: __PAYPER_IFFE_BUNDLE_WRAPPER__.toString()
    });
  });
}
}());`,

  ...stars
};
