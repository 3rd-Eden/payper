const ReactDOMServer = require('react-dom/server');
const App = require('./components/app');
const React = require('react');

/**
 * Lazy man's default props.
 *
 * @type {Object}
 */
const defaults = {
  scope:'/',
  worker:'sw-0.0.0',
  title:'Payper Sandbox',
  framework:''
};

module.exports = async function html(data) {
  const props = Object.assign({}, defaults, data);
  const { framework, title, worker, scope } = props;
  const app = ReactDOMServer.renderToStaticMarkup(React.createElement(App, props));

  return `
<!doctype html>
<html class="no-js" lang="en-US">
<head>
  <meta charset="utf-8">
  <title>${title} - Running ${framework}</title>
  <meta name="description" content="Sandbox Application for Payper">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#fafafa">
  <script>
    if ('serviceWorker' in navigator && ${worker ? 'true' : 'false'})
    navigator.serviceWorker.register('/${worker}.js', {
      scope: '${scope}'
    });
  </script>
</head>
<body>
  ${app}
</body>
</html>
`.trim();
}
