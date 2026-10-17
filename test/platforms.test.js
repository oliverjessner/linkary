'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { identifyUrl } = require('..');

const fixtures = [
  ['https://youtu.be/abc123', 'youtube', 'video', 'abc123', 'youtube:video:abc123'],
  ['https://www.youtube.com/watch?v=abc123&list=PL42', 'youtube', 'video', 'abc123', 'youtube:video:abc123'],
  ['https://youtube.com/shorts/abc123', 'youtube', 'short', 'abc123', 'youtube:video:abc123'],
  ['https://music.youtube.com/embed/abc123', 'youtube', 'video', 'abc123', 'youtube:video:abc123'],
  ['https://m.youtube.com/live/abc123', 'youtube', 'video', 'abc123', 'youtube:video:abc123'],
  ['https://youtube.com/playlist?list=PL42', 'youtube', 'playlist', 'PL42', 'youtube:playlist:PL42'],
  ['https://youtube.com/channel/UC1234567890123456789012', 'youtube', 'channel', 'UC1234567890123456789012', 'youtube:channel:UC1234567890123456789012'],
  ['https://youtube.com/@Alice', 'youtube', 'channel', null, 'youtube:handle:alice'],
  ['https://www.tiktok.com/@alice/video/123456789', 'tiktok', 'video', '123456789', 'tiktok:video:123456789'],
  ['https://tiktok.com/@alice/photo/123', 'tiktok', 'post', '123', 'tiktok:photo:123'],
  ['https://tiktok.com/@Alice', 'tiktok', 'profile', null, 'tiktok:handle:alice'],
  ['https://instagram.com/p/AbC_12/', 'instagram', 'post', 'AbC_12', 'instagram:media:AbC_12'],
  ['https://www.instagram.com/reel/AbC_12/', 'instagram', 'reel', 'AbC_12', 'instagram:media:AbC_12'],
  ['https://instagram.com/tv/AbC_12/', 'instagram', 'video', 'AbC_12', 'instagram:media:AbC_12'],
  ['https://instagram.com/Alice/', 'instagram', 'profile', null, 'instagram:handle:alice'],
  ['https://facebook.com/profile.php?id=123', 'facebook', 'profile', '123', 'facebook:profile:123'],
  ['https://m.facebook.com/123', 'facebook', 'profile', '123', 'facebook:profile:123'],
  ['https://facebook.com/watch/?v=456', 'facebook', 'video', '456', 'facebook:video:456'],
  ['https://facebook.com/reel/456', 'facebook', 'reel', '456', 'facebook:video:456'],
  ['https://facebook.com/alice/videos/456', 'facebook', 'video', '456', 'facebook:video:456'],
  ['https://facebook.com/permalink.php?story_fbid=456&id=123', 'facebook', 'post', '123/456', 'facebook:post:123/456'],
  ['https://facebook.com/story.php?story_fbid=456&id=123', 'facebook', 'post', '123/456', 'facebook:post:123/456'],
  ['https://facebook.com/123/posts/456', 'facebook', 'post', '123/456', 'facebook:post:123/456'],
  ['https://facebook.com/groups/123/posts/456', 'facebook', 'post', '123/456', 'facebook:group-post:123/456'],
  ['https://facebook.com/Alice', 'facebook', 'profile', null, 'facebook:handle:alice'],
  ['https://x.com/alice/status/123', 'x', 'post', '123', 'x:post:123'],
  ['https://twitter.com/alice/status/123/photo/1', 'x', 'post', '123', 'x:post:123'],
  ['https://x.com/i/web/status/123', 'x', 'post', '123', 'x:post:123'],
  ['https://x.com/Alice', 'x', 'profile', null, 'x:handle:alice'],
  ['https://threads.net/@alice/post/AbC1', 'threads', 'post', 'AbC1', 'threads:post:AbC1'],
  ['https://www.threads.com/@Alice', 'threads', 'profile', null, 'threads:handle:alice'],
  ['https://reddit.com/r/node/comments/abc/title/', 'reddit', 'post', 'abc', 'reddit:post:abc'],
  ['https://old.reddit.com/r/node/comments/abc/title/def/', 'reddit', 'comment', 'def', 'reddit:comment:def'],
  ['https://reddit.com/comments/abc', 'reddit', 'post', 'abc', 'reddit:post:abc'],
  ['https://redd.it/abc', 'reddit', 'post', 'abc', 'reddit:post:abc'],
  ['https://reddit.com/user/Alice', 'reddit', 'profile', null, 'reddit:handle:alice'],
  ['https://reddit.com/u/Alice', 'reddit', 'profile', null, 'reddit:handle:alice'],
  ['https://reddit.com/r/Node', 'reddit', 'channel', null, 'reddit:subreddit:node'],
  ['https://linkedin.com/in/Alice', 'linkedin', 'profile', null, 'linkedin:handle:alice'],
  ['https://linkedin.com/company/Example', 'linkedin', 'channel', 'example', 'linkedin:company:example'],
  ['https://linkedin.com/feed/update/urn:li:activity:123/', 'linkedin', 'post', '123', 'linkedin:post:123'],
  ['https://linkedin.com/posts/alice_hello-activity-123-Ab1', 'linkedin', 'post', '123', 'linkedin:post:123'],
  ['https://twitch.tv/Alice', 'twitch', 'channel', null, 'twitch:handle:alice'],
  ['https://twitch.tv/videos/123', 'twitch', 'video', '123', 'twitch:video:123'],
  ['https://twitch.tv/alice/clip/AbC1', 'twitch', 'video', 'AbC1', 'twitch:clip:AbC1'],
  ['https://clips.twitch.tv/AbC1', 'twitch', 'video', 'AbC1', 'twitch:clip:AbC1'],
  ['https://github.com/OliverJessner/linkary', 'github', 'repository', 'oliverjessner/linkary', 'github:repository:oliverjessner/linkary'],
  ['https://github.com/OliverJessner', 'github', 'profile', null, 'github:handle:oliverjessner'],
  ['https://github.com/owner/repo/issues/12', 'github', 'post', 'owner/repo/issues/12', 'github:issues:owner/repo/issues/12'],
  ['https://github.com/owner/repo/pull/12', 'github', 'post', 'owner/repo/pull/12', 'github:pull:owner/repo/pull/12'],
  ['https://vimeo.com/123', 'vimeo', 'video', '123', 'vimeo:video:123'],
  ['https://player.vimeo.com/video/123', 'vimeo', 'video', '123', 'vimeo:video:123'],
  ['https://vimeo.com/channels/staffpicks/123', 'vimeo', 'video', '123', 'vimeo:video:123'],
  ['https://vimeo.com/groups/shorts/videos/123', 'vimeo', 'video', '123', 'vimeo:video:123'],
  ['https://bsky.app/profile/alice.bsky.social', 'bluesky', 'profile', null, 'bluesky:handle:alice.bsky.social'],
  ['https://bsky.app/profile/alice.bsky.social/post/3abc', 'bluesky', 'post', '3abc', null],
  ['https://bsky.app/profile/did:plc:abcdefghijklmnopqrstuvwx/post/3abc', 'bluesky', 'post', '3abc', 'bluesky:post:did:plc:abcdefghijklmnopqrstuvwx/3abc'],
  ['https://bsky.app/profile/did:plc:abcdefghijklmnopqrstuvwx', 'bluesky', 'profile', 'did:plc:abcdefghijklmnopqrstuvwx', 'bluesky:did:did:plc:abcdefghijklmnopqrstuvwx'],
];

