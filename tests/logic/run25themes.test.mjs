// Run 25: colour themes from the owner's palettes. Contrast is computed here from the WCAG formula, independent of the app. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { THEMES, THEME_IDS, THEME_KEY, themeId, readTheme, writeTheme } = H;
reset();
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// The original look lives in the page's CSS, not in a theme; these are its documented values.
const SEA = { "--bg": "#07151A", "--bg-card": "#0E2229", "--bg-warm": "#153039", "--ink": "#F3F7F6", "--ink-2": "#D3DFDE", "--ink-3": "#A5B7B8", "--ink-4": "#93A7A8", "--accent-text": "#4CC9C4", "--accent-fill": "#4CC9C4", "--on-accent": "#07151A", "--pos": "#8BD97A", "--neg": "#FF8188", "--warn": "#F0C46F", "--info": "#83B9F5" };

section("R25-TH1. The themes");
ok(THEME_IDS.join("|") === "sea|nordic|mist|dusk|sapphire|cocoa", "six themes: the original plus the five palettes", THEME_IDS);
ok(Object.keys(THEMES.sea.vars).length === 0, "the original look has no overrides");
ok(THEME_IDS.slice(1).every((id) => /^#[0-9A-F]{6}$/i.test(THEMES[id].vars["--bg"]) && /^#[0-9A-F]{6}$/i.test(THEMES[id].vars["--accent-fill"])), "every other theme sets a background and an accent as 6-digit colours");
ok(new Set(THEME_IDS.slice(1).map((id) => Object.keys(THEMES[id].vars).sort().join())).size === 1, "every theme sets the same list of variables (none forgotten)");

section("R25-TH2. Readable on every theme (WCAG 4.5:1 for text)");
for (const id of THEME_IDS) {
  const v = { ...SEA, ...THEMES[id].vars }, surfaces = ["--bg", "--bg-card", "--bg-warm"], texts = ["--ink", "--ink-2", "--ink-3", "--ink-4", "--accent-text", "--pos", "--neg", "--warn", "--info"];
  const bad = [];
  for (const s of surfaces) for (const tx of texts) { const r = ratio(v[tx], v[s]); if (r < 4.5) bad.push(`${tx} on ${s}: ${r.toFixed(2)}`); }
  const onAcc = ratio(v["--on-accent"], v["--accent-fill"]); if (onAcc < 4.5) bad.push(`on-accent on fill: ${onAcc.toFixed(2)}`);
  ok(bad.length === 0, `${id}: all text colours reach 4.5:1 on every surface, and text on filled buttons too`, bad);
}

section("R25-TH3. The choice is a plain preference");
ok(readTheme() === "sea", "nothing saved: the original look");
ok(writeTheme("dusk") && readTheme() === "dusk" && localStorage.getItem(THEME_KEY) === "dusk", "saving dusk stores just its id");
ok(themeId("nope") === "sea" && themeId(undefined) === "sea" && themeId("__proto__") === "sea" && themeId("constructor") === "sea", "unknown or hostile values fall back to the original look");
localStorage.setItem(THEME_KEY, "junk"); ok(readTheme() === "sea", "a damaged saved value reads as the original look");
writeTheme("sea"); ok(localStorage.getItem(THEME_KEY) === null, "choosing the original look removes the key");
globalThis.__failKeys = ["__theme"]; ok(writeTheme("cocoa") === false, "a storage failure is reported, not hidden"); globalThis.__failKeys = [];
finish("run25themes");
