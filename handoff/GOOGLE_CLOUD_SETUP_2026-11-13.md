# Google Cloud setup for the optional Google Drive backup (13 Nov 2026)

These are public identifiers, not secrets. The web client's secret is NOT stored anywhere and is not needed: the browser sign-in
(Google Identity Services token flow) does not use it. The owner was asked to replace that secret because it appeared in a screenshot.

| What | Value |
|---|---|
| Google Cloud project | "My First Project" (the owner's account) |
| Web client ID | `33586491529-9qo7b5sordf4ct8mblvi4c17vnqns3oi.apps.googleusercontent.com` |
| Web client: authorized JavaScript origins | `https://expense-ledger2.vercel.app`, `http://localhost:5173` |
| Android client ID | `33586491529-jcnmb94is9mdsgrkrgbdht42bo6i2mkj.apps.googleusercontent.com` |
| Android package | `com.example.expenseledger.spike` (placeholder; choose the final name before a public release) |
| Android SHA-1 (debug key on this PC, `%USERPROFILE%\.android\debug.keystore`) | `01:28:46:D8:32:54:77:5D:D8:B5:7E:D6:45:E9:A3:7A:BF:99:5A:C0` |
| Scope | `https://www.googleapis.com/auth/drive.appdata` (non-sensitive: no Google verification needed) |
| Branding | home page `https://expense-ledger2.vercel.app`; privacy `https://expense-ledger2.vercel.app/privacy.html` (live 13 Nov); authorized domain `expense-ledger2.vercel.app`; no logo (a logo triggers review) |
| Audience | PUBLISHED (In production) by the owner on 13 Nov: any Google account can sign in. |

A release-signed APK will have a different SHA-1; a second Android client is needed then.
Design and decisions for the feature: reports/Google sign-in needs.md (off by default, at most once a day, restore through the import preview, no password).
