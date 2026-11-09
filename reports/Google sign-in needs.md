# Google sign-in and Drive backup: what I need from the owner

Written 10 Nov 2026. Nothing is built.

## 1. Decisions (a yes or no each)
1. Is it OK that the Privacy screen changes from "no account" to "optional Google backup, off by default"? (Recommended: yes.)
2. Backup file encrypted with a password the owner's users choose, and no recovery if forgotten? (Recommended: yes, with a clear warning.)
3. Automatic backup when the app opens, at most once a day? Or manual only at first? (Recommended: manual plus automatic daily.)

## 2. Things only the owner can do (about 30 to 45 minutes, free)
Claude cannot create accounts or enter credentials. When the owner says go, Claude writes click-by-click steps for:
1. Create a free Google Cloud project with the owner's Google account.
2. Turn on the Google Drive API.
3. Set up the OAuth consent screen: app name, support email, a privacy policy web address (Claude writes the page text; it can live on the existing website), scope drive.appdata only.
4. Create an Android OAuth client: needs the package name of the APK and the SHA-1 fingerprint of the key the APK is signed with.
5. Add the owner's own Google account (and any tester) as a test user.
6. Send Claude the Android client ID (a public identifier, not a secret). Never send passwords or secret keys in chat.

## 3. Information Claude needs
- The Android app's package name and the signing key: the repository of the Android shell, plus whether the APK is signed with a debug key or a release key. A debug key and a release key have different SHA-1 fingerprints, so the one used for the phone test must be registered. If the owner will publish later, a second client for the release key is added then.
- Permission to build one test APK for the Poco F6 once the feature is ready (Claude never builds an APK unasked).
- A test Google account to use for trying it. The owner's own is fine; a spare one is safer.

## 4. Things the owner should know and accept
- While the Google app is in testing mode, only listed test users can sign in and the sign-in may expire about every 7 days. Letting everyone in needs the consent screen to be published, which is a Google review step.
- Verified on the phone only: sign-in, upload and restore cannot be proven in the web preview. Until the owner tests on the Poco F6, the status stays IMPLEMENTED BUT UNVERIFIED.
- Phone makers such as Xiaomi can block background work, so automatic backup runs when the app opens, not while it is closed.

## 5. What Claude does on its side
Encrypted backup format reuse, Drive upload and download with error handling (offline, token expired, no space), restore through the existing safe import preview, tests for every failure path, privacy text and az/ru/en wording, and the plain-language "how it works" for this feature.
