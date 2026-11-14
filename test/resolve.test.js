'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { server } = require('./fixtures.js');
const { resolveUrl } = require('..');
const { isPublicAddress, validatedAddress } = require('../src/utils/network.js');
const local = { unsafeAllowPrivate: true, cacheTtlMs: 0 };
const defaultUserAgent = `Linkary/${require('../package.json').version} (+https://github.com/oliverjessner/linkary)`;

test('redirect chains use every supported status, relative locations and inherited fragments', async t => {
  const statuses = [301, 302, 303, 307, 308];
  const fixture = await server(t, (req, res) => {
    const i = Number(req.url.slice(1));
    if (i < statuses.length) res.writeHead(statuses[i], { Location: `${i + 1}` }).end();
    else res.writeHead(204).end();
  });
  const input = `${fixture.url}/0#anchor`;
  const result = await resolveUrl(input, local);
  assert.equal(result.originalUrl, input);
  assert.equal(result.finalUrl, `${fixture.url}/5#anchor`);
  assert.equal(result.redirectCount, 5);
  assert.equal(result.status, 204);
  assert.deepEqual(result.redirects.map(hop => hop.status), statuses);
  assert.equal(result.redirects[0].to, `${fixture.url}/1#anchor`);
  assert(fixture.requests.every(req => req.method === 'HEAD'));
});

test('HEAD rejection falls back to GET with a byte range, closes at headers', async t => {
  const fixture = await server(t, (req, res) => {
    if (req.method === 'HEAD') res.writeHead(Number(req.url.slice(1))).end();
    else { res.writeHead(200); res.flushHeaders(); /* Deliberately never end the body. */ }
  });
  for (const path of ['/403', '/405', '/501']) {
    const result = await resolveUrl(fixture.url + path, { ...local, timeoutMs: 1000 });
    assert.equal(result.status, 200);
  }
  assert.deepEqual(fixture.requests.map(r => r.method), ['HEAD', 'GET', 'HEAD', 'GET', 'HEAD', 'GET']);
  for (const request of fixture.requests) {
    assert.equal(request.headers.range, request.method === 'GET' ? 'bytes=0-0' : undefined);
    assert.equal(request.headers['user-agent'], defaultUserAgent);
    assert.equal(request.headers.accept, '*/*');
    assert.equal(request.headers['accept-encoding'], 'identity');
  }
});

test('rejected ranged GET falls back once to plain GET and closes at headers', async t => {
  const fixture = await server(t, (req, res) => {
    if (req.method === 'HEAD') res.writeHead(403).end();
    else if (req.headers.range) res.writeHead(Number(req.url.slice(1))).end();
    else { res.writeHead(200); res.flushHeaders(); /* A plain GET body must not be consumed either. */ }
  });
  for (const status of [403, 416]) {
    const result = await resolveUrl(`${fixture.url}/${status}`, { ...local, timeoutMs: 1000, userAgent: '  Linkary fixture/plain  ' });
    assert.equal(result.status, 200);
    const requests = fixture.requests.filter(request => request.path === `/${status}`);
    assert.deepEqual(requests.map(request => request.method), ['HEAD', 'GET', 'GET']);
    assert.deepEqual(requests.map(request => request.headers.range), [undefined, 'bytes=0-0', undefined]);
    for (const request of requests) {
      assert.equal(request.headers['user-agent'], 'Linkary fixture/plain');
      assert.equal(request.headers.accept, '*/*');
      assert.equal(request.headers['accept-encoding'], 'identity');
    }
  }
});

test('persistent HTTP 403 stops after three attempts per hop and reports only safe location context', async t => {
  const fixture = await server(t, (req, res) => {
    if (req.url.startsWith('/sensitive-source')) res.writeHead(302, { Location: '/private-target?token=also-secret' }).end();
    else res.writeHead(403).end();
  });
  await assert.rejects(resolveUrl(`${fixture.url}/denied?token=direct-secret`, local), { code: 'ERR_HTTP_STATUS' });
  assert.deepEqual(fixture.requests.map(request => request.method), ['HEAD', 'GET', 'GET']);
  await assert.rejects(resolveUrl(`${fixture.url}/sensitive-source?token=do-not-log`, local), error => {
    assert.equal(error.code, 'ERR_HTTP_STATUS');
    assert.match(error.message, /HTTP 403/);
    assert.ok(error.message.includes(new URL(fixture.url).hostname));
    assert.match(error.message, /(?:\b1\s+redirect|redirect(?:s| count)?[:= ]+\s*1\b)/i);
    for (const sensitive of [fixture.url, 'sensitive-source', 'private-target', 'do-not-log', 'also-secret']) {
      assert.equal(error.message.includes(sensitive), false, sensitive);
    }
    return true;
  });
  const targetRequests = fixture.requests.filter(request => request.path.startsWith('/private-target'));
  assert.deepEqual(targetRequests.map(request => request.method), ['HEAD', 'GET', 'GET']);
  assert.deepEqual(targetRequests.map(request => request.headers.range), [undefined, 'bytes=0-0', undefined]);
  assert.equal(fixture.requests.length, 7);
});

