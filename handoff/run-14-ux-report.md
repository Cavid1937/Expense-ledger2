# Claude UX Implementation Report — 2026-10-28 — Run 14 (UX refinement: keyboard access, banners, motion)

**Origin of evidence:** run and inspected by Claude on the owner's computer on 28 Oct 2026. **ChatGPT has NOT reviewed this report.** Nothing was committed, pushed, previewed, published or submitted. Production, preview and `main` remain `12a0c19`. Scheduled tasks are paused by the owner.

## 1. Result in plain language
- The app already looks coherent (Caspian dark teal, Safe to Spend first), so I kept the identity and fixed what the real source and tests showed was broken. The most serious finding: **importing a backup was impossible for anyone using a keyboard or screen reader**, because the only way to open the file picker was a mouse click on a tile whose file input is hidden.
- Four more mouse-only places were fixed: transaction rows, recurring-payment rows, the Analytics month bars (and the import tile). They are real buttons now, reachable with Tab, activated with Enter or Space, with a visible focus ring.
- The backup reminder no longer sits above every screen; it shows on Home and Import / Export, where it can be acted on. Warnings about the safety of the data (cannot save, recovery, update) still show everywhere.
- Screens now appear together with a short fade (160 ms) instead of every section sliding in one after another.
- No financial calculation, stored data, record ID, migration, backup format or text changed. `i18n.js` is byte-identical to Run 13.
- Tests: logic **646/646**, browser **554/554** (21 files, 0 missing, 0 standby events during the run). Not a phone test.

## 2. Gate 0: the candidate was protected first
| Item | Value |
|---|---|
| Branch / HEAD | fix/financial-correctness-2026-10-26 / 12a0c196ae03f577499391625d0b40e6bc5f8357 (unchanged; no commit) |
| Start state | = the Run 13 frozen candidate: App.jsx FA568979A63BFC57D656D4C3A44414B81F976DF2ABA2F7779E9EDA948867EFED, i18n.js 4F7AEA2F7C2B8FA63F4C217F99AF8D26E0D3604A30CCC846BB80B3C186798CBA (hash-compared before any edit) |
| Recovery copy | `C:\Users\cavid\ExpenseLedgerBackups\run14-start-20261028-2211`: 963 files, every one hash-compared, 0 mismatches; patch of tracked changes and status listing included |
| After | App.jsx ADD9FE8FBCACA5192913C7ACA45FBC99F4E0A0C1F8B658E9D75A4DA3FD3B49DF; i18n.js unchanged. Frozen copy: `handoff/snapshots/20261028-run14-ux/`; exact diff vs Run 13: `handoff/ux-run14/run14-ux-vs-run13-snapshot.patch` (43 changed lines) |
| Not in git | package-lock.json, tests/, handoff/ are untracked (as in Run 13) |

## 3. Skills and references actually used
- **Installed and read in full this session: `frontend-design:frontend-design`** (a plugin skill). How it shaped the work: ground choices in the real product and audience (a calm trust-first ledger for az/ru/en users, not a generic fintech dashboard); keep one memorable thing (Safe to Spend) and let everything else stay quiet; avoid template motion (staggered fade-and-slide on every section is explicitly named as an AI tell); copy is plain and specific; keep a quality floor (visible focus, reduced motion, contrast, responsive). It also warned against its own default aesthetics, so I did **not** restyle: the existing palette and type are a deliberate Caspian identity from an owner-approved redesign.
- **Not installed in this session (NOT ASSESSED):** the Design plugin's critique / design-system / accessibility / UX-writing skills (`design-critique` etc.). They are not in this session's skill list. Their method was approximated by hand (journey audit, severity classes, self-critique pass); I did not use them.
- **Not re-read in this run:** the Master Prompt, the mobile master prompt, the visual redesign handoff and the eight-screen reference image. I relied on earlier runs' reading and on ChatGPT's UX review; I did not re-compare the eight-screen board pixel by pixel. `apple-design/SKILL.md` was not re-read either. This is a limitation, not a claim of conformance.
- **Read:** the ChatGPT UX review and the attached `CLAUDE_UX_REFINEMENT_ASSIGNMENT_2026-10-28.md`.

