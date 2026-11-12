# Run 58 report: categories reorganised, two faults fixed (13 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commit only. Nothing pushed, no APK built.
Approved by the owner on 13 Nov ("I agree with your way. Continue implementing planned works"); plan: `handoff/CATEGORY_AUDIT_20261112.md`.

## The two faults fixed
1. **The Gifts page counted haircuts and cosmetics as gifts.** They were recorded under "Gifts & Personal". The Gifts page now leaves out entries whose subcategory is Barber / Hair, Cosmetics or Personal Care, in any letter case. The entries themselves are not changed.
2. **Imported cash withdrawals were counted as spending.** If you also record what you buy with that cash, the same money was counted twice. In the bank statement import, cash withdrawals and money moved between your own accounts are now a separate tick box, **off by default**. Its text says why. Money sent to other people stays on, filed as "Money sent to people".

## Categories
- **New category: Personal Care.** It offers Barber / Hair, Cosmetics, Hygiene, Massage & spa and Other, and has its own icon (scissors). "Gifts & Personal" becomes **Gifts & Donations**, offering Gifts, Donations, Weddings & parties and Other.
- **Renamed: "Bills & Subscriptions" is now Phone & Subscriptions.**

  | Language | Full name | Tile |
  |---|---|---|
  | English | Phone & Subscriptions | Phone & subs |
  | Azerbaijani | Rabitə və abunəliklər | Rabitə |
  | Russian | Связь и подписки | Связь |

  The old Azerbaijani name said "utility payments", but utilities live under Home.
- **Duplicates no longer offered for new entries:**
  - Fuel, Parking and Car Maintenance under Transport (they are under Car);
  - Pets and Children under Other (they have their own categories);
  - "Other Subs".
- **New subcategories:**

  | Category | Added |
  |---|---|
  | Food | Drinks, Water delivery |
  | Transport | Train, Bike & scooter |
  | Entertainment | Going out |
  | Phone & Subscriptions | TV, Home phone |
  | Health | Hospital, Health insurance |
  | Education | Language courses, Driving school |
  | Travel | Travel insurance |
  | Home | Mortgage, Heating, Cleaning & laundry, Home insurance |
  | Finance | Money sent to people, Cash withdrawal, State fees |
  | Car | Car rental |
  | Freelance (income) | Cash work |
  | Social support (income) | Targeted social assistance, Child benefit |

- **Shopping's "Home" is now shown as "Home goods".**
- **Short hints in the Add form** where people look in the wrong place:
  - Phone & Subscriptions: "Electricity, gas, water and heating are under Home."
  - Home, Transport, Gifts and Shopping each get a similar one-line pointer.
- **Built-in places:** Rossmann goes to Personal Care, and Azəristilik to Home / Heating.
- **Bank merchant codes:** barber and cosmetics shops go to Personal Care, and cable TV to TV.
- **Fixed alongside:** switching between expense and income on a new entry used to keep the old subcategory. An expense's "Coffee" could end up saved on a Salary entry. The subcategory now resets with the category.

## What does not change (data safety)
- No category id was renamed or removed. Every saved entry, budget, bill, backup and older app version keeps working.
- Old entries keep their category and subcategory exactly; nothing moved by itself. A haircut recorded under Gifts stays under Gifts in Analytics until it is moved. The Gifts page alone already leaves it out.
- A subcategory that is no longer offered is still shown, translated, on the entries that have it, and can still be filtered by.
- Editing such an entry shows it as the chosen subcategory, and saving keeps it. Tested with an old Transport / Fuel entry.
- CSV files from earlier versions, which say "Gifts & Personal" or "Bills & Subscriptions", still import into the same places.

## Tests actually run
- Logic: 102 files, 2,103 checks passed, 0 failed (`node tests\run-logic.mjs`). The new `run58cats.test.mjs` has 30 checks, worked out by hand:
  - nothing offered before is lost (all 31 ids; every earlier subcategory still offered or kept as a retired name);
  - names in az/ru/en, including retired ones;
  - saved entries load unchanged, and old CSV names still import;
  - the Gifts total: 50 + 30 = 80, with haircut, cosmetics and personal care left out;
  - statement rows: by default 54.00 is added (30 to a person, 15 barber, 9 TV), and the 100 withdrawal and 20 own move are left out; ticking the option gives 174.00;
  - tidy-up: only ticked moves happen; repeating, bill, loan and debt entries are never offered; Undo restores exactly; a later edit survives Undo.
- Browser, on the final code:
  - new `e2e_run58_cats`: 25/25 (tiles, the hint, all 17 tiles fit at 320 px in az/ru/en, an old Transport / Fuel entry edited and saved unchanged, the Gifts page showing 100.00 not 140.00, the tidy-up card with its month preview, Undo and "Not now" remembered).
  - Also passing: e2e_downgrade 26, e2e_lang 57, e2e_run13 24, e2e_run12 35, e2e_run36 22, e2e_run38 29, e2e_run35_cat 25, e2e_run42 26, e2e_run50gifts 9, e2e_run51_undo 31, e2e_run52_statement 37, e2e_run6 14, e2e_bigtext 25, e2e_import 53.
- **Tests changed because the rules changed on purpose.** Each was replaced by an equally strict check of the new rule, and none was weakened:
  - run38: Transport's old subcategories are now "retired";
  - run52statement and e2e_run52_statement: the separate cash option;
  - e2e_run42: the new name "Phone & Subscriptions".
- Expected counts went up only:
  - i18n 77 to 78 (the new hint group is now checked; retired names are checked too);
  - e2e_run52_statement 35 to 37;
  - new files run58cats 30 and e2e_run58_cats 25.
- Full browser suite: run at the end of the night, after Run 59; see PHASE_CHECKPOINT.md.

## Also built in this run: "Tidy up categories"
On Budgets & Goals > My categories, a card appears when older entries sit in a place that has since moved. It lists each move with how many entries and what total, for example "1 entry: Gifts & Donations / Barber / Hair → Personal Care / Barber / Hair".
- Nothing is ticked at first.
- Before you press the button, it shows what changes in this month's figures ("Gifts & Donations 15.00 less, Personal Care 15.00 more").
- Only ticked moves happen, and an Undo bar follows.
- Repeating entries, bill payments and loan or debt payments are never offered.
- "Not now" hides it for good.

## Not changed on purpose
- The bank statement import still counts money received from people as income, when it is ticked.
- Money moved between your own accounts can be included by ticking the option. Its incoming half is then counted as "Other income". That is why the option is off by default.

## Status
| Item | Status |
|---|---|
| Gifts page fault | VERIFIED in tests |
| Cash withdrawals not counted by default | VERIFIED in tests |
| New and renamed categories, retired names kept | VERIFIED in tests |
| Names fit at 320 px (tiles, all 3 languages) | VERIFIED in tests |
| az / ru wording of the new names | IMPLEMENTED BUT UNVERIFIED (needs a native speaker) |
| On your phone | NOT ASSESSED |
| "Tidy up categories" card (move old entries, with Undo) | VERIFIED in tests |
| Lottery & betting, Alcohol & tobacco subcategories | Left for your decision; not added |

## Next action
Month-end leftover (approved 12 Nov), as Run 59.
