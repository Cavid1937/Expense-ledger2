# Production-readiness audit — follow-up and correction (2026-11-15)

## 1. What was reviewed

| Item | Value |
|---|---|
| Web repository | `Expense-ledger2-fixes` worktree, branch `fix/financial-correctness-2026-10-26` |
| Commit reviewed | `86b0dc20385333bfbf17b9462bdd4b29a5073f29` (release 92, equals `origin/main`) |
| Earlier audit was on | `ae1bede1e51fcc60ce8859f6ccf85bf884b16f6c` (release 89) |
| Working-tree changes during the audit | `tests/expected-counts.json` (one stale entry fixed) plus the documentation in this commit. No app source changed. |
| Android shell | Separate local repo `Expense-ledger2-capacitor`, branch `claude/capacitor-spike`, commit `a09ebee` **plus 33 uncommitted changes**. Native findings below refer to that state, not to a web commit. |
| Not touched | Production Supabase (`qkztocsrxhubsljtsjpd`), the live site, real accounts, real user data. All probes used synthetic values. |

Confidence words: **confirmed** = reproduced, or the failure follows directly from the code. **Strong evidence** =
read from code or config but not run on a device or server. **Unverified risk** = plausible, not shown.
**Not assessed** = not looked at.

## 2. Corrected audit

### Verdict

- **Web app:** usable for its current small, owner-led group. **Not ready** to be promoted as a dependable public
  product until the P0 items in section 5 are done. The biggest gaps are builds that cannot be reproduced, unproven
  server-side data isolation, and bank-import amount readings that can be wrong without blocking the import.
- **Android:** **not releasable on Google Play** in its current form (package name, uncommitted source, policy items).

### Confirmed or strong-evidence blockers

| ID | Finding | Evidence | Impact | Severity | Confidence | Fix | Verification |
|---|---|---|---|---|---|---|---|
| A1 | Builds are not reproducible: no `package-lock.json`, no CI, no `vercel.json`, no `.nvmrc` in git; caret ranges in `package.json`. A local lockfile exists but is untracked. | `git ls-files` at ae1bede and HEAD; `package.json` | A Vercel build can pick newer packages than were tested. A broken minor release would reach users with no test run in between. | High | Confirmed (same on both commits) | Commit the lockfile, add a CI job that runs logic tests, build and `tests/pwa/offline-check.mjs`. **Needs owner OK.** | CI green on a PR; `npm ci` from a clean clone gives the same versions. |
| A4a | Bank-CSV amount reader `bankMoney` turns a trailing minus `"45-"` into **+45** (an expense becomes income) and `"1e3"` into **13**. | `App.jsx:2055-2066`; synthetic probe run on both commits with identical output (inputs and readings in `PHASE_CHECKPOINT.md` entry 0001i) | Wrong sign or wrong amount enters the ledger. | High | Confirmed for these inputs. Whether real bank CSVs contain them is unverified. | Reject anything that is not plain digits, one separator and an optional leading or bracket sign; treat a trailing minus as negative. | Unit tests for each probe input; the import preview shows a row error instead of a value. |
| A4b | Both readers (`stMoney` at `statement.js:16-30` and `bankMoney`) read `"0,015"` as **15.00**, and accept malformed `"1.2.3"` as **123**. | Probe output | A typo or odd format becomes a much larger amount. | Medium | Confirmed | Same strict pattern as the app's own `strictNum` (`App.jsx:116`). | As A4a. |
| A4c | Balance and summary checks only warn; the import button stays enabled when the statement does not add up. | `statement.js:436-443`; warnings at `App.jsx:6031`, `6034`; button rule at `App.jsx:6104` | A misread statement can be imported with one tap. | Medium | Confirmed from code | Require an explicit "Import anyway" step when the check fails. | Browser test: mismatched statement needs a second confirmation. |
| A3 | Data isolation on the server depends entirely on Supabase row-level security (RLS). The app sends `user_id=eq.<id>` itself. | `account.js:76`, `92`, `95`, `104` | If one RLS policy is wrong, one user could read or overwrite another's copy. | High (if wrong) | Unverified risk: RLS was not read, because production may not be queried in this audit | Export the policies read-only (owner OK) or reproduce them in a staging project; add a test with two users. | Two-user test: user B gets 0 rows and a write is refused. |
| N1 | Android package name is `com.example.expenseledger.spike`. | `Expense-ledger2-capacitor/android/app/build.gradle:7` | Google Play refuses `com.example` names, and a package name cannot change after the first upload. | Blocker for Play | Strong evidence (rule from Play documentation; not tried) | Pick the final ID before the first upload. **Owner decision.** | Play Console accepts the upload. |
| N2 | Android source has 33 uncommitted changes on top of `a09ebee`; the installed APKs were built from that uncommitted state. | `git status` in the capacitor repo | The shipped app cannot be rebuilt exactly, and a disk failure loses it. | High | Confirmed | Commit the shell (local commit, no push without OK). | `git status` clean; rebuilt APK matches. |

