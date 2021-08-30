const React = require('react');

/**
 * List all bundlees that are being requested on the page.
 *
 * @param {Array} bundles List of bundles
 * @constructor
 */
function Bundles({ bundles }) {
  return (
    <>
      <ol>
        { bundles.map(name => (
          <li key={ name }><strong>{ name }</strong></li>
        ))}
      </ol>
    </>
  )
}

module.exports = Bundles; 
