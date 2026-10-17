/// <reference types="node" />

/** Conservative WHATWG normalization. Query bytes and path case are retained. */
export interface UrlNormalizationOptions {
  /** Explicitly discard the fragment. Default: false. */
  stripFragment?: boolean;
}

export interface UrlCleaningOptions extends UrlNormalizationOptions {
  /** Case-insensitive exact names, in addition to the built-in tracking rules. */
  removeParams?: string[];
  /** Case-insensitive exact names. Takes precedence over every removal rule. */
  preserveParams?: string[];
}

export interface ShortlinkOptions {
  /** Extra exact hostnames, without schemes, ports or paths. */
  shortlinkDomains?: string[];
}

export interface UrlInspectionOptions extends UrlCleaningOptions, ShortlinkOptions {}

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x' | 'threads'
  | 'reddit' | 'linkedin' | 'twitch' | 'github' | 'vimeo' | 'bluesky';
export type ResourceType = 'profile' | 'channel' | 'video' | 'post' | 'reel' | 'short'
  | 'playlist' | 'repository' | 'comment' | 'unknown';

export interface UrlInspectionResult {
  originalUrl: string;
  normalizedUrl: string;
  cleanUrl: string;
  protocol: 'http:' | 'https:';
  hostname: string;
  /** Null when no nondefault port exists. */
  port: string | null;
  pathname: string;
  /** Decoded entries in input order, including duplicate keys. */
  query: [string, string][];
  /** Encoded fragment without '#', or null when absent/empty. */
  fragment: string | null;
  isHttps: boolean;
  isShortUrl: boolean;
  /** Known tracking names, retaining original case and repeated occurrences. */
  trackingParameters: string[];
  /** Null for an unrecognized hostname or nondefault platform port. */
  platform: Platform | null;
  resourceType: ResourceType;
  /** Null when the supported URL pattern contains no reliable resource ID. */
  resourceId: string | null;
}

export interface UrlCleanResult {
  originalUrl: string;
  cleanUrl: string;
  /** Decoded removed names in occurrence order, including duplicates. */
  removedParameters: string[];
}

export interface UrlIdentity {
  platform: Platform | null;
  resourceType: ResourceType;
  resourceId: string | null;
  /** Handle without '@', or null when unavailable. Subreddits use their name. */
  profileHandle: string | null;
  /** Deterministic within a supported namespace; null when not determinable offline. */
  identityKey: string | null;
}

export interface UrlComparisonResult {
  exactMatch: boolean;
  normalizedMatch: boolean;
  cleanMatch: boolean;
  /** Null when neither equality nor comparable known identities establish an answer. */
  sameResource: boolean | null;
  identityKeyA: string | null;
  identityKeyB: string | null;
  reason: 'exact' | 'normalized' | 'clean' | 'platform-identity' | 'different-platform-resources' | 'unknown';
}

export interface UrlResolutionOptions {
  /** Total deadline across DNS, redirects and HEAD/GET fallback. Default: 10000. */
  timeoutMs?: number;
  /** Integer 0–100. Default: 5. */
  maxRedirects?: number;
  signal?: AbortSignal;
  /** Explicitly allow local/private IP addresses. Default: false. Credentials remain blocked. */
  unsafeAllowPrivate?: boolean;
  /** Process-local successful-result TTL. Default: 45000. Zero disables caching and deduplication. */
  cacheTtlMs?: number;
}

export interface RedirectHop {
  from: string;
  to: string;
  status: 301 | 302 | 303 | 307 | 308;
}

export interface UrlResolutionResult {
  originalUrl: string;
  finalUrl: string;
  redirectCount: number;
  redirects: RedirectHop[];
  /** Final HTTP success status (2xx). Failures reject. */
  status: number;
}

export interface BatchInspectionOptions extends UrlInspectionOptions, UrlResolutionOptions {
  /** Default: false. Offline batches return synchronously. */
  resolve?: boolean;
  /** Exact input-string deduplication, retaining first occurrence and original index. */
  deduplicate?: boolean;
  /** Network workers, integer 1–100. Default: 5. One concurrent request per hostname per batch. */
  concurrency?: number;
}

export interface SerializedLinkaryError {
  name: 'LinkaryError';
  code: string;
  message: string;
}

export type BatchInspectionResult = {
  index: number;
  input: string;
  ok: true;
  inspection: UrlInspectionResult;
  /** Null for offline inspection. */
  resolution: UrlResolutionResult | null;
  error: null;
} | {
  index: number;
  input: string;
  ok: false;
  inspection: null;
  resolution: null;
  error: SerializedLinkaryError;
};

export class LinkaryError extends Error {
  constructor(code: string, message: string, options?: ErrorOptions);
  name: 'LinkaryError';
  code: string;
  toJSON(): SerializedLinkaryError;
}

export function inspectUrl(url: string, options?: UrlInspectionOptions): UrlInspectionResult;
export function normalizeUrl(url: string, options?: UrlNormalizationOptions): string;
export function cleanUrl(url: string, options?: UrlCleaningOptions): UrlCleanResult;
export function resolveUrl(url: string, options?: UrlResolutionOptions): Promise<UrlResolutionResult>;
export function identifyUrl(url: string, options?: Record<string, never>): UrlIdentity;
export function compareUrls(urlA: string, urlB: string, options?: UrlCleaningOptions): UrlComparisonResult;
export function inspectMany(urls: string[], options: BatchInspectionOptions & { resolve: true }): Promise<BatchInspectionResult[]>;
export function inspectMany(urls: string[], options?: BatchInspectionOptions & { resolve?: false }): BatchInspectionResult[];
export function inspectMany(urls: string[], options: BatchInspectionOptions): BatchInspectionResult[] | Promise<BatchInspectionResult[]>;
export function isValidUrl(url: unknown): boolean;
export function isShortUrl(url: string, options?: ShortlinkOptions): boolean;
export function extractHostname(url: string): string;
export function extractQueryParams(url: string): [string, string][];
