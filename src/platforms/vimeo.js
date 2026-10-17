'use strict';
const { resource } = require('./helpers.js');
module.exports = function vimeo(url) {
  const pattern = url.hostname === 'player.vimeo.com'
    ? /^\/video\/(\d+)\/?$/
    : /^\/(?:channels\/[A-Za-z0-9_-]+\/|groups\/[A-Za-z0-9_-]+\/videos\/)?(\d+)\/?$/;
  const match = url.pathname.match(pattern);
  return match ? resource('vimeo', 'video', match[1]) : null;
};
