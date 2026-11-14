#!/usr/bin/env node
'use strict';

const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const registry = 'https://registry.npmjs.org/';
const formulaFile = 'Formula/linkary.rb';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function isStableVersion(version) {
  return typeof version === 'string' && version === version.trim() &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version);
}

function parseArgs(args) {
  const options = { dryRun: false, skipNpm: false, skipBrew: false, help: false,
    tapPath: undefined, otp: undefined };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--skip-npm') options.skipNpm = true;
    else if (argument === '--skip-brew') options.skipBrew = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--tap-path' || argument === '--otp') {
      const value = args[++index];
      if (!value || value.startsWith('-')) throw new Error(`${argument} requires a value.`);
      options[argument === '--tap-path' ? 'tapPath' : 'otp'] = value;
    } else throw new Error(`Unknown option: ${argument}`);
  }
  if (options.skipNpm && options.skipBrew) throw new Error('Cannot skip both npm and Homebrew.');
  return options;
}

function validatePackage(pkg, lock) {
  if (pkg.name !== 'linkary' || lock.name !== pkg.name || lock.packages?.['']?.name !== pkg.name) {
    throw new Error('package.json and package-lock.json must both describe linkary.');
  }
  if (!isStableVersion(pkg.version)) {
    throw new Error('Publishing requires a stable X.Y.Z version.');
  }
  if (lock.version !== pkg.version || lock.packages[''].version !== pkg.version) {
    throw new Error('package-lock.json versions must match package.json.');
  }
  if (pkg.engines?.node !== '>=26' ||
      ['dependencies', 'optionalDependencies', 'peerDependencies'].some(key => Object.keys(pkg[key] || {}).length)) {
    throw new Error('Review the Homebrew formula before changing Node >=26 or adding runtime dependencies.');
  }
}

