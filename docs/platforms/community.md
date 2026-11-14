# Community and messaging URL patterns

These adapters parse a conservative subset of HTTP(S) links offline. Recognition
does not establish that a resource exists, an invitation remains valid, a phone
number is registered, or the caller can access the destination. Identifiers in
fixtures are examples. Only the exact hosts below are registered; host suffixes,
unlisted instances and nondefault ports are not accepted.

## 4chan

Hosts: `boards.4chan.org`, `boards.4channel.org`. Platform value: `4chan`.
The exact root domains `4chan.org`, `www.4chan.org`, `4channel.org` and
`www.4channel.org` are recognized as 4chan, but all their routes stay unknown.

- `/<board>/` identifies a board (`channel`), key `4chan:board:<board>`.
- `/<board>/thread/<number>` with an optional single title slug identifies a
  `thread`. Both its resource ID and key include the board.
- `#p<number>` on a supported thread URL identifies that `post`; its resource ID
  and key are board-scoped. The fragment is an explicit content-identity
  exception. Other fragments, catalogs, archives and additional path segments
  remain unknown.

The parser does not infer poster profiles from anonymous names or tripcodes.
Board names and post/thread numbers are syntactic; no live board list is fetched.
The [official board](https://boards.4chan.org/g/) exposes thread and post links;
the [official API documentation](https://github.com/4chan/4chan-API/blob/master/pages/Endpoints_and_domains.md)
describes board/thread addressing, and the [4chan FAQ](https://www.4chan.org/faq)
describes board-scoped post references and the lack of registered user profiles.

## Discord

Hosts: `discord.com`, `discordapp.com`, `discord.gg`.

- `discord.gg/<code>` and `/invite/<code>` on the two full hosts identify the
  exact `invite`, not a server inferred from that code. Codes retain their case.
- `/channels/<guild>/<channel>` and `/channels/@me/<channel>` identify a
  `channel`. Adding `/<message>` identifies a `message`.
- Numeric Discord IDs are retained as strings and accepted in the 17–20 digit
  form. Keys use separate `channel`, `message` and `invite` namespaces.

Login, OAuth, developer, application and arbitrary single-segment routes on full
hosts remain unknown. Invitation expiry, server membership and message access
are not checked. The [Discord message-link guide](https://support.discord.com/hc/hi-in/articles/360000291932-How-to-contact-Discord-Safety-for-Parents-and-Guardians)
documents server/DM permalink shapes; [Discord's API reference](https://docs.discord.com/developers/reference#snowflakes)
documents numeric IDs, and the [official invite guide](https://support.discord.com/hc/en-us/articles/360034842871-How-do-I-join-a-Server)
documents short invitations. The [Discord server directory](https://discord.com/servers/505974446914535426)
also publishes the full `/invite/<code>` form.

## Telegram

Hosts: `t.me`, `telegram.me`, `telegram.dog`.

- `/<username>` identifies a generic `profile` handle. The URL alone does not
  distinguish a user, bot, group or channel. Supported ASCII handles start with
  a letter and have 4–32 characters; handle keys compare case-insensitively.
- `/<username>/<message>` and `/s/<username>/<message>` identify a `message`
  with its visible handle, but no stable key: mapping a username to a numeric
  chat ID requires Telegram resolution.
- `/c/<channel>/<message>` uses the two explicit numeric components as its
  scoped resource ID and stable message key.
- `/joinchat/<hash>` and `/+<hash>` identify an exact `invite`. All-digit values
  are left unknown to avoid confusing an invitation with a phone-number link.

Special endpoints and target/action modifiers such as `comment`, `thread`,
`single`, `direct`, `story`, call and bot/app flags are unsupported. Nested forum
topic paths are also unsupported. Telegram fragments do not participate in
identity. See [Telegram's deep-link specification](https://core.telegram.org/api/links)
for the aliases, usernames, invitation/message forms and modifiers, and the
[official channel preview](https://t.me/s/telegram) for `/s/` web previews.

## WhatsApp

Hosts: `wa.me`, `api.whatsapp.com`.

`wa.me/<international-number>` and `api.whatsapp.com/send?phone=<number>`
identify the same explicit phone target. Numbers must contain 5–15 digits with
no leading zero, plus sign or punctuation. The result has type `profile`, null
resource ID and null handle; `whatsapp:phone:<number>` identifies the phone
target rather than inventing an account ID. A draft `text` does not change that
target. Duplicate `phone` parameters are ambiguous and rejected.

Recipient-free share links, business short links, groups, channels and WhatsApp
Web routes are outside this subset. The [WhatsApp click-to-chat documentation](https://faq.whatsapp.com/5913398998672934)
specifies international-number links and drafts; the [first-party send endpoint](https://api.whatsapp.com/send?phone=15551234567)
demonstrates the query-based form.

## Signal

Hosts: `signal.me`, `signal.group`, `signal.link`.

- `signal.me/#p/+<international-number>` recognizes an explicit phone target,
  with type `profile`, null resource ID/handle, and a `signal:phone:+<number>`
  key. It uses the same 5–15 digit restriction as WhatsApp.
- `signal.me/#eu/<base64url-token>` recognizes a username-contact `profile`.
  The encrypted token reveals neither the username nor an account ID, so the
  resource ID, handle and stable key remain null.
- `signal.group/#<base64url-token>` identifies the exact `invite` in a separate
  `group-invite` namespace. A token is not treated as a Signal group ID.

Only the root path is supported, without query parameters. `signal.link`
redirects remain unknown. These Signal fragments are explicit content-identity
exceptions: changing a phone fragment or invitation token changes the target.
No payload is decrypted and no cryptographic validity or account accessibility
is asserted. The [Signal Android username-link implementation](https://github.com/signalapp/Signal-Android/blob/main/app/src/main/java/org/thoughtcrime/securesms/util/UsernameUtil.kt)
defines `#eu/`; Signal's [username announcement](https://signal.org/blog/phone-number-privacy-usernames/)
explains contact links and privacy; [Signal's own issue tracker](https://github.com/signalapp/Signal-iOS/issues/706)
records the phone-link form and [group-link handling](https://github.com/signalapp/Signal-Android/issues/13949).
The [official domain list](https://support.signal.org/hc/en-us/articles/360007320291-Firewall-and-Internet-settings)
lists the recognized Signal hosts.

## Lemmy

Hosts: **only** `lemmy.ml` and `lemmy.world`. No hostname wildcard or path-based
guessing identifies arbitrary websites as Lemmy.

- `/post/<number>` identifies a `post`. Its numeric ID is local to the viewed
  instance; the key is `lemmy:post@<host>:<number>`. Hostnames are part of the
  comparison namespace, so two different instances do not prove a match or
  mismatch between their local numbers.
- `/u/<name>` and `/c/<name>` recognize `profile` and `channel` handles, including
  ASCII `name@remote.example` forms. IDs and keys remain null until an actor URI
  is available. Federation, mirrored posts and aliases are not resolved offline.

Comments, post fragments, extra routes and percent-encoded/non-ASCII names are
outside this subset. The [Lemmy server directory](https://join-lemmy.org/instances)
explains the federated network. First-party [post](https://lemmy.ml/post/55296949),
[profile](https://lemmy.ml/u/JiffyBag) and [community](https://lemmy.ml/c/linux)
pages show the supported routes; [Lemmy.World](https://lemmy.world/) is the other
explicitly supported instance.

## Steam Community

Host: `steamcommunity.com`.

`/profiles/<17-digit-SteamID>` identifies a numeric `profile` with a
`steam:steamid:<id>` key. `/id/<vanity>` recognizes a profile handle, but leaves
its resource ID and key null. No SteamID is inferred from a custom URL, and
vanity case/alias equivalence is not guessed. A numeric ID and vanity path
therefore cannot be merged offline. Inventories, game subpages, groups, store
pages and other routes remain unsupported.

Valve's [Community Data documentation](https://partner.steamgames.com/documentation/community_data?l=english)
documents numeric/custom profile routes. [ResolveVanityURL](https://partner.steamgames.com/doc/webapi/isteamuser#ResolveVanityURL)
is the separate network operation required to obtain a SteamID from a vanity
name.

## Hacker News

Host: `news.ycombinator.com`. Platform value: `hackernews`.

`/item?id=<positive-number>` identifies an item using the `hackernews:item:<id>`
namespace. Its generic resource type is `post`; the URL alone cannot determine
whether the item is a story, comment, poll or job. `/user?id=<ASCII-name>`
recognizes a case-sensitive `profile` handle with no invented numeric user ID.
Duplicate `id` parameters, fragments, missing IDs and other routes remain
unknown.

The [official Hacker News API documentation](https://github.com/HackerNews/API)
describes unique item IDs and case-sensitive user identifiers. The [site](https://news.ycombinator.com/)
links to the corresponding item and user routes.
