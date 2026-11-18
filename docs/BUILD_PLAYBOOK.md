# Build playbook: what we learned building Expense Ledger

Written 17 Nov 2026 by Claude, from about four weeks of work (26 Oct – 17 Nov 2026, Runs 1–105) with the owner.
Purpose: when the owner, Claude or any other AI builds another app, website or tool, read this first and skip the mistakes we already paid for.

How to read it:
- **Part A** holds lessons that apply to any project.
- **Part B** holds lessons specific to Expense Ledger and to money apps in Azerbaijan.
- **Part C** lists the mistakes, each with the rule it produced.
- **Part D** is a start-of-project checklist.

Each rule says *why* it exists, because a rule without its reason gets broken by the next person.

Where a line says "(source: …)", the full story is in that file in this repository.

---

## Part A — Lessons for any project

### A1. How the owner and the AI work together

**Who decides.**
- The owner decides what gets built.
- The AI decides how to build it, inside the agreed scope.
- An idea, a remark, a screenshot or a competitor video is **not** an order to build. Write it down, give an opinion and wait for the words "build" or "do it".
  - Why: twice (5 Nov and 8 Nov) the AI started building after a remark. The owner had to stop it, and the unfinished work became clutter.

**Do not just obey; think.**
- Before carrying out any work order (from the owner, ChatGPT or a review), use the product yourself, read the code and do short research. Then say plainly where you agree, where you disagree and what you would do instead.
- After the owner makes an informed decision, respect it.
  - Why (27 Oct): "you … blindly follow my and GPT's instructions. Tell your opinions on things, do research, make suggestions."

**When the owner delegates a decision, decide.**
- Give the reasons in a few lines. Do not hand the question back.

**The owner is not a programmer.**
- Never give them a technical task the AI can do itself: running tests, editing files, reading logs.
- Their next step must always be clear and small: "approve publishing", "try X on your phone", "send me a sample".

**Keep the product simple.**
- Every feature is weighed against: "Can a person with little money knowledge and little phone skill use this without help?"
  - Why (8 Nov): "we kind of lost our way about keeping app simple, understandable and reachable for everyone."
- Smaller is better when it fully solves the problem. Order of preference:
  1. skip the feature;
  2. reuse existing code;
  3. use a platform feature;
  4. use an installed library;
  5. write the smallest new code.

**Use a second opinion.**
- The owner sends the AI's reports to ChatGPT for independent review, through a shared Notion database.
- The AI treats a review as evidence to weigh, not as orders. It answers each point: agree, disagree, or already done.

**Language practice.**
- The owner (Azerbaijani, about B2 English) gets one short English correction at the end of each reply. One line, no lecture.

### A2. Honesty about evidence

Use exactly six statuses for every requirement:
- NOT ASSESSED
- NEEDS WORK
- IMPLEMENTED BUT UNVERIFIED
- VERIFIED
- BLOCKED
- DEFERRED WITH REASON

Hard rules:
- A test file that exists has not necessarily run.
- A passing build does not prove the sums are right.
- A passing test proves only what it checks.
- Reading code does not prove what happens when it runs.
- Never say "done" for something planned, and never say "verified" without a recorded command and its result.
- Separate **confirmed defects** (shown by a test or a run) from **likely risks**, **unproven ideas** and **opinions**.
- When a claim in an earlier report turns out to be wrong, say so plainly and correct it. (An audit on 15 Nov found that "158/158" overstated what had been tested.)
- Say what was **not** covered: which screens, which phone, which language, which bank.

### A3. Reporting and memory between sessions

AI sessions lose their memory: the context fills up and gets compressed, usage limits hit, sessions end. Continuity has to live in files.

**Three records, updated after every finished piece (not only at the end):**
1. `PHASE_CHECKPOINT.md` in the repository, newest entry on top. It holds what changed, the commit, the tests with their counts, what is not verified, and the precise next step.
2. The AI's memory notes: one fact per file, with an index. Store decisions, preferences and lessons, not code facts that git already records.
3. A Notion report page for the human reviewers, plus one line at the top of a "Living Checkpoint" page.

**Save early.**
- Auto-compaction can come at any time. If a usage limit cuts the AI off mid-task, whatever was not written down is lost.

**Detailed report after every substantial step, in plain words:**
- what changed and why;
- the tests actually run, with exact counts;
- what is verified and what is not;
- risks;
- requirement statuses;
- the single most important next action.

