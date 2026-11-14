# Merchant research audit — 14 Nov 2026 (Run 85)

Source: the owner's "Azerbaijan merchant research seed" package (README, CSV, JSON, sources), 14 Nov 2026.
Rules followed (from its README): catalogue stays separate data; exact name or alias first; no low-confidence
auto-fill; at most 4 suggestions; unknown places stay valid with no invented category; Bolt ≠ Bolt Food,
Yango ≠ Yango Delivery; Birmarket current, Umico kept as the old name; short/common words never match;
no outside services; historical categories are never rewritten; `expense_ledger_v5` untouched.

## What changed in the app (App.jsx)

- New `KNOWN_MERCHANT_ALIASES` list (alias → place already on the list). Aliases fill in the category only
  when typed exactly (after spaces are tidied); the name the person typed is kept as the merchant.
  While typing, an alias suggests the place it stands for, once, never the alias itself.
- Added: Starlink, UniNet, UlTel → Digital / Internet.
- A person's own history still wins over the built-in list and over aliases (tested).

## Decisions

| Decision | Rows | Reason |
|---|---|---|
| Accept (alias) | Bolt Taxi, Bolt Ride → Bolt; BoltFood, Bolt Yemək/Yemek → Bolt Food; Yango Taxi/Ride → Yango; Azercell/Bakcell Balans; Nar Mobile, Nar Balans, Azerfon → Nar; Azerigas, SOCAR Azəriqaz → Azəriqaz; Azəristiliktəchizat/Azeristiliktechizat → Azəristilik; Kontakt Home → Kontakt; Wolt Market → Wolt | Official names/rebrands given in the package's sources; each is 5+ letters |
| Accept (new place) | Starlink, UniNet, UlTel | Internet providers with official sites listed in the sources |
| Keep as is | Bravo, Araz, Bazarstore, Oba Market, SOCAR, Azpetrol, Kontakt, Baku Electronics, Rossmann, Wolt, Birmarket + Umico, Azersu | Already on the list and checked 8 Nov |
| Reject | 21 banks | A bank is where money is, not what it was spent on |
| Reject | Azerenergy | Not the household electricity payee |
| Reject | 5 hospitality venues (incl. Hilton) | Directory-only evidence; "Hilton" is too common a word |
| Reject | Generic "water" row | Not a merchant |
| Defer | Rahat, Neptun, Bolmart, Grandmart, Megastore, Al Market, Tamstore, SPAR, Favorite, Bee Gross, pharmacies (Zəfəran, Zeytun, Kanon, Azərimed, AVİS, Buta, Günəbaxan), Olivia, Soliton, BakuBus, Metro, Yango Delivery, Connect | Needs an official source, or the name is a common word (Metro, Favorite, Connect, Rahat, AVİS) that would cause wrong guesses |

No row was upgraded without a source.

## Tests

`node tests\run-logic.mjs` → 126 files, 0 with problems, 2473 checks passed.
New file `tests/logic/run85merch.test.mjs` (30 checks): "bolt 12" → transport; "Bolt Food 12" → food delivery;
aliases; OBA, Metro, Favorite, Connect, Rahat, AVİS, Hilton, ABB, Kapital Bank → Other; unknown place kept as Other;
own history beats list and aliases; Umico and Birmarket; list consistency (every alias points at a real place,
no duplicates, no alias shorter than 5 letters, every place points at a real category).
