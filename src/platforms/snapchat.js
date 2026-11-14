'use strict';
const { profile } = require('./helpers.js');

module.exports = function snapchat(url) {
  const match = url.pathname.match(/^\/add\/([A-Za-z][A-Za-z0-9._-]{1,13}[A-Za-z0-9])\/?$/);
  return match ? profile('snapchat', match[1]) : null;
};
