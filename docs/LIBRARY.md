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
| `purgeUrl(url)` | `UrlPurgeResult` | None; always removes the entire query and fragment |
| `identifyUrl(url, options?)` | `UrlIdentity` | Empty reserved options object |
| `resolveUrl(url, options?)` | `Promise<UrlResolutionResult>` | Network options below |
| `isValidUrl(value)` | `boolean` | None; never throws for invalid input |
| `isShortUrl(url, options?)` | `boolean` | `shortlinkDomains: string[]` |
| `extractHostname(url)` | `string` | None |
| `extractQueryParams(url)` | `[string, string][]` | None |

`resolveUrl` returns a promise; the other operations run synchronously. Options must be objects when supplied. Shared option fields are validated; unknown option names are ignored and confer no functionality.

`stripFragment` defaults to false for normalization, cleaning and inspection. Explicitly setting it to true can change application routing/identity. `removeParams` and `preserveParams` are arrays of nonempty exact key names matched case insensitively. Preserve rules win over custom/default removal. `shortlinkDomains` adds exact hostnames without schemes, ports or paths, including internationalized names converted by URL parsing. The built-in shortlink registry is in `src/utils/shortlinks.js`.

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

## Purging

```js
const { purgeUrl } = require('linkary');
purgeUrl('https://example.org/page?id=7&utm_source=mail#section');
// { originalUrl: 'https://example.org/page?id=7&utm_source=mail#section',
//   cleanUrl: 'https://example.org/page',
//   removedParameters: ['id', 'utm_source'], removedFragment: 'section' }
```

`purgeUrl` synchronously removes the entire query string and fragment, including
empty `?` and `#` delimiters. It removes functional parameters as well as tracking
parameters. Scheme, host, port and path use the same WHATWG normalization as
`cleanUrl`. The usual HTTP(S) URL validation applies, and no network request is made.

`removedParameters` lists decoded names in occurrence order, including duplicates.
`removedFragment` is the encoded fragment without `#`, or `null` when absent or
empty. The function has no removal or preservation options.

## Identification

```js
identifyUrl('https://youtube.com/shorts/abc123');
// { platform: 'youtube', resourceType: 'short', resourceId: 'abc123',
//   profileHandle: null, identityKey: 'youtube:video:abc123' }
```

`profileHandle` omits `@` and is `null` when unavailable; a subreddit uses its name. `resourceId` is the identifier literally available from a supported URL structure, or a documented composite. It is not an invented numeric ID for a handle. `identityKey` is deterministic within a supported namespace and can be `null` even when a local resource ID is present, such as a Bluesky post addressed through a handle. See [platform patterns](PLATFORMS.md).

Identity namespaces describe the identifier's scope. A handle does not supply a numeric account ID, and a local federated identifier does not supply a global actor ID. Host similarity and identical handle spelling do not establish ownership across platforms. Fragment-sensitive identities follow the documented platform rules.

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

This result is illustrative; no live request is implied. Each hop is `{ from, to, status }`. Only 301/302/303/307/308 are followed. Relative Location headers resolve against the current URL. A missing redirect fragment inherits the current fragment; an explicit fragment replaces it. Fragments are never sent over HTTP, and loop detection ignores them.

Each hop starts with HEAD. HTTP 403, 405 or 501 triggers a GET with
`Range: bytes=0-0`. If that ranged GET returns 403 or 416, a final GET is made
without Range. These are at most three requests per hop and share the same total
deadline across the redirect chain. Each attempt validates DNS and pins a fresh
validated address. Every response is closed at its headers, including plain GET
responses and servers that ignore Range; no response body is buffered. Other
failure statuses, including unsupported 3xx codes and a final HTTP 403, reject.

| Option | Default | Contract |
| --- | --- | --- |
| `timeoutMs` | 10000 | Total deadline across DNS, hops and fallback; integer 1–2147483647 |
| `maxRedirects` | 5 | Integer 0–100; zero allows a direct success but no redirect |
| `signal` | None | AbortSignal; aborted calls reject |
| `unsafeAllowPrivate` | false | Explicitly allow private/local targets; all other validation remains |
| `cacheTtlMs` | 45000 | Integer 0–2147483647; zero disables cache and in-flight request sharing |
| `userAgent` | Versioned Linkary identifier | Nonblank string of printable ASCII characters, maximum 1024 characters |

The default request headers are `User-Agent: Linkary/<version> (+https://github.com/oliverjessner/linkary)`,
`Accept: */*` and `Accept-Encoding: identity`. Only User-Agent can be overridden:

```js
await resolveUrl('https://example.org/', { userAgent: 'MyLinkTool/1.0' });
```

The value is trimmed and must not be empty. Control characters, line breaks and
non-ASCII characters are rejected with `ERR_INVALID_OPTIONS`. General header
maps, authentication, cookies, proxies, custom fetch implementations and
caller-defined retry options are unsupported. TLS certificate/hostname checks
remain enabled. Resolution does not run a browser, execute JavaScript, follow
HTML meta-refresh or solve access challenges. See [security](SECURITY.md).

Successful results are cached for the TTL from completion. Keys include normalized input, fragment, timeout, redirect limit, network policy, effective User-Agent and TTL. Results are cloned, so mutation cannot poison subsequent calls. At most 256 results of at most 65536 JSON characters each and 128 in-flight entries are retained; keys above 16384 characters bypass caching. Expiry is lazy using a monotonic clock. Errors are never cached. Compatible simultaneous calls without signals share in-flight work. Calls with a signal keep independent lifetimes while still allowing successful-result cache hits. A cache hit performs no network or DNS request. No persistent storage or cache-maintenance timers are used.

## Errors and types

Local functions throw `LinkaryError` synchronously; `resolveUrl` rejects with it. `isValidUrl` returns false instead. Each error has `name`, `code`, `message`, optional native `cause`, and `toJSON()` (which omits causes and URLs to avoid exposing credentials). Types are in `src/index.d.ts`, including result objects, nullable fields and resolver options.

Terminal HTTP-status error messages include the failing hostname and completed
redirect count, distinguishing an initial-host failure from a later hop. They
omit the full URL, including its path, query and fragment.

| Code | Meaning |
| --- | --- |
| `ERR_INVALID_URL` | Malformed/nonabsolute URL or whitespace/control characters |
| `ERR_UNSUPPORTED_SCHEME` | Scheme outside HTTP(S) |
| `ERR_CREDENTIALS` | Embedded username/password |
| `ERR_INVALID_OPTIONS` | Invalid option type/range |
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
