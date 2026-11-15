# Expense Ledger — test harness (how to reproduce the reported results)

## Current state (checked 2026-11-15 at commit 86b0dc2)

- The tests **are committed**: 856 files under `tests/` are tracked in git. The note further down that says they were
  "never committed" is from October 2026 and is kept only as history.
- `tests/logic/` has 133 test files (2,608 checks in `expected-counts.json`).
- `tests/browser/` has 160 `e2e*.mjs` files (2,639 checks in `expected-counts.json`), plus helpers that are not tests:
  `build.mjs`, `lib.mjs`, `polish_probe*.mjs`, `shots_run*.mjs`, `shot_run8*.mjs` (screenshot scripts).
- The runners fail the whole run if `expected-counts.json` lists a file that no longer exists. On 2026-11-15 it still
  listed `e2e_run51_doubles.mjs` (deleted in Run 90) and did not list `e2e_run92_count.mjs`, so
  `node tests/run-browser.mjs` exited 1 whatever the results. That entry is now fixed.
- Earlier reports that said "full browser suite 158/158" came from a scratch script that ran `tests/browser/e2e_*.mjs`
  only. It skipped `tests/browser/e2e.mjs` (27 checks) and did not apply the check counts. Only
  `node tests/run-browser.mjs` counts as a full run.

### Commands and what they return

| Command | Exit code when everything is fine | Notes |
|---|---|---|
| `node tests/run-logic.mjs` | 0 | A few minutes. |
| `node tests/run-browser.mjs` | 0 | Needs the `--no-save` packages below and Chrome. Takes more than an hour. Writes the test bundle to `./page` (ignored by git); set `PAGE_OUT` to write it somewhere else. |
| `node tests/pwa/offline-check.mjs` | 0 | 17 checks. Builds into a temporary folder, serves it, then reloads offline. This is the check that runs before every release. Never point `LIVE_URL` at the live site during an audit. |
| `node tests/az-audit.mjs` | **1** | Flags wording for review. It currently flags one item on purpose (`acct.err.noaccount` says "Ayarlar", meaning the phone's own Settings app), so exit 1 is expected. |
| `node tests/make-package.mjs <dir>` | fails on a fresh clone | Copies `package-lock.json`, which is not in git yet. Works only in a folder where `npm install` has created the lockfile. |

The older `tests/offline-check.mjs` (described in "Files" below) prints what it sees and asserts nothing. Use
`tests/pwa/offline-check.mjs` instead.

## History (October 2026, kept unchanged)

> These tests are **local files in the worktree `Expense-ledger2-fixes`**. They have never been committed: releases so far
> committed only `App.jsx` and `i18n.js`, and committing `tests/` needs the owner's approval. That is why
> `tests/...` paths return 404 on GitHub.
>
> *Correction, 2026-11-15:* no longer true. See "Current state" above.

## Requirements
- Node.js 24 (tested with 24.22.1) and npm 11
- Google Chrome installed at `C:\Program Files\Google\Chrome\Application\chrome.exe` (or set `CHROME_PATH`)
- In the project folder, next to `package.json`:
  - `npm install`
  - `npm install --no-save puppeteer-core @fontsource/playfair-display @fontsource/dm-sans`

## Commands (run from the project root)
| Command | What it does |
|---|---|
| `node tests/run-logic.mjs [candidate.jsx]` | Loads the logic part of the candidate (default `./App.jsx`) plus `i18n.js` in Node through `tests/harness.mjs`, then runs every `tests/logic/*.test.mjs`. Exit code 0 only if every file passes. |
| `node tests/run-browser.mjs [candidate.jsx]` | Bundles the candidate (and `i18n.js` next to it) into `./page` with `tests/browser/build.mjs`, then runs every `tests/browser/e2e*.mjs` in headless Chrome. Each test uses a throw-away profile; network requests are blocked; downloads go to a temp folder (never the user's Downloads). |
| `npm run build` | The production Vite build (what Vercel runs). |

Every test file prints one line per check (`✓` / `✗`) and ends with `<name>: ALL n CHECKS PASSED` or `<name>: x FAILED, y passed`,
and exits non-zero on any failure. A missing function or element throws, and that file fails.

Since Run 5 the runners also enforce the **expected number of checks** per file (`tests/expected-counts.json`, via
`tests/count-guard.mjs`). Each file prints `passed=… failed=… missing=… expected=…`; a file that runs fewer or more checks
than recorded, stops before its summary line, or is not listed, fails the run. When a check is deliberately added or
removed, update the number in the same change. Each run first prints the **source identity** (`tests/identity.mjs`): path,
size, SHA-256, raw git blob id and `gitblob-lf` — the id `git ls-tree` shows (the working files have CRLF line endings because
`core.autocrlf=true`; git stores LF).

Neither runner has a default fallback to an old file any more: `tests/browser/build.mjs` and `tests/logic/lib.mjs` stop with an
error unless `CANDIDATE` (and `HARNESS`) are set, which the runners do.

## Test package and clean-room rerun
`node tests/make-package.mjs <newDir>` copies every file needed (tests without `.out`/`evidence`, `package.json`,
`package-lock.json`) and writes `MANIFEST.sha256`. `node tests/make-package.mjs --verify <dir>` re-hashes each file and fails on
any changed, missing or unlisted file. The Run 5 report records the clean-room procedure: `git archive <commit>` into an
empty folder, add the verified package, `npm install` + the three `--no-save` packages, then run both runners.

## Files
- `tests/harness.mjs` — Node harness: strips imports from the logic part of App.jsx (everything before `// ─── SVG icon system`),
  inlines i18n.js, injects a controllable clock and an in-memory localStorage.
- `tests/logic/*.test.mjs` — logic suites. The list below is from Run 5; there are now 133 files, one or more per run.
  (core, data, finance, i18n, phase2, phase3, run3, run5).
- `tests/browser/*.mjs` — browser suites (e2e, e2e_bigtext, e2e_import, e2e_lang, e2e_phase2, e2e_phase2_layout, e2e_run2,
  e2e_run3, e2e_run5, e2e_ux, e2e_ux_lang), `lib.mjs` (helpers) and `build.mjs` (test bundler).
- `tests/run-logic.mjs`, `tests/run-browser.mjs` — runners; `count-guard.mjs`, `expected-counts.json`, `identity.mjs` — see above;
  `make-package.mjs` — the package builder/verifier.
- `tests/offline-check.mjs` — offline-readiness evidence, run by hand: `npm run build && node tests/offline-check.mjs`
  (serves `dist`, loads once online, then reloads offline; prints what it observed; asserts nothing).

## Mutant checks (proving a test detects the bug it targets)
Copy `App.jsx` and `i18n.js` to a scratch folder, make one deliberate change, then run
`node tests/run-logic.mjs <scratch>/App.jsx` and, for browser suites, set `CANDIDATE=<scratch>/App.jsx`, run
`node tests/browser/build.mjs` and the suite file. The run 3 report lists the mutants used and their results.
- `tests/original/` — the supplied originals, kept unchanged for provenance (not run).
- `tests/evidence/` — logs of past runs (numbered); not needed to run the tests.