test('each fallback revalidates DNS and pins its own checked address before connecting', async t => {
  for (const forbiddenAttempt of [null, 1, 2]) {
    await t.test(forbiddenAttempt === null ? 'all attempts stay public' : `rebinding before attempt ${forbiddenAttempt + 1}`, async t => {
      const addresses = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];
      let validations = 0;
      t.mock.method(dns, 'lookup', async () => {
        const index = validations++;
        return [{ address: index === forbiddenAttempt ? '127.0.0.1' : addresses[index], family: 4 }];
      });
      const requests = [];
      let closedResponses = 0;
      let closedRequests = 0;
      t.mock.method(http, 'request', (url, options) => {
        const index = requests.length;
        assert.equal(url.hostname, 'fallback.example.org');
        assert.equal(options.agent, false);
        assert.equal(options.autoSelectFamily, false);
        assert.equal(options.family, 4);
        options.lookup(url.hostname, {}, (error, address, family) => {
          assert.equal(error, null);
          assert.equal(address, addresses[index]);
          assert.equal(family, 4);
        });
        requests.push(options);
        const request = new EventEmitter();
        request.destroy = () => { closedRequests++; };
        request.end = () => queueMicrotask(() => {
          const response = new EventEmitter();
          response.statusCode = [403, 416, 204][index];
          response.headers = {};
          response.destroy = () => { closedResponses++; };
          request.emit('response', response);
        });
        return request;
      });
      const pending = resolveUrl('http://fallback.example.org/', { cacheTtlMs: 0 });
      if (forbiddenAttempt === null) assert.equal((await pending).status, 204);
      else await assert.rejects(pending, { code: 'ERR_UNSAFE_ADDRESS' });
      const expectedRequests = forbiddenAttempt ?? 3;
      assert.equal(requests.length, expectedRequests);
      assert.equal(validations, forbiddenAttempt === null ? 3 : forbiddenAttempt + 1);
      assert.deepEqual(requests.map(request => request.method), ['HEAD', 'GET', 'GET'].slice(0, expectedRequests));
      assert.equal(new Set(requests.map(request => request.signal)).size, 1);
      assert.equal(closedResponses, expectedRequests);
      assert.equal(closedRequests, expectedRequests);
    });
  }
});

