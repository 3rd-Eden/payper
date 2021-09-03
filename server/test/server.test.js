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

  describe('Meta data', function () {
    it('returns a JS comment', function () {
      const comment = payper.meta({ name: 'foo', version: '1.2.3' });

      assume(comment).startsWith('/*! Payper');
      assume(comment).endsWith('*/');
    });

    it('includes the provided data as meta text', function () {
      const comment = payper.meta({ name: 'foo', version: '1.2.3', cache: true });

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
    });

    it('includes the meta as trailing content', async function () {
      payper.add('foo', async function handler({ version }) {
        return 'this is the actual bundle content that we returned';
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result).is.a('string');
      assume(result).includes('this is the actual bundle content that we returned');
      assume(result).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":true}) */');
    });

    it('returns a console blob when an unknown bundle is requested', async function () {
      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result).is.a('string');
      assume(result).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":false}) */');
      assume(result).includes('404: Could not find the requested bundle');
      assume(result).includes('https://github.com/3rd-Eden/payper/tree/main/api#missing');
    });

    it('can evaluate the failed bundle console blob', async function () {
      payper.add('foo', async function handler({ version }) {
        throw new Error('This thrown error is intentional, it should appear in your test output');
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      const funk = new Function('console', result);
      assume(funk.bind(funk, console)).does.not.throw();
    });

    it('can evaluate the missing bundle console blob', async function () {
      const result = await payper.concat('/payper/foo@1.2.9');

      const funk = new Function('console', result);
      assume(funk.bind(funk, console)).does.not.throw();
    });

    it('returns a console blob when an known bundle returns no data', async function () {
      payper.add('foo', async function handler({ version }) {
        if (version === '1.2.9') return 'this is the actual bundle content that we returned';

        return '';
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result).is.a('string');
      assume(result).includes('this is the actual bundle content that we returned');
      assume(result).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":true}) */');

      const missing = await payper.concat('/payper/foo@2.2.9');

      assume(missing).is.a('string');
      assume(missing).includes('/*! Payper meta({"name":"foo","version":"2.2.9","cache":false}) */');
      assume(missing).includes('404: Could not find the requested bundle');
      assume(missing).includes('https://github.com/3rd-Eden/payper/tree/main/api#missing');
    });

    it('combines multiple bundles into a single response', async function () {
      payper.add('foo', async function handler({ version }) {
        return 'this is the actual bundle content that we returned';
      });

      const result = await payper.concat('/payper/foo@1.2.9/bar@2.2.9')

      assume(result).is.a('string');
      assume(result).includes('this is the actual bundle content that we returned');
      assume(result).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":true}) */');
      assume(result).includes('/*! Payper meta({"name":"bar","version":"2.2.9","cache":false}) */');
      assume(result).includes('404: Could not find the requested bundle');
      assume(result).includes('https://github.com/3rd-Eden/payper/tree/main/api#missing');
    });

    it('returns a console blob when the handler throws an error', async function () {
      payper.add('foo', async function handler({ version }) {
        throw new Error('This thrown error is intentional, it should appear in your test output');
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result).is.a('string');
      assume(result).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":false}) */');
      assume(result).includes('500: An error occured while loading bundle');
      assume(result).includes('This thrown error is intentional, it should appear in your test output');
      assume(result).includes('https://github.com/3rd-Eden/payper/tree/main/api#failure');
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
          assume(writtenHead.headers['Content-Length']).equals(404);

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
