'use strict';
const { identity, profile, resource } = require('./helpers.js');

module.exports = function rumble(url) {
  if (url.hostname !== 'rumble.com' && url.hostname !== 'www.rumble.com') return null;
  let match = url.pathname.match(/^\/embed\/(v[a-z0-9]{2,31})\/?$/);
  if (match) return resource('rumble', 'video', match[1], null, 'embed');
  match = url.pathname.match(/^\/(v[a-z0-9]{2,31})-[A-Za-z0-9][A-Za-z0-9._-]*\.html\/?$/);
  // Public permalink tokens and embed IDs can differ. No arithmetic conversion.
  if (match) return identity('rumble', 'video', match[1], null, null);
  match = url.pathname.match(/^\/(c|user)\/([A-Za-z0-9][A-Za-z0-9_-]{0,99})\/?$/);
  if (!match) return null;
  return match[1] === 'c' ? identity('rumble', 'channel', null, match[2], `rumble:channel:${match[2]}`)
    : profile('rumble', match[2], 'profile', false);
};
