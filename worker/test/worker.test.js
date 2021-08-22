const { describe, it, beforeEach } = require('mocha');
const Payper = require('../index.js');
const assume = require('assume');

describe('Payper Service Worker', function () {
  let payper;

  global.Blob = class Blob {
    constructor(data, options) {
      this.data = data;
      this.options = options;
    }
  };

  global.Response = class Response {
    constructor(blob, options) {
      this.blob = blob;
      this.options = options;
    }
  };

  beforeEach(function () {
    payper = new Payper({ version: '0.0.0', ttl: 3650998091 });

    global.self = {
      skipWaiting: () => {},
      clients: {
        claim: () => {}
      }
    };
  });

  describe('lifecycles', function () {
    it('calls `skipWaiting` on `install`', function (next) {
      global.self.skipWaiting = next;

      payper.install();
    });

    it('call `clients.claim()` on `activate`', function (next) {
      global.self.clients = { claim: next };

      payper.activate();
    });

    it('calls the `responseWith` method on `fetch`');
  });

  describe('Response parsing', function () {
    it('parses a single bundle response', function () {
      const contents = `
        (function () {
          throw new Error('I should not be executed');
        })()
        /*! Payper meta({"name":"foo","version":"bar"}) */
      `;

      const chunks = payper.parse(contents);

      assume(chunks).is.a('array');
      assume(chunks).is.length(1);

      const chunk = chunks[0];

      assume(chunk.name).equals('foo');
      assume(chunk.version).equals('bar');
      assume(chunk.bundle).equals('foo@bar');
      assume(chunk.cache).is.false();

      const response = chunk.response;

      assume(response.options.status).equals(200);
      assume(response.options.statusText).equals('OK');

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

      assume(chunks).is.a('array');
      assume(chunks).is.length(2);

      const chunk = chunks[0];

      assume(chunk.name).equals('foo');
      assume(chunk.version).equals('0.0.0');
      assume(chunk.bundle).equals('foo@0.0.0');
      assume(chunk.cache).is.false();

      const response = chunk.response;

      assume(response.options.status).equals(200);
      assume(response.options.statusText).equals('OK');

      const blob = response.blob;

      assume(blob.options.type).equals('text/javascript');
      assume(blob.data[0]).includes('/*! Payper meta({"name":"foo","version":"0.0.0","cache":false}) */');
      assume(blob.data[0]).includes(`['group', '404: Could not find the requested bundle '+ "foo@0.0.0"]`);

      const chunk2 = chunks[1];

      assume(chunk2.name).equals('bar');
      assume(chunk2.version).equals('0.0.0');
      assume(chunk2.bundle).equals('bar@0.0.0');
      assume(chunk2.cache).is.false();

      const response2 = chunk2.response;

      assume(response2.options.status).equals(200);
      assume(response2.options.statusText).equals('OK');

      const blob2 = response2.blob;

      assume(blob2.options.type).equals('text/javascript');
      assume(blob2.data[0]).includes('/*! Payper meta({"name":"bar","version":"0.0.0","cache":false}) */');
      assume(blob2.data[0]).includes(`['group', '404: Could not find the requested bundle '+ "bar@0.0.0"]`);
    });
  })
});
