# Run 77 — Home-screen widgets and a narrower notification reader (14 Nov 2026)

## What changed
**Five home-screen widgets (Android app only):**
| Widget | Shows | Tap opens |
|---|---|---|
| Safe to Spend | the amount you can still spend this month, days left, bar of the month used, next bill | Home |
| This month | money in, money out, and what was not spent | Home |
| Budget | % of all budgets used, spent of total, how many budgets are over | Goals (budgets) |
| Accounts | up to three accounts (cash, cards) with balances | Accounts |
| Quick actions | + Expense, + Income, Transfer, Entries | that screen / the add sheet |

- The widgets use the app's own figures (same Safe to Spend, month and budget calculations as inside the app), your chosen theme's colours and your language (az/ru/en).
- Settings → Widgets lists the five with an "Add" button each (the phone asks you to confirm placing it) and a new switch **"Hide amounts on widgets"** (shows •••• instead of numbers).
- **While an app lock is set, amounts never reach the home screen** — the widgets always show •••• while the lock is on (the lock protects the app; the home screen is outside it). Privacy mode does the same.
- Widgets are refreshed every time the app's data or theme changes.

**Notification reader narrowed:** it now only receives ordinary and silent notifications. It ignores chat messages, calls, e-mail, social, navigation and "ongoing" notifications (music, downloads). It still only keeps notices that look like bank payments, as before.

## Files
- App (fixes repo): `App.jsx` (widgetSnapshot, widget refresh, shortcut taps), `screens/settings.jsx` (widget list, hide switch), `i18n.js` (wdgx.* in 3 languages). Commits 2ba9840, a970e4b (release 77).
- Android (capacitor repo): 4 new widget classes + WidgetKit, Quick actions widget redrawn, WidgetPlugin `update`/`requestPin(kind)`, MainActivity widget taps, layouts/drawables/strings az/ru/en, manifest filter for the reader, BankNotificationListener skips. Commits f658d8e, versionCode 77.

## Tests actually run
- Logic suite: 123 files, 2,379 passed / 0 failed (new run76widgets: 10 checks — figures worked out by hand: Safe to Spend 1,600.00, 17 days left, budgets 59%, accounts 100/900, Russian plural, all amounts hidden when asked or locked).
- Browser: e2e_run76_widgets 8/8 (five Add buttons, Add asks for exactly that widget, package figures, hide switch, theme change sent at once, lock hides amounts); e2e_run33_native 33/33.
- Real build check (tests/pwa/offline-check.mjs): 17/17.
- APK 77 built: BUILD SUCCESSFUL, 6,078,846 bytes, sha256 511863CE…8076.
- Full browser suite: NOT run on this run (last full run 146 files 2,399/0/0 on Run 75 code).

## Verified / not verified
- VERIFIED: the figures, hiding and language of the widget package (logic + browser tests); Android code compiles.
- IMPLEMENTED BUT UNVERIFIED: how the widgets look and behave on a real phone; the reader filter on a real phone. **APK 77 is not installed yet — the phone was not connected by USB when the build finished.**
- Not pushed to the live site (the Settings widget section is only useful inside the Android app anyway).

## Risks
- Widget look on your launcher (HyperOS) is untested; sizes may need adjusting after you see them.
- Widgets show the figures from the last time the app was opened (they cannot calculate on their own — by design, the ledger never leaves the app).

## Next action
Connect the Poco F6 by USB → I install APK 77 (data kept) → you add the widgets: long-press the home screen → Widgets → Expense Ledger, or Settings → Widgets → Add.
