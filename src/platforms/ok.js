'use strict';
const { resource } = require('./helpers.js');

module.exports = function ok(url) {
  let match = url.pathname.match(/^\/profile\/([1-9]\d*)\/?$/);
  if (match) return resource('ok', 'profile', match[1]);
  match = url.pathname.match(/^\/group\/([1-9]\d*)\/?$/);
  if (match) return resource('ok', 'channel', match[1], null, 'group');
  match = url.pathname.match(/^\/group\/?([1-9]\d*)\/topic\/([1-9]\d*)\/?$/);
  // Preserve the explicit owner as well as the topic ID; vanity owners stay unknown.
  return match ? resource('ok', 'post', `${match[1]}/${match[2]}`, null, 'group-post') : null;
};
