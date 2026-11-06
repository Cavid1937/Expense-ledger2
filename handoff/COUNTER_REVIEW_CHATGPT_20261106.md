# Expense Ledger — Claude counter-review of the ChatGPT review (2026-11-06)

Review and planning only. No code, data, storage key, commit, push or deployment was changed. This file is new and untracked.

## 0. Evidence boundary (read this first)

| Kind | What it covers |
|---|---|
| **Inspected source** (read in the worktree today) | `App.jsx` (3,359 lines), `screens/*.jsx` (9 files), `i18n.js`, `main.jsx`, `styles.js`, `public/sw.js`, the Android project's `AndroidManifest.xml`, `build.gradle`, `variables.gradle`, `native-share*.js`, `MainActivity.java` |
| **Executed today by me** | (a) read-only probes of the live logic through the test harness (clock fixed at 13 Oct 2026): Safe to Spend double-count cases, money-text cleaning, CSV columns, goal monthly maths, 0.1+0.2+0.7 summing; (b) earlier in this session: the full clean-room gate on 3c98ab3 (gate70: logic 1,211/0; browser 81 files, 1,395/0; az audit 0; build OK), and a new 13-check selection test plus two older selection tests |
| **Git facts** (`git rev-parse`) | local HEAD = `origin/main` = `3c98ab3`. The working tree has **uncommitted** changes (status-bar fix, import-picker fix, an unrequested transaction-selection feature, evidence files) |
| **Reported only** (Notion pages, not reproduced by me) | Run 25 and 25b results, 1,200 logic / 1,212 browser checks on `bcfe08d`, colour-blind numbers, the "How it works" formulas page (written at commit 30bbc0f), Run 18a, Feature Ladder, 20-topic research, the Living Checkpoint |
| **Owner-observed** | Three phone screenshots from the Poco F6 (today) and the owner's statements that the APK now works |
| **Not found** | ChatGPT's own review text, its Privacy Policy draft and its Terms of Use draft are **not** among the eight Notion pages and a Notion search did not surface them. I only have the owner's summary of the ChatGPT review. I therefore cannot assess the drafts line by line; section 5 gives a checklist they must be held to. Please send me the drafts. |

Two caveats about the Notion pages: the Living Checkpoint's newest text is from 31 Oct (it still says tests are not in git; `git status` now shows `tests/` tracked), and the Run 25b numbers were gated at `bcfe08d`, which is not the candidate that is live now (`3c98ab3`). The numbers are encouraging but describe an older commit.

## 1. Executive assessment

**The core is better than the surrounding story, and the surrounding story is weaker than the core.**

What is genuinely strong (inspected): local-first storage with validation per record, a permanent storage key, recovery copies, all-or-nothing import, a debts store that refuses to overwrite damaged data, cent-based sums, an explainable Safe to Spend, a forecast that hides itself unless a backtest supports it, an honest in-app privacy notice that says the PIN lock is not encryption.

Uncomfortable truths, in order of importance:

1. **No real user other than the owner has used it.** 28 runs of engineering sit on zero validated demand. The survey form exists; I have not seen results. This is the biggest strategic risk, bigger than any bug.
2. **The tests are written by the same agent that writes the code.** Run 18a admits the "fails before the fix" step was not executed. 1,395 passing browser checks prove consistency with my own expectations, not correctness against an outside authority. No accountant, no second implementation and no independent oracle has checked a formula.
3. **Android is half-prepared.** Package id is the placeholder `com.example.expenseledger.spike`; no release signing key exists; `android:allowBackup="true"` means Android may copy app data (including the ledger held in WebView storage) into the user's Google backup, which contradicts "data stays on this device" unless disclosed or turned off; the owner's use is informal, not a recorded device test.
4. **Analytics is already enabled in production.** `main.jsx` loads the Vercel Web Analytics script on the https site. The in-app notice discloses this correctly. Any new "growth dashboard" must start from that fact, not from zero.
5. **One screen shows two different "balances".** In the owner's Home screenshot the month card says "Balans −8.20 ₼" (income minus spending this month) while the account card directly below shows "ABB Card 13.96 ₼". A non-expert will read that as a contradiction. (CONFIRMED from screenshot and `home.balance` in `i18n.js`.)

Direction: freeze visual work after one phone check, close the correctness and release-blocking gaps in section 9, validate with real users, then add features in the order in section 8.

