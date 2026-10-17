'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { server } = require('./fixtures.js');
const cli = resolve(__dirname, '../cli/index.js');
function run(args, input) { return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', input }); }
function runAsync(args, input) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [cli, ...args]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', status => resolveResult({ stdout, stderr, status }));
    child.stdin.end(input);
  });
}

test('CLI exposes offline commands using machine-readable output', () => {
  const cases = [
    [['inspect', 'https://youtu.be/abc123', '--json'], r => r.resourceId === 'abc123'],
    [['normalize', 'HTTP://EXAMPLE.org:80/a/../b', '--json'], r => r === 'http://example.org/b'],
    [['clean', 'https://a.test/?v=1&utm_source=x', '--json'], r => r.cleanUrl === 'https://a.test/?v=1'],
    [['identify', 'https://github.com/owner/repo', '--json'], r => r.resourceType === 'repository'],
    [['compare', 'https://youtu.be/abc123', 'https://youtube.com/watch?v=abc123', '--jsonl'], r => r.sameResource],
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

test('CLI reads files and stdin, emits JSON arrays/JSONL and reports partial errors', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'linkary-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'urls.txt');
  const input = '\uFEFFhttps://a.test\r\n\ninvalid\nhttps://a.test\n';
  await writeFile(file, input);
  const array = run(['batch', file, '--json']);
  assert.equal(array.status, 1);
  assert.equal(JSON.parse(array.stdout).length, 3);
  const lines = run(['batch', '--stdin', '--jsonl', '--deduplicate'], input);
  assert.equal(lines.status, 1);
  const items = lines.stdout.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(items.length, 2);
  assert.equal(items[1].error.code, 'ERR_INVALID_URL');
  assert.equal(lines.stderr, '');
});

test('CLI help, version, usage errors, quiet errors and URL failures have predictable exits', () => {
  assert.match(run(['--help']).stdout, /Understand every link/);
  assert.equal(run(['--version']).stdout, '0.1.0\n');
  assert.equal(run([]).status, 0);
  for (const args of [['wat'], ['inspect'], ['compare', 'https://a.test'], ['batch'], ['batch', 'file', '--stdin'],
    ['inspect', 'https://a.test', '--wat'], ['inspect', 'https://a.test', '--json', '--jsonl'],
    ['resolve', 'https://a.test', '--timeout', '-1'], ['clean', 'https://a.test', '--resolve']]) {
    const result = run([...args, '--json']);
    assert.equal(result.status, 2, args.join(' '));
    assert.equal(JSON.parse(result.stdout).error.code, 'ERR_USAGE');
  }
  const failure = run(['inspect', 'bad', '--json', '--quiet']);
  assert.equal(failure.status, 1);
  assert.equal(failure.stderr, '');
  assert.equal(JSON.parse(failure.stdout).error.code, 'ERR_INVALID_URL');
  const missing = run(['batch', '/does/not/exist', '--json']);
  assert.equal(missing.status, 2);
  assert.equal(JSON.parse(missing.stdout).error.code, 'ERR_INPUT');
});

test('CLI resolve and batch resolution call the public resolver with explicit network policy', async t => {
  const fixture = await server(t, (_req, res) => res.writeHead(204).end());
  const denied = await runAsync(['resolve', fixture.url, '--json']);
  assert.equal(denied.status, 1);
  assert.equal(JSON.parse(denied.stdout).error.code, 'ERR_UNSAFE_ADDRESS');
  const allowed = await runAsync(['resolve', fixture.url, '--unsafe-allow-private', '--timeout', '1000', '--max-redirects', '0', '--json']);
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(JSON.parse(allowed.stdout).status, 204);
  const batch = await runAsync(['batch', '--stdin', '--resolve', '--concurrency', '2', '--unsafe-allow-private', '--jsonl'], fixture.url + '\n');
  assert.equal(batch.status, 0, batch.stderr);
  assert.equal(JSON.parse(batch.stdout).resolution.status, 204);
});
