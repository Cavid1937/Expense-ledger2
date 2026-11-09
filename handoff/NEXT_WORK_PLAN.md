# Next work plan (written 9 Nov 2026, to run after the weekly limit resets)

Owner's trigger: the single word "start". On "start", read this file, then PHASE_CHECKPOINT.md and reports/Run 50 report.md, then work through the phases in order without asking questions. Stop only at a real blocker (record it and move on to the next phase).

## Standing rules for the whole job
- Worktree: Expense-ledger2-fixes, branch fix/financial-correctness-2026-10-26. Baseline checkout untouched.
- Never rename or reset `expense_ledger_v5`. Any data-format change needs a migration, an old-version (downgrade) test and a failure-path test.
- Never delete or weaken a test; never lower an expected count to pass. Update `tests/expected-counts.json` in the same change when a test is deliberately added.
- Use the Edit tool for code (not the PowerShell patch helper that corrupted App.jsx before). After every edit of App.jsx or a screen, run the targeted tests before moving on.
- Commit locally after each finished step (trailer: Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>), never `git add -A`.
- No APK, no credentials, no paid services. Push only through the owner's standing gate (5-point check, fast-forward only) and only after the final full pass; list it in the report and tell the owner the exact preview link.
- Report in plain language with the six statuses. Write `reports/Run 51 report.md`, update PHASE_CHECKPOINT.md, the Notion checkpoint/report if the tool is available, and the memory file.
- Browser tests: set PAGE_OUT to a temp folder, check the "power: 0" line. Re-run any failing file alone before deciding it is a real failure (run37_roundtrip failed once only inside a full run).

## Session 1 (about 5 hours): make it understandable
**Phase 0. Re-baseline (30 min).** git status, last commits, run-logic and one full run-browser to confirm green before starting.

**Phase 1A. The plain-language story (written first, shown to owner at the end, not blocking).**
- Write three short sentences each for az, ru, en: what the app is, what you gain, what to do first. Save as `handoff/plain-story.md`.
- Write a one-line "what is this for" for every feature (Safe to Spend, accounts, budgets, goals, recurring, debts and loans, gifts, trips/labels, spread the cost, others will pay back, foreign currency, import/export, app lock, backups).
- Write a "user worries" list with the answer and where the app shows it: where did my money go; what do these numbers mean; can I lose my data; do I need an account; is it private; what if I make a mistake; how do I start; what if I stop using it.

**Phase 1B. Screen-by-screen simplification audit and fixes** (owner evidence: the 9 Nov video).
- Home: explain Safe to Spend vs accounts total in one plain line each; replace or explain "Surplus 90%"; reword "No recurring payments are set up..."; keep at most one number as the hero.
- Add: day-one view shows amount, category, date, Save. Everything else (subcategory, wallet, trip/label, spread, others will pay back, recurring, merchant, note) sits behind "More options", ordered by how often people need it. Keep every existing behaviour and test intact.
- Settings/More: regroup into few plain headings; hide advanced rows behind one "Advanced" group; reopening the setup sheet and "How it works" must always be reachable (fixes the Run 50 weakness that the setup sheet vanishes with the checklist).
- First run: a three-card explainer (what it is, what you gain, how to start) after the language choice, skippable, reachable later from More.
- Rewrite "How it works" in the plain story's words. Add tiny "?" explanations only where a number or term is not obvious.
- Tests: new browser test per changed screen; existing e2e_ux, e2e_bigtext, e2e_lang, e2e_run26_walk must still pass; az/ru text checked for no raw keys and no overflow.

## Session 2 (about 5 hours): fixes from the video, currency, hardening
**Phase 2. Defects and small wishes from the owner's video**
- Version label shows a build code ("SNjTvbhv"): show a readable version (for example "Run 51 · 10 Nov 2026") or hide it; keep the build code only in a long-press/diagnostics line.
- Spread the cost: keep 3/6/12 and add "your own number" (2 to 24, already supported by the logic); test boundaries 1, 2, 4, 24, 25, text, empty.
- Launch: investigate the black flash between the Android launch window and the app splash, and the splash icon jump (about 3 s in the video). Fix in the web part (matching splash background, no layout jump) where possible; list what needs the Android shell for a later APK run. No claim of crash: the video shows none.
- White edge line: cannot be shown to come from the app. Add a short note to the report with the check the owner can do (record another app). Do not change code for it.

