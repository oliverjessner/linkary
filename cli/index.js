#!/usr/bin/env node
'use strict';
const { parseArgs } = require('node:util');
const { readFile } = require('node:fs/promises');
const { once } = require('node:events');
const linkary = require('../src/index.js');
const { version } = require('../package.json');

const HELP = `Linkary ${version} — Understand every link.

Usage: linkary <command> [arguments] [options]

  inspect <url>           Inspect offline
  normalize <url>         Normalize conservatively
  clean <url>             Remove known tracking parameters
  resolve <url>           Resolve redirects (network)
  identify <url>          Identify supported platform resources
  compare <urlA> <urlB>   Compare URL identity offline
  batch [file]           Inspect one URL per line

Global options:
  --json                 Compact JSON (a JSON array for batch)
  --jsonl                One JSON value per line
  --timeout <ms>         Total resolution deadline (default: 10000)
  --max-redirects <n>    Maximum redirects (default: 5)
  --quiet                Suppress human-readable diagnostics on stderr
  --help, -h             Show help
  --version, -v          Show version

Operation options:
  --remove-param <name>  Additional parameter to remove (repeatable)
  --preserve-param <name> Preserve parameter (repeatable; overrides removal)
  --resolve              Enable network resolution for batch
  --concurrency <n>      Batch network concurrency (default: 5; max: 100)
  --deduplicate          Omit exact duplicate batch inputs
  --stdin                Read batch URLs from stdin instead of a file
  --unsafe-allow-private Allow private/local network destinations explicitly

Examples:
  linkary clean 'https://example.org/?id=7&utm_source=mail' --json
  linkary compare 'https://youtu.be/abc123' 'https://youtube.com/watch?v=abc123'
  cat urls.txt | linkary batch --stdin --jsonl

Exit codes: 0 success; 1 URL/network failure or failed batch items;
            2 usage/input-file error; 130 interrupted.
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

async function readStdin(signal) {
  const abort = () => process.stdin.destroy(new linkary.LinkaryError('ERR_ABORTED', 'Operation aborted.'));
  signal.addEventListener('abort', abort, { once: true });
  try {
    if (signal.aborted) abort();
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
  } finally { signal.removeEventListener('abort', abort); }
}

async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: {
      json: { type: 'boolean' }, jsonl: { type: 'boolean' }, quiet: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
      timeout: { type: 'string' }, 'max-redirects': { type: 'string' },
      'remove-param': { type: 'string', multiple: true }, 'preserve-param': { type: 'string', multiple: true },
      resolve: { type: 'boolean' }, concurrency: { type: 'string' }, deduplicate: { type: 'boolean' },
      stdin: { type: 'boolean' }, 'unsafe-allow-private': { type: 'boolean' },
    } });
  } catch (error) { usage(error.message); }
  const { values, positionals } = parsed;
  if (values.help || !argv.length) { await write(HELP); return; }
  if (values.version) { await write(`${version}\n`); return; }
  if (values.json && values.jsonl) usage('Choose either --json or --jsonl.');
  const [command, ...args] = positionals;
  const functions = { inspect: linkary.inspectUrl, normalize: linkary.normalizeUrl, clean: linkary.cleanUrl,
    resolve: linkary.resolveUrl, identify: linkary.identifyUrl, compare: linkary.compareUrls, batch: linkary.inspectMany };
  if (!Object.hasOwn(functions, command)) usage(`Unknown command: ${command || '(missing)'}. Use --help.`);
  for (const flag of ['resolve', 'concurrency', 'deduplicate', 'stdin']) {
    if (values[flag] !== undefined && command !== 'batch') usage(`--${flag} is only supported by batch.`);
  }
  for (const flag of ['remove-param', 'preserve-param']) {
    if (values[flag] !== undefined && !['clean', 'inspect', 'compare', 'batch'].includes(command)) usage(`--${flag} is not supported by ${command}.`);
  }
  const controller = new AbortController();
  const interrupt = () => { process.exitCode = 130; controller.abort(); };
  process.on('SIGINT', interrupt);
  const options = {
    timeoutMs: numberOption(values.timeout, '--timeout'),
    maxRedirects: numberOption(values['max-redirects'], '--max-redirects'),
    removeParams: values['remove-param'], preserveParams: values['preserve-param'],
    unsafeAllowPrivate: values['unsafe-allow-private'], concurrency: numberOption(values.concurrency, '--concurrency'),
    resolve: values.resolve, deduplicate: values.deduplicate, signal: controller.signal,
  };
  try {
    let result;
    if (command === 'batch') {
      if (values.stdin && args.length || !values.stdin && args.length !== 1) usage('Use batch <file> or batch --stdin.');
      let content;
      try { content = values.stdin ? await readStdin(controller.signal)
        : await readFile(args[0], { encoding: 'utf8', signal: controller.signal }); }
      catch (cause) {
        if (controller.signal.aborted) throw new linkary.LinkaryError('ERR_ABORTED', 'Operation aborted.');
        else {
          const error = new linkary.LinkaryError('ERR_INPUT', 'Cannot read batch input.', { cause });
          error.exitCode = 2;
          throw error;
        }
      }
      const urls = content.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      result = await linkary.inspectMany(urls, options);
      if (result.some(item => !item.ok) && process.exitCode !== 130) process.exitCode = 1;
    } else {
      const count = command === 'compare' ? 2 : 1;
      if (args.length !== count) usage(`${command} requires ${count} URL argument${count > 1 ? 's' : ''}.`);
      result = await functions[command](...args, options);
    }
    if (values.jsonl && Array.isArray(result)) {
      for (const item of result) await write(`${JSON.stringify(item)}\n`);
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
