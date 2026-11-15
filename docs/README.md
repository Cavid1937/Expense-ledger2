# Documents index

Checked 2026-11-15 at commit 86b0dc2 (release 92). Nothing was moved or deleted when this index was written. Files
keep their original paths, so old links still work.

## Start here

| Document | Use it for |
|---|---|
| [../README.md](../README.md) | What the app is, how to build and test it, project map. |
| [../PHASE_CHECKPOINT.md](../PHASE_CHECKPOINT.md) | Session-by-session log, newest first. The source of truth for "where are we". |
| [../tests/README-TESTS.md](../tests/README-TESTS.md) | How the tests work, the exact commands and their expected exit codes. |
| [AUDIT_FOLLOWUP_2026-11-15.md](AUDIT_FOLLOWUP_2026-11-15.md) | Production-readiness audit (corrected), repository layout plan, release gates. |

## Current reference (describes the app as it is now)

| Document | Topic |
|---|---|
| [../handoff/plain-story.md](../handoff/plain-story.md) | Wording standard for az/ru/en text. |
| [../handoff/BANK_FORMATS.md](../handoff/BANK_FORMATS.md) | Bank statement and notification layouts the importers read. |
| [../handoff/NATIVE_REVIEW_2026-11-15.md](../handoff/NATIVE_REVIEW_2026-11-15.md) | Android (Capacitor) features review. |
| [../handoff/DESIGN_REVIEW_2026-11-15.md](../handoff/DESIGN_REVIEW_2026-11-15.md) | Latest design review. |
| [../handoff/OWNER_QUEUE_2026-11-15.md](../handoff/OWNER_QUEUE_2026-11-15.md) | Owner's current request list. |
| [../handoff/GOOGLE_CLOUD_SETUP_2026-11-13.md](../handoff/GOOGLE_CLOUD_SETUP_2026-11-13.md) | Google sign-in and Drive setup (no secrets inside). |
| [../handoff/AUTONOMOUS_CHARTER.md](../handoff/AUTONOMOUS_CHARTER.md) | Rules for unattended work sessions. |
| [../apple-design/SKILL.md](../apple-design/SKILL.md) | Design principles reference. |
| [../public/privacy.html](../public/privacy.html) | The privacy page users see. |

## Plans and research (useful, but may be out of date)

| Document | Note |
|---|---|
| [../handoff/NEXT_WORK_PLAN.md](../handoff/NEXT_WORK_PLAN.md) | Older plan; check against PHASE_CHECKPOINT before using it. |
| [../handoff/FINANCIAL_INTELLIGENCE_PROMPT.md](../handoff/FINANCIAL_INTELLIGENCE_PROMPT.md) | AI assistant idea; nothing built. |
| [../research_notes/](../research_notes/) | Desk research (competitors, bank formats, feature ideas). |
| [../reports/](../reports/) | Run reports and research summaries. |

## History and provenance (keep, do not edit)

| Path | What it holds | Why it stays |
|---|---|---|
| `handoff/run-*`, `handoff/run9/`, `handoff/redesign/` | Past run reports, diffs, screenshots. | Shows what was changed and why. |
| `handoff/snapshots/` | Copies of the app at earlier releases. | Lets a release be compared or rebuilt. |
| `handoff/review-package-2026-11-13/`, `handoff/android-emulator-20261029/` | Review bundles and emulator evidence. | Evidence behind earlier reports. |
| `tests/evidence/` | Logs and screenshots from past test runs. | Proof that tests ran. Some files are rewritten each time the browser tests run. |
| `tests/original/` | The first supplied test files. | Provenance; not run. |
| `tests/.out/` | Generated scratch output from early runs. | Tracked by mistake but kept until reviewed (see the audit, item R2). |
| `archive/unused-root-files-2026-10-31/` | Root files that were found to be unused on 31 Oct. | Kept in case one is needed for recovery. |

Some history files have spaces or dashes in their names, for example
[the Run 1 report](<../handoff/run-1/Claude Implementation Report — 2026-10-26 — Run 1.md>).

## Not in git (local only)

The terms-of-use draft (`handoff/TERMS_OF_USE_DRAFT_EXPENSE_LEDGER_2026-11-01.md`), the APK files, the review zip
and `design-refs/` exist only on the owner's computer. They are not lost, but they are not backed up by git either.
