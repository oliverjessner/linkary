import linkary, { inspectUrl, inspectMany, purgeUrl, type UrlPurgeResult, type BatchInspectionOptions, type RedirectHop } from 'linkary';
const options: BatchInspectionOptions = { resolve: Math.random() > 0.5 };
const results = await inspectMany(['https://example.org'], options);
const hostname: string = inspectUrl('https://example.org').hostname;
const normalized: string = linkary.normalizeUrl('https://example.org');
const purged: UrlPurgeResult = purgeUrl('https://example.org/?id=7#section');
const purgedUrl: string = purged.cleanUrl;
const hop: RedirectHop = { from: normalized, to: hostname, status: 302 };
// @ts-expect-error status must be a supported redirect status
const wrongHop: RedirectHop = { ...hop, status: 200 };
