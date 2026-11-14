# CLI reference

Requires Node.js >=26. Run `node cli/index.js` from a checkout, or `linkary` after installing a package. Quote URLs so the shell does not interpret `&`, `?` or fragments.

## Commands

| Command | Result | Networking |
| --- | --- | --- |
| `inspect <url>` | Flat inspection object | No |
| `normalize <url>` | Normalized URL string | No |
| `clean <url>` | Clean URL plus removal report | No |
| `purge <url>` | URL without any query parameters or fragment, plus removal report | No |
| `identify <url>` | Platform identity object | No |
| `resolve <url>` | Destination, redirect hops and final status | Yes |

```sh
linkary inspect 'https://youtu.be/abc123?utm_source=mail' --json
linkary clean 'https://example.org/?id=7&campaign_id=9&utm_source=mail' \
  --remove-param campaign_id --preserve-param id --json
linkary clean 'https://example.org/?id=7&utm_source=mail' --link
linkary purge 'https://example.org/page?id=7&utm_source=mail#section' --link
linkary identify 'https://github.com/oliverjessner/linkary'
linkary resolve 'https://example.org/' --timeout 5000 --max-redirects 3 --json
linkary resolve 'https://example.org/' --user-agent 'MyLinkTool/1.0' --json
```

The example IDs illustrate parsing, not resource existence.

## Options

| Flag | Meaning |
| --- | --- |
| `--json` | Compact JSON |
| `--jsonl` | One compact JSON value followed by a newline |
| `--link` | Print only the cleaned URL with a trailing newline; clean/purge only |
| `--timeout <ms>` | Total network deadline, integer 1–2147483647; default 10000 |
| `--max-redirects <n>` | Redirect limit, integer 0–100; default 5 |
| `--user-agent <value>` | Override the User-Agent; resolve only; nonblank printable ASCII, maximum 1024 characters |
| `--quiet` | Suppress human-readable stderr errors; retain results and exit status |
| `--help`, `-h` | Help, including after a command |
| `--version`, `-v` | Package version |
| `--remove-param <name>` | Additional exact key to remove; repeatable; clean/inspect only |
| `--preserve-param <name>` | Exact key to retain, overriding all removal; repeatable; same commands |
| `--unsafe-allow-private` | Explicitly permit private/local network destinations |

`--link`, `--json` and `--jsonl` are mutually exclusive. Numeric network options are effective only for network operations. Key matching is case insensitive. The only configurable request header is `--user-agent`; control characters, line breaks and non-ASCII characters are rejected. There is no CLI option to supply arbitrary request headers or a fetch implementation. Cache TTL and custom shortlink domains are library options.

Default structured output is pretty JSON. `normalize` prints a plain URL by default, and a JSON string with `--json`/`--jsonl`. All results go to stdout; human-readable diagnostics go to stderr. A failure with a machine format emits `{"error":{"code":"ERR_INVALID_URL","message":"..."}}` on stdout. No progress output or summary is mixed into machine output.

`clean --link` and `purge --link` print the cleaned URL without JSON quotes or
the removal report. On failure they leave stdout empty, report the error on
stderr (unless `--quiet`) and exit nonzero. `clean` also supports
`--remove-param` and `--preserve-param`.

`purge` removes the entire query string and fragment, including empty `?` and
`#` delimiters. It removes every parameter, including IDs and other functional
values. The scheme, host, port and path follow the same URL normalization as
`clean`. Without `--link`, the report contains `originalUrl`, `cleanUrl`,
`removedParameters` and `removedFragment`. `--remove-param` and `--preserve-param`
are not supported by `purge`.

## Redirect resolution

Each destination is tried with HEAD first. HTTP 403, 405 or 501 triggers a GET
with `Range: bytes=0-0`; if that GET returns 403 or 416, Linkary retries with a
plain GET. There are at most three requests per hop, all within the same total
`--timeout`. Responses are closed after their headers, without buffering bodies.

The default User-Agent is `Linkary/<version> (+https://github.com/oliverjessner/linkary)`.
Setting a different identifier can affect a server's response but does not
execute JavaScript, supply login cookies or solve access challenges. A final
HTTP 403 remains an error. Terminal HTTP-status errors name the failing hostname
and the number of completed redirects, so the failure can be located in the chain
without exposing the full URL in that diagnostic.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | URL/network failure |
| 2 | Invalid command/options or missing arguments |
| 130 | SIGINT interruption |

SIGINT cancels network work. Local offline parsing is synchronous. A downstream closed pipe (`EPIPE`) exits successfully.
