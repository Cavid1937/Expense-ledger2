# Run 105 screen audit (17 Nov 2026)

Method: the real bundled app (Run 105 build) in headless Chrome at 390 x 844, synthetic data only. A script visited every tab and every
page under Settings in several states, took screenshots (English) and ran automatic checks in en, az and ru:
sideways scrolling, buttons without a name, touch targets, field text size, clipped text, English words left in az/ru, JavaScript errors.
I looked at the screenshots myself. Scripts and pictures are in the session scratchpad only (not kept in the repo).

## Covered (screen x state)
| Screen | States looked at |
|---|---|
| Home | empty app; with data, top and bottom |
| Entries | empty; with data top/bottom; entry details sheet; delete + Undo bar; date-range sheet (Run 105 test) |
| Analytics | empty; with data top/bottom |
| Budgets & Goals | empty; with data top/bottom; budget edit (Run 105 test) |
| Settings | top/bottom; reminders time wheel (Run 105 test) |
| Under Settings | Recurring, Debts & loans, Import/Export, Lock, Safe to Spend, How it works, Feedback: top and bottom |
| Add entry | just opened; amount typed; close with unsaved amount (discard question) |
| Bank notices | bell notice, review sheet, Add, Not mine, Undo (Run 105 test) |

Not covered this pass (honest list): Accounts page, Gifts, first-launch / onboarding (already strong per owner), lock screen,
dark themes, 320 px width, the Android app itself (no device run), real-finger feel (swipe, momentum) on a phone.

## Automatic results
- JavaScript errors: none on any visited screen (en, az, ru).
- Sideways scrolling: none. Buttons without a name: none.
- English left in az / ru: none found on the visited screens (word list check, so not proof of perfect translation).
- Small touch targets: icon buttons look 26-34 px but already carry an invisible 44 px touch area (`::after`/`::before` inset);
  not a defect. Exception fixed: the X on the information sheets (now uses the shared close style with the larger area).
- Field text under 16 px: iPhone zoom is already prevented by an iPhone-only rule (styles.js, `@supports (-webkit-touch-callout:none)`);
  Android does not zoom. Not a defect.

## Findings and what happened
| # | Finding | Type | Status |
|---|---|---|---|
| 1 | Analytics: under "Monthly surplus 1,708" the line "same days last month: 61.00" was last month's SPENDING, so it read as last month's surplus | Confirmed defect (misleading figure) | Fixed: moved under Spent and worded "spent the same days last month: ..." in en/az/ru; test R105-A |
| 2 | Entries: a day with one spending entry repeated its own amount as the day total | Clutter | Fixed: total shows only for 2+ spending entries; test R105-A |
| 3 | Budgets: "Last months" under each bar looked like a stray label | Clarity | Fixed: bolder, with a chevron that turns when open |
| 4 | Information sheet X had no enlarged touch area | Touch target | Fixed |
| 5 | Entry details sheet stacks 7 full-width buttons (Edit, Duplicate, receipt, Split, Bill, Delete, Close); "Close" repeats the X | Design | Proposed for next run: secondary actions as a compact list, drop the extra Close |
| 6 | Same "more than the same days last month" comparison appears on Home and three times on Analytics Overview | Clarity | Proposed: keep it once per screen |
| 7 | Recurring page "Convert to bills" card explains internals in a long paragraph | Wording | Proposed: one sentence + (i) tip |
| 8 | Home greeting can wrap to two big lines and stays two lines in the sticky header while scrolling | Design | Proposed: shrink the title on scroll |
| 9 | Add entry: "Write it as a sentence" sits alone as a tall button in its own row | Design | Proposed: move beside "More types" as a small chip |

Statuses: findings 1-4 IMPLEMENTED, checked by browser tests (see report). 5-9 NOT STARTED (owner may prefer some as they are).
