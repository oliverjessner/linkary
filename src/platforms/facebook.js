'use strict';
const { single, resource, profile } = require('./helpers.js');
const reserved = new Set(['watch', 'reel', 'reels', 'groups', 'pages', 'people', 'events', 'marketplace', 'login', 'help', 'share', 'sharer', 'gaming', 'photo', 'photos', 'settings', 'search', 'stories', 'public', 'privacy', 'friends', 'notifications', 'messages']);
module.exports = function facebook(url) {
  let match;
  if (url.pathname === '/profile.php') {
    const id = single(url, 'id');
    if (/^\d+$/.test(id ?? '')) return resource('facebook', 'profile', id);
    return null;
  }
  if (url.pathname === '/watch' || url.pathname === '/watch/') {
    const id = single(url, 'v');
    if (/^\d+$/.test(id ?? '')) return resource('facebook', 'video', id);
    return null;
  }
  if (url.pathname === '/permalink.php' || url.pathname === '/story.php') {
    const id = single(url, 'story_fbid');
    const owner = single(url, 'id');
    if (/^\d+$/.test(id ?? '') && /^\d+$/.test(owner ?? '')) return resource('facebook', 'post', `${owner}/${id}`);
    return null;
  }
  if ((match = url.pathname.match(/^\/(\d+)\/posts\/(\d+)\/?$/))) return resource('facebook', 'post', `${match[1]}/${match[2]}`);
  if ((match = url.pathname.match(/^\/reel\/(\d+)\/?$/))) return resource('facebook', 'reel', match[1], null, 'video');
  if ((match = url.pathname.match(/^\/([A-Za-z0-9.]+)\/videos\/(\d+)\/?$/))) return resource('facebook', 'video', match[2]);
  if ((match = url.pathname.match(/^\/groups\/(\d+)\/posts\/(\d+)\/?$/))) return resource('facebook', 'post', `${match[1]}/${match[2]}`, null, 'group-post');
  match = url.pathname.match(/^\/([A-Za-z0-9.]+)\/?$/);
  if (!match || reserved.has(match[1].toLowerCase()) || /\.(php|txt|ico|xml)$/i.test(match[1])) return null;
  return /^\d+$/.test(match[1]) ? resource('facebook', 'profile', match[1]) : profile('facebook', match[1]);
};
