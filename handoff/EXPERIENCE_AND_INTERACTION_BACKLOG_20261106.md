# Expense Ledger — Experience & Interaction Quality: assessment and backlog (6 Nov 2026)

Separate from financial-correctness and data-safety work (that list stays in `OWNER_DECISIONS_AND_MASTER_BACKLOG_20261106.md` and still ranks first when a conflict arises). Nothing here was implemented. No source, test, commit or deployment changed.

## 0. How I assessed, and the limits of that assessment

| What I did | Label |
|---|---|
| Read the motion/feedback code in `styles.js`, `App.jsx`, `screens/ledger.jsx` (keyframes, `:active` states, reduced-motion rules, vibration) | INSP |
| Opened the **live site** (bundle `index-CYVRJL0m.js`) in a phone-sized browser pane (375×812) on a fresh, empty profile (no real data): language choice → Home → Add → record 12.50 → Home → Analytics | EXEC, screenshots |
| Judged timing, easing and "feel" | **NOT possible from screenshots.** I saw frames, not motion. Every "feels" statement below is a hypothesis until a recorded session on the Poco F6 |
| Not walked: Goals, Settings, themes other than the default dark, az/ru, long-press select, swipe, debts/loans, lock screen, largest-font mode | NOT ASSESSED |

Treat this as a first-pass expert review, not user research.

## 1. First 10–15 minutes as a new user

**Minute 0 – language choice.** Three explicit languages, and the whole picker re-renders in the language you tap (so you hear your own language before you commit). Calm and respectful. *Polished.*

**Minute 1 – Home, empty.** Large "0.00" hero, a "Get set up" checklist (four optional steps, skippable), a quiet illustration, a bottom bar with a clear + button. The tone is calm and the checklist is a good first-run device. Weaknesses: (a) the three-zero hero and the illustration floating low, with a gap, say "nothing here" rather than "here is what this will become"; (b) the month card's third figure is labelled **Balance** and, after one 12.50 expense, shows **−12.50** while Analytics calls the same thing **Net deficit** — the same number has two names and "Balance" reads like account money (already P0, Run 29).

**Minute 2 – Add.** Strong. The sheet slides up; amount is large; **Quick fill** chips (for example "Bus / Metro 0.60") give a one-tap start with local relevance; category tiles with icons; subcategory chips; "More details" collapsed so the common path is short. *Polished and genuinely helpful.* Ordinary: category tiles and type tabs have a press scale but no selected-state motion that I could see.

**Minute 3 – Record.** The sheet leaves, Home appears, a "Transaction recorded · Undo" snackbar rises, and a "Back up your data" banner slides in. The feedback is honest and undo is excellent. But: the hero figure and the Latest-transactions row **appear** at their final value; nothing connects the action you just took to the change it caused. I could not tell whether the new row eases in (a `rowRise` animation exists in the code, not confirmed on this path). The backup banner arriving on the very first entry is correct for safety, but together with the snackbar and the FAB it makes three things compete in the bottom/top edges at the moment of success.

**Minute 4–5 – Analytics.** The screen faded in with staggered cards (my screenshot caught it mid-fade, which suggests the stagger works). Content is clear: net, spent, income, trend, "Expected by month end" (a calm placeholder instead of a guess — good honesty). Ordinary: a single day of data draws a near-vertical spike on the trend chart, which looks like a glitch rather than "not enough days yet"; I did not test whether charts respond to touch.

**Overall impression (hypothesis).** Visual identity is coherent (teal ledger palette, Onest type, rounded solid surfaces, no gratuitous effects) and the quiet restraint is right for money. The feel gap is not missing animation; it is **missing cause-and-effect**: actions succeed, but little of the interface visibly responds *where your eye already is*. The app tends to be correct and calm; it is not yet *discoverable* or *delightful in the details*.

## 2. What already exists (so we do not rebuild it)

From the source (INSP; not each verified on device):
- Press feedback: `:active` scale (0.88–0.99) on buttons, tabs, rows, chips; soft pill background on pressed rows.
- Page motion: `pageIn`, sub-page slide-in from the right (`pageSlide`, 300 ms), sheet rise/fall, add-sheet exit, staggered `sectionIn` on cards, `rowRise`, `revealIn`, `txn-settle`, `fold-in`.
- Feedback: toast and snackbar in/out (280–300 ms in, 200 ms out), undo, backup banner, progress bars animate width (600 ms, no overshoot), empty states ease in.
- Reduced motion: media queries in ~15 places plus two script checks (`App.jsx` lines 2601 and 3049).
- Haptics: one vibration call, long-press select (`screens/ledger.jsx:37`).
- Sample-free first run: language choice, setup checklist, backup banner.

