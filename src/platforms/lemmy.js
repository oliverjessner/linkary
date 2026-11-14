'use strict';
const { identity, resource } = require('./helpers.js');

module.exports = function lemmy(url) {
  if (!['lemmy.ml', 'lemmy.world'].includes(url.hostname)) return null;
  // Fragments can focus a different comment; only bare resource URLs are supported.
  if (url.hash) return null;
  let match = url.pathname.match(/^\/post\/([1-9]\d*)\/?$/);
  if (match) return resource('lemmy', 'post', match[1], null, `post@${url.hostname}`);
  match = url.pathname.match(/^\/(u|c)\/([A-Za-z0-9_-]+(?:@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)?)\/?$/);
  if (!match) return null;
  // Names can resolve to a federated actor or alias. Keep the visible handle,
  // but require the actor URI before assigning a stable cross-instance identity.
  return identity('lemmy', match[1] === 'u' ? 'profile' : 'channel', null, match[2], null);
};
