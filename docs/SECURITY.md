# Network security policy

Offline functions never perform network requests. The policy below applies to `resolveUrl` and explicitly network-enabled batches. Linkary follows redirects only; it does not fetch page content, scrape engagement, bypass authentication/CAPTCHAs or rotate proxies.

## Default destination policy

Only absolute `http:` and `https:` URLs are accepted. Embedded username/password credentials, whitespace/control characters and invalid URLs are rejected. This validation also applies to every redirect. Loop detection uses the request URL without its fragment. All redirect counts, deadlines and option ranges are bounded.

The resolver rejects known local/internal/metadata names before lookup: `localhost`, its subdomains, `.local`, `.internal`, and single-label non-IP names. A terminal hostname dot is removed for this check. DNS uses native `dns.promises.lookup({ all: true, verbatim: true })`. Every returned IP and its reported address family must be valid. A single forbidden answer rejects the entire destination, including mixed public/private DNS answers.

The address policy is intentionally conservative:

- IPv4 blocks `0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16`, `172.16/12`, `192.0.0/24`, `192.0.2/24`, `192.88.99/24`, `192.168/16`, `198.18/15`, `198.51.100/24`, `203.0.113/24`, `224/4` and `240/4`.
- Azure's platform virtual address `168.63.129.16` is also blocked. Common metadata targets, including `169.254.169.254`, Alibaba's `100.100.100.200`, IPv6 link-local and unique-local targets, fall within blocked ranges.
- IPv6 permits only ordinary global unicast in `2000::/3`, excluding `2001::/23`, `2001:db8::/32`, `2002::/16` and `3fff::/20`. Zone-qualified addresses are rejected. IPv4-mapped, translated, NAT64, 6to4, Teredo, multicast, loopback, link-local and unique-local addresses are therefore blocked, even when an embedded IPv4 address is public.

This policy uses selected ranges from the [IANA IPv4](https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml) and [IPv6](https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml) special-purpose registries and explicitly excludes [Azure's platform virtual IP](https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16). Some globally reachable exceptions within broader reserved ranges are intentionally blocked. It is a maintained policy, not an automatically refreshed IANA registry or a Public Suffix List.

## DNS rebinding and connections

After validation, one returned address is pinned into the actual HTTP(S) socket's `lookup` callback. Connection-time DNS cannot select a later unvalidated/private address. IP-literal URLs are checked directly. A fresh nonshared agent (`agent: false`) and disabled address-family auto-selection prevent reuse of a different destination. The native connection retains the URL hostname for Host, TLS server name and certificate verification. No caller-supplied agents, fetch implementations or proxy settings are accepted; global HTTP agents and their environment-proxy configuration are not used.

Every request hop and the HEAD-to-GET fallback receives a new check. If the first validated address fails, the operation fails instead of silently retrying another address. Native DNS lookup itself may finish after cancellation; the raced operation has already rejected and will not create a connection from that late answer. An explicit AbortSignal and the total deadline cover DNS, requests, redirects, fallback and batch host waits.

Only headers are needed. HEAD is the default; HTTP 405 or 501 permits a GET with `Range: bytes=0-0` and `Accept-Encoding: identity`. Linkary closes the response and request at headers even when the server ignores Range or never ends its body. It buffers no response body and limits response headers to 16 KiB; bytes already received in a socket buffer cannot be prevented. Header-only checking cannot discover JavaScript, HTML meta-refresh or body-dependent redirects. Other HTTP errors, missing locations, unsupported redirects and protocol upgrades are explicit failures.

No custom authorization headers, cookies or other caller headers are accepted. They therefore cannot leak across origins. TLS trust and hostname validation remain native defaults. URLs containing credentials are rejected even with unsafe networking enabled.

## Controlled local development

```js
await resolveUrl('http://127.0.0.1:8080/', {
  unsafeAllowPrivate: true,
  cacheTtlMs: 0,
});
```

```sh
linkary resolve 'http://127.0.0.1:8080/' --unsafe-allow-private
```

This is an explicit opt-in that allows internal, metadata and private addresses as well as local fixtures. Keep the default for untrusted inputs. Scheme/credential restrictions, redirect limits, TLS verification, deadlines and connection pinning still apply.

## Cache and concurrency

The process-local cache retains only successful compatible resolutions. Unsafe results cannot satisfy safe calls; timeout, maximum redirects and TTL are also part of the key. No failed, invalid or aborted request is cached. A cache hit reports the previously validated successful result without making a connection; it is not a current availability check. Set `cacheTtlMs: 0` to require fresh resolution and DNS checks.

The cache holds at most 256 results, each capped at 65536 serialized characters, and at most 128 tracked in-flight entries with bounded key size. It uses lazy expiry, cloned results and no maintenance timers or persistent files. Signals have independent request lifetimes; aborting one caller cannot cancel an unrelated shared request. A batch bounds complete network resolutions and serializes hops to each target hostname. Separate calls/batches have independent concurrency limits; applications remain responsible for global admission control/rate limiting.

## Deployment limits

Application-level validation cannot infer arbitrary VPN routes, firewall/NAT mappings, reverse proxies, public-address services exposed by a private network or later server-side behavior. Use network egress controls as an additional boundary when exposing resolution to untrusted users. Keep runtime code and system DNS/TLS configuration trusted. Linkary provides no Public Suffix List, account authentication, content scanning, resource-existence proof or crawler.

Security tests exercise local HTTP servers and controlled DNS/transport mocks, including mixed answers, pinning, private redirect targets, aborts and timeouts. These deterministic checks do not constitute an independent security audit or live platform certification.
