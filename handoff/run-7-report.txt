# Claude Implementation Report — 2026-10-27 — Run 7

Owner's instruction (2026-10-27): "You decide the work order. And do it all" — the two new Work Plan directives (Azerbaijani localization + unified monthly analysis; Android video audit V1–V9). Runs 5–6 (data safety) were finished first, as both directives require.

## 1. Order chosen and why
1. **V9 comparison windows** — a money-meaning problem (current month-to-date compared with a whole previous month), so first.
2. **V1/V2/V4/V3** — small wording/number fixes on the same screens.
3. **Monthly + Analytics merged** — built on the corrected comparison.
4. **Azerbaijani audit** — automatic checks + a rendered review sheet for a native speaker.
5. Full tests, clean room, then one preview with Runs 5–7 for a single phone test.

## 2. Changes
| ID | Finding | Change | Proof |
|---|---|---|---|
| V9 | "494.19 less than September" compared 1–27 Oct with all of September | `comparisonWindow()`: a month under way is compared with the **same days** of the previous month (all of a shorter month once today's day is past its end); a finished month with the whole previous month; a future month not at all. `calcMonthSummary` returns `cmpKind`/`cmpDays`/`prevFullExp`; `calcWhatChanged` uses the same window; the Analytics projection colour compares a full-month forecast with the full previous month | `tests/logic/run7.test.mjs` 12 checks — **9 failed before the fix** (log 162). Cases: 27 Oct, 31 Oct (30-day Sep), 30 Mar 2026 (Feb 28), 29 Mar 2024 (leap Feb 29), 15 Jan 2027 (Dec, year boundary), 1 Oct (day 1), past month, future month, What changed |
| V1 | `monthShort(prv)` slotted into sentences ("sen ilə müqayisədə") | New `cmp.*` texts name the window instead: en "… less than the same days last month" / "… than the previous month", az "keçən ayın eyni günləri ilə müqayisədə … az" / "əvvəlki ayla müqayisədə …", ru "… чем за те же дни прошлого месяца" / "… чем в предыдущем месяце"; a line "Days 1–27 of both months compared". Old keys removed | browser R7-3/R7-4; audit check C (0 now, 6 on a1b16e2) |
| V2 | Settings "Xalis fərq" unsigned, colour-only | Settings uses the same labels as Monthly: "Net surplus" / "Net deficit" / "Break-even" (az "Xalis kəsir" …); Home balance tile shows "−" when negative | browser R7-5 |
| V4 | Home "1.1k ₼" for 1,050.00 | `fmtShort`: exact below 10,000 ("1,050.00 ₼"); above, "≈25.5k ₼" (marked approximate) | browser R7-6 at 320 and 390 px, 9,999.99 fits uncut |
| V3 | Date box shows 10/27/2026 in az | Cause: the phone's own date control follows the phone language (the app already sets `lang`; Chrome on Android ignores it). Fix: the Add form repeats the date under the box in the interface language ("27 oktyabr 2026"); the stored value stays YYYY-MM-DD | browser R7-7 |
| Merge | Analytics could not browse months; two overlapping tabs | One **Monthly** screen (tab label kept: it fits the bar in az/ru/en; "Aylıq təhlil" was ~2× longer). One month selector drives summary + comparison, pace/projection (current month), What changed, statistics, budgets, categories, merchants, top expenses, transaction list. **Every calendar month** from the first entry to today (or the last planned month) is selectable, empty months included. A **"Trends up to today"** section (6-month chart, patterns, day-of-week, unusual, same-day, 8-week heatmap) states it does not follow the selected month. Bottom bar 5 → 4 tabs; swipe order Home → Ledger → Monthly → Recurring. Content inventory: everything from both screens kept except Analytics' duplicate headline and its "surplus rate" line (the same % is on the income tile) | browser R7-1/R7-2/R7-8: 4 tabs; this month 40 → previous 600 (no stale figure); empty month selectable; first month disables Previous; finished-month wording; tab bar fits at 320/360/390 az |
| AZ audit | Full-language audit requested | `tests/az-audit.mjs`: 603 keys / 665 rendered forms; checks A (Turkish spellings), B (value slotted before a suffix), C (short month names in sentences) — all 0 on Run 7; on a1b16e2 B = 4, C = 6; a deliberate mutant ("ve") is caught by A. Writes `az-review-sheet.csv` (every text rendered with example values, az/en/ru, empty reviewer columns) + `az-review-README.txt` | logs 166–167 |
| First launch | three languages, none preselected | already implemented and tested (e2e_lang F1) — no change |
| V5 | goal/savings wording | in the review sheet for the native speaker; no change without review |
| V6 | record a bill payment | done in Run 6 ("Record payment") — the video was of the older preview |
| V7 | number format | unchanged (owner decision) |
| V8 | round black button | not in the app's code; cannot be attributed without the phone |

## 3. Tests actually run
| # | Where / candidate | Logic | Browser | Build | Logs |
|---|---|---|---|---|---|
| 1 | Worktree, new V9 test before the fix | run7: 9 failed / 3 passed | — | — | 162 |
| 2 | Worktree after the merge (first full browser run) | 483/483 | 243 passed + 1 failed + 116 missing — 3 files still assumed 5 tabs (fixed); e2e_import failed once (passed 5/5 alone, see §3) | — | 164–165 |
| 3 | Worktree, Run 7 final | **483/483**, 10 files | **360/360**, 13 files | OK `index-CmE-HPUE.js` 413.78 kB | 168–170 |
| 4 | **Clean room, Run 7 snapshot** (SHA-256 35D3A754… / 92A25AE0…) | **483/483**, 0 missing | **360/360**, 0 missing | OK — identical bundle `index-CmE-HPUE.js` | 171, 174–176 |
| 5 | Clean room, exact a1b16e2 (unchanged) | 435 + 48 failed (run5 5, run6 31, run7 9, i18n 2, phase3 1) | 318 + 28 failed + 14 missing (new/updated checks only) | — | 171–173 |
| 6 | AZ audit: Run 7 / a1b16e2 / mutant | A0 B0 C0 / B4 C6 / A1 | — | — | 166–167 |

Package 49 files, manifest verified (0 problems); Downloads 109/109; baseline untouched.

**Committed and pushed (owner: "do it all", preview only):** commit `34f877077901d0971d438f5685bc86d517807347` (parent a1b16e2) — App.jsx blob `b9250e01…`, i18n.js blob `9642d7c0…` = exactly the clean-room-tested files (gitblob-lf checked). Pushed to `preview-run3-add-guard-future-dates`; Vercel status success; preview https://expense-ledger2-5cdz35i9r-cavids-projects-85ffa093.vercel.app (Vercel login, HTTP 302 anonymously). **main/production unchanged at 86af1c1** (live site still serves `index-BmcfsH6A.js`). `tests/` still not committed.

## 3b. The e2e_import intermittent failure
In the first full browser run after the merge, "importing the same backup back → every transaction is recognised as already present" failed once and the file stopped at the missing Merge button. It then passed 5/5 alone and inside both later full runs (worktree and clean room); the logic layer re-imports its own backup correctly. Cause not identified — most likely download/upload timing in the shared download folder. The check now records the sheet text and file size if it fails again. Status: not a confirmed app defect; watch.

## 4. Requirement status
| Item | Status |
|---|---|
| V9 like-for-like comparisons | VERIFIED in tests (logic + browser) |
| V1, V2, V3, V4 | VERIFIED in tests (browser, en/az); real phone NOT ASSESSED |
| Monthly + Analytics merge | VERIFIED in tests (browser); real phone NOT ASSESSED |
| Azerbaijani automatic audit | VERIFIED (A/B/C = 0, detectors proven) |
| Azerbaijani wording quality | IMPLEMENTED BUT UNVERIFIED — native review sheet ready, not yet reviewed |
| Russian/English systematic review | NOT ASSESSED beyond automatic parity checks |
| V8 attribution | BLOCKED — needs the phone |

## 5. Next actions
1. **Owner — one phone test of the preview** (Runs 3–7 together). Steps: Monthly → go back through months (an empty month must show), check "same days last month" wording in az; Recurring → Record payment; Settings → Net surplus/deficit; Add form → date line under the box; max text size on all four tabs; Add form ×/Back guard. Then say "publish" (fast-forward main to 34f8770) or report a problem.
2. **Owner:** find a native Azerbaijani reviewer for `az-review-sheet.csv` (instructions in `az-review-README.txt`); approve committing `tests/`.
3. **ChatGPT:** review Runs 5–7 (the merge's content inventory; V9 policy; D9 words).
4. **Claude, next:** apply the native review when it comes back; master-prompt §8 (recovery notice vs toast priority, undo after newer state) explicit tests; V8 attribution on the phone.