### Unverified risks

| ID | Risk | Evidence | Severity | Next check |
|---|---|---|---|---|
| N3 | The ledger is included in Android cloud backup and device transfer (on purpose since Run 29). The sign-in session tokens live in the same Local Storage, so they are backed up too. The privacy page does not appear to mention Android's own Google backup. | `AndroidManifest.xml:5-7`; `data_extraction_rules.xml:8-13`; `backup_rules.xml:4`; `writeAccount` stores the session (`App.jsx:4299`) | Medium | Owner decides whether to keep it; then disclose it, or exclude the session key. Restore test on a real phone. |
| N4 | `SCHEDULE_EXACT_ALARM` permission may need a Play declaration or be refused for a finance app. | `AndroidManifest.xml:99` | Medium | Check the current Play policy; consider inexact alarms for reminders. |
| N5 | The native bridge is limited to the app's own origin through Capacitor's `allowedOriginRules`, but falls back to an unrestricted interface on old WebViews. | Capacitor `Bridge.java:238-251`, `MessageHandler.java:36-41` | Low to medium | Test on an Android 7–8 device with an old WebView. |
| N6 | `minifyEnabled false`; `BankNotificationListener` is exported (required by Android, guarded by `BIND_NOTIFICATION_LISTENER_SERVICE`). | `build.gradle:22`; `AndroidManifest.xml:71` | Low | Review when preparing the Play build. |
| B1 | No size limit on JSON/CSV/XLSX import, and the zip reader (`inflateRaw`, `statement.js:503-518`) has no output cap. PDFs (30 MB / 400 pages) and photos (25 MB) are capped. | `App.jsx:5649-5666`; `pdfText.js:4`; `photo.jsx:15` | Medium (a large file can freeze a low-end phone) | Add a size cap and an inflate cap; test with a 200 MB file. |
| S1 | No Content-Security-Policy. The deployed headers were not fetched (that would contact production). No HTML-injection path was found: every `innerHTML` use writes fixed text. | `index.html`; no `vercel.json`; sinks at `App.jsx:4527`, `account.js:166`, `screens/launch.js:51`, `screens/onboard.jsx:34,77`, `screens/settings.jsx:41` | Low to medium | Add a CSP via `vercel.json` after listing every host the app calls. |
| B8 | The service worker never removes old `/assets/` files from its cache. | `public/sw.js` (cache `ledger-shell-v3`) | Low (storage grows with each release) | Prune assets not in the current page on activate. |

### Non-blocking issues

- B2: `syncMerge.js` is still not used by the app; only tests import it.
- B6: the privacy page does not mention receipt photos (0 matches for photo/şəkil/фото/receipt/qəbz/чек).
- Localization: `node tests/az-audit.mjs` flags only one item, and that flag is intentional ("Ayarlar" = the phone's own
  Settings app). No native-speaker review of az/ru has been recorded.
- `tests/.out/` (13 generated files) is tracked in git.

### What the previous report (at ae1bede) got wrong

1. **"Native source unavailable."** Wrong. The Capacitor shell is on this computer. Reading it lowered the bridge
   risk (N5, origin-limited) and found new items (N1–N4, N6).
2. **"Full browser suite 158/158 passed"** (Runs 90 and 91). Overstated. That run used a scratch script that skipped
   `tests/browser/e2e.mjs` (27 checks) and did not enforce check counts. The official runner
   `node tests/run-browser.mjs` had been failing since Run 90 because `expected-counts.json` listed a deleted file.
3. **"176 browser test files."** Imprecise. There are 160 test files; the rest are helpers and screenshot scripts.
4. **Amount parsing** was described only as a rounding concern. The probe found sign loss and exponent misreads in
   the bank-CSV path (A4a) and confirmed that the checks never block (A4c).
5. **A1 and A3** stand as reported. A1 is confirmed on both commits. A3 is still unverified because production was not queried.

### Which findings exist on which commit

All A, B and S findings above are present on **both** ae1bede and 86b0dc2. The amount probe gave identical output on
both. The release 90–92 changes (count switch, Birbank reader, layout) did not touch these code paths. The native
findings refer to the capacitor repo state described in section 1.

## 3. Repository organization

### Diagnosis

- The app is about 12 files at the root plus `screens/`. That is small and workable, but `App.jsx` is about 6,100
  lines and mixes money rules, storage, import/export, integrations and the app shell.
- The import graph has cycles. `App.jsx` imports 20 screen files, and 14 of them import `../App.jsx` back
  (add, analytics, debts, gifts, goals, home, ledger, lock, mapcols, pickers, recurring, report, settings, setup).
  `home.jsx` and `analytics.jsx` import each other as well.
- The logic tests load `App.jsx` through `tests/harness.mjs`. The harness takes everything above the line
  `// ─── SVG icon system` (line 4445) and exports a fixed list of names. Moving a function out of that region
  breaks the tests unless the harness is updated in the same change.