**Phase 3. Currency rates refresh by themselves**
- On app open and when returning to the app on a new day, quietly refresh the Central Bank official rate for the currencies the owner has used (plus USD, EUR, GBP), at most once per currency per day, using the existing cache and `fetchCbarRate`.
- The currency picker shows "1 EUR = 1.9037 AZN · official, 6 Nov" instantly from the cache; offline it says "last saved rate, 6 Nov" and asks the person to confirm or change; never a silent stale rate.
- Entries keep locking their own rate and date forever (unchanged). No background work while the app is closed (not needed; unreliable on Xiaomi).
- Tests: logic (cache hit, new day, weekend/holiday keeps earlier date, offline, bad answer, one request per currency per day), browser (no request on same-day reopen; offline path; date shown). Privacy text re-checked: only currency code and date leave the phone.

**Phase 4. Run 50 hardening**
- Strengthen the weak tests: Gifts button must preselect the category; rollover and sinking-fund tests over http (not file://).
- Review each Run 50 feature through the simplification lens (wording, defaults, empty states); fix what is confusing.
- Produce az/ru review sheets for all new strings (like handoff/az-review-sheet.csv) so a native speaker can check them.

## Session 3 (about 5 hours): sync foundation, polish, final gate
**Phase 5. Sync foundation (largest, riskiest; do last among builds, behind careful tests)**
- S1: stamp every changed record with `updatedAt`, record deletions as tombstones, with a migration of existing data (existing records get a stable stamp) and a downgrade test that older app versions still open the data.
- S2 wiring: use `syncMerge.js` for "merge a backup file into this phone" (file-based first: export file from phone A, import-and-merge on phone B). Show a plain preview ("3 new, 2 updated, 1 removed") before applying; never overwrite silently; atomic apply with undo.
- Do NOT build cloud transport (Drive) or accounts in this job; record the decision and the feasibility notes.
- If any migration test is not fully green, leave S1 unmerged on a separate local branch and say so.

**Phase 6. Quality sweep**
- Accessibility: names for every new control, 44 px targets, focus order, reduced motion, large text (e2e_bigtext) on the changed screens.
- Low-end performance: check Home/Add render cost and bundle size did not grow noticeably; record numbers.
- Localization: scan az/ru/en for fixed English strings, plural forms, number/date formats on the new screens.

**Phase 7. Analytics decision (no tracking built)**
- Record the recommendation: no third-party tracking; the Privacy screen promises none. Options for later: store install and crash numbers, opt-in anonymous crash report. Write a one-page decision note for the owner. Nothing is sent from the app.

**Phase 8. Final gate and reporting**
- Full run-logic, full run-browser (reruns of single failures alone), `npx vite build`. Update expected counts.
- `reports/Run 51 report.md`: what changed, tests with exact counts, VERIFIED vs IMPLEMENTED BUT UNVERIFIED, weaknesses, blocked items, next action. Update PHASE_CHECKPOINT.md, Notion checkpoint/report, memory (new Run 51 file + MEMORY.md pointer).
- Give the owner the preview link only if pushed through the standing gate.

## Not part of this job (BLOCKED or later)
Bank notifications, home-screen widgets, voice entry and receipt scan (need the Android app and a real phone); statement import (needs real statements from the owner's banks); family groups (needs accounts and cloud sync); Drive/cloud sync transport; background refresh while the app is closed; any analytics or tracking.

## If time runs short
Order of value: Phase 1 (simplify) > Phase 2 (video fixes) > Phase 3 (currency) > Phase 4 > Phase 6 > Phase 5 (sync) > Phase 7. Finish and verify a phase before starting the next; leave PHASE_CHECKPOINT.md accurate after each.

## Added 10 Nov: fix the test temp leak (do first in Session 1, Phase 0)
Browser tests left about 8,350 temporary Chrome profile folders (about 83 GB) in %TEMP%. Make launch() in tests/browser/lib.mjs (and the cleanroom/v9 helpers) delete their temporary profile folders when the run ends, add a check that proves it, and delete leftovers older than an hour after each run.

## Added 10 Nov (owner decision): Google sign-in for an optional encrypted Drive backup (APK only)
Status: ON THE BUILDING LIST, NOT STARTED. Waits for the owner's inputs (see list below).
- Scope: sign in with Google only to reach the user's own Drive (scope drive.appdata, hidden app folder). No server, no app account. Off by default; the app must open and work fully without it.
- Backup file is encrypted on the phone with a password the user chooses (reuse the existing encrypted-backup code, run32enc); warn plainly that a forgotten password cannot be recovered.
- Features: back up now, automatic back up when the app opens (at most once a day, only when something changed), list backups, restore on a new phone (with the existing safe import preview), sign out / remove the Drive copy.
- Privacy screen and 'How it works' updated: 'optional Google backup, off by default'.
- Needs from owner: see reports/Google sign-in needs.md. Needs the APK and a test on the Poco F6; no APK is built without the owner's go-ahead.
