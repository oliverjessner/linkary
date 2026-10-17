'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspectUrl, isShortUrl } = require('..');

test('flat offline inspection reports URL parts without inventing domains or IDs', () => {
  const input = 'https://www.youtube.com:443/watch?v=abc123&v=ambiguous&utm_source=mail#t=4';
  assert.deepEqual(inspectUrl(input), {
    originalUrl: input, normalizedUrl: 'https://www.youtube.com/watch?v=abc123&v=ambiguous&utm_source=mail#t=4',
    cleanUrl: 'https://www.youtube.com/watch?v=abc123&v=ambiguous#t=4', protocol: 'https:',
    hostname: 'www.youtube.com', port: null, pathname: '/watch',
    query: [['v', 'abc123'], ['v', 'ambiguous'], ['utm_source', 'mail']], fragment: 't=4',
    isHttps: true, isShortUrl: false, trackingParameters: ['utm_source'], platform: 'youtube', resourceType: 'unknown', resourceId: null,
  });
  assert.equal(inspectUrl('http://a.b.co.uk:8080/x').hostname, 'a.b.co.uk');
  assert.equal(inspectUrl('http://a.b.co.uk:8080/x').port, '8080');
  assert.equal(inspectUrl('http://a.test').fragment, null);
  assert.equal(inspectUrl('http://a.test').platform, null);
  assert.equal(inspectUrl('http://a.test').isHttps, false);
});

test('shortlink registry and custom rules use exact hostnames', () => {
  for (const host of ['bit.ly', 't.co', 'tinyurl.com', 'ow.ly', 'buff.ly', 'is.gd', 'cutt.ly', 'youtu.be', 'vm.tiktok.com', 'vt.tiktok.com']) {
    assert.equal(isShortUrl(`https://${host}/test`), true);
  }
  for (const url of ['https://example.org/a', 'https://bit.ly.evil.test/a', 'https://not-bit.ly/a', 'https://www.bit.ly/a']) assert.equal(isShortUrl(url), false);
  assert.equal(isShortUrl('https://go.example.org/a', { shortlinkDomains: ['GO.example.org'] }), true);
  assert.equal(inspectUrl('https://go.example.org/a', { shortlinkDomains: ['go.example.org'] }).isShortUrl, true);
  for (const host of ['https://go.example.org', 'go.example.org/path', 'go.example.org:443', 'x@go.example.org']) {
    assert.throws(() => isShortUrl('https://a.test/', { shortlinkDomains: [host] }), { code: 'ERR_INVALID_OPTIONS' });
  }
});
