# Run 55 report: plain-language pass, second part (12 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commits bbc334e, d160a93, bc6dcdc. Nothing pushed, no APK built.
Model note: the work switched from Fable 5.2 to Opus 5.5 during this run; nothing was redone.

## First: the full browser run of Run 54
123 files, 2,120 checks passed, 1 failed, computer awake the whole time. The failure was real but tiny: at a 320 px wide screen the Azerbaijani button "Hesablamanı gizlət" was 2 px wider than its box. Fixed (commit 52e3935).

## What changed in the words

**Analytics**
| Before | Now |
|---|---|
| Net surplus / Net deficit / Break-even | Left over / Overspent / Nothing left |
| Avg per txn | Average |
| Median | Usual amount |
| Spending pace is ahead of budget pace | Spending faster than the budget allows |
| Typical Purchase by Day of Week | Usual purchase by day of the week |
| Median amount per entry, and the number of entries | The usual amount of one entry, and how many entries |
| "A typical entry this month is 20% larger… (median of 8 vs 6 entries)" | "Your purchases this month are usually 20% bigger… (based on 8 and 6 entries)" |

**How it works** (in Settings)
- Part 1 now also answers "what if I make a mistake": undo right away, or open the entry later and change it.
- Part 4 now also answers "what if I stop using the app": nothing is lost; entries stay until the app is removed.
- Part 5 (income and refunds) went from 520 to about 330 characters; the loan wording was removed from it.
- Part 6 (money others pay back) went from 347 to about 220 characters.
- Settings said "Five short parts"; there are six. Now "Six short parts".
- The Android text said the phone's automatic backup is "encrypted". That was never verified, so the word is removed.

All of it in English, Azerbaijani and Russian. The Azerbaijani and Russian lines are my drafts.

## Tests actually run
- Logic: 100 files, 2,040 checks passed, 0 failed (after each change).
- Browser, alone on the final code: `e2e_phase2` 24, `e2e_run35_cat` 25, `e2e_run7` 21, `e2e_run9` 55, `e2e_bigtext` 25, `e2e_lang` 57, `e2e_run15` 35, `e2e_run16_info` 15, `e2e_run26_walk` 133.
- Test changes: 8 checks now expect the new words; each still checks the same thing. One test expected "Five short parts" while counting six headings; it now expects "Six".
- Full browser suite on the final commit: started after this report; result in PHASE_CHECKPOINT.md.

## Status
| Item | Status |
|---|---|
| Analytics wording | VERIFIED in tests |
| How it works wording | VERIFIED in tests |
| az / ru naturalness | IMPLEMENTED BUT UNVERIFIED |
| "Merchant" wording | BLOCKED on your decision ("Where you paid" is my suggestion) |
| Entry detail sheet rewrite | next |

## Next action
The entry detail sheet (your 10 Nov screenshots: unlabelled grey box, analytics words in the merchant card, actions that look like plain text).

## Added later on 12 Nov: the entry detail sheet (your 10 Nov screenshots)
| Your complaint | Now |
|---|---|
| An unlabelled grey box under the fields (the note) | It has the label "Note". It is not shown when it only repeats the place ("bus / metro" under "Bus/Metro") or when the note is already the title. |
| "Merchant Profile": Visits, Avg spend, Visit frequency, Typical day, ±15%, Est. next visit, Detected pattern | A folded button "Your history at this place". Opened, it says in sentences: "You paid here 4 times, 2.40 in all. Almost always the same amount, about 0.60. About once every 4 days. The next one is likely around 16 Nov. In the last 30 days: 2.40." Shown only from 3 visits on. |
| "Split into categories" and "This was a payment of a recurring bill" looked like plain text | Filled buttons, 44 px tall, with verbs: "Split between categories", "Mark as a bill payment" / "Mark as regular income". |
| Weak order of actions | Edit and Duplicate first, then the other actions, Delete last and set apart, then Close. |

Screenshots (made-up data): `reports/run55/detail-sheet-en.png`, `reports/run55/detail-sheet-az.png`.

A fault of mine that the new test caught before it reached you: my first version of the history card crashed the app ("Something went wrong") as soon as an entry with enough history was opened, because one helper was not imported. Fixed; the new test opens exactly that case.

Tests: new `e2e_run55_detail` 20/20 (note label and no repeat, folded card in plain words, no old analytics words, real buttons, order, privacy mode hides the amounts, az and ru fit at 320 px). Changed because the wording changed: `e2e_run24_split` (az/ru button label), `e2e_run12` and `e2e_run9` (they tap the bill button by its text). Run alone and passing: e2e_run12 35, e2e_run24_split 12, e2e_run43 13, e2e_run39_fx 15, e2e_run9 55, e2e_bigtext 25, e2e_lang 57, e2e_run8 9, e2e_import 53. Logic 100 files, 2,040/0.
Still "Merchant" in the field grid: waiting for your word.

## Added later on 12 Nov: "Where you paid" instead of "Merchant" (owner decision)
- English: the field is "Where you paid" for spending and "Who paid you" for income (the same field; for income "where you paid" would be wrong). The folded section says "Where you paid, note, date, …", the search box "Search place, note, amount…", Analytics "By place".
- Azerbaijani and Russian: unchanged ("Satıcı / xidmət", "Продавец"), as with "entry"; only the new income label is translated ("Kimdən gəlib", "От кого").
- The spreadsheet export keeps its "Merchant" column on purpose, so files already exported still import.
- Tests: new `e2e_run56_place` 13/13. Run alone and passing: e2e_run17_addform 11, e2e_run55_detail 20, e2e_bigtext 25, e2e_lang 57. Logic 100 files 2,040/0.
- Release number 56. Full browser suite on this commit: see PHASE_CHECKPOINT.md.
