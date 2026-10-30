# Debt and loan handling for a personal expense app in Azerbaijan: informal debts, formal loans/instalments, coaching rules

Access date for all URLs: 2026-10-30. Labels: PRIMARY (official/regulator/bank/journal), SECONDARY (news, law-firm digest, summaries of a primary), INFERENCE (my reasoning). Not legal advice. Research budget was about 17 tool calls; several primary texts could not be opened (see Gaps). Worked numbers in sections 1 and 6 were computed by me with a script (decimal rounding to 2 places, half-up) and cross-checked by hand formulas; they are not from a source.

## 1. Loan math: annuity vs equal-principal, nominal vs effective, quoting conventions, pitfalls

### Takeaway
Annuity = equal payment each period, interest share large early; equal-principal ("differentiated") = equal principal slice, falling payments, less total interest. A "monthly 18% APR" loan has an effective annual rate of 19.56%; a "flat 18%" quote is far more expensive (about 31.7% nominal annual on the declining balance). The app must make the user confirm which rate type and which first-payment date they mean, and must never silently guess.

### Cited Findings
- Azerbaijani-language guidance says a repayment schedule lists payment number, dates, principal, interest, total payment and remaining balance, and names annuity (equal), decreasing and increasing schedules — [qebulol.az (SECONDARY)](https://qebulol.az/?p=36760) (found via search snippet only; page not fully read).
- Annuity payment stays constant over the whole term; with differentiated payments equal principal parts are repaid and interest is charged on the shrinking balance, so payments fall, and early differentiated payments exceed the annuity payment — [depozit.uz, Uzbekistan (SECONDARY, other country, conceptual only)](https://depozit.uz/news/annuitet-yoki-oddiy-differensial-yoki-tabaqalashtirilgan-tolovlar-qarz-oluvchi-uchun-qaysi-foydaliroq-va-kreditni-muddatidan-oldin-qaytarish-mumkinmi).
- In annuity loans interest dominates early payments and the principal share grows later — [ppt.ru (SECONDARY)](https://ppt.ru/art/kredit/sravnivaem-annuitetnyy-i-differentsirovannyy-platezhi-po-kreditu).
- ABB Bank help distinguishes payment "according to schedule" (covers the current instalment) from "outside schedule" (qrafikdən kənar), which reduces principal — [ABB help (PRIMARY, bank; seen only via search snippet because the page redirected)](https://destek.abb-bank.az/az/articles/16-krediti-nece-odeye-bilerem).
- Azerbaijan's amended Civil Code (Law 822-VIQD of 24 Feb 2023) says the "actual annual interest rate" of a credit agreement is calculated under the rule set by the Central Bank; the agreement must state both the annual rate and the actual annual rate including all payments counted in it — [Gratanet summary (SECONDARY)](https://gratanet.com/news/amending-the-civil-code-was-entered-into-force-introducing-changes-in-four-areas), [PwC Azerbaijan legislation digest (SECONDARY)](https://contents.pwc.com/pwc-az-legislation-issue7-2023). Official text referenced: [meclis.gov.az 822-VIQD](https://meclis.gov.az/documents/822-VIQD.pdf) (not opened by me).
- Interest, including late interest and fees, is charged only on outstanding principal until repayment (bank loans) — [AmCham Azerbaijan (SECONDARY)](https://www.amcham.az/en/post/978).
- The Central Bank of Azerbaijan (CBAR) publishes a consumer-loan notification template stating the effective annual interest rate "specifies the cost of loan" and can be used to compare offers, and that the borrower may repay in full or partly at any time — [CBAR template Oct 2023, PDF (PRIMARY; my fetch could not decode the PDF, wording taken from search-result excerpt)](https://uploads.cbar.az/assets/Notification%20template%20on%20a%20consumer%20loan%20agreement_Oct_2023%20(002).pdf).

### Formulas (my derivation; standard finance math, INFERENCE as to which one a given Azerbaijani bank uses)
Let P principal, n payments, i nominal annual rate, r = i/12 monthly rate (assumes monthly compounding, equal months).
- Annuity payment: A = P*r / (1 - (1+r)^-n); if r = 0, A = P/n.
- Interest in period k = round2(Balance_{k-1} * r); principal_k = A - interest_k; balance_k = balance_{k-1} - principal_k. Last payment = remaining balance + its interest (absorbs rounding drift of a few qapik).
- Equal principal: principal each month = P/n (last month absorbs rounding); interest_k = Balance_{k-1}*r; total interest = P*r*(n+1)/2 (exact, no rounding).
- Effective annual rate from nominal monthly-compounded: EAR = (1+i/12)^12 - 1. 18% nominal -> (1.015)^12 - 1 = 19.56%.
- Flat rate: interest = P * flat_rate * years; payment = (P + interest)/n. The equivalent declining-balance rate is found by solving the annuity equation for r (numeric); for 5,000 AZN, 12 months, 18% flat, payment 491.67, implied monthly rate 2.643%, i.e. about 31.7% nominal annual (about 36.9% effective: (1.026430)^12-1 — INFERENCE, my arithmetic).
- Actual/365 daily accrual: interest = Balance * i * days/365. 5,000 at 18% for 31 days = 76.44 vs 75.00 under the "r = i/12" convention; difference is real and bank-dependent.
- Early repayment (annuity, same payment kept): remaining periods n' = -ln(1 - B*r/A) / ln(1+r), rounded up, last payment smaller. Alternative (same term, lower payment): recompute A with the new balance.

### Worked example (hand-checkable): 5,000 AZN, 12 months, 18% nominal annual, monthly
- r = 0.015. (1.015)^12 = 1.195618; 1/1.195618 = 0.836387; 1 - 0.836387 = 0.163613; A = 75 / 0.163613 = 458.40.
- Month 1: interest 75.00, principal 383.40, balance 4,616.60. Month 2: interest 69.25, principal 389.15, balance 4,227.45. Month 3: interest 63.41, balance 3,832.46. Month 12: payment 458.39, interest 6.77, balance 0.00.
- Total paid 5,500.79; total interest 500.79 (12 x 458.40 = 5,500.80, minus 0.01 last-payment adjustment).
- Equal principal: principal 416.67 x 11, last 416.63. Interest month 1 = 75.00, month 2 = 68.75, month 12 = 6.25. Total interest = 75 x 78/12 = 487.50. Payment month 1 = 491.67, month 12 = 422.88 (416.63+6.25). Difference vs annuity: 13.29 AZN less interest, but month-1 payment is 33.27 higher.
- Same loan quoted "18% flat": interest 900, payment 491.67, total 5,900.

### Typical pitfalls where apps compute wrongly (INFERENCE unless cited; common-knowledge finance, no app audit performed)
- Treating a flat-rate quote as if it were an annual declining-balance rate; or treating nominal as effective (19.56% vs 18%).
- Using floating point and rounding each payment independently so that the balance ends at +/-0.0x; fix with decimal/integer qapik arithmetic and a final-payment adjustment.
- Assuming 30/360 versus actual/365 and then mismatching the bank's own schedule; the first period is often irregular (loan issued on 10th, first due on 25th) so "12 equal months" is not exact.
- Payment on a date that is a weekend/holiday shifted to next banking day — the shift alters accrued interest in some banks (unknown for Azerbaijan; ask user to confirm).
- Early repayment: ignoring whether the bank shortens the term or reduces the payment; ignoring any compensation the contract may allow (see section 2).
- Adding fees (commission, insurance) to the principal or ignoring them; effective rate in Azerbaijan is defined to include "all payments" counted under the CBAR rule (secondary source above), so the app cannot recompute the bank's official effective rate without the fee list.
- Payment below monthly interest produces a non-amortising balance; app should refuse to project a payoff date and say so.
- Grace periods on credit cards: interest-free only if the full statement balance is paid; otherwise interest is charged from purchase date at most issuers — [CFPB card grace period explanation not retrieved]; treated as INFERENCE; no Azerbaijani bank terms were checked.

### Gaps
- I could not find which day-count convention Azerbaijani retail banks use; the Civil Code and CBAR EAIR method text were not opened. A bank's own loan agreement (e.g. [Yelo Bank general conditions PDF](https://www.yelo.az/site/assets/files/11442/stehlak_kreditl_ri_uzr_umumi_s_rtl_r_compressed.pdf), [UniBank Ucard offer](https://unibank.az/uploads/documents/1729670610Ucard%20kredit%20oferta%C4%B1%2021.06.2024.pdf)) would show it; I did not read them.
- Typical quoting practice (annual vs monthly vs flat) in Azerbaijan: not established. Search results only show banks stating "faktiki illik faiz dərəcəsi" in offers ([UniBank offer, PRIMARY by title only, not read](https://unibank.az/uploads/documents/1729670610Ucard%20kredit%20oferta%C4%B1%2021.06.2024.pdf)). Whether flat-rate quotes occur at shops/taksit sellers is unverified.
- Rounding rule and first-payment conventions in Azerbaijani banks: not found.

## 2. Azerbaijan context: regulation, products, informal lending

### Takeaway
Since 1 Oct 2023 the Civil Code has a consumer-credit regime (written/durable-form agreement, effective-rate disclosure computed per CBAR method, right to repay early, withdrawal right, late-interest cap of contract rate + 5 percentage points, limited to 180 days). CBAR is tightening consumer lending in 2026 (reported 70% debt-to-income limit). I could not confirm the withdrawal period in days or the early-repayment compensation cap from any source I opened.

### Cited Findings
- Law 822-VIQD (24 Feb 2023) amended the Civil Code; it enters into force 1 Oct 2023 — [AmCham Azerbaijan (SECONDARY)](https://www.amcham.az/en/post/978); PwC digest cites the same law — [PwC (SECONDARY)](https://contents.pwc.com/pwc-az-legislation-issue7-2023).
- Consumer credit agreement is made in a durable form; fluctuating interest ban and ambiguities interpreted in the consumer's favour; the consumer has a withdrawal right and a right to early repayment, with the lender's compensation, where applied, determined per the agreement (amount/procedure not capped in the text I could see) — [Gratanet (SECONDARY)](https://gratanet.com/news/amending-the-civil-code-was-entered-into-force-introducing-changes-in-four-areas).
- Late-payment interest in consumer loans cannot exceed contract annual rate + 5 percentage points; it cannot run more than 180 days; no additional penalty, fine or commission may be charged; unilateral term changes are barred unless they improve the borrower's position — [PwC Azerbaijan digest 2023 (SECONDARY)](https://contents.pwc.com/pwc-az-legislation-issue7-2023). Another search summary of the same digest concurred (SECONDARY).
- CBAR's chair-level statements, reported 15 Oct 2026: lending is restricted when a borrower's debt-to-income (DTI) exceeds 70%; consumer loans in foreign currency limited; extra capital requirements on credit cards; individuals may self-restrict borrowing; new online-lending rules; loan size should match income. The report also notes the bankers' association warned tighter bank lending could push borrowers to pawnshops or informal credit — [Trend.az 2026-10-15 (SECONDARY; one source, details not confirmed on cbar.az)](https://www.trend.az/business/4235101.html).
- Market data: average interest rate on loans to individuals reported rising from 15.71% to 17.28% (period "2016-2026" per summary) — [Baku Research Institute (SECONDARY, snippet)](https://bakuresearchinstitute.org/azerbaycanda-banklarin-kredit-faizleri-yuksekdirmi/); overdue loans 557.5 million AZN as of 1 Feb 2026 — [JAM News (SECONDARY, snippet)](https://jam-news.net/az/?p=104409).
- Instalment cards: Kapital Bank rebranded BirKart as the Birbank card (Cashback, Umico, Miles); a Birbank Umico Premium Installment card is listed as free, ages 18-67; a Umico card works as debit or instalment card — [Birbank news (PRIMARY, snippet)](https://birbank.az/en/news/birkartumico-en), [Birbank Umico Premium page (PRIMARY, snippet)](https://birbank.az/en/birbank-umico-premium-taksit). Third-party annual fees 15 / 35 AZN are unverified — [qebulol.az (SECONDARY, unreliable)](https://qebulol.az/?p=9647).
- CBAR told banks to give accurate loan interest information — [Trend.az (SECONDARY, undated snippet)](https://www.trend.az/business/economy/2160120.html).

### Inferences
- Because lenders must show the effective rate in the agreement, the app should offer an optional field "effective annual rate from my contract" and display it instead of recomputing, while computing its own schedule only as an estimate.
- The late-interest cap means a penalty-calculator in the app should not add flat fines; instead a user-entered "late interest" is user data (INFERENCE: the app should not model penalties at all in v1).
- Informal person-to-person debts are probably more common than bank loans in budgeting-app use (INFERENCE), and many arrangements are interest-free with no contract; nothing I found documents the cultural norms. Do not state cultural claims in the product without local validation.

### Gaps
- Withdrawal (cooling-off) period in days and early-repayment compensation cap: not stated in any page I opened. Primary texts to read: e-qanun.az Civil Code consumer-credit articles; [meclis.gov.az 822-VIQD](https://meclis.gov.az/documents/822-VIQD.pdf); CBAR PDF template above (needs a PDF reader; my fetcher could not decode it).
- The 70% DTI rule: not confirmed on cbar.az; unknown whether it applies to instalments, whether income means net or gross, nor effective date.
- BNPL / marketplace taksit (shops, Umico, Birmarket) fee structure; pawn loans (lombard) rates and regulation; salary-advance practices; informal-lending norms among relatives: no usable sources found. All unverified.
- cbar.az and e-qanun.az were not opened directly (no direct fetch attempted on e-qanun.az; cbar.az only via the PDF).

## 3. Debt coaching evidence

### Takeaway
Avalanche (highest rate first) minimises interest; snowball (smallest balance first) has field and experimental evidence of higher motivation and faster payoff when interest differences are modest. The evidence favours "concentrate payments on one debt" over spreading evenly; a coach should not claim one method is best for everyone.

### Cited Findings
- Gal and McShane (2012), "Can Small Victories Help Win the War? Evidence from Consumer Debt Management", Journal of Marketing Research: using data on about 6,000 clients of a debt-settlement programme, the number of accounts closed predicted whether people eliminated debt, regardless of dollar size; authors say the rational choice is usually paying high-interest balances first but motivation can outweigh the extra interest when rate differences are modest — [Kellogg Insight (SECONDARY)](https://insight.kellogg.northwestern.edu/article/to_beat_debt_consider_starting_small); the study design makes the effect of count vs dollars hard to fully separate — same source.
- Kettle, Trudel, Blanchard and Häubl (2016), "Repayment Concentration and Consumer Motivation to Get Out of Debt", Journal of Consumer Research 43(3):460-477, DOI 10.1093/jcr/ucw037: field study of indebted consumers with multiple accounts plus three experiments; concentrating repayments on one account rather than spreading raised motivation; strongest when concentrated on the smallest account because people infer overall progress from the greatest proportional reduction of a single balance — [RePEc record (PRIMARY metadata)](https://ideas.repec.org/a/oup/jconrs/v43y2016i3p460-477..html); about 6,000 clients over 36 months and one experiment with debts repaid 15% faster; concentrating on large accounts can demotivate — [Georgetown McDonough news (SECONDARY)](https://msb.georgetown.edu/news-story/fed-hikes-interest-rates-how-expedite-paying-credit-card-debt/). Full paper was paywalled; I did not read it.
- A student honours paper (low authority) concludes avalanche is more effective in most cases, snowball close with motivation benefits — [JMU honors thesis (SECONDARY, weak)](https://commons.lib.jmu.edu/honors201019/699).
- Minimum payment warnings: US CARD Act/Regulation Z 1026.7(b)(12) require periodic statements to show how long and how much to repay paying only the minimum, plus a 36-month comparison; evidence on effect is mixed — one Berkeley study found the 3-year-payment disclosure reduced the fraction of accounts paid in full by 1% via anchoring — [search summary of lawcat.berkeley.edu paper (SECONDARY; I did not open the paper)](https://lawcat.berkeley.edu:443/record/1127052/files/fulltext.pdf), [NBER w22742](https://www.nber.org/papers/w22742.pdf) (not opened). Hence showing total interest is a plausible but not guaranteed behaviour nudge; the US evidence is on cards, not instalment loans.
- DTI thresholds: the US 43% DTI qualified-mortgage cap (2013) was removed from General QM in the 2020 rule and replaced by a price-based test — [CFPB archive (PRIMARY)](https://www.consumerfinance.gov/archive/newsroom/consumer-financial-protection-bureau-issues-two-final-rules-promote-access-responsible-affordable-mortgage-credit/), [Federal Register 2020-12-29 (PRIMARY, not opened)](https://www.govinfo.gov/content/pkg/FR-2020-12-29/pdf/2020-27567.pdf). Other regimes use different limits (Azerbaijan 70% reported, see section 2; Uzbekistan central bank states 40% of borrowers spend over half their income on repayments — [kun.uz (SECONDARY)](https://kun.uz/en/03877223)).

### Inferences
- A DTI number (debt payments / monthly income) is only an indicator; thresholds differ by purpose (mortgage 43% US, 70% reported for Azerbaijan consumer loans). The app should show the ratio and a traffic-light, not a verdict, and let the user choose income definition (net, regular only).
- With informal irregular income the ratio is unstable; use a trailing average or let user type a typical month.
- Showing both "total interest" and "months saved" for extra payments is consistent with the evidence on motivation and salience, but the effect size in this market is unvalidated.

### Gaps
- I did not locate regulators' official "over-indebtedness indicators" (EU Consumer Credit Directive 2023/2225 creditworthiness provisions, UK FCA affordability); not searched specifically.
- No Azerbaijan-specific behavioural study.

## 4. How existing apps model debts and loans

### Takeaway
I could not retrieve first-hand evidence on named apps. The searches returned design write-ups, not app documentation or reviews, so claims about Cashera, Xerclerim, AvroFinance, Money Manager, Spendee, Wallet and YNAB are unverified.

### Cited Findings
- Splitwise-style design write-ups treat partial settlement as normal, leaving the remaining balance; rounding of splits (100 split three ways = 33.33 x 3 = 99.99) must handle the residual cent or UIs show impossible leftovers; a settle-up can be undone to reopen a debt — [techinterview.org design write-up (SECONDARY, not app evidence)](https://www.techinterview.org/post/3233474468/system-design-design-splitwise-expense-sharing-debt-simplification-group-balances-payment-integration-currency-conversion/), [robots.net guide (SECONDARY, weak)](https://robots.net/fintech/how-to-undo-a-splitwise-settle-up/).
- YNAB help page for loan accounts: URL tried returned 404; not verified.

### Inferences
- Common-sense fields from the domain: counterparty, direction, principal, currency, start date, due date, rate, payment amount, payment frequency, payments made, balance, notes. Users of any ledger will expect partial payments and an undo.

### Gaps
- No app-store listings or reviews were retrieved for any app named in the brief. Recommended next step: read App Store/Google Play reviews for Debt Payoff Planner, Spendee, Wallet and Money Manager, and the YNAB help article on loan accounts, then tabulate complaints.

## 5. Data-model advice (all INFERENCE from standard ledger practice; no source)

### Takeaway
Treat debts/loans as their own objects whose payments create ordinary ledger entries linked back by id, with the principal and interest portions stored separately, so spend reports count the interest as an expense and the principal as a transfer/repayment (not an expense), and recurring-bill reminders point to the same object rather than create a second payment.

### Inferences
- Double counting: if a loan payment is both a recurring bill and a loan payment, the user's expense entry should be created once (from the loan payment) and the recurring reminder should reference the loan id; "mark paid" should be one action.
- Borrowed money received is not income; lending out money is not an expense. Use transfer/liability semantics; the app currently models only expenses/income (not inspected in this task).
- Never silently compute: rate type (nominal monthly-compounded / flat / effective from contract), day-count, first payment date, whether the payment includes fees/insurance, and payment amount when the user knows the bank's figure. Store user-entered bank payment and show the app's computed estimate next to it with the difference.
- Store money as integer qapik (1 AZN = 100 qapik); store schedule only as a derivable projection, but store actual payments as facts. If bank schedule is entered by the user, it overrides the computed one.
- Keep the permanent localStorage key `expense_ledger_v5` and add new collections in a backward-compatible way (CLAUDE.md requirement).

## Implications for a feature and coach rule

### Minimal data model: Debt (informal, person to person)
```
Debt {
  id, direction: "I_OWE" | "OWED_TO_ME",
  counterparty (free text), currency (default AZN),
  principalMinor (integer qapik), startDate, dueDate (nullable), note,
  status: "open" | "settled" | "forgiven" (derived or stored),
  payments: [ { id, date, amountMinor, note, linkedTransactionId? } ]
}
```
Derived only: remainingMinor = principalMinor - sum(payments); overdue = dueDate < today and remaining > 0. Payments exceeding remaining are rejected or require confirmation. No interest by default; optional "agreed interest" is a separate v2 field.

### Minimal data model: Loan (formal, instalments)
```
Loan {
  id, lender (text), kind: "cash"|"card"|"taksit"|"other", currency,
  principalMinor, termMonths, startDate, firstPaymentDate (REQUIRED, confirmed),
  rateType: "NOMINAL_ANNUAL"|"FLAT_ANNUAL"|"NONE"|"BANK_SCHEDULE",
  ratePercent (nullable), effectiveRateFromContract (nullable, display only),
  scheduleType: "ANNUITY"|"EQUAL_PRINCIPAL"|"USER_ENTERED",
  userPaymentMinor (nullable; bank's stated payment overrides computed),
  paymentDayOfMonth, payments: [ { id, date, amountMinor, interestMinor?, principalMinor?, linkedTransactionId? } ]
}
```
Rules: NONE/0% instalment is the common "taksit" case (payment = price/n, last payment absorbs remainder). USER_ENTERED lets the user paste the bank's schedule rows (date, amount) and skips all interest math.

### Exact formulas to implement
1. r = ratePercent/100/12. Annuity A = round2(P*r/(1-(1+r)^-n)); if r=0, A = P/n (qapik integer division, remainder into last payment).
2. Per period: interest = round-half-up(balance * r); principal = payment - interest; last payment = balance + interest.
3. Equal principal: principal = floor(P/n) qapik, remainder to last; interest = balance*r.
4. Flat: interest total = P*rate*years; payment = (P+interest)/n; show implied declining-balance rate by bisection on A(r)=payment.
5. EAR = (1+i/12)^12 - 1 for display only, labelled "approximate; your contract's effective rate is the official figure".
6. Remaining term after extra payment (payment unchanged): n' = ceil(-ln(1-B*r/A)/ln(1+r)); undefined if A <= B*r (refuse and warn).
7. Total remaining interest = sum of remaining scheduled payments - balance.
8. Debt-to-income indicator = sum of monthly loan payments / typical monthly net income (user-chosen); do not label as bank-grade.
9. Credit-card balance projection: monthly interest = balance*APR/12, payoff months = -ln(1-B*r/pay)/ln(1+r) for fixed payment; refuse if pay <= B*r.

### Ten hand-computed test cases (all computed by me; decimal, half-up to qapik)
1. 5,000 AZN, 12 months, 18% nominal, annuity: A = 458.40; month 1 interest 75.00, principal 383.40, balance 4,616.60; total paid 5,500.79 (last payment 458.39); total interest 500.79.
2. Same, equal principal: month 1 payment 491.67 (416.67+75.00), month 12 payment 422.88 (416.63+6.25); total interest 487.50.
3. Same loan quoted flat 18%: interest 900.00, payment 491.67, total 5,900.00; implied nominal annual about 31.7% (monthly 2.643%) — tolerance 0.05 percentage points.
4. 1,200 AZN, 6 months, 12% nominal annuity: A = 207.06; interest month 1 = 12.00, month 2 = 10.05; last payment 207.05; total 1,242.35; interest 42.35.
5. 1,000 AZN, 3 months, 0% (taksit): payments 333.33, 333.33, 333.34; interest 0.00.
6. 10,000 AZN, 24 months, 24% nominal annuity: A = 528.71; month 1 interest 200.00; month 2 interest 193.43; last payment 528.74; total 12,689.07; interest 2,689.07.
7. 600 AZN, 4 months, 12%: A = 153.77; interest 6.00, 4.52, 3.03, 1.52; last payment 153.76; total 615.07; interest 15.07.
8. Early repayment on case 1 after 3 payments: balance 3,832.46; extra 1,000.00 -> balance 2,832.46; keep payment 458.40: remaining payments 6 x 458.40 then final 245.14 (7 payments, total 2,995.54, interest 163.08). Original remaining interest was 293.13 (4,125.59 - 3,832.46), so interest saved about 130.05 and term shortens from 9 to 7 payments.
9. Card: 1,000 AZN, 24% APR (2% monthly), fixed 30 AZN/month: month 1 interest 20.00; 56 payments; total paid 1,664.43; interest 664.43. Minimum-payment variant (3% of balance, 2% interest): balances 990.00, 980.10, 970.30 for months 1-3 (barely moves). Payment <= interest (e.g. 20 AZN on 1,000 at 2%) must trigger "never pays off" warning.
10. Informal debt: owed 300.00; payments 100.00, 50.00 -> remaining 150.00; overpayment of 160.00 rejected/confirmed; third payment of 150.00 -> remaining 0.00 and status settled; deleting the 50.00 payment restores remaining 200.00 (checks that balance is derived, not stored).
Extra boundary checks: day-count illustration 5,000 x 18% x 31/365 = 76.44 (shows convention difference, not a pass/fail case); rate 0 with n not dividing P (1,000/3 above).

### Eight candidate coach rules about debt (trigger, plain sentence, caveat)
1. Trigger: loan payments / typical monthly income >= 40% (user-adjustable; calibrate). Sentence: "About X% of your monthly income goes to loan payments, which leaves less room for unexpected costs." Caveat: threshold is a heuristic, not a legal limit (CBAR's reported 70% is a bank-lending limit, unconfirmed); income may be irregular.
2. Trigger: payment due in 3 days or overdue, with money linked from the loan. Sentence: "Your instalment of X AZN is due on DATE." Caveat: the date is what you typed; check your bank, and note late interest may apply (Civil Code cap per secondary source).
3. Trigger: loan has user-entered rate and the user views the loan. Sentence: "Over the whole loan you would pay X AZN in interest on top of the Y AZN you borrowed." Caveat: estimate based on the rate type you chose; your contract's effective rate and fees may differ.
4. Trigger: card balance carried month to month and payment <= monthly interest. Sentence: "At this payment your balance will not go down, because it is about the same as the monthly interest." Caveat: depends on the APR you entered; promotional rates change this.
5. Trigger: several debts with different rates and user asks for payoff plan. Sentence: "Paying the highest-rate debt first saves the most interest; paying the smallest first can feel faster and help you stay on track." Caveat: research on motivation (Gal and McShane 2012; Kettle et al. 2016) is mixed and not Azerbaijan-specific; user chooses.
6. Trigger: extra payment entered on a loan. Sentence: "An extra X AZN now would end the loan about N months sooner and save about Y AZN in interest." Caveat: your lender may reduce the payment instead of the term, or charge a fee; confirm with your contract.
7. Trigger: money owed to the user is past due date by >= 14 days. Sentence: "NAME's debt of X AZN is past its due date; you might want to remind them kindly." Caveat: app only sees what you entered; no reminders are sent to others; informal-debt customs vary and have not been validated.
8. Trigger: a new loan makes projected free cash (income - fixed costs - loan payments) negative for a month. Sentence: "With this loan your listed costs would be more than your income in some months." Caveat: based only on data you entered; not credit advice; consider speaking with the lender or a free counsellor (counselling availability in Azerbaijan not verified).
Tone rule for all: no shaming, no "you should borrow/not borrow", no investment or product recommendations.
