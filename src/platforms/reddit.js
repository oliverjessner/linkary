'use strict';
const { identity, resource, profile } = require('./helpers.js');
module.exports = function reddit(url) {
  let match;
  if (url.hostname === 'redd.it') {
    match = url.pathname.match(/^\/([a-z0-9]+)\/?$/i);
    return match ? resource('reddit', 'post', match[1].toLowerCase()) : null;
  }
  match = url.pathname.match(/^\/(?:r\/[A-Za-z0-9_]+\/)?comments\/([a-z0-9]+)(?:\/[^/]+(?:\/([a-z0-9]+))?)?\/?$/i);
  if (match) return resource('reddit', match[2] ? 'comment' : 'post', (match[2] || match[1]).toLowerCase());
  match = url.pathname.match(/^\/(?:u|user)\/([A-Za-z0-9_-]+)\/?$/);
  if (match) return profile('reddit', match[1]);
  match = url.pathname.match(/^\/r\/([A-Za-z0-9_]+)\/?$/);
  return match ? identity('reddit', 'channel', null, match[1], `reddit:subreddit:${match[1].toLowerCase()}`) : null;
};
