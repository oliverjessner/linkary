'use strict';
const { normalizeUrl } = require('./normalize.js');
const { cleanUrl } = require('./clean.js');
const { identifyUrl } = require('../platforms/index.js');

function compareUrls(urlA, urlB, options = {}) {
  const normalizedMatch = normalizeUrl(urlA, options) === normalizeUrl(urlB, options);
  const cleanMatch = cleanUrl(urlA, options).cleanUrl === cleanUrl(urlB, options).cleanUrl;
  const a = identifyUrl(urlA);
  const b = identifyUrl(urlB);
  const exactMatch = urlA === urlB;
  let sameResource = null;
  let reason = 'unknown';
  if (exactMatch || normalizedMatch || cleanMatch) {
    sameResource = true;
    reason = exactMatch ? 'exact' : normalizedMatch ? 'normalized' : 'clean';
  } else if (a.identityKey && b.identityKey) {
    if (a.identityKey === b.identityKey) {
      sameResource = true;
      reason = 'platform-identity';
    } else if (a.platform !== b.platform || a.identityKey.split(':')[1] === b.identityKey.split(':')[1]) {
      sameResource = false;
      reason = 'different-platform-resources';
    }
  }
  return { exactMatch, normalizedMatch, cleanMatch, sameResource,
    identityKeyA: a.identityKey, identityKeyB: b.identityKey, reason };
}

module.exports = { compareUrls };
