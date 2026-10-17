'use strict';
const { parseUrl, optionsObject, stringList } = require('../utils/validation.js');
const { normalizeUrl } = require('./normalize.js');
const { isTrackingParameter } = require('../utils/tracking.js');

function cleanUrl(input, options = {}) {
  optionsObject(options);
  const remove = new Set(stringList(options.removeParams, 'removeParams').map(s => s.toLowerCase()));
  const preserve = new Set(stringList(options.preserveParams, 'preserveParams').map(s => s.toLowerCase()));
  const url = parseUrl(normalizeUrl(input, options));
  const removedParameters = [];
  const kept = url.search.slice(1).split('&').filter(segment => {
    // Decode keys for matching, but retain every byte of surviving parameters.
    const key = new URLSearchParams(segment).keys().next().value;
    if (key === undefined) return true;
    const lower = key.toLowerCase();
    if (!preserve.has(lower) && (remove.has(lower) || isTrackingParameter(key))) {
      removedParameters.push(key);
      return false;
    }
    return true;
  });
  if (removedParameters.length) url.search = kept.join('&');
  return { originalUrl: input, cleanUrl: url.href, removedParameters };
}

module.exports = { cleanUrl };
