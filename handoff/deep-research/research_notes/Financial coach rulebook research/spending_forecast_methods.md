# Credible end-of-month spending forecast for a typed-entries personal finance app

Access date for all URLs: 2026-10-30. Labels: PRIMARY = the vendor's/author's own page; SECONDARY = third-party description or user forum; INFERENCE = my reasoning, not sourced. Research budget was limited (about 18 tool calls; web search hit a rate limit once, so Copilot Money, Mint, Monarch's own forecast help page (HTTP 403) and Monzo's current help page (404) could not be read).

## 1. What simple, robust forecasting approaches exist, and how do they fail?

### Takeaway
The standard textbook position is that simple benchmark methods (mean, naive, seasonal naive, drift) are the bar any fancier method must beat, and that accuracy must be judged by rolling-origin out-of-sample testing, not in-sample fit. For a rule-based app the strongest structure is "money already spent + known bills still to come + (days left x typical variable daily spend)", with one-offs and recurring bills kept out of the daily rate, a shrinkage blend between this month and past months, and a range derived from the user's own backtest errors.

### Cited Findings
- Four benchmark methods: mean (average of history), naive (last value), seasonal naive (value from the same season last cycle), drift (extend first-to-last slope). Simple methods "can be surprisingly effective" and serve mainly as benchmarks; a new method is worth considering only if it beats them. — PRIMARY: [FPP3 section 5.2 Some simple forecasting methods](https://otexts.com/fpp3/simple-methods.html)
- Seasonal naive suits strongly seasonal data (forecast = same period last cycle); the mean method's fitted values use future data, so are not true forecasts. — PRIMARY: [FPP3 5.2](https://otexts.com/fpp3/simple-methods.html)
- Rolling-origin evaluation ("time series cross-validation", FPP3 5.10): train only on data before each test point, skip the earliest origins because tiny training sets are unreliable, average errors over many origins. In-sample residual accuracy is optimistic. — PRIMARY: [FPP3 accuracy chapter](https://otexts.com/fpp3/accuracy.html)
- MAE targets the median and is easy to interpret; RMSE targets the mean; both are in data units. MASE scales error by the in-sample naive error (below 1 beats naive). MAPE is undefined/infinite when actual = 0, explodes near zero, and penalises negative errors more heavily; the book recommends against sMAPE. — PRIMARY: [FPP3 5.8](https://otexts.com/fpp3/accuracy.html)
- Prediction intervals: point forecast +/- c x residual standard deviation (c = 1.28 for 80%, 1.96 for 95%), with sigma growing with horizon; bootstrapped intervals resample past residuals and take percentiles, giving asymmetric intervals, assuming only uncorrelated residuals with constant variance. — PRIMARY: [FPP3 5.5 Prediction intervals](https://otexts.com/fpp3/prediction-intervals.html)
- Monzo (production example of the plain "current daily spending pace, minus committed spending" model): the "left over" forecast projects current daily spending forward after subtracting committed spending; users describe it as "a very simple sum" that does not weight weekends differently. — SECONDARY (Monzo staff quoted in a user forum): [Monzo community: You're set to have x left over](https://community.monzo.com/t/youre-set-to-have-x-left-over-confusion/98806)

### Inferences (INFERENCE, not sourced)
Method-by-method notes for a typed-entries app:
- **Current method (mean daily spend so far x days in month).** Equals the "mean" benchmark applied to cumulative spending without separating lumpy items. Failure mode confirmed by the owner: rent on day 3 is spread over every day, e.g. rent 600 + variable 100 over 10 days gives 70/day x 30 = 2,100 although the real expectation is about 930. Error is proportional to (lumpy amount) x (days_in_month/days_elapsed - 1), worst early in the month.
- **Separate fixed/recurring from variable.** Forecast = recorded spend so far + unpaid recurring bills due later + remaining days x typical variable daily rate. Bills are *known* amounts and dates, so they are added, not extrapolated. Failure modes: bill recorded but not matched to the bill definition (double-counted: counted as variable AND as upcoming); bill amount changes (utilities); irregular frequencies (quarterly, annual) must only appear in months they fall due; overdue unpaid bill still owed (should remain in "bills left").
- **Mean vs median vs trimmed mean of daily variable spend.** For many users most days have zero or small entries, so the *median of daily totals* is often 0 and badly underestimates a month (the median ignores the big days that make up most of the money). Median is right for *deciding which entry is an outlier*, not for the rate. Recommended: mean of daily totals after removing flagged one-offs (or winsorizing daily totals at e.g. 3x the median nonzero day), i.e. a trimmed/winsorized mean. Compare via backtest, do not assume.
- **Outlier / one-off exclusion.** A single large non-bill purchase (laptop, 180 in a month where typical variable is 240) inflates the rate if extrapolated. Rule: such an entry counts in "spent so far" but is excluded from the rate. Detect with a threshold (entry >= k x median nonzero daily total over last 90 days, or >= X% of typical monthly variable) plus a user "one-off" toggle. Failure modes: false positive removes a genuine habit (a weekly 60 grocery run flagged because history is small); false negative leaves holiday spikes in. Provide user control and show the exclusion.
- **Day-of-week seasonality.** Weekly seasonal naive (m=7). With only typed entries, 4 to 5 weeks per month is too little to estimate seven weekday means reliably; Monzo users complain that weekends are not weighted (see above). Recommendation: do not model weekdays in v1; cover the remaining days by counting how many weekends remain only if backtest shows a gain (hypothesis).
- **Pay-cycle / salary-day effects.** Spending is often front-loaded after payday. Mitigation: (a) let the period follow the pay cycle (Revolut and Emma both offer custom cycles, see Q2); (b) use a "share-of-month-by-day-d" estimator from past months as a second method (variable_total_pred = variable_so_far / median past share at day d) and let the backtest choose between it and the flat rate. Income itself must never enter the spending rate.
- **Previous months' same-period pace.** Seasonal-naive-style benchmark: last month's total or last month's spend by the same day. Use as (a) shrinkage prior for early days, (b) benchmark that the main method must beat in backtest.
- **Exponentially weighted averages.** Useful but needs a smoothing parameter; with 1 to 6 months of data, equal-weighted median-of-months is as good and explainable. A cheap alternative to EWMA: shrinkage blend rate = (d x rate_this_month + k x rate_history) / (d + k) with k about 10 (days). Early in the month the prior dominates; late, this month dominates. (k=10 is a design choice to tune by backtest, not a sourced value.)
- **Minimum history and first days.** Early days have too little data: with d=3 and one purchase, any extrapolation multiplies noise by about 10. Also users who log irregularly (missing entries) produce an artificially low rate; require logging coverage (entries on at least 4 distinct days in the last 10) or hide.
- **Income timing.** Forecast spending, not balance. Keep it separate from "Safe to Spend". If income arrives late (day 28) the "safe to spend" is low early in the month while spending forecast is unaffected; do not mix the two.
- **Double counting trap (documented in the wild).** A Monzo user reports the forecast apparently counts committed spending twice (committed amount subtracted and again projected); another says it assumes monthly pay and monthly bills so irregular recurring payments are miscounted and ignores payday. See Q2 citations. Lesson: keep a strict partition of every transaction into exactly one bucket: bill / one-off / variable.

### Gaps
- No published accuracy benchmark for household month-end spending forecasts from typed entries was found. I did not locate academic papers specific to household expenditure forecasting (search budget); treat the thresholds below as design parameters to be calibrated, not literature values.
- No source for the best shrinkage constant k or outlier multiple k; they must be tuned on real or simulated data.

## 2. What do other products do and claim, and what complaints exist?

### Takeaway
Most vendors publish no accuracy figures and document the method only loosely. The documented-in-practice pattern (Monzo, Revolut) is "current daily pace plus scheduled/committed payments", and the main user complaints are double counting of commitments, ignoring payday/weekends, and irregular bills. YNAB deliberately does not forecast.

### Cited Findings
- **Monzo.** Help copy: Trends shows spent and left, and Monzo says it will tell you if it looks like you will run out of money before month end; one-off large payments can be excluded from spending and daily-budget calculation. — SECONDARY (search-result excerpts of Monzo pages; the current Trends help page returned 404 when fetched): [Monzo community search result: "What is Trends?" excerpt](https://monzo.com/help/budgeting-overdrafts-savings/what-trends-tab-web)
- Monzo staff in the forum: it estimates the amount left at end of period by projecting current daily spending after subtracting committed spending. Users: "very simple sum", no trend tracking, probably a rolling daily average not weighting weekends. One user confused because "left to spend" showed 3,000 but forecast showed 1,000 left over. — SECONDARY: [Monzo community thread](https://community.monzo.com/t/youre-set-to-have-x-left-over-confusion/98806)
- Monzo complaint: forecast overestimates leftover because committed spending seems counted again (example: 500 spent, 1,000 committed, projected 1,500 for the rest of the month rather than 500); another user finds it accurate but says it assumes monthly pay and bills and miscounts irregular recurring payments; another calls it "inaccurate and unintuitive" and says it ignores payday; scheduled/standing orders lack the "repeating payment" flag, which may cause missed commitments. — SECONDARY (user reports): [Monzo community: Left Over amount skewed by Committed Spending](https://community.monzo.com/t/left-over-amount-skewed-by-committed-spending/130793)
- Monzo blog (2017) says it uses last month's regular payments to predict committed spending; users note one-off and newly created direct debits are not predicted until charged. — SECONDARY (aggregated search excerpt, not opened in full): [Monzo blog: budget targets](https://monzo.com/blog/2017/03/31/budget-targets)
- **Revolut.** Announcement says users can see how much they are predicted to spend by month end "based on your day-to-day spending and scheduled payments"; custom budgeting cycles can match pay date. No accuracy statistic found. — SECONDARY (search excerpt of Revolut's blog/help; pages not opened in full): [Revolut blog: new and improved Analytics](https://www.revolut.com/blog/post/introducing-new-and-improved-analytics/); [Revolut help: How does Analytics work](https://help.revolut.com/help/app-features/budgeting-and-analytics/how-does-the-analytics-feature-work/)
- **Emma.** A community reply says Emma's forecast uses entered income and frequency, not spending patterns; users request a predicted balance tool; Emma's blog says it can deliver a Money-Dashboard-like forecast experience via budgeting and "true balance" (marketing claim). Pay-cycle budgeting periods exist. No documented spend-extrapolation algorithm found. — SECONDARY: [Emma community: future forecast suggestion](https://community.emma-app.com/t/a-few-suggestions-including-future-forecast/2257); [Emma blog](https://emma-app.com/blog/money-dashboards-forecast-feature-alternative)
- **Monarch.** Third-party reviews and marketing say forecast uses linked accounts plus recurring transactions, accuracy depends on regular patterns; reviews place long-term forecasting on a higher plan. Monarch's own help article could not be fetched (403), so the method is NOT confirmed as documented by me. — SECONDARY: [Monarch Planning help section (403 on fetch)](https://help.monarch.com/hc/en-us/sections/48306323519380-Planning); [Penny Hoarder review](https://www.thepennyhoarder.com/budgeting/monarch-money-review/)
- **YNAB.** No end-of-month spending forecast found; Age of Money is backward-looking and targets compute what is needed to fund the month. Reviewers say they would like forecasting beyond one month. — SECONDARY (search excerpts): [YNAB glossary](https://support.ynab.com/en_us/ynab-glossary-a-guide-BJd80SORq.md); [Fortune YNAB pros and cons](https://fortune.com/article/ynab-pros-and-cons)
- **Simple "Safe to Spend".** Described by reviews as balance minus pending transactions, upcoming bills and goals; BBVA shut Simple down in 2021 (from my own knowledge, not verified here). No official formula found in the results. Note: the owner's app definition (income received minus savings floor minus recorded spending minus upcoming bills) is the same family of idea. — SECONDARY: [MoneyCrashers Simple review](https://www.moneycrashers.com/simple-review/)
- **Buxfer** states its Forecast estimates future spending, income and balances from past spending, upcoming transactions, reminders and budgets (method detail not found). — SECONDARY (search excerpt): [Buxfer](https://www.buxfer.com/?p=53)

### Inferences (INFERENCE)
- Cashera: my search for "Cashera" returned no matching app (closest: Cashews, ForeSpend, Capycash). Its "forecasts" claim is UNDOCUMENTED from what I could find; do not assume any method.
- Copilot Money, Mint legacy: not researched (rate limit); treat as NOT ASSESSED. Mint was shut down by Intuit in 2024 (my knowledge, unverified here).
- No vendor reviewed publishes a forecast error statistic. A product that publishes a backtested error on the user's own data would be a differentiator (strategic opinion).
- Monzo's trouble spots (double counting commitments, payday ignored, irregular bills, weekends) are exactly the tests the new rule should pass.

### Gaps
- Copilot, Mint legacy, Cashera, and bank "predicted balance" features: no usable primary documentation retrieved.
- Monarch help article and current Monzo Trends help page not readable.
- Accuracy figures: none published by any vendor found.

## 3. How should uncertainty be communicated honestly?

### Takeaway
Evidence from large UK surveys says a numeric range costs only a small amount of trust in the number and no significant trust in the source, whereas vague verbal hedges ("might be different") cost more in both. So prefer a range plus plain-language basis over either a bare point number or a vague disclaimer, and hide the number when it is not credible.

### Cited Findings
- Five UK online experiments (n=5,780): stating uncertainty as a numeric range produced a small decrease in trust in the number and no significant change in trust in the source; verbal-only statements of uncertainty produced a larger decrease in trust in the number and a small decrease in trust in the source. — SECONDARY (summaries of the PNAS paper by van der Bles, van der Linden, Freeman, Spiegelhalter, 2020; full text not read): [AI Impacts paper summary](https://blog.aiimpacts.org/p/paper-summary-the-effects-of-communicating); [Cambridge Network news](https://www.cambridgenetwork.co.uk/news/uncertainty-about-facts-can-be-reported-without-damaging-public-trust-news-study)
- Follow-up COVID-19 studies (reported N=10,519 for study 1) found the same small effect for projected figures, and recommend numerical ranges over verbal statements. — SECONDARY (same search summaries): [Cambridge repository](https://www.repository.cam.ac.uk/items/60837e23-a599-4c35-ad2c-b1526b559e49)

### Inferences (INFERENCE)
- Those studies concern public statistics in news contexts, not budgeting apps; transferability is unvalidated. Test with 5 to 8 real users (does the range cause anxiety, does it get misread as a guarantee?).
- Wording principles: say what it is based on ("so far", "bills still to come"), separate known from estimated, call it an estimate, give a range with a stated meaning ("in your last N months it ended between..."), never promise ("you will spend"). Make the decomposition visible so the owner can *verify the number by hand*: known part (spent + bills left) is a fact, only the remaining-days part is an estimate.
- Not credible conditions: hide the estimate; still show "Spent so far" and "Bills still to come" (deterministic).

### Gaps
- No evidence found on how personal-finance app users respond to point forecasts versus ranges specifically.
- Full text of the PNAS paper not opened; effect sizes unverified.

## 4. How can the forecast be verified inside the app (backtest)?

### Takeaway
Replay the exact algorithm on each completed earlier month, truncated at checkpoints (day 10, 15, 20), and compare to the actual month total. This is FPP3's rolling-origin evaluation applied to one user's data; display the forecast only if recent typical error is small and the method beats the naive benchmark.

### Cited Findings
- Rolling forecasting origin: training data only before each origin, average error over origins; skip earliest origins. — PRIMARY: [FPP3 5.10](https://otexts.com/fpp3/accuracy.html)
- Empirical/bootstrapped intervals from past residuals are the textbook way to get a range without a normality assumption. — PRIMARY: [FPP3 5.5](https://otexts.com/fpp3/prediction-intervals.html)

### Inferences (INFERENCE): concrete procedure
1. Eligible months: the most recent up to 6 *complete* months before the current one, each with logging coverage (variable entries on at least 10 distinct days) and no more than 1 month skipped. Need at least 3 eligible months, else the status is "not verified" (no range, and see gating in section 5).
2. For each eligible month m and each checkpoint c in {10, 15, 20} with c < days_in_month: use only entries dated <= day c and only history strictly before month m (so month m-1 and earlier; for the first eligible month with no earlier history use no-history mode and mark it). Compute forecast F(m,c). Actual A(m) = full month total.
3. Error per origin: APE = |F - A| / A (A is a total spend, so nonzero; skip months with A = 0). Also compute remaining-portion ratio rho = (A - known_at_c) / (F - known_at_c), where known_at_c = spent so far + bills left; skip if the denominator is <= 0.
4. Benchmarks: naive = last full month total; "pace" = the current formula (mean daily x days). Compute their APEs the same way.
5. Summaries per checkpoint c: median APE (typical error), worst APE, number of months n.
6. Acceptance gate (design values, tune with data): show the number at checkpoint c (the largest c <= today's day) only if n >= 3, median APE <= 10% at c (<= 15% allowed at c=10), worst APE <= 25%, and median APE not worse than the best benchmark. Otherwise do not show the estimate. If today < day 10 show only the deterministic parts.
7. Range: lower = known_now + R-portion x min(rho), upper = known_now + R-portion x max(rho) over eligible months when 3 to 7 months exist; with >= 8 origins use the 25th to 75th percentile. Always widen to include the point estimate. Label it "your usual range", not a confidence level, unless the sample supports one.
8. Show provenance: "Checked against your last N months: typical miss X%". Show the figure on a details screen so the owner can audit.
9. Recompute on every data change. Test the backtest itself with synthetic months with known answers (see test cases).
10. Caution: 3 to 6 points give very uncertain error estimates; the gate is a screen against clearly bad performance, not proof of accuracy. Also guard against leakage: an entry edited after its date still counts for its stated date, which is a mild leak (entries typed late), so require coverage and note it.

### Gaps
- Thresholds (10%, 25%) have no literature support; calibrate by simulation across plausible spending profiles (steady, spiky, cash-heavy, irregular loggers).

## 5. Statistical references appropriate for a product team

### Takeaway
Use FPP3 for benchmarks, evaluation protocol and intervals; use robust statistics (median, trimmed mean, MAD) for outlier handling; judge with MAE-type measures plus a naive benchmark, avoiding MAPE where actuals can be near zero (not an issue for monthly totals, but is for daily).

### Cited Findings
- FPP3 (Hyndman and Athanasopoulos, 3rd ed., online free): 5.2 simple benchmarks, 5.5 prediction intervals, 5.8 accuracy measures, 5.10 time series cross-validation. — PRIMARY: [otexts.com/fpp3](https://otexts.com/fpp3/simple-methods.html)
- Hyndman's R `forecast` documentation states snaive uses model Y_t = Y_{t-m} + Z_t. — SECONDARY (search excerpt): [forecast::naive reference](https://pkg.robjhyndman.com/forecast/reference/naive.html)

### Inferences (INFERENCE)
- Robust statistics (median, trimmed/winsorized mean, MAD) are standard textbook material but I did not cite a specific source here; any intro statistics text suffices.
- Household-expenditure-forecasting academic papers were not located in this pass: NOT ASSESSED.

### Gaps
- No peer-reviewed study on month-end household spend forecasting from self-entered data found.

## Implications for a coach rule

### Takeaway
Replace "average x days in month" with: **Estimated month total = spent so far + bills still to come + (days left x typical everyday daily spend)**, hidden unless data coverage and a backtest on the user's own months justify it, and always displayed with its parts and a range.

### Recommended algorithm (INFERENCE / design; all constants tunable by backtest)
Definitions: N = days in period (calendar month, or pay cycle if configured); d = today's day number (entries through today counted; R = N - d remaining days). Income entries and transfers are never spending. Every expense is assigned to exactly one bucket: BILL (matches a recurring bill, by link or by name/amount/date window), ONEOFF (user-flagged or auto-flagged large), VARIABLE (everything else).

1. Coverage gate: count distinct days in the last 10 with a VARIABLE entry. If < 4, or d < 7 (calendar days), return NONE(reason) and show only spent-so-far and bills-left.
2. spent_so_far = sum of all expenses this period (BILL + ONEOFF + VARIABLE).
3. bills_left = sum of recurring bills due after today, plus overdue bills with no matching payment this period; frequency-aware (a quarterly bill appears only in due months).
4. One-off detection: an expense that is not a BILL and has amount >= max(5 x median nonzero daily variable total over last 90 days, 25% of typical monthly variable) or is user-flagged; also user-flagged "unusual days" (holiday, trip) are excluded from the rate. Excluded amounts stay in spent_so_far.
5. rate_now = (VARIABLE total excluding flagged one-offs/days) / (d minus excluded days).
6. rate_hist = median over up to the last 3 complete eligible months of (VARIABLE total excl. one-offs) / N_m. If no history, rate = rate_now only when d >= 10, labelled "rough estimate" with no range; else NONE.
7. rate = (d_eff x rate_now + 10 x rate_hist) / (d_eff + 10), where d_eff = non-excluded days elapsed.
8. point = spent_so_far + bills_left + R x rate.
9. Backtest (section 4): require the gate to pass; compute range = spent_so_far + bills_left + (R x rate) x [min rho, max rho] (or P25 and P75 when >= 8 origins). If the gate fails: NONE(not verified).
10. Round for display: nearest 5 if < 1,000, nearest 10 if >= 1,000; show components.

Pseudo-code:
```
function forecast(period, entries, bills, history):
  if coverageDays(entries, last10) < 4 or d < 7: return NONE("not_enough_entries")
  spent = sum(expenses(entries))
  billsLeft = sum(b.amount for b in bills if b.dueInPeriodAfter(today) or b.overdueUnpaid)
  var = [e for e in expenses if bucket(e)=="VARIABLE" and not isOneOff(e) and not inExcludedDay(e)]
  dEff = d - excludedDays
  rateNow = sum(var)/dEff
  hist = eligibleMonths(history, max=3)
  if hist: rateHist = median(m.variableExOneOffs/m.N for m in hist); rate=(dEff*rateNow+10*rateHist)/(dEff+10)
  elif d >= 10: rate = rateNow; mode="rough"
  else: return NONE("not_enough_history")
  point = spent + billsLeft + R*rate
  if mode=="rough": return {point, range:null, label:"rough"}
  bt = backtest(history, checkpoints=[10,15,20])      # replays this same function on past months
  if not passesGate(bt, d): return NONE("not_verified")
  lo = spent + billsLeft + R*rate*min(bt.rho); hi = spent + billsLeft + R*rate*max(bt.rho)
  return {point, lo: min(lo,point), hi: max(hi,point), parts:{spent,billsLeft,R*rate}}
```

### Test cases (hand-computed; N=30 unless stated)
1. **Rent on day 3 (owner's case).** d=10, no history. Rent 600 recorded day 3 (bill), VARIABLE total 100 over >= 4 distinct days, phone bill 30 due day 20 (unpaid). spent=700, billsLeft=30, rate=100/10=10, R=20. Expected rough point = 700 + 30 + 200 = **930**, range null. Old method = 700/10 x 30 = 2,100 (must NOT be produced).
2. **Salary on day 1.** d=5, income 1,500 on day 1, expenses 50. Expected: NONE (d<7); show "spent so far 50"; income not in spending.
3. **Only 4 days of data with history.** d=4, VARIABLE 48, history months' variable totals 240, 255, 270. Expected NONE(d<7). The "typical month" hint (not a forecast) = median 255.
4. **Normal month with history.** d=10, rent 600 on day 3 (bill), VARIABLE 130, electricity 80 due day 25 unpaid, history daily rates 8, 8.5, 9. rate_now=13, rate_hist=8.5, rate=(10x13+10x8.5)/20=**10.75**, R=20 -> 215. point = 600 + 130 + 80 + 215 = **1,025** (assuming backtest gate passes).
5. **Large one-off purchase.** d=15, VARIABLE entries total 300 including a 180 flagged one-off, no history, no bills. rate_now=(300-180)/15=8, R=15 -> 120; point = 300 + 120 = **420** (rough, no range). Naive extrapolation would give 300/15 x 30 = 600.
6. **Holiday week.** d=21, VARIABLE 350 (days 1 to 14: 70; days 15 to 21: 280), history rate 6. (a) Not excluded: rate_now=350/21=16.667; rate=(350+60)/31=13.2258; R=9 -> 119.03; point = **469.03**, and the UI should state the estimate includes a recent spike. (b) User marks days 15 to 21 as unusual: rate_now=70/14=5; rate=(14x5+10x6)/24=130/24=5.4167; R=9 -> 48.75; point = 350 + 48.75 = **398.75**.
7. **Backtest gate fails.** Three months at day 15: predicted/actual = 900/1000, 800/1200, 700/1000 -> APE 10%, 33.3%, 30%; median 30% > 10%; worst 33.3% > 25%. Expected NONE(not_verified); no number shown. Pass variant: 950/1000, 1100/1000, 980/1000 -> APE 5%, 10%, 2%; median 5%, worst 10% -> pass.
8. **Range from backtest.** Pass variant of case 7 with today's known part (spent + bills left) = 700, estimated remaining part = 400 (point 1,100), rho values 1.10, 0.85, 1.00. Range = 700 + 400 x [0.85, 1.10] = **1,040 to 1,140**; point 1,100 inside.
9. **Late in month.** d=28, rent 600 recorded, VARIABLE 400, history rate 14. rate_now=400/28=14.2857; rate=(28x14.2857+10x14)/38=540/38=14.2105; R=2 -> 28.42; point = 1,000 + 28.42 = **1,028.42**; display "about 1,030".
10. **Overdue unpaid bill.** d=15, bill of 50 due day 12 with no matching entry, VARIABLE 150, no history. billsLeft=50 (overdue unpaid), rate=10, R=15 -> 150; point = 150 + 50 + 150 = **350** (rough).
11. **Sparse logging.** d=12, VARIABLE 40 from entries on only 2 distinct days in the last 10. Expected NONE(not_enough_entries) even though arithmetic would give 40/12 x 18 + 40 = 100 (a misleadingly low number).
12. **Double-count guard (Monzo issue).** A rent entry matched to a bill must appear once in spent_so_far and not in the VARIABLE rate; a rent bill due day 3 already paid must not also be in billsLeft. Expected: case 1 total contains rent exactly once (600).

### Wording suggestions (English; Azerbaijani and Russian drafts need native review before use: UNVERIFIED)
- Label: **"Estimated month total (so far + bills + usual daily spend)"**. Avoid "forecast" or "you will spend".
- Main line: "About 1,030 by month end" only when verified; otherwise: "Spent so far: 700. Bills still to come: 30."
- Range line: "Usually between 1,040 and 1,140, based on how this estimate would have done in your last 3 months." Never call it a guarantee or a percentage confidence unless the sample supports it.
- Rough mode (no history): "Rough estimate from this month only: about 930. Add a few months of entries for a checked range."
- Hidden: "Not enough entries yet to estimate this month" / "Estimates were not accurate enough on your past months, so we are not showing one."
- Show breakdown row: "Spent so far | Bills still to come | Everyday spending for N more days (about X per day)", plus link "How is this calculated?" and a "Mark as one-off / unusual days" control.
- Keep separate from "Safe to Spend" (balance-based): state which question each number answers.

### Gaps
- Test values are hand-computed from the design above, not run against code; implement as unit tests and execute to turn status from design to verified.
- All thresholds (10, 5x, 25%, 10%, 25% gate) are design assumptions requiring simulation or real-user calibration.
