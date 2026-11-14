'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const {
  parseArgs, validatePackage, renderFormula, waitForPublishedTarball,
} = require('../scripts/publish.js');

const tarball = Buffer.from('the exact packed Linkary archive');
const sha256 = value => createHash('sha256').update(value).digest('hex');

function manifests() {
  const pkg = { name: 'linkary', version: '0.1.0', engines: { node: '>=26' } };
  const lock = {
    name: 'linkary', version: '0.1.0', lockfileVersion: 3,
    packages: { '': { name: 'linkary', version: '0.1.0', engines: { node: '>=26' } } },
  };
  return { pkg, lock };
}

test('release options support preview and independent npm or tap recovery', () => {
  assert.equal(parseArgs(['--dry-run', '--skip-npm']).dryRun, true);
  assert.equal(parseArgs(['--skip-brew']).skipBrew, true);
  const options = parseArgs(['--tap-path', '/tmp/custom tap', '--otp', '123456']);
  assert.equal(options.tapPath, '/tmp/custom tap');
  assert.equal(options.otp, '123456');
  for (const args of [
    ['--skip-npm', '--skip-brew'], ['--unknown'], ['--tap-path'], ['--otp'],
    ['--tap-path', '--dry-run'], ['--otp', '--skip-brew'],
  ]) assert.throws(() => parseArgs(args), undefined, args.join(' '));
});

test('release preflight rejects inconsistent manifests and incompatible runtime requirements', () => {
  const valid = manifests();
  assert.doesNotThrow(() => validatePackage(valid.pkg, valid.lock));
  const cases = [
    ({ pkg }) => { pkg.name = 'another-package'; },
    ({ lock }) => { lock.name = 'another-package'; },
    ({ lock }) => { lock.version = '0.2.0'; },
    ({ lock }) => { lock.packages[''].version = '0.2.0'; },
    ({ lock }) => { lock.packages[''].name = 'another-package'; },
    ({ lock }) => { delete lock.packages['']; },
    ({ pkg }) => { pkg.version = '0.2.0-beta.1'; },
    ({ pkg }) => { pkg.version = '0.1.0\n'; },
    ({ pkg }) => { pkg.engines.node = '>=24'; },
    ({ pkg }) => { pkg.dependencies = { accidental: '^1.0.0' }; },
    ({ pkg }) => { pkg.optionalDependencies = { accidental: '^1.0.0' }; },
    ({ pkg }) => { pkg.peerDependencies = { accidental: '^1.0.0' }; },
  ];
  for (const change of cases) {
    const fixture = manifests();
    change(fixture);
    assert.throws(() => validatePackage(fixture.pkg, fixture.lock));
  }
});

test('Homebrew installs the verified registry archive with package lifecycle scripts disabled', () => {
  const formula = renderFormula('0.1.0', sha256(tarball));
  assert.match(formula, /class Linkary < Formula/);
  assert.ok(formula.includes('https://registry.npmjs.org/linkary/-/linkary-0.1.0.tgz'));
  assert.ok(formula.includes(`sha256 "${sha256(tarball)}"`));
  assert.match(formula, /depends_on "node"/);
  assert.match(formula, /std_npm_args/);
  assert.match(formula, /--ignore-scripts/);
  assert.match(formula, /bin\.install_symlink libexec\/"bin\/linkary"/);
  for (const flag of ['--version', 'normalize', 'clean', '--json']) assert.ok(formula.includes(flag));
  assert.match(formula, /JSON\.parse/);
  for (const [version, digest] of [
    ['0.1.0\"\ninjected', sha256(tarball)], ['0.1.0', 'not-a-digest'],
    ['0.1.0', `${sha256(tarball)}\n`],
  ]) assert.throws(() => renderFormula(version, digest));
});

test('registry polling retries propagation failures with a fresh cache key and validates archive bytes', async () => {
  const urls = [];
  const delays = [];
  const statuses = [404, 429, 503, 200];
  await waitForPublishedTarball('0.1.0', sha256(tarball), {
    attempts: statuses.length, delayMs: 3,
    wait: async delay => { delays.push(delay); },
    fetch: async url => {
      urls.push(new URL(url));
      const status = statuses[urls.length - 1];
      return new Response(status === 200 ? tarball : null, { status });
    },
  });
  assert.equal(urls.length, statuses.length);
  assert.equal(delays.length, statuses.length - 1);
  assert.equal(new Set(urls.map(url => url.href)).size, statuses.length);
  for (const url of urls) {
    assert.equal(url.origin, 'https://registry.npmjs.org');
    assert.equal(url.pathname, '/linkary/-/linkary-0.1.0.tgz');
    assert.notEqual(url.search, '');
  }
});

test('registry polling retries request and response-body failures', async () => {
  let requests = 0;
  let waits = 0;
  await waitForPublishedTarball('0.1.0', sha256(tarball), {
    attempts: 3,
    wait: async () => { waits += 1; },
    fetch: async () => {
      requests += 1;
      if (requests === 1) throw new Error('connection reset');
      if (requests === 2) return {
        ok: true, arrayBuffer: async () => { throw new Error('truncated body'); },
      };
      return new Response(tarball);
    },
  });
  assert.equal(requests, 3);
  assert.equal(waits, 2);
});

