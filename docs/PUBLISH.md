# Publishing Linkary

The shared release command publishes the current version to the public npm registry,
then updates, commits and pushes `Formula/linkary.rb` in the neighboring
`../homebrew-tap` checkout (`oliverjessner/homebrew-tap`, branch `main`).

## Prepare

- Use Node.js 26 or newer, npm, Git and Homebrew (`brew style` validates the formula).
- Install development dependencies with `npm ci`.
- Authenticate with `npm login` and ensure Git can push to the Homebrew tap.
- For a new version, update `package.json` and `package-lock.json` together, for
  example with `npm version patch --no-git-tag-version`, and add release notes to
  `docs/CHANGELOG.md`. Publication uses the version already set in these files.
- Commit the Linkary release changes yourself. Both checkouts must be clean; the
  tap must be on `main` without unpushed commits. The workflow fetches and
  fast-forwards the tap before publication.

## Preview

```sh
npm run publish -- --dry-run
```

This runs the tests, TypeScript checks, package validation and Homebrew style
check. It packs a temporary archive and prints the formula without publishing,
changing the tap, committing or pushing. Temporary files are removed afterward.
The preview does not check npm authentication or Git push access.

## Publish to npm and Homebrew

```sh
npm run publish
```

The command checks npm authentication and version availability, and verifies the
tap and its push access before publishing. It runs `publish:check`, packs once,
and publishes that exact archive with lifecycle scripts disabled. It waits for
the public npm archive and verifies its SHA-256 before updating the Homebrew
formula. Registry propagation errors are retried with fresh cache keys.

Only `Formula/linkary.rb` is committed in the tap. The push targets `origin/main`
explicitly without following tags, and the remote commit is checked afterward.
The Linkary checkout is not committed, pushed or tagged by this command.

If npm requests interactive authentication, complete it in the terminal. To pass
a one-time password explicitly:

```sh
npm run publish -- --otp 123456
```

Use `npm run publish` for the shared workflow. Bare `npm publish` does not run the
Homebrew workflow: npm also treats `publish` as a lifecycle hook, so that
automatic invocation is deliberately skipped.

## Resume or publish one destination

If npm succeeds but Homebrew fails, keep the same version and package contents:

```sh
npm run publish -- --skip-npm
# Equivalent:
npm run brew:publish
```

The downloaded npm archive must still match the local archive. A mismatch stops
the formula update. Do not change package files between publication and recovery.
If the formula was committed but its push failed, review that commit and push it
from `../homebrew-tap` using `git push origin HEAD:refs/heads/main`; the publisher
rejects unpushed tap commits instead of including them in another release.

To publish only npm:

```sh
npm run publish -- --skip-brew
```

For a different local path to the same Homebrew repository:

```sh
npm run publish -- --tap-path /path/to/homebrew-tap
```

`HOMEBREW_TAP_PATH` also overrides the default. Keep the same override when resuming.

## Verify the published release

```sh
npm view linkary version --registry https://registry.npmjs.org/
brew update
brew install oliverjessner/tap/linkary
brew test oliverjessner/tap/linkary
linkary --version
```

Use `brew upgrade oliverjessner/tap/linkary` if Linkary is already installed.
The formula's test checks the version, offline URL normalization and tracking
parameter cleanup. Installing or upgrading the local CLI is a separate step
from publishing.
