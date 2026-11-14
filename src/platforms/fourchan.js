'use strict';
const { resource } = require('./helpers.js');

const reserved = new Set(['faq', 'rules', 'search', 'catalog', 'archive', 'robots', 'index']);

module.exports = function fourchan(url) {
  if (!['boards.4chan.org', 'boards.4channel.org'].includes(url.hostname)) return null;
  let match = url.pathname.match(/^\/([a-z0-9]+)\/thread\/([1-9]\d*)(?:\/[^/]+)?\/?$/);
  if (match && !reserved.has(match[1])) {
    // Post numbers are board-local; the #p anchor addresses a post, not its thread.
    if (url.hash) {
      const post = url.hash.match(/^#p([1-9]\d*)$/);
      return post ? resource('4chan', 'post', `${match[1]}/${post[1]}`) : null;
    }
    return resource('4chan', 'thread', `${match[1]}/${match[2]}`);
  }
  match = url.pathname.match(/^\/([a-z0-9]+)\/?$/);
  return match && !reserved.has(match[1]) && !url.hash
    ? resource('4chan', 'channel', match[1], null, 'board') : null;
};