**Context window.**
- On a limited plan, very long conversations cost more on every turn and get less accurate. Use the normal window, keep turns lean, and rely on the checkpoint files instead of a giant chat.

### A4. Testing that actually protects people

**What a test must check:**
- Tests drive the **real flow**: open, choose, undo or cancel, reload. They check **what was stored**, not only what the screen shows.
- Every bug fix gets a check that **fails on the old code** and passes on the new. If it would also pass on the old code, it proves nothing.
- Mutation testing (planting deliberate bugs to see whether the tests catch them) found weak spots that ordinary tests missed (`tests/mutation/`).

**Use the same build as the real thing.**
- The test bundle and the real production build differ. On 13 Nov the live site crashed for about 10 minutes, caused by a circular import that only the production build (vite) exposed.
  - Rule: before any push, build the real thing, serve it and open it (`tests/pwa/offline-check.mjs`).
  - After a push, open the live page and read the console.

**Bisect.**
- When a full-suite failure appears, find the first commit that broke it by testing commits in between. On 17 Nov a "test failure" turned out to be a real defect: a form field was hidden under the tab bar.
- Do not dismiss a failing test as "flaky" until you know why it fails.

**Keep tests away from the owner's files and disk.**
- Tests must never touch the owner's real folders or data.
  - Headless Chrome saves downloads to the real Downloads folder unless told otherwise. On 26 Oct, fake backup files landed there.
  - Browser test runs left about 83 GB of temporary Chrome profiles behind (found 10 Nov).
  - Rule: use temporary folders and throw-away profiles, and clean them up.
- Use synthetic (made-up) data only. Real financial data is never test data. If the owner shares a real bank statement, it stays in the AI's private scratch folder, is never committed, and is never quoted back.

**Date-dependent and environment-dependent tests.**
- Date-dependent tests can fail on the 1st–2nd of a month or around midnight. Write them so they do not.
- Environment variables do not carry over between separate shell commands. Set them in the same command that runs the test.

**Running the suite.**
- The full suite here takes about an hour. Run it in the background, and do not edit test files while it runs.
- Keep a file of expected check counts per test file (`tests/expected-counts.json`), so a silently skipped test is noticed.

**Test with people, not only with code.**
- Tests do not replace a phone in a hand. The owner's videos from a real phone (Poco F6) found keyboard, touch and motion problems that no desktop test showed.
- Method from the owner's 14 Nov video: give the phone to someone, name one task, say nothing, film their thumb. Every pause is an item on the list.

### A5. Releasing safely

**The gate before going live.** All must hold:
1. the exact tested files are committed;
2. the push is fast-forward only;
3. the full test suite passes;
4. the real build opens;
5. any change to stored data has tests that use old files;
6. there is no known open defect in money figures, data safety, security or privacy text.

**After the push:**
- wait for the hosting build (Vercel);
- check that the live bundle really changed;
- run a short smoke test on the live address with a throw-away browser and made-up data;
- send the owner the live link, what changed and how to roll back.

**Version and rollback.**
- Raise a visible version number every run (`APP_RELEASE`). Use a year-first date: "12.11" once confused a test.
- Always write down the rollback point: the previous live commit and its hosting deployment.

**Never, without explicit approval:** force-push, rewrite main, deploy somewhere new, spend money, change account security, add external integrations, delete user data.

**Standing permissions can be given and taken back.**
- Write down their exact wording and limits. Example: "push to live when there is no known risk" (29 Oct). Later runs were held back because the owner asked to approve publishing.

**Do not build extra deliverables nobody asked for.**
- On 14 Nov an Android APK was built, unasked, instead of publishing the finished web work: the wrong way round.

### A6. Code habits that prevented (or caused) breakage

- Put explanatory notes on their own line. Appending `// note` to an edited line commented out working code three times (13 Nov).
- Add files to git one by one, never "add everything": generated screenshots and evidence files would sneak in.
- Line endings on Windows (CRLF vs LF) silently created whole-file diffs. Know how each file is stored.
- Installing one package with npm removed the test tools (they were installed without being saved). Write down the reinstall line.
- Fix a bug once, at its root, for every caller. Do not patch each screen separately.
- Before deleting "unused" code, check references, build config, tests, migrations and documents. Some old files are recovery copies.

### A7. Design that feels native and calm

Most of these rules came from the owner filming the Claude Android app and a "does your app feel native?" video. They hold for any mobile web app or PWA.