- Of 1,822 tracked files, about 1,670 are history or evidence: `handoff/` 835 (408 binaries, many zips),
  `tests/evidence/` 502, `archive/` 38, `reports/` 36. The current docs are mixed in with them.

### Current vs archive

[docs/README.md](README.md) now lists which documents are current, which are plans, and which are history.
**Nothing was moved in this pass.**

### Target layout and dependency direction (proposal, not done)

```
src/domain/        money rules, budgets, goals, debts (pure functions, no React, no storage)
src/storage/       load/save, migrations, recovery — keeps the key expense_ledger_v5
src/io/            statement.js, pdfText.js, xlsxWrite.js, CSV and JSON import/export
src/integrations/  account.js, drive.js, notify.js, native bridge, usage count
src/app/           App shell and state
src/ui/            screens and shared components
```

Allowed direction: `ui → app → domain / storage / io / integrations`. Nothing in `domain`, `storage` or `io`
imports React or a screen.

### Phased extraction plan

1. **Phase 0 (no code moves):** commit the lockfile, add CI, and add a test that fails if a new cycle appears.
2. **Phase 1:** move pure money helpers (amount parsing first, together with the A4 fix) into `src/domain/`.
   `App.jsx` re-exports them, so the screens and the harness keep working. Run the full logic and browser suites.
3. **Phase 2:** move storage and migrations. Add a test that loads saved data from each earlier release
   (the `handoff/snapshots/` and `tests/fixtures/` copies) and checks that nothing is lost.
4. **Phase 3:** move io and integrations, one file per change.
5. **Phase 4:** screens import from `src/` instead of `../App.jsx`; remove the cycles; update the harness to import
   the modules directly.
6. **History:** only after the owner agrees, move bulky binaries (`handoff/run9/`, zips, APKs) to a release archive
   outside git, leaving a manifest with SHA-256 hashes in their place.

Each phase is one reviewable change with the full suite run on that exact commit.

## 4. Verification

Results are recorded in `PHASE_CHECKPOINT.md` (entry 0001i), together with the exact commands, counts and the
source hashes the runners printed.

Missing evidence:

- **Native:** no test on a real device of backup and restore, old-WebView bridge behaviour, notification reading,
  or widgets on the latest build. APK 89 was built but has not been tested on a phone.
- **Staging:** no staging Supabase project. RLS is unverified.
- **Device:** no measurements on a low-end Android phone. The owner's Poco F6 is a fast device.
- **Localization:** no recorded native-speaker review of az or ru.
- **Legal:** the terms-of-use draft is not in git and was never reviewed by a lawyer. The privacy page does not
  mention receipt photos or Android's own backup.

## 5. Go / no-go plan

### Web gate

| Priority | Item | Acceptance criterion |
|---|---|---|
| P0 | A1 reproducible builds | Lockfile in git; CI runs logic + build + offline check on every push; green. |
| P0 | A4a/A4b strict amounts | Every probe input either reads correctly or is rejected with a row error; tests added. |
| P0 | A3 data isolation | Two-user RLS test passes against staging, or the exported policies are reviewed. |
| P1 | A4c block on mismatch | Mismatched statement needs a second confirmation; browser test. |
| P1 | B1 import caps | 200 MB file is refused quickly without freezing the page. |
| P1 | Privacy page | Mentions receipt photos and Android backup in az/ru/en. |
| P2 | S1 CSP, B8 cache pruning, repository Phase 1 | Each with its own test. |

### Android gate (all web P0 items plus)

| Priority | Item | Acceptance criterion |
|---|---|---|
| P0 | N1 final package name | Chosen by the owner; Play Console accepts the upload. |
| P0 | N2 shell committed | Clean `git status`; APK rebuilt from a commit. |
| P0 | Device test | Install, add, back up and restore, reminders and widgets on two real phones, including one low-end. |
| P1 | N3 backup decision | Kept and disclosed, or the session key excluded; restore tested. |
| P1 | N4 alarm permission | Play declaration done, or switched to inexact alarms. |
| P2 | N5, N6 | Old-WebView test; minify decision. |

### Release criteria (measurable)

- Logic suite and `node tests/run-browser.mjs` exit 0 on the exact release commit.
- Offline check 17/17 on the exact release commit.
- 0 known High or Blocker findings open.
- Native-speaker sign-off for az and ru on the main flows.

### Questions for the owner

1. Release web only for now, or also Google Play?
2. May I commit `package-lock.json` and add a GitHub Actions check? (This changes how Vercel installs packages.)
3. Create a free staging Supabase project, or allow a read-only export of the production RLS policies?
4. What final Android package name should be used? It cannot change after the first Play upload.
5. Keep the ledger in Android's Google backup (and say so on the privacy page), or exclude it?
6. Is multi-device sync something users are promised at launch?
7. Can you find one native az and one native ru reviewer?
