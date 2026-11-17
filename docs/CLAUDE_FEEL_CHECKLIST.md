# Claude-app feel: checklist for every new or changed screen

Written 17 Nov 2026 (Run 105) because the owner said: "You keep forgetting every time to apply Claude app feel to new added features."
Sources: the owner's recordings of the Claude Android app (`design-refs/claude-app-feel/`, measured notes in Claude's memory file
`reference-claude-app-feel-videos`) and the owner's 14 Nov "does your app feel native" video (6 thumb tests).

Tick every line before a feature is called done. A line that does not apply says why in the run report.

## Motion
- [ ] Sheets rise in about 0.3 s, fast start, soft landing, no bounce; they leave with the shared 0.2 s fall (`PickSheet` / `useLeave`).
- [ ] A choice lights up at once (selected state + check), then the sheet closes about 0.14 s later (`close(PICK_SHOW_MS)`).
- [ ] Nothing appears or disappears with a jump: rows and blocks open and close with `Collapse`, content swaps with `EditSwap` / `Swap`.
- [ ] Pages: forward slides in from the right, back slides out; swipe-back from the left edge follows the finger.
- [ ] `prefers-reduced-motion` and the app's "reduce effects" setting turn movement off and keep the result.

## Touch
- [ ] Buttons react when the finger lands (`:active` / press state), not when it lifts.
- [ ] Every tap target is at least 44 px, using an invisible larger touch area where the visible icon is smaller (`::after` inset).
- [ ] Anything dragged (sheet, wheel, swipe) follows the finger and settles by itself.
- [ ] Haptic tick only when something actually changes (a new value, a saved item), never on opening or on a tap that changes nothing.
- [ ] Android back closes the top sheet first (sheets are `.sheet-overlay` so `closeTopLayer` finds them).

## Layers and calm
- [ ] New information arrives as a notice (bell or bottom bar), and the person decides; nothing big opens on its own.
- [ ] Undo is offered for every change that removes or merges data, in the bottom bar, and a second bar never hides it.
- [ ] Empty state: one line drawing, one sentence, one button. Loading: quiet placeholder, never a blank jump.
- [ ] Long explanations sit behind an (i) tip (`TipHead`); the screen shows one short line. Consent and money-meaning text stays visible.

## Words and languages
- [ ] Every new text is in en, az and ru, checked on screen in all three (no English left in az/ru).
- [ ] A figure says what it is ("spent ...", "left ..."), next to the thing it describes; the same comparison is not repeated on one screen.

## Proof
- [ ] A browser test drives the real flow (open, choose, undo / cancel, reload) and checks storage, not only the screen.
- [ ] A screenshot at 390 px (and 320 px for long az/ru words) is looked at before reporting.

## Automatic guard (Run 106)

	ests/browser/e2e_run106_motion.mjs presses every opener on the five tabs (`aria-expanded="false"` or `data-section` ending in `-open`) and fails if one changes the page with no running animation. Give every new unfolding control `aria-expanded` so the guard sees it; use `Collapse` for the panel and `revealFocus` (ref callback) instead of `autoFocus`.
