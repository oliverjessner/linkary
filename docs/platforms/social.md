# Additional social platform URL patterns

These are explicit offline parser rules. A recognized URL shape does not prove
that an account or post exists. All numeric IDs remain strings. Unknown routes
on a registered host retain the platform with null identifiers. URL query values
and fragments do not supply identities for these adapters.

## Snapchat (`snapchat`)

Hosts: `snapchat.com`, `www.snapchat.com`.

| Pattern | Type | ID / identity key |
| --- | --- | --- |
| `/add/:username` | profile | Null ID; `snapchat:handle:<lowercase username>` |

The username is 3–15 ASCII characters, starts with a letter, ends with a letter
or digit, and otherwise accepts letters, digits, `.`, `_` and `-`. `/p/` profiles,
Stories, Spotlight and share tokens remain unknown; no internal numeric account
ID is invented from a username.

Sources: [Snap's public-profile linking guide](https://developers.snap.com/api/snapchat-for-web/social-plugins/how-to-backlink-for-developers)
documents `/add/` links, while [Snapchat's username requirements](https://help.snapchat.com/hc/en-gb/articles/7012349845140-How-do-I-change-my-Snapchat-username)
describe the supported character and length constraints.

## Truth Social (`truthsocial`)

Hosts: `truthsocial.com`, `www.truthsocial.com`.

| Pattern | Type | ID / identity key |
| --- | --- | --- |
| `/@:handle` | profile | Null ID; `truthsocial:handle:<lowercase handle>` |
| `/@:handle/posts/:n` | post | Explicit post ID; `truthsocial:post:<n>` |

The parser's handle subset is 1–30 ASCII letters, digits or underscores. Post
URLs also return the literal handle. A handle does not reveal a numeric account
ID. Bare `/@:handle/:n`, federation API paths, search and other routes are not
implemented.

Sources: the [official Truth Social account](https://truthsocial.com/@truthsocial)
uses the handle profile route. [Trump Media's SEC-filed communication](https://www.sec.gov/Archives/edgar/data/1849635/000114036125046244/ef20061694_425.htm)
contains its own `/@truthsocial/posts/<number>` permalinks.

## Pinterest (`pinterest`)

Hosts: `pinterest.com`, `www.pinterest.com`, `pinterest.de`, `www.pinterest.de`,
`at.pinterest.com`, `ch.pinterest.com`, `pin.it`.

| Pattern | Type | ID / identity key |
| --- | --- | --- |
| `/pin/:n` | post | Explicit Pin ID; `pinterest:pin:<n>` |
| `/:handle` | profile | Null ID; `pinterest:handle:<lowercase handle>` |

The handle subset is 1–30 ASCII letters, digits or underscores, excluding
reserved routes such as `search`, `ideas`, `pin`, `login` and `settings`. Board,
section and creation routes remain unknown. `pin.it` always has unknown resource
identity until explicitly resolved. Country domains and subdomains outside the
listed hosts are not inferred.

Sources: [Pinterest's widget documentation](https://developers.pinterest.com/docs/web-features/widgets/)
provides Pin, profile and board URL examples; [its account-identification guidance](https://help.pinterest.com/en/article/law-enforcement-guidelines)
distinguishes usernames from display names. [Pinterest's imprint](https://policy.pinterest.com/en/impressum)
identifies the German, Austrian and Swiss domains included here.

## Tumblr (`tumblr`)

Hosts: `tumblr.com`, `www.tumblr.com` and one validated blog label immediately
before `.tumblr.com`. Blog labels contain 1–32 ASCII letters/digits/hyphens,
beginning and ending with a letter or digit. Service labels including `api`,
`assets`, `static`, `help`, `support`, `developers`, `secure`, `embed`, `media`,
`login`, `oauth`, `status`, `schema` and `www2` are excluded from hosted blogs.
Nested subdomains and custom blog domains are not recognized.

| Pattern | Type | ID / identity key |
| --- | --- | --- |
| `/:blog`, `/@:blog` on the central hosts | profile | Null ID; `tumblr:handle:<lowercase blog>` |
| `:blog.tumblr.com/` | profile | Same blog-handle identity |
| `/:blog/:n` with an optional single slug on central hosts | post | Explicit post ID; `tumblr:post@<lowercase blog>:<n>` |
| `:blog.tumblr.com/post/:n` with an optional single slug | post | Same post-ID identity |

Both post forms include `profileHandle`. Central route names such as `settings`,
`dashboard`, `search`, `tagged` and `blog` are reserved. Hosted archive, tag,
ask, submit and custom-page paths remain unknown. Post namespaces retain the
blog instead of asserting unverified cross-blog equivalence. A blog handle is
not converted to Tumblr's separate persistent blog UUID.

Sources: [Tumblr's own API documentation](https://raw.githubusercontent.com/tumblr/docs/master/api.md)
describes blog names, hosted domains, separate UUIDs and legacy post permalinks.
The [blog-view guide](https://help.tumblr.com/knowledge-base/blog-view/) describes
central and hosted profiles, and [the search guide](https://help.tumblr.com/knowledge-base/search-and-filtering-basics/)
shows how numeric post IDs appear in modern permalinks.

## Mastodon (`mastodon`)

Only these explicit instances are recognized: `mastodon.social`,
`mastodon.online`, `fosstodon.org`. Neither an arbitrary domain nor a path that
resembles Mastodon is treated as proof of an instance.

| Pattern | Type | ID / identity key |
| --- | --- | --- |
| `/@:username`, `/users/:username` | profile | Null ID; `mastodon:handle@<instance>:<lowercase username>` |
| `/@:username/:n`, `/users/:username/statuses/:n` | post | Explicit local status ID; `mastodon:post@<instance>:<n>` |

The username subset is 1–30 ASCII letters, digits or underscores; status IDs in
this parser are positive digit strings. Handles do not reveal a global account
ID. Keys include the instance in their namespace so equal-looking local IDs on
different instances cannot collide. Cross-instance mirrors and remote
`/@user@domain` paths are not aliased offline. Search, API and timeline routes
remain unknown.

Sources: [Mastodon's WebFinger example](https://docs.joinmastodon.org/spec/webfinger/)
shows the two local profile URIs. Its [Status entity documentation](https://docs.joinmastodon.org/entities/Status/)
shows local web/federation post URIs and distinguishes database IDs from federation
URIs. The [Mastodon.online](https://mastodon.online/about) and [Fosstodon](https://fosstodon.org/about)
sites identify themselves as Mastodon installations.

## VK (`vk`)

Hosts: `vk.com`, `www.vk.com`, `m.vk.com`, `vk.ru`, `www.vk.ru`, `m.vk.ru`.

| Pattern | Type | ID / identity key |
| --- | --- | --- |
| `/id:n` | profile | Explicit user ID; `vk:profile:<n>` |
| `/club:n` | channel | Explicit community ID; `vk:community:<n>` |
| `/wall:owner_:post` | post | Literal owner/post composite; `vk:post:<owner>_<post>` |
| `/video:owner_:video` | video | Literal owner/video composite; `vk:video:<owner>_<video>` |

An owner may be negative for a community; all numeric components must be
nonzero digit strings without leading zeros. Different owners are never merged
merely because their post/video numbers match. Vanity addresses can refer to
users, communities or applications, so this subset leaves them unknown. Query
overlays, video embed endpoints, public/event prefixes and shortened links are
not mapped to resources. The presence of either `w` or `z` query keys rejects a
direct URL, including repeated selector keys; their targets are not interpreted.

Sources: VK's [wall schema](https://raw.githubusercontent.com/VKCOM/vk-api-schema/master/wall/methods.json)
and [video schema](https://raw.githubusercontent.com/VKCOM/vk-api-schema/master/video/methods.json)
document owner/ID composites and negative community owners. The [official bridge source](https://raw.githubusercontent.com/VKCOM/vk-bridge/master/packages/core/src/types/data.ts)
documents `id`/`club` identifiers and current `vk.ru` clients. Its [screen-name resolution method](https://raw.githubusercontent.com/VKCOM/vk-api-schema/master/utils/methods.json)
explains why a vanity name alone does not determine resource type or numeric ID.

## Weibo (`weibo`)

Hosts: `weibo.com`, `www.weibo.com`.

| Pattern | Type | ID / identity key |
| --- | --- | --- |
| `/u/:n` | profile | Explicit UID; `weibo:profile:<n>` |
| `/:ownerNumber/:token` | post | Literal composite; `weibo:post-token:<owner>/<token>` |
| `/2/detail/:n` | post | Explicit numeric post ID; `weibo:post-id:<n>` |

The desktop subset accepts a 5–20 digit owner and a case-sensitive 6–16 character
ASCII alphanumeric token. Tokens are not decoded or equated to numeric post IDs.
Vanity profiles, bare numeric root paths, mobile domains, video and shortlinks
are outside this subset. Explicit numeric components reject leading zeros.

Sources: [Weibo's own user-development report](https://data.weibo.com/report/file/view?download_name=1907bfd7-ba89-c35e-79d0-90af73a01865&file-type=.pdf)
contains the `/u/<UID>` form. [Weibo Customer Service's own post permalink](https://www.weibo.com/2016713117/MBDTlsX5r)
provides a desktop owner/token example and explains how to find account/post
addresses. [Its creator-center announcement](https://weibo.com/2/detail/5362603040705309)
provides the numeric detail route. The token length bounds are the parser's
conservative supported subset, not a claim about all Weibo identifiers.

## Odnoklassniki (`ok`)

Hosts: `ok.ru`, `www.ok.ru`, `m.ok.ru`.

| Pattern | Type | ID / identity key |
| --- | --- | --- |
| `/profile/:n` | profile | Explicit user ID; `ok:profile:<n>` |
| `/group/:n` | channel | Explicit group ID; `ok:group:<n>` |
| `/group/:owner/topic/:post`, `/group:owner/topic/:post` | post | Literal composite; `ok:group-post:<owner>/<post>` |

Vanity addresses may identify either users or groups, so they remain unknown.
User status URLs, videos, games, feeds and query-based legacy routes are not
implemented. Numeric IDs must be nonzero digit strings without leading zeros;
topic identities retain the explicit group owner.

Sources: OK's [URL information method](https://apiok.ru/dev/methods/rest/url/url.getInfo)
gives explicit profile/group routes and demonstrates the ambiguity of vanity
addresses. Its [Graph API sharing examples](https://apiok.ru/en/dev/graph_api/methods/graph.user/graph.user.messages/post)
show group-topic links. The [application requirements](https://apiok.ru/en/apps/launch/requirements)
identify the `m.ok.ru` mobile service.
