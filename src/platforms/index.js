'use strict';
const { parseUrl, optionsObject } = require('../utils/validation.js');
const { identity } = require('./helpers.js');
const adapters = [
  ['youtube', ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'], require('./youtube.js')],
  ['tiktok', ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'], require('./tiktok.js')],
  ['instagram', ['instagram.com', 'www.instagram.com'], require('./instagram.js')],
  ['facebook', ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'mbasic.facebook.com'], require('./facebook.js')],
  ['x', ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'], require('./x.js')],
  ['threads', ['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'], require('./threads.js')],
  ['reddit', ['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com', 'np.reddit.com', 'm.reddit.com', 'redd.it'], require('./reddit.js')],
  ['linkedin', ['linkedin.com', 'www.linkedin.com'], require('./linkedin.js')],
  ['twitch', ['twitch.tv', 'www.twitch.tv', 'm.twitch.tv', 'clips.twitch.tv'], require('./twitch.js')],
  ['github', ['github.com', 'www.github.com'], require('./github.js')],
  ['vimeo', ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'], require('./vimeo.js')],
  ['bluesky', ['bsky.app', 'www.bsky.app'], require('./bluesky.js')],
];
const registry = new Map(adapters.flatMap(([platform, hosts, identify]) => hosts.map(host => [host, { platform, identify }])));

function identifyUrl(input, options = {}) {
  optionsObject(options);
  const url = parseUrl(input);
  const adapter = !url.port && registry.get(url.hostname);
  return adapter ? adapter.identify(url) || identity(adapter.platform, 'unknown', null, null, null)
    : identity(null, 'unknown', null, null, null);
}

module.exports = { identifyUrl };
