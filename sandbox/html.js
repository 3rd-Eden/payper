module.exports = async function homepage({ worker='sw-0.0.0' } = {}) {
  return `
<!doctype html>
<html class="no-js" lang="en-US">
<head>
  <meta charset="utf-8">
  <title>Payper Sandbox</title>
  <meta name="description" content="Sandbox Application for Payper">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#fafafa">
  <script>
    if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('/${worker}.js', {
      scope: '/'
    });
  </script>
</head>

<body>
  <p>Hello world! This is HTML5 Boilerplate.</p>
  <script src="/payper/eventemitter3@4.0.7/url-parse@1.5.3/react@17.0.2/react-dom@17.0.2"></script>
  <script src="/payper/unknown@0.0.0"></script>
</body>

</html>
`.trim();
}
