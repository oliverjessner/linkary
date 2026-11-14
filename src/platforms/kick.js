'use strict';
const { profile } = require('./helpers.js');
const routes = new Set(['browse', 'categories', 'category', 'following', 'search', 'auth', 'login', 'signup', 'register', 'settings', 'dashboard', 'subscriptions', 'transactions', 'clips', 'video', 'videos', 'api', 'about', 'help', 'support', 'community', 'terms-of-service', 'privacy-policy', 'dmca-policy', 'community-guidelines', 'cookie-policy', 'partner-terms-and-conditions', 'leaderboards', 'events', 'resources', 'gift', 'store', 'kicks', 'drops', 'moderator', 'moderation', 'account', 'notifications', 'activate', 'logout', 'password', 'reset-password', 'watch', 'download', 'downloads', 'oauth', 'ads', 'legal']);

module.exports = function kick(url) {
  if (url.hostname !== 'kick.com' && url.hostname !== 'www.kick.com') return null;
  // Clip selectors identify a different resource from the channel itself.
  if (url.searchParams.has('clip')) return null;
  const match = url.pathname.match(/^\/([A-Za-z0-9_]{1,25})\/?$/);
  return match && !routes.has(match[1].toLowerCase()) ? profile('kick', match[1], 'channel') : null;
};
