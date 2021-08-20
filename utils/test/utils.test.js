const { describe, it } = require('mocha');
const matches = require('../matches');
const extract = require('../extract');
const format = require('../format');
const assume = require('assume');

describe('Payper Utils', function () {
  describe('matches', function () {
    [
      { url: '/deep/payper/foo@bar', method: 'GET', expected: true },
      { url: '/deep/payper/foo@bar', method: 'HEAD', expected: true },
      { url: '/payper/foo@bar', method: 'GET', expected: true },
      { url: '/payper/foo@bar', method: 'HEAD', expected: true },
      { url: '/payper/foo@bar', method: 'POST', expected: false },
      { url: '/banana', method: 'HEAD', expected: false },
      { url: '/banana', method: 'GET', expected: false }
    ].forEach(function generate({ url, method, expected }) {
      it(`url(${url}), method(${method}) is a ${expected ? 'valid' : 'invalid'} url`, function () {
        const result = matches({ url, method });

        assume(result).equals(expected);
      });
    });
  });

  describe('format', function () {
    [
      { path: 'banana', base: 'http://example.com/nested/url', href: 'http://example.com/payper/banana' },
      { path: ['ban', 'ana'], base: 'http://example.com/nested/url', href: 'http://example.com/payper/ban/ana' }
    ].forEach(function generate({ path, base, href }) {
      it(`formats path(${JSON.stringify(path)}) as ${href}`, function () {
        const result = format(path, base);

        assume(result).equals(href);
      });
    });
  });

  describe('extract', function () {
    [
      { path: '/payper/foo@bar', result: [{ name: 'foo', version: 'bar', bundle: 'foo@bar' }] },
      { path: '/payper/c@r@u78a12', result: [{ name: 'c@r', version: 'u78a12', bundle: 'c@r@u78a12' }] },
      { path: '/payper/vendor@1.2.8/accordion@8.9.1', result: [
        { name: 'vendor', version: '1.2.8', bundle: 'vendor@1.2.8' },
        { name: 'accordion', version: '8.9.1', bundle: 'accordion@8.9.1' }
      ]},
      { path: '/payper/foo/bar/baz', result: [
        { name: 'foo', version: '', bundle: 'foo' },
        { name: 'bar', version: '', bundle: 'bar' },
        { name: 'baz', version: '', bundle: 'baz' },
      ]}
    ].forEach(function generate({ path, result }) {
      it(`extracts name and version from path(${path})`, function () {
        assume(extract(path)).deep.equals(result);
      });
    });
  });
});
