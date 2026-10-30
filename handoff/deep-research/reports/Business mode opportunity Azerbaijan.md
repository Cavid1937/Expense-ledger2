> **Decision in one paragraph (read this first).** Do not build a Business Mode for the 20 November 2026 personal release, and do not build a cloud workspace or an accounting/ERP/POS product at all. Keep business support open as research only (Option A) until a short interview-and-price validation clears an agreed gate; if it clears, the first thing to build after the personal release is a narrow, local-first, accountant-ready export and "separate business book" (Options E then B-minus/B), stored apart from `expense_ledger_v5`. The evidence for real demand in Azerbaijan is almost nil (no interviews, no willingness-to-pay data, no hands-on competitor test), so every "yes" in this report is conditional. Evidence labels used throughout: FACT (official/primary), VENDOR CLAIM, REVIEW (user evidence), SECONDARY, INFERENCE, NOT ASSESSED. Nothing here is legal or tax advice.

# PART 1 — Business Mode Market & Competitor Research

## Summary of this part

Cashera is the only Azerbaijan-focused app found that bundles personal finance with a broad business suite, and it is a real positioning competitor, but its maturity is unproven. Every other local product found is either a bank app, a heavy ERP/POS, a state system, or a consumer app whose business features are unknown. International tools set the price floor: free tiers exist almost everywhere. Hands-on testing of any competitor was NOT done in this research.

## Cashera: broad, fast, thinly evidenced

