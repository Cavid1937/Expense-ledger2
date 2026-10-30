# Claude Implementation Report — 2026-10-28 — Run 13: Run 12 verification, migration/rollback safety, Android backup export

**Origin of evidence:** everything below was run or inspected by Claude on the owner's computer on 28 Oct 2026. ChatGPT has NOT reviewed this report and has not reproduced any result. Nothing was committed, pushed, previewed, published or submitted. Production, preview and `main` are unchanged at `12a0c19`.

## 1. Result in plain language
- The Run 12 candidate (bills) now has its first **uninterrupted clean-install verification**: fresh `npm ci`, logic **646/646**, build OK, Azerbaijani audit 0/0/0, and **two full browser runs of 533/533, 0 failed, 0 missing**, on the exact frozen files. (This is headless Chrome on a PC, not a phone.)
- **The mysterious browser-test crashes now have a probable cause, with evidence:** Windows put the computer into "Modern Standby" (sleep) while the tests ran unattended. All three crash episodes (two in Run 12, one in this run) overlap standby periods in the Windows event log; the run with standby held off by the app's keep-awake had zero standby events and zero crashes.
- I found and covered a **real rollback hazard**: the live version-9 app wipes bills and payment links the moment it is opened (no tap needed). Version 9 cannot be changed, so the new version keeps a mirror of the bills and **offers** (never silently applies) a restore with a recovery copy and Undo. Rolling back is therefore "recoverable after an explicit restore", not "safe".
- Two smaller import defects were fixed (details §5). 
- **Android backup export:** the web app now hands files to a native shell instead of a dead download link; a new debug APK was built from the exact candidate. **It has never been run on a phone or emulator — device behaviour is NOT ASSESSED.** A checklist for your phone is ready.

## 2. Source identity (Phase A)
| Item | Value |
|---|---|
| Worktree / branch | `Expense-ledger2-fixes` / `fix/financial-correctness-2026-10-26` |
| HEAD | `12a0c196ae03f577499391625d0b40e6bc5f8357` (unchanged; no commit) |
| Remote heads (read-only) | main = preview-run3 = 12a0c19; preview-run2 = 86af1c1; release-candidate = ec900de (unchanged) |
| At start | App.jsx `1F8D6945…F39`, i18n.js `979BE4D5…EF57`; matched the Run 12 report exactly |
| Frozen final candidate | App.jsx `FA568979A63BFC57D656D4C3A44414B81F976DF2ABA2F7779E9EDA948867EFED`, i18n.js `4F7AEA2F7C2B8FA63F4C217F99AF8D26E0D3604A30CCC846BB80B3C186798CBA`, main.jsx `4C3638CB…2553` (web, unchanged) |
| Recovery copy of the starting worktree | `C:\Users\cavid\ExpenseLedgerBackups\run13-start-20261028-1647` — 819 files, every file hash-compared with the original: 0 mismatches; plus the 69 KB patch of tracked changes and `status -uall` |
| Full identity list | `handoff/run-13-SOURCE-IDENTITY.txt` |
| Runtime | Node v24.22.1, npm 11.19.1, Chrome 156.0.8078.47, puppeteer-core 25.16.0 (test-only) |
| Not in git (important) | `package-lock.json`, `tests/`, `handoff/`, `PHASE_CHECKPOINT.md` are untracked. Vercel therefore builds without a lock file. Recorded as a risk; not changed. |

## 3. Clean-install verification (Phase B)
Script: copy of the frozen worktree (tracked + untracked, no node_modules/dist/.git/evidence) → `npm ci` from the lock file → pinned test-only tools → logic → build → Azerbaijani audit → browser run 1 → browser run 2.

