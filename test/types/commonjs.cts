import linkary = require('linkary');
const inspection: linkary.UrlInspectionResult = linkary.inspectUrl('https://example.org');
const synchronous: linkary.BatchInspectionResult[] = linkary.inspectMany([inspection.originalUrl]);
const asynchronous: Promise<linkary.BatchInspectionResult[]> = linkary.inspectMany([], { resolve: true });
const clean: linkary.UrlCleanResult = linkary.cleanUrl(inspection.originalUrl, { preserveParams: ['v'] });
const identity: linkary.UrlIdentity = linkary.identifyUrl(clean.cleanUrl);
const comparison: linkary.UrlComparisonResult = linkary.compareUrls(clean.cleanUrl, inspection.originalUrl);
const resolution: Promise<linkary.UrlResolutionResult> = linkary.resolveUrl(clean.cleanUrl, { signal: new AbortController().signal });
const normalized: string = linkary.normalizeUrl(clean.cleanUrl, { stripFragment: true });
const valid: boolean = linkary.isValidUrl(null);
const short: boolean = linkary.isShortUrl(normalized, { shortlinkDomains: ['go.example.org'] });
const hostname: string = linkary.extractHostname(normalized);
const params: [string, string][] = linkary.extractQueryParams(normalized);
const error = new linkary.LinkaryError('ERR_INVALID_URL', 'bad', { cause: identity });
const serialized: linkary.SerializedLinkaryError = error.toJSON();
for (const result of synchronous) {
  if (result.ok) { const value: string = result.inspection.hostname; }
  else { const value: string = result.error.code; }
}
// @ts-expect-error normalization is synchronous
const wrongPromise: Promise<string> = linkary.normalizeUrl(normalized);
// @ts-expect-error cleanUrl returns a result, not a string
const wrongClean: string = linkary.cleanUrl(normalized);
// @ts-expect-error network batches return a promise
const wrongBatch: linkary.BatchInspectionResult[] = linkary.inspectMany([], { resolve: true });
// @ts-expect-error options use a boolean
linkary.resolveUrl(normalized, { unsafeAllowPrivate: 'yes' });
