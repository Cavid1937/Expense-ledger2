# Release 108: physical Android verification, stabilization and release readiness (18 Nov 2026, evening)

Assignment: "EXPENSE LEDGER — ULTRA ASSIGNMENT, Release 108: Physical Android Verification". Started 19:15 Baku. Nothing was pushed, deployed,
installed or changed in production. The Supabase work was read-only.

## A. Executive summary

- **No phone was connected during this session.** `adb devices -l` returned an empty list at every check (19:16, 19:25, 19:34 and later).
  Every physical-device test is therefore **BLOCKED**: nothing was installed or opened on the phone, and no phone screenshots exist.
- Everything that does not need the phone was done:
  - Source and APK identity established. APK 108 contains the Run 108 bank-notice rule and the new notice look.
  - Its app code is the same as the live site's. The only differences are the static privacy and app-open pages and the site headers.
  - A new test checks the Android bank-notice rule straight from the Android source and compares it with the app's reader: 37/37.
  - Logic tests 2938/0. Full browser suite 186 files, 2993/0.
  - At 19:40 the phone turned out to be plugged in, but in file-transfer mode with USB debugging off. Waited for it until 20:24 (9 checks); it never appeared to ADB.
  - All of this is committed locally only; nothing was pushed (this assignment withdraws push permission).
  - Supabase proposals completed: S1 test, S2, a new S3 flood-cap SQL with test and rollback, and S6 facts.
  - Release-signing plan written.
- Release readiness is unchanged: the app is **not** release-ready. A phone test, real Google sign-in, Drive restore, real bank notices and a release key
  are all still missing.

## B. Source identity (all values checked in this session)

| Item | Exact verified value |
|---|---|
| Main repository branch | `fix/financial-correctness-2026-10-26` (worktree `Expense-ledger2-fixes`) |
| Main repository HEAD | `c4f7abf` = `origin/main` (docs-only commit). Working tree: 65 changed/untracked files. They are old test-evidence screenshots, logs and handoff notes; no source code. |
| Capacitor repository | branch `claude/capacitor-spike`, HEAD `8a4c565` (clean, not pushed) |
| Production deployment | GitHub deployments API, environment Production: `c4f7abf`, 18 Nov 14:43 UTC, state `success` |
| Live app release | live bundle `/assets/index-CW6brY2q.js` contains `"108 (2026-11-18)"` |
| App code live vs APK web copy | `git diff abb7aba c4f7abf`, excluding tests/docs/handoff, changes only `public/app-open.html`, `public/app-open.js`, `public/privacy.css`, `public/privacy.html` and `vercel.json`. No app code differs. |
| APK file | `handoff/apk-20261118/ExpenseLedger-108.apk`, 6,429,934 bytes |
| APK SHA-256 | `7EA8E84DB7680898BA3023540DAB4B4BD944BF4E12E2D0647308A5C445D8C4C6` |
| APK package ID | `com.example.expenseledger.spike` |
| APK version | versionCode `108`, versionName `108`, minSdk 24, targetSdk 36 |
| APK signing | v2 only. `CN=Android Debug, O=Android, C=US`, cert SHA-256 `6ae866dd…0f6229`. Identical to this laptop's `~/.android/debug.keystore`. |
| APK web copy | `assets/public/assets/index-owSrxlPb.js` contains `"108 (2026-11-18)"`; built from app `abb7aba` |
| Native code in APK | `classes9.dex` contains `BankNotificationListener`, `payments_found_2` (50c814c), `kartdan karta`, `geri qaytarma` and the promo words `qazan\|получите` (f7196dc). So the Run 108 native changes **are included**. |
| Rollback point (web) | commit `75fdc8d` (release 108 checkpoint, before the CSP and app-open change) = Production deployment id `7883834853`, 18 Nov 12:54 UTC, state `success`, `expense-ledger2-957o1tx6i-cavids-projects-85ffa093.vercel.app`. Release 107 is `d955dfd`. |

