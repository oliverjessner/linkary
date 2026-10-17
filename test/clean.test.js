'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanUrl } = require('..');

test('known tracking keys are removed case insensitively without rebuilding survivors', () => {
  const result = cleanUrl('https://youtube.com/watch?v=abc123&UTM_source=x&fbclid=x&v=two&list=PL1&q=a%20b~&sig=%2f+&ref=source&source=ref#t=4');
  assert.equal(result.cleanUrl, 'https://youtube.com/watch?v=abc123&v=two&list=PL1&q=a%20b~&sig=%2f+&ref=source&source=ref#t=4');
  assert.deepEqual(result.removedParameters, ['UTM_source', 'fbclid']);
  for (const key of ['utm_custom', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'ttclid', 'mc_cid', 'mc_eid', 'igsh', 'igshid']) {
    assert.equal(cleanUrl(`https://a.test/?${key}=x&id=7&page=2&lang=en&search=z`).cleanUrl, 'https://a.test/?id=7&page=2&lang=en&search=z');
  }
});

test('preserve rules override defaults and custom removal; reports retain occurrences', () => {
  const result = cleanUrl('https://a.test/?utm_x=1&campaign_id=2&UTM_x=3&v=abc', { removeParams: ['campaign_id', 'v'], preserveParams: ['V'] });
  assert.equal(result.cleanUrl, 'https://a.test/?v=abc');
  assert.deepEqual(result.removedParameters, ['utm_x', 'campaign_id', 'UTM_x']);
  assert.equal(cleanUrl('https://a.test/?utm_x=1', { preserveParams: ['UTM_x'] }).cleanUrl, 'https://a.test/?utm_x=1');
  assert.equal(cleanUrl('https://a.test/?%75tm_x=x&z=1').cleanUrl, 'https://a.test/?z=1');
  assert.equal(cleanUrl('https://a.test/?utm_x=x').cleanUrl, 'https://a.test/');
  assert.equal(cleanUrl('https://a.test/?').cleanUrl, 'https://a.test/?');
  assert.throws(() => cleanUrl('https://a.test/', { removeParams: 'id' }), { code: 'ERR_INVALID_OPTIONS' });
});
