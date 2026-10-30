# Azerbaijan accounting / tax / invoice / NKA / payroll / open-banking / personal-data feasibility for an optional "business mode" (as of 28 Oct 2026)

Scope note: NOT legal or tax advice. Nothing here claims any product is compliant. Labels: OFFICIAL (State Tax Service / CBAR / law text), SECONDARY (law firm, media, advisory), INFERENCE, NOT ASSESSED. Access date for all URLs: 28 Oct 2026 (this research session). This pass used about 20 tool calls; many primary PDFs (Tax Code, Personal Data Law, CBAR Open Banking Manual) were NOT opened in full, so article numbers below are only as good as the quoted secondary extracts.

## 1. E-qaimə (statutory electronic tax invoice): who issues, how, API/integrator route

### Takeaway
Statutory e-qaimə is issued only inside the State Tax Service's own system (e-taxes.gov.az, "e-TAI" section) by VAT-registered taxpayers and other listed persons, signed with an enhanced e-signature (ASAN İmza / e-signature). A PDF produced by a third-party app is not an e-qaimə. No public REST API or accredited-integrator programme was found; the only official automation hint is an XML format for "internal information systems" (see Gaps).

### Cited Findings
- OFFICIAL: Obligation covers entities registered for VAT and persons listed in Tax Code Art. 218.1.2, from 01/04/2017, for goods/works/services in entrepreneurial activity. — [taxes.gov.az e-qaimə page](https://taxes.gov.az/en/page/elektron-qaime-faktura) (page undated; fetched 28 Oct 2026)
- OFFICIAL: Online mode: log in to e-taxes.gov.az with an enhanced electronic signature tool, "Online clerical work and e-TAI" > "E-invoice", compose and send to another taxpayer. Offline mode: download the eFP software, compose/package without internet, sign the package with Asan DOC / e-Signer / ASANDOC portal, upload the signed "adoc"/"edoc" file via "Send package". The page says offline mode is mainly for large taxpayers. System assigns serial numbers and emails them. — same page
- OFFICIAL: The page did not describe XML specs, API/integration options, certification of integrators, or penalties; it refers to e-taxes.gov.az/help/#eqf01 and the call centre 195-1. — same page
- SECONDARY: Summaries state invoice timing: generally within 5 days of the supply, with special timing for international carriage, regular services (start of the month) and advances (on receipt of payment); article on Law No. 297-VIIQD of 9 Dec 2025, effective mostly 1 Jan 2026. — [Bureau 28a via Legal 500, 4 Feb 2026](https://www.legal500.com/intelligence/azerbaijan/tax/2026-tax-update-highlights)
- SECONDARY: A search-result summary (EDICOM / Voxel-type compliance vendor pages) says the invoice format is XML with a mandatory digital signature, and that vendors (e.g. Microsoft Dynamics 365 BC localisation) advertise "synchronisation" with Azerbaijani e-invoicing. Not verified against an official spec. — [EDICOM](https://edicomgroup.com/electronic-invoicing/azerbaijan), [e-invoice.app (aggregator, mentions "or via API", unverified)](https://www.e-invoice.app/country/AZ)
- Start-date conflict: sources variously give 2017 or 2018 (VAT e-invoices vs all taxpayers) — the official page gives 01/04/2017 for the VAT group; treat other dates as unverified. — [taxes.gov.az](https://taxes.gov.az/en/page/elektron-qaime-faktura)

### Inferences
- INFERENCE: A local-first app can at most (a) keep an internal sale record, (b) produce a clearly labelled "commercial/proforma invoice (not an e-qaimə)", (c) export data for manual keying/upload. Anything claiming "issued e-qaimə" would need a verified integration, which was not found.
- INFERENCE: Because signing needs the user's own ASAN İmza/e-signature credentials, an on-device app would not hold or use them; an integration would need user-delegated signing and STS acceptance. NOT ASSESSED.
- INFERENCE: Sole entrepreneurs on simplified tax who are not VAT-registered may fall outside the VAT-based obligation, but whether Art. 218.1.2 persons include them must be confirmed by an accountant.

### Gaps
- Whether a public e-invoice API/XML submission channel and an integrator accreditation (cost, certification) exist: not found; official page silent. Ask STS (195-1) / check e-taxes.gov.az/help.
- Penalty for failing to issue / issuing non-statutory invoices: not found on the e-qaimə page (see section 9 for the cash-register penalty page).
- ASAN İmza / Mobile ID cost and third-party use terms (asan.gov.az, kobia.gov.az): NOT ASSESSED.

## 2. Control cash register (NKA), POS terminals, e-kassa: who must use, third-party software integration

### Takeaway
Retail and public catering cash settlements must use a certified cash register connected to the STS in real time (Tax Code Art. 16.1.8); POS terminals are mandatory for defined groups including all VAT payers. Fines AZN 1,000 / 3,000 / 6,000 per calendar-year occurrence. A personal-finance app cannot be, and must not imply it is, a fiscal device.

### Cited Findings
- OFFICIAL (RU page, no date): Art. 16.1.8 requires certified cash register connected in real time for cash settlements in retail/public catering; exemptions include newspapers/magazines (>50% of turnover), farm produce at markets/fairs, mobile trade from vehicles, securities/lottery tickets, and utilities. — [taxes.gov.az RU sanctions page](https://www.taxes.gov.az/ru/page/nka-ve-pos-terminaldan-istifadeden-yayinmaya-gore-tetbiq-olunan-maliyye-sanksiyalari)
- OFFICIAL: POS criteria per Cabinet of Ministers Decree No. 219 (4 Oct 2012): all VAT payers from VAT registration regardless of turnover; listed sectors (car/furniture dealers, sports/wellness, healthcare, entertainment, hotels, wedding venues, fuel stations, ticket sales, travel agencies); businesses above AZN 2,000 average monthly turnover; legal-entity/sole-proprietor taxis; state fee-collecting bodies. — same page
- OFFICIAL: Fines per calendar year for cash settlement without a cash register/strict forms, no receipt, understated receipt, late POS installation or refusing cashless payment where POS is installed: 1st AZN 1,000; 2nd AZN 3,000; 3rd+ AZN 6,000. — same page
- OFFICIAL: Existence of an STS "e-kassa" monitoring system, state register of approved devices/operators at e-kassa.gov.az, and a 2026 STS booklet on operating online cash registers (not opened). — [STS booklet](https://taxes.gov.az/uploads/2026/buklet/1_14.pdf), [STS e-cash register brochure](https://taxes.gov.az/uploads/2024/eng/Bifold-eCASHREGISTER.pdf), [STS 2019 training deck](https://tedris.taxes.gov.az/assets/upload/files/E-kassa%2009.01.2019%20-%20EN.pdf) (search-snippet level only)
- OFFICIAL (2019, dated): software cash register requirements included transmitting transaction data to the monitoring system, user identification/PIN, fixed serial number, hardware token. May be outdated. — same 2019 deck
- SECONDARY: 2026 amendment counts POS (cashless) turnover at coefficient 0.5 for threshold and simplified-tax purposes. — [Legal 500 / Bureau 28a](https://www.legal500.com/intelligence/azerbaijan/tax/2026-tax-update-highlights)
- SECONDARY: Local ERP/retail vendors advertise "e-kassa integration" (AKINSOFT/Omnitech/NBA e-cash), implying vendor-integrated, certified devices/operators. — [AKINSOFT](https://www.akinsoft.com/other-solutions/omnitech-e-kassa.php)

### Inferences
- INFERENCE: Integration route is via approved e-kassa operators/devices on the state register, not via arbitrary apps. A "virtual NKA" category was NOT found for Azerbaijan; do not assume one exists.
- INFERENCE: The app may record daily takings or import a cash-register report, never issue fiscal receipts.

### Gaps
- Certification procedure, fees, and operator list for software/cloud cash registers: not obtained (e-kassa.gov.az not opened).
- Whether the 2019 software-register requirements are still current: NOT ASSESSED.

## 3. Tax filing and simplified-tax regimes (2026): rates, thresholds, bookkeeping duties

### Takeaway
Simplified tax is commonly reported as 2% of gross revenue for non-VAT-registered small business with revenue up to AZN 200,000 over 12 months, with different treatment for catering and, from 2026, POS-weighted revenue and a 3-year 6% rate for some cash/POS services. The sources are secondary or conflicting; official rate and threshold pages were not confirmed.

### Cited Findings
- SECONDARY: Simplified tax regime for non-VAT-registered entities/sole entrepreneurs with gross revenue not above AZN 200,000 in any consecutive 12 months; general rate 2%; catering above the threshold 8%; VAT standard rate 18%. — [PwC Tax Summaries, corporate](https://taxsummaries.pwc.com/azerbaijan/corporate/taxes-on-corporate-income) (via search extract; page text not fully read)
- SECONDARY: VAT registration mandatory when taxable volume exceeds AZN 200,000 in any month of a 12-month period (Art. 157 per summary). — [ACON](https://acon.az/?p=8949), [PwC](https://taxsummaries.pwc.com/azerbaijan/corporate/taxes-on-corporate-income)
- SECONDARY: From 2026 the effective VAT threshold for cashless retail/public-service businesses is reported as AZN 400,000 (50% weighting of POS turnover), cash-only stays AZN 200,000; effective date and law reference not stated by the source. — [VATupdate, 2 Jan 2026 (citing Orbitax)](https://www.vatupdate.com/2026/01/02/azerbaijan-increases-effective-vat-registration-threshold-for-cashless-transactions/); consistent with POS 0.5 coefficient in [Legal 500](https://www.legal500.com/intelligence/azerbaijan/tax/2026-tax-update-highlights)
- SECONDARY (single snippet, UNVERIFIED): a reduced 6% simplified rate (instead of 8%) for services paid in cash and via POS, 3 years from 1 Jan 2026. — PwC search snippet; needs primary confirmation.
- OFFICIAL/SECONDARY: Payroll income tax from 1 Jan 2026 (see section 5) – the amendment law is No. 297-VIIQD of 9 Dec 2025. — [Legal 500](https://www.legal500.com/intelligence/azerbaijan/tax/2026-tax-update-highlights)
- Older rates (4%, 6-8%) appear in outdated sources; ignore. — [IOTA](https://www.iota-tax.org/news/tax-legislation-significantly-amended-in-azerbaijan)
- Bookkeeping: Law on Accounting applies to all entrepreneurial subjects with or without legal-entity status; small-business subjects file annual financial reports by 15 March (Art. 34(4)). — [legalacts.az (unofficial English translation, original 28.10.2008; shows amendments only to 2002 so likely outdated)](https://legalacts.az/en/document/88/64280)
- Not found: the specific records a sole entrepreneur on simplified tax must keep (income book, etc.) and filing calendar for 2026. Tax Code 16.1.7 requires keeping accounting books and tax documents for the period stipulated by legislation. — [taxes.gov.az Tax Code (English PDF, 2015)](https://www.taxes.gov.az/uploads/qanun/2015/vergi_mecellesi_eng.pdf), per search extract

### Inferences
- INFERENCE: Thresholds interact with POS weighting; the app cannot safely compute "which regime am I in" without legal confirmation. A "threshold tracker" should be informational only.
- INFERENCE: The owner's CBAR/ChatGPT-cited STS page "biznese-nece-baslamali" and the Tax Code PDF were not opened here; ChatGPT claims from them are unverified by this pass.

### Gaps
- Official 2026 simplified-tax table (rates by activity, Art. 220-ish), registration through "e-taxes" and filing frequency: NOT ASSESSED.
- Announced 2026-2028 changes beyond payroll PIT phase-in: NOT ASSESSED.

## 4. Statutory accounting and record retention

### Takeaway
The "five-year rule" the owner referenced was NOT confirmed as a general retention rule. The Tax Code (16.1.7) points to retention periods set elsewhere; the Law on Accounting defers retention periods to an archive authority and fixes only five years for accounting-policy records. Electronic records are allowed.

### Cited Findings
- OFFICIAL text (unofficial EN translation): Accounting Law Art. 17(1): enterprises keep primary documents, registers and reports; retention period set by the state archive authority. Art. 17(2): accounting policy/coding/software documentation kept at least five years. Art. 12(1): documents may be hard copy or electronic carriers. — [legalacts.az](https://legalacts.az/en/document/88/64280) (translation may predate later amendments)
- OFFICIAL: Tax Code 16.1.7 obliges taxpayers to keep books and documents for the period stipulated by legislation. — [Tax Code EN PDF 2015](https://www.taxes.gov.az/uploads/qanun/2015/vergi_mecellesi_eng.pdf) (search extract)
- OFFICIAL: Limitation: tax authorities can calculate/recalculate within 3 years after the period; five years for audits involving foreign-source income information. These are limitation periods, not retention periods. — Tax Code, per search extract
- OFFICIAL/SECONDARY: AML law imposes separate 5-year record keeping after relationship ends (applies to obliged entities, probably not to a bookkeeping app user). — [Tax Code/AML PDF listing](https://www.taxes.gov.az/uploads/2022/qeydiyyat/1-CY.pdf) (search extract only)

### Inferences
- INFERENCE: Safe product behaviour: never auto-delete business records; offer full export (CSV/JSON + attachments); show an edit/void audit trail rather than silent overwrite; avoid stating "keep for N years" except as "ask your accountant; typically archive-authority schedules apply".
- INFERENCE: A local-first app with user-controlled storage places retention/backup responsibility on the user; app must say so.

### Gaps
- Current archive-authority retention schedule (likely 5-10+ years by document type): NOT ASSESSED. Accounting Law may have been replaced/amended after 2008 text; verify on e-qanun.az.
- Immutability expectations (are electronic books acceptable, is audit trail required?): NOT ASSESSED.

## 5. Payroll, DSMF, medical and unemployment contributions

### Takeaway
2026 reform changed income tax and medical insurance; PwC (last reviewed 28 Sep 2026) and Legal 500 agree on brackets. Official STS/DSMF pages were not opened, so treat as SECONDARY and always show "verify" in-app.

### Cited Findings
- SECONDARY (PwC, reviewed 28 Sep 2026): Non-oil/gas private-sector payroll income tax from 1 Jan 2026: up to AZN 2,500 monthly 3% (scheduled 5% in 2027, 7% from 2028); 2,501-8,000: AZN 75 + 10% above 2,500; above 8,000: AZN 625 + 14% above 8,000. The seven-year preferential regime ends. — [PwC Individual – Significant developments](https://taxsummaries.pwc.com/azerbaijan/individual/significant-developments)
- SECONDARY: Social insurance (DSMF) up to AZN 8,000: employee 3% on first AZN 200 + 10% above; employer 22% on first 200 + 15% above; above AZN 8,000 combined rate 25% to 21% (10% employee, 11% employer). — PwC (same) and [Mercans alert Dec 2025](https://mercans.com/wp-content/uploads/2025/12/Azerbaijan_Changes-in-Tax-rate-and-social-Security-Rates_Jan-2026.pdf)
- SECONDARY: Mandatory health insurance: threshold moved from AZN 8,000 to AZN 2,500; above it combined 1% split equally; formula (salary - 2,500) x 0.5% + AZN 50 per PwC. — PwC (same)
- SECONDARY: Unemployment insurance unchanged, total 1% (0.5% each per [Cloudpay](https://www.cloudpay.com/?p=12077)). Older guidance listing 2% + 2% medical on first 8,000 predates 2026.
- Conflict: CountryTaxCalc gives 14%/25% income-tax bands and a 3% social contribution above AZN 8,000 that match neither PwC nor Mercans; do not use. — [CountryTaxCalc](https://www.countrytaxcalc.com/tax-guides/countries/azerbaijan/)
- SECONDARY: Employer social-insurance state subsidies for non-oil private employers (phasing down to 2032) and an unrelated Nakhchivan regime exist; not modelled. — [Mercans EOR](https://mercans.com/employer-of-record/azerbaijan/)
- SECONDARY: Legal 500 article shows a 2026-07 law (No. 445-VIIQD, 13 Jul 2026) on VAT deposit funds being redirected to the social fund from 1 Jan 2027; only a teaser seen. — [Legal 500](https://www.legal500.com/intelligence/azerbaijan/tax/2026-tax-update-highlights)

### Inferences
- INFERENCE: Exact net-pay calculation depends on sector (oil/gas/state vs private), minimum/maximum bases, subsidies, deductions, and rounding; a calculator is an "estimate" feature at best. Employees of sole entrepreneurs, and the entrepreneur's own mandatory social contributions (Bloomberg Tax headline about a proposal on entrepreneur premium rates exists but was not read), are NOT ASSESSED.

### Gaps
- Official rates on dsmf.gov.az / taxes.gov.az and the unemployment 2026 text; rounding rules; payroll reporting formats and filing channel (e-taxes monthly declarations): NOT ASSESSED.

## 6. Open Banking for business accounts

### Takeaway
CBAR launched the National Open Banking platform on 6 Oct 2025, with Account Information (AIS) and Payment Initiation (PIS) services. Birbank shows consumer-side aggregation of other banks' accounts (90-day history, read-only). Business-account scope, TPP registration rules, costs and live banks list were NOT verified.

### Cited Findings
- SECONDARY: Initial phase launched 6 Oct 2025; implementation "still in early stages"; part of the Financial Sector Development Strategy 2024-2026. — [Salt Edge, Mar 2026](https://blog.saltedge.com/open-banking-in-azerbaijan-workshop/)
- OFFICIAL: CBAR fintech site (announced 3 Sep 2025) lists Open Banking concept, AIS, PIS and an implementation roadmap; no participant rules in the page read. — [CBAR press release 5245](https://www.cbar.az/press-release-5245/central-bank-launches-new-digital-platforms)
- SECONDARY (media quoting CBAR): connecting to the account information service only requires registration; foreign institutions may join if they meet requirements/licence; several banks already offer open banking in apps, mainly account/transaction information. — [Report.az](https://report.az/en/finance/cba-foreign-organizations-may-join-open-banking-in-azerbaijan) (page returned 403 on direct fetch; content from search summary only, so re-verify)
- OFFICIAL (bank): Birbank lets users link other banks' accounts; 90 days of transactions; read-only ("making transfers, payments... not supported"); deposits/loans not yet; undated; business accounts not mentioned. — [Birbank news](https://birbank.az/en/news/a-new-era-of-digital-banking-monitor-all-your-banking-transactions-in-birbank)
- OFFICIAL: CBAR publishes technical requirements for network channels between payment service providers for PIS/AIS. — [CBAR PDF](https://uploads.cbar.az/assets/Requirements%20for%20network%20channels%20used%20between%20payment%20service%20providers%20for%20providing%20payment%20initiation%20and%20account%20information%20services.pdf) (only snippet read)
- Claim of "13+ banks integrated" is from an aggregator; unverified.

### Inferences
- INFERENCE: A PWA could be a registered AISP only after CBAR registration plus security requirements; likely the practical near-term route is bank-side exports (CSV/statements) that the user imports. Yelo not assessed.

### Gaps
- April 2025 Open Banking Manual text, TPP registration/licence conditions, fees, business-account coverage, bank list: NOT ASSESSED (Manual not found).

## 7. Personal data and cloud vs on-device

### Takeaway
The 2010 Law on Personal Data creates owner/operator duties and cross-border transfer conditions; no data-localisation mandate was found in this pass. On-device-only storage reduces but does not remove duties for business data about customers/employees. Exact registration thresholds are unconfirmed.

### Cited Findings
- SECONDARY (DataGuidance via search): state registration of personal-data information systems under the Rules approved by Cabinet Decree No. 149 (17 Aug 2010). Which systems must register was not stated. — [DataGuidance Azerbaijan](https://www.dataguidance.com/notes/azerbaijan-data-protection-overview)
- SECONDARY (Chambers 2026 guide via search): cross-border transfers permitted if national security not endangered and recipient jurisdiction ensures equivalent protection; otherwise with data-subject consent or to protect life/health. — [Chambers Investing in 2026](https://gpg-pdf.chambers.com/investing-in-2026/47/)
- SECONDARY (law firm, reviewed 27 Aug 2026): consent should be clear and specific; owners/operators must protect data from collection; no article numbers, penalties or localisation discussed. — [ACON](https://acon.az/data-protection-in-azerbaijan)
- Law text copy: [family.gov.az .doc copy](https://www.family.gov.az/store/media/NewFolder/Law%20of%20the%20Republic%20of%20Azerbaijan%20%20On%20personal%20data.doc); owner-cited official source [e-qanun.az 19675](https://e-qanun.az/framework/19675) – neither opened in full.
- Compliance-vendor pages (theartofservice) were treated as unreliable.

### Inferences
- INFERENCE: Cloud sync/backup of customer or employee data would likely trigger operator duties, possible information-system registration, and cross-border analysis (server location). Local-only keeps data under the user's control; the user, not the app vendor, is then the operator. Needs lawyer confirmation. Other laws (e.g., bank/tax secrecy, AML for financial institutions) NOT ASSESSED.

### Gaps
- Registration thresholds/exemptions, fines, localisation rules in related laws (e.g., information security/e-commerce laws): NOT ASSESSED.

## 8. Penalties / claims to avoid (misrepresentation)

### Takeaway
Only the cash register/POS fines were confirmed (AZN 1,000/3,000/6,000). No source quantified penalties for passing off a PDF as e-qaimə or for "tax-compliant" software claims; the risk is mostly the user's (tax/reporting) plus consumer-protection/misleading-advertising and contract liability for the vendor (INFERENCE).

### Cited Findings
- OFFICIAL: Fines for missing cash register/receipts/POS per section 2. — [taxes.gov.az](https://www.taxes.gov.az/ru/page/nka-ve-pos-terminaldan-istifadeden-yayinmaya-gore-tetbiq-olunan-maliyye-sanksiyalari)
- OFFICIAL: e-qaimə page lists no penalties. — [taxes.gov.az](https://taxes.gov.az/en/page/elektron-qaime-faktura)

### Inferences
- INFERENCE: Claims to avoid: "e-qaimə", "tax compliant / STS-approved / certified", "fiscal receipt", "NKA", "files taxes for you", "official accounting records", "guaranteed correct payroll", "bank-connected" (unless true). Allowed framing: "internal records", "estimates", "export for your accountant", with a visible disclaimer and per-feature "not an official document" label on every exported invoice.
- INFERENCE: Wrong-regime or wrong-threshold advice presented as fact creates financial harm for users; keep calculators as editable, sourced, dated parameters.

### Gaps
- Tax Code penalties for non-issuance of e-qaimə and for false documents; misleading-advertising law: NOT ASSESSED.

## 9. Segmentation of the nine areas (feasibility summary)

### Takeaway
Feasible honestly: (1) internal records, commercial invoices labelled non-official, exports, estimates, reminders of thresholds. Not feasible without partner/licence/certification: (2) e-qaimə issuing, (3) fiscal receipts, (7) payment processing, (8) AISP; (4)/(5)/(6) only as clearly-marked estimates.

### Cited Findings
- Per section: (2) STS portal + e-signature only; no public API found. (3) certified registers on STS register. (4) regime thresholds secondary-sourced. (5) Accounting Law covers all entrepreneurs; annual small-business report by 15 March (translation, dated). (6) rates SECONDARY. (7) payment processing: NOT ASSESSED, no source read (CBAR Law on Payment Services and Payment Systems is mentioned in an Azerbaijani analysis only: [afj.org.ua PDF](https://afj.org.ua/storage/pdf/1100-rozvitok-vidkritogo-bankingu-ta-analiz-storonnih-postachalnikiv-v-azerbaijani.pdf)). (8) AISP registration unverified. (9) retention/personal data see sections 4 and 7.

### Inferences
- INFERENCE: Recommended minimal business mode: income/expense with business tag, VAT-free "invoice/quote" PDF stamped "Commercial document - not an e-qaimə", customer list kept local, threshold tracker (informational), export to accountant, payroll estimate clearly "estimate". Validate demand with local small businesses before building more.

### Gaps
- Commercial demand evidence: none gathered; this note is regulatory only.

## 10. Questions for a qualified Azerbaijani accountant / lawyer (ready to send)

### Takeaway
Ten questions below are the minimum before any public business-mode claim.

### Cited Findings
- (Questions, no sources needed; they derive from gaps above.)
1. Which of our intended users (sole entrepreneur on simplified tax, VAT payer, LLC) must issue e-qaimə, and is a non-VAT sole entrepreneur obliged under Tax Code Art. 218.1.2?
2. Does the STS offer any public API, XML submission channel or integrator accreditation for third-party software? What are the conditions, fees and liability?
3. If our app generates a PDF invoice for a non-obliged business, what wording is legally safe so it is not mistaken for an e-qaimə or a fiscal receipt?
4. Current official 2026 simplified-tax rates, thresholds, POS 0.5 coefficient, catering rules and the 6% three-year rate: which legal acts apply and from which dates?
5. What records must a sole entrepreneur (simplified vs general regime) keep, in what form (electronic acceptable? audit trail?), and for how many years (archive authority schedule)?
6. May a simple income/expense log kept by the entrepreneur in an app serve as the statutory record, or is it only auxiliary?
7. Correct 2026 payroll formulas (income tax, DSMF, medical, unemployment, minimum/maximum bases, sector exceptions, subsidies, rounding) and can an app present them as estimates with a disclaimer?
8. For CBAR Open Banking: what registration/licence does an account-information provider need, are business accounts in scope, what costs and security audits apply, and which banks are live?
9. Personal Data Law: if the user stores customer/employee data only on their device, are we an operator? If we offer cloud backup/sync, do we need to register an information system, obtain consent, and notify on cross-border transfer? Is any localisation required?
10. What liability and advertising rules apply to describing the app as "for business", "accounting", "tax-ready" or similar, and what disclaimers are required in az/ru/en?

### Inferences
- INFERENCE: Ask for written answers with article citations, since several 2026 changes are only available via secondary summaries.

### Gaps
- Not applicable.
