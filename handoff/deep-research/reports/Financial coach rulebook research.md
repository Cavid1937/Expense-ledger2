# Replace the score with explainable, data-gated coaching

**Recommendation: do not build a single financial-health score. Build a Financial Coach that shows a short set of separate "numbers cards", each with its own inputs, window and "how is this calculated?" panel, and that stays silent when the typed data is too thin to be trusted.** No validated health framework is a formula over typed transactions. The CFPB Financial Well-Being Scale and the Financial Health Network (FHN) FinHealth Score are both questionnaires ([CFPB](https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/); [FHN toolkit](https://finhealthnetwork.org/wp-content/uploads/2021/11/FinHealthScoreToolkit-2021.pdf)). We found no study showing a single score improves behaviour in an expense app. The month-end forecast should become "spent so far + bills still to come + days left x typical everyday spend". It is shown as a range only if the app has tested itself on the user's own past months, and hidden otherwise. This replaces the current "average x days in month", which turns rent on day 3 into a 2,100 AZN month instead of about 930 in the owner's own worked example. Debts and loans need their own objects with integer-qapik arithmetic, a confirmed rate type and a first-payment date. Tone should be factual, rare, user-controlled and never shaming, because the evidence for clever framing is weak, while evidence for specific, just-in-time, user-set alerts is better. Almost every numeric threshold in this report is a design default, not a sourced standard. Section 5 lists them, so the owner knows what to test before trusting it. All Azerbaijani and Russian wording is a draft needing native review.

Evidence labels used throughout: **PRIMARY** (the originating organisation's own document), **SECONDARY** (news, vendor, summary of a primary), **INFERENCE** (our reasoning), **DESIGN DEFAULT** (a number we chose, with no source). Several sources were read only as abstracts or search snippets, so strength is stated per rule.

## 1. A numbers card beats a score, because typed data cannot support one

**Why no composite.** FHN's tiers come from counting how many of eight survey-based indicators are healthy: Spend, Save, Borrow, Plan ([FHN toolkit](https://finhealthnetwork.org/wp-content/uploads/2021/11/FinHealthScoreToolkit-2021.pdf)). Three of its eight (credit score, insurance, confidence in long-term savings) cannot be computed from a ledger. CFPB's own guide describes a validated survey scale ([CFPB user guide](https://files.consumerfinance.gov/f/201512_cfpb_financial-well-being-user-guide-scale.pdf)). Any 0-100 number we compute would borrow their look without their validation.

**Typed data has a specific failure mode.** If the user forgets to log, spending looks lower and savings look higher, so a score would conflate "I forgot" with "I am doing well". It also invites gaming: skip logging embarrassing spends. The nearest evidence on harm is a UCL study of about 14,000 posts about fitness and calorie apps, which found frustration as common as motivation and shame at logging "unhealthy" items. It is an analogy only, and only negative posts were analysed ([UCL, Oct 2025](https://www.ucl.ac.uk/news/headlines/2025/oct/emotional-strain-fitness-and-calorie-counting-apps-revealed)). Monzo's own team likens a single credit score to BMI: "a useful starting point, but doesn't tell the whole story" ([Monzo](https://monzo.com/blog/how-we-built-a-product-to-demystify-credit-scores)). This is a strategic opinion. It is not proven either way for expense apps, so the right move is to ship cards now and test any aggregate with users later.

**Indicators to show (the "numbers card").** Eight are computable and explainable. Each has a data gate (rule R0) and shows "not enough data" instead of a number when the gate fails:

| Card | Formula (INFERENCE) | Reference point and its strength |
|---|---|---|
| Spent vs recorded income | expenses / income, trailing 30 days | "Spend less than income" is the FHN healthy outcome (PRIMARY); no numeric cut-off exists |
| Kept from income | (income - expenses) / income | 20% from 50/30/20 (SECONDARY rule of thumb, [Bankrate](https://www.bankrate.com/banking/what-is-the-50-30-20-rule/)); compare to the user's own prior months by default |
| Months of cover | user-typed liquid savings / average monthly expenses over 3 months | 3 months is expert convention, not a study ([St. Louis Fed](https://www.stlouisfed.org/publications/page-one-economics/2025/sep/when-unexpected-happens-be-ready-with-emergency-fund)); first milestone "about six weeks of income" from [JPMorgan Chase Institute](https://www.jpmorganchase.com/corporate/institute/report-weathering-volatility.htm) (US data) |
| Bills share of income | flagged recurring bills / average monthly income | none standard; 50% "needs" is a reference only |
| Budget limits | budgets within limit, pro-rated by day | none |
| Goal pace | % saved vs % of time elapsed | none |
| Spending trend | last 3 months vs previous 3 | none; seasonality can mimic a trend |
| Debt payments share | monthly loan payments / typical monthly income | see section 4 |

Never infer savings from income minus expenses, because it ignores the prior stock. Months of cover must use a savings amount the user typed, with an "as of" date. Several widely quoted thresholds are not usable as personal standards. The US 43% mortgage DTI cap was replaced by a price-based test in 2020, and 28/36 is a lender convention, not a CFPB requirement ([Dallas Fed](https://www.dallasfed.org/research/economics/2020/0324.aspx); [CFPB](https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-why-is-the-43-debt-to-income-ratio-important-en-1791/)). 50/30/20 shows a permanent "fail" wherever needs exceed 50%; US housing alone is about 33% of average spending ([BLS](https://www.bls.gov/regions/northeast/news-release/2026/consumerexpenditures_boston_20260106.htm)). We found no Azerbaijani benchmark. The default comparison should therefore be the user's own history.

**Optional summary line.** "3 of the 5 checks we can calculate look on track; 2 need more entries" mirrors FHN's count logic but is not validated and must not be called a score. We recommend deferring even this until a 5-8 person test in az/ru/en shows it helps.

**Explaining a number.** Seven practices (INFERENCE, consistent with FHN's transparency guidance and YNAB's caveats on Age of Money ([YNAB](https://www.ynab.com/blog/what-is-the-ideal-age-of-money))):
1. Show the formula in words with the real figures.
2. Show the window and how many entries or days were used.
3. Show the assumptions, such as which items count as bills.
4. Say "not enough data" instead of a precise number built on sparse data.
5. Let the user edit thresholds and tags.
6. Compare to the user's own past, never a population.
7. Offer an "I did not log this period" control that excludes the window.

## 2. The month-end estimate: separate the known from the guessed, then test it on the user's own history

**The bug is structural.** The current method is the textbook "mean" benchmark applied to lumpy cumulative spending. The error is roughly the lumpy amount times (days in month / days elapsed - 1), so it is worst early in the month. The owner's case: rent 600 plus 100 variable by day 10 gives 70/day x 30 = 2,100, while the realistic expectation is about 930. Fix it by putting every expense in exactly one bucket: BILL (matches a recurring bill), ONE-OFF (user-flagged or auto-flagged large), or VARIABLE (everything else). Bills are known amounts and dates, so they are added, not extrapolated. Monzo users report the opposite bug, double counting, where committed spending seems to be subtracted and then projected again ([Monzo community](https://community.monzo.com/t/left-over-amount-skewed-by-committed-spending/130793)). A strict one-bucket partition prevents both. The same thread also shows irregular bills (quarterly, annual) and ignoring payday as common complaints (SECONDARY, user reports).

**Algorithm (INFERENCE / DESIGN DEFAULT; every constant is tunable by backtest).** Let N = days in the period and d = today's day number. R = N - d is the number of days remaining.
1. **Coverage gate.** Require VARIABLE entries on at least 4 distinct days in the last 10, and d >= 7. Otherwise show only "Spent so far" and "Bills still to come".
2. **Spent so far** = all expenses this period (bills + one-offs + variable). Income and transfers never count.
3. **Bills left** = recurring bills due after today, plus overdue bills with no matching payment. Frequency-aware, so a quarterly bill appears only in due months.
4. **One-off rule.** A non-bill expense >= max(5 x median non-zero daily variable total over 90 days, 25% of typical monthly variable), or user-flagged, is excluded from the rate but stays in "spent so far". The user can also mark "unusual days" (trip, holiday).
5. **Rate** = (d_eff x rate_now + 10 x rate_hist) / (d_eff + 10). rate_now is this month's variable spend per non-excluded day. rate_hist is the median daily rate of up to 3 complete eligible months. The 10-day shrinkage weight means the user's history dominates early and this month dominates late.
6. **Point** = spent so far + bills left + R x rate.

Use the mean of daily variable totals after removing one-offs, not the median. The median of daily totals is often 0 for people who log only on some days, which would badly understate the month. No weekday modelling in v1: 4-5 weeks is too little to estimate seven weekday means.

**Backtest self-check.** This is the same idea as the rolling-origin evaluation that Hyndman and Athanasopoulos recommend, where each forecast uses only data before its origin and errors are averaged over many origins ([FPP3 §5.10](https://otexts.com/fpp3/accuracy.html)). They also recommend beating simple benchmarks before trusting anything fancier ([FPP3 §5.2](https://otexts.com/fpp3/simple-methods.html)). Procedure: take up to 6 recent complete months with adequate logging (variable entries on at least 10 distinct days). At checkpoints day 10, 15 and 20, replay the exact algorithm using only entries up to that day and only history before that month. Compare with the actual month total. Compute each month's absolute percentage error (APE). Also compute rho = (actual - known part) / (estimated remaining part), which captures how far the guessed portion was off. Show the number only if all of these hold, at the checkpoint nearest today:
- at least 3 eligible months;
- median APE <= 10% (15% allowed at day 10);
- worst APE <= 25%;
- not worse than the best benchmark (last month's total, or the old pace formula).

The thresholds are DESIGN DEFAULTS with no literature support. Three to six origins give very uncertain error estimates, so the gate screens out clearly bad performance and does not prove accuracy. The range is spent + bills left + (R x rate) x [min rho, max rho] over the eligible months, always widened to include the point. It is labelled "your usual range", not a confidence level. With 8 or more origins use the 25th to 75th percentile. Bootstrapped-residual intervals are the textbook way to get asymmetric intervals without a normality assumption ([FPP3 §5.5](https://otexts.com/fpp3/prediction-intervals.html)). Because the gate may hide the estimate for many users, expect the estimate to be hidden for a meaningful share of new users. That is the intended honest behaviour.

**Why a range, honestly.** Five UK experiments (n=5,780) found that a numeric range cost only a small amount of trust in the number and no significant trust in the source. Verbal hedges cost more in both ([summary of van der Bles et al., PNAS 2020](https://blog.aiimpacts.org/p/paper-summary-the-effects-of-communicating)). This concerns public statistics, not budgeting apps, and we read only summaries, so test with users. No vendor we reviewed publishes forecast accuracy, so showing "typical miss on your last N months" would be a differentiator (strategic opinion).

**Hand-computed test cases (N=30; computed from the design, not run against code).** Convert to unit tests and execute before calling anything verified.

| # | Situation | Expected |
|---|---|---|
| 1 | Owner's case: d=10, rent 600 (bill), variable 100 on >=4 days, phone bill 30 due day 20, no history | rough point **930**, no range; old method 2,100 must never appear |
| 2 | Salary on day 1, d=5 | no estimate (d<7); income not in spending |
| 3 | d=4, history months 240/255/270 | no estimate; "typical month" hint 255 (median) |
| 4 | d=10, rent 600, variable 130, bill 80 due day 25, rate_now 13, rate_hist 8.5 | rate 10.75, R=20, point **1,025** |
| 5 | d=15, variable 300 including a 180 flagged one-off, no history | rate 8, point **420** (naive: 600) |
| 6 | d=21, spike days 15-21 of 280; history rate 6 | not excluded: **469.03**; excluded as unusual: **398.75** |
| 7 | Backtest ratios 900/1000, 800/1200, 700/1000 | APE 10, 33.3, 30%: gate fails, no number; pass variant 950/1000, 1100/1000, 980/1000 passes |
| 8 | Known part 700, remaining part 400, rho 1.10/0.85/1.00 | range **1,040 to 1,140** |
| 9 | d=28, rent 600, variable 400, history rate 14 | **1,028.42**, shown as "about 1,030" |
| 10 | Overdue unpaid 50 bill on day 12; d=15, variable 150 | bills left 50, point **350** |
| 11 | d=12, variable 40 on only 2 distinct days | no estimate even though arithmetic gives 100 |
| 12 | Rent matched to a paid bill | rent appears once (600) in spent, not in bills left, not in rate |

**Keep it separate from "Safe to Spend".** The estimate answers "where will spending end?" and "Safe to Spend" (income received minus savings floor minus spending minus upcoming bills) answers "what can I use now?". If salary arrives on day 28, Safe to Spend is low early while the spending estimate is unaffected. Label which question each number answers. Earlier sections in the notes proposed a plain "spend so far / days x days in month" pace check; this report supersedes it for the same reason as the rent bug.

## 3. Tone, nudging and the Azerbaijan household reality

**What the evidence supports.** The behavioural literature is more contested than popular books suggest. Across 126 trials at two US Nudge Units the average nudge effect was 1.4 percentage points, against 8.7 in published academic papers, and publication bias plausibly explains most of the gap ([DellaVigna and Linos](https://www.nber.org/papers/w27594)). Loss aversion is disputed ([summary, SECONDARY](https://www.jasoncollins.blog/posts/the-case-against-loss-aversion)), and a randomised savings-reminder study found no difference between gain and loss framing ([Karlan et al.](https://img.nber.org/papers/w16205)). The same study found reminders naming a specific goal lifted savings about 16% in Peru while generic reminders did nothing. The UK Financial Conduct Authority's field experiment on over a million bank customers found just-in-time overdraft alerts reduced charges and were not found distracting, while generic early-warning and unpaid-item alerts showed weak or null effects ([FCA OP40](https://www.fca.org.uk/publications/occasional-papers/occasional-paper-no-40-time-act-field-experiment-overdraft-alerts)). Side effects exist: due-date reminders cut card late fees about 14% but raised overdraft fees about 9%, and users with an overdraft history ended up worse off ([Medina, RFS 2021](https://academicnewsletter.sufe.edu.cn/info/352133), abstract only). People also avoid bad news: logins fell about 9.5% after market declines ([Sicherman et al.](https://www.cmu.edu/dietrich/sds/docs/loewenstein/FinancialAttention.pdf)). The implication (strategic opinion): build a coach that is harmless when ignored, ties alerts to things the user set, and does not depend on large behavioural effects. Choose the most truthful and respectful framing instead of the "winning" one.

**Tone rules.** Facts with number and window, compared to the user's own baseline. One optional next step with "Not now" and "Don't show this kind of tip". Say what is unknown ("based on 9 entries"). Neutral praise for effort ("you logged 5 days this week"). Welcome-back without blame. Never: "you overspent", "bad habit", "you should"; streak-loss threats; comparison with other users or an "average person" (we have no valid peer data and it can shame low-income users); predictions as fact ("you will run out by the 20th"); product or provider recommendations; urgency on non-urgent items. Keeping to descriptions of the user's own numbers also stays on the information side of the advice boundary regulators like the FCA draw, which turns on personal recommendations ([FS Forum, SECONDARY](https://thefsforum.co.uk/knowledge-hub/tactic/fca-personal-recommendations-are-the-key-advice-boundary/)). This is not legal advice, and no Azerbaijani regulation was reviewed.

**Tip-timing rules (all DESIGN DEFAULTS, from the notes; test before trusting).** A master "Quiet mode" is always one tap away.
- No analytical tip before about 14 days and 15 entries (about 2 full months for month-over-month tips).
- No spending tips if the last entry is over 3 days old (show one welcome-back instead).
- At most 1 tip per day, 3 per week, 1 per type per week.
- 14-day cooldown after a dismissal; a type stops after 2 dismissals; 30 days after the user acts.
- Budget-limit tips only for limits the user created, once at about 80% and once at 100%.
- Never two negative tips in one session, and never as the first screen after a long absence.
- Every tip carries its data window and a "Why am I seeing this?" line.

Default amounts the app suggests must be labelled placeholders, since defaults can be read as advice ([Madrian and Shea](https://www.nber.org/papers/w7682)). Keep all computation on-device, which matches the local-first design.

**Azerbaijan context, kept in editable data, not code.** Dated facts the coach may cite:
- **Prices.** September 2026 food, alcohol and tobacco inflation was 6.9% y/y versus 3.6% for non-food ([Trend](https://www.trend.az/business/4233786.html)).
- **Wages.** Average wage is about 1,175 AZN against a 400 AZN minimum ([Report.az](https://report.az/en/finance/average-monthly-salary-in-azerbaijan-rises-7)). Average is a poor threshold, so use the user's own income.
- **Household debt.** It reached 18.7% of disposable income, and 37% of the consumer-loan book has debt-to-income above 45% (CBAR data via [Trend](https://www.trend.az/business/4234370.html)).
- **Tariffs.** New 1 AZN fixed monthly charges for household electricity and gas started on 1 Jan 2026 ([Report.az](https://report.az/en/amp/energy/azerbaijan-sets-fixed-tariffs-for-electricity-and-natural-gas)).
- **Tax.** The income-tax holiday for non-oil private employees ended 1 Jan 2026 (3% up to 2,500 AZN monthly ([PwC](https://taxsummaries.pwc.com/azerbaijan/individual/significant-developments))), so January 2026 take-home may have dropped. Health-insurance details conflict between vendors, so the app should never compute tax and should say "check your payslip".
- **Remittances.** Inbound transfers were $748.5m in H1 2026, 47.7% from Russia ([Trend](https://www.trend.az/business/4223992.html)). Tag them as irregular "transfer" income and exclude them from stable-income averages.
- **Currency.** The manat lost about a third of its value in February 2015 and fell again in December 2015, and dollar loans hurt borrowers ([RFE/RL](https://www.rferl.org/a/azerbaijan-suffers-currency-crash-oil-prices/27479606.html)). Loan dollarisation is now 15.6%.

**Things we could not establish.**
- Official household-budget-survey shares: stat.gov.az fetches failed. A "56 of 100 manat on food" headline looks like a retail-turnover structure, so do not use it as a budget share.
- Pay timing and avans practice.
- Seasonal costs (Novruz, school start, weddings).
- Informal lending norms.
- Findex 2025 Azerbaijan figures.
- Which apps people actually use.

Rules that depend on these (avans/payday, family-support envelopes, USD-saving note) have the weakest evidence and should be validated with 5-10 Azerbaijani users first, as the notes recommend. Language guidance is INFERENCE only: polite siz/вы, no slang, plain terms (gəlir, xərc, borc, kredit, taksit, avans, maaş, kommunal), and frame family gifts and support as "planned" versus "unplanned" instead of waste. No source exists for any of it.

## 4. Debts and loans: model them as objects, compute in whole qapik, never guess the terms

**Two objects.** Informal debts (person to person, usually no interest) and formal loans or instalments are different. Informal debt: direction (I owe / owed to me), counterparty, principal, due date, payments list. Remaining balance is derived, never stored, so deleting a payment restores it. Loan: lender, kind (cash, card, taksit, other), principal, term, start date, **first payment date (required, confirmed)**, rate type (NOMINAL_ANNUAL, FLAT_ANNUAL, NONE, or BANK_SCHEDULE), optional effective rate from the contract (display only), schedule type (ANNUITY, EQUAL_PRINCIPAL, USER_ENTERED), optional user-entered bank payment that overrides ours, and actual payments as facts. Store money as integer qapik. Each loan payment creates one ordinary ledger entry linked by id, so the recurring-bill reminder and the loan payment are one action, not two. Principal repaid is a repayment, not an expense; interest and fees are expenses. Borrowed money is not income; lending out is not an expense. Add these as backward-compatible collections under the existing `expense_ledger_v5` key. These are INFERENCE from standard ledger practice with no app audit, since we could not retrieve evidence on how Cashera, Spendee, Wallet, Money Manager or YNAB model loans.

**Why we must not silently guess.** The same "18%" can mean very different costs: monthly-compounded nominal 18% has an effective annual rate of 19.56%, while "18% flat" on 5,000 AZN over 12 months implies about 31.7% nominal on the declining balance (INFERENCE, our arithmetic). Azerbaijan's amended Civil Code requires consumer-credit agreements to state both the annual rate and the actual annual rate including counted payments ([Gratanet, SECONDARY](https://gratanet.com/news/amending-the-civil-code-was-entered-into-force-introducing-changes-in-four-areas); [PwC digest, SECONDARY](https://contents.pwc.com/pwc-az-legislation-issue7-2023)). So the app should offer a field for the contract's effective rate and display it, treating its own schedule as an estimate. We could not confirm the day-count convention banks use, rounding rules, the withdrawal period in days, the early-repayment compensation cap, or the reported 70% DTI lending limit (single source, [Trend](https://www.trend.az/business/4235101.html)). The primary texts (Civil Code articles, [law 822-VIQD](https://meclis.gov.az/documents/822-VIQD.pdf), the CBAR loan template) must be read before the app states any legal claim. Do not model penalties in v1; the reported late-interest cap is contract rate + 5 points, for up to 180 days ([PwC digest](https://contents.pwc.com/pwc-az-legislation-issue7-2023)).

**Formulas (standard finance mathematics; INFERENCE as to which convention a given bank uses).** r = annual rate / 12; P = principal; n = number of payments.
- **Annuity.** Payment A = P x r / (1 - (1+r)^-n); if r = 0, A = P/n with the remainder in the last payment. Each month's interest = round-half-up(balance x r), principal = A - interest, and the last payment clears the balance plus its interest.
- **Equal principal.** Principal = floor(P/n) qapik with the remainder in the last payment; interest on the falling balance; total interest = P x r x (n+1)/2.
- **Flat.** Interest total = P x rate x years; payment = (P + interest)/n; show the implied declining-balance rate by bisection.
- **Effective rate.** Display EAR = (1 + i/12)^12 - 1 only as "approximate".
- **Extra payment, same payment kept.** Remaining n' = ceil(-ln(1 - B x r / A) / ln(1+r)). If A <= B x r the balance never falls, so refuse to project and warn.
- **Day-count illustration.** Actual/365 gives 5,000 x 18% x 31/365 = 76.44 versus 75.00 under r = i/12.

**Hand-computed test cases (decimal arithmetic, half-up to qapik; computed by the researchers with a script and hand-checked formulas, not run against app code).**

| # | Loan | Expected |
|---|---|---|
| 1 | 5,000 AZN, 12 months, 18% nominal, annuity | A = **458.40**; month 1 interest 75.00, principal 383.40, balance 4,616.60; last payment 458.39; total interest **500.79** |
| 2 | Same, equal principal | month 1 payment 491.67, month 12 payment 422.88; interest **487.50** |
| 3 | Same quoted 18% flat | interest 900, payment 491.67, total 5,900; implied about 31.7% nominal (tolerance 0.05 points) |
| 4 | 1,200 AZN, 6 months, 12% | A = 207.06; last 207.05; interest 42.35 |
| 5 | 1,000 AZN, 3 months, 0% (taksit) | 333.33, 333.33, 333.34 |
| 6 | 10,000 AZN, 24 months, 24% | A = 528.71; last 528.74; interest 2,689.07 |
| 7 | 600 AZN, 4 months, 12% | A = 153.77; last 153.76; interest 15.07 |
| 8 | Case 1 after 3 payments, extra 1,000, payment kept | 7 remaining payments, last 245.14; interest saved about 130.05 |
| 9 | Card 1,000 AZN, 24% APR, fixed 30/month | interest 20.00 first month; 56 payments; interest 664.43; payment of 20 must trigger "never pays off" |
| 10 | Informal debt 300; payments 100, 50; overpay 160 | remaining 150; overpayment rejected or confirmed; payment of 150 settles; deleting the 50 restores remaining |

**Payoff coaching.** Evidence supports offering a choice, not declaring a winner. Highest-rate-first minimises interest. In a field study of about 6,000 debt-settlement clients, the number of accounts closed predicted success ([Gal and McShane, via Kellogg Insight](https://insight.kellogg.northwestern.edu/article/to_beat_debt_consider_starting_small)). Concentrating repayment on one account raised motivation, most for the smallest ([Kettle et al. 2016, metadata](https://ideas.repec.org/a/oup/jconrs/v43y2016i3p460-477..html)). The full papers were paywalled and not read; neither study is Azerbaijani. Minimum-payment disclosures have mixed US evidence ([Berkeley, via search summary](https://lawcat.berkeley.edu:443/record/1127052/files/fulltext.pdf)), so "total interest" and "months saved" are plausible but unvalidated nudges.

## 5. The Coach Rulebook

**Conventions for all rules.** Every rule first passes the data gate R0. Every rule shows its window and entry count and has a "Why am I seeing this?" panel and a mute. "From what you have recorded" is part of every analytic sentence. Thresholds marked DESIGN DEFAULT are editable and untested. Wording: en is the source text; az and ru are **drafts needing native review**. Test cases are hand-computed; none has been run. Numbers in sample sentences are illustrative.

### R0. Data gate (prerequisite, silent unless it speaks)
- **Trigger:** before every analytic rule. **Formula:** coverage = days with an entry (or an explicit "nothing to log today" tap) in the window / days in window; staleness = days since last entry; future-dated entries excluded and counted; no mixed currencies in one ratio.
- **Minimum:** none. **Defaults:** at least 14 days and 15 entries for single-month rules; staleness limit 3 days; need income present for income-based rules (DESIGN DEFAULTS).
- **Explanation:** If the gate fails, say so instead of showing a figure. **Source/strength:** INFERENCE from [FCA OP40](https://www.fca.org.uk/publications/occasional-papers/occasional-paper-no-40-time-act-field-experiment-overdraft-alerts) (tied to concrete data) and the notes' data-quality analysis; thresholds are DESIGN DEFAULTS.
- **Tests:** 12 of 30 days logged gives "may be incomplete" and suppresses R1-R3; one "nothing to log today" tap counts that day; last entry 5 days old suppresses spending tips and shows welcome-back once; 2 future-dated entries are excluded and reported.
- **en:** "You logged on 12 of the last 30 days, so the numbers may be incomplete." **az (draft):** "Son 30 gündən 12-də qeyd etmisiniz, ona görə rəqəmlər tam olmaya bilər." **ru (draft):** "Вы записывали расходы в 12 из последних 30 дней, поэтому цифры могут быть неполными."

### R1. Spent vs recorded income, and kept from income
- **Trigger:** user opens Insights or month closes. **Formula:** spent% = expenses / income over trailing 30 days or last full month, excluding own-account transfers and loan principal; kept% = 1 - spent%.
- **Minimum:** R0 passes, at least one income entry, a full month. Compared with the user's own prior months by default; 20% shown only as an optional guide.
- **Explanation:** "You kept about X% of the income you recorded." Negative: "You spent more than the income you recorded." No judgement for irregular income.
- **Source/strength:** "spend less than income" = FHN indicator (PRIMARY); 20% is a SECONDARY rule of thumb from 50/30/20 ([Bankrate](https://www.bankrate.com/banking/what-is-the-50-30-20-rule/)).
- **Tests:** income 1,500, expenses 1,245 gives 83% and 17%; no income hides both and offers to add income; expenses 1,600 give 107% in neutral wording.
- **en:** "In the last 30 days you spent 83% of the income you recorded." **az:** "Son 30 gündə qeydə aldığınız gəlirin 83%-ni xərcləmisiniz." **ru:** "За последние 30 дней вы потратили 83% записанного дохода."

### R2. Months of cover
- **Trigger:** user has typed a savings amount. **Formula:** typed liquid savings / average monthly expenses over the last 3 complete months.
- **Minimum:** savings with date; at least 60 days of expense data. **Guide:** 3 months common; show "about six weeks" as a first milestone when under 1.5 months; widen the guide if income is irregular.
- **Explanation:** "The savings you entered would cover about N months of your usual spending." Show "as of <date>". Never infer savings from entries.
- **Source/strength:** 3-6 months is expert convention without evidence ([St. Louis Fed](https://www.stlouisfed.org/publications/page-one-economics/2025/sep/when-unexpected-happens-be-ready-with-emergency-fund)); six weeks from [JPMorgan Chase Institute](https://www.jpmorganchase.com/corporate/institute/report-weathering-volatility.htm) (US, SECONDARY); thresholds are DESIGN DEFAULTS.
- **Tests:** 1,200 AZN savings and 500/month average give 2.4 months; savings of 400 give 0.8 and show the six-week milestone, not "failing"; stale balance (over 60 days) prompts an update.
- **en:** "The savings you entered would cover about 2.4 months of your usual spending." **az:** "Daxil etdiyiniz əmanət adi xərclərinizin təxminən 2,4 ayını ödəyər." **ru:** "Введённых вами сбережений хватило бы примерно на 2,4 месяца ваших обычных расходов."

### R3. Bills share of income
- **Trigger:** monthly review. **Formula:** flagged recurring bills per month / average monthly income (net; user states which).
- **Minimum:** 2 months of income and at least one flagged bill. No default threshold beyond the user's own trend.
- **Explanation:** "Your regular bills take about X% of your recorded income, which leaves less room to adjust quickly."
- **Source/strength:** none for a threshold; 50% "needs" in 50/30/20 is a reference only (SECONDARY); depends on user tagging.
- **Tests:** bills 690 over income 1,500 gives 46%; no flagged bills hides the card; income that is 40% remittance transfers is excluded from "stable income".
- **en:** "Your regular bills take about 46% of your recorded income." **az:** "Müntəzəm ödənişləriniz qeydə aldığınız gəlirin təxminən 46%-ni təşkil edir." **ru:** "Ваши регулярные платежи занимают около 46% записанного дохода."

### R4. Budget limit alert (user-set limits only)
- **Trigger:** spending in a budgeted category reaches about 80% and 100% of the user's own limit, shown once each. **Formula:** spent / limit, with a pro-rated pace note after day 7.
- **Minimum:** user created the budget; R0 passes; not within a stale period.
- **Explanation:** neutral fact plus one optional step ("Adjust limit" / "Not now"). Check there is a cushion in other categories before suggesting tightening, to avoid displacement.
- **Source/strength:** just-in-time alerts tied to concrete, user-set costs worked in [FCA OP40](https://www.fca.org.uk/publications/occasional-papers/occasional-paper-no-40-time-act-field-experiment-overdraft-alerts) (SECONDARY to US/UK banking, not budgeting apps); displacement risk from [Medina](https://academicnewsletter.sufe.edu.cn/info/352133). 80% is a DESIGN DEFAULT.
- **Tests:** food limit 300, spent 240 triggers the 80% message once; spent 310 triggers the 100% message once; no limit set triggers nothing; dismissal twice mutes the type.
- **en:** "You have used 240 of your 300 AZN food limit this month." **az:** "Bu ay yemək limitinizin 300 AZN-dən 240 AZN-ni istifadə etmisiniz." **ru:** "В этом месяце вы использовали 240 из 300 AZN вашего лимита на еду."

### R5. Goal on track
- **Trigger:** user opens Goals. **Formula:** saved/target compared with elapsed share of the timeline.
- **Minimum:** target amount, date and at least one logged contribution; if no date, show progress only.
- **Explanation:** "You have saved 35% of your goal with 40% of the time passed." Specific goal wording; never "you are failing".
- **Source/strength:** specific, goal-named reminders beat generic ones ([Karlan et al.](https://img.nber.org/papers/w16205)), SECONDARY to field studies in other countries.
- **Tests:** 350 of 1,000 with 4 of 10 months elapsed gives 35% vs 40%; no contribution shows progress only; goal past its date gets a neutral "date passed, extend?".
- **en:** "You have saved 35% of this goal, and 40% of the time has passed." **az:** "Bu məqsədin 35%-ni yığmısınız, vaxtın isə 40%-i keçib." **ru:** "Вы накопили 35% по этой цели, а 40% времени уже прошло."

### R6. Month-end estimate
- **Trigger:** user opens Home or Insights after day 7. **Formula, gates, range and 12 test cases:** section 2.
- **Wording states:** verified, rough (no history, from day 10, no range), hidden-thin, hidden-unverified. The breakdown row (Spent so far / Bills still to come / Everyday spending for N more days) is always shown.
- **Source/strength:** method INFERENCE; evaluation protocol PRIMARY ([FPP3](https://otexts.com/fpp3/accuracy.html)); all thresholds DESIGN DEFAULTS; no vendor accuracy benchmark exists.
- **en (verified):** "About 1,100 AZN by month end. Usually between 1,040 and 1,140, based on how this estimate would have done in your last 3 months." (Numbers from test case 8.) **en (hidden):** "Spent so far: 700. Bills still to come: 30." **az (draft):** "Ay sonuna təxminən 1100 AZN. Son 3 ayınızda bu hesab belə olardı: adətən 1040 ilə 1140 arasında." and "İndiyədək xərclənib: 700. Qalan ödənişlər: 30." **ru (draft):** "К концу месяца примерно 1100 AZN. По вашим последним 3 месяцам оценка обычно была бы в пределах 1040-1140." and "Потрачено: 700. Предстоящие платежи: 30."

### R7. Category above its usual level
- **Trigger:** category exceeds its own 3-month median for the same point in the month by both a percentage (default 20%) and an absolute amount (default tunable per currency). **Formula:** actual to date - median to date.
- **Minimum:** 3 prior months; month at least 7 days old; irregular categories (annual, gas/heating) use a same-month-last-year or sinking-fund comparison instead.
- **Explanation:** neutral; for food, add the price caveat "official food prices were about 7% higher than a year ago", read from an editable data file with a date.
- **Source/strength:** variance logic is standard accounting practice but no authoritative materiality threshold exists (SECONDARY, [Spendesk](https://www.spendesk.com/blog/budget-variance-analysis/)); food inflation figure SECONDARY ([Trend](https://www.trend.az/business/4233786.html)).
- **Tests:** food 240 vs usual 200 at day 15 (+20%, +40 AZN) triggers; +10% does not; a winter gas bill compared with the previous month does not trigger, with the same month last year does.
- **en:** "You have spent 240 AZN on food so far. Your usual by this date is about 200 AZN. Official food prices are about 7% higher than a year ago." **az:** "Bu günədək yeməyə 240 AZN xərcləmisiniz. Bu tarixə qədər adətən təxminən 200 AZN olur. Rəsmi məlumata görə ərzaq qiymətləri ötən ilə nisbətən təxminən 7% bahadır." **ru:** "На еду уже потрачено 240 AZN. К этой дате обычно около 200 AZN. По официальным данным, цены на продукты примерно на 7% выше, чем год назад."

### R8. Loan payments share of income
- **Trigger:** monthly review with at least one loan or instalment. **Formula:** sum of monthly loan and taksit payments / typical monthly net income (user chooses regular-only or total). Informational line at **45%** (DESIGN DEFAULT, editable). It is chosen because CBAR's own risk benchmark flags 37% of consumer loans above 45% DTI ([Trend](https://www.trend.az/business/4234370.html)); the exact regulatory definition (gross vs net) was not confirmed.
- **Note on a conflict:** the debt notes proposed 40%; the household notes proposed 45%. We recommend 45% for a local anchor and clearly say it is not a legal limit. Reported 70% bank-lending limit is unconfirmed and must not be shown.
- **Minimum:** 2 months of income; all loans entered (say "only loans you entered").
- **Source/strength:** DTI definition PRIMARY ([CFPB](https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-why-is-the-43-debt-to-income-ratio-important-en-1791/)); local threshold SECONDARY (CBAR via Trend); app threshold DESIGN DEFAULT.
- **Tests:** payments 640 on income 1,300 gives 49% and triggers; payments 400 on 1,300 (31%) shows the figure only; unstable income uses a trailing 6-month average; no promotion of any lender.
- **en:** "About 49% of your recorded income goes to loan payments. This leaves less room for unexpected costs." **az:** "Qeydə aldığınız gəlirin təxminən 49%-i kredit ödənişlərinə gedir. Bu, gözlənilməz xərclər üçün daha az yer qoyur." **ru:** "Около 49% записанного дохода уходит на платежи по кредитам. Это оставляет меньше запаса на непредвиденные расходы."

### R9. Instalment due soon or overdue
- **Trigger:** payment due within 3 days (DESIGN DEFAULT) or past due and unpaid. **Formula:** due date minus today; overdue if no matching payment.
- **Minimum:** loan with first payment date and payment day entered. In-app only unless the user opts in to notifications.
- **Explanation:** "Your instalment of X AZN is due on DATE (the date you entered)." Do not compute penalties.
- **Source/strength:** just-in-time alerts tied to a concrete obligation had the best field evidence ([FCA OP40](https://www.fca.org.uk/publications/occasional-papers/occasional-paper-no-40-time-act-field-experiment-overdraft-alerts)); Medina notes side effects ([abstract](https://academicnewsletter.sufe.edu.cn/info/352133)).
- **Tests:** due 3 days away triggers once; paid via the loan's single "mark paid" action clears it and creates one ledger entry; unpaid after the due date shows a neutral overdue note.
- **en:** "Your instalment of 458.40 AZN is due on 25 Nov." **az:** "458,40 AZN məbləğində taksit ödənişinin son tarixi 25 noyabrdır." **ru:** "Платёж по рассрочке 458,40 AZN нужно внести до 25 ноября."

### R10. Total interest over the loan
- **Trigger:** user views a loan with a rate. **Formula:** schedule per section 4; total remaining interest = remaining payments - remaining balance. Show next to the user's bank figure if entered, with the difference.
- **Minimum:** confirmed rate type, first payment date, term.
- **Explanation:** an estimate; the contract's effective rate and fees are official.
- **Source/strength:** formulas INFERENCE (standard); Azerbaijan disclosure requirement SECONDARY ([Gratanet](https://gratanet.com/news/amending-the-civil-code-was-entered-into-force-introducing-changes-in-four-areas)); effect of showing total interest on behaviour unvalidated.
- **Tests:** debt test cases 1-7 in section 4; flat-rate test 3 shows the implied 31.7% only with the label "flat".
- **en:** "Over the whole loan you would pay about 500.79 AZN in interest on top of the 5,000 AZN you borrowed." **az:** "Kreditin bütün müddətində götürdüyünüz 5000 AZN-dən əlavə təxminən 500,79 AZN faiz ödəyəcəksiniz." **ru:** "За весь срок кредита вы заплатите примерно 500,79 AZN процентов сверх взятых 5000 AZN."

### R11. Payment does not cover interest
- **Trigger:** card or loan payment <= balance x r. **Formula:** payment vs balance x APR/12.
- **Minimum:** user-entered APR and balance. Refuse to project a payoff date.
- **Source/strength:** INFERENCE (arithmetic). Card terms in Azerbaijan not checked.
- **Tests:** test case 9: payment 20 on 1,000 at 2% monthly triggers; 30 does not (56 payments).
- **en:** "At this payment your balance will not go down, because it is about the same as the monthly interest." **az:** "Bu ödənişlə borcunuz azalmayacaq, çünki ödəniş aylıq faizə təxminən bərabərdir." **ru:** "При таком платеже долг не уменьшится, потому что платёж примерно равен месячным процентам."

### R12. Extra payment effect
- **Trigger:** user enters an extra payment or opens "what if". **Formula:** remaining term formula in section 4 with payment kept; show months saved and interest saved.
- **Explanation:** the lender may instead lower the payment or charge a fee; confirm in the contract.
- **Source/strength:** formula INFERENCE; a CBAR template states the borrower may repay in full or partly at any time ([CBAR](https://uploads.cbar.az/assets/Notification%20template%20on%20a%20consumer%20loan%20agreement_Oct_2023%20(002).pdf), wording from a search excerpt).
- **Tests:** test case 8: 1,000 extra after 3 payments gives 7 payments and about 130.05 saved.
- **en:** "An extra 1,000 AZN now would end the loan about 2 months sooner and save about 130 AZN in interest." **az:** "İndi əlavə 1000 AZN ödəsəniz, kredit təxminən 2 ay tez bitər və təxminən 130 AZN faiz qənaət olunar." **ru:** "Если внести сейчас дополнительно 1000 AZN, кредит закончится примерно на 2 месяца раньше, а вы сэкономите около 130 AZN процентов."

### R13. Money owed to the user is past due
- **Trigger:** informal debt owed to the user, 14 days past due (DESIGN DEFAULT). **Formula:** today - due date; remaining > 0.
- **Explanation:** the app sends nothing to anyone and only reflects what was entered; reminders are the user's choice. Informal-lending customs have not been validated.
- **Source/strength:** INFERENCE; no local evidence.
- **Tests:** 300 owed, 150 paid, 16 days late triggers with remaining 150; fully settled triggers nothing.
- **en:** "The 150 AZN that NAME owes you is past its due date. You may want to remind them kindly." **az:** "ƏD-nin sizə borcu olan 150 AZN-in vaxtı keçib. İstəsəniz, nəzakətlə xatırlada bilərsiniz." **ru:** "Долг ИМЯ перед вами на 150 AZN просрочен. При желании можно вежливо напомнить." (Placeholder NAME stands for the entered counterparty.)

### R14. Income dip or irregular income
- **Trigger:** last month's income below 70% (DESIGN DEFAULT) of the 6-month average, or irregular pattern. **Formula:** months with income / months observed; lowest / average.
- **Minimum:** 4 observed months. Compare with the user's own range; never imply a surplus; January 2026 drops may reflect payroll tax changes, so tell the user to enter net pay.
- **Source/strength:** INFERENCE; tax change SECONDARY ([PwC](https://taxsummaries.pwc.com/azerbaijan/individual/significant-developments)); irregular-income buffers from [Vanguard](https://investor.vanguard.com/investor-resources-education/article/understanding-income-volatility-and-emergency-saving) (SECONDARY).
- **Tests:** income recorded in 5 of 6 months, lowest month 60% of average triggers the descriptive note; remittance-tagged transfer is excluded from stable income.
- **en:** "You recorded income in 5 of the last 6 months. The lowest month was 60% of your average." **az:** "Son 6 ayın 5-də gəlir qeyd etmisiniz. Ən aşağı ay orta göstəricinizin 60%-i olub." **ru:** "Вы записывали доход в 5 из последних 6 месяцев. Самый низкий месяц составил 60% от вашего среднего."

### R15. Welcome back after a gap
- **Trigger:** first open after more than 3 days without entries. **Formula:** days since last entry.
- **Explanation:** one-time, no blame; rough amounts are fine; suppresses analytic tips until entries return.
- **Source/strength:** DESIGN DEFAULT; people avoid bad news ([Sicherman et al.](https://www.cmu.edu/dietrich/sds/docs/loewenstein/FinancialAttention.pdf)).
- **Tests:** 5 days away shows it once; a second open the same day does not; no streak language.
- **en:** "Welcome back. Add what you remember. Rough amounts are fine." **az:** "Yenidən xoş gəlmisiniz. Yadınızda qalanları əlavə edin. Təxmini məbləğlər də yaxşıdır." **ru:** "С возвращением. Добавьте то, что помните. Приблизительные суммы подойдут."

### R16. Foreign-currency loan note
- **Trigger:** loan in a foreign currency while recorded income is in AZN. **Formula:** currency mismatch flag.
- **Explanation:** neutral note that exchange rates can change the AZN size of payments; no forecasts, no advice to buy or sell currency.
- **Source/strength:** history of the 2015 devaluations and FX-loan restructuring ([RFE/RL](https://www.rferl.org/a/azerbaijan-suffers-currency-crash-oil-prices/27479606.html), SECONDARY); loan dollarisation 15.6% ([Trend](https://www.trend.az/azerbaijan/4234379.html)).
- **Tests:** USD loan with AZN income triggers once; AZN loan does not.
- **en:** "This loan is in USD but your income is in AZN. If the exchange rate changes, your payments in AZN can change too." **az:** "Bu kredit ABŞ dolları ilədir, gəliriniz isə manatladır. Məzənnə dəyişsə, manatla ödənişləriniz də dəyişə bilər." **ru:** "Этот кредит в долларах США, а ваш доход в манатах. Если курс изменится, ваши платежи в манатах тоже могут измениться."

### Rules deliberately not recommended yet
- **Social comparison:** no valid peer data; can shame.
- **Streaks:** no sourced evidence, plausible harm.
- **Needs/wants 50/30/20 as a default:** only as an opt-in lens.
- **Deposit-insurance fact card and "keep savings in several currencies" tips:** sources conflict (30,000 vs 100,000 AZN deposit insurance), and the latter edges toward advice. Verify with the deposit-insurance fund first.
- **Utility tariff tips:** need a verified tariff schedule.
- **Family-support and Novruz budgeting envelopes:** a user-created "planned yearly envelope" feature is reasonable, but demand has zero sourced evidence.

### Design defaults that need testing
Every number in these lists is a DESIGN DEFAULT, not literature: all data-gate thresholds (14 days, 15 entries, 3-day staleness, 4-of-10 coverage, d>=7); the shrinkage weight 10; one-off multiple 5x and 25%; the 10%/25%/3-month backtest gate; 80% budget alert; 20% category variance; 45% loan-share line; 14-day overdue and 3-day due windows; 70% income-dip line; tip frequency and cooldown numbers. Recommended calibration: simulate steady, spiky, cash-heavy and irregular-logger profiles, then run a small user test in az/ru/en.

## Conclusion

The research changes the question from "what score should the coach show?" to "when has the coach earned the right to speak?". Typed data is a lower bound on spending, so the coach's first job is a completeness check (R0), and its second is to show its working. The month-end estimate shows this clearly: the known part (spent plus bills) is a fact, only the remaining-days part is a guess, and testing the guess on the user's own past months decides whether to show it. Debts raise the same point on the money side: the app should never guess a rate type, and it should store payments as facts while projections stay derived.

Before authorizing a build, three things matter most. First, the rent-on-day-3 fix and the debt model are mathematically specified and can be turned into unit tests today; those are the safest first units of work. Second, the primary Azerbaijani legal and regulatory texts (Civil Code consumer-credit articles, the CBAR rate method and template, the reported 70% DTI rule, deposit-insurance limit) were not read, so no legal claim should ship. Third, none of the az/ru wording and none of the numeric thresholds has been validated by a native reviewer or real users. A short test with 5-10 Azerbaijani users on pay timing, instalment use and how a range is read would turn most "design default" labels into evidence.
