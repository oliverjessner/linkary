'use strict';
const { parseUrl, optionsObject, integer, boolean, validateSignal, throwIfAborted, LinkaryError } = require('../utils/validation.js');
const { requestHeaders } = require('../utils/network.js');
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const cache = new Map();
const inFlight = new Map();
const MAX_CACHE_ENTRIES = 256;
const MAX_IN_FLIGHT_ENTRIES = 128;

function resolutionOptions(options = {}) {
  optionsObject(options);
  validateSignal(options.signal);
  return {
    timeoutMs: integer(options.timeoutMs, 'timeoutMs', 10000, 1, 2147483647),
    maxRedirects: integer(options.maxRedirects, 'maxRedirects', 5, 0, 100),
    unsafeAllowPrivate: boolean(options.unsafeAllowPrivate, 'unsafeAllowPrivate'),
    cacheTtlMs: integer(options.cacheTtlMs, 'cacheTtlMs', 45000, 0, 2147483647),
    signal: options.signal,
  };
}

async function performResolution(input, options, hostLimiter) {
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
      const requestHop = async () => {
        let response = await requestHeaders(current, 'HEAD', options, controller.signal);
        if (response.status === 405 || response.status === 501) {
          response = await requestHeaders(current, 'GET', options, controller.signal);
        }
        return response;
      };
      const response = hostLimiter ? await hostLimiter(current.hostname, controller.signal, requestHop) : await requestHop();
      if (!REDIRECTS.has(response.status)) {
        if (response.status < 200 || response.status >= 300) {
          throw new LinkaryError('ERR_HTTP_STATUS', `Resolution returned HTTP ${response.status}.`);
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
  return resolveWithLimiter(input, options);
}

async function resolveWithLimiter(input, options = {}, hostLimiter) {
  const settings = resolutionOptions(options);
  const url = parseUrl(input);
  throwIfAborted(settings.signal);
  const key = JSON.stringify([url.href, settings.timeoutMs, settings.maxRedirects, settings.unsafeAllowPrivate, settings.cacheTtlMs]);
  if (!settings.cacheTtlMs || key.length > 16384) return performResolution(input, settings, hostLimiter);
  const now = performance.now();
  for (const [cachedKey, entry] of cache) if (entry.expires <= now) cache.delete(cachedKey);
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return { ...structuredClone(cached.result), originalUrl: input };
  }
  // Abortable operations have independent lifetimes. Batch requests retain
  // their own per-hop scheduling. Neither joins a different caller's request.
  const dedupe = !settings.signal && !hostLimiter;
  if (dedupe && inFlight.has(key)) return { ...structuredClone(await inFlight.get(key)), originalUrl: input };
  const pending = performResolution(input, settings, hostLimiter);
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

module.exports = { resolveUrl, resolveWithLimiter, resolutionOptions };
