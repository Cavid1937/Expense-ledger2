# Expense Ledger — Security Review and Completion Record (Run 107, 18 Nov 2026)

Answers the owner's assignment of 17 Nov 2026, "Security Research, Completion Blueprint & Final Claude Execution Assignment".
Everything here is **local only**. Nothing was pushed, deployed or changed on any live service. Production was only read, using
rollback-only SQL blocks that cannot save anything.

Status words: VERIFIED · IMPLEMENTED BUT UNVERIFIED · NEEDS WORK · BLOCKED · NOT ASSESSED · DEFERRED WITH REASON.

---

## 1. Baseline (what was reviewed)

| Item | Value |
|---|---|
| Repository | github.com/Cavid1937/Expense-ledger2 |
| Working copy | worktree `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26` |
| Start of this run | `4a481fc` (Run 106, local, not pushed) |
| End of this run | see PHASE_CHECKPOINT.md entry 0002c for the final commit (Run 107 commits start at `3a3774d`) |
| Live site | release 105 at `cf4a596` on `origin/main` (Vercel, expense-ledger2.vercel.app) |
| Other worktrees (untouched) | main checkout `6fb8cd1` (protected baseline); `Expense-ledger2-capacitor` at `8cc8827` (Android shell) |
| Stack | React 18.3.1, Vite 5.4.21, pdfjs-dist 3.11.174, Node 24.22.1, npm 11.19.1 |
| Storage | browser localStorage, permanent key `expense_ledger_v5` (unchanged) |
| Optional services | Supabase project `qkztocsrxhubsljtsjpd` (account copy + anonymous add-only tables), Google Sign-In (GIS), Google Drive `drive.appdata`, api.frankfurter.dev exchange rates, Vercel Web Analytics |

### Architecture in one paragraph
The app is a single-page web app. All financial data lives on the phone in localStorage. A service worker (`public/sw.js`,
cache `ledger-shell-v3`, same-origin only) lets it open offline. An account is optional: signing in with Google keeps one copy
of the ledger in the Supabase table `ledgers`, one row per user, protected by Row Level Security. Drive backup writes a file into
the app's hidden Drive folder (`drive.appdata` scope). Imports (backup JSON, CSV, Excel, PDF bank statements) are read on the
phone; nothing is uploaded for reading. The Android app is the same web code inside Capacitor.

---

## 2. Requirement matrix