**Motion** (checklist: `docs/CLAUDE_FEEL_CHECKLIST.md`):
- Bottom sheets rise in about 0.3 s: fast start, soft landing, no bounce.
- A choice lights up at once, then the sheet closes.
- Nothing appears or disappears with a jump; it opens and closes smoothly.
- Pages slide in from the right, and back slides them out.
- Swipe-back from the left edge follows the finger.
- "Reduce motion" turns movement off but keeps the result.

**The six thumb tests a stranger applies** (web-built apps often fail them):
1. A half swipe-back that changes its mind returns smoothly.
2. Tapping a text box never zooms the page. Inputs need at least a 16 px font on iPhone.
3. Tapping the tab you are already on scrolls back to the top.
4. A sheet pulled halfway follows the finger, then settles.
5. Fast scrolling does not stutter.
6. Buttons react when the finger *lands*, not when it lifts.

**Touch:**
- Every tap target is at least 44 px, using an invisible larger touch area around small icons.
- Haptic tick only when something actually changes, never on every tap.
- Android back closes the top layer first.

**The keyboard and fixed bars are a trap.** A bottom tab bar or a floating button can cover a form field. Rules:
- hide the bars while typing;
- scroll an opened form into view;
- check that a tap in the middle of each field reaches the field.

**Calm:**
- New information arrives as a notice (a bell or a small bar), and the person decides. Nothing big opens on its own.
  - Owner, 17 Nov: "instead of directly showing it to user … it should come as a notification and then user decides."
- Every change that removes or merges data offers **Undo**.
- Empty state: one drawing, one sentence, one button.
- Loading: a quiet placeholder, never a blank jump.
- Long explanations go behind an (i) tip. Consent text and text about what a money figure means stay visible.

**Controls:**
- A choice must always have a way back. Example: after picking "last 30 days", the person must be able to return to "all time".
- Related options sit **inside** the control they belong to (date ranges inside the calendar), not as loose suggestions next to it.

**Theme:**
- The default theme is neutral. Any extra themes appear as equal choices.
- When a theme is removed, people who used it are moved to one that exists.
- Check every theme for contrast before adding it.

**Apply the feel every time.** The owner noticed that new features shipped without the agreed feel ("You keep forgetting every time"). Run the feel checklist on every new screen, not only during "polish" runs.

**Judge by eye.**
- Look at real screenshots at phone width (390 px) and at narrow width (320 px), in every language, before reporting.
- Long Azerbaijani and Russian words break layouts that look fine in English.

### A8. Words on screen

- Write for someone with no finance knowledge.
- One standard file defines the plain wording: `handoff/plain-story.md`. It holds a three-sentence story of the app, one line per feature and a list of words to avoid.
- Avoid accountant words:
  - surplus and deficit → "not spent" and "overspent";
  - net position → "what you have minus what you owe";
  - forecast → "what the month will probably look like".
- A number says what it is ("spent …", "left …") and sits next to the thing it describes.
  - Example (17 Nov): "last month: 61" sat under *Monthly surplus* while it meant *spent*. That is a misleading figure, not a small cosmetic issue.
- Do not repeat the same comparison twice on one screen.
- Buttons say what happens ("Save", "Add", "Review"). An action keeps the same name throughout the flow.
- Error messages say what went wrong and what to do, without apologising.

### A9. Languages

**Translate everything.**
- Translation covers everything a person meets: navigation, forms, errors, confirmations, dates, numbers, currency, screen-reader labels.
- Automated checks: no English left on Azerbaijani or Russian screens, and no sideways scrolling at 320 px.

**Native review.**
- AI-written Azerbaijani and Russian need a native reader. Say so in every report until it is done; it still has not been done (open since Run 15).

**First launch.**
- Offer the language choice explicitly (Azerbaijani, Russian, English). Do not assume English.

**Vocabulary per language.**
- The owner chose "entry" over "transaction" in English.
- Azerbaijani and Russian may mix "əməliyyat/qeyd" and "операция/запись" where that reads naturally.

### A10. Money, cost and outside services

**Spending.**
- Do not commit to paid services without approval.
- Prefer free tiers and know their traps:
  - a free Supabase project pauses after 7 quiet days;
  - Google Cloud showed a 30 USD prepayment screen that is not needed for sign-in or Drive storage;
  - Google Play needs a 25 USD developer account.

