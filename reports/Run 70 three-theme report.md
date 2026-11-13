# Run 70 report: Graphite, Ivory and refined Sea glass (13 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`, started from 631e300 (the live version). It is committed locally and not pushed, as the brief asked.

## A. What I found first
- **Themes:** there were six, all working: Sea glass, which is the original "Caspian" look and the default, plus Nordic, Mist (light), Dusk, Graphite (an older warm-white version) and Sand (light).
- **Where colours live:**
  - all colours are CSS variables in `styles.js`;
  - a theme is a set of overrides in `THEMES`, in App.jsx;
  - the choice is stored in its own key, `expense_ledger_v5__theme`, separate from the ledger. Backups carry it as a preference.
- **Problem 1, default vs. choice:** the original look was saved as "no key", so "never chose" and "chose Sea glass" could not be told apart.
- **Problem 2, light-theme depth:** the depth and shadow rules for light themes were tied to the names "mist" and "sand", so a new light theme would not get them.
- **Problem 3, category colours:** they are light pastels made for dark screens, so on light themes some icons and chart bars were faint (Mist and Sand already had this problem).
- **Problem 4, leftover teal:** the original look's teal was still hard-coded in places:
  - the spending-calendar heat map;
  - the + button's glow;
  - the Undo button's border;
  - the crash screen.

  The new screen test found the calendar case.
- **The "Caspian" direction** in the production master prompt is that original palette. It is not deleted: it stays as its own choice, "Caspian (original)".

## B. What changed
- **App.jsx:**
  - `THEMES` gains Graphite (redrawn from your palette), Ivory (new) and Sea glass (refined), and keeps `caspian` (the original look, unchanged), Nordic, Mist, Dusk and Sand.
  - `THEME_MAIN` and `themePreview` drive the picker.
  - `themeFallback`, `settleTheme`, `themeIsAuto` and `THEME_AUTO_KEY` handle defaults and migration.
  - `applyTheme` also sets `data-scheme` (light or dark).
  - `catInk` shades category colours on light themes.
  - The crash screen uses theme colours.
  - Backups keep any theme by name.
- **styles.js:**
  - light-theme depth follows `data-scheme`, not theme names;
  - `--cat-shade`, `--heat-scale` and `--cal-hot-ink` added;
  - the leftover teal and amber colours point at theme variables;
  - theme preview card styles added;
  - a gentle 200 ms page-colour change, switched off with reduced motion.
- **screens/settings.jsx:** the picker shows three preview cards. Each draws a small screen in that theme's real colours (card, two text lines, an income and a spending mark, a button), with the name and a one-line description. The selected card has a ring and a tick, so it doesn't rely on colour alone. The other five themes stay below as chips under "More themes".
- **screens/analytics.jsx and recurring.jsx:**
  - category icons, bars and donut slices use `catInk`;
  - the spending calendar uses the theme's own button colour instead of teal.
- **index.html:** a tiny script sets the saved theme's background before anything is drawn, so Ivory never flashes dark on opening.
- **i18n.js:** new texts in az, en and ru: Ivory, Caspian (original), the three descriptions, and "More themes".

### Your colours, and where I changed them
Every surface and text colour is as you gave it. Three values were adjusted after measuring:

| Theme | Item | Yours | Used | Why |
|---|---|---|---|---|
| Graphite | Button | #42627C | #4D7090 | Its edge was only 2.6:1 against cards; it is now 3.2:1, with white text still 5.2:1 |
| Sea glass | Button | #456F65 | #4E7D72 | Edge 2.8:1 → 3.35:1; white text 4.67:1 |
| Ivory | Secondary text | #626B70 | #5C656A | It was 4.44:1 on input fields, just under the 4.5 minimum |

- **#6D9C91 (Sea glass):** used only for highlights and selected states. As text it measures 4.2:1 on raised cards, and pale text on it fails, so text uses #8DB8AD and buttons use the darker green.

### Defaults and old choices
- **New install** (no ledger data at all): Graphite.
- **Existing phone with no saved theme:** Sea glass, now in its refined form.
  - Before this run, "no key" could have been a deliberate choice of Sea glass, so I did not switch these phones to Graphite.
  - Anyone who wants the untouched original can pick "Caspian (original)".
- **Writing the choice down:** from now on every choice is saved by name, Sea glass included. On first start the app writes down the look it is showing, once, marked as picked by the app.
  - A restored backup can therefore still bring its theme, but only while that mark is there. The person's own choice is never overwritten.
- **Old saved values:** Nordic, Mist, Dusk, Graphite and Sand keep working. The long-removed Sapphire and Cocoa still map to Dusk and Nordic.
- **The ledger:** the `expense_ledger_v5` key and the ledger data are not touched; a test compares the ledger before and after.

## C. Visual check
- **Screenshots:** 72 in `tests/evidence/run70-themes/`. Each theme was captured on eight screens:
  - Home, Entries, Add entry, Analytics (top and charts), Budgets, Goals, and the theme picker;
  - at 390px in English, 360px in Russian and 320px in Azerbaijani.

  There are also nine overview sheets (`SHEET-*.png`).
