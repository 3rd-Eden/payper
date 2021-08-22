const { describe, it, beforeEach } = require('mocha');
const Payper = require('../index.js');
const assume = require('assume');

describe('Payper Service Worker', function () {
  let payper;

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
});
