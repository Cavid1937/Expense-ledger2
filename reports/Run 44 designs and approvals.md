# Run 44 (8 Nov 2026) - designs decided, approvals assessed, nothing built

Owner message: approves sync and bank connections; says widgets are too simple; asks me to decide the sinking-fund reserve and the month-end rollover prompt; "don't build anything RN". I read "RN" as "right now" (and it also covers React Native, which this project does not use). So this run is DESIGN and FEASIBILITY ONLY: no app code changed. Everything below is ready to build on the owner's word "build".

Evidence labels: CONFIRMED = read in this repo; SOURCE = web search snippet, not verified against the primary document; OPINION = my judgement.

---

## 1. Sinking-fund reserve in Safe to Spend - DECISION: reuse Goals, no new object

CONFIRMED: Safe to Spend already (a) deducts bills and recurring payments still due this month, and (b) deducts goal contributions (goalContributions / monthlyTarget, with a savings floor). Goals already have `targetDate` and `monthlyTarget`.
Overlap check: a second "reserve" object would double-deduct the same money (a yearly insurance goal AND a reserve). So:

- A sinking fund is a Goal of kind "Planned cost" (amount + date). Nothing new in the Safe to Spend maths.
- New: a "Suggest monthly amount" action that fills `monthlyTarget` = ceil((target - saved) / months until targetDate, in whole qəpik), and recomputes only when the user taps it. Never silent.
- New, opt-in per yearly or quarterly bill: "Set money aside for this bill" creates such a goal (amount = bill amount, date = next due date). The bill's own due-month deduction then avoids double counting: in the month the bill is due, the goal is marked as paid by linking the payment (the existing goal "spent from goal" path) - to be verified in tests before shipping.
- Safe to Spend card keeps one line "Set aside for goals: -X" (exists). No hidden slush fund.
Risks: (1) goal paid out but contribution still deducted -> tests for the due month; (2) users with many goals see Safe to Spend drop - the explanation line must show it; (3) irregular income - same rule as goals today.
Effort: small-medium (about 1 run). Acceptance: hand-worked figures for 1200 due in 6 months with 0 saved = 200/month; due month; goal over-funded; date in the past; backup round trip.

## 2. Month-end rollover prompt - DECISION: a Home card on days 1-5, never automatic

- Trigger: from the 1st to the 5th, if the previous month's result (money in minus spending, using the same spending list as every view, so money others will pay back is respected) is at least 20 currency units AND at least 5% of that month's money in, AND the user has at least one goal (otherwise the card offers "Create a goal").
- Card: "Last month you kept 180.00. Move some of it to a goal?" Choices: a goal (default: the one with the nearest date), amount presets All / Half / Custom, and "Not now". Not now hides it for that month only; the dismissal is stored per month in a side key (expense_ledger_v5__rollover) so it never nags twice.
- Action: adds the amount to the goal's saved figure with an Undo snackbar (same path as the existing goal contribution). It does NOT create a transaction (money does not leave the ledger).
- Honesty line: "This only records your plan; it does not move money between accounts." If the held balance (accounts) is lower than the amount, the card says so.
- Never shown when the previous month is negative, when the app lock is on and the app was just opened (after unlock only), or in hide-amounts mode it shows "***".
Risks: "kept" money is not cash on hand (spent next month) - hence the honesty line and the held-balance check; tone - no praise/scolding. Effort: small (about 1 run). Acceptance: hand-worked months, dismissed month stays dismissed, new month shows again, undo restores goal exactly.

## 3. Sync across devices - APPROVAL NOTED; plan and the owner steps it needs

The app has no per-entry `updatedAt` and no delete tombstones (CONFIRMED: no such fields in App.jsx), so a safe merge between two phones is impossible today. Sync therefore starts with the data model, not the transport.

