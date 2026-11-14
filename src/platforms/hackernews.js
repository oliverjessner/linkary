'use strict';
const { resource, profile, single } = require('./helpers.js');

module.exports = function hackernews(url) {
  if (url.hash) return null;
  const id = single(url, 'id');
  if (url.pathname === '/item' && id && /^[1-9]\d*$/.test(id)) {
    // Story/comment/poll/job subtypes are not encoded in an item permalink.
    return resource('hackernews', 'post', id, null, 'item');
  }
  if (url.pathname === '/user' && id && /^[A-Za-z0-9_-]+$/.test(id)) {
    return profile('hackernews', id, 'profile', false);
  }
  return null;
};
