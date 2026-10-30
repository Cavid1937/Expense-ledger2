# Android phone-test checklist (Run 13) — for the owner, plain language

Status of everything below: **NOT ASSESSED**. Nobody (human or automated) has run this APK on a phone or emulator yet.
Use only **made-up data**. Do not put your real finances into this test version.

## What you need
- The test app file: `Expense-ledger2-capacitor\android\app\build\outputs\apk\debug\app-debug.apk` (exact size and fingerprint are in the Run 13 report).
- Your Android phone and a USB cable, with **Developer options → USB debugging** switched on, OR (simpler, no cable) copy the APK to the phone
  (e.g. by sending it to yourself) and open it; Android will ask to allow "install unknown apps" for that one app — allow it for this test only.
- If you do not want to touch the phone settings: tell Claude "download the emulator image" (about 1.5 GB from Google's own Android
  repository) and Claude will run the same steps on the computer instead. Claude has NOT done this without your yes.

## The test (about 10 minutes)
Write down for each line: OK / not OK / what you saw.
1. **Open the app.** Does it open without a blank screen? Is the language chooser shown? Choose any language.
2. **Add data.** Add 2 expenses and 1 income (any made-up amounts). Add one bill (More → Recurring → +).
3. **Close the app completely** (swipe it away) and open it again. Is everything still there?
4. **Airplane mode on**, close and reopen the app. Does it open and show your data?
5. **Back button.** Open a form, press the phone's Back button: does it close the form? On Home, press Back twice: does the app leave?
6. **Backup.** More → Import / Export → "Save a backup to Google Drive, Telegram…". Does the phone's share menu open? Pick **Gmail/Drive/Telegram/Files** and save it somewhere.
   Then find that file: is it called `ledger-backup-<date>.json`, and is it more than a few hundred bytes?
7. **Cancel.** Start the backup again and close the share menu without choosing. The app must NOT say the backup was sent.
8. **CSV.** Import / Export → Export CSV → the same share menu should open.
9. **Restore.** More → Import / Export → pick the backup file you saved → Replace. Does all your made-up data return, including the bill?
10. **Update without losing data.** (Claude will give you a second APK for this.) Install it over the first one without uninstalling. Is your data still there?

## Please tell Claude
- Any screen that looks wrong, cut off, or too small to read.
- Anything that asks for a permission (it should ask for none).
- If step 6 or 8 does nothing, or says "Couldn't save the backup".

## What a pass means (and does not)
A pass on a real phone would let Claude move "Android packaging" and "Android backup export" to VERIFIED for this phone and Android version only.
It would not prove other phones, other Android versions, or Google Play approval.