## 2. Runs 25 and 25b

| Decision | My assessment | Verdict |
|---|---|---|
| Four equal type tiles (Expense, Income, Loan, Debt) | Fewer taps for loans and debts; matches how people think. Not tested with users | Retain. IMPLEMENTED BUT UNVERIFIED (user test) |
| Safe to Spend as the one big number, runway ticks (27d) | Correct hierarchy for the product's differentiator. Caveat: it shows only when its switch is on (and shows a "no income yet" state when none is recorded this month). It is absent from the owner's Home screenshot, so on that phone the hero is not visible; reason not checked (switch off is likely) | Retain |
| Tonal surface scale, hairlines, shadows only on floating items, solid bars | Good low-end-Android choice (no blur) | Retain. Phone look: owner-observed, informal |
| Onest font, self-hosted | Renders on the Poco F6 (screenshots). az and ru glyph coverage was checked in font files, not by native reading | Retain. VERIFIED on one device (screenshots); other devices NOT ASSESSED |
| Measuring-cup bars, double rule, new-row tint | Decorative; harmless | Retain, then stop |
| Mist theme colours changed | Reported: simulated deuteranopia difference 15→32, contrast kept | IMPLEMENTED BUT UNVERIFIED (not independently reproduced) |
| Dark-theme income/expense pair weak under simulated deuteranopia (~14) | Real but already mitigated: every amount carries "+" or "−" and a label, which satisfies the "not colour alone" rule. Priority medium, not release-blocking. A cheap fix is a shape cue (arrow icon), not another palette hunt | NEEDS WORK (medium) |
| Native az/ru wording of new settings and theme names | Still draft. Financial terms (Xalis/Fərq, Balans) matter more than theme names | NEEDS WORK (release item) |
| Settings as expandable sections, status-bar inset, import picker (this session) | Owner confirmed they work. Not committed, not gated | IMPLEMENTED BUT UNVERIFIED (gate not run on these edits) |

**Design verdict:** retained as is. Defer: cultural motifs, extra themes, more animation. Do not open a new redesign cycle. Exit criterion for design: one recorded phone pass (320, 360, 412 wide; largest font setting; each theme) with the issues fixed, then freeze until user feedback arrives.

**Source/deployment/test correspondence:** `3c98ab3` is live, tests ran on it (gate70). The three documents in Notion describe earlier commits. Rule going forward: every report quotes the commit, the gate log name and the live bundle hash together.

## 3. Financial correctness and data safety

Classification: CONFIRMED defect, CONFIRMED behaviour needing a decision, SUSPECTED risk, MISSING coverage. Source version: `3c98ab3` unless stated.

