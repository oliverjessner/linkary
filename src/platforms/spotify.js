'use strict';
const { resource } = require('./helpers.js');

module.exports = function spotify(url) {
  if (url.hostname !== 'open.spotify.com' && url.hostname !== 'play.spotify.com') return null;
  const match = url.pathname.match(/^\/(?:(?:embed|intl-[a-z]{2})\/)?(track|album|artist|playlist|show|episode)\/([A-Za-z0-9]{22})\/?$/);
  return match ? resource('spotify', match[1], match[2]) : null;
};
