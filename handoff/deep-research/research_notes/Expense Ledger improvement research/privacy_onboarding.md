# Privacy policy and onboarding/install/data-loss education for Expense Ledger (local-first finance PWA)

Date of research: 2026-10-30. Not legal advice. Search tool is US-only and returned many secondary sources; items marked UNVERIFIED must be checked against primary text before relying on them. I made about 20 tool calls (slightly over the 15 guideline) and did not reach the official Azerbaijani statute text.

## Q1. Azerbaijan law and what legal framework applies to a local-only app

### Takeaway
Azerbaijan's Law on Personal Data (No. 998-IIIQ, 11 May 2010, last amended 28 June 2024 per one listing) is built around "owners" and "operators" of personal-data information systems, consent (reported as written), registration of information systems, and cross-border transfer conditions. I could NOT confirm from the primary text whether a purely local app with no server-side data is in scope or needs registration; that needs a local lawyer. GDPR's household exemption protects the individual user, not the software provider, but if the provider never receives or accesses the data the practical exposure is small (inference).

### Cited Findings
- Law is No. 998-IIIQ dated 11 May 2010; consolidated version reflects amendments up to 28.06.2024, latest amendment Law No. 1193-VIQD of 28 June 2024 — [ILO NATLEX via search result](https://natlex.ilo.org/dyn/natlex2/r/natlex/fe/details?p3_isn=86656) (seen only in search summary; the page itself was not fetched).
- Collection, processing and cross-border transmission of personal data reportedly require the subject's written consent, with exceptions (e.g., urgent protection of life/health) — [DataGuidance overview](https://www.dataguidance.com/notes/azerbaijan-data-protection-overview) (search snippet only; page paywalled).
- Cabinet of Ministers Decree No. 149 of 17 Aug 2010 sets rules for state registration/de-registration of personal-data information systems; reportedly only in Azerbaijani — DataGuidance (same snippet). Article titles confirmed in the Russian consolidation: Art. 8 "consent of the subject", Art. 10 "obligations of the owner and operator", Art. 14 "cross-border transfer", Art. 15 "registration of personal data information systems" — [prg.kz](https://prg.kz/m/amp/document/30774627) (titles only; article text is behind login).
- The law reportedly uses "owner" and "operator" rather than controller/processor, and requires notifying subjects and the state authority of breaches — [Mondaq/Grata summary](https://webiis08.mondaq.com/data-protection/1520966/data-protection-and-employee-privacy-in-azerbaijan) (search snippet; secondary).
- Regulator is disputed: DataGuidance names the Ministry of Transport, Communications and High Technologies; another site says the National Cybersecurity Agency — [Offlist](https://www.offlist.me/what-is-azerbaijan-law-on-personal-data); UNVERIFIED which is current.
- Azerbaijan ratified Convention 108 on 3 May 2010 and Constitution Art. 32 protects privacy — [ACON Law](https://acon.az/data-protection-in-azerbaijan).
- GDPR: commentary says Art. 2(2)(c) household exemption covers the user's own activity, not the platforms/providers; if a device or service sends data to a vendor, the vendor is a controller; local/edge processing is debated in scholarship — [Presencis](https://presencis.com/regulations/gdpr/exemptions/household), [Irish DPC FAQ](https://dataprotection.ie/en/faqs/general/what-household-exemption), [Chen, Nottingham](https://nottingham-repository.worktribe.com/output/4518311). The authoritative text is EUR-Lex Regulation 2016/679 (not fetched).
- Russia: sources conflict on whether localization (242-FZ amending 152-FZ) reaches Russian-speaking users abroad. Kramer Levin: not applicable if operator does not target the Russian market; Presencis (commercial): applies if Russian-language sites/marketing target Russia — [Kramer Levin](https://kramerlevin.com/en/perspectives-search/increased-fines-for-violations-of-russian-localization-law.html) vs [Presencis](https://cdn.presencis.com/regulations/ru-152fz/applicability/).
- Google Play: data "only processed locally on the user's device and not sent off device" does not need declaring as collected; a privacy policy link is still required even for apps collecting nothing; webview traffic counts if the app controls the webview — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en). The page does not mention PWAs.
- Apple: data processed only on device is not "collected"; a privacy policy URL is required for App Store listings; page does not address PWAs — [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/). A pure PWA is not in the App Store, so labels apply only if later wrapped (e.g., TWA/Capacitor) and listed (inference).

### Inferences
- If the app truly never transmits finance data, the strongest honest claim is: "We do not receive, store or have access to your financial data." That likely keeps the developer outside "owner/operator" status for that data, but this is unconfirmed under Azerbaijani law; ask a local lawyer (a) whether any registration is needed, (b) whether the hosting-log IP data makes the developer an operator, (c) whether a minor-age rule exists.
- Cross-border rules are only triggered if data is transmitted; email-backup or cloud sync features (future) would change this and need fresh legal review (written consent, adequacy, registration).
- For EU/Russian-speaking users, the same minimal-data posture lowers risk, but hosting IP logs are the one real personal-data touchpoint (see Q2).
- A privacy policy is still worth publishing: required by Play/App Store if wrapped, and trust-building for a finance app.

### Gaps
- Official Azerbaijani statute text (e-qanun.az not reachable via search tool); exact scope exclusions for personal/household use, definitions of owner/operator, consent form, registration thresholds, penalties.
- Current regulator and whether the 2024 amendment changed duties.
- Whether Azerbaijani law has a minimum age for consent; no source found.
- Whether a local-only PWA that never receives data is a "controller" — no authority found.

## Q2. What third parties actually touch the app (hosting, logs, fonts, service worker)

### Takeaway
The only confirmed third-party personal-data touchpoint is the host (Vercel): request logs include IP addresses, and Vercel acts as processor for customers' end-user data. Vercel's notice gives no specific retention period. Fonts/CDNs, Analytics, GitHub must be checked against the actual repo (not done by me).

### Cited Findings
- Vercel's privacy notice says it acts as a processor for customer end-user data, collects end-user IP addresses and derives city/country, includes IPs in service logs, gives no specific log retention period, and leaves it to customers to notify end users — [Vercel Privacy Notice](https://vercel.com/legal/privacy-policy).
- Vercel docs: IP addresses can be hidden in the dashboard (Pro/Enterprise), but Vercel still collects IPs for business purposes like DDoS mitigation; public_ip may be personal information under some laws — [Vercel Observability Query docs](https://vercel.com/docs/query).
- Service workers cache only your own origin's files in the browser (inference from standard behavior; no source fetched).

### Inferences
- Disclose: "Our hosting provider (Vercel) may temporarily record technical request data such as IP address, browser type and time when your device downloads the app. We cannot see your financial entries, and we do not use this information to identify you." Add the Vercel link.
- Before publishing, verify in the repo: no Google Fonts/CDN (owner states fonts self-hosted), Vercel Web Analytics/Speed Insights off, no third-party scripts, no error-reporting service; and that no financial data in URLs.
- Offline use: once installed, the app works without connection and does not contact the host except to check for updates (inference; verify in service worker).
- GitHub only hosts source code; visitors to the repo are governed by GitHub's policy; mention only if the repo is public and linked.

### Gaps
- Vercel retention period for logs (not published in the notice I read); would need Vercel DPA/support.
- Actual repo audit for third-party requests (out of my scope; recommend a network-tab test with devtools).

## Q3. Policy structure, examples, readability, and threat-model disclosures

### Takeaway
Comparable local-first apps use short, plain, sectioned policies. Actual Budget's has six headings (collect, use, ownership, security, changes, contact) and states data stays on-device. Recommended outline below. Local-storage limits (no encryption at rest, shared devices, malware, extensions) should be stated explicitly because over-promising security is the main trust risk.

### Cited Findings
- Actual Budget policy headings: Information We Collect (user-provided, automatic), How We Use, Data Ownership (own your data, portability), Security (local storage, optional encryption), Changes, Contact; says data is "stored locally on your device and is not transmitted or stored on our servers" and that optional E2E key is generated locally — [Actual Budget privacy policy](https://actualbudget.org/docs/privacy-policy).
- Policies of Bitwarden, Standard Notes, Cashew, Signal, Proton were NOT fetched; I make no claims about them.
- Storage is per-origin and best-effort by default; users can delete site data in browser settings; private browsing data is usually deleted at session end — [MDN storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

### Inferences / recommended outline (opinion)
1. Short summary box at top ("The short version": we do not collect your financial data; it stays on your device; you are responsible for backups).
2. Who we are and contact.
3. What we collect: nothing about your finances; no account; no analytics (state only if true).
4. Where your data lives (browser storage on your device, key `expense_ledger_v5`, optional install).
5. What our hosting provider can see (IP/technical logs; Vercel link).
6. Backups and exports: files you create are yours; where they go; we never receive them; if you share/email them, those services' rules apply.
7. What happens if you clear data, use private mode, uninstall, switch phones (link to in-app help).
8. Security: what we do (HTTPS, no server storage, input validation, optional app lock if built) and what we do not (no encryption at rest in the browser unless added; anyone with access to your unlocked device/browser profile can see data; malware, malicious browser extensions, shared devices; backup files are not encrypted unless stated).
9. Your rights and choices (access/export/delete are in your hands; delete via in-app reset; GDPR/Azerbaijan rights apply to any data we do hold, i.e., hosting logs).
10. Children (not directed to children under [age TBD by lawyer]; no accounts so we hold no data).
11. Cookies/local storage statement (no tracking cookies).
12. Future features (opt-in only; email backup/cloud sync would change this policy and be announced before use).
13. Changes (version date, change log, in-app notice for material changes).
14. Legal basis/jurisdiction notes (lawyer to complete: Azerbaijan law, GDPR if marketed to EU).
- Readability: one idea per sentence, active voice, "your data" not "User Data", no legalese; offer az/ru/en versions with equal prominence; date and version at top; plain-language summary + full text. (Opinion; consistent with Actual Budget's brevity.)

### Sample wording (English; az/ru drafts require native review)
- "Your records stay on this device. We do not have an account system, and we cannot see, read or recover your entries."
- "If you clear your browser data, delete the app, or use a private window, your records can be lost. Export a backup regularly."
- "This app does not encrypt your data inside the browser. Anyone who can unlock your phone or use your browser profile may be able to open it. Use a screen lock."
- "Our hosting provider may record your IP address and browser type when you download the app. This is not linked to your financial entries."
- "If we ever add online backup or sync, it will be optional, we will explain exactly what is sent, and we will update this policy first."

### Gaps
- Real policies from Bitwarden, Standard Notes, Cashew, Signal, Proton not examined.
- No Azerbaijani/Russian readability or terminology review (need native speaker/lawyer).
- Whether optional app-lock encrypts data (depends on implementation, not inspected).

## Q4. Install-to-home-screen teaching and PWA install mechanics

### Takeaway
On Chromium, capture `beforeinstallprompt`, hold it, and show your own install button after a value moment; Safari/Firefox don't support the event, so iOS needs manual instructions. iOS 26 makes every site added from Safari open as a web app by default, with a toggle.

### Cited Findings
- `beforeinstallprompt` is non-standard, Chromium-only; call `preventDefault()`, store event, reveal button; `prompt()` needs a user gesture and works once; listen to `appinstalled`; event does not fire if already installed or not installable — [MDN trigger install prompt](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt), [web.dev codelab](https://web.dev/articles/codelab-make-installable).
- A book excerpt argues for deferring the prompt until the user completes a meaningful action (secondary, dated) — [PWA by Example excerpt](https://iclient.qq.com/read/1036699668/50).
- iOS 26/iPadOS 26: any site added to Home Screen opens as a web app by default; an "Open as Web App" toggle appears; manifest no longer required — [heise](https://heise.de/-10749652), [ithinkdiff](https://www.ithinkdiff.com/add-web-app-bookmark-iphone-home-screen-ios-26/).
- Safari's storage rules (below) apply; Home Screen web apps get browser-app quota — [WebKit blog](https://webkit.org/blog/14403/updates-to-storage-policy/).
- In-app browsers (WebViews inside social apps) differ by engine and generally lack the install path; Google research built a feature detector — [Google Research, "What is in a Web View?"](https://research.google/pubs/pub46739/).
- Not found: Samsung Internet specifics, exact detection strings for Instagram/Telegram/Facebook, display-mode standalone detection documentation (known `matchMedia('(display-mode: standalone)')` and iOS `navigator.standalone`, from my own knowledge, not sourced here), iOS 17/18 step-by-step details.

### Inferences
- Show the install nudge after the first saved transaction (a value moment), once, dismissible, re-offered later at most a few times; hide when standalone.
- iOS: show a small illustrated 3-step card (Share, Add to Home Screen, Add) only on iOS Safari non-standalone; on iOS 26 mention keeping "Open as Web App" on (inference from the toggle's existence).
- In-app browser: detect and show "Open in Safari/Chrome" with a copy-link button rather than install steps (UNVERIFIED approach, no source).
- Prefer a static annotated illustration (works offline, low maintenance, localizable) over animation; keep text in az/ru/en.

### Gaps
- Samsung Internet, detection strings, iOS 16.4–18 step differences, EU DMA effect on iOS PWAs (MDN notes alternative engines in EU may apply own storage policies).

## Q5. First-launch experience, tours vs checklists, sample data

### Takeaway
NN/g advises skipping promotional tours; prefer learning in context and brief, skippable help only where needed. Vendor benchmarks show user-initiated and short tours complete far better than auto-started or long ones, but these are SaaS vendor data, not finance PWAs.

### Cited Findings
- NN/g: avoid promotional first-launch tours; tutorials did not improve task performance in their research; if used, keep few, one concept per card, highly visible Skip; prefer contextual tips; ask for data only when needed with a reason and skip option — [NN/g mobile onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/).
- Produktly (2026, 464 SaaS products, vendor self-reported): median tour completion 29%; user-initiated 69% vs auto-started 23%; 1-2 steps 73% vs 9+ steps 8% — [Produktly](https://produktly.com/research/saas-onboarding-benchmarks-2026).
- Chameleon (vendor): click-triggered tours ~67% vs delay-triggered ~31%; checklist-launched tours ~67% — [Chameleon](https://www.chameleon.io/blog/mastering-product-tours).
- Appcues and Userpilot data: not found.
- Manifest/splash behaviour (Android vs iOS) and sample-data patterns: not researched with sources.

### Inferences
- Language chooser as the very first screen (az/ru/en) is consistent with the owner's requirement and costs one tap; then straight to an empty state with one primary action ("Add your first expense").
- Replace a tour with: a short optional "How it works" (max 3 cards, skip visible) plus contextual hints on first use of each area and an onboarding checklist (add account, add expense, make a backup).
- Sample data: offer "Try with example data" clearly labelled, visually tagged, stored separately or flagged, with one-tap "Remove example data" so it never contaminates real totals (design opinion; also a financial-correctness risk to test).
- Iconography/splash: Android generates splash from manifest name/icon/background_color; iOS uses apple-touch-startup-image or a blank screen (from my knowledge, unsourced; verify).

### Gaps
- No az/ru-market-specific onboarding evidence; no finance-app tour retention data; no sourced detail on splash behaviour.

## Q6. Teaching data-loss risks and backup reminders

### Takeaway
Real loss causes: user clearing site data, private mode, uninstall/clearing browser, device switch, storage pressure, and Safari's inactivity eviction for non-installed use. Evidence that reminders drive actual backups is weak.

### Cited Findings
- Best-effort storage can be evicted under storage pressure (LRU); persistent mode (`navigator.storage.persist()`) is evicted only by user deletion; Safari/Chromium grant persist() silently by engagement heuristics, Firefox prompts; Chrome research says eviction of regularly visited sites is rare — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
- Safari with tracking prevention deletes script-written data after 7 days of Safari use without user interaction; Home Screen web apps have their own counter and are not subject to that cap per WebKit staff — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [Search Engine Land](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519), [The Register](https://www.theregister.com/2020/03/26/apple_relax_were_not_totally/) (2020 sources; WebKit's 2023 storage blog does not mention the cap but defers to ITP).
- WebKit decides persist() requests using heuristics such as Home Screen web app status — [WebKit blog](https://webkit.org/blog/14403/updates-to-storage-policy/).
- Private browsing data is usually deleted when the session ends — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
- Reminder/commitment nudges raised stated intent for updates and 2FA but not for configuring automatic backups; study measured intentions, not behaviour — [Frik et al., WEIS 2018](https://blues.cs.berkeley.edu/wp-content/uploads/2018/06/WEIS_2018_paper_42.pdf).

### Inferences
- Request `navigator.storage.persist()` after install/first data entry, and display persisted state in Settings.
- Short, timed messages (opinion): (1) after first transaction: "Saved on this device only"; (2) after N entries or 7 days: "Make your first backup"; (3) on iOS Safari non-installed: "Install to protect from automatic cleanup"; (4) before reset/clear actions: explicit consequence; (5) periodic "last backup X days ago" badge rather than interruptive modal.
- Offer one-tap export to Files/share sheet; since reminders alone are weak evidence, make backup frictionless and visible, and show "last backup" status in the main screen.
- Verify in a real device test: iOS install, 7+ days idle, backup restore on a new phone.

### Gaps
- No study of actual backup completion after reminders in consumer apps.
- Current (2026) Safari ITP behaviour for installed apps not re-verified beyond 2020-2023 sources.

## Source quality notes
- Primary: Google Play Help, Apple App Privacy Details, Vercel privacy notice, WebKit blog, MDN, NN/g, Actual Budget policy.
- Secondary/commercial (treat cautiously): DataGuidance snippets, Presencis, Produktly, Chameleon, law-firm blogs, heise.
- Not reached: e-qanun.az / official Azerbaijani statute, EUR-Lex GDPR text, Russian 152-FZ primary text.
