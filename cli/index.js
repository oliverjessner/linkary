#!/usr/bin/env node
'use strict';
const { parseArgs } = require('node:util');
const { once } = require('node:events');
const linkary = require('../src/index.js');
const { version } = require('../package.json');

const HELP = `Linkary ${version} — Understand every link.

Usage: linkary <command> [arguments] [options]

  inspect <url>           Inspect offline
  normalize <url>         Normalize conservatively
  clean <url>             Remove known tracking parameters
  purge <url>             Remove all query parameters and the fragment
  resolve <url>           Resolve redirects (network)
  identify <url>          Identify supported platform resources

Global options:
  --json                 Compact JSON
  --jsonl                One JSON value per line
  --timeout <ms>         Total resolution deadline (default: 10000)
  --max-redirects <n>    Maximum redirects (default: 5)
  --quiet                Suppress human-readable diagnostics on stderr
  --help, -h             Show help
  --version, -v          Show version

Operation options:
  --link                 Print only the cleaned URL (clean/purge)
  --remove-param <name>  Additional parameter to remove (repeatable)
  --preserve-param <name> Preserve parameter (repeatable; overrides removal)
  --unsafe-allow-private Allow private/local network destinations explicitly

Examples:
  linkary clean 'https://example.org/?id=7&utm_source=mail' --link
  linkary purge 'https://example.org/page?id=7#section' --link

Exit codes: 0 success; 1 URL/network failure;
            2 usage error; 130 interrupted.
`;

function usage(message) {
  const error = new linkary.LinkaryError('ERR_USAGE', message);
  error.exitCode = 2;
  throw error;
}

function numberOption(value, name) {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) usage(`${name} requires a nonnegative integer.`);
  return Number(value);
}

async function write(value) {
  if (!process.stdout.write(value)) await once(process.stdout, 'drain');
}

async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: {
      json: { type: 'boolean' }, jsonl: { type: 'boolean' }, quiet: { type: 'boolean' },
      link: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
      timeout: { type: 'string' }, 'max-redirects': { type: 'string' },
      'remove-param': { type: 'string', multiple: true }, 'preserve-param': { type: 'string', multiple: true },
      'unsafe-allow-private': { type: 'boolean' },
    } });
  } catch (error) { usage(error.message); }
  const { values, positionals } = parsed;
  if (values.help || !argv.length) { await write(HELP); return; }
  if (values.version) { await write(`${version}\n`); return; }
  if (values.json && values.jsonl) usage('Choose either --json or --jsonl.');
  if (values.link && (values.json || values.jsonl)) usage('Choose either --link, --json or --jsonl.');
  const [command, ...args] = positionals;
  const functions = { inspect: linkary.inspectUrl, normalize: linkary.normalizeUrl, clean: linkary.cleanUrl, purge: linkary.purgeUrl,
    resolve: linkary.resolveUrl, identify: linkary.identifyUrl };
  if (!Object.hasOwn(functions, command)) usage(`Unknown command: ${command || '(missing)'}. Use --help.`);
  if (values.link && !['clean', 'purge'].includes(command)) usage('--link is only supported by clean and purge.');
  for (const flag of ['remove-param', 'preserve-param']) {
    if (values[flag] !== undefined && !['clean', 'inspect'].includes(command)) usage(`--${flag} is not supported by ${command}.`);
  }
  const controller = new AbortController();
  const interrupt = () => { process.exitCode = 130; controller.abort(); };
  process.on('SIGINT', interrupt);
  const options = {
    timeoutMs: numberOption(values.timeout, '--timeout'),
    maxRedirects: numberOption(values['max-redirects'], '--max-redirects'),
    removeParams: values['remove-param'], preserveParams: values['preserve-param'],
    unsafeAllowPrivate: values['unsafe-allow-private'], signal: controller.signal,
  };
  try {
    if (args.length !== 1) usage(`${command} requires one URL argument.`);
    const result = await functions[command](args[0], options);
    if (values.link) {
      await write(`${result.cleanUrl}\n`);
    } else if (values.json || values.jsonl || typeof result !== 'string') {
      await write(`${JSON.stringify(result, null, values.json || values.jsonl ? undefined : 2)}\n`);
    } else await write(`${result}\n`);
  } finally { process.off('SIGINT', interrupt); }
}

process.stdout.on('error', error => {
  if (error.code === 'EPIPE') process.exit(0);
  process.stderr.write(`linkary: ${error.message}\n`);
  process.exit(1);
});

main(process.argv.slice(2)).catch(async error => {
  const argv = process.argv.slice(2);
  if (argv.includes('--json') || argv.includes('--jsonl')) {
    await write(`${JSON.stringify({ error: { code: error.code || 'ERR_INTERNAL', message: error.message } })}\n`);
  }
  if (!argv.includes('--quiet')) process.stderr.write(`linkary: ${error.code || 'ERR_INTERNAL'}: ${error.message}\n`);
  if (process.exitCode !== 130) process.exitCode = error.exitCode || (error.code === 'ERR_INVALID_OPTIONS' ? 2 : 1);
});
