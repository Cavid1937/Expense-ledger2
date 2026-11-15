# Ultimate Expense ledger

Expense Ledger is a personal money app: entries, accounts, budgets, goals, recurring payments, debts and loans,
bank-statement import and backups. It is a React + Vite web app (PWA) in Azerbaijani, Russian and English. It keeps
the ledger on the device. Sign-in and cloud copies are optional. There is also an Android shell built with Capacitor,
which lives in a separate local repository (`Expense-ledger2-capacitor`) and is not part of this one.

> **Do not rename the storage key.** The ledger is saved in the browser under the localStorage key
> `expense_ledger_v5`, and related keys start with `expense_ledger_v5__`. Every existing user's data depends on it.

## Quick start

Needs Node.js 24 (tested with 24.22.1) and npm.

```bash
npm install
npm run dev
npm run build
npm run preview
```

- `npm run dev` starts a local development server and keeps running until you stop it.
- `npm run build` writes the production build to `dist/`. Vercel runs the same build.
- `npm run preview` serves `dist/` locally.

There is no `package-lock.json` in git yet (see "Known gaps" below), so `npm install` can pick newer minor versions
than the ones last tested.

## Tests

The tests are in git under `tests/`. The full guide is [tests/README-TESTS.md](tests/README-TESTS.md).

```bash
node tests/run-logic.mjs
```

```bash
npm install --no-save puppeteer-core @fontsource/playfair-display @fontsource/dm-sans
```

```bash
node tests/run-browser.mjs
```

```bash
node tests/pwa/offline-check.mjs
```

- `run-logic.mjs` runs the logic suites in Node.
- `run-browser.mjs` runs the browser suites in headless Chrome. It needs the three extra packages above and Google Chrome.
  It takes a long time (more than an hour for every file).
- `tests/pwa/offline-check.mjs` builds the app into a temporary folder and checks that it opens offline. It is the check
  run before every release.

## Project map

| Path | What it is |
|---|---|
| `App.jsx` | Main app: data model, money rules, storage, import/export, and the app shell. Most logic lives here. |
| `screens/` | One file per screen or sheet (home, ledger, add, goals, debts, settings, …). |
| `i18n.js` | All az/ru/en text. |
| `styles.js` | Themes and shared styles. |
| `statement.js`, `pdfText.js`, `xlsxWrite.js` | Bank statement reading (PDF/Excel/CSV) and Excel export. |
| `account.js`, `drive.js`, `notify.js` | Optional sign-in, Google Drive copy, and notification helpers. |
| `syncMerge.js` | Merge rules for multi-device copies. Not used by the app yet (only tests import it). |
| `main.jsx`, `index.html`, `public/` | Entry point, service worker (`public/sw.js`), manifest, icons, privacy page. |
| `tests/` | Logic and browser tests, runners, and past test evidence. |
| `PHASE_CHECKPOINT.md` | Running log of every work session, newest first. Read it before starting new work. |
| `handoff/`, `reports/`, `research_notes/`, `archive/` | Reports, reviews, plans and snapshots. Mostly history. See [docs/README.md](docs/README.md). |

## Current documents vs history

[docs/README.md](docs/README.md) lists which documents describe the app as it is now and which are kept only as
history. Do not delete or move historical files without checking that list first.

## Known gaps (2026-11-15)

- No `package-lock.json`, CI workflow or `vercel.json` in git. Builds are not pinned.
- `package.json` has only `dev`, `build` and `preview` scripts. Tests are run with `node` directly.
- `App.jsx` (about 6,100 lines) and the screens import each other. See
  [docs/AUDIT_FOLLOWUP_2026-11-15.md](docs/AUDIT_FOLLOWUP_2026-11-15.md) for the planned, step-by-step split.
