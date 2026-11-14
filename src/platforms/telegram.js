'use strict';
const { identity, resource, profile } = require('./helpers.js');

const reserved = new Set([
  'a', 'addemoji', 'addlist', 'addstickers', 'addstyle', 'addtheme', 'auction', 'auth',
  'bg', 'boost', 'c', 'call', 'confirmphone', 'contact', 'giftcode', 'invoice',
  'iv', 'joinchat', 'k', 'login', 'm', 'msg', 'nft', 'oauth', 'proxy', 's',
  'setlanguage', 'share', 'socks', 'web', 'z',
]);
const modifiers = new Set([
  'attach', 'boost', 'choose', 'comment', 'direct', 'embed', 'game', 'livestream',
  'mode', 'option', 'single', 'start', 'startapp', 'startattach', 'startchannel',
  'startgroup', 'story', 't', 'task', 'thread', 'videochat', 'voicechat',
]);
const username = '[A-Za-z][A-Za-z0-9_]{3,31}';
const publicMessage = new RegExp(`^/(?:s/)?(${username})/([1-9]\\d*)/?$`);
const publicProfile = new RegExp(`^/(${username})/?$`);

module.exports = function telegram(url) {
  // These links can address a different peer, comment, topic, call or app action.
  if ([...url.searchParams.keys()].some(key => modifiers.has(key))) return null;
  let match = url.pathname.match(/^\/(?:joinchat\/|\+)([A-Za-z0-9_-]+)\/?$/);
  if (match) {
    // +<digits> can instead be a phone-number link; do not guess its interpretation.
    return /^\d+$/.test(match[1]) ? null : resource('telegram', 'invite', match[1]);
  }
  match = url.pathname.match(/^\/c\/([1-9]\d*)\/([1-9]\d*)\/?$/);
  if (match) return resource('telegram', 'message', `${match[1]}/${match[2]}`);
  match = url.pathname.match(publicMessage);
  if (match && !reserved.has(match[1].toLowerCase())) {
    // A public username cannot be mapped to a numeric chat ID without a lookup.
    return identity('telegram', 'message', match[2], match[1], null);
  }
  match = url.pathname.match(publicProfile);
  // The same public handle syntax serves users, groups, channels and bots.
  return match && !reserved.has(match[1].toLowerCase()) ? profile('telegram', match[1]) : null;
};
