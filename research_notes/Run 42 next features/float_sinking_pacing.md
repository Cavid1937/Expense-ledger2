# Run 42 research: float/reimbursement, sinking funds, slush, pacing, rollover

Research date: 2026-11-08. Method: web search plus fetches of official help pages. Note: the instruction file `deep-research/references/researcher.md` was NOT found at the given path, so no custom method was applied.

Evidence labels: [OFFICIAL] vendor help page, [VENDOR-MKT] vendor blog/press, [COMMUNITY] forum/Reddit/review (anecdotal), [MY-OPINION] design inference, not evidence.

Limits of this research: Monarch's help center returned HTTP 403, Simplifi's rollover thread returned only a title, Reddit was reached only via search snippets and mirrors, no App Store/Play review text was read directly (only third-party summaries). Complaint evidence is therefore thin and secondary. Nothing here is validated demand from Azerbaijani users.

Repo observation (grep only, not a code audit): `settings.safeToSpend = { savingsTarget, enabled }` and `bills` exist in `App.jsx` (about line 1471+). Formula details were not read; recommendations below assume the described "income - bills - savings floor, spread over remaining days".

---

## (a) Reimbursement / float

### What apps do
- YNAB [OFFICIAL, support.ynab.com/en_us/reimbursements-in-ynab-H1W7ilhC5.md]: three approaches. (1) assign money up front (recommended), (2) overspend temporarily, then repay covers it (page says only works if spend was on a credit card), (3) permanently pre-funded reimbursement category. Page gives no pros/cons or report effects.
- YNAB + Splitwise [OFFICIAL, .../splitwise-and-ynab-a-guide-H1GwOyuCq.md]: "I pay" = split transaction, other person's share goes to a "Splitting" category. Settle-up = inflow to Splitting. Caveats stated: Splitting should never be negative, long splits make the plan hard to trust, so settle more often. Own category budgets do not show costs the friend covered.
- Copilot [OFFICIAL, help.copilot.money 9718801 excluded-transactions; 5325170 refund-transactions]: Exclude keeps a transaction out of spending totals app-wide; Cash Flow can add excluded spend back. Docs do not say whether exclusion affects balances/budgets. Reimbursement guidance: split the incoming payment and put the repaid part into the ORIGINAL spending category (nets it out). Recurring transactions cannot be excluded.
- Monarch [COMMUNITY via search snippet only; no official page confirmed]: a Reddit user splits purchase into own category + a reimbursement category, then sends the full repayment to the reimbursement category; says splitting at purchase time is easier than splitting the repayment later.
- Simplifi [COMMUNITY]: one user excludes reimbursements from reports so spending is not inflated, but then loses matching (community.simplifimoney.com thread "venmo income transactions excluded from spending plan"; a separate request asks for excluded transactions to count toward report totals).
- Splitwise [OFFICIAL help: simplified debts keep each person's total unchanged; non-group items count on the dashboard but not group totals]. Splitwise tracks who owes whom; it does not feed budget categories.
- Monzo community [COMMUNITY]: users ask for friend repayments to flow back into the budget category they reduced; suggests this is not a standard feature in most apps.

### Complaints (evidence quality: low-medium)
- Manual and error-prone: needs a split at purchase time, long splits become untrustworthy (YNAB's own caveat).
- Exclude is blunt: either hides money entirely (Simplifi user loses matching; Copilot says nothing about balances) or nets awkwardly.
- Splitwise: paywall/daily limits and balance-mismatch complaints [COMMUNITY aggregators, kimola.com, Trustpilot; commercially biased competitor blogs also cited]. Some "wrong balance" reports are expected behaviour per Splitwise's own help (simplification, non-group items).

### Simplest correct data model [MY-OPINION]
Goal: cash balances correct, analytics exclude float.
- Do NOT create a separate "float" transaction type that touches balances differently. Keep the real cash movement as a normal transaction so account balance is always right.
- Add to expense transaction: `float: { total, ownShare }` OR equivalently `reimbursableAmount` (>0, <= amount) and optional `counterparty`. Analytics spend = `amount - reimbursableAmount`. Balance impact = full `amount`.
- Repayment = a normal inflow transaction with `repaysId` linking to the expense(s) (many-to-one allowed via an array of `{expenseId, amount}`). It must be typed so it is not income in analytics (a "reimbursement" kind) and it lowers the outstanding reimbursable on the linked expense. Outstanding receivable = sum(reimbursableAmount) - sum(repaid).
- Receivable is derived, never stored, so it cannot drift. Show "Owed to you: X" on the debts/loans screen (project already has debts+loans per memory notes, reuse that store if it can reference a transaction id; otherwise keep derived).
- Write-off: if a friend never repays, user taps "forgive": reduces reimbursableAmount's outstanding to 0 and the amount becomes own spending from original date (or write-off date, choose one and document; recommend original date so past months stay stable? Trade-off: changes closed months; alternative is a write-off expense dated today. Recommend dated today, opposite of retroactive edit).
- Safe-to-Spend: money fronted is cash gone but not own spending. Recommend safe-to-spend does NOT subtract outstanding receivables, and does NOT add expected repayments either (do not count unreceived money); it uses real cash. Show "owed to you" as a separate line. Reason: matches YNAB's rule that the holding bucket should not go negative, and avoids counting uncertain income.
- Alternative considered: repayment recategorised to the original category (Copilot approach). Rejected as primary model: it changes past/other-month category totals when repayment lands in a different month. Linked-ownShare keeps the month of the purchase correct.

### Pitfalls
- Double counting: repayment counted as income AND expense float kept as full spending. Fix by the typed repayment kind and the ownShare rule above.
- Repayment in a different month or currency; partial repayments; overpayment (excess = income or error, prompt user).
- Edit/delete of an expense that has linked repayments (orphan links). Delete must prompt or unlink.
- Import/backup: new fields must pass the validate-before-accept path and keep `expense_ledger_v5` compatibility (optional fields, default absent = normal expense).
- Splitting multi-person bills: only the user's own share is spending; keep it a single "ownShare" number, not per-person ledgers (Splitwise already does groups; do not rebuild it).

---

## (b) Sinking funds inside Safe-to-Spend

### What apps do
- Monarch [VENDOR-MKT blog/help via search; main help page not fetched]: Fixed / Non-monthly / Flex buckets; Flex number = income minus fixed, non-monthly set-asides and goals; annual target + frequency produces an automatic monthly set-aside; blog says sinking-fund money is not "available" spending.
- Goodbudget [COMMUNITY forum + older vendor posts]: Annual/Irregular envelopes funded gradually; users advise not using "Goals" for recurring items.
- Simplifi [VENDOR-MKT/reviews]: Spending plan subtracts recurring bills, scheduled transfers and savings goals from projected income. Reviews say it works best with stable income.
- Copilot [COMMUNITY]: "budgeting for non-monthly items" Reddit thread and a feature request to spread a transaction over time exist, implying no first-class sinking fund as of those posts (not verified current).

### Complaints
- Rollover math surprises (Copilot: changing a past month's budget alters carried amounts; feature request).
- Users want to spread a lump payment over time but apps record it in the payment month [COMMUNITY, Copilot feature request].
- Evidence quality: low.

### Design [MY-OPINION]
- Data: `bills[]` gets `period` (monthly, quarterly, yearly, custom months), `dueDate`, `amount`. Monthly set-aside = amount / months in period, computed from next due date: `(amount - alreadyReserved) / monthsRemainingUntilDue` (min 1) so the number self-corrects if the bill rises or user starts late.
- Safe-to-Spend deducts the set-aside for each non-monthly bill every month instead of the lump in the due month. When the bill is paid, the payment draws down the reserve and is NOT subtracted again (key double-count pitfall: bill counted both as set-aside and as an expense in the safe number).
- A reserve per bill is virtual (derived from months elapsed minus paid), not a separate account. Keeps balances right and is recomputable.
- Pitfalls: income below fixed + set-asides gives negative safe-to-spend, show it honestly with plain text; bill paid early/late; amount changes; user already paid this year; currency; leap/short months.
- This directly extends the existing Safe-to-Spend and is the most calculation-adjacent change, so needs strong unit tests (boundary dates, due this month, already paid, due in 12 months).

---

## (c) Hidden slush / buffer for overspending

### What apps do
- YNAB: no hidden slush. Its model forces visible overspending handling; credit-card overspending (yellow) vs cash overspending (red) [OFFICIAL support.ynab.com credit-card-overspending, search snippets]. A third-party MCP methodology doc (non-YNAB, weak) calls credit overspending insidious because the category resets while the card payment category is short.
- YNAB blog on "floating" [VENDOR-MKT, ynab.com/blog/floating-the-silent-but-deadly-threat-to-your-budget]: living on next month's income leaves no buffer. Argues for visible buffers, not hidden ones.
- No named app found that implements a hidden buffer inside a daily allowance. I found no evidence either way on user demand. Treat as unproven.

### Assessment [MY-OPINION]
- A hidden buffer is a form of sandbagging: the app shows a lower number than reality. Risks: user later sees real balance differs and distrusts the number; hard to explain in a financial-correctness-first product.
- Safer variant: a visible, user-set "cushion" amount or percent (e.g., 5-10 percent of the spendable amount), shown in the detail ("Safe today: X, includes cushion Y"), default off. This reuses `savingsTarget` (already a floor) and is nearly free: it is effectively the existing savings floor. Likely recommendation: do not build a separate slush; rename/explain the floor.
- Priority: low. Needs user validation before building.

---

## (d) Pacing projection

### What apps do
- PocketGuard Pace [VENDOR-MKT + press release, globenewswire 2026-04-01; pocketguard.com help]: projects spending against remaining money and days; uses six months history, upcoming bills, goals; alerts only when meaningfully off-track; iPhone, Plus plan only (claimed). Performance claims are the company's.
- Simplifi [VENDOR-MKT/reviews]: projected balances per account and end-of-month balance estimates.
- Copilot [REVIEW, unverified]: shows remaining per day.
- Monarch and Spendee: no pace feature found (absence of evidence in one search only).
- Complaint evidence: none found specifically about pacing. Unknown.

### Design [MY-OPINION]
- Simple, transparent formula, no ML: `dailyRate = spentSoFarThisPeriodVariable / daysElapsed`; `runOutDay = today + safeRemaining / dailyRate`. Variable spend only (exclude bills, float repaid, transfers, sinking-fund reserves).
- Only show when daysElapsed >= 5 and variable spend > 0. Show a range using the median vs mean of last 7 days, to avoid a single large purchase giving "money runs out on day 9" panic.
- Pitfalls: one big purchase on day 1 dominates (use median-based or cap); month start has no data; paydays shifting the period; the float exclusion must be applied (reimbursable portion not counted, or the projection overstates burn); do not conflate with the safe-to-spend daily number.
- Wording must express uncertainty ("at this pace, around day N"). az/ru/en strings needed.
- Cost: low once the safe-to-spend variable-spend series exists; uses data the app already has.

---

## (e) Month-end rollover to a savings goal

### What apps do
- Monarch [OFFICIAL from search snippet; page returned 403]: rollover formula described as prior rollover + planned budget - actual; overspending carries forward negative. Per-category toggle.
- Copilot [OFFICIAL, help.copilot.money 3790828]: cumulative rollovers (over/under accumulate), choose a first month with rollover; per-category or global disable. A Reddit user (r/copilotmoney, July 2024) saw a category look "under budget" via rollover while overspent that month [COMMUNITY]. A feature request notes past-month edits change carried math.
- Simplifi [COMMUNITY]: thread "Rollover unused Spending Plan money" with 10 merged votes (title only readable) shows demand.
- YNAB [OFFICIAL, "When the Month Rolls Over", not fetched]: unspent money stays in the category by design.
- Explicit "sweep leftover to savings goal" was not confirmed as a native feature in any of these apps from my sources.

### Design [MY-OPINION]
- Do not auto-move money. At month end (on first open of the new month) offer a prompt: "You had X left. Add to goal [name]?" The action creates a real goal contribution/transfer record, dated at the month's last day or the day of confirmation (pick one; recommend confirmation date so closed months stay unchanged).
- Store `rolloverSweeps[{month, amount, goalId, txId}]` to prevent the prompt and the action from firing twice; make idempotent by month key.
- Pitfalls: leftover computed from a snapshot that later changes (late-entered transaction); negative months (never auto-sweep a negative; show shortfall only); leftover already counted in savings floor; timezone/month boundary on a local-first app; app not opened on the 1st (prompt must handle skipped months, offer the latest only or all).
- Leftover definition must equal the Safe-to-Spend model (income - bills - floor - variable spend), else users get two different "leftover" numbers.

---

## Priority and effort ranking [MY-OPINION]

| Rank | Feature | Value | Risk | Effort |
|---|---|---|---|---|
| 1 | (a) Reimbursable float | High: common social pattern; every analytics number is wrong without it | Medium: touches totals and import/backup | Medium (data field + link + UI + tests) |
| 2 | (b) Sinking funds in Safe-to-Spend | High: bills in Azerbaijan (annual insurance, tuition, etc.) not verified, but yearly bills are universal | Medium-high: changes the headline number | Medium |
| 3 | (d) Pacing | Medium: nice insight | Low if wording honest | Low |
| 4 | (e) Rollover prompt | Medium | Low-medium (idempotence) | Low-medium |
| 5 | (c) Slush | Unproven | Trust risk | Very low if done as visible cushion; skip hidden variant |

Dependency: do (a) before (d) (pacing needs float excluded). (b) and (e) share the leftover definition, design them together.

Unverified: local Azerbaijani habits (cash-heavy, informal lending among friends and family) are plausible but untested; recommend a short user check before heavy investment.

## Sources
- https://support.ynab.com/en_us/reimbursements-in-ynab-H1W7ilhC5.md
- https://support.ynab.com/en_us/splitwise-and-ynab-a-guide-H1GwOyuCq.md
- https://support.ynab.com/en_us/credit-card-overspending-an-overview-HkMGpSbJs.md
- https://www.ynab.com/blog/floating-the-silent-but-deadly-threat-to-your-budget
- https://help.copilot.money/en/articles/3790828-budget-rollovers
- https://help.copilot.money/en/articles/9718801-excluded-transactions
- https://intercom.help/copilotmoney/en/articles/5325170-refund-transactions
- https://help.monarch.com/hc/en-us/articles/4411119762196-Rollover-Budgets (403, snippet only)
- https://www.monarch.com/blog/planning-for-the-unexpected-non-monthly-expenses
- https://www.monarch.com/blog/flex-budgeting-simplify-your-spending-with-just-one-number
- https://community.simplifimoney.com/discussion/114 (title only)
- https://community.simplifimoney.com/discussion/14214/venmo-income-transactions-excluded-from-spending-plan
- https://forums.goodbudget.com/t/how-do-you-handle-irregular-expenses-in-goodbudget/3444
- https://pocketguard.com/help/pace-metric-on-the-plan-tab/
- https://www.globenewswire.com/news-release/2026/04/01/3266796/0/en/PocketGuard-Introduces-Alert-System-for-Predictive-Budget-Monitoring.html
- https://splitwise.uservoice.com/knowledgebase/articles/425486-help-my-balances-are-wrong
- https://kimola.com/reports/explore-why-splitwise-users-are-drifting-away-get-insights-now-app-store-in-155789
- https://community.monzo.com/t/make-payments-from-friends-reimburse-your-budgets/105641
