# Android identity: current state and future rebranding inventory (Run 108, 18 Nov 2026)

**Owner decision 18 Nov: the Android identity is DEFERRED.** The earlier proposal `com.expenseledger.app` is **withdrawn and not approved**.
Nothing was renamed, registered or changed for this document. The name, logo, icon, splash screen and branding are unchanged. The only work
was reading files in `Expense-ledger2-capacitor` (HEAD 50c814c) and `Expense-ledger2-fixes`.

## 1. Current identity (as found)

| Item | Value | Where |
|---|---|---|
| applicationId | `com.example.expenseledger.spike` | `android/app/build.gradle:7` |
| namespace (Java package) | `com.example.expenseledger.spike` | `build.gradle:4`, 18 files under `java/com/example/expenseledger/spike/` |
| Capacitor appId / appName | `com.example.expenseledger.spike` / "Expense Ledger" | `capacitor.config.json` |
| Display name | "Expense Ledger" (`app_name`, `title_activity_main`, `widget_title`) | `res/values/strings.xml` |
| Other strings that repeat the id | `package_name`, `custom_url_scheme` | `strings.xml:5,12` (Capacitor template; the custom scheme is not used by the app) |
| Version | versionCode / versionName 96 | `build.gradle:11-12` |
| Web content | bundled `dist/` (no `server.url`); WebView origin is Capacitor's default `https://localhost` | `capacitor.config.json` |
| Entry points in the manifest | launcher; Share > text/plain (`SEND`); 2 long-press shortcuts; 5 widgets; the notification listener service; FileProvider `${applicationId}.fileprovider` | `AndroidManifest.xml` |
| Deep links / App Links | **None.** No `VIEW` intent filter, no `assetlinks.json`. | manifest |
| Permissions | INTERNET, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM; the listener is bound with BIND_NOTIFICATION_LISTENER_SERVICE | manifest |
| Android backup | only `app_webview/Default/Local Storage` (where `expense_ledger_v5` lives); cloud backup off without a screen lock; the install id (`ledger_install`) is deliberately left out | `res/xml/data_extraction_rules.xml`, `backup_rules.xml` |
| Notification channels | `payments_found_2` (Run 108), reminders from the LocalNotifications plugin | `BankNotificationListener.java` |
| Icons / splash | `mipmap-*` (launcher + round + adaptive v26), `drawable-port/land-*` (splash), `ic_stat_ledger`, sound `ledger_chime` | `res/` |
| Signing | **Debug key only** (`%USERPROFILE%\.android\debug.keystore`, SHA-1 `01:28:46:…:5A:C0`). `build.gradle` has no release `signingConfig`, and no release keystore exists on this PC. | `build.gradle`, `handoff/GOOGLE_CLOUD_SETUP_2026-11-13.md` |

### Google sign-in and Drive (OAuth)

| Item | Value |
|---|---|
| Web client | `33586491529-9qo7…3oi` (in `account.js:11`); authorised JavaScript origins `https://expense-ledger2.vercel.app` and `http://localhost:5173`. The web uses Google Identity Services with **no redirect URI**. |
| Android client | `33586491529-jcnm…2mkj`, bound to **package `com.example.expenseledger.spike` plus the debug SHA-1**. Android uses Credential Manager / AuthorizationClient, which has **no redirect URI**; Google checks the package name and signing certificate. |
| Scope | `drive.appdata` (non-sensitive) |
| Supabase | Google provider; it accepts ID tokens issued to the web client. The Android sign-in requests a token for that same web client (`WEB_CLIENT_ID` in `GoogleDrivePlugin.java:92`, which repeats `account.js:11`). |

## 2. What a future rebrand would touch

Do this only after the owner approves a final name. Go top to bottom; each line says what breaks if it is missed.

1. **Data carry-over (the biggest risk).** A new applicationId is a *different app* to Android. It gets a new empty data folder, so the
   ledger in `expense_ledger_v5` does **not** move over by itself. Existing testers must export a backup or use the Drive backup in the old
   app, install the new app, then restore. "Restore from Drive before creating an empty ledger" already exists and must be tested on the
   new id. Decide this **before** Google Play: once a Play listing exists, its applicationId can never change.
2. applicationId and namespace in `build.gradle`, plus moving the 18 Java files to the new package folder and changing their `package` lines.
3. `capacitor.config.json` appId / appName, then `npx cap sync`.
4. `strings.xml`: `app_name`, `title_activity_main`, `widget_title`, `package_name`, `custom_url_scheme`, and widget and notice names if the brand
   word appears in them. The az/ru labels shown inside the web app live in the web code, not here.
5. Icons and splash: every `mipmap-*` and `drawable-*` splash file, `ic_stat_ledger`, and the adaptive icon background colour.
6. Google OAuth: a new Android client for (new package + **release** SHA-1), and a second one for the Play App Signing SHA-1 if Play
   signs the app. Keep the old client until no tester uses the old app. The web origins change only if the website domain changes.
7. Supabase: no change for a package rename. If the domain changes, update Site URL / Redirect URLs.
8. Website and PWA: `public/manifest.webmanifest` name / short_name / icons, `index.html` title, `privacy.html`, and the Vercel domain if
   renamed (that also changes the browser origin, so web users' local data would not follow; plan an export/import step).
9. Backup and sync identifiers: **keep** `expense_ledger_v5` and the backup file format exactly. The Drive file lives in the user's
   `appDataFolder` for the *OAuth client's project*, so it survives a package rename only if the same Google Cloud project is used.
10. Notification access: Android grants it per app, so users must allow it again in the new app. Reminders must be switched on again.
11. Store and signing: create a release keystore, store two copies off this PC (losing it means the app can never be updated), enrol in
    Play App Signing, and complete the Data safety form (notification access needs a declaration).
12. Tests and docs: `tests/` strings that mention the id (search for `expenseledger.spike`), `handoff/GOOGLE_CLOUD_SETUP_2026-11-13.md`,
    `docs/`, and the APK build notes.

## 3. Status

- Current identity documented: **VERIFIED** (read from files; nothing changed).
- Final identity: **DEFERRED WITH REASON** (owner decision 18 Nov; `com.expenseledger.app` withdrawn).
- Release signing: **NEEDS WORK** before any store release (no release key exists). This is an owner decision, since it creates a long-lived secret.
