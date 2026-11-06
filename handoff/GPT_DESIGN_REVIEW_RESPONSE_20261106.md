# Response to the GPT design review (6 Nov 2026)

Source inspected: worktree `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`, base commit c6dbe11 (F1 fix) plus this change.
GPT reviewed a screen recording; I cannot see that recording, so each point below was checked against the current source and tests, not against the video.

## P0 — Safe to Spend vs account balance (GPT figures: 152.60 / 162.80 / 10.20 / 13.96)
Confirmed, from source (`calcSafeToSpend`, `accountBalances`):
- Safe to Spend = income dated today or earlier this month − savings reserve (the larger of the manual floor and goal contributions) − every expense recorded this month (including ones dated later) − unpaid bill payments still due this month. It does NOT use account balances.
- An account balance = opening balance + entries that name that account (up to today) + transfers. Entries with no account are in NO balance.
- So 162.80 − 10.20 = 152.60 reconciles as a month-flow figure; a 13.96 account total is a different quantity (e.g. income entered without an account, an opening balance, or transfers). This is NOT a calculation defect; it is two different bases that the screen did not distinguish. Status: confirmed finding (by code reading), figures from the recording NOT reproduced (no access to that data).
- Changed (display only, formulas untouched): when accounts exist, the Safe to Spend figure is positive and the accounts' total is lower, the card now shows an always-visible note naming the accounts' total and saying the figure counts this month's recorded income and spending, not balances. en/az/ru. `screens/home.jsx` (`accountsHeld`, `SafeToSpendCard` prop `held`), `i18n.js` (`safe.noteBalance`).
- Verified: new browser test `e2e_run31_safeheld.mjs` 8/8 (no accounts → no note; accounts lower → note + number identical to the no-accounts number; accounts higher → no note; az/ru translated); logic suite 1245/0; Home-related browser files (run18_home, run25_home, run28_netpos, run17_forecast, run26_walk 137, lang 57, run25_layers 26) all pass. Visual check at 360 px (en, ru) and 320 px (az): no overflow; note fits.
- Not verified: wording quality in az/ru by a native speaker.
- Related, earlier today: F1 (a payment entered ahead and not linked to its bill was subtracted twice) fixed in c6dbe11 with hand-computed tests.

## Other points
| Item | Status |
|---|---|
| Home hierarchy; Safe to Spend prominent; no competing focal point | Already satisfactory (Safe card first, month card quiet when Safe is on); no change |
| Net / income / expenses distinct from Safe to Spend | Month card already separate; new note links it to balances |
| Transactions filter hierarchy, active-filter chips, advanced area | IMPLEMENTED (commit 0ede4d3): trip/wallet/account filters behind "More filters" (chip shows how many are on), new account filter, Clear resets all, day total shown as spending (−35.00, announced "Spent"). Browser test e2e_run31_ledger 15 checks |
| Settings (owner: Figma version better) | IMPLEMENTED (12b5ca9), own design: identity card, groups Money / Look and language / Data and safety / App, closed folds show a one-line summary. e2e_run31_settings 14 checks |
| Recurring empty state | IMPLEMENTED: empty screen offers "Add bill" |
| Add form amount-first, quick-fill, validation | Already present (amount-first, number pad, templates); not re-tested here |
| Budgets and Goals progress clarity, empty states | Inspected at 360 px: spent / limit / remaining and progress bars already clear; already satisfactory, no change. Tab "Goals" vs title "Budgets & Goals" left (rename is the owner's call) |
| Theme consistency/contrast in all themes | Existing theme tests (run25_themes) pass; per-theme contrast not re-audited here |
| Animations (transitions, save feedback, reduced motion) | Existing motion work (run26_motion) passes; no new animation added; reduced-motion respected by existing tests |
| Localization completeness | i18n logic suite and az/ru walks pass (1245 logic, walk 137); native review still outstanding |
| Figma Make prototype ("Caspian Ledger 2.0") | Reviewed visually; its Safe card shows Account funds − Upcoming − Savings floor, which is a different model from the app's (month-flow). NOT adopted: changing the formula needs an owner decision |

## Next recommended task
Inspect Transactions filter hierarchy and the Budgets/Goals screens at 360 px, decide per item what is real, then fix with tests. Owner decision still open: whether Safe to Spend should stay month-flow or move toward "account funds" as the Figma prototype shows.
