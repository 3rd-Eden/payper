const express = require('express');
const https = require('https');
const html = require('./html');
const app = express();

//
// NOTE: We're extracted our Payper setup logic to a separate file so it can be
// shared between different frameworks without us having to duplicate our setup
// logic.
//
const payper = require('./payper');

//
// Also allow express to read the output of our WebPack bundles for any /bundles
// request so we can serve things like our Service Worker.
//
app.use('/', express.static('bundles'));

//
// Handle the /payper/* API requests.
//
app.get('/payper/*', async function intercept(req, res) {
  const response = await payper.concat(req.url);

  console.log('Handling inbound API request for bundles', req.url);

  res.set('Content-Type', 'text/javascript');
  res.send(response);
});

//
// Finally, render our index page
//
app.get('/', async function index(req, res) {
  const response = await html({ worker: 'workbox-0.0.0' });

  res.set('Content-Type', 'text/html');
  res.send(response);
})

//
// Expose our bootstrapping logic so the application can be started. We're
// starting
//
module.exports = async function bootstrapped({ ssl, port, url }) {
  https.createServer(ssl, app).listen(port, function listening() {
    console.log('[express] Listening on ', url);
  });
};
