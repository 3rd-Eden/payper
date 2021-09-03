const ReactDOMServer = require('react-dom/server');
const Server = require('./components/server');
const React = require('react');

/**
 * Lazy man's default props.
 *
 * @type {Object}
 */
const defaults = {
  worker:'sw-0.0.0',
  title:'Payper Sandbox',
  payper: '/payper/',
  framework:''
};

module.exports = async function html(data) {
  const props = Object.assign({}, defaults, data);
  const { framework, title, worker, scope } = props;
  const app = ReactDOMServer.renderToStaticMarkup(React.createElement(Server, props));

  return `
<!doctype html>
<html class="no-js" lang="en-US">
<head>
  <meta charset="utf-8">
  <title>${title} - Running ${framework}</title>
  <meta name="description" content="Sandbox Application for Payper">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#fafafa">
  <link rel="stylesheet" href="https://unpkg.com/spectre.css/dist/spectre.min.css">
  <script>
    if ('serviceWorker' in navigator && ${worker ? 'true' : 'false'})
    navigator.serviceWorker.register('/${worker}.js');
  </script>
</head>
<body>
  ${app}
</body>
</html>
`.trim();
}
