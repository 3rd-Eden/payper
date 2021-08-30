const { Configuration } = require('./configuration');
const Bundles = require('./bundles');
const React = require('react');

/**
 * The App is designed to be reusable across many pages to provide information
 * on how resources are loaded on the page. Note that these pages are just
 * ran on the server.
 *
 * @param {Object} props Page information
 * @constructor
 */
function App(props) {
  /**
   * Creates a script that is injected into the page.
   *
   * @param {String} src SRC to load.
   * @returns {Object} dangerouslySetInnerHTML contents.
   * @private
   */
  function script(src) {
    return {
      __html: `<script src="/payper/${src}"></script>`
    }
  }
  return (
    <>
      <h2>Page configuration</h2>
      <Configuration { ...props } />

      <h2>Requested bundles</h2>
      <Bundles bundles={ props.bundles } />

      <div dangerouslySetInnerHTML={ script(props.bundles.join('/')) } />

      <a href={ props.next }>Load the next page ({props.next})</a>
    </>
  )
}

//
// Expose our app
//
module.exports = App;
