'use strict';
const { parseUrl, optionsObject, boolean } = require('../utils/validation.js');

function normalizeUrl(input, options = {}) {
  optionsObject(options);
  const stripFragment = boolean(options.stripFragment, 'stripFragment');
  const url = parseUrl(input);
  if (stripFragment) url.hash = '';
  // WHATWG serialization preserves query bytes, ordering, path case and slashes.
  // Deliberately avoid decoding escapes or rebuilding signed query strings.
  return url.href;
}

module.exports = { normalizeUrl };
