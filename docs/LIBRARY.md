# Library API

CommonJS is the implementation format, with native Node ESM named/default imports. All URL inputs are strings. Absolute HTTP(S) URLs are required; whitespace/control characters, embedded credentials and unsupported schemes are rejected. IP literals are valid offline inputs even when network policy would block them.

```js
const { inspectUrl, cleanUrl, identifyUrl, resolveUrl } = require('linkary');
// Equivalent: import { inspectUrl, cleanUrl } from 'linkary';
```

## Return values and options

| Function | Return | Options |
| --- | --- | --- |
| `inspectUrl(url, options?)` | `UrlInspectionResult` | Cleaning, normalization, shortlinks |
| `normalizeUrl(url, options?)` | `string` | `stripFragment` |
| `cleanUrl(url, options?)` | `UrlCleanResult` | `stripFragment`, `removeParams`, `preserveParams` |
| `identifyUrl(url, options?)` | `UrlIdentity` | Empty reserved options object |
| `compareUrls(a, b, options?)` | `UrlComparisonResult` | Cleaning and normalization |
| `resolveUrl(url, options?)` | `Promise<UrlResolutionResult>` | Network options below |
| `inspectMany(urls, options?)` | `BatchInspectionResult[]` | Offline by default |
| `inspectMany(urls, { resolve: true, ... })` | `Promise<BatchInspectionResult[]>` | Network and batch options |
| `isValidUrl(value)` | `boolean` | None; never throws for invalid input |
| `isShortUrl(url, options?)` | `boolean` | `shortlinkDomains: string[]` |
| `extractHostname(url)` | `string` | None |
| `extractQueryParams(url)` | `[string, string][]` | None |

Only network operations return promises. `await inspectMany(urls)` also works for an offline array, but is unnecessary. Options must be objects when supplied. Shared option fields are validated; unknown option names are ignored and confer no functionality.

`stripFragment` defaults to false. Explicitly setting it to true can change application routing/identity. `removeParams` and `preserveParams` are arrays of nonempty exact key names matched case insensitively. Preserve rules win over custom/default removal. `shortlinkDomains` adds exact hostnames without schemes, ports or paths, including internationalized names converted by URL parsing. The built-in shortlink registry is in `src/utils/shortlinks.js`.

No operation upgrades HTTP, removes `www`, sorts query parameters, guesses an eTLD+1, resolves accounts or proves resource existence. Normalization retains escape spelling and does not decode unreserved characters speculatively; WHATWG parsing itself still resolves percent-encoded dot segments. Query keys and values are decoded only in inspection output, not rewritten in surviving query segments.

## Inspection

```js
inspectUrl('https://youtu.be/abc123?utm_source=mail#t=4');
```

```json
{
  "originalUrl": "https://youtu.be/abc123?utm_source=mail#t=4",
  "normalizedUrl": "https://youtu.be/abc123?utm_source=mail#t=4",
  "cleanUrl": "https://youtu.be/abc123#t=4",
  "protocol": "https:",
  "hostname": "youtu.be",
  "port": null,
  "pathname": "/abc123",
  "query": [["utm_source", "mail"]],
  "fragment": "t=4",
  "isHttps": true,
  "isShortUrl": true,
  "trackingParameters": ["utm_source"],
  "platform": "youtube",
  "resourceType": "video",
  "resourceId": "abc123"
}
```

`protocol` includes `:`. `hostname` includes brackets around IPv6 literals. `port` is a nondefault port string or `null`. `fragment` is encoded text without `#`, or `null` for absent/empty fragments. `query` retains duplicate entries and order, with URLSearchParams decoding (`+` becomes a space). `trackingParameters` reports built-in tracking matches, independent of custom removal/preservation. Unknown platform/ID values are `null`; unknown resource type is `'unknown'`. The original string is retained exactly.

## Cleaning