- **I inspected these myself:**
  - all three 390px sheets;
  - the 320px Azerbaijani Graphite sheet;
  - Ivory's Home, Add and picker screens at full size.
- **Result:**
  - Graphite and Ivory have the same layout;
  - Ivory's page is off-white and its white cards have visible edges;
  - Sea glass is charcoal, with green only on buttons, selections and small accents;
  - income stays green and spending red/coral in all three.
- **Automatic screen check (e2e_run70_themes):** for each theme, every main screen was opened at 360px and 285 text elements were measured against what is actually behind them.
  - Zero below 4.5:1 (3:1 for large text).
  - Zero leftover teal.
  - No sideways scrolling.
- **Earlier issues seen, not caused by this run:**
  - At 320px in Azerbaijani, the Analytics tab "Dinamika" wraps to two lines.
  - The empty amount "0.00" on Add is slightly cut off by the currency button.
- **Not separately checked for the new picker:**
  - very large text sizes;
  - desktop width beyond the existing tests;
  - arrow keys moving between themes. Tab and Enter work, as with the old chips.

### Contrast (WCAG ratio; 4.5 is the minimum for text, 3 for edges)
| Combination | Graphite | Ivory | Sea glass |
|---|---|---|---|
| Primary text on page | 16.26 | 12.69 | 15.19 |
| Primary text on card | 14.81 | 13.49 | 13.49 |
| Secondary text on card | 7.62 | 5.61 | 7.51 |
| Secondary text on input | 5.75 | 4.86 | 5.49 |
| Placeholder (ink-4) on input | 4.94 | 4.93 | 4.89 |
| Accent text on card | 6.89 | 6.33 | 7.13 |
| Button text on button | 5.20 | 5.72 | 4.67 |
| Button vs card (edge) | 3.23 | 5.38 | 3.35 |
| Control border vs card | 3.54 | 3.29 | 3.50 |
| Income on card | 9.86 | 6.15 | 9.15 |
| Spending on card | 7.01 | 6.18 | 6.50 |
| Warning on card | 10.28 | 6.51 | 9.54 |

## D. Tests actually run
- **Logic (first pass):** `node tests\run-logic.mjs`: 114 files, 2,293 passed, 0 failed, 0 missing.
  - **New: run70themes, 45 checks.** It covers:
    - your colours;
    - contrast on all four surfaces;
    - button and border edges;
    - money colours;
    - fresh and existing defaults, and that a saved choice is never overwritten;
    - backups;
    - previews;
    - the first-paint colours matching the themes.
  - **Changed with equal strictness:**
    - run25themes (19 → 21 checks; eight themes now);
    - run42io, run37io: Sea glass is now a real choice that a backup keeps;
    - i18n (82 → 83).
- **Browser:**
  - e2e_run70_themes 25/25 (new);
  - e2e_run25_themes 25/25 (21 → 25);
  - e2e_run42 26/26;
  - e2e_run25_layers 26/26;
  - e2e_run27_fold 13/13;
  - e2e_run37_roundtrip 13/13;
  - e2e_run42_io 6/6;
  - e2e_ux_lang 8/8.
- **Build:** `npx vite build` OK.
- **Full browser suite, first run:** 140 files, 2,339 passed, 3 failed. All three failures were real findings:
  - The phone's "more contrast" setting had stopped working. Its stronger colours only reached the original look, because themes set their colours directly. **Fixed:** each theme now gets its own stronger set, and the logic check is in run70themes.
  - Two tests expected the original look's exact colours. They now check the active theme (reduced transparency: the bar is solid in the page colour; more contrast: exact stronger Sea glass values).
- **Full browser suite after the fixes** (`node tests\run-browser.mjs` on cddf0d2): **140 files, 2,342 passed, 0 failed, 0 missing**, 0 standby events.
- **Logic after the fixes:** 114 files, 2,296 passed (run70themes 45).

## E. Status
| Item | Status |
|---|---|
| Graphite, Ivory, Sea glass tokens and contrast | VERIFIED (computed + measured on screen) |
| Choosing, restoring after restart, fresh default, old values | VERIFIED (browser tests) |
| All main screens adapt, no leftover teal | VERIFIED for Home, Entries, Add, Analytics, Goals/Budgets, Settings |
| Rarely seen sheets in the new themes (import review, debts, bill editor, lock screen, error states) | IMPLEMENTED BUT UNVERIFIED: they use the same variables, but I took no screenshots of them |
| On a real phone (Poco F6), including the Android status bar colour | NOT ASSESSED: no APK built in this run |
| Native date and option dialogs (grey Android pop-ups) | NEEDS WORK, already in the plan as item 7, and not part of this run |
| az/ru wording of the new theme texts | NEEDS WORK until the native-speaker review |

## F. Next action
- **You:** look at the screenshots, then say whether to publish and build an APK.
- **Me, after that:** screenshots of the rarer sheets in all three themes.