**Observation on consistency (INSP):** durations in the stylesheet are 80, 120, 150, 180, 200, 220, 280, 300, 320, 600 ms with several easing curves; there is no single motion scale, so screens can feel subtly unrelated.

## 3. Principles for this stream

1. Motion explains a change; it never decorates. Each item names the change it explains.
2. Transform and opacity only; no animation of layout properties on lists; no blur/backdrop effects added.
3. Money stays exact: any number tween is visual only; the final value is in the DOM immediately for screen readers and tests.
4. Reduced motion → instant, still correct. A reduced-effects setting continues to win.
5. Budget: 60 fps on the Poco F6 and a deliberately low-end Android; nothing that needs a GPU layer per list row.
6. Frozen: palette, type, layout language, bar style. Open: how things move, respond and explain themselves.
7. Every item is verified by (a) a test for correctness/reduced motion, and (b) a recorded device check for feel.

## 4. Prioritised backlog

Priority: **P1** do next in this stream; **P2** after; **P3** polish; **DEFER**. Effort: S ≤ half day, M ≈ 1–2 days, L larger. "Risk" is to financial clarity, accessibility or performance.

| # | Item | Why (observed) | Concrete implementation idea | Pri | Effort | Risk | Acceptance / verification |
|---|---|---|---|---|---|---|---|
| E0 | **Recorded exploration baseline** | I cannot judge feel from screenshots | Owner records 10–15 min on the Poco F6 following a one-page script (first run, add 5 entries, edit, delete+undo, filter, select, goals, themes, az/ru). I frame-step it and note janks, dead taps, silent actions. Becomes the "before" for everything below | P1 | S (owner time) | none | Recording stored in `handoff/`; findings list with timestamps; no claim of "feels good" without it |
| E1 | **Connect action to result: new-entry arrival** | Record → Home shows final state with no link between tap and change | After save, the new row eases in (translateY 8 px→0, opacity, 220 ms) and its background tints with the accent for ~700 ms then fades; the hero amount cross-fades/tweens (below). Skipped if the row is off-screen | P1 | S | low | Test: row present with exact text immediately; reduced motion → no tint animation; screenshot at t=0 and t=900 ms |
| E2 | **Number change tween (hero, budgets, balances)** | Values jump | One `useTween(value)` hook: 250 ms ease-out from old to new, `tabular-nums`, only after a user-triggered change (never on first paint or tab return); `aria-label` carries the final value; skip when reduced motion | P1 | M | medium (must never show a wrong intermediate as final; tests read the final DOM value) | Logic test: final text equals formatted amount to the cent for 1,000 random values; browser test: aria value equals final at t=0; no tween when `prefers-reduced-motion` |
| E3 | **Calm low-data states for charts** | One day of data draws a vertical spike; zero-state hero + floating art | Trend: with fewer than 3 days of data draw dots, not a line, with the sentence "A line appears after a few days"; Home empty state: fold the illustration into the checklist card; chart axes fade in | P1 | S | low | Browser tests for 0, 1, 2, 3 days; screenshot at 320/360/412 px |
| E4 | **Charts you can touch** | Not tested whether donut/trend respond | Tap a donut slice → centre shows category and amount, slice grows 4 px; second tap or "See in Transactions" opens a pre-filtered list (a discoverable bridge). Trend: press-and-drag shows a vertical guide and the day's total (readout above the finger, ≥44 px hit area) | P1 | M | medium (touch targets, colour-only cues) | Each interaction works with keyboard/screen-reader alternative (list of values); hit target ≥44 px; frame rate checked in E0 style recording |
| E5 | **One motion scale (tokens)** | 10 different durations, several curves | In `:root`: `--dur-fast:120ms`, `--dur-base:220ms`, `--dur-slow:320ms`; `--ease-out:cubic-bezier(.22,1,.36,1)`, `--ease-in:cubic-bezier(.4,0,1,1)`; replace literals mechanically; one reduced-motion override zeroes them | P2 | S | low (mechanical; visual diffs reviewed) | Static check: no literal `ms` left outside tokens; full gate; side-by-side recording shows no regression |
| E6 | **Selected-state motion on choices** | Category tiles/type tabs show state change only by colour swap | 150 ms accent underline slide for Expense/Income/Loan/Debt tabs; selected category tile gets a 1.04 → 1 settle (80 ms) and the label weight stays fixed (no layout shift) | P2 | S | low | No layout shift (measure width before/after); reduced-motion variant |
| E7 | **Delete with dignity** | Deletion shows a snackbar, the row's disappearance is not explained | Row collapses (opacity + height via `grid-template-rows` 1fr→0fr, 220 ms) and Undo reverses it in place; for multi-delete the count appears in the snackbar | P2 | M | medium (list height animation on low-end phones) | Only a handful of rows animate; test undo restores identical record and order; recording on low-end device |
| E8 | **Discoverability, in context, once** | Long-press select, swipe, templates and number shortcuts are invisible | Three dismissible, non-modal hints each shown once at the moment they would help: after the 3rd entry ("Press and hold an entry to select several"), first time in Goals, first Import. Settings → "Tips" lists them again. Tracked locally only | P2 | M | low (must not nag; one at a time; none during entry) | Hint appears at most once; dismiss persists in a **separate** key (not the data key); test with all three languages |
| E9 | **Success moments with restraint** | Goal completed or loan paid off has no moment | A 600 ms ring-fill completion with a check and the sentence; no confetti on spending, ever; only goals/debts reaching 100 % | P2 | S | low | Reduced motion shows the final state and sentence; only fires on the transition, not on every load |
| E10 | **Subtle haptics** | Only long-press vibrates | `navigator.vibrate(8)` on record, undo, select toggle, error; one pref "Vibration" default on; no new native plugin needed. Capacitor Haptics plugin is the higher-quality option but adds a dependency (needs your approval) | P3 | S | low | Setting persists; off in reduced-effects; real-device check only (browser cannot prove it) |
| E11 | **Theme switch crossfade** | Theme change flips instantly | 200 ms colour transition on `body` and surfaces only during the switch (class added then removed) | P3 | S | medium (flash of unstyled colours on low-end devices) | Frame check on E0 device; fallback instant |
| E12 | **Micro-copy pass for feel** | Same number has two names; some labels clinical | One glossary: Home and Analytics use the same name for month result (Run 29); empty-state sentences written to invite action; az/ru by native reviewers | P1 (labels) / P3 (rest) | S | low | Copy tests; native review sheet |
| E13 | **Performance budget and trace** | No measured animation cost | Record a performance trace on Poco F6 and a low-end phone for: open Add, record, tab switch, long list scroll, chart touch; budget: no frame over 32 ms in the common path; list rows animate only transform/opacity | P1 (gate for all) | M | none | Trace summary in `handoff/`; any item over budget is simplified or dropped |
| E14 | **Shared-element transitions** (row → detail, tile → sheet) | Attractive but costly | Do not start; revisit after E13 shows headroom | DEFER | L | high | — |
| E15 | **Illustrated personality / mascot / sounds** | Possible identity | Not recommended now: identity is carried by typography, colour and restraint; sounds add privacy/annoyance risk | DEFER | — | — | Revisit after user feedback |

