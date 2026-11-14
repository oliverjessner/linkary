'use strict';
const { identity, resource } = require('./helpers.js');

module.exports = function signal(url) {
  if (url.pathname !== '/' || url.search) return null;
  if (url.hostname === 'signal.me') {
    let match = url.hash.match(/^#p\/(\+[1-9]\d{4,14})$/);
    if (match) return identity('signal', 'profile', null, null, `signal:phone:${match[1]}`);
    match = url.hash.match(/^#eu\/([A-Za-z0-9_-]+)$/);
    // The encrypted username link does not expose a handle or account identity.
    return match ? identity('signal', 'profile', null, null, null) : null;
  }
  if (url.hostname === 'signal.group') {
    const match = url.hash.match(/^#([A-Za-z0-9_-]+)$/);
    // Identify this exact invitation, never claim its token is a group ID.
    return match ? resource('signal', 'invite', match[1], null, 'group-invite') : null;
  }
  return null;
};