test('registry polling stops immediately on permanent HTTP errors and archive mismatches', async t => {
  for (const [name, response] of [
    ['forbidden', () => new Response(null, { status: 403 })],
    ['different archive', () => new Response('different package bytes')],
  ]) {
    await t.test(name, async () => {
      let requests = 0;
      let waits = 0;
      await assert.rejects(waitForPublishedTarball('0.1.0', sha256(tarball), {
        attempts: 4,
        wait: async () => { waits += 1; },
        fetch: async () => { requests += 1; return response(); },
      }));
      assert.equal(requests, 1);
      assert.equal(waits, 0);
    });
  }
});

test('registry polling exhausts its bounded retries without a final unnecessary wait', async () => {
  let requests = 0;
  let waits = 0;
  await assert.rejects(waitForPublishedTarball('0.1.0', sha256(tarball), {
    attempts: 3,
    wait: async () => { waits += 1; },
    fetch: async () => { requests += 1; return new Response(null, { status: 404 }); },
  }));
  assert.equal(requests, 3);
  assert.equal(waits, 2);
});

test('direct npm publish lifecycle does not reenter the release workflow', () => {
  const result = spawnSync(process.execPath, [resolve(__dirname, '../scripts/publish.js')], {
    encoding: 'utf8', timeout: 5000,
    env: { ...process.env, PATH: '', npm_command: 'publish', npm_lifecycle_event: 'publish' },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

test('complete dry runs validate and preview without contacting Git or publishing', {
  skip: process.platform === 'win32',
}, async t => {
  for (const useNpmConfig of [false, true]) {
    await t.test(useNpmConfig ? 'inherited npm dry-run config' : 'explicit dry-run flag', t => {
      // Match Node's canonical __dirname when macOS tmpdir() traverses /var.
      const directory = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'linkary-release-test-')));
      t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
      const source = join(directory, 'source checkout');
      const bin = join(directory, 'bin');
      fs.mkdirSync(join(source, 'scripts'), { recursive: true });
      fs.mkdirSync(bin);
      fs.copyFileSync(resolve(__dirname, '../scripts/publish.js'), join(source, 'scripts/publish.js'));
      const { pkg, lock } = manifests();
      fs.writeFileSync(join(source, 'package.json'), JSON.stringify(pkg));
      fs.writeFileSync(join(source, 'package-lock.json'), JSON.stringify(lock));
      const log = join(directory, 'commands.jsonl');
      const fakeCommand = `#!${process.execPath}
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.LINKARY_PUBLISH_TEST_LOG, JSON.stringify({ command, args }) + '\\n');
if (command === 'npm' && args[0] === 'run' && args[1] === 'publish:check') process.exit(0);
if (command === 'npm' && args[0] === 'pack') {
  if (process.env.npm_config_dry_run === 'true' && !args.includes('--dry-run=false')) {
    throw Error('inherited npm dry-run would suppress the archive');
  }
  const destination = args[args.indexOf('--pack-destination') + 1];
  fs.writeFileSync(path.join(destination, 'linkary-0.1.0.tgz'), 'packed fixture bytes');
  process.stdout.write(JSON.stringify([{ name: 'linkary', version: '0.1.0', filename: 'linkary-0.1.0.tgz' }]));
  process.exit(0);
}
if (command === 'brew' && args[0] === 'style' && fs.existsSync(args[1])) process.exit(0);
throw Error('Unexpected command: ' + command + ' ' + args.join(' '));
`;
      for (const command of ['npm', 'brew', 'git']) {
        fs.writeFileSync(join(bin, command), fakeCommand, { mode: 0o755 });
      }
      const result = spawnSync(process.execPath, [join(source, 'scripts/publish.js'),
        ...(useNpmConfig ? [] : ['--dry-run'])], {
        cwd: source, encoding: 'utf8', timeout: 10000,
        env: {
          PATH: bin, npm_command: 'run-script', LINKARY_PUBLISH_TEST_LOG: log,
          ...(useNpmConfig ? { npm_config_dry_run: 'true' } : {}),
        },
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr);
      const commands = fs.readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
      assert.equal(commands.some(entry => entry.command === 'git'), false);
      assert.equal(commands.some(entry => entry.args.some(arg => ['publish', 'commit', 'push'].includes(arg))), false);
      assert.ok(commands.some(entry => entry.command === 'npm' && entry.args[0] === 'run' && entry.args[1] === 'publish:check'));
      assert.ok(commands.some(entry => entry.command === 'brew' && entry.args[0] === 'style'));
      const packed = commands.find(entry => entry.command === 'npm' && entry.args[0] === 'pack');
      assert.ok(packed.args.includes('--ignore-scripts'));
      assert.ok(packed.args.includes('--dry-run=false'));
      const archiveDirectory = packed.args[packed.args.indexOf('--pack-destination') + 1];
      assert.equal(fs.existsSync(archiveDirectory), false, 'temporary release archive is removed');
      assert.ok(result.stdout.includes(`Homebrew target: ${join(directory, 'homebrew-tap/Formula/linkary.rb')}`));
      assert.ok(result.stdout.includes('https://registry.npmjs.org/linkary/-/linkary-0.1.0.tgz'));
      assert.ok(result.stdout.includes(sha256('packed fixture bytes')));
    });
  }
});
