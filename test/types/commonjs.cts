import linkary = require('linkary');
const inspection: linkary.UrlInspectionResult = linkary.inspectUrl('https://example.org');
const clean: linkary.UrlCleanResult = linkary.cleanUrl(inspection.originalUrl, { preserveParams: ['v'] });
const purged: linkary.UrlPurgeResult = linkary.purgeUrl('https://example.org/?id=7#section');
const purgedFragment: string | null = purged.removedFragment;
const identity: linkary.UrlIdentity = linkary.identifyUrl(clean.cleanUrl);
const resolution: Promise<linkary.UrlResolutionResult> = linkary.resolveUrl(clean.cleanUrl, { signal: new AbortController().signal });
const normalized: string = linkary.normalizeUrl(clean.cleanUrl, { stripFragment: true });
const valid: boolean = linkary.isValidUrl(null);
const short: boolean = linkary.isShortUrl(normalized, { shortlinkDomains: ['go.example.org'] });
const hostname: string = linkary.extractHostname(normalized);
const params: [string, string][] = linkary.extractQueryParams(normalized);
const error = new linkary.LinkaryError('ERR_INVALID_URL', 'bad', { cause: identity });
const serialized: linkary.SerializedLinkaryError = error.toJSON();
// @ts-expect-error normalization is synchronous
const wrongPromise: Promise<string> = linkary.normalizeUrl(normalized);
// @ts-expect-error cleanUrl returns a result, not a string
const wrongClean: string = linkary.cleanUrl(normalized);
// @ts-expect-error options use a boolean
linkary.resolveUrl(normalized, { unsafeAllowPrivate: 'yes' });
