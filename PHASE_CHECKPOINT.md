## 0000. UPDATE 2026-10-30 ~17:05 Baku: LIVE main = 84c0771 (index-BVCGwlvo.js), rollback 70404a3. Owner rule implemented: loan payment = full cash outflow, interest-only counts as spending, unknown split counts nothing (optional loan:{interest} on the transaction; forSpending/loanCashOut; tests run17loancash 11 logic + e2e_run17_loancash 9). Clean room: logic 879, browser 847, az 0, 0 standby. Known limit: CSV round trip loses the loan field (re-imports as ordinary expense).

## 000. CURRENT STATE — RUN 17 LIVE (2026-10-30 ~16:10 Baku): production = main = 70404a3 (bundle index-DB-rXH8h.js). Rollback target: 74b15dc (index-yQnMbfD6.js).
Owner order: "do them ALL and then come back again" + standing OK to push when no known risk.
Shipped since 74b15dc (7 local commits, all fast-forwarded): 5dd9c57 add form + number pad, donut tap, month calendar; 1ebb562 Settings tab (profile name, language on page), overview -> Analytics, savings floor + templates -> Goals; 7e2a098 month-end forecast; ad044e9 Debts & loans page + categories release A; 8d8f92d broader subcategories; 691579f Coach card (R0, R1, R9, R13); 70404a3 "Get set up" checklist.
Evidence (clean room on commit 70404a3, npm ci): logic 868/868 (26 files); build OK; az audit 0/0/0; full browser 838/838 (39 files), 0 standby events. Files: handoff/run17-evidence/. Live smoke (throw-away browser, made-up data): checklist shown, Debts & loans opens, a debt saves as 12050 qapik.
Statuses: debts/loans, coach subset, forecast, checklist, Settings = IMPLEMENTED BUT UNVERIFIED on a real phone (VERIFIED in the test bundle only). az/ru wording of all new text = DRAFT, needs native review. Coach R2, R3, R4-R8, R10-R12, R14-R16 = NOT STARTED. First-run tour (guided overlay) = DEFERRED WITH REASON (checklist shipped instead). Forecast = simplified vs the research algorithm (no history shrinkage).
Open questions for owner: (1) loan payment is recorded as the FULL payment expense (cash-flow view) - confirm or switch to interest-only; (2) which Coach rules next; (3) native az/ru review.
Do not repeat: Debts UI, categories A/B, coach R0/R1/R9/R13, checklist. Next: native review + real-phone check of the PWA/APK, then Coach R3/R4/R6, loan extra-payment (R12).
## 00. CURRENT STATE — RUN 13 COMPLETE, awaiting ChatGPT review (2026-10-28 evening). Report: handoff/run-13-report.md (Notion: https://app.notion.com/p/4077ff36825e8184b6c9c4f923d63770). LOCAL and UNCOMMITTED; production = preview = main = 12a0c19.
- Frozen candidate: App.jsx FA568979A63BFC57D656D4C3A44414B81F976DF2ABA2F7779E9EDA948867EFED, i18n.js 4F7AEA2F7C2B8FA63F4C217F99AF8D26E0D3604A30CCC846BB80B3C186798CBA (snapshot handoff/snapshots/20261028-run13-final). Recovery copy of the Run 12 start: C:\Users\cavid\ExpenseLedgerBackups\run13-start-20261028-1647.
- Definitive clean-install run (logs 295–299): logic 646/646, build OK index-CgDY5-6n.js, az audit 0/0/0, browser 533/533 twice, 0 missing. Failed attempts (282–286 my chain test's download wait; 290–294 two files stopped while the PC was in Modern Standby) are kept.
- Confirmed: the live v9 app erases bills and payment links just by starting. New: bills mirror (expense_ledger_v5__bills_mirror) + explicit restore offer; Replace-with-v9 sheet note; warning for an unreadable entry list; native-share hand-over (window.__ledgerNativeShare) for the Android shell (source handoff/native/). Rollback = recoverable after restore, NOT safe: never roll production back past the bills release without a v10 backup.
- Browser-test crashes: probable cause Windows Modern Standby (3/3). Hold the computer awake (request_keep_awake) for long runs; check event ids 506/507 afterwards. See charter.
- Android: debug APK (SHA-256 A39FF762C30E6FA3B8310747EC7B7BCE0C8F29B9196E89383632DCC1CD6A7A33, built outside OneDrive via init script) NEVER RUN. Device tests BLOCKED/NOT ASSESSED; checklist handoff/run13-android-phone-checklist.md.
- Open owner decisions: emulator image download (~1.5 GB) or phone test; pin test tools + commit package-lock.json/tests; permanent Android app ID; native az/ru review; any preview push (owner: "no preview for now"). Not started: Business Mode research assignment in the Work Plan.
**Autonomous schedule (2026-10-28):** 4 scheduled tasks run unattended from handoff/AUTONOMOUS_CHARTER.md + AUTONOMOUS_BACKLOG.md + autonomous-log.md (no commit/push/publish; owner said no preview for now). Read the log first each interactive session and verify its claims.

## 0. CURRENT STATE — Run 12 REVIEW FINDINGS (advisor review, before any push) — **ALL FOUR FIXED AND TESTED** (handoff/run-12-report.md §6; a SECOND review found the delete fix itself regressed (paused group resurrected the bill on Convert and blocked new bills) → final design: deleted bill\'s payments become ordinary entries; reload round-trip test added; final code: logic 575/575, browser 469/469 (one unexplained intermittent crash in one run), build OK; fresh-install run on the final snapshot: logic 575/575, build OK, browser 457/0/12-missing because e2e_run5 hit a Chrome ProtocolError — rerun alone in the same fresh copy 12/12; browser-process instability recorded as an open test-infrastructure risk; logs 231–235)
1. **Mixed state** (old recurring payments + some bills): AddEditOverlay ignores prefill.billId when hasInferred, and the detail sheet calls onLinkBill (no billId) for bill schedules → "Record payment" on a bill saves a payment with no billId → bill stays unpaid + new inferred schedule = double reservation. Fix: a known billId always links; only "new bill from entry" is gated.
2. **All-bills mode defaults to "new bill"** → adding the same recurring rent via + each month creates a new bill each time (reservation grows). Fix: ask "payment of <bill> or new bill?" when a same-type same-name bill exists; never link silently.
3. **Deleting a bill with payments** leaves recurring:true → payments regroup as an old-style active schedule and are reserved again. Fix: payments become paused (isActive:false), Undo restores.
4. **Converting loses month-end due day** (28 Feb + 31 Mar → anchor clamps to 28th forever). Fix: optional bill.dueDay set by the converter, accepted by validateBill, used by scheduleOccurrences.
Also: run az-audit on the ~45 new texts; final clean room AFTER fixes (the running one tests an outdated snapshot); tell the owner at push time: preview has separate storage; a v10 backup is refused by the live v9 app until Run 12 is published; rollback drops bills and links. Ruflo connector needs the owner to re-authorize (/mcp) — not retried.

# Expense Ledger — project checkpoint (updated 2026-10-26, end of Run 1: Phase 4 + insight fixes D18–D21)

Single shared record for the universal completion work. It replaces `PHASE2_CHECKPOINT.md` (kept in `tests/original/`
as history). Nothing has been committed, pushed or deployed.

## 0. CURRENT STATE — 2026-10-27 ~late evening: Run 12 (explicit bills) LOCAL, UNCOMMITTED on top of production 12a0c19
- Production = preview = 12a0c19 (live `index-qcNPZ8fB.js`; Run 11 logs 219–222 tie to this source, App.jsx SHA 7C8A9B55…). Run 12 only in the worktree: App.jsx SHA 3AB35AB0…, i18n.js 88810EDC….
- Run 12 (`handoff/run-12-report.md`): bills are their own records (`bills` + payment `billId`, backup format 10); old data converted only by an explicit "Convert to bills" step (recovery copy + Undo); split/move/new bill from a payment; Recurring "+" = Add bill; bill form; Record payment preselects the bill. Fixes the confirmed collision (Safe to Spend 1,982 → 1,892 in the fixture). Tests: bills.test 34 (written first), e2e_run12 17; logic 572/572, browser 451/451, build OK (logs 223–230).
- Mobile prompt assessed (report §1). Android debug APK built by a helper in `../Expense-ledger2-capacitor` (branch claude/capacitor-spike, local only): UNVERIFIED, never run; key finding: native backup export needs Filesystem+Share.
- Owner decisions needed: commit + preview push of Run 12; Play account + 12 testers; phone/emulator for the Android test; permanent app ID; Mac/cloud for iOS.

## 0-prev13. 2026-10-27 ~23:15 Baku: Run 11 RELEASED — production main = 12a0c19 (owner: "Yes, publish 12a0c19 to the live site.")
- main fast-forwarded ef12ada → 12a0c19; Vercel production success; live serves index-qcNPZ8fB.js (= tested build, log 221). Live offline check 10/10 (log 222).
- Phones running ef12ada: the update notice arrives from this release on; this one time the phone picks it up on the next normal app reload. More → "Version qcNPZ8fB" confirms it.
- Next: explicit bill list (tests first); Google Drive automatic backup (owner's Google setup).

## 0-prev12. 2026-10-27 ~23:00 Baku: owner confirmed offline works on the phone; Run 11 (update notice) on preview 12a0c19, awaiting "publish"
- Owner: "it works" (installed app offline). Reported (1) the live site kept showing the previous version after releases; (2) Remote Control disconnects while away.
- (1) Run 11: when the app returns to the screen (and every 30 min, at most every 20 s) it compares its script hash with the site's (`/?v=` bypasses saved copies) and offers "A new version of the app is ready — Update"; More shows "Version <hash>". Tests: `run11.test.mjs` 7/7; offline-check now 15 (PWA-0c: open page notices a release, Update loads it) — 15/15 (log 218); logic 538/538, browser 434/434, build OK (219–221). Cause of the owner's stale versions not observed directly — most likely an app kept in memory.
- (2) Windows log (read-only): daytime Modern Standby entries all Reason=12 (idle timeout) with the lid open; power plan: screen off 3 min, sleep 5 min AC / 3 min battery; app keep-awake only holds during active turns. System settings are the owner's to change (instructions given).

## 0-prev11. 2026-10-27 ~22:15 Baku: offline fix RELEASED — production main = ef12ada (owner: "I didn't check it but do it anyway")
- main fast-forwarded 29bba7e → ef12ada; Vercel production success; live serves `sw.js` = ledger-shell-v2 and bundle index-GHsaJrEd.js.
- Live strict offline check 10/10 (log 217) — incl. "after one visit the app's code is saved", which failed on the live site before the fix (log 212). (The v1→v2 update test runs locally only: passed, log 213.)
- Owner's phone: open the installed app once online (~10 s), then airplane mode → should open. Still not confirmed on a real phone.
- Next: explicit bill list (tests first); Google Drive automatic backup (owner's Google setup).

## 0-prev10. 2026-10-27 ~22:00 Baku: LIVE BUG found by the owner + fix on preview (ef12ada), awaiting "publish"
- Owner: installed app (Chrome install) + airplane mode → **blank screen**. Root cause CONFIRMED: service worker v1 saved the page but not `/assets/index-GHsaJrEd.js` (downloaded before the worker started); my earlier offline test reloaded online first and desktop Chrome's HTTP cache hid the gap (log 212: strict check fails on live).
- Fix `public/sw.js` v2 (`ledger-shell-v2`): reads the page and saves every /assets/ file it names on install and on each online visit; lookups ignore Vary. Phones with v1 are repaired by opening the app once online after publishing.
- Tests: `tests/pwa/offline-check.mjs` now 12 checks incl. the owner's path (one visit, then offline with HTTP cache off) and the update from v1 (fixture `tests/pwa/sw-v1-fixture.js`): 12/12 (log 213); logic 531/531, browser 434/434, build OK (214–216). Vercel sends no Vary header (checked) — the blank screen was the missing code file alone.
- Commit `ef12ada` (sw.js only) on the preview branch; production still 29bba7e.

## 0-prev9. 2026-10-27 ~21:00 Baku: RELEASED — production main = 29bba7e (owner: "Yes, publish — update the live site to the tested version 29bba7e")
- `main` fast-forwarded 86af1c1 → 29bba7e (Runs 3–10, no merge). Vercel production deploy success; https://expense-ledger2.vercel.app serves `index-GHsaJrEd.js` (= the locally tested build, log 208) and links `/manifest.webmanifest`.
- Live check in a throw-away browser with synthetic data (`LIVE_URL=… node tests/pwa/offline-check.mjs`, log 209): 8/8 — manifest, service worker active, opens offline with saved data, data untouched, only own files cached.
- Rollback if needed: Vercel "Instant Rollback" to the previous production deployment, or point main back to 86af1c1 (owner approval). Stored data is compatible either way (same key, same model).
- Not yet done: owner's real-phone check (install, airplane mode, Data safety = On). Next: explicit bill list (tests first); Google Drive automatic backup (needs owner's Google setup).

## 0-prev8. 2026-10-27 ~20:30 Baku: Runs 9 + 10 on the PREVIEW (commit 29bba7e); production 86af1c1 untouched
- Owner delegated the open decisions to Claude/ChatGPT and asked for a preview link. Commit `29bba7e` (parent 802fca4): App.jsx, i18n.js, main.jsx, index.html, public/sw.js, public/manifest.webmanifest. Pushed to `preview-run3-add-guard-future-dates`; Vercel success; https://expense-ledger2-ma1ury2ls-cavids-projects-85ffa093.vercel.app (Vercel login). tests/, handoff/, checkpoint uncommitted.
- Run 10 (`handoff/run-10-report.md`): storage protection, offline service worker, stable dark manifest, share-menu backup, install offer. Tests: logic 531/531, browser 434/434 (logs 206–207), offline check 8/8 (`tests/pwa/offline-check.mjs`, log 205), build OK (208).
- Decisions: explicit bill list (NEXT, tests first); weekly backup reminder; data safety in 3 layers — layer 3 (automatic backup to the user's Google Drive) needs the owner's free Google Cloud OAuth client.

## 0-prev7. 2026-10-27 ~19:30 Baku: Run 9 LOCAL and UNCOMMITTED on top of preview 802fca4
- Run 9 (`handoff/run-9-report.md`, assessment `handoff/claude-assessment-2026-10-27.md`): Add-form contrast fix; gear removed, contextual "+", privacy mode (session-only); "This was a payment of a recurring bill" linking with Undo; Safe to Spend calculation on tap (no-recurring caveat always visible); What changed + pace card removed from Home; compact backup reminder; Caspian palette (income #8BD97A, dark text on teal). New test `tests/browser/e2e_run9.mjs` (49). App.jsx SHA-256 D5F39886…E546FD, i18n.js 56201BB0…F4D81.
- Tests: clean room logic 520/520, browser 418/418, build OK index-CKDslnq6.js (logs 198–202); az audit 0/0/0 (203).
- Waiting on owner: bill model (explicit bills recommended), storage.persist + offline, backup-reminder policy, phone test; no commit/push in Run 9.

## 0-prev6. 2026-10-27 ~18:00 Baku: Run 8 + redesign COMMITTED and on the PREVIEW (owner: "commit … push a preview … Don't touch production")
- Commit `802fca494f8efec675573d4ebcd1808faa1198e9` (parent 34f8770): only App.jsx (blob f34bd218 = clean-room snapshot B078F321…) and i18n.js (blob 9a4d3c33). Pushed to `preview-run3-add-guard-future-dates`; Vercel success; preview https://expense-ledger2-lts6tjhxj-cavids-projects-85ffa093.vercel.app (Vercel login). **main/production 86af1c1 untouched; live site still serves index-BmcfsH6A.js.** tests/, handoff/, checkpoint still uncommitted.
- Next: owner phone test of the preview → only on "publish", fast-forward main to 802fca4.

## 0-prev5. End of Run 8 + visual redesign, before the commit (~17:45 Baku)
- **Git:** unchanged since Run 7 — HEAD/preview `34f8770`, main/production `86af1c1`. **Run 8 and the redesign are local and UNCOMMITTED** (App.jsx SHA-256 B078F321…20CF14, i18n.js 691E0C7B…9940D3; tests/, handoff/ untracked). Nothing pushed, published or deployed.
- **Run 8** (`handoff/run-8-report.md`; Run 8-only code kept in `handoff/run-8-snapshot/`): items 1 dates, 2 categories, 3 partial Replace, 5 due day, 6 undo queue, 10 isActive null, 11 fingerprint — VERIFIED; item 4 (two bills merge, Safe to Spend overstated) NEEDS WORK, plan `handoff/run-8-item4-migration-plan.md` awaits agreement; 8 not reproduced; 9 NOT ASSESSED; 12–14 BLOCKED (phone / native reviewer / owner).
- **Redesign** (`handoff/redesign/REDESIGN_REPORT_2026-10-27.md`, `handoff/redesign/compare.html`): dark tokens, system font (no Google Fonts), 5 tabs Home · Transactions · Analytics · Goals · More; new pages Budgets & Goals, More, Import / Export (budget/goal/import/backup controls moved out of Settings); Home "This month" card + spending ring; Analytics spending-trend chart. Pure functions `pctShares`, `donutSlices`, `cumulativeByDay`, `greetingKey` live in the logic section (tested by `tests/logic/redesign.test.mjs`, 16 checks, 4/4 mutants caught). Tests migrated to the new navigation (helpers `tab()` by position, `openData`, `openGoals` in tests/browser/lib.mjs). Screenshot script `tests/visual/redesign-shots.mjs` (synthetic data).
- **Tests:** clean room (logs 187–191) logic **520/520**, browser **369/369**, build OK `index-q46qzZvk.js`; az audit 0/0/0 (log 192). Run 8 alone: logic 504/504, browser 368/369 with a load-sensitive gesture check that passed 3/3 alone (logs 180–183).
- **Next:** owner looks at `handoff/redesign/compare.html`; decide dark-only vs a light/dark switch; then (only on approval) commit + preview push for a phone test; item 4 plan agreement; native az/ru review of ~40 new texts; Run 7 review (item 9).

## 0-prev4. State at the end of Run 7 (~13:00 Baku)
- **Git:** commit `34f8770` = Runs 5–7 (App.jsx blob b9250e01, i18n.js 9642d7c0; parent a1b16e2) on local branch and pushed to GitHub `preview-run3-add-guard-future-dates` (owner: "do it all"). Vercel preview success: https://expense-ledger2-5cdz35i9r-cavids-projects-85ffa093.vercel.app. **main/production 86af1c1 untouched.** `tests/`, handoff/, checkpoint still untracked.
- **Run 7:** V9 `comparisonWindow()` (same days while a month is under way), `cmp.*` texts (V1), Settings Net surplus/deficit + Home "−" (V2), date read-out under the Add-form date box (V3), exact amounts < 10,000 (V4); Monthly + Analytics merged into one `MonthlyView` (4 tabs, every calendar month incl. empty ones, "Trends up to today" section); `tests/az-audit.mjs` + `handoff/az-review-sheet.csv`.
- **Tests:** clean room (log 171–176) logic 483/483, browser 360/360, build OK `index-CmE-HPUE.js`; a1b16e2 fails only the new/updated checks.
- **Reports:** Run 5 https://app.notion.com/p/4067ff36825e816bbcb0fa6f7710f2dd · Run 6 https://app.notion.com/p/4067ff36825e81ce9a72ed53d5ad0c0d · Run 7 https://app.notion.com/p/4067ff36825e819bb15af28bde4619be (all read back, zips hash-verified).
- **Watch:** e2e_import "same backup back" failed once in a full run (passed 6× since); now logs sheet text on failure.
- **Next:** owner phone test → "publish" (fast-forward main to 34f8770); native az review; approve committing tests/; ChatGPT review of Runs 5–7.

## 0-prev3. State during Run 6 (~12:00 Baku)
- **Git:** HEAD `a1b16e2` (= GitHub preview branch). main/production `86af1c1` untouched. **Runs 5 and 6 are local and UNCOMMITTED** (App.jsx, i18n.js, tests/). Nothing pushed or deployed since Run 4.
- **Run 5 (done, Notion report https://app.notion.com/p/4067ff36825e816bbcb0fa6f7710f2dd, read back, zip hash-verified):** count guard (`tests/expected-counts.json`, `count-guard.mjs`), source identity (`identity.mjs`, prints gitblob-lf), package builder (`make-package.mjs`), no stale fallbacks, silent conditional checks removed, e2e_ux timing fixes, Safe to Spend "of which dated later" line + "Recorded expenses".
- **Run 6 (ChatGPT research D1–D22, all in App.jsx/i18n.js):** D16–D18 fail-closed storage reads (`readKey`, `SAVE_BLOCKED_READ`, banner `banner.readPaused`); D8/D14 `plan.canReplace` + settings-only button; D9/D15 `flagValue` (true/false or the words; else refused); D13/D22 whole cents everywhere (`isWholeCents` = `Number(n.toFixed(2))===n`, phase3 test contract updated); D1 subcategory in `scheduleKey`; D19/D21 `scheduleDueDay`; D20 Recurring "Record payment" + hint; D10 same-file identical-row warning; D2 checked (manifest IS in the build). e2e_bigtext: browser per scenario + 90 s protocol timeout + one reported retry on browser faults only.
- **Tests (worktree, Run 6 final file):** logic 472/472 (9 files, log 156); browser e2e_import 51/51 and e2e_run6 14/14 after the banner change (full browser 338/339 before it, log 154: the one failure was the deliberately changed R2 banner check). Full clean room: running (logs 157–161).
- **Deliberate disagreement with ChatGPT:** isActive "true"/"false" words are read as written (ChatGPT asked to refuse them); reason in the Run 6 report.
- **Next:** finish clean room → Run 6 report in Notion (read back) → Living Checkpoint section 0 → owner: approve commit + preview push of Runs 5–6 for one phone test; approve committing tests/; persist() design.

## 0-prev2. State at the end of Run 4 (~08:00 Baku)
- **Owner's instruction (~06:20):** "Do the necessary work until I'm back, you can send the preview … Gpt will review everything you did at 8:30."
- **Committed (local branch `fix/financial-correctness-2026-10-26`):** `ceea095` = Run 3 exactly as tested (App 908b1f60, i18n e972bc24), then `a1b16e2` = Run 4 (App `9d29737121d0638566e28e90ffd1ca8ea37deeb4`, i18n unchanged). Only App.jsx/i18n.js are committed; `tests/` is still untracked.
- **Pushed to PREVIEW only:** GitHub branch `preview-run3-add-guard-future-dates` → a1b16e2. Vercel preview success: https://expense-ledger2-6c4hvmo7v-cavids-projects-85ffa093.vercel.app (Vercel login). **main/production still 86af1c1.** Release = fast-forward main to a1b16e2, only on the owner's word after the phone test.
- **D26 enlarged text (Run 4):** new `tests/browser/e2e_bigtext.mjs` (25 checks: page zoom 130/150/200 % as 300/260/195-px viewports, and Chrome minimum font size 16; en/az/ru; 7 screens). Before fix on ceea095: 9 failed (log 114b). Fixes are CSS only: `.tab-lbl` clamp(5.5px,2.85vw,10.5px)+wrap (old ≤360 px 9.5-px override removed); new `@media (max-width:280px)` block (rows wrap, grids single column, chips/banner/settings rows/milestones wrap, inputs min-width 0); classes `month-stats`, `detail-meta`, `goal-milestones`; Ledger header flexWrap.
- **Final tests on a1b16e2:** logic 414/414, browser 312/312 (10 files), build OK `index-BQkS0eIO.js` (logs 118–120). Downloads 112/112 unchanged by runs. Baseline untouched.
- **Notion:** Run 4 report https://app.notion.com/p/4067ff36825e81579a28d95892526fd2 (attachments read back; one hash-verified), with a proposed agenda for ChatGPT (§5). Living Checkpoint section 0 updated.
- **Next:** read ChatGPT's review of Runs 3+4; owner phone test; owner approvals (tests/ commit, data-safety plan — recommend storage.persist first).

## 0-prev. State at the end of Run 3
- **Production:** `86af1c1` (App 9da824e1, i18n b45a850c), live at https://expense-ledger2.vercel.app.
- **Local candidate (uncommitted, NOT released):** App.jsx `908b1f601b955e5f39d768ef0d7e35d1e3012456`, i18n.js `e972bc241b6d81e2d6833375674bb78faf0a117f`. **D25** (addendum): the Recurring Pause/Reactivate button was 32 px high; it is now 36. It was found by the new `tests/browser/e2e_ux_lang.mjs` (az/ru touch targets and contrast; before-fix log `109-…`). **FINAL tests: logic 414/414, browser 287/287 (9 files), build OK (`111-…`, `112-…`, `113-…`).** az/ru contrast and touch targets are VERIFIED. The Run 3 changes are:
  - **D22** — Add-form unsaved-input guard on ×, Cancel, Escape and Back.
  - **D23** — future-dated entries are "planned", not counted in spent/income/budgets/statistics/insights/what-changed. `happenedIn()` and `PlannedNote` were added; Safe to Spend still uses `totalExp`.
  - **D24** — a one-month spike is no longer called a trend (`ins.lastMonthChange`).
- **Tests on the candidate:** logic 414/414, browser 279/279, build OK (`106-…`, `107-…`, `108-…`).
  - New tests: `tests/logic/run3.test.mjs` and `tests/browser/e2e_run3.mjs`.
  - Mutants: `104-…` and `104b-…`, both caught.
  - Before-fix logs: `99-…` and `101-…`.
- **Reproducibility:** the clean room (git archive 86af1c1 + test package + fresh npm install) reproduced 395/395, 242/242 and the identical bundle (`98-…`). Instructions are in `tests/README-TESTS.md`; the package and manifest are attached to the Run 3 Notion report.
- **Offline (`105-…`):** the app does not open offline (no service worker), and storage is not persisted. The plan, which needs approval, is in the Run 3 report §6.
- **Notion:**
  - Run 3 report: https://app.notion.com/p/4057ff36825e81f6968ddf2a9787cef3
  - Living Checkpoint section 0 updated
  - ChatGPT reviews (Run 1 R1–R3, Run 2 R1–R5) all dispositioned (ACCEPT)
- **Waiting for the owner:**
  - commit `tests/`
  - Run 3 preview → phone test → release
  - data-safety plan approvals
  - native az/ru review, number format, Russian font
- **Next:** read ChatGPT's Run 3 review first.

## 1. Source identity (history)
| Item | Value |
|---|---|
| Protected baseline | `Expense-ledger2/App.jsx`, commit `6fb8cd1`, git blob `53a3203f…`, **unchanged** (checked at the end of this phase) |
| Alternate copy | `C:\Users\cavid\Downloads\expense-tracker.jsx`, blob `53a3203f…` (byte-identical to the baseline), unchanged |
| Working copy | git worktree `Expense-ledger2-fixes`, local branch `fix/financial-correctness-2026-10-26` |
| **Production now (2026-10-26, Run 2)** | `86af1c1` = App.jsx 9da824e1 + i18n.js b45a850c (owner's phone bugs: Ledger sheets placed off-screen by the leftover `.page` transform; search crash from shadowed `t`; category list per type; phone Back button; swipe between sections). Owner tested the preview on their phone and asked to publish. `main` fast-forwarded `ec900de → 86af1c1`. Vercel production deployment 7340300864: success; https://expense-ledger2.vercel.app serves `index-BmcfsH6A.js` (the tested bundle). Tests on 86af1c1: logic 395/395, browser 242/242 (`95-…`, `96-…`, `97-…`; new `e2e_run2.mjs`, before-fix log `93-…`). Rollback: Vercel Instant Rollback to ec900de, or a revert commit (owner approval). |
| Release candidate commit (2026-10-26, owner asked to upload to GitHub if safe) | `ec900de` = `App.jsx` 45bc3863 + `i18n.js` 693f1303 only (tests and evidence are not committed), on local branches `fix/financial-correctness-2026-10-26` and `release-candidate-2026-10-26` (same commit). A clean copy of origin/main plus these 2 files builds the identical bundle (`index-Bq5YwW6k.js`) and passed a real-browser smoke test (chooser → English → add 7.50 → totals; no console errors). **PUSHED 2026-10-26** to GitHub as branch `release-candidate-2026-10-26` (GitHub CLI 2.103.2 installed with the owner's approval; signed in as Cavid1937; repo-local git credential helper = gh). Verified through the GitHub API: the remote blobs are App.jsx 45bc3863 and i18n.js 693f1303, only these 2 files differ from main, and the branch is 1 commit ahead. Vercel built it as a **Preview** (deployment 7339693883, status success): https://expense-ledger2-3jq1zuxmi-cavids-projects-85ffa093.vercel.app (protected by Vercel login). **RELEASED TO PRODUCTION 2026-10-26** after the owner tested the preview on their phone and explicitly asked to publish. GitHub `main` was fast-forwarded `6fb8cd1 → ec900de` (no merge commit; the exact tested commit). Vercel production deployment 7339790652: success. https://expense-ledger2.vercel.app serves `assets/index-Bq5YwW6k.js`, the identical bundle that was tested. **Rollback, if ever needed:** in Vercel use "Instant Rollback" to the previous production deployment, or push a revert commit of `ec900de` to main (owner approval needed). The local `main` checkout in `Expense-ledger2` is still at `6fb8cd1` (not pulled; the protected-baseline folder is unchanged). The repo is PUBLIC. |
| Current candidate (Run 1 final: Phase 4 + D18–D21) | `App.jsx` blob `45bc3863a1ef6b42ea0d5f5efc9aafe6739ef02d` + `i18n.js` blob `693f1303c31d3b88a38794000f6aa2c79a588b73` (9d46ca9f plus a one-line comment correction). Earlier: after D20 App `cd0a72cc…`/i18n `9825f608…`; after D18 App `24baa2e3…`/i18n `43b2703b…`; end of Phase 4 App `51c38da1…`/i18n `a4a72b3f…` |
| Snapshots | `tests/original/App.jsx.baseline-6fb8cd1`, `App.jsx.phase2-83b9b70c`, `App.jsx.phase3-1ed61f4a` |
| Diffs | `tests/evidence/58-final-App.jsx.diff` (Phase 3 vs baseline), `59-phase3-only-App.jsx.diff`, `77-phase4-only-App.jsx.diff` (130 lines added, 16 removed) |
| Environment | Windows 11, Node.js 24.22.1 LTS, npm 11.19.1, Chrome 156 headless (throw-away profiles, downloads to a temp folder), Vite 5.4.21 |

Documents used: `EXPENSE_LEDGER_MASTER_PROMPT.md` (authoritative, unchanged), `Downloads\SKILL.md` (apple-design), the
interim engineering audit, the UX/Azerbaijani brief, and `CLAUDE_LANGUAGE_INTEGRATION_ASSIGNMENT.md`.
**Missing:** `expense-ledger-translations.draft.json`, named by the language assignment, and
`PRODUCT_VISION_AND_STRATEGIC_NORTH_STAR.md`, named in the operating instructions. Neither exists in Downloads, Desktop,
OneDrive or GitHub. The UX brief's glossary was used instead.

## 2. What changed, by phase
**Phase 2:**
- Safe to Spend counts only income received so far (D1).
- The Analytics weekday/weekend comparison uses per-day averages (D2).
- The backup reminder needs the user to confirm they have the file (D3).
- Safe to Spend amounts no longer wrap at 320px (D4).

**Phase 3, data integrity (logic):**
| ID | Defect (shown failing on the pre-fix code, `33-phase3-tests-before-fix.txt`) | Fix |
|---|---|---|
| D5 | Non-numeric ids (UUIDs, `"a"`) were replaced by random numbers on load and import, so merging a backup that contains them added duplicates. Unusable ids (`true`, `[]`, blank, `Infinity`) were kept, and `Infinity` turns into `null` when saved. | `normaliseTxn` keeps finite numbers and non-blank strings, and gives everything else a fresh id |
| D6 | JSON amounts with sub-cent precision (12.345, 1e-9, 0.30000000000000004) were imported as they were | `planImport` refuses them with the reason "more than 2 decimal places". Data already stored on the device is not re-checked, so loading never drops a record. |
| D7 | CSV export wrote cells starting with = + - @ tab CR, which a spreadsheet would run as formulas | export adds a leading apostrophe; the app's own CSV import removes it, so round trips stay exact |

**Phase 3, three languages and UX:**
- New dependency-free `i18n.js`: 579 entries, each with az, en and ru, plus Intl plural rules (ru one/few/many). App.jsx uses `t()`/`tn()` throughout, and the catalog is also checked automatically.
- **First launch:** a chooser with three equal options (Azərbaycan dili · English · Русский). Native radio buttons, no flags, nothing preselected, Continue disabled until a choice is made, headings shown in all three languages, and keyboard support (Tab, arrow keys, Enter).
- **Persistence:** the choice is saved as `language` inside `expense_ledger_v5`. It's never written into backup files, and imports never change it.
- **Existing users:** data saved by earlier versions (no `language` field) opens in English with no chooser. Only a genuinely empty install, or one saved with `language: null`, shows the chooser.
- **Settings:** a language switch at the top. Switching re-renders in place: the open sheet, half-filled forms, data and currency are all untouched.
- **Display-only translation:** category, subcategory, weekday and frequency names are translated on screen, while the stored values (ids, English subcategory names, CSV column and category names) don't change. Skip reasons stay internal codes.
- D8: Chrome has no Azerbaijani date data, so months showed as "2026 M10" and weekdays as "Tue" (`47-intl-az-check.txt`). Month and weekday names now come from the catalog: nominative and genitive forms in ru, a dotted İ in "İyun".
- D9: Safe to Spend switched on with no income received showed nothing at all. It now says when the figure will appear and how much income is expected later.
- D10: At 320px the upper-case tab labels ("ƏMƏLİYYATLAR", "TƏKRARLANAN") filled their tabs and ran together. Labels are now sentence case with no extra letter-spacing, 1px larger; the gap between labels is now 10px or more in every language (`53-tabbar-fit-after.txt`).
- D11, accessibility: the Add form close button, the detail sheet close button and the delete buttons had no accessible name. The Add form labels weren't linked to their fields. The Recurring and Safe to Spend switches didn't respond to the keyboard and had no names. Dialogs had no names. All fixed.
- A new user's starter template names follow the chosen language (only while untouched).

**Phase 4, design and accessibility (reviewed parts of `patch_H_design.py`; the original script is kept in `tests/original/`):**
| ID | Defect (evidence) | Fix |
|---|---|---|
| D12 | Secondary text was below WCAG AA: `--ink-3` 4.17:1 and `--ink-4` 1.96:1 | `--ink-3` #5F5A53 (6.22:1). `--ink-4` #6E6961 (≥ 4.53:1 on every surface; the patch's own #746F67 failed on the inset background at 4.15:1) |
| D13 | Sheets had no focus handling: focus didn't move into a sheet, Escape didn't close it, Tab left it, focus wasn't restored on close (`e2e_ux` S2 failed on Phase 3, `67-…before-design.txt`) | the patch's `useSheetGestures` hook (focus in, Escape, Tab trap, focus restore), plus focusable sheets (`tabIndex={-1}`) that keep their translated names |
| D14 | Sheets couldn't be swiped closed | grip and swipe gestures: the sheet follows the finger 1:1, springs back or dismisses, and can be grabbed mid-movement; reduced motion means no spring |
| D15 | Two bugs inside the patch: (a) releasing a drag replayed the sheet's entrance animation (the sheet jumped to the bottom and rose again; `60-e2e_ux-first.txt` shows "308 → 105"); (b) a short drag released after a pause counted as a hard flick and closed the sheet, because speed was measured only between move events | (a) a `.settled` class keeps the entrance animation off after the first drag; (b) speed measured over the last 100 ms up to release, and dismissal decided by the projected landing point (design reference §6, deceleration 0.99) |
| D16 | Controls too small to tap: + button 34×34, × 30×30, banner buttons 22px and 14×20px, currency field 34px, chips and small buttons | Invisible enlarged tap areas (`::after`), a 12px gap in the top bar, `min-height` on chips and small buttons, currency field 38px. All icon buttons ≥ 44×44, text controls ≥ 34, fields ≥ 36 (`e2e_ux` S4) |
| D17 | Faded content was unreadable: the "Upcoming & unrecorded – none this month" row was at 40% opacity (1.8:1), and paused Recurring rows at 55% (2.2–3.9:1), including the working "Reactivate" button | de-emphasised by colour (still ≥ 4.5:1); only the paused row's icon is faded |
| — | Prefers-reduced-transparency and prefers-contrast:more were not supported | solid bars and backdrop / stronger text and border tokens (`e2e_ux` S6) |
| — | Amounts didn't line up in columns | lining, tabular figures on amounts |
| Deferred | Vibration on save/delete (in the patch) | **DEFERRED WITH REASON:** not requested, Android-only, and the master prompt and design reference warn against haptics without purpose |

Test changes in Phase 4 (each is commented in the file, and `tests/original/e2e_ux.mjs` is the untouched original):
- `"Shift+Tab"` isn't a valid Puppeteer key, so the original test threw an error there.
- The Tab-trap failure now reports where focus went.
- The touch-target probe:
  - skips controls covered by another layer or cut off at a screen or sheet edge (with room for the enlarged tap area)
  - measures text fields by the 36px rule its author wrote but that could never apply
  - also scrolls through the Settings sheet
- The contrast probe:
  - blends faded text with its background instead of skipping it
  - exempts disabled controls (WCAG 1.4.3) and content behind an open sheet
  - runs with animations off
- `e2e_lang` and `e2e_phase2_layout` measure text width instead of `scrollWidth`, so invisible tap areas don't count as overflow. A self-test proves the check still catches a clipped label.
- Proof the tests weren't just loosened: the final `e2e_ux` still fails on the Phase 3 source (`67-e2e_ux-on-phase3-before-design.txt`).

**After Phase 4: misleading day-of-week insight (MP-7C), confirmed defect, now fixed:**
| ID | Defect (evidence) | Fix |
|---|---|---|
| D18 | One 1,000 ₼ purchase among 5 ₼ ones on a Monday made the insight say "Mondays average 6633% more per transaction than Tuesdays", although a typical Monday purchase was 5 ₼, the same as on Tuesday (`78-logic-dayofweek-before-fix.txt`, 3 new tests failed) | The insight compares the **median** (typical) transaction per weekday instead of the mean. Differences of 3× or more are stated as a multiple ("5.0×"). The threshold (≥ 30%) and the minimum of 3 transactions are unchanged. (The Analytics chart was fixed separately in D21.) New i18n key `ins.dayOfWeekX`; `ins.dayOfWeek` reworded in 3 languages (az/ru wording needs native review) |
| D19 | Found in self-review of D18: three transactions all on **one** Monday still produced a claim about "Mondays" (`82-…before-fix.txt`) | Each compared weekday also needs transactions on at least 2 different dates |
| D20 | One 1,000 ₼ purchase among 10 ₼ ones made the "vs last month" insight say "Average transaction is 2475% higher than last month", although a typical purchase was unchanged (`82-…before-fix.txt`) | Compares the median (typical) transaction; `ins.avgHigher` and `ins.avgLower` reworded in 3 languages. Unusual single purchases are still reported by the separate anomaly insight |
| D21 | The Analytics card "Spending by Day of Week" drew the per-transaction **average**, so one 1,000 ₼ purchase made its day's bar ~26× longer than the others. The title also suggested totals. | The card draws the median ("Typical Purchase by Day of Week"), with the subtitle "Median amount per transaction, and the number of transactions". New key `an.byDaySub`. Browser test E2-D in `e2e_phase2.mjs`, proven against a mutant copy with the chart reverted to the average (`87-…MUTANT…`). |

Tests for D19/D20: 3 new checks in finance §21 (one-Monday case; outlier vs last month → no claim; a genuine +50% → "50% larger", "4 vs 4"). Before the fix 3 failed, after it all pass (`83-…`).

Tests for D18: 4 new checks in `tests/logic/finance.test.mjs` §21 — the outlier case (no claim), a genuine 2× case ("100% larger", sample sizes shown), a 5× case ("5.0×", no 3-digit %), and a 20% case below the threshold. Before the fix 3 failed; after the fix all pass (`79-…after-fix.txt`).

**Test tooling changes (originals kept in `tests/original/`):**
- The harness and test builder inline or copy `i18n.js`.
- The test builder embeds every font subset (latin-ext, cyrillic) as production does.
- `openPage` gains `fresh` and `chooseLang` options. Older tests get English, as before the feature.
- `openSettings` and `openAdd` fall back to class selectors when the interface isn't in English.
- `launch()` now sends downloads to a temporary folder. An earlier `e2e_phase2` run had written 3 fake backup files (test data only) into the real Downloads folder: `ledger-backup-2026-10-26*.json`. They're left for the owner to delete.

## 3. Test results on the final candidate (commands run from `Expense-ledger2-fixes`)
| Command | Kind | Result | Evidence |
|---|---|---|---|
| **Run 1 final** on `45bc3863`: `node tests/run-logic.mjs`, `node tests/run-browser.mjs`, `npm run build` | all suites | **logic 395/395, browser 213/213, build OK (400.19 kB)**; Downloads 109/109; baseline unchanged | `90-…`, `91-…`, `92-…` |
| `node tests/run-logic.mjs` (after D21, on 9d46ca9f) | logic: core 39 · data 122 · finance 91 · phase2 48 · phase3 25 · i18n 70 | **395 run, 395 passed, 0 skipped** | `86-logic-after-chart-fix.txt` |
| `node tests/run-browser.mjs <mutant>` (chart reverted to the average) | proves E2-D detects the old chart | e2e_phase2: **2 failed** (amounts `129.38 ₼`, bar `2587.6%`), all other files pass | `87-browser-MUTANT-avg-chart.txt` |
| `node tests/run-browser.mjs` (latest, after D21) | browser: e2e 27 · e2e_import 51 · e2e_lang 57 · e2e_phase2 24 · e2e_phase2_layout 24 · e2e_ux 30 | **213 run, 213 passed**; Downloads 109/109 | `88-browser-after-chart-fix.txt` |
| `npm run build` (latest) | Vite build | exit 0, 400.19 kB (117.42 kB gzip) | `89-vite-build-after-chart-fix.txt` |
| After D20 | logic 394/394, browser 209/209, build OK | — | `83-…`, `84-…`, `85-…` |
| After D18 | logic 391/391, browser 209/209, build OK | — | `79-…`, `80-…`, `81-…` |
| End of Phase 4 | logic 387/387, browser 209/209 (first time `e2e_ux` passed in full) | — | `74-…`, `75-…` |
| `node tests/browser/e2e_ux.mjs` ×3 before the fade fix, then ×1 after | stability | 30/30 in each of the last runs | `66-*`, `73-*` |
| `npm run build` | Vite production build | exit 0, 399.18 kB (117 kB gzip) | `76-vite-build-phase4-final.txt` |
| Downloads file count before/after the browser run | data safety | 109 / 109 (nothing written there) | console output |

Counts reconciled: the earlier "200 logic checks" counted `ok(` calls in the source, but loops run some of them more than once (data 78 → 122 when run). The earlier "24 browser checks" can't be matched to any file: `e2e.mjs` runs 27.
The harness port was verified against the Python original by text comparison: the candidate's logic appears verbatim, and only the React import line is removed (`31-harness-port-check.txt`).

Visual checks actually inspected: screenshots in `tests/evidence/screens-lang/` covering the chooser (390px; 320px in az/en/ru), all 5 tabs, Settings and the add form at 320px in each language, the add form at 320×420 (on-screen keyboard height), and the tab bar at 3× zoom before and after the fix.

## 4. Requirement status (master prompt plus the UX/localization layer)
| ID | Requirement | Status | Evidence | Next |
|---|---|---|---|---|
| MP-3 | `expense_ledger_v5`, recovery, saving blocked if a copy fails | VERIFIED | core §5/§11, e2e_import R1–R4, i18n L5 | — |
| MP-3.3 | Preserve legacy ids | VERIFIED (D5) | phase3 P3-1 | — |
| MP-4 | Strict money input on all paths | VERIFIED | e2e A/B, data, phase3 P3-2 | Comma decimals for az/ru typing: see the decision below |
| MP-5/6 | Imports: negatives, settings, CSV edge cases, formula injection | VERIFIED | e2e_import I1–I6, phase3 P3-3 | — |
| MP-7A–E | Safe to Spend, months, insights, goals, numeric stability | VERIFIED for the tested paths | finance, phase2 | Day-of-week insight, vs-last-month insight and the by-day card: VERIFIED after D18–D21 (finance §21, e2e_phase2 E2-D). Other insights (category/merchant concentration, same-day categories): NOT ASSESSED for small samples |
| MP-8 | Recovery notice, undo, honest backup state | VERIFIED | e2e_import, phase2 | — |
| MP-9 | Apple-design: responsive feedback, interruptible spring motion, spatial consistency, materials, typography, reduced motion/transparency/contrast | VERIFIED for sheets (gestures, focus, Escape), materials preferences, tabular figures; haptics DEFERRED WITH REASON | e2e_ux S2/S6 (30/30) | Real-device feel (touch, iOS Safari) NOT ASSESSED |
| MP-10 | 320/360/390/desktop, keyboard-visible forms, touch targets, contrast, focus visibility | VERIFIED: tab screens, Settings and the add form in 3 languages; touch targets on 5 screens; contrast of 387 text elements on 6 screens (English only); visible focus | e2e_ux S3/S4/S5/S7, e2e_lang F6/F7, e2e_phase2_layout | Contrast and touch targets in az/ru NOT ASSESSED (same colours; text lengths differ); enlarged system text NOT ASSESSED |
| MP-11 | Full regression on the exact candidate | VERIFIED except: 42-screen layout audit BLOCKED (no file) | §3 | Owner to supply the file, or approve writing a new one |
| UX-L1 | First-launch chooser: 3 equal options, no flags, nothing preselected, Continue disabled, keyboard | VERIFIED | e2e_lang F1 | — |
| UX-L2 | Persisted; respected on later launches; existing users not re-onboarded | VERIFIED | e2e_lang F2/F3, i18n L5 | — |
| UX-L3 | Switch in Settings without losing screen, forms or data | VERIFIED | e2e_lang F4 | — |
| UX-L4 | All interface text localized, no English leftovers | VERIFIED by automated scans; **wording NEEDS native review** | i18n L1–L4; e2e_lang F5 on 7 screens | Native az and ru review |
| UX-L5 | Dates and plurals by language; numbers | Dates/plurals VERIFIED; number format DEFERRED WITH REASON | i18n L2/L2b | Owner decision below |
| UX-L6 | Font coverage for Russian | NEEDS WORK (design decision) | DM Sans has no Cyrillic, so Russian body text uses the system font | Owner or design decision |
| AUD-OFF | Offline launch | NEEDS WORK | Fonts come from Google; no service worker | Separate task |

## 5. Decisions and items for the owner
1. **Russian and Azerbaijani wording is a draft.** No native speaker has reviewed it. Uncertain terms worth a native look:
   - "Xərcləmək olar" / "Можно потратить" for *Safe to Spend*
   - "Qənaət / Kəsir / Bərabər" and "Профицит / Дефицит / В ноль" for the surplus labels
   - the "{target} məbləğdən {saved}" word order
   - the Azerbaijani short weekday names (B.e., Ç.a. …)
   - "Maliyyə məsləhətçisi" / "Финансовый помощник"
2. **Number format.** Amounts stay "1,234.56" in every language, because typing only accepts a decimal point. Showing "1 234,56" in az/ru needs comma-decimal input as well. That's a money-input grammar change for the correctness work, and it needs your approval.
3. **Font for Russian.** DM Sans has no Cyrillic, so Russian falls back to the system font. Options: keep that, or choose a body font that covers Latin, Latin-extended and Cyrillic. This is a visual-identity decision.
4. Three fake backup files left in Downloads by a test run (see §2). They're safe to delete and should not be restored.

## 6. Prioritized backlog
1. ~~Day-of-week insight, vs-last-month insight, by-day chart~~ — fixed (D18–D21). **Next task:** review the remaining insights (category concentration, merchant concentration, same-day categories) for small-sample claims. Acceptance: for each one, a single outlier or a single day produces no claim, and a genuine pattern still does.
1a. **Notion setup: import package DONE** (approved by the owner 2026-10-26, following Notion's setup guide v0.0.4). In Javid's Space:
   - Private database **Expense Ledger Documents**, exact approved schema: https://app.notion.com/p/80b800e000ad48c5bb06b32956053532 (data source `collection://cf8083e7-2953-41f7-9e47-002f61cde2eb`)
   - Master prompt: https://app.notion.com/p/4057ff36825e81058f5fca17cc91855f
   - Engineering audit (interim): https://app.notion.com/p/4057ff36825e81de8f77d31222f7aaf5
   - UX/localization brief: https://app.notion.com/p/4057ff36825e8133a86bd25fa35cd5f7 (notes that its English-default rule was superseded)
   - QA test seed dataset: https://app.notion.com/p/4057ff36825e818da703ca5b9251e819

   Verification: every page was fetched back with no truncation and its properties match. Each page attaches its original file, downloaded back and SHA-256-identical to the local file (all 4). Display edits: section titles became headings and the UX glossary tables were converted; the wording is unchanged. Cosmetic: Notion shows `.md` file names in "Source reference" as auto-links. **Run 1 report published** (owner asked for the two agents to collaborate through Notion, 2026-10-26): https://app.notion.com/p/4057ff36825e81cfb65dca09ae14ff2b, status "Ready for ChatGPT review". It has 12 evidence attachments (code diffs, App.jsx snapshot, i18n.js, test files, logs 78/82/87/90/91/92), and it tells ChatGPT how to publish its review (page "ChatGPT Review — 2026-10-26 — Run 1", type "ChatGPT review"). This living Checkpoint is also published as its own page in the database: https://app.notion.com/p/4057ff36825e8189a4a0d547cee2341f (update it at the end of every run). Read-back: both pages are complete, all 13 attachments are present, and the source snapshot, insight diff and checkpoint were downloaded back SHA-256-identical. ChatGPT had already confirmed that it can open the 4 reference pages. **Reading Claude's Run 1 report and its attachments: NOT YET VERIFIED** by ChatGPT. **Not done (need separate approval):** Agent Operating Guide, persistent instructions, Notion memories, the daily schedule.
   **Each run must:** (1) query the database for "ChatGPT review" rows that have not been answered, before choosing work; (2) answer each finding; (3) publish `Claude Implementation Report — date — Run N`; (4) update the Checkpoint page. Still missing: `expense_ledger_full_test_pack.xlsx` (not on this computer).
2. Native-speaker review of az and ru (§5.1) — owner.
3. Decide the number format and font (§5.2, §5.3) — owner.
4. Contrast and touch-target checks in az/ru (extend e2e_ux to run per language).
5. The 42-screen layout audit file (missing).
6. Offline launch (fonts, service worker).
7. Phase 4 must not be repeated: `patch_H_design.py` has been reviewed and applied by hand. Do **not** run the script itself: it targets a sandbox path and would undo the translated labels.

## 7. How to resume
- Open `Expense-ledger2-fixes` and read this file and `EXPENSE_LEDGER_MASTER_PROMPT.md` (main repo).
- Run `node tests/run-logic.mjs`, `node tests/run-browser.mjs` and `npm run build`; the expected results are in §3.
- If `node_modules` is reset: `npm install`, then `npm install --no-save puppeteer-core @fontsource/playfair-display @fontsource/dm-sans`.
- Translations live in `i18n.js`. Any new screen text must go through `t()`, or `tests/logic/i18n.test.mjs` fails.



## Run 18a (2026-10-30)
Commit 29b420a is live on main (rollback 84c0771). Debts-store protection, atomic import + Undo for side stores, 19 az/ru wording fixes. Clean room: logic 908/908, browser 856/856, 0 standby, build OK, az audit 0. Open: P2 redesign, owner decision on debt repayment (handoff/RUN18_VERIFICATION_CHAIN_AND_DEVICE_CHECKLIST.md), native az/ru review (handoff/RUN18_AZ_RU_NATIVE_REVIEW_SHEET.md). Nothing verified on a real phone.

## Run 18b (2026-10-30)
Commit 30bbc0f live (rollback 29b420a). Ask-each-time linked debt repayments. Clean room: logic 918/918, browser 870/870, 0 standby. Visual redesign status: handoff/RUN18_VISUAL_REDESIGN_STATUS.md (NEEDS WORK). Notion pages created for GPT: az/ru text review, how-it-works, research report.

## Run 18c (2026-10-30)
Commit e9c23fc live (rollback 30bbc0f): add button hides on scroll down. Clean room: browser 875/875, 0 standby.