## 5. Suggested order and how it fits the rest

1. **E0** and **E13** first (measure before changing) — runs alongside Run 29 and needs only your recording.
2. **E12 (labels)** is already in Run 29.
3. **E3, E1, E2, E4** as "Run 31 — Cause and effect" (they share the same screens and tests).
4. **E5** with it, then **E6–E9**, then **E10–E11**.
5. A recorded device check after every run; reduced-motion and az/ru tests in the gate.

None of this touches storage, calculations or backup, so it can proceed in parallel with correctness work provided each change goes through the same gate and I do not merge it with a financial change in one commit.

## 6. Risks and trade-offs I want you to see

- **Best case:** the app visibly responds to every action, charts invite touch, hints teach features at the right moment, and a user remembers it as "careful".
- **Likely:** a measurable improvement in perceived quality at low cost, because the base (colour, type, surfaces, press states, page motion) is already good.
- **Worst credible:** a tween or collapse animation drops frames on a cheap phone, a wrong intermediate number is read as final, or reduced-motion users get a broken state. The principles and the E13 budget exist to prevent this.
- **Opportunity cost:** E1–E4 are about 5–6 working days of effort; they take time from user validation and the independent maths checks. I rank correctness first and would run E0/E13 now, the rest after Run 30.
- **What I am unsure of:** actual feel, because I have not seen it move on your phone; how charts respond to touch; themes other than the default; languages other than English.

## 7. What I need from you

1. A 10–15 minute screen recording on the Poco F6 of normal exploration (I will give you a one-page script if you want).
2. Yes/no on: modest "goal reached" moments (E9), vibration setting on by default (E10), one-time in-context tips (E8).
3. Permission to start E13 (measurement only) now.