| Run | Candidate | Logic | Build | Az audit A/B/C | Browser run 1 | Browser run 2 | Logs |
|---|---|---|---|---|---|---|---|
| Baseline | starting Run 12 (1F8D…) | 575/575, 15 files | OK `index-CgGnqsuQ.js` | 0/0/0 | 469/469, 17 files, 0 missing | 469/469 | 250–254 |
| Final candidate, tests before the chain test | FA56… + 58 new checks | 646/646 | OK `index-CgDY5-6n.js` | 0/0/0 | 527/527 | 527/527 | 273–277 |
| Final, after adding the end-to-end chain test (first try) | same | 646/646 | OK | 0/0/0 | **533 expected: e2e_run13 stopped (my test's download wait, see §7), 0 checks counted for it** | same | 282–286 |
| Final, second try | same | 646/646 | OK | 0/0/0 | 533/533 | **2 files stopped (detached frame; one 10-minute timeout) while the PC was in standby** | 290–294 |
| **Definitive final** | **App.jsx FA56…, i18n.js 4F7A…, tests as frozen below** | **646/646, 19 files** | **OK `index-CgDY5-6n.js` 476.44 kB** | **0/0/0** | **533/533, 20 files, 0 missing** | **533/533, 20 files, 0 missing** | **295–299** |

- Nothing in the app source changed between these rows (hashes identical); only test files were added or made sturdier. Rows 3 and 4 are failed attempts and are kept, not hidden.
- Frozen test-side SHA-256 of the definitive run: `tests/browser/lib.mjs` B0AA3BFCD983412D40B98C0C0CB3F0F08C6E61E94FAFEA96AAD60482A6F9BCCD; `tests/browser/e2e_run13.mjs` 6E9B00445EA4A51E098D84F6C5C70A3CD840D51DACE1EF757AA96ACA4E1D258C; `tests/count-guard.mjs` CD15650D282B07A8A205C2427DC63815D491180321D1491D9E9EA4CE6C8D1E26; `tests/expected-counts.json` DE968FAC2C153D5FAD5AB44FA5B08065D51D6A0452DF6DC260777336D19DBCBB.
- Dev (non-clean) runs on the worktree during development: logic 646, browser 527/527 (logs 268–272).
- **Test-dependency gap (confirmed):** `puppeteer-core` and the font packages used by the tests are in neither `package.json` nor the lock file, so `npm ci` alone cannot run the browser tests. The clean-room script installs pinned versions (puppeteer-core 25.16.0, fontsource 5.3.0). Not fixed in the repo (would change `package.json`, which Vercel installs); needs your decision.

### The two earlier browser-process faults (`Navigating frame was detached`, `ProtocolError`)
- **It happened once more in this run (log 294):** `e2e_lang` ("Attempted to use detached Frame") and `e2e_run7` (same error, then a 10-minute `ETIMEDOUT`), both with 0 checks counted. Neither file is new; both pass in the other runs.
- **Probable root cause, found with the Windows event log (read-only): Modern Standby.** During the failed run (18:43–19:23) the system entered standby 5 times (pauses of about 6 and 19 minutes) because the session had paused at the usage limit and nothing was holding the computer awake. The `ETIMEDOUT` fits exactly: the 10-minute timer kept running while Chrome was frozen. Both Run 12 faults also fall inside a standby window (23:36–00:06 on 27–28 Oct; logs 245 and 234). Three of three episodes overlap standby. **Strong circumstantial evidence, not a controlled reproduction** (I cannot force the PC to sleep without changing system settings).
- **Test of the explanation (CORRECTED in Run 14):** the definitive run (21:35–21:56) had 0 standby entries and 0 faults in two full browser runs after a keep-awake request. That did not hold up: later on 28 Oct, with the hold renewed, Windows still entered standby 7 times and froze two more full browser runs. The clean run was most likely luck; the keep-awake request does NOT reliably prevent standby on this PC. The Run 13 results stand (that run had no standby events). The standby explanation now matches 4 of 4 browser-process stops; the runner prints standby events per run.
- **Not the cause (checked):** the app never navigates by itself (its only reload is the "Update" button a person taps); every test ends via `finish(name, browser)` or an awaited `browser.close()`; each file has its own throw-away profile; files run one after another.
- **Real weakness found and fixed (test infrastructure only):** a test that stopped on an uncaught error left its Chrome (and profile) running (my own first downgrade run did exactly this), and my first fix could itself hang for the whole 10 minutes if the browser was frozen (probably what happened in `e2e_run7`). `tests/browser/lib.mjs` now closes every launched browser on an uncaught error/rejection, **capped at 4 s then force-killed**, exits with failure, and prints the last page events (navigations, detached frames, crashes) so any future fault comes with evidence (verified with a deliberate crash: failure exit, 0 test Chrome processes left).
- **Rule for unattended runs:** hold the computer awake (or let the owner set Sleep to "Never" while plugged in) before any multi-minute test run. Added to the charter.
- `tests/count-guard.mjs` now prints a `NOTE:` line when a file stops on a browser-process fault (not a failed check). It still counts as a problem; nothing is retried or excused. No assertion was changed or loosened; expected counts were only raised for the new files.

## 4. Financial correctness and migration (Phase C)
**Coverage map** (existing Run 12 checks reused; new ones only for gaps):
| Requirement | Evidence |
|---|---|
| Two bills, same company/category/frequency stay separate; 1,892 not 1,982 | bills.test (log 224), e2e_run12 R12-1. Arithmetic by hand: income 2,000 − water 18 spent this month − electricity 90 set aside (due, unpaid) = **1,892**; the merged-schedule bug gave 2,000 − 18 = 1,982 (electricity not set aside) |
| Repeated Add Bill never silently duplicates; same name+amount ≠ same bill | e2e_run12 R12-4; bills.test; **new** billsmirror "same name, other id is NOT merged" |
| Amount alone never identity | bills.test "ordinary Kommunal 90 is not the payment" |
| Month-end, leap year, yearly 29 Feb, early/late/double/variable payments | existing + **new run13.test R13-4** (31 Jan→29 Feb 2028→31 Mar; 31 Jan→28 Feb 2027; 29 Feb 2028/2029/2032; early 1 Oct, late 12 Oct, September payment, paid twice, 55 instead of 40) |
| Payment ↔ bill ↔ occurrence, no double count, reload, delete/pause/Undo | e2e_run12 (35 checks) |
| v9 import preserves ids/counts/totals/settings | **new** R13-1 (5 entries, expenses 138.34, income 2,000, budgets/goals/templates/currency/Safe-to-Spend settings identical; Merge keeps own entries and bills; ids unique) |
| v10 → v10 round trip, bills + links + settings, Safe to Spend equal | **new** R13-2 (identical fields for all 5 entries; Safe to Spend 1,879.66 before and after) |
| Malformed/partial/duplicate/future/truncated files | **new** R13-3 (+ existing e2e_import) |
| Failed recovery copy during conversion; ledger cannot be saved; failed restore copy | **new** e2e_run13 (B2, B3, B4) |
| **v9 backup → import (Replace) → convert to bills → export v10 → restore on another device** | **new** e2e_run13 R13-B5 (5 checks: identical bills, links, ids, expense total, Safe to Spend +1,982 before and after; log 281, rerun 288/289, final 298–299). Characterization test: it passed on its first dev run, so there is no failing-before log |`n| **Downgrade to the v9 app** | **new** e2e_downgrade (26 checks, runs the real v9 app built from the exact 12a0c19 files) |

### Downgrade finding (confirmed in a real browser, log 257 before / 258 after)
1. The v9 app **rewrites the whole ledger every time it starts** (a save effect runs on first load) and its transaction normaliser has no `billId` field. Just opening it after a rollback removes `bills` and every payment link; the 4 entries themselves keep id/amount/date/name/category. It shows **no notice**, and its Safe to Spend returns to the old collision value 1,982.
2. Version 9 is live and cannot be patched, so a version guard in the new code cannot protect against it. A guard only helps future downgrades.
3. **Mitigation implemented (compatible, no new ledger key):** the app keeps `expense_ledger_v5__bills_mirror` (the bills + a payment-id→bill-id map, nothing else). v9 never touches it (it only prunes its own `before_import_*` copies — verified). When the ledger has lost bills the mirror still has, a banner offers **Restore** (recovery copy first, Undo available) or **No thanks** (final). Restore matches by id only, never name/amount; never re-links a payment that already points somewhere; invalid mirror entries are ignored; while the offer is open the mirror is not overwritten, so ignoring the banner loses nothing.
4. **Status of rollback:** recoverable after an explicit restore, **not** safe. Release runbook: do not roll production back past the bills release without a version-10 backup first. If the mirror itself is lost (browser data cleared) only a backup file helps.
5. Limits: the mirror is best-effort (a full storage can stop it); users who never had bills get no extra key; an offer needs the new app to be opened again after the rollback.

### Import defects found and fixed (test-first)
- **Replace with an older (v9) backup keeps the device's bills** (documented rule: a section absent from the file is kept) — but payments are replaced, so the bills end up with no payments linked to them, which can double-reserve money next to the file's old-style recurring payments. I kept the rule and made it **visible**: the Replace sheet now says "This file has no bills, so your N bills stay…" (e2e_run13 B1: Replace, recovery copy, Undo restores all 3 entries, both links and both bills).
- A backup whose entry list is damaged (not a list) and that has no entry count was imported as "settings only" **without a word**; it now shows a warning (logic log 261 failing → 262 passing).

### Mutation check (log 280)
Four deliberate breaks of the restore logic (re-link already-linked payments; treat same-named bills as present; accept any mirror version; link to non-offered bills) were each **caught** by the new tests.

## 5. Android backup export (Phase D)
- **Cause (from the Run 12 spike, by code reasoning; not shown on a device):** the web "download" link does nothing in the Android web view.
- **Web side (in the candidate, tested):** `shareBackupFile` / CSV export use `window.__ledgerNativeShare(filename, text, mime)` when a native shell provides it; success is claimed **only** when it returns exactly `"shared"`; `"cancelled"` changes nothing; anything else shows "Couldn't save the backup — nothing was sent" and records nothing; no silent fallback to the dead download link. Without the hook the PWA behaves exactly as before. Tests: native.test 14, e2e_native 14.
- **Native side (in the separate Android copy; source mirrored in `handoff/native/`):** `native-share-core.js` (pure, unit-tested with fake plugins: nativeshell.test 9) writes the file to the app cache folder via `@capacitor/filesystem` 8.1.5 and opens the system share sheet via `@capacitor/share` 8.0.3; old exports are removed at the start of the next export, not right after sharing; file names are sanitised; the web service worker is not registered in the native shell.
- **Honest limit of "shared" on Android:** it means the share sheet was opened with the file. It does not prove the destination got it (existing wording tells the user to check; a backup is only "confirmed" when the user confirms). Whether the Android Share plugin reports a dismissed sheet as cancelled is **unverified** without a device.
- **APK:** `C:\ExpenseLedgerBuild\android\_app\outputs\apk\debug\app-debug.apk` (copy: `C:\Users\cavid\ExpenseLedgerBackups\run13-app-debug.apk`), **4,445,005 bytes, SHA-256 `A39FF762C30E6FA3B8310747EC7B7BCE0C8F29B9196E89383632DCC1CD6A7A33`**, package `com.example.expenseledger.spike` (**temporary; permanent ID is your decision**), versionCode 1, minSdk 24, targetSdk 36, compileSdk 36. Permissions: `INTERNET` only (plus the app-private `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` that AndroidX adds). Built with Gradle 8.14.3 / AGP 8.13.0 / JBR 21; bundle `index-BZOdqF7u.js` verified to contain the share hook, the mirror, the restore banner and the new texts. The file provider covers the cache folder (static inspection). Debug-signed; not publishable.
- **Build failures (kept in logs):** attempt 1 (log in the build script output) and attempt 2 (log 278) failed with `AccessDeniedException` / `Unable to delete directory` — OneDrive locking the build folder inside the synced path. Attempt 3 (log 279) succeeded after redirecting Gradle's build output to `C:\ExpenseLedgerBuild` with an init script (no project file changed). The earlier spike APK (SHA `EC70DB2E…3BD0`) was preserved first at `ExpenseLedgerBackups\spike-apk-run12`.
- **Device tests: BLOCKED / NOT ASSESSED.** `adb devices` shows no phone; no emulator image or virtual device exists (Windows hypervisor acceleration is available). Creating an emulator needs a ~1.5 GB system-image download from Google; I did not do it without your approval. Your phone needs USB debugging on, or you can install the APK file directly. The exact steps are in `handoff/run13-android-phone-checklist.md`.
- Data move from the installed web app to the native app is **not automatic** (separate storage): use a backup file (this is also why export must work).

## 6. Regression and localization (Phase E)
- Existing suites for imports, backup/restore, storage failures, recovery/Undo, privacy mode and month-aware analytics all pass in the final runs (no check removed; counts only raised: logic 575→646, browser 469→533).
- No change to number formats, money-input rules, dates, design direction or financial semantics.
- **New or changed texts (az/ru/en) — automatic checks only, NOT native-reviewed (NOT ASSESSED):** `bill.restoreAsk/restoreBtn/restoreNo/restored`, `import.billsStay`, `import.listUnreadable`, `io.shareFailed`. Points for the native reviewer: "hesab" is used for "bill" like the existing bill texts (also means "account"/"score"); the Azerbaijani "{n}-ni" suffix after a number in `bill.restoreAsk`; Russian plural forms (one/few/many) of «счёт»; «Заменить» in `import.billsStay` must match the actual button label. The review sheet `handoff/az-review-sheet.csv` was regenerated by the audit.

## 7. Failed or imperfect attempts (all kept)
1. Two early final-run starts were stopped by me to add a test-runner improvement / the chain test; they are not counted. The failed rows in the §3 table (282–286: my chain test waited a fixed 1.2 s for a download and crashed instead of reporting; 290–294: two files stopped while the PC was in standby) are real failed attempts and are kept. The chain-test fix was reproduced first in isolation with a pre-filled downloads folder (log 287 failing → 288/289 passing): Chrome overwrites a same-named file in place, so the test now looks for a file modified after the click.
2. e2e_downgrade first run crashed on a null mirror (test written before the code); made robust, rerun: 13 failed / 13 passed on the starting app (log 257), 26/26 on the candidate (258).
3. run13.test first run: 7 failed — 5 were my own test mistakes (list order, key order, a wrong expected number I had written in the message), 2 were real defects (§4). Logs 259–262.
4. e2e_native first run after wiring: 1 failure = my wrong CSV-header expectation (byte-order mark + quotes); fixed in the test.
5. Gradle attempts 1 and 2 failed (OneDrive locks); 3 succeeded.
6. native.test and nativeshell.test were written together with their code, so a separate "failing before" log does not exist for them (the mutation check and the web e2e provide the negative evidence).

## 8. Status
| Requirement | Status | Evidence |
|---|---|---|
| Bill identity and Safe to Spend 1,892 (candidate, PC tests) | **VERIFIED** on a clean install in headless Chrome and logic tests; not on a phone | 295–299 (definitive), 224, 244 |
| Payment association/lifecycle | **VERIFIED** (same scope) | e2e_run12 in 298–299 |
| v9/v10 backup import/export, restore, malformed files | **VERIFIED** (same scope, synthetic data) | run13.test, e2e_run13 |
| Rollback to the v9 app | **IMPLEMENTED BUT UNVERIFIED** as a whole-flow guarantee; the hazard is **VERIFIED** (confirmed), the restore path **VERIFIED** in tests; real-device/Vercel rollback not tried | 257/258 |
| Browser-test instability | **Probable cause found (Windows Modern Standby, 3 of 3 episodes); keep-awake mitigation did NOT reliably work (Run 14 correction); runner now reports standby per run: IMPLEMENTED BUT UNVERIFIED**; real fix = owner sets Sleep to Never while plugged in | §3, logs 294, 295–299 |
| Test dependencies not pinned in the repo | **NEEDS WORK** (decision needed) | §3 |
| Android native export — web side | **VERIFIED** in tests with a stand-in hook | native.test, e2e_native |
| Android native export — real share sheet, file delivery, Back button, offline, update | **NOT ASSESSED** (no device/emulator) | §5 |
| Debug APK builds from the exact candidate | **IMPLEMENTED BUT UNVERIFIED** (built, never run) | 279 |
| az/ru/en wording of new texts | **NOT ASSESSED** (native review) | §6 |
| Committed / previewed / published | **No** — owner said "no preview for now" | — |

## 9. Risks, decisions needed, next action
- Rolling production back to 12a0c19 after releasing bills would hide bills until the user restores them; make a backup first.
- Pin the test tools in the repo? Commit `package-lock.json` and `tests/`? (needs your approval; nothing done.)
- Emulator image download (~1.5 GB) yes/no, or connect your phone; permanent Android app ID; Play account + 12 testers.
- **Next action:** you run the phone checklist (or approve the emulator download); then a preview push of the Run 12+13 candidate if you decide to; then the accounts/transfers design note.

## 10. Evidence package
`run13-evidence.zip`: logs 250–299, the new/changed tests, `handoff/native/*`, source identity, patch of the final `App.jsx`/`i18n.js` against HEAD, this report, the phone checklist. The APK itself is not attached (hash above).