test('fallback attempts share the original total deadline instead of resetting it', { timeout: 2000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(dns, 'lookup', async () => [{ address: '8.8.8.8', family: 4 }]);
  const responses = [];
  t.mock.method(http, 'request', (_url, options) => {
    const request = new EventEmitter();
    const abort = () => request.emit('error', new Error('aborted fixture request'));
    options.signal.addEventListener('abort', abort, { once: true });
    request.destroy = () => options.signal.removeEventListener('abort', abort);
    request.end = () => responses.push(status => {
      const response = new EventEmitter();
      response.statusCode = status;
      response.headers = {};
      response.destroy = () => {};
      request.emit('response', response);
    });
    return request;
  });
  const pending = assert.rejects(resolveUrl('http://deadline.example.org/', { cacheTtlMs: 0, timeoutMs: 1000 }), { code: 'ERR_TIMEOUT' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(responses.length, 1);
  t.mock.timers.tick(400);
  responses[0](403);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(responses.length, 2);
  t.mock.timers.tick(400);
  responses[1](403);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(responses.length, 3);
  t.mock.timers.tick(201);
  await pending;
  assert.equal(responses.length, 3);
});

test('loops, excessive redirects and malformed or forbidden locations fail explicitly', async t => {
  const fixture = await server(t, (req, res) => {
    if (req.url === '/loop') res.writeHead(302, { Location: '/loop#changed' }).end();
    else if (req.url === '/missing') res.writeHead(302).end();
    else if (req.url === '/scheme') res.writeHead(302, { Location: 'file:///etc/passwd' }).end();
    else if (req.url === '/credentials') res.writeHead(302, { Location: 'https://user:pass@example.com/' }).end();
    else if (req.url === '/malformed') res.writeHead(302, { Location: 'http://[' }).end();
    else if (req.url === '/denied') res.writeHead(403).end();
    else res.writeHead(302, { Location: `/chain${req.url.length}` }).end();
  });
  for (const [path, code, extra] of [
    ['/loop', 'ERR_REDIRECT_LOOP'], ['/missing', 'ERR_REDIRECT_LOCATION'], ['/scheme', 'ERR_UNSUPPORTED_SCHEME'],
    ['/credentials', 'ERR_CREDENTIALS'], ['/malformed', 'ERR_REDIRECT_LOCATION'], ['/denied', 'ERR_HTTP_STATUS'],
    ['/chain', 'ERR_MAX_REDIRECTS', { maxRedirects: 0 }],
  ]) await assert.rejects(resolveUrl(fixture.url + path, { ...local, ...extra }), { code });
  await assert.rejects(resolveUrl(fixture.url + '/chain', { ...local, maxRedirects: 1 }), { code: 'ERR_MAX_REDIRECTS' });
});

test('timeouts cover headers and DNS; abort works before and during requests', async t => {
  const fixture = await server(t, () => {});
  await assert.rejects(resolveUrl(fixture.url, { ...local, timeoutMs: 30 }), { code: 'ERR_TIMEOUT' });
  const pre = new AbortController();
  pre.abort('cancel');
  await assert.rejects(resolveUrl(fixture.url, { ...local, signal: pre.signal }), { code: 'ERR_ABORTED' });
  const mid = new AbortController();
  const pending = resolveUrl(fixture.url, { ...local, signal: mid.signal });
  setTimeout(() => mid.abort(), 20);
  await assert.rejects(pending, { code: 'ERR_ABORTED' });
  t.mock.method(dns, 'lookup', () => new Promise(() => {}));
  await assert.rejects(resolveUrl('https://dns.example.org/', { timeoutMs: 20, cacheTtlMs: 0 }), { code: 'ERR_TIMEOUT' });
});

test('connection failures and DNS errors are structured', async t => {
  const fixture = await server(t, (_req, res) => res.destroy());
  await assert.rejects(resolveUrl(fixture.url, local), { code: 'ERR_NETWORK' });
  t.mock.method(dns, 'lookup', async () => { throw new Error('ENOTFOUND'); });
  await assert.rejects(resolveUrl('https://missing.example.org/', { cacheTtlMs: 0 }), { code: 'ERR_DNS' });
});

test('default policy blocks special IPv4/IPv6 ranges and metadata without sending requests', async t => {
  const blocked = ['0.0.0.0', '10.1.2.3', '127.0.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.255',
    '192.168.1.1', '100.100.100.200', '100.64.0.1', '192.0.0.8', '192.0.2.1', '192.88.99.1', '168.63.129.16',
    '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '255.255.255.255',
    '::', '::1', '::ffff:127.0.0.1', '::ffff:8.8.8.8', 'fc00::1', 'fe80::1', 'ff02::1',
    '64:ff9b::7f00:1', '2002:7f00:1::', '2001::1', '2001:db8::1', '3fff::1'];
  const request = t.mock.method(http, 'request', () => { throw new Error('must not connect'); });
  for (const ip of blocked) {
    assert.equal(isPublicAddress(ip), false, ip);
    await assert.rejects(resolveUrl(`http://${ip.includes(':') ? `[${ip}]` : ip}/`, { cacheTtlMs: 0 }), { code: 'ERR_UNSAFE_ADDRESS' });
  }
  for (const host of ['localhost', 'a.localhost', 'box.local', 'foo.internal', 'metadata.google.internal', 'printer', '0x7f000001', '2130706433']) {
    await assert.rejects(resolveUrl(`http://${host}/`, { cacheTtlMs: 0 }), { code: 'ERR_UNSAFE_ADDRESS' });
  }
  assert.equal(request.mock.callCount(), 0);
  for (const ip of ['1.1.1.1', '8.8.8.8', '172.15.0.1', '172.32.0.1', '2001:4860:4860::8888', '2606:4700:4700::1111']) assert.equal(isPublicAddress(ip), true, ip);
});

test('mixed DNS answers are rejected; actual socket lookup is pinned against rebinding', async t => {
  const signal = new AbortController().signal;
  const lookup = t.mock.method(dns, 'lookup', async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }]);
  await assert.rejects(validatedAddress(new URL('http://mixed.example.org'), false, signal), { code: 'ERR_UNSAFE_ADDRESS' });
  lookup.mock.mockImplementationOnce(async () => [{ address: '8.8.8.8', family: 4 }]);
  let pinned;
  t.mock.method(http, 'request', (_url, options) => {
    assert.equal(options.agent, false);
    assert.equal(options.autoSelectFamily, false);
    assert.equal(options.family, 4);
    options.lookup('rebind.example.org', {}, (_error, address, family) => { pinned = { address, family }; });
    options.lookup('rebind.example.org', { all: true }, (_error, addresses) => assert.deepEqual(addresses, [pinned]));
    const request = new EventEmitter();
    request.end = () => queueMicrotask(() => request.emit('error', new Error('fixture stop')));
    return request;
  });
  await assert.rejects(resolveUrl('http://rebind.example.org', { cacheTtlMs: 0 }), { code: 'ERR_NETWORK' });
  assert.deepEqual(pinned, { address: '8.8.8.8', family: 4 });
  assert.equal(lookup.mock.callCount(), 2); // validation once, no connection-time DNS refresh
});

