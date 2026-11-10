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
- OWNER DECISION 10 Nov: NO password by default (a forgotten password would lock users out). The file sits in the hidden app folder of the user's own Drive, protected by their Google account; it is not end-to-end encrypted and the Privacy screen says so in plain words. An optional extra password can come later.
- OWNER DECISION 10 Nov: Privacy text changes to 'optional Google backup, off by default' (yes). Automatic backup: Claude decided: when the app opens, at most once a day, only if data changed; plus Back up now; show 'Last backed up' and warn after several failed days.
- Features: back up now, automatic back up when the app opens (at most once a day, only when something changed), list backups, restore on a new phone (with the existing safe import preview), sign out / remove the Drive copy.
- Privacy screen and 'How it works' updated: 'optional Google backup, off by default'.
- Needs from owner: see reports/Google sign-in needs.md. Needs the APK and a test on the Poco F6; no APK is built without the owner's go-ahead.

## Added 10 Nov (owner's second batch). Still NOT STARTED; runs after the "start" order, in this priority order inside each session
Everything here follows the plain-language rule: anyone reading any text in the app must understand it (coach, tips, settings, tutorial, features), in az and ru first.

A. Bugs seen on the Poco F6 (do first, small and certain)
1. Quick-Add Templates (Goals screen): when editing a template far down the list, the Cancel button scrolls out of sight. Make Cancel (and Save) stay visible while editing, or put the edit form in a sheet with a fixed header. Browser test with a long list and a small screen.
2. Text selection: long-press must offer copy/paste/select-all only inside text fields. Make everything else non-selectable (user-select none on the page, allowed on inputs, textareas and on places meant to be copied, such as an exported text). Check the long-press on rows still selects the row.
3. Notification icon: replace the grey round 'i' with an app-specific small icon (white-on-transparent Android status-bar icon, round-safe) and an accent colour; choose a distinct, short notification sound (a custom sound file in the Android shell). APK-only: needs a build and a device test.
4. Currency conversion in other currencies: cause found (App.jsx fxBaseOk): foreign-currency entry is offered only when the ledger currency is manat, and rates are only asked against AZN. Make it work both ways: any ledger currency can record an entry in another currency, using the Central Bank's AZN rates to cross-calculate (X to AZN to Y), with the date and the rate shown, rounding checked to the qepik, and the manual-rate fallback kept. Tests: both directions, same currency, AZN to EUR, EUR to USD, rounding, weekend dates, offline.

B. Themes and look
5. Default theme: change from Sea glass to a more neutral theme. Existing users keep their chosen theme (only new installs get the new default). Design 1 or 2 neutral options and pick the best; owner may supply palettes.
6. Improve Sea glass: reduce the 'matrix' feel (less green/cyan saturation, calmer contrast, softer glow), keep its identity. Check contrast (WCAG AA) on every screen in light and dark. New palettes are welcome if good; screenshots of each for the owner.

C. Goals
7. Completed goals: a proper finished state (celebration moment, date completed, how long it took, total saved and the contribution history), not just the word 'completed'.
8. Goal contributions: instead of overwriting the 'saved' number, the user adds an amount ('Add money'), each addition is recorded with date and optional note, and the goal shows its history and each contribution. Migration: existing 'saved' numbers become one opening contribution. Tests for migration, undo, delete a contribution, completion, over-contribution, backup/restore round trip, old-version safety. Update rollover and sinking-fund code that read 'saved'.

D. History and progress everywhere
9. Debts and loans history: debts keep a payment list per item; verify how complete it looks on screen and make the full history (every payment, date, remaining balance after each) visible and exportable. Check whether loans show the same.
10. 'See all progress with details, everywhere': audit every feature (budgets, goals, debts, loans, gifts, recurring, accounts) for a visible history and a simple progress view; fill the gaps, in the same plain style.

E. Export file coherence
11. Make the CSV/JSON export one coherent, self-explaining system: clear column names (same words as the app), one row per thing, dates and amounts in a consistent format, a short readme or header sheet explaining each file, goals/debts/loans/accounts exported with their histories, and links between files (for example an account id or goal id that matches). A person opening the file in Excel must not be confused. Round-trip test: export then import gives identical data.

F. Language
12. Azerbaijani and Russian must be perfect: a full native-quality pass over every string, plurals, forms of address, number/date/currency formats, and the new plain-language rewrites. Prepare review sheets for a native speaker (owner or friend) because machine review alone cannot guarantee it; status stays IMPLEMENTED BUT UNVERIFIED until a native speaker signs off.