Note on identifiers:
- `abb7aba`: release 108 app code.
- `eca09bf`: CSP prep and the app-open fix (headers and static pages only).
- `08153b4`: a test guard.
- `ac9f664`, `b81daf6`, `c4f7abf`: checkpoint and docs commits.
- The live site runs the `c4f7abf` deployment, which has the same app code as `abb7aba`.

## C. Laptop and device environment

- Windows 11 Home 10.0.26300, AMD64, PowerShell 5.1, Claude Code desktop with real local terminal and file access.
- ADB `1.0.41` (platform-tools 37.0.0) at `%LOCALAPPDATA%\Android\Sdk\platform-tools`, already installed. Nothing new was installed.
- Build tools 37.0.0 (aapt2, apksigner); JDK = Android Studio JBR.
- Phone: **plugged in but not reachable by ADB.** Windows sees `MTP USB Device`, `USB\VID_18D1&PID_4EE1`. That is file-transfer mode without the
  debugging interface: the ADB interface driver is installed, but its device is not present. So USB debugging is off on the phone (or the
  prompt was not accepted). The owner was told at 19:40 to turn on USB debugging and allow this computer. The owner's phone is a Poco F6
  (owner statement, 1 Nov); its model, Android version and installed app were not read.
- HyperOS note: `adb install` and simulated taps also need "Install via USB" and "USB debugging (Security settings)" in Developer options.
  If they are off, adb reports a SecurityException; that is a phone setting for the owner, not an app defect.
- Automation available: adb (`am`, `input`, `uiautomator dump`, `screencap`, `logcat`, `dumpsys`). No new framework is needed.

## D. Physical-device results

All rows: **BLOCKED** (no authorized device). Nothing was installed or run on a phone.

The script below is ready to run the moment the phone shows `device` in `adb devices -l`. Every step is read-only unless marked.

