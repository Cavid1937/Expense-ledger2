# Technical options for multi-person (family/household) sharing in a local-first finance app

Researched 17 Nov 2026 by a research sub-agent. About 20 tool calls. Pricing pages were fetched on this date. Treat every price as "as fetched on 17 Nov 2026"; these pages change often. Anything under "Inferences" is engineering judgement, not a sourced fact. Effort and cost figures are estimates.

Local codebase fact (inspected, not web-sourced): the worktree already contains `syncMerge.js` (record-level merge: higher `updatedAt` wins, on a tie a deletion wins, tombstones pruned after 90 days). Its header says it is "NOT wired into the app yet: records are not stamped with updatedAt, deletions are not recorded as tombstones". Every sync option below (b to f) depends on the app first stamping records with `updatedAt` and keeping deletion tombstones.

## Options ladder (a) to (f): what each is, cost, effort, privacy and the "no account needed" promise

### Takeaway
Only options (a) and (b) keep both $0 running cost and "no account needed". Option (c) cannot use the private Drive app folder for sharing. Options (d) and (e) bring in accounts or a server plus free tiers that pause or deactivate. Option (f), true end-to-end-encrypted group sharing with member removal, is still research-grade outside a few young libraries (Jazz, Evolu, Keyhive pre-alpha).

