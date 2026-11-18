# The 17 test types the owner listed (18 Nov 2026), mapped to real tests

Written in Run 108. Every row names test files that exist in this repository, and every one of them ran during Run 108:
- the logic suite: 157 files, 2932 passed, 0 failed (18 Nov, after the notice fix);
- the full browser gate on f793b2c: 183 files, 2974 passed, 0 failed;
- the targeted browser re-runs listed in PHASE_CHECKPOINT.md.

"Logic" means `node tests/run-logic.mjs`. "Browser" means `node tests/run-browser.mjs`, which runs the real bundled app in headless Chromium. Every file's check count is pinned in `tests/expected-counts.json`, so a test that silently stops checking fails the gate.

| # | Type | Status | Where (examples, not the full list) | What is not covered |
|---|------|--------|-------------------------------------|---------------------|
| 1 | Unit | VERIFIED | 157 logic files, e.g. `logic/finance`, `core`, `bills`, `run93money`, `run108notices` | — |
| 2 | Integration | VERIFIED | Logic files that join modules (`run51integrity`, `run50sync`, `run81account`); browser files that run whole flows in the real bundle | No test talks to the real Supabase server; it is answered from memory. |
| 3 | End-to-end | VERIFIED (web) / NOT ASSESSED (phone) | 180+ `browser/e2e_*` files, e.g. `e2e_run26_walk`, `e2e_run79_onboard`, `e2e_run105_review` | The Android APK is never driven by a test, so the phone shell, notifications, widgets and Google sign-in on a real device are checked only by the owner by hand. |
| 4 | Data integrity | VERIFIED | `run51integrity`, `run108balprop`, `run108spendprop`, `run108undoprop`, `run108accundo`, `e2e_run51_integrity`, `e2e_run108_writefail` | — |
| 5 | Security and authorization | VERIFIED (app) / NEEDS WORK (server) | `logic/security`, `e2e_run107_security`, `run32enc`, `pwa/csp-check` (14), `e2e_run101_privacy` | The server's row-level rules (A3) need the owner to read them in Supabase; the CSP is still report-only. |
| 6 | Input validation | VERIFIED | `run108fuzz`, `run108loadfuzz`, `run108csvprop`, `e2e_import` (bad CSV rows by reason), `e2e_run17_amount`, `run68paste` / `run108notices` (adverts refused) | — |
| 7 | Regression | VERIFIED | Every defect fixed since Run 1 has its own named test, and the whole set runs together with pinned counts (`count-guard.mjs`) | — |
| 8 | Backup and recovery | VERIFIED | `e2e_run37_roundtrip`, `run32enc`, `e2e_run32_restore`, `e2e_run104_restore`, `run74drive`, `e2e_run29_restored`, `e2e_run108_writefail` | A real Google Drive round trip on a phone has not been tested. |
| 9 | Concurrency | VERIFIED (two tabs) | `e2e_run108_tabs`, `e2e_run108_tabs2` (two tabs of one browser), `e2e_run108_dbltap` (double tap), `e2e_run81_account` B5 + `e2e_run108_sync` (two devices through the account) | Two real devices editing at once can't be merged automatically: there is no record of deleted entries. See the sync note in the Run 108 report. |
| 10 | Performance and load | IMPLEMENTED BUT UNVERIFIED for load | `e2e_bigtext` (very long texts), `run108loadfuzz` (large and damaged stored data), the Run 106 timing checks | No test times the app with, say, 20,000 entries on a slow phone; there are no budgets in ms for the phone. |
| 11 | Cross-browser and responsive | VERIFIED (Chromium, many widths) / NOT ASSESSED (Firefox, Safari) | `e2e_phase2_layout`, `e2e_run22_media`, `e2e_run23_ios` (iPhone sizes, emulated in Chromium), 360/390/600 px checks in several files | Only Chromium runs. Firefox and real Safari / iOS are not tested. |
| 12 | Database / data migration | VERIFIED | `logic/data`, `e2e_downgrade`, `e2e_run61_downgrade`, `run36ids`, `run108loadfuzz` (old and damaged formats load without loss) | — |
| 13 | Import / export | VERIFIED | `e2e_import` (53), `e2e_run42_io`, `run37io`, `run40import`, `run52statement`, `run64xlsx`, `run88bank`, `run91birbank`, `e2e_run24_ics` | Real bank files are covered only through invented copies of their layout. |
| 14 | Network and failure | VERIFIED | `pwa/offline-check` (21), `pwa/stalechunk-check` (4), `e2e_run81_account` B6 (offline), `run74drive` (failures), `e2e_run108_writefail` (storage refuses writes) | — |
| 15 | Accessibility | VERIFIED (automated) / NOT ASSESSED (people) | `e2e_run108_a11y`, `e2e_run15_a11y`, `e2e_run32_a11y`, `e2e_ux_keyboard`, `e2e_run108_signs` (a minus sign, not only red) | No screen-reader session with TalkBack or VoiceOver, and no test with people who use them. |
| 16 | Monkey and exploratory | VERIFIED | `e2e_run108_monkey` (random taps and typing), `run108fuzz`, plus the az walk-through screenshots in Run 108 | — |
| 17 | Financial precision and reconciliation | VERIFIED | `run108money`, `run93money`, `run42math`, `run32money`, `run108balprop` (balances add up over random lists), `run108notspent`, `run98statement` (statement totals check), `run60balance` | — |

Gaps worth closing next, most useful first:
1. A test pass on a real Android phone (APK).
2. Firefox and Safari runs.
3. A timed check with a large ledger.
4. Automatic merging between devices, which needs records of deleted entries first. The owner must decide this.

Added 18 Nov (Release 108 device pass): `node tests/android/native-parity.mjs` compiles the Android listener's payment rule from the capacitor checkout and compares it with notify.js on 37 notices. It is not part of run-logic or run-browser (it needs the capacitor folder and Android Studio's JDK), so run it by hand after any change to either rule.
