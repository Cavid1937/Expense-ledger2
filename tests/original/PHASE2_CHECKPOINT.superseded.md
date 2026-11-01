# Expense Ledger — Phase 2 checkpoint (2026-10-26)

Nothing in this phase was committed, pushed or deployed.

## 1. Candidate identity
| Item | Value |
|---|---|
| Protected baseline | `Expense-ledger2/App.jsx`, commit `6fb8cd1`, git blob `53a3203f…` — **unchanged** (re-checked at the end) |
| Alternate copy | `C:\Users\cavid\Downloads\expense-tracker.jsx`, blob `53a3203f…` — byte-identical to the baseline, **unchanged** |
| Working copy | git worktree `Expense-ledger2-fixes`, local branch `fix/financial-correctness-2026-10-26` (not committed, not pushed) |
| Final candidate | `Expense-ledger2-fixes/App.jsx`, git blob `83b9b70c5e8a7e59cf2f7145e501cb04704bc2b0` |
| Backup of the baseline | `tests/original/App.jsx.baseline-6fb8cd1` |
| Full diff | `tests/evidence/23-final-App.jsx.diff` (82 insertions, 21 deletions, App.jsx only) |
| Environment | Windows 11, Node.js v24.22.1 (official MSI via winget, user-approved), npm 11.19.1, Chrome 156.0.8078.47 headless with a throw-away profile, Vite 5.4.21 |

## 2. Confirmed defects fixed
| ID | Defect (evidence before the fix) | Fix | Lines in final App.jsx |
|---|---|---|---|
| D1 (§7A, high) | Safe to Spend added income dated later this month. Executed: a salary dated Oct 30 raised Safe to Spend from 1820 to 2820. With only future-dated income, 1000 was presented as safe to spend (`02-baseline-with-phase2-tests.txt`; `12-browser-all-baseline.txt` E2-B). | Only income dated today or earlier counts. Income dated later is returned as `expectedInc` and shown as "Expected later this month (not counted)". Expenses dated later still count (conservative). Labels: "Income received so far"; caption and helper card updated. | 943–958, 980, 1885–1895, 1935–1938, 3561–3563 |
| D2 (§7C, medium) | The Analytics tile called weekdays or weekends "heavier" from raw monthly totals, and counted future-dated entries. Executed: ₼10 every day in Oct 2026 gives totals 220 vs 90, so it claimed "Weekdays heavier". | New `calcWeekdayWeekend()`: per-day average over elapsed days only (today included), and no claim when a group has 0 days or there is no spending. The tile shows "Per day, weekdays = weekends", "Per weekend/weekday day (higher)" or "Per day: too early to compare". | 809–831, 2264–2266, 2390–2394 |
| D3 (§8, medium) | Starting an export hid the backup reminder for 7 days, as if the file had been kept (wording was already honest). | New optional field `backupConfirmedAt`, set only when the user taps "I have the file". `backupReminderDue()` returns confirm / none / due. Old data without the field loads, and asks once. Backup files never carry the field, and imports never change it. | 357–368, 410–412, 557–571, 1531–1535, 1626–1630, 1690–1703, 3312–3317 |
| D4 (§10, low, found by screenshot) | At 320px, Safe to Spend amounts could wrap and split from "₼" (the baseline wraps "none this month"). | `.safe-row` gap, `.safe-val` nowrap and right-aligned. | 1270–1272 |

Data compatibility: the `expense_ledger_v5` key, transaction schema, ids, migration and recovery code are unchanged. The only stored-data change is the optional `backupConfirmedAt` (ISO string or null). An older app version ignores it; a malformed value is treated as null.

