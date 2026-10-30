# Claude Implementation Report — 2026-10-27 — Run 12 (explicit bills) + mobile master prompt assessment

Inputs: owner's new "Production-Ready Mobile App Master Prompt" (Downloads, 27 Oct 2026) and "continue the work".
Starting identity: HEAD = production = `12a0c19` (App.jsx SHA-256 7C8A9B55D8DB4611…, matching the Run 11 test logs 219–220 —
so the Run 11 results ARE tied to the live source; live bundle `index-qcNPZ8fB.js` = build log 221). **Run 12 is local only:
nothing committed, pushed or published.**

## 1. My assessment of the mobile master prompt
| Point | My view |
|---|---|
| Capacitor first, not a React Native rewrite | **Agree.** It reuses the tested app (≈570 logic + ≈450 browser checks); a rewrite would throw that away. |
| Environment | **Better than the prompt assumed:** this laptop already has Android Studio, Java 21 and the Android SDK for API 36 (the Play requirement). A debug APK can be built locally, no cloud build needed. Missing: an emulator image (≈1–2 GB download, needs your OK) or your phone connected by USB. |
| iPhone / App Store | **Real blocker:** iOS builds need Xcode on a Mac (Capacitor cannot build iOS on Windows). Options: a cloud Mac build service (cost) or a Mac. Plus Apple's $99/year. Plan Android first. |
| 20 November | **Agree it is not realistic for public store release.** The critical path is not code: a new personal Google Play account needs 12 testers opted in for 14 days before production access. **The single most useful step this week is yours:** decide on the Play account ($25 one-time) and start recruiting 12 testers (friends/family with Android phones). |
| Data continuity PWA → app | **Important and missing from the prompt:** the installed app (Capacitor) has its own storage; it cannot read the browser/PWA's data on the same phone. Moving over = Backup file from the PWA → Import in the app (already exists and tested). This needs a clear one-screen guide, not a migration engine. |
| SQLite / encryption now | **Disagree for the first release.** Android app storage is already private to the app; the app's WebView storage is generally kept until the app is uninstalled or its data is cleared (to be confirmed on a device in the spike), unlike a browser's best-effort site storage. SQLite + encryption add migration and key-management risk for little gain at today's data sizes (thousands of entries ≈ 1–2 MB). Keep the storage adapter idea; do it after store release unless data size or a real requirement demands it. |
| Biometric lock | Useful later; plugins are community-maintained (risk). Not a first-release requirement. |
| Bill identity as a release gate | **Agree — done in this run (below).** |

## 2. Run 12 — explicit bills (the release-gate money error)
**Problem (confirmed since Run 8, log 179):** bills were guessed by grouping payments with the same name/category/subcategory/frequency,
so electricity (90) and water (18) from one company merged; Safe to Spend showed 1,982 instead of 1,892.

