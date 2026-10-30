# Run 15 — section inventory (all five tabs) and placement decisions — 2026-10-29

Source: App.jsx before this run = ADD9FE8F… (Run 14, commit 2ab62091). Method: read the render code of every tab and captured each screen at full
scrollable height (390 px wide, synthetic data; the six PNGs are in `handoff/redundancy-audit-20261029.zip`). "Summary" = a short snapshot with a
different purpose from its detail screen; "Duplicate" = the same detail shown twice with no extra value.

| Tab | Section (data-section) | Purpose | Also shown in | Class | Decision |
|---|---|---|---|---|---|
| Home | Safe to Spend (`home-safe`) | the one number to act on | — | unique | keep |
| Home | This month: spent, income, surplus (`home-month`) | position this month | Analytics summary (same month, with comparison) | summary vs detail | keep (target reference) |
| Home | Spending breakdown donut (`home-breakdown`) | glance at where money goes | Analytics "By category" bars | summary vs detail | keep (target reference); Analytics stays deeper (trend, comparison, merchants) |
| Home | Due within 7 days (`home-upcoming`) | what is coming | Bills page (More) | summary vs detail | keep (target reference) |
| Home | Coach alerts (`home-coach`) | things needing attention now | Analytics "Patterns & insights" overlaps in tone | partial overlap (D8) | keep; goal alerts shortened to one line without amounts (the numbers live on Goals); D8 documented, not changed |
| Home | Goals block | goal progress | Goals tab (same goals, more detail) | **duplicate** | **removed** |
| Home | Budgets block | budget progress | Budgets tab; coach already raises over/near-limit budgets | **duplicate** | **removed** |
| Home | Recent Activity (about 6 rows) | latest entries | Transactions tab, Analytics list | **duplicate** | **removed**; replaced by one "See all transactions" route (`home-see-all`); empty state kept (`home-empty`) |
| Transactions | search, type/category/date filters, grouped list | the one complete ledger | — | canonical | keep (also searchable by month name, which replaces the Analytics list) |
| Analytics | month selector, summary, trend (`an-month`, `an-summary`, `an-trend`) | one selected month drives all month figures | — | unique | keep |
| Analytics | What changed vs same days last month (`an-changes`) | comparison | — | unique | keep |
| Analytics | Budget status for the selected month (`an-budget`) | budgets for a past or current month | Budgets tab (current month only) | summary vs detail (adds past months) | keep, flagged for ChatGPT review |
| Analytics | By category, By merchant (`an-category`, `an-merchant`) | aggregates | Home donut (categories) | summary vs detail | keep |
| Analytics | Top expenses (5 rows) | largest rows | Transactions, the list below | **duplicate** | **removed** |
| Analytics | All transactions of the month | every row | Transactions tab | **duplicate** | **removed**; a month with no entries still shows its empty state (`an-empty`) |
| Analytics | Trends: 6-month bars, patterns, typical purchase by weekday, unusual entries, weekly heatmap (`an-trends`) | multi-month view, labelled as such | — | unique; page is long (inventory only) | keep; length noted for a later decision |
| Budgets & Goals | Budgets: total, by category, not set (`bg-total`) | manage budgets | Home (removed), Analytics (past months) | canonical | keep |
| Budgets & Goals | Goal card (`goal-card`): progress bar, saved/target | manage goals | Home (removed) | canonical | keep |
| Budgets & Goals | Required monthly amount (`goal-need`) | the answer for a dated goal | — | new | added; first thing after the bar |
| Budgets & Goals | 25 / 50 / 75 / 100 % milestone tiles | restated progress | the progress bar | **duplicate** | **removed** |
| Budgets & Goals | What-if rows at 60 / 100 / 140 % of the monthly amount | arbitrary scenarios | `goal-need` | arbitrary presets | **replaced** by a collapsed, user-typed scenario (`goal-scenario`) |
| More | Bills, Import / Export, Settings rows | navigation | — | unique | not changed |

Open items found while inventorying (not fixed here): D8 coach vs "Patterns & insights"; Analytics length; `resolveCategory` turns an unknown category
id into "Other" (conflicts with the new rule "never silently remap unknown categories"; matters before custom categories).
