'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compareUrls } = require('..');

test('comparison levels are deterministic and offline', () => {
  assert.equal(compareUrls('https://a.test', 'https://a.test').reason, 'exact');
  assert.equal(compareUrls('HTTP://a.test:80', 'http://a.test/').reason, 'normalized');
  assert.equal(compareUrls('https://a.test/?utm_source=x', 'https://a.test/').reason, 'clean');
  const result = compareUrls('https://youtu.be/abc123', 'https://youtube.com/shorts/abc123');
  assert.deepEqual(result, { exactMatch: false, normalizedMatch: false, cleanMatch: false, sameResource: true,
    identityKeyA: 'youtube:video:abc123', identityKeyB: 'youtube:video:abc123', reason: 'platform-identity' });
  assert.equal(compareUrls('https://youtube.com/watch?v=a', 'https://youtube.com/watch?v=b').sameResource, false);
  assert.equal(compareUrls('https://twitter.com/alice/status/123', 'https://x.com/bob/status/123').sameResource, true);
  assert.equal(compareUrls('https://x.com/alice', 'https://instagram.com/alice').sameResource, false);
  assert.equal(compareUrls('https://a.test/one', 'https://a.test/two').sameResource, null);
  assert.equal(compareUrls('https://a.test/#one', 'https://a.test/#two').sameResource, null);
  assert.equal(compareUrls('https://a.test/?v=one', 'https://a.test/?v=two').sameResource, null);
  assert.equal(compareUrls('https://youtube.com/@alice', 'https://youtube.com/channel/UC1234567890123456789012').sameResource, null);
  assert.equal(compareUrls('https://bsky.app/profile/a.example/post/x', 'https://bsky.app/profile/b.example/post/x').sameResource, null);
});
