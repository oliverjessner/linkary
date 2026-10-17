'use strict';
const { resource, profile } = require('./helpers.js');
module.exports = function tiktok(url) {
  if (['vm.tiktok.com', 'vt.tiktok.com'].includes(url.hostname)) return null;
  let match = url.pathname.match(/^\/@([A-Za-z0-9._]+)\/(video|photo)\/(\d+)\/?$/);
  if (match) return resource('tiktok', match[2] === 'video' ? 'video' : 'post', match[3], match[1], match[2]);
  match = url.pathname.match(/^\/@([A-Za-z0-9._]+)\/?$/);
  return match ? profile('tiktok', match[1]) : null;
};
