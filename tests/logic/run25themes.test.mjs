// Run 25: colour themes from the owner's palettes. Contrast is computed here from the WCAG formula, independent of the app. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { THEMES, THEME_IDS, THEME_KEY, themeId, readTheme, writeTheme } = H;
reset();
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// The original look lives in the page's CSS, not in a theme; these are its documented values.
const SEA = { "--bg": "#07151A", "--bg-card": "#0E2229", "--bg-warm": "#153039", "--ink": "#F3F7F6", "--ink-2": "#D3DFDE", "--ink-3": "#A5B7B8", "--ink-4": "#93A7A8", "--accent-text": "#4CC9C4", "--accent-fill": "#4CC9C4", "--on-accent": "#07151A", "--pos": "#8BD97A", "--neg": "#FF8188", "--warn": "#F0C46F", "--info": "#83B9F5" };

section("R25-TH1. The themes");
ok(THEME_IDS.join("|") === "sea|nordic|mist|dusk|graphite|sand", "six themes: the original plus the five palettes (Sapphire and Cocoa were replaced by Graphite and Sand in Run 42)", THEME_IDS);
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
ok(themeId("sapphire") === "dusk" && themeId("cocoa") === "nordic", "a removed theme (saved earlier, or named in a backup) maps to its closest remaining one");
globalThis.__failKeys = ["__theme"]; ok(writeTheme("graphite") === false, "a storage failure is reported, not hidden"); globalThis.__failKeys = [];
section("R25-TH4. Income and expense colours stay apart for colour-blind users (simulated)");
{
  const lin = (hex) => [1, 3, 5].map((i) => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const M = { deut: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]], prot: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]] };
  const mul = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const lab = (l) => { const x = [0.4124 * l[0] + 0.3576 * l[1] + 0.1805 * l[2], 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2], 0.0193 * l[0] + 0.1192 * l[1] + 0.9505 * l[2]], w = [0.9505, 1, 1.089], f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); const [a, b, c] = x.map((v, i) => f(v / w[i])); return [116 * b - 16, 500 * (a - b), 200 * (b - c)]; };
  const dE = (p, q) => { const A = lab(p), B = lab(q); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  const gap = (id, kind) => { const v = { ...SEA, ...THEMES[id].vars }, p = lin(v["--pos"]), n = lin(v["--neg"]); return dE(mul(M[kind], p), mul(M[kind], n)); };
  const mist = { deut: gap("mist", "deut"), prot: gap("mist", "prot") };
  ok(mist.deut >= 25 && mist.prot >= 15, "mist: income and expense colours differ clearly under simulated red-green colour blindness", mist);
  ok(THEME_IDS.every((id) => gap(id, "deut") >= 13 && gap(id, "prot") >= 13), "no theme is worse than the measured baseline (13) for either kind; the +/- signs always remain", THEME_IDS.map((id) => [id, gap(id, "deut").toFixed(1), gap(id, "prot").toFixed(1)]));
}
finish("run25themes");
