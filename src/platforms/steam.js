'use strict';
const { identity, resource } = require('./helpers.js');

module.exports = function steam(url) {
  let match = url.pathname.match(/^\/profiles\/([1-9]\d{16})\/?$/);
  if (match) return resource('steam', 'profile', match[1], null, 'steamid');
  match = url.pathname.match(/^\/id\/([A-Za-z0-9_-]+)\/?$/);
  // A vanity path is a handle; ResolveVanityURL is needed to obtain its SteamID.
  return match ? identity('steam', 'profile', null, match[1], null) : null;
};
