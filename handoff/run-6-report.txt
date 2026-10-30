# Claude Implementation Report — 2026-10-27 — Run 6

Owner's instruction (2026-10-27): "Start the work and solve everything" — the ChatGPT research findings (Deep Audit & Eligibility, Continuation Check, Data-Safety Delta) and the handoff at the top of the Work Plan. **Nothing was committed, pushed, merged or deployed.** main/production `86af1c1` and preview `a1b16e2` unchanged; Runs 5 and 6 are local and uncommitted.

## 1. Source identity
| Item | Value |
|---|---|
| Start / end HEAD | `a1b16e2066ad9c2c3611c9a69caab6739dbe8a00` (unchanged; Runs 5+6 are uncommitted working-tree changes) |
| Run 6 candidate | App.jsx git blob `d954ded85740481e46ab6662e1b24aa662a68d26` (working file CRLF 287,191 bytes, SHA-256 `0308b4e13ee733ede41865c23cc99d83418f45655ae1dc85220467a07e4eb036`); i18n.js git blob `713200d3de01a26b5026684c34dbf6cc74a24de9` (104,281 bytes, SHA-256 `4ee7a4eb852533707007b460c608fef040c3e460081dbdc4c454ceda94a36691`) |
| Diff vs a1b16e2 (Runs 5+6) | `run-5-6-App-i18n.diff.txt` (App.jsx and i18n.js only) |
| Runtime | Node v24.22.1, npm 11.19.1, Chrome, Windows 11 |

## 2. Findings — disposition, change, proof
Every fix was written test-first: `tests/logic/run6.test.mjs` failed **30 of 38** on the Run 5 code (log 149), confirming each finding; all pass after the fix. Browser proof: `tests/browser/e2e_run6.mjs` (14 checks).

