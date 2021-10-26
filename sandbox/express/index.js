const cors = require('access-control')();
const express = require('express');
const https = require('https');
const html = require('../html');
const app = express();

//
// NOTE: We're extracted our Payper setup logic to a separate file so it can be
// shared between different frameworks without us having to duplicate our setup
// logic.
//
const payper = require('../payper');

//
// Also allow express to read the output of our WebPack bundles for any /bundles
// request so we can serve things like our Service Worker.
//
app.use('/', express.static('bundles'));
app.use(cors);

//
// Handle the /payper/* API requests.
//
app.get('/payper/*', async function intercept(req, res) {
  console.log('[express] Handling inbound API request for bundles', req.url);

  res.set('Content-Type', 'text/javascript');

  const { source } = payper.concat(req.url);
  res.end(source);
});

//
// Finally, render our pages.
//
app.get('/', async function index(_req, res) {
  const response = await html({
    bundles: [
      'eventemitter3@4.0.7',
      'url-parse@1.5.3',
      'react@17.0.2',
      'react-dom@17.0.2',
      'client@0.0.0'
    ],
    framework: 'Express',
    worker: 'workbox-0.0.0',
    nav: [
      { content: 'Next page', href: '/next' },
      { content: 'Next framework', href: 'https://payper.test:3211/' }
    ]
  });

  res.set('Content-Type', 'text/html');
  res.send(response);
});

app.get('/next', async function index(_req, res) {
  const response = await html({
    bundles: [
      'koekiemonster@2.2.1',
      'url-parse@1.5.3',
      'react@17.0.2',
      'react-dom@17.0.2',
      'client@0.0.0'
    ],
    framework: 'Express',
    worker: 'workbox-0.0.0',

    nav: [
      { content: 'Next page', href: '/cross' },
      { content: 'Next framework', href: 'https://payper.test:3211/' }
    ]
  });

  res.set('Content-Type', 'text/html');
  res.send(response);
});

app.get('/cross', async function index(_req, res) {
  const response = await html({
    bundles: [
      'eventemitter3@4.0.7',
      'url-parse@1.5.3',
      'react@17.0.2',
      'react-dom@17.0.2',
      'client@0.0.0'
    ],
    framework: 'Express',
    worker: 'workbox-0.0.0',
    payper: 'https://payper.test:3211/payper/',

    nav: [
      { content: 'Home page', href: '/' },
      { content: 'Next framework', href: 'https://payper.test:3211/' }
    ]
  });

  res.set('Content-Type', 'text/html');
  res.send(response);
});

//
// Expose our bootstrapping logic so the application can be started. We're
// starting.
//
module.exports = async function bootstrapped({ ssl, port, url }) {
  https.createServer(ssl, app).listen(port, function listening() {
    console.log('[express] Listening on ', url);
  });
};
