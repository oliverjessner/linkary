# Supported platform URL patterns

These are offline parsing rules implemented in `src/platforms/`. They are tested with deterministic URL fixtures, not live platform requests. Recognition establishes a supported URL shape, not resource existence, accessibility, canonical ownership or current platform behavior. Unknown paths on a recognized host return that platform with `resourceType: 'unknown'` and null identifiers. Unrecognized hosts and nondefault ports return `platform: null`.

Hosts match exactly after native URL normalization; arbitrary subdomains and lookalike suffixes do not match. Paths are case sensitive. A trailing slash is allowed for the path patterns below except the specific query endpoints `/watch` and `/playlist` on YouTube, and `.php` endpoints on Facebook. Default ports are removed before recognition. Fragments do not change the parent platform resource identity. Extra query keys are ignored for identification; duplicate required ID query keys are considered ambiguous and rejected. Handles/IDs are extracted from supported patterns, never inferred from a query that merely mentions another platform.

Notation: `:id` is an explicit path/query identifier, `:handle` a supported account slug, `:n` digits. Examples use illustrative IDs.

## YouTube (`youtube`)

Hosts: `youtube.com`, `www.youtube.com`, `m.youtube.com`, `music.youtube.com`, `youtu.be`.

| Pattern | Type | Identity key |
| --- | --- | --- |
| `youtu.be/:id` | video | `youtube:video:<id>` |
| `/watch?v=:id` | video | `youtube:video:<id>` |
| `/shorts/:id` | short | `youtube:video:<id>` |
| `/embed/:id`, `/live/:id` | video | `youtube:video:<id>` |
| `/playlist?list=:id` | playlist | `youtube:playlist:<id>` |
| `/channel/UC…` | channel | `youtube:channel:UC…` |
| `/@:handle` | channel | `youtube:handle:<lowercase handle>` |

The short host supports only its single-ID path. Video/playlist tokens accept 1–128 ASCII letters, digits, `_` or `-`; a channel ID requires `UC` plus 22 such characters. Handle syntax is ASCII letters, digits, `.`, `_`, `-`. `profileHandle` is available for handle channels, with `resourceId: null`. A video query takes precedence over a playlist query on `/watch`.

`https://youtu.be/abc123`, `https://youtube.com/watch?v=abc123` and `https://youtube.com/shorts/abc123` all yield `identityKey: 'youtube:video:abc123'`. Legacy `/user/`, `/c/`, channel tabs, embeds containing a playlist path, encoded/Unicode handles and watch-comment identities are not implemented.

## TikTok (`tiktok`)

Hosts: `tiktok.com`, `www.tiktok.com`, `m.tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/@:handle` | profile | Null ID; `tiktok:handle:<lowercase handle>` |
| `/@:handle/video/:n` | video | `:n`; `tiktok:video:<n>` |
| `/@:handle/photo/:n` | post | `:n`; `tiktok:photo:<n>` |

Handles accept ASCII letters, digits, `.` and `_`. Video/photo URLs also expose the handle. For example, `/@alice/video/123` yields `resourceId: '123'`. `vm.tiktok.com`/`vt.tiktok.com` are detected shortlinks with unknown resource IDs until explicitly resolved. `/share/`, live streams, music/sounds and other short/share structures are not parsed.

## Instagram (`instagram`)

Hosts: `instagram.com`, `www.instagram.com`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/:handle` | profile | Null ID; `instagram:handle:<lowercase handle>` |
| `/p/:shortcode` | post | Shortcode; `instagram:media:<shortcode>` |
| `/reel/:shortcode` | reel | Same media namespace |
| `/tv/:shortcode` | video | Same media namespace |

Shortcodes are case sensitive ASCII letters/digits/`_`/`-`; `/p/AbC_12/` yields `instagram:media:AbC_12`. Handles accept 1–30 ASCII letters/digits/`.`/`_`, excluding known reserved routes. The public shortcode is returned directly; it is not converted to a numeric media ID. Stories, `/share/`, direct messages, explore routes and numeric shortcode conversion are unsupported.

## Facebook (`facebook`)

Hosts: `facebook.com`, `www.facebook.com`, `m.facebook.com`, `mbasic.facebook.com`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/profile.php?id=:n`, `/:n` | profile | Numeric ID; `facebook:profile:<n>` |
| `/:handle` | profile | Null ID; `facebook:handle:<lowercase handle>` |
| `/watch?v=:n`, `/watch/?v=:n` | video | Numeric ID; `facebook:video:<n>` |
| `/reel/:n`, `/:handle/videos/:n` | reel / video | Numeric ID; same video namespace |
| `/:ownerNumber/posts/:postNumber` | post | Composite `owner/post`; `facebook:post:owner/post` |
| `/permalink.php?story_fbid=:postNumber&id=:ownerNumber` | post | Same owner/post composite |
| `/story.php?story_fbid=:postNumber&id=:ownerNumber` | post | Same owner/post composite |
| `/groups/:groupNumber/posts/:postNumber` | post | Composite `group/post`; `facebook:group-post:group/post` |

