# Claude Implementation Report — 2026-10-27 — Run 10 (data safety) + decisions + preview

Owner (2026-10-27 evening): "We're doing it [storage protection], but we have to find a permanent solve. I don't have any IT knowledge
so you decide the questions' answers between you. And provide me a link to preview the app."

## 1. Decisions (Claude, delegated by the owner; ChatGPT invited to challenge them)
| Question | Decision | Why |
|---|---|---|
| Bill model (two bills merging, item 4) | **Explicit bill list** — bills become their own records (name, amount, frequency, due day, category, active) next to transactions inside `expense_ledger_v5`; each payment points at its bill. Next run, tests first; old data is converted only by an explicit, reversible step shown to the user, never silently. | Fixes the merge at its root and makes "which bill did this pay?" a fact instead of a guess. The `billId` patch would keep the guessing. |
| Backup reminder | **Weekly until a backup is confirmed** (current rule), as a compact card | While data lives on one phone, it is the only safety net. |
| Storage protection | **Done** (Run 10) | Owner approved. |
| Permanent solution to data loss | **Three layers** (below). Layers 1–2 done now; layer 3 next, needs one free Google setup by the owner | Only a copy outside the phone survives a lost or reset phone. |

### The three layers
1. **Keep the data on the phone** — ask the browser to protect storage (`navigator.storage.persist()`); make the app installable and
   working offline (service worker + web manifest). Installed apps get protection more readily (Chrome) and are exempt from Safari's
   7-day clean-up (iPhone, Home Screen apps). **Done.**
2. **One tap to put a copy off the phone** — "Save a backup to Google Drive, Telegram…" sends the backup file to the phone's share menu
   (works on Android and iPhone; falls back to a download elsewhere). **Done.** Restoring = Import on any phone.
3. **Automatic copy to the user's own Google Drive** (planned): the app itself saves the backup to the user's Drive (a private app
   folder) after changes, with the user's one-time permission. No server of ours, no account of ours, no cost; the data stays the
   user's. Needs: a free Google Cloud project + OAuth client ID created in the owner's Google account (≈ 15 minutes, I will give
   exact click-by-click steps), and — before a public release — whatever review Google requires for the chosen permission (to be
   checked; the narrow "files this app created" permission is the least demanding). Optional later: encrypt the file with a
   user password. A full sync service of our own (server + accounts) is **not** recommended now: cost, security and legal duties
   (personal financial data) are high for an unvalidated product.

## 2. What changed (Run 10)
| Change | Detail |
|---|---|
| Storage protection | Asked once at start; Import / Export → **Data safety** shows On / Off / not supported in plain words, with "Ask the browser again" |
| Offline app | `public/sw.js`: caches only the app's own files (page network-first, hashed `/assets/` cache-first); never reads or stores ledger data. Registered only in the built app on https/localhost (`main.jsx`) |
| Web manifest | `public/manifest.webmanifest` (stable path, dark colours, standalone); `index.html` points to it; theme colour dark. (The old root `manifest.json` is no longer linked; left in place.) |
| Backup to the cloud | Import / Export → "Save a backup to Google Drive, Telegram…" (share menu). Cancelled → nothing recorded; shared → backup date recorded (not "confirmed": the app can't see that it arrived); no file sharing → download |
| Install | Steps for Android and iPhone; an "Install the app" button appears when the browser offers installing |

## 3. Tests actually run
| Run | Result | Log |
|---|---|---|
| `tests/logic/run10.test.mjs` (fake browser objects: every answer of persist / share) | 11/11; written after the code, so 2 broken copies were run: both caught (2 and 1 failing checks) | 206, 204 |
| `tests/browser/e2e_run10.mjs` (simulated storage manager, share menu, install event) | 16/16 (one check of my own test was wrong — returned a page element — fixed; the app was right) | 207 |
| **Real offline check** `tests/pwa/offline-check.mjs`: vite build, served on localhost, load, network off, reload | **8/8**: manifest OK; worker active; page served through it; opens offline with the saved data; data untouched; only own files cached | 205 |
| Full logic suite | **531/531** (13 files) | 206 |
| Full browser suite | **434/434** (16 files) | 207 |
| Production build | OK `index-GHsaJrEd.js` 447.60 kB; `sw.js` and `manifest.webmanifest` in the output | 208 |

## 4. Committed and pushed (owner asked for a preview link)
Commit `29bba7e` (parent 802fca4) = Runs 9 + 10: App.jsx, i18n.js, main.jsx, index.html, public/sw.js, public/manifest.webmanifest
(tested files). Pushed to `preview-run3-add-guard-future-dates`; Vercel success.
**Preview: https://expense-ledger2-ma1ury2ls-cavids-projects-85ffa093.vercel.app** (Vercel login).
**Production `main` = 86af1c1, unchanged** (live site still serves `index-BmcfsH6A.js`). `tests/` and handoff/ not committed.
Not run for Run 10: a separate clean room (Run 9's clean room passed; Run 10 was verified with full suites in the worktree + the offline check).

## 5. Open
- Phone check of the preview: install it, turn on airplane mode, open it; Import / Export → Data safety should say "On" once installed.
- Layer 3 (automatic Google Drive backup) needs the owner's Google setup — steps to follow.
- Explicit bill list: next run.
