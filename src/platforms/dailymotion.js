'use strict';
const { resource, single } = require('./helpers.js');
const token = /^[xk][A-Za-z0-9]{3,63}$/;

module.exports = function dailymotion(url) {
  let id;
  if (url.hostname === 'geo.dailymotion.com') {
    if (!/^\/player(?:\/[A-Za-z0-9]+)?\.html$/.test(url.pathname)) return null;
    id = single(url, 'video');
  } else if (url.hostname === 'dailymotion.com' || url.hostname === 'www.dailymotion.com') {
    id = url.pathname.match(/^\/(?:embed\/)?video\/([xk][A-Za-z0-9]{3,63})\/?$/)?.[1];
  }
  // The documented tiny_url token can differ from the public video ID.
  if (!id || !token.test(id)) return null;
  return resource('dailymotion', 'video', id, null, id.startsWith('k') ? 'private-video' : 'video');
};
