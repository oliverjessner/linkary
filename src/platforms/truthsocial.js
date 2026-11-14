'use strict';
const { profile, resource } = require('./helpers.js');

module.exports = function truthsocial(url) {
  let match = url.pathname.match(/^\/@([A-Za-z0-9_]{1,30})\/posts\/([1-9]\d*)\/?$/);
  if (match) return resource('truthsocial', 'post', match[2], match[1]);
  match = url.pathname.match(/^\/@([A-Za-z0-9_]{1,30})\/?$/);
  return match ? profile('truthsocial', match[1]) : null;
};