Cashera ("Cashera: AI Expense Tracker", developer PROTECH SOLUTIONS GROUP, MMC) is a 46.7 MB iOS app with 7 languages (including Azerbaijani, Russian and English) and 37 currencies ([App Store AZ](https://apps.apple.com/az/app/cashera-ai-expense-tracker/id6788484318), Apple, accessed 28 Oct 2026; FACT, store listing). Its independent evidence base is tiny: **4.9 stars from only 10 ratings**, four short positive review texts, one from a reviewer who says they are an accountant, and the developer replied to every review (REVIEW; same source). Ten ratings with developer replies cannot be read as proof of demand or of quality (INFERENCE).

The release history shows how fast it moved. The page shows day and month only, so the year is assumed to be 2026 (INFERENCE). Version 2.0.56 (24 Aug) added separation of personal and business accounts; 2.0.65 (17 Sept) added company-mode fixes, partner ownership and cash-box transfers; 2.0.73 (1 Oct) added business reports and an accountant role; 2.0.75 and 2.0.76 (3 and 4 Oct) added sales, products, customers, warehouse, PDF invoices, a customer portal and supplier accounts; 2.0.85 (14 Oct) added bank-statement import and business POS; 2.0.92 to 2.0.96 (17 to 20 Oct) added business cash boxes, orders, loyalty and a cash-till fix ([App Store AZ](https://apps.apple.com/az/app/cashera-ai-expense-tracker/id6788484318); FACT, release notes). That is roughly **15 releases in two months**, with repeated "POS fix" and "company mode fixes" entries, which suggests very high churn and a stability risk (INFERENCE). The conflict between the App Store notes (which mention a Pro tier) and the website (which lists none) is unresolved.

On its own website Cashera claims cash/bank desks with shift closing, customer invoices with balances that post to a cash register when paid, a barcode POS with cash, card and credit (nisyə) payments, a web ERP, and roles (cashier sees the cash register only, accountant sees reports, owner sees all) with each operation attributed to a user ([cashera.app](https://cashera.app/), accessed 28 Oct 2026; VENDOR CLAIM). The same page lists prices: **Free 0; Plus 4.99 AZN/month or 39/year; Plus Family 7.99/month; Business 19.99 AZN/month or 189/year** with unlimited companies, POS, invoices, warehouse and team roles (VENDOR CLAIM; the App Store page shows no prices). Its Apple privacy label lists data linked to the user, including name, email, phone, photos and "other financial info" (FACT as a developer declaration, unverified by Apple). The site claims server-side encryption, CSV export and account deletion (VENDOR CLAIM). Offline use is documented only for expense logging with later sync, not for business records (INFERENCE from release notes 2.0.71 and 2.0.84).

What Cashera tells us: customer balances, supplier accounts, partner money and an accountant role are treated as core by the main local competitor, and **19.99 AZN/month is the price anchor** an Azerbaijani buyer sees. What it does not tell us: whether any of this is correct (partial payments, reconciliation) or used. Whether a local-first, no-account design is a differentiator is a hypothesis (INFERENCE), not a validated need.

## Other Azerbaijani consumer apps: mostly unknown

Only hev.money was verified. It is a free web app from hev.az with income and expenses, debts, budget limits and charts, manual entry, and it says it suits freelancers and small-business owners as a "simple pocket account"; it does not mention invoices, multi-user or export, and offers corporate/ERP work only as custom projects ([hev.az](https://hev.az/en/maliyye-proqrami/), accessed 28 Oct 2026; VENDOR CLAIM). A mirror page for package az.xerclerim.xerclerim showed a "Spendly" expense tracker (v1.0.1, 8 Jun 2026) with no business features, but the package-to-listing match is unconfirmed ([APKPure](https://apkpure.com/p/az.xerclerim.xerclerim); SECONDARY). For AvroFinance, Budget AI, PulApp and two other Play-only apps, the store fetches returned only truncated content and searches found nothing: **business features, prices, ratings and downloads are NOT ASSESSED**. Absence of evidence here reflects failed fetches, not confirmed absence.

## Banks, ERPs and state systems are complements

Bank business apps give payments, statements and credit, not bookkeeping. Birbank Biznes (Kapital Bank) is free, in AZ/RU/EN, rated 4.9 from about 5.7k ratings, with statements up to one year, QR payments and templates ([App Store AZ](https://apps.apple.com/az/app/birbank-biznes/id1546071871); FACT/REVIEW). ABB Biz targets individual entrepreneurs with digital loans, mobile POS ordering and simplified tax declarations through the E-Mühasibim bridge, rated 4.8 from 24 ratings ([App Store](https://apps.apple.com/app/id1593388351); VENDOR CLAIM/REVIEW). SOFTECH sells about 20 ERP/POS modules including e-kassa integration, double-entry accounting and payroll with no public pricing ("Call Now") ([SOFTECH](https://www.softech.az/en/products); VENDOR CLAIM). The statutory e-qaimə invoice is issued only in the State Tax Service system ([taxes.gov.az](https://www.taxes.gov.az/az/page/elektron-qaime-faktura); FACT). A light ledger therefore sits beside banks, ERPs and state systems, not in place of them (INFERENCE). Not researched: 1C partners and prices, PASHA Bank's business app, e-kassa device pricing, and Excel/Telegram/notebook substitutes.

## International benchmarks set a free floor

Global tools offer free or cheap entry tiers and charge for bank feeds, multi-user and multi-currency. Wave Starter is free and Pro is USD 19/month ([Wave](https://www.waveapps.com/pricing); FACT); Zoho Books has a free tier (1 user plus 1 accountant, 1,000 invoices a year, revenue under USD 50K) ([Zoho Books](https://www.zoho.com/books/pricing/); FACT); Invoice Ninja is free for 5 clients and USD 14/month Pro from 1 Jan 2026 ([Invoice Ninja](https://invoiceninja.com/pricing-update-january-1-2026/); FACT); QuickBooks Online starts at 38 and rises to 340 USD/month ([Intuit](https://quickbooks.intuit.com/pricing/); FACT, page possibly truncated); Xero starts at USD 27 ([Xero](https://www.xero.com/us/pricing-plans/); FACT). The only confirmed emerging-market price is Zoho Books India at INR 749 to 899/month for the Standard plan, roughly one thirteenth of the USD price at nominal rates ([Zoho Books India](https://www.zoho.com/in/books/pricing/); FACT; the ratio is INFERENCE and not adjusted for purchasing power). No official prices for Turkey, Kazakhstan, Georgia or Uzbekistan were found. Differentiation against free tiers therefore has to come from local language, local formats and trust, not price (INFERENCE).

Complaints about incumbents cluster on price rises and forced plan changes at QuickBooks ([Inc.](https://www.inc.com/michelle-cheng/prices-quickbooks-accounting-software.html), snippet only; REVIEW), frozen payment accounts and weak support at Wave ([Trustpilot](https://ca.trustpilot.com/review/waveapps.com?page=5), about 3.6/5 on 500+ reviews; REVIEW), and export lock-in. Local-first storage removes sync-loss and lock-in complaints but exposes users to device-loss risk, the very scenario the khata (cash-book) apps highlight (INFERENCE).

## Evidence quality for Part 1

Vendor claims dominate; release notes are the strongest evidence (FACT, but self-reported); independent evidence is four Cashera reviews plus bank-app reviews about login and support; hands-on testing is NOT ASSESSED; Google Play data is NOT ASSESSED. Fetch tools returned model-generated summaries, not raw pages.

# PART 2 — Business User Needs & Workflow Requirements

## Summary of this part

The reachable population is in the low hundreds of thousands, not 1.6 million, and is dominated by trade and service sole traders rather than IT freelancers. Actual record-keeping behaviour, pain ranking and willingness to pay are all NOT ASSESSED: no Azerbaijani survey, forum sample or interview was found. The job descriptions below are hypotheses to test, not findings.

## Segments and size

Azerbaijan classifies by the higher of employees or income: micro is 1 to 10 employees and up to AZN 200k, small is 11 to 50 and up to AZN 3m, medium 51 to 250 and up to AZN 30m; individual entrepreneurs are counted inside micro ([Ministry of Economy](https://www.economy.gov.az/en/page/sahibkarliq/sahibkarliq-subyektlerinin-bolgusu); FACT, undated). The State Statistics Committee confirms there is no separate dataset for individual entrepreneurs ([SSC](https://www.stat.gov.az/source/entrepreneurship/?lang=en); FACT, updated 1 Dec 2025). Counts conflict because they measure different things: **1,584,897 registered entities, 424,527 operating (a 26.8% activity coefficient), 807,000 active taxpayers at the State Tax Service, and about 192,000 operating taxpayers** per the Chamber of Accounts ([Baku Research Institute, 22 May 2026](https://bakuresearchinstitute.org/en/how-do-azerbaijani-tax-authorities-determine-business-activity/); SECONDARY, primary tables not verified). The agency counted over 1,275,000 individual entrepreneurs in mid-2023 (year inferred), about three in four in agriculture, trade, transport or other services, 77.6% men ([smb.gov.az](https://www.smb.gov.az/en/all-news/number-of-private-entrepreneurs-exceeded-1-million-275-thousand); FACT, agency self-report). SME employees were 417,800 in 2024 ([smb.gov.az, 23 Dec 2025](https://www.smb.gov.az/en/all-news/growth-momentum-in-azerbaijans-sme-sector-continues); FACT). My reading: an upper bracket for owner-operated units that actually trade is roughly 190,000 to 810,000, and only a fraction keeps any records beyond what tax filing needs (INFERENCE; this is not a revenue estimate). Freelancers have no count; a July 2026 draft Tax Code change defines "freelancers" narrowly as digital workers in technology parks ([Trend, 7 Jul 2026](https://www.trend.az/azerbaijan/society/4204775.html); SECONDARY), so the IT-freelancer slice is thin (INFERENCE).

## Jobs to be done (hypotheses)

Online sellers and market traders (INFERENCE) need daily sales, stock cost, customer credit (borc) and supplier payables in one place. Drivers and couriers need per-day profit across platforms with no inventory. Salon, repair and food owner-operators need cash-heavy daily takings, staff payments and supplier purchases. Freelancers need invoices to foreign clients and currency handling. Farmers need seasonal cash flow. The tax regime shapes the job: the simplified tax is reported as 2% of turnover under AZN 200k, so many micro-businesses need turnover tracking against the threshold, not profit accounting ([PwC Tax Summaries](https://taxsummaries.pwc.com/azerbaijan/corporate/taxes-on-corporate-income); SECONDARY, snippet; official table NOT ASSESSED).

## Workflow requirements table

| Workflow | What the user must be able to do | Evidence it matters | Status |
|---|---|---|---|
| Separation of business from personal | Own accounts, categories, reports; no leakage into personal totals | YNAB recommends a separate budget ([YNAB](https://www.ynab.com/blog/goodbye-quickbooks-you-need-a-separate-business-budget), snippet; VENDOR); mixing makes tax prep harder ([Beancount.io](https://beancount.io/blog/2023/08/12/business-vs-personal-bookkeeping-with-beancount); SECONDARY) | NOT ASSESSED locally |
| Cash, bank, cash boxes | Several money places, transfers counted once | Cashera sells cash boxes/till (VENDOR) | NOT ASSESSED |
| Income and expense | Fast entry, categories | Universal | NOT ASSESSED |
| Customers and amounts owed | Credit sales, partial payments, balances | Khata apps won users on "who owes me" ([Inc42](https://inc42.com/?p=389111), FACT as press-reported) | NOT ASSESSED locally |
| Suppliers and bills | Payables, due dates | Cashera supplier accounts (VENDOR) | NOT ASSESSED |
| Owner and partner money | Contributions and draws as equity, not income/expense | Accounting guidance ([Kashoo](https://help.kashoo.com/en/articles/370379-recording-money-the-company-owners-put-into-and-take-out-of-the-business); SECONDARY) | NOT ASSESSED locally |
| Reports | Turnover, profit, who owes whom | Threshold tracking implied by the tax regime (INFERENCE) | NOT ASSESSED |
| Accountant hand-off | Clean CSV/XLSX plus attachments | Accountants in the AZ market cost AZN 100 to 500 per month ([Lalafo](https://lalafo.az/baku/uslugi/q-buxalter); weak SECONDARY) | NOT ASSESSED |
| Backup, history, trust | Restorable file backups, audit trail | Local-first removes lock-in but adds device-loss risk (INFERENCE) | NEEDS WORK if built |
| Multi-user | Staff and accountant access | Cashera roles (VENDOR); needs cloud | DEFERRED WITH REASON |

## Pain points, substitutes, willingness to pay

Ranking pain by frequency and severity is **NOT ASSESSED**. Generic constraints in secondary literature (access to finance, credit cost, financial literacy, tax inspections, limited digitalisation) are not bookkeeping pain ([OECD, April 2022](https://www.oecd.org/en/publications/promoting-enterprise-digitalisation-in-azerbaijan_6a612a2a-en.html); FACT on headlines, full text unread). Substitutes are outsourced accountants (needed anyway for tax filing), Excel and paper, bank apps, POS dashboards, 1C/ERP and the e-taxes portal; no usage data for any of them was found. If an owner already pays an accountant AZN 100 to 350 per month, a AZN 5 to 15 app is a convenience budget line (INFERENCE). Willingness to pay is **NOT ASSESSED**. Cross-category benchmarks are discouraging: median download-to-paid conversion for Business subscription apps is **2.6%** and 1.4% in India/Southeast Asia in one secondary reading ([RevenueCat, March 2026](https://www.revenuecat.com/state-of-subscription-apps-2026-business); [ppc.land](https://ppc.land/ai-apps-earn-41-more-per-user-but-churn-30-faster-revenuecat-finds/)); khata apps like Khatabook and OkCredit monetised mainly via adjacent services, with OkCredit at INR 14.3 Cr revenue and still loss-making ([YourStory](https://cwv.yourstory.com/2024/10/okcredit-reports-72-percent-rise-annual-revenue-rs-14-cr), search summary). These are not Azerbaijan forecasts.

## Validation plan (PLAN only; nothing has been done)

Recruit 10 to 15 owners (online sellers, market/shop traders, drivers or couriers, service owner-operators, freelancers, at least 4 outside Baku) and 3 to 5 accountants who serve micro clients, via the owner's network, accountant firms and, with permission, the SMB agency's trainings. Interviews in Azerbaijani or Russian ask about past behaviour: how yesterday was recorded, where debts are written, the last costly mistake, what the accountant charges, which tools were tried and abandoned. Run 5 observed task sessions (record a credit sale, a partial payment, an owner withdrawal, produce an accountant export) on a prototype or paper mock-up, and a paid-pilot test at pre-registered prices (free, AZN 5, AZN 15 per month, or a AZN 30 to 60 one-off) requiring a real commitment such as a phone-number waitlist or two weeks of use. Use no real financial data and obtain consent. Gate defined in Part 6.

# PART 3 — Optional Business Workspace UX & Product Decision

## Decision

**Not now.** No Business Mode, switcher or business screens ship in the 20 November personal release, and no existing user's experience or storage changes. If the Part 6 gate is passed, the first design to prototype is a separate, opt-in Business book (not a toggle that re-labels personal data). This is a product recommendation (INFERENCE), grounded in the thin demand evidence and the protocol that personal users must never be forced into business workflows.

## Journeys if it is ever built

First run for new users: after the language choice (Azerbaijani, Russian, English), a neutral question "How will you use Expense Ledger?" with Personal as the default, Business, and Both. "Both" is offered only after the two-book separation has passed its integrity tests; before that, the choice is Personal or Business-later (INFERENCE). Existing users see nothing new unless they find "Add a business book" in settings; defaults never change silently and no update opens a business prompt.

When Business is chosen, the app creates a separate workspace with its own accounts and cash boxes, categories, customers and suppliers, reports and backup file type. Navigation shows a persistent, high-contrast context banner ("Business: [name]" or "Personal") on every screen and on every exported report, because the commonest error in mixed ledgers is posting to the wrong book (INFERENCE from [Beancount.io](https://beancount.io/blog/2023/08/12/business-vs-personal-bookkeeping-with-beancount)). Switching is an explicit action with a confirmation of which book will receive the next entry; never auto-switch, and never show combined totals unless the user asks for a clearly labelled "both" view that excludes owner transfers from income and expense.

## Owner money

The model follows accounting convention: money the owner takes out is a draw (equity, not an expense), money put in is a contribution, a business cost paid from the owner's pocket is booked against contributed capital, and a personal expense paid from business funds is a draw ([Beancount.io, 3 Apr 2026](https://beancount.io/blog/2026/04/03/owners-draw-what-it-is-how-to-pay-yourself-from-your-business), [Kashoo](https://help.kashoo.com/en/articles/370379-recording-money-the-company-owners-put-into-and-take-out-of-the-business); SECONDARY; practitioners disagree on details, and Azerbaijani tax treatment is NOT ASSESSED). A transfer between personal and business books must create one linked pair, never two independent expenses (INFERENCE). Plain-language labels such as "Money I put into my business" and "Money I took out for myself" are preferable to "capital" and "draw", subject to Azerbaijani accountant review of the terminology.

## Localization, accessibility, states

All strings (navigation, forms, validation, empty and error states, confirmations, dates, numbers, currency, accessibility labels) must exist in az, ru and en before release; business vocabulary (nisyə/credit sale, kassa, qaimə) needs native-speaker and accountant review, and its naturalness is NOT ASSESSED. The accessibility bar is the personal app's: readable type, non-colour cues for the context banner, screen-reader labels naming the active book. Empty states explain what a book is, warn that invoices are internal records, and never imply tax compliance. Error states for storage-full or import-mismatch tell the user what is safe and what to do (for example, "this file is a Business backup; open it in Business").

## Backup, export, deletion, pricing

Business data needs its own backup type that the importer refuses to load into the personal ledger and the reverse (see Part 4), a full export in open formats, and a deletion path that removes a business book without touching personal data. Pricing must be shown before any paid step, with no hidden tiers. The price anchors are Cashera at 4.99 and 19.99 AZN/month and free tiers abroad (Part 1); a price is NOT ASSESSED and is decided only after the validation test. Whether the business book should be free, one-off or subscription is likewise open.

# PART 4 — Architecture, Data Integrity & Security Decision Record

## Summary of this part

A correct ledger needs separate record types for transfers, invoices with lines, payments with allocations, owner equity and reversals, plus automated invariants. The existing personal schema and the key `expense_ledger_v5` must not be changed to "prepare" for any of this. Local-first options are cheap to run but need a new storage engine; a cloud workspace is 3 to 5 times the effort with unbounded operations risk. Effort figures are INFERENCE; no sourced benchmarks exist.

## Minimum correct data model

Stripe's engineering write-up describes an immutable event log in which published transactions cannot be altered, mistakes are fixed by revert and reprocess, and reconciliation checks reveal missing entries ([Stripe, 16 Feb 2024](https://stripe.dev/blog/ledger-stripe-system-for-tracking-and-validating-money-movement); FACT, engineering blog). Fowler's Accounting Narrative offers the same three correction patterns, with Reversal preserving history ([Martin Fowler](https://martinfowler.com/eaaDev/AccountingNarrative.html); FACT, old single-author essay). Building on those, the research proposes (INFERENCE) these separate record types: business identity; money accounts and cash boxes with opening balances; transfers as one record counted neither as income nor expense; invoices and bills with lines (quantity, unit price, tax per line); payments with an allocation table linking payments to invoices so partial and split payments are correct; owner contributions and draws as their own types; reversals and credit notes pointing to the original; integer minor units (qəpik) with currency and rate per amount; attachments stored outside the ledger blob; and an append-only audit history. Receivables and payables are derived (invoice total minus allocations), never typed. Xero users report that credit and overpayment allocation is the hardest part to get right ([AccountingWEB](https://www.accountingweb.co.uk/node/151481), [Xero Product Ideas](https://productideas.xero.com/forums/967115-invoices-quotes/suggestions/46295548-sales-invoices-allocate-overpayments-and-credits); REVIEW). Safe first version: one currency per book. Single-entry with strict invariants can serve cash-based trading; credit sales, loans, several owners or inventory push toward double-entry (SECONDARY, low authority, [FreshBooks](https://www.freshbooks.com/hub/bookkeeping/single-entry-bookkeeping), search summary). The existing personal bills-and-payment link supports one link per payment and cannot represent partial payments spread across bills (INFERENCE from the research notes' reading of the code; I did not inspect the code in this synthesis).

Invariants every build must test (INFERENCE): transfers net to zero and never reach income or expense totals; allocations on a payment never exceed the payment and allocations on an invoice never exceed its total unless an explicit credit exists; each account balance equals opening balance plus entries when recomputed from scratch; a reversal plus its original sums to zero; posted records are immutable; no cross-currency sums without a rate; import, export, import is lossless; accounts or customers with history cannot be deleted.

## Storage, migration, restore

localStorage holds about 5 MiB per origin and throws QuotaExceededError beyond it; IndexedDB in Chromium may use up to 60% of disk, but default storage is "best-effort" and a least-recently-used origin can be evicted entirely under pressure ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria); FACT; MDN does not cover Android WebView, so Capacitor behaviour is **unknown and needs a real-device test**). Therefore: a business book needs a **new database name** (for example a separate IndexedDB), a different backup `type` field, and importer refusal across types; the old app version then cannot overwrite it, which removes the downgrade hazard (INFERENCE). Receipt photos must be blobs, not localStorage. Today's pattern of rewriting the whole JSON on every change does not scale; per-record writes are the main re-engineering cost of Option B. Device-level encryption via a passphrase is possible, but a lost passphrase means unrecoverable data (INFERENCE); encrypted export files are the safer first step.

## Sync, security, operations (cloud option)

Supabase (Postgres with row-level security) is the best technical fit for tenants, roles and audit, but "a table in an exposed schema without RLS is readable and writable by any role with a grant" ([Supabase docs](https://supabase.com/docs/guides/database/postgres/row-level-security); FACT), so a policy mistake leaks data. Free projects auto-pause after a week of inactivity; Pro is USD 25/month with 100,000 MAU included ([Supabase pricing](https://supabase.com/pricing); FACT). Firebase has a free tier but proprietary data and tenancy by hand-written rules ([Firebase](https://firebase.google.com/pricing); FACT); Cloudflare D1 and Workers start at about USD 5/month ([D1](https://developers.cloudflare.com/d1/platform/pricing/); FACT); PocketBase says "no promises for maintenance and support" and has no built-in disaster recovery ([PocketBase FAQ](https://pocketbase.io/faq/); FACT); PowerSync Pro is USD 49/month ([PowerSync](https://www.powersync.com/pricing); FACT). Infrastructure cost is not the issue (INFERENCE): about USD 25/month at 100 and at 1,000 users; at 10,000 users still roughly the same plus photo storage, whose volume nobody has measured. The real cost is support, security work and incident handling, none of which is priced in any source. Server-authoritative append-only writes with server-side invariant checks are safer than last-write-wins or CRDTs for money (INFERENCE). Account creation also triggers store rules: Google Play requires in-app and web account deletion plus Data safety answers ([Google Play Help](https://support.google.com/googleplay/android-developer/answer/13327111); FACT), Apple requires in-app deletion ([Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/); FACT), and Play's Financial Services policy requires a declaration ([Google Play Help](https://support.google.com/googleplay/android-developer/answer/9876821); FACT). Tenant isolation tests, invitation and revocation, recovery, encrypted backups with tested restores, breach procedure and an external security review are the minimum for holding other people's financial data (INFERENCE; costs NOT ASSESSED). Azerbaijani cross-border rules, system registration and any localization duty are unresolved ([Chambers](https://gpg-pdf.chambers.com/investing-in-2026/47/); SECONDARY).

## Option comparison

| Item | A Research only | E Accountant-companion export (my addition) | B-minus: tagged business book, CSV out | B Business Lite (local, single user) | C Opt-in cloud workspace | D Full accounting/ERP/POS/payroll |
|---|---|---|---|---|---|---|
| Data model | none | export mapping only | business tag/profile in new store, no invoices | full model above | full model + tenants and roles | beyond scope |
| Effort (INFERENCE) | about 0 | 2 to 4 person-weeks (my estimate, low confidence; not in the notes) | 4 to 6 weeks | 10 to 16 weeks | 30 to 50 weeks plus permanent operations | not estimated; not credible for a solo maintainer |
| Running cost | 0 | 0 | 0 | 0 infra; support and store effort | from USD 25 to 49/month infra plus unbounded operations | n/a |
| Account deletion / transfer law | none | none | none | none if nothing leaves device | applies | applies |
| Main risk | lost time-to-market | limited value | limited value, mislabelling | Android storage, export correctness | security, legal, availability | everything |
| Risk to 20 Nov | none | low if after release | medium if before | high if before | very high | very high |

Effort ranges come from the research notes and are assumptions: one AI-assisted developer-equivalent, three languages, no legal sign-off, and they need recalibration after a one-week spike on IndexedDB and export on a real Android device.

## Decision record

**Decision:** keep Option A for the 20 November release; make no change to `expense_ledger_v5` or the personal schema; if the Part 6 gate passes, start with E, then B-minus or B in a new storage engine and backup type. Option C and D are not planned. **Status:** proposed, awaiting owner approval; DEFERRED WITH REASON for all build work. **Consequences:** zero 20 November risk from this track; possible loss of time-to-market against Cashera; no cloud obligations. **What would reverse it:** validated willingness to pay with multi-user needs that a local design cannot meet, and a named second technical person plus budget for security review (reopens C); or evidence from accountants that no export helps (closes E).

# PART 5 — Azerbaijan Accounting, Tax, Invoice, POS & Privacy Feasibility

## Summary of this part

Honest scope for an app: internal records, clearly labelled commercial invoices, exports, informational thresholds and estimates. Not feasible without partners, licences or certification: issuing e-qaimə, fiscal receipts, tax filing, payment processing and bank-data access. This part is not legal or tax advice. Many primary texts (Tax Code, Personal Data Law, CBAR manual) were not opened in full; article numbers below are as good as the secondary extracts.

## E-qaimə and fiscal cash registers

Statutory e-qaimə is mandatory from 1 April 2017 for VAT-registered entities and persons listed in Tax Code Art. 218.1.2, issued only in the State Tax Service system with an enhanced electronic signature (ASAN İmza), online or through the offline eFP program uploaded as a signed package; the page names no API, no XML specification, no integrator accreditation and no penalties ([taxes.gov.az](https://taxes.gov.az/en/page/elektron-qaime-faktura); FACT). Compliance vendors advertise an XML format and ERP synchronisation, unverified ([EDICOM](https://edicomgroup.com/electronic-invoicing/azerbaijan); SECONDARY). **A PDF invoice produced by this app is not an e-qaimə** and must never be called one. Whether a non-VAT sole entrepreneur must issue e-qaimə is stated inconsistently and needs an accountant (INFERENCE). Retail and public catering cash settlements require a certified cash register connected to the tax service in real time (Tax Code Art. 16.1.8); POS terminals are mandatory for defined groups including all VAT payers; **fines are AZN 1,000, 3,000 and 6,000 for the first, second and third offence in a calendar year** ([taxes.gov.az, RU](https://www.taxes.gov.az/ru/page/nka-ve-pos-terminaldan-istifadeden-yayinmaya-gore-tetbiq-olunan-maliyye-sanksiyalari); FACT). A software "virtual NKA" category was not found, and integration appears to run through approved e-kassa operators and devices; certification steps and fees are NOT ASSESSED. The app may record daily takings or import a register report; it must never issue fiscal receipts (INFERENCE).

## Tax regime, statutory accounting, retention, payroll

Simplified tax is reported as 2% of revenue up to AZN 200,000 in any 12 months (catering 8%), VAT registration above AZN 200,000, with a 2026 coefficient of 0.5 on cashless turnover and a reported 6% rate for some cash and POS services ([PwC Tax Summaries](https://taxsummaries.pwc.com/azerbaijan/corporate/taxes-on-corporate-income), [Legal 500 / Bureau 28a, 4 Feb 2026](https://www.legal500.com/intelligence/azerbaijan/tax/2026-tax-update-highlights), [VATupdate, 2 Jan 2026](https://www.vatupdate.com/2026/01/02/azerbaijan-increases-effective-vat-registration-threshold-for-cashless-transactions/); SECONDARY; the 6% claim is a single unverified snippet). Official rate tables were not confirmed, so a threshold tracker must be informational, with editable, dated, sourced parameters (INFERENCE). The Accounting Law applies to all entrepreneurial subjects, permits electronic documents, and sets retention periods through the state archive authority, with only accounting-policy documents fixed at five years ([legalacts.az](https://legalacts.az/en/document/88/64280); unofficial translation likely predating amendments). The owner's "five-year rule" is therefore **not confirmed** as a general retention rule; the archive schedule is NOT ASSESSED. Safe behaviour: never auto-delete business records, show an audit trail, offer full export, and say "ask your accountant" (INFERENCE). Payroll rates changed from 1 January 2026 (income tax 3% up to AZN 2,500, then 10%, then 14%; social insurance and medical bands) per PwC, last reviewed 28 Sep 2026 ([PwC](https://taxsummaries.pwc.com/azerbaijan/individual/significant-developments); SECONDARY); official sources were not opened and sector exceptions, subsidies and rounding are unmodelled. Payroll is "estimate at best" and, in my judgement, should stay out of any first version (INFERENCE).

## Open Banking, payments, privacy

CBAR launched a national Open Banking platform on 6 October 2025 with account-information and payment-initiation services ([Salt Edge, Mar 2026](https://blog.saltedge.com/open-banking-in-azerbaijan-workshop/); SECONDARY; [CBAR](https://www.cbar.az/press-release-5245/central-bank-launches-new-digital-platforms); FACT), and Birbank shows read-only aggregation of other banks' accounts with 90 days of history ([Birbank](https://birbank.az/en/news/a-new-era-of-digital-banking-monitor-all-your-banking-transactions-in-birbank); FACT). Business-account scope, third-party registration terms and costs are NOT ASSESSED; the practical near-term route is user-imported bank statement files (INFERENCE). Payment processing is NOT ASSESSED. On privacy, the 2010 Personal Data Law reportedly allows cross-border transfer where the recipient ensures equivalent protection or with consent, and requires registration of personal-data information systems; no localization mandate was found, but statute text was not read ([DataGuidance](https://www.dataguidance.com/notes/azerbaijan-data-protection-overview), [ACON, 27 Aug 2026](https://acon.az/data-protection-in-azerbaijan); SECONDARY). Customer and employee names in a business book are personal data; on-device-only storage keeps the user, not the vendor, in control but does not remove their duties (INFERENCE). Cloud sync would raise operator, registration and server-location questions.

## Claims the app must avoid

Never say or imply: "e-qaimə", "tax compliant", "STS-approved" or "certified", "fiscal receipt" or "NKA", "files your taxes", "official accounting records", "guaranteed payroll", or "bank-connected" unless each is true and verified. Allowed framing: "internal records", "estimates", "export for your accountant", with a visible "Commercial document, not an e-qaimə" label on every generated invoice (INFERENCE). Penalties for passing off documents or for misleading advertising were NOT ASSESSED.

## Questions for a qualified Azerbaijani accountant or lawyer (ready to send)

1. Which intended users (sole entrepreneur on simplified tax, VAT payer, LLC) must issue e-qaimə, and is a non-VAT sole entrepreneur obliged under Tax Code Art. 218.1.2?
2. Does the State Tax Service offer any public API, XML submission channel or integrator accreditation for third-party software, and on what conditions, fees and liability?
3. If the app generates a PDF invoice for a non-obliged business, what wording is legally safe so it cannot be mistaken for an e-qaimə or a fiscal receipt?
4. What are the official 2026 simplified-tax rates, thresholds, the 0.5 cashless coefficient, catering rules and the 6% three-year rate, with the legal acts and dates?
5. What records must a sole entrepreneur on the simplified and on the general regime keep, in what form (is electronic acceptable, is an audit trail required), and for how many years under the archive schedule?
6. May an app-based income and expense log serve as the statutory record, or is it only auxiliary?
7. What are the correct 2026 payroll formulas, and may an app present them as estimates with a disclaimer?
8. For CBAR Open Banking, what registration or licence does an account-information provider need, are business accounts in scope, and which banks are live?
9. If customer and employee data stays only on the user's device, is the app vendor an operator? If cloud backup or sync is offered, are registration, consent, cross-border notification or localization required?
10. What liability and advertising rules apply to calling the app "for business", "accounting" or "tax-ready", and what disclaimers are required in az, ru and en?

Ask for written answers with article citations, because several 2026 changes are available only through secondary summaries.

# PART 6 — Business Mode Go/No-Go & Prioritized Roadmap

## Recommendation

**No-go for business functionality in the 20 November release; conditional go for a narrow, local-first export and separate-book track after release, only if validation passes.** The reasons, in order: (1) demand, willingness to pay and pain ranking are all NOT ASSESSED, and conversion benchmarks are low (2.6% median, lower in emerging markets); (2) the competitor already sells broad business features at 19.99 AZN/month and global tools offer free tiers, so only local-first trust, language fit and accountant-ready export are plausible differentiators, and none is validated; (3) correctness, backup and Android verification of the personal app come first by the project's own priority order, with about three weeks to the target; (4) the legal frontier (e-qaimə, fiscal registers, payroll) is closed to an app of this kind, so scope must stay small. ChatGPT's earlier review (28 Oct 2026) reached a similar conclusion; I tested it against the notes and found it consistent, though its legal claims remain unverified here.

## Weighted scoring (aid, not truth)

Scores are 0 to 5 against each criterion's weight; the totals are out of 100. Confidence is low (L), medium (M) or high (H) on the underlying evidence. Option A scores high partly because it builds nothing and so carries almost no risk; its 1/5 on differentiation is honest about the cost of waiting.

| Criterion (weight) | Confidence | A Research only | E Export companion | B Business Lite | C Cloud | D Full ERP |
|---|---|---|---|---|---|---|
| Problem severity / evidence (20) | L | 4 | 3 | 2 | 2 | 1 |
| Competitive relevance / differentiation (15) | L | 1 | 2 | 3 | 3 | 2 |
| Reachable users / willingness to pay (15) | L | 1 | 2 | 2 | 2 | 1 |
| Fit with optional user choice (10) | M | 5 | 5 | 4 | 3 | 2 |
| Financial correctness / data integrity (15) | M | 5 | 4 | 3 | 2 | 1 |
| Security / privacy / legal feasibility (10) | M | 5 | 4 | 4 | 1 | 1 |
| Time / cost / maintainability / 20 Nov impact (15) | M | 5 | 4 | 2 | 1 | 0 |
| **Weighted total** | | **72** | **66** | **54** | **40** | **22** |

B-minus (tagged business profile, CSV only) was not scored separately; by the same logic it falls between E and B (roughly 58 to 60, INFERENCE). Reading the table: A and E beat B because the evidence of need is thin and B costs 10 to 16 weeks; C and D fail on security, legal and time. The ranking is robust to moderate re-weighting except that raising the weight on differentiation and reachable users would favour B, which is exactly what interviews can show. Scores are my judgement from partial evidence and should be recomputed after validation.

## Scenarios (INFERENCE; no demand data)

For the recommended path (A, then E, then B if gated): best case, interviews show 6 or more of 15 owners keep painful recurring records and 3 or more commit to a pilot or paid step, an export plus separate book wins accountant and owner trust against cloud competitors, and the app gains a defensible niche. Base case, owners value a customer-debt ledger and an export, but few pay; a free or low-priced optional module improves retention among existing personal users without being a business by itself. Downside case, interviews show the segment is served by Excel, an accountant and bank apps, so the track stops after about 3 to 4 weeks of research effort with no product risk. For Option B built now: best case it ships on time and finds users; likely case it delays personal-release verification and ships with unverified Android storage behaviour; worst case an invoice or balance error reaches a real owner's books or the file is mistaken for an official document. For Option C: the worst credible case is a tenant-isolation breach of other people's financial data, whose cost the sources do not price. Illustrative revenue arithmetic only: 1,000 business-mode users at the 1.4% to 2.6% benchmark range is 14 to 26 payers, which at AZN 5 to 15 per month is well under AZN 400 per month (INFERENCE, not a forecast).

## Roadmap and gates

| Stage | Work | Placement | Gate to start | Acceptance criteria |
|---|---|---|---|---|
| 0 | Personal release correctness, backup/recovery, Android verification | Current target (20 Nov) | n/a | Existing personal requirements verified; no business code merged |
| 1 (parallel, no code) | Send the accountant and lawyer questions; recruit 10 to 15 owners and 3 to 5 accountants; hands-on test of Cashera Business and Google Play review harvest by a browser-capable run | Can run in parallel now | Owner approval | Written answers; interview notes; competitor test log |
| 2 | Validation decision | After stage 1, about 3 to 4 weeks | Stage 1 complete | Go only if at least 6 of 15 owners keep painful recurring records AND at least 3 commit to a pilot or paid step AND accountants confirm the export is useful AND the lawyer permits the intended wording |
| 3 | One-week spike: IndexedDB with attachments and accountant export on a real Android device | Separate beta, after 20 Nov | Stage 2 go and personal release stable | Storage and eviction behaviour measured; 10,000-row test |
| 4 | Option E: CSV/XLSX plus attachments ZIP, invoice PDFs labelled "not an e-qaimə" | Separate beta | Stage 3 | Export-import-export lossless; invariants tested; three languages reviewed |
| 5 | B-minus then B: separate book, transfers, owner equity, receivables with allocations | Later, separate flagged module with its own storage key and backup type | Stage 4 pilot evidence | All Part 4 invariants pass; migration tests prove `expense_ledger_v5` untouched |
| Not planned | C cloud, D ERP/POS/payroll, e-qaimə, fiscal receipts, Open Banking provider | Later / out of scope | New evidence, funding and a second technical person | Re-decision required |

## Stop conditions

Stop or revert to personal-only if validation misses the gate, if a prototype cannot keep the personal ledger byte-identical in migration tests, if the lawyer finds the intended labelling unsafe, if Android storage is unreliable, or if personal-release verification slips. Evidence that would change this recommendation: a measured willingness to pay at or above AZN 10 per month from at least 3 owners, a hands-on Cashera test showing real correctness or trust failures, or accountant demand for a specific export format.

# PART 7 — Claude Business Mode Research Completion Report

## What was inspected and how

This report synthesizes five research-note files plus the coordinator's assignment context, all in `C:\Users\cavid\OneDrive\Documents\GitHub\Expense-ledger2-fixes\handoff\deep-research\research_notes\Business mode opportunity Azerbaijan\`: `00_assignment_context.md`, `az_competitors.md`, `intl_tools_pricing.md`, `architecture_security_options.md`, `az_sme_market_needs.md` and `az_legal_tax_feasibility.md`. The research was done by five parallel researchers plus a coordinator on 28 October 2026; I (the writer) read only those notes and did not browse the web or inspect the app's source code, so I did not re-verify any URL. Per the writing rules, notes claims without a source URL were left out of the report.

## Quality of evidence, stated bluntly

The fetch tools returned model-written summaries, not raw pages, so prices and wording are paraphrases. Several key sources were unread: the State Statistics Committee yearbook and the agency's 2025 support survey were unreadable compressed PDFs; the Personal Data Law text, the Tax Code, the CBAR Open Banking manual, the Mastercard 2025 report and the Inc. article were not read (403 or not opened); Google Play pages for five local apps returned "[Content truncated]". The simplified-tax rates, the 6% rate, payroll rates, retention rules and Open Banking details rest on secondary sources, some low authority (a vendor blog, a classifieds site). Date and year of most Cashera release notes are inferred. Cashera's rating is from 10 reviews. Effort estimates are inference, not benchmarks. No interviews, hands-on tests, willingness-to-pay data or real-device storage tests exist. The synthesis table scores are my judgement. The claim "1,584,897 registered versus 424,527 operating" is from a think-tank article, not the primary tables.

## Status of the main questions

| Question | Status |
|---|---|
| Is there real demand for business mode in Azerbaijan | NOT ASSESSED |
| Willingness to pay | NOT ASSESSED |
| Cashera correctness and maturity (hands-on) | NOT ASSESSED |
| Other local apps' business features | NOT ASSESSED |
| Android WebView/Capacitor storage for a business book | NOT ASSESSED |
| e-qaimə integration route, simplified-tax details, retention schedule, payroll, Open Banking, personal-data registration | NOT ASSESSED (secondary evidence only) |
| Part 6 recommendation | DEFERRED WITH REASON (build), pending validation |

## Open questions

Does a local-first design matter to Azerbaijani micro-owners? Will accountants accept a self-kept export? What do owners actually use today (notebook, Excel, Telegram, 1C)? Does a draw or contribution map to anything in Azerbaijani practice? Is a public tax-service integration route available? Which of the 807k, 424k and 192k figures is the right base?

## Next actions

For the owner: approve sending the ten questions in Part 5 to a qualified Azerbaijani accountant or lawyer and ask for written answers with article citations; approve recruiting 10 to 15 owners and 3 to 5 accountants (az/ru-speaking interviewer, no real financial data); decide whether to accept the "no business functionality in the 20 November release" recommendation; continue the personal-release work, which remains the priority. For the next Claude run: do a hands-on test of Cashera's free and Business plans in a browser-capable session (record the correctness of partial payments, owner money and exports), harvest Google Play listings and reviews for the five unread local apps, retrieve the State Statistics Committee tables and the Tax Code simplified-regime articles, price-check 1C and e-kassa operators, and inspect the current app's bills and payment schema before any design. Do not repeat the fetches already summarized in the notes unless a primary source is being sought.

## Confidence statement

I have **high confidence** in the process conclusion (do not ship a business mode in the personal release, do not build cloud or ERP), because it follows from schedule, risk and the absence of demand evidence, and **low confidence** in everything about market size, pricing and demand. I have **medium confidence** that an accountant-ready export is the safest first step, and **low confidence** in the effort ranges and the exact scores. This is a decision aid built from partial evidence, not a feasibility proof or legal advice.
