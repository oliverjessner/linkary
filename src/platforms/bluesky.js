'use strict';
const { identity, profile } = require('./helpers.js');
module.exports = function bluesky(url) {
  const match = url.pathname.match(/^\/profile\/(did:plc:[a-z2-7]+|[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)(?:\/post\/([A-Za-z0-9]+))?\/?$/);
  if (!match) return null;
  const did = match[1].startsWith('did:');
  const actor = did ? match[1] : match[1].toLowerCase();
  if (match[2]) {
    // Record keys are only unique within an actor; handles require DNS resolution
    // to map to DIDs, so do not invent a stable post identity for a handle URL.
    return identity('bluesky', 'post', match[2], did ? null : actor, did ? `bluesky:post:${actor}/${match[2]}` : null);
  }
  return did ? identity('bluesky', 'profile', actor, null, `bluesky:did:${actor}`) : profile('bluesky', actor);
};