test('every redirect target receives a fresh network safety check', async t => {
  t.mock.method(dns, 'lookup', async () => [{ address: '8.8.8.8', family: 4 }]);
  let requests = 0;
  t.mock.method(http, 'request', () => {
    requests++;
    const request = new EventEmitter();
    request.destroy = () => {};
    request.end = () => queueMicrotask(() => {
      const response = new EventEmitter();
      response.statusCode = 302;
      response.headers = { location: 'http://169.254.169.254/latest/meta-data/' };
      response.destroy = () => {};
      request.emit('response', response);
    });
    return request;
  });
  await assert.rejects(resolveUrl('http://public.example.org', { cacheTtlMs: 0 }), { code: 'ERR_UNSAFE_ADDRESS' });
  assert.equal(requests, 1);
});

test('network option validation rejects invalid values and unsafe User-Agent headers before DNS', async t => {
  const lookup = t.mock.method(dns, 'lookup', () => { throw new Error('invalid options must not reach DNS'); });
  const invalidAgents = [null, 42, false, '', '   ', '\tLinkary', 'Linkary\t', 'Linkary\r\nX-Injected: yes',
    'Linkary\n', 'Linkary\u0000', 'Linkary\u001f', 'Linkary\u007f', 'Linkary/é', 'a'.repeat(1025), ` ${'a'.repeat(1023)} `];
  for (const options of [{ timeoutMs: 0 }, { maxRedirects: -1 }, { cacheTtlMs: -1 }, { unsafeAllowPrivate: 'yes' }, { signal: {} },
    ...invalidAgents.map(userAgent => ({ userAgent }))]) {
    await assert.rejects(resolveUrl('https://example.org', options), { code: 'ERR_INVALID_OPTIONS' });
  }
  await assert.rejects(resolveUrl('https://user:secret@example.org'), { code: 'ERR_CREDENTIALS' });
  assert.equal(lookup.mock.callCount(), 0);
});

test('visible ASCII User-Agent values accept the size boundary and trim only outer spaces', async t => {
  const fixture = await server(t, (_req, res) => res.writeHead(204).end());
  await resolveUrl(`${fixture.url}/limit`, { ...local, userAgent: 'a'.repeat(1024) });
  await resolveUrl(`${fixture.url}/spaces`, { ...local, userAgent: '  Linkary fixture/1.0 !~  ' });
  assert.equal(fixture.requests[0].headers['user-agent'], 'a'.repeat(1024));
  assert.equal(fixture.requests[1].headers['user-agent'], 'Linkary fixture/1.0 !~');
});

test('HTTPS retains hostname and native TLS verification; protocol upgrades fail', async t => {
  t.mock.method(dns, 'lookup', async () => [{ address: '2606:4700:4700::1111', family: 6 }]);
  t.mock.method(https, 'request', (url, options) => {
    assert.equal(url.hostname, 'secure.example.org');
    assert.equal(options.rejectUnauthorized, undefined); // native true default
    assert.equal(options.servername, undefined); // derived natively from URL hostname
    assert.equal(options.family, 6);
    assert.equal(options.agent, false);
    assert.deepEqual(Object.fromEntries(Object.entries(options.headers).map(([name, value]) => [name.toLowerCase(), value])), {
      'user-agent': defaultUserAgent, accept: '*/*', 'accept-encoding': 'identity',
    });
    const request = new EventEmitter();
    request.end = () => queueMicrotask(() => request.emit('upgrade', {}, { destroy() {} }));
    return request;
  });
  await assert.rejects(resolveUrl('https://secure.example.org/', { cacheTtlMs: 0 }), { code: 'ERR_HTTP_STATUS' });
  assert.equal(isPublicAddress('fe80::1%lo0'), false);
});

test('cross-origin redirects send no caller authorization/cookie headers', async t => {
  const destination = await server(t, (_req, res) => res.writeHead(204).end());
  const source = await server(t, (_req, res) => res.writeHead(302, { Location: destination.url }).end());
  await resolveUrl(source.url, { ...local, userAgent: 'Linkary fixture/cross-origin',
    headers: { Authorization: 'secret', Cookie: 'session=secret', 'User-Agent': 'untrusted override' } });
  for (const request of [...source.requests, ...destination.requests]) {
    assert.equal(request.headers.authorization, undefined);
    assert.equal(request.headers.cookie, undefined);
    assert.equal(request.headers['user-agent'], 'Linkary fixture/cross-origin');
    assert.equal(request.headers.accept, '*/*');
    assert.equal(request.headers['accept-encoding'], 'identity');
  }
});