| # | Test | How | Pass when |
|---|---|---|---|
| D0 | Device facts | `getprop ro.product.model`, `ro.build.version.release`, `ro.build.version.sdk`, `wm size`, `wm density`, `df /data` | recorded. **20:50 VERIFIED:** Xiaomi POCO F6 (24069PC21G, peridot_ru), HyperOS OS3.0.305.0.WNPRUXM, Android 16 / SDK 36, arm64-v8a, adb serial REDACTED |
| D1 | Installed app identity | `pm list packages expenseledger`, `dumpsys package com.example.expenseledger.spike` (versionCode, signatures, lastUpdateTime, granted permissions) | package present; signer = debug cert above. **20:50 VERIFIED:** versionCode/Name 108, minSdk 24, targetSdk 36, v2 signature, DEBUGGABLE, installed by the Google package installer, first install 2026-11-05 23:59, last update 2026-11-18 17:13. `sha256sum` of the installed base.apk on the phone = 7ea8e84d…c8c4c6 = handoff APK 108 exactly (no split APKs). POST_NOTIFICATIONS granted. |
| D2 | Install decision | Install only if the installed signer equals the APK signer, with `adb install -r` (keeps data). Install over an older version only after the owner's OK, because the phone holds the real ledger. **Never** uninstall or `pm clear`. | owner OK, same signer. **20:50: NOT NEEDED** — the phone already runs APK 108 byte for byte; nothing installed. |
| D3 | Cold start | `am force-stop`, then `am start -W -n …/.MainActivity`; logcat filtered to `AndroidRuntime`, `chromium` and `Capacitor` | no FATAL, TotalTime recorded. **21:41 VERIFIED (owner OK "do both"):** force-stop + start: Status ok, TotalTime 482 ms. LaunchState WARM, because the bound notice reader restarts the process at once. Crash buffer empty. No app JS errors. Two harmless warnings: the Permissions-Policy feature 'usb' is unknown to this WebView; a 330 ms camera-manager monitor wait at start (Android camera service). |
| D4 | Background and return | HOME key, wait 30 s, relaunch; sync check, no duplicate | no crash; entry count unchanged. **21:44 VERIFIED:** `input keyevent` is refused by HyperOS (needs the owner-only setting "USB debugging (Security settings)", not changed). The HOME intent (`am start -c HOME`) was used instead: launcher in front for 30 s, then the app returned HOT in 89 ms, same process (pid 19256). Home figures were identical before and after. |
| D5 | Offline start | airplane mode is set by the owner, not by adb (a settings change); relaunch | app opens with data |
| D6 | Layout | `uiautomator dump` + `screencap` on the language screen only, or with Privacy mode on (amounts hidden). No real balances are stored. | no overflow; tab bar not hidden behind the system bar. **21:42 VERIFIED for Home (az, 1220x2712 @480 dpi):** no cut text, tab bar clear of the system bar. Figures re-computed by hand: can-spend = income − spent; per day = can-spend / 13 days; percent left 78 % — all consistent. **Finding L1 (low, cosmetic):** at the top of Home the floating + button covers most of the "idarə et" button in the Accounts header. Screenshots kept only in the scratchpad (real balances), not in the repo. Other screens: NOT ASSESSED (no input). |
| D7 | Back button | `input keyevent 4` on an open sheet, then on Home | sheet closes; Home asks or exits as designed. **BLOCKED:** HyperOS refuses injected key events (INJECT_EVENTS). Needs the owner to press Back by hand while logs are read, or the owner to turn on "USB debugging (Security settings)". |
| D8 | Notice reader on | `dumpsys notification` (listener bound?), `cmd notification allowed_listeners` | `BankNotificationListener` listed **only if the owner allowed it**. **20:52 VERIFIED (read-only `dumpsys notification`):** the owner had already allowed it; the listener is in the allowed list and bound (live connection). Reminder channel `reminders2` uses `ledger_chime`, light colour teal 0x4CCAC4. |
| — | **D9–D11 change the real app's state** | The phone holds the real ledger, and there is no separate test install (same package ID). A synthetic notice goes into the real app's notice queue and its "already offered" list. Removing it in the review also writes to app storage. So **D9–D11 run only with the owner's explicit OK for exactly this.** Neither the native nor the app side filters by source app, so a shell-posted notice is expected to be read. That is a hypothesis until D9 runs. | owner OK |
| D9 | Synthetic payment notice | `cmd notification post -S bigtext -t "Payment" tag "💳 Payment: -0.90 ₼ TEST Card: **0000 Balance: 1.00 ₼"` (shell-posted, synthetic) | Android treats shell notices as from package `com.android.shell`; the listener reads any package, so it should keep it. Review offers it once; first choice wins. **Do not save it** into the real ledger: choose Remove. **21:45 VERIFIED (ASCII text "Payment: -0.90 AZN TEST ONLY Card: **0000 Balance: 1.00 AZN", tag el_d9):** the reader's `kept` time moved and the bell went 1 → 2. Ledger figures were unchanged, so nothing was auto-saved. No "payments found" system notice appeared, because the app was in front. **Removal: the owner must tap Remove** (taps are refused). |
| D10 | Synthetic advert | same command with "İndi kredit! 70 000 AZN-dək kredit, onlayn əldə et" | not offered. **21:44 VERIFIED (ASCII "Indi kredit TestBank-da! 70 000 AZN-dek nagd kredit, onlayn elde et", tag el_d10):** `seen` moved (the reader got it), `kept` did not change, the review list was empty, the bell stayed 1 and no notice was posted by the app. |
| D11 | Duplicate | post D9 twice with the same tag | offered once. **21:46 VERIFIED (bell level):** reposting the same el_d9 text made the reader keep it again (`kept` moved), but the bell stayed 2, so the app de-duplicates it. **21:48 confirmed by the owner's screenshot:** one TEST Bank −0.90 row. The sheet pre-ticked "looks like an entry you already made" (an existing 0.90 entry today), which revealed **finding M1** (see checkpoint 0002m): "similar" = same day + kind + amount, and the merchant is ignored. |
| D12 | Reminder notice | an existing reminder, or none if there is no safe way without changing the ledger | icon = ledger mark, teal, channel ok |
| D13 | Real bank notice (ABB) | owner's choice only: a normal everyday payment the owner makes anyway. Never a test payment. | appears in review |

