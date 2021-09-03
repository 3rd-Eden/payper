const React = require('react');

/**
 * Generates a list of details about the page setup.
 *
 * @param {String} framework Name of the HTTP framework used to render.
 * @param {String} worker Which worker script was loaded.
 * @constructor
 */
function Configuration({ framework, worker }) {
  return (
    <dl className="configuration">
      { framework && <Definition name="Framework" desc={`This page is served by ${framework}`} /> }
      { worker && <Definition name="Service Worker" desc={`Our ${worker} has been registered to progressively optimize the bundles`} /> }
    </dl>
  );
}

/**
 * Renders a single configuration value.
 *
 * @param {String} name Name of the configuration.
 * @param {String} desc Description of the setting.
 * @constructor
 */
function Definition({ name, desc }) {
  return (
    <>
      <dt>{ name }</dt>
      <dd>{ desc }</dd>
    </>
  );
}

module.exports = Configuration;