**Design (decided on the owner's delegation, Run 10):**
- A **bill** is now its own record in `expense_ledger_v5` (`bills`: id, name, type, category, amount, how often, the date it is due
  from, active). Each payment has `billId`. The due day comes from the bill's date — no more guessing.
- **Old data is not changed silently.** Payments without a bill keep the earlier grouping. The Recurring page offers
  **"Convert to bills"**: one bill per old group, a recovery copy is saved first, Undo restores exactly. Already-merged pairs
  stay merged (not guessed apart); the user separates them: payment → "Move to another bill" → "A new bill from this payment".
- **New entries:** Recurring "+" = **Add bill** (name, amount, how often, due date). "Record payment" opens the form with that
  bill chosen. In the add form, when recurring is on, the user picks the bill (or "a new bill from this entry") — offered only
  once nothing is grouped the old way, so a new entry can't start a second copy of a still-inferred bill (double reservation).
- Any entry can be linked to a bill from its detail sheet (explicit only; same name/amount never links anything).
- Deleting a bill keeps all its payments. Pausing a bill stops it being set aside.
- Backups: format version **10** carries `bills`; version 9 files import unchanged; a payment pointing to a bill the file does
  not contain keeps the payment and loses only the link (reported). An app at version 9 refuses a version 10 file (explicit).
- Rollback note: if an older app version opened the data, it would drop the bill list and links (it doesn't know them); the
  payments themselves and their recurring flags stay, so it falls back to the old grouping. No entries are lost.

## 3. Tests actually run
| Run | Result | Log |
|---|---|---|
| `tests/logic/bills.test.mjs` (34 checks, written BEFORE the code; hand-computed values incl. 1,982 → 1,892, 31st→28 Feb/30 Apr/29 Feb leap, weekly, paused, future, price change, idempotent conversion, backup/import/merge/orphan links) | before: crashed (functions missing); after: **34/34** | 223, 224 |
| Existing tests changed | data.test + e2e_import: "a newer backup version is refused" now uses version 11 (the app's own version is 10); e2e_run9: Recurring "+" now opens the bill form | — |
| Logic suite | **572/572** (15 files) | 225 / 227 |
| `tests/browser/e2e_run12.mjs` (17 checks, real app): convert + Undo + recovery copy, split → +1,892, new bills, Record payment preselects the bill, counted once, delete keeps entries | **17/17** | 226 |
| Full browser suite + build | see §5 | 228–229 |

## 4. Android prototype (helper agent, separate copy `Expense-ledger2-capacitor`, branch `claude/capacitor-spike`)
Finished. I re-checked its main claims myself: the debug APK exists (4,295,999 bytes, SHA-256 EC70DB2E…), `aapt2` shows minSdk 24, targetSdk 36, compileSdk 36, permission INTERNET only, package `com.example.expenseledger.spike` (temporary); the commit `b8a9244` is local only (no remote branch). **Status: IMPLEMENTED BUT UNVERIFIED — never run on a phone or emulator.** Its report: `Expense-ledger2-capacitor/handoff/capacitor-spike-report.md`.
Findings that change the plan: (1) **backup export would silently do nothing in the Android app** — `downloadFile()` uses a browser download link that the app's web view does not handle; needs Filesystem + Share plugins and a device round-trip test (the biggest data-safety risk of going native); (2) the offline service worker is pointless there and could keep an old copy — skip it on native; (3) the "new version" banner can never fire in a store app (Google Play updates it); (4) Android Back button needs `@capacitor/app`; (5) default launcher icon/splash; (6) biometric: no official plugin, community ones vary in upkeep; (7) the branch is based on 12a0c19 and must be rebuilt on the latest code. Owner needs: a phone with USB debugging (or OK to download a ~1.5 GB emulator image), the permanent app ID, a release keystore (owner-created, backed up), a Play account.

## 5. Final verification
| Check | Result | Log |
|---|---|---|
| Full logic suite | **572/572** (15 files, 0 missing) | 227 |
| First full browser run | 449 passed / 2 failed — two backup checks still expected format version 9 (now 10): updated (not weakened) | 228 |
| **Final full browser run** | **451/451** (17 files, 0 missing); App.jsx SHA-256 3AB35AB0…, i18n.js 88810EDC… | 230 |
| Production build | OK `index-_07hOKXQ.js` 468.30 kB | 229 |

Not run for Run 12: a separate clean room on a fresh install; a real-phone check; the Azerbaijani/Russian native review of ~45 new texts. **Not committed, pushed or published.** Live site = 12a0c19; the Run 12 changes exist only in the worktree.

## 6. Review round (independent advisor review, before any push) — 4 holes found, reproduced in the real app, fixed
| # | Hole (expected vs actual) | Evidence before the fix | Fix | Test |
|---|---|---|---|---|
| 1 | **Mixed state** (old recurring payments + some bills). "Record payment" on a bill must link to it. Actual: saved with no link → a third schedule, bill still reserved (double reservation) | log 236: 3 schedules, no billId | a bill that exists always links (also while old groups remain); detail sheet links through the bill | R12-3 (6 checks) |
| 2 | Adding the same recurring bill via "+" must not silently make another bill each month | log 236: 2 bills, silently | when a same-type bill with the same name exists the form asks "payment of <bill> or a separate bill?" | R12-4 (3 checks) |
| 3 | Deleting a bill that has payments brought the money back into Safe to Spend (payments regrouped as a live schedule) | fixture: +1,950 before and after | first fix (pause them) created a NEW defect found by the second review: the paused group made the Recurring page offer "Convert" again (resurrecting the deleted bill) and blocked "new bill" in the add form. **Final design:** the payments stay in the history as **ordinary entries** (same amount, date, name, id; `recurring:false`), Undo restores the bill and links exactly → +2,000. This is a design change, not a weakened test (log 242 shows the 3 new checks failing before this fix) | R12-5 (6 checks) |
| 4 | Converting lost the month-end due day (28 Feb then 31 Mar → due on the 28th forever) | by reading the code; test added | optional `dueDay` on bills, set by the converter, validated 1–31, used for due dates | bills.test §8 (3 checks) |

After the fixes: logic **575/575** (log 239), browser **466/466** (17 files, log 240), build OK (241), Azerbaijani audit 0/0/0 (238), App.jsx SHA-256 197FBEE6…, i18n.js AF38D72B…. Fresh-install run on this snapshot: logs 231–235 (see the checkpoint for the result).

**When pushing this to a preview, the owner should know:** the preview has its own separate storage (empty, import a backup to try it); a version-10 backup made there is refused by the live version-9 app until Run 12 is published; rolling back to an older app version drops the bills and their links (the payments stay).

**Reload round trip (second review):** after convert + split, reloading the page gives the same 2 bills, the same 3 links and the same +1,892 (R12-1) — the load path for bills now runs in a real browser.

**Final verification of the exact final code** (App.jsx SHA-256 1F8D6945…, i18n.js 979BE4D5…): logic **575/575** (log 244); full browser **469/469** (17 files, log 247); build OK (246); Azerbaijani audit 0/0/0. **One unexplained intermittent failure:** in one full browser run (log 245) e2e_run12 stopped with puppeteer "Navigating frame was detached" during R12-4; it passed 4/4 when run alone and the next full run was 469/469. Not reproduced, cause unknown — recorded, not dismissed (same family as the earlier e2e_import/e2e_ux timing flakes). Fresh-install run on this snapshot: logs 231–235.

**Fresh-install run on the final code** (fresh `npm install` on commit 12a0c19 + the final snapshot, App.jsx SHA-256 1F8D6945…, i18n.js 979BE4D5…; logs 233–235): logic **575/575** (15 files, 0 missing); build OK `index-CgGnqsuQ.js` 470.42 kB; browser **457 passed, 0 failed, 12 missing** — `e2e_run5` stopped early with a Chrome connection error ("ProtocolError": the browser's control channel closed mid-test; not a failed check). That file was then run inside the same fresh-install copy on the identical build: **12/12**; it also passed 3/3 alone in the worktree. So all 469 browser checks have passed on this code, but **not in a single uninterrupted fresh-install run** — two different files have now been stopped by browser-process faults once each (e2e_run12 earlier, e2e_run5 here), neither reproducible. Treat as a test-infrastructure instability to investigate (Chrome under load / memory), not as an app defect, until evidence says otherwise. On the unchanged 12a0c19 the new checks fail as expected (logs 231–232).
