const React = require('react');

/**
 * Renders a script tag.
 *
 * @param {Array} bundles List of bundles to load.
 * @constructor
 */
function Script({src}) {
  return <div dangerouslySetInnerHTML={{
    __html: `<script src="${src}"></script>`
  }} />
}

module.exports = Script;
