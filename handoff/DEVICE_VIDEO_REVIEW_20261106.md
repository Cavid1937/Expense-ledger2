# Review of the Poco F6 screen recording (VID_20261106_011318_156.mp4), 6 Nov 2026

No source, test, commit or deployment changed. Frames were extracted with the project's own `design-refs/claude-app-feel/frames.mjs` (Chrome decoding), into the scratchpad.

## What the video is and how I read it
- 141 s, portrait 576×1280, the installed Android app (Azerbaijani first, then English), with 250 transactions, one account ("ABB Card"), 3 templates. Touch dots are visible.
- I looked at **36 frames, one every 4 s**, plus two **0.25 s sweeps** (60–64 s: Goals → Budgets switch; 108.5–112 s: Add sheet opens and closes). **Limits:** this shows individual frames, not motion. I can see double-exposures and collisions that last several frames; I cannot judge smoothness, frame rate, or touch latency, and a 4 s sample misses anything shorter. The app version in the APK is v2/v3 (status bar already fixed).
- This is device evidence for the first time. It does **not** replace a performance trace, but it shows no freeze longer than about 0.25 s inside the two windows I swept.

## Confirmed findings (visible in the frames)

| # | Finding | Evidence in the video | Cause in source | Suggested fix | Pri |
|---|---|---|---|---|---|
| V1 | **Add sheet is see-through while it moves.** The previous screen ghosts behind it ("152.60" behind "0.00" at ~112 s; "Debts & loans" behind the sheet and the keyboard at ~109.5 s). It looks like a double exposure for a few frames | frames at 109.5 s, 112 s | `styles.js:136–137`: the sheet slides in from `opacity:0.6`, and leaves to `opacity:0.6` (`addOut`, line 527–528), although its background is solid | Animate `transform` only; keep opacity 1 (dim the page behind with a separate scrim if wanted). One-line change per keyframe, no logic touched | P1 (cheap, visible every time) |
| V2 | **The floating + button covers the amount of the row under it.** The right-aligned amounts of the rows passing below the button are cut ("+156.▢") | frames at 68, 72, 80, 84, 92 s on Transactions; also over list rows on Goals (56–60 s) | FAB is `position:fixed` over scrolling content | Keep the + bottom right (your decision). Hide it while scrolling down and bring it back on scroll up or stop (transform + opacity, 150 ms), or leave a right gutter so amounts end left of the button. Needs a test that no amount is covered at rest | P1 (money values must stay readable) |
| V3 | **A toast covers the backup banner.** "Privacy mode off" sits over the "Back up your data" text and button | frame at 16 s | Both use the top edge (`toast` and `backup-banner`) | Push the toast below the banner, or queue it; banner stays the safety message | P2 |
| V4 | **Segmented control switch is abrupt.** The Budgets/Goals pill and content swap within one 0.25 s step; the pill does not slide and the old content disappears with no cross-fade | 62.0–62.5 s | `.seg-btn` colour transition only | 180 ms sliding pill (transform), 120 ms content fade; reduced motion = instant | P2 |
| V5 | **Native Android date picker clashes with the app.** A light-grey system dialog in a dark app | frame at 96 s | native `<input type="date">` | Acceptable for now (it is reliable and accessible); a custom picker is costly and risky. Revisit only after user feedback | P3 / DEFER |
| V6 | **Help text is a wall of text.** The "Your data lives only on this phone" and "How Expense Ledger works" dialogs are 8–10 dense paragraphs | frames at 48 and 52 s | content | Split into 3–4 short expandable cards ("Where is my data?", "How do I back up?"); keep the full text behind "More" | P2 |
| V7 | **Theme change is an instant flip** with a "Theme changed" toast (Sea glass → Mist light → Nordic) | frames at 36 and 40 s | no transition | 200 ms colour crossfade only during the switch (backlog E11) | P3 |

## Good (so we keep it)
- The language switch is immediate and consistent across the screen.
- The smart hint under the merchant field ("Usually 0.60 · typically Monday · next ~29 Oct") is genuinely helpful and distinctive.
- The numeric keyboard opens with the amount, quick-fill chips and category tiles visible together; "Record Expense" stays above the keyboard.
- Cards, type and the Claude-like quiet style look coherent across themes and tabs. Rows and filters are clear; 250 entries scroll and select without any visible stall in the frames I sampled.

## Correction to my earlier report (honest)
I wrote that the Home month card's third figure was labelled "Balance", reading as account money. **That is true only in a month with no income** (source: `screens/home.jsx:129–133`: with income it shows a surplus percentage, "Surplus 94%", as seen in this video; without income it shows "Balance −12.50"). So the "Balance" confusion is narrower than I stated: it affects months where nothing has been recorded as income yet (including every new user's first month, which is when it matters most). The Run 29 rename should therefore cover that branch and also check the Analytics wording ("Net deficit" vs "Balance") — scope unchanged, wording of the problem corrected. Still not independently reviewed by a native speaker.

## What changes in the Experience backlog
- Add **V1** and **V2** as P1 (both small, both visible in every session, neither touches money logic). V1 is a two-line CSS change; V2 needs a small scroll listener or a layout gutter plus a test.
- Add V3, V4, V6 (P2); V7 stays E11; V5 deferred.
- The "tween/arrival" ideas (E1, E2) remain after V1, V2: first remove the rough edges, then add new motion.
- Performance: no new evidence beyond my earlier synthetic measurement; the 250-entry Transactions list looked fine on the phone in the frames I sampled. That does **not** refute the measured freeze under CPU slowdown; it suggests the Poco F6 is fast enough for 250 rows, which is the expected result.

## What I did not see
Charts under touch, the lock screen, import/export, loans and debts with data, the largest-font mode, az/ru text fit across the whole app, battery or memory, and any dropped frames finer than 0.25 s.