**Privacy.**
- Know exactly what leaves the phone. Here that is: exchange rates, the version check, and optional opt-in counts. The privacy text must match the code; a false privacy sentence counts as a defect that blocks release.

**Usage tracking.**
- Analytics needs the owner's explicit approval. On 17 Nov the owner approved only an anonymous daily count; per-screen tracking was **not approved**.

**AI inside a money app.** Owner and AI agreed:
- AI explains, but never computes the figures.
- AI is opt-in.
- The key sits behind a server.
- Free-tier data-use terms are checked.
- Nothing is built until the owner says so.

### A11. Android and distribution

**Sideloading.**
- An APK that asks for notification access is **blocked** by Google's fraud protection when installed from a file ("may be used for financial fraud", 13 Nov).
- Ordinary users can only get such an app from Google Play. The owner's own phone works via USB (adb) plus "Allow restricted settings".
- Never tell users to switch Play Protect off.

**Before Play.**
- Play needs:
  - a real package name (not `com.example…`);
  - a release signing key;
  - a fresh OAuth client;
  - the content forms.
- Raise the Android versionCode on every APK.

**Wrapping a web app.**
- A web app inside an Android shell (Capacitor) still needs native-feeling keyboard behaviour and back-button handling. Test both on a real phone.

---

## Part B — Specific to Expense Ledger and money apps in Azerbaijan

### B1. The product

**Mission.**
- A "Personal Financial OS": record spending and income, see where money goes and what can still be spent, plan bills, budgets, goals, debts and loans.
- Azerbaijan first (AZN, ₼), in Azerbaijani, Russian and English.

**Local-first.**
- Data lives on the phone. No account is needed. Backups are files, with optional Google Drive later; Drive is blocked by the Google Cloud prepay screen.

**The key figure.**
- "Until your next income": what you can spend before your next pay, after bills, loans and savings. The calendar-month "Safe to Spend" stays as a clearly labelled second figure. (Owner decision D1, 17 Nov.)
- Never invent an income date. If something is missing, say what is missing.

**Owner decisions that shaped the app** (do not ask them again; details in the memory notes and `handoff/OWNER_DECISIONS_AND_MASTER_BACKLOG_20261106.md`):
- The + button sits bottom right.
- Quick-add templates live in Goals.
- A month calendar replaced the heatmap.
- An in-app number pad.
- Both people-debts and bank loans are supported.
- Numbers cards instead of a single "health score".
- The neutral Ivory theme is the default.
- Selectable themes only from palettes the owner supplies.
- "Paid from" stays in the main Add form, defaulting to the last account used, with an explicit "no account" choice (D10).
- Month-end: no rollover by default. Optional rollover of the unused part, capped at one limit. Overspending is never carried over.
- Rejected: paywall, motion blur, sound, voice entry (for now), SMS one-time codes.
- Security is a top-level priority (31 Oct).

### B2. Money-correctness rules (the hardest-won part)

**Store amounts as whole minor units** (qəpik, 1/100 ₼). Never use floating-point sums. Round once, at the edges.

**Write the formula down before changing code.**
- Each figure is described in `docs/MONEY_FIGURES.md`.
- Hand-calculate the expected result first, then write a test that fails on the old code.

**Double counting is the most common money bug.** It happened in several forms:
- a bill paid early as an ordinary entry, also counted as an unpaid bill (fixed Run 101);
- loan instalments on the Debts page plus the same loan as a recurring bill (D9: counted once, via a link or a name+amount match);
- a backup merged into a ledger that already had the same entries (fixed Run 51: same id / identical / similar / new, one-to-one).

  Rule: there is **one list** of unpaid scheduled payments (`openCommitments`), and every figure reads from it.

**Spending is not the same as cash leaving.**
- A loan payment's principal is cash out but not spending; interest and fees are spending.
- Money lent is cash out; a shared cost others will repay is only partly yours.
- Figures that start from account balances must use raw cash entries (Run 102 defect).

**Boundaries to test:**
- due on payday;
- the first and last day of a month;
- partial payments;
- already-paid instalments;
- a refund dated in the future;
- an empty ledger;
- an income date that is unknown.

**Show only figures that are actually supported.** A day total only appears when there are 2 or more spending entries; one entry repeated as a "total" is noise.

### B3. Data safety