## 4. Audit (verified against the active worktree, not GitHub main)
Screens captured with the real bundled app (Chrome 156 headless, 390×844 and 1100×800, synthetic data, en/az/ru): 31 before and 31 after in `handoff/ux-run14/before|after/`. Journeys covered: first-launch language chooser, Home, Safe to Spend open, Transactions, Analytics, Budgets, More, Bills, Import/Export, Add form, privacy mode, wide layout.

| # | Finding | Class | Priority | Evidence | Action |
|---|---|---|---|---|---|
| 1 | The import tile is the only way to open the file picker; its input is `display:none`; the tile is a clickable div | **Confirmed defect** (keyboard / screen-reader users cannot import or restore) | P1 | source 4081 + `.drop-zone input{display:none}`; test UX-K3 failed before | Fixed: tile is a button with a name, Enter/Space open the picker |
| 2 | Transaction rows are clickable divs | Accessibility gap | P1 | source 3127; UX-K1 failed before | Fixed |
| 3 | Recurring/bill rows: icon and text both clickable divs | Accessibility gap | P1 | source 3348/3351; UX-K2 failed before | Fixed: one button, icon hidden from screen readers; Pause/Record buttons keep their own keys (tested: no double action) |
| 4 | Analytics month bars are clickable divs with no name | Accessibility gap | P1 | source 4653; UX-K4 failed before | Fixed: button, pressed state, name = month + amount (no amount shown in privacy mode: tested) |
| 5 | Several of those controls had no focus ring | Accessibility gap | P1 | UX-K6 failed before | Fixed: 2 px accent ring (inside the edge for rows in clipped cards) |
| 6 | Routine backup reminder above every screen | Usability risk (ChatGPT also flagged it) | P2 | screenshots of Transactions/More with the banner | Scoped to Home + Import/Export; critical warnings unchanged everywhere (tested) |
| 7 | Every section slides in with a staggered delay | Visual inconsistency / decorative motion | P4 | CSS `.section-enter-N` delays 0–280 ms | One 160 ms fade, no delay, no slide; reduce-motion still disables it (tested) |
| 8 | A click on the file input bubbled to its tile, which called the input again (harmless only because browsers ignore re-entrant file clicks) | Latent defect | P3 | found by the deterministic probe | Fixed with one `stopPropagation` |
| 9 | Empty amount "0.00" contrast (flagged earlier on an older preview) | Checked | — | measured 8.9:1 (placeholder), 7.9:1 (.txn-sub), 8.9:1 (labels) | No change needed |
| 10 | Home tab vs the category also called "Home" in en | Optional proposal | P3 | screenshots | Not changed: needs native-language review and a category-name decision |
| 11 | App is a 430 px column on wide screens | Optional proposal | P3 | wide-en-01 | Not changed (design decision, no user evidence) |
| 12 | "Duplicate Analytics and Monthly destinations" (ChatGPT, from GitHub main) | Checked | — | active source has 5 tabs Home/Transactions/Analytics/Goals/More; route key `Monthly` is the Analytics screen | No duplicate in the active source; nothing to change |

## 5. Design rationale (compact) and deliberate non-changes
Audience: students and young adults in Azerbaijan first, also parents and older users; reading a number quickly on a phone. Character: calm, exact, trustworthy; one memorable moment (Safe to Spend). Hierarchy: Safe to Spend, then the month, then upcoming obligations. Palette: Caspian dark teal with semantic income/expense/warning colours (kept). Type and spacing: kept. Motion: only to show what changed (sheets, confirmations); no ambient reveals. Critique against generic finance-dashboard tropes: the app avoids gradient washes, identical-card chrome and decorative charts; its weakest remaining trope is a uniform card style on Home, which I left because changing it is a redesign, not a fix. **Deliberately not changed:** palette, typography, tab map, Home order, number formats, wording, banners that protect data.

