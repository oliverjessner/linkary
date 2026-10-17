import linkary, { inspectUrl, inspectMany, type BatchInspectionOptions, type RedirectHop } from 'linkary';
const options: BatchInspectionOptions = { resolve: Math.random() > 0.5 };
const results = await inspectMany(['https://example.org'], options);
const hostname: string = inspectUrl('https://example.org').hostname;
const normalized: string = linkary.normalizeUrl('https://example.org');
const hop: RedirectHop = { from: normalized, to: hostname, status: 302 };
// @ts-expect-error status must be a supported redirect status
const wrongHop: RedirectHop = { ...hop, status: 200 };
