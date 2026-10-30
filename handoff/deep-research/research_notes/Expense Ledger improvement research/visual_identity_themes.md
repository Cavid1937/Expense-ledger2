# Visual identity, icon system, palette and theming for Expense Ledger (PWA)

Research depth note: about 17 tool calls; several pages returned only partial summaries. Items marked (opinion) or (unsourced) are my judgement, not cited evidence.

## (a) Icon set, logo and app icon

### Takeaway
Use a permissively licensed library (Lucide ISC, Tabler MIT, Phosphor MIT) via per-icon imports, and draw only a handful of bespoke icons (logo plus a few finance-specific ones) on the same grid and stroke. Maskable icon: keep artwork inside the central circle (radius 40% of width), opaque background.

### Cited Findings
- Lucide is released under the ISC licence and is tree-shakable: only imported icons are in the bundle. Each icon is a React component rendering inline SVG. — [Lucide React guide](https://lucide.dev/guide/packages/lucide-react)
- Phosphor Icons repo licence is MIT (copyright Phosphor Icons, 2020). — [Phosphor LICENSE](https://raw.githubusercontent.com/phosphor-icons/homepage/master/LICENSE)
- Tabler Icons licence is MIT (Pawel Kuna, 2020-2026). — [Tabler LICENSE](https://raw.githubusercontent.com/tabler/tabler-icons/main/LICENSE)
- Google material-design-icons repo licence is Apache 2.0 (a third-party listing said MIT for Material Symbols, so use the upstream repo file as authoritative). — [Material icons LICENSE](https://raw.githubusercontent.com/google/material-design-icons/master/LICENSE); conflicting aggregator: [Composables](https://composables.com/icons/icon-libraries/phosphor)
- Maskable icons: keep key content within a circle in the centre with radius 40% of icon width; the outer ~10% may be cropped; icon should be opaque with padding; do not combine purposes ("any maskable") per web.dev advice; test with DevTools "Show only the minimum safe area". — [web.dev maskable icon](https://web.dev/articles/maskable-icon)
- Chromium installability needs at least 192x192 and 512x512 icons; `purpose` "any maskable" makes adaptive icons on Android; SVG icons are allowed but include a raster fallback. — [web.dev add-manifest](https://web.dev/articles/add-manifest)
- Monzo users found a dark app icon confusing until an update; icon variants have user-visible effects. — [Monzo community](https://community.monzo.com/t/monzo-icon-changed-to-white-2/174018)

### Inferences
- Icons in the bundle cost roughly the SVG path data of those used icons only (a few hundred bytes each, unsourced estimate), so 40-60 icons is likely tens of KB at most; confirm with a build analysis.
- Two separate manifest entries are safest: one `any` (transparent/rounded logo) and one `maskable` (full-bleed background colour).
- Custom drawing guidelines (opinion, matches how Lucide/Tabler work, not verified from their docs this session): 24x24 grid, 2px stroke (or 1.5), round caps/joins, 2px padding; draw the bespoke set to match the chosen library so mixed sets don't look inconsistent.

### Gaps
- Did not retrieve Lucide/Tabler official design-guideline pages (stroke width, keylines), nor measured bundle sizes.
- Did not verify Phosphor/Tabler official React package tree-shaking docs.

## (b) Palette for light and dark; contrast and colour-blind safety

### Takeaway
Define semantic tokens (surface, text, accent, income, expense, warning) with tested contrast; derive dark from tonal values, not inversion. Text 4.5:1 (3:1 large), non-text/UI/chart elements 3:1.

### Cited Findings
- WCAG 2.2 SC 1.4.11: UI components and graphical objects needed to understand content need 3:1 against adjacent colours; logos/flags exempt; ratios not rounded. — [W3C Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- NN/g (citing WCAG): 4.5:1 for normal text and 3:1 for large text; highly saturated colours have poor visibility on dark backgrounds; pure white on pure black thin fonts get "swallowed"; light-on-dark looks bolder; use darkest colours at lowest layers and lighter for raised surfaces. — [NN/g dark mode](https://nngroup.com/articles/dark-mode-users-issues)
- `color-scheme: light dark` plus `<meta name="color-scheme">` makes browser UI (scrollbars, form controls, canvas) follow the scheme and avoids load flash; content must be styled with `prefers-color-scheme` or `light-dark()`. — [MDN color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)
- `theme_color` can vary by scheme only through the `media` attribute on the `<meta>` tag, not in the manifest; `background_color` is used for the launch splash and should match page load colour. — [web.dev add-manifest](https://web.dev/articles/add-manifest)
- Okabe-Ito palette has 8 colours (orange, sky blue, bluish green, yellow, blue, vermillion, reddish purple, black); beyond that combine with shape/pattern. — [search summary on Okabe-Ito](https://rdrr.io/cran/factoextra/man/factoextra_palette.html)
- Paul Tol qualitative schemes: bright 7, vibrant 7, muted 9, light 9 colours; qualitative schemes are not to be interpolated. A claim of a "12 colour" Tol scheme was found only on a low-quality page and is NOT confirmed. — [khroma Tol vignette](https://www.stats.bris.ac.uk/R/web/packages/khroma/vignettes/tol.html)
- Material Design 3 builds schemes from tonal palettes (page content not retrievable here). — [M3 colour system](https://m3.material.io/styles/color/system/how-the-system-works)

### Inferences
- Since no verified colour-blind-safe scheme exceeds ~9 colours, 12-15 categories must be distinguished by icon (and label), not colour alone; this also satisfies WCAG "not colour alone" (opinion; 1.4.1 not fetched).
- Practical: Muted (9) plus 3-6 extra hues, each paired with a unique icon; group minor categories.
- Retrofit cost for an app already on CSS variables (opinion): 1-2 days to add a dark token set for the existing variables, plus per-screen visual QA and fixing hard-coded colours (charts, SVG fills, inline styles are the usual leaks).

### Gaps
- No computed contrast results; actual palette hex values must be chosen and validated with a checker.
- WCAG 1.4.3 and 1.4.1 pages not fetched directly (text ratios come via NN/g).

## (c) Is dark theme worth doing now?

### Takeaway
Moderately yes, but as "follow the system setting" (auto), not a bespoke feature. Evidence says users mostly expect OS-level behaviour; absence is rarely a reason to leave, but peers (Monzo, Kapital Bank/Birbank) now offer it.

### Cited Findings
- NN/g survey of 115 mobile users: about a third dark, a third light, a third mixed; reasons were battery and looks. Users think of dark mode at OS level; study authors "would be surprised" to see users abandon a design for lacking dark mode; recommend mirroring the device setting by default, in-app switch optional; prioritise dark mode for long, frequent, low-light use. — [NN/g](https://nngroup.com/articles/dark-mode-users-issues) (search summary: [WebSearch result](https://nngroup.com/articles/dark-mode-users-issues))
- Monzo offers dark mode (iOS 13+/Android 10+), and shipped high-contrast themes for light and dark. — [Monzo help](https://monzo.com/help/app-help/switch-on-dark-mode-web/); [Monzo community](https://community.monzo.com/t/now-in-labs-high-contrast-themes/152056)
- YNAB announced a theme picker, new default theme and dark mode. — [YNAB blog](https://www.ynab.com/the-new-design-is-rad-ynab-theme-updates)
- Birbank (Kapital Bank, Azerbaijan) listing says dark mode was a "highly appreciated enhancement"; a user comment dates it to version 2.78.0 on 19.05.2026 (user claim, not official). — [mwm.ai Birbank](https://mwm.ai/apps/birbank/1293207342)
- Revolut users asked for night mode on the community; current Revolut app theme status uncertain. — [Revolut community](https://community.revolut.com/t/night-mode-or-old-blue-screen/51032)

### Inferences
- Because tokens already exist as CSS variables, an automatic dark theme is the cheapest "table-stakes" parity step; a manual 3-way toggle (system/light/dark) costs a few more hours and respects accessibility users.
- Widely quoted "75% prefer dark mode" figures come from untraceable vendor blogs; ignore.

### Gaps
- No finance-specific dark-mode review analysis (store review mining not possible with these tools). ABB Mobile dark-mode status not found. Wallet by BudgetBakers, Spendee, Money Manager palette/theme practices not researched (searches did not surface them).

## (d) Fully selectable themes: feasibility, cost, retention

### Takeaway
Recommend NO for multiple decorative themes now; do light + dark (+ maybe a high-contrast variant later). Cost multiplies by theme count and no evidence shows themes drive retention or revenue in finance apps.

### Cited Findings
- Search found no rigorous study of cosmetic themes or paid themes affecting retention in finance apps; claims came from vendor/analyst blogs (e.g. a 74% engagement lift attributed secondhand to Statista/Gartner, unverified). Too many options may cause decision fatigue. — [EMB guide](https://blog.emb.global/ultimate-guide-to-app-customization); [ScreensDesign ThemeKit](https://screensdesign.com/showcase/themekit-widget-icon-themes)
- Precedent: YNAB (theme picker) and Monzo (high-contrast light/dark) do ship multiple themes, but their motivations are accessibility and brand, not shown retention. — [YNAB](https://www.ynab.com/the-new-design-is-rad-ynab-theme-updates); [Monzo community](https://community.monzo.com/t/now-in-labs-high-contrast-themes/152056)

### Inferences (opinion, from design-token logic)
- With semantic tokens, adding a theme is mostly data (about 30-40 values), but each theme needs contrast verification and visual regression across every screen: N themes x M screens x languages (az/ru strings are longer). A small automated contrast check of token pairs per theme is cheap (hours); screenshot review is the real cost.
- Estimated effort: dark theme 1-3 days incl. QA; each extra full theme 0.5-1 day plus ongoing regression; I have no sourced figures for these hours.
- Revenue: nothing supports themes as monetisation for a free, local-first finance app.

### Gaps
- No A/B or cohort data; no evidence for Azerbaijan market.

## (e) Category colours/icons and PWA platform assets

### Takeaway
Pair every category with a distinct icon and label; colour is a secondary cue. For iOS provide a 180x180 opaque apple-touch-icon; splash images optional.

### Cited Findings
- iOS: 180x180 PNG apple-touch-icon commonly recommended; iOS rounds corners; transparent areas render black, so use opaque icon. Splash uses `apple-touch-startup-image` links with media queries per device; may not refresh until reinstall; generators such as pwa-asset-generator exist. These come from blogs/gists, not Apple docs. — [Netguru PWA iOS](https://www.netguru.com/codestories/pwa-ios); [Evan Bacon gist](https://gist.github.com/EvanBacon/7fd4dc3be3d00096579bb0b134c56ec7)
- Chrome builds the Android splash from manifest `name`, `background_color` and icon automatically. — [web.dev add-manifest](https://web.dev/articles/add-manifest)

### Inferences
- Skipping iOS splash images is acceptable: only a plain background shows; match `background_color` to the app surface (opinion). Launch with dark system theme may flash light unless the dark `theme-color` meta and early `color-scheme` are set.

### Gaps
- Apple Human Interface Guidelines and Apple developer docs not fetched; iOS splash size matrix not verified against Apple. Maskable/adaptive offline behaviour is fine since icons are static files precached by the service worker (opinion).

## Cultural/market notes (Azerbaijan)

### Takeaway
Unknown. No reliable evidence found on colour preferences or flag-colour usage in Azerbaijani finance apps.

### Cited Findings
- Only incidental finding: Birbank (Kapital Bank) added dark mode (see above). Competitor palettes were not retrieved.

### Gaps
- Colour associations, flag colour (blue/red/green) usage norms and local preference: no sources found; recommend a quick check of 3-4 local bank apps' screenshots and a short user question rather than assumptions. Avoid using red/green alone for expense/income (colour-blind rule, plus red/green flag-colour semantics are unverified).

## Recommended minimal plan (opinion, labelled)
1. Icons (4-8 h): adopt Lucide (ISC) or Tabler (MIT) with per-icon imports; check bundle with a build visualizer; draw logo and 3-5 bespoke icons on the same 24px grid/stroke. Risk: inconsistent mixed styles.
2. App icon (2-3 h): 512 maskable + 512/192 any + 180 apple-touch; verify in DevTools safe-area view.
3. Tokens and dark (1-3 days): audit hard-coded colours, add dark tokens (tonal, desaturated accents, raised surfaces lighter), `color-scheme: light dark`, theme-color metas per scheme, 3-way setting (system/light/dark). Add automated contrast test of token pairs (4.5:1 text, 3:1 UI/chart).
4. Categories (4-6 h): 9-colour Tol-muted-based set + unique icons; max ~12-15 categories with colour reuse allowed only because icons/labels disambiguate.
5. Defer: multiple decorative themes; iOS splash images; revisit after user feedback.
Risks: contrast regressions in charts and third-party widgets, dark flash at startup, az/ru text overflow in new components, untested real-device installation.
