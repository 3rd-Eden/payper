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
  function item(bundle, cache=true) {
    const { name, version } = expand(bundle);

    return {
      [bundle]: {
        response: {
          contents: 'yo',
          headers: new Map()
        },
        version,
        bundle,
        cache,
        name
      }
    };
  }

  function expand(bundle) {
    const [name, version] = bundle.split('@');
    return { name, version, bundle }
  }

  it('creates a custom cache name', function () {
    const cache = new Cache({ path: 'yolo', version: '1.2.3', type: 'smh/myhead' });

    assume(cache.name).equals('yolo@smh/myhead@1.2.3');
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

      const bundles = await cache.read([{
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
          bundle: 'foo@1.2.3',
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

      const bundles = await cache.read([{
        name: 'foo',
        version: '1.2.3',
        bundle: 'foo@1.2.3'
      }]);

      assume(bundles).is.a('object');
      assume(bundles).is.length(0);
    });
  });

  describe('Cache maintenance', function () {
    it('deletes previous caches of its own type', async function () {
      const smh123 = new Cache({ path: 'yolo', version: '1.2.3', type: 'smh/myhead' });
      const smh234 = new Cache({ path: 'yolo', version: '2.3.4', type: 'smh/myhead' });
      const diff = new Cache({ path: 'yolo', version: '1.1.1', type: 'text/javascript' });

      await smh123.fill(item('smh@1.2.3'));
      await smh234.fill(item('another@1.2.3'));
      await diff.fill(item('diff@1.2.3'));

      const smh123Item = await smh123.read([expand('smh@1.2.3')]);
      assume(smh123Item['smh@1.2.3']).is.a('object');

      const smh234Item = await smh234.read([expand('another@1.2.3')]);
      assume(smh234Item['another@1.2.3']).is.a('object');

      const diff123Item = await diff.read([expand('diff@1.2.3')]);
      assume(diff123Item['diff@1.2.3']).is.a('object');

      //
      // Should only delete smh123 as it shares the same type, and name
      //
      await smh234.clean();

      const smh123clean = await smh123.read([expand('smh@1.2.3')]);
      assume(smh123clean).is.length(0);

      const smh234clean = await smh234.read([expand('another@1.2.3')]);
      assume(smh234clean['another@1.2.3']).is.a('object');

      const diff123clean = await diff.read([expand('diff@1.2.3')]);
      assume(diff123clean['diff@1.2.3']).is.a('object');
    });
  });
});