```js
cleanUrl('https://example.org/?v=abc&campaign_id=7&utm_source=mail', {
  removeParams: ['campaign_id'],
  preserveParams: ['v'],
});
// { originalUrl: '...', cleanUrl: 'https://example.org/?v=abc',
//   removedParameters: ['campaign_id', 'utm_source'] }
```

The default keys are `utm_*`, `fbclid`, `gclid`, `dclid`, `gbraid`, `wbraid`, `msclkid`, `ttclid`, `mc_cid`, `mc_eid`, `igsh`, `igshid`. Names in `removedParameters` are decoded and retain original case/occurrence order; repeated removed keys appear repeatedly. All surviving segments retain their original encoding, duplicates and order. Unknown parameters, `id`, `v`, `list`, `page`, `q`, `search`, `lang`, `ref` and `source` survive unless explicitly removed. A tracking key can itself be covered by a signature: cleaning can invalidate that signature. Use preservation rules or normalization only for such URLs.

## Identification and comparison

```js
identifyUrl('https://youtube.com/shorts/abc123');
// { platform: 'youtube', resourceType: 'short', resourceId: 'abc123',
//   profileHandle: null, identityKey: 'youtube:video:abc123' }
```

`profileHandle` omits `@` and is `null` when unavailable; a subreddit uses its name. `resourceId` is the identifier literally available from a supported URL structure, or a documented composite. It is not an invented numeric ID for a handle. `identityKey` is deterministic within a supported namespace and can be `null` even when a local resource ID is present, such as a Bluesky post addressed through a handle. See [platform patterns](PLATFORMS.md).

```js
compareUrls('https://youtu.be/abc123', 'https://youtube.com/watch?v=abc123');
// { exactMatch: false, normalizedMatch: false, cleanMatch: false,
//   sameResource: true, identityKeyA: 'youtube:video:abc123',
//   identityKeyB: 'youtube:video:abc123', reason: 'platform-identity' }
```

All three equality flags are computed independently. `exactMatch` uses strict input-string equality. `reason` selects the first established level: `exact`, `normalized`, `clean`, `platform-identity`, `different-platform-resources`, or `unknown`.

Identical exact/normalized/cleaned URLs imply `sameResource: true` under the caller's chosen cleaning rules. Matching known identity keys also imply true. Different known keys in the same comparable namespace, or on different platforms, imply false. Different namespaces on one platform can be aliases and produce `null` (for example, a YouTube handle and channel ID). Unidentified different URLs also produce `null`. Host similarity, matching handles on different platforms, and matching Bluesky record keys across actors never establish one shared resource or person. Platform identity comparisons concern the identified parent resource; fragment navigation does not introduce a separate platform ID.

## Resolution

```js
const controller = new AbortController();
const result = await resolveUrl('https://example.org/', {
  timeoutMs: 10000,
  maxRedirects: 5,
  signal: controller.signal,
  cacheTtlMs: 45000,
});
// { originalUrl: 'https://example.org/', finalUrl: 'https://example.org/',
//   redirectCount: 0, redirects: [], status: 200 }
```

This result is illustrative; no live request is implied. Each hop is `{ from, to, status }`. Only 301/302/303/307/308 are followed. Relative Location headers resolve against the current URL. A missing redirect fragment inherits the current fragment; an explicit fragment replaces it. Fragments are never sent over HTTP, and loop detection ignores them. HEAD is attempted per hop; 405/501 trigger a GET with `Range: bytes=0-0`, and the response is closed at headers even if the range is ignored. Other failure statuses, including 3xx codes outside the supported set, reject.

| Option | Default | Contract |
| --- | --- | --- |
| `timeoutMs` | 10000 | Total deadline across DNS, hops, fallback and batch host waits; integer 1–2147483647 |
| `maxRedirects` | 5 | Integer 0–100; zero allows a direct success but no redirect |
| `signal` | None | AbortSignal; aborted calls reject |
| `unsafeAllowPrivate` | false | Explicitly allow private/local targets; all other validation remains |
| `cacheTtlMs` | 45000 | Integer 0–2147483647; zero disables cache and in-flight deduplication |

