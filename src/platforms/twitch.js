'use strict';
const { resource, profile } = require('./helpers.js');
const reserved = new Set(['directory', 'downloads', 'jobs', 'p', 'settings', 'subscriptions', 'wallet', 'inventory', 'videos', 'search', 'turbo', 'login', 'signup']);
module.exports = function twitch(url) {
  let match;
  if (url.hostname === 'clips.twitch.tv') {
    match = url.pathname.match(/^\/([A-Za-z0-9_-]+)\/?$/);
    return match && match[1] !== 'embed' ? resource('twitch', 'video', match[1], null, 'clip') : null;
  }
  match = url.pathname.match(/^\/videos\/(\d+)\/?$/);
  if (match) return resource('twitch', 'video', match[1]);
  match = url.pathname.match(/^\/([A-Za-z0-9_]+)\/clip\/([A-Za-z0-9_-]+)\/?$/);
  if (match) return resource('twitch', 'video', match[2], match[1], 'clip');
  match = url.pathname.match(/^\/([A-Za-z0-9_]+)\/?$/);
  return match && !reserved.has(match[1].toLowerCase()) ? profile('twitch', match[1], 'channel') : null;
};
