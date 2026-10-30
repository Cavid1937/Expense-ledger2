# International small-business bookkeeping tools: pricing, personal/business separation, data-model lessons, complaints, willingness to pay (as of 28 Oct 2026)

Method note: all pages accessed 2026-10-28 via WebFetch/WebSearch. WebFetch output is a model-generated summary of the page, not a verbatim copy, so each price is "as reported by the fetch of the official page", not a screenshot. Labels: FACT = official/primary page; VENDOR = vendor marketing claim; REVIEW = user/independent review; INFERENCE = my reasoning. Prices change; currency is stated per row. Searches only reach a US-centric index; no Reddit threads were returned.

## Pricing, tiers and free-tier limits (Q: pricing, emerging-market price points)

### Takeaway
The global baseline is a free or ~USD 0-15 entry tier with invoicing, then USD 25-40 for bank feeds and multi-user, rising to USD 85-340 for QuickBooks. Emerging-market pricing exists only for India (Zoho, Vyapar), at roughly INR 750-900 per month entry. I found no official prices for Turkey, Kazakhstan, Georgia or Uzbekistan.

### Cited Findings
- Wave: Starter is free (unlimited invoices, bills, bookkeeping records); Pro is USD 19/month or USD 190/year (CAD 25/250); Pro adds automatic bank import via Plaid, unlimited receipt capture, and users with admin/editor/viewer roles; the fee is per business, not per owner. Card payments cost 2.9% + USD 0.60 (Pro: first 10 per month without the 60c); payroll from USD 25-40/month; done-for-you Wave Advisors USD 149-199/month. FACT, accessed 2026-10-28 — [Wave pricing](https://www.waveapps.com/pricing). Third-party trackers disagree (USD 16-19) — [Beancount.io, 5 Aug 2026](https://beancount.io/blog/2026/08/05/wave-accounting-bank-feeds-collaborator-paywall-guide); the official page governs.
- Zoho Books (global, USD, per organisation, excl. tax): Free (1 user + 1 accountant, 1,000 invoices/yr, 50 receipt scans/month) while revenue is under USD 50K; Standard 12 monthly / 10 annual (3 users); Professional 24/20 (5 users); Premium 36/30 (10 users); Elite 129/100; Ultimate 249/200; extra user USD 3/month. FACT — [Zoho Books pricing](https://www.zoho.com/books/pricing/). The page did not state a currency code for the "$" figures.
- Zoho Books India (INR, excl. GST, per org): Free below INR 25 lakh annual revenue (1 user + 1 accountant); Standard 899 monthly / 749 annual; Professional 1,799/1,499; Premium 3,599/2,999; Elite 5,999/4,999; Ultimate 9,599/7,999; extra user INR 180/month. FACT — [Zoho Books India](https://www.zoho.com/in/books/pricing/). This is the only confirmed example of region-specific pricing (about 1/13 of the USD Standard price at nominal exchange rates; INFERENCE, not adjusted for purchasing power). Zoho's help page says Indian pricing applies when India/INR is set as country/base currency — [Zoho Books KB](https://www.zoho.com/books/kb/subscription/indian-pricing.html). Its Turkish page URL returned 404; no Turkey/Kazakhstan price found.
- QuickBooks Online (USD, US page): Free tier shown with 1 user; Simple Start 38, Essentials 85 (3 users), Plus 140 (5 users), Advanced 340 (25 users); 50% off for 3 months; 2-3 accountant seats included. FACT, page possibly truncated — [Intuit pricing](https://quickbooks.intuit.com/pricing/). Third-party sources give conflicting figures for the Aug 2026 renewal increase (Essentials 75-85, Plus 110-140) — [Beancount.io, 26 Jul 2026](https://beancount.io/blog/2026/07/26/quickbooks-online-price-increase-2026-cost-breakdown-guide); the official page figures above are taken as current. The "Free" row is only what the fetch reported; I did not verify its scope.
- Xero (USD, US): Early 27 (20 invoices, 5 bills, 30-day forecast), Growing 59, Established 97 per month; 90% off the first 6 months for new US customers until 2 Nov 2026; multi-currency only on Established; no per-user fee; payroll USD 36 + 6 per person. FACT — [Xero US pricing](https://www.xero.com/us/pricing-plans/).
- FreshBooks (USD): Lite 23 (5 billable clients), Plus 43 (50 clients), Premium 70 (unlimited); extra team member USD 11/month; 80% intro discount for 4 months. FACT — [FreshBooks pricing](https://www.freshbooks.com/pricing).
- Bonsai (USD per user per month, monthly/annual): Basic 15/9; Essentials 25/19 (adds invoices, contracts, expense/income tracking); Premium 39/29; Elite 59/49. FACT — [Hello Bonsai pricing](https://www.hellobonsai.com/pricing).
- Invoice Ninja (from 1 Jan 2026): Free for 5 clients with unlimited invoices; Pro USD 14/month or 140/year for one user; Enterprise tiers priced by users (e.g. 5 users USD 32/month); self-host white-label USD 40/year. FACT — [Invoice Ninja pricing update](https://invoiceninja.com/pricing-update-january-1-2026/).
- Akaunting cloud (USD, monthly/yearly-per-month): Standard 12/8 (1 user + 1 accountant, 1,000 invoices), Premium 36/24, Elite 84/56, Ultimate 218/145; double-entry and bank feeds only from Premium; open-source self-hosted option exists but its terms were not on this page. FACT — [Akaunting pricing](https://akaunting.com/pricing).
- Refrens (India): free for 15 documents, then Premium; INR prices not shown on the fetched page. FACT (partial) — [Refrens pricing](https://www.refrens.com/pricing).
- Vyapar (India): official pricing page fetch returned no price data (blocked/metadata only). Reseller and comparison sites report Gold 1-year around INR 3,400-4,300 desktop/mobile, with a mobile-only plan far lower (INR ~800-940); sources disagree and are third-party. REVIEW/aggregator — [Techjockey](https://www.techjockey.com/detail/vyapar), [Capterra](https://www.capterra.com/p/180579/Vyapar/pricing/), [PricingSaaS](https://pricingsaas.com/companies/vyapar) (the last claims a 10% price cut in June 2026; unverified).
- OkCredit: free Basic plan; paid tiers (ad-free, multi-device, GST billing, unlimited SMS, priority support); prices not on the fetched FAQ. FACT — [OkCredit FAQ](https://okcredit.in/faq).

### Inferences
- Free tiers cap volume (Zoho 1,000 invoices, Wave none but paywalls bank feeds and collaborators, Invoice Ninja 5 clients, Refrens 15 documents); paywalls usually sit on bank feeds, multi-user/accountant access, multi-currency and payments, not on basic invoicing.
- An optional business mode in a local-first app would compete with free tiers (Wave Starter, Zoho Free, Invoice Ninja Free) on price. Differentiation would have to be local language/tax/format fit, not price.

### Gaps
- No official prices for Turkey, Kazakhstan, Georgia, Uzbekistan for any tool (Zoho Turkey page 404; no other regional pricing located).
- Vyapar official price; Refrens INR price; Khatabook/OkCredit premium price points; Splitwise, Expensify, Money Manager, Wallet, Spendee, Monefy pricing not researched (limited tool budget).
- Whether Wave Pro and QuickBooks "Free" tier are available outside the US/Canada.

## Personal vs business separation (Q: workspaces, owner-paid costs, draws/capital, transfers)

### Takeaway
Mature bookkeeping tools treat owner money as equity (contributions in, draws out), and personal-finance apps either keep a separate budget file (YNAB) or tag business items inside a shared view (Monarch). The common failure is a mixed ledger where personal spending hits business profit or the reverse.

### Cited Findings
- YNAB recommends a separate business budget unless the side operation is tiny, citing easier taxes, reconciliation and personal-vs-business clarity. VENDOR (the fetch of the YNAB URL failed; this comes from a search snippet) — [YNAB blog](https://www.ynab.com/blog/goodbye-quickbooks-you-need-a-separate-business-budget).
- Monarch uses tags/rules to pull business items out of the family budget and show a simple profit view; it does not do invoices or payroll. REVIEW/secondary — [Sacra](https://sacra.com/chat/h/b2c7a143-196b-4b33-89c5-93b6ffb5a4c7/), [Make Tech Easier](https://maketecheasier.com/monarch-app-mint-replacement/).
- Accounting convention for sole proprietors: money taken for personal use is an owner's draw (equity, not a business expense); personal expenses paid from the business account go to draw; business costs paid from the owner's own pocket are booked against contributed capital; the sole proprietor is taxed on profit regardless of draws. Independent/educational blog guidance, with a recommendation to check with an accountant — [Beancount.io, owner's draw](https://beancount.io/blog/2026/04/03/owners-draw-what-it-is-how-to-pay-yourself-from-your-business), [Kashoo help](https://help.kashoo.com/en/articles/370379-recording-money-the-company-owners-put-into-and-take-out-of-the-business), [Intuit community thread](https://quickbooks.intuit.com/community/reports-and-accounting-5/owner-s-oop-expenses-48551). Practitioners on the Intuit community disagree on details (draw vs other treatment for personal charges on business cards).
- Mixing accounts is reported to make bookkeeping, tax prep and audit support harder — [Beancount.io, business vs personal](https://beancount.io/blog/2023/08/12/business-vs-personal-bookkeeping-with-beancount).
- Spendee business workspace support: no evidence found.

### Inferences
- A business mode that is a separate book (own accounts, categories and reports) with explicit owner-contribution and owner-draw transfer types avoids double counting; a transfer between personal and business books should create one linked pair, not two independent expenses.
- Tag-only separation is simpler but cannot produce a clean profit and loss without discipline; owners with little bookkeeping knowledge are the ones most likely to make errors.

### Gaps
- No hands-on test of Wave/Zoho/FreshBooks personal-expense workflows; Wave/Zoho/Xero help pages on owner transactions were not fetched.
- Tax treatment in Azerbaijan is out of scope here and untested.

## Data-model lessons (Q: invoices, allocations, credit notes, multi-currency, audit)

### Takeaway
Credit and payment handling is the hard part: Xero separates credit notes, overpayments and prepayments and requires explicit allocation to invoices; users complain it is manual with no bulk allocation. A minimal correct model keeps invoice lines, payments and allocations as separate records.

### Cited Findings
- In Xero a credit note reduces an invoice or bill and is allocated to it; advance or excess customer payments should be recorded as prepayments/overpayments, not credit notes; partial payments are handled by allocating part of a payment and treating the remainder as an overpayment. REVIEW (forum/practitioner posts, not Xero Central) — [AccountingWEB](https://www.accountingweb.co.uk/node/151481), [Xero Product Ideas](https://productideas.xero.com/forums/967115-invoices-quotes/suggestions/46295548-sales-invoices-allocate-overpayments-and-credits).
- Users report allocation is slow and there is no bulk allocation (open feature requests) — [Xero Product Ideas](https://productideas.xero.com/forums/967115-invoices-quotes/suggestions/44961307-credit-notes-bulk-allocation?page=10).
- Xero gates multi-currency to its top US tier. FACT — [Xero US pricing](https://www.xero.com/us/pricing-plans/).

### Inferences (plain-language minimal model; INFERENCE from the above and general accounting practice, not from a specific vendor spec)
- Document: an invoice (or bill) has a customer/supplier, issue and due date, currency, and one or more lines (description, quantity, unit price, tax), with the total computed from the lines.
- Money: a payment is its own record (date, amount, account, currency); it is linked to one or more invoices through allocation records saying how much of the payment applies to which invoice. Outstanding balance = invoice total minus allocations minus credits applied, never a stored number edited by hand.
- Corrections: an issued invoice is not edited or deleted; a credit note (a negative document linked to the original) reverses it fully or partly; a refund is a payment going the other way.
- Excess money: an overpayment or advance becomes unallocated credit held against the contact until applied.
- Multi-currency: each document keeps its own currency and the rate used; gains/losses arise when payment is at a different rate. Safe first version: one currency per book.
- Audit: append-only history (who, when, what changed) and no hard deletion of issued documents; numbers sequential without gaps.
- Owner flows: owner contribution and owner draw as transfer types, not income or expense.
- Plain risks for a local-first app: no accountant access, no shared edits, and no server-side audit trail; data export (and import) quality becomes the main lock-in defence.

### Gaps
- Vendor primary documentation (Xero Central, QuickBooks, Zoho help) on the data model was not retrieved; the model above is not verified against those tools.
- Tax/e-invoicing requirements in Azerbaijan (covered by another researcher).

## Complaints and failure modes (Q: reviews/forums)

### Takeaway
Independent evidence centres on price hikes and forced plan changes (QuickBooks), payment-account freezes and weak support (Wave), and data export/migration problems. Evidence from aggregator sites is weaker than forum posts from named users.

### Cited Findings
- QuickBooks: Inc. reported some customers on the top plan faced a ~66% increase and were unhappy with the new plan limits; accountants complained limits on classes/locations were not disclosed. REVIEW/press — [Inc.](https://www.inc.com/michelle-cheng/prices-quickbooks-accounting-software.html) (fetch of the full article returned 403; based on search snippet). An accountant on Intuit's own community said they must keep paying for a Desktop subscription to export client data; another reported a forced Desktop-to-Online move corrupted reconciliations. REVIEW (single user posts) — [Intuit community](https://quickbooks.intuit.com/community/other-questions-72/caseware-quickbooks-export-utility-for-desktop-files-145203), [Intuit community](https://quickbooks.intuit.com/community/other-questions-9/longtime-customer-deeply-disappointed-by-quickbooks-pricing-and-forced-migration-90743). NerdWallet notes online complaints about price hikes and upselling — [NerdWallet](https://www.nerdwallet.com/business/software/learn/quickbooks-alternatives-signs).
- Wave: Trustpilot reviewers describe payments accounts being cancelled or funds held with no recourse, missed payroll after a bank outage, and slow or no support; Trustpilot shows about 3.6/5 on 500+ reviews. REVIEW — [Trustpilot](https://ca.trustpilot.com/review/waveapps.com?page=5), [ComplaintsBoard](https://www.complaintsboard.com/wave-financial-b135233), [checkthat.ai summary](https://checkthat.ai/brands/wave/reviews). Wave's accounting product itself shows no shutdown evidence.
- Khatabook/OkCredit: no clear body of data-loss complaints found; one G2 reviewer asked how to recover after losing a phone; OkCredit markets phone-number restore. Digikhaata reviewers reported image backup not working (different app). VENDOR/REVIEW — [OkCredit](https://okcredit.in/digital-khata-book), [G2 Khatabook](https://www.g2.com/products/khatabook/reviews), [Techjockey Digikhaata](https://www.techjockey.com/reviews/digikhaata).
- Wave paywalls bank feeds and collaborators (secondary comparison) — [Beancount.io](https://beancount.io/blog/2026/08/05/wave-accounting-bank-feeds-collaborator-paywall-guide). Note Beancount.io sells its own alternative; affiliate/competitor bias likely.

### Inferences
- Local-first storage removes sync-loss and vendor-lock-in complaints but replaces them with device-loss and backup risk, the exact scenario the cash-book apps highlight.

### Gaps
- No Reddit, App Store or Play Store review texts retrieved. Sync-loss evidence for FreshBooks/Zoho not found. Accountant-rework complaints from mixed books not found beyond the practitioner threads above.

## Cash-book (khata) apps and willingness to pay (Q: emerging-market microbusiness, conversion)

### Takeaway
Khata apps won millions of free users by solving "who owes me" and monetised mainly through side businesses (payments, lending, ads), not subscriptions; subscription revenue appears small. Cross-category subscription benchmarks show low paid conversion, lower in India/SE Asia.

### Cited Findings
- Khatabook reached tens of millions of downloads (claimed >50M) and was pre-revenue until FY20; its FY22 revenue was INR 71.1 Cr (most from software development and consultancy services) against a loss of INR 111.1 Cr. FACT as reported by press — [Inc42](https://inc42.com/?p=389111). Active users not stated.
- OkCredit FY24 revenue INR 14.3 Cr (+72%), still loss-making, from ads, subscriptions and service fees — [YourStory](https://cwv.yourstory.com/2024/10/okcredit-reports-72-percent-rise-annual-revenue-rs-14-cr) (via search summary; figure not verified on page). Press argued Khatabook's monetisation hinges on lending; one commentary says it cannot lend enough to justify its valuation (opinion) — [The Morning Context](https://themorningcontext.com/internet/khatabook-cant-lend-enough-to-justify-its-valuation). Khatabook shut down its MyStore storefront within a year of launch — [Inc42](https://inc42.com/?p=268347).
- RevenueCat, State of Subscription Apps 2026 (publisher RevenueCat, March 2026; cross-category, mobile B2C subscription apps via RevenueCat): Business category download-to-paid at day 35 median 2.6%, top quartile above 5.0%; download-to-trial 9.1%; weekly price median USD 6.89; realised LTV per payer USD 35.48 after one year; only 1.6% of Business apps reach USD 10K monthly within two years; slowest category to USD 1K (113 days). FACT for the report; not representative of bookkeeping apps in Azerbaijan — [RevenueCat Business](https://www.revenuecat.com/state-of-subscription-apps-2026-business). A secondary article reports D35 download-to-paid medians of 2.6% (North America), 2.0% (Western Europe), 1.4% (India/SE Asia), category unclear — [ppc.land](https://ppc.land/ai-apps-earn-41-more-per-user-but-churn-30-faster-revenuecat-finds/). SaaStr notes the dataset is mostly B2C mobile — [SaaStr](https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth). Adapty 2026 is a separate dataset — [Adapty](https://adapty.io/state-of-in-app-subscriptions/).

### Inferences
- Lesson from khata apps: the core need is a simple customer-balance ledger (credit given, payments received, reminders), cheap to enter, usable in local language; willingness to pay for the ledger itself looks weak, monetisation came from adjacent services. Sustainable revenue for a local-first Azerbaijani app would be unproven; treat 1.4-2.6% paid conversion as an upper-ish orientation, not a forecast.
- If the data model can support partial payments against a customer balance, a khata-style "who owes whom" feature could be a smaller, validated step than full invoicing.

### Gaps
- No measured willingness-to-pay survey for microbusiness bookkeeping in CIS/Caucasus; no subscription-only revenue split for Khatabook/OkCredit; no Splitwise/Expensify/Money Manager/Wallet/Monefy evidence gathered.
- Preliminary lean (INFERENCE, owner's decision): the benchmark does not support building a full accounting product; a narrow optional module (separate book, owner transfers, simple receivables/customer balance, export) is the defensible scope, and "do not build" remains a live option until local demand is validated.