Vanity handles accept ASCII letters/digits/`.` and exclude known reserved routes/file endpoints. For example, `/123/posts/456` and `/permalink.php?story_fbid=456&id=123` both identify `facebook:post:123/456`. Numeric IDs and vanity handles are distinct namespaces and are not resolved to one account offline. Opaque `pfbid…` posts, vanity-author post paths, `/share/`, photo identities, pages/people paths and `fb.watch` resource identification are unsupported.

## X / Twitter (`x`)

Hosts: `x.com`, `www.x.com`, `twitter.com`, `www.twitter.com`, `mobile.twitter.com`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/:handle` | profile | Null ID; `x:handle:<lowercase handle>` |
| `/:handle/status/:n` | post | Numeric ID; `x:post:<n>` |
| `/:handle/status/:n/photo/:n`, `…/video/:n` | post | Parent post's ID/key |
| `/i/web/status/:n` | post | Numeric ID; `x:post:<n>` |

Handles accept 1–15 ASCII letters/digits/`_`, excluding reserved routes. Post handles are reported when present, but the numeric post ID determines identity. `twitter.com/alice/status/123` and `x.com/alice/status/123` match. Search, intents, spaces, lists, individual media IDs and other `/i/` routes are unsupported.

## Threads (`threads`)

Hosts: `threads.net`, `www.threads.net`, `threads.com`, `www.threads.com`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/@:handle` | profile | Null ID; `threads:handle:<lowercase handle>` |
| `/@:handle/post/:id` | post | Public token; `threads:post:<id>` |

Handles accept ASCII letters/digits/`.`/`_`; post tokens accept letters/digits/`_`/`-`. Both post and profile routes expose the handle. For example, `/@alice/post/AbC1` yields `threads:post:AbC1`. Other share/redirect structures are unsupported.

## Reddit (`reddit`)

Hosts: `reddit.com`, `www.reddit.com`, `old.reddit.com`, `new.reddit.com`, `np.reddit.com`, `m.reddit.com`, `redd.it`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `redd.it/:postId` | post | Lowercase base36 ID; `reddit:post:<postId>` |
| `/comments/:postId`, `/r/:sub/comments/:postId` | post | Same post ID/key |
| Either comments pattern plus `/:title` | post | Same post ID/key |
| Either comments pattern plus `/:title/:commentId` | comment | Lowercase base36 comment ID; `reddit:comment:<commentId>` |
| `/u/:handle`, `/user/:handle` | profile | Null ID; `reddit:handle:<lowercase handle>` |
| `/r/:sub` | channel | Null ID; `reddit:subreddit:<lowercase sub>` |

`/r/node/comments/abc/title/def/` identifies comment `def`. Handles accept ASCII letters/digits/`_`/`-`; subreddit names accept letters/digits/`_`. Short host detection never guesses a comment from the short ID. Search/wiki routes, `/s/` shares, galleries and other unlisted patterns are unsupported.

## LinkedIn (`linkedin`)

