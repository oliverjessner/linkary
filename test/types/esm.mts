import linkary, { inspectUrl, resolveUrl, purgeUrl, type UrlPurgeResult, type UrlResolutionOptions, type UrlResolutionResult, type RedirectHop } from 'linkary';
const options: UrlResolutionOptions = { timeoutMs: 5000, maxRedirects: 3, userAgent: 'Linkary esm/1.0' };
const userAgent: string | undefined = options.userAgent;
const resolution: Promise<UrlResolutionResult> = resolveUrl('https://example.org', options);
const hostname: string = inspectUrl('https://example.org').hostname;
const normalized: string = linkary.normalizeUrl('https://example.org');
const purged: UrlPurgeResult = purgeUrl('https://example.org/?id=7#section');
const purgedUrl: string = purged.cleanUrl;
const hop: RedirectHop = { from: normalized, to: hostname, status: 302 };
// @ts-expect-error status must be a supported redirect status
const wrongHop: RedirectHop = { ...hop, status: 200 };
