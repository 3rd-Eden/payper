const Payper = require('../server/index.js');
const fs = require('fs/promises');
const path = require('path');
const payper = new Payper();

const bundles = path.join(__dirname, 'bundles');

/**
 * Create a really basic catch-all handler as we just want to serve any of the
 * files that are in our dedicated bundles folder.
 *
 * We assume that
 */
payper.add(async function handler({ name, version }) {
  const files = await fs.readdir(bundles);
  const target = `${name}-${version}.js`;

  for (let i = 0; i < files.length; i++) {
    if (files[i] === target) {
      return await fs.readFile(path.join(bundles, target), { encoding: 'utf-8' });
    }
  }
});

//
// Expose our configured Payper instance.
//
module.exports = payper;
