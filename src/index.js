'use strict';
// Explicit assignments also expose named imports to Node's ESM loader.
exports.normalizeUrl = require('./core/normalize.js').normalizeUrl;
exports.cleanUrl = require('./core/clean.js').cleanUrl;
exports.identifyUrl = require('./platforms/index.js').identifyUrl;
exports.compareUrls = require('./core/compare.js').compareUrls;
exports.resolveUrl = require('./core/resolve.js').resolveUrl;
exports.inspectUrl = require('./core/inspect.js').inspectUrl;
exports.inspectMany = require('./core/batch.js').inspectMany;
exports.isShortUrl = require('./utils/shortlinks.js').isShortUrl;
exports.isValidUrl = require('./utils/validation.js').isValidUrl;
exports.extractHostname = require('./utils/validation.js').extractHostname;
exports.extractQueryParams = require('./utils/validation.js').extractQueryParams;
exports.LinkaryError = require('./utils/validation.js').LinkaryError;
