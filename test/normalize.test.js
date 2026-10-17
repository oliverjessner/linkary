'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUrl, isValidUrl, extractHostname, extractQueryParams, LinkaryError } = require('..');

test('WHATWG normalization preserves resource semantics', () => {
  assert.equal(normalizeUrl('HTTP://ExAmPle.COM:80/a/../Case/'), 'http://example.com/Case/');
  assert.equal(normalizeUrl('https://bücher.example:443/a'), 'https://xn--bcher-kva.example/a');
  assert.equal(normalizeUrl('http://0x7f000001'), 'http://127.0.0.1/');
  assert.equal(normalizeUrl('http://[2001:0db8::1]:80/'), 'http://[2001:db8::1]/');
  assert.equal(normalizeUrl('https://WWW.example.com/A'), 'https://www.example.com/A');
  assert.notEqual(normalizeUrl('https://a.test/A'), normalizeUrl('https://a.test/a'));
  assert.notEqual(normalizeUrl('https://a.test/x'), normalizeUrl('https://a.test/x/'));
});

test('signed and repeated queries, escape bytes, empty delimiters and fragments survive', () => {
  for (const suffix of ['?b=2&a=1&a=2&sig=A%2fb+%20~#part', '/%2F/%7e?q=%2f', '?', '#', '?q=one+two&q=one%20two']) {
    const url = `https://a.test${suffix.startsWith('/') ? '' : '/'}${suffix}`;
    assert.equal(normalizeUrl(url), url);
  }
  assert.equal(normalizeUrl('https://a.test/#route', { stripFragment: true }), 'https://a.test/');
});

test('validation and helpers have predictable synchronous behavior', () => {
  for (const input of ['', null, 42, 'example.com', 'https:example.com', '/relative', 'https://a.test/ a', 'https://a.test/\n']) {
    assert.equal(isValidUrl(input), false);
    assert.throws(() => normalizeUrl(input), { code: 'ERR_INVALID_URL' });
  }
  assert.throws(() => normalizeUrl('file:///tmp/a'), { code: 'ERR_UNSUPPORTED_SCHEME' });
  assert.throws(() => normalizeUrl('https://user:pass@a.test'), { code: 'ERR_CREDENTIALS' });
  assert.equal(extractHostname('https://a.b.co.uk/x'), 'a.b.co.uk');
  assert.deepEqual(extractQueryParams('https://a.test/?x=1&x=2&__proto__=ok'), [['x', '1'], ['x', '2'], ['__proto__', 'ok']]);
  assert.throws(() => normalizeUrl('https://a.test', null), { code: 'ERR_INVALID_OPTIONS' });
  assert.throws(() => normalizeUrl('https://a.test', { stripFragment: 1 }), LinkaryError);
  assert.deepEqual(new LinkaryError('ERR_INVALID_URL', 'bad').toJSON(), { name: 'LinkaryError', code: 'ERR_INVALID_URL', message: 'bad' });
});
