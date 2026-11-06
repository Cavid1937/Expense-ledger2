# Native (APK) features — phased plan (6 Nov 2026)

Owner instruction (6 Nov): "Let's add all these features" (the APK-only list). Status of every item: NOT STARTED (nothing built yet). No APK has been built or delivered.

## Facts found in the Capacitor repo (inspected 6 Nov)
- Separate repo `Expense-ledger2-capacitor`; it holds its OWN copy of the web code (App.jsx, i18n.js, screens/, styles.js), synced by hand from the fixes worktree. Many unrelated pending changes; builds happen outside OneDrive (`C:\ExpenseLedgerBuild\android`).
- Capacitor 8.5.3 with only Filesystem and Share plugins. Permissions: INTERNET only.
- appId is `com.example.expenseledger.spike` (placeholder). **Changing the app ID makes Android treat it as a different app: the installed copy's data would not carry over.** This must be decided (D3) BEFORE the owner relies on the APK long-term, and with a migration/export step.
- The debug signing key is also not a release key (D4): an APK signed with a different key cannot update the installed one.

## Phases (ordered by value / risk)
| Phase | Items | Notes / acceptance |
|---|---|---|
| 1 | Reminders (bill due, recurring) | Local notifications plugin, Android 13+ notification permission, exact-alarm limits, reschedule after reboot/restore. Test on emulator + Poco F6 (MIUI battery limits may delay alerts: must be checked on the real phone). |
| 1 | App shortcuts (long-press icon → add expense) | Static shortcuts; deep link to the add sheet. |
| 1 | Real file save/share | Already partly present (Filesystem, Share); add folder choice via system file picker. |
| 2 | Biometric unlock | Biometric prompt as an OPTION on top of the PIN, never a replacement; PIN stays the recovery path. Must not weaken the existing lock tests (55 browser checks). |
| 2 | Safer storage | Ask the WebView/OS for persistent storage; keep JSON backup prompts. Moving the ledger into encrypted native storage is a larger migration of `expense_ledger_v5`: needs its own risk review; NOT done by default. |
| 2 | Home-screen widget | Reads a small summary (safe-to-spend) written by the app; privacy choice: show amounts on the home screen or hide. |
| 3 | Receipt capture | Camera + on-device text recognition; extracted fields are suggestions the user must confirm (no silent entries). |
| Gated | Bank SMS reading, notification-access suggestions | Google Play restricts SMS/notification-listener permissions; sensitive and error-prone. Plan: research + a small opt-in experiment, with duplicate detection, before any promise. |
| Gated | Cross-device sync | Needs a server, accounts, privacy policy, running costs: a product decision, not an APK feature. Not started without owner approval of the model. |
| Done earlier | Automatic Google backup (Option B) | Implemented, gate71 passed, Android part uncommitted in the capacitor repo, real Google path unverified. |

## Phase 1 status (updated 6 Nov 2026, later)
| Item | Status | Evidence / limits |
|---|---|---|
| Reminders (bills on due day, recurring the day before, daily 21:00; hide-amount option; time) | IMPLEMENTED BUT UNVERIFIED on a real phone. Verified: logic 25 checks (hand-computed dates), browser 30 checks against a mock shell, emulator (Android 16): permission granted, 2 reminders scheduled, notification posted at the chosen minute | Inexact alarms on purpose (exact alarms send the user to a settings page and Google Play restricts them): a reminder can be minutes late. Reminders cover the next 30 days (daily: 14) and are rebuilt whenever the app is opened, so the app should be opened about monthly. Not tested: Poco F6 battery management, the real Android 13+ permission dialog (permission was granted by adb), device reboot, force-stop (Android deletes alarms of a force-stopped app) |
| App shortcuts (Add expense / Add income) | IMPLEMENTED; emulator-verified warm and cold start; plain launch does not open the form | If the add form is already open when a shortcut is pressed, the open form is kept (type is not switched). az/ru labels not native-reviewed |
| Real file saving with folder choice | NOT BUILT. The existing share sheet already offers "Save to Drive/Files" on Android; a dedicated folder picker is DEFERRED WITH REASON (needs its own plugin; low value over the share sheet) | |
| Native code lives in the separate capacitor repo (uncommitted) and uses @capacitor/local-notifications 8.3.1 (Gradle needed network once for the Kotlin plugin). Test APK built in C:\ExpenseLedgerBuild\apk-test\run30-test.apk: NOT delivered to the owner | | |

## Rules for every phase
Financial correctness and data safety first; each feature behind regression tests; synthetic data only; emulator tests recorded; real-phone checks are the owner's phone only when he agrees; no push/publish without "publish"; new APK only when the owner asks.

## Decisions needed (owner)
1. App ID + signing key (D3/D4) — before relying on the APK long term.
2. Whether SMS/notification reading is worth a Play-policy research spike.
3. Whether to start a sync design (server, cost, privacy).
