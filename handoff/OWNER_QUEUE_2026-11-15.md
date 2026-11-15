# Owner queue — 15 Nov 2026 (combined run, NOT STARTED)

Status: list not final. Owner said "Don't build anything" until he says it is final.
Plan: ONE combined run (release 90) covering A + B + C below.

## A. GPT localization workbook (Expense_Ledger_Complete_Localization_Review_Release_89.xlsx)
- 163 language proposals (P0 19, P1 30, P2 114; EN 23, AZ 85, RU 55) + 22 technical evidence checks.
- Handle key by key in code context: accept / revise / reject, each with a reason.
- P0 privacy/safety wording (learn.*, st.sumPrivOff, acct.err.server, crash.body, info.safe.1.h)
  must be checked against what the code actually does before wording is chosen.
- Use GPT's glossary as baseline (qeyd/запись, Xərcləmək olar, Aylıq profisit, rəng mövzusu, ...).
- Placeholder QA: safe.daysLeft, safe.noteSchedules — check call sites, do not insert tokens blindly.
- Produce a native-review sheet (AZ/RU) after the pass; do not claim native approval.
- Conflicts with GPT prompt, resolved by owner rules: owner allows pushing finished work;
  owner's combined run includes feature changes (GPT's "no feature change" applies only to the wording part).

## B. Design review findings
- All 9 findings in handoff/DESIGN_REVIEW_2026-11-15.md, in one go.

## C. Owner items from 15 Nov message
1. Receipt photo: attach is only on existing entries (screens/ledger.jsx). Add it to the + New entry sheet.
2. Updates without sending APKs: research live web-bundle updates for the APK (e.g. self-hosted / Capgo)
   vs Google Play internal testing ($25 one-time fee, owner decision) vs Firebase App Distribution. Recommend; spend nothing.
3. Move quick-add templates + category order/visibility from Goals to Budgets (Claude agrees).
4. "Entries counted twice?" check: stop nagging on repeated same-day entries; at most flag exact copies
   (same amount, place, account, within a minute) or add an off switch.
5. "Not spent" vs "Not spent since you started": explain; keep one, label plainly, put the difference in an ℹ️ tip.
6. Import/Export section: polish, shorten, less confusion.
7. Replace long texts with ℹ️ tips app-wide — but privacy/account disclosures stay visible.
8. Polish the top in-app notices (toasts / bell notices).
9. Shortcut link: explain to owner (pre-filled new entry link); consider clearer naming.
10. Time/range selection should look like the calendar; add presets (last 7 / 30 / 90 days, last month, this month).
11. Multi-select summary: show only what applies (only expenses -> only spent total; only income -> only income; both -> all three).
12. Select / Done buttons in Entries feel laggy: measure and make the switch instant.

## Still open from earlier
- Email sign-up: BLOCKED, waiting for owner decision.
