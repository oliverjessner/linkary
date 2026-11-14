# Linkary 🔗

Linkary is a command-line tool for inspecting, cleaning and resolving web links.
It helps you remove tracking parameters and identify the platform and resource addressed by a link.
Most operations work offline, so you can analyze links without contacting websites.

Inspect a link to see its hostname, query parameters and recognized platform information, then clean it before sharing or saving it. Resolve a shortlink when you need to see its destination.

## What it does

- Inspect HTTP and HTTPS links, including query parameters and known shortlink hosts.
- Remove known tracking parameters while keeping other query values.
- Purge all query parameters and URL fragments.
- Normalize URL formatting while preserving meaningful path and query differences.
- Recognize supported social, messaging, media, forum and repository links across 38 platforms.
- Follow redirects to find a link's destination and report the redirect chain.

See the [supported platform URL patterns](docs/PLATFORMS.md) for recognized links and limitations.

## Install

Linkary requires Node.js 26 or newer. There is currently no published npm package or downloadable GitHub release.

## CLI

Inspect, clean, purge and resolve a link from the command line.

```sh
linkary clean 'https://example.org/?id=7&utm_source=newsletter' --link
```

This prints only `https://example.org/?id=7`. Use `--json` instead to include the removed tracking parameters.

To remove every query parameter and the fragment:

```sh
linkary purge 'https://example.org/page?id=7&utm_source=newsletter#section' --link
```

This prints `https://example.org/page`.

See the [CLI documentation](docs/CLI.md) for all commands and options.

## Library

Use Linkary in Node.js to inspect, clean, purge and identify a URL in your own scripts and applications. It supports CommonJS and ESM imports, includes TypeScript declarations and has no runtime dependencies.

```js
const { inspectUrl, cleanUrl, purgeUrl, identifyUrl } = require('linkary');
// ESM: import { inspectUrl, cleanUrl, purgeUrl, identifyUrl } from 'linkary';

const inspection = inspectUrl('https://youtu.be/abc123?utm_source=newsletter');
console.log(inspection.platform); // 'youtube'

const cleaned = cleanUrl('https://example.org/?id=7&utm_source=newsletter');
console.log(cleaned.cleanUrl); // 'https://example.org/?id=7'

const purged = purgeUrl('https://example.org/page?id=7#section');
console.log(purged.cleanUrl); // 'https://example.org/page'

const identity = identifyUrl('https://youtu.be/abc123');
console.log(identity.identityKey); // 'youtube:video:abc123'
```

These operations run synchronously and offline. Use `resolveUrl()` for asynchronous redirect resolution.

See the [Library API documentation](docs/LIBRARY.md) for all functions, return values and options.

## Clean links before sharing

Remove common tracking parameters such as `utm_*`, `fbclid` and `gclid` without visiting the destination. Choose additional parameters to remove or explicitly preserve values you need; changing signed links can invalidate them.

Use `purge` to remove all query parameters and the fragment, including functional
values such as resource IDs and navigation anchors.

## Recognize resources

Identify supported links from YouTube, TikTok, Instagram, Facebook, X/Twitter,
Threads, Reddit, LinkedIn, Twitch, GitHub, Vimeo and Bluesky, plus:

- Social networks: Snapchat, Truth Social, Pinterest, Tumblr, Mastodon, VK, Weibo and Odnoklassniki.
- Communities and messaging: 4chan, Discord, Telegram, WhatsApp, Signal, Lemmy, Steam and Hacker News.
- Publishing and media: Medium, Substack, Spotify, SoundCloud, Dailymotion, Rumble, Kick, Flickr, GitLab and Bilibili.

Read platform identifiers from supported URL formats. Recognition does not
confirm that a resource exists or is accessible. Opaque share links need
explicit redirect resolution, and federated services support the documented hosts
and identity limits. See the [platform URL patterns](docs/PLATFORMS.md).

## Follow redirects when needed

Resolve a shortlink or redirecting URL to see its destination and each redirect along the way. Resolution contacts websites and reports inaccessible destinations or redirect loops; private and local network destinations are blocked by default.

See the [network security policy](docs/SECURITY.md) for details and limits.

## Who it is for

- Researchers and journalists reviewing source links and redirect chains.
- Content editors cleaning links before sharing or publishing them.
- Analysts inspecting links for tracking parameters and platform identifiers.

## Changelog

See the [changelog](docs/CHANGELOG.md) for release notes and changes.

## License

MIT
