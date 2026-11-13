# Run 74 report: optional Google Drive backup (13 Nov 2026)

Local commits:
- e680e1e in the app;
- 74112d1 in the Android shell.

Nothing is pushed. A test APK was built on this computer but not sent.

## What it does
- **Off by default.** Import / Export has a new "Google Drive backup" card. Before anything happens, it says that:
  - the app can use only its own hidden folder in your Drive and cannot see your other files;
  - the copy is not sent to us;
  - the copy is protected by your Google account, not by a password (your 10 Nov decision).
- **Connect Google Drive and back up:** Google asks you to choose an account and agree, then the first backup is saved.
  - It is one file, `expense-ledger-backup.json`, replaced each time, never a pile of copies.
  - A backup Google accepted counts as a confirmed backup, so the backup reminder is satisfied.
- **Back up now** and **Last backed up to Google Drive: date**.
- **Automatic backup:** when the app opens, at most once a day and only if something changed. It never interrupts.
  - **Android app:** this works silently once you have agreed.
  - **Website:** Google allows its window only after a tap, so automatic backup works only within the same visit; otherwise you press Back up now.
  - After 3 failed days, the card shows a warning.
- **Restore from Google Drive:** opens the same review you know from importing a file ("New, will be added: …"). Nothing changes until you confirm.
- **Disconnect:** asks first, withdraws the permission, and leaves the copy already in Drive alone.
- **Clear messages for each failure:** sign in again, no connection, Drive full, sign-in not completed, Google error. In every case, nothing in the app was changed.
- **The Privacy page in the app** (az, ru, en) now mentions the Drive backup. The public privacy page already did.

## How it is built
- **`drive.js` (new):**
  - the Drive calls: find, save (replace or create in `appDataFolder`), load;
  - a content fingerprint that ignores times, so an unchanged ledger is not uploaded again;
  - the cleaned stored choice (`expense_ledger_v5__drive`). It never stores a sign-in token and is never in backups.
- **Website sign-in:** uses Google Identity Services, loaded only after a tap. It uses the public web client ID; no client secret is used or stored anywhere.
- **Android sign-in:** `GoogleDrivePlugin.java` uses Android's own Google sign-in (Play services AuthorizationClient), because Google blocks its web sign-in inside apps.
  - The daily backup asks without showing anything; if Google needs you, it simply waits for your next tap.
  - Registered under the Android client (package + SHA-1). Library added: play-services-auth 21.2.0.
- **Network guard test (run50net):** the network list now allows only `www.googleapis.com` and `accounts.google.com` for this. It also checks that there is no client secret anywhere, and that Google's script loads only after a tap.

## Tests actually run
- **Logic:** 115 files, 2,317 passed, 0 failed.
  - New: run74drive, 17 checks, against a stand-in for Google Drive: create, replace, load, the error types, fingerprint, the daily rule, and that no token is stored.
  - run50net went from 13 to 16 checks; i18n from 83 to 84.
- **Browser:**
  - e2e_run74_drive: 12/12, new. It covers:
    - nothing contacts Google before a tap;
    - Connect saves the whole backup;
    - the "last backed up" line;
    - Restore opens the review with 1 new entry and adds nothing by itself;
    - Disconnect;
    - an expired sign-in changes nothing.
  - Also passed: e2e_run50net 4/4, e2e_run16_info 15/15, e2e_import 53/53.
- **Builds:** `vite build` OK. The Android APK compiled (gradle BUILD SUCCESSFUL); I opened it and confirmed it contains the Drive code and the native module.
- **Not run:** the full browser suite (needed before publishing).

## What is NOT verified
- **Real Google sign-in has not been tried.** The tests use a stand-in, so the first real check is you on your phone or on the website.
- **If the Android sign-in fails** with a message about the app not being registered, the SHA-1 or package in Google Cloud doesn't match the APK's key. I would check that first.
- **Release APK:** a release-signed APK will need its own Android client in Google Cloud.

## Status
| Item | Status |
|---|---|
| Drive backup logic and screen | VERIFIED with a stand-in for Google |
| Real Google sign-in, website | IMPLEMENTED BUT UNVERIFIED (needs publishing first: Google only allows the live address and localhost) |
| Real Google sign-in, Android | IMPLEMENTED BUT UNVERIFIED (needs the APK on your phone) |
| Full browser suite on Runs 70–74 | NOT RUN |
| az/ru texts | NEEDS WORK (native-speaker review) |
