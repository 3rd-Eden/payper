const PayperService = require('./index.js');
const { describe, it } = require('mocha');
const assume = require('assume');

describe('PayperService', function () {
  let payper;

  beforeEach(function () {
    payper = new PayperService();
  });

  describe('Bundle Registration', function () {
    it('throws an error on duplicate bundle names', function () {
      payper.add('vendor', function () {});

      assume(function () {
        payper.add('vendor', function () {});
      }).throws('Duplicate bundle(vendor) added')
    });
  });
});
