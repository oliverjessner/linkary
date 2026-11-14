'use strict';
const { resource } = require('./helpers.js');

module.exports = function vk(url) {
  // Layer selectors are outside this parser's supported direct-URL subset.
  if (url.searchParams.has('w') || url.searchParams.has('z')) return null;
  let match = url.pathname.match(/^\/id([1-9]\d*)\/?$/);
  if (match) return resource('vk', 'profile', match[1]);
  match = url.pathname.match(/^\/club([1-9]\d*)\/?$/);
  if (match) return resource('vk', 'channel', match[1], null, 'community');
  match = url.pathname.match(/^\/wall(-?[1-9]\d*)_([1-9]\d*)\/?$/);
  if (match) return resource('vk', 'post', `${match[1]}_${match[2]}`);
  match = url.pathname.match(/^\/video(-?[1-9]\d*)_([1-9]\d*)\/?$/);
  return match ? resource('vk', 'video', `${match[1]}_${match[2]}`) : null;
};
