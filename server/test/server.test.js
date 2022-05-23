const { describe, it, beforeEach } = require('mocha');
const { prefix, suffix } = require('../iife.js');
const Payper = require('../index.js');
const assume = require('assume');

describe('Payper Server', function () {
  let payper;

  beforeEach(function () {
    payper = new Payper();
  });

  describe('Server configuration', function () {
    it('configures a logger', function () {
      assume(payper.logger).equals(console);

      payper.logger.error('Dont be alarmed, the console message is intentional', new Error('example'));
    });
  });

  describe('Bundle Registration', function () {
    it('throws an error on duplicate bundle names', function () {
      payper.add('vendor', function () {});

      assume(function () {
        payper.add('vendor', function () {});
      }).throws('Duplicate bundle(vendor) added')
    });
  });

  describe('Meta data comment', function () {
    it('a function', function () {
      assume(payper.comment).is.a('function');
    });

    it('returns a JS comment', function () {
      const comment = payper.comment({ name: 'foo', version: '1.2.3' });

      assume(comment).startsWith('/*! Payper');
      assume(comment).endsWith('*/');
    });

    it('includes the provided data as meta text', function () {
      const comment = payper.comment({ name: 'foo', version: '1.2.3', cache: true });

      assume(comment).includes('meta({"name":"foo","version":"1.2.3","cache":true})');
    });
  });

  describe('Bundle concatination', function () {
    it('calls the supplied bundle handler with the requested version', async function () {
      let called = false;

      payper.add('foo', async function handler({ version }) {
        assume(version).equals('1.2.9');
        called = true;

        return 'bar';
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(called).is.true();
      assume(result).exists();
    });

    it('returns an object with source and meta data', async function () {
      payper.add('foo', async function handler({ version, name, bundle }) {
        assume(version).equals('1.2.9');
        assume(name).equals('foo');
        assume(bundle).equals('foo@1.2.9');

        return 'this is the actual bundle content that we returned';
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result).is.a('object');
      assume(result.source).is.a('string');
      assume(result.source).includes('this is the actual bundle content that we returned');

      assume(result.cache).is.a('boolean');
      assume(result.cache).is.true();

      assume(result.issues).is.a('array');
      assume(result.issues).is.length(0);
    });

    it('includes the meta as trailing content', async function () {
      payper.add('foo', async function handler({ version, name, bundle }) {
        assume(version).equals('1.2.9');
        assume(name).equals('foo');
        assume(bundle).equals('foo@1.2.9');

        return 'this is the actual bundle content that we returned';
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result.source).is.a('string');
      assume(result.source).includes('this is the actual bundle content that we returned');
      assume(result.source).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":true}) */');
    });

    it('returns a console blob when an unknown bundle is requested', async function () {
      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result.source).is.a('string');
      assume(result.source).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":false}) */');
      assume(result.source).includes('404: Could not find the requested bundle');
      assume(result.source).includes('https://github.com/3rd-Eden/payper/tree/main/api#missing');
    });

    it('allows a catch-all handler to be assigned', async function () {
      let called = false;

      payper.add(async function handler({ version }) {
        assume(version).equals('1.2.9');
        called = true;

        return 'bar';
      });

      payper.add(async function handler() {
        throw new Error('I should not be called as result was handled');
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(called).is.true();
      assume(result).exists();
    });

    it('allows multiple catch-all handlers to be assigned', async function () {
      let called = [];

      payper.add('*', async function handler({ version }) {
        assume(version).equals('1.2.9');
        called.push(1);
      });

      payper.add('*', async function handler({ version }) {
        assume(version).equals('1.2.9');
        called.push(2);

        return 'bar';
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(called).deep.equals([1, 2]);
      assume(result).exists();
    });

    it('can evaluate the failed bundle console blob', async function () {
      payper.add('foo', async function handler({ version, name, bundle }) {
        assume(version).equals('1.2.9');
        assume(name).equals('foo');
        assume(bundle).equals('foo@1.2.9');

        throw new Error('This thrown error is intentional, it should appear in your test output');
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      const funk = new Function('console', result.source);
      assume(funk.bind(funk, console)).does.not.throw();
    });

    it('can evaluate the missing bundle console blob', async function () {
      const result = await payper.concat('/payper/foo@1.2.9');

      const funk = new Function('console', result.source);
      assume(funk.bind(funk, console)).does.not.throw();
    });

    it('returns a console blob when an known bundle returns no data', async function () {
      payper.add('foo', async function handler({ version, name, bundle }) {
        assume(name).equals('foo');
        assume(version).is.either(['1.2.9', '2.2.9']);
        assume(bundle).is.either(['foo@1.2.9', 'foo@2.2.9']);

        if (version === '1.2.9') return 'this is the actual bundle content that we returned';

        return '';
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result.source).is.a('string');
      assume(result.source).includes('this is the actual bundle content that we returned');
      assume(result.source).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":true}) */');

      assume(result.issues).is.length(0);
      assume(result.cache).true();

      const missing = await payper.concat('/payper/foo@2.2.9');

      assume(missing.source).is.a('string');
      assume(missing.source).includes('/*! Payper meta({"name":"foo","version":"2.2.9","cache":false}) */');
      assume(missing.source).includes('404: Could not find the requested bundle');
      assume(missing.source).includes('https://github.com/3rd-Eden/payper/tree/main/api#missing');

      assume(missing.cache).false();
      assume(missing.issues).is.length(1);
      assume(missing.issues[0]).equals('foo@2.2.9');
    });

    it('combines multiple bundles into a single response', async function () {
      payper.add('foo', async function handler({ version, name, bundle }) {
        assume(version).equals('1.2.9');
        assume(name).equals('foo');
        assume(bundle).equals('foo@1.2.9');

        return 'this is the actual bundle content that we returned';
      });

      const result = await payper.concat('/payper/foo@1.2.9/bar@2.2.9')

      assume(result.source).is.a('string');
      assume(result.source).includes('this is the actual bundle content that we returned');
      assume(result.source).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":true}) */');
      assume(result.source).includes('/*! Payper meta({"name":"bar","version":"2.2.9","cache":false}) */');
      assume(result.source).includes('404: Could not find the requested bundle');
      assume(result.source).includes('https://github.com/3rd-Eden/payper/tree/main/api#missing');

      assume(result.cache).is.false();
      assume(result.issues).is.length(1);
      assume(result.issues[0]).equals('bar@2.2.9');
    });

    it('returns a console blob when the handler throws an error', async function () {
      payper.add('foo', async function handler({ version, name, bundle }) {
        assume(version).equals('1.2.9');
        assume(name).equals('foo');
        assume(bundle).equals('foo@1.2.9');

        throw new Error('This thrown error is intentional, it should appear in your test output');
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result.source).is.a('string');
      assume(result.source).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":false}) */');
      assume(result.source).includes('500: An error occured while loading bundle');
      assume(result.source).includes('This thrown error is intentional, it should appear in your test output');
      assume(result.source).includes('https://github.com/3rd-Eden/payper/tree/main/api#failure');

      assume(result.cache).is.false();
      assume(result.issues).is.length(1);
      assume(result.issues[0]).equals('foo@1.2.9');
    });
  });

  describe('HTTP intercepting', function () {
    it('returns false for non-matching URLs', function () {
      const intercepted = payper.intercept({ urL: '/yo/not-a/url/we-support' });

      assume(intercepted).is.false();
    });

    it('returns true for matching URLs', function () {
      const intercepted = payper.intercept({ url: '/payper/foo@bar' }, {
        writeHead: () => {},
        end: () => {}
      });

      assume(intercepted).is.true();
    });

    it('writes the response to the received http response', function (next) {
      payper.add('foo', async function handler({ version }) {
        assume(version).equals('1.2.9');

        return 'this is the returned content';
      });

      let writtenHead;

      payper.intercept({ url: '/payper/foo@1.2.9' }, {
        writeHead: function (code, headers){
          writtenHead = { code, headers };
        },

        end: function (contents) {
          assume(writtenHead.code).equals(200);
          assume(writtenHead.headers['Content-Type']).equals('text/javascript');

          //
          // If you're looking why this test failed, it's most likely this line
          // where we assert if all content is included in the response by
          // looking at the content length.
          //
          assume(writtenHead.headers['Content-Length']).equals(435);

          assume(contents).includes(prefix);
          assume(contents).includes(suffix);
          assume(contents).includes('this is the returned content');
          assume(contents).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":true}) */');

          next();
        }
      });
    });
  });
});
