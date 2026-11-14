'use strict';
const { profile, resource } = require('./helpers.js');
const reserved = new Set(['pin', 'search', 'ideas', 'today', 'business', 'login', 'logout', 'settings',
  'signup', 'password', 'categories', 'explore', 'shopping', 'notifications', 'messages', 'oauth',
  'resource', 'about', 'help', 'policy', 'terms', 'privacy']);

module.exports = function pinterest(url) {
  // A pin.it token is a redirect token, not a Pin ID or a username.
  if (url.hostname === 'pin.it') return null;
  let match = url.pathname.match(/^\/pin\/([1-9]\d*)\/?$/);
  if (match) return resource('pinterest', 'post', match[1], null, 'pin');
  match = url.pathname.match(/^\/([A-Za-z0-9_]{1,30})\/?$/);
  return match && !reserved.has(match[1].toLowerCase()) ? profile('pinterest', match[1]) : null;
};
