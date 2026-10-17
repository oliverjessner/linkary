'use strict';

class LinkaryError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'LinkaryError';
    this.code = code;
  }

  toJSON() {
    return { name: this.name, code: this.code, message: this.message };
  }
}

function parseUrl(input) {
  if (typeof input !== 'string' || !input || /[\u0000-\u0020\u007f]/u.test(input)) {
    throw new LinkaryError('ERR_INVALID_URL', 'Expected an absolute HTTP(S) URL without whitespace or control characters.');
  }
  let url;
  try {
    url = new URL(input);
  } catch (cause) {
    throw new LinkaryError('ERR_INVALID_URL', 'Invalid absolute URL.', { cause });
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new LinkaryError('ERR_UNSUPPORTED_SCHEME', 'Only HTTP and HTTPS URLs are supported.');
  }
  if (!/^https?:\/\//i.test(input)) {
    throw new LinkaryError('ERR_INVALID_URL', 'Expected an absolute URL beginning with http:// or https://.');
  }
  if (url.username || url.password) {
    throw new LinkaryError('ERR_CREDENTIALS', 'Embedded URL credentials are not allowed.');
  }
  return url;
}

function isValidUrl(input) {
  try { parseUrl(input); return true; } catch { return false; }
}

function extractHostname(input) { return parseUrl(input).hostname; }
function extractQueryParams(input) { return [...parseUrl(input).searchParams]; }

function optionsObject(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new LinkaryError('ERR_INVALID_OPTIONS', 'Options must be an object.');
  }
  return options;
}

function stringList(value, name) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item)) {
    throw new LinkaryError('ERR_INVALID_OPTIONS', `${name} must be an array of nonempty strings.`);
  }
  return value;
}

function integer(value, name, fallback, min, max) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new LinkaryError('ERR_INVALID_OPTIONS', `${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function boolean(value, name, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new LinkaryError('ERR_INVALID_OPTIONS', `${name} must be a boolean.`);
  return value;
}

function validateSignal(signal) {
  if (signal !== undefined && !(signal instanceof AbortSignal)) {
    throw new LinkaryError('ERR_INVALID_OPTIONS', 'signal must be an AbortSignal.');
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new LinkaryError('ERR_ABORTED', 'Operation aborted.', { cause: signal.reason });
}

module.exports = { LinkaryError, parseUrl, isValidUrl, extractHostname, extractQueryParams,
  optionsObject, stringList, integer, boolean, validateSignal, throwIfAborted };