## 3. Tests: commands and actual results (final candidate `83b9b70c…`)
Run from `Expense-ledger2-fixes`:
```
node tests/run-logic.mjs                # logic: harness (Node port of harness.py) + tests/logic/*.test.mjs
node tests/run-browser.mjs              # build page/ with tests/browser/build.mjs, then tests/browser/e2e*.mjs in headless Chrome
npm run build                           # Vite production build
```
| Suite | Kind | Baseline 6fb8cd1 | Final candidate | Evidence |
|---|---|---|---|---|
| core.test.mjs | logic | 39/39 | 39/39 | 01, 20 |
| data.test.mjs | logic | 122/122 | 122/122 | 01, 20 |
| finance.test.mjs | logic | 83/83 | 83/83 | 01, 20 |
| phase2.test.mjs (new) | logic | 9 failed / 9 passed (crashed sections counted as failures) | 48/48 | 02, 20 |
| e2e.mjs | browser | 27/27 | 27/27 | 12, 21 |
| e2e_import.mjs | browser | 51/51 (after the test-sort fix) | 51/51 | 10, 21 |
| e2e_phase2.mjs (new) | browser | 7 failed, then stopped (defects visible in the UI) | 20/20 | 12, 21 |
| e2e_phase2_layout.mjs (new; 320/360/390/1280px) | layout | 1 failed / 23 passed | 24/24 | 17 |
| e2e_ux.mjs | browser | 10 passed, 3 failed, then crashed at S2 | same: 10 passed, 3 failed, crashed | 12, 21 |
| Vite production build | build | not run on baseline | exit 0, `dist/assets/index-BPLRYnwv.js` 320.62 kB | 22 |

Logic total on the final candidate: **292 checks run, 292 passed, 0 skipped**. Browser total, excluding e2e_ux: **122 checks run, 122 passed**.

**e2e_ux is not a regression.** It targets the 25 Oct design candidate produced by `patch_H_design.py` (sheet grip and gestures, focus trap, keyboard switches, contrast tokens). That patch is **not** in `6fb8cd1`, so S2 fails on focus and then crashes on the missing `.sheet-grip`, and S3–S7 never run. Results are the same on baseline and final.

**Changes to existing tests (originals kept in `tests/original/`):**
- `tests/browser/lib.mjs`: uses installed Chrome and a temp profile instead of the Linux-only `@sparticuz/chromium`; the page path comes from `PAGE_URL`.
- `e2e_import.mjs`: download and import folders come from env vars. Also fixed a **test bug**: `.sort()` compared numbers as text, so the I1 check could never pass.
- `harness.mjs`: line-for-line Node port of `harness.py`, plus three new export names.

