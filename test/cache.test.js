'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveUrl } = require('..');
const { server } = require('./fixtures.js');

test('process-local cache deduplicates in-flight work, clones results and honors expiry and bypass', async t => {
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const fixture = await server(t, (_req, res) => res.writeHead(204).end());
  const options = { unsafeAllowPrivate: true, cacheTtlMs: 80 };
  const [a, b] = await Promise.all([resolveUrl(fixture.url, options), resolveUrl(fixture.url, options)]);
  assert.equal(fixture.requests.length, 1);
  assert.deepEqual(a, b);
  a.redirects.push({ from: 'bad', to: 'bad', status: 302 });
  assert.equal(b.redirects.length, 0);
  assert.equal((await resolveUrl(fixture.url, options)).redirects.length, 0);
  assert.equal(fixture.requests.length, 1);
  now = 100;
  await resolveUrl(fixture.url, options);
  assert.equal(fixture.requests.length, 2);
  await resolveUrl(fixture.url, { ...options, cacheTtlMs: 0 });
  await resolveUrl(fixture.url, { ...options, cacheTtlMs: 0 });
  assert.equal(fixture.requests.length, 4);
});

test('cache does not mix security policies, limits or deadlines and never stores failures', async t => {
  let fail = false;
  const fixture = await server(t, (_req, res) => res.writeHead(fail ? 403 : 204).end());
  const options = { unsafeAllowPrivate: true, cacheTtlMs: 1000 };
  await resolveUrl(fixture.url, options);
  await assert.rejects(resolveUrl(fixture.url), { code: 'ERR_UNSAFE_ADDRESS' });
  await resolveUrl(fixture.url, { ...options, maxRedirects: 1 });
  await resolveUrl(fixture.url, { ...options, timeoutMs: 1200 });
  assert.equal(fixture.requests.length, 3);
  fail = true;
  for (let i = 0; i < 2; i++) await assert.rejects(resolveUrl(`${fixture.url}/failure`, options), { code: 'ERR_HTTP_STATUS' });
  assert.equal(fixture.requests.length, 9);
  fail = false;
  await resolveUrl(`${fixture.url}/failure`, options);
  assert.equal(fixture.requests.length, 10);
});

test('cache and in-flight requests separate User-Agent identities after outer-space normalization', async t => {
  const fixture = await server(t, (_req, res) => res.writeHead(204).end());
  const options = { unsafeAllowPrivate: true, cacheTtlMs: 1000 };
  const input = `${fixture.url}/agents`;
  const firstAgent = 'Linkary cache/one';
  const secondAgent = 'Linkary cache/two';
  await Promise.all([
    resolveUrl(input, { ...options, userAgent: firstAgent }),
    resolveUrl(input, { ...options, userAgent: `  ${firstAgent}  ` }),
    resolveUrl(input, { ...options, userAgent: secondAgent }),
  ]);
  assert.equal(fixture.requests.length, 2);
  assert.deepEqual(fixture.requests.map(request => request.headers['user-agent']).sort(), [firstAgent, secondAgent]);
  await resolveUrl(input, { ...options, userAgent: firstAgent });
  await resolveUrl(input, { ...options, userAgent: secondAgent });
  assert.equal(fixture.requests.length, 2);
  const defaultUserAgent = `Linkary/${require('../package.json').version} (+https://github.com/oliverjessner/linkary)`;
  await resolveUrl(input, options);
  await resolveUrl(input, { ...options, userAgent: defaultUserAgent });
  assert.equal(fixture.requests.length, 3);
  assert.equal(fixture.requests[2].headers['user-agent'], defaultUserAgent);
});

test('abort signals have independent request lifetimes and aborted calls cannot hit cache', async t => {
  const fixture = await server(t, (_req, res) => {
    const timer = setTimeout(() => res.writeHead(204).end(), 40);
    res.once('close', () => clearTimeout(timer));
  });
  const options = { unsafeAllowPrivate: true };
  const controller = new AbortController();
  const aborted = resolveUrl(fixture.url, { ...options, signal: controller.signal });
  const success = resolveUrl(fixture.url, options);
  controller.abort();
  await assert.rejects(aborted, { code: 'ERR_ABORTED' });
  assert.equal((await success).status, 204);
  await assert.rejects(resolveUrl(fixture.url, { ...options, signal: controller.signal }), { code: 'ERR_ABORTED' });
});

test('successful cache is bounded and evicts the oldest entry', async t => {
  const fixture = await server(t, (_req, res) => res.writeHead(204).end());
  const options = { unsafeAllowPrivate: true, cacheTtlMs: 120000 };
  for (let i = 0; i < 257; i++) await resolveUrl(`${fixture.url}/${i}`, options);
  assert.equal(fixture.requests.length, 257);
  await resolveUrl(`${fixture.url}/256`, options);
  assert.equal(fixture.requests.length, 257);
  await resolveUrl(`${fixture.url}/0`, options);
  assert.equal(fixture.requests.length, 258);
});
