'use strict';
const { resource } = require('./helpers.js');

module.exports = function weibo(url) {
  let match = url.pathname.match(/^\/u\/([1-9]\d*)\/?$/);
  if (match) return resource('weibo', 'profile', match[1]);
  match = url.pathname.match(/^\/2\/detail\/([1-9]\d*)\/?$/);
  if (match) return resource('weibo', 'post', match[1], null, 'post-id');
  match = url.pathname.match(/^\/([1-9]\d{4,19})\/([A-Za-z0-9]{6,16})\/?$/);
  // A desktop token is retained literally; no base-62-to-numeric-ID conversion.
  return match ? resource('weibo', 'post', `${match[1]}/${match[2]}`, null, 'post-token') : null;
};
