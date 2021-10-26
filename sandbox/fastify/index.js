const cors = require('access-control')();
const fs = require('fs/promises');
const html = require('../html');
const path = require('path');

//
// NOTE: We're extracted our Payper setup logic to a separate file so it can be
// shared between different frameworks without us having to duplicate our setup
// logic.
//
const payper = require('../payper');

module.exports = async function bootstrapped({ ssl, port, url }) {
  const fastify = require('fastify')({
    https: ssl
  });

  //
  // Fastify doesn't have a static handler build-in and I don't want to
  // introduce more dependencies than just the base framework. Service Workers
  // requires the service worker file to served from the same scope you're
  // trying to control so we need to answer the /sw-0.0.0.js file.
  //
  fastify.get('/sw-0.0.0.js', async function serviceworker(_req, reply) {
    reply.type('text/javascript');
    return await fs.readFile(path.join('bundles', 'sw-0.0.0.js'), { encoding: 'utf-8'});
  });

  //
  // Handle the /payper/* API requests.
  //
  fastify.get('/payper/*', async function intercept(req, reply) {
    if (cors(req, reply.raw)) return;

    const { source } = await payper.concat(req.url);

    console.log('[fastify] Handling inbound API request for bundles', req.url);

    reply.type('text/javascript');
    return source;
  });

  //
  // Finally, render our page.
  //
  fastify.get('/', async function index(_request, reply) {
    reply.type('text/html').code(200);

    return await html({
      bundles: [
        'eventemitter3@4.0.7',
        'url-parse@1.5.3',
        'react@17.0.2',
        'react-dom@17.0.2',
        'client@0.0.0'
      ],
      framework: 'Fastify',
      nav: [
        { content: 'Next page', href: '/next' },
        { content: 'Next framework', href: 'https://payper.test:3210/' }
      ]
    });
  });

  fastify.get('/next', async function index(request, reply) {
    reply.type('text/html').code(200);

    return await html({
      bundles: [
        'koekiemonster@2.2.1',
        'url-parse@1.5.3',
        'react@17.0.2',
        'react-dom@17.0.2',
        'client@0.0.0'
      ],
      framework: 'Fastify',
      nav: [
        { content: 'Home page', href: '/' },
        { content: 'Next framework', href: 'https://payper.test:3210/' }
      ]
    });
  });

  await fastify.listen(port);
  console.log('[fastify] Listening on ', url);
}