| # | Area | Evidence | Expected vs actual | Class | Impact / priority | Fix | Regression tests |
|---|---|---|---|---|---|---|---|
| F1 | Safe to Spend double counting | Probe: income 2,000, rent bill 500 due 25th, today 13 Oct. Linked future payment → remaining 1,500 (correct). **Same payment entered as a future-dated entry not linked to the bill → 1,000** (counted as an entered expense and again as a bill still to come) | Expected 1,500 | CONFIRMED behaviour; user impact SUSPECTED (depends on how often people pre-enter bills unlinked) | Understates spendable money by the bill amount. High | Match an unlinked entry to a bill by category + merchant + amount + near date, or ask once ("Is this your rent bill?") when saving a future-dated entry; show a line "includes 500 entered ahead" | Add cases to the Safe to Spend suite for unlinked/linked/duplicate-month |
| F2 | Android decimal input (145.67 → 14567) | Historical. Current: money boxes are text with decimal keypad; `cleanMoneyText` maps "145,67" → 145.67, "1.234,56" → 1234.56 | Fixed since Run 17 for decimals | Historical defect: not reproduced in current source. VERIFIED by probe on the cleaning function; Poco F6 comma keyboard not recorded | n/a | Keep | Exists |
| F3 | Thousands text | Probe: "1,234" → "1.23" (single comma is read as decimal, extra digits cut). Visible in the field, but a pasted "1,234" silently becomes 1.23 | Ambiguous input; a 3-digit group after a single comma is almost always thousands | SUSPECTED risk (visible, low frequency) | Medium-low | If exactly 3 digits follow a single comma, ask or treat as thousands; or show the parsed amount live | Add boundary cases |
| F4 | CSV export loses loan/debt links and **accounts** | `buildCsv` columns end at Wallet, Trip; no Account, no loan interest, no debt link. Probe confirmed the row drops them | Backup JSON keeps them; CSV is a partial copy | CONFIRMED gap | CSV is not a backup; a person using CSV as backup loses account assignment. Medium | Add Account and Interest columns (appended, so older readers still work); label CSV in-app as "for spreadsheets, not a full backup" | CSV round-trip test with an account and a loan row |
| F5 | Debt repayment cash flow | Design: owner chose "ask each time"; linked entries are hidden from spending/income views but appear in account balances | Two screens can differ legitimately (month figures exclude principal, account balance includes it) | Needs verification, not a defect | Medium | Add one explanatory line where they differ; add a test with a debt-linked entry that has an account | New test |
| F6 | Loan principal vs interest | Rule: full instalment is cash out, only interest counts as spending, unknown split counts as nothing. Run 18 edge tests exist (reported) | Matches owner's rule | IMPLEMENTED; tests reported VERIFIED by Claude only | Medium. The "unknown split = nothing" choice **understates spending** for users who never enter interest | Prompt once for the split when a loan is created (schedule gives an estimate) | Existing + one for prompted estimate |
| F7 | Forecast reliability | Method described in the formulas page: median-capped daily average, band from standard deviation, shown only if a backtest passes in 2/3 of at least 2 months | Sound for a personal tool; with fewer than 3 months of history the forecast is mostly hidden | IMPLEMENTED; statistical claim NOT ASSESSED independently | Low-medium | Keep hiding; word it "estimate if you keep spending like this" | Exists |
| F8 | Goals | `goalRequiredMonthly` probe: 1,000 target, deadline 31 Dec, today 13 Oct → 2 periods → 500/month; deadline this month → 1,000 | Matches the documented rule (month-starts after today up to deadline month) | VERIFIED for the probed cases | Medium: rule "first of the month" is a convention the user must understand; wording check needed | Keep; show "payments on the 1st of Nov and Dec" | Exists |
| F9 | Money precision | Probe: 0.1+0.2+0.7 → 1 exactly (cent sums). Accounts sum in cents; debts in integer qapik | Correct | VERIFIED by probe on the tested paths | — | Keep | Exists |
| F10 | Planned vs completed | Future-dated entries are "planned"; Safe to Spend counts them as committed; other screens do not count them as spent | Deliberate and documented | IMPLEMENTED. A person may think "planned" is double counted (see F1) | Medium | Wording on the card | Exists |
| F11 | Backup, import, migration, storage failure | Reported: atomic import, undo, recovery copies, mirror of bills for downgrade; simulated (not real) quota failures | Safe on tested paths | IMPLEMENTED; real quota failure and real phone restore NOT ASSESSED | **High for trust** | One scripted real-device round trip: export on phone A, import on phone B, compare totals | Device checklist |
| F12 | Error recovery | `ErrorBoundary` exists, writes a local crash log; the owner's old "blank screen" report predates it | Friendly screen with data-is-safe wording | IMPLEMENTED; "copy error note" flow not verified on a phone | Medium | Verify once | Browser test exists (reported) |
| F13 | Unexplained test flake | gate69: `e2e_lang` 56/57, three clean reruns, cause unproven | A flake in the language test can hide a real wording regression | SUSPECTED, MISSING root cause | Medium | Capture the failing line with a retry-with-log harness | n/a |
| F14 | Home "Balans" label | See section 1 | Month net should not be called "Balance" while accounts show balances | CONFIRMED UX/financial-meaning defect | **High** (trust) | Rename to "Net this month" (az: "Aylıq fərq", ru: "Итог за месяц"), after native review | Update copy test |
| F15 | Android auto backup | `allowBackup="true"` | Privacy notice says nothing leaves the phone | CONFIRMED configuration; actual behaviour on the Poco F6 NOT ASSESSED | **High for the privacy claim** | Decide: turn off, or keep it deliberately and disclose | Manual check |

## 4. Product opportunities (inspected against the code)

Many of ChatGPT's "missing" items already exist. Status below is from source, not from reports.

**Already present (do not rebuild):** accounts, cash/card/mobile wallet tags, transfers, split transactions, custom categories and subcategories, debts and loans with schedules, recurring items and bills, bill calendar export (.ics), quick-fill templates, duplicate-an-entry, number pad, budget limits with crossing detection, goals with required monthly amount and what-if, "get set up" checklist, app lock (PIN, fingerprint where allowed), privacy mode, bank-statement CSV mapping (generic header matching, az/ru/en), month calendar, Settings-level language chooser.

