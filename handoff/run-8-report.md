# Claude Implementation Report — 2026-10-27 — Run 8

Owner's instruction: "Yes, start Run 8 in ChatGPT's 16:16 order (items 1–14), tests first. Keep it local; don't push or publish."
Everything below is local: **no commit, push, merge or deployment.** Production (main 86af1c1) and the preview (34f8770) are unchanged.
Run 8 code snapshot (tested): `handoff/run-8-snapshot/App.jsx` SHA-256 `328689C0…2B05BB` (+ `i18n.js`). The visual redesign (separate report) was built on top of it.

## 1. Items
| # | Item (ChatGPT 16:16) | What was wrong (evidence) | Change | Status |
|---|---|---|---|---|
| 1 | Malformed imported dates | "2026-10-01Tgarbage" was cut down to 2026-10-01 and accepted | Strict date check: a date, or a date with a valid time (hh:mm, optional seconds/ms, Z or ±hh:mm); impossible times refused | VERIFIED — run8.test §1 (failed before the fix, log 178), e2e_run8 B2 |
| 2 | Category guessed from part of a word | "Payment" became Salary (matched "pay"); "Groceries & Cafes" could match wrongly | Exact match only, after normalising case, spaces and "and"/"&"; aliases added ("groceries & cafes", "cafes"); anything else → Other, and the import sheet says how many | VERIFIED — run8.test §2, e2e_run8 B3 |
| 3 | Replace with a partly unreadable file | A backup with refused rows could replace the whole ledger with only the readable rows | Replace is offered only when every row is readable; otherwise the sheet says "Replace is not offered — N rows could not be read"; Merge stays; the settings-only button appears only if the file has settings | VERIFIED — run8.test §3, e2e_run8 B2 |
| 4 | Two different bills merge (same merchant/category/subcategory/frequency) | Confirmed: electricity 90 + water 18 → one schedule; Safe to Spend 1,982 instead of 1,892 (log 179) | **Not changed** — needs a data-model addition (`billId`); plan in `run-8-item4-migration-plan.md` | NEEDS WORK — awaiting owner/ChatGPT agreement on the plan |
| 5 | Early/late "Record payment" moves the due day | Run 6 rule treated any payment off the usual day as a deliberate change | With ≥ 3 payments, one different day does not move the due day while the two before it agree | VERIFIED — run8.test §5 (run6 test case updated to the new rule) |
| 6 | Undo lost when a second action happens | A second message replaced the open "Undo delete" | Undo messages queue: same kind replaces (deletions share one undo), a different kind waits until the open undo ends | VERIFIED — e2e_run8 B1 (5 checks) |
| 7 | Master prompt §8 recovery notices / undo after newer work | — | Already covered: e2e_import R1 (notice stays until dismissed), U1/I2 (undo refused after a newer change) — no change | VERIFIED (existing tests, passing) |
| 8 | Import test that failed once | Not reproduced: 9/10, then a loop capturing the full output of any failure ran 11/11 OK (log 181) | No change to the test's strictness; full-output capture kept | NOT ASSESSED for cause — not reproduced in 21 runs |
| 9 | Review Run 7 (merged Monthly, same-days comparison) | — | Not done in Run 8 (the redesign was prioritised); Run 7's 33 checks still pass | NOT ASSESSED |
| 10 | `isActive: null` in old data | Was refused on import / could hide the record | Treated as paused (kept, visible, reactivatable) | VERIFIED — run8.test §10 |
| 11 | Duplicate-import rules | Two entries that differed only in being recurring (or in their frequency) were counted as look-alikes on import | The look-alike fingerprint includes recurring/frequency | VERIFIED — run8.test §11 |
| 12 | PWA install check | Needs a real phone | — | BLOCKED (owner's phone) |
| 13 | Round black button (video) | Not in the app's code | — | BLOCKED (owner's phone) |
| 14 | Native Azerbaijani review; committing `tests/` | — | — | BLOCKED (native reviewer; owner approval) |

## 2. Tests actually run (Run 8 code)
| Run | Result | Log |
|---|---|---|
| run8.test.mjs before the fixes | 13 of 21 failed | 178 |
| Logic suite, Run 8 code | **504/504**, 11 files | 180 |
| e2e_run8 (new, 9 checks) | 9/9 | (console, then in 182) |
| Full browser suite, Run 8 code | **368/369** — one timing check in e2e_ux ("grabbing the sheet mid-spring", 112 → 97) failed while another Chrome test loop was running | 182 |
| e2e_ux alone on the exact same build, ×3 | 30/30, 30/30, 30/30 → load-sensitive timing check, not a Run 8 regression (Run 8 did not touch gestures) | 183 |
| e2e_import repeated with full-output capture | 11/11 (plus 9/10 earlier, the failing run printed no summary) | 181 |

Not done for Run 8 on its own: a separate clean room (the clean room was run once for Run 8 + the redesign together — see the redesign report).

## 3. Risks and open points
- Item 4 is a real, confirmed money error (Safe to Spend overstated when two bills share merchant/category/subcategory). It needs the owner's decision on the `billId` plan.
- The intermittent e2e_import failure and the load-sensitive gesture check are test-stability issues, not observed app defects.