Limits:
- D9 to D11 prove the native reader and review on the phone. They do not prove that a real ABB notice reaches the reader; only D13 can.
- The earlier ABB problem can be device-side: MIUI/HyperOS "Autostart" and battery saver can stop the reader. The app already detects a stopped
  reader (Run 96 catch-up, "missed" count) and shows the one setting to change.

## E. Financial and data safety

- No data was modified anywhere: no phone, no production rows. Supabase was read only (6 SELECT queries on catalogue/size/count).
- `expense_ledger_v5` is unchanged; no code touching storage changed in this session.
- The owner's −70,000 advert entry was not touched.

## F. Tests executed (this session)

| Suite | Command | Source | Result |
|---|---|---|---|
| Native vs app notice rule (new) | `node tests/android/native-parity.mjs` | capacitor `8a4c565` BankNotificationListener.java (exact text, compiled with javac) + `notify.js` at c4f7abf | **37/37**: 12 adverts dropped by both, 24 payments kept by both, 1 balance-only notice kept by the native gate and ignored by the app (correct), never "app would read but native drops" |
| Logic | `node tests/run-logic.mjs` | c4f7abf | **157 files, 2938 passed, 0 failed** |
| Full browser (desktop Chrome, headless) | `node tests/run-browser.mjs` (19:32–20:26) | c4f7abf | **186 files, 2993 passed, 0 failed, 0 missing**; 0 power standby events |
| Android device / emulator | none | — | BLOCKED (no device; no emulator run, an emulator would not prove the physical phone) |

First run of the parity test: 1 "failure", a fixture mistake (a notice holding only a balance line and no amount paid). That is not a payment, and the
app correctly makes no entry from it. The fixture was corrected and the case kept as a "none" check.

## G. Confirmed defects

None new in this session. The app-open counting defect (found and fixed at 17:24, live) is recorded in checkpoint 0002i.

Missing coverage, not defects:
- (1) The native rule was tested on the desktop JVM, not on the phone's ART runtime. Java regex on Android is ICU-based, and `\b` and `\p{L}`
  behave the same, but this is unverified on a device.
- (2) The browser suite runs an esbuild bundle, not the Vite build (noted at 18:45).

## H. Owner decisions (plain language, with recommendation)

1. **Connect the phone** (Poco F6, USB, unlock, allow USB debugging). Without it nothing in section D can run. *Needed first.*
2. **May I install APK 108 over the app on your phone?** It keeps your data when the signer is the same (checked first), but your real ledger is
   on it. Recommendation: yes, after I read the installed version and signer, and after you make a backup from Settings → Data (export to a file).
3. **S1 + S2 SQL** (`docs/security/supabase_default_privileges.UNAPPLIED.sql`, `supabase_grants_hygiene.UNAPPLIED.sql`): no effect on users,
   closes a future hole. Each file has a written test and a rollback; **neither test has been run yet** (they need the same approval).
   Recommendation: approve both.
4. **S3 flood cap** (`docs/security/supabase_report_flood_cap.UNAPPLIED.sql`): a daily row limit per report table, from 500 to 10,000 rows. The largest real
   day so far is 21 rows. **This SQL has never been run anywhere; its syntax and behaviour are unverified.** Its built-in test (rolled back) must be run first,
   with approval, because even a rolled-back test creates a function and triggers in production for a moment. Recommendation: approve
   the test, then the cap. The stronger alternative is a separate free project for reports.
5. **S6 `screen_opens`**: see section I. Recommendation: stop sending it (it is per-screen and per-action counting, which conflicts with your
   18 Nov rule), and keep the 77 old rows until you decide to delete them.
