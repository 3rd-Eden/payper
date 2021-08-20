const { describe, it, beforeEach } = require('mocha');
const Payper = require('../index.js');
const assume = require('assume');

describe('Payper Service Worker', function () {
  let payper;

  beforeEach(function () {
    payper = new Payper({ version: '0.0.0', ttl: 3650998091 });
  });

  it('should write tests here');
});