function command(commandName, args, cwd = root, inherit = false) {
  const result = spawnSync(commandName, args, {
    cwd, encoding: 'utf8', stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    // The shared preview still needs real temporary archives and package tests.
    env: { ...process.env, npm_config_dry_run: 'false', NPM_CONFIG_DRY_RUN: 'false' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    // Never echo arguments: they can include the npm one-time password.
    throw new Error(`${commandName} failed (${result.signal || result.status}).${result.stderr ? `\n${result.stderr.trim()}` : ''}`);
  }
  return result.stdout?.trim() || '';
}

function step(label, commandName, args, cwd = root) {
  process.stdout.write(`\n==> ${label}\n`);
  return command(commandName, args, cwd, true);
}

function assertCleanCheckout(cwd, label) {
  const changes = command('git', ['status', '--porcelain', '--untracked-files=all'], cwd);
  if (changes) throw new Error(`${label} has local changes. Commit or stash them before publishing.\n${changes}`);
}

function assertTapUnchanged(cwd, expectedHead) {
  assertCleanCheckout(cwd, 'Homebrew tap');
  if (command('git', ['branch', '--show-current'], cwd) !== 'main' ||
      command('git', ['rev-parse', 'HEAD'], cwd) !== expectedHead) {
    throw new Error('Homebrew tap changed during publication. Review it before resuming.');
  }
}

async function prepareTap(tapPath) {
  const cwd = await fs.realpath(tapPath);
  const top = await fs.realpath(command('git', ['rev-parse', '--show-toplevel'], cwd));
  if (top !== cwd) throw new Error('Homebrew tap path must be the root of its own Git checkout.');
  if (command('git', ['branch', '--show-current'], cwd) !== 'main') {
    throw new Error('Homebrew tap must be on main.');
  }
  for (const args of [['remote', 'get-url', 'origin'], ['remote', 'get-url', '--push', '--all', 'origin']]) {
    const remote = command('git', args, cwd);
    if (!/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)oliverjessner\/homebrew-tap(?:\.git)?\/?$/.test(remote)) {
      throw new Error('Homebrew origin must point to oliverjessner/homebrew-tap.');
    }
  }
  assertCleanCheckout(cwd, 'Homebrew tap');
  step('Fetch Homebrew tap', 'git', ['fetch', 'origin', 'refs/heads/main:refs/remotes/origin/main'], cwd);
  if (command('git', ['rev-list', '--count', 'origin/main..HEAD'], cwd) !== '0') {
    throw new Error('Homebrew tap has unpushed commits. Review and push them before publishing.');
  }
  step('Fast-forward Homebrew tap', 'git', ['merge', '--ff-only', 'origin/main'], cwd);
  step('Check Homebrew push access', 'git', ['-c', 'push.followTags=false', 'push', '--dry-run', 'origin', 'HEAD:refs/heads/main'], cwd);
  return cwd;
}

function assertNpmReady(version) {
  command(npm, ['whoami', '--registry', registry]);
  const result = spawnSync(npm, ['view', `linkary@${version}`, 'version', '--json', '--registry', registry], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status === 0) {
    throw new Error(`linkary@${version} already exists on npm. Bump the version or resume with --skip-npm.`);
  }
  if (!/\bE404\b/.test(`${result.stdout}\n${result.stderr}`)) {
    throw new Error(`Cannot check the npm version.\n${result.stderr.trim()}`);
  }
}

function renderFormula(version, sha256) {
  if (!isStableVersion(version) || typeof sha256 !== 'string' || sha256.length !== 64 || !/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error('A stable version and SHA-256 are required for the Homebrew formula.');
  }
  return `class Linkary < Formula
  desc "Inspect, clean, purge and resolve web links"
  homepage "https://github.com/oliverjessner/linkary"
  url "https://registry.npmjs.org/linkary/-/linkary-${version}.tgz"
  sha256 "${sha256}"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args, "--ignore-scripts"
    bin.install_symlink libexec/"bin/linkary"
  end

  test do
    assert_equal "#{version}\\n", shell_output("#{bin}/linkary --version")
    assert_equal "http://example.org/\\n", shell_output("#{bin}/linkary normalize 'HTTP://EXAMPLE.org:80'")
    url = "https://example.org/?id=7&utm_source=brew"
    output = shell_output("#{bin}/linkary clean '#{url}' --json")
    assert_equal "https://example.org/?id=7", JSON.parse(output)["cleanUrl"]
  end
end
`;
}

async function waitForPublishedTarball(version, expectedSha256, options = {}) {
  const attempts = options.attempts ?? 20;
  const wait = options.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const fetchTarball = options.fetch ?? fetch;
  const requestId = randomUUID();
  let failure = 'not available';
  for (let attempt = 0; attempt < attempts; attempt++) {
    const url = new URL(`linkary/-/linkary-${version}.tgz`, registry);
    // A newly published npm archive can be hidden by a cached CDN 404.
    url.searchParams.set('linkary_publish', `${requestId}-${attempt}`);
    let contents;
    try {
      const response = await fetchTarball(url.href, {
        cache: 'no-store', headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
      });
      if (response.ok) contents = Buffer.from(await response.arrayBuffer());
      else {
        failure = `HTTP ${response.status}`;
        await response.body?.cancel();
        if (![404, 429].includes(response.status) && response.status < 500) {
          throw Object.assign(new Error(`Cannot download npm tarball: ${failure}`), { permanent: true });
        }
      }
    } catch (error) {
      if (error.permanent) throw error;
      failure = error.message;
    }
    if (contents) {
      const sha256 = createHash('sha256').update(contents).digest('hex');
      if (sha256 !== expectedSha256) throw new Error(`Published tarball SHA-256 mismatch: ${sha256}; expected ${expectedSha256}. Homebrew was not updated.`);
      return;
    }
    if (attempt + 1 < attempts) await wait(options.delayMs ?? 2000);
  }
  throw new Error(`npm tarball unavailable after ${attempts} attempts: ${failure}.`);
}

async function publishFormula(cwd, contents, version, expectedHead) {
  // Catch unrelated edits or branch changes made while npm was publishing.
  assertTapUnchanged(cwd, expectedHead);
  const target = path.join(cwd, formulaFile);
  const current = await fs.readFile(target, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (current !== contents) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents, { mode: 0o644 });
    await fs.chmod(target, 0o644);
    command('git', ['add', '--', formulaFile], cwd);
    step('Commit Linkary Homebrew formula', 'git', ['commit', '--only', '-m', `chore(linkary): publish ${version}`, '--', formulaFile], cwd);
  }
  try {
    step('Push Homebrew tap', 'git', ['-c', 'push.followTags=false', 'push', 'origin', 'HEAD:refs/heads/main'], cwd);
  } catch (error) {
    throw new Error(`Formula commit is local; push failed. Review the tap and run git push origin HEAD:refs/heads/main in ${cwd}.\n${error.message}`);
  }
  const remoteHead = command('git', ['ls-remote', 'origin', 'refs/heads/main'], cwd).split(/\s+/)[0];
  if (remoteHead !== command('git', ['rev-parse', 'HEAD'], cwd)) {
    throw new Error('Could not confirm the formula commit on remote main. Review the Homebrew tap.');
  }
}

