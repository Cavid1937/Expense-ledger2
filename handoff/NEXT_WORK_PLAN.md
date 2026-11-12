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

## Decided 10 Nov (owner): receipt feature = option A, keep the photo as proof. No reading, no AI. PLAN ONLY.
- Add one or more photos to an entry (camera or gallery pick), see them on the entry, open full screen with zoom, delete one, remove with the entry.
- Compression on the phone before saving: about 800 px wide, about 60 percent quality, so a receipt is roughly 50 to 60 KB; 1,000 receipts is roughly 50 to 60 MB.
- Storage: photos do NOT go into the main ledger key expense_ledger_v5 (the browser's small text storage would overflow and could threaten the ledger). They live in their own store (IndexedDB in the web app; the app's private files in the APK), and the entry keeps only a small id list. Never in the phone's public gallery.
- Safety: the main ledger must keep working if the photo store is full, missing or cleared (entry shows 'photo not available', nothing else breaks); ask for persistent storage; show total photo space used in Settings with per-entry cleanup; limit photos per entry (for example 5) and size per photo; handle camera permission denied, camera missing, interrupted save, and quota errors with plain messages.
- Backups and export: the normal backup file stays small and does NOT include photos by default. Offer 'Back up with photos' as a separate bigger file (zip of the data file plus a photos folder named after the entry ids), and include photos in the Google Drive backup only if the user turns that on. The export readme (see the export-coherence item) explains how photos link to entries.
- Migration: entries get an optional photos list; old app versions ignore it; old backups import unchanged; downgrade test required.
- Privacy: photos stay on the phone; the app-lock and hide-in-recent-apps settings also cover the photo viewer; Privacy text updated.
- Tests: add/remove/compress, quota full, store cleared, restore with and without photos, round trip, big counts (thousands) for the stress phase. Needs a device test of the camera on the Poco F6.
- Receipt reading (OCR/QR/AI) is NOT planned; revisit only if users ask.

## Polish phases (owner, 10 Nov): polishment is the LAST step, twice
- Polish pass 1: after everything is built and verified, before the stress phase: appearance of every screen including the new features (receipt photos, goals history, completed goals, statement import, notifications, export readme), spacing, motion, empty states, wording, contrast, themes.
- Stress phase: push the app past its limits, record what breaks.
- Polish pass 2: fix what the stress phase exposed, then a final visual and wording check and the final gate.
Reflect this order in every future session plan: build, verify, polish 1, stress, fix, polish 2.

## Definition of 'polish' (owner, 10 Nov): broad. Polish pass 1 and 2 mean a full readiness review, not only looks. PLAN ONLY.
The word the owner was looking for is visual hierarchy (also information hierarchy): on every screen the most important thing is seen first, the next things are clearly secondary, and the person knows what to do next.
Method: act as a first-time user (fresh install, no data, then with data), in az, ru and en, on a small phone, and review each area through these lenses. For each area record Finding, Evidence, Impact, Priority, Fix, and a status (the six statuses).
1. First-use journey: open the app for the first time: language, what it is, what to do first, first entry, first budget, first goal, where is my money, what do these numbers mean. Time to first useful result.
2. Hierarchy and clarity per screen: Home, Transactions, Add, Analytics, Budgets and Goals, Debts and loans, Gifts, Accounts, Recurring, Settings/More, tutorial, coach and tips, notifications, import/export, statement import, receipt photos. One main action per screen, clear headings, readable numbers, no jargon, nothing that makes a beginner stop.
3. Wording: plain, kind, consistent names for the same thing everywhere; az and ru native review.
4. Look and feel: themes, contrast, spacing, motion, icons, empty and loading and error states, large text, dark and light.
5. Frontend quality: no layout breaks on small or large phones, keyboard behaviour, sheets and scrolling (for example buttons that disappear), back-button behaviour, press feedback, no flicker or jumps, performance on a low-end phone.
6. Correctness: every number the app shows is traceable and right (balances, safe to spend, budgets, goals, debts, loans, currency conversion, spreading, refunds, reimbursements, transfers, imports); independent recalculation tests on boundaries, rounding, dates, leap days, time zones and clock changes.
7. Security and privacy: app lock and PIN recovery, hidden-in-recents and screenshot block, backups and restore, encryption choices stated honestly, Google sign-in scope, what leaves the phone (only what the Privacy text says), untrusted-file import (malformed, huge, malicious), no secrets in the app, dependency check.
8. Data safety: migrations, downgrade, storage full, interrupted saves, restore on a new phone, uninstall warning, duplicate protection, undo.
9. Readiness for real users: privacy policy and terms text (az/ru/en), support and feedback path, how users learn about updates, crash and error reporting decision (no tracking), store listing material, install and update path for the APK, accessibility basics (screen reader names, touch size, text scaling), low storage and battery behaviour, offline everywhere.
10. Independent perspectives (per the project rules): ordinary user, student, parent, older adult, low financial literacy, irregular income, Azerbaijani local market, designer, engineer, security reviewer, financial-correctness reviewer, support team, sceptical competitor. Anything these would stumble on is a finding.
Output: a readiness scorecard (one line per lens and per screen with a status and evidence), a prioritised fix list, and a plain-language summary for the owner. Nothing is called 'ready' without evidence; items that need a real device or a native speaker stay IMPLEMENTED BUT UNVERIFIED until the owner confirms.

