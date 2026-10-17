'use strict';
const { resource, profile } = require('./helpers.js');
const reserved = new Set(['home', 'explore', 'search', 'settings', 'messages', 'notifications', 'i', 'intent', 'share', 'compose', 'login', 'signup', 'tos', 'privacy']);
module.exports = function x(url) {
  let match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/);
  if (match) return resource('x', 'post', match[2], match[1]);
  match = url.pathname.match(/^\/i\/web\/status\/(\d+)\/?$/);
  if (match) return resource('x', 'post', match[1]);
  match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/?$/);
  return match && !reserved.has(match[1].toLowerCase()) ? profile('x', match[1]) : null;
};