G. After the Google sign-in exists
13. Greet the user by their Google account name on Home (only if signed in and the name is available; otherwise keep the typed name; never blocks anything).

H. Final stress phase (after everything above is built and verified)
14. Push the app past its limits: very large data (hundreds of thousands of entries), huge amounts and tiny amounts, long text, emoji and right-to-left text, storage full, interrupted saves, rapid taps, repeated import/export, clock changes, leap days, extreme dates, thousands of goals/debts/accounts, low-memory and slow-CPU runs. Record what breaks, fix what is safe to fix, report limits honestly (what size the app handles smoothly and where it degrades).

## Evaluation of the owner's pasted Gemini list (10 Nov)
- Drive appDataFolder backup: already planned (needs the owner's Google setup). Silent upload 'whenever the app closes' is not reliable in a web view; use 'when the app opens, at most once a day, if changed'.
- Google Sheets live backup: possible and free but needs a broader Google permission (Sheets scope is sensitive and may need Google's verification), duplicates the Drive backup and exposes full data in a readable sheet. Recommendation: skip for now; the improved CSV export covers the need.
- CBAR XML feed: already used through Frankfurter's cbar provider. Direct cbar.az calls may be blocked by browser rules (CORS) in the web app; keep Frankfurter, optionally try cbar.az as a fallback in the APK shell.
- Frankfurter ECB fallback: useful for non-AZN pairs only as a fallback and labelled 'market rate, not official'.
- Native calendar events for recurring bills: the app already makes .ics files; direct calendar insertion is APK-only and a later extra.
- Voice entry: possible in the APK; the sentence entry parser built in Run 50 would take its text. Later, APK, needs a device test; speech quality for az is uncertain, so it must be verified before promising it.
- OpenStreetMap location tags: sends the user's GPS position to a third party; conflicts with the privacy promise and is not asked for by any user. Recommendation: do not build.
- Share sheet: already exists.

## Model note
The owner suggested a different model for the build sessions. Claude cannot switch its own model; the owner picks it in the app's model selector before saying start.

## Added 10 Nov: ABB bank statement import (item #11 is now UNBLOCKED for ABB) and PIN recovery
Evidence: the owner's real ABB statement (28-page PDF, about 500 rows, 12 months). It is private: it stays out of the repo; only the format below is recorded. Never store the customer name, ID number, PIN code or account number from it.
Format learned:
- Header: account number and currency, customer details (ignore), opening and closing balance with dates, total credit and debit movement.
- Table columns: Date | Description | CR amount | DR amount | Balance (balance AFTER the row). Newest row first. A row can wrap onto two lines.
- Description is a tilde-separated record: MERCHANT ~ real transaction date YYYYMMDD ~ currency ~ amount ~ city ~ masked card, then a second part: bank code ~ merchant category code (MCC, e.g. 4131 bus, 4111 transit, 5411 grocery, 5734 software, 6532 payments) ~ unique reference (RRN, starts with RD) ~ extra reference ~ country.
- The statement date is the day the bank posted it and can be 1 to 3 days after the real transaction date inside the description. Use the real transaction date.
- The amount in the description can differ from the debit actually charged (a foreign-merchant row: described 34.00, charged 40.12). Use the DR/CR column as the money that really moved and keep the described amount as a note.
- Transfers have fixed wording (AniPay C2C transfer, AniPay-da kocurma, Karta m*daxil = money in, P2P SEND). Mobile top-ups, bill payments and online banking appear as their own merchants.
- The running balance lets the importer prove every row: previous balance minus debit plus credit must equal the row's balance (checked by hand on the first rows).
Plan: a local-only PDF reader (text extraction on the phone, lazy-loaded so the app does not grow for everyone), a preview with every row, duplicate detection by the unique reference (RRN) so importing the same statement twice adds nothing, category guess from MCC and the user's merchant memory, a balance-chain check that refuses or warns on a broken chain, transfers offered as account transfers, and nothing saved until the person confirms. Test with synthetic statements built from the same layout (never the real file). Other banks (Leobank, Kapital, PASHA) need their own samples.

PIN recovery (replaces the SMS idea). Owner asked for one-time SMS codes for sign-in and forgotten PIN; recommendation: do not build SMS. Reasons: sending SMS needs a paid gateway and a server that holds the secret and checks the code (the app has neither; a code checked inside the app proves nothing); SMS can be stolen by SIM swap; the PIN protects data stored on the phone, so an SMS cannot unlock that data anyway. Instead: (a) Google sign-in is the identity step, free; (b) at PIN creation show a one-time recovery code to write down; (c) forgot PIN plus no code: reset the app and restore from the Drive backup or backup file. Decide with the owner before building.

## Added 10 Nov: ABB Excel statement (same data as the PDF) and voice dropped
- OWNER DECISION: voice entry is NOT needed now. Remove it from every list; spend nothing on it.
- The ABB statement is also available as .xlsx (one sheet, 523 rows, columns B Date, C Description, D Credit, E Debit, F Balance; a header block of account and balance lines on top; the first transaction row is about row 22). Findings: every date and amount is stored as TEXT ('2025-11-12', '3.70'), not as real Excel dates and numbers, so Excel cannot add them up; the Description is the same tilde-separated record as in the PDF. The file's internal zip has a damaged size entry on one embedded image, which made a common spreadsheet library refuse to open it, while another reader opened it; the importer must read only the sheet and shared-strings parts and must not fail on such files.
- Plan change: the Excel/CSV route is the preferred first import path (no PDF engine needed, rows are already separated, same unique reference for duplicate detection and the same balance-chain check). The PDF route stays a second step. Never store the customer name, ID number, PIN code or account number from either file.

## Changed 10 Nov (owner challenge): statement import is bank-neutral and format-neutral; it supersedes 'Excel first'
- Owner point: a user or bank may not offer Excel, and other banks differ from ABB. Agreed.
- Design: three layers. (1) Readers get rows from any source: Excel, CSV (the existing bank CSV import becomes this path), PDF (lazy-loaded reader so the app does not grow for everyone), and pasted text (universal fallback, no file needed). (2) Bank profiles say where date, amount, description and balance are and how to read the bank's coded descriptions; ABB is profile #1. If no profile matches, a 'match the columns' screen lets the user mark the date, amount and description columns; it also copes with one signed-amount column and different date formats. (3) Shared safety steps for every source: preview, duplicate detection (bank reference number if present, otherwise date + amount + description), balance-chain check only when a balance column exists, transfers offered as account transfers, nothing saved until the person confirms.
- Notification-based capture (Leobank samples) stays a separate later route.
- Honest limit: only ABB is verified. Other banks need real sample statements (private; layout only is recorded); until then they are NOT ASSESSED. Ask the owner for one statement each from the banks his users use most (Leobank, Kapital, PASHA, Birbank...), personal details blanked.
- SMS one-time codes: POSTPONED by the owner (10 Nov).

## Added 10 Nov (owner): LATER JOB - expand the categories and subcategories using what the bank files showed. PLAN ONLY, nothing is changed now.
Source: the owner's ABB statement (about 500 rows, 12 months). Only the kinds of spending are recorded here, no personal details.
What the file shows people actually pay for (by how often):
- City transport is the biggest group: metro (TP METRO, station names), buses (TP BUS, BUS plus a route number), card-QR rides (Bak* Kart QR), top-ups (M10 TOP UP).
- Bank and online payments: Birbank website payments, IBA MOBILE, terminal payments, bill and utility payments, internet (Citynet), mobile operators (Nar, Bakcell).
- Groceries and shops: Bazarstore, BIRMARKET, AL Market, Prime Store, electronics, iHerb.
- Eating out: bakery and fast food (Yummy Ponchik, Dominos).
- Fuel (UP-NEFTCHI) and ATM cash withdrawals.
- Education (an academy), online subscriptions (an AI service), crypto platforms (Binance, Bfinity), a financial-service fee (DrFIN).
- Money moves, not spending: AniPay C2C transfers (in and out), P2P sends, 'Karta m*daxil' (money in), cashback.
Plan for the later job:
1. Compare these kinds against the app's current categories and subcategories (read them in the app first) and list the gaps and the wrong fits.
2. Propose additions in plain words for az, ru and en, with few, clear names (for example Transport: Metro, Bus, Taxi, Card top-up; Bills: Mobile, Internet, Utilities; Money transfers as their own non-spending kind; Fees and cashback; Subscriptions; Crypto and investments; Education).
3. Use the merchant-category code (MCC) in bank statements as a hint for the category, and keep it overridable by the user's own merchant memory.
4. Never rename or delete an existing category id; additions only. Existing entries keep their category. Old backups import unchanged. Tests: every new category has az/ru/en names, an icon, a colour, appears in pickers, budgets, analytics and exports; old data round trip.
5. Check the new list against the simplification goal: keep the day-one view short; extra subcategories sit one level down.
6. Ask the owner (or a native speaker) to review the az and ru names before they go live; status IMPLEMENTED BUT UNVERIFIED until then.
Sequence: do this after bank-statement import is designed, so the MCC mapping and the categories are built together.

## Added 10 Nov: Unibank statement (second bank sample) and what it changes
Layout learned (private file: layout only recorded; it names a client, a tax number, an address, a card number and other people's names in transfer lines; none of that is stored):
- PDF, 21 pages, about 520 rows covering three years (11.10.2023 to 10.11.2026). Headers are bilingual (Azerbaijani and English). A 'current balance' line sits at the top (it can be negative); the bottom 'Summary' line was empty, so there is no total to check against.
- Columns: transaction date (dd-mm-yyyy) | time | posting date | paid in | paid out | description. Amounts carry the currency word ('35.00 AZN'). Description is 'MERCHANT / amount CURRENCY'. About one row in six wraps onto two or three lines.
- NO running balance per row, NO unique reference number, NO merchant-type code. So: duplicates must be found by date + time + amount + description; the ABB-style row-by-row balance check is impossible; the only check is after import: compare the app's account balance with the bank's 'current balance' line.
- The posting-date column can hold the word 'Lock' (a pending hold, not yet posted). Pending rows must be shown but off by default, because the same payment returns later with a real posting date and would otherwise be counted twice.
- Patterns: very many wallet top-ups in pairs (money in from a wallet service, then out to a payment service a minute later) that are internal moves, not income or spending; mobile top-ups; card-to-card transfers whose text names the other person ('to <name>' or 'from <name>'); fast food, groceries, pharmacy, bus rides; a few USD amounts. Other people's names are personal data of third parties: keep them only as the user's own note on the user's own phone, never in logs, tests or reports.
- Counterparty names, character encoding and date format differ from ABB, which confirms the bank-profile design: profile fields needed are date format, time column, posting-date column, separate in/out columns with currency suffix, wrapped-line joining, pending-row marker, and which dedupe key to use (reference number if present, otherwise date + time + amount + description).
- Detection of internal moves: offer to pair an 'in' and an 'out' with the same amount within a few minutes as one transfer between the user's accounts (user confirms).
Category plan update (owner, 10 Nov): do NOT only add new categories. First improve what exists: better names and wording, extra keyword hints, extra subcategories, and moving things that clearly sit in the wrong place. Category ids are never renamed or deleted; display names and hints may improve. Money moves (transfers, wallet top-ups, cashback) are not spending categories.
Status: ABB and Unibank are the only verified layouts; all other banks are NOT ASSESSED.

## Added 10 Nov (owner): better in-app and phone notifications, and what 'receipt scanning' means. PLAN ONLY.
Notifications today are flat statements ('{name} is due today', 'Daily check-in'). Goal: warm, specific, useful, never nagging or shaming, in perfect az and ru.
- Rules: say what happened and what to do next in one short line; use the person's own words (bill name, goal name, amount unless the hide-amounts setting is on); a gentle tone with some variety (a few wordings per case, rotated); a clear action ('Mark paid', 'Add expense'); never more than a few a day; quiet by default at night; never scold ('you forgot' is forbidden; use 'Quick check-in?').
- Cases to rewrite: bill due today, recurring due tomorrow, daily check-in, goal milestones (25, 50, 75 and 100 percent), completed goal (celebration), safe-to-spend running low, budget nearly reached, backup reminder, weekly review, month-end surplus offer (links to the rollover card), pending-sync or backup problems in plain words.
- Same quality for the in-app messages: toasts, empty states, coach tips and warnings, errors, confirmations.
- Icon and sound: app-specific round status-bar icon and a distinct short sound (already listed under the bugs; needs the APK).
- Every new text goes through the plain-language rule and the az/ru native review sheets.

Receipt scanning, what was understood and what is open. The add-list item meant: point the phone camera at a paper receipt, the app reads the shop, date and total, and fills an expense for the person to check and save. Three possible ways, not yet chosen:
 (A) keep the receipt photo as proof attached to an entry (no reading; storage and backup size need care);
 (B) read the printed text on the phone (on-device text recognition; accuracy on Azerbaijani receipts is unknown and must be tested with real receipts);
 (C) read the QR code that fiscal receipts carry and fetch the receipt data from the tax system (not verified: whether the format and access are public and allowed; research first).
Whatever is chosen: nothing is saved without the person's confirmation, every read value can be corrected, duplicates are caught, and it runs on the phone. Needs real receipt samples from the owner and the APK. Status: NOT ASSESSED; research item before any building.