There are no custom request headers, authentication, cookies, proxies, custom fetch implementations or retry options. TLS certificate/hostname checks remain enabled. See [security](SECURITY.md).

Successful results are cached for the TTL from completion. Keys include normalized input, fragment, timeout, redirect limit, network policy and TTL. Results are cloned, so mutation cannot poison subsequent calls. At most 256 results of at most 65536 JSON characters each and 128 in-flight entries are retained; keys above 16384 characters bypass caching. Expiry is lazy using a monotonic clock. Errors are never cached. Compatible concurrent calls without signals share in-flight work. Calls with a signal and batch calls use independent lifetimes/scheduling, while still allowing successful-result cache hits. A cache hit performs no network or DNS request. No persistent storage or cache-maintenance timers are used.

## Batch

```js
const results = inspectMany(['https://example.org/', 'invalid'], { deduplicate: true });
// [{ index: 0, input: 'https://example.org/', ok: true,
//    inspection: { ... }, resolution: null, error: null },
//  { index: 1, input: 'invalid', ok: false, inspection: null,
//    resolution: null, error: { name: 'LinkaryError', code: 'ERR_INVALID_URL', message: '...' } }]

const resolved = await inspectMany(['https://example.org/'], {
  resolve: true, concurrency: 5, signal: new AbortController().signal,
});
```

Input must be a dense array of strings. Invalid URL strings produce individual errors; invalid shared options or nonstring input throw before execution, including on a network-enabled batch. Deduplication is exact string equality and retains first input indices. `concurrency` is 1–100, defaults to 5, and bounds complete resolutions. Each batch additionally serializes individual request hops per hostname, including redirect targets. This is an in-call bound, not a global rate limiter across separate batches/callers. Pending work reports `ERR_ABORTED` after cancellation. Each failed item has `inspection: null` and `resolution: null`, including a URL whose inspection succeeded but resolution failed. Output order is independent of completion order. No network call occurs without `resolve: true`.

## Errors and types

Single-URL local functions throw `LinkaryError` synchronously; `resolveUrl` rejects with it. `isValidUrl` returns false instead. Each error has `name`, `code`, `message`, optional native `cause`, and `toJSON()` (which omits causes and URLs to avoid exposing credentials). Types are in `src/index.d.ts`, including discriminated batch results, nullable fields and offline/network overloads.

| Code | Meaning |
| --- | --- |
| `ERR_INVALID_URL` | Malformed/nonabsolute URL or whitespace/control characters |
| `ERR_UNSUPPORTED_SCHEME` | Scheme outside HTTP(S) |
| `ERR_CREDENTIALS` | Embedded username/password |
| `ERR_INVALID_OPTIONS` | Invalid option type/range |
| `ERR_INVALID_INPUT` | Batch input is not a dense string array |
| `ERR_UNSAFE_ADDRESS` | Forbidden hostname/address, invalid or mixed DNS answers |
| `ERR_DNS` | Hostname lookup failed |
| `ERR_NETWORK` | Connection/TLS/header parsing failure |
| `ERR_TIMEOUT` | Total resolution deadline expired |
| `ERR_ABORTED` | Caller canceled the operation |
| `ERR_REDIRECT_LOOP` | A request URL is revisited |
| `ERR_MAX_REDIRECTS` | Redirect count would exceed the limit |
| `ERR_REDIRECT_LOCATION` | Missing or malformed redirect location |
| `ERR_HTTP_STATUS` | Non-2xx terminal status or protocol upgrade |

## Composition

```js
const { cleanUrl, identifyUrl } = require('linkary');
// Fetchary is an optional consumer installed separately:
// const { extractSocialInsights } = require('fetchary');

const url = 'https://example.org/?utm_source=mail';
const identity = identifyUrl(url);
const normalized = cleanUrl(url).cleanUrl;
// const insights = await extractSocialInsights(normalized);
```

Linkary does not extract HTML, selectors, favicons, images, engagement or media. It does not crawl, schedule, archive or persist data.
