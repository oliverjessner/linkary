'use strict';
const { parseUrl } = require('../utils/validation.js');
const { normalizeUrl } = require('./normalize.js');
const { cleanUrl } = require('./clean.js');
const { identifyUrl } = require('../platforms/index.js');
const { isShortUrl } = require('../utils/shortlinks.js');
const { isTrackingParameter } = require('../utils/tracking.js');

function inspectUrl(input, options = {}) {
  const normalizedUrl = normalizeUrl(input, options);
  const url = parseUrl(normalizedUrl);
  const identity = identifyUrl(input);
  return {
    originalUrl: input,
    normalizedUrl,
    cleanUrl: cleanUrl(input, options).cleanUrl,
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port || null,
    pathname: url.pathname,
    query: [...url.searchParams],
    fragment: url.hash ? url.hash.slice(1) : null,
    isHttps: url.protocol === 'https:',
    isShortUrl: isShortUrl(input, options),
    trackingParameters: [...url.searchParams.keys()].filter(isTrackingParameter),
    platform: identity.platform,
    resourceType: identity.resourceType,
    resourceId: identity.resourceId,
  };
}

module.exports = { inspectUrl };