Hosts: `linkedin.com`, `www.linkedin.com`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/in/:handle` | profile | Null ID; `linkedin:handle:<lowercase handle>` |
| `/company/:slug` | channel | Lowercase slug; `linkedin:company:<slug>` |
| `/feed/update/urn:li:activity::n` | post | Activity number; `linkedin:post:<n>` |
| `/posts/:slug-activity-:n-:suffix` | post | Same activity number/key |

Slugs/handles/suffixes accept ASCII letters/digits/`_`/`-`. Example: `/feed/update/urn:li:activity:123/` yields `linkedin:post:123`. Localized subdomains, jobs, pulse/articles, opaque posts without activity numbers and `lnkd.in` resource identification are unsupported.

## Twitch (`twitch`)

Hosts: `twitch.tv`, `www.twitch.tv`, `m.twitch.tv`, `clips.twitch.tv`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/:handle` | channel | Null ID; `twitch:handle:<lowercase handle>` |
| `/videos/:n` | video | VOD number; `twitch:video:<n>` |
| `/:handle/clip/:clipId` | video | Clip token; `twitch:clip:<clipId>` |
| `clips.twitch.tv/:clipId` | video | Same clip token/key |

Handles accept ASCII letters/digits/`_` and exclude reserved routes. Clip IDs accept letters/digits/`_`/`-` and are case sensitive; `/alice/clip/AbC1` and `clips.twitch.tv/AbC1` match. Clip/VOD IDs use separate namespaces. Embedded clip query URLs and channel tabs are unsupported.

## GitHub (`github`)

Hosts: `github.com`, `www.github.com`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/:owner` | profile | Null ID; `github:handle:<lowercase owner>` |
| `/:owner/:repo` | repository | Lowercase `owner/repo`; `github:repository:owner/repo` |
| `/:owner/:repo/issues/:n` | post | Lowercase composite `owner/repo/issues/n`; `github:issues:owner/repo/issues/n` |
| `/:owner/:repo/pull/:n` | post | Lowercase composite `owner/repo/pull/n`; `github:pull:owner/repo/pull/n` |

Owner syntax is ASCII letters/digits/`-`, with known reserved site routes excluded; repository syntax also allows `_`/`.`. For example, `/OliverJessner/linkary` yields `resourceId: 'oliverjessner/linkary'`. Clone URLs ending in `.git`, renamed repositories, GitHub Enterprise hosts, branch/file/tree URLs, releases, commit identities and issue-comment fragment IDs are unsupported.

## Vimeo (`vimeo`)

Hosts: `vimeo.com`, `www.vimeo.com`, `player.vimeo.com`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/:n` | video | Numeric ID; `vimeo:video:<n>` |
| `/channels/:slug/:n` | video | Same video ID/key |
| `/groups/:slug/videos/:n` | video | Same video ID/key |
| `player.vimeo.com/video/:n` | video | Same video ID/key |

Slugs accept ASCII letters/digits/`_`/`-`. `vimeo.com/123` and `player.vimeo.com/video/123` match. Unlisted hash paths, management URLs, profiles and showcases are unsupported.

## Bluesky (`bluesky`)

Hosts: `bsky.app`, `www.bsky.app`.

| Pattern | Type | ID / key |
| --- | --- | --- |
| `/profile/:handle` | profile | Null ID; `bluesky:handle:<lowercase handle>` |
| `/profile/did:plc::did` | profile | Full DID; `bluesky:did:<full DID>` |
| `/profile/:handle/post/:recordKey` | post | Record key; **null identity key** |
| `/profile/did:plc::did/post/:recordKey` | post | Record key; `bluesky:post:<full DID>/<recordKey>` |

Handle syntax is ASCII dot-separated labels of letters/digits/`-`. Supported PLC suffixes are exactly 24 lowercase base32 characters (`a–z`, `2–7`); record keys are alphanumeric. Handle URLs expose `profileHandle`; DID URLs do not invent a handle. Example: `/profile/alice.bsky.social/post/3abc` returns `resourceId: '3abc'`, `profileHandle: 'alice.bsky.social'`, `identityKey: null`. The record key alone is not globally unique. `did:web`, handle-to-DID resolution, custom app hosts and feed/list identities are unsupported.

## Identity limits

Tokens and composites above are returned from URL syntax only. Handle-based keys represent the addressed handle namespace; handles may change or be reassigned, and keys do not establish permanent ownership. Different handles on different platforms never imply one person. Unknown routes never receive a synthesized resource ID. To analyze a shortlink's destination, explicitly call `resolveUrl()` and then `identifyUrl(result.finalUrl)`.
