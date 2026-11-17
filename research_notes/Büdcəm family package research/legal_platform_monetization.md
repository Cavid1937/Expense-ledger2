# Legal, privacy, platform and monetization requirements for a paid family/shared-budget feature (Azerbaijan first)

Research date: 17 November 2026. This is desk research, not legal or tax advice. Several sources are secondary or stale, and that is flagged throughout. Anything marked "lawyer" or "accountant" must be confirmed by a licensed Azerbaijani professional before launch.

Limits on method: about 22 web searches and fetches. I could not reach e-qanun.az article texts in this pass. No primary statute text was quoted article by article, and article numbers below come from secondary sources.

---

## 1. Azerbaijan: Law "On Personal Data" (2010, amended): consent, registration, transfers, rights, children

### Takeaway
A shared family budget turns a purely on-device app into one where personal data is collected, synced and shown to another person. That is the point where Azerbaijan's personal data law starts to bite.

Checklist (to confirm with a lawyer):
- Consent content: what the consent must name.
- Registration (possibly licensing) of a "personal data information system", with possible small-system exemptions.
- Cross-border transfer rules if the servers are abroad.
- Data-subject rights: know, correct, remove.
- A security duty.

The law itself is being rewritten. A new draft existed in October 2025, and whether it was adopted by November 2026 is unknown.

