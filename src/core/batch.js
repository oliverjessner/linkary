'use strict';
const { inspectUrl } = require('./inspect.js');
const { resolveWithLimiter, resolutionOptions } = require('./resolve.js');
const { optionsObject, boolean, integer, validateSignal, throwIfAborted, LinkaryError } = require('../utils/validation.js');

function itemResult(input, index, options) {
  try {
    throwIfAborted(options.signal);
    return { index, input, ok: true, inspection: inspectUrl(input, options), resolution: null, error: null };
  } catch (error) {
    return failed(input, index, error);
  }
}

function failed(input, index, error) {
  return { index, input, ok: false, inspection: null, resolution: null, error: error.toJSON() };
}

function inspectMany(urls, options = {}) {
  optionsObject(options);
  if (!Array.isArray(urls) || [...urls].some(url => typeof url !== 'string')) {
    throw new LinkaryError('ERR_INVALID_INPUT', 'inspectMany expects an array of URL strings.');
  }
  const resolve = boolean(options.resolve, 'resolve');
  const deduplicate = boolean(options.deduplicate, 'deduplicate');
  const concurrency = integer(options.concurrency, 'concurrency', 5, 1, 100);
  validateSignal(options.signal);
  // Validate shared parsing options even for an empty batch or invalid inputs.
  inspectUrl('https://example.com/', options);
  const entries = [];
  const seen = new Set();
  urls.forEach((input, index) => {
    if (!deduplicate || !seen.has(input)) entries.push({ input, index });
    seen.add(input);
  });
  if (!resolve) return entries.map(({ input, index }) => itemResult(input, index, options));
  resolutionOptions(options);
  return resolveMany(entries, { ...options, concurrency });
}

async function resolveMany(entries, options) {
  const results = entries.map(({ input, index }) => itemResult(input, index, options));
  // One complete resolution per worker. Per-host permits apply to every hop,
  // including redirects from different input hosts to the same destination.
  const limiter = createHostLimiter();
  let next = 0;
  async function worker() {
    while (next < results.length) {
      const i = next++;
      if (!results[i].ok) continue;
      try {
        results[i].resolution = await resolveWithLimiter(entries[i].input, options, limiter);
      } catch (error) {
        results[i] = failed(entries[i].input, entries[i].index, error);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(options.concurrency, entries.length) }, worker));
  return results;
}

function createHostLimiter() {
  const queues = new Map();
  return async function withHost(hostname, signal, task) {
    throwIfAborted(signal);
    const previous = queues.get(hostname) || Promise.resolve();
    let release;
    const current = new Promise(resolve => { release = resolve; });
    const tail = previous.then(() => current);
    queues.set(hostname, tail);
    let abort;
    try {
      await new Promise((resolve, reject) => {
        abort = () => reject(signal.reason instanceof LinkaryError ? signal.reason : new LinkaryError('ERR_ABORTED', 'Operation aborted.'));
        signal.addEventListener('abort', abort, { once: true });
        previous.then(resolve);
        if (signal.aborted) abort();
      });
      throwIfAborted(signal);
      return await task();
    } finally {
      signal.removeEventListener('abort', abort);
      release();
      if (queues.get(hostname) === tail) tail.then(() => { if (queues.get(hostname) === tail) queues.delete(hostname); });
    }
  };
}

module.exports = { inspectMany };
