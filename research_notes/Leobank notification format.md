# Leobank push notifications - owner's screenshot, 8 Nov 2026 (3 samples, nothing built)

Source: one lock-screen screenshot from the owner's phone (Leobank app, notifications 54 min and 1 h old). The image itself is NOT stored in the repo (it shows a real balance).

## Shape of each notification
- Title line: an emoji + the amount + the manat sign, e.g. "(bread emoji) 2.96 ₼", "(money-mouth emoji) 50 ₼". No minus or plus sign.
- Body line 1: the merchant / counterparty (TamStore, Favorite, eManat).
- Body line 2: "Balans <balance after the payment> ₼" (Azerbaijani word "Balans").
- The emoji looks like the bank's own category icon (bread = groceries; money-mouth = probably money in / top-up). Unconfirmed: only 3 samples.

## What the three samples prove (hand check)
Newest to oldest balances: 70.30, 73.26, 75.55.
- 75.55 - 2.29 = 73.26 (Favorite 2.29 was money OUT).
- 73.26 - 2.96 = 70.30 (TamStore 2.96 was money OUT).
- The 50 ₼ "eManat" one gave balance 75.55; its direction cannot be read from the text. The balance before it would tell: 25.55 means money in (top-up), 125.55 means money out.
=> The balance in the message lets a parser work out direction (in or out) by comparing with the previous notification's balance, instead of guessing from words. It also reveals a MISSED notification: if previous balance - amount != new balance, something between was not seen.

## Open questions (need more samples, not more code)
- Transfers, salary, card-to-card, cash withdrawal, refunds, subscriptions, foreign-currency payments, declined payments: what do they look like, are there signs or words?
- Is the emoji stable per category? (could map to the app's categories)
- Android package name of the Leobank app (the owner can read it in App info) - needed so a listener would read ONLY that app.
- Do ABB / Kapital (Birbank) / PASHA look similar?

## If it is ever built (design only; owner said "don't build anything yet")
- Android notification access is a special permission (APK only, sideloaded fine for the owner; Google Play restricts it). Read only an allow-listed bank package, parse locally, never save automatically: each parsed item goes to a review list (the app already has a share-text review flow from Run 33) with amount, direction (from the balance chain when available, otherwise asked), merchant, suggested category (known-merchants list + own history + the bank emoji), duplicate check against existing entries.
- Balance lines could also reconcile an account's balance (accounts feature) and flag missing entries.
- Privacy text must be updated before shipping anything that reads notifications.

---

# ABB (ABB mobile) notification list - 3 screenshots from other people, 8 Nov 2026 (nothing built)

Source: the in-app "Notifications" screen of ABB mobile (English UI), not Android system notifications, so the push text may differ slightly (unverified). Images not stored (card tail + balances).

## Shape
- Title: "<Kind>: <signed amount>₼" - Kind is Payment or Transfer; the amount carries an explicit sign (-0.90 / +20.00).
- Body: counterparty line (optional), "Card: **NNNN" (last 4 digits), "Balance: <after>₼". Date header and time shown outside the card.
- Other cards in the same list are NOT transactions: campaigns, an iTicket purchase notice with text, "What's New" / "Informative" tabs. A parser must ignore anything without Kind + signed amount + Balance.

## Counterparty lines seen (noisy, ASCII-folded Azerbaijani, codes inside)
"Bus 594" (public transport), "28-May Metro", "2061 Bazarstore 46273 3" (shop name with store codes), "Citynet 344c0090032" (internet bill + account id), "Seki Sirniyyati" (a sweets shop, no ə/ş), "www.birbank.az" (money in from Birbank), "AniPay-da kocurma amaliyyati (C2C)" (card-to-card via AniPay), and a Transfer with no counterparty line at all (-35.00).

## Balance chain check (hand-computed)
Oct 15-16: 46.36 -> +60.00 = 106.36 -> -25.00 = 81.36 -> -35.00 = 46.36 (all match). Oct 20: 28.38 -> +3.00 = 31.38 -> +15.00 = 46.38 -> +20.00 = 66.38 (match). Nov 2-3: 13.06 -> -4.40 = 8.66 -> -0.90 = 7.76 (match). So for ABB the balance is a CHECK (explicit sign already gives direction), and a broken chain would reveal a missed notification.

## What this means for a future importer (design only)
- Common internal record for every bank: { amount, direction, counterpartyRaw, cardTail, balanceAfter, dateTime, kind }.
- ABB: direction from the sign. Leobank: direction from the balance chain (no sign).
- Card tail **2416 maps to one of the user's accounts (app already has accounts) - ask once "this card is my account X", then remember.
- Counterparty cleaning: strip store codes and ids, fold ASCII Azerbaijani, then match the built-in merchants list and the user's own history; unknown ones go to the review list uncategorised. "Bus", "Metro" -> Transport; "www.birbank.az" / "AniPay" transfers -> a transfer between own accounts or a person, never auto-income: ask.
- Still needed: Android package names, whether the real push text matches this list, salary / cash withdrawal / refund / declined / FX samples, and Kapital (Birbank) + PASHA samples.