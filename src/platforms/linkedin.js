'use strict';
const { resource, profile } = require('./helpers.js');
module.exports = function linkedin(url) {
  let match = url.pathname.match(/^\/feed\/update\/urn:li:activity:(\d+)\/?$/);
  if (match) return resource('linkedin', 'post', match[1]);
  match = url.pathname.match(/^\/posts\/[A-Za-z0-9_-]+-activity-(\d+)-[A-Za-z0-9_-]+\/?$/);
  if (match) return resource('linkedin', 'post', match[1]);
  match = url.pathname.match(/^\/in\/([A-Za-z0-9_-]+)\/?$/);
  if (match) return profile('linkedin', match[1]);
  match = url.pathname.match(/^\/company\/([A-Za-z0-9_-]+)\/?$/);
  return match ? resource('linkedin', 'channel', match[1].toLowerCase(), null, 'company') : null;
};
