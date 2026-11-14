# Changelog

## 0.2.0

- Expand offline platform recognition from 12 to 38 services, including 4chan,
  Snapchat, Truth Social, Pinterest, Discord, Tumblr and Telegram, with documented
  URL patterns, scoped identities and conservative handling of opaque share links.
- Add `purge` and `purgeUrl()` to remove every query parameter and fragment,
  with plain URL output via `purge --link`.
- Add `clean --link` to print only the cleaned URL without JSON or a removal report.
- Add a shared `npm run publish` workflow for npm and the neighboring Homebrew tap,
  with release checks, a dry run, archive checksum verification and scoped formula
  commits and pushes. See [Publishing Linkary](PUBLISH.md).

## 0.1.0

Initial implementation, prepared for publication.

- CommonJS library with native ESM import compatibility, TypeScript declarations and Node.js >=26.
- Synchronous offline URL inspection, conservative normalization and byte-preserving tracking cleanup.
- Exact-host shortlink detection with custom domains.
- Twelve platform adapters and deterministic resource identity comparisons.
- Native HTTP(S) redirect resolution with pinned validated DNS, private/metadata address blocking, per-hop checks, deadlines, cancellation and bounded HEAD-to-GET fallback.
- Ordered batch processing with per-item errors, exact-string deduplication, bounded workers and per-host request serialization.
- CLI commands with JSON/JSONL, file/stdin input and documented exit codes.
- Optional bounded process-local successful-resolution cache and compatible in-flight deduplication.
- Deterministic node:test fixtures, TypeScript checks and npm package validation.

No runtime dependencies, persistent storage, page extraction or browser automation. No npm publication or git tags are performed by validation scripts.
