'use strict';
const { single, resource, profile } = require('./helpers.js');
const token = /^[A-Za-z0-9_-]{1,128}$/;
module.exports = function youtube(url) {
  const path = url.pathname;
  let match;
  if (url.hostname === 'youtu.be') {
    match = path.match(/^\/([A-Za-z0-9_-]{1,128})\/?$/);
    return match ? resource('youtube', 'video', match[1]) : null;
  }
  if (path === '/watch') {
    const id = single(url, 'v');
    if (id && token.test(id)) return resource('youtube', 'video', id);
  }
  if ((match = path.match(/^\/(shorts|embed|live)\/([A-Za-z0-9_-]{1,128})\/?$/))) {
    if (match[1] === 'embed' && ['videoseries', 'live_stream'].includes(match[2])) return null;
    return resource('youtube', match[1] === 'shorts' ? 'short' : 'video', match[2], null, 'video');
  }
  if (path === '/playlist') {
    const id = single(url, 'list');
    if (id && token.test(id)) return resource('youtube', 'playlist', id);
  }
  if ((match = path.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})\/?$/))) return resource('youtube', 'channel', match[1]);
  if ((match = path.match(/^\/@([A-Za-z0-9._-]+)\/?$/))) return profile('youtube', match[1], 'channel');
  return null;
};
