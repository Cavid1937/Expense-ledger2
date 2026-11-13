# Runs 66–69 report: reminder switch, bank tables, pasted notifications, "Help improve the app" (13 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`.

| Commit | Content |
|---|---|
| 572db2a | Run 66 |
| 1a6ef8a | Run 67 |
| 90c874e | Run 68 |
| a326344 | Run 69 |
| 06c6fa1 | Quality sweep |

These are the last items on the "doable without you" list before publishing and the new APK, as you asked: "You will publish everything to live site and create new APK once everything is finished".

## What changed

### Run 66: one main switch for reminders (Settings)
- **New main switch:** "Reminders from this app". It turns every reminder off or on at once.
  - It is on by default, so nobody's existing reminders stop after the update.
  - When it is off, the individual choices are hidden and the card says in words that no reminders will arrive.
  - Turning it back on restores the earlier choices.
- **Permission line:** the card shows whether the phone allows notifications from the app, or tells you to allow them in the phone's settings.
  - This line is only in the Android app.
  - It needed a small addition to the Android shell (`permissionState`), which will be in the new APK.

### Run 67: bank tables (CSV) from any bank
- **Known bank layout:** a bank CSV now goes through the same reader as bank statements. You get the same review screen, the same balance check, and the same rule that something already added is never added again.
- **Unknown layout, "Match the columns":** when the app cannot work out a table, it shows the first rows and asks which column is the date, the description and the money.
  - It asks how money is written: one column with a minus for spending, two columns (out and in), or "every row is spending".
  - Nothing is added until you confirm on the next screen.

### Run 68: pasted bank notifications
- **What you can paste:** you can copy one or many push messages into the Import box.
  - Supported layouts: ABB, Leobank, Birbank and Google Wallet. The tests use only the layout of the real samples, with invented places and amounts.
- **Repeated messages:** when the bank and the wallet both report the same payment, it becomes one entry.
- **In or out:** whether money went in or out is worked out from the running balance. When it cannot be proven, the review asks you instead of guessing.
- **Not kept:** card digits and the bank's balance.

### Run 69: "Help improve the app" (More → Settings)
You said to add it only if the app stays free, and it does: the free Supabase plan, $0 a month.

- **Off unless you turn it on.**
- **When on:** at most once a day, and only with a connection, the app adds three kinds of rows to its own Supabase project:
  - names of shops and places you used at least twice, with the category you chose. This is how category suggestions can improve for everyone.
  - crash messages, with quoted text and long numbers removed.
  - one line per day: language, app version, and web or Android.
- **Never sent:**
  - amounts, dates, notes or balances;
  - people's names, card numbers or account numbers;
  - gift, family, debt or income entries;
  - anything that identifies you or the phone.
- **Cleaning on the phone:** names are cleaned before anything leaves. Anything that looks like a person's name, a phone number, a card number, an e-mail, an address or a money transfer is dropped, in az, ru and en.
- **"Show what would be shared":** this button lists exactly what this phone would send today, before you switch anything on.
- **Add-only key:** the public key can only add rows. It cannot read, change or delete them; I tested this when setting up the project.
- **Pausing:** the free plan pauses the project after a quiet week. Then sending simply fails silently and the app is not affected.
- **Privacy page:** updated in all three languages to describe this switch. Before, it said nothing is ever sent.

### Quality sweep (06c6fa1)
- I checked the new screens at the narrowest phone width (320px) in az and ru:
  - the column matcher;
  - the reminders card;
  - the new sharing card.
- Nothing overflowed the screen.
- I made one fix: the matcher's three "how is money written" choices had rows about 20px tall, too small for a finger. They are now 40px with bigger circles.
- I also corrected one awkward az sentence: "Siz yandırmasanız, sönülüdür" became "Siz yandırana qədər sönülüdür".

## Mistakes and finds along the way
- **Run 69 filter bug:** the first version of the cleaning filter missed address and transfer words written in Azerbaijani or Russian letters, such as "küç.", "Köçürmə" and "Перевод". JavaScript's plain word-boundary rule only knows English letters. The new test caught it before anything was committed, and the filter now handles all three alphabets.
- **Network guard test:** the existing test that keeps "your data never leaves the phone" true (run50net) failed as designed when the Supabase address appeared. I did not weaken it:
  - it now allows that one exact address only;
  - it adds checks that sending stays behind your switch, that a damaged setting counts as off, and that the Privacy page names the switch in all three languages.

## Tests actually run
- **Logic tests:** `node tests\run-logic.mjs` ran 113 files: 2,248 checks passed, 0 failed.
  - New: run69learn, 25 checks.
  - run50net went from 9 to 13 checks.
- **Single browser tests (new or touched):**

  | Test | Result |
  |---|---|
  | e2e_run69_learn | 9/9 |
  | e2e_run50net | 4/4 |
  | e2e_ux_lang | 8/8 |
  | e2e_run66_notif | 8/8 |
  | e2e_run67_map | 11/11 |

- **e2e_run69_learn proves three things:**
  - with the switch off, no request reaches the sharing project, even after a reload;
  - when on, the request bodies hold the place name but no amount, note, date or gift place;
  - nothing is sent twice in one day.
- **Build:** `vite build` passed.
- **Full browser suite:** GATE_RESULT_PLACEHOLDER

## Status
- Run 66 reminder switch: **IMPLEMENTED BUT UNVERIFIED** on a real phone. The browser test uses a stand-in for the Android shell, and the permission line needs the new APK.
- Run 67 bank tables: **VERIFIED** with synthetic files. Not yet tried with a real bank CSV.
- Run 68 pasted notifications: **VERIFIED** with synthetic texts in the real layouts. Not yet tried on your phone.
- Run 69 sharing: **VERIFIED** in tests, including the real server's add-only rule. Whether category suggestions actually improve depends on future work that reads the shared rows; that part is **DEFERRED WITH REASON**: there is no data yet.
- az/ru texts for these runs: **NEEDS WORK**, waiting for the native-speaker review, as before.

## Still waiting on you
- **Themes:** your palettes.
- **Google Drive backup:** blocked by Google's $30 screen.
- **Translations:** a native speaker's review of the translation package.
- **Sync rule:** the "newer edit wins" sync rule, to decide together.
