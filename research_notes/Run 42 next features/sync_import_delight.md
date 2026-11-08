# Run 42 research: sync, historical import, delight/privacy micro-features, 10 new ideas

Date of research: 2026-11-08. Method: web searches (standard mode) plus engineering knowledge.
Labels: [CONFIRMED-SRC] = a search result supports it; [KNOWLEDGE] = from general engineering knowledge, not re-checked this session; [UNVERIFIED] = needs checking before relying on it.
Process note: the instructed file `...skills\deep-research\references\researcher.md` does not exist at the given path, so I followed the task text directly.
Limitation: the search tool is US-only and returned mostly secondary sources. Several items below are explicitly weak.

---------------------------------------------------------------------
## (a) Household sync without a server

### A1. Google Drive appDataFolder
- Scope `https://www.googleapis.com/auth/drive.appdata` is classed NON-SENSITIVE in Google's Drive scope guide, so only basic OAuth app verification applies, with no restricted-scope security assessment. [CONFIRMED-SRC: developers.google.com/drive/api/guides/api-specific-auth; developers.google.com/drive/api/guides/about-auth]. Re-check the live consent-screen scope list before launch.
- Critical limitation: appDataFolder is PRIVATE to one app and one Google account. A second household member cannot read it. So it syncs one person's devices, NOT a household. [KNOWLEDGE, standard Drive semantics; verify]
- For household sharing you would need `drive.file` (non-sensitive per same guide; per-file access to files the app created or the user opened via Picker) and the owner sharing a file with the partner via Drive permissions. Each partner then must open the shared file through the app (Picker) to grant `drive.file` access. [KNOWLEDGE; UNVERIFIED in detail]
- Quotas: files.get costs 5 units, files.list 100; per-user per-minute 325,000 units; 429/403 handled by exponential backoff. [CONFIRMED-SRC: developers.google.com/drive/api/guides/limits]. Not a constraint at household scale. Docs say new billing details come later in 2026 with 90 days' notice, so watch that.
- OAuth setup requirements [KNOWLEDGE]: Google Cloud project, OAuth consent screen (app name, privacy policy URL, authorized domain), Android OAuth client (package name + SHA-1 of signing key; the Play App Signing SHA-1 differs from the upload key), Web client for PWA. "Testing" mode limits you to 100 test users and refresh tokens expire after 7 days. Production publishing with non-sensitive scopes needs basic brand verification (days to weeks). The app must have a privacy policy.
- Capacitor: use a Google sign-in plugin (e.g. a community Capacitor Google auth plugin) or Android Credential Manager / AuthorizationClient for the scope grant. Plugin choice is UNVERIFIED and plugins churn; budget time to maintain it.
- Costs: Google API calls are free at this scale; the user's own Drive quota pays for storage. Cost is engineering and maintenance, not money.
- Risk: you are adding a Google dependency and account sign-in to a no-backend app. Privacy messaging changes ("data stays on your phone" becomes "data also in your Drive"). Needs client-side encryption to keep the claim honest.

### A2. CRDT vs. ledger-specific merge
- Library sizes (gzipped, sources disagree): Yjs ~15-20 KB; Automerge ~100-600 KB depending on version (WASM); Loro ~180 KB. [CONFIRMED-SRC: pkgpulse.com guide; dmonad/crdt-benchmarks listing; dev.to article, all secondary]
- Judgement [strategic opinion]: a full CRDT library is overkill. A ledger is mostly an append-only set of transactions with stable unique IDs. Simpler, auditable design:
  1. Every record gets a UUID (or device-id + counter), `updatedAt` as a hybrid logical clock, and `deleted` tombstone flag instead of hard delete.
  2. Sync = union of records by ID; same ID on both sides -> last-writer-wins per record (or per field) by HLC; tombstones win over older edits.
  3. This is effectively an LWW-element-set CRDT, hand-rolled in perhaps 200-400 lines and unit-testable with property tests.
