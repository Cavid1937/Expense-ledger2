# Claude Implementation Report — 2026-10-26 — Run 1

Status: **draft, prepared locally; not yet published.** It will be published to Notion only after the owner approves the setup package.

## 1. Starting state
- Repository `Expense-ledger2`. The protected baseline is commit `6fb8cd1` (`App.jsx` blob `53a3203f…`), unchanged.
- Working copy: git worktree `Expense-ledger2-fixes`, local branch `fix/financial-correctness-2026-10-26`. **All changes are uncommitted.** Nothing has been pushed or deployed.
- Entry point: `index.html` → `main.jsx` → `App.jsx` (single-file React 18 app) + `i18n.js` (catalog in 3 languages). Vite 5 build.
- Source tested: `App.jsx` blob `9d46ca9f27ebfbc56f71f446979b0d746cc513e0`, `i18n.js` blob `693f1303c31d3b88a38794000f6aa2c79a588b73` (`git hash-object`).
- Living checkpoint: `PHASE_CHECKPOINT.md` (attached).

## 2. Objective and priority rationale
This is the first report, so it summarises Phases 1–4 (see the checkpoint §2) and covers today's work in detail. Today's work targets **MP-7 (financial insights must be supported by the numbers)**. It ranks first among the open items because a misleading money statement is a financial-correctness problem (priority 1), while the other open items are approvals or reviews only the owner can give (number format, font, native-language review).

## 3. Changes in this run (D18–D21)
| ID | Confirmed defect (failing test before the fix) | Fix | Files |
|---|---|---|---|
| D18 | Monday purchases 1000, 5, 5 vs Tuesday 5, 5, 5 → app said "Mondays average 6633% more per transaction than Tuesdays" | the insight compares the median (typical) transaction; differences of 3× or more are stated as "N.N×" | `App.jsx` `calcPatterns`, `i18n.js` `ins.dayOfWeek`, `ins.dayOfWeekX` |
| D19 | All three Monday purchases on one Monday still produced a claim about "Mondays" (found in self-review of D18) | each compared weekday needs ≥ 3 transactions on ≥ 2 different dates | `App.jsx` |
| D20 | September 4 × 10, October 1000 + 3 × 10 → "Average transaction is 2475% higher than last month" | the median is compared; unusual single purchases are still flagged by the separate anomaly insight | `App.jsx`, `i18n.js` `ins.avgHigher`, `ins.avgLower` |
| D21 | Analytics card "Spending by Day of Week" drew the per-transaction **average**, so one 1,000 purchase made its day's bar tower over the rest; the title also suggested totals | the card draws the median, is titled "Typical Purchase by Day of Week" and has the subtitle "Median amount per transaction, and the number of transactions" | `App.jsx` Analytics view, `i18n.js` `an.byDay`, `an.byDaySub` |

Compatibility: no stored data, storage key (`expense_ledger_v5`), import/export or migration code was touched. The changes affect only how insights are computed and displayed.

## 4. Tests actually executed (Windows 11, Node 24.22.1, Chrome 156 headless, throw-away profiles)
| Command | Result | Log |
|---|---|---|
| `node tests/run-logic.mjs` before D18 | finance: **3 failed**, as expected | `78-logic-dayofweek-before-fix.txt` |
| `node tests/run-logic.mjs` before D19/D20 | finance: **3 failed**, as expected | `82-logic-selfreview-before-fix.txt` |
| `node tests/run-logic.mjs` (final) | **395 run, 395 passed, 0 skipped** (core 39, data 122, finance 91, i18n 70, phase2 48, phase3 25) | `86-logic-after-chart-fix.txt` |
| `node tests/run-browser.mjs <mutant>` — App with the chart switched back to the average | e2e_phase2: **2 failed** as intended (row shows `129.38 ₼`, bar `2587.6%`); the other 5 files pass | `87-browser-MUTANT-avg-chart.txt` |
| `node tests/run-browser.mjs` (final) | **213 run, 213 passed** (e2e 27, e2e_import 51, e2e_lang 57, e2e_phase2 24, e2e_phase2_layout 24, e2e_ux 30); Downloads folder 109/109 files | `88-browser-after-chart-fix.txt` |
| `npm run build` (final) | exit 0, 400.19 kB (117.42 kB gzip) | `89-vite-build-after-chart-fix.txt` |

Note on test quality: the first version of one E2-D check ("does not show 204.00") passed on the mutant because the average depends on the date. It was replaced by a stricter check (every row must read 5.00 ₼), and that check fails on the mutant as intended.

New tests: `tests/logic/finance.test.mjs` §21 (8 checks) and `tests/browser/e2e_phase2.mjs` E2-D (4 checks on the real rendered card).

## 5. Verification status
- VERIFIED (by the tests above): D18, D19, D20, D21 for the tested cases.
- IMPLEMENTED BUT UNVERIFIED: the Azerbaijani and Russian wording of the 6 changed messages (no native-speaker review yet).
- NOT ASSESSED: the other insights (category concentration, merchant concentration, same-day categories) have not been reviewed for small-sample claims.

## 6. Risks
- The median of an even number of transactions is the mean of the two middle ones, which is standard but can produce a value nobody actually spent. It is acceptable for a "typical" figure.
- The by-day card no longer shows the average anywhere. A user who wants the average can't see it. Judgement: the median is the more honest single number for this card.

## 7. ChatGPT review status
No review exists yet; this is the first report. The Notion handoff has **not been verified**: nothing is published, and ChatGPT's read access must be confirmed from ChatGPT itself.

## 8. Next action
Review the remaining insights in `calcPatterns` for small-sample claims. Acceptance criteria: for each insight, a test with one outlier or one day produces no claim, and a genuine pattern still does.