## Added 10 Nov (owner): FINANCIAL INTELLIGENCE ('understand your position, anticipate problems, make better decisions') and BANK NOTIFICATION/SMS READING. PLAN ONLY.

### Financial intelligence (builds on the coach from Run 17/18 and the 30 Oct research in handoff/deep-research)
Principles: grounded only in the person's own data; every statement shows its numbers and how it was calculated; say 'not enough data yet' instead of guessing; show a range or an honest uncertainty note; never change a record silently; plain words in az, ru, en.
1. Understand the position: one clear picture of money now (accounts, cash, debts owed and owed to you, goals, upcoming bills), net position over time, runway ('your money lasts about N days at your usual spending'), where the money went this month in plain sentences.
2. Anticipate problems: forecast of the month end with the unpaid bills included; warning date if the balance would run short before the next income; unusual spending (a category far above its usual); subscriptions that rose or that you may have forgotten; income that is late; debts or loans with a payment coming up; a yearly bill approaching (links to the sinking-fund hint).
3. Make better decisions: 'Can I afford this?' check (enter an amount, see what it does to safe to spend, the month end and the goals); what-if for a goal or a debt (pay N more a month: finished when); debt payoff order explained (which first and why, with both orders shown, no pressure); comparing this month with a typical month.
4. Format: a short 'insights' area with at most a few cards that matter today, each with a one-line meaning, the numbers behind it and one suggested action; dismissible; no scores or grades; no alarmist wording.
5. Verification: every rule has independent hand-calculated test cases (boundaries, few days of data, empty months, irregular income, leap days); a backtest of the forecast on synthetic and, with the owner's permission, on his own data only on his device; a data gate for each card.

### Bank notification and SMS reading, with automatic adding (Android app only)
Evidence so far: Leobank push format and ABB in-app notification format are recorded in memory and in research_notes/Leobank notification format.md; the format carries amount, merchant and the balance AFTER the payment, and balances chain exactly, so direction (in or out) can be derived from the balance difference and a break in the chain means a missed notification. More samples are still wanted: transfers, salary, cash withdrawal, refund, declined, foreign currency, and Kapital/Birbank, PASHA, Unibank.
How it would work: the Android app asks the user's permission to read notifications (Notification Access) and listens ONLY to the banking apps the user picks from a short list; it reads the text on the phone, never sends it anywhere; a parser per bank turns it into an entry (amount, merchant, direction, balance after, time); the user chooses between 'ask me each time' (default, a quiet card to confirm), or 'add automatically' once they trust it; every auto-added entry is marked 'from notification' and can be edited or undone; duplicates are caught (same amount, time, balance chain, and against a later statement import); unreadable messages are ignored and shown in a small 'could not read' list, never guessed.
Honest limits: (1) Reading SMS directly is heavily restricted on Google Play and is not planned; notification reading is the realistic route and may still face store review, so the first target is the sideloaded APK. (2) It needs custom Android code (a notification listener) and the user's permission; Xiaomi/Poco phones may stop background listeners, so battery settings guidance is part of the feature. (3) Banks can change their wording at any time; each parser needs tests from real samples and a clear 'format changed' fallback. (4) It cannot be proven in the web preview; it must be tested on the Poco F6. (5) Privacy text and the app's 'how it works' must state exactly what is read and that nothing leaves the phone. (6) Missing notification gaps are detected with the balance chain and offered for repair through a statement import.
Testing plan (the owner offered to test it together): a 'paste a notification text' test box in a developer area lets us check each bank's parser without waiting for a real payment; then a real-device test with the owner's own notifications; the owner's screenshots are used only to learn the wording (not stored; balances are real).
Status: NOT STARTED, NOT ASSESSED on device. Needs: sample notifications per bank, the Android app's package name, the owner's go-ahead to build a test APK.

