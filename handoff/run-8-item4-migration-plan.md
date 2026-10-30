# Item 4 — two distinct bills with the same merchant, category, subcategory and frequency (Run 8)

## Evidence (tests/evidence/179-item4-identity-collision.txt)
Kommunal · Home / Utilities · monthly: electricity 90 (note "Electricity") and water 18 (note "Water"), both last paid 5 Sep;
water paid again 5 Oct. Today 13 Oct, income 2,000.
- `buildSchedules` → **one** schedule (key `expense|housing|kommunal|monthly|utilities`); amount and note are not part of the key.
- The 18 water payment on 5 Oct marks the whole schedule as paid, so the unpaid 90 electricity is **not** set aside.
- Safe to Spend 1,982 (expected 1,892) — overstated by 90.
Status: **CONFIRMED, NOT FIXED in Run 8** (a data-model change; see below).

## Why not just add amount or note to the key
- Amount: a bill whose price changes (ISP 30 → 35) would split into two schedules, and the old one would keep "expecting" payments → money set aside twice.
- Note: notes often change month to month ("Rent October", "Rent November") → every month a new schedule.
Either rule would silently re-group existing users' schedules — exactly what the work order forbids.

## Proposed plan (needs owner + ChatGPT agreement before implementation)
1. **Optional stable id `billId` on recurring transactions.** Absent on all existing data; nothing is re-keyed.
2. **Grouping:** a transaction with `billId` groups by `billId`; one without it groups by today's key (legacy behaviour, unchanged).
   A legacy group and a `billId` group are linked when the user records a payment for the legacy group (step 3), so no split.
3. **"Record payment"** (Run 6) copies the schedule's `billId`. For a legacy schedule (no id yet) it assigns a new `billId` to
   the new payment **and** to the schedule's existing members in the same save — one explicit user action, visible in Undo.
4. **Adding a recurring entry by hand** that matches an existing schedule's key: the form asks one question —
   "Is this a payment of ‹Kommunal · Utilities (90.00)›, or a separate bill?" — instead of guessing. Answer "payment" → same
   `billId`; "separate bill" → new `billId` for the new entry only (the old schedule keeps its members).
5. **Backups/CSV:** `billId` is exported in JSON backups; CSV import has no such column, so CSV rows follow legacy grouping.
   Import validates `billId` as a short string; anything else is ignored (not refused), so older backups still load.
6. **Tests first:** the collision fixture above (must give 2 schedules once the user separates them, and 1,892); variable-price
   control (30 → 35 stays one); legacy data loads with identical grouping; Record payment on a legacy schedule assigns ids once;
   Undo of that save restores the id-less state; backup round-trip keeps `billId`.

Risk: low for existing data (nothing changes until the user acts); medium UI cost (one question in the Add form).
