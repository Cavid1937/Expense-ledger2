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
- Account ask after setup: decided later the same day (see "Owner decisions" below).
- Per-screen tracking: not approved (see below).
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
- Your decision: publish release 104 (with 104b). The other two decisions are recorded below.

## Owner decisions (17 Nov, after the first report) and Run 104b
1. **Account after setup: CONDITIONALLY APPROVED.** The required order is welcome and language → light preferences → account and Drive restore → restore and verify → a fresh ledger only if the person chooses not to restore → the app.
   - **Finding:** the app already used this order (language → account/guest → quick questions). The quick questions are what create a fresh ledger: they add accounts, bills and goals, so they must stay after the restore decision.
   - **Deviation, explained:** there is no separate "preferences" step. Language is the only preference that creates no records. Asking for theme or similar before a restore would block the backup's own setting, because restore only fills in values the phone still has at their defaults. Language is the safest equivalent.
   - **CONFIRMED DEFECT fixed (commit 6880bc9).** Signing in to an account that already held records closed the first-launch scene *before* the person confirmed the import preview. Pressing Cancel, or closing the app, left an empty app with no questions; the way back was hidden in Settings.
     - New step "restore". The scene now ends only when the preview is confirmed.
     - The restore page offers "Check my records" (reads the account again) or "Start fresh on this phone".
     - Starting fresh keeps saving to the account paused, so the new empty ledger can never overwrite the saved records. The choice is made later in Settings, as before.
     - Errors are shown on the page.
   - **Google Drive restore** is back on the first-launch page as a third choice. It uses the normal import preview, and Drive backup switches on only after the person confirms.
   - The account stays optional; "Continue as guest" is unchanged.
   - Phones that already have records never see the scene.
2. **Per-screen tracking: NOT APPROVED.** Nothing was added. Two points:
   - **Fact you should know:** the app already has an opt-in "Help improve the app" switch, built in earlier runs. It is off by default. When the person turns it on, it counts how often each *tab* is opened and sends those counts with the other anonymous figures, after showing a preview. This run did not change it, and the new pages add no counting.
   - **Privacy-preserving alternative, documented only:** occasionally ask a one-question in-app survey ("Was setup clear? yes/no"), stored on the phone and sent only through the existing opt-in preview. Not built.
3. **Paywall, motion blur and sound: rejected, confirmed.** None was built. Feedback stays vibration-only.

**Other video improvements:** I checked every remaining idea. What is left is copy wording (videos 1 and 6), which goes through the plain-story review with you. I did not invent extra work.

### Run 104b tests (built from the final code)
- `e2e_run104_restore` (new), 33/33. It covers:
  - a new person with an empty account;
  - a returning person: preview → cancel → choice page, with account and phone untouched;
  - a reload during the preview → back to the restore page → confirm → exactly the 2 saved entries, no duplicates, account resumes at version 4, still 2 after another reload;
  - "Start fresh": after 6 seconds in the app, nothing was saved to the account;
  - failed account read, on the first page and on the restore page;
  - a damaged account copy;
  - Drive restore: exactly 2 entries, Drive backup on, no account created;
  - no Drive backup, and a cancelled Drive preview;
  - a phone with records: no scene;
  - the new pages in az and ru.
- Older tests still pass: `e2e_run79_onboard` 29, `e2e_run81_account` 38, `e2e_run74_drive` 12, `e2e_run29_restored` 19, `e2e_lang` 57, `e2e_run104_video` 16, `e2e_run50setup` 12, `e2e_run17_setup` 8.
- `run-logic` 2832 passed; `vite build` OK; offline check 17/17.
- Screenshots: `shots104/ob-account-{az,en,ru}-360.png` and `ob-restore-{az,en,ru}-360.png`, no sideways scroll.
- **Limits:**
  - The full browser suite was not run again after 104b; only the related files listed above were.
  - Google, Drive and the server were simulated. A real Google sign-in and a real Drive restore on a phone have not been tried.
  - At 360×760 the Drive choice sits below the fold, so the person scrolls to reach it.

## Status
| Item | Status |
|---|---|
| No-income note defect | VERIFIED |
| Loan no-double-entry | VERIFIED |
| Notice motion | VERIFIED (browser) |
| Keyboard handling | IMPLEMENTED BUT UNVERIFIED (on a phone) |
| Restore before fresh ledger (onboarding) | VERIFIED (browser, simulated Google/Drive/server); real-device sign-in UNVERIFIED |
| First-launch Drive restore | VERIFIED (simulated) |
| Per-screen tracking | DEFERRED WITH REASON (owner: not approved) |
| Paywall, motion blur, sound | DEFERRED WITH REASON (rejected) |
