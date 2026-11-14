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
  ['4chan', ['4chan.org', 'www.4chan.org', '4channel.org', 'www.4channel.org', 'boards.4chan.org', 'boards.4channel.org'], require('./fourchan.js')],
  ['discord', ['discord.com', 'discordapp.com', 'discord.gg'], require('./discord.js')],
  ['telegram', ['t.me', 'telegram.me', 'telegram.dog'], require('./telegram.js')],
  ['whatsapp', ['wa.me', 'api.whatsapp.com'], require('./whatsapp.js')],
  ['signal', ['signal.me', 'signal.group', 'signal.link'], require('./signal.js')],
  ['lemmy', ['lemmy.ml', 'lemmy.world'], require('./lemmy.js')],
  ['steam', ['steamcommunity.com'], require('./steam.js')],
  ['hackernews', ['news.ycombinator.com'], require('./hackernews.js')],
  ['snapchat', ['snapchat.com', 'www.snapchat.com'], require('./snapchat.js')],
  ['truthsocial', ['truthsocial.com', 'www.truthsocial.com'], require('./truthsocial.js')],
  ['pinterest', ['pinterest.com', 'www.pinterest.com', 'pinterest.de', 'www.pinterest.de', 'at.pinterest.com', 'ch.pinterest.com', 'pin.it'], require('./pinterest.js')],
  ['tumblr', ['tumblr.com', 'www.tumblr.com'], require('./tumblr.js')],
  ['mastodon', ['mastodon.social', 'mastodon.online', 'fosstodon.org'], require('./mastodon.js')],
  ['vk', ['vk.com', 'www.vk.com', 'm.vk.com', 'vk.ru', 'www.vk.ru', 'm.vk.ru'], require('./vk.js')],
  ['weibo', ['weibo.com', 'www.weibo.com'], require('./weibo.js')],
  ['ok', ['ok.ru', 'www.ok.ru', 'm.ok.ru'], require('./ok.js')],
  ['medium', ['medium.com', 'www.medium.com'], require('./medium.js')],
  ['substack', ['substack.com', 'www.substack.com'], require('./substack.js')],
  ['spotify', ['spotify.com', 'www.spotify.com', 'open.spotify.com', 'play.spotify.com', 'spotify.link'], require('./spotify.js')],
  ['soundcloud', ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com'], require('./soundcloud.js')],
  ['dailymotion', ['dailymotion.com', 'www.dailymotion.com', 'geo.dailymotion.com', 'dai.ly'], require('./dailymotion.js')],
  ['rumble', ['rumble.com', 'www.rumble.com'], require('./rumble.js')],
  ['kick', ['kick.com', 'www.kick.com'], require('./kick.js')],
  ['flickr', ['flickr.com', 'www.flickr.com', 'flic.kr'], require('./flickr.js')],
  ['gitlab', ['gitlab.com'], require('./gitlab.js')],
  ['bilibili', ['bilibili.com', 'www.bilibili.com', 'm.bilibili.com', 'player.bilibili.com', 'space.bilibili.com', 'b23.tv'], require('./bilibili.js')],
];
const registry = new Map(adapters.flatMap(([platform, hosts, identify]) => hosts.map(host => [host, { platform, identify }])));
// Hosted blog/publication domains are only recognized by an adapter's explicit rule.
const hostedAdapters = adapters.filter(([, , identify]) => typeof identify.matchesHost === 'function')
  .map(([platform, , identify]) => ({ platform, identify }));

function identifyUrl(input, options = {}) {
  optionsObject(options);
  const url = parseUrl(input);
  const adapter = !url.port && (registry.get(url.hostname) ||
    hostedAdapters.find(({ identify }) => identify.matchesHost(url.hostname)));
  return adapter ? adapter.identify(url) || identity(adapter.platform, 'unknown', null, null, null)
    : identity(null, 'unknown', null, null, null);
}

module.exports = { identifyUrl };
