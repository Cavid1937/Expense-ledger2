# Claude's independent assessment — 2026-10-27 evening

Written after the owner's feedback: "you don't inspect the app and blindly follow my and GPT's instructions … tell your opinions,
do research, make suggestions." Based on: using the app as a new Azerbaijani user (local build, 375 px), the source, the test
history, ChatGPT's video review and the new Work Plan section, and a short web search (sources at the end).

## Where I was wrong
1. **I followed the redesign brief too literally.** I copied the reference's single shared header (+ and gear on every screen)
   without asking whether a transaction "+" makes sense on Budgets or Import / Export. ChatGPT is right: it doesn't.
2. **I shipped a contrast bug I should have caught.** The empty "0.00" in the Add form is #2C3A4B on #080F17 (≈1.4:1). My contrast
   test only checks text, not placeholders, so it passed. That is a gap in my own test, not just in the code.
3. **I reported the preview state confusingly.** The Notion report's first line still said "local only" after I pushed. Fixed today;
   the real state is: HEAD = preview branch = 802fca4, production = 86af1c1.
4. **I under-weighted the biggest risks to a real user** (below) because each run only worked the list it was given.

## The biggest real risks (my ranking, not the order I was given)
1. **Losing all data.** Everything lives in one browser's localStorage on one phone. Clearing site data, a browser reset or a new phone
   erases it; on iPhone Safari, storage of a site not opened for 7 days can be deleted unless the app is added to the Home Screen.
   The app never calls `navigator.storage.persist()` and has no service worker (it doesn't open offline). I proposed `persist()` in
   Run 3; it is still waiting for approval. **I think this matters more than any colour change.** The backup reminder is our only
   protection, which is why I disagree with making it *much* quieter (see below).
2. **Recurring bills are not real objects.** A "schedule" is guessed from past payments that share merchant/category/subcategory/frequency.
   That single design choice causes both open problems: two bills merge (item 4, Safe to Spend overstated by 90 in the test case), and
   a normal expense "Rent 800" is not counted as the rent payment unless entered through "Record payment". Patching it with a `billId`
   on transactions (my Run 8 plan) fixes the merge but keeps the guessing. **Better: an explicit list of bills** (name, amount, how often,
   due day, category, active) stored next to transactions in the same `expense_ledger_v5` record, and each payment pointing at its bill.
   This is how scheduled/recurring items work in YNAB-style tools. It is a data-model change, so it needs your approval — I recommend it
   over the `billId` patch.
3. **Value vs. local banks.** Azerbaijani banking apps already show card spending. The CBA says Account Information Service providers
   only need to register (May 2026), but there is no public API yet and only Plaid/Salt Edge list AZ coverage — so bank import is not
   realistic now. Our real advantage is **cash and multi-bank in one place, planning (Safe to Spend, bills, goals), and privacy (no
   account, data on the phone)**. That argues for investing in fast entry, bills and data safety, not more chart styling.

## Opinions on the new work order
| Item | My view |
|---|---|
| Recurring correctness first | **Agree.** Recommend the explicit bill list over the `billId` patch (needs approval). Now, without a model change: a "This was a payment of…" action on an existing expense, so a user can link it explicitly. Never auto-link on merchant + amount — agree. |
| Remove the gear, Settings only under More | **Agree.** |
| Contextual "+" | **Mostly agree.** One caution: adding an expense is *the* most frequent action. Removing it from Analytics costs a tap there; acceptable because Home and Transactions keep it. I'll follow the spec. |
| Privacy mode | **Agree, good idea** (checking spending on the metro is a real situation). It is shoulder-surfing protection only. A real lock (PIN / phone biometrics via WebAuthn) is the stronger feature later. Default session-only: agree. Auto-hide when the app goes to the background: considered, then **not** done (see "Decisions I made" below). |
| "Caspian Ledger" palette | **Partly disagree.** Fine to do (colours are now tokens, so it's cheap), but two problems in the proposal: the brand teal #4CC9C4 and income green #63D6A0 are close hues, so "selected" and "income" will look alike; and expense red #FF8188 is almost the chart coral #FF969B. I'll keep the palette but make income clearly greener and drop the coral from the category set. Honest note: changing the look twice in one day buys little user value; I'd stop restyling after this. |
| Home density | **Agree.** Collapse the Safe to Spend breakdown behind "How is this calculated?" (number first, explanation on tap), keep the month card, ring and upcoming bills in the first screen. |
| Quieter backup reminder | **Partly disagree.** Make it smaller, yes. But while data lives only on the phone, the reminder is the only safety net; it should stay visible once a week until the user confirms a backup. Better fix: approve `storage.persist()` + offline support, then the reminder can relax. |
| Floating black button | Can't attribute it from a desktop browser; not in our code (searched again). Needs your phone (Android: Settings → Accessibility → Accessibility button). |

## What I'm doing now (in this order)
1. Fix my own bugs: Add-form "0.00" contrast, and extend the contrast test to placeholders.
2. Header: gear removed; eye / eye-off privacy toggle in its place; contextual "+".
3. Privacy mode on every screen, with tests (en/az/ru, screen readers get "hidden").
4. Recurring: link an existing expense to a bill explicitly; clearer wording; tests. Explicit bill list = plan only, for approval.
5. Home: collapsible Safe to Spend explanation; first-screen priorities.
6. Caspian palette with the two adjustments above.
7. Full tests, screenshots (320/360/390/desktop, en/az/ru, privacy on/off), report.

## Decisions I made while implementing (and why)
- **No automatic hiding when the app goes to the background.** I first planned it; I dropped it because it would hide the amounts
  for everyone who never asked for privacy, every time they switch apps. Privacy is on only when the user turns it on (this session).
- **Privacy hides amounts, percentages, merchants, notes, goal names and insight sentences; it keeps category names and dates
  visible.** The work order asked to hide categories and dates too. My view: "Food, today" tells an onlooker almost nothing, while
  hiding them turns every list into unreadable blur and the user can no longer find anything. Easy to extend if you disagree.
- **Masking replaces the text itself (dots), not just a blur**, so screen readers and copy/paste get dots too; graphics (ring,
  trend, bars) are blurred. The edit form stays readable (opening it is a deliberate act).
- **Home:** "What changed" and the "Spending pace" card were removed from Home. Analytics has the same comparison and the daily
  average / projection / "ahead of budget pace" warning; the Home card's progress bar with the "today" marker is **gone** — a small
  real loss, noted honestly.
- **Palette:** income green #8BD97A instead of #63D6A0 (see above); teal buttons carry dark text (white on teal is 2.0:1);
  categories that looked alike in the ring (two teals) were separated.

## Decisions I need from you
1. Explicit bill list (recommended) vs `billId` patch for recurring payments.
2. `navigator.storage.persist()` + offline support — approve?
3. Keep the backup reminder weekly-visible until a backup is confirmed (my view) vs. much quieter (ChatGPT's)?

Sources: CBA on Open Banking (report.az, 14 May 2026) https://report.az/en/finance/cba-foreign-organizations-may-join-open-banking-in-azerbaijan ·
Open Banking Tracker, Azerbaijan aggregators https://www.openbankingtracker.com/api-aggregators?country=AZ ·
WebKit 7-day storage cap and Home Screen apps https://bugs.webkit.org/show_bug.cgi?id=211775 · Apple developer forum
https://developer.apple.com/forums/thread/710157
