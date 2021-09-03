const Configuration = require('./configuration');
const Bundles = require('./bundles');
const Script = require('./script');
const Card = require('./card');
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
  return (
    <div className="columns">
      <style>{ css }</style>
      <div className="column col-6 col-xs-12">
        <Card
          title="Page"
          subtitle="Configuration"
          body={ <Configuration { ...props } /> }
        />

        <div id="mount">Loading ServiceWorker data</div>
      </div>

      { props.nav.map(({ href, content }, i) =>
        <a key={ href } className={ i === 0 ? "page-nav bg-primary text-light" : "page-nav bg-secondary" } href={ href }>
          { content }
        </a>
      )}

      <Script src={ props.payper + props.bundles.join('/') } />
    </div>
  )
}

/**
 * Lazy man's page styling, inline CSS.
 *
 * @type {String}
 * @private
 */
const css = `
a.page-nav {
  padding: 20px;
  min-width: 200px;
  text-align: center
}
`;

//
// Expose our app
//
module.exports = App;
