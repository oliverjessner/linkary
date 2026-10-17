'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtemp, rm, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

test('packed package installs offline with no runtime dependencies and exposes library and CLI', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'linkary-pack-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const packed = spawnSync(npm, ['pack', '--json', '--pack-destination', directory], {
    cwd: resolve(__dirname, '..'), encoding: 'utf8',
  });
  assert.equal(packed.status, 0, packed.stderr);
  const [manifest] = JSON.parse(packed.stdout);
  const files = manifest.files.map(item => item.path);
  for (const file of ['src/index.js', 'src/index.d.ts', 'cli/index.js', 'README.md', 'LICENSE', 'docs/SECURITY.md', 'docs/PLATFORMS.md']) assert(files.includes(file), file);
  assert(files.every(file => !file.startsWith('test/') && !file.startsWith('node_modules/')));
  const installed = spawnSync(npm, ['install', '--prefix', directory, '--omit=dev', '--ignore-scripts', '--offline', '--no-audit', '--no-fund', join(directory, manifest.filename)], {
    encoding: 'utf8', cwd: directory,
  });
  assert.equal(installed.status, 0, installed.stderr);
  const pkg = JSON.parse(await readFile(join(directory, 'node_modules/linkary/package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.engines.node, '>=26');
  assert.equal(pkg.bin.linkary, './cli/index.js');
  for (const args of [
    ['-e', "console.log(require('linkary').normalizeUrl('HTTP://EXAMPLE.org:80'))"],
    ['--input-type=module', '-e', "import linkary, { normalizeUrl } from 'linkary'; if (linkary.normalizeUrl !== normalizeUrl) throw Error('exports'); console.log(normalizeUrl('HTTP://EXAMPLE.org:80'))"],
  ]) {
    const result = spawnSync(process.execPath, args, { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'http://example.org/\n');
  }
  const cli = spawnSync(process.execPath, [join(directory, 'node_modules/linkary/cli/index.js'), 'identify', 'https://youtu.be/abc123', '--json'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).identityKey, 'youtube:video:abc123');
});
