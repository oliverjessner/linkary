'use strict';
const { resource, profile } = require('./helpers.js');
const reserved = new Set(['accounts', 'explore', 'direct', 'stories', 'reels', 'p', 'reel', 'tv', 'about', 'developer', 'legal', 'web', 'api', 'robots.txt', 'favicon.ico']);
module.exports = function instagram(url) {
  let match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);
  if (match) return resource('instagram', { p: 'post', reel: 'reel', tv: 'video' }[match[1]], match[2], null, 'media');
  match = url.pathname.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
  return match && !reserved.has(match[1].toLowerCase()) ? profile('instagram', match[1]) : null;
};
