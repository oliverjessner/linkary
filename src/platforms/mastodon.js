'use strict';
const { identity } = require('./helpers.js');
const instances = new Set(['mastodon.social', 'mastodon.online', 'fosstodon.org']);

module.exports = function mastodon(url) {
  if (!instances.has(url.hostname)) return null;
  let match = url.pathname.match(/^\/@([A-Za-z0-9_]{1,30})\/([1-9]\d*)\/?$/) ||
    url.pathname.match(/^\/users\/([A-Za-z0-9_]{1,30})\/statuses\/([1-9]\d*)\/?$/);
  if (match) {
    // Status IDs belong to the serving instance's database, not the entire Fediverse.
    return identity('mastodon', 'post', match[2], match[1], `mastodon:post@${url.hostname}:${match[2]}`);
  }
  match = url.pathname.match(/^\/@([A-Za-z0-9_]{1,30})\/?$/) ||
    url.pathname.match(/^\/users\/([A-Za-z0-9_]{1,30})\/?$/);
  return match ? identity('mastodon', 'profile', null, match[1],
    `mastodon:handle@${url.hostname}:${match[1].toLowerCase()}`) : null;
};