async function main() {
  // `publish` is also an npm lifecycle hook, including with `npm publish --dry-run`.
  // The shared workflow must only run when explicitly invoked with `npm run publish`.
  if (process.env.npm_command === 'publish') {
    process.stdout.write('Shared release workflow skipped in npm lifecycle. Use npm run publish for npm + Homebrew.\n');
    return;
  }
  const options = parseArgs(process.argv.slice(2));
  // Also honor `npm --dry-run run publish`, where npm consumes the option itself.
  if ([process.env.npm_config_dry_run, process.env.NPM_CONFIG_DRY_RUN].some(value => ['true', '1'].includes(value))) options.dryRun = true;
  if (options.help) {
    process.stdout.write(`Publish Linkary to npm and ../homebrew-tap.

Usage: npm run publish -- [options]
  --dry-run          Run checks, pack and preview; do not publish or modify the tap.
  --skip-npm         Resume Homebrew using the already published npm version.
  --skip-brew        Publish only to npm.
  --tap-path <path>  Tap checkout (default: HOMEBREW_TAP_PATH or ../homebrew-tap).
  --otp <code>       npm one-time password (interactive authentication also works).
  --help, -h         Show this help.
`);
    return;
  }
  if (Number(process.versions.node.split('.')[0]) < 26) throw new Error('Node.js 26 or newer is required.');
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8'));
  validatePackage(pkg, lock);
  let tapPath = path.resolve(options.tapPath || process.env.HOMEBREW_TAP_PATH || path.join(root, '..', 'homebrew-tap'));
  let sourceHead;
  let tapHead;
  if (!options.dryRun) {
    assertCleanCheckout(root, 'Linkary checkout');
    sourceHead = command('git', ['rev-parse', 'HEAD']);
    if (!options.skipNpm) assertNpmReady(pkg.version);
    if (!options.skipBrew) {
      tapPath = await prepareTap(tapPath);
      tapHead = command('git', ['rev-parse', 'HEAD'], tapPath);
    }
  }
  step('Validate tests, types and package', npm, ['run', 'publish:check']);
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'linkary-publish-'));
  try {
    const output = command(npm, ['pack', '--dry-run=false', '--ignore-scripts', '--json', '--pack-destination', temporaryDirectory]);
    const [packed] = JSON.parse(output);
    if (packed?.name !== pkg.name || packed.version !== pkg.version || !packed.filename || path.basename(packed.filename) !== packed.filename) {
      throw new Error('npm pack returned unexpected package metadata.');
    }
    const tarball = path.join(temporaryDirectory, packed.filename);
    const sha256 = createHash('sha256').update(await fs.readFile(tarball)).digest('hex');
    const formula = renderFormula(pkg.version, sha256);
    if (!options.skipBrew) {
      const preview = path.join(temporaryDirectory, formulaFile);
      await fs.mkdir(path.dirname(preview), { recursive: true });
      await fs.writeFile(preview, formula, { mode: 0o644 });
      step('Check Homebrew formula style', 'brew', ['style', preview]);
    }
    if (options.dryRun) {
      process.stdout.write(`\nPackage: linkary@${pkg.version}\nSHA-256: ${sha256}\n`);
      if (!options.skipBrew) process.stdout.write(`\nHomebrew target: ${path.join(tapPath, formulaFile)}\n${formula}`);
      process.stdout.write('\nDry run complete. Nothing published; no Git commits or pushes.\n');
      return;
    }
    // Validate the source and tap again after checks, before npm becomes irreversible.
    assertCleanCheckout(root, 'Linkary checkout');
    if (command('git', ['rev-parse', 'HEAD']) !== sourceHead) {
      throw new Error('Linkary HEAD changed during validation. Retry from the intended release commit.');
    }
    if (!options.skipBrew) assertTapUnchanged(tapPath, tapHead);
    if (!options.skipNpm) {
      const args = ['publish', tarball, '--ignore-scripts', '--access', 'public', '--tag', 'latest', '--registry', registry];
      if (options.otp) args.push('--otp', options.otp);
      step('Publish exact packed archive to npm', npm, args);
    }
    process.stdout.write('\n==> Verify published npm tarball\n');
    await waitForPublishedTarball(pkg.version, sha256);
    if (!options.skipBrew) {
      try {
        await publishFormula(tapPath, formula, pkg.version, tapHead);
      } catch (error) {
        throw new Error(`npm is published; Homebrew is incomplete.\n${error.message}`);
      }
    }
    process.stdout.write(`\nPublished linkary ${pkg.version}${options.skipBrew ? ' to npm' : ' to npm and oliverjessner/homebrew-tap'}.\n`);
  } catch (error) {
    process.stderr.write('\nIf npm publication succeeded, fix the error and resume with npm run publish -- --skip-npm (preserve any --tap-path option).\n');
    throw error;
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`\nPublish failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, validatePackage, renderFormula, waitForPublishedTarball, main };
