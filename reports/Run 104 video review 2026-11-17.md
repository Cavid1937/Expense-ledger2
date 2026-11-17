# Run 104 – video review report (17 Nov 2026)

Local commit b029356 on 3124fa2 (Runs 103 + 104 together; the two runs changed the same files). NOT PUSHED. The live site is still release 102 (c19ca21).

## A. Starting state
- Live: release 102 at c19ca21. Local: Run 103 (owner decisions D1, D9, D10), not yet committed.
- Earlier research is still current: `reports/Expense Ledger next build backlog.md` and "Product discovery and differentiation 2026-11-16.md". I did not run the research again.

## B. Video coverage register
Method: I sampled frames with Chrome every 0.5–2 seconds and put them on contact sheets. I looked at every sheet. I did not hear the audio; I read the spoken content from the captions burned into the videos.

| # | File | Length | Topic |
|---|------|--------|-------|
| 1 | de173cd3-VID_20261116_162418_955.mp4 | 78.5 s | Onboarding rules: show the outcome first, give before you ask, every question changes something, paywall after a win, measure each screen |
| 2 | 14161d60-VID_20261116_163719_580.mp4 | 28.4 s | The keyboard covers the input box; content should move up with the keyboard |
| 3 | 7e802b8f-VID_20261116_165150_130.mp4 | 81 s | Onboarding psychology: goal gradient, questions about yourself, loss aversion when asking for an account, time to value |
| 4 | f4bf20cf-VID_20261116_165153_776.mp4 | 61 s | Design language: 8-point spacing, one font family, one button shape, one main action per screen |
| 5 | cd9e2ff7-VID_20261117_122323_135.mp4 | 33 s | Motion: spring easing, stagger, small overshoot, motion blur, sound |
| 6 | 9343c61a-VID_20261117_122353_602.mp4 | 54 s | A/B tests: simple copy that says what it is and why it helps wins |

Classes:
- A = already covered
- B = defect
- C = missing requirement
- D = improvement
- E = new opportunity or owner decision
- F = not suitable
- G = blocked

| Video, time | Idea | Class | Decision |
|---|---|---|---|
| V1 0:18 | First screen sells the outcome | A (partly) | Kept as is. The tagline is already there. |
| V1 0:24, V3 0:46 | Ask for the account after the person has seen value | E | **Not built – your decision.** The account step also restores a returning user's Drive data. Moving it after setup risks the new setup plan colliding with the restored data. |
| V1 0:40 | Every question changes something | A + **B DEFECT** | **Fixed.** People who answered "No income now" were still told "Add your next income". |
| V1 0:46 | Paywall after a win | F | Recorded for the paid-plan discussion. |
| V1 1:02 | Track every screen | G | Needs your approval for new tracking. |
| V2 | Keyboard covers inputs | C / D | **Built** (details in section C). |
| V3 | Goal gradient, questions about yourself, time to value | A | Kept: progress dots, income/goal/debt questions, Skip on every page. |
| V4 | One design language | A | Already covered by the Quiet Ledger tokens and the Onest font. |
| V5 | Spring easing, stagger | A | Already in the app. |
| V5 0:19 | Overshoot | D | **Built gently**: a 3 px settle, in line with your "calm, soft" motion notes. |
| V5 | Motion blur, sound | F | Motion blur is too costly on cheap phones. Sound breaks your haptics-only rule. |
| V6 | Plain conversion copy | A (mostly) | Any wording change goes through the plain-story review with you. |
| Promotions (Buildercult, AppMonkey) | F | Not needed. They are paid outside services. |

## C. What was built
1. **No-income note (defect)**: `screens/home.jsx` no longer shows "Add your next income" when setup said "No income now". The monthly Safe to Spend is still shown.
2. **Keyboard**:
   - `index.html` viewport now has `interactive-widget=resizes-content`, so Chrome on Android shrinks the page above the keyboard instead of covering it.
   - Sheets use `92dvh`, the visible height.
   - While a text box is being typed in and the window has shrunk by more than 20%, the tab bar and the + button hide (`App.jsx` `keyboardOpen`, `html[data-kb]`).
   - A shorter window with nothing typed in does not count as a keyboard. This covers turning the phone sideways and split screen.
3. **Motion**:
   - Notices and "Entry recorded" rise and settle by 3 px.
   - The notice's dot lands with a small spring.
   - With motion off or reduced, they only fade in.
4. **Loan double entry (found while checking my own Run 103 work)**:
   - The problem: a loan can be linked to a recurring payment. If that payment was already recorded this month, marking the loan paid used to add a second entry.
   - Now no second entry is added. The loan payment keeps a reference to the recorded entry (`billTxn`), and a notice explains why. The next instalment still gets its own entry.
   - The reference is kept when the stored loans are cleaned on reload (`cleanPayments`).
5. Run 103 (decisions D1, D9 and D10, plus the net-position minus sign) is in the same commit. See PHASE_CHECKPOINT.
6. `APP_RELEASE` is now "104 (2026-11-17)". There is one new text, `loan.paidViaBillToast`, in en, az and ru.

## D. Rejected or deferred
- Account ask after setup: waiting for your decision (risk explained in the register above).
- Per-screen tracking: needs your approval.
- Paywall: no paid plan exists yet.
- Motion blur and sound: rejected (reasons above).
- `react-native-keyboard-controller`: not applicable, because the app is not React Native. I used the web equivalent.
- Native Android keyboard: not changed. The APK manifest has no `windowSoftInputMode`, and no APK was built.

## E. Test evidence
- `node tests/run-logic.mjs`: 143 files, 2832 passed, 0 failed.
- `node tests/run-browser.mjs` (full suite on the Run 103 build): exit 0, 169 files, 2735 passed, 0 failed, 0 standby events.
- On the final build, run one by one:
  - `e2e_run104_video`: 16/16
  - `e2e_run103_loans`: 20/20 (6 new B6 checks)
  - `e2e_run100_cycle`: 14
  - `e2e_run97_untilpay`: 10
  - 33 related files (debts, Add form, sheets, motion, keyboard, onboarding, languages): all passed. Examples: `e2e_ux_keyboard` 22, `e2e_lang` 57, `e2e_run79_onboard` 29.
- `npx vite build`: OK. `dist/index.html` has the new viewport line.
- `node tests/pwa/offline-check.mjs`: 17/17.
- Limit: the full suite ran before the Run 104 edits. The Run 104 parts were checked one file at a time, as listed above.

## F. Visual evidence
Screenshots are in the scratchpad folder `shots104`:
- `home-noincome-en/az/ru-360.png`: the Safe to Spend card with no "add income" note.
- `goals-focus-before-kb-390.png`
- `goals-kb-up-390x430.png`: keyboard imitated; the tab bar and + button are hidden, and the page reports `data-kb=1`.

## G. Remaining work
- **Real phone check (Poco F6, Chrome)**: does the keyboard now push sheets up, and do the tab bar and + button hide? Headless Chrome has no real keyboard, so this is IMPLEMENTED BUT UNVERIFIED.
- az/ru wording of `loan.paidViaBillToast` needs a native reader.
- Your decisions:
  - publish release 104;
  - account ask after setup;
  - per-screen tracking.

## Status
| Item | Status |
|---|---|
| No-income note defect | VERIFIED |
| Loan no-double-entry | VERIFIED |
| Notice motion | VERIFIED (browser) |
| Keyboard handling | IMPLEMENTED BUT UNVERIFIED (on a phone) |
| Account ask order | DEFERRED WITH REASON (owner decision) |
| Per-screen tracking | BLOCKED (approval) |
