# Content, audio and developer platforms

These offline rules extract identifiers present in a URL. Recognition does not
confirm that a resource exists. Exact registered hosts and supported URL shapes
are required; custom domains are not inferred. The examples below are parser
examples rather than claims about live accounts. Primary sources were consulted
on 2026-11-15. Their URL examples inform the supported subset; the adapters do
not call those services.

## Medium (`medium`)

Hosts: `medium.com`, `www.medium.com`, and one validated ASCII DNS label before
`.medium.com`. Nested labels, punycode labels and known infrastructure labels
such as `help`, `api`, `support`, `status`, `miro`, `images` and `cdn` are excluded.

| Pattern | Type | Resource ID / key |
| --- | --- | --- |
| `/@:handle` on the main hosts | profile | Null ID; `medium:handle:<lowercase handle>` |
| `/p/:12hex` on the main hosts | post | Twelve lowercase hexadecimal characters; `medium:post:<id>` |
| `/@:handle/:slug-:12hex`, `/:publication/:slug-:12hex` | post | Same global post ID namespace |
| `:label.medium.com/:slug-:12hex` | post | Same global post ID namespace |

The ASCII title prefix is optional; the explicit hexadecimal suffix supplies the
identity. Known application routes such as `/tag/`, `/m/`, `/settings/` and
`/search/` are excluded. Custom domains, historical shorter IDs, encoded titles,
and arbitrary publication homepages on the main host are unsupported. A Medium
subdomain homepage can belong to either a profile or a publication, so its type
and identity remain unknown. A subdomain label reported on a story is its URL
owner, which need not be the author.

