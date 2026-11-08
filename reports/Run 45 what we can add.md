# What we can add (8 Nov 2026) - defined, NOT started

OWNER RULE (8 Nov, later): nothing here is built until the owner gives the order; every addition must keep the app simple, understandable and reachable for everyone. A first-run welcome idea exists as unreleased code on local branch wip/first-run-welcome (see Run 49 first-run idea (kept, not built).md).


Earlier rule (8 Nov, replaced by the OWNER RULE above): the list was to be done in full once started. Now each item waits for the owner's explicit order and is weighed against simplicity first. Nothing here is built. Sources: competitor note (research_notes/Competitors Budcem and Cashera.md), Run 44 designs, owner requests.

| # | Item | Why (evidence) | Needs from owner | Effort |
|---|------|----------------|------------------|--------|
| 1 | First-run questionnaire (income type fixed/irregular, pay day, cards and balances, credit debt, main goal) feeding accounts, bills, goals, Safe to Spend | Buedcem ships a 9-step version (owner video); fully local, no AI | none | small-medium |
| 2 | Sentence entry ("bolt 12", "market 25 yesterday"), several items per line, review before saving | Cashera chat entry; can be local parsing | none | medium |
| 3 | Gift ledger (weddings, birthdays: given/received, event, search, export) | Cashera has it; very local custom | none | small-medium |
| 4 | Bank notification import (Android APK): allow-listed bank, parse locally, review list, balance-chain check | Cashera ships it, Buedcem privacy text implies it | go-ahead, Birbank samples, package names | large + APK |
| 5 | Month-end rollover prompt to a goal | Run 44 design | none | small |
| 6 | Sinking fund via Goals ("Suggest monthly amount", yearly-bill set-aside) | Run 44 design | none | small-medium |
| 7 | Sync: S1 data model (updatedAt, tombstones) + S2 merge; later Google Drive transport, end-to-end encrypted | approved 8 Nov; prerequisite for family sharing | Google client id for S3 only | 2 runs + 2 |
| 8 | Better widgets (Safe to Spend + run-out line, today/month, quick-add buttons) | owner: too simple | APK rebuild | medium |
| 9 | Recurring-payment suggestions from repeated merchants | Cashera has it (check what the app already does first) | none | small |
| 10 | Category learning from corrections (remember merchant -> category) | Cashera has it (check existing known-merchants logic first) | none | small |
| 11 | Statement import: PDF/Excel text paste, per-bank parsers | Cashera accepts PDF/CSV/Excel; we have CSV | redacted statements | medium |
| 12 | Shared/family groups | both competitors | needs #7 first | large |
| 13 | Voice entry | Cashera | APK/browser speech support check | small-medium |
| 14 | Receipt scan | both competitors; privacy trade-off (cloud vs on-device OCR) | privacy decision | large |
| 15 | Keep "data never leaves the phone" true and visible (privacy screen, no network calls test) | our main differentiator vs two server-based rivals | none | small |

Suggested order: 15 and 1 first (small, differentiating), then 5, 6, 2, 3, 9, 10; then 7 (sync S1+S2); then 8 with the next APK; 4 when samples and go-ahead exist; 11-14 last.