- Hard cases specific to money:
  - Concurrent edit of the same transaction's amount: LWW silently drops one. Mitigation: keep the losing version in an audit/"sync conflicts" list the user can restore.
  - Account balances: never sync a stored balance; derive from transactions. If the app stores opening balance or running balance, conflicts are real.
  - Budgets/goals: per-field LWW is fine.
  - Duplicates: two partners both log the same coffee. This is not a sync conflict; surface a "possible duplicate" prompt using the import dedupe rules in (b).
  - Delete vs edit race: tombstone wins unless edit is newer; show undo.
  - Clock skew: phone clocks drift or are wrong; HLC bounds damage but one badly wrong clock can win everything. Clamp future timestamps (e.g. reject > now+24h) [KNOWLEDGE].
  - Schema/version mismatch between partners' app versions: include `schemaVersion` in the sync file and refuse to merge when newer than the app knows.
  - Existing `expense_ledger_v5` data has IDs? Verify existing records have stable unique IDs before any sync work. [NOT CHECKED in code this session]
- Encryption: encrypt the sync file client-side (AES-GCM via WebCrypto) with a household key derived from a shared passphrase or exchanged by QR. Secsync is a reference design (AEAD per update, key rotation). [CONFIRMED-SRC: awesome.ecosyste.ms secsync entry]. Losing the key = losing sync data, so keep the local copy authoritative.

### A3. Alternatives
| Option | How | Pros | Cons |
|---|---|---|---|
| Manual file exchange (export a signed/encrypted delta file, share via Telegram/WhatsApp, import and merge) | Share sheet via Capacitor Share + file picker | No accounts, no servers, works offline, culturally fits (Telegram/WhatsApp ubiquity in AZ is [UNVERIFIED]) | Manual; easy to forget; stale data |
| QR exchange of small deltas | Animated multi-frame QR | No network at all | Only a few KB per scan; practical for a handful of transactions only |
| Encrypted share link (blob in URL fragment) | `https://app/#d=...` fragment never sent to server | Zero infrastructure; one tap | URL length limits (~2 KB safe in messengers; larger breaks) so only small deltas; link in chat history is a copy of data |
| Shared Drive file (`drive.file`) | See A1 | Near-automatic | OAuth + verification + Google dependency |
| Syncthing-style (P2P) | User runs Syncthing app on both phones, app reads/writes a folder | Real sync, no cloud | Android scoped storage makes folder access awkward (SAF); asks a non-technical user to install another app; unlikely to suit target users [UNVERIFIED feasibility] |
| WebRTC direct device-to-device | Needs signalling | Live | Needs a signalling server (breaks "no backend") or manual SDP copy-paste QR |
| Self-host / tiny relay | Cloudflare Worker + KV | Real sync | Contradicts the no-backend constraint; ongoing cost and security duty |

Recommendation [strategic opinion]: build the merge engine first (IDs, tombstones, HLC, conflict log), expose it through manual encrypted file exchange (cheapest, testable, no OAuth). Add Drive sync only if testers actually ask for automatic sync. Evidence of demand for household sync in AZ: none found. [UNVERIFIED demand; validate with 5-10 couples/families before building]
Effort: merge engine + file exchange ~ medium (1-2 runs); Drive layer ~ medium-high plus verification wait; Priority: medium, after import.

---------------------------------------------------------------------
## (b) Zero-day historical import wizard

### B1. What Azerbaijani bank exports look like
- HONEST FINDING: searches returned NO official documentation of statement export formats for ABB (ABB Mobile / ABB Business), Kapital Bank (Birbank), or PASHA Bank. Only generic third-party PDF converters appeared. [CONFIRMED-SRC: absence in search results]
- Therefore I cannot state column layouts. Do NOT build parsers for specific bank formats from assumption. Required first step: obtain real (redacted) sample exports from the owner and testers for each bank, in each available format (PDF "ekstre/выписка", Excel/CSV if offered).
- Expectations [UNVERIFIED hypotheses to check against samples]: statements are probably PDF-first; descriptions mix Azerbaijani/Russian/English and Latin-transliterated merchant names; AZN with 2 decimals; dates likely DD.MM.YYYY; amounts may use comma or dot decimals; card and account statements may differ; may include separate debit/credit columns versus signed amount.
- Open banking: Central Bank of Azerbaijan launched its National Open Banking platform on 6 Oct 2025, early stage; roadmap extends to open finance (June 2026 statement); data flows via the central bank's infrastructure. [CONFIRMED-SRC: saltedge blog 2026-03-30; cbar.az press release; trend.az; report.az; openbankingtracker.com]. Access for a small third-party app likely requires licensed/registered status [UNVERIFIED]. Not a near-term route; revisit in 2027.