6. **Wording Q1/Q4, Dependabot alerts, pdfjs 4, Vite 8**: unchanged; see `docs/LOCALIZATION_REVIEW_SECURITY_STRINGS_2026-11-18.md` and `docs/security/CSP_AND_DEPENDENCIES_2026-11-18.md`.

## I. S6 `screen_opens`: the facts

- **Stores:** `screen` (text ≤30, e.g. `home`, `ledger`, `do-add`), `opens` (1 to 1000), `lang`, `app_version`, `platform`, `created_at`. No ids, amounts or names.
- **Written by:**
  - `countScreen()` in `App.jsx` counts each tab change (`App.jsx:4981`) and 9 actions: `do-add`, `do-addmany`, `do-edit`, `do-split`, `do-delete`,
    `do-bill`, `do-csv`, `do-backup`, `do-import`.
  - Counts stay on the phone and are sent once a day by `sendLearning()` (`App.jsx:4649`), **only while "Help improve the app" is on**. That setting is off by default.
- **So it is screen-level and action-level usage counting**, not a general app-open count.
- **Optional:** yes, entirely opt-in.
- **Who can read it:** only the project owner, through the Supabase dashboard or the service role. `anon`/`authenticated` reading is refused (42501, verified 18 Nov).
- **If it is turned off:** nothing else changes. The approved app-open count (Vercel Analytics via `app-open.html`) and the daily-user count
  (`active_days`) are separate and keep working.
- Data: 77 rows, largest day 21 rows.

## J. Android release signing

- Confirmed: `android/app/build.gradle` has no `signingConfigs`. The only keystore on this laptop is `~/.android/debug.keystore`, the public
  debug key that Android tools create on every machine. APK 108 is signed with it.
- A debug-signed APK cannot go to Google Play. Anyone can make a debug key, so it proves nothing about who built the app.
- The package ID `com.example.expenseledger.spike` cannot be published either: Play refuses `com.example`. Changing it means a new app, and users would need to move their data
  by backup and restore. That decision is deferred (Android identity doc).
- Plan, for later and only with the owner:
  - (1) Choose the final package ID.
  - (2) Create an upload key **on the owner's computer, by the owner**, and keep it in a password manager plus one offline copy. Never in the repo, Notion or chat.
  - (3) Use Play App Signing, so Google holds the app-signing key and a lost upload key can be reset.
  - (4) Store the key path and passwords in a local file outside git (`keystore.properties` in `.gitignore`).
  - (5) Play Console account: one-time $25, an owner decision; this was earlier reported as blocked.
- No key was created in this session.

## K. Release-readiness (statuses)

| Area | Status |
|---|---|
| Physical Android verification | BLOCKED (no device connected) |
| Real Google sign-in | BLOCKED (needs the owner's sign-in) |
| Drive restore | BLOCKED (needs the owner's account and a test ledger) |
| Bank notification delivery (real bank app) | BLOCKED (needs phone + owner) |
| Bank notice rule (native code logic) | VERIFIED on desktop JVM (37/37); on-device NOT ASSESSED |
| Data protection and recovery (automated, desktop browser) | VERIFIED by suites (logic 2938/0; full browser 186 files 2993/0). On the phone: NOT ASSESSED. |
| CSP compatibility | IMPLEMENTED BUT UNVERIFIED (Report-Only; Google sign-in and WebView not checked) |
| Security remediation S1/S2/S3 | NEEDS WORK (SQL ready, awaiting approval) |
| S6 | awaiting owner decision |
| Release signing | NEEDS WORK (debug key only; plan written) |
| Localization and accessibility | IMPLEMENTED BUT UNVERIFIED (no native-speaker review; automated a11y sweep only) |

## L. Exact next action

Connect the Poco F6 by USB, unlocked, and allow USB debugging. Then I run D0–D1 (read-only) and report the installed version and signer before
any install.
