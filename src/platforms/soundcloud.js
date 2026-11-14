'use strict';
const { identity, profile } = require('./helpers.js');

const routes = new Set(['you', 'discover', 'stream', 'search', 'charts', 'upload', 'jobs', 'pages', 'terms-of-use', 'privacy', 'imprint', 'copyright', 'cookie-policy', 'oembed', 'api', 'connect', 'signin', 'login', 'logout', 'signup', 'register', 'settings', 'notifications', 'messages', 'pro', 'go', 'getstarted', 'artists', 'for-artists', 'creators', 'subscriptions', 'premium', 'download', 'mobile', 'podcast', 'podcasts', 'language', 'languages', 'tags', 'scpages', 'legal', 'company', 'brand', 'help', 'support', 'press', 'blog', 'about', 'community', 'listen', 'terms']);
const tabs = new Set(['tracks', 'sets', 'albums', 'reposts', 'popular-tracks', 'likes', 'favorites', 'followers', 'following', 'comments', 'stations', 'recommended', 'related', 'download', 'activity', 'spotlight']);

module.exports = function soundcloud(url) {
  if (!['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'].includes(url.hostname)) return null;
  const match = url.pathname.match(/^\/([a-z0-9_-]{3,25})(?:\/(?:sets\/)?([a-z0-9][a-z0-9_-]{0,199}))?\/?$/);
  if (!match || routes.has(match[1])) return null;
  if (!match[2]) return profile('soundcloud', match[1]);
  const playlist = url.pathname.split('/')[2] === 'sets';
  if (!playlist && tabs.has(match[2])) return null;
  // Track/playlist permalinks are mutable; they do not reveal numeric API IDs.
  return identity('soundcloud', playlist ? 'playlist' : 'track', `${match[1]}/${match[2]}`, match[1], null);
};
