# Expense Ledger — Where data goes (Run 107, 18 Nov 2026)

Rule: the ledger lives on the phone. Anything that leaves the phone is listed here. Nothing new was added in Run 107.
If a future change adds a row to this table, the owner must approve it first (owner decision 17 Nov: no new tracking).

## On the phone (browser localStorage)

| Key | Holds | Leaves the phone? |
|---|---|---|
| `expense_ledger_v5` (permanent, never renamed) | entries, budgets, goals, bills, settings | only by the user's own choice: export, backup, Drive, account |
| `expense_ledger_v5__accounts`, `__debts`, `__cats`, `__subcats`, `__catprefs`, budget carry, goals extras | the user's accounts, debts/loans, own categories, preferences | same as above (included in backups) |
| `expense_ledger_v5__account` | the Google/Supabase sign-in session (tokens) | sent only to Supabase to read/write the user's own row; removed on sign-out |
| `expense_ledger_v5__drive` | Drive on/off and last-backup status | no |
| `expense_ledger_v5__theme`, `__fx`, lock, privacy, notices, mute lists | display and behaviour choices | no |
| `__learn`, `__count`, `__feedback` | opt-in state, the monthly random id, daily send limits | see below |
| Service worker cache `ledger-shell-v3` | the app's own code, fonts and icons — never ledger data | no |

## Leaving the phone

| Flow | When | What is sent | Where | Can the user stop it? |
|---|---|---|---|---|
| Vercel Web Analytics | live website only | page visit: path without query or hash, browser type, country; cookieless; no ledger data | Vercel (`/_vercel/insights`) | not in the app (owner may switch it off in Vercel) |
| Anonymous daily count (Run 91/92) | at most once a day, live site or Android app | date, web/android, language, version, a random id replaced every month | Supabase `active_days` (add-only) | yes: Settings > Privacy > "Count me as a user" |
| "Help improve the app" (opt-in, asked once) | at most once a day when on | usage ping, a shop/place name with the category and subcategory chosen for it (no amount, no date), crash screen + redacted message (quoted text and 4+ digit runs removed, 200 chars), screen open counts, notice layouts | Supabase `usage_pings`, `place_reports`, `crash_reports`, `screen_opens`, `notice_layouts` (add-only, nobody can read through the app) | yes: off by default until the user agrees; can be switched off |
| Report a problem | only when the user presses Send | the user's message (long digit runs removed), optional contact, optional details | Supabase `feedback_reports` (add-only), max 3 a day | yes: the user writes and sends it |
| Account copy | only when signed in | the whole ledger as one JSON row | Supabase `ledgers`, readable only by that user (RLS) | yes: sign out, or delete account |
| Google sign-in | when the user presses the Google button | Google's own sign-in flow | accounts.google.com | yes |
| Drive backup | only when switched on | the backup file | the app's hidden Drive folder (`drive.appdata`) | yes: switch off / disconnect |
| Exchange rates | when a foreign currency is used | currency codes and date only | api.frankfurter.dev | yes: do not use foreign currencies |
| Share / export / e-mail | only on the user's action | the file or text the user chose | the app the user picks | yes |

Not sent anywhere: bank notification text (read on the phone only), PDF/Excel/CSV statements (read on the phone), receipt photos (kept on the phone).

## Logs
The app keeps no server logs of its own. Supabase keeps its standard API logs (owner's project). Crash messages are redacted on the phone before sending (see above).