**Not present:** receipt photos, labels such as Personal/Family/Business (only "Trip" exists and works as a group), automatic cloud backup, demo mode, yearly report view (Analytics is monthly plus all-time; yearly not assessed), reminders beyond the calendar file, savings scenarios beyond the goal what-if, multi-currency, sharing.

**Overlooked by the review (my additions):**
- Net-position line (accounts + owed − owing − loan balances) already added in Run 28; a **yearly summary** would complete the reporting story cheaply.
- **Auto-link a pre-entered bill** (F1): the highest-value correctness feature.
- **A single "what does this number mean" tap** on Safe to Spend, Balance and Net, using the existing How-it-works sheet.
- **Restore-test mode:** a button that imports a backup into a scratch copy and shows "N entries, balance X" before committing; turns the backup promise into something users can see.
- **Backup nudges tied to risk** (lost phone is the dominant loss scenario; no sync exists).

### Feature table (benefit / complexity / data impact / privacy / cost / dependencies / tests / priority)

Cost column: **F** = free, **FL** = free within limits (needs checking), **M** = ongoing maintenance, **P** = paid or approval needed.

| Feature | Benefit | Complexity | Data/migration | Privacy | Cost | Depends on | Tests | Priority |
|---|---|---|---|---|---|---|---|---|
| Auto-link/duplicate guard for pre-entered bills (F1) | High | Low | None | None | F | none | Safe to Spend suite | **P0** |
| CSV columns for account and loan interest (F4) | Medium | Low | None (appended columns) | None | F | none | Round trip | P1 |
| "Balans" relabel + explanation (F14) | High | Trivial | None | None | F | native review | Copy test | **P0** |
| Allow-backup decision (F15) | High | Trivial | None | Fixes a claim | F | owner decision | Manual | **P0** |
| Restore preview ("this file contains…") | High | Low-medium | None | None | F | none | Import suite | P1 |
| Yearly report | Medium | Low | None | None | F | none | Sum equals months | P2 |
| Labels (Personal/Family/Business) | Medium | Medium | New field on entries; downgrade hazard like bills | None | F | design note | Backup/import/downgrade | P2 |
| Receipt photo attach | Medium | High | Separate storage (IndexedDB), bigger backups | **Sensitive** (photos) | F (device storage) | backup redesign, privacy text | Quota, backup size, deletion | P3 |
| Receipt OCR | Unproven | Very high | — | Cloud OCR breaks local-first; on-device OCR quality in Azerbaijani NOT ASSESSED | P/M | receipt photos | — | DEFERRED WITH REASON |
| Google Drive backup (own Drive) | High (lost phone) | High | None | OAuth consent; Google sign-in | FL (OAuth app verification can take time) | owner's Google Cloud project, final app id | Offline, token expiry | P2, **owner approval** |
| Cheaper alternative: keep share-sheet backup plus deliberate Android auto-backup rules | Medium-high | Low | None | Needs disclosure | F | F15 | Manual | P1 |
| Local reminders (Android) | Medium | Medium | None | None | F | Android plugin, device tests | Device | P2 |
| Onboarding and demo mode | Medium | Medium | Demo data must be kept apart from real data (separate key, never in backup) | None | F | none | Isolation test | P2 |
| Better irregular-income handling | Medium | Medium | None | None | F | rules design; today Safe to Spend needs income received this month | Scenario tests | P2 |
| Bank-statement presets | Medium | Medium | None | None | F | 2-3 anonymised real statements from the owner | Preset fixtures | P2, blocked on samples |
| Bank sync, Open Banking, Google/Apple Pay | Unknown | Very high | — | High | P | verified API access, licence, legal | — | **BLOCKED / DEFERRED** (no verified access in Azerbaijan; Open Banking eligibility not assessed) |
| Shared/family groups, cross-device sync | High for some | Very high | New server | Changes the privacy promise | P/M | backend, auth | — | DEFERRED WITH REASON |
| Business mode | Unvalidated | Very high | — | — | P/M | interviews | — | DEFERRED WITH REASON |
| Health score | Low | Low | — | Shames users | F | — | — | Rejected (owner already chose numbers card) |

## 5. Privacy, security and legal