## 4. Requirement matrix (master prompt sections; additional audit/UX layer at the end)
| ID | Requirement | Status | Evidence / tests | Remaining risk → next action |
|---|---|---|---|---|
| MP-2 | Correct entry point; candidate preserved; nothing deployed | VERIFIED | blobs above; Vite build of index.html → main.jsx → App.jsx | Production (Vercel) not compared → compare when authorised |
| MP-3.1 | `expense_ledger_v5` permanent | VERIFIED | core §5/§11, e2e_import R1–R4 pass; key untouched in the diff | — |
| MP-3.2 | Recovery copy before destructive steps; saving blocked if the copy fails | VERIFIED | core §5, §11; e2e_import R1, R4 ("original byte-for-byte untouched") | — |
| MP-3.3 | Preserve legacy ids | NEEDS WORK (suspected, not reproduced) | `normaliseTxn` replaces non-numeric ids (App.jsx:247) | Write a test for string or UUID ids through merge import; decide the rule |
| MP-4 | Strict money input on every path | VERIFIED for forms, prompts and CSV; NEEDS WORK (suspected) for JSON numbers | e2e A/B, e2e_import I1, data tests | JSON numbers like 12.345 or 1e-9 are accepted (App.jsx:33,38) → test and decide whether to round or reject |
| MP-5 | Negative imported amounts never flipped | VERIFIED | e2e_import I1 ("−5 did not become +5"); data tests | — |
| MP-6 | Settings, versions, merge/replace, CSV edge cases validated | VERIFIED (covered paths) | e2e_import I2–I6; data tests | Formula injection on CSV export not assessed |
| MP-7A | Safe to Spend never optimistic; schedules vs occurrences | VERIFIED (D1 fixed) | finance §19; phase2 P2-B; e2e_phase2 E2-B | Schedule identity by merchant spelling: suspected → add tests |
| MP-7B | Month-aware pace and budgets | VERIFIED | finance §20 (28/29/30/31-day months, leap year, year boundary) | — |
| MP-7C | Insights supported by numbers; per-day vs totals | VERIFIED for weekday/weekend (D2); NEEDS WORK for the day-of-week insight | phase2 P2-A, finance §21, e2e_phase2 E2-A | Screenshot shows "Sundays average 1234468% more per transaction (4 vs 4)": correct arithmetic, but an extreme percentage on 4 samples → cap or reword |
| MP-7D | Goals: dates, overdue, no contribution, malformed data | VERIFIED | finance §22 | — |
| MP-7E | Numeric stability | VERIFIED (sums, display rounding) | finance §23 | Sub-cent JSON amounts, see MP-4 |
| MP-8.1 | Recovery notice cannot be replaced by toasts | VERIFIED | e2e_import R1 | — |
| MP-8.2 | Undo restores exactly; never erases newer work | VERIFIED | e2e_import I2, U1 | — |
| MP-8.3 | Export started ≠ backup kept; reminder consistent | VERIFIED (D3) | phase2 P2-C; e2e_phase2 E2-C; e2e_import I6 | Settings "not confirmed" sentence is approximate when the file is >7 days old → minor wording |
| MP-9 | Apple-design language (gestures, materials, reduced transparency/contrast, focus) | NEEDS WORK | e2e_ux S2 fails/crashes; patch_H not applied | Inspect `patch_H_design.py`, apply in the working copy, run e2e_ux in full |
| MP-10 | 320/360/390/desktop, no overflow, keyboard, text size | IMPLEMENTED BUT UNVERIFIED (app-wide); VERIFIED for the components changed in this phase | e2e_phase2_layout 24/24; e2e_ux S4–S7 never reached | Run e2e_ux S4–S7 once S2 passes |
| MP-11 | Full regression on the exact final candidate | VERIFIED for logic, e2e, import and build; BLOCKED for the 42-screen layout audit | table above | "42-screen audit" file not found anywhere; the only layout_audit.mjs is the weak version → ask the user for it, or write one |
| AUD-OFF | Offline launch (audit §3) | NEEDS WORK | Fonts load from Google (App.jsx:1173+); no service worker | Separate task |
| UX-AZ | Azerbaijani localisation (UX brief) | NEEDS WORK (not started) | strings hard-coded in English | Separate task after MP items |
| AUD-TEST | Test integrity: no silent skips; failures loud | VERIFIED for the suites run | count-based `finish()`, phase2 `need()` | Version-B files in Downloads remain misleading; don't use them |

## 5. Prioritised backlog
1. Confirmed defects: none left open among those found in this phase.
2. Missing coverage: legacy string ids in merge import (MP-3.3); JSON sub-cent amounts (MP-4); recurring-schedule identity with spelling variants (MP-7A); the 42-screen layout audit (MP-11).
3. Suspected risks: day-of-week insight with extreme percentages on tiny samples (MP-7C); CSV formula injection.
4. Design and quality: apply and verify patch_H (MP-9), then run e2e_ux in full (MP-10); offline launch (AUD-OFF); localisation (UX-AZ).

## 6. Resumption
- Open `Expense-ledger2-fixes` and read this file and `EXPENSE_LEDGER_MASTER_PROMPT.md` (in the main repo).
- Rerun the three commands in §3; the expected results are in the table.
- `node_modules/`, `dist/`, `page/`, `tests/.out/` are disposable. Test tools (puppeteer-core, @fontsource) were installed with `--no-save`, so a plain `npm install` removes them. Reinstall with `npm install --no-save puppeteer-core @fontsource/playfair-display @fontsource/dm-sans`.
- To publish: the user reviews the diff, then decides on commit/PR. Nothing has been committed.
