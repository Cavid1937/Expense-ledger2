# Performance measurement — first pass (6 Nov 2026), measurement only

No source, test, commit or deployment changed. Script: `perf-trace.mjs` (scratchpad, read-only use of the repo's browser-test helpers); raw results: `perf-out.json` (scratchpad). Build measured: working tree on top of `3c98ab3` (includes the two uncommitted phone fixes and the unrequested selection feature; none touches rendering cost of these screens, but this is not byte-identical to the live bundle).

## What was measured, and the limits
- Desktop Chrome (headless) at 360×780, **CPU slowed 1×, 4×, 6×** to imitate weaker phones. **This is an approximation. The Poco F6 was NOT measured**, and no low-end phone was measured. Slowdown factors are not phone speeds.
- Synthetic data only: **300 transactions over 80 days**, 5 categories, one income. A user after a year of use would have more.
- Metrics: frame gaps (requestAnimationFrame), and "long tasks" (the page frozen for more than 50 ms). A frozen page records few frames, so **long tasks are the more reliable number** than frame gaps here.
- Repeats: each tab switch 3×, Add open/record 3×, scroll 2×, sub-page 3×. Small sample; use for direction, not precision.

## Results

Longest freeze (ms) during each action; "janky frames" = gaps over 50 ms.

| Action | 1× (desktop) | 4× slower | 6× slower |
|---|---|---|---|
| Open Transactions tab | **121** | **1,924** | **3,139** |
| Open Analytics tab | 67 | 1,173 | 1,447 |
| Open Goals | 0 (one 133 ms frame) | 296 | 315 |
| Open More | 0 | 493 | 738 |
| Back to Home | 0 | 519 | 335 |
| Open Add sheet | 55 | 293 | 517 |
| Type + record entry | 0 | 391 | 224 (38 frames over 25 ms) |
| Scroll 22,270 px list | **0 janky frames, smooth** | 311 (5 janky) | 1,348 (30 janky) |
| Open sub-page (Import/Export) | 0 (one 50 ms frame) | 280 | 334 |

## What it says (confirmed vs hypothesis)

1. **Confirmed (measured):** at normal desktop speed the app is smooth: nearly every frame is on time, scrolling the long list is clean.
2. **Confirmed (measured):** the **Transactions and Analytics tabs are the expensive screens.** Opening Transactions froze the page for 121 ms at 1× and about 2–3 s under 4–6× slowdown with 300 entries. The list's scroll height was 22,270 px for 300 rows, which indicates every row is drawn at once (no windowing). I did not count DOM nodes separately, so "all rows rendered" is INSP-by-measurement, not proven.
3. **Likely (not proven):** on the Poco F6 (much faster than the 4×/6× settings) the Transactions tab with 300 rows will feel like a slight pause on opening; with a year of data it will grow roughly in proportion to rows. A low-end phone would feel a visible freeze. Nothing in this measurement says how many rows a real user will have.
4. **Confirmed:** a second-order effect: any entrance animation that starts while the page is frozen (the tab fade/slide) is partly lost, because the browser cannot paint it. That is why "smoother animation" will not help on those screens until the screen's own cost is reduced.
5. **Not measured:** animation cost of the specific effects in the experience backlog (they do not exist yet), colour-theme switch, charts under touch, memory use, startup time, the Android WebView (different engine version from desktop Chrome), battery.

## Consequences for the Experience backlog
- **E13 (performance budget) gets a first concrete finding**, which I rank above the cosmetic items: *reduce the cost of opening Transactions and Analytics*. Candidate approaches, each to be tested: render the first ~40 rows and the rest on scroll or "Show more" (simplest, low risk), CSS `content-visibility:auto` on rows (cheap, but changes scroll-height behaviour and must be tested with select mode and filters), or defer chart computation until after the first paint. Which is best needs the device recording first.
- **E1, E2, E7 (arrival, number tween, row collapse) must stay conditional** on those screens being cheap, otherwise they will stutter exactly where they matter.
- Money and data are not affected by any of this; nothing here changes calculations.

## What would make this measurement trustworthy
1. Run the same script, or an equivalent trace, **on the Poco F6** (Chrome remote debugging over USB for the installed debug app) — needs your phone connected to this computer once, or your screen recording (E0) as a cruder substitute.
2. Repeat with realistic volumes (1,000 and 3,000 entries) and report time-to-first-paint of each tab rather than only freezes.
3. Repeat on the exact live bundle after the next gate.
