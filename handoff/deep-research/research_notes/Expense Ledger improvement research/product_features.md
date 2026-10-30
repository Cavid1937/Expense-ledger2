# Product features research: recurring end dates, family/household, demo datasets, teaching tips (Expense Ledger PWA, Oct 2026)

Method note: about 16 web searches/fetches on 2026-10-30. Search snippets were thin for several competitors (YNAB, Monarch, Copilot, Wallet, Spendee, Money Manager, Bluecoins help pages were NOT retrieved). Anything not backed by a URL below is labelled as my own inference or general engineering knowledge and must not be treated as sourced fact. Az/ru wording is draft only, unreviewed by a native speaker.

## 1. Recurring payments with optional end date / number of instalments

### Takeaway
Firefly III and Actual Budget both support bounded recurrences (end date and/or occurrence count), so this is an established pattern; the safest design for a local-first app is to store `startDate` plus either `endDate` (inclusive, date-only string) or `totalInstalments`, and DERIVE remaining count and final date rather than store them. Evidence for Wallet, Spendee, Money Manager, Bluecoins, Copilot, YNAB and Monarch was not retrievable in this session.

### Cited Findings
- Firefly III's recurrence model has two mutually exclusive caps: `repeat_until` (last date the recurrence can fire) and `nr_of_repetitions` (limit on transactions created); the API says to use either one, plus an `active` flag. (Taken from generated API client docs, not the official user guide.) — [docs.rs firefly-iii recurrence_properties](https://docs.rs/crate/firefly-iii/latest/source/src/models/recurrence_properties.rs); [rubydoc Recurrence](https://www.rubydoc.info/gems/firefly-iii-client/FireflyIIIClient/Recurrence)
- Actual Budget schedules: official docs describe schedules that can recur indefinitely, have an end date, or occur once; a third-party Python library models three end modes (never, after N occurrences, on a date). The official page I fetched did not itself describe end date/occurrence UI. — [Actual schedules docs](https://actualbudget.org/docs/schedules); [actualpy schedules](https://actualpy.readthedocs.io/en/latest/API-reference/schedules/)
- Actual month-end handling: choosing the 31st makes roughly every other month skipped; to hit the last day you must choose "Last" explicitly. "Move schedule" shifts weekend dates earlier or later; schedules ignore holidays. Optional "Automatically add transaction" posts without approval; otherwise the user approves each. Matching to existing transactions uses a window of 2 days either side of the scheduled date and matching payee. — [Actual schedules docs](https://actualbudget.org/docs/schedules)
- Monarch: twice-monthly frequency falls on the 1st and 15th, with weekend dates shifted to the prior business day (per search summary of its help centre; the end-date behaviour was not found). — [Monarch help](https://help.monarch.com/hc/en-us/articles/4890751141908)
- YNAB scheduled transactions guide exists with a "Repeating Transactions" section; whether it offers end date / N payments could not be confirmed from the retrieved excerpt. — [YNAB scheduled transactions guide](https://support.ynab.com/en_us/scheduled-transactions-a-guide-BygrAIFA9.md)
- Local context for amounts: the Azerbaijan average pension is about AZN 594 (1 July 2026), minimum pension rising from AZN 320 to 349 — relevant to realistic instalment sizes. — [Report.az](https://report.az/en/finance/sspf-average-monthly-pension-in-azerbaijan-rises-to-azn543); [OC Media](https://oc-media.org/pensions-to-rise-9-in-azerbaijan-in-2026)

### Inferences
(All below are opinion/engineering judgment, not sourced.)
- Data model: `recurring { startDate 'YYYY-MM-DD', dayOfMonth, anchorDay, endMode: 'never'|'date'|'count', endDate?, count?, pausedFrom?, skippedDates[] , linkedDebtId? }`. Keep the two end modes mutually exclusive, as Firefly does; convert on edit with a clear prompt.
- Semantics: treat `endDate` as INCLUSIVE ("last payment on or before this date"), because users say "until December". For "N instalments" the Nth occurrence is the final one. Show the derived final payment date in both modes so users can verify the interpretation.
- Month-end: store the user's intended `anchorDay` (e.g. 31) and clamp per month (Feb 28/29, Apr 30) instead of rolling forward from the previous clamped date; otherwise the 31st drifts to 28th permanently. Actual's "every other month skipped" behaviour is the failure to avoid. Leap years fall out of the clamp rule; test 29 Feb start dates.
- Date-only strings: never construct `new Date('2026-12-31')` (parsed as UTC; shifts a day in negative-offset zones, and DST math breaks). Use integer year/month/day arithmetic and compare strings lexicographically. Add tests with the process timezone set to e.g. Pacific/Auckland and America/Los_Angeles.
- Edge cases to specify and test: end before first occurrence (reject at input; if created via import, treat as zero occurrences and show "ended"); count = 1; edit end date to earlier than already-posted payments (keep posted history, only stop future ones); skipped payment (count it as consumed or not? recommend an explicit per-occurrence "skip" that does NOT consume an instalment when the schedule is count-based, and a clear label); pause (shift the end date or not — recommend pause does not consume instalments and the final date is recomputed); editing amount mid-way (apply from a chosen date forward, never rewrite posted transactions); deleting the rule (posted transactions remain).
- Display: "3 of 12 paid", progress bar, "3 payments left, last on 15 Mar 2027", total remaining amount = remaining count x amount (flag as estimate if amount varies). Add a small "ends soon" state at 1 payment left and a completed state that offers "archive" rather than silently disappearing.
- Link to debts/loans: add optional `linkedDebtId`; when a posted occurrence is confirmed, offer to reduce the debt balance by the principal part; if the debt balance reaches 0 before the count ends (or count ends with balance remaining), show a reconciliation prompt rather than auto-adjusting. A simple interest-free instalment (credit paid monthly, common in AZ retail "kredit"/"taksit") is the first case to support; amortising loans with interest are a later phase.
- Draft wording (en / az / ru, UNREVIEWED):
  - "Ends on" / "Bitmə tarixi" / "Заканчивается"
  - "Number of payments" / "Ödənişlərin sayı" / "Количество платежей"
  - "3 payments left" / "3 ödəniş qalıb" / "Осталось 3 платежа" (ru needs plural forms: 1 платёж, 2-4 платежа, 5+ платежей)
  - "Last payment: 15 Mar 2027" / "Son ödəniş: 15 mart 2027" / "Последний платёж: 15 марта 2027"
  - "Paused" / "Dayandırılıb" / "Приостановлено"
  - "Skip this payment" / "Bu ödənişi keç" / "Пропустить платёж"
- Priority: HIGH value, MEDIUM effort (about 3-5 days incl. tests), main risk is date arithmetic and history editing; do before loans-linking. Scope v1: end date OR count, derived remaining/final date, pause, skip; v2: debt link.

### Gaps
- Could not retrieve end-date/instalment behaviour and "paused"/reminder/countdown features for YNAB, Monarch, Copilot, Wallet (BudgetBakers), Spendee, Money Manager, Bluecoins (help pages not returned by search). Recommend a follow-up fetch of each app's help centre, or a hands-on check.
- No data found on how often Azerbaijani users hold fixed-term instalment credit versus open-ended subscriptions.

## 2. Family / household feature in an app with no accounts or server

### Takeaway
Evidence (US-centric) shows most couples keep at least some money separate, and tech-facilitated financial abuse is a documented risk of shared finance tooling, so a first phase should be a low-risk, single-device "who" tag plus per-member export, with true multi-device sync deferred. No Azerbaijani household-finance study on money management within couples was found.

### Cited Findings
- Bankrate (Feb 2026): about 38% of couples in committed relationships fully combine finances, about 26% keep everything separate, rest mixed; 62% keep at least some accounts in their own name only. An older release gave 38% joint-only / 34% mix / 27% separate, so figures vary between releases. US survey, commercial pollster. — [Bankrate press release](https://www.bankrate.com/press-releases/most-couples-keep-at-least-some-of-their-money-separate/); [Hawaii News Now/Bankrate Feb 2026](https://www.hawaiinewsnow.com/bankrate-article/2026/02/06/survey-most-couples-keep-least-some-their-money-separate/)
- MagnifyMoney: 65% of married couples merged accounts; 19% kept some finances separate. — [MagnifyMoney](https://www.magnifymoney.com/news/combining-finances-with-spouse-or-partner/)
- Academic: couples with joint accounts report higher relationship satisfaction (Gladstone, Garbinsky, Mogilner 2018; correlational). — [UCLA Anderson PDF](https://anderson-review.ucla.edu/wp-content/uploads/2021/03/Gladstone-Garbinsky-Mogilner_Pooling_Finances_and_Relationship_Satisfaction_2018.pdf)
- Federal Reserve SHED runs annually since 2013 and includes a Family Finances section; I did not find a figure on who manages household money. — [Fed SHED summary video page](https://fedcommunities.org/connecting-communities-highlights-2024-survey-household-economics-decisionmaking/)
- Financial abuse via tech: shared banking access used to monitor spending in real time and deny access to benefits; a USENIX Security 2023 audit of 30 consumer finance tools found features abusers can exploit and that financial abuse is rarely considered in security analysis. — [NNEDV Safety Net](https://www.techsafety.org/financial-abuse-and-technology); [Safe & Together](https://safeandtogetherinstitute.com/blog/technology-as-a-tool-of-coercive-control-when-the-screen-becomes-the-weapon); [USENIX Bellini et al.](https://www.usenix.net/system/files/usenixsecurity23-bellini.pdf)
- Competitor positioning (marketing/comparison blogs, low reliability, several from rival apps): Goodbudget is manual-entry, envelope-based, free for 20 envelopes, premium about $80/yr, shares envelopes between partners; Honeydue is free and has per-account sharing choices but bank-sync complaints. — [Finny comparison](https://getfinny.app/blog/ynab-vs-everydollar-vs-goodbudget-vs-honeydue); [Costbench](https://www.costbench.com/compare/goodbudget-vs-honeydue/)
- CRDT/local-first: Yjs is network-agnostic and can sync via WebSocket or peer-to-peer WebRTC, but y-webrtc still needs signalling servers; docs pair a network provider with local persistence (y-indexeddb). Automerge is designed to work without a central server. — [Yjs docs](https://docs.yjs.dev); [Kleppmann 2018](https://martin.kleppmann.com/2018/07/27/ladis.html)
- Azerbaijani household context: food is a very large share of household spend (JAM News quotes an economist saying it has not fallen below 45%; undated claim). Official Household Budget Survey figures were not retrieved. — [JAM News](https://jam-news.net/half-of-expenses-of-an-azerbaijani-family-go-to-food/); [Meydan.tv](https://www.meydan.tv/en/article/azerbaycanda-qazanilan-her-100-manatin-56-manati-erzaga-gedir/)

### Inferences
(Opinion; effort figures are my estimates.)

| Option | What it is | Effort | Cost | Risk | Verdict |
|---|---|---|---|---|---|
| A. Member tag / "who paid" on each transaction (single device) | optional `memberId`, simple filter and per-member totals | S (2-4 d) | free | low; schema addition only, needs migration-safe default | Phase 1 |
| B. Per-member categories / budgets | member-scoped budget lines | M | free | medium; complicates budgets and reports | Phase 2 if A is used |
| C. Separate profiles on one device | multiple datasets, same localStorage origin | M-L | free | HIGH for data safety: touches the permanent key `expense_ledger_v5`; no real isolation (same browser, no passcode) | Avoid for now |
| D. Export/merge each member's file | member exports JSON; head of household imports with dedupe by transaction id and tags source member | M (4-7 d) | free | medium; merge conflicts, duplicates, id collisions; needs preview-before-import | Phase 2, best fit for "no server" |
| E. Shared Google Drive / file sync | user-managed file in a shared folder | M | free (but needs OAuth Drive scope) | high: OAuth/privacy review, last-writer-wins corruption | Defer |
| F. WebRTC/CRDT P2P (Yjs/Automerge) | live merge between devices | L-XL (3+ wks) | free libs, but signalling server and TURN are not free-tier guaranteed | high: new data model rewrite (CRDT shape vs current JSON), key stability, QR pairing, abuse surface | Defer; validate demand first |
| G. Paid backend sync | accounts + server | XL | ongoing cost, GDPR/AZ data-law duties | highest | Out of scope under free-tier rule |

- Phased recommendation: Phase 1 = A (member tag, per-member summary, optional hide-by-member in view). Phase 2 = D (versioned member export + import with preview and duplicate detection; a "household file" format with `schemaVersion`, stable transaction ids, `sourceMember`). Phase 3 only after real demand: F with an explicit, user-initiated pairing flow.
- Privacy/abuse mitigations (opinion, grounded in the abuse sources above): no covert sharing; every share or export is an explicit user action; show who can see what; per-member private items (excluded from exports by default); no real-time surveillance features; no "partner activity" notifications. Note that in a single-device model there is no technical privacy between members, so state this in the UI ("anyone using this device can see all entries").
- Product thought: Azerbaijan context suggests extended-family spending (parents, children) may be more relevant than couples-only, and food-heavy budgets suggest shared grocery tracking is the main use. This is a hypothesis; validate with 5-10 interviews before building B-F.
- Priority: A = HIGH value/LOW risk; D = MEDIUM; F = LOW until validated.

### Gaps
- No Azerbaijani study on who manages family money, extended-household structure, or app use for it was found; Pew data was not retrieved (the Pew search returned only secondhand mentions).
- No primary privacy-policy review for Honeydue/Goodbudget; comparison blogs are commercially biased.
- Did not verify free-tier limits of any public WebRTC signalling server or CRDT hosting.

## 3. Demo / sample datasets and personas with realistic Azerbaijani amounts

### Takeaway
Use clearly labelled, removable, deterministic synthetic personas, whose amounts are anchored to verified 2026 Azerbaijani figures (minimum wage AZN 400, average wage about AZN 1,177, average pension about AZN 594, metro fare AZN 0.60), while flagging rent and utilities as approximate because official per-unit data was not found.

### Cited Findings
- Minimum wage: AZN 400/month, in effect since 1 Jan 2025 and still AZN 400 in 2026; a forecast said it may stay at 400 in 2026. — [Report.az forecast](https://report.az/en/finance/minimum-wage-in-azerbaijan-may-remain-at-azn400-in-2026); [WageIndicator](https://wageindicator.org/salary/minimum-wage/azerbaijan)
- Average monthly nominal salary: AZN 1,177 for Jan-Jul 2026 (+7.2% y/y), AZN 1,172 for Jan-Apr 2026 (State Statistics Committee via press); secondary sites show about 1,100. Baku about 1,200-1,300. — [Report.az](https://report.az/en/finance/average-monthly-salary-in-azerbaijan-rises-7); [Report.az 6.5%](https://report.az/en/finance/average-monthly-wages-in-azerbaijan-increase-by-6-5); [Baku +7.8%](https://report.az/en/finance/baku-sees-7-8-increase-in-average-monthly-nominal-salary)
- Pensions: average about AZN 594 as of 1 July 2026, average old-age about AZN 632; social benefits indexed +9.2% from Jan 2026; minimum pension rising from AZN 320 to 349. Experts note the average is skewed upward. — [Report.az](https://report.az/en/finance/sspf-average-monthly-pension-in-azerbaijan-rises-to-azn543); [OC Media](https://oc-media.org/pensions-to-rise-9-in-azerbaijan-in-2026); [APA](https://en.apa.az/social/average-monthly-old-age-pension-in-azerbaijan-expected-to-rise-to-azn-629-in-2026-says-mp-musa-guliyev-482782)
- Minimum subsistence criterion set at AZN 300 for 2026. — [Report.az](https://report.az/en/amp/finance/azerbaijan-s-minimum-subsistence-need-criterion-set-at-azn300-for-2026)
- Transport: Baku metro/bus fare AZN 0.60 from 1 Oct 2025 (cashless). — [Mincom.gov.az](https://mincom.gov.az/en/media-en/news/approval-of-new-fares-for-metro-and-bus-routes-with-cashless-payment-systems-and-modern-standards); [getcostidea](https://getcostidea.com/?p=6387)
- Utilities: from 1 Jan 2026 fixed monthly charge AZN 1 each for electricity and gas for households. — [Report.az](https://report.az/en/amp/energy/azerbaijan-sets-fixed-tariffs-for-electricity-and-natural-gas). Electricity (per Ministry of Energy, Tariff Council decision of 29 Dec 2024): 8.4 qepik/kWh up to 200 kWh, 10 qepik for 200-300, 15 qepik above 300 (an Oilprice article gives 8/9/13, conflict unresolved). — [minenergy.gov.az](https://minenergy.gov.az/en/sual-cavab/elektrik-enerjisi-uzre-ehali-ucun-hansi-tarifler-movcuddur); [Oilprice](https://oilprice.com/Energy/Energy-General/Unpacking-Azerbaijans-Controversial-Energy-Market-Overhaul.amp.html). Gas per m3: only an undated figure (AZN 47.2 per 1,000 m3), unverified.
- Rent (Baku, 1-bedroom): about AZN 900 centre, about 540 outside (Expat Arrivals May 2026, Numbeo-based June 2026); sources disagree, no official figure. — [getcostidea](https://getcostidea.com/?p=6387); [LifeIndexed](https://lifeindexed.com/cost/europe/azerbaijan/baku/2026/)
- Fuel: one aggregator shows petrol about AZN 1.15/L (Sept 2026), single aggregator, unverified. — [DailyFuels](https://www.dailyfuels.com/azerbaijan/)

### Inferences
(Persona design is my proposal; amounts illustrative, rounded and derived from the above.)
- Labelling: banner "Sample data - not real" on every screen while demo mode is on; every demo record carries `isDemo: true` and a `demoSetId`; demo and real data never co-exist silently (offer to start demo only when the ledger is empty, or in a separate in-memory/sandbox store, so the key `expense_ledger_v5` is untouched until user confirms); one-tap "Remove sample data" removes by flag and shows counts removed; block backups/exports of demo data from being mistaken for real (filename prefix "DEMO_").
- Determinism: generate with a seeded PRNG (e.g. mulberry32 with persona seed), fixed "as-of" date injected (not `Date.now()`), integer qepik amounts, stable ids derived from persona+index; snapshot tests assert totals. Never copy, sample, or perturb real user data. Amounts rounded to plausible price points (e.g. 0.60, 1.20, 12.50).
- Persona list and what each demonstrates:
  1. Student (stipend/parents AZN 150-250, part-time AZN 300-400, shared rent AZN 200-300, metro 0.60 per trip): small amounts, daily logging, budgets, savings goal.
  2. Salaried family with a loan (household income about AZN 1,800-2,400, rent or mortgage-like instalment AZN 450-600, utilities, groceries as largest share, bank loan with end date): recurring with end date and instalments countdown, debt link, member tags, budgets.
  3. Freelancer with irregular income (monthly income 600-2,500 varying, some months near zero): irregular-income forecasting, buffer goal, income volatility chart, no false "overspent" alarms.
  4. Pensioner (income about AZN 350-650 on pension scale, utilities, medication, small family help): low-balance clarity, large-font readability, bill reminders, avoids guilt framing.
  5. Small shop owner (cash sales, supplier payments, rent, taxes, personal vs business separation): multi-account, cash, categories split, tags; flag that tax rules need local verification.
- Use of minimum wage (400) as the lower anchor for one scenario ("tight month") and average wage (about 1,180) as the median anchor.
- Priority: MEDIUM-HIGH (helps onboarding and test coverage); effort M (3-5 days for generator + removal + tests); main risks are mislabelled demo data mixing with real data and unvalidated price points.

### Gaps
- No official (stat.gov.az / cbar.az) data was reached directly; salary and pension figures are via press citing the State Statistics Committee and SSPF. Rent, gas tariff and grocery basket prices lack authoritative sources. Recommend a follow-up fetch of stat.gov.az monthly bulletins and the regulator page ([regulator.gov.az tariffs](https://regulator.gov.az/en/istehlakcilar/tarifler-qiymetler), listed in search but not fetched).
- Official CBAR exchange-rate/interest-rate data and typical consumer-loan rates not collected.
- Evidence on demo-mode patterns in other apps (Mint/Monarch/YNAB sample budgets) was not retrieved; the patterns above are my own design.

## 4. Recommendations that teach users to get better results (tips, nudges, completeness)

### Takeaway
Evidence suggests personalised nudges in money apps can reduce spending but can also reduce later engagement, and there is no strong empirical proof that budgeting apps alone improve welfare; so tips should be sparse, optional, dismissible, and tied to the user's own data, with no shame framing. Frequency-cap numbers below are design judgment, not sourced.

### Cited Findings
- A study of personalised overspending messages in a Canadian bank's money-management app found a lasting reduction in cumulative spending, but message recipients were less likely to log in again later (ostrich effect). — [NYU Stern research summary](https://www.stern.nyu.edu/experience-stern/news/phd-candidate-sung-lee-s-research-overspending-messages-and-personal-finance-management-referenced); [NYU Fubon fintech nudges](https://www.stern.nyu.edu/experience-stern/about/departments-centers-initiatives/centers-of-research/fubon-center-technology-business-and-innovation/research/research-papers/doctoral-fellow-research/fintech-nudges)
- Think Forward Initiative summary: no empirical evidence that adopting budgeting apps improves financial welfare, and personalised budget information does not always help users reach goals ("budgeting app trap"). — [Behavioral Economics summary](https://behavioraleconomics.com/the-budgeting-app-trap-when-spending-information-backfires)
- A randomized trial design examined SMS reminders added to financial education to bridge knowledge-behaviour gap (seminar description; results not reported in the page). — [Birmingham CHASM](https://birmingham.ac.uk/research/chasm/events/2019/nudging-financial-literacies)
- 2026 conference paper on gamified digital payments: nudge elements positively affected intent toward long-term financial goals (intent, not behaviour). — [Atlantis Press PDF](https://www.atlantis-press.com/article/126024445.pdf)
- Notification fatigue: only anecdotal sources found (an Indie Hackers post citing a 2023 Airship statistic that 96% of users muted at least one app's notifications; unverified, self-published). — [Indie Hackers](https://www.indiehackers.com/post/behavioral-design-in-notifin-how-timing-and-tone-boosted-completion-rates-by-78-dcdcdb0aaf)
- CFPB/FCA/OECD guidance was NOT retrieved (the CFPB-focused search returned nothing relevant).

### Inferences
(Opinion / design proposals.)
- Principles: show a tip only when the user's own data triggers it; one tip at a time; max 1 per session and about 2 per week; each tip has "Got it", "Not now" (snooze 14 days) and "Don't show tips like this" actions; never show tips on an error screen or during entry; no streak loss language, no red "you failed", no comparisons to other users; explain WHY the tip helps; local-only (no tracking) so effectiveness cannot be measured without a consent-based, on-device counter.
- Completeness meter: avoid a single "score" (the owner already decided no score); prefer a short checklist "Your picture is clearer when..." with 3-4 items.
- Candidate catalogue (trigger -> wording; az/ru drafts unreviewed):
  1. No income in last 30 days but expenses exist. "Add your income so we can show what is left." / "Gəlirinizi əlavə edin ki, nə qaldığını göstərək." / "Добавьте доход, чтобы показать остаток."
  2. No entries for 3+ days after previously daily use. "Missed a few days? Add them in one go - it takes a minute." / "Bir neçə gün buraxmısınız? Hamısını bir dəfəyə əlavə edin." / "Пропустили несколько дней? Добавьте всё сразу."
  3. 20+ expenses and no budget. "Set a limit for your biggest category: Groceries." / "Ən böyük kateqoriya üçün limit təyin edin: Ərzaq." / "Задайте лимит для самой крупной категории: Продукты."
  4. No backup in 14+ days and 10+ new records. "Save a backup copy so you can restore it if this device is lost." / "Cihaz itərsə bərpa etmək üçün ehtiyat nüsxə saxlayın." / "Сохраните резервную копию на случай потери устройства."
  5. Many uncategorised entries (>=10 or >20%). "Sort 10 entries into categories to make reports reliable." / "Hesabatların dəqiq olması üçün 10 qeydi kateqoriyalara ayırın." / "Распределите 10 записей по категориям для точных отчётов."
  6. Recurring payment with a known end (instalment) not set up while a similar amount repeats monthly. "This looks like a monthly payment. Add it as recurring with an end date." / "Bu aylıq ödənişə oxşayır. Bitmə tarixi ilə təkrarlanan kimi əlavə edin." / "Похоже на ежемесячный платёж. Добавьте как регулярный с датой окончания."
  7. Account balance in app differs from user's stated real balance (after reconcile prompt). "Check your balance against your bank or wallet." / "Balansı bankla və ya cüzdanla müqayisə edin." / "Сверьте остаток с банком или кошельком."
  8. Month ending with budget 90%+ used. Neutral: "You have used 90% of Groceries. About 3 days remain." / "Ərzaq limitinin 90%-i istifadə edilib." / "Использовано 90% лимита «Продукты»." (state facts, no blame)
  9. First week milestone: "You added your first 10 entries. Next: set a goal." (positive, one-time)
  10. Large unusual entry (e.g. 5x category median): confirm possible typo/decimal slip, "Is 1200.00 correct?" Guards against input errors, not shaming.
- Dark-pattern guardrails: no fake urgency, no guilt copy, no hidden dismissal, no tips that push paid upgrades (none exist), no use of tips to inflate engagement; all tips must be reachable in a "Tips" list and fully disable-able.
- Evidence strategy: since app is local-first without analytics, validate with a 5-10 user usability test and maybe an opt-in, on-device-only counter of tip actions; do not claim effectiveness without that.
- Priority: MEDIUM; effort S-M (trigger engine 2-3 d, copy x3 languages needs native review). Highest-value tips for data quality are 1, 3, 4, 10.

### Gaps
- No peer-reviewed frequency/fatigue findings or CFPB/FCA/OECD documents were retrieved; caps are judgment only.
- No evidence specific to Azerbaijani or Russian-speaking users' reaction to financial tips.
- Competitor onboarding/tip patterns (YNAB, Monarch, Copilot) were not examined.