## 6. Tests (actual)
| What | Result | Log |
|---|---|---|
| New `e2e_ux_keyboard.mjs` (21 checks) written first, against the unchanged app | 16 failed / 5 passed | 300 |
| Same after the fixes | 21/21 | 301 |
| First full run after the fixes | logic 646/646, build OK, az audit exit 0, browser 553 passed / **1 failed** (the "Enter opens the file chooser" check; passed 6 of 6 standalone) | 302–305 |
| Cause analysis | my check raced the browser's real dialog; replaced by a deterministic probe of the app's own call; the probe then exposed finding 8 (double call), fixed | 306 |
| One run aborted: "Navigating frame was detached" | **PC entered Modern Standby at 22:36:51 (woke 22:36:55)**, Chrome died within 2 ms of the navigation (new fault trail). 4th of 4 browser-process stops matching standby | (console) |
| Final full run on the final code | logic **646/646** (19 files); build OK; az audit exit 0; browser **554/554** (21 files, 0 missing); `power: 0 standby events` | 307–310 |
| Clean-install confirmation (npm ci, frozen snapshot 20261028-run14-ux) | logic **646/646**, build OK (index-Csm2CwzZ.js), az audit exit 0 (all valid). Browser run 1: 553 passed, **1 failed** (e2e_ux 'grab the sheet mid-spring', 2 standby events during the run); browser run 2: 477 passed, **77 missing** (e2e_downgrade and e2e_import stopped: detached frame; 5 standby events). **Both browser runs are INVALID evidence** (the runner's power line flags the standby). Standalone comparison of e2e_ux: new code 8/8, Run 13 baseline 8/8, 0 standby events: no regression seen, cause of the single failure NOT PROVEN | 311–316 |
`tests/run-browser.mjs` now prints a power line (standby events during the run) so a standby-caused stop is never mistaken for an app failure. No assertion was loosened; counts only rose (browser 533→554).

## 7. Accessibility, localization, and what is not covered
- Keyboard: verified with real key presses: Tab reaches transaction rows and the import tile; bill rows and Analytics bars were focused by script and then operated with Enter/Space (their place in the Tab order was not separately tested); a 2 px focus ring is present on the one focused row measured. Screen-reader behaviour was **not** tested with a screen reader: names and roles are present in the markup (NOT ASSESSED as heard).
- az/ru/en: no text was changed. I viewed 8 of the 31 after-screenshots myself (en Home/Transactions/Analytics/Add form, az Import/Export, ru More/Bills, wide Home) and saw no clipping there; the other 23 were captured but not individually inspected, and no native speaker looked at any. Native review of the existing and new texts remains NOT ASSESSED (see Run 13 list).
- Not tested: a real phone or Android WebView, touch gestures, enlarged system text on the changed controls (the existing bigtext test still passes), iOS Safari.
- The banner-scope change is a judgement call: users on other tabs no longer see the routine reminder; Home is the landing screen and still shows it. If the owner prefers it everywhere, revert two conditions (patch lines).

## 8. Status
| Requirement | Status | Evidence |
|---|---|---|
| Keyboard operation of rows, bars, import tile; visible focus | **VERIFIED** (headless Chrome, real key events) | 301, 306, 310 |
| Screen-reader announcement | **NOT ASSESSED** | — |
| Banner scope, motion restraint | **VERIFIED** in tests; design judgement is the owner's to accept | 310 |
| Financial correctness / data safety unchanged | **VERIFIED** by the full existing suites on the worktree (646 logic, 554 browser, 0 standby events) | 307–310 |
| Clean-install browser confirmation of the Run 14 code | **NOT DONE (INVALID runs)**: both attempts overlapped Windows standby despite a keep-awake request; needs the PC kept awake (owner: Sleep = Never while plugged in) | 314–316 |
| Real phone / Android | **NOT ASSESSED** (no device) | — |
| Native az/ru wording | **NOT ASSESSED** | — |
| Commit / preview / publish | **No** | — |

## 9. Risks and next action
Risks: the clean-install browser confirmation is missing (above); the keep-awake request does not prevent Windows standby on this PC (correction of my Run 13 statement: that clean run had no standby by luck, not because of the hold); visual changes were checked on a desktop headless browser only; reminder visibility on non-Home tabs is reduced by design. Next: owner decides whether to accept the banner scope; the Android phone test (Run 13 checklist) now also covers keyboard-less touch use; native az/ru review; optional proposals 10 and 11 need a decision. No commit or preview without the owner's approval.
