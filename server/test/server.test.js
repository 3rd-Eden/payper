const { describe, it, beforeEach } = require('mocha');
const Payper = require('../index.js');
const assume = require('assume');

describe('Payper Server', function () {
  let payper;

  beforeEach(function () {
    payper = new Payper();
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

      assume(comment).startsWith('/*!');
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
        throw new Error('this is going to break');
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
        throw new Error('Simulating a failed handler');
      });

      const result = await payper.concat('/payper/foo@1.2.9');

      assume(result).is.a('string');
      assume(result).includes('/*! Payper meta({"name":"foo","version":"1.2.9","cache":false}) */');
      assume(result).includes('500: An error occured while loading bundle');
      assume(result).includes('Simulating a failed handler');
      assume(result).includes('https://github.com/3rd-Eden/payper/tree/main/api#failure');
    });
  });
});
