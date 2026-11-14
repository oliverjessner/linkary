'use strict';
const { parseUrl } = require('../utils/validation.js');

function purgeUrl(input) {
  const url = parseUrl(input);
  const removedParameters = [...url.searchParams.keys()];
  const removedFragment = url.hash.slice(1) || null;
  url.search = '';
  url.hash = '';
  return { originalUrl: input, cleanUrl: url.href, removedParameters, removedFragment };
}

module.exports = { purgeUrl };
