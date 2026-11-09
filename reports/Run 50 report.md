# Run 50 report (9 Nov 2026)

Scope: the 15-item add list (reports/Run 45 what we can add.md). Owner said: do everything possible without them, ask nothing. Local commits only. Nothing pushed, deployed or sent as an APK.

## What was built (all in the Expense-ledger2-fixes worktree)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 5 | Month rollover offer on Home (move last month's leftover into a goal; skip) | IMPLEMENTED, tested in a real browser | run50rollover 22 checks; e2e_run50 11, e2e_run50net 4 |
| 15 | Sinking-fund hint on Goals (yearly bills, set aside per month) | IMPLEMENTED, tested | run50sinking 9; e2e_run50sinking 5 |
| 6 | Sentence entry ("coffee 4.50, taxi 8 yesterday") with a review list | IMPLEMENTED, tested | run50text 30; e2e_run50text 14 |
| 2 | Gift ledger (given / received per person), More > Gifts | IMPLEMENTED, tested | run50gifts 13; e2e_run50gifts 9 |
| 3 | Suggested recurring payments (3+ similar monthly/yearly payments) | IMPLEMENTED, tested | run50recur 20; e2e_run50recur 10 |
| 1 | "Set up in a minute" sheet (accounts, pay day, one goal) from the Home checklist | IMPLEMENTED, tested | run50setup 22; e2e_run50setup 10 |
| 7 | Sync: merge rules only (newer edit wins, deletion wins a tie, order-independent) | IMPLEMENTED BUT NOT WIRED | run50sync 15 checks (syncMerge.js) |

## What was NOT done, and why
- #7 wiring: records are not stamped with an update time, deletions are not recorded, and there is no transport (Drive/file). Without these, merge rules do nothing for the user. DEFERRED WITH REASON: needs a data-model change on `expense_ledger_v5` that deserves its own careful run.
- #4 bank notifications, #8 widgets, #13 voice, #14 receipt scan: need the Android shell and a real device. BLOCKED.
- #11 statement import: needs real statements from the owner's banks to design against. BLOCKED.
- #12 family groups: needs sync plus accounts, which do not exist. BLOCKED.

## Tests actually run
- `node tests\run-logic.mjs`: 97 files, 0 with problems, 1910 checks passed, 0 failed.
- `node tests\run-browser.mjs` (PAGE_OUT in temp): 117 files; first full run had 2 problems:
  1. e2e_run16_info expected exactly 7 rows on More; the new Gifts row makes it 8. Fixed the expected list (still an exact list, not loosened). Re-run alone: 15/15.
  2. e2e_run37_roundtrip: "one backup file was saved" failed inside the full run (download folder timing). Re-run alone: 13/13. Not reproduced; treated as a flaky download, not an app fault.
  Standby events during the run: 0.
- `npx vite build`: succeeds.
- Not re-run as one clean full pass after the two single-file reruns.

## Known weaknesses (honest list)
- Azerbaijani and Russian wording of every new string is a draft; needs a native read.
- e2e_run50gifts only checks the Add screen mentions Gifts, not that the category is preselected.
- e2e_run50net saw no network requests because the page is opened from a file; it does not prove behaviour over http.
- Goal "saved" is a typed number, not linked to accounts, so rollover and the sinking hint treat it as independent.
- The setup sheet is reachable only from the Home checklist; once the owner hides that card it cannot be reopened.
- Test runs rewrote some files under handoff/ (evidence logs); left uncommitted on purpose.

## Next action
Owner try-out on the Poco F6 of: rollover card, sentence entry, Gifts page. Then decide whether to push. After that, a dedicated run for sync wiring (stamping + tombstones + file transport).
