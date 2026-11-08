# Run 42 research summary: what to build next (8 Nov 2026)
Sources: three researcher notes in research_notes/Run 42 next features/ (float_sinking_pacing.md, azerbaijan_context.md, sync_import_delight.md). Evidence is thin: web-search snippets only, no Azerbaijani demand data, no user interviews. Treat as direction, not proof.

## Build next (in order)
1. Float / reimbursements. Model: optional reimbursableAmount + counterparty on the expense; balances use the full amount, spending analytics use amount minus reimbursable; repayment is a typed inflow linked to the expense(s), not income; "owed to you" derived, never stored; Safe to Spend uses real cash only. Pitfalls: partial/over repayment, deleting a linked expense, import validation. Medium risk, medium effort.
2. Pace line ("around day N") after float is excluded; wait ~5 days into the month; median-based. Low effort.
3. Sinking-fund reserve for non-monthly bills inside Safe to Spend: (amount - reserved) / months until due. Changes the headline number: design with owner first, and check overlap with the existing bills reserve.
4. Month-end rollover prompt to a goal (a prompt, never automatic, keyed by month), designed together with 3.
5. Pay-day-aware cycle / irregular-income mode; quick-add widget and "repeat last" (APK).
## Do not build
Hidden slush fund (no app does it; use the visible savings floor). Household sync (no demand evidence; first step would be encrypted file exchange). Bank sync (no open banking access). Receipt OCR, AI chat.
## Blocked on owner
Redacted real exports / SMS texts from ABB, Kapital (now Birbank), PASHA to design the import wizard. Short check with 5-10 users on whether they front money for friends and hold yearly bills.
## Merchant list corrections (applied)
Removed unverified: Glovo, Super Online, Irshad, Zeytun Pharm, Rahat, Neptun, Delta Telecom, Naxtel, Lukoil. Umico is now Birmarket (both kept). Added Rossmann, Avromed, Gapgo, Azeronline, iTicket. Kapital Bank brand is now Birbank. Ambiguous words to watch: araz, nar, bolt, oba, bravo, park, kontakt.
## Legal
Personal Data Law 998-IIIQ (2010, amended 2024): a local-first app sending nothing off-device has low exposure; get a local lawyer's review before sync, analytics or AI over user data. Unverified secondary summaries.