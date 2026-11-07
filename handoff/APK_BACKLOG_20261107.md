# APK-level backlog (7 Nov 2026) — decided and built autonomously

Owner instruction (7 Nov): brainstorm at APK level, build it all, "decide everything yourself", then send the preview link. Nothing here was pushed; the Android code is in the separate repo `Expense-ledger2-capacitor` (local only).

## How items were chosen
Filter: (1) protects money or privacy, (2) removes daily friction on a phone, (3) can be verified on the emulator, (4) does not need Google Play-restricted permissions, a server, or the owner's samples. Evidence for need: Android-only features the owner approved on 6 Nov (NATIVE_FEATURES_PLAN_20261106.md), backlog items 8/17/28 in `reports/Expense Ledger next build backlog.md`, and standard platform documentation (BiometricPrompt, FLAG_SECURE, AppWidgetManager, ACTION_SEND). The wording of real Azerbaijani bank messages is NOT sampled yet (backlog item 25/26), so message reading is limited to the generic shapes and always asks the user to confirm.

| # | Item | Why | Risk | Decision |
|---|------|-----|------|----------|
| N1 | Commit existing native work (reminders, shortcuts, backup rules, install id) in the capacitor repo (local), sync latest web code, build a fresh debug APK, emulator smoke test | The native code was uncommitted: one disk failure from lost | Low | Build |
| N2 | Hide app in recent apps + block screenshots (FLAG_SECURE), switch in Settings, applied before the page loads | Amounts are visible in the recents picture and screenshots; a finance app should offer it | Low (only a window flag); off by default so screenshots still work for those who want them | Build |
| N3 | Fingerprint / face unlock through the phone's BiometricPrompt, as an OPTION in front of the PIN (strong biometrics only, PIN stays the fallback) | The existing web fingerprint (WebAuthn) does not work inside the Android WebView, so the app showed "not available" | Medium (lock features); PIN never replaced; a marker without the shell never unlocks | Build |
| N4 | Share > Expense Ledger: text from a bank message or note opens the add form filled in (amount with a currency, income/expense, date, merchant); never saves by itself, message text never stored | Azerbaijani banks send SMS; copying numbers by hand is the main friction | Medium (wrong guess); mitigated: needs a currency, balances skipped, "unsure" notice, user must press Save | Build (parser tested on invented messages only) |
| N5 | Home-screen widget: two quick-add buttons; optional safe-to-spend line, OFF by default and hidden in privacy mode; "Add to home screen" button inside the app | Daily friction; widgets were on the owner's wish list | Medium: the home screen is visible to others (so the amount is opt-in) | Build |
| N6 | Android Auto Backup real test with `bmgr` on the emulator | Backlog item 8: is Local Storage really restored? | Low (test only) | Run and record |
| — | Reading SMS or notifications automatically | Google Play restricts these permissions; policy review needed; errors would silently create entries | High | NOT built (DEFERRED WITH REASON); the share route above is the safe substitute |
| — | Receipt camera + text recognition | Needs on-device OCR plugin, accuracy unproven for az/ru receipts, correction UI | Medium to high | NOT built (DEFERRED WITH REASON): needs sample receipts from the owner |
| — | Cross-device sync | Needs server, accounts, privacy policy, cost: a product decision | High | NOT built (owner decision) |
| — | Exact alarms for reminders | Play restricts them; settings detour for the user | Medium | NOT built (inexact on purpose, already decided Run 30) |
| — | App ID change, release signing key, Play listing | Changing the ID orphans installed data; legal/identity inputs are the owner's | High | NOT done (owner inputs: backlog items 20, 21) |

## Status (updated at the end of the run)
See the "APK run" entry at the top of PHASE_CHECKPOINT.md for evidence and what was and was not verified.
