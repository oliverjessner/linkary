'use strict';
const { parseUrl, optionsObject, integer, boolean, validateSignal, throwIfAborted, LinkaryError } = require('../utils/validation.js');
const { requestHeaders } = require('../utils/network.js');
const { version } = require('../../package.json');
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const HEAD_FALLBACK_STATUSES = new Set([403, 405, 501]);
const RANGE_FALLBACK_STATUSES = new Set([403, 416]);
const DEFAULT_USER_AGENT = `Linkary/${version} (+https://github.com/oliverjessner/linkary)`;
const cache = new Map();
const inFlight = new Map();
const MAX_CACHE_ENTRIES = 256;
const MAX_IN_FLIGHT_ENTRIES = 128;

function resolutionOptions(options = {}) {
  optionsObject(options);
  validateSignal(options.signal);
  const userAgent = options.userAgent === undefined ? DEFAULT_USER_AGENT : options.userAgent;
  if (typeof userAgent !== 'string' || userAgent.length > 1024 || !/^[\x20-\x7e]+$/.test(userAgent) || !userAgent.trim()) {
    throw new LinkaryError('ERR_INVALID_OPTIONS', 'userAgent must be a nonempty printable ASCII string of at most 1024 characters.');
  }
  return {
    timeoutMs: integer(options.timeoutMs, 'timeoutMs', 10000, 1, 2147483647),
    maxRedirects: integer(options.maxRedirects, 'maxRedirects', 5, 0, 100),
    unsafeAllowPrivate: boolean(options.unsafeAllowPrivate, 'unsafeAllowPrivate'),
    cacheTtlMs: integer(options.cacheTtlMs, 'cacheTtlMs', 45000, 0, 2147483647),
    userAgent: userAgent.trim(),
    signal: options.signal,
  };
}

async function performResolution(input, options) {
  let current = parseUrl(input);
  const controller = new AbortController();
  const abort = () => controller.abort(new LinkaryError('ERR_ABORTED', 'Operation aborted.', { cause: options.signal.reason }));
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new LinkaryError('ERR_TIMEOUT', 'URL resolution timed out.')), options.timeoutMs);
  const visited = new Set();
  const redirects = [];
  try {
    throwIfAborted(options.signal);
    while (true) {
      const requestUrl = new URL(current);
      requestUrl.hash = '';
      if (visited.has(requestUrl.href)) throw new LinkaryError('ERR_REDIRECT_LOOP', 'Redirect loop detected.');
      visited.add(requestUrl.href);
      let response = await requestHeaders(current, 'HEAD', options, controller.signal);
      if (HEAD_FALLBACK_STATUSES.has(response.status)) {
        response = await requestHeaders(current, 'GET', options, controller.signal);
        if (RANGE_FALLBACK_STATUSES.has(response.status)) {
          // Some servers reject Range itself. Keep the same deadline and close
          // the plain GET at headers, even if its body would stream forever.
          response = await requestHeaders(current, 'GET', options, controller.signal, false);
        }
      }
      if (!REDIRECTS.has(response.status)) {
        if (response.status < 200 || response.status >= 300) {
          throw new LinkaryError('ERR_HTTP_STATUS', `Resolution returned HTTP ${response.status} from ${current.hostname} after ${redirects.length} redirect${redirects.length === 1 ? '' : 's'}.`);
        }
        return { originalUrl: input, finalUrl: current.href, redirectCount: redirects.length, redirects, status: response.status };
      }
      if (!response.location) throw new LinkaryError('ERR_REDIRECT_LOCATION', 'Redirect response has no Location header.');
      if (redirects.length >= options.maxRedirects) throw new LinkaryError('ERR_MAX_REDIRECTS', 'Maximum redirect count exceeded.');
      let destination;
      try { destination = new URL(response.location, current); }
      catch (cause) { throw new LinkaryError('ERR_REDIRECT_LOCATION', 'Invalid redirect Location header.', { cause }); }
      if (!response.location.includes('#')) destination.hash = current.hash;
      destination = parseUrl(destination.href);
      redirects.push({ from: current.href, to: destination.href, status: response.status });
      current = destination;
    }
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

async function resolveUrl(input, options = {}) {
  const settings = resolutionOptions(options);
  const url = parseUrl(input);
  throwIfAborted(settings.signal);
  const key = JSON.stringify([url.href, settings.timeoutMs, settings.maxRedirects, settings.unsafeAllowPrivate, settings.cacheTtlMs, settings.userAgent]);
  if (!settings.cacheTtlMs || key.length > 16384) return performResolution(input, settings);
  const now = performance.now();
  for (const [cachedKey, entry] of cache) if (entry.expires <= now) cache.delete(cachedKey);
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return { ...structuredClone(cached.result), originalUrl: input };
  }
  // Abortable operations have independent lifetimes and do not share requests.
  const dedupe = !settings.signal;
  if (dedupe && inFlight.has(key)) return { ...structuredClone(await inFlight.get(key)), originalUrl: input };
  const pending = performResolution(input, settings);
  const track = dedupe && inFlight.size < MAX_IN_FLIGHT_ENTRIES;
  if (track) inFlight.set(key, pending);
  try {
    const result = await pending;
    if (JSON.stringify(result).length <= 65536) {
      cache.delete(key);
      cache.set(key, { expires: performance.now() + settings.cacheTtlMs, result: structuredClone(result) });
      while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    }
    return result;
  } finally {
    if (track && inFlight.get(key) === pending) inFlight.delete(key);
  }
}

module.exports = { resolveUrl };
