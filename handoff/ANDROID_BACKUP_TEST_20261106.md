# Android automatic backup — real test result (6 Nov 2026)

Test only. The app, its manifest and the repo were not changed. Synthetic data only; the owner's phone was not touched.

## Setup (what was actually run)
- Throw-away Android 16 (API 36, Google APIs, x86_64) emulator, created outside the repo in `C:\ExpenseLedgerBuild\avd` (AVD `elbackup`), hardware-accelerated.
- App: `handoff/apk-20261105/ExpenseLedger-debug-v2.apk` (SHA-256 `9B9BA84B…6D463`, the version you use). On-device package flags confirmed `ALLOW_BACKUP`; `versionName 1.0`, `targetSdk 36`.
- Backup transport: Android's built-in **local test transport** (`com.android.localtransport`), driven with Android's own `bmgr` tool. This exercises the same on-device Auto Backup mechanism that sends data to Google Drive on a real phone; it does **not** exercise the Google Drive upload, encryption or the scheduling Google adds.
- Test data: two synthetic entries (`BACKUPTEST-A` 12.34 expense, `BACKUPTEST-B` 100 income) plus a marker value, written into the app's real storage key `expense_ledger_v5` through the WebView debug connection.

## Results
| Step | Outcome | Evidence |
|---|---|---|
| 1. Backup of the app | **Succeeded**; about **8.6 MB** was captured | `bmgr backupnow`: "result: Success", progress counter to 8,598,528 bytes |
| 2. Uninstall → plain reinstall (`adb install`, no manual restore) | **The ledger came back automatically**: 2 entries, both test merchants and the marker value | read back from the app: `tx 2`, `BACKUPTEST-A/B`, marker identical |
| 3. Add a third entry **after** the backup, confirm it is on disk, uninstall → reinstall | **The third entry was silently lost.** The app returned with the older 2-entry copy and showed no message about it | `BACKUPTEST-C` found on disk before uninstall; after reinstall `tx 2` |
| 4. A backup run while the app was in the "force-stopped" state | **Refused**: "Backup is not allowed" | first attempt; a later run with the app started succeeded |

## What this means (confirmed unless marked)
1. **Confirmed:** with the current manifest (`allowBackup="true"`, no rules), the **whole ledger, and by extension the PIN-lock record and settings that live in the same storage, is included in Android's automatic backup and restored on reinstall.** On a real phone that copy goes to the user's Google account (Android documents end-to-end encryption on Android 9+ with a screen lock, up to 25 MB, roughly daily; those parts were **not** tested here).
2. **Confirmed (benefit):** a lost or replaced phone, or an uninstall/reinstall, can bring the ledger back with no action from the user. That is a genuine safety net, and it was working before anyone decided it should.
3. **Confirmed (risk):** the restored copy can be **older than the data the user had**, and the app does not say so. A user could unknowingly continue from a day-old ledger and enter duplicates or miss entries. The app currently has no "this ledger was restored on <date>" notice.
4. **Confirmed (size):** the backup captured about 8.6 MB for a nearly empty ledger, because Android also copies the browser engine's own files (caches and settings) that live in the app's data folder. The 25 MB limit is therefore not as roomy as it looks, which matters before any receipt-photo feature.
5. **Contradiction with current wording (confirmed):** the in-app notice says the data "stays on this phone" and "nobody else keeps a copy". With automatic backup on, a copy can be kept in the user's Google account. The wording and the behaviour disagree. (Android says a user can switch Google backup off; many leave it on.)
6. **Not tested / unverified:** the real Google Drive path, end-to-end encryption, behaviour with a very large ledger, phone-to-phone transfer, restore onto an older/newer app version, and what happens with the PIN lock after a restore on a new device.

## Decision for you (D2 in the decision list)
| Option | Effect | My view |
|---|---|---|
| A. Keep backup on, change nothing | Users keep the safety net; stale-restore risk and wording mismatch remain | Not acceptable as-is |
| B. Keep it on **deliberately**: add data-extraction rules (cloud backup only when encrypted; allow device transfer), show a one-time "Restored from a backup made on <date> — N entries" notice with a prompt to check recent entries, and rewrite the privacy sentence | Safety net kept, risk disclosed, matches behaviour | **Recommended** |
| C. Turn it off (`allowBackup="false"`) | Matches the current sentence; **removes the safety net**; manual JSON backups become the only protection; on Android 12+ some phones may still transfer data device-to-device | Only if you value "nothing leaves the phone" over recovery |

Nothing is changed until you choose. B needs a small app change (rules file + restore notice + copy in three languages), covered by a regression test; I can do B in the next run after your decision.

## Update — Option B implemented (6 Nov 2026, later the same day) — IMPLEMENTED BUT UNVERIFIED on a real phone
Chosen by the owner's "continue on your choices". **Uncommitted. No new APK was built or delivered** (owner uses v2 and said not to build yet).

What changed
- Capacitor repo (separate git repo `Expense-ledger2-capacitor`, uncommitted): `AndroidManifest.xml` points to `res/xml/data_extraction_rules.xml` (Android 12+) and `res/xml/backup_rules.xml` (Android 6–11). Only `app_webview/Default/Local Storage` is backed up (ledger, PIN record, settings); caches and other engine files are excluded. Cloud backup is switched off when the phone cannot encrypt it end to end (`disableIfNoEncryptionCapabilities`); phone-to-phone transfer stays on.
- `InstallIdPlugin.java` + `MainActivity.java` + `native-share.js`: a per-install id kept in SharedPreferences (deliberately NOT backed up).
- App (`App.jsx`): `restoreCheck` compares that id with the id stored in the ledger storage (which IS backed up). A mismatch = the data came from a backup/transfer, so a one-time notice asks the user to check recent entries.
- `i18n.js` / `screens/settings.jsx`: in the Android app only (`tShell`), the safety/privacy texts no longer say "nobody else keeps a copy"; they explain the Google backup and how to delete it. The website keeps its original wording.

Tests actually run (this tree)
- Logic suite `node tests/run-logic.mjs`: 57 files, 1,211 checks passed, 0 failed, 0 missing.
- Browser: `e2e_run16_info` 15, `e2e_run29_restored` 19, `e2e_run29_shellwording` 12, `e2e_run29_addsheet` 9, `e2e_run29_select` 13, `e2e_lang` 57, `e2e_run26_walk` 137, `e2e_run18_fab` 5 — all passed.
- Emulator (Android 16): narrowed rules produced a ~13 KB backup (was ~8.6 MB); after uninstall/reinstall the ledger returned and the restore notice appeared. This was done with a scratch build WITHOUT `disableIfNoEncryptionCapabilities`, because Android's local test transport is not encrypted and rejects it.

Not verified
- The real Google Drive path, including the `disableIfNoEncryptionCapabilities` attribute (cannot be tested without a real Google account/phone).
- Backups made before this feature exist (e.g. by v2) carry no install id, so a restore from one shows no notice.
- Azerbaijani and Russian wording has not been reviewed by a native speaker.
- The full browser suite and the clean-room gate have not been run on this tree; nothing is committed.

## Housekeeping
- Emulator and adb server shut down after the test. The virtual phone files remain in `C:\ExpenseLedgerBuild\avd` and can be deleted at any time.
- Scripts used are in the session scratchpad (`wv.mjs`, `addC.mjs`); the repo is untouched by this test.
- Method note: a first attempt appeared to show the restore failing; that was a flaw in my checking (the data is stored as 16-bit text and my first search looked for 8-bit text, and a force-stopped app is skipped by Android). The numbers above are from the corrected run.