**Facts about the real product (source):**
- Data: transactions, budgets, goals, bills, settings, debts, accounts are stored in the browser's localStorage under `expense_ledger_v5` and side keys. No account, no server copy.
- Network, web build: ordinary loading of the site and fonts (self-hosted, no Google Fonts); a same-origin version check; a service worker that caches the site's own files; **Vercel Web Analytics** script (page views, country, device type; cookieless; no ledger data). Vercel keeps technical logs (IP, time).
- Network, Android build: the analytics script is **not** included in the native `main.jsx`; the manifest requests INTERNET only. No camera, location, contacts or microphone permission.
- Files: backups and CSV leave the app only through the share sheet or download, to wherever the user sends them. Not uploaded by the app.
- No receipt feature exists, so nothing about receipts can truthfully be promised or disclosed yet.
- Security: PIN is a salted PBKDF2-SHA-256 hash under its own key; it is a screen lock, **not encryption**. Data and backup files are readable. The in-app notice already says this.
- Crash notes stay on the device.

**What the drafts must say, and what they must not:**
1. Must not claim encryption, "bank-grade" security or that data "cannot" leave the device while `allowBackup` is true (F15).
2. Must name Vercel as host and analytics provider, IP and approximate location processing, and the fact that IP processing happens outside Azerbaijan (cross-border transfer) — **for the Azerbaijani lawyer**.
3. Must describe the Android auto-backup behaviour once decided.
4. Must separate the website (analytics on) from the Android app (analytics off).
5. Must say there is no recovery without a backup file.
6. Must say the app gives no financial, tax or legal advice; Safe to Spend, coach and forecast are estimates; loan schedules are estimates and the bank contract prevails.
7. Future integrations (Drive backup, receipts, bank import) need their own sections before launch; do not pre-announce them.
8. Terms: no warranty claims the product cannot support; limitation of liability and governing law are matters for Azerbaijani legal review, not for me.

**Needs owner input:** legal name of the operator, contact email, whether Play Store distribution is intended, whether analytics stays on, the Android backup decision. **Needs Azerbaijani legal review:** personal-data registration or notification duties, cross-border transfer wording, consumer-protection terms, liability wording. I did not research those laws today and give no legal conclusion. **Final documents:** must be written once the above are decided, then translated and checked in az, ru and en.

Status: privacy policy and terms, **NOT ASSESSED** (drafts not available to me); in-app notice, IMPLEMENTED and accurate against source except the allow-backup gap.

## 6. Where I agree and disagree with ChatGPT

**1. What it got right:** visual progress is meaningful; real-device and native wording are still open; correctness and data safety stay first; do not promise bank sync; separate visits from users; keep analytics free of ledger data; privacy drafts must match reality.

**2. What it overlooked:** `allowBackup`; the placeholder app id and missing signing key; analytics already enabled; the two "balances" on Home; CSV missing account; the F1 double count; the "1,234" parsing case; test independence; the stale Notion numbers (older commit).

**3. Impractical or too complicated:** a custom Owner Analytics & Growth Dashboard. Anything that stores visitor or feature events needs a server and storage, which breaks the local-first promise and adds a privacy duty. Vercel's own dashboard already gives page views, referrers, countries and devices (free within plan limits; I did not verify the current limits, check before relying on them). Feature-usage events are a plan-dependent extra (not verified). The native app has no analytics at all, so Android users are invisible to it. Referral analytics cannot reveal who shared a link; use separate tagged links per channel (owner-controlled) instead. Open Banking and wallet integrations: not feasible without verified access.

**4. Already covered by existing features:** accounts, transfers, split, categories, debts/loans, templates, duplicate entry, .ics, number pad, checklist, bank CSV mapping, goals what-if, app lock, privacy mode.

**5. Greatest genuine value:** F1 fix, "Balans" clarity, a visible backup/restore round trip, native-quality financial wording, then real users.

**6. Excessive cost, complexity or data-loss risk:** Drive OAuth, receipt photos and OCR, labels (downgrade hazard), multi-currency, sync, any server.

**7. Prioritise differently:** ChatGPT lists colour-blind accessibility first among open items; the sign-prefixed amounts make it medium. I put privacy-claim accuracy, backup behaviour and the double count above it.

## 7. Roadmap classes

