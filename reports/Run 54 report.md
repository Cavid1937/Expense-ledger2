# Run 54 report: plain-language pass, first part (12 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commits only. Nothing pushed, no APK built.

## What I looked at first
Home, the Add form and Settings as they are today, with made-up data, for a new person and for someone with entries. Finding: the Add form and Settings were already simplified in earlier runs (essentials first, "More details", plain groups). The weak spot was Home: a new person was not told what the app is, and the main numbers used finance words.

## What changed
| Where | Before | Now |
|---|---|---|
| Home, new person | Numbers at zero, a checklist | A Welcome card on top with three sentences: what to do, what you gain, that it is private. "Got it" removes it for good. It never shows once an entry exists. |
| Home, Safe to Spend | The number with no explanation | One sentence under the title: "What you can still spend this month, after your bills and savings." |
| Home, month card | "68% Surplus", "Deficit", "Break-even" | "Not spent", "Overspent", "Nothing left" |
| Home, Coach | "Spending Pace: You are X above budget pace for this point in the month." | "Spending so far: So far this month you have spent X more than your budgets allow by today." |
| Settings | Version 53 | Version 54 |

New document: `handoff/plain-story.md`. It holds the three-sentence story in az, ru and en, one line for what each part of the app is for, the worries a person has and where the app answers them, and the words to avoid. Please read it and correct anything; it is the standard I will write against.

## Tests actually run
- Logic: 100 files, 2,040 checks passed, 0 failed.
- Browser, alone on the final code: `e2e_run54_plain` 16/16 (new), `e2e` 27, `e2e_ux` 30, `e2e_bigtext` 25, `e2e_run9` 55, `e2e_lang` 57, `e2e_run26_walk` 133, `e2e_run50setup` 10, `e2e_run15` 35.
- The big-text test caught one fault of mine: the first Azerbaijani label ("Xərclənməyib") did not fit its box at enlarged text. It is now "Qalıb".
- Full browser suite on this commit: NOT RUN (about 70 minutes; the computer slept during the last one). Still owed before any push.

## Status
| Item | Status |
|---|---|
| Welcome card, Safe to Spend sentence, plain month labels, plain pace wording | VERIFIED in tests (en, az, ru present and fitting) |
| Naturalness of the az and ru wording | IMPLEMENTED BUT UNVERIFIED (my drafts) |
| Analytics and Coach wording | NEEDS WORK |
| "How it works" rewrite | NEEDS WORK |
| One word for transaction/entry and for merchant | BLOCKED on your decision |
| Entry detail sheet rewrite | NOT STARTED |

## Where I disagree with the plan as written
The plan said to move most of the Add form behind "More options". That is already done ("More details" holds merchant, note, date, wallet, repeat). I did not move the category and subcategory tiles: choosing a category is the one thing every entry needs, and hiding it would add a tap to every entry.

## Next action
Analytics and Coach wording, then "How it works", using `handoff/plain-story.md`.