| # | Requirement (assignment) | Status | Evidence |
|---|---|---|---|
| R1 | Baseline recorded | VERIFIED | §1 above; `git log`, worktree list |
| R2 | Requirement matrix | VERIFIED | this table |
| R3 | Research from official sources | IMPLEMENTED BUT UNVERIFIED | §3; the Google Identity Services CSP list was re-fetched on 18 Nov and matches; the other sources were applied from known guidance, not re-fetched |
| R4 | Threat model | VERIFIED | §4 |
| R5a | XSS / unsafe HTML sinks | VERIFIED | §5 F3; `security.test.mjs` SEC-2; `e2e_run107_security` R107-B1 |
| R5b | Content Security Policy, report-only first, no `unsafe-eval` | IMPLEMENTED BUT UNVERIFIED (live) / VERIFIED (local, enforced) | `vercel.json`; `tests/pwa/csp-check.mjs` 14/14 with the policy enforced. Live report-only phase not started (needs push). |
| R5c | Other security headers | VERIFIED locally | `vercel.json`; csp-check CSP-1 |
| R5d | Storage audit (what is kept where) | VERIFIED | `docs/DATA_FLOWS.md` |
| R5e | Service worker audit | VERIFIED | same-origin only, network-first pages, no ledger data cached; offline-check 17/17, csp-check offline reopen |
| R5f | HTTPS | VERIFIED | live HEAD request 18 Nov: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; all hard-coded hosts are https. The live site sends no other security headers yet (before-state). |
| R5g | Sign-out must NOT wipe the ledger; no `Clear-Site-Data: "storage"` | VERIFIED | `e2e_run81_account` R81-B7 (sign-out forgets the session only, phone + cloud copy stay); csp-check asserts no Clear-Site-Data |
| R6a | Supabase inventory | VERIFIED | §5 F6 |
| R6b | RLS two-user test | VERIFIED (17 Nov, production, rollback-only) | results quoted in `docs/security/supabase_rls_check.sql` |
| R6c | Grants / definer functions | NEEDS WORK (hygiene) | extra TRUNCATE/REFERENCES/TRIGGER grants; fix written UNAPPLIED, owner action |
| R6d | Publishable keys only in the client | VERIFIED | only `sb_publishable_…` in code; history scan found no secret key |
| R7 | Auth + Drive lifecycle, minimal scope, backup location unchanged | VERIFIED (code + existing tests) / real Google sign-in BLOCKED | scope `drive.appdata` only; no client secret; e2e_run81 uses a fake server. A real Google account sign-in has never been run by Claude (needs the owner's account). |
| R8 | Staged restore: validate, preview, choose, atomic apply, reconcile | VERIFIED (existing) + gaps closed | existing: e2e_import 53, e2e_run104_restore 33, e2e_run32_restore/enc, e2e_run18 atomic import. New: cut-off file, `__proto__` keys, 50 MB limit |
| R9 | Financial integrity checks, no broad rewrite | VERIFIED | logic 2865 checks; one real defect fixed (F1) |
| R10 | Import/export hardening: size limits, CSV formula injection, untrusted strings | VERIFIED | F2 (50 MB limit, new), CSV guard (existing, now tested), hostile strings tests |
| R11 | Dependency audit, compatible fixes only | DEFERRED WITH REASON | §5 F7: remaining advisories need major upgrades; the PDF.js one is mitigated and now guarded by a test |
| R12 | Secret scan | VERIFIED | §5 F8: 435 commits, dist/, Android worktree: no secrets |
| R13 | Local CI config only | VERIFIED (updated in Run 108) | `.github/workflows/check.yml`, `.github/dependabot.yml`. After the release 107 push the workflow ran green on GitHub's Linux machines (Actions run 44224759210). Run 108 limits Dependabot to minor and patch updates (major versions need a planned upgrade). |
| R14 | Privacy data-flow inventory, no new telemetry, logs redacted | VERIFIED | `docs/DATA_FLOWS.md`; nothing new added; crash and feedback text already redacted |
| R15 | Incident playbook | VERIFIED (document) | `docs/INCIDENT_PLAYBOOK.md` |
| R16 | Tests with exact commands and counts | VERIFIED | §6 |
| R17 | Release gates | VERIFIED (defined) | §7 |
| R18 | Checkpoint / Notion / evidence log | see PHASE_CHECKPOINT.md entry 0002c and the Notion report of 18 Nov |
| R19 | Final report | delivered in chat and Notion |

Owner decisions respected: account stays optional; light setup then account/Drive restore before an empty ledger (unchanged);
no new tracking (screen tracking NOT APPROVED, nothing added); az/en/ru first-run choice unchanged; D1/D9/D10 untouched.

---

## 3. Research sources

These were used as the yardstick. They are named so each finding can be checked against them. Honest note: in this run the
facts below were applied from the documents' published guidance as known to Claude (knowledge to mid-2026); the pages were not
re-downloaded tonight, except the Google Identity Services setup page (fetched 18 Nov 2026): it lists exactly the four `gsi` entries used in `vercel.json`, and says COOP changes are only needed when FedCM is off (`same-origin-allow-popups`); the app sets no COOP, which leaves popups working.

- OWASP ASVS 5.0.0 (2025): V1 encoding/sanitisation, V3 web front-end (CSP, headers), V5 file handling (size limits), V14 data protection.
- OWASP Top 10:2025: A01 broken access control (RLS), A03 supply chain, A05 injection (XSS, CSV formulas).
- NIST CSF 2.0 (2024) Identify/Protect/Detect/Respond/Recover — used to shape the incident playbook.
- NIST SP 800-61 Rev. 3 (2025) incident response — playbook phases.
- MDN: Content-Security-Policy, `Content-Security-Policy-Report-Only`, `securitypolicyviolation` event, Permissions-Policy, Clear-Site-Data.
- Google Identity Services: "Setup CSP for GIS" — `script-src https://accounts.google.com/gsi/client`, `frame-src https://accounts.google.com/gsi/`, `connect-src https://accounts.google.com/gsi/`, `style-src https://accounts.google.com/gsi/style`; COOP `same-origin` breaks the popup.
- Google Drive API: `drive.appdata` is a non-sensitive scope limited to the app's hidden folder.
- Supabase docs: Row Level Security; API keys (publishable vs secret; `service_role`/`sb_secret_` never in a client); Database advisors.
- GitHub docs: Dependabot version/security updates; Actions `permissions: contents: read`.
- Vercel docs: `vercel.json` `headers`; HSTS on Vercel domains.
- GitHub advisory GHSA-wgrm-67xf-hhpq (PDF.js ≤ 4.1.392 arbitrary JS via a crafted font when `isEvalSupported` is true).

---

## 4. Threat model

**What we protect:** (1) the ledger on the phone (money history, accounts, debts); (2) the account copy in Supabase;
(3) the Drive backup; (4) the person's Google identity; (5) the trust that figures are correct.

**Who or what could cause harm**

| Threat | Path | Main defences | Residual |
|---|---|---|---|
| Malicious or broken file opened by the user (backup, CSV, Excel, PDF) | Import screen | parse in page, preview before apply, atomic apply, refuse partial files, 50 MB limit (new), PDF 30 MB / 400 pages, `isEvalSupported:false`, formula guard on export | A crafted PDF still runs through PDF.js 3.x parsing code (major upgrade deferred) |
| Hostile text inside data (shop names, notes, categories) | rendering, totals | React escapes text; HTML sinks only take fixed drawings; prototype-safe lookups (new) | none known |
| Script injection via a third-party script or a future bug | the page | CSP (report-only now, enforce after a clean week), no `unsafe-eval`, inline scripts by hash | `style-src 'unsafe-inline'` needed by React inline styles |
| Another signed-in user reading my cloud copy | Supabase REST | RLS own-row policies, proven with two users | extra grants (hygiene, owner action) |
| Someone with only the public key | Supabase REST | anon can only INSERT into add-only anonymous tables; cannot read any table (42501) | spam rows in those tables (low; size checks exist) |
| Stolen/lost phone | device | optional app lock; data never leaves except by user choice | localStorage is not encrypted at rest by the app (browser/OS protection only) |
| Leaked secret in the repository | git history | scan: none found | — |
| Compromised npm package | build | lockfile now tracked (exact versions), Dependabot proposals | no signature verification of packages |
| Clickjacking / framing | browser | `X-Frame-Options: DENY`, `frame-ancestors 'none'` (report-only until enforced) | — |
| Accidental data loss by security features | sign-out, headers | sign-out keeps the ledger (tested); no Clear-Site-Data; no COOP | — |

---

## 5. Findings

Each: evidence · impact · priority · fix · how it is shown to be fixed.

**F1 — Confirmed defect, fixed. Built-in object names in saved text broke figures.**
Evidence: before the fix, `security.test.mjs` SEC-1 failed: a saved category `"constructor"` loaded as a JavaScript function (`null`
in JSON) and `"__proto__"` as an object; a shop named `"constructor"` turned the month comparison sum into text. Root cause:
`CATEGORY_LOOKUP[...]` and per-merchant maps were plain `{}` objects, which answer to built-in names.
Impact: wrong category and broken "what changed" figures for anyone whose data contains such a word (rare, but it can come from a
restored or hand-edited file). Priority: High (financial correctness). Fix (`3a3774d`): the lookup has no prototype; an unknown
saved id is never kept if it is a built-in object name; merchant maps in `calcWhatChanged` and Analytics are prototype-free; the
icon lookup reads own properties only. Verification: SEC-1 (all 6 names), R107-B1 in the real app.
Second sweep (by pattern, after a review): the Insights shop-concentration maps in `calcPatterns` had the same flaw — a shop named
`"constructor"` printed the built-in function's source text in the insight sentence. Fixed with the category totals there and the
category/subcategory counts in `calcMerchantProfile`. SEC-6 fails on the earlier commit (1 check) and passes now; budgets read from a
backup were checked and were already safe (`budgetKey` refuses built-in names).

**F2 — Confirmed gap, fixed. No size limit before an import file is read.**
Evidence: `importFile` read any picked file whole into memory (`readAsArrayBuffer`) with no check; PDFs were limited only after
reading. Impact: picking a large video or disk image could freeze or crash the app. Priority: Medium. Fix (`b127d84`): files over
50 MB are refused before reading, with an az/en/ru message; nothing changes. Verification: R107-B2 (50 MB + 1 byte file refused,
ledger byte-identical), SEC-5 source check.

**F3 — Verified safe. HTML sinks.** Every `dangerouslySetInnerHTML` / `innerHTML` in app code inserts a fixed drawing from the code
(icons, launch mark, Google/Drive logos); no `eval` or `new Function` in app code. SEC-2 now fails if a new sink takes anything else.

**F4 — Implemented. Security headers + CSP (report-only).** `vercel.json` (`7e4b116`). Enforced now: nosniff, X-Frame-Options DENY,
Referrer-Policy, Permissions-Policy (camera, microphone, geolocation, payment, USB off — the receipt photo uses a file picker).
CSP is Report-Only: with no report address, a blocked item only shows in the browser console, so this adds no telemetry.
Verified locally with the policy ENFORCED (csp-check 14/14, including a control that proves an injected script is blocked).
Not verified: Google sign-in and Drive popups under the policy (need a real account), the Android app (Capacitor does not use
these headers). Plan: push, keep report-only ~1 week, check the console on phone and desktop during sign-in and Drive backup,
then rename the header to `Content-Security-Policy`.

**F5 — Verified. Sign-out keeps data.** `acctSignOut` clears only the session key `expense_ledger_v5__account` and asks the server to end
the session; R81-B7 proves the ledger and the cloud copy stay.

**F6 — Supabase.** Tables: `ledgers` (RLS select/insert/update/delete with `(SELECT auth.uid()) = user_id`, FK to auth.users with
cascade, data size check), add-only anonymous tables `crash_reports, feedback_reports, notice_layouts, place_reports, screen_opens,
usage_pings, active_days` (anon INSERT only, check constraints). No storage buckets, no edge functions. Function `delete_my_account`
is SECURITY DEFINER with `search_path=''` and a null-uid check (intended; advisor warning accepted). RLS two-user test: other user
sees/updates/deletes 0 rows; inserting as someone else, anon reading or inserting into `ledgers` and anon reading any table → 42501.
Hygiene (NEEDS WORK, owner action): anon/authenticated still hold TRUNCATE, REFERENCES, TRIGGER — not reachable through the REST
API; fix in `docs/security/supabase_grants_hygiene.UNAPPLIED.sql`. Advisor: leaked-password protection off (owner toggle; app uses Google only).

**F7 — Dependencies (DEFERRED WITH REASON).** `npm audit`: pdfjs-dist 3.11.174 (GHSA-wgrm-67xf-hhpq, high) — mitigated because the
app passes `isEvalSupported:false`; a test now fails if that is removed (SEC-4). Fixing it properly means PDF.js 4.x/5.x, a major
upgrade that changes the worker setup and needs the statement tests re-proved. vite/esbuild advisories affect only the local dev
server. tar / @mapbox/node-pre-gyp / canvas come with an optional install-time dependency of pdfjs and are not shipped. Lockfile
now tracked (`87ef99b`, droppable): `npm ci` + build + logic tests proven from a clean copy (first with `--ignore-scripts`, then again without it, as Vercel runs it). The only critical advisory, `tar`, arrives through `canvas`, an optional install-time helper of pdfjs that is not installed here and never shipped; the CI audit step therefore uses `--omit=optional` (exit 0 locally) — `--omit=dev` alone exits 1.

**F8 — Secret scan: clean.** `git grep` over all 435 commits for `sb_secret_`, `service_role`, `GOCSPX-`, private keys, JWTs, GitHub,
AWS, Google API and Anthropic key shapes, keystore passwords: the only hit is a test that checks the code has none. `dist/` and the
Android worktree: none; no keystore files. Archived `.env*.example` files hold placeholders only. Google OAuth client IDs are public by design.

**F9 — Observation (not a defect). localStorage is not encrypted by the app.** Encrypted backup files exist (Run 32); the live ledger
relies on the phone's own protection and the optional app lock. Changing that is a design decision, not a fix.

---

## 6. Tests actually run (18 Nov 2026, this working copy)

| Command | Result |
|---|---|
| `node tests/run-logic.mjs` (final) | 144 files, 0 with problems; 2869 passed, 0 failed, 0 missing |
| same, on a clean `git archive` copy after `npm ci` | 144 files, 2859 passed (before SEC-5/SEC-6 were added) |
| `node tests/logic/security.test.mjs` (new) | 37/37 |
| `node tests/pwa/csp-check.mjs` (new) | 14/14 |
| `node tests/browser/e2e_run107_security.mjs` (new) | 6/6 |
| `npm ci` + `vite build` on a clean copy with the lockfile | exit 0, exit 0 |
| `node tests/az-audit.mjs i18n.js App.jsx <dir>` | 1 finding, the known `acct.err.noaccount` |
| `node tests/run-browser.mjs` (on `30b2872` + uncommitted CI/doc edits) | 176 files, 1 with problems; 2876 passed, 1 failed |
| the one failure, `e2e_run105_time` R105-A | test bug, not the app: the seed wrote "1st of last month" with `toISOString()` (UTC), which is the 30th of the month before between 00:00 and 04:00 in Baku; fixed to the local date; 24/24 at 01:2x |
| after the SEC-6 fix: e2e_run107_security, e2e_run105_time, e2e_run20_patterns and 14 Analytics/Insights files | all passed |
| `node tests/pwa/offline-check.mjs` (final code) | 17/17 |
| `node tests/pwa/csp-check.mjs` (final code) | 14/14 |

Before the fix, SEC-1 failed 2 checks and SEC-2 failed 1 (recorded in the session); after the fix all pass.

---

## 7. Release gates (before any push of this work)

1. Owner approval to push (the 17 Nov push of Run 106 was blocked by the tool's permission check and still needs it).
2. Full browser suite, logic tests, offline-check and csp-check all green on the exact commit.
3. After the push: the deploy is "Ready"; the live bundle shows release 107; live smoke; response headers present (`curl -I`).
4. CSP stays Report-Only for about a week; the owner (or Claude, in the in-app browser) signs in with Google and runs a Drive backup
   and restore with the console open; zero CSP reports → switch to enforced in a separate small release.
5. Rollback: `cf4a596` is the last live commit; Vercel "Promote" of the previous deployment undoes headers in one step.

---

## 8. Owner actions (nothing here was done by Claude)

1. Approve pushing Runs 106 + 107 (from `cf4a596` to the final commit in PHASE_CHECKPOINT 0002c) — or say which commits to drop (the lockfile commit is optional). Know that the push also: switches Vercel to `npm ci` with the tracked lockfile; starts the GitHub Actions check on every push (free minutes); lets Dependabot open up to 3 update pull requests a week (nothing merges by itself).
2. Optional: run `docs/security/supabase_grants_hygiene.UNAPPLIED.sql` in the Supabase SQL editor; then re-run `supabase_rls_check.sql`.
3. Optional: Supabase > Authentication > turn on leaked-password protection.
4. After the push, one real Google sign-in + Drive backup on the phone with the report-only CSP live (Claude can then read the console).

## 9. Residual risks

PDF.js 3.x parsing code (mitigated, not removed) · `style-src 'unsafe-inline'` · CSP not yet enforced live · real Google
sign-in/Drive not exercised by Claude · Android app not covered by web headers · localStorage not app-encrypted · CI workflow not yet run on GitHub.