- **A. Unfinished requirements:** native az/ru review; real-device matrix; privacy policy and terms; release signing and app id; clean commit and gate for this session's edits.
- **B. Confirmed defects:** F14, F4, F1 (behaviour), F15 (configuration).
- **C. Verify or improve:** F5, F6, F11, F12, F13, colour-blind shape cue, Safe to Spend wording.
- **D. Valuable missing:** restore preview, yearly report, labels, demo mode, irregular-income rules, reminders, bank presets, optional Drive backup.
- **E. Prerequisites:** independent test oracle (see 8), device test checklist with recorded results, one authoritative versions table (commit ↔ gate ↔ live bundle), backup/rollback design note before any new stored field.
- **F. Optional:** more themes, motifs, extra animation, yearly poster-style summaries.
- **G. Deferred with reasons:** bank sync/Open Banking/Pay wallets (no verified access); business mode (no demand evidence); OCR (accuracy unproven, cloud breaks privacy); sync and sharing (needs server); paid plans (no evidence).

## 8. Recommended sequence

1. **Settle the working tree.** Owner decides on the unrequested selection feature (keep or remove). Gate and commit the two confirmed phone fixes only.
2. **Trust fixes (P0):** F14 label, F1 bill auto-link or guard, F15 decision. Each with tests.
3. **Independent check of the numbers:** build a small hand-calculated reference workbook (or have an accountant or a second reviewer verify 10 scenarios: Safe to Spend, loan interest, goal months, net position). Run the app's formulas against it. Add mutation testing for the five most important functions so tests are shown to fail when the formula is broken.
4. **Backup trust:** restore preview, CSV columns (F4), one recorded real-device export/import round trip, then decide Drive.
5. **Native az/ru review** of financial terms and the privacy text, by a person, not by me.
6. **Privacy policy and terms** after step 2 and the owner's inputs; Azerbaijani legal review before any public store listing.
7. **Release engineering:** real application id, signing key (owner keeps the key and its backup), Play data-safety and financial-features declarations (requirements NOT ASSESSED; check the current Play policy), target API check.
8. **Validate with 10 real users** from the survey, observing a task list; only then choose among D-class features.
9. **Then** reporting extras, labels, demo mode, reminders, bank presets (with real statements).

## 9. Release-blocking requirements (public release; the owner's personal use is already possible)

1. F14 and F1 fixed and tested.
2. F15 decided and the privacy text matches.
3. Privacy policy and terms published in az/ru/en after legal review.
4. Real application id, release signing key, key backup.
5. A recorded device test: install, add, close, reopen, export, import on a second phone, lock, language switch, largest font.
6. Native review of financial terms in az and ru.
7. A written rollback procedure and a versions table (commit, gate, bundle).
8. `e2e_lang` flake explained.
9. Play requirements checked (NOT ASSESSED today).

## 10. Decisions that need the owner

1. Keep or remove the transaction-selection feature I built without being asked.
2. Android auto-backup: off, or on with disclosure?
3. Rename Home "Balance" to "Net this month"?
4. How to treat a pre-entered future bill: auto-match, or ask once?
5. Operator name and contact for the legal pages; is Play Store distribution planned?
6. Keep Vercel Analytics on for the website?
7. Provide 2–3 anonymised bank statements for presets, and the survey results.
8. Approve the independent check of the formulas (who: an accountant or a second reviewer).
9. Approve starting the Google Drive backup work (needs your Google Cloud project) or prefer the share-sheet route.

## Status summary

| Item | Status |
|---|---|
| Financial maths on the paths I probed (cents, goals, loans via reported tests) | VERIFIED for those paths |
| Safe to Spend with unlinked pre-entered bill | NEEDS WORK |
| CSV completeness | NEEDS WORK |
| Backup real-device round trip | NOT ASSESSED |
| Visual design (Runs 25/25b/27) | IMPLEMENTED BUT UNVERIFIED on devices beyond one phone |
| Colour-blind check | IMPLEMENTED BUT UNVERIFIED (medium) |
| az/ru native wording | NEEDS WORK |
| Privacy policy / Terms | NOT ASSESSED (drafts not found); legal review BLOCKED on owner and lawyer |
| Analytics dashboard (custom) | DEFERRED WITH REASON; Vercel built-in dashboard exists |
| Open Banking, bank sync, Pay wallets | BLOCKED (no verified access) |
| Google Drive backup | NOT ASSESSED / awaiting owner approval |
| Release readiness (public) | NEEDS WORK |
