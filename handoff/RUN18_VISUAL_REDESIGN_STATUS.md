# Run 18 — visual redesign alignment: honest status (2026-10-30)
Method: rendered the 8 reference screens from SYNTHETIC data at 390 px (English) with `tests/visual/redesign-shots.mjs` on the build of commit 30bbc0f; compared by eye with `handoff/redesign/target-ui-reference.png`. Screens: `handoff/redesign/shots-run18/`.
Compared this session: Home, Transactions, More/Settings (looked at); Analytics, Budgets/Goals, Recurring, Import/Export, Detail were captured but NOT compared line by line.

Findings (Claude-observed, not measured):
1. Layout structure matches the reference (greeting, Safe to Spend card, This month card, spending breakdown, grouped transaction list with search + filter chips, settings list). Status: IMPLEMENTED BUT UNVERIFIED.
2. Accent colour is the app's teal "Caspian Ledger" system, not the reference's blue. Deviation from Run 8, not changed here (owner will supply palettes for selectable themes).
3. Fifth tab is "Settings" (owner decision in Run 17), the reference and the Run 18 text say "More". Deviation recorded, owner-approved.
4. The round "+" (bottom right, owner decision) covers the amount of a row scrolled beneath it (Transactions: "-176.30" cut off). Normal for a floating button but it hides money figures at that moment. Suggested fix, not done: extra bottom padding at the end of lists plus a smaller button or auto-hide while scrolling. Needs owner preference.
5. Reference shows a dark blue theme with a profile header, "Upcoming" list on Home and recent imports on Import/Export; the app's Home has no Upcoming list. Not added (new feature).
Not assessed: 320/360 px, Azerbaijani/Russian long text on all 8 screens in this run, contrast per screen, real phone.
Status of "visual redesign complete": NEEDS WORK / NOT VERIFIED. No release-ready claim.