### Cited Findings
**The law and its versions**
- The law is dated 11 May 2010. DLA Piper's country page calls it the "Law on Personal Information". That page was last reviewed in 2022 and lists no amendment dates or article numbers. — [DLA Piper, Azerbaijan](https://www.dlapiperdataprotection.com/index.html?t=law&c=AZ)
- A secondary compliance summary says the law was amended in 2024 to cover processing, protection and cross-border transfer. It gives the latest amendment as Law No. 1193-VIQD of 28 June 2024. This is unverified against the official text. — [theartofservice compliance summary](https://compliance.theartofservice.com/frameworks/Azerbaijan%20Law%20on%20Personal%20Data%20(2010)), as surfaced via search; the official English text is hosted at [family.gov.az (.doc)](https://www.family.gov.az/store/media/NewFolder/Law%20of%20the%20Republic%20of%20Azerbaijan%20%20On%20personal%20data.doc)
- On 9 October 2025, the Electronic Security Service under the Ministry of Digital Development and Transport said it had drafted a new version of the Law on Protection of Personal Data, then under review. No law number or effective date was given. — [Report.az, 9 Oct 2025](https://report.az/en/ict/azerbaijan-updates-law-on-protection-of-personal-data)
- A January 2026 piece said new personal data legislation was expected to take effect "this year". I did not find the final text. — via search summary of [Azernews](https://www.azernews.az/nation/253605.html)

**Regulator**
- DLA Piper names the Ministry of Digital Development and Transport. — [DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=AZ)
- Caspian Legal Center names the Ministry of Transportation, Communication and High Technologies. Its article dates from 12 Feb 2021, and the page shows "updated 5 Nov 2026". — [Caspian Legal Center](https://www.caspianlegalcenter.az/insights/more/personal-data-azerbaijan)

**Registration**
- DLA Piper: personal data information systems must be registered with the data protection authority, and some exemptions exist. — [DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=AZ)
- Caspian Legal Center: such systems need a license and state registration. Exemptions include systems tied to state secrets, employment relationships, and systems set by the executive authority covering fewer than 1,000 subjects. This is the only source for the 1,000-subject exemption. — [Caspian Legal Center](https://www.caspianlegalcenter.az/insights/more/personal-data-azerbaijan)
- The two sources conflict: DLA Piper says registration only, Caspian says license plus registration.

**Consent**
- Consent may be given in writing or via the e-government portal. Valid consent must state:
  - the subject's identifying data
  - the owner/operator's identity
  - the purpose
  - the list of data
  - the processing operations
  - the validity period
  - the withdrawal terms
  - the deletion or archiving terms

  — [Caspian Legal Center](https://www.caspianlegalcenter.az/insights/more/personal-data-azerbaijan)
- Processing may rest on prior consent or on the data being "open". Transfers generally need prior written consent unless the data is open. — [DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=AZ)

**Special categories and other rules**
- Special categories include race or nationality, family life, religion and belief, health, and criminal conviction. — [DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=AZ)
- Biometric data is covered by the same rules. — [Caspian Legal Center](https://www.caspianlegalcenter.az/insights/more/personal-data-azerbaijan)
- Owners and operators must provide an adequate level of protection. DLA Piper reports no specific duty to notify a breach. — [DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=AZ)

**Data-subject rights**
- Subjects may learn who owns or operates their data, why, and what it contains. They may request removal or correction, learn which third parties access the data, and change the data's confidentiality status. — [Caspian Legal Center](https://www.caspianlegalcenter.az/insights/more/personal-data-azerbaijan)
- Subjects may claim material and moral damages through the courts. — [DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=AZ)

**Cross-border transfer**
- A secondary summary says transfers are allowed only where the receiving state provides adequate protection, subject to statutory conditions. The official translation defines a "transfrontier" transfer as moving data across the state border. — via search of [theartofservice](https://compliance.theartofservice.com/compare/azerbaijan-law-on-personal-data-2010-vs-gdpr) and [family.gov.az text](https://www.family.gov.az/store/media/NewFolder/Law%20of%20the%20Republic%20of%20Azerbaijan%20%20On%20personal%20data.doc)
- The sources disagree on the details, and I did not read the article itself.

**MyGov consent control**
- From 2026, citizens can use MyGov to restrict, time-limit or grant one-off access when private entities request their data. — [Report.az, 9 Oct 2025](https://api.report.az/en/ict/from-2026-azerbaijani-citizens-to-be-able-to-control-use-of-their-personal-data)

**Children, age verification (August 2026)**
- Amendments adopted 5 August 2026 bar people under 16 from creating accounts on "age-restricted social network platforms". The amendments also:
  - require age verification
  - require parental controls for ages 16 to 18
  - require age-verification data to be deleted after use

  They enter into force 12 months after publication, expected around 5 August 2027. — [GRATA International](https://gratanet.com/publications/new-regulatory-requirements-for-social-network-platforms-and-their-providers-in-azerbaijan)
- Conflict: a search summary described these as amendments to the personal data law. The GRATA text itself lists the information law, the Code of Administrative Offences and the law on protecting children from harmful information.

### Inferences
- Local-first with no account and no server is the lowest-risk position. Expense Ledger acts mostly as a tool, not an operator of a central personal data information system. A synced family space with an account and server storage most likely makes the owner an "owner/operator" of an information system, with the registration (or licence) question that follows. Treat this as a launch blocker to clear with a lawyer.
- If sync servers sit outside Azerbaijan (for example the Supabase or Google Drive setup already in the project), the cross-border transfer rules apply. Explicit written or electronic consent naming the purpose, the data, the retention period and the withdrawal terms is the safest basis.
- Family expense data can reveal special categories, such as health spending, religious donations or "family life". A shared budget should be treated as potentially sensitive.
- The MyGov consent system appears to cover access to state-held citizen data. It probably does not apply directly to data users type into an app. Not confirmed.
- The August 2026 under-16 rule targets social networks. A budgeting app is probably outside it, but a family plan that invites a 12-year-old still needs a children's-data and parental-consent design.
- "Ministry of Transportation, Communication and High Technologies" is most likely the older name of today's Ministry of Digital Development and Transport. Not confirmed.

### Gaps
- Primary article numbers from the current consolidated text on e-qanun.az were not retrieved:
  - consent
  - registration and licensing
  - cross-border transfer
  - deletion
- Whether a data-localisation requirement exists for private apps. No source confirmed or denied one.
- Whether the new data protection law drafted in 2025 was adopted in 2026, and what it changes. A lawyer is needed.
- The age of consent for children's data under the personal data law, and the parental consent rules. Not found.
- Penalty amounts under the Code of Administrative Offences. Not found.
- The exact registration procedure, cost and timing, and whether the 1,000-subject exemption is real and current.

---

## 2. Azerbaijan: e-commerce, consumer protection for subscriptions and free trials, bank data, CBAR licensing, tax

### Takeaway
Checklist:
- **CBAR licence:** a budgeting app that never moves money is likely outside payment-service licensing. However, Azerbaijan's payment services law defines "account information service" (online retrieval of payment-account information from providers) as a regulated payment service. Pulling balances from banks via API could trigger licensing. On-device reading of the user's own notifications or statements likely does not, but that is an inference for a lawyer to confirm.
- **VAT:** the new 2026 VAT regime for electronic services targets non-resident sellers. A seller resident in Azerbaijan needs domestic tax advice from an accountant.
- **Consumer law on trials and auto-renewal:** not researched successfully. See Gaps.

### Cited Findings
**Payment services law and the account information service (CBAR)**
- CBAR's English text of the Law on Payment Services and Payment Systems defines an "account information service" as an online service providing information on a user's payment accounts held with one or more providers. An account information service provider is a payment service provider. — [CBAR law text, Sep 2023 translation](https://uploads.cbar.az/assets/Law%20of%20the%20Republic%20of%20Azerbaijan%20on%20payment%20services%20and%20payment%20systems_Sep_2023_KR%20(002).pdf)
- CBAR network-channel requirements, made under Article 62.7 of the law, cover account information and payment initiation services. The account servicing provider must obtain the user's consent before a third party can provide account information services. — [CBAR requirements](https://uploads.cbar.az/assets/Requirements%20for%20network%20channels%20used%20between%20payment%20service%20providers%20for%20providing%20payment%20initiation%20and%20account%20information%20services.pdf)
- Secondary summaries say:
  - the law mandates licensing or registration for supervised entities
  - CBAR is the sole supervisor
  - payment institutions need AZN 300,000 entry capital

  — via search of [regalert.today](https://regalert.today/guides/fintech/AZ) and [Caspian Legal Center](https://www.caspianlegalcenter.az/news/more/payment-systems-law)
- Date conflict: Caspian says the law came into force on 10 Nov 2023, while regalert refers to a 2025 version. — same sources

**VAT on electronic services**
- Law No. 355-VIIQD amended Tax Code Article 33.8-1. Non-resident providers of electronic services to Azerbaijani consumers (B2C) must register and collect 18% VAT once their annual turnover exceeds the equivalent of USD 10,000. — [KPMG Tax News Flash, Mar 2026](https://kpmg.com/us/en/taxnewsflash/news/2026/03/azerbaijan-mandatory-vat-registration-nonresident-electronic-services.html); [vatcalc](https://www.vatcalc.com/azerbaijan/azerbaijan-vat-on-digital-services/)
- Date conflicts:
  - Start date: some sources give 23 August 2026, others 1 September 2026.
  - Adoption date: 13 Feb vs 23 Feb 2026.

  — [lookuptax](https://lookuptax.com/tax-changes/azerbaijan/nonresident-electronic-services-2026); [VATupdate](https://www.vatupdate.com/2026/03/06/azerbaijan-mandates-vat-registration-for-nonresident-digital-service-providers-effective-august-2026/)
- Unregistered non-residents remain under the Article 169 mechanism, where an Azerbaijani bank or payment provider withholds 18% at source. — [vatcalc](https://www.vatcalc.com/azerbaijan/azerbaijan-vat-on-digital-services/)
- Official tax-service page on taxation of the digital economy: [taxes.gov.az](https://taxes.gov.az/en/page/reqemsal-iqtisadiyyat-uzre-vergitutma) (not fetched)

### Inferences
- The current Expense Ledger approach is user-initiated, on-device parsing of bank push notifications, CSV or Excel statements. It does not connect to bank systems as a third-party provider, so it is likely not an "account information service". A future direct bank connection (open-banking API) almost certainly would be, and would require either a licence or a partnership with a licensed provider.
- A family plan that only shares budget records between members never touches money flows, so payment-services licensing should not apply. To be confirmed by a lawyer.
- If the owner sells as an Azerbaijani resident (an individual entrepreneur or LLC), the non-resident e-services regime is not the relevant one. Domestic income tax or the simplified tax and VAT thresholds apply instead.
- If sales go through Google Play, Google may act as the deemed seller for VAT in some countries. Whether it does so for Azerbaijan was not confirmed.

### Gaps
- Azerbaijani consumer protection and e-commerce rules on free-trial disclosure, auto-renewal consent, cancellation and refunds (Law on Electronic Commerce; Law on Consumer Rights Protection). No sources retrieved, so a lawyer is needed.
- Domestic tax treatment of a resident developer's Google Play payouts and web subscription income:
  - simplified tax
  - VAT registration threshold
  - currency-control reporting for USD payouts

  An accountant is needed.
- Whether Google collects and remits Azerbaijani VAT on Play sales. Not confirmed.
- Any specific rule on apps that read SMS or bank notifications under Azerbaijani law. Not found.

---

## 3. International users later: GDPR (family sharing, household exemption, joint controllers, children) and COPPA

### Takeaway
Not researched in this pass because of the call budget. Everything here is a gap.

### Cited Findings
- None retrieved in this session.

### Inferences
- Standard GDPR reasoning, unverified here:
  - The app provider offering the sync service is a controller (or processor) and cannot rely on the household exemption. The exemption protects family members acting privately, not the company.
  - Art. 8 sets the digital consent age between 13 and 16 depending on the member state.
  - COPPA applies if the service targets, or knowingly collects data from, US children under 13.

  Verify against the primary texts before use.

### Gaps
- GDPR Art. 2(2)(c) household exemption and Art. 26 joint controllership as applied to family-sharing apps (EDPB or CJEU guidance).
- GDPR Art. 8 member-state ages.
- COPPA applicability.

---

## 4. Google Play (and Apple briefly): financial apps, User Data, account deletion, subscriptions and trials, Play Billing, fees, Azerbaijani buyers

### Takeaway
Checklist for an Android family subscription:
- Complete the Financial features declaration. It is required for every app.
- Offer account deletion both in the app and via a web link, and delete the associated data. Deactivation is not enough.
- Sell the subscription through Play Billing. Azerbaijan is not an alternative-billing market.
- Disclose trial terms fully: trial length, what is charged, when, how to cancel.
- Provide an easy cancellation path.

The service fee for auto-renewing subscriptions in Azerbaijan is 15%. Azerbaijan supports merchant registration, with payouts in USD.

### Cited Findings
**Policy requirements**
- **Financial features declaration:** required for every app on a developer account, even those without financial features. It is completed on the App content page, with categories such as banking, lines of credit and financial advice. — [Play Console Help 13849271](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en); [Financial Services policy](https://support.google.com/googleplay/android-developer/answer/9876821?hl=en)
- **Account deletion:**
  - If an app lets users create accounts, deletion must be offered in-app and via a web resource.
  - Associated user data must be deleted.
  - Temporary deactivation does not count.
  - Regulated sectors may add flows to complete deletion requests.

  — [Play Console Help 13327111](https://support.google.com/googleplay/android-developer/answer/13327111)
- **Play Billing:** apps charging for in-app features, subscriptions or cloud services must use Play Billing unless Section 3, 8 or 9 applies.
  - Section 3 covers physical goods and similar exceptions.
  - Sections 8 and 9 cover alternative billing or external links in eligible countries only.

  Steering users to other payment methods is otherwise prohibited, in store listings, in-app promotions, webviews, buttons and links. — [Payments policy 9858738](https://support.google.com/googleplay/android-developer/answer/9858738)
- **Subscriptions policy:**
  - Disclose before enrolment: trial length, what is paid and when, whether and when the trial converts, and how to cancel.
  - Prohibited:
    - hiding the auto-charge behind "free"
    - partially localized terms
    - showing only the monthly-equivalent price for an annual plan
    - accidental-tap purchase flows
    - cancelling a subscription without the user's request
  - Apps must give an easy online cancellation method, such as a link to the Play Subscription Center.

  — [Subscriptions policy 9900533](https://support.google.com/googleplay/android-developer/answer/9900533)

**Fees**
- Outside Australia, the EEA, Japan, the UK and the US, auto-renewing subscriptions carry a 15% fee regardless of revenue. Other in-app products pay 15% on the first USD 1M per year and 30% above that.
- The 10% + 5% billing-fee structure applies only to the five listed markets, from 30 June 2026 in the EEA, UK and US and from 30 September 2026 in Australia and Japan.

— [Play service fees 112622](https://support.google.com/googleplay/android-developer/answer/112622)

**Azerbaijan on Play**
- Developer and merchant registration are both supported, with USD as the default payments-profile currency. — [Play Console Help 9306917](https://support.google.com/googleplay/android-developer/answer/9306917)
- Paid apps are available to users in Azerbaijan. — [Paid app availability](https://support.google.com/googleplay/answer/143779)
- Azerbaijan supports tax-inclusive pricing. — via search of [Play Console Help 138000](https://support.google.com/googleplay/android-developer/answer/138000)
- On Google Play, 31% of cancellations come from involuntary billing failures, against 14% on the App Store. — [RevenueCat 2026 benchmarks](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)

### Inferences
- A web (PWA) purchase made outside Play cannot be advertised or linked from inside the Android app in Azerbaijan. That would be steering. It also cannot be the only way to unlock a family plan in the Play build.
- A "buy on the web, sign in on Android" model needs careful reading of Google's rules. The Payments page fetched did not cover cross-platform entitlements, so this is not established.
- The 31% involuntary churn figure suggests many local buyers may hit card failures. A grace period and retry handling matter.
- The current backup-and-restore features may count as "accounts" once Google sign-in or sync exists. If so, the in-app plus web account-deletion requirement applies to the family feature.

### Gaps
- Which payment methods Azerbaijani buyers can use on Play: local Visa or Mastercard, carrier billing via Azercell, Bakcell or Nar, gift cards. Not confirmed. An Azercell "digital solutions" page appeared in search but was not opened.
- Whether Play allows pricing in AZN for buyers. Not confirmed.
- The Play policy on SMS and notification-listener permissions for finance apps.
- Families policy details for apps usable by children.
- Apple: App Store Review Guideline 3.1.1 (in-app purchase) and Family Sharing for auto-renewable subscriptions were not researched.

---

## 5. Web (PWA) payments in Azerbaijan: local gateways and international merchant-of-record providers

### Takeaway
At least one CBAR-licensed local gateway, Epoint, advertises recurring and saved-card payments, so web subscriptions in AZN look technically feasible. Fees and contract terms were not found. Stripe, Paddle and Lemon Squeezy availability for an Azerbaijani seller was not confirmed.

### Cited Findings
- Epoint is a Baku payment facilitator offering card acquiring, Apple Pay and Google Pay, and recurring payments. — [paymentproviders.io profile](https://paymentproviders.io/providers/epoint-az.md)
- Epoint received a fintech licence from the Central Bank (Epoint's own announcement). — [Epoint](https://monitoring.epoint.az/en/article/fintechlicense); [The Paypers](https://thepaypers.com/online-payments/epoint-obtains-fintech-licence-in-azerbaijan--1269910)
- Shopify-app vendor pages say Epoint supports recurring billing. These are marketing pages and secondary. — [CartDNA](https://cartdna.com/shopify-payment-methods/Epoint)

### Inferences
- A locally contracted gateway such as Epoint, Payriff or GoldenPay likely requires a registered Azerbaijani business (individual entrepreneur or LLC). Not confirmed.
- Recurring web billing creates the consumer-law questions in section 2: auto-renewal consent and cancellation.

### Gaps
- Commission rates and recurring-billing support for Epoint, Payriff, GoldenPay, Kapital Bank e-commerce and Pasha Pay. Not found.
- Stripe availability: Azerbaijan is believed not to be on Stripe's supported-country list, but this was not verified in this session.
- Paddle and Lemon Squeezy (merchant-of-record) seller eligibility for Azerbaijan. Not checked.

---

## 6. Monetization evidence: price points, willingness to pay, trial conversion, family-plan pricing

### Takeaway
Industry benchmarks are solid but global:
- Longer trials convert better: 42.5% median for 17 to 32 days, against 25.5% for under 4 days.
- Hard paywalls convert about 5 times better than freemium by day 35: 10.7% vs 2.1%.

CIS competitor prices are in the range of roughly 99 to 199 RUB per month, but the sources conflict. Büdcəm's price and any family-plan uplift pattern were not found.

### Cited Findings
**RevenueCat 2026 benchmarks (cross-category, 115,000+ apps, over USD 16B revenue)**
- Trial-to-paid median: 42.5% for 17 to 32-day trials, 25.5% for trials under 4 days.
- 46.5% of apps use trials under 4 days.
- 55.4% of 3-day trial cancellations happen on day 0.
- Day-35 conversion: 10.7% for hard paywalls (12.1% in 2025), 2.1% for freemium.
- Revenue per install at day 60: USD 3.09 for hard paywalls vs USD 0.38 for freemium.
- About 72% of annual subscribers cancel in year 1.

— [RevenueCat, Subscription app trends & benchmarks 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026); [State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)

**Finance category**
- Adapty 2026 benchmarks, as summarized second-hand: Finance & Budgeting has a 48% trial start rate and 56% trial-to-paid conversion. Not verified against Adapty's original. — [RocketShip HQ summary](https://www.rocketshiphq.com/?p=5390)

**CIS competitors (conflicting, aggregator data)**
- One comparison: Zenmoney from 99 RUB, CoinKeeper from 149 RUB. — [startpack.ru](https://startpack.ru/compare/zenmoney-vs-coinkeeper)
- Another: Zenmoney from 149 RUB per month, CoinKeeper from 199 RUB per month. — [toolfox.ru](https://toolfox.ru/services/s/zenmoney/alternatives)
- A buying guide mentions a CoinKeeper annual subscription at about 1,500 to 2,000 RUB, including a markup for paying from Russia. This is not an official price. — [DTF](https://dtf.ru/howto/5031989-kak-oplatit-coinkeeper-v-rossii)

### Inferences
- The default plan for Expense Ledger should be a freemium core (the free local app) with a paid family or sync tier. RevenueCat's data says freemium converts poorly (about 2%). Revenue will therefore depend on the family feature being clearly valuable, not on a paywall around basics.
- Büdcəm's 7-day trial falls in the middle of the trial-length range. RevenueCat's data suggests a 14 to 30-day trial for a family feature (it needs time to invite members) would likely convert better. This is correlation, not proof.
- With CIS prices of roughly 1.5 to 3 AZN per month equivalent, a family tier in Azerbaijan is likely to land in a low single-digit AZN monthly range. This is a hypothesis that needs owner or user validation.

### Gaps
- Büdcəm's family package price, member limit and permission model. Not found in search. Do not confuse it with the Turkish app "Bütçem". The competitor research note should cover this.
- Official current Zenmoney and CoinKeeper prices, family-plan pricing patterns (for example "+50% for family"), willingness-to-pay data for Azerbaijan or similar markets, and regional conversion differences. No sources found.

---

## 7. Liability: disclaimers, showing one member's data to another, divorce or separation requests

### Takeaway
Not researched with sources in this pass. The risks are clear in principle, and the design mitigations below are inference.

### Cited Findings
- Data subjects may claim material and moral damages through Azerbaijani courts. — [DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=AZ)
- Subjects have rights to know, correct and remove their data, and to know which third parties access it. — [Caspian Legal Center](https://www.caspianlegalcenter.az/insights/more/personal-data-azerbaijan)

### Inferences
- The highest privacy risk in a family plan is one member's entries or accounts becoming visible to others without that member's clear, revocable consent. This is especially serious if visibility is retroactive, covering records made before joining.
- Design mitigations:
  - per-member "shared vs private" by default
  - explicit consent naming what is shared
  - leaving the family keeps a copy of your own data and removes it from others' view
  - an owner cannot see private data
  - an audit of who changed what
- On separation, each member should be able to export their own data and leave. Joint entries need a defined rule: who keeps them, and whether copies are made. Requests to delete another person's data need a policy, and possibly legal advice.
- Typical disclaimers: the app is not financial, tax or legal advice; figures depend on user-entered data; no guarantee of accuracy of imported bank data.
- An Azerbaijani lawyer should review the terms of service and the privacy policy in az, ru and en.

### Gaps
- Sourced examples of disclaimers in Azerbaijani finance apps, court or regulator cases about shared-account privacy, and standard handling of separation data requests. Not researched.