| ID | Finding (ChatGPT) | Disposition | What changed | Proof |
|---|---|---|---|---|
| D16 | A failed read of `expense_ledger_v5` looked like a fresh install; the next save overwrote the data | ACCEPT — fixed | `readKey()` returns value or `failed`. On failure: empty view, saving paused (`SAVE_BLOCKED`), no legacy migration, notice + banner "Saving is paused because your saved data could not be read. Nothing has been overwritten…" (en/az/ru) | logic D16 ×5; **browser R6-B1: first read refused → user adds an expense → stored ledger byte-for-byte unchanged** (the real save path, not only the helper) |
| D17 | `""` under the key treated as absent and overwritten without a copy | ACCEPT — fixed | `""` goes through the corrupt path: recovery copy + notice; copy failure pauses saving | logic D17 ×4 |
| D18 | A legacy-key read exception was swallowed; an empty current key then hid the legacy data | ACCEPT — fixed | Legacy read failure pauses saving + notice; unparseable legacy data gets a recovery copy (`__legacy_<key>_corrupt_`) + notice; legacy keys never modified | logic D18 ×4 (incl. control: normal migration unchanged) |
| D8/D14 | Settings-only / empty / all-invalid file could empty the ledger via Replace | ACCEPT — fixed | `plan.canReplace = usable rows > 0`. The sheet then shows "No transactions in this file. It can only update settings…" and **"Use the file's settings — keep my transactions"** instead of Replace (applies settings; recovery copy first; Undo available). `applyImport` replace also keeps transactions when the file has none (defence in depth) | logic D8 ×5; browser R6-B2 ×4 (incl. control: a real backup still offers Replace) |
| D9/D15 | `isActive: "false"` (and 0/1/null/"yes"/objects) coerced by truthiness | ACCEPT — fixed, **one point differs from ChatGPT** | `flagValue()`: `true`/`false`, or the words "true"/"false" (any case, trimmed). Anything else → record refused ("unreadable active/paused flag"), set aside with a recovery copy when stored. Missing = active (unchanged). `recurring`: same rule; missing or `null` = not recurring | logic D9 ×4 |
| D13/D22 | Sub-cent amounts accepted in stored data, legacy migration and settings | ACCEPT — fixed | One rule for every money value: `Number(n.toFixed(2))===n` (the import rule since Phase 3). 12.345, 10.005, 0.1+0.2 refused — never rounded. Stored records set aside with recovery copy + notice; settings sections reject the bad entry and keep the rest | logic D13 ×7; Phase 3 test contract updated (see §3) |
| D1 | Electricity and water from one merchant merged into one schedule; Safe to Spend 90 too high | ACCEPT — fixed | `scheduleKey` includes the subcategory (amount still excluded, so a price change stays one bill). Key is never stored | logic D1 ×3: 2 schedules; Safe to Spend **1,892** (was 1,982); control 30→35 stays one schedule |
| D19 | 31 Jan, 28 Feb → March projected 28 Mar | ACCEPT — fixed | `scheduleDueDay()`: latest payment's day, unless it was a short month's last day — then the run of month-end payments before it gives the intended day. A non-month-end payment (28 Mar) is a deliberate change | logic D19 ×4 (31→31 Mar/30 Apr/31 May; 15th control; deliberate change → 28) |
| D21 | 29 Feb 2024, 28 Feb 2025 → 2028 projected 28 Feb | ACCEPT — fixed | same `scheduleDueDay()` for yearly | logic D21 ×2 |
| D20 | A bill paid as an ordinary expense stays "unpaid" and is reserved twice | ACCEPT — fixed by an explicit action (no automatic matching) | Recurring screen: each active schedule has **"Record payment"** (income: "Record receipt"), which opens the Add form filled in as that bill (same merchant/category/subcategory/amount, Recurring on, today). A hint explains that an ordinary expense with the same name is not linked. No auto-match by merchant/amount (as both reviews asked) | browser R6-B3 ×6: before −90.00 reserved → Record payment → form prefilled → saved as the same bill → "none this month" |
| D10 | Identical rows inside one file all accepted | NEEDS MORE EVIDENCE → **policy decided**: keep all, tell the user | Import sheet warning "N rows are identical to another row in this file … All will be imported — check the file if that is not expected." Look-alike skipping still compares with the ledger, so re-importing skips them | logic D10 ×4 |
| D2 | PWA manifest may be missing from the build | CHECKED — not a defect | Build output: `dist/assets/manifest-*.json` (Vite processes the `/manifest.json` link), `dist/icon-192.png`, `icon-512.png`; icon paths resolve. Low-priority cleanup noted: App.jsx also injects a redundant Blob manifest | build log 155 |
| e2e_bigtext hang | Headless Chrome hung 10–19 min at 200 % zoom (Run 4 + Run 5 clean room 3) | Test fixed | One browser per scenario, 90 s protocol timeout, one *reported* retry only on browser faults (never on a failed check) | log 150 + clean room below |

**Why "true"/"false" words are accepted (D9/D15, disagreement):** ChatGPT asked to accept native booleans only. A stored or imported record with `"false"` has one unambiguous meaning; refusing it would hide a real payment from every total and list (it would sit in a recovery copy the user cannot see). Everything ambiguous (`null`, `0`, `1`, `"yes"`, objects) is refused. If ChatGPT or the owner prefers booleans only, it is a one-line change in `flagValue`.

## 3. Behaviour changes to note
- **Phase 3 contract reversed on purpose:** stored data with sub-cent amounts used to load unchanged ("loading never drops existing records"). Now such a record is set aside with a recovery copy and a notice, like any other unusable record (D13). `phase3.test.mjs` updated with a comment.
- **Storage completely unavailable** (e2e_import R2): the banner now says "Saving is paused because your saved data could not be read…" from start-up, instead of "Could not save changes" after a failed save. Check updated with a comment.
- Bill identity now includes the subcategory: a user who changed a bill's subcategory once will see two schedules (the old one keeps expecting payments until paused). This is the conservative direction (more money set aside, never less).
- Due day: indistinguishable case — a bill deliberately moved from the 31st to the 30th in April is read as "still the 31st". Rare; the user can record the payment on the new day in a non-short month to move it.

