# Linkary 🔗

Linkary is a command-line tool for inspecting, cleaning and comparing web links.
It helps you remove tracking parameters and recognize different links to the same resource.
Most operations work offline, so you can analyze links without contacting websites.

Inspect a link to see its hostname, query parameters and recognized platform information, then clean it before sharing or saving it. Compare two links to check whether they point to the same supported resource. For larger collections, process a text file and export the results as JSON or JSONL.

## What it does

- Inspect HTTP and HTTPS links, including query parameters and known shortlink hosts.
- Remove known tracking parameters while keeping other query values.
- Normalize URL formatting while preserving meaningful path and query differences.
- Recognize supported video, post, profile and repository links across twelve platforms.
- Compare original links, normalized forms, cleaned forms and supported resource identities.
- Follow redirects to find a link's destination and report the redirect chain.
- Process URL lists from a file or standard input, with optional duplicate removal.

See the [supported platform URL patterns](docs/PLATFORMS.md) for recognized links and limitations.

## Install

Linkary requires Node.js 26 or newer. There is currently no published npm package or downloadable GitHub release.

## CLI

Inspect, clean, compare and resolve links, or process a whole URL list from the command line.

```sh
linkary clean 'https://example.org/?id=7&utm_source=newsletter' --json
```

This returns `https://example.org/?id=7` as the cleaned URL and reports the removed tracking parameter.

See the [CLI documentation](docs/CLI.md) for all commands and options.

## Library

Use Linkary in Node.js to inspect, clean and compare URLs in your own scripts and applications. It supports CommonJS and ESM imports, includes TypeScript declarations and has no runtime dependencies.

```js
const { inspectUrl, cleanUrl, compareUrls } = require('linkary');
// ESM: import { inspectUrl, cleanUrl, compareUrls } from 'linkary';

const inspection = inspectUrl('https://youtu.be/abc123?utm_source=newsletter');
console.log(inspection.platform); // 'youtube'

const cleaned = cleanUrl('https://example.org/?id=7&utm_source=newsletter');
console.log(cleaned.cleanUrl); // 'https://example.org/?id=7'

const comparison = compareUrls('https://youtu.be/abc123', 'https://youtube.com/watch?v=abc123');
console.log(comparison.sameResource); // true
```

These operations run synchronously and offline. Use `resolveUrl()` or `inspectMany(urls, { resolve: true })` for asynchronous redirect resolution.

See the [Library API documentation](docs/LIBRARY.md) for all functions, return values and options.

## Clean links before sharing

Remove common tracking parameters such as `utm_*`, `fbclid` and `gclid` without visiting the destination. Choose additional parameters to remove or explicitly preserve values you need; changing signed links can invalidate them.

## Recognize and compare resources

Identify supported links from YouTube, TikTok, Instagram, Facebook, X/Twitter, Threads, Reddit, LinkedIn, Twitch, GitHub, Vimeo and Bluesky. Compare recognized resource identities across URL variants; unsupported patterns remain unknown, and recognition does not confirm that a resource exists or is accessible.

## Follow redirects when needed

Resolve a shortlink or redirecting URL to see its destination and each redirect along the way. Resolution contacts websites and reports inaccessible destinations or redirect loops; private and local network destinations are blocked by default.

See the [network security policy](docs/SECURITY.md) for details and limits.

## Process link collections

Read one URL per line from a text file or standard input and export ordered results as JSON or JSONL. Optionally remove exact duplicate inputs or enable redirect resolution, with failures reported for each affected link.

## Who it is for

- Researchers and journalists reviewing source links and redirect chains.
- Content editors cleaning links before sharing or publishing them.
- Analysts checking collected URL lists for tracking parameters and matching resources.

## Changelog

See the [changelog](docs/CHANGELOG.md) for release notes and changes.

## License

MIT
