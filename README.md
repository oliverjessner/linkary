# Linkary

**Understand every link.**

Linkary is a lightweight URL intelligence toolkit for Node.js 26 and newer. It inspects, normalizes, cleans, identifies, compares and resolves HTTP(S) URLs through the same library functions used by its CLI. Local analysis is synchronous and offline; redirect resolution uses native Node networking with SSRF protection. Linkary has zero runtime dependencies and no database, persistent cache, browser, API keys or background service.

## CLI

```sh
linkary inspect 'https://youtu.be/abc123?utm_source=newsletter' --json
linkary clean 'https://example.org/?id=7&utm_source=email&fbclid=123'
linkary normalize 'HTTP://Example.org:80/a/../Article/'
linkary identify 'https://www.youtube.com/shorts/abc123' --json
linkary compare 'https://youtu.be/abc123' 'https://youtube.com/watch?v=abc123'
linkary resolve 'https://t.co/example' --timeout 10000 --max-redirects 5
linkary batch urls.txt --json
cat urls.txt | linkary batch --stdin --jsonl
```

The example resource IDs illustrate parsing; they do not assert that a resource exists. `resolve` makes network requests and may fail for inaccessible or nonexistent links. Every other single-URL command is offline. Batch resolution requires `--resolve`.

Cleaning the second example returns:

```json
{
  "originalUrl": "https://example.org/?id=7&utm_source=email&fbclid=123",
  "cleanUrl": "https://example.org/?id=7",
  "removedParameters": ["utm_source", "fbclid"]
}
```

## Installation

Prerequisite: **Node.js >=26**. This repository prepares version **0.1.0** for npm; it does not publish it automatically. The npm registry returned `E404` for `linkary` on 2026-10-17. Availability must be checked again before publication; an absent package is not a name reservation.

Use the checkout now:

```sh
git clone https://github.com/oliverjessner/linkary.git
cd linkary
node cli/index.js --help
npm ci                       # development tools only
npm run publish:check
npm pack                     # create linkary-0.1.0.tgz locally
npm install -g ./linkary-0.1.0.tgz
```

Once published, install the library with `npm install linkary` or the CLI with `npm install -g linkary`. TypeScript consumers need the Node.js types (`@types/node`) in their development environment. No build step is required.

## Library

```js
const {
  inspectUrl, normalizeUrl, cleanUrl, identifyUrl,
  compareUrls, resolveUrl, inspectMany, isShortUrl,
} = require('linkary');

const url = 'https://youtu.be/abc123?utm_source=mail';
const inspection = inspectUrl(url);             // synchronous, no network
const cleaned = cleanUrl(url).cleanUrl;          // cleanUrl returns an object
const identity = identifyUrl(cleaned);
// { platform: 'youtube', resourceType: 'video', resourceId: 'abc123',
//   profileHandle: null, identityKey: 'youtube:video:abc123' }

const comparison = compareUrls(cleaned, 'https://youtube.com/shorts/abc123');
// comparison.sameResource === true

const batch = inspectMany([url, 'https://example.org/']); // synchronous array
// Explicit network work returns a Promise:
// const destination = await resolveUrl('https://t.co/a-real-link');
// const resolved = await inspectMany(urls, { resolve: true, concurrency: 5 });
```

CommonJS, ESM named imports and ESM default imports are supported:

```js
import { inspectUrl, cleanUrl } from 'linkary';
console.log(inspectUrl('https://example.org/'));
```

## Behavior

- **Inspection:** returns flat URL parts, decoded query entries including duplicates, known tracking keys, shortlink detection and platform/resource information. Unknown IDs and platforms use `null`.
- **Normalization:** WHATWG parsing lowercases hosts, converts internationalized hosts, removes default ports and resolves dot segments. It preserves path case, trailing slashes, fragments, query order and query encoding. It does not upgrade HTTP, remove `www` or decode escapes speculatively.
- **Cleaning:** removes `utm_*`, `fbclid`, `gclid`, `dclid`, `gbraid`, `wbraid`, `msclkid`, `ttclid`, `mc_cid`, `mc_eid`, `igsh` and `igshid`, case insensitively. Unknown keys, including `ref` and `source`, survive. Custom `removeParams` and overriding `preserveParams` are supported. Removing any signed parameter can invalidate a signature: preserve it explicitly or use normalization alone.
- **Shortlinks:** exact known hostnames, including `bit.ly`, `t.co`, `tinyurl.com`, `youtu.be`, `vm.tiktok.com` and `vt.tiktok.com`. Extra hosts use `shortlinkDomains`. Detection never resolves a link.
- **Identification:** adapters for YouTube, TikTok, Instagram, Facebook, X/Twitter, Threads, Reddit, LinkedIn, Twitch, GitHub, Vimeo and Bluesky. Only the [documented patterns](docs/PLATFORMS.md) are implemented.
- **Comparison:** exact, normalized, cleaned and supported platform identity checks. `sameResource` is `null` when evidence is insufficient. An identity key identifies a URL resource within its namespace, not a person or permanent account ownership.
- **Resolution:** 301/302/303/307/308 redirects, relative locations, loops, deadlines, cancellation and HEAD-to-bounded-GET fallback. Failed resolutions reject instead of returning a supposed destination.
- **Batch:** ordered per-item results, optional exact-string deduplication, JSON/JSONL, file/stdin input. Network batches default to five workers with one active request per hostname, including redirect hops.
- **Cache:** successful resolutions only, in process, default TTL 45 seconds. At most 256 results and 128 tracked in-flight entries. `cacheTtlMs: 0` bypasses cache and deduplication. No cache files or eviction timers.

## Security and limits

Private, loopback, link-local, metadata and special-use network destinations are blocked by default. Each redirect target is validated, all DNS answers must pass, and a validated IP is pinned to the connection while retaining the original hostname for HTTP and TLS. Embedded credentials are rejected. Requests accept no custom headers, cookies, proxies or fetch implementations. Local development can explicitly opt in with `unsafeAllowPrivate: true` or `--unsafe-allow-private`.

URL recognition is based on deterministic fixtures, not live platform compatibility tests. It cannot prove resource existence, resolve account renames, map Bluesky handles to DIDs, identify unsupported share-link structures or infer that two accounts belong to one person. There is no Public Suffix List or guessed registrable domain. Query ordering and trailing slash differences remain meaningful. HEAD fallback is limited to HTTP 405/501; access restrictions and HTTP errors are reported without bypass attempts. See [Security](docs/SECURITY.md) for the exact network policy and deployment limits.

Linkary owns URL intelligence. Content extraction belongs to Fetchary; media collection/transcription belongs to PineFetch; dataset normalization can belong to Normary. Pass `cleanUrl(url).cleanUrl` or a resolved `finalUrl` to another tool yourself. None is a dependency of Linkary.

## Development and documentation

```sh
npm ci
npm test
npm run test:coverage
npm run test:types
npm run publish:check          # tests, types, npm pack --dry-run; never publishes
```

Tests use `node:test`, local HTTP fixtures and controlled networking mocks. They require no external internet access after development dependencies are installed.

- [CLI reference](docs/CLI.md)
- [Library API and result contracts](docs/LIBRARY.md)
- [Supported platform patterns](docs/PLATFORMS.md)
- [Network security policy](docs/SECURITY.md)
- [Changelog](docs/CHANGELOG.md)

MIT licensed. See [LICENSE](LICENSE).
