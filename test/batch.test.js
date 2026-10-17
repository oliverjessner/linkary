'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns').promises;
const { inspectMany } = require('..');
const { server } = require('./fixtures.js');

test('offline batches stay synchronous, preserve order and isolate URL errors', () => {
  const result = inspectMany(['https://a.test', 'invalid', 'https://youtu.be/abc123']);
  assert.equal(result instanceof Promise, false);
  assert.deepEqual(result.map(r => r.index), [0, 1, 2]);
  assert.equal(result[0].resolution, null);
  assert.equal(result[1].ok, false);
  assert.equal(result[1].error.code, 'ERR_INVALID_URL');
  assert.equal(result[1].inspection, null);
  assert.equal(result[2].inspection.resourceId, 'abc123');
  assert.deepEqual(inspectMany([]), []);
});

test('optional deduplication retains first inputs and their original indices', () => {
  const result = inspectMany(['https://a.test', 'https://a.test', 'https://b.test', 'https://a.test/'], { deduplicate: true });
  assert.deepEqual(result.map(r => r.index), [0, 2, 3]);
  for (const args of [[null], [[42]], [Array(1)], [[], { concurrency: 0 }], [[], { resolve: 'yes' }], [[], { removeParams: [42] }]]) {
    assert.throws(() => inspectMany(...args));
  }
});

test('network batches bound workers and serialize every request to the same host', async t => {
  let active = 0;
  let peak = 0;
  const fixture = await server(t, (req, res) => {
    active++;
    peak = Math.max(peak, active);
    const timer = setTimeout(() => {
      active--;
      if (req.url.startsWith('/r')) res.writeHead(302, { Location: req.url.replace('/r', '/f') }).end();
      else res.writeHead(204).end();
    }, 10);
    res.once('close', () => clearTimeout(timer));
  });
  const urls = Array.from({ length: 8 }, (_, i) => `${fixture.url}/r${i}`);
  const result = await inspectMany([...urls, 'invalid'], { resolve: true, unsafeAllowPrivate: true, concurrency: 3, cacheTtlMs: 0 });
  assert.equal(peak, 1);
  assert.equal(result.length, 9);
  assert(result.slice(0, 8).every((r, i) => r.ok && r.resolution.finalUrl === `${fixture.url}/f${i}`));
  assert.equal(result[8].ok, false);
});

test('batch concurrency spans distinct hosts while preserving output order', async t => {
  t.mock.method(dns, 'lookup', async () => [{ address: '127.0.0.1', family: 4 }]);
  let active = 0;
  let peak = 0;
  const fixture = await server(t, (_req, res) => {
    active++;
    peak = Math.max(peak, active);
    const timer = setTimeout(() => { active--; res.writeHead(204).end(); }, 15);
    res.once('close', () => clearTimeout(timer));
  });
  const urls = Array.from({ length: 6 }, (_, i) => fixture.url.replace('127.0.0.1', `host${i}.example.test`) + `/${i}`);
  const result = await inspectMany(urls, { resolve: true, unsafeAllowPrivate: true, concurrency: 2, cacheTtlMs: 0 });
  assert(result.every(r => r.ok));
  assert.equal(peak, 2);
  assert.deepEqual(result.map(r => r.input), urls);
});

test('cancellation reports pending and queued items individually without starting new work', async t => {
  const fixture = await server(t, () => {});
  const controller = new AbortController();
  const pending = inspectMany(Array.from({ length: 7 }, (_, i) => `${fixture.url}/${i}`), {
    resolve: true, unsafeAllowPrivate: true, concurrency: 3, signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 30);
  const result = await pending;
  assert(result.every(r => !r.ok && r.error.code === 'ERR_ABORTED'));
  assert.equal(fixture.requests.length, 1);
  assert(inspectMany(['https://a.test'], { signal: controller.signal }).every(r => !r.ok));
});
