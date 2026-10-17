'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('CommonJS require, ESM named imports and ESM default imports agree', async () => {
  const commonjs = require('linkary');
  const esm = await import('linkary');
  const names = ['inspectUrl', 'normalizeUrl', 'cleanUrl', 'resolveUrl', 'identifyUrl', 'compareUrls', 'inspectMany',
    'isValidUrl', 'isShortUrl', 'extractHostname', 'extractQueryParams', 'LinkaryError'];
  assert.deepEqual(Object.keys(commonjs).sort(), names.sort());
  for (const name of names) assert.equal(esm[name], commonjs[name]);
  assert.equal(esm.default, commonjs);
  assert.equal(esm.inspectUrl('https://example.org') instanceof Promise, false);
});