## Added 10 Nov (owner): everything that reads bank text must work in any phone language. PLAN ONLY.
Why: people use their phone and their bank apps in English, Azerbaijani, Russian, Turkish or others, and bank apps write notifications, SMS and statements in the language chosen in the phone or in the bank app. The owner's own phone is 100 percent English, others differ. A parser built from English-only or Azerbaijani-only samples would silently miss payments.
Rules for notification reading, SMS-style text, pasted text and statement import:
1. Never depend on words alone. Read the structure first (an amount with a currency sign or code, a time, a merchant line, a balance line) and use per-language word lists second.
2. One word list per language and per bank (az, ru, en, tr at least): words for balance, payment, transfer, top-up, income, expense, card, declined, cashback, commission, 'from' and 'to', month names and weekday names, and the currency words (manat, AZN, the manat sign, rubles, lira, dollar, euro).
3. Locale-aware numbers and dates: '1 234,56', '1,234.56', '1.234,56', thin and non-breaking spaces, minus signs of different kinds, dd.mm.yyyy, dd-mm-yyyy, yyyy-mm-dd, 12 and 24 hour time.
4. Text encoding and letters: Azerbaijani letters (ə, ğ, ı, ö, ş, ü, ç), Cyrillic, Turkish dotted and dotless i, and broken-encoding text (mojibake seen in a real statement export) must be handled or reported, never mis-read as a different amount.
5. Unknown language or changed wording: do not guess; show the message in the 'could not read' list with a one-tap 'teach this' or 'report' option; the amount and balance chain still help detect missed items.
6. Samples needed per bank and per language: the same payment type captured with the phone/bank app set to English, Azerbaijani, Russian (and Turkish if available). Ask the owner and testers to switch the bank app language once and send a screenshot. Until a language is sampled, that bank-language pair is NOT ASSESSED.
7. Tests: for each parser a table of real-shaped samples in each language, plus mixed-language and bilingual cases (the Unibank statement has Azerbaijani and English headers together), plus number and date format variants, plus corrupted text.
8. The app's own interface stays az, ru, en for now. Turkish as an app language is a possible later addition (close to Azerbaijani, useful for people who live or study in Turkey); evaluate demand first, do not build now.

## Added 10 Nov (owner): FINANCIAL INTELLIGENCE ADVANCED JOB, and HUMAN MONEY-BEHAVIOUR RESEARCH. Not started; the owner wants them implemented only when he says.
1. The owner's full work order is saved in handoff/FINANCIAL_INTELLIGENCE_PROMPT.md (do not read it until told to start this job). It supersedes the shorter 'Financial intelligence' bullet list above and is run as its own block with its five phases (inspect and classify, prioritise, implement, verify, document). It does not duplicate the existing coach; it inspects first.
2. Research first, then design: how people with different backgrounds and money habits behave, so the intelligence, the wording and the notifications fit real people. Scope for the research (deep-research method, sources and dates recorded, limits stated, no claims about Azerbaijan without local evidence):
   - Money attitudes and styles (for example avoidance, vigilance, status-seeking, 'money is power' beliefs, anxiety, planners vs spenders, savers vs impulse buyers) and how reliable the published frameworks are.
   - Behavioural-economics mechanisms: mental accounting, present bias, loss aversion, planning fallacy, payday and end-of-month effects, 'pain of paying' by cash vs card, windfall behaviour, sunk cost, anchoring, the effect of small recurring costs.
   - Reactions under stress and in specific situations: income shock, shortfall, debt, a big purchase, a windfall, a warning or alert (defensive ignoring, shame, denial, over-correction), family obligations, gifts, weddings and holidays, support for relatives, and cash-based habits.
   - Groups: students and young adults, young professionals, parents and households, irregular or gig income, older adults, people with low financial literacy, people who study abroad and pay in other currencies, people who distrust banks or prefer cash.
   - Azerbaijan context: what is documented (surveys, central bank and statistics publications, local news and studies, app-store reviews of local competitors) vs what needs validation with real users; recommend lightweight interviews or a short survey before heavy investment.
   - What it means for design: tone choices (calm, encouraging, never shaming), when an alert helps and when it causes avoidance, adjustable styles chosen by the user (never inferred and never labelled; no diagnosis of the person), which default views suit which situation.
   - Ethics and privacy: no profiling, no hidden labelling, no manipulation (dark patterns); personalisation only from settings the user picks or from numbers the user can see.
   Output: a report in plain language with sources, the evidence strength of each claim (confirmed, likely, unverified), and concrete product recommendations that feed the intelligence, notification and coach text rewrite. Do this research before the intelligence build and the notification rewrite.

## Added 10 Nov (owner screenshots, Transactions filters and detail sheet). PLAN ONLY.
1. CONFIRMED CAUSE: the app has two separate ways to say how something was paid. The older 'wallet' (Cash, Bank card, Not set) and the newer 'account' (ABB Card, Nagd, No account). They are two independent fields on every entry and two independent filters that are combined with AND. Entries recorded long ago carry a wallet but no account; entries recorded lately carry an account but no wallet. So 'Bank card' + 'ABB Card' shows 0 of 257 and 'Cash' + 'Nagd' shows 0 of 257 (screenshots), while 'All wallets' + 'ABB Card' shows 3 and 'All wallets' + 'Nagd' shows 2. The app does not know that Cash and Nagd mean the same thing.
   Fix plan: ONE concept. An account has a kind (cash, bank card, other). 'Cash' means 'any cash account', 'Bank card' means 'any card account'. One 'Paid from' filter with: All, then the kinds, then each account, then 'Not set'. Entries that only have the old wallet are treated as that kind for filtering and reports, so no result is lost. A one-time, optional, user-confirmed helper offers to attach old cash/card entries to the matching account (never silent; undo available). Remove the duplicate filter row. Migration: ids and old fields stay (old backups and older app versions must still work); tests: every combination returns the right count, balances per account unchanged, import and export round trip.