Phases (each independently testable, nothing reaches users until its tests pass):
- S1 Data model: optional `updatedAt` on every record set on add/edit, and a `deleted` list of {id, at} (tombstones, capped). Old files load unchanged. Backup round trip tests.
- S2 Merge: pure function merge(localState, remoteState) -> state: per record the newer `updatedAt` wins; a tombstone newer than the record's `updatedAt` deletes it; settings use last-writer with the older kept as a recovery copy; deterministic; fully tested with hand-built conflicts (edit/edit, edit/delete, add/add same id). No transport needed to test.
- S3 Transport, recommended option A: the user's own Google Drive app-data folder (scope drive.appdata), data end-to-end encrypted with the existing passphrase backup encryption (PBKDF2, Run 32) so Google sees only ciphertext. No server of ours, no running cost. OPINION: best fit for a local-first, privacy-first app. SOURCE: precedents exist (Bothy, Actual-style merge); I did not confirm Google's appDataFolder quotas or that a pure browser PWA can use it without a backend token exchange - to verify against Google's docs before S3.
  Option B (not recommended now): our own backend/relay (e.g. Supabase) - monthly cost, accounts, privacy policy, support burden.
- S4 UI: "Sync" in Settings, status line, conflict summary, "Sync now", turn off. Safe defaults: off.
OWNER STEPS (I cannot do these; they are external accounts): create a Google Cloud project and OAuth client for the app (free), add the redirect URLs, and tell me the client id. No payment is needed for option A.
Approval boundary: I will not create accounts or enter credentials; this plan needs only the client id from the owner.
Effort: S1+S2 about 2 runs (no owner input needed - can start any time), S3+S4 about 2 runs after the client id.

## 4. Bank connections - APPROVAL NOTED, but approval does not unlock access

SOURCE (web search, 8 Nov 2026; not verified against cbar.az): the Central Bank of Azerbaijan runs a centralized open-banking gateway; a Salt Edge post dated 30 Mar 2026 says the National Open Banking platform launched on 6 Oct 2025 and is early stage; a CBAR document says third-party providers exchange data through an API gateway provided by the Central Bank. Kapital Bank's open API portal is for businesses, not personal accounts. I found no ABB developer API and no PASHA developer resources.
Conclusion (OPINION, strong): getting account data through that gateway requires being a licensed payment service provider (account-information service) or working through one. A hobby app cannot self-enrol. The owner's approval is welcome but does not change that.
Realistic paths, in order:
1. Keep improving import (works today, private, no licence): CSV bank statements (exists), then PDF/Excel statement text paste and a bank-specific parser per bank once the owner supplies redacted samples.
2. Ask a licensed aggregator (Salt Edge is active in Azerbaijan per its blog) for coverage, pricing, consumer-app terms. Needs the owner to make contact; this is a business decision with ongoing cost and legal duties (consent, data protection) - assess before any build.
3. Android notification reading (APK only): Play restrictions and silent-failure risk; only with explicit consent and a visible review list; deferred.
Nothing is built. Owner action: redacted ABB / Kapital (Birbank) / PASHA statements or notification texts (as already promised), and optionally contact an aggregator.

## 5. Widgets - owner: "too simple" - DESIGN (APK work, not built)

CONFIRMED today: one widget with a quick-add button and one optional Safe to Spend line (off by default, hidden when Hide amounts is on) (App.jsx widgetLine, widgetNative).
Proposed set (all follow the same privacy rule: amounts are hidden when Hide amounts is on, with an option "show amounts on the home screen" off by default):
- Small 2x1 "Safe to Spend": the number, per-day figure, and the new "may run out around day N" line when it applies; colour from the chosen theme.
- Medium 4x2 "Today and month": spent today, month spent vs budget bar, the next two bills due, and three quick-add buttons (the user's three most used categories, or templates) that open the add form prefilled (the add link already exists).
- Tap on the number opens Home; tap on a bill opens Bills.
- Refresh: on every save, on midnight, and every 6 hours; never shows stale data older than one day without saying "updated D Mon".
- Light/dark and theme-aware, readable at large font sizes.
Constraints: needs the Android shell (separate Capacitor repo) and can only be verified on the emulator here, not the Poco F6 (the owner's phone); a rebuilt APK is required and the owner said "not yet" to APKs. Effort: medium (1-2 runs plus APK). Not started.

## Build order proposed (when the owner says build)
1. Rollover prompt (small, no headline-number change).
2. Sync S1+S2 (data model + merge, no owner input, high value, foundation for everything else).
3. Sinking-fund via goals ("Suggest monthly amount", yearly-bill set-aside).
4. Widgets (with the next APK).
5. Sync S3/S4 once the Google client id exists.
6. Bank: import improvements as samples arrive; aggregator only after the owner's business decision.