### Cited Findings
**(c) Shared cloud file**
- Google Drive appDataFolder: "You can't share files or folders inside the application data folder"; trying returns `notSupportedForAppDataFolderFiles`; the scope is `drive.appdata` — [Google Drive API: appdata guide](https://developers.google.com/workspace/drive/api/guides/appdata)
- Money Manager Ex (an open-source finance app that keeps its database as a cloud file) shows the failure mode: when both the device copy and the cloud copy had changed, the app showed an error and refused to overwrite either. Its docs say sync problems "may occasionally occur due to ... concurrent modifications on different devices" — [MMEX quickstart](https://android.moneymanagerex.org/quickstart/start_companion); [MMEX forum](https://forum.moneymanagerex.org/viewtopic.php?p=14264)

**(d) Backend-as-a-service**
- Supabase Free: 500 MB database per project, 50,000 MAU, 5 GB egress, 1 GB file storage, at most 2 active projects, and "projects pause after 1 week of inactivity". Pro is from $25/month with 100,000 MAU, 8 GB disk, 250 GB egress and no pausing. Overages: $0.00325 per MAU, $0.125 per GB of disk, $0.09 per GB of egress. "Advanced MFA - Phone" is not on Free; on Pro it is $75/month for the first project — [Supabase pricing](https://supabase.com/pricing)
- Firebase Spark (free): Firestore 1 GiB stored, 50K reads/day, 20K writes/day, 20K deletes/day, 10 GiB egress/month; Authentication 50K MAU. Phone auth is "Not applicable" on Spark; on Blaze it is billed per SMS. Above the free quotas, Blaze bills Firestore at Google Cloud prices (not listed on that page) — [Firebase pricing](https://firebase.google.com/pricing)
- PocketBase and Appwrite: not researched in this pass (see Gaps).

**(e) Local-first sync engines / CRDTs**
- PowerSync Cloud Free: 2 GB synced per month, 500 MB hosted, 50 peak concurrent clients. Free projects are deactivated after 1 week of inactivity; another line on the same page says 2 weeks, so the page contradicts itself. Pro is from $49/month (30 GB synced, 1,000 concurrent clients, then $30 per extra 1,000). A free, self-hostable "Open Edition" exists; the page does not name its licence — [PowerSync pricing](https://www.powersync.com/pricing)
- Automerge is a CRDT library: concurrent edits merge automatically without a central server, and history can be viewed, branched and merged. `automerge-repo` provides networking, and a server over WebSocket is optional. The intro page mentions no access control or encryption; an "automerge-repo-keyhive" guide is listed as "Coming Soon" — [Automerge docs](https://automerge.org/docs/hello/)
- Evolu: end-to-end encrypted by default. The relay sees owner IDs, timestamps and encrypted blobs. Collaboration uses `SharedOwner` (write) and `SharedReadonlyOwner` (read-only). Removing a member means creating a new owner without them — [Evolu privacy docs](https://evolu.vercel.app/docs/privacy); [Evolu Owner API](https://evolu.vercel.app/docs/api-reference/common/local-first/interfaces/Owner). MIT licence and self-hostable relay per a third-party listing only — [Toolradar](https://toolradar.com/tools/evolu-local-first)
- Jazz: writes are signed transactions validated against the owning Group's roles. Admins give a symmetric "read key" to readers. When a member is removed the read key rotates, so "removed members can't read new data but keep access to what they already had". Roles are admin, manager, writer, reader and writeOnly, and groups can contain groups — [Jazz encryption docs](https://jazz.tools/docs/react/reference/encryption); [Jazz groups](https://jazz.tools/docs/react/groups/intro)
- InstantDB: only third-party aggregator pricing was found (Free $0 with 1 GB, Pro $30/month). Not verified — [Toolradar InstantDB](https://toolradar.com/tools/instantdb/pricing)
- Ink & Switch's "Local-first software" essay (Kleppmann et al., 2019) sets seven ideals: fast, multi-device, offline, collaboration, longevity, privacy, user control. It names CRDTs as the promising foundation — [Ink & Switch, Local-first software](https://www.inkandswitch.com/local-first/)

**(f) End-to-end encrypted group sharing**
- Keyhive (Ink & Switch): access control for local-first apps. It combines convergent capabilities (signed delegations), self-certifying groups that can revoke without central coordination, and BeeKEM, a group key agreement that needs only a causal order and aims for forward secrecy and post-compromise security. Pre-alpha released March 2025 with the warning "DO NOT use this release in production applications"; not security-audited at that time — [Keyhive notebook](https://www.inkandswitch.com/keyhive/notebook/)
- Keyhive's statement of the problem: cloud apps enforce permissions at the server, but in local-first apps every device holds a full copy, so access control must travel with the data and work offline. Hard cases include backdated operations and "admins who concurrently revoke each other" — [Keyhive notebook](https://www.inkandswitch.com/keyhive/notebook/)

### Inferences
Engineering judgement; all estimates. Estimates assume one experienced developer plus AI help.

| Option | Running cost: 100 / 10k / 100k families | Account needed? | Effort (estimate) | Main risk |
|---|---|---|---|---|
| (a) Read-only summary or export (PDF/image/JSON, share sheet) | $0 / $0 / $0 | No | 1–2 weeks | A stale copy; the sender leaks data by choice |
| (b) Manual file/QR exchange plus duplicate-safe merge (`syncMerge.js`) | $0 / $0 / $0 | No | 3–6 weeks (stamping, tombstones, merge UI, tests) | Users forget to sync; conflicts are resolved silently by last-writer-wins |
| (c) Shared file in the user's own Drive/Dropbox (full `drive.file` or Dropbox scope, file shared between Google accounts) | $0 to the app (users' storage) | Yes (Google/Dropbox, on every member) | 4–8 weeks | Whole-file overwrite races (MMEX evidence); needs app-level merge anyway; OAuth verification for broader Drive scopes |
| (d) Supabase/Firebase with row-level security | 100: $0 if active weekly; 10k: ~$25–50/month; 100k: roughly $25 + MAU overage (~(MAU−100k)×$0.00325) + compute. Rough guess $100–$1,000/month depending on the members-per-family multiplier | Yes | 2–4 months | Server holds readable financial data (no E2E); the free tier pauses; GDPR/AZ data-law duties |
| (e) Sync engine (PowerSync/Electric/Zero on Postgres, or a CRDT relay) | Like (d) plus the engine; self-hosted relay on a ~$5–20/month VPS | Usually yes (identity for routing) | 2–5 months | Young products, lock-in, schema migrations across offline devices |
| (f) E2E group sharing (Jazz/Evolu, or a custom Actual-style system with a shared key) | Relay only: $0–$20/month at small scale; storage grows with history | Can be avoided (key or QR invite instead of an account) | 3–6+ months; member removal is the hard part | Key loss means data loss; member removal cannot take back data already synced |

- The cost rows for 10k and 100k families are extrapolations from the published quotas, not quotes. 10k families × ~2.5 members ≈ 25k MAU fits Supabase Free on MAU count, but the 7-day pause and 500 MB limit make Free unsuitable for production. A paid floor of $25/month is the realistic minimum for a sync product with real users.
- Supabase's free-tier pause is a real hazard for a sync product: if nobody opens the app for a week, sync breaks until someone restores the project. The pause is per project, not per user, so any real user base keeps it awake; the risk is mainly during early testing.
- Only (a), (b) and (f) can honestly keep "no account needed". (f) does this by using a key or QR invite as the identity.

### Gaps
- PocketBase (self-host; free software, so the cost is the VPS), Appwrite Cloud free-tier limits, ElectricSQL Cloud pricing, Zero/Replicache, Triplit, RxDB replication licensing, cr-sqlite status, and Yjs specifics were not fetched in this pass. Yjs is a well-known text/structure CRDT with no built-in access control, but that was not re-verified here.
- The InstantDB official pricing page was not reached.

## Conflict handling for money records, offline behaviour, and how Actual Budget syncs

### Takeaway
Actual Budget, the closest open-source analogue, syncs with per-field last-writer-wins messages ordered by a hybrid logical clock (HLC), with optional end-to-end encryption. Its own docs warn against two people using the same file at the same time. For money, a silent automatic merge needs to come with a visible history and "conflict" flags, not replace them.

### Cited Findings
- Actual docs: data lives on each device and on the server and syncs in the background. "Actual stores all mutations in the budget file by default". Optional E2E encryption uses a key derived from a separate password, data is encrypted before leaving the device, and encryption cannot be switched off once enabled. Two people can open the same file at once, which works "unless the edits conflict"; the docs advise avoiding simultaneous use. A sync reset makes one device the "true" version, and unsynced changes on other devices are lost — [Actual docs: sync](https://actualbudget.org/docs/getting-started/sync/)
- Actual's sync messages carry an HLC timestamp (globally unique, monotonic). The 2019 design rejected clients whose clock drifted more than 1 minute; current code may differ — [James Long, "Using CRDTs in the wild" (archive)](https://archive.jlongster.com/using-crdts-in-the-wild); [dotJS slides](https://archive.jlongster.com/s/dotjs-crdt-slides.pdf)
- Third-party reading of the current repository: a "HULC" clock, a total order of all changes, and Merkle-tree diffing to find what needs syncing. Unofficial; verify against the repository — [read: actual budget local-first sync](https://jamesgeneva-site.pages.dev/posts/read-actual-budget-local-first-sync)
- HLC = wall clock + logical counter + node ID — [dimfeld, reading the CRDTs-for-mortals code](https://dev.to/dimfeld/reading-the-crdts-for-mortals-example-code-2pb)

### Inferences
- Recommended rules for money records (judgement):
  - Amounts stay integers in minor units.
  - Merge per record, not per field, for amount + currency + account + date, so no record ends up with a mixed amount from one person and a currency from another.
  - Last-writer-wins by HLC rather than wall-clock `updatedAt`, because phone clocks drift. `syncMerge.js` currently uses a wall-clock `updatedAt`, so it is exposed to clock skew.
  - Deletions are tombstones. A delete racing an edit should show "deleted by X, edited by Y" rather than resolving silently.
  - Balances should never be synced as stored numbers; always recompute them from entries. Otherwise two devices can hold different "truths".
- Duplicate risk: two members entering the same shared purchase creates two records with different IDs. That is not a sync conflict but a duplicate-detection problem (same amount, date and account within a short window). It needs a "possible duplicate" prompt.
- Offline: options (b), (e) and (f) are fully offline-capable. Option (d) needs an offline queue (Firestore has one; with Supabase alone the app must build one).

### Gaps
- Exactly how Actual resolves an edit racing a delete in its current code was not confirmed from a primary source.

## Permissions model (owner/partner/child viewer, per-account visibility) and "hide from children"

### Takeaway
Hiding data in the app UI on a device that has already received the data is not security. Real "hide from children" needs either server-side enforcement (row-level security in (d)) or cryptographic separation (separate keys or groups per visibility scope in (f)), with private data never sent to that device.

### Cited Findings
- Supabase/Postgres row-level security is the server-enforced model in (d). The pricing page confirms the auth/MAU model but not RLS details — [Supabase pricing](https://supabase.com/pricing)
- Jazz models permissions as Groups with roles (admin/manager/writer/reader/writeOnly). Readers get a symmetric read key, so a viewer that lacks a group's key cannot decrypt that group's data — [Jazz groups](https://jazz.tools/docs/react/groups/intro); [Jazz encryption](https://jazz.tools/docs/react/reference/encryption)
- Evolu separates read-only sharing (`SharedReadonlyOwner`) from write sharing (`SharedOwner`) — [Evolu Owner API](https://evolu.vercel.app/docs/api-reference/common/local-first/interfaces/Owner)

### Inferences
- A practical model: one "household space" for shared accounts, plus personal spaces that are never synced. In (f), per-account visibility means one group/key per shared account or scope. A child viewer only receives the keys for the scopes they may see.
- In (b) (file exchange), the exporter must filter before export (a "share only these accounts" option). The receiving phone then has only what was sent. That is real separation, as long as the filtering happens before the file leaves the phone.
- A "child viewer" that is read-only on the device can be bypassed: someone can edit the local data and re-sync. Read-only must be enforced by the receivers rejecting unsigned or unauthorised writes (Jazz-style signatures) or by the server (RLS).

### Gaps
- How YNAB, Monarch and others enforce per-account visibility internally is not public in the sources found.

## Authentication: phone OTP in Azerbaijan, Google sign-in, invite links

### Takeaway
SMS one-time codes to Azerbaijan are expensive (published per-message rates around $0.25–$0.47) and Supabase charges extra for phone auth. Google sign-in (already in the app) or an invite link/QR code are the cheap paths.

### Cited Findings
- Plivo official per-carrier outbound SMS to Azerbaijan: Azercell $0.2483, Azerfon/Nar $0.4717, Bakcell $0.3390 per SMS — [Plivo Azerbaijan pricing](https://www.plivo.com/sms/pricing/az/)
- A third-party comparison lists Twilio's Azerbaijan base rate at $0.3877 per SMS; Twilio's own SMS page for Azerbaijan was not found — [sent.dm](https://www.sent.dm/en/resources/sms-pricing/azerbaijan-sms-pricing)
- Firebase phone auth is Blaze-only and billed per SMS — [Firebase pricing](https://firebase.google.com/pricing)
- Supabase phone auth add-on: $75/month (Pro/Team), not available on Free — [Supabase pricing](https://supabase.com/pricing). (Note: this pricing line is labelled "Advanced MFA - Phone". Whether plain phone sign-in also needs it, rather than just your own SMS provider bill, was not confirmed.)

### Inferences
- Example: 10,000 SMS logins a month × ~$0.35 ≈ $3,500/month. That is incompatible with a $0 target. Avoid phone OTP.
- An invite link or QR code that carries a one-time pairing secret (and, in (f), the group key) gives the "no account" path. Treat links as secrets: single use, expiring, and never put financial data in the URL.

### Gaps
- Local Azerbaijani SMS aggregators' prices were not researched.

## Security pitfalls: leaks, account takeover, controlling-partner abuse, audit trail, leaving

### Takeaway
Shared finance features are "dual-use": research on intimate-partner surveillance and economic abuse shows legitimate sharing tools are routinely repurposed for control. The design must assume one household member may be the adversary.

### Cited Findings
- Cornell Tech/NYU study "The Spyware Used in Intimate Partner Violence" (Chatterjee, Doerfler, Orgad, Havron, Palmer, Freed, Levy, Dell, McCoy, Ristenpart): defines "dual-use" apps, legitimate tools easily repurposed to spy on a partner; finds them often as powerful as overt spyware; anti-virus flagged at most 13% — [IPV Spyware paper](https://www.cs.cornell.edu/~rahul/papers/IPV_Spyware.pdf)
- Freed et al., "A Stalker's Paradise": a qualitative study of 89 participants; abusers exploit dual-use apps such as family-locator apps — [Stalkers paper](https://www.classes.cs.uchicago.edu/archive/2020/winter/20370-1/readings/Stalkers.pdf)
- Northumbria University / Surviving Economic Abuse report (Royal, Wiper & Barros Pena, 2025): joint accounts are a central economic-abuse risk (draining accounts, debts in a partner's name). It proposes dual approval for large actions and the ability to separate holders — [Northumbria press release](https://newsroom.northumbria.ac.uk/pressreleases/report-calls-on-the-uk-banking-industry-to-consider-interventions-that-design-out-economic-abuse-3422784); [Fintech Global summary](https://fintech.global/2025/12/23/researchers-warn-banking-systems-enable-economic-abuse/)
- An NSF-hosted paper audits consumer fintech for resistance to intimate-partner abuse (title and authors not confirmed in the results) — [par.nsf.gov](https://par.nsf.gov//servlets/purl/10463032)
- Jazz: removed members keep the data they already had — [Jazz encryption](https://jazz.tools/docs/react/reference/encryption). Evolu: removing someone means making a new owner without them — [Evolu privacy](https://evolu.vercel.app/docs/privacy)

### Inferences
Design rules (judgement):
- Personal entries and accounts are private by default; sharing is opt-in per account.
- A visible "who can see this" indicator on every shared account.
- Every member can see the full member list and the last-sync time of each member (no silent viewers).
- Notify everyone when a member is added or their role changes.
- Any member can leave unilaterally and take their own private data.
- Owner-only destructive actions (delete household, remove member) need confirmation and are logged.
- No location, no "last seen" tracking.
- Store a "created by / edited by" history on each record (an audit trail). This builds trust and helps resolve disputes, but it can also be used for surveillance. Show it to everyone equally rather than only to the owner.
- Leaving: be honest in the UI that data already copied to another phone cannot be taken back. Rotate keys (in (f)) so new entries are not shared after leaving.
- Account takeover: in (d), a stolen Google account means the whole household is exposed. In (f), a stolen phone with an unlocked app means the same. App lock/biometrics and remote revocation (key rotation) are the mitigations.

### Gaps
- No primary source found specifically on abuse via shared budgeting apps (as opposed to banking or spyware).

## Testing approaches for multi-device sync correctness

### Takeaway
Use property-based and randomized tests: generate random sequences of edits and deletes on simulated devices, deliver them in random orders, and assert that all replicas converge and the money totals match an independently computed result.

### Cited Findings
- The Actual docs acknowledge out-of-sync states arise from sync bugs and offer a reset — evidence that convergence bugs happen even in mature tools — [Actual docs: sync](https://actualbudget.org/docs/getting-started/sync/)

### Inferences
- Test layers:
  1. Unit tests of the merge function: commutative (`merge(a,b)` = `merge(b,a)`), associative, idempotent (merging the same data twice changes nothing).
  2. Randomized simulation of 3–5 in-memory devices with partitions, reordering, duplicated delivery and clock skew of ±hours.
  3. Invariants: identical record sets after full exchange; balances equal the sum of live entries; no record resurrected after a tombstone unless edited later; no duplicate IDs.
  4. Two-browser end-to-end tests (Playwright with two contexts) for the UI.
  5. Migration tests where an old app version syncs with a new one.
- Libraries such as fast-check (JavaScript property-based testing) fit the existing JS test stack. Not researched here.

### Gaps
- No formal sources fetched on sync testing methodology (for example Jepsen-style testing).

## What existing apps use

### Takeaway
Most mainstream apps (YNAB, Monarch, Goodbudget) use server accounts with cloud sync. Actual is the main local-first, end-to-end-encrypted example. Facts on Monefy and Zenmoney were not found.

### Cited Findings
- Goodbudget's free plan syncs a "Household" across up to 2 mobile devices plus the web; the paid plan allows 5 — [Goodbudget: Sync your household](https://goodbudget.com/?p=3447)
- YNAB Together shares one subscription with up to 6 people (third-party sources; the vendor page was not fetched) — [Finder](https://www.finder.com/budgeting/budgeting-apps-for-couples); [Rob Berger](https://robberger.com/ynab-vs-monarch-money/)
- Monarch: each partner has their own login, links their own accounts and chooses what to share. Whether a partner costs extra varies by source — [Useorigin](https://useorigin.com/resources/blog/best-joint-budgeting-apps-for-couples-in-2026); [Rob Berger](https://robberger.com/ynab-vs-monarch-money/)
- Actual: self-hosted or managed sync server, CRDT/HLC messages, optional E2E — [Actual docs: sync](https://actualbudget.org/docs/getting-started/sync/)

### Inferences
- The Monarch "each partner chooses what to share" model matches the safest permission design above.

### Gaps
- Monefy's Dropbox/Google Drive sync mechanism and its conflict behaviour, Zenmoney's family access, and Spendee's shared wallets: no primary sources were found in this pass.
