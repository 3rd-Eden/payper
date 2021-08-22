module.exports = async function homepage() {
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
    navigator.serviceWorker.register('/sw-0.0.0.js', {
      scope: '/'
    });
  </script>
</head>

<body>
  <p>Hello world! This is HTML5 Boilerplate.</p>
  <script src="/payper/foo@0.0.0/bar@0.0.0"></script>
</body>

</html>
`.trim();
}
