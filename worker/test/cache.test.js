const { describe, it, beforeEach } = require('mocha');
const CacheStorage = require('./cachestorage');
const Cache = require('../cache.js');
const assume = require('assume');

describe('Payper Service Worker Cache', function () {
  global.caches = global.caches || new CacheStorage();
  global.self = {
    registration: {
      scope: 'https://example.com'
    }
  };

  it('creates a custom cache name', function () {
    const cache = new Cache({ path: 'yolo', version: '1.2.3' });

    assume(cache.name).equals('yolo@1.2.3');
  });

  describe('caching bundles', function () {
    it('is able to read the stored bundles', async function () {
      const cache = new Cache({ path: 'yolo', version: '1.2.3' });
      const headers = new Map();

      await cache.fill({
        'foo@bar': {
          bundle: 'foo@bar',
          name: 'foo',
          version: 'bar',
          cache: true,
          response: {
            contents: 'yo',
            headers
          }
        }
      });

      assume(headers.get('payper-hit')).exists();

      const bundles = await cache.gather([{
        name: 'foo',
        version: 'bar',
        bundle: 'foo@bar'
      }]);

      assume(bundles).is.a('object');
      assume(bundles['foo@bar']).is.a('object');

      const foobar = bundles['foo@bar'];

      assume(foobar.name).equals('foo');
      assume(foobar.version).equals('bar');
      assume(foobar.bundle).equals('foo@bar');
    });

    it('does not add items to cache when `cache:false` is set', async function () {
      const cache = new Cache({ path: 'yolo', version: '1.2.3' });
      const headers = new Map();

      await cache.fill({
        'foo@1.2.3': {
          bundle: 'foo@bar',
          name: 'foo',
          version: '1.2.3',
          cache: false,
          response: {
            contents: 'yo',
            headers
          }
        }
      });

      assume(headers.get('payper-hit')).does.not.exist();

      const bundles = await cache.gather([{
        name: 'foo',
        version: '1.2.3',
        bundle: 'foo@1.2.3'
      }]);

      assume(bundles).is.a('object');
      assume(bundles).is.length(0);
    });
  });
});