- **The storage key is permanent.** The storage key `expense_ledger_v5` is never renamed, reset or replaced. All helper keys are prefixed with it.
- **Import is atomic.** Check the whole file first, then apply it in one step. A failure changes nothing and tells the person.
- **Undo** is offered for delete, merge, import, account removal, transfers, debts and payments.
- **Restore before fresh.** If someone signs in and a backup exists, show a preview of it before creating an empty ledger. Cancelling must not leave an empty app (Run 104b defect).
- **Write a queue to storage before processing it.** Android hands over bank notifications only once, so they are saved first (`__bankq`). If storage is full, fall back to showing the review at once.
- **Encrypted backup.** It needs a passphrase entered twice. The form must be fully reachable above the keyboard and the tab bar (Run 105 defect).
- **Removed things move, never vanish.** When a theme, category or account is removed, its records move somewhere that exists.

### B4. Bank data in Azerbaijan

Layouts are in `handoff/BANK_FORMATS.md` and `handoff/NEXT_WORK_PLAN.md`.

**Statements.**
- **ABB** (PDF and xlsx) and **Unibank** (PDF) are read in full. On real files, the bank's running balance confirmed every row (497/497 and 521/521).
- Other banks: NOT ASSESSED (no samples).
- The **balance chain** (previous balance + amount = next balance) is the best proof that a statement was read correctly.
- Use the bank's unique reference (RRN) to catch duplicates.
- ABB's xlsx has a damaged zip size entry that breaks some libraries; read only the sheet and the shared strings. Dates and amounts there are stored as text.

**Push notifications.**
- **Leobank** and **Birbank** formats are recorded. Notifications can be read on Android only with notification access, which runs into the sideload block (see A11).

**Rules.**
- Real statements contain name, ID, PIN and account number. Never store them in the repository, never quote them; test with synthetic copies.
- A bank notice is a *suggestion*. The person confirms each one: Add, Not mine, or Later, with Undo.

### B5. Market and competitors (evidence, not proof of demand)

**Büdcəm — "Ailə paketi" (family package).** Seen 17 Nov 2026 in the owner's 48-second ad video.
- **What the ad promises:**
  - two budgets (personal and family) in one app;
  - a one-tap personal/family switch at the top;
  - the buyer sets permissions: who sees what, show the family panel to a spouse, hide it from children;
  - add or remove family members;
  - shared goals and limits;
  - family loans, cash and card balances on one panel;
  - first 7 days free.
- **What the ad shows:**
  - a dark interface with green accents;
  - a big purple "Ailə büdcəsi 101 ₼" card;
  - a list of member toggles;
  - a "Kreditlər, nağd və kartlar — tək panel" screen.
- **The pain it sells:** "Pul hara gedir?" (Where does the money go?), and family spending turning into arguments.
- **What it tells us:**
  - a local competitor is selling household sharing as a paid plan, with a free trial;
  - "where does the money go" is the local pitch.
- **What it does not tell us:** whether people pay, how its syncing and privacy work, or whether the app is good. A video ad is marketing, not user evidence.
- **Meaning for us:** a family mode needs shared data between phones, which means a server, accounts, permissions and conflict rules. That is a big step away from local-first and from "no account needed". It is not built and needs an owner decision. A paid plan is under discussion only.
- **Deep research (17 Nov):** `reports/Büdcəm family package research.md`.
  - Büdcəm is about 4 weeks old, with 22 App Store ratings. Family is $2.99/month for the owner plus 4 members, with phone/SMS login, joined by invite link. Data goes to its servers, and to Gemini and Anthropic.
  - Cashera Family costs 7.99 ₼/month. Azerbaijani banks offer only child cards.
  - Safety research says shared money tools are used for control. So: a private space for each person, free exit with your own data, no hidden watching, no "head of family" control.
  - Recommendation, nothing built yet:
    - a one-person household ledger, with "for whom / paid by" and a shared-or-personal tag;
    - a read-only family summary sent through the share sheet;
    - live sharing later only with end-to-end encryption, never a server that can read the data.
  - Validate first with 8–12 household interviews.

**Earlier notes.**
- A Cashera-inspired list (13 Nov) is in `handoff/OWNER_QUEUE_2026-11-13.md`.
- The owner's "auto-read bank notifications" is a must-have.

**Treat reviews as hints.** Competitor reviews and ads show recurring pains; they are not validated demand. Test with a few real people before building big.

### B6. Process facts for this repository

