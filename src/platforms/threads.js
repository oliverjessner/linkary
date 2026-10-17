'use strict';
const { resource, profile } = require('./helpers.js');
module.exports = function threads(url) {
  let match = url.pathname.match(/^\/@([A-Za-z0-9._]+)\/post\/([A-Za-z0-9_-]+)\/?$/);
  if (match) return resource('threads', 'post', match[2], match[1]);
  match = url.pathname.match(/^\/@([A-Za-z0-9._]+)\/?$/);
  return match ? profile('threads', match[1]) : null;
};
