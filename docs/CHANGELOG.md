# Changelog

## 0.1.0 — 2026-10-17

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
