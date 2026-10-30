# Interaction / UX patterns for a mobile personal-finance PWA (add flow, keypad, Home, Analytics, chart, one-off label)

Method note: ~17 searches/fetches. Web search returned mostly secondary sources; NN/g, Baymard, m3.material.io, Mobbin/PageFlows and the Apple HIG pages themselves were NOT retrieved. Competitor teardowns (Monzo, Revolut, YNAB, Wallet, Spendee, Money Manager, Copilot, Fina, Goodbudget) were NOT found; Cashew only by feature list. Items marked [unsourced] are from model background knowledge and must be verified before being treated as fact.

## (1) "+" button opening a type chooser first

### Takeaway
Material-family guidance supports a single bottom-right FAB for the primary action and a short action list (3-6 items) when several related actions exist; a modal bottom sheet is the documented alternative to menus/dialogs for listing actions. No competitor evidence was found on whether a chooser-first flow is faster than a form with a type toggle; this is a judgment call.

### Cited Findings
- MUI and Framework7 say a speed dial should hold roughly 3-6 related actions; tapping the main FAB again should either run the most common action or close the menu. — [MUI speed dial](https://v5-0-6.mui.com/components/speed-dial/), [Framework7 FAB](https://v5.framework7.io/docs/floating-action-button.html)
- MUI documents Escape closing the speed dial and returning focus to the FAB (keyboard/a11y pattern). — [MUI speed dial](https://v5-0-6.mui.com/components/speed-dial/)
- Material: modal bottom sheets are an alternative to menus or simple dialogs, can show actions as a list or grid, block the rest of the app, and sit over a scrim. — [Material 1 bottom sheets](https://m1.material.io/components/bottom-sheets.html), [Android Compose bottom sheets](https://developer.android.com/develop/ui/compose/components/bottom-sheets)
- SAP Fiori (Material-derived): reserve the FAB for the single most important screen action, avoid competing FABs, do not put it in hard-to-reach places; lower right on compact screens. — [SAP FAB usage](https://www.sap.com/design-system/fiori-design-android/v25-4/components/buttons/fab/usage)
- Material 2 docs: extended FAB at bottom right or bottom center; do not combine with a bottom app bar (takes much space). — [Material 2 FAB](https://m2.material.io/develop/ios/components/fabs)
- Critical view exists: a reference list cites "Material Design: Why the Floating Action Button Is Bad UX Design" (title only; argument not retrieved). — [Crossref record](https://api.crossref.org/works/10.3390%2FFI11070148)
- Cashew (open-source Flutter finance app) supports deep links to prefill an add-transaction form (amount, title, category) and a community post notes the Add button opens a blank form without filter context (feature request, unconfirmed behavior). — [Cashew repo](https://github.com/jameskokoska/Cashew)

### Inferences
- A chooser is justified only where the types need genuinely different fields (loan payment, debt, transfer). For the common case (expense) it adds a tap; mitigate by making the chooser a compact bottom sheet with Expense pre-emphasised/first and "recently used" first, or tap = Expense, long-press/second tap = chooser. [opinion]
- Recommended: tap "+" -> modal bottom sheet with 4-6 large rows/tiles (icon + label + one-line helper text in plain language: "Money you spent", "Money you received", "Paid back a loan", ...), then the type-specific flow with the chosen type shown as a changeable chip at the top (so a wrong choice costs one tap, not a restart). Close via scrim tap, swipe down, Back, Escape; focus trapped, returned to "+" on close.
- Effort: low-medium (sheet + routing to existing flows). Risk: low; main risk is slowing the 90% expense case - measure taps-to-save before/after.

### Gaps
- No teardown evidence for Monzo/Revolut/YNAB/Wallet/Spendee/Money Manager/Copilot/Fina/Goodbudget add-flows; NN/g and m3.material.io FAB-menu/bottom-sheet pages not retrieved. Recommend the owner/next researcher view Mobbin/PageFlows directly.
- No usability data comparing chooser-first vs type-toggle-in-form.

## (2) Custom numeric keypad

### Takeaway
Browsers already provide a decimal keypad via `inputmode="decimal"` on a text input, so a custom keypad is a product choice (one-handed, big keys, calculator operators, no covering of fields), not a necessity, and it takes on locale decimal handling, accessibility and haptics yourself. No quantitative speed/error evidence (custom vs system) was found.

### Cited Findings
- `inputmode="decimal"` yields a number pad including the decimal point; WebKit made `inputmode="numeric"` show a digits-only pad (iOS 13 era). — [WebKit bug 200226](https://bugs.webkit.org/show_bug.cgi?id=200226), [WebKit commit](https://webkit.googlesource.com/WebKit/+/1e2cc81a2edcc86d841a5f3aaa403411f0854ac9%5E%21/)
- `type="number"` on iOS may not give a reliable numeric pad and can insert thousands separators on submit; developers recommend `type="text"` with `inputmode`/`pattern`. — [Brad Frost](https://bradfrost.com/blog/post/better-numerical-inputs-for-mobile-forms/), [GOV.UK Frontend PR](https://github.com/alphagov/govuk-frontend/pull/1704/commits), [Filament Group](https://filamentgroup.com/lab/type-number)
- Decimal separator differs by locale (period vs comma); the system keyboard adapts, a custom keypad must handle it. — secondary source via search summary (low quality); consistent with the Run 17 comma bug already in this project.
- Apple HIG (virtual keyboards): custom input views are allowed for app-specific data entry; users expect familiar key feedback sounds. — [Apple HIG virtual keyboards](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards.md)
- `navigator.vibrate`: caniuse/MDN data list iOS Safari as unsupported; MDN notes it needs sticky user activation and is not Baseline; one unconfirmed MDN-bcd issue and a polyfill project claim some iOS versions behave differently (a polyfill says iOS 18-18.3 worked, 18.4 required user interaction). — [caniuse](https://caniuse.com/mdn-api_navigator_vibrate), [web-features](https://web-platform-dx.github.io/web-features-explorer/features/vibration), [ios-vibrator-pro-max](https://github.com/samdenty/ios-vibrator-pro-max), [MDN bcd issue](https://github.com/mdn/browser-compat-data/issues/29166)
- Reduced motion: WCAG 2.3.3 (AAA) lets users prevent non-essential interaction-triggered animation; `prefers-reduced-motion` is a sufficient technique. — [W3C Understanding 2.3.3](https://w3c.github.io/wcag/understanding/animation-from-interactions.html), [Technique C39](https://w3c.github.io/wcag/techniques/css/C39)
- Animation timing (secondhand): simple feedback ~100 ms; 100-500 ms typical window; large movements 250-500 ms (attributed to NN/g by secondary sites; NN/g page not verified). — [W3C list quoting NN/g](https://lists.w3.org/Archives/Public/public-css-archive/2025Apr/0702.html), [UXCel](https://app.uxcel.com/courses/design-foundations/motion-995/duration-9224), [SAP Fiori motion](https://experience.sap.com/fiori-design-web/?p=90413)
- Touch targets: WCAG 2.5.8 (AA, WCAG 2.2) 24x24 CSS px minimum; 2.5.5 (AAA) 44x44; Apple 44pt; Android/Material 48dp. — [testparty](https://testparty.ai/blog/wcag-target-size-guide), [specification.website](https://specification.website/spec/accessibility/touch-target-size/) (secondary; one source wrongly calls 2.5.8 a 2.1 criterion)
- Thumb reach: Hoober's observation of ~1,300 users in public: one-handed 49%, cradled 36%, two-handed 15%; of one-handed, right thumb 67%. Addy Osmani argues thumb-zone maps are outdated and users vary. Data is 2011-2013. — [Mario Blog summary](https://garciamedia.com/?p=7518), [Addy Osmani](https://addyosmani.com/blog/touch-friendly-design/), [Smashing book page](https://smashingmagazine.com/printed-books/touch-design-for-mobile-interfaces)

### Inferences
- Keypad heights: iOS number pad ~216-291pt and Android numeric ~ 250-300dp are [unsourced] figures; I could not verify them. Practical recommendation: keypad <= ~40% of viewport height in portrait (4 rows x 52-56 px keys + gaps ~ 240-260 px), amount display and category/save visible above it, key min 48 px with >= 8 px gaps.
- Haptics: Android Chrome only (`navigator.vibrate(10)` on key press, feature-detected, off by default or toggle). On iOS use visual press state (and optionally sound). Never rely on haptics for meaning. Respect `prefers-reduced-motion` for the sheet slide and key animation; use 100-150 ms for key press feedback, 200-250 ms ease-out for sheet entry, ~150-200 ms ease-in for exit. [opinion based on ranges above]
- Accessibility: keys must be real `<button>`s with labels (including localized "delete", "decimal separator"); amount display should be an `aria-live="polite"` region or a read-only input; hardware-keyboard digit/backspace/Enter must work; screen-reader users and anyone who prefers it need a one-tap "use system keyboard" fallback that swaps to `<input inputmode="decimal">` and remembers the choice. Decimal key must show the locale separator and accept both . and , (az/ru users commonly use comma).
- Collapsible: allow collapsing the pad (chevron/drag) so notes/date/category fields are reachable; auto-open when the amount field is focused; do not trap the user under the pad (scroll the form with bottom padding equal to pad height; use `visualViewport`/`env(safe-area-inset-bottom)` for iOS home-indicator).
- Do not mix a custom pad with a native keyboard appearing simultaneously: set `inputmode="none"` on the amount field (verify behavior on iOS Safari 17-18 and Android Chrome with real devices; the iOS PWA standalone behavior is a known risk).
- Effort: medium (component + tests + 3 locales + a11y). Risk: medium - IME/inputmode quirks, double-keyboard, locale separators, offline fine (no network).

### Gaps
- No peer-reviewed or vendor data on speed/error rates of custom vs native keypad found; the claim "custom keypad is faster" is unverified.
- No documented keypad heights verified from Apple/Google sources; no evidence found on screen-reader behavior with custom keypads (inference only). Must test with VoiceOver and TalkBack.
- Haptics on iOS PWA unverified on current iOS 26; test on device.

## (3) Latest transactions on Home

### Takeaway
Budgeting apps converge on a Home with a headline "left/safe to spend" figure, then recent activity and upcoming bills. Evidence is vendor marketing, not user research; how many rows is a design choice (5 is a common compromise).

### Cited Findings
- Safe-to-spend is the headline number in several apps (available funds minus upcoming bills; sometimes divided by days to next payday). — [SafeSpend](https://apps.apple.com/us/app/-/id1665299348), [Safe To Spend](https://apps.apple.com/us/app/-/id6758524287)
- Beacon Budget's Home combines Free-to-Spend, Recent Activity, Upcoming Expenses, Monthly spending. — [Beacon Budget release](https://dasbudget.userjot.com/updates/p/a-new-home-screen-budget-analysis----beacon-budget-v0-16-0)
- PocketGuard's widgets: latest transactions, upcoming bills, leftover money. — [PocketGuard](https://pocketguard.com/news/stay-on-track-with-new-home-screen-widgets/)
- A design review of Monzo praises seeing spent vs left at a glance at the top of the screen. — [Yahoo/Monzo UI piece](https://tech.yahoo.com/apps/articles/why-monzos-ui-smashes-competition-090000769.html)
- A screensdesign.com article on budget dashboards exists but was not fetched. — [screensdesign](https://screensdesign.com/articles/budget-app-dashboard-design/)

### Inferences
- Recommended Home order [opinion]: (a) one hero number with a plain label (e.g. "Left this month" / balance), (b) "Recent" list: last 5 transactions grouped by day ("Today", "Yesterday", date), each row = category icon + merchant/note + signed amount + account, with "See all" to the ledger; (c) "Coming up" (next 3 recurring bills/loan payments) only if the data exists; (d) quick insight (one line, e.g. vs last month). Hide empty sections; show an explicit empty state with one action.
- Alternatives: 3 rows on small phones with "See all"; or today-only list; or day grouping with a daily total. Tap row = edit; swipe-to-delete should have undo.
- Effort: low (data already exists). Risk: low; ensure sort is by date then created time and that transfers/loan payments are labeled so they are not misread as spending.

### Gaps
- No usability study on what users want first; only product patterns. Local (Azerbaijan) priorities unvalidated - suggest a 5-user test.

## (4) All-time overview at top of Analytics

### Takeaway
No source examined directly; recommend a compact, collapsible summary (all-time income, spending, net, number of months/transactions, first record date), clearly separated from the period-selected charts.

### Cited Findings
- No cited findings for this item.

### Inferences
- Risk: mixing all-time totals with a selectable period confuses ("which numbers change when I switch month?"). Label with "All time since {date}" and keep it visually distinct and static; period controls sit below and only affect what is under them. Show averages per month (all-time) next to totals; exclude transfers and handle multi-currency separately. [opinion]
- Effort: low-medium. Risk: financial correctness (transfers, loans, debts must be excluded or shown separately); add tests with an independent expected result.

### Gaps
- No competitor evidence gathered (Copilot, YNAB, Spendee reports not examined).

## (5) Modernising the 6-month spending bar chart

### Takeaway
For ordered monthly data, vertical bars from zero are acceptable and honest; Datawrapper requires zero baselines for bars (lines may truncate). Accessibility needs a data table alternative and per-bar labels; Apple's own charts API exposes per-point accessibility and audio graphs.

### Cited Findings
- Bars should start at zero; for naturally ordered data such as months a line chart is the suggested alternative that may truncate the axis. — [Datawrapper](https://www.datawrapper.de/academy/why-our-column-and-bar-charts-start-at-zero); research on truncated bar exaggeration: [Correll et al.](https://arxiv.org/abs/1907.02035v2)
- Accessibility guidance: provide a real HTML data table linked from the chart, keep chart accessibility enabled too, offer a "show data as table" toggle, and give alt text that conveys the insight, not only chart type. — [Highcharts tables](https://www.highcharts.com/docs/accessibility/tables), [UF IFAS](https://blogs.ifas.ufl.edu/ifascomm/2024/07/19/tips-and-tricks-for-edis-authors-accessible-charts-and-graphs/), [Telerik](https://docs.telerik.com/kendo-ui/controls/charts/five-tips-for-accessible-charts-with-dataviz)
- Apple: chart = labeled container with one accessibility element per data point; audio graphs for VoiceOver; bar charts are discrete (isContinuous false). — [Apple audio graphs](https://developer.apple.com/documentation/accessibility/audio-graphs.md), [WWDC21 summary](https://a11y-guidelines.orange.com/en/mobile/ios/wwdc/2021/122/)
- A 2023 CHI study with 10 blind/low-vision screen-reader users (Chart Reader) found value in alternative navigation of chart components. — [Thompson et al. CHI 2023](https://homes.cs.washington.edu/~jessejm/data/ThompsonMartinezCHI2023.pdf)

### Inferences
- Recommended design [opinion; Few/Datawrapper small-multiples guidance not retrieved]: keep vertical bars, zero baseline, 6 months default with option 12 (horizontal scroll or toggle); highlight the selected/current month in the accent colour, others muted; mark the current month as partial (hatched or lighter + "so far" label) and do not compare it unadjusted against full months; add a dashed average line labelled with its value (average of complete months); show value labels only for selected bar (tap to select -> amount + delta vs average above the chart); tap bar = filter the list/category breakdown below to that month ("tap-to-drill"); no gridlines beyond 2-3 faint ones, no 3D, no gradients, no value labels on every bar on a 360 px screen. Year-over-year ghost bars only on 12-month view.
- Tap targets: bars are narrow at 6 bars it is fine (>= 40 px each on 360 px width); make the whole column (to chart top) tappable. Colour must not be the only cue (selected bar also gets an outline or label); contrast >= 3:1 for bars vs background.
- Accessibility: `role="img"` with summary label plus a visually hidden or toggleable `<table>` (Month, Spent, vs average); bars as buttons in a `role="group"`; arrow keys to move between months.
- Reduced motion: animate bar growth <= 300 ms only when motion allowed.
- Effort: medium (SVG or lightweight canvas; no heavy library needed offline). Risk: low-medium; partial-month logic and average must be tested.

### Gaps
- Stephen Few, Material charts and Apple Charts HIG pages themselves not retrieved; 6 vs 12 month evidence not found (opinion only).

## (6) The "one-off" label and recurring vs one-time wording

### Takeaway
Confirmed from this project's code: the "recurring"/"one-off" pill is NOT a user-set property. It is auto-derived per merchant, and "one-off" is the default for anything the detector does not classify as recurring, so it is shown even for merchants visited many times irregularly; that is misleading.

### Cited Findings
- Code evidence (page/app.js bundle, strings in i18n.js lines 714-715): a merchant's `isRecurring` comes from a pattern detector that returns not-recurring when the merchant has fewer than 3 transactions or irregular gaps; the UI shows `wc.recurring` (warn colour) if true, else `wc.oneOff` (muted), in a 9 px badge in a merchant list with a signed difference value. Current strings: en "recurring"/"one-off", az "təkrarlanan"/"birdəfəlik", ru "регулярный"/"разовый". — local files `page\app.js`, `i18n.js`
- No external source found specifically on labeling recurring vs one-time entries in finance apps.

### Inferences
- Problem: "one-off" asserts a fact the app does not know (a grocery store visited 20 times irregularly is not "one-off"); 9 px text is below comfortable readability; label appears on a comparison list where its meaning is unclear (recurring bill? one visit this period?). Also mixes the user's mental model (a bill I set up) with a statistical guess.
- Recommended options [opinion]:
  1. Show a badge only when positive evidence exists: "Repeats monthly" / "Repeats weekly" (detected) and nothing otherwise. Lowest confusion, no false "one-off". Preferred.
  2. Keep two states but name by evidence: "Regular" vs "Occasional"; "Seen once" for count = 1.
  3. Distinguish user intent from detection: "Scheduled" (user created recurring rule) vs "Looks regular" (detected, with tap to confirm -> converts to a rule; detected labels hedged).
- Wording drafts (EN / AZ / RU; AZ and RU are drafts needing native review):
  - "Repeats monthly" / "Hər ay təkrarlanır" / "Повторяется каждый месяц"
  - "Repeats weekly" / "Hər həftə təkrarlanır" / "Повторяется каждую неделю"
  - "Looks regular" / "Müntəzəm görünür" / "Похоже на регулярный"
  - "Occasional" / "Ara-sıra" / "Время от времени"
  - "Seen once" / "Bir dəfə olub" / "Был один раз"
  - "One-time" / "Birdəfəlik" (existing) / "Разовый" (existing); use only when the user marks an entry as one-time.
  - Info tooltip: "Based on how often you paid this place" / "Bu yerə nə qədər tez-tez ödəməyinizə əsasən" / "На основе того, как часто вы платили этому получателю".
- Effort: low (strings + conditional render, bump font >= 12 px). Risk: low; keep stored data untouched (display-only change).

### Gaps
- Could not verify how other apps (Monzo, YNAB, Copilot) label detected recurring items; native-speaker review of az/ru needed.
