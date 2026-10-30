# Architecture, data-integrity, security and cost options for an OPTIONAL business mode (Expense Ledger)

Access date for all web sources: 28 October 2026 (the pages are live pricing/doc pages; most carry NO publication date, which is stated per item). Labels: FACT = official docs/pricing page; VENDOR CLAIM = vendor's own marketing statement; SECONDARY = non-official summary; INFERENCE = my reasoning, not sourced. Prices are USD as listed on the vendor page on the access date. Where I could not fetch a primary source, it is listed under Gaps and no number is invented.

## 1. Minimum correct data model for a small-business ledger

### Takeaway
Stripe's own ledger write-up and Fowler's accounting patterns both point to the same safe core: append-only entries, corrections by reversal (never editing history), and checks that sums reconcile. For a micro-business, a "single-entry plus strict invariants" model can work for cash-only trading, but credit sales (invoices), loans, multiple owners or inventory push you toward double-entry. The exact list of entities below is INFERENCE built on those principles.

### Cited Findings
- Stripe describes its Ledger as an immutable log of events: published transactions cannot be deleted or modified, past state is rebuilt by replaying events, and mistakes are fixed by reverting and reprocessing, not editing. Post dated 16 Feb 2024. FACT (engineering blog) — [Stripe, "Ledger: Stripe's system for tracking and validating money movement"](https://stripe.dev/blog/ledger-stripe-system-for-tracking-and-validating-money-movement)
- Same post: uses double-entry (credits and debits) so all money is accounted for; the main invariant is that "clearing" accounts should be at zero at steady state, and a simple query for non-zero clearing accounts reveals missing, late or wrong transactions; completeness checks confirm every source record has a matching ledger event. The post does not discuss idempotency explicitly. FACT — [Stripe blog](https://stripe.dev/blog/ledger-stripe-system-for-tracking-and-validating-money-movement)
- Fowler (Accounting Narrative, first draft 2006, not updated): an account's balance is the sum of its entries; accounting transactions link the entries of a transfer; errors can be fixed by Replacement (delete and redo; history lost), Reversal (keep wrong entries, post cancelling entries, post the correct ones) or Difference adjustment (post only the difference). Accounts fit event-sourcing well. FACT (single-author pattern essay, old) — [Martin Fowler, Accounting Narrative](https://martinfowler.com/eaaDev/AccountingNarrative.html)
- Single-entry is simpler and fits very small cash-based businesses; double-entry becomes essential with inventory, credit sales/purchases, loans, fixed assets, or multiple owners/investors; switching later is possible but time-consuming. SECONDARY (accounting-vendor blogs, low authority; search-result summary only, I did not open the pages) — [search summary citing FreshBooks, Zoho, Patriot and others](https://www.freshbooks.com/hub/bookkeeping/single-entry-bookkeeping)

### Inferences
- INFERENCE, minimum entity list for a CORRECT small-business ledger (each is a separate record type, never a flag on a personal "transaction"):
  1. Business identity (one business profile: name, tax ID, base currency, fiscal-year start).
  2. Money accounts / cash boxes (bank, cash drawer, wallet), each with an opening balance and date.
  3. Transfers between own accounts: ONE record with from-account, to-account, amount (and fee as a separate expense). They must never be counted as income or expense.
  4. Invoices (sales) and bills (purchases) with header + lines (description, quantity, unit price, tax rate), status and due date.
  5. Payments with ALLOCATIONS: a payment can be split over several invoices, and an invoice can be paid in several payments. An allocation table (payment, invoice, amount) is what makes partial payments correct. Receivables/payables are then DERIVED (invoice total minus allocations), never typed in.
  6. Owner capital and owner draws as their own transaction types (not income/expense), plus per-partner balance if more than one owner.
  7. Reversals / credit notes: new entries that point to the original, never an edit or delete of posted records (Fowler "Reversal Adjustment", Stripe "revert and reprocess").
  8. Currency per amount (integer minor units, e.g. qəpik) plus the exchange rate used at the time; avoid floating-point.
  9. Tax fields (rate, tax amount, tax-inclusive flag) stored per line, not recomputed later.
  10. Attachments as references (file id, hash, size) stored outside the main ledger blob.
  11. Audit history: who/when/what-changed for every posted record (single user: still useful for the accountant).
- INFERENCE, invariants automated tests must enforce: (a) every transfer nets to zero across accounts and never appears in income/expense totals; (b) sum of allocations on a payment <= payment amount; allocations never negative; sum of allocations on an invoice <= invoice total (unless an explicit credit/overpayment record exists); (c) account balance = opening balance + sum of its entries, recomputed from scratch equals the stored/cached figure; (d) receivables report = sum of unpaid invoice remainders; (e) a reversal plus its original sum to zero; (f) posted records are immutable (edit attempt creates a reversal); (g) all amounts are integers in one currency unit or carry an explicit currency, and cross-currency totals are never summed without a rate; (h) import then export then import is lossless; (i) deleting an account/customer with history is refused.
- INFERENCE: the existing personal `bills` + `billId` payment link (Run 12) is a useful seed for the invoice/payment-allocation idea but is single-link, so it cannot represent a partial payment spread across several bills without a new allocation structure.
- INFERENCE: a full double-entry chart of accounts is NOT needed for "Business Lite" if the product promises only cash-basis tracking plus simple invoices; it IS needed if the owner wants balance sheet, VAT return or inventory (that is option D territory).

### Gaps
- I did not retrieve primary documentation for Beancount, Medici, Akaunting, Firefly III or the PSD2 account model (the one Beancount search returned only generic accounting blogs). I make no claim about their internals here.
- No Square/Fowler "money" or event-sourcing sources beyond the two above were checked.

## 2. Local-first "Business Lite": storage, encryption, attachments, separation

### Takeaway
localStorage (about 5 MiB per origin) is too small and too fragile for a business ledger with attachments; IndexedDB is the standard answer (quota is a large share of disk) but browsers can still evict "best-effort" data, so exports/backups remain mandatory. A separate storage namespace plus separate backup file type is the safe way to avoid mixing with the personal ledger.

### Cited Findings
- MDN: browsers store up to about 5 MiB of localStorage per origin (the same page also says 10 MiB maximum, which is internally inconsistent; MDN itself says to verify per browser); exceeding it throws QuotaExceededError. FACT — [MDN, Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- MDN: for IndexedDB/Cache/OPFS, Chromium allows an origin up to 60% of total disk size; Safari embedded WebViews get about 15% (browser apps about 60%). The page does not cover Android WebView separately; it says Chromium rules apply to Chromium-based browsers. FACT — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- MDN: default storage is "best-effort": under storage pressure the least-recently-used origin's data is deleted entirely (all APIs, never partially). `navigator.storage.persist()` requests persistent storage; Chromium and Safari grant or deny automatically based on user engagement, Firefox prompts. Safari can delete script-created data after 7 days without interaction (browser, not installed apps). Research cited by MDN says browsers rarely delete data from frequently used sites. FACT — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

### Inferences
- INFERENCE: use a NEW key/database name (e.g. a separate IndexedDB database, not `expense_ledger_v5`) and a different backup `type` field, with the import screen refusing to load a business file into the personal ledger and vice-versa. This also removes the rollback hazard: the old app version only rewrites `expense_ledger_v5` and would never touch a separate store.
- INFERENCE: receipt photos must NOT go into localStorage/JSON; store as blobs in IndexedDB (or Capacitor Filesystem on Android), compress client-side, and include them in a ZIP backup, otherwise one phone photo (commonly megabytes) would exhaust 5 MiB immediately.
- INFERENCE: tens of thousands of rows are feasible in IndexedDB with indexes, but the current pattern of "rewrite the whole JSON on every change" does not scale; a business store would need per-record writes. This is the main re-engineering cost of option B.
- INFERENCE: encryption at rest on the device via WebCrypto (AES-GCM with a key derived from a passphrase) is technically possible, but a lost passphrase means unrecoverable data and the app has no account recovery; safer first step is encrypted EXPORT files plus Android's own device encryption/lock screen.
- INFERENCE: accountant package = CSV (universal) plus XLSX with fixed columns (date, account, counterparty, document no., net, tax, gross, currency) plus the original attachments in a ZIP; this reuses the user's existing export/import tests.

### Gaps
- I did not verify Android System WebView/Capacitor-specific quotas or eviction behaviour (Capacitor docs not fetched). MDN explicitly does not cover Android WebView. Needs a real-device test (INFERENCE: treat as unknown).
- No measured performance numbers for 10k-100k rows; none invented.
- No source checked on WebCrypto limits in Android WebView.

## 3. Cloud multi-user workspace: backends, isolation, sync, cost

### Takeaway
Supabase (Postgres + row-level security) is the strongest technical match for multi-tenant, role-based, audit-friendly data, but it is a real service to run: security rules mistakes leak data, and a solo non-programmer maintainer would carry that risk. Firebase and Cloudflare are cheaper to start but push tenancy and relational integrity (allocations, invariants) onto hand-written rules or code. PocketBase is cheapest but self-hosted, pre-1.0 and unsupported. Hosting location relevant to Azerbaijan is not resolved by these pages.

### Cited Findings
- Supabase pricing (page undated; "pricing may change"): Free $0/month, 50,000 MAU, 500 MB database, 1 GB file storage, 5 GB egress, free projects auto-pause after 1 week of inactivity, max 2 active free projects. Pro from $25/month: 100,000 MAU included then $0.00325 per MAU, 8 GB disk then $0.125/GB, 100 GB storage then $0.0213/GB, 250 GB egress then $0.09/GB, no auto-pause. Team from $599/month. FACT — [Supabase pricing](https://supabase.com/pricing)
- Supabase RLS: a policy acts like a WHERE clause on every query keyed to the caller (e.g. `auth.uid()`); "a table in an exposed schema without RLS is readable and writable by any role with a grant on it"; new tables in `public` on existing projects start with broad grants, so grants must be revoked and re-granted narrowly; the service (secret) key bypasses RLS and must never be in the browser; policies need indexes on filtered columns; `supabase test db` can test allow/deny cases. FACT — [Supabase docs, Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Firebase pricing (page undated): Authentication (Identity Platform) free up to 50K MAU; Firestore free quota 1 GiB stored, 10 GiB/month egress, 50K reads/day, 20K writes/day, 20K deletes/day; the page gives no per-operation prices beyond the free tier and links to Google Cloud pricing; Cloud Storage no-cost quotas apply only to buckets in us-central1, us-west1, us-east1; phone auth is billed per SMS. FACT — [Firebase pricing](https://firebase.google.com/pricing)
- Cloudflare D1: Free 5 million rows read/day, 100,000 rows written/day, 5 GB storage; Paid 25 billion reads and 50 million writes per month included then $0.001 per million reads, $1.00 per million writes, storage $0.75/GB-month beyond 5 GB. Workers Paid plan minimum $5/month per account; Workers Free 100,000 requests/day, 10 ms CPU per invocation. Pages undated. FACT — [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- Appwrite pricing page, as fetched: Free-plan projects freeze (console read-only) when a limit is reached; Pro keeps running and charges overage, with an optional budget cap; dedicated databases start at $10/month with $10 monthly compute credit. The Free/Pro prices, MAU limits and regions were NOT present in the fetched copy. FACT (partial) — [Appwrite pricing](https://appwrite.io/pricing)
- PocketBase FAQ: described as "a personal open source project with intentionally limited scope", volunteer-developed, "no promises for maintenance and support"; scales only vertically on one server; embedded SQLite; no built-in replication or disaster recovery (Litestream suggested); self-hosted only (needs a VPS); page header showed v0.41.1 (pre-1.0). The FAQ claims 10,000+ realtime connections on a $4 Hetzner VPS (VENDOR CLAIM, self-reported, not independently benchmarked). FACT/VENDOR CLAIM — [PocketBase FAQ](https://pocketbase.io/faq/)
- PowerSync (sync layer for offline-first apps): Free $0 (2 GB synced/month, 500 MB hosted, 50 concurrent clients, deactivated after inactivity); Pro from $49/month (30 GB synced, 10 GB hosted, 1,000 concurrent clients); Team from $599/month; a free source-available "Open Edition" can be self-hosted. Page itself is inconsistent on inactivity (1 vs 2 weeks). FACT — [PowerSync pricing](https://www.powersync.com/pricing)

### Inferences
- INFERENCE, cost at scale (infrastructure only, list prices above, excluding payment fees, email/SMS, domain, legal, and the owner's time):
  - 100 MAU: Supabase Free is enough technically but auto-pauses after 1 week of inactivity (unacceptable for a financial service), so the realistic floor is Pro at $25/month. Firebase/Cloudflare free tiers cover this load.
  - 1,000 MAU: Supabase Pro $25/month (well inside 100,000 MAU, 8 GB DB, 100 GB files) unless many receipt photos push storage/egress overage; Cloudflare Workers Paid $5/month.
  - 10,000 MAU: Supabase Pro likely still $25/month plus overage on photos/egress; the dominant cost is not infrastructure but support, security work and incident handling.
  - Receipt photos are the main variable cost (storage $0.0213/GB, egress $0.09/GB on Supabase Pro). Exact totals depend on photo size and counts that nobody has measured; I give no total.
- INFERENCE, conflict handling: for a ledger, server-authoritative writes (append-only entries, server assigns order) are safer than last-write-wins; CRDTs suit text/collaborative documents but let two offline users both "spend" the same cash or double-allocate a payment unless invariants are checked on the server. Immutable entries plus server-side invariant checks sidestep most conflicts.
- INFERENCE, roles: owner / staff / accountant (read-only documents and reports) maps naturally to RLS policies in Postgres; Firebase rules and Cloudflare code can do it too but with less built-in testing support for relational invariants.
- INFERENCE, what a non-programmer can maintain: managed Supabase/Firebase with dashboards can be run, but writing and reviewing security policies, migrations and backups realistically needs an engineer on call; PocketBase on a VPS adds server patching and backup duties on top.
- INFERENCE, vendor lock-in: Supabase = standard Postgres (exportable); Firebase = proprietary Firestore model (hardest to leave); Cloudflare D1 = SQLite-compatible but tied to Workers code; PocketBase = single SQLite file (easy to move, but you own the server).

### Gaps
- Auth option comparison (email OTP, Google, Apple, passkeys) was not researched from primary sources. INFERENCE only: Apple requires Sign in with Apple only where certain third-party logins are offered (not verified here).
- Regional hosting (EU, Turkey, nearest to Azerbaijan) for Supabase, Firebase, Appwrite, Cloudflare D1 was not checked; no region list verified.
- Firestore per-operation prices beyond free tier, Supabase backup/point-in-time-recovery pricing, Appwrite plan numbers, AWS Amplify pricing: not retrieved.
- Replicache, ElectricSQL, Automerge, Figma and Linear sync write-ups were not fetched.

## 4. Security and privacy obligations

### Takeaway
Adding accounts triggers concrete store rules (in-app account deletion on both Apple and Google, web deletion link and Data safety disclosures on Google) and, if data leaves the device, personal-data law questions in Azerbaijan. Staying fully local keeps the current "no backend, no accounts" privacy posture. All legal points need review by an Azerbaijani lawyer.

### Cited Findings
- Google Play: apps that let users create an account must provide an in-app path to delete the account and associated data AND a web link for deletion requests, and must answer the Data deletion questions in the Data safety form; retention for security/fraud/regulatory reasons is allowed if disclosed; non-compliant apps may face enforcement (deadlines passed in 2023-2024). FACT — [Google Play Console Help, Understanding account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- Apple App Store Guideline 5.1.1(v): apps that support account creation must let people start deletion in the app; deactivation alone is insufficient; deletion must be offered everywhere, not only in GDPR/CCPA regions; apps outside highly regulated industries should not require phone/email/chat to complete deletion; Sign in with Apple tokens must be revoked. No effective date on the page. FACT — [Apple Developer, Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Google Play Financial Services policy: apps with financial features must complete a Financial features declaration in Play Console, follow the regulations and disclosures of every region they target, and may need to link licences or documents proving authority to provide financial products; detailed rules concern loans, earned-wage access and binary options. A bookkeeping tool is not a loan app, but the declaration and local-regulation clause apply. FACT — [Google Play Console Help, Financial Services](https://support.google.com/googleplay/android-developer/answer/9876821)
- OWASP MASVS (mobile app verification standard) has eight control groups: Storage, Crypto, Auth, Network, Platform, Code, Resilience, Privacy. Level/profile detail was not in the fetched part. FACT — [OWASP MAS, MASVS](https://mas.owasp.org/MASVS/)
- Azerbaijan: secondary summaries state that cross-border transfer of personal data is permitted if it does not jeopardise national security and the receiving jurisdiction gives equivalent protection, otherwise with the person's consent; collection, processing and cross-border transfer generally need written consent; personal-data information systems must be registered (the responsible ministry/agency is unclear and may be outdated). I found NO explicit data-localisation mandate in the sources checked. SECONDARY — [Chambers Investing In 2026](https://gpg-pdf.chambers.com/investing-in-2026/47/) and [DataGuidance overview](https://www.dataguidance.com/notes/azerbaijan-data-protection-overview) (as reported by search summary; full text not read). The statute text itself was listed at [family.gov.az (Word file)](https://www.family.gov.az/store/media/NewFolder/Law%20of%20the%20Republic%20of%20Azerbaijan%20%20On%20personal%20data.doc) but not read.
- Azerbaijan e-invoicing (relevant to any invoice feature): invoices are issued through the State Tax Service portal with an enhanced electronic signature (e.g. Asan Imza) or offline software; whether simplified-tax businesses must issue them is stated inconsistently across secondary sources. SECONDARY — [taxes.gov.az, Elektron qaime-faktura](https://taxes.gov.az/en/page/elektron-qaime-faktura), [VATcalc](https://www.vatcalc.com/azerbaijan/azerbaijan-efp-e-invoicing/)

### Inferences
- INFERENCE: an in-app invoice generator in Azerbaijan could be mistaken for a legally valid tax invoice; unless it integrates with the tax portal it must be labelled clearly as an internal document. This needs legal and tax-adviser review.
- INFERENCE: option C would require, at minimum, a privacy policy, deletion flow, user consent text in three languages, breach-notification procedure, access logging, encrypted backups, tested restores and a dependency/secret-management routine; a penetration test or at least an external security review before holding other people's financial data is prudent (cost not researched).
- INFERENCE: option B (local only, no account) avoids the account-deletion rules and cross-border-transfer questions entirely, as long as no data is sent to a server.

### Gaps
- Apple Privacy Nutrition Labels, Google Data safety for finance apps specifics, GDPR articles, OWASP ASVS: not fetched.
- Azerbaijani statute text, the current registration authority, and whether hosting abroad is allowed in practice: unverified; requires an Azerbaijani lawyer.
- Pen-test and incident-response cost benchmarks: no reliable source found.

## 5. Operating a service as a solo maintainer

### Takeaway
No source in this pass quantifies support burden or incident cost, so this section is reasoning only. The responsible promise for a solo, non-programmer owner is narrow: local-first with user-held backups. A cloud service carries obligations (uptime, restores, security response) that are hard to meet without a second technical person.

### Cited Findings
- PocketBase's own FAQ says there are no promises for maintenance or support and no built-in disaster recovery, i.e. even the tool's author does not offer a safety net for self-hosting. FACT — [PocketBase FAQ](https://pocketbase.io/faq/)
- Supabase and PowerSync free tiers deactivate/pause after about a week of inactivity, so a production service cannot run on free plans. FACT — [Supabase pricing](https://supabase.com/pricing), [PowerSync pricing](https://www.powersync.com/pricing)

### Inferences
- INFERENCE: a cloud workspace means someone is on call for: lost-password and lost-phone recovery, "who restores my data" requests, accountant access disputes, deletion requests, store-review rejections, and vendor price or policy changes. Money data raises the stakes of every error.
- INFERENCE: a responsible solo promise is "your data lives on your device; we cannot see or restore it; use the backup button", with no SLA. Anything with an SLA needs monitoring, tested restores and a named backup person.
- INFERENCE: cost of a security incident (legal, notification, reputation) cannot be priced from the sources collected; treat as the largest unbounded risk of option C.

### Gaps
- No data on support ticket rates per MAU, SLA norms for small SaaS, or incident-cost studies.

## 6. Build / buy / partner / companion options

### Takeaway
Evidence gathered here is thin: I could not retrieve licences or hosting terms for Akaunting, Invoice Ninja, ERPNext or Odoo Community. On principle, the cheapest evidence-supported route is a "companion" approach: let users export clean accountant-ready files from the personal app, instead of building or hosting accounting.

### Cited Findings
- Azerbaijan-specific: legally valid e-invoices go through the tax portal with electronic signature, which a generic foreign open-source accounting product will not do out of the box (SECONDARY, see section 4) — [taxes.gov.az](https://taxes.gov.az/en/page/elektron-qaime-faktura)

### Inferences
- INFERENCE (not sourced): embedding or hosting an open-source accounting product would mean running a PHP/Python server (Akaunting, Invoice Ninja, ERPNext) with its own updates and security patching, plus checking each project's licence for commercial/white-label use; that is more operational work than building Business Lite.
- INFERENCE: Google Sheets/Drive sync would remove the need for a server but needs OAuth (store review, Google verification for Drive scopes) and gives weak guarantees against two people editing simultaneously; good for "send a copy to my accountant", poor as the live multi-user ledger.
- INFERENCE: companion order of value for effort: (1) CSV/XLSX accountant package with attachments ZIP, (2) bank-statement CSV import with duplicate detection (reuses existing import validation), (3) optional read-only report PDF; all keep data local.

### Gaps
- Licences, pricing and white-label terms for Akaunting, Invoice Ninja, ERPNext, Odoo Community; Zapier-style integration costs; Azerbaijani accounting products used by small firms: not researched (the Invoice Ninja page fetch returned empty content).

## 7. Effort estimates and risk to the 20 November 2026 personal release

### Takeaway
All figures here are INFERENCE with stated assumptions, not sourced benchmarks. Option B is a multi-week project that should start only after the personal release; option C is an order of magnitude larger and changes the nature of the product and the maintainer's obligations.

### Cited Findings
- No sourced effort data. The cost and policy facts from sections 3-4 are the only external inputs.

### Inferences
- INFERENCE, assumptions: one AI-assisted developer-equivalent working with a non-programmer owner; existing React/Capacitor skills and test culture; Business Lite in three languages; no accounting-law sign-off included.
- INFERENCE, Option B "Business Lite" (single user, local, separate store, invoices with partial payments, accounts and transfers, owner capital/draws, CSV/XLSX accountant package, attachments, backup/restore, invariant tests, 3-language UI): about 10-16 person-weeks. Roughly 3-4 weeks for data model plus invariants and tests, 2-3 for IndexedDB storage and backup with attachments, 2-3 for UI in three languages, 2-3 for export package and import validation, 1-3 for hardening and real-device testing. The wide range reflects the unknown Android WebView storage behaviour.
- INFERENCE, a thinner "B-minus" (income/expense tagged with a business profile in a separate store, CSV export only, no invoices): about 4-6 person-weeks.
- INFERENCE, Option C (cloud multi-user): about 30-50 person-weeks to reach a defensible first release (auth, tenant isolation with RLS tests, roles and invitations, sync/offline conflict handling, audit log, file storage, account deletion flows, privacy/legal work, monitoring, backup/restore drills, security review), plus permanent operations load.
- INFERENCE, Option D: not estimated; no evidence supports a solo maintainer building it, consistent with the brief's "not recommended".
- INFERENCE, risk to 20 Nov 2026: starting B or C before release competes directly with the remaining personal-release verification and the 22 days left; any shared code change (storage, backup format, localization strings) risks regressions in `expense_ledger_v5` handling. Lowest-risk path: option A (research only) until the personal release ships, then B-minus or B as a separate, flagged module with its own storage key and backup type.
- INFERENCE, comparative summary (effort / ongoing cost / main risk): A = ~0 / $0 / lost time-to-market; B-minus = 4-6 wk / $0 infra / limited value; B = 10-16 wk / $0 infra, store-listing and support effort / Android storage and export correctness; C = 30-50 wk / from $25-$49 per month for infrastructure plus unbounded operations / security, legal, availability; D = not credible.

### Gaps
- No real-user demand evidence for business mode among Azerbaijani micro-businesses was gathered in this pass; effort is meaningless without a validated feature list.
- All estimates need recalibrating after a one-week spike on IndexedDB storage and the accountant export on a real device.
