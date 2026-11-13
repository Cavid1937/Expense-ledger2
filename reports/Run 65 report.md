# Run 65 report: one monthly surplus/deficit, three optional subcategories, translation review package (13 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commits only. Nothing pushed, no APK built.
Built from your decisions of 13 Nov, after reviewing GPT's file.

## About GPT's review file (PDF)
It is a template, not a review of our texts: every "current translation" field reads "[current]". Some items do not exist in the app ("Drink water", `az.json` files), and some suggestions would be wrong:
- "Aylıq fasilə" for a monthly surplus: "fasilə" means a pause.
- "Транзакции": it breaks your rule of "entry" ("запись").
- "Budget remaining" for the old "Left over": that figure was never a budget.

Two of its points were sound, and both are in the package below: a native speaker must check the texts, and the number and date formats need a native speaker's decision.

## What changed
1. **One monthly surplus / deficit, by the app's own rules.** It is earned income plus refunds, minus spending. Money taken from savings no longer counts as income in it.
   - It is the figure on the Analytics month card, the Home summary and the month-start goal offer.
   - Labels are "Monthly surplus" / "Monthly deficit" (az: Aylıq profisit / Aylıq kəsir; ru: Профицит / Дефицит за месяц).
   - New lines under it:
     - "It also counts X of refunds";
     - "X taken from savings is not counted here: it is not income";
     - when a cost is spread over months, a note saying this card counts it in monthly parts while "Not spent since you started" counts it on the day you paid.
   - The all-time overview in Analytics uses the same rule. It is labelled "Not spent" / "Overspent", because it is not a month figure.
   - Safe to Spend is unchanged: money taken from savings is still money you can spend.
   - **This reverses a Run 35 choice.** Someone living on savings used to see a surplus; now they see the true deficit, plus the line saying how much came from savings. The old test for that case was changed accordingly, and the reason is written next to it.
2. **Three optional subcategories:**
   - Alcohol, under Food & Dining;
   - Tobacco & vaping, under Shopping (separate from alcohol, as you asked);
   - Lottery & betting, under Entertainment.

   The app never puts anything there by itself: no built-in place points to them, and bank codes for liquor, tobacco or betting shops stay "Other" for you to choose.
3. **Gifts page fault found in the review screenshots:** in Azerbaijani and Russian, a gift's line showed the stored English subcategory ("Gifts"). It now shows "Hədiyyələr" / "Подарки".
4. **Translation review package** (`handoff/Expense Ledger translation review package 2026-11-13.zip`):
   - an Excel workbook with 5 sheets:
     - How to review, in English, Azerbaijani and Russian;
     - Glossary of 21 key words;
     - New and changed: 417 texts;
     - All texts: 1,728, each with its screen, where it is shown, a screenshot name, the parts that must not be translated, the plural forms needed, length limits, meaning notes, and columns for verdicts and corrections;
     - Questions: number format, dates, "profisit/kəsir", "qeyd/əməliyyat", formality.
   - 24 screenshots of 12 screens in az and ru.
   - A "READ ME FIRST" file.

   The workbook was opened in real Excel to check it.

## Tests
- Written first:
  - `run65surplus.test.mjs`: 12 hand-worked checks. For example: 1,000 earned + 50 refund − 600 spent = 450, with the 300 from savings left out; 43%; someone living on savings breaks even, or runs a 120 deficit; Safe to Spend is unchanged; a spread cost gives 800 on the card and −300 in "Not spent"; the goal offer uses the same rule.
  - `run65cats.test.mjs`: 9 checks covering where the subcategories sit, that nothing is assigned automatically, their names in 3 languages, and that older records and backups are unchanged.
  - `e2e_run65`: 11 checks on screen, including at 320 px in az/ru and the Gifts page fix.
- Changed because the rule changed on purpose, each just as strict:
  - run35cat (the living-on-savings share);
  - core.test (the label formula);
  - e2e_run35_cat (93% and two separate notes, instead of 94% and one combined note);
  - e2e_run7 (the all-time label).
- Results: logic 109 files, 2,190 passed, 0 failed. Browser files run on the final code: e2e_run65 11, e2e_run35_cat 25, e2e_run7 21, e2e_run59_leftover 16, e2e_run50 12, e2e_lang 57, e2e_ux_lang 8, e2e_run58_cats 25, e2e_run50gifts 9. Full browser suite on 8345621: 135 files, 2,276 passed, 3 failed, all three in e2e_run9 R9-5, which still expected the month labels on the all-time overview. That overview now says 'Not spent' / 'Overspent' on purpose, because it is not a month figure. I updated the check to the new labels (same 3 languages, same amounts), and e2e_run9 then passed 55/55 on its own, so all 135 files pass.

## Status
| Item | Status |
|---|---|
| Monthly surplus/deficit rule and labels | VERIFIED in tests |
| New subcategories | VERIFIED in tests |
| Gifts page language fault | VERIFIED in tests |
| Review package | Ready to send to a reviewer |
| Azerbaijani and Russian texts | IMPLEMENTED BUT UNVERIFIED (waits for a native speaker and a screen check) |
| On your phone | NOT ASSESSED |
