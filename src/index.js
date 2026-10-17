'use strict';
// Explicit assignments also expose named imports to Node's ESM loader.
exports.normalizeUrl = require('./core/normalize.js').normalizeUrl;
exports.cleanUrl = require('./core/clean.js').cleanUrl;
exports.isValidUrl = require('./utils/validation.js').isValidUrl;
exports.extractHostname = require('./utils/validation.js').extractHostname;
exports.extractQueryParams = require('./utils/validation.js').extractQueryParams;
exports.LinkaryError = require('./utils/validation.js').LinkaryError;
