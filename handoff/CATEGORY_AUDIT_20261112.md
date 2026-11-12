# Category audit and proposal (12 Nov 2026). PLAN ONLY, nothing built.

Sources: the app's own list (App.jsx CATEGORIES, read 12 Nov), the import word map, `reports/Category taxonomy best practices.md`, the owner's ABB and Unibank statements (kinds of spending only), and the ABB payment catalogue (owner's video, 12 Nov).

## Rules that protect existing data (apply to everything below)
1. **No category id is renamed, reused or deleted.** Every old entry, budget, bill, backup and older app version keeps working. Only display names change, and new ids are added.
2. **Subcategories are stored on each entry as text.** "Removing" a built-in subcategory only takes it out of the list offered for NEW entries. Old entries keep it, still show its translated name, and can still be filtered by it.
3. **Nothing moves by itself.** Moving old entries to a better place happens only on a one-time "Tidy up categories" screen. It shows each proposed move with a count and an example, has a tick box per move, applies only what the person ticks, and offers Undo. Ids, amounts and dates never change; only category and subcategory do.
4. **Recurring things are preserved.** Entries that repeat, are linked to a bill, or belong to a loan or debt are never offered for a move, so a bill and its payments can never end up in different categories. The bill itself keeps its category unless the person edits it.
5. **Budgets:** a move that would make a budget count less is shown before applying ("Transport budget: 12.40 less this month"). Budgets are never created, removed or changed automatically.
6. **New imports** (CSV, statements, notifications) use the improved places from the day of the update. Already recorded entries are untouched.

## What is wrong or unclear today, and the fix

| # | Today | Problem | Fix |
|---|---|---|---|
| 1 | Gifts & Personal: Gifts, Donations, Personal Care, Barber / Hair, Cosmetics | Two unrelated things; the Gifts page counts a haircut as a gift (defect) | New category **Personal care** (new id `personal`): Barber / Hair, Cosmetics, Hygiene, Massage / spa, Other. **gifts** becomes **Gifts & Donations**: Gifts, Donations, Weddings & celebrations, Other. Gifts page counts only gifts and donations. (Detailed in NEXT_WORK_PLAN.md, 12 Nov section.) |
| 2 | Transport has Fuel, Parking, Car Maintenance; Car has Fuel, Parking, Car Maintenance too | The same thing in two places | Transport keeps public transport and rides only: Metro, Bus, Public transport card, Taxi / Ride-hailing, Intercity, Train, Bike / scooter rental, Other. Fuel, Parking and Car Maintenance are retired from Transport's list (they live in Car). Tidy-up offers to move old ones to Car. |
| 3 | Other has "Pets" and "Children" | Duplicates of the Pets and Family categories added later | Retire both from Other's list; tidy-up offers the move. Other keeps Miscellaneous. |
| 4 | Bills & Subscriptions has "Other Subs" and "Other" | Two "other"s | Retire "Other Subs"; offer the move to "Other". |
| 5 | "Bills & Subscriptions" holds phone and internet, while electricity, gas and water are in Home | People look for "bills" and find only half of them | Rename the display to **Phone, Internet & Subscriptions** (tile "Phone & subs"). Keep utilities in Home, and add a one-line hint on both ("Electricity, gas, water are in Home"). Needs the owner's OK on the name. |
| 6 | Shopping has "Home", "Furniture", "Appliances"; Home has "Household" | Unclear which to pick | Shopping keeps things you buy once and keep (Furniture, Appliances, and "Home" shown as **Home goods**). Home > Household is for things used up (cleaning, light bulbs). One-line hints under both. |
| 7 | Finance > Transfers counts as spending | Money moved between your own accounts is not spending; the statement import (Run 52) files cash withdrawals and card-to-card moves here | Split the meaning: **Money sent to people** (real spending from your point of view: a gift, a share of a bill) stays an expense. Moves between your own accounts and **cash withdrawals** become account transfers, not entries. In the statement import, the "transfers" tick box is split into "money sent to people" (on) and "cash withdrawals and moves between your accounts" (off by default, or recorded as transfers when accounts exist). This is a correctness item: today a cash withdrawal plus the cash spending recorded later counts the same money twice. |
| 8 | Health > Sports Equipment and Entertainment > Sports | Two "sport" places | Keep both with hints: Health = keeping fit (gym, equipment); Entertainment = watching or playing for fun (matches, games). No move. |
| 9 | Family > School items and Education > Stationery | Overlap | Keep both (children's school vs your own studies); add hints. No move. |

## Expanding what exists (new subcategories only; ids unchanged)
- **Food & Dining:** + Drinks, + Water delivery. (Alcohol and tobacco: add as **Alcohol & tobacco** under Other, neutral wording; decide with the owner.)
- **Transport:** + Train, + Bike / scooter rental.
- **Car:** + Car rental, + Car loan is NOT added here (loans are Finance > Loan payment, to avoid splitting loan figures).
- **Home:** + Heating (Azəristilik), + Mortgage, + Cleaning & laundry, + Home insurance. Keep Rent, Utilities, Electricity, Gas, Water, Building fees (residential complex fees, "MTK/MMC"), Repairs, Household.
- **Phone, Internet & Subscriptions:** + TV, + Home phone. Keep Mobile, Internet, Streaming, Software, Cloud Storage.
- **Health & Fitness:** + Hospital, + Health insurance.
- **Education:** + Driving school, + Language courses.
- **Travel:** + Travel insurance.
- **Finance:** + Government fees & duties (ASAN, state duty), + Money sent to people (see #7). Keep Bank Fees, Taxes, Insurance, Investments, Loan payment, Interest.
- **Entertainment:** + Going out (bars, clubs), + Lottery & betting (neutral name; never promoted; the owner decides whether to include it).
- **Family & Children:** + Weddings & celebrations (toy), + Support to parents.
- **Income, Freelance:** + Cash work (informal work is very common; research estimate 45-50%).
- **Income, Social Support:** + Targeted social assistance (ünvanlı sosial yardım), + Child benefit. Amounts are never pre-filled (state amounts change yearly).
- **Income, Family Support:** + Money from abroad (remittance; often in another currency).

## New categories (new ids)
- **Personal care** (`personal`), see #1.
- No other new top-level category: the research recommends 13-18 spending groups; with Personal care the app has 17. More would make the picker harder (Run 36 already hides unused ones and puts frequent ones first).

## Built-in place list (typing suggestions and statement hints)
Add the companies from the ABB catalogue (NEXT_WORK_PLAN.md, 12 Nov) to their new places: Azəristilik > Home > Heating; internet providers > Internet; TV providers > TV; Aztelecom / Ultel > Home phone; insurers > Finance > Insurance (car insurers to Car > Car insurance only when the name says so); taxis and sober-driver services > Transport > Taxi; donation funds > Gifts & Donations > Donations; Rossmann > Personal care > Cosmetics.

## Merchant codes (statement import, Run 52)
Update the code table in statement.js to the new places: 7230 (barber) and 5977 (cosmetics) go to Personal care; 6011 (ATM) goes to a cash-withdrawal transfer; 4900 (utilities) stays Home > Utilities; 4899 (cable TV) goes to TV.

## Translations
Every new name gets az, ru and en. All new names are drafts until a native speaker checks them. The research flags these as uncertain: "təqaüd" (scholarship vs older use for pension), "əmanət" vs "yığım", "abunə haqqı", "kirayə" vs "icarə".

## Tests to write first (before any change)
- Every old entry keeps its category and subcategory after the update (count and sum per category unchanged).
- A retired subcategory still shows its translated name on old entries, and can still be filtered by it.
- The tidy-up screen offers only the listed moves; recurring, bill-linked, loan and debt entries are never offered; it applies only what is ticked; Undo restores exactly.
- The Gifts page no longer counts personal care.
- Statement import: a cash withdrawal is no longer counted as spending; money sent to a person still is.
- New categories and subcategories appear in pickers, budgets, analytics, CSV export and import, and survive a backup round trip.
- An older app version opening newer data keeps the new ids.
- az / ru / en names exist for everything new; nothing overflows at 320 px.

## Order
1. The two correctness items first: #1 (Gifts page) and #7 (cash withdrawals counted twice).
2. Then the retire-and-expand list, which is additive and safe.
3. Then the tidy-up screen.
4. Display renames (#5) only after the owner approves the names.

Status: PROPOSED, NOT STARTED.
