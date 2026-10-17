'use strict';
const { parseUrl, optionsObject, integer, boolean, validateSignal, throwIfAborted, LinkaryError } = require('../utils/validation.js');
const { requestHeaders } = require('../utils/network.js');
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

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
      if (response.status === 405 || response.status === 501) {
        response = await requestHeaders(current, 'GET', options, controller.signal);
      }
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
  const settings = resolutionOptions(options);
  parseUrl(input);
  throwIfAborted(settings.signal);
  return performResolution(input, settings);
}

module.exports = { resolveUrl, resolutionOptions, performResolution };
