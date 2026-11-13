# Run 71 report: three small owner items, plus a check of the rarer screens (13 Nov 2026)

Local commits: 4a44afb, 435cc63 and cf62378, on top of Run 70. Nothing is pushed, and no APK was built ("Not yet"). Your weekly limit was at 96%, so I picked the small, already-approved items and left the big ones.

## What changed
1. **Rarer screens checked in Graphite, Ivory and Sea glass.** The screens:
   - repeating payments, debts, Import/Export and the import review;
   - app lock, the Privacy page, an entry's detail sheet, and delete with Undo.

   I took screenshots (`tests/evidence/run70-themes/rare-*`) and measured every visible text against its real background. The result: 0 below 4.5:1 and no leftover teal. This moves "rarer sheets in the new themes" from IMPLEMENTED BUT UNVERIFIED to VERIFIED.
2. **Gifts page hidden** (your item 10). The Gifts row is gone from Settings.
   - Gift entries are unchanged: they are still normal entries, found with Entries → Category → Gifts.
   - The page still exists behind a preference key. The tests switch it on, so it keeps working and can come back without rebuilding.
3. **"Not spent since you started" moved to Analytics → Trends** (item 9).
   - It no longer repeats the month's own figure; the "Monthly surplus" card on Overview shows that, by the same rule.
   - Six texts that only that line used were removed.
4. **The leftover-to-goal setting** (item 8) is now a slim row with a switch, like the other settings.
   - Shorter texts: "Offer last month's leftover to a goal" / "Keçən aydan qalanı məqsədə təklif et" / "Предлагать остаток месяца для цели".
   - Same key, same meaning.
5. **The + button over the Save button** (item 8): measured, not changed.
   - At the true bottom of the Goals and Budgets pages, nothing is under the + button at 320, 360 or 390px, because the pages already leave 148px of space.
   - The overlap in your screenshot only happens mid-scroll.
   - If you want it gone entirely, the usual fix is for the + button to hide while you scroll down. That is a behaviour change, so I'm asking first.

## Tests actually run
- **Logic:** `node tests\run-logic.mjs`: 114 files, 2,296 passed, 0 failed.
- **Browser, run one by one:**

  | Test | Result | Change |
  |---|---|---|
  | e2e_run50gifts | 10/10 | New check: no Gifts row by default |
  | e2e_run58_cats | 25/25 | |
  | e2e_run65 | 11/11 | |
  | e2e_run16_info | 15/15 | The Settings list is now 7 rows |
  | e2e_run59_leftover | 16/16 | The card is under Trends and does not repeat the month; the Overview card shows the same 100.00 surplus and 100.00 deficit; the setting is a slim switch |

  These tests open the hidden page with the key switched on: e2e_run50gifts, e2e_run58_cats and e2e_run65.
- **Rarer-screen scan** (shots_run70_rare.mjs): 3 themes × 8 screens, 0 findings.
- **Not run:** the full browser suite. This was to save your remaining weekly usage. The tests that touch these screens were run one by one. A full run is needed before publishing.

## Status
| Item | Status |
|---|---|
| Rarer sheets in the three themes | VERIFIED |
| Gifts page hidden | VERIFIED (browser) |
| "Not spent" moved to Trends | VERIFIED (browser) |
| Slim leftover setting | VERIFIED (browser and screenshots) |
| + button overlap mid-scroll | VERIFIED: Run 72 change, see below |
| Full browser suite on these commits | NOT RUN; needed before publishing |
| Everything else in the owner queue (items 1–7) | Not started |

## Run 72 (owner: "hide on scroll")
- **Already there:** the + button already slid away while scrolling down (since Run 18). It came back on the smallest nudge up, often right over the button being aimed at, which is what your screenshot showed.
- **Now:** it comes back only after a clear move up (60 px in one go) or near the top of the screen. Scrolling down still hides it at once.
- **Test:** e2e_run18_fab gained 4 checks (5 → 9) and passes 9/9. The full browser suite has still not been run since Run 70.