2. The Category filter closes instantly instead of animating: apply the 'Claude app feel' spec (menu pops beside the tapped chip, softly, about 0.3 s, no bounce, dims the page, closes with a matching motion). Check all other pop-ups and menus for the same.
3. Entry detail sheet is confusing (owner: cannot tell what it says). Findings: (a) an unlabelled grey box under the fields shows the note ('Bus/Metro'), looking like a stray label; (b) the 'Merchant Profile' card uses analytics wording a beginner cannot parse: Visits, Avg spend, Visit frequency every ~4 days, Typical day, Usually for, Amount Consistent (+-15%), Est. next visit ~Today, Last 30 days; (c) 'Split into categories' and 'This was a payment of a recurring bill' look like plain text, not buttons, and the second reads like a statement; (d) the actions are in a weak order (Edit, Duplicate, two text-like actions, Delete, Close); (e) the merchant and the note repeat the same words.
   Fix plan: label every field (add 'Note'); rewrite the profile card in plain sentences with one clear meaning each (for example 'You paid here 6 times, about 0.60 each, roughly every 4 days. Next one is likely around today.'), show it only when there is enough history and collapse it by default; make every action look like a button with a verb ('Split between categories', 'Mark as a bill payment'); clear order: Edit first, then secondary actions, Delete last and separated; hide repeated text. Part of the plain-language and hierarchy polish.

## Added 10 Nov (owner question): what happens to entries when an account is deleted. PLAN ONLY.
Facts checked in the code (screens/settings.jsx remove(), accountInUse in App.jsx): an account that any entry or transfer uses CANNOT be removed; the app says 'Entries or transfers use this account, so it cannot be removed. Hide it instead.' Only an unused account can be deleted. Hiding keeps every entry and transfer; the account stays in the data and is left out of the shown-accounts total. Accounts are kept in their own storage key (expense_ledger_v5__accounts), separate from the entries.
Gaps to investigate and fix later:
1. The only way to get rid of a used account is to delete or edit every entry first, which is a lot of work. Offer a clear flow: 'Remove account' then choose what happens to its entries (move them to another account, or to 'No account'), show how many entries and transfers are affected and the effect on balances, ask to confirm, allow undo. Transfers involving the account need an explicit choice (delete, or convert to income/expense on the other side); never silent.
2. Orphans: if the accounts storage is lost or an old backup without accounts is restored, entries may point to an account id that no longer exists (the name shows as '?'). Test and handle: show 'Deleted account', keep the entries, offer to re-create or re-assign; never crash; make restore bring the accounts and the entries back in step.
3. Balance rules: check what happens to totals, net position, Safe to Spend and analytics when an account is hidden, when the last account is hidden, and when all accounts are removed (entries then count as 'No account').
4. Make the hide/remove wording plain: say what each does in one sentence.
5. Tests: remove unused, remove used (blocked), flow with move, flow with 'No account', transfers, undo, all accounts removed, orphan ids, backup and restore round trip, old versions.

