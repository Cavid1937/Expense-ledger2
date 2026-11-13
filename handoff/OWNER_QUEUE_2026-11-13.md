# Owner queue, 13 Nov 2026 (after release 69). Nothing here is built yet: "Don't build anything".

Source: the owner's message of 13 Nov, which compares the app with Cashera and includes two phone screenshots. A third screenshot, with a part of the screen marked as "too rude and big", did not arrive.

## 1. Read bank notifications automatically and offer them (owner: must-have)
- **What:** the APK reads bank and wallet notifications as they arrive and shows "Add this payment?", which the person confirms or edits. Nothing is ever added silently.
- **Already there:** the reader for the ABB, Leobank, Birbank and Google Wallet layouts (notify.js, tested).
- **Missing:**
  - an Android notification listener in the Capacitor shell;
  - a list of bank apps to listen to (everything else is ignored and never stored);
  - the offer screen;
  - duplicate checks against entries that were pasted or imported.
- **Risks:**
  - The permission lets an app see every notification. The person turns it on in Android settings, and the app explains this first.
  - Google Play restricts this permission. That matters only if we publish on Play; check its policy before then.
  - Xiaomi/Poco may kill background listeners, which needs the battery setting explained.
- **Design first, in Figma,** as agreed for native features.

## 2. Learn new notification layouts from other users (owner idea)
- **Plan:** as part of the opt-in "Help improve the app", and only when the reader could NOT understand a notification, the phone sends a masked layout. Example: "💳 Payment: -#.## ₼ / [PLACE] / Card: **#### / Balance: #.## ₼".
  - Every digit, place, name and amount is replaced on the phone.
  - The person sees the masked text before it is sent, and can decline.
- **Not acceptable:** sending real notification text. It holds balances, card digits, places and sometimes names, so the masking is the whole feature.
- **Status:** a strategic opinion. It needs the masking to be tested as strictly as cleanPlace.

## 3. Anonymous screen-open counts and errors (like Cashera)
- **Plan:** add "which screens were opened today" (counts only) to the existing opt-in switch. Errors are already in it as crash messages.
- **My recommendation:** keep it opt-in rather than on by default. It costs nothing, and our privacy promise is the product's main difference from Cashera.

## 4. "Report a problem / Write to us" in the app
- **What:** a short form with what happened, an optional e-mail for a reply, and an optional tick for "attach the technical details". The details are the app version, screen and the last error, never entries or amounts.
- **Cost:** free. It is one more insert-only Supabase table, plus a private place where the owner reads the messages.
- **Risks:**
  - spam, so limit how often one phone can send;
  - people pasting private data, so warn them under the text box;
  - someone must actually read and answer these.

## 5. Monthly report by e-mail (Cashera has it)
- **Disagreement:** an e-mail sent by us means a server must receive the person's monthly money figures and e-mail address. That breaks "your data stays on this phone". It also needs an e-mail sending service (free tiers exist, with limits) and rules for unsubscribing and storing data.
- **Recommended alternative, no server:**
  - a monthly notification: "Your October summary is ready";
  - a summary screen;
  - a "Share / e-mail it to myself" button that builds the report (PDF or text) on the phone and opens the phone's own mail app.
- **OWNER DECIDED (13 Nov): the phone-only version.** No server e-mail.

## 6. Subscriptions separate from repeating payments
- **What:** in the same Recurring place, two kinds: subscriptions (Netflix, Spotify, iCloud, phone plan) and other repeating payments (rent, utilities, loan).
- **Subscriptions get their own:**
  - total per month and per year;
  - "renews on" date;
  - "cancel reminder".
- **Note:** it changes how bills are stored (a kind field). That needs a migration, tests, and old backups that still open.

## 7. App-styled pickers instead of the phone's own dialogs
- **Problem:** the owner's screenshots show the date field and the Monthly / Weekly choice opening Android's grey system dialogs ("CLEAR / CANCEL / SET", radio list). They look foreign in the dark app, and the date field shows the US format 11/13/2026.
- **Plan:** our own bottom sheets in the app's colours:
  - a calendar with Today / Yesterday shortcuts and az/ru/en month names;
  - option lists for frequency, account and similar choices.
- **Applies everywhere:** add, edit, bills, goals, debts and filters.
- **Must keep:**
  - keyboard and screen-reader use;
  - 44px touch targets;
  - the ability to type a date.

## 9. Move "Not spent since you started" from Overview to Trends (owner, 13 Nov)
- **Owner's screenshot:** Analytics → Overview, the second card.
- **Why I agree:**
  - It is a whole-history figure, not a this-month one.
  - Trends already holds the month-by-month views, and its "Show each month" list belongs with them.
- **Same move:**
  - Remove the card's first line, "This month so far: 139.80 ₼ not spent". The card right above already shows the same 139.80 as "Monthly surplus", so the Overview showed one number twice.
  - In Trends, show the title first, then the big number, then the explanation and "Show each month".
- **Nothing else changes:** same calculation (notSpentHistory) and same texts.
- **Tests that pin the card's place must be moved with it:**
  - e2e_run59_leftover;
  - e2e_run65;
  - any test that opens the Overview segment for it.

## 10. Separate Gifts page (owner, 13 Nov: "unnecessary for now, you decide; if it stays it must be polished")
- **Decision (mine, as the owner asked): hide it, don't delete it.**
  - Take the "Gifts" row out of Settings.
  - Nothing is lost: gift entries stay normal entries under "Gifts & Donations", with the person in the place/note field. They can still be found with Entries → Category → Gifts, and they still count in budgets and analytics.
  - The page's code stays in place, unused, so it can return later without rebuilding.
- **Why:**
  - It is a second place to look for the same entries.
  - It adds one more row to an already long Settings list.
  - Nobody but the owner has asked for it yet. This follows the 8 Nov "keep the app simple" rule.
- **When it could come back:** if testers ask for it. Tracking wedding or toy money given and received is a real habit here, so that would be the case to build for. If it returns, it gets the full polish pass first, and lives under Entries or Goals rather than Settings.
- **Tests to adjust when this is built:**
  - e2e_run50gifts, which opens the page from Settings;
  - run50gifts, the logic test. It stays, because the function remains.

## 8. "Marked place is too rude and big"
- **Received later:** it is the Goals tab card "At the start of a month, offer to add last month's leftover to a goal".
  - The title is about 20px bold over two lines, it uses a bare square tick box, and the card is as heavy as a goal.
- **Plan:** a plain settings row in the style of the other switches.
  - A normal-weight label, e.g. "Offer last month's leftover to a goal".
  - One short grey line under it.
  - A switch on the right.
  - About half the current height.
  - The same meaning, key and behaviour.
- **Also seen in the same screenshot:** the round + button covers the "Save" button of "Monthly savings floor".
  - Plan: page bottom padding so the last button can scroll clear of the + button.
  - Check every tab for the same overlap.
