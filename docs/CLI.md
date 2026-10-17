# CLI reference

Requires Node.js >=26. Run `node cli/index.js` from a checkout, or `linkary` after installing a package. Quote URLs so the shell does not interpret `&`, `?` or fragments.

## Commands

| Command | Result | Networking |
| --- | --- | --- |
| `inspect <url>` | Flat inspection object | No |
| `normalize <url>` | Normalized URL string | No |
| `clean <url>` | Clean URL plus removal report | No |
| `identify <url>` | Platform identity object | No |
| `compare <urlA> <urlB>` | Equality levels and resource comparison | No |
| `resolve <url>` | Destination, redirect hops and final status | Yes |
| `batch <file>` | Ordered per-item inspection results | Only with `--resolve` |
| `batch --stdin` | Same, reading standard input | Only with `--resolve` |

```sh
linkary inspect 'https://youtu.be/abc123?utm_source=mail' --json
linkary clean 'https://example.org/?id=7&campaign_id=9&utm_source=mail' \
  --remove-param campaign_id --preserve-param id --json
linkary identify 'https://github.com/oliverjessner/linkary'
linkary compare 'https://twitter.com/alice/status/123' 'https://x.com/alice/status/123'
linkary resolve 'https://example.org/' --timeout 5000 --max-redirects 3 --json
linkary batch urls.txt --jsonl --deduplicate
cat urls.txt | linkary batch --stdin --resolve --concurrency 3 --jsonl
```

The example IDs illustrate parsing, not resource existence.

## Options

| Flag | Meaning |
| --- | --- |
| `--json` | Compact JSON; batches are one JSON array |
| `--jsonl` | One compact JSON value per line; batches emit one per item |
| `--timeout <ms>` | Total network deadline per URL, integer 1–2147483647; default 10000 |
| `--max-redirects <n>` | Redirect limit, integer 0–100; default 5 |
| `--quiet` | Suppress human-readable stderr errors; retain results and exit status |
| `--help`, `-h` | Help, including after a command |
| `--version`, `-v` | Package version |
| `--remove-param <name>` | Additional exact key to remove; repeatable; clean/inspect/compare/batch |
| `--preserve-param <name>` | Exact key to retain, overriding all removal; repeatable; same commands |
| `--resolve` | Enable network work for batch |
| `--concurrency <n>` | Batch network workers, integer 1–100; default 5 |
| `--deduplicate` | Batch exact-string deduplication, retaining the first occurrence |
| `--stdin` | Batch reads stdin; cannot also provide a file |
| `--unsafe-allow-private` | Explicitly permit private/local network destinations |

`--json` and `--jsonl` are mutually exclusive. Numeric network options are effective only for network operations. Key matching is case insensitive. There is no CLI option to supply request headers or a fetch implementation. Cache TTL and custom shortlink domains are library options.

Default structured output is pretty JSON. `normalize` prints a plain URL by default, and a JSON string with `--json`/`--jsonl`. All results go to stdout; human-readable diagnostics go to stderr. A single-operation failure with a machine format emits `{"error":{"code":"ERR_INVALID_URL","message":"..."}}` on stdout. Batch URL failures remain inside the corresponding item; no progress output or summary is mixed into machine output.

## Batch input and output

TXT input contains one URL per line. Blank lines are ignored; a leading BOM and surrounding line whitespace are removed. Comments are not a supported input syntax. The full file/input is read into memory, results are collected before emission, and output order matches the parsed input. JSONL describes the output format, not a streaming-input or streaming-execution API.

```sh
printf '%s\n' 'https://example.org/' 'invalid' | linkary batch --stdin --jsonl
```

The first line is a success item with `inspection`, `resolution: null` and `error: null`. The second is:

```json
{"index":1,"input":"invalid","ok":false,"inspection":null,"resolution":null,"error":{"name":"LinkaryError","code":"ERR_INVALID_URL","message":"Invalid absolute URL."}}
```

Deduplication compares input strings after CLI line trimming; it does not merge platform aliases or different normalized URLs. `index` retains the first occurrence's original zero-based input position. `--resolve` inspects the original URL and adds its resolution separately; it does not replace the inspection with a destination inspection. A batch uses up to five network workers by default and at most one active request per target hostname, across ports and redirects. Each resolution's timeout includes any wait for that hostname.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success, including an empty batch |
| 1 | URL/network failure, or at least one failed batch item |
| 2 | Invalid command/options, missing arguments, unreadable input file |
| 130 | SIGINT interruption |

SIGINT cancels network work and stdin reading. A network batch reports cancellation in each unfinished item. Local offline parsing is synchronous. A downstream closed pipe (`EPIPE`) exits successfully.