## 4. Tests actually run
| # | Where / candidate | Logic | Browser | Build | Logs |
|---|---|---|---|---|---|
| 1 | Worktree, Run 5 code + new Run 6 tests (before the fix) | run6: **30 failed / 8 passed** | — | — | 149 |
| 2 | Worktree, Run 6 (first full run) | 472/472, 9 files | 338 + 1 failed (e2e_import R2 banner — expectation updated on purpose, §3) | OK | 153–155 |
| 3 | Worktree, Run 6 final | 472/472 | e2e_import 51/51, e2e_run6 14/14 | — | 156 |
| 4 | **Clean room, Run 6 final snapshot** (SHA-256 0308B4E1… / 4EE7A4EB…) | **472/472**, 9 files, 0 missing | **339/339**, 12 files, 0 missing, no browser retries needed | **OK** `index-vOVH-mEh.js` 415.48 kB, `manifest-wyF7OkiL.json` | 157, 159–161 |
| 5 | Clean room, exact preview a1b16e2 (unchanged) — proves the new tests detect the bugs | 434 + **38 failed**: run6 31, run5 5, i18n 1 (new reason keys absent), phase3 1 (contract changed) | 320 + **5 failed + 14 missing**: e2e_run5 4, e2e_import 1 (banner), e2e_run6 stopped at the missing settings-only button after 3 failures | — | 157–158 |

**Data loss reproduced in the real app on a1b16e2 (clean room, row 5):** with the first read of `expense_ledger_v5` refused, the old app showed an empty ledger with no warning; after the user added one expense the stored value went from 736 to 959 bytes — the 3 original transactions were **overwritten** by the empty state plus the new one. On Run 6 the same steps leave the stored ledger byte-for-byte unchanged.

Clean-room procedure: candidate snapshot taken first (so later edits cannot leak in); package `node tests/make-package.mjs` + `--verify` (46 files, 0 problems); `git archive a1b16e2`; package.json identical; `npm install` + `--no-save puppeteer-core @fontsource/playfair-display @fontsource/dm-sans`; A on the archive, B on the snapshot + `npx vite build`. Downloads 109 before / 109 after. Baseline untouched.

## 5. Requirement status
| Item | Status |
|---|---|
| D16–D18 fail-closed storage reads | VERIFIED in tests (logic + real save path in the browser) |
| D8/D14 zero-row Replace | VERIFIED in tests (logic + import sheet) |
| D9/D15 flags, D13/D22 whole cents | VERIFIED in tests (logic: import, stored load, legacy migration, settings) |
| D1, D19, D21 recurring identity/cadence | VERIFIED in tests (logic, exact Safe to Spend arithmetic) |
| D20 Record payment | VERIFIED in tests (browser); real phone NOT ASSESSED |
| D10 duplicate policy | VERIFIED in tests; policy open to owner/ChatGPT challenge |
| D2 manifest in build | VERIFIED (build output) |
| All new az/ru strings | IMPLEMENTED BUT UNVERIFIED — native review pending |
| Real-device checks (Runs 3–6) | NOT ASSESSED |
| storage.persist(), offline, fonts, Open Banking | DEFERRED WITH REASON (owner approval / research only) |
| 42-screen layout audit | still not located |

## 6. Next actions
1. **Owner:** approve committing Runs 5–6 and pushing them to the preview branch, then one phone test (steps: Add-form ×/Cancel/Back guard; max text size on all screens in az/ru; Recurring → Record payment; Settings → import a settings-only file shows "keep my transactions").
2. **Owner:** approve committing `tests/` (without evidence logs) so ChatGPT can read the suite on GitHub.
3. **ChatGPT:** review §2 (especially D9 words, D10 policy, D19 due-day rule) and the new az/ru strings.
4. **Claude, next:** master-prompt §8 items still open — recovery notice vs ordinary toast priority, undo after a newer state (both have code; need explicit tests), then the requirement → test matrix.
