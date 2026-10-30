# Data safety, backup and "email me my history" for a local-first PWA (retrieved 2026-10-30)

Note on method: about 17 tool calls. Search snippets were often secondary or aggregator sources; where I could not reach a primary page I say so. Items marked [UNVERIFIED] come from my background knowledge and must be tested on real devices before the owner relies on them.

## 1. Can a static PWA with no backend email a user's transaction history automatically?

### Takeaway
Fully automatic, no-account email is only possible by routing financial data through a third-party sending service, which breaks the "nothing leaves your device" promise and exposes an abusable endpoint. Free tiers mostly do not allow attachments. The safest design is a user-initiated "Send backup" button using the Web Share API (file goes to Gmail, Telegram, WhatsApp or Drive via the OS share sheet), optionally encrypted on-device first. The owner's idea of "enter your email and automatically receive all history" is technically possible but not recommended.

### Cited Findings
- mailto: has no formal length limit. Practical limits are about 2000 characters in many clients and browsers. One report says Cyrillic text hit a limit near 500 characters because of percent-encoding. mailto: cannot carry attachments (no source addressed attachments directly; this is a property of the URL scheme, so treat the "no attachments" part as [UNVERIFIED] against RFC 6068). Conclusion: mailto is unusable for a full ledger. Latin-script limits are from old forum posts; az/ru text expands further. — [SitePoint thread](https://www.sitepoint.com/community/t/mailto-body-length/5156), [Anaplan community](https://community.anaplan.com/discussion/comment/45350/)
- Web Share API with files: `navigator.canShare({files})` must be used for feature detection, requires HTTPS and a user gesture (click). web.dev lists audio, image, pdf, video and text files as shareable. Safari 14 is listed for canShare. MDN marks canShare as "Limited availability" (not Baseline). Firefox is behind a flag per web.dev. The web.dev Chrome version figure (128) looked wrong for Android, so verify. — [web.dev Web Share](https://web.dev/articles/web-share), [MDN canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare)
- Whether a `.json` file is accepted by the share sheet (versus `.txt`/`text/plain` or `.csv`) is not documented in what I retrieved. Test on Android Chrome and iOS Safari; a `.txt` or `.csv` fallback may be needed. [UNVERIFIED]
- EmailJS free plan: 200 requests/month, 2 templates, 50 KB request size cap, branding footer; sources conflict on free attachments (most detailed review: none; one snapshot: 500 KB). Official pricing page not read. EmailJS exposes a public key in browser code, so anyone can call it (abuse risk). — [EmailJS free FAQ](https://www.emailjs.com/docs/faq/can-i-use-emailjs-for-free/), [toolradar](https://toolradar.com/tools/emailjs/pricing), [xpay snapshot](https://www.xpay.sh/agent-ready-index/emailjs/) (conflicts)
- Web3Forms: attachments are a Pro (paid) feature; default uploader single file up to 5 MB; free tier reported about 250 submissions/month. Form submissions normally go to the site owner's inbox, not to an arbitrary user email. — [Web3Forms file attachments docs](https://docs.web3forms.com/getting-started/pro-features/file-attachments), [Web3Forms pricing](https://web3forms.com/pricing)
- Resend free: 100 emails/day, 3,000/month; sending pauses at the limit. Needs a secret API key, so it must be called from a server function, not from the browser. Attachment limits on free not verified. — [Resend pricing](https://resend.com/pricing.md), [Resend free tier blog](https://resend.com/blog/new-free-tier)
- Brevo free: 300 emails/day, shared between marketing and transactional; attachment rules and key handling on free not verified in my sources. — [Brevo email API](https://www.brevo.com/features/email-api/), [Brevo free plan limits](https://help.brevo.com/hc/en-us/articles/208580669)
- Cloudflare Workers + MailChannels: the free Workers sending API was terminated in 2024 (blog says June 30, help center says August 31). MailChannels now has a developer tier of 100 emails/day. Cloudflare's own Email Sending requires the Workers Paid plan (3,000 included/month then $0.35 per 1,000); sending to verified destination addresses in your own account is free. So the old "free MailChannels trick" is dead. — [MailChannels EOL notice](https://support.mailchannels.com/hc/en-us/articles/26814255454093-End-of-Life-Notice-Cloudflare-Workers), [MailChannels blog](https://blog.mailchannels.com/important-update-mailchannels-email-sending-api-for-cloudflare-workers-to-be-terminated/), [Cloudflare Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)
- Vercel Hobby plan is restricted to non-commercial, personal use; exceeding limits blocks the feature for 30 days. Figures vary by source (about 100 GB bandwidth, 100K function invocations). Adding a serverless email function also means the project now has a server and a secret key. Commercialising the app would require Pro (about $20/user/month). — [Vercel Hobby docs](https://vercel.com/docs/plans/hobby-plan), [deploywise summary](https://deploywise.dev/blog/vercel-free-tier-limits-2026)
- Azerbaijan Law on Personal Data (No. 998-IIIQ): secondary sources agree cross-border transfer is allowed if the receiving jurisdiction gives equivalent protection and it does not endanger national security, with consent as a fallback; one source says written consent is always required; regulator named inconsistently. No primary text read. Local counsel is needed before any server-side handling of users' data. — [DataGuidance overview](https://www.dataguidance.com/notes/azerbaijan-data-protection-overview), [Deloitte Azerbaijan](https://www.deloitte.com/az/en/services/legal/perspectives/data-privacy-gdpr.html), [compliance kit summary](https://compliance.theartofservice.com/controls/azerbaijan-law-on-personal-data-2010/az-dpa-12) (secondary)

### Inferences
- A "type your email, receive history automatically" feature needs: a server function with a secret key (or a public-key service), an unauthenticated endpoint that can be abused to spam third parties (anyone can type any email), and transmission of full financial data (plain text unless encrypted) to a processor. That makes the app a data controller under GDPR and the Azerbaijani law and contradicts the no-accounts, no-server positioning. Verifying the address would require a confirmation email, which again needs a server and storage.
- Free quotas (100 to 300/day, 200/month for EmailJS) are tiny relative to a user base and would be exhausted by one abuser.
- Share sheet approach: the user picks Gmail/Telegram/WhatsApp/Drive, data goes under the user's own account, no server, no new privacy policy, zero cost. Weak points: manual (needs a reminder), not available in Firefox desktop, file-type acceptance varies.
- Client-side encryption (WebCrypto AES-GCM with a PBKDF2 or Argon2-like key derivation from a passphrase) before sharing makes the file safe in mail or chat history, but a forgotten passphrase means permanent loss, so it must be optional, clearly warned and default off (or offer both encrypted and plain). Plain readable CSV/JSON should stay available. [AES-GCM/PBKDF2 specifics are from background knowledge, no source fetched; see OWASP password storage/crypto cheat sheets to confirm iteration counts before implementing.]

### Gaps
- Official current pricing pages for EmailJS, Brevo, Resend attachments and Formspree were not read; free attachment limits unresolved.
- Primary text of Law 998-IIIQ not read; conflict between consent-first and adequacy-based descriptions unresolved.
- Real-device behaviour of Web Share with `.json` files on iOS and Android Chrome untested.

## 2. Other free options: files, cloud drives, background features

### Takeaway
The strongest zero-cost layers are: (1) a "last backed up" indicator plus reminder, (2) share-sheet and download backup, (3) `navigator.storage.persist()` plus an IndexedDB mirror, (4) optional Google Drive appDataFolder backup later. Background and periodic sync cannot be relied on, especially on iOS. File System Access API is Chromium desktop and Android only.

### Cited Findings
- File System Access `showSaveFilePicker`: supported in Chrome/Edge desktop since 86; Chrome for Android listed from 149 on caniuse (an MDN mirror says 132, conflicting); not in Safari (vendor position oppose) or Firefox (negative position). Not Baseline. Requires HTTPS. Feature-detect and fall back to `<a download>`. — [caniuse showSaveFilePicker](https://caniuse.com/mdn-api_window_showsavefilepicker), [web.dev save a file](https://web.dev/articles/files/save-a-file), [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/file-system-access)
- Periodic Background Sync: Chromium only and only for installed PWAs; depends on a site engagement score and previously used networks. Chrome grants the permission automatically for installed apps. No iOS/Safari or Firefox support was found in sources (support elsewhere is [UNVERIFIED]; dated secondary source says Chromium-only). — [Chrome developers](https://developer.chrome.com/docs/capabilities/periodic-background-sync), [Blink intent to ship](https://groups.google.com/a/chromium.org/d/msg/blink-dev/KSJViFp3hMc/aaoZWWagBAAJ)
- Google Drive `drive.appdata` scope is listed by Google as recommended and non-sensitive, needing only basic app verification (not the restricted-scope security assessment). Files are placed by setting parent `appDataFolder`; the folder is hidden from the user, only the app can read it. Exact review timelines were not found. OAuth for a static site would use the Google Identity Services token flow or PKCE (the OAuth specifics are background knowledge). Requires a Google Cloud project, consent screen, privacy policy and a verified domain. Free API, but it is a Google-account dependency and an OAuth review burden; the hidden folder also means users cannot see or manually delete the backup in Drive, which some find confusing. — [Choose Drive API scopes](https://developers.google.com/drive/api/guides/about-auth), [Drive appData folder guide](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- OneDrive/Dropbox free APIs, Capacitor filesystem, QR backup, Telegram bot, browser sync features: no sources retrieved. [UNVERIFIED, not researched in depth]
- Messenger usage in Azerbaijan: a website-embed ranking (WMTips, 2026) shows WhatsApp 59.9% and Telegram 45% of Azerbaijani sites embedding them; this measures sites, not users. No user-share survey was found. — [WMTips](https://www.wmtips.com/technologies/instant-messaging/country/az/), [Tech.az](https://tech.az/en/posts/social-media-and-internet-statistics-in-azerbaijan-research-3788)

### Inferences
- Because Web Share lists Telegram and WhatsApp as share targets when installed (background knowledge, test on device), "Send to Saved Messages / myself on Telegram" is a very natural zero-cost backup channel in Azerbaijan, with no integration needed. A Telegram bot would require a server and is not recommended.
- Periodic auto-download of dated backups cannot run in the background on iOS; it can only be triggered when the user opens the app (for example "backup file created after every N changes or 7 days, prompt to save").
- QR backup works only for tiny ledgers (a QR holds about 3 KB at most [UNVERIFIED]), so it is not useful for full histories.
- Drive appDataFolder is a good later optional feature (cross-device, user's own account, data stays out of our hands) but is the largest effort and brings OAuth consent/verification and a privacy policy; do not start until the basic layers exist.

### Gaps
- Capacitor/native wrapper filesystem behaviour, OneDrive/Dropbox limits, Telegram share-sheet behaviour on iOS: not researched.
- Current caniuse status for Web Share files on Android Firefox/Samsung Internet unverified.

## 3. What actually causes data loss in browsers

### Takeaway
Most loss is user-driven (clearing site data, switching devices or browsers, private mode, uninstalling) or Safari-specific (storage deleted after inactivity for non-installed sites in some configurations). Automatic eviction is rare for regularly visited sites but real under disk pressure. A multi-tab overwrite and quota exceeded are app-level risks the app can fix itself.

### Cited Findings
- Eviction cases (MDN): storage pressure (least-recently-used origin first), browser maximum exceeded, and Safari proactive deletion. Default storage is "best-effort"; persistent origins are evicted only if the user deletes them via browser settings. `persist()`: Firefox prompts the user; Safari and Chromium decide automatically from engagement/interaction history. — [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Safari 7-day rule (MDN): applies when cross-site tracking prevention is on; no click or tap in seven days of browser use deletes script-created data (server cookies exempt). WebKit original post: "deleting all of a website's script-writable storage after seven days of Safari use without user interaction"; home screen web apps are not part of Safari, count their own days of use, and WebKit did not expect their data to be deleted. — [WebKit blog ITP 2.3/Full third-party cookie blocking](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- WebKit 2023 storage update (Safari 17 / iOS 17): origin quota up to 60% of disk in browser apps (15% for other apps); eviction is LRU per origin; origins are best-effort by default; `persist()` is granted by heuristics such as being opened as a Home Screen Web App; home screen apps have the same quotas as the browser; apps should handle `QuotaExceededError`. This article does not mention the 7-day cap, so I could not confirm from WebKit whether the cap still applies as described in iOS 17+ and 2026. — [WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- web.dev: Chrome rarely clears automatically; user clearing is more common. `persist()` should be called after a user gesture, not on page load, and protects from eviction; Chromium grants it silently based on engagement, installed/bookmarked, notification permission. — [web.dev persistent storage](https://web.dev/articles/persistent-storage)
- Private mode: quotas can differ and data is usually deleted at session end. — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- A WebKit bug from 2022 reports cookies (not localStorage) being deleted for home screen apps; status unconfirmed. — [WebKit Bugzilla 237350](https://bugs.webkit.org/show_bug.cgi?id=237350)

### Inferences
- Highest practical risks for the owner's users: (a) Safari/iPhone users who open the site in a browser tab and rarely tap it; (b) users clearing browser data or "storage cleaner" apps; (c) switching phones; (d) private mode. None is solved by `persist()` alone.
- Mitigations the app controls: request `persist()` after the first saved transaction, show the result in a Settings "Data safety" status, nudge iPhone users to "Add to Home Screen", write a mirror copy to IndexedDB (only helps against localStorage-specific issues; same-origin clearing wipes both), guard writes against multi-tab overwrite (storage event or version counter), and handle `QuotaExceededError`.
- OS storage cleaners and uninstalling a PWA: no authoritative source retrieved; treat as likely risks, not confirmed behaviours.

### Gaps
- Whether the 7-day cap still applies in iOS 17/18/19+ for non-installed sites was not confirmed by a current WebKit statement.
- Concrete OS cleaner and PWA-uninstall behaviours on Android/iOS not sourced.

## 4. Backup UX best practice and what other local-first apps do

### Takeaway
Evidence retrieved on other apps is thin. Actual Budget confirms the pattern "local copy + optional sync server + optional E2E encryption + portable export". The rest below is design reasoning, not sourced.

### Cited Findings
- Actual Budget keeps data locally and on a server; optional end-to-end encryption is one-way, local copies stay unencrypted, a lost E2E password cannot be recovered by the server, and restoring a backup requires choosing a device to reset sync from. Budgets can be exported as a portable file. — [Actual Budget sync docs](https://actualbudget.org/docs/getting-started/sync/)
- Standard Notes, Obsidian, Excalidraw, Firefly, Notion offline: not researched in this run (search returned only Actual Budget).

### Inferences
- Good-practice checklist for Expense Ledger (design opinion, label it as such): last-backup date on the home/settings screen with colour state; reminder after N days or N new transactions (shown in-app because background reminders are unreliable); dated filenames (`expense-ledger-2026-10-30.json`); backup file includes app version, record counts, schema version and a checksum (SHA-256 via WebCrypto) so import can detect truncation; restore shows a preview (counts, date range, totals) before overwriting; auto-snapshot of current data before any restore or import so the user can undo; keep the last few rolling internal snapshots (size permitting); test the restore round trip in CI. Do not claim any of this is verified until tested.
- Include a visible warning that clearing browser data deletes the ledger.

### Gaps
- No evidence collected on how Obsidian, Excalidraw, Standard Notes, Firefly or Notion handle backup UX.

## 5. Ranking (cost, privacy, reliability, effort, Azerbaijan fit)

Scores are my judgement (A best), not measured.

| # | Option | Cost | Privacy | Reliability | Effort | Az fit | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Backup health: last-backup indicator, in-app reminder, `persist()` request, iPhone "Add to Home Screen" nudge, `QuotaExceededError` and multi-tab protection | 0 | A | B | Low | A | Do first |
| 2 | Better file backup: dated filename, checksum, restore preview, pre-restore snapshot | 0 | A | A- | Low-Med | A | Do next |
| 3 | "Send backup" via Web Share (Telegram Saved Messages, WhatsApp, Gmail, Drive) with `<a download>` fallback | 0 | A (user's chosen app) | B (manual, device-dependent) | Low-Med | A+ | Do with 2; test file types on real phones |
| 4 | Optional passphrase encryption of shared/downloaded backups (WebCrypto) | 0 | A+ | B (forgotten passphrase = loss) | Med | A | After 3, default off, clear warning |
| 5 | IndexedDB mirror | 0 | A | C (same origin is cleared together) | Med | n/a | Low value alone; do only for write-failure resilience |
| 6 | Google Drive appDataFolder opt-in | 0 money, review burden | B (Google holds file) | A | High | B | Later, only if users ask |
| 7 | File System Access auto-save on Chromium | 0 | A | B (Chromium only) | Med | B | Optional bonus |
| 8 | Capacitor native wrapper | store fees [UNVERIFIED] | A | A | High | B | Out of scope for now |
| 9 | Server email (EmailJS/Resend/Brevo/Vercel function) | free quotas tiny; Vercel Hobby is non-commercial | D | C (abuse, quotas) | Med-High | C | Not recommended |
| 10 | mailto with data | 0 | A | F (size, no attachments) | Low | C | Not viable |
| 11 | QR backup | 0 | A | C | Med | C | Not for full ledgers |

### Suggested order
1. Backup health indicator, reminder, `persist()`, storage-error handling, multi-tab write guard (also protects financial correctness).
2. Backup file format v2 with checksum, restore preview, auto pre-restore snapshot, and round-trip tests.
3. Web Share "Send backup" with download fallback; test on Android Chrome and iPhone Safari and installed PWA.
4. Optional passphrase encryption.
5. Revisit Drive appDataFolder or native wrapper only with user demand evidence.

Direct answer to the owner's question: "enter your email and automatically receive all history" is possible only with a server-side or third-party email service and is not advisable (privacy promise, legal exposure, abuse, free-tier limits, Vercel Hobby non-commercial clause). The compliant alternative that gives the same user benefit is "Send backup to myself" through the phone's share sheet.

### Gaps (overall)
- Real-device tests, current official provider pricing pages, primary Azerbaijani law text, and WebKit's current 7-day-cap status remain to be verified.
