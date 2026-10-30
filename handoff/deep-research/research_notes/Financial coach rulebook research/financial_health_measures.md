# Financial health measures and how apps present a "health score" (for a typed-entries-only expense app, Azerbaijan)

Accessed all sources on 2026-10-30. Labels: PRIMARY = the originating organisation's own document; SECONDARY = third-party summary/news/vendor/aggregator; INFERENCE = my reasoning; TRAINING-MEMORY = recalled from background knowledge, NOT re-verified in this session (treat as unverified until checked).
Tool limits this session: many PDFs were fetched as raw binary and decoded by hand, so some numbers below are partial. Items I could not open are listed under Gaps in each section. This is product-design research, not personal financial advice.

## 1. What are the validated frameworks (CFPB, FinHealth Score, OECD/INFE, academic)?

### Takeaway
Two instruments dominate: the CFPB Financial Well-Being Scale (a perceived/subjective questionnaire) and the Financial Health Network FinHealth Score (eight questions mapped to Spend, Save, Borrow, Plan, with tiers). Both are survey-based on self-report, not computed from transactions. OECD/INFE measures financial well-being as a survey construct too. So no validated framework is a "formula over expense entries"; an app can only borrow the underlying indicator ideas, and should not call its output a validated score.

### Cited Findings
- CFPB developed and tested a question set ("scale") to measure financial well-being, i.e. how far a person's finances and capability give "security and freedom of choice"; there is a standard and an abbreviated version, with questionnaire and scoring worksheets in English and Spanish. PRIMARY — [CFPB scale page](https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/) (accessed 2026-10-30)
- CFPB's consumer-derived definition: financial well-being is a state where a person can fully meet current and ongoing financial obligations, can feel secure in their financial future, and is able to make choices that allow them to enjoy life. PRIMARY — [CFPB user guide PDF, Dec 2015](https://files.consumerfinance.gov/f/201512_cfpb_financial-well-being-user-guide-scale.pdf) (section 2.1, text decoded from PDF; accessed 2026-10-30)
- The guide describes the scale as built with cognitive interviewing and multiple waves of quantitative testing, "highly reliable and valid" in CFPB's words, with a common metric that allows comparison of scores across consumers and tracking of one person over time. PRIMARY — same user guide (page 5)
- The four elements (control over day-to-day/month-to-month finances; capacity to absorb a financial shock; being on track to meet financial goals; having financial freedom to make choices to enjoy life) are reported by ABA Banking Journal. SECONDARY — [ABA Banking Journal](https://bankingjournal.aba.com/?p=23817) (via search snippet only; I did not open it; CFPB's own wording should be checked)
- Full scale = 10 questions; abbreviated = 5 items; both use 5-point ratings. SECONDARY (search-result summary of the CFPB technical report) — [CFPB technical report page](https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-technical-report/); technical report published 26 May 2017, last modified 8 Aug 2023 per that page (PRIMARY for dates).
- FinHealth Score toolkit: score is based on eight survey questions aligned with eight indicators of financial health; one score and four sub-scores (Spend, Save, Borrow, Plan) per respondent. PRIMARY — [FHN FinHealth Score Toolkit 2021 PDF](https://finhealthnetwork.org/wp-content/uploads/2021/11/FinHealthScoreToolkit-2021.pdf) (text decoded from PDF; accessed 2026-10-30)
- The eight indicators and the survey wording (PRIMARY, same toolkit): 
  - Spend: (1) spend less than income - "total spending compared to total income over the last 12 months": much less / a little less / about equal / a little more / much more; (2) pay bills on time - "all / nearly all / most / some / very few" over last 12 months.
  - Save: (3) sufficient liquid savings - "how long could you and your household afford to cover expenses ... living only on money readily available, without withdrawing from retirement accounts or borrowing": 6 months or more / 3 to under 6 months / 1 to under 3 months / 1 to under 4 weeks (wording partly garbled in decode) / less than 1 week; (4) sufficient long-term savings - confidence the household is doing what is needed to meet longer-term goals (very ... not at all confident).
  - Borrow: (5) manageable debt - no debt / manageable / a bit more than manageable / far more than manageable; (6) prime credit score - self-rated excellent ... poor / don't know.
  - Plan: (7) appropriate insurance - confidence insurance would provide enough support in an emergency; (8) plan ahead financially - agree/disagree statement.
- Tier bands from the toolkit: Financially Vulnerable = low scores (0 to ~39) = healthy outcomes on few or none of the eight indicators; Financially Coping = 40 to 79 = healthy outcomes on some but not all; Financially Healthy = 80 to 100 = healthy outcomes on all eight. PRIMARY for the wording of the tiers; the exact numeric cut-offs were garbled in my PDF decode, and the 40-79 coping band is independently stated by a credit union page (SECONDARY — [a US credit union page (gcefcu.org)](https://www.gcefcu.org/?p=28701), snippet only). Treat 0-39 / 40-79 / 80-100 as likely but re-verify against the FHN scoring-logic page.
- Scoring logic (PRIMARY, toolkit): each answer gets points (the Spend, Save, Borrow, Plan sub-scores are the average of the point values of their two questions; the overall score averages all eight). Toolkit shows U.S. national benchmark averages by sub-score (the decode showed 66 / 75 / 69 / 61 / 61 for FinHealth/Spend/Save/Borrow/Plan order uncertain; do not quote without re-check).
- The toolkit's own "best practices" advise being transparent with respondents about how results will be used and about privacy. PRIMARY — same toolkit.
- OECD/INFE 2023 International Survey of Adult Financial Literacy: published 14 Dec 2023, 39 countries/economies (20 OECD members), third round on the 2022 toolkit; measures financial literacy, financial inclusion, digital financial literacy and financial well-being. SECONDARY — search summary of [OECD publication page](https://www.oecd.org/en/publications/2023/12/oecd-infe-2023-international-survey-of-adult-financial-literacy_8ce94e2c.html) (the OECD page itself returned HTTP 403 to me).
- OECD reporting (via national press release) uses a 0-100 financial literacy score with a 70-point target; Luxembourg scored 63 with 53% reaching 70; young adults' financial-well-being OECD average cited as 44/100. SECONDARY — [CSSF Luxembourg press release](https://www.cssf.lu/en/2023/12/international-survey-2023-of-adult-financial-literacy-mixed-results-for-luxembourg/). Austria: 63% of the maximum on well-being, per [OeNB](https://finanzbildung.oenb.at/en/insights-evaluation/Projekte/oecd-infe-befragung.html) SECONDARY.
- Academic structure: Brüggen, Hogreve, Holmlund, Kabadayi, Löfgren (2017), "Financial well-being: A conceptualization and research agenda", Journal of Business Research 79:228-237, defines financial well-being perceptually (current and anticipated desired living standard and financial freedom) and proposes a framework spanning interventions/financial behaviours, consequences, contextual factors and personal factors. PRIMARY (abstract) — [Tilburg repository](https://research.tilburguniversity.edu/en/publications/financial-well-being-a-conceptualization-and-research-agenda/) ; full text not opened (closed access).

### Inferences
- INFERENCE: All three frameworks measure *perception and outcomes by questionnaire*. A typed-entries app cannot reproduce them; at most it can compute analogues of Spend (spend vs income), Save (months of expenses covered by a user-stated saved amount) and bill timeliness. Debt manageability, credit score, insurance and "confidence" need user self-report and should be left out or asked as explicit optional questions.
- INFERENCE: The FinHealth design (per-indicator healthy/not-healthy, tiers defined by *how many* indicators are healthy) is more transparent than a weighted blend, and is the most portable idea for an in-app summary.
- INFERENCE: CFPB's "capacity to absorb a shock" and "on track for goals" map naturally to months-of-cover and goal progress, both computable from user-typed data.

### Gaps
- I did not obtain: the 10 and 5 CFPB item wordings, the 0-100 scoring conversion, and national average (TRAINING-MEMORY says the 2016 U.S. mean was about 54 with a 0-100 scale; unverified here). The PDF decode was too garbled; fetch the CFPB scoring worksheets directly.
- Numeric FHN cut-offs and 2025 benchmark values unverified (see above); FHN's own web page returned 404.
- OECD financial-well-being item definition and whether Azerbaijan participated: not found (OECD page 403). Do not claim Azerbaijan data exists.
- No peer-reviewed paper on the *dimensional structure* beyond Brüggen et al. abstract was retrieved (e.g. objective vs subjective; not verified).

## 2. Which indicators can be computed only from typed income/expense/bill/budget/goal entries?

### Takeaway
Roughly eight indicators are computable and explainable from typed data: spend-to-income and savings rate, bills-to-income, months of cover (only against a *user-stated* saved amount), budget adherence, goal progress, 3-6 month trend, income regularity and bill timeliness. Commonly cited thresholds are rules of thumb of mixed provenance; they should be shown as editable guides, not standards, and each is invalid or misleading when the user has not logged all income or all spending.

### Cited Findings
- Spend vs income is a core FinHealth indicator, asked over a 12-month window with 5 qualitative bands (much less ... much more). PRIMARY — FHN toolkit above. (No numeric ratio threshold is given; "healthy" = spending less than income.)
- Months of cover: FinHealth uses a 3-month threshold for "sufficient liquid savings" per a third-party summary (SECONDARY, search snippet — [Experian blog on FinHealth](https://www.experian.com/blogs/insights/2018/05/tools-drive-financial-health)); the toolkit's response options top out at "6 months or more" (PRIMARY, toolkit). CFPB's 2022 report on emergency savings notes that a rule of thumb most financial experts suggest is having enough to live on for at least three months, an expert convention rather than a CFPB figure (SECONDARY search summary of [CFPB 2022 Emergency Savings report](https://files.consumerfinance.gov/f/documents/cfpb_mem_emergency-savings-financial-security_report_2022-3.pdf)). CFPB "Start Small, Save Up" used a $400 starter target (SECONDARY — [housingwire summary](https://www.housingwire.com/articles/cfpb-prompts-americans-to-start-small-save-up/)). A single-currency USD number does not transfer to AZN.
- Savings rate / budget split: the 50/30/20 rule (50% needs, 30% wants, 20% savings of after-tax income) is popularised by Warren and Tyagi's book *All Your Worth* (2005/2006, sources disagree on year); it is a rule of thumb whose percentages depend on cost of living. SECONDARY — [Bankrate](https://www.bankrate.com/banking/what-is-the-50-30-20-rule/), [Acorns](https://www.acorns.com/learn/saving/50-30-20-budget-rule/). The Acorns page notes the original uses after-tax income.
- Debt-to-income: the CFPB/Dallas Fed describe DTI as monthly debt service divided by gross monthly income; the QM general rule used 43% until the 2020 final rule replaced it with a price-based test. SECONDARY — [Dallas Fed](https://www.dallasfed.org/research/economics/2020/0324.aspx), [NAHB summary](https://www.nahb.org/blog/2020/12/CFPB-Issues-Final-Qualified-Mortgage-Rules). The 36% / 28% figures I searched for were NOT confirmed here (TRAINING-MEMORY: 28/36 is a long-standing lender guideline). A mortgage-qualification DTI is not a personal wellbeing standard and uses gross income, which typed data may not include.
- YNAB "Age of Money": average days between earning money and spending it, based on recent cash transactions; the vendor says 30-50 days means "living on last month's money" and that it reports the past, not the future; drops are not necessarily bad. SECONDARY (search summary of official articles) — [YNAB support Age of Money](https://support.ynab.com/en_us/age-of-money-H1ZS84W1s.md), [YNAB blog](https://www.ynab.com/blog/what-is-the-ideal-age-of-money). The page 404'd on direct fetch; exact formula not seen. A third-party reimplementation reports a weighted/last-10-transactions method (SECONDARY, unreliable).
- Another consumer example: FreeCharge (India) "Health Score" analyses five aspects: income, expenses, savings, debt, insurance cover. SECONDARY — [FreeCharge help](https://support-stg.freecharge.in/financial-strength-score/what-is-the-health-score-and-how-is-it-calculated) (snippet only).

Candidate computable indicators (formula | threshold with source | limits when data incomplete). Formulas are INFERENCE-design; thresholds cited as above.
- Spend-to-income ratio = expenses over window / income over window | "spending less than income" is the FHN healthy outcome (PRIMARY); no numeric cut-off | If income or some expenses are missing, ratio is wrong in either direction; need >= 1 full month of both.
- Savings rate = (income - expenses) / income | 20% from 50/30/20 (SECONDARY, rule of thumb) | Counts unrecorded spending as savings; includes irregular income swings; savings transferred but not recorded as expense vs transfer must be separated.
- Bills-to-income = recurring bills (rent, utilities, loans, subscriptions flagged as bills) / income | 28% housing and 36% total debt are lender conventions (TRAINING-MEMORY, unverified); 50% "needs" in 50/30/20 | Depends on user's category tagging; needs vs wants is subjective.
- Months of cover = user-stated liquid amount / average monthly spending over last 3 months | 3 months expert convention, 6+ top FHN band (above) | Balance is user-typed, may be stale; average spending is understated if entries are missing; do not infer saved amount from income minus expenses (it ignores prior stock).
- Budget adherence = share of budgeted categories where spend <= limit, or per-category spend/limit | no standard threshold | Only meaningful for categories the user budgeted; month partially elapsed needs pro-rating.
- Goal progress = saved toward goal / target; on-track = progress >= elapsed share of timeline | none | Contributions must be logged; goal dates arbitrary.
- 3-6 month trend of spend, savings rate (direction, slope or last-3 vs prior-3 average) | none standard | Needs >= 3 months of complete data; short series noisy; seasonality (e.g. Novruz, holidays, school start) can mimic a trend.
- Income regularity = months with income received / months observed, or coefficient of variation of monthly income | none standard cited | Irregular income is common; do not label it "bad"; cash/informal pay may be unrecorded.
- Bill timeliness (analogue of FHN "pay bills on time") = bills marked paid by due date / bills due | FHN healthy = all or nearly all (PRIMARY) | Needs the user to mark bills paid; paid late vs not logged is indistinguishable.
- Months-of-expenses-covered also supports a "runway" without needing income.

### Inferences
- INFERENCE: Because thresholds are US-based or rule-of-thumb, the app should show them as defaults the user can edit, and state "guideline, not a standard", especially for Azerbaijan where income, housing cost and informal income patterns differ (no local benchmark was found).
- INFERENCE: Every ratio needs a *data completeness gate* (for example "at least 28 days with entries and at least one income entry in the window") and should display "not enough data" instead of a number.
- INFERENCE: Income-based ratios are unreliable for people with cash-only, irregular, or multiple incomes; months-of-cover and budget adherence are less income-dependent and therefore more robust.

### Gaps
- Original 50/30/20 text and exact bands for needs/wants not read first-hand (only secondary summaries).
- 28/36 DTI and ~30% housing cost-burden figures: not confirmed in this session.
- No Azerbaijan-specific benchmarks (typical savings rates, housing share) found; none were searched beyond this research scope.
- No source found for numeric thresholds for income regularity or budget adherence.

## 3. How do real apps present health scores and insights; what do users say; does a single score help or harm?

### Takeaway
Of the apps named, I could verify only that Monzo shows a credit-bureau score with plain-language labels, Mint's legacy score was a credit score (Equifax-based, often confused with lender scores), and YNAB offers a transparent descriptive metric (Age of Money) rather than a score. I found no evidence of an in-house "financial health score" in Copilot, Monarch, Spendee, Wallet or Money Manager. Evidence on harm/benefit of a single financial score is thin; the closest data are fitness-app studies.

### Cited Findings
- Mint's free score was Equifax-based and not what most lenders use; users have mistaken it for FICO; spouse-sharing complaint also reported. SECONDARY — [Experian review of Mint](https://stg1.experian.com/blogs/ask-experian/mint-budgeting-app-review) and aggregator [BestCompany](https://bestcompany.com/credit-monitoring/mint-credit) (search summary only; sources disagree on whether the underlying data was Equifax, TransUnion/VantageScore 3 or Experian). Mint (Intuit) was discontinued in 2024 (TRAINING-MEMORY; not verified here).
- Monzo gives a free TransUnion credit score with factors and compares a single credit score to measuring health by BMI: "a useful starting point, but doesn't tell the whole story"; it layers plain-language labels over bureau scores. SECONDARY (search summary) — [Monzo blog](https://monzo.com/blog/how-we-built-a-product-to-demystify-credit-scores), [Monzo credit insights](https://monzo.com/features/credit-insights/).
- Monarch's help centre covers credit-score viewing (VantageScore 3.0 via Spinwheel/Equifax per a third-party analysis); Copilot says it does not track credit score. SECONDARY — [Monarch help](https://help.monarch.com/hc/en-us/sections/39124473799060-Bill-Sync-Credit-Scores), [Copilot FAQ](https://www.copilot.money/faq). No "financial health score" found for either.
- Wallet by BudgetBakers: described by Finder as clean and personalisable with reports on where money goes; no named health score found. SECONDARY — [Finder](https://www.finder.com/uk/wallet-budgetbakers-review). Spendee: reviewers mention technical issues and appreciate simplicity; no score found. SECONDARY — [Kimola](https://kimola.com/reports/unlock-insights-into-spendees-user-feedback-app-store-id-151835). Money Manager (Realbyte), Revolut, Emma, Cashera: no usable information retrieved.
- Evidence on shame/motivation: a UCL-led study of about 14,000 posts about fitness/calorie apps found frustration as common as motivation, shame at logging "unhealthy" items, and disappointment at slow progress against app-set targets; authors recommend overall well-being and intrinsic motivation over narrow rigid measures. Limitation: only negative posts analysed. SECONDARY (analogy, not finance) — [UCL news Oct 2025](https://www.ucl.ac.uk/news/headlines/2025/oct/emotional-strain-fitness-and-calorie-counting-apps-revealed). 
- A vendor-sponsored Credit Sesame survey reports that among people struggling with card debt, 82% stress, 40% shame (SECONDARY, vendor, not verified firsthand; shows distress in debt context, not an effect of scores).
- A student thesis states that effects of financial health scores on consumer behaviour have not been much explored. SECONDARY — [TUM story](https://www.mgt.tum.de/our-stories-with-impact/detail/forget-finance-score-how-our-students-are-driving-the-shift-to-greater-financial-health).

### Inferences
- INFERENCE: There is no strong direct evidence in what I found that a single score improves financial behaviour; shame/gaming risks are plausible by analogy to fitness apps and credit-score misinterpretation, but remain unverified for expense apps.
- INFERENCE: For a manual-entry app, a single number would conflate "I forgot to log" with "I am doing badly", creating false, discouraging scores and an incentive to game entries (e.g. skipping logs of embarrassing spends).
- INFERENCE: Safer pattern: a short list of separate indicators with status words, each with its inputs, instead of one composite number. If any composite is wanted, FinHealth-style "x of y indicators healthy" is easiest to explain.

### Gaps
- No primary-source (help centre) description of any health score in Cashera, Emma, Revolut, Copilot, Monarch, Spendee, Wallet, Money Manager; search returned none. App store review sampling (praise/complaints about scores) was not done; I have no review statistics and give none.
- No controlled study found on the effect of a financial health score on motivation, shame, or gaming.

## 4. Good practices for explaining a number

### Takeaway
I found little finance-specific design literature in this session; practices below are mostly my inference from the sources that exist (FHN transparency guidance, YNAB's caveats, Monzo's BMI framing). They are consistent and low-risk but should be tested with users.

### Cited Findings
- FHN's toolkit best practice: be transparent about purpose and privacy measures. PRIMARY — FHN toolkit.
- YNAB explicitly tells users what the metric is, that it reflects the past, and that a drop can be benign (planned spend). SECONDARY — YNAB blog/support above.
- Monzo explicitly warns a single score is incomplete and shows contributing factors. SECONDARY — Monzo blog above.
- CFPB frames its scale as a way to track one's own progress over time and compare consistently, i.e. emphasises change against self. PRIMARY — CFPB user guide p.5.

### Inferences
- INFERENCE (design practices): (1) show the formula in words and the actual figures ("You spent 1,240 of 1,500 AZN income in the last 30 days = 83%"); (2) show the window and how many entries/days were used; (3) show assumptions (which categories counted as bills, whether saved amount is user-typed and when last updated); (4) show uncertainty as "not enough data" or a range, never a precise percentage from sparse data; (5) let the user edit thresholds and category tagging, and mark thresholds as guidelines with source; (6) use neutral, non-moralising language; (7) compare to the user's own past, not to a population; (8) no red/failure framing for irregular income; (9) provide an "I missed logging this period" control that excludes the window; (10) localise number/date formats and wording in az/ru/en and review wording natively (Azerbaijani/Russian financial terms not verified here).
- INFERENCE: A one-tap "How is this calculated?" panel with the inputs is cheap to build for each rule and testable (assert the displayed inputs match stored data).

### Gaps
- No usability research located on explaining financial scores to low-literacy or older users; no Azerbaijani-language evidence.
- No evidence found on whether editable thresholds are used or valued by users.

## Implications for a coach rule

All rules below are INFERENCE-designed from the sources above; every threshold must be editable in the UI and labelled as a guideline. Data gate = rule shows "not enough data" otherwise. Windows are calendar months or trailing 30 days.

1. Spend vs income
   - Formula: expenses / income over the trailing 30 days (or last full month); status "below income" if < 100%.
   - Minimum data: at least 14 days with entries and at least one income entry.
   - Sentence: "In the last 30 days you spent 83% of the income you recorded."
   - Caveat: unrecorded income or spending distorts it; transfers between own accounts excluded. Basis: FinHealth "spend less than income" (PRIMARY).
2. Savings rate
   - Formula: (income - expenses) / income, same window; guideline default 20% (editable).
   - Minimum: as rule 1, plus a full month.
   - Sentence: "You kept about 17% of recorded income this month; a common guideline is 20%."
   - Caveat: guideline is a popular rule of thumb (SECONDARY), not a standard; negative months are normal for irregular income.
3. Months of expenses covered
   - Formula: user-typed liquid savings / average monthly expenses over the last 3 months; guideline 3 months, "6+" = strong (FinHealth top band).
   - Minimum: user-entered savings amount (with date) and >= 60 days of expense data.
   - Sentence: "The savings you entered would cover about 2.4 months of your usual spending."
   - Caveat: relies on user-entered balance; show "as of <date>"; never infer savings from entries.
4. Bills share of income
   - Formula: recurring bills (user-flagged) per month / average monthly income; no fixed default (editable; 50% "needs" as a reference only).
   - Minimum: >= 2 months income data and at least one flagged bill.
   - Sentence: "Your regular bills take about 46% of your recorded income."
   - Caveat: depends on user tagging; 28%/36% lender ratios unverified here and not for personal wellbeing.
5. Budget adherence
   - Formula: for each budgeted category, spent / limit (pro-rated by days elapsed); report the count within limit out of total.
   - Minimum: at least one budget set; at least 7 days into the period for pro-rating.
   - Sentence: "4 of 6 budgets are within their limit so far this month."
   - Caveat: only budgeted categories count; no reward/penalty framing.
6. Goal on-track check
   - Formula: saved/target compared with elapsed time share (start to target date).
   - Minimum: goal with target amount, date and at least one contribution.
   - Sentence: "You have saved 35% of your goal with 40% of the time passed."
   - Caveat: contributions must be logged; if no date set, show progress only.
7. Spending trend
   - Formula: average monthly expenses of the last 3 full months vs the 3 before (or last month vs 3-month average); report direction and % change.
   - Minimum: >= 4 full months for the 3-vs-3 comparison, >= 3 for last-vs-average.
   - Sentence: "Your monthly spending is about 8% higher than the previous three months."
   - Caveat: seasonality, one-off purchases; show "n months used"; flag big single items.
8. Income regularity
   - Formula: months with at least one income entry / months observed (last 6), and ratio of lowest to average month.
   - Minimum: >= 4 observed months.
   - Sentence: "You recorded income in 5 of the last 6 months; the lowest month was 60% of your average."
   - Caveat: describes pattern only; informal/cash income may be unrecorded; never labelled "bad".
9. Bill timeliness
   - Formula: bills marked paid on or before due date / bills due in the last 3 months (FinHealth "pay bills on time": all or nearly all = healthy).
   - Minimum: >= 3 bills with due dates and a paid flag.
   - Sentence: "You paid 8 of 9 bills on or before their due date in the last 3 months."
   - Caveat: depends on the user marking bills paid; unmarked = unknown, not late.
10. Data completeness meter (prerequisite)
    - Formula: days with at least one entry in the window / days in window, plus whether income exists.
    - Minimum: none.
    - Sentence: "You logged on 12 of the last 30 days, so the numbers above may be incomplete."
    - Caveat: a day with no spending is valid; offer "nothing to log today" tap so the meter is not punishing. Gates rules 1-4, 7.
11. Runway without income (optional)
    - Formula: user-typed liquid savings / average monthly expenses, shown with "if your income stopped" framing, for users with income gaps.
    - Minimum: as rule 3.
    - Sentence: "If income stopped, your entered savings would last about 2 months at your current spending."
    - Caveat: hypothetical; avoid alarm wording.
12. Summary without a composite score
    - Formula: count of indicators currently within their (editable) guideline out of those with enough data, shown as "3 of 5 checks look on track" with a list; no 0-100 number.
    - Minimum: >= 3 indicators with enough data.
    - Sentence: "3 of the 5 checks we can calculate look on track; 3 more need more entries."
    - Caveat: mirrors FinHealth's tier logic (healthy on how many indicators, PRIMARY) but is not validated, must not be named a "financial health score"; recommend not shipping a single number at all until user testing shows it helps rather than discourages (no evidence found either way for expense apps).

Explicit recommendation (INFERENCE): do not ship a 0-100 composite; ship separate indicators with inputs, "how calculated" panel, editable thresholds, data-completeness gating, and neutral wording; run a small user test in az/ru/en before adding any aggregate.
