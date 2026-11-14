'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { server } = require('./fixtures.js');
const cli = resolve(__dirname, '../cli/index.js');
function run(args) { return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function runAsync(args) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', status => resolveResult({ stdout, stderr, status }));
  });
}

test('CLI exposes offline commands using machine-readable output', () => {
  const cases = [
    [['inspect', 'https://youtu.be/abc123', '--json'], r => r.resourceId === 'abc123'],
    [['normalize', 'HTTP://EXAMPLE.org:80/a/../b', '--json'], r => r === 'http://example.org/b'],
    [['clean', 'https://a.test/?v=1&utm_source=x', '--json'], r => r.cleanUrl === 'https://a.test/?v=1'],
    [['purge', 'https://a.test/page?id=7#section', '--jsonl'], r => r.cleanUrl === 'https://a.test/page' && r.removedFragment === 'section'],
    [['identify', 'https://github.com/owner/repo', '--json'], r => r.resourceType === 'repository'],
  ];
  for (const [args, check] of cases) {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert(check(JSON.parse(result.stdout)));
  }
  assert.equal(run(['normalize', 'https://a.test']).stdout, 'https://a.test/\n');
  const custom = run(['clean', 'https://a.test/?v=1&utm_x=2&id=3', '--remove-param', 'id', '--preserve-param', 'utm_x', '--json']);
  assert.equal(JSON.parse(custom.stdout).cleanUrl, 'https://a.test/?v=1&utm_x=2');
});

test('CLI help, version, usage errors, quiet errors and URL failures have predictable exits', () => {
  assert.match(run(['--help']).stdout, /Understand every link/);
  assert.equal(run(['--version']).stdout, `${require('../package.json').version}\n`);
  assert.equal(run([]).status, 0);
  for (const args of [['wat'], ['inspect'], ['normalize', 'https://a.test', 'https://b.test'],
    ['inspect', 'https://a.test', '--wat'], ['inspect', 'https://a.test', '--json', '--jsonl'],
    ['resolve', 'https://a.test', '--timeout', '-1'], ['purge', 'https://a.test', '--preserve-param', 'v']]) {
    const result = run([...args, '--json']);
    assert.equal(result.status, 2, args.join(' '));
    assert.equal(JSON.parse(result.stdout).error.code, 'ERR_USAGE');
  }
  for (const format of ['--json', '--jsonl']) {
    const failure = run(['inspect', 'bad', format, '--quiet']);
    assert.equal(failure.status, 1);
    assert.equal(failure.stderr, '');
    assert.equal(JSON.parse(failure.stdout).error.code, 'ERR_INVALID_URL');
  }
});

test('CLI resolve calls the public resolver with explicit network policy', async t => {
  const fixture = await server(t, (_req, res) => res.writeHead(204).end());
  const denied = await runAsync(['resolve', fixture.url, '--json']);
  assert.equal(denied.status, 1);
  assert.equal(JSON.parse(denied.stdout).error.code, 'ERR_UNSAFE_ADDRESS');
  const allowed = await runAsync(['resolve', fixture.url, '--unsafe-allow-private', '--timeout', '1000', '--max-redirects', '0', '--json']);
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(JSON.parse(allowed.stdout).status, 204);
});