for (const [url, platform, resourceType, resourceId, identityKey] of fixtures) {
  test(`identify ${url}`, () => {
    const result = identifyUrl(url);
    assert.deepEqual({ ...result, profileHandle: undefined }, { platform, resourceType, resourceId, identityKey, profileHandle: undefined });
  });
}

test('platform detection uses exact hosts and conservative path patterns', () => {
  for (const url of ['https://example.org/?url=youtube.com', 'https://youtube.com.evil.test/watch?v=x', 'https://evil-youtube.com/watch?v=x', 'https://youtube.com:8443/watch?v=x']) {
    assert.deepEqual(identifyUrl(url), { platform: null, resourceType: 'unknown', resourceId: null, profileHandle: null, identityKey: null });
  }
  for (const url of [
    'https://youtube.com/watch?v=a&v=b', 'https://youtube.com/watch', 'https://youtube.com/playlist?list=a&list=b',
    'https://youtube.com/channel/fake', 'https://youtu.be/a/extra', 'https://youtube.com/embed/videoseries?list=PL1',
    'https://youtube.com/embed/live_stream?channel=UC1234567890123456789012', 'https://tiktok.com/share/video/123',
    'https://vm.tiktok.com/abc', 'https://vt.tiktok.com/abc', 'https://instagram.com/explore',
    'https://instagram.com/stories/alice/123', 'https://facebook.com/share/p/x', 'https://facebook.com/profile.php?id=1&id=2',
    'https://facebook.com/alice/posts/pfbid123', 'https://facebook.com/permalink.php?story_fbid=123',
    'https://x.com/search', 'https://threads.com/abc', 'https://reddit.com/r/node/wiki/test',
    'https://linkedin.com/jobs/view/123', 'https://twitch.tv/directory', 'https://clips.twitch.tv/embed',
    'https://github.com/settings', 'https://github.com/owner/repo/tree/main', 'https://github.com/owner/repo.git', 'https://vimeo.com/manage/videos/123',
    'https://bsky.app/profile/did:web:example.org', 'https://bsky.app/profile/did:plc:tooshort',
    'https://facebook.com/watch?v=bad', 'https://facebook.com/robots.txt', 'https://instagram.com/robots.txt',
  ]) {
    const identity = identifyUrl(url);
    assert.equal(identity.resourceType, 'unknown', url);
    assert.equal(identity.resourceId, null, url);
    assert.equal(identity.identityKey, null, url);
  }
  assert.equal(identifyUrl('https://tiktok.com/@Alice/video/123').profileHandle, 'Alice');
});
