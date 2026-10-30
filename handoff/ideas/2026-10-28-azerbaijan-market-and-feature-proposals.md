# Azerbaijan market scan + feature proposals (backlog D16–D18, first pass)

Written by the unattended research run "ideas-evening", 2026-10-28 (night). No app source or tests were edited.
Labels: **Confirmed** (read from an official/primary page by this run), **Likely** (several consistent secondary sources, or general technical knowledge not re-checked today), **Hypothesis** (needs user validation), **Opinion** (my judgment).
Search tool limits: results are summaries; I fetched the pages named below. Reviews/forum posts are qualitative only. Hands-on testing of Azerbaijani bank apps was NOT done (NOT ASSESSED).
`PRODUCT_VISION_AND_STRATEGIC_NORTH_STAR.md` was searched for in the project folder: **not found** (not invented).

## 1. What changed in the market since the 2026-10-27 assessment
The earlier assessment (`claude-assessment-2026-10-27.md`) said "no public API yet; bank import is not realistic". Today's findings **refine** that:

| # | Fact | Label | Source / date |
|---|---|---|---|
| 1 | Birbank (the app of Kapital Bank) has launched "Open banking": a user can add accounts held at **other banks connected to the national open-banking system** and see them in the Birbank app; transaction history covers **90 days**; deposits and loans are not shown; no transfers/payments; accounts and permissions can be removed/revoked any time. The page names no spending categories or analytics. The page carries **no publication date**. | Confirmed (bank's own page) | https://birbank.az/en/news/a-new-era-of-digital-banking-monitor-all-your-banking-transactions-in-birbank (read 2026-10-28) |
| 2 | The Central Bank (CBA) launched the first phase, a "National Open Banking platform", on 6 Oct 2025; open banking is "still early". | Likely (Salt Edge blog, 2026-03-30; a vendor, not the regulator) | https://blog.saltedge.com/open-banking-in-azerbaijan-workshop/ |
| 3 | CBA says it finished one strategic stage and will begin expanding toward Open Finance; no timeline; no word on third-party providers. | Confirmed (news report of a CBA statement) | https://www.trend.az/business/4202422.html (2026-06-29) |
| 4 | Whether an independent app like ours can become a registered Account Information Service provider, what it costs and what the API terms are: **not found**. The earlier assessment's "AISP only need to register (May 2026)" claim was not re-found today; treat it as unverified. | NOT ASSESSED | – |
| 5 | CBA's fintech site fintech.cbar.az exists since 3 Sep 2025 (open banking, special regulatory regime). It is the place to look for the real rules. | Confirmed | https://www.cbar.az/press-release-5245/central-bank-launches-new-digital-platforms |

**Opinion – what this means.** The biggest bank app (Birbank, reported ~3.4 million users in a third-party source, 2024 – Likely) now offers "all my bank accounts in one place, 90 days, read-only". This weakens the pitch "we aggregate several banks" *if* the user's banks are connected. It does **not** cover: cash, planning (Safe to Spend, bills, goals), categories you control, history longer than 90 days, or privacy (the bank sees everything). Our defensible position stays **cash + planning + privacy + trilingual + works offline**, not aggregation. Bank import is *not* a near-term build, but we should track it (see proposal P8).

### Competitors (qualitative)
- **Bank apps** (Birbank, ABB Mobile, PASHA Bank apps): transfers, bill payments, card info; PASHA's apps are in az/ru/en (Likely – third-party aggregator pages). Budgeting/categorisation inside them: **not found/NOT ASSESSED**. Next step needs a human to open each app (store listings + screenshots) – put on owner's list.
- **Telegram bots / global trackers**: ExpenseLens, Cointry, PocketFlow, ReceiptA, TeleExpense, TaskForge, DollarBot (search results, 2026). None confirmed to support Azerbaijani, AZN-specific features or local banks (Confirmed: absence in the search results only, not proof of absence). They show that "type a sentence → entry" and "receipt photo → entry" are the common AI-era patterns (Likely). They typically need an account/server → privacy is a point of difference for us.
- **Global apps** (YNAB, Monefy, Wallet, Money Manager etc.): not re-researched today; NOT ASSESSED for az/ru localisation quality.
- **Evidence limit:** no Azerbaijani user reviews were read today. All "pain points" below are **Hypotheses** until we read store reviews and talk to 5–10 people.

## 2. Personas — what each would reject or love (Opinion / Hypothesis)
- **Student, low income**: loves fast entry (≤3 taps), no account, free. Rejects anything that feels like homework, ads, or subscription. Needs: "how much can I still spend this week?".
- **Parent / household**: loves bills calendar, shared view. Rejects a design where partner needs a second install and a login. Shared budget is the most-requested feature in many finance apps (Likely, general) but is **structurally hard for a local-first, no-account app**.
- **Older adult**: needs large text, plain words, forgiving Undo, no jargon (already partly done: big-text tests). Rejects gestures and hidden menus. Danger: losing data on a new phone.
- **Cash-based earner with irregular income** (taxi, tutor, freelancer, trader): income is lumpy, so "monthly budget" and "salary day" logic misleads. Loves: "income this month vs. typical", a buffer view, cash accounts. Rejects forced salary-day setups. **Hypothesis:** this is probably the largest underserved group, and bank apps serve them worst.
- **Azerbaijani user generally**: bank card use is high in cities; cash remains common in markets/transport (Hypothesis). Names/terms: need natural az and ru (human review sheet still pending).
- **Skeptical competitor**: "It's a notebook with charts. My bank already shows my spending. Why would I type?" → our answer must be *planning + cash + privacy*, and the app must be faster than a note.
- **Security reviewer**: data in browser localStorage is readable by anyone with the unlocked phone and is lost on "clear site data"; no encryption at rest; privacy mode is shoulder-surfing only. Any cloud or AI feature changes the threat model and the privacy policy.

## 3. Feature proposals

Effort: S ≤ 1 day of build-session work, M = 2–4 days, L = a week or more. "Maint." = ongoing maintenance cost.

### P1. Irregular-income view ("income rhythm") — **BUILD (after validation of wording)**
- **Problem:** monthly-salary assumptions mislead people with uneven income. **Helps:** cash earners, freelancers, students with odd jobs. **Evidence:** Hypothesis (persona reasoning; no local data); the app already has Safe to Spend and monthly comparisons, so it is mostly a presentation + a small calculation.
- **Idea:** show "typical month" (median of last 3–6 months income), "this month so far", and a "buffer" = money on hand minus reserved bills; Safe to Spend uses the *lower* of expected/actual income only when the user opts in. No predictions beyond simple arithmetic.
- **Differentiation:** bank apps and most trackers assume salary. **Effort:** M. **Deps:** existing analytics logic, tests for empty/short history. **Privacy/legal:** none (local). **Maint.:** low. **Risks:** a wrong "typical" figure destroys trust → show the months used, label as estimate, test boundaries (1–2 months of data). **Rec: validate first with 3–5 irregular earners (paper mock), then build.**

### P2. Cash vs card accounts and transfers — **BUILD (core gap)**
- **Problem:** "where is my money?" — cash in wallet, card, savings; moving money between them must not count as income/expense. **Helps:** everyone; essential for cash-based users. **Evidence:** Likely (standard in every serious tracker); I have not yet confirmed from code how the app handles accounts today (NOT ASSESSED — the next build run should read the code first).
- **Effort:** M–L (data-model touch → migration risk to `expense_ledger_v5`). **Deps:** backup format versioning (currently 10), Undo, import/merge rules. **Privacy:** none. **Maint.:** medium (every total must exclude transfers). **Risks:** double counting in Safe to Spend and analytics → financial-correctness tests first. **Rec: build, but only after reading how accounts exist now; design note + failing tests before any model change; owner approval needed because it is a data-model change.**

### P3. Debts / loans tracker (simple) — **VALIDATE FIRST**
- **Problem:** instalments and borrowing between family/friends are common in everyday life (Hypothesis for AZ). **Evidence:** none gathered. **Idea:** a bill with an end date and a remaining balance (can reuse the explicit-bills model from Run 12: a bill with `endsAfterN` / total). **Effort:** S–M if built on bills. **Risks:** interest calculations are easy to get wrong → do NOT calculate interest; track only what the user enters. **Rec: validate first; if built, only as "bill with a finish line".**

### P4. Local due-bill reminders — **BUILD a minimal version, but be honest about platform limits**
- **Facts (Likely, general technical knowledge, not re-verified today):** a PWA can only notify reliably via Web Push (needs a push server and user permission; on iPhone only for installed Home Screen apps, iOS ≥ 16.4) — a server is against our "no backend" principle. A **Capacitor** Android app can schedule *local* notifications with no server (plugin `@capacitor/local-notifications`). A purely offline PWA cannot reliably fire a notification at a future time with the app closed.
- **Opinion:** in the PWA the honest feature is an **in-app "due this week" list on Home + an optional downloadable calendar (.ics) file**, which works offline and in any calendar app; real notifications arrive with the Android build. Effort: S (in-app list likely exists in Bills), M for .ics. **Dark-pattern rule:** off by default, at most one reminder per bill, no streak/guilt text. **Rec: build the .ics export (S–M); defer notifications to the Capacitor track (C13).**

### P5. Receipt photo → entry — **REJECT for now; defer**
- **Facts:** Azerbaijan fiscal receipts carry a QR code and Fiscal ID (Confirmed: State Tax Service FAQ says the QR code and Fiscal ID on the receipt are used for VAT refund; https://taxes.gov.az/en/page/suallar-ve-cavablar). What is **not** found: a public consumer API that returns receipt line items from the QR. Without it, we would depend on OCR/AI. Label: NOT ASSESSED for any official lookup API.
- **Why reject now:** OCR needs an on-device model or a cloud service (privacy policy changes, cost); mis-reads silently corrupt financial records (CLAUDE.md §9 warns); Azerbaijani receipts' language/format variety is unknown. A phone **camera** also adds permission and store-review surface.
- **Cheap alternative (S, Hypothesis of value):** let the user scan/paste the **Fiscal ID / QR text into the note field** as a reference only (no extraction). Or none at all. **Rec: defer; revisit only if the Tax Service publishes a consumer lookup, and then validate with users.**

### P6. Salary gross → net calculator for Azerbaijan — **DEFER (rules are changing yearly; high wrongness cost)**
- **Facts (Confirmed, State Tax Service, post dated 2025-11-21, https://www.taxes.gov.az/az/post/4461):** from 1 Jan 2026 the seven-year private non-oil employee incentives ended; monthly income tax for private non-oil employees: up to 2,500 AZN → **3% (2026), 5% (2027), 7% from 2028**; 2,500–8,000 → 75 + 10% of the excess (2026; fixed part 125 in 2027, 175 in 2028); above 8,000 → 625 (2026)/675/725 + 14% of the excess; **the first 200 AZN is exempt when monthly income ≤ 2,500**.
- **Not confirmed from official sources today:** employee social insurance (DSMF) and mandatory medical insurance (MTS) rates. A search summary indicated MTS 2% up to 2,500 and 0.5% above, DSMF unchanged (3% up to 200 + 10% above, employee side), unemployment insurance 0.5% — but **third-party payroll sites conflict** and I did not read an official page for these. Public-sector, oil & gas, self-employed (simplified tax) and part-time cases differ again.
- **Opinion:** wrong take-home figures damage trust more than no calculator. The rates change every January (2026→2027→2028 already scheduled), and the owner is a non-programmer who cannot audit tax rules. **Rec: defer.** If wanted later: build it as a *data table with a date and source link shown to the user*, limited to "private non-oil employee, main job", with the official table verified by the owner/an accountant, and tests from independent hand calculations. Do not ship under the app's name without a disclaimer.

### P7. Shared household budget — **DEFER; offer a lighter alternative**
- **Problem:** couples/parents manage together. **Constraint:** local-first, no account, no server. True sync needs a backend (cost, privacy, security, support) or peer-to-peer (complex). **Lighter alternatives:** (a) "Merge backup" already exists → document a manual weekly "send me your backup, I merge" flow; (b) an `owner/person` tag on entries ("who paid") with a filter — S–M. **Rec: defer sync; consider the tag (validate first).** Opportunity cost is high, risk of duplicate/conflicting records is high.

### P8. Bank statement CSV/PDF import from Azerbaijani banks — **VALIDATE FIRST (needs real sample files)**
- **Problem:** typing is the main reason people quit trackers (Likely, general). **Facts:** I could not find public documentation of statement export formats of Kapital/ABB/PASHA/Unibank etc. **NOT ASSESSED.** With open banking now live for Birbank users, many users can *see* their transactions already; they still cannot categorise or plan with them.
- **Idea:** generic CSV import with column mapping (user maps date/amount/description once), duplicate detection, preview before commit. Effort M–L; existing import/merge code reduces it. **Privacy:** statements are the user's own data and stay local; test only with synthetic files. **Risks:** duplicates, sign conventions, decimal separators (comma/dot), encodings (cp1251/UTF-8), date formats → must be test-first. **Rec: validate first — ask the owner for 2–3 *anonymised* statement samples from the banks they use; then decide.** Do not promise direct bank connections.

### P9. Quick-entry shortcuts (templates / "same as last time" / typed sentence "taxi 3.5") — **BUILD small**
- **Problem:** friction at entry kills habit. **Helps:** all personas. **Idea:** (a) one-tap "repeat last" and recent merchant chips (likely partly present — check), (b) a local, deterministic text parser ("taxi 3.5 cash") with a preview the user confirms. No AI, no server. Effort S (a) / M (b). **Risks:** the parser misreading amounts (comma vs dot decimals — note owner's *pending* number-format decision; do not touch it) → preview + confirm, never auto-save. **Rec: build (a) now, validate (b).**

### P10. Tags/labels — **REJECT for now.** Categories + subcategories + notes cover most needs; tags add UI weight and test surface and no user demand is evidenced. Revisit only if users ask.

### P11. Home-screen widget — **DEFER.** Not possible in a PWA; Android widget needs native code beyond Capacitor basics, iOS needs Swift. High cost, low evidence.

## 4. Retention without dark patterns (D18)
Principles: no streaks, no loss-framing ("you broke your streak"), no notifications on by default, no guilt copy, no gamified badges tied to spending. Valuable-because-useful ideas:
1. **Weekly summary card on Home** (in-app only, shown when the user opens the app; dismissible): spent vs. usual, bills due next 7 days, one plain sentence. Effort S–M. Works offline. *Rec: build.*
2. **Backup nudge**: already exists; keep it proportional (data loss is the top user risk — see the 2026-10-27 assessment). Make "last backup: N days ago" visible in More. Check it exists.
3. **"On track" line** in Safe to Spend: factual ("12 days left, 340 AZN free"), no praise/shame. Already close to existing.
4. **Reminders**: see P4 (opt-in, one per bill, Android only for real notifications).
5. Ask users, don't assume: measuring retention requires analytics, which the app deliberately lacks. **Opinion:** without telemetry we rely on interviews; that is acceptable and consistent with the privacy promise.

## 5. Critical self-review prompts for the Master Prompt (D19 — started, not done)
Not done in this run (time spent on market facts). Next research run should: list requirements in `EXPENSE_LEDGER_MASTER_PROMPT.md` (baseline checkout) with status NOT ASSESSED, and propose the 5 highest-value verification tasks. Already visible gaps from other documents: (1) real-phone verification of offline/install (NOT ASSESSED), (2) native az/ru language review (pending owner), (3) Android APK never run, (4) browser-test instability (backlog A1), (5) no accessibility audit with a screen reader.

## 6. Recommendations ranked (Opinion)
| Rank | Proposal | Decision | Why |
|---|---|---|---|
| 1 | P2 cash/card accounts + transfers (after reading current code) | build (owner approval for model change) | foundational; cash users' core need |
| 2 | P1 irregular-income view | validate wording, then build | likely biggest underserved group; no new data model |
| 3 | P9a quick-entry shortcuts | build | habit; low risk |
| 4 | P4 .ics due-date export + in-app due list | build | offline-capable reminders without a server |
| 5 | Weekly in-app summary | build | retention without dark patterns |
| – | P8 CSV import | validate first (samples needed) | high value if formats are simple; high risk if not |
| – | P3 debts as bills with finish line | validate first | |
| – | P6 salary calculator, P7 shared budget, P5 receipt OCR, P10 tags, P11 widget | defer/reject | see above |

## 7. Counter-arguments to our own plan (Opinion)
- If Birbank/other banks add categories and budgets on top of their open-banking view, a generic tracker loses relevance for card-heavy users. Our moat is cash, planning and privacy — we should test that people *care* about privacy (Hypothesis; ask).
- A local-first app cannot sync across devices; many users own a phone and a laptop. Backup/restore via file is a weak substitute. A Google Drive backup (backlog C15) helps but is still a design-only item.
- Three languages triples copy-review cost; every new feature adds ~N×3 strings to be reviewed by natives that we do not have yet. This favours *fewer, simpler* features.

## 8. Open research items for later runs
- Read the CBA fintech site and the open-banking regulation text for AISP rules (official only).
- Read official MTS/DSMF/unemployment-insurance pages (taxes.gov.az FAQ2026 PDF: https://www.taxes.gov.az/uploads/2026/faq/FAQ2026.pdf, and the 2025 buklet 9.pdf) before any salary feature.
- Store reviews (Play/App Store az) for Birbank, ABB Mobile, Kapital, PASHA: qualitative complaint themes.
- Owner: 2–3 anonymised bank statement samples; permission to interview 5 people.