- **Where to work.** In the worktree `Expense-ledger2-fixes` (branch `fix/financial-correctness-2026-10-26`). The original checkout at commit 6fb8cd1 is the protected baseline.
- **Live site.** Vercel deploys `main`. Release 102 is live (c19ca21); Runs 103–105 are local until the owner approves publishing.
- **Commands:**
  - logic tests: `node tests/run-logic.mjs`
  - full browser suite (~1 h): `node tests/run-browser.mjs App.jsx`
  - real build: `npx vite build`
  - pre-push check: `node tests/pwa/offline-check.mjs`
- **Testable logic** must sit above the "SVG icon system" marker in `App.jsx`. The test harness loads only that part.

---

## Part C — Mistakes and the rule each one produced

| Date | What happened | Rule now |
|---|---|---|
| 26 Oct | Tests saved fake backups into the real Downloads folder | Tests use temporary folders; check Downloads before and after |
| 27 Oct | Copied a reference design literally, shipped a stretched placeholder | Inspect, research and give an opinion before building an order |
| 5 Nov, 8 Nov | Built features after a remark, not an order | Record ideas; build only on "build" |
| 10 Nov | 83 GB of test browser profiles filled the disk | Clean temporary profiles after every run |
| 13 Nov | `// note` appended to code lines commented out working code (3×) | Notes on their own line |
| 13 Nov | Live site crashed for ~10 min (load-order bug the test bundle hid) | Real build + open it before every push; check the console after |
| 13 Nov | Sideloaded APK with notification access was blocked | Plan for Google Play; never ask users to weaken protection |
| 14 Nov | Built an APK unasked and left web work unpublished | Deliver what was asked; APK only on request |
| 14 Nov | Kept designing on the old theme after the owner chose Ivory | Write decisions down and re-read them before design work |
| 15 Nov | Audit found "158/158" overstated what was tested | Report exactly what ran; correct old claims openly |
| 17 Nov | New features shipped without the agreed "feel" | Feel checklist on every new screen |
| 17 Nov | A comparison figure sat under the wrong heading (misleading) | Each figure names itself and sits next to its subject |
| 17 Nov | Regrouping a page hid a form field under the tab bar | Test that a tap reaches each field; scroll opened forms into view |
| 17 Nov | "No income now" told people with no income to add income | Read every message from the point of view of the person in that situation |
| 18 Nov | Two open tabs each saved their own copy and silently undid the other's entries | Listen for the other tab's saves; never write blindly over what is stored |
| 18 Nov | The offline page was saved from a response already read, so offline opening stayed on an old release for weeks | Copy a response the moment it arrives; test that the offline copy changes after a release |
| 18 Nov | Analytics froze 1.3 s on a long history: a filter or sort was rebuilt for every single entry | Build filters and sorted lists once per month or category; prove the speed-up gives identical figures (old-vs-new comparison) |
| 18 Nov | Home kept yesterday's figures ("13 days left" instead of 12) when the app came back on screen the next morning (proven by e2e_run108_newday on 152be1a) | Anything cached with "now" inside must also depend on the day; the app now redraws the page when the day changes, but not while a text field is in use |
| 18 Nov | A flat-rate loan of a few manat over many months showed a negative last payment (the rounded instalment overshot); hand-picked loan tests never tried it | Run money rules on thousands of random inputs (property tests) and check the rules every result must keep, not only chosen examples; plant a fault to prove each test can fail |

---

## Part D — Checklist for starting a new project

1. Write down who decides what, which actions need approval (push, deploy, spend, delete, integrations), and the owner's standing permissions in their own words.
2. Create the continuity files on day one: a checkpoint (newest on top), a decisions log, and a backlog of ideas that are *not* orders.
3. Agree on the six evidence statuses and the report format.
4. Name the one permanent storage key or database schema version, and the migration rule, before any data exists.
5. Decide the languages and the first-launch choice; set up an automated check for leftover untranslated text.
6. Write the plain-wording story (three sentences, one line per feature, words to avoid) before writing screens.
7. Set up tests that check stored data, use temporary folders and made-up data, and clean up after themselves.
8. Set up the release gate: real build opens, full suite, rollback point, live smoke test, version number.
9. Write a motion and touch checklist (this file's A7) and apply it to every new screen.
10. Record what leaves the device, and keep the privacy text equal to the code.
11. For every money figure: write the formula, hand-calculate examples, test the boundaries, and keep one source for scheduled payments.
12. Before building any big feature: who needs it, what evidence exists, what it costs to keep, and what simpler version would do.