### B2. Import best practice [KNOWLEDGE unless noted]
1. Parse in a sandboxed, pure function; never write to the ledger until the user confirms a preview. Preview table with per-row status: new / probable duplicate / invalid / needs category.
2. Column mapping step with saved profiles per bank; auto-detect delimiter (`,` `;` tab), encoding (UTF-8 BOM, Windows-1251 for Russian-language exports, UTF-8), decimal separator, date format (ask the user when ambiguous, e.g. 03/04/2026), and debit/credit vs signed amount. Use a proper CSV parser (e.g. PapaParse) rather than split(",").
3. Money: parse into integer minor units (qəpik), never float arithmetic. Reject rows with ambiguous amounts rather than guess.
4. PDF: client-side text extraction (pdf.js) is feasible for text PDFs, fragile for layout; scanned PDFs need OCR (not recommended v1). Mark PDF import as experimental; CSV/Excel first.
5. Atomic import with an "undo this import" batch ID on every created transaction. Existing atomic import work is noted in project memory (Run 18); reuse it.
6. Never auto-merge into manual entries silently; show matches.

### B3. Duplicate detection
- Key 1 (strong): bank-provided transaction/reference ID if present (store as `externalId` + source); exact match = duplicate.
- Key 2 (fuzzy): same account + same amount (minor units) + date within +/-2 days (posting vs transaction date lag) + description similarity (normalised, token-set ratio or Jaro-Winkler/Levenshtein >= ~0.8, threshold to tune on real data).
- Pending vs posted: same amount, date shifts; treated by the date window.
- Manual-vs-import: user already logged the coffee by hand; match on amount + date window + account, ask to merge (keep user's category/note, attach bank ID).
- Repeated identical purchases on one day (two 1.20 AZN bus fares) are legitimate; match 1:1, not many:1. Count occurrences within the file and within the ledger and pair them off.
- Re-importing an overlapping statement should result in zero new rows; this is the key acceptance test.
- Transfers between own accounts appear as two rows (debit in one, credit in other): offer to pair as a transfer rather than expense + income. Excluding them avoids inflated income/expense.

### B4. Fuzzy categorisation rules
- Normalise merchant text: lowercase, strip digits/terminal IDs/city, collapse whitespace, transliterate Cyrillic/Latin/Azerbaijani letters (ə, ı, ö, ü, ş, ç, ğ) to a common key.
- Rules in priority order: (1) user's own past choices ("learned rules" keyed on normalised merchant), (2) user-defined keyword rules, (3) built-in AZ merchant dictionary (Bravo, Araz, Wolt, Bolt, Yango, Azercell, Bakcell, Nar, Azerishig, Azersu, etc. [UNVERIFIED list; check against real statements]), (4) uncategorised bucket.
- Learning loop: when the user fixes a category in the preview, offer "apply to all N similar rows + remember". Prefer deterministic rules to ML so behaviour is explainable.
- Show confidence; never silently categorise low-confidence rows.
- Local LLM/AI categorisation: out of scope (privacy, cost).

### B5. Priority
Import is the best-supported high-value item: manual entry cost is the top cause of drop-off in expense trackers [see D3, weak evidence]. Effort medium-high mainly because of format discovery. Blocker: need real samples. Next action: owner supplies redacted ABB/Kapital/PASHA exports.

---------------------------------------------------------------------
## (c) Delight and privacy micro-features

### C1. Shake or face-down to hide amounts
- Sensors: Android accelerometer needs NO runtime permission; rates above 200 Hz need `HIGH_SAMPLING_RATE_SENSORS` (install-time, normal permission) on Android 12+ targets. Shake detection works fine at ~50 Hz so no permission is needed. [CONFIRMED-SRC: developer.android.com SensorManager; Qt docs; AOSP commit via OmniROM]
- Capacitor: official `@capacitor/motion` exposes `accelerometer` and `orientation` listeners via DeviceMotion web APIs; works in WebView on Android without a native plugin. iOS 13+ requires a permission prompt via `DeviceMotionEvent.requestPermission()`, Android does not. [KNOWLEDGE; verify against docs.capacitorjs.com/apis/motion]. Owner tests only on Android (Poco F6), so iOS behaviour stays untested.
- Face-down detection: use accelerometer z-axis about -9.8 m/s^2 held for e.g. 1 s (|x|,|y| small). Proximity sensor is NOT exposed by Capacitor core; would need a custom/community plugin [UNVERIFIED]. Proximity readings are unreliable with fabric or stickers over the sensor [CONFIRMED-SRC: patents US10958777/US11316969, weak source type].
- Shake false positives: walking/running with phone in pocket exceeds thresholds; mitigate with minimum threshold + minimum duration + several direction reversals (e.g. 3 peaks > ~15 m/s^2 within 800 ms), cooldown, and only listen while the app is foregrounded. [CONFIRMED-SRC: patent US9823736, weak source type; design values are my estimates, tune on device]. TYPE_SIGNIFICANT_MOTION is not a shake detector (one-shot, no data). [CONFIRMED-SRC: StackOverflow 24567399, 30772893]
- Backgrounded WebView stops sensor events on Android; not an issue if only active while foregrounded. Battery cost is negligible when listening only on the main ledger screens.
- Safer, simpler privacy alternatives: a one-tap "eye" toggle in the header, and auto-hide on app switch (recents screenshot blur using FLAG_SECURE via a plugin, [KNOWLEDGE]). Recommend eye toggle first, shake as optional opt-in toggle in settings (default off), because accidental toggling erodes trust more than the feature adds.
- Priority: low-medium. Effort low (~half day for motion listener + setting + tests; false-positive tuning on real device).

### C2. Amount-scaled haptics
- `@capacitor/haptics`: `Haptics.impact({style: ImpactStyle.Light|Medium|Heavy})`, `Haptics.notification({type: NotificationType.Success|Warning|Error})`, `Haptics.vibrate({duration})` default 300 ms, `selectionStart/Changed/End`. Android needs `VIBRATE` permission in manifest for vibrate; devices without vibrator resolve as no-ops. [CONFIRMED-SRC: capacitorjs.com/docs/v7/apis/haptics and older versions]. Check which plugin version the project pins.
- Scaling: only 3 impact strengths exist, so "scaled" means thresholds (e.g. light < 10, medium < 100, heavy >= 100 AZN, tune per user's median) or relative to the user's typical spend. Do not implement fine gradation; the API cannot do it without custom VibrationEffect amplitude.
- Web fallback: `navigator.vibrate` is Android-Chrome only and not on iOS Safari. [KNOWLEDGE]
- Respect system "touch feedback" and reduced-motion settings; provide a settings toggle. Risk: Haptics on every keypress of a number pad feels noisy on cheap motors (Poco F6 motor is good; budget phones vary [UNVERIFIED]).
- Evidence that this improves retention: none found. Treat as polish. Priority low, effort very low.

### C3. Hide cents in summaries, relative weekday dates, positive empty states
- Hide cents in summaries: show whole units in totals/charts and exact amounts in lists/detail. Rounding must be display-only; totals shown rounded can differ visibly from the sum of rounded rows (note it, or show "~"). Financial-correctness risk is display mismatch, not stored data. Effort low.
- Relative dates ("Today", "Yesterday", "Monday") use `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat` with `az`, `ru`, `en` locales; verify Azerbaijani output quality on target WebView (Android System WebView ICU includes az) [KNOWLEDGE; test]. Use the device's local calendar day, not 24 h offsets (DST not used in AZ since 2016 [KNOWLEDGE], but travellers). Show weekday within last 6 days, absolute date beyond.
- Positive empty states: copy-only change; localise into three languages; check naturalness with a native speaker. Effort very low.
- Evidence these improve retention: I found NO primary evidence for any of the three. Benchmarks that exist are generic app-retention reports and conflict by ~10x (fintech D30 11.6%, finance 4.5%, one unverified claim 38%). [CONFIRMED-SRC: unstar.app benchmarks, businessofapps.com, secondary; Apptopia 38% claim UNVERIFIED]. Treat as usability polish justified by clarity, not proven retention drivers. Measure with the owner's testers rather than claim retention benefit.

---------------------------------------------------------------------
## (d) Ten NEW feature ideas, ranked by value/effort

Evidence quality for emerging-market budgeting is thin in my search: CGAP "Money, Decisions, and Control" (2017) argues for flexible tools (sub-wallets, calendar and image-based savings) over rigid products, and notes low-income users often lack a sense of control and have erratic cash flow [CONFIRMED-SRC: cgap.org working paper Aug 2017]. ideas42 field test (Mali/Madagascar, ~75,000 people) found behavioural SMS nudges raised digital financial service use [CONFIRMED-SRC: ideas42 project brief; effect size not read]. A claim that 67% find budgeting apps "too much effort" has no primary source found [UNVERIFIED, do not cite]. Everything else below is my reasoning; none is validated demand for Azerbaijan.

Ranked (value / effort):
1. Pay-day-aware monthly cycle + irregular income mode (budget periods starting on user-chosen day; "income arrives in lumps" planning). Evidence: CGAP erratic cash flow barrier. Effort: low-medium. Check if existing salary logic covers it.
2. Quick-add from notification/home-screen widget and "repeat last" with recent merchants. Rationale: manual entry friction is the likely main failure point [hypothesis]. Effort: low-medium (widget needs native work).
3. Safe-to-spend / "available until pay day" number (income minus fixed bills minus savings). Derived from existing recurring + budgets. Effort: low. Must be computed from transactions with tests.
4. Bill and recurring-payment reminders with local notifications (Capacitor Local Notifications; Android 13 needs POST_NOTIFICATIONS runtime permission, exact alarms need SCHEDULE_EXACT_ALARM care) [KNOWLEDGE]. Effort: medium.
5. Calendar-based or visual savings goals (CGAP examples). Effort: low-medium; templates to Goals already decided by owner.
6. Cash envelope / sub-wallet tracking for cash spending (cash is common in the target market [UNVERIFIED]). Effort: medium; overlaps accounts.
7. Statement import wizard (section b) for onboarding. Effort: medium-high. Highest value but needs samples; consider ranking 1-2 once samples exist.
8. Debt/loan payoff view (snowball/avalanche, interest) building on existing debts+loans. Effort: medium.
9. Shared-household export/merge (section a, manual file exchange). Effort: medium; demand unvalidated.
10. Gentle behavioural nudges: weekly "check-in" notification with a one-line summary, and plain-language insights (spend-vs-last-month). Rationale: ideas42 SMS result. Effort: low-medium; keep opt-in.

Excluded on purpose: bank API aggregation (regulatory/commercial access unverified), receipt OCR (accuracy and corruption risk), AI chat advice (grounding and privacy burden), crypto/investments.

---------------------------------------------------------------------
## Summary of what is solid vs. weak
Solid: drive.appdata is non-sensitive; appDataFolder is single-user (standard semantics, not re-confirmed); Haptics API surface and permission; accelerometer needs no runtime permission; Azerbaijan open banking is early (launched Oct 2025).
Weak or missing: any real ABB/Kapital/PASHA export format; evidence of retention effect for any micro-feature; household sync demand; Capacitor plugin choices for Google auth and proximity; Azerbaijani Intl formatting quality. Each needs either real samples, a device test, or user validation.

## Sources
- Drive scopes: https://developers.google.com/drive/api/guides/api-specific-auth , https://developers.google.com/drive/api/guides/about-auth
- Drive limits: https://developers.google.com/drive/api/guides/limits
- Capacitor Haptics: https://capacitorjs.com/docs/v7/apis/haptics
- Android SensorManager: https://developer.android.com/reference/android/hardware/SensorManager ; Qt compat map https://doc.qt.io/qt-6/compatmap.html
- Significant motion StackOverflow mirrors: questions 24567399, 30772893; patents US9823736, US9684013, US8952895, US10958777
- Azerbaijan open banking: https://www.cbar.az/press-release-5152/central-bank-holds-open-banking-revolution-business-opportunities-beyond-borders-practical-training ; https://blog.saltedge.com/open-banking-in-azerbaijan-workshop/ ; https://openbankingtracker.com/regulation/azerbaijan-open-banking ; https://www.trend.az/business/4202422.html
- CRDT sizes/design: https://www.pkgpulse.com/guides/yjs-vs-automerge-vs-loro-crdt-libraries-2026 ; secsync via https://awesome.ecosyste.ms/projects/github.com%2Fnikgraf%2Fsecsync
- Retention benchmarks (secondary, conflicting): https://unstar.app/blog/app-retention-benchmarks-2026 ; https://businessofapps.com/?p=98027
- CGAP: https://www.cgap.org/sites/default/files/researches/documents/Working-Paper-Money-Decisions-and-Control-Aug-2017.pdf ; ideas42 brief https://www.ideas42.org/wp-content/uploads/2019/09/ideas42_ProjectBrief_ABMaliMadagascar_3.pdf
