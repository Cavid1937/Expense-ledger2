# Design review: Expense Ledger release 89 (15 Nov 2026)

**Method.** The design-studio review skill (frontend-design). Screens were captured at 390×844 in English on the Ivory and Graphite themes, using made-up data (no real records). These screens were reviewed: Home, Entries, Analytics, Recurring, Budgets & Goals, Settings and New Entry.

**Limits.** No phone was used. Azerbaijani and Russian were not checked in this pass. In the full-page pictures, the tab bar appears in the middle of the page; that is how the picture was taken, not a bug. Nothing in the app was changed.

## What is already strong (keep)

1. **The Safe to Spend card is the right hero.** It opens with the most useful thing in this app's world: how much I can still spend. The day bar with a marker for today is the app's own, distinctive device and carries real meaning. This is where the design's boldness belongs.
2. **A calm, coherent base.** Onest type, quiet Ivory and Graphite palettes, one icon style and soft category tints. Nothing looks borrowed from a template, and the dark theme is as complete as the light one.
3. **Plain words in most places**, such as "What you can still spend this month, after your bills and savings."

## Findings, most important first

| # | Finding | Evidence | Impact | Priority | Recommendation |
|---|---|---|---|---|---|
| 1 | **Three different answers to "How am I doing?"** | Home: Safe to Spend 811 ₼ (calm). On the same screen the coach says "you have spent 71 ₼ more than your budgets allow by today", in warning amber. Budgets: "132 ₼ spent of 380" while Home says 261 ₼ spent. 132 counts only categories that have a budget, but the screen doesn't say so. | Trust. A beginner cannot tell whether they are fine or overspending. | High | Budgets: write "132 ₼ spent in budgeted categories". Coach: name the category ("Food is 71 ₼ ahead of its budget") instead of a total that seems to contradict Safe to Spend. |
| 2 | **Analytics is one very long page.** | About 20 sections, roughly 3,700 px tall at phone width. Surplus, spent and income appear three times (top, Overview card, Home). "Overview" is both a tab and a card. | People stop scrolling before reaching the useful parts, and the screen feels like a report rather than an answer. | High | Overview tab: four blocks only (month result, trend, top categories, one insight). Move the rest to the Spending, Trends and Insights tabs. Remove the duplicate Overview card. |
| 3 | **Every expense is red.** | Entries, Home and Recurring all show each normal purchase in red-orange. | Ordinary life looks like an alarm. Red should mean "over budget" or "overdue". | Medium | Expenses in normal text colour with a minus sign, income in green, red only for problems. |
| 4 | **Entries: one card for every single entry.** | Entries shows about 5 entries per screen; Home's list, with rows inside one card, fits more. The two lists also look different. | Less on screen, heavier look, and the two lists are inconsistent. | Medium | One grouped surface per day with divider lines, like the "Latest entries" card on Home. About 8–9 entries fit per screen. |
| 5 | **Recurring rows are busy on the right.** | The right column holds four stacked items: amount, ≈ per year in italics, "Record payment" and "Pause" in underlined amber. "Due in 20 days · no payments yet · 1 not recorded this month" reads as a contradiction (the payment due on 5 Nov was missed; the next is on 5 Dec). | Hard to scan, and amber "Pause" looks like a warning. | Medium | Right column: amount and one button ("Record payment"). Move Pause and the per-year amount into the row's sheet. Show the status line as either "Missed on 5 Nov" in red or "Next on 5 Dec". |
| 6 | **The New Entry sheet asks too much at once.** | Visible together: 4 type buttons (Loan and Debt sit next to Expense and Income with no hint of the difference), "Write it as a sentence", 4 calculator keys, Quick fill, category search, category chips cut off at the edge ("Personal c…"), subcategories, More details, Cancel, ✕ and Record. | The most frequent action in the app takes the most reading. | Medium | Expense and Income as the main switch; Loan and Debt under "More types". Calculator keys appear when the amount field is touched. Remove the Cancel button (✕ and swipe already close the sheet). Let the chips scroll with a visible fade edge. |
| 7 | **Mixed capital letters and the "— month" pattern.** | "New Entry", "Record Expense", "By Category", "Patterns & Insights", "Budget Status — November 2026", next to "Latest entries" and "Spending breakdown". | It looks unfinished and template-like. | Low (easy) | Use sentence case everywhere ("New entry", "Record expense", "Budget status", "November 2026" on its own line). |
| 8 | **Settings starts with low-value items.** | The top shows the name field, then a long Account card (three paragraphs). Money settings start below the first screen. | Settings feels like a sign-up form. | Low | Order: Money, Look, Account, then Name. Keep the privacy text visible (your rule) but shorten it to two sentences. |
| 9 | **The + button covers content when the screen opens.** | Home hides the "−129 ₼" amount and Recurring hides "Pause" behind the +. | A small annoyance, and it can hide the very button needed. | Low | Add extra space at the bottom of lists, and keep the right column of rows clear of the button's area. |

## Design direction (one sentence)

**Keep the boldness in Safe to Spend and make everything else quieter:**
- fewer cards with shadows: use grouped rows;
- one accent colour;
- red only for problems;
- each screen answers one question.

## Suggested order if you say go

1. Items 1 and 7: trust and consistency. Small, safe and mostly wording.
2. Items 3 and 4: calmer lists.
3. Item 2: rebuild the Analytics Overview.
4. Items 5 and 6: Recurring rows and the New Entry sheet. These are larger and should be checked on your phone.

Nothing has been built. Waiting for the owner's choice.