Sources: Medium's [profile URL schemes](https://help.medium.com/hc/en-us/articles/115004746707-Your-profile-page-URL)
and [archived first-party post ID documentation](https://github.com/Medium/medium-api-docs#33-posts).
Medium's own [short Terms URL](https://medium.com/p/9db0094a1e0f) redirects to its
publication story with the same ID. The archived API is only URL evidence; this
adapter does not use that API.

## Substack (`substack`)

Hosts: `substack.com`, `www.substack.com`, and one validated ASCII DNS label before
`.substack.com`. Nested/punycode labels and infrastructure labels such as `open`,
`support`, `api`, `help`, `status`, `email`, `cdn` and `assets` are excluded.

| Pattern | Type | Resource ID / key |
| --- | --- | --- |
| `/@:handle` on the main hosts | profile | Null ID; `substack:handle:<lowercase handle>` |
| `:publication.substack.com/` | channel | Null ID; `substack:publication:<publication>` |
| `:publication.substack.com/p/:slug` | post | `publication/slug`; null identity key |
| `/@:handle/note/c-:number` on the main hosts | post | Literal `c-<number>`; null identity key |

The post subset accepts lowercase letters, digits and hyphens in a 2–200
character slug with alphanumeric ends. Slugs are scoped to the publication and
are not converted into numeric post IDs. Notes expose their visible token and
handle without asserting a global or immutable note identity. Handles and
publication names use separate key namespaces. Custom domains, publication
aliases, application redirects and comments are unsupported.

Sources: Substack's [profile publishing guide](https://support.substack.com/hc/en-us/articles/29152946791188-How-can-I-publish-on-Substack),
[publication URL guidance](https://support.substack.com/hc/en-us/articles/4407702258836-How-can-I-optimize-my-Substack-publication-for-SEO)
and [editable post slugs](https://support.substack.com/hc/en-us/articles/360051140332-How-do-I-edit-my-post-s-URL).
Its [homepage](https://substack.com/) links to publication `/p/` URLs and
[public Notes URLs](https://substack.com/@thedankoe/note/c-387317657).

## Spotify (`spotify`)

Hosts: `spotify.com`, `www.spotify.com`, `open.spotify.com`, `play.spotify.com`,
`spotify.link`. The root website hosts and short host are recognized with unknown
resource identity; resource parsing is restricted to `open` and `play`.

`/:type/:id`, `/embed/:type/:id` and `/intl-:language/:type/:id` support `track`,
`album`, `artist`, `playlist`, `show` and `episode`. The type is returned directly;
the ID must contain exactly 22 case-sensitive ASCII base-62 characters. Keys are
`spotify:<type>:<id>`, so an identical token under a different resource type is
kept separate. The locale subset accepts two lowercase language letters.
User URLs, local tracks, Spotify URI schemes, legacy user-owned playlist paths,
combined locale/embed prefixes and opaque shortlinks are unsupported.

Sources: Spotify's [URI/ID definitions](https://developer.spotify.com/documentation/web-api/concepts/spotify-uris-ids)
and [oEmbed examples](https://developer.spotify.com/documentation/embeds/reference/oembed).
The [localized official player URL](https://open.spotify.com/intl-de/track/6rqhFgbbKwnb9MLmUQDhG6)
shows the locale prefix independently of the track ID.

## SoundCloud (`soundcloud`)

Hosts: `soundcloud.com`, `www.soundcloud.com`, `m.soundcloud.com`,
`on.soundcloud.com`. The short host has unknown identity.

`/:handle` identifies a profile with a null ID and
`soundcloud:handle:<handle>`. The supported handle subset is 3–25 lowercase ASCII
letters, digits, `_` or `-`, excluding known application routes. `/:handle/:slug`
identifies a track; `/:handle/sets/:slug` identifies a playlist. Both expose the
composite permalink `handle/slug` as their resource ID and return a null key:
the URL does not reveal the numeric API ID, and permalinks can change. Slugs are
limited to ASCII lowercase letters, digits, `_` and `-`. Profile tabs such as
`tracks`, `likes`, `reposts`, `followers` and `sets` are not track IDs.
Private share tokens, player query URLs, shortlinks and API hosts are unsupported.

Sources: SoundCloud's [first-party track, set and user URL examples](https://developers.soundcloud.com/docs/custom-player/custom-player),
[profile URL requirements](https://help.soundcloud.com/hc/en-us/articles/115003561828-Display-Name-and-Profile-URL-Requirements)
and [explanation of stable IDs versus mutable URLs](https://help.soundcloud.com/hc/en-us/articles/115003566888-How-changing-your-Profile-URL-affects-your-RSS-feed).

## Dailymotion (`dailymotion`)

Hosts: `dailymotion.com`, `www.dailymotion.com`, `geo.dailymotion.com`, `dai.ly`.

Main-host `/video/:id` and legacy `/embed/video/:id` identify videos. On `geo`,
`/player.html?video=:id` and `/player/:playerId.html?video=:id` expose the same
video ID; exactly one `video` value is required. The supported ID subset starts
with `x` or `k` followed by 3–63 ASCII alphanumeric characters. Public `x` IDs use
`dailymotion:video:<id>`; private `k` tokens use
`dailymotion:private-video:<id>`. The two namespaces are not equated offline.
Player IDs do not replace video IDs. Channel paths and opaque `dai.ly` aliases
remain unknown. Recognition of a legacy player URL does not assert that the
legacy player still works.

Sources: Dailymotion's [public/private video URLs](https://developers.dailymotion.com/docs/collect-your-video-ids),
[legacy and current embed URLs](https://developers.dailymotion.com/v0/reference/migration-guide-new-embed-endpoint)
and [tiny URL field](https://developers.dailymotion.com/v0/reference/video-fields).
The documented tiny token can differ from the canonical video ID.

## Rumble (`rumble`)

Hosts: `rumble.com`, `www.rumble.com`.

`/v:token-:slug.html` identifies a video and exposes the leading `v…` public
permalink token with a null key. `/embed/v:token` identifies a video in the
separate `rumble:embed:<token>` namespace. A public token is not presumed to be
the embed ID, and neither is decoded into a numeric ID. `/c/:name` identifies a
channel with `rumble:channel:<name>`; `/user/:name` identifies a profile with
`rumble:handle:<name>`. Both preserve name case and expose `profileHandle` with
a null numeric ID. Channel and user namespaces are kept separate.
Bare public tokens, iframe publisher prefixes, JavaScript embeds, playlists,
shorts, search endpoints and video file URLs are unsupported.

Sources: Rumble's [embedding guide](https://rumble.support/en/help/rumble-basics-how-to-embed-your-video)
links to a public `/v…-….html` video, and its
[channel sharing guide](https://rumble.support/en/help/share-your-channel)
describes copying the channel URL. No undocumented conversion between public
permalinks and embed IDs is attempted. The maintained
[yt-dlp Rumble extractor's observed URL fixtures](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/rumble.py)
provide additional implementation evidence that a public permalink token and
the embed ID need not match.

## Kick (`kick`)

Hosts: `kick.com`, `www.kick.com`.

`/:handle` identifies a channel, exposing its ASCII handle and the key
`kick:handle:<lowercase handle>`. The supported subset accepts 1–25 ASCII
letters, digits or underscores. Known application routes such as `browse`,
`categories`, `search`, `settings`, `dashboard`, `leaderboards`, `events` and
`subscriptions` remain unknown. A `clip` query selector also remains unknown,
because it can select a clip rather than the channel. VODs, clip IDs and channel
tabs are deliberately not guessed.

Source: Kick's [first-party clip guide](https://help.kick.com/en/articles/7120566-how-to-create-clips-on-kick)
documents the channel URL separately from the clip sharing action; its
[homepage](https://kick.com/) links directly to channel handles.

## Flickr (`flickr`)

Hosts: `flickr.com`, `www.flickr.com`, `flic.kr`.

`/photos/:owner/:number` and `/photo.gne?id=:number` identify an image using
`flickr:photo:<number>`. The query form requires exactly one ID. An owner can be
a supported ASCII vanity name or an NSID shaped like `12037949754@N01`.
`/photos/:owner/albums/:number` identifies an album with
`flickr:album:<number>`. `/people/:owner` and `/photos/:owner` identify a profile:
NSIDs use `flickr:nsid:<nsid>` and expose `resourceId`; vanity names use
`flickr:handle:<name>` and expose `profileHandle`. Vanity names preserve case and
are not resolved to NSIDs. The special `me` owner and application routes are
excluded. Image IDs are not inferred from CDN image filenames.

Opaque `flic.kr` URLs remain unknown. Flickr documents a base-58 photo mapping,
but this adapter does not implement that conversion or presume that an encoded
token is already a decimal photo ID. Album listings, galleries and photo context
suffixes are unsupported.

Sources: Flickr's [official page and short URL formats](https://www.flickr.com/services/api/misc.urls.html),
[album lookup by ID](https://www.flickr.com/services/api/flickr.photosets.getInfo.html)
and its [API group's original short-URL discussion](https://www.flickr.com/groups/api/discuss/72157616713786392/).

## GitLab (`gitlab`)

Host: `gitlab.com` only. Self-managed instances and guessed subdomains are
unrecognized.

`/:namespace/:project.git`, including nested namespace components, identifies a
repository. `/:namespace/:project/-/tree/:ref` and
`/:namespace/:project/-/blob/:ref/:file` identify the same repository; branch or
file identity is not claimed. Keys are
`gitlab:repository:<lowercase namespace/project>`.
`/:namespace/:project/-/issues/:number` and
`/:namespace/:project/-/merge_requests/:number` identify posts with composite IDs
`namespace/project/<route>/<number>` and keys in separate `gitlab:issues:` and
`gitlab:merge_requests:` namespaces. Numbers are positive decimal IDs.

Plain `/group/name` and `/group/subgroup/name` paths stay unknown: they can refer
to either projects or nested groups. Explicit project markers avoid that
ambiguity. Known reserved top-level and project route names are rejected. The
supported slug subset is ASCII letters, digits, `_`, `.` and `-`, with
alphanumeric ends, no consecutive punctuation and no `.git`/`.atom` namespace
suffixes. Encoded paths, issue tabs, work items and arbitrary group routes are
unsupported.

Sources: GitLab's [routing ambiguity and `/-/` scope](https://docs.gitlab.com/development/routing/),
[namespace types](https://docs.gitlab.com/user/namespace/),
[reserved names](https://docs.gitlab.com/user/reserved_names/) and
[HTTPS clone URLs](https://docs.gitlab.com/topics/git/clone/).

## Bilibili (`bilibili`)

Hosts: `bilibili.com`, `www.bilibili.com`, `m.bilibili.com`,
`player.bilibili.com`, `space.bilibili.com`, `b23.tv`.

Main-host `/video/BV1:token` identifies a video using the full 12-character,
case-sensitive BV token with `bilibili:bv:<token>`. `/video/av:number` exposes
the positive decimal number with `bilibili:av:<number>`. On the player host,
`/player.html?bvid=:BV` or `/player.html?aid=:number` uses the corresponding
namespace. Exactly one ID selector with one value is required; combinations,
duplicates, and `episodeId`/`seasonId` selectors remain unknown. BV and av IDs
are not converted or equated. Parts, time offsets and fragments do not change
the identified video submission; individual segments are not identified.

`space.bilibili.com/:number` identifies a profile in the separate
`bilibili:uid:<number>` namespace. Opaque `b23.tv` URLs, live rooms, Bangumi,
articles, app links and profile tabs are unsupported.

Sources: Bilibili's [official external-player documentation](https://player.bilibili.com/)
defines its BV/av selectors and OGV priority; its
[open-platform video response](https://openhome.bilibili.com/doc/4/d9554788-dcef-f139-6217-b487d41c3826)
includes the public `/video/BV…` URL. Its [UID guide on Bilibili](https://www.bilibili.com/opus/508346397809971774)
shows the separate profile-space context. No BV-to-av decoding algorithm is used.
