const { suffix, prefix } = require('../../server/iife');
const { describe, it, beforeEach } = require('mocha');
const CacheStorage = require('./cachestorage');
const Payper = require('../index.js');
const assume = require('assume');

describe('Payper Service Worker', function () {
  let payper;

  global.caches = global.caches || new CacheStorage();

  global.Blob = class Blob {
    constructor(data, options) {
      this.data = data;
      this.options = options;
    }
  };

  global.Response = class Response {
    constructor(blob, options = {}) {
      Object.keys(options).forEach(key => this[key] = options[key]);

      this.blob = blob instanceof Blob ? blob : new Blob(blob);
      this.headers = new Map();
      this.options = options;

      if ('headers' in options) {
        Object.keys(options.headers).forEach(key => this.headers.set(key, options.headers[key]));
      }
    }

    text() {
      return Promise.resolve(Array.isArray(this.blob.data)
        ? this.blob.data.join('')
        : this.blob.data
      );
    }

    clone() {
      return new Response(this.blob, this.options);
    }
  };

  beforeEach(function () {
    global.location = 'http://example.com/sw.js';
    global.fetch = function fetch() {
      throw new Error('A test should polyfill this');
    };

    global.self = {
      registration: {
        scope: 'http://example.com/'
      },
      addEventListener: () => {},
      skipWaiting: () => {},
      clients: {
        claim: () => {}
      }
    };

    payper = new Payper({ version: '0.0.0', ttl: 3650998091 });
  });

  describe('lifecycles', function () {
    it('calls `skipWaiting` on `install`', function (next) {
      global.self.skipWaiting = next;

      payper.install({
        waitUntil: function () {
          throw new Error('I should never wait during install');
        }
      });
    });

    it('call `clients.claim()` on `activate`', function (next) {
      global.self.clients = { claim: next };

      payper.activate({
        waitUntil: function () {
          throw new Error('I should never wait during activate');
        }
      });
    });

    it('calls the `responseWith` method on `fetch` for matching URLs', function (next) {
      payper.fetch({
        request: {
          url: '/payper/foo@bar',
          method: 'GET'
        },
        respondWith: function () {
          next();
        }
      });
    });

    it('does not call `responseWith` on `fetch` when the URL does not match', function () {
      payper.fetch({
        request: {
          url: '/a-different-url',
          method: 'GET'
        },
        respondWith: function () {
          throw new Error('I should never have been called');
        }
      });
    });

    it('assigns lifecycle events', function () {
      const listeners = [];

      global.self.addEventListener = function (method) {
        listeners.push(method);
      };

      payper.register();
      assume(listeners).deep.equal(['fetch', 'activate', 'install', 'message']);
    });

    it('controls which lifecycle handlers are assigned', function () {
      const listeners = [];

      global.self.addEventListener = function (method) {
        listeners.push(method);
      };

      payper.register(['fetch', 'message']);
      assume(listeners).deep.equal(['fetch', 'message']);
    });
  });

  describe('Message API', function () {
    it('ignores unknown events', function () {
      payper.message({ data: {
        type: 'payper:uwu',
        payload: 'uwu'
      }});
    });

    describe('payper:raw', function () {
      it('stores the raw response', function (done) {
        const next = assume.plan(5, done);

        payper.parse = function (payload) {
          assume(payload).equals('this is the payload');

          return { hello: 'world' }
        };

        payper.cache.fill = function (fresh, base) {
          assume(fresh).is.a('object');
          assume(fresh).is.length(1);
          assume(fresh.hello).equals('world');
          assume(base).equals('http://example.com/foo/bar');

          next();
        };

        payper.message({ data: {
          type: 'payper:raw',
          payload: 'this is the payload',
          base: 'http://example.com/foo/bar'
        }});
      });
    });

    describe('payper:precache', function () {
      it('requests the url & caches the result', function (done) {
        const next = assume.plan(5, done);

        payper.request = function (url) {
          assume(url).equals('http://www.example.com/payper/foo@bar');
          return { fetched: { foo: 'bar' } }
        };

        payper.cache.fill = function fill(fetched, base) {
          assume(fetched).is.a('object');
          assume(fetched).is.length(1);
          assume(fetched.foo).equals('bar');
          assume(base).equals('http://www.example.com/payper/foo@bar');

          next();
        };

        payper.message({ data: {
          type: 'payper:precache',
          payload: 'http://www.example.com/payper/foo@bar'
        }});
      });
    })
  });

  describe('Configuration', function () {
    it('stores the used configuration as settings', function () {
      payper = new Payper({ version: '0.0.1' });

      assume(payper.settings).is.a('object');
      assume(payper.settings.version).equals('0.0.1');
    });

    it('has sane defaults', function () {
      payper = new Payper();

      assume(payper.settings).is.a('object');
      assume(payper.settings.version).equals('0.0.0');
      assume(payper.settings.path).equals('payper');
      assume(payper.settings.type).equals('text/javascript');
    });

    it('allows configuration to be passed through the serviceworker file name', function () {
      const loc = global.location;
      global.location = 'http://example.com/sw.js?version=0.0.1&another=bar&path=yolo';

      payper = new Payper({ path: 'banana' });

      assume(payper.settings).is.a('object');
      assume(payper.settings.version).equals('0.0.1');
      assume(payper.settings.path).equals('banana');
      assume(payper.settings.another).equals('bar');
      assume(payper.settings.type).equals('text/javascript');

      global.location = loc;
    });
  });

  describe('Response parsing', function () {
    it('parses removes the wrapping iffe if it exists', function () {
      const contents = `${prefix}
        (function () {
          throw new Error('I should not be executed');
        })()
        /*! Payper meta({"name":"foo","version":"bar"}) */

        ${suffix}`;

      const chunks = payper.parse(contents);

      assume(chunks).is.a('object');
      assume(chunks).is.length(1);

      const chunk = chunks['foo@bar'];
      const response = chunk.response;
      const blob = response.blob;
      const data = blob.data[0];

      assume(data).does.not.include('__PAYPER_IFFE_BUNDLE_WRAPPER__');
    });

    it('parses removes the wrapping iffe when used as function', function () {
      const contents = `${prefix}
        (function () {
          throw new Error('I should not be executed');
        })()
        /*! Payper meta({"name":"foo","version":"bar"}) */

        ${suffix}`.slice(1, -4)

      const chunks = payper.parse(contents);

      assume(chunks).is.a('object');
      assume(chunks).is.length(1);

      const chunk = chunks['foo@bar'];
      const response = chunk.response;
      const blob = response.blob;
      const data = blob.data[0];

      assume(data).does.not.include('__PAYPER_IFFE_BUNDLE_WRAPPER__');
    });

    it('parses a single bundle response', function () {
      const contents = `
        (function () {
          throw new Error('I should not be executed');
        })()
        /*! Payper meta({"name":"foo","version":"bar"}) */
      `;

      const chunks = payper.parse(contents);

      assume(chunks).is.a('object');
      assume(chunks).is.length(1);

      const chunk = chunks['foo@bar'];

      assume(chunk.name).equals('foo');
      assume(chunk.version).equals('bar');
      assume(chunk.bundle).equals('foo@bar');
      assume(chunk.cache).is.false();

      const response = chunk.response;

      assume(response.status).equals(200);
      assume(response.statusText).equals('OK');

      const blob = response.blob;

      assume(blob.options.type).equals('text/javascript');
      assume(blob.data[0]).includes('/*! Payper meta({"name":"foo","version":"bar"}) */');
      assume(blob.data[0]).includes('I should not be executed');
    });

    it('parses a multi-bundle response', function () {
      const contents = `

    if (typeof console !== 'undefined' && console.error && console.group) {
      [
        ['group', '404: Could not find the requested bundle '+ "foo@0.0.0"],
        ['error', 'The following issues cause'],
        ['error', '1. (client-side) You misspelled the name of the bundle'],
        ['error', '2. (server-side) The bundle is not registered with the server'],
        ['error', '3. (client/server-side) The requested version is not available'],
        ['error', 'Additional info: https://github.com/3rd-Eden/payper/tree/main/api#missing'],
        ['groupEnd']
      ].forEach(function missing(line) {
        console[line[0]](line[1] ? '[PAYPER] '+ line[1] : undefined);
      });
    }

/*! Payper meta({"name":"foo","version":"0.0.0","cache":false}) */

    if (typeof console !== 'undefined' && console.error && console.group) {
      [
        ['group', '404: Could not find the requested bundle '+ "bar@0.0.0"],
        ['error', 'The following issues cause'],
        ['error', '1. (client-side) You misspelled the name of the bundle'],
        ['error', '2. (server-side) The bundle is not registered with the server'],
        ['error', '3. (client/server-side) The requested version is not available'],
        ['error', 'Additional info: https://github.com/3rd-Eden/payper/tree/main/api#missing'],
        ['groupEnd']
      ].forEach(function missing(line) {
        console[line[0]](line[1] ? '[PAYPER] '+ line[1] : undefined);
      });
    }

/*! Payper meta({"name":"bar","version":"0.0.0","cache":false}) */
      `;

      const chunks = payper.parse(contents);

      assume(chunks).is.a('object');
      assume(chunks).is.length(2);

      const chunk = chunks['foo@0.0.0'];

      assume(chunk.name).equals('foo');
      assume(chunk.version).equals('0.0.0');
      assume(chunk.bundle).equals('foo@0.0.0');
      assume(chunk.cache).is.false();

      const response = chunk.response;

      assume(response.status).equals(200);
      assume(response.statusText).equals('OK');

      const blob = response.blob;

      assume(blob.options.type).equals('text/javascript');
      assume(blob.data[0]).includes('/*! Payper meta({"name":"foo","version":"0.0.0","cache":false}) */');
      assume(blob.data[0]).includes(`['group', '404: Could not find the requested bundle '+ "foo@0.0.0"]`);

      const chunk2 = chunks['bar@0.0.0'];

      assume(chunk2.name).equals('bar');
      assume(chunk2.version).equals('0.0.0');
      assume(chunk2.bundle).equals('bar@0.0.0');
      assume(chunk2.cache).is.false();

      const response2 = chunk2.response;

      assume(response2.status).equals(200);
      assume(response2.statusText).equals('OK');

      const blob2 = response2.blob;

      assume(blob2.options.type).equals('text/javascript');
      assume(blob2.data[0]).includes('/*! Payper meta({"name":"bar","version":"0.0.0","cache":false}) */');
      assume(blob2.data[0]).includes(`['group', '404: Could not find the requested bundle '+ "bar@0.0.0"]`);
    });
  });

  describe('Response delivery', function () {
    let fetchResponses;
    beforeEach(async function () {
      fetchResponses = [];

      await payper.cache.fill({
        'cached@1.2.3': {
          name: 'cache',
          version: '1.2.3',
          bundle: 'cached@1.2.3',
          cache: true,
          response: new Response('This value was previously cached')
        },
        'another-cached@2.2.3': {
          name: 'another',
          version: '2.2.3',
          bundle: 'another-cached@2.2.3',
          cache: true,
          response: new Response('Another cached value, but different')
        }
      }, 'http://www.example.com/wha/wha/wha');

      global.fetch = function () {
        const responses = fetchResponses.map(({ content, bundle,name, version, cache }) => {
          const meta = `/*! Payper meta(${JSON.stringify({ bundle, name, version, cache: !!cache })}) */`
          return [content, meta].join('\n')
        });

        return Promise.resolve(new Response([
          prefix,
          responses.join('\n'),
          suffix,
        ].join('\n')));
      }
    });

    it('includes Server-Timing headers', async function () {
      const response = await payper.respond({
        request: {
          url: 'http://www.example.com/payper/cached@1.2.3',
          method: 'GET'
        },
        waitUntil: () => {}
      });

      const timing = response.headers.get('Server-Timing');
      assume(timing).includes('requested;desc="cached@1.2.3"')
      assume(timing).includes('fetched;desc="none"');
      assume(timing).includes('cached;desc="cached@1.2.3"');
    });

    it('returns cached response', async function () {
      const response = await payper.respond({
        request: {
          url: 'http://www.example.com/payper/cached@1.2.3',
          method: 'GET'
        },
        waitUntil: () => {}
      });

      assume(response instanceof Response).is.true();

      //
      // Non standard api usage, just our polyfill to readout data
      //
      assume(response.status).equals(200);
      assume(response.statusText).equals('OK');
      assume(response.headers.get('Content-Type')).equals(payper.settings.type);

      //
      // Verify how the response was assembled
      //
      const timing = response.headers.get('Server-Timing');
      assume(timing).includes('requested;desc="cached@1.2.3"');
      assume(timing).includes('fetched;desc="none"');
      assume(timing).includes('cached;desc="cached@1.2.3"');

      assume(response.blob.data).is.length(1);
      assume(response.blob.data[0]).equals('This value was previously cached');
    });

    it('returns merges multiple cached responses', async function () {
      const response = await payper.respond({
        request: {
          url: 'http://www.example.com/payper/cached@1.2.3/another-cached@2.2.3',
          method: 'GET'
        },
        waitUntil: () => {}
      });

      assume(response instanceof Response).is.true();

      //
      // Non standard api usage, just our polyfill to readout data
      //
      assume(response.status).equals(200);
      assume(response.statusText).equals('OK');
      assume(response.headers.get('Content-Type')).equals(payper.settings.type);

      //
      // Verify how the response was assembled
      //
      const timing = response.headers.get('Server-Timing');
      assume(timing).includes('requested;desc="cached@1.2.3,another-cached@2.2.3"');
      assume(timing).includes('fetched;desc="none"');
      assume(timing).includes('cached;desc="cached@1.2.3,another-cached@2.2.3"');

      //
      // Assert the correct order of responses
      //
      assume(response.blob.data).is.length(2);
      assume(response.blob.data[0]).equals('This value was previously cached');
      assume(response.blob.data[1]).equals('Another cached value, but different');
    });

    it('returns fetched response', async function () {
      fetchResponses.push({
        content: 'This is a fetched result',
        name: 'fetched-result',
        version: '1.2.3',
        bundle: 'fetched-result@1.2.3',
        cache: false
      });

      const response = await payper.respond({
        request: {
          url: 'http://www.example.com/payper/fetched-result@1.2.3',
          method: 'GET'
        },
        waitUntil: () => {}
      });

      assume(response instanceof Response).is.true();

      //
      // Non standard api usage, just our polyfill to readout data
      //
      assume(response.status).equals(200);
      assume(response.statusText).equals('OK');
      assume(response.headers.get('Content-Type')).equals(payper.settings.type);

      //
      // Verify how the response was assembled
      //
      const timing = response.headers.get('Server-Timing');
      assume(timing).includes('requested;desc="fetched-result@1.2.3"');
      assume(timing).includes('fetched;desc="fetched-result@1.2.3"');
      assume(timing).includes('cached;desc="none"');

      //
      // Assert the correct order of responses
      //
      assume(response.blob.data).is.length(1);
      assume(response.blob.data[0]).includes('This is a fetched result');
    });

    it('merges multiple fetched response', async function () {
      fetchResponses.push({
        content: 'This is a fetched result',
        name: 'fetched-result',
        version: '1.2.3',
        bundle: 'fetched-result@1.2.3',
        cache: false
      });

      fetchResponses.push({
        content: 'This content is different',
        name: 'fetched-another',
        version: '1.2.3',
        bundle: 'fetched-another@1.2.3',
        cache: false
      });

      const response = await payper.respond({
        request: {
          url: 'http://www.example.com/payper/fetched-result@1.2.3/fetched-another@1.2.3',
          method: 'GET'
        },
        waitUntil: () => {}
      });

      assume(response instanceof Response).is.true();

      //
      // Non standard api usage, just our polyfill to readout data
      //
      assume(response.status).equals(200);
      assume(response.statusText).equals('OK');
      assume(response.headers.get('Content-Type')).equals(payper.settings.type);

      //
      // Verify how the response was assembled
      //
      const timing = response.headers.get('Server-Timing');
      assume(timing).includes('requested;desc="fetched-result@1.2.3,fetched-another@1.2.3"');
      assume(timing).includes('fetched;desc="fetched-result@1.2.3,fetched-another@1.2.3"');
      assume(timing).includes('cached;desc="none"');

      //
      // Assert the correct order of responses
      //
      assume(response.blob.data).is.length(2);
      assume(response.blob.data[0]).includes('This is a fetched result');
      assume(response.blob.data[1]).includes('This content is different');
    });

    it('merges fetched and cached results', async function () {
      fetchResponses.push({
        content: 'This is a fetched result',
        name: 'fetched-result',
        version: '1.2.3',
        bundle: 'fetched-result@1.2.3',
        cache: false
      });

      fetchResponses.push({
        content: 'This content is different',
        name: 'fetched-another',
        version: '1.2.3',
        bundle: 'fetched-another@1.2.3',
        cache: false
      });

      const response = await payper.respond({
        request: {
          url: 'http://www.example.com/payper/fetched-result@1.2.3/cached@1.2.3/fetched-another@1.2.3/another-cached@2.2.3',
          method: 'GET'
        },
        waitUntil: () => {}
      });

      assume(response instanceof Response).is.true();

      //
      // Non standard api usage, just our polyfill to readout data
      //
      assume(response.status).equals(200);
      assume(response.statusText).equals('OK');
      assume(response.headers.get('Content-Type')).equals(payper.settings.type);

      //
      // Verify how the response was assembled
      //
      const timing = response.headers.get('Server-Timing');
      assume(timing).includes('requested;desc="fetched-result@1.2.3,cached@1.2.3,fetched-another@1.2.3,another-cached@2.2.3"');
      assume(timing).includes('fetched;desc="fetched-result@1.2.3,fetched-another@1.2.3"');
      assume(timing).includes('cached;desc="cached@1.2.3,another-cached@2.2.3"');

      //
      // Assert the correct order of responses
      //
      assume(response.blob.data).is.length(4);
      assume(response.blob.data[0]).includes('This is a fetched result');
      assume(response.blob.data[1]).equals('This value was previously cached');
      assume(response.blob.data[2]).includes('This content is different');
      assume(response.blob.data[3]).equals('Another cached value, but different');
    })
  });
});