## Added 10 Nov (owner reports from the browser/URL version) - TOP PRIORITY DATA-INTEGRITY JOB, do first. PLAN ONLY.
Reports: (1) on the URL version an account that was 'holding some of the expenses' was deleted without any warning (the APK was not involved); (2) exporting from the APK and importing into the URL with Merge double counted most things.
Code facts (App.jsx, read 10 Nov; behaviour NOT yet reproduced):
- Merge of entries (applyImport, merge branch): an incoming entry is skipped only if its id already exists here, or (when 'skip duplicates' is on, default on, and only when a suspected-duplicate count was found) its fingerprint matches: date, type, amount, category, merchant, note, subcategory and recurring flag. Two copies of the same real payment that differ in any of those (a changed note, subcategory, category, merchant spelling, or ids that differ) are both kept. That is the likely route to double counting when both sides already hold overlapping history, for example the URL copy built earlier from another import, a hand-typed copy, or entries re-saved and renamed after import.
- Accounts merge by id; an account that is already here wins; the cleaner also drops an incoming account whose NAME already exists. If the URL already had 'ABB Card' (its own id) and the APK's 'ABB Card' has a different id, the APK account is dropped while the APK entries still point to its id. Result: entries linked to an account that does not exist here, and the URL's own account with the same name holding none of them.
- Account removal is blocked only when an entry or transfer on THIS device carries that account's id. After such a merge, the visible account can have no entries linked to its id, so it looks unused and deletes without a warning. This is the most likely link between the two reports, but it is a hypothesis.
- Opening balances, budgets and templates merge by their own rules (existing wins), so an account balance can still come out wrong after merging.
- Debts, loans, gifts and trips, and the transfers' ids, need the same check; the export/import covers many parts and each needs its own duplicate rule.
Plan:
1. Reproduce first with synthetic data: two devices with overlapping history, same and different ids, same and different account names, edited notes; export from one, merge into the other; record counts and balances before and after. Write these as failing tests, then fix.
2. Give every record a stable identity that survives export and import (ids are kept; a second 'same thing' key for old data), and use one clear duplicate rule: same id means same record (newer edit wins, see the sync merge rules already written in syncMerge.js); no id match then match by a looser fingerprint that ignores note and subcategory spelling and is shown to the user as 'looks the same: N' before anything is added.
3. Merge preview in plain words: 'N new, N already here, N look the same (choose), N changed' with examples; nothing applied until the person confirms; one-tap undo of the whole merge (exists for import; verify it covers accounts and transfers).
4. Account matching on merge: match by id, then by name and kind; when the same name has two ids, merge them into one account and re-point the incoming entries (no orphans); opening balances are never added together; show what will happen.
5. Account deletion: block deletion when the app cannot prove it is unused, ask for confirmation in every case, list how many entries and transfers are affected, offer move or 'No account', allow undo (see the account-deletion item above). Also check removal paths for bills, goals, debts, loans, templates and categories.
6. Balance verification after any merge or import: show the totals before and after and a warning if an account balance changes by more than the imported entries explain.
7. Also test the same flows on the APK build (Capacitor storage) and on the URL build, because the owner saw it on the URL.
8. Tell the owner in plain words that, until this is fixed, importing into a device that already holds the same history can double count, and the safe way is: use Replace on an empty copy, or use Undo right after a Merge. (Owner already ran into this.)
Status: NEEDS WORK (confirmed by the owner's report; cause is hypothesised, not proven).

CORRECTION 10 Nov (owner): the account deletion on the URL version happened BEFORE any import, so the merge explanation above (orphaned accounts after a merge) does NOT explain the deletion. Treat the two reports as separate until proven otherwise.
Facts re-checked: there is exactly one delete path for accounts (screens/settings.jsx remove()); it asks accountInUse() against the full list of entries and transfers on that device; the guard has been in the code since the accounts feature (Run 24, commit 78d4b85) and a logic test covers it (run24accounts.test.mjs). By the code, an account that has an entry or transfer carrying its id cannot be removed. So either (a) on the URL copy the entries the owner saw were not linked to that account id (for example they were tagged with the older 'wallet' Cash/Bank card, or linked to a different account with the same name, or the account was used only through its opening balance), or (b) there is a bug not yet found (for example another route, a stale or partial entry list, or a different build being served). Unproven.
Added to the reproduction plan: test remove() with entries linked by id; with entries linked only by wallet; with same-named accounts; with a stale list; check which build the URL serves (which commit) and whether it equals the local code; try to reproduce on the URL version itself with synthetic data. Facts to ask the owner when convenient: which account (name), how many entries he saw under it, and whether he saw them in the account's own detail list or only in the Transactions filter.

## Update 10 Nov (owner): second import and undo. PLAN ONLY.
- After the owner imported the data again, the same account was refused ('Entries or transfers use this account...'). So the guard works once the entries carry the account link. This supports explanation (a): in the URL copy the entries were not linked to that account before the import. Still unproven as a cause; the reproduction tests stay in the plan. It also means the real fault may be how those entries lost or never had their account link (older entries from before accounts existed, an earlier import that dropped the link, or editing). Add to the tests: entries imported or created without an account link, then the account is removed.
- Missing undo: removing an account (and a transfer) shows only a plain message ('Account removed'); it does not offer Undo, unlike deleting an entry. Plan: every delete in the app gets the same Undo snackbar for several seconds: accounts, transfers, hide/unhide, templates, categories and subcategories, goals, budgets, bills, debts, loans, gifts, trips. Undo restores the item exactly (id, balances, links). Audit all delete and remove buttons first and list which already have undo, then close the gaps with one shared pattern and tests (delete, undo, undo after leaving the screen, two deletes in a row, storage failure).


## Update 11 Nov (owner): widget designs, live bank notifications, notification-settings reference (PLAN ONLY, NOT STARTED)

### A. Home-screen widgets (APK only; owner's GPT mock-ups are inspiration, not a copy)
Mock-ups show: Safe to Spend (small), Total Balance (medium), Budget Progress (large), Quick Actions (add expense / income / transfer / scan receipt), Upcoming bills (small), Financial Pulse chart, five widget colour themes.
My assessment (strategic opinion, not user research):
- Strong: Safe to Spend and Quick Add are the two a real user opens daily; both fit "simple".
- Weak/skip for now: Financial Pulse chart (decoration), Budget Progress large (duplicates Home), five separate widget themes (we already have 6 app themes; widgets should follow the chosen app theme, not a second system).
- Phase 1 (recommended): Safe to Spend (small) + Quick Add (4 buttons, deep link into Add). Phase 2: Upcoming bills, Total balance.
- Needs native Android code (AppWidget in the Capacitor shell) and a small data snapshot the app writes after every change and on open; stale-time shown ("updated 14:05"). Cannot be tested without an APK on the owner's Poco F6.
- Privacy: a balance on the home screen is visible to anyone near the phone. Add "Hide amounts on widgets" (default OFF is the owner's call; I recommend a clear setting and a lock-aware option). Widgets must NOT show anything when the app lock is on and "hide when locked" is chosen.
- Mock-up details not to copy: "$" (we use AZN symbol), invented percentages, "Scan receipt" button until receipt photos exist.
- Design in Figma first (as agreed), then build. Status: NOT STARTED.

### B. Live bank notifications seen today (owner's phone, 11 Nov) - the first REAL samples
Two apps notified the SAME payment:
1. ABB Mobile: title "Payment: -0.90 (manat sign)", body lines: merchant, "Card: **<last4>", "Balance: 3.26 (manat sign)". Emoji at the start of the title.
2. Google Wallet: title = merchant (shortened), body "AZN0.90 with <card nickname> ..<last4>". No balance, no date (use the time the notification arrived).
What this teaches (confirmed from the screenshot, not assumed):
- DUPLICATE RISK: one payment = two notifications. The reader must merge them into ONE entry: same amount + same last-4 + arrival within a few minutes + merchant text that matches by prefix ("8 Noyabr" vs "8 Noyabr Metro"). Prefer the bank's text (it has the balance); the wallet one only confirms.
- Amount formats differ: "-0.90 + manat symbol" vs "AZN0.90" (code glued to the number, no space). Parser must accept the manat symbol U+20BC, the code AZN before or after, minus sign variants, decimal point or comma.
- Balance-chain check works on these samples: balances 4.16 then 3.26, and 3.26 + 0.90 = 4.16 (consistent). Use it to catch a missed or doubled notification. (Numbers are used here only as a format check; real balances are not stored.)
- Transport payments (bus, metro) are many tiny entries: default category Transport; consider one-tap "same as last time".
- Notifications grouped under one app: reader must treat each line as a separate event, and must not re-read the same notification when it is updated.
- Privacy rules unchanged: do not store card digits or balances from samples; the app itself would keep only what the user approves (ask-each-time default).
Status: NOT STARTED; needs APK (notification listener) and owner approval of the permission screen. A "paste a notification text" test box can be built first and tested without the APK.

### C. myUNEC notification-settings screen as a reference
What it does well: one master switch ("if you turn it off, no notifications arrive") with a plain explanation; then a short list of categories, each with its own switch and a one-line description; separate switch for the one time-based reminder type.
Apply to our Notifications settings (part of the simplify job): master switch on top; below, groups in plain words (Bills coming up, Budget warnings, Goals, Weekly summary, Tips); each switch with one sentence saying exactly what you will receive; the OS-level permission state shown honestly. Keep the warm, specific wording rule from the notification-rewrite job. Also note: their "More" page uses a searchable list with grouped sections (legal, support) - useful model for our Settings grouping. Status: NOT STARTED.


## Status 12 Nov (after Runs 51-52). What is DONE from this plan, and notes from the owner's 12 Nov message
DONE locally (see reports/Run 51 report.md, reports/Run 52 report.md): merge double counting; same-named accounts; account removal flow with Undo; Undo for transfers, debts, loans, payments, own categories, own subcategories; "Entries counted twice?" tool; test temp leak; bank statement import (ABB PDF + Excel, Unibank PDF, generic tables, pasted text).
STILL OPEN from the integrity job: newer-edit-wins for the same record (needs change stamps); balance check after a merge; Undo audit for budgets (setting a limit to nothing) and bills already has Undo.
STILL OPEN for statements: other banks' PDFs (need samples: Kapital, PASHA, Leobank, Birbank, Rabitabank...); a 'match the columns' screen for layouts the app cannot work out; move bank CSV files onto the new reader; category improvements from bank data (later job above); phone and APK check.
Google Cloud (owner screenshot 12 Nov): the console asked for a one-time 30 USD prepayment. That is for a billing account. Do NOT pay: Google sign-in and Drive appDataFolder need a project and an OAuth consent screen only. In the setup steps, skip 'Start free trial' / 'Activate'.
Birbank notification sample (12 Nov, card to card): title 'Card to Card'; lines 'PAN: <masked card>', 'Amount: 7.5 AZN' (one decimal, code after the number), 'Transfer from <dot> <last4>', 'Balance: <n> AZN', 'Remaining transfer limit for today: N transfers'. Lessons: amount may have one decimal; direction is in words ('Transfer from' = money in); an extra line that is not money ('4 transfers') must not be read as an amount; the balance line again allows the chain check. Third bank format after ABB and Google Wallet. Nothing from it is stored.


## Added 12 Nov (owner): learning from users without collecting personal data, and the ABB payment catalogue. PLAN ONLY, nothing built.

### A. Owner's idea: collect non-personal data to improve the app (example: places people pay at, so the built-in list grows)
Facts first:
- Today the app sends nothing about a person's money anywhere, and the Privacy screen promises that. Collecting anything needs (1) a server that receives it (the app has none; a free tier may do at first, but it is a running cost and a service to maintain), (2) a change to the Privacy text, (3) the person's clear permission, and (4) attention to Azerbaijan's law on personal data. A place name typed by a person can be personal ("to Aysel", a phone number, a home address), so it must be cleaned on the phone before anything leaves.
Recommendation: yes, but opt-in, off by default, small, and with a screen that shows exactly what would be sent.
Rules for anything collected:
- Never: amounts, balances, dates, notes, account or card numbers, names of people, location, contacts, anything that identifies the phone over time.
- On the phone first: drop anything that looks like a person's name, a phone number, a card or account number or an address; only the place name and the category the person chose leave the phone.
- On the server: a place enters the built-in list only when many different people (for example 20 or more) used the same name, and only after a human looks at it. Raw submissions are deleted after counting.
What would be worth learning, in order of value:
1. Place names and the category people give them (the owner's example): grows the built-in list with real Azerbaijani places.
2. Category corrections: when people change the category the app suggested for a known place, the suggestion is wrong; this fixes the list.
3. Bank statements the app could not read: which bank, and the SHAPE of the lines with every letter and digit masked (the "xxx 99.99 xxx" method used in Run 52). This is how support for Kapital, PASHA, Leobank and others can be added without anyone sending a real statement.
4. Crash reports: which screen, which error, app version, phone model; no data from the ledger. Today we only learn about crashes when the owner sees one.
5. Feature use counts (which screens and buttons are used at all): tells the simplification work what to hide or remove.
6. Speed on real phones (how long the app takes to open, how long an import takes): today only measured on the computer.
7. Language and app-version counts.
Cheaper first step that collects nothing: use public lists. The banks' own payment catalogues (section B) already name hundreds of real Azerbaijani companies by category. Start there.
Owner decisions needed before building: opt-in default (recommendation: off), whether a running server cost is acceptable, and the Privacy text. Status: NOT STARTED.

### B. ABB mobile app: payment catalogue seen in the owner's video (12 Nov)
Birbank part of the video: only a red flash and a black screen were recorded (the app most likely blocks screen recording). Nothing could be read from it. A few screenshots would work instead.
ABB groups: Mobile, Utility, HCC payments (residential complex service fees), Phone, Internet, TV, Parking, Government, Fines (DYP/AYNA), Transport (new), Loan, ABB loan, Mortgage payment, Insurance, Stores and e-commerce, Education, Nakhchivan, Betting, Taxi, Delivery, Donation, E-cash register operators, Other.
Compared with the app's categories:
- Already covered: mobile, internet, utilities (electricity, water, gas), building fees (Home), parking, fines (Car), loan payment, insurance, education, taxi, delivery, donations.
- Gaps worth considering (as subcategories, never renaming existing ids): Home > Heating (Azəristilik), Home > Mortgage, Bills > TV, Bills > Home phone, Finance > Government fees and duties. Betting: present in the bank's list; decide deliberately (a neutral "Betting" subcategory under Entertainment is honest; no promotion of it).
Companies visible in the catalogue (public business names) to add to the built-in place list, after checking each against the category above:
- Utilities: Azərişıq, Azərsu, Azəriqaz, Azəristilik (new).
- Home phone: Aztelecom/Baktelecom, AzEuroTel, TransEuroCom, Ultel.
- Internet (about 50): Aztelecom/Baktelecom, NEOTELECOM, HDnet, ALnet, Azerlink, Aznet, GOODNET, AzLink, MaxiNET, Alfanet, Artkom, AzEuroTel, SFERA NET, GoLine, GammaNet, GoTelecom, AzeronlineADSL, Azfibernet, AileNet, Azeuronet, TvNet, Blue TV, Eurosel, BossGroup, Fibernet, SuperOptik, Birlink, LinkNet, Megalink, Metronet, NetPoint, PROKSI, RR TELECOM, SN Telekom, Sazz, SelNet, SevenLine, Shakh internet, Uninet/SuperOnline, Caspel, Portflix Net, INET, NEST Fiber, ABONNET, FastNet, UserNet, SpeedNET, ATF Telecom, SkyLink Fiber, AZTECHNET, AtraNet.
- Taxi and drivers: 189 Taxi, Bolt, Maxim, OMEGA Taxi, Economy taxi, Emer Taxi, Alo taxi, TaxiMax, PILOT Sober Driver and 5050 Ayıq sürücü (sober-driver services; Transport > Taxi).
- Insurance: PAŞA Həyat, PASHA Insurance, A-Qroup Sığorta, Ateşgah, Qala Həyat, Qala Insurance, Xalq Insurance, MEQA Həyat Sığorta.
- Donations: Qarabağ Dirçəliş Fondu, Qızıl Aypara, Silahlı Qüvvələrə Yardım Fondu, YAŞAT Fondu (and AFAD, a Turkish agency).
- Stores and electronics: Kontakt Home, Baku Electronics, İrşad, Soliton, Emsan, HOMM Life, World Telecom. (İrşad was removed from the list on 8 Nov for lack of evidence; the bank's own catalogue is that evidence.)
- Parking: Bravo branch car parks, malls (Bakıxanov Mall, Blue Mall, JMR Plaza), Port Baku, Crescent, Naxçıvan airport. Mostly useful as hints in statement descriptions; not all need to be in the typing list.
- Residential complex fees (Yasamal 82 MMMC, RahatBina, Port Baku Residence and many more): too many and too local for the built-in list; better learned from users (section A) or from the category word "MMC/MTK" in statements.
How to use it: (1) built-in place list for typing suggestions, (2) category hints when reading bank statements and notifications, (3) the category gap list above. Status: NOT STARTED.


## Added 12 Nov (owner question): what happens to money left over at the end of a month. PLAN ONLY.
Facts from the code (App.jsx calcSafeToSpend, rolloverOffer; read 12 Nov):
- Safe to Spend counts ONLY this month: income received this month, minus this month's spending, bills still due and the savings amount. Money left over from last month is not part of it. So on the 1st of a month, before the salary arrives, Safe to Spend can show nothing although the person still has last month's money.
- The money is not lost: account balances add up everything since each account's opening balance, so the leftover is still in "Accounts and balances" (only for people who use accounts).
- Run 50 added one thing: in the first 7 days of a month, if last month ended with at least 1 left over AND a goal is unfinished, Home offers to add the leftover to that goal. With no unfinished goal nothing is offered. And a goal's "saved" is a number typed by hand, not linked to any account, so this moves no money; it only changes the goal's number.
- So the owner is mostly right: for someone who does not use accounts or goals, the leftover silently drops out of view.
This is the open owner decision already noted on 6 Nov ("Safe to Spend model: month-flow now; the Figma prototype shows account funds").
Plan (needs the owner's choice on the default):
1. Month-start card (days 1 to 7) whenever last month ended with money left over, also when there is no goal: "October: you kept 230 ₼. What should happen to it?" with three plain choices:
   a. "Keep it for this month": it is added to this month's Safe to Spend as "Left from October" (its own line in "How is this calculated?").
   b. "Put it towards a goal": the existing rollover, extended to offer creating a goal (for example a cushion fund) when none exists. Becomes a real contribution once goal contributions are built (plan item C8).
   c. "Leave it as savings": nothing changes in Safe to Spend; the month summary remembers it as saved.
   The choice is remembered per month; it can be changed in that month. Overspent months: the same card offers to count the overspend against this month ("Overspent in October: 40 ₼").
2. A setting to make the choice automatic ("Every month: keep it / move to goal X / leave as savings"), off by default so nobody gets a surprise.
3. A running "Kept since you started" figure in Analytics (sum of every month's left-over minus overspends), so saving becomes visible.
4. People who use accounts: Safe to Spend can alternatively be based on what the accounts hold (the account-funds model). Do not mix the two silently: offer it as a clear choice, with tests that money is never counted twice (carry-over plus account balance).
Tests: month with left-over, overspent month, no income last month, a refund or savings withdrawal (not earnings) in the carried amount, choice changed later in the month, year boundary (December to January), choice remembered across restarts, backup and restore keeps the choices, no double counting with accounts.
Status: NOT STARTED.

## Added 12 Nov (owner): scope rule and new tools
- Owner: the Privacy text change, the server and everything else that "learning from users" needs are made ONLY if that feature is actually built. Nothing changes before.
- The owner added Supabase and Context7 to this workspace. Supabase (database and server functions) is the natural candidate for the "learning from users" server; creating a project or anything that costs money needs the owner's go-ahead first. Context7 serves current library documentation (useful for pdfjs, Capacitor, React).
