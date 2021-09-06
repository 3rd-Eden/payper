const { describe, it } = require('mocha');
const matches = require('../matches');
const extract = require('../extract');
const format = require('../format');
const assume = require('assume');

describe('Payper Utils', function () {
  describe('matches', function () {
    [
      { url: '/deep/payper/foo@bar', method: 'GET', expected: true },
      { url: '/deep/payper/foo@bar/bar@0.0.0/baz@1.2.3', method: 'GET', expected: true },
      { url: '/deep/payper/foo@bar', method: 'HEAD', expected: true },
      { url: '/deep/payper/foo@bar/bar@0.0.0/baz@1.2.3', method: 'HEAD', expected: true },
      { url: '/payper/foo@bar', method: 'GET', expected: true },
      { url: '/payper/@ux/foo@1.0.0', method: 'GET', expected: true },
      { url: '/payper/@ux/foo@1.0.0/another@version', method: 'GET', expected: true },
      { url: '/payper/foo@bar', method: 'HEAD', expected: true },
      { url: '/payper/foo@bar', method: 'POST', expected: false },
      { url: '/banana', method: 'HEAD', expected: false },
      { url: '/banana', method: 'GET', expected: false }
    ].forEach(function generate({ url, method, expected }) {
      it(`url(${url}), method(${method}) is a ${expected ? 'valid' : 'invalid'} url`, function () {
        const result = matches.call('payper', { url, method });

        assume(result).equals(expected);
      });
    });

    it('uses the `this` value to change the path name it matches', function () {
      it('matches /banana', function () {
        const result = matches.call('banana', { url: '/banana/foo@bar' });

        assume(result).is.true();
      })
    })
  });

  describe('format', function () {
    [
      { path: 'banana', base: 'http://example.com/nested/url', href: 'http://example.com/payper/banana' },
      { path: ['ban', 'ana'], base: 'http://example.com/nested/url', href: 'http://example.com/payper/ban/ana' }
    ].forEach(function generate({ path, base, href }) {
      it(`formats path(${JSON.stringify(path)}) as ${href}`, function () {
        const result = format.call('payper', path, base);

        assume(result).equals(href);
      });
    });

    it('uses the `this` value to configure the path', function () {
      const result = format.call('banana', 'hello', 'https://foo.com/another/path');

      assume(result).equals('https://foo.com/banana/hello');
    });
  });

  describe('extract', function () {
    [
      { path: '/payper/', result: []},
      { path: '/payper/foo@bar', result: [
        { name: 'foo', version: 'bar', bundle: 'foo@bar' }
      ]},
      { path: '/payper/foo@bar/', result: [
        { name: 'foo', version: 'bar', bundle: 'foo@bar' }
      ]},
      { path: '/payper/@ux/accordion@1.2.3', result: [
        { name: '@ux/accordion', version: '1.2.3', bundle: '@ux/accordion@1.2.3' }
      ]},
      { path: '/payper/foo@bar/@ux/accordion@1.2.3', result: [
        { name: 'foo', version: 'bar', bundle: 'foo@bar' },
        { name: '@ux/accordion', version: '1.2.3', bundle: '@ux/accordion@1.2.3' }
      ]},
      { path: '/payper/vendor@1.2.8/accordion@8.9.1', result: [
        { name: 'vendor', version: '1.2.8', bundle: 'vendor@1.2.8' },
        { name: 'accordion', version: '8.9.1', bundle: 'accordion@8.9.1' }
      ]},
      { path: '/payper/@scope/package@1.2.8/@scope/package@8.9.1', result: [
        { name: '@scope/package', version: '1.2.8', bundle: '@scope/package@1.2.8' },
        { name: '@scope/package', version: '8.9.1', bundle: '@scope/package@8.9.1' }
      ]},
      { path: '/payper/sidebar@d31b4fbf8a019bd1533af24b16d4de49f1e860d9/menu@19.1.0-alpha', result: [
        { name: 'sidebar', version: 'd31b4fbf8a019bd1533af24b16d4de49f1e860d9', bundle: 'sidebar@d31b4fbf8a019bd1533af24b16d4de49f1e860d9' },
        { name: 'menu', version: '19.1.0-alpha', bundle: 'menu@19.1.0-alpha' }
      ]},
      { path: '/payper/vendor@1.2.8/accordion@8.9.1/foo', result: [
        { name: 'vendor', version: '1.2.8', bundle: 'vendor@1.2.8' },
        { name: 'accordion', version: '8.9.1', bundle: 'accordion@8.9.1' },
        { name: 'foo', version: undefined, bundle: 'foo' }
      ]},
      { path: '/payper/foo/vendor@1.2.8/accordion@8.9.1', result: [
        { name: 'foo', version: undefined, bundle: 'foo' },
        { name: 'vendor', version: '1.2.8', bundle: 'vendor@1.2.8' },
        { name: 'accordion', version: '8.9.1', bundle: 'accordion@8.9.1' }
      ]},
      { path: '/payper/foo/bar/baz', result: [
        { name: 'foo', version: undefined, bundle: 'foo' },
        { name: 'bar', version: undefined, bundle: 'bar' },
        { name: 'baz', version: undefined, bundle: 'baz' },
      ]}
    ].forEach(function generate({ path, result }) {
      it(`extracts name and version from path(${path})`, function () {
        assume(extract.call('payper', path)).deep.equals(result);
      });
    });

    it('uses the `this` value to configure the path it trigger on', function () {
      assume(extract.call('banana', '/banana/foo@bar')).deep.equals([{ name: 'foo', version: 'bar', bundle: 'foo@bar' }]);
    });
  });
});
