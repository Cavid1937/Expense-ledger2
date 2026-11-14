// Run 70: the owner's three-theme brief (Graphite, Ivory, refined Sea glass). Contrast is computed here from the WCAG formula,
// independent of the app. Synthetic data only; the theme key is a preference, never the ledger.
import fs from "fs";
import { H, ok, section, finish, reset } from "./lib.mjs";
const { THEMES, THEME_IDS, THEME_KEY, THEME_AUTO_KEY, themeFallback, settleTheme, themeIsAuto, readTheme, writeTheme, themePreview, cleanPrefs, mixHex } = H;
reset();
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

section("R70-1. The three main looks, with the owner's colours");
// Run 84: no "main" group any more; every theme is an equal choice (checked in run25themes). The three owner palettes keep their colours.
const THEME_MAIN = ["ivory", "graphite", "sea"];
const G = THEMES.graphite.vars, I = THEMES.ivory.vars, S = THEMES.sea.vars;
ok(G["--bg"] === "#101419" && G["--bg-card"] === "#171E24" && G["--bg-warm"] === "#202A32" && G["--bg-inset"] === "#29343D" && G["--ink"] === "#EDF1F3" && G["--ink-3"] === "#A5B0B8" && G["--accent-text"] === "#8FA9BF", "Graphite: the owner's surfaces, text and subtle accent");
ok(I["--bg"] === "#F3F1EB" && I["--bg-card"] === "#F9F8F4" && I["--bg-warm"] === "#FFFFFF" && I["--bg-inset"] === "#EAE8E1" && I["--ink"] === "#252B2F" && I["--accent-fill"] === "#496A83", "Ivory: the owner's surfaces, text and accent; the page itself is not pure white");
ok(S["--bg"] === "#101B1B" && S["--bg-card"] === "#192625" && S["--bg-warm"] === "#243432" && S["--bg-inset"] === "#2D3D3A" && S["--ink"] === "#E9F0ED" && S["--ink-3"] === "#A6B8B0" && S["--accent"] === "#6D9C91" && S["--accent-mid"] === "#B0C7BE", "Sea glass: the owner's charcoal-green surfaces and sea-glass accents");
ok(THEMES.graphite.dark && !THEMES.ivory.dark && THEMES.sea.dark, "Graphite and Sea glass are dark, Ivory is light");
// "less green": the refined Sea glass surfaces are much closer to grey than the original look's
const sat = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return (Math.max(...c) - Math.min(...c)) / Math.max(...c); };
ok(sat(S["--bg-card"]) < sat("#0E2229") * 0.6 && sat(S["--bg"]) < sat("#07151A") * 0.6, "Sea glass cards and page are far less saturated than the original look", [sat(S["--bg-card"]).toFixed(2), sat("#0E2229").toFixed(2)]);

section("R70-2. Measured contrast on every surface, inputs included");
for (const id of THEME_MAIN) {
  const v = THEMES[id].vars, bad = [];
  for (const s of ["--bg", "--bg-card", "--bg-warm", "--bg-inset"]) for (const tx of ["--ink", "--ink-2", "--ink-3", "--ink-4", "--accent-text", "--pos", "--neg", "--warn", "--info"]) { const r = ratio(v[tx], v[s]); if (r < 4.5) bad.push(`${tx} on ${s}: ${r.toFixed(2)}`); }
  ok(bad.length === 0, `${id}: every text colour reaches 4.5:1 on page, card, raised card and input field`, bad);
  ok(ratio(v["--on-accent"], v["--accent-fill"]) >= 4.5, `${id}: button text on the button ${ratio(v["--on-accent"], v["--accent-fill"]).toFixed(2)}:1`);
  ok(ratio(v["--accent-fill"], v["--bg"]) >= 3 && ratio(v["--accent-fill"], v["--bg-card"]) >= 3, `${id}: a filled button stands out from page and card (3:1): ${ratio(v["--accent-fill"], v["--bg"]).toFixed(2)} / ${ratio(v["--accent-fill"], v["--bg-card"]).toFixed(2)}`);
  ok(ratio(v["--rule-2"], v["--bg-card"]) >= 3 && ratio(v["--rule-2"], v["--bg"]) >= 3, `${id}: control borders reach 3:1 on cards and page: ${ratio(v["--rule-2"], v["--bg-card"]).toFixed(2)} / ${ratio(v["--rule-2"], v["--bg"]).toFixed(2)}`);
}
ok(ratio(S["--accent"], S["--bg-warm"]) < 4.5 && S["--accent-text"] !== S["--accent"], "Sea glass: #6D9C91 is too faint for text on raised cards, so text uses a lighter accent");
ok(ratio(S["--on-accent"], S["--accent"]) < 4.5 && S["--accent-fill"] !== S["--accent"], "Sea glass: pale text on #6D9C91 would fail, so buttons use the darker action green");

for (const id of THEME_MAIN) { const v = THEMES[id].vars, s3 = mixHex(v["--ink-3"], v["--ink"], 0.4), r2 = mixHex(v["--rule-2"], v["--ink"], 0.35); ok(ratio(s3, v["--bg-card"]) > ratio(v["--ink-3"], v["--bg-card"]) + 0.5 && ratio(s3, v["--bg-inset"]) >= 6 && ratio(r2, v["--bg-card"]) > ratio(v["--rule-2"], v["--bg-card"]) + 0.5, `${id}: the phone's "more contrast" setting gives clearly stronger secondary text (${ratio(s3, v["--bg-card"]).toFixed(2)}:1) and borders (${ratio(r2, v["--bg-card"]).toFixed(2)}:1)`); }

section("R70-3. Money colours keep their meaning in every theme");
for (const id of THEME_MAIN) { const v = THEMES[id].vars; ok(v["--pos"] !== v["--accent-fill"] && v["--neg"] !== v["--accent-fill"] && v["--pos"] !== v["--neg"] && v["--warn"] !== v["--neg"], `${id}: income, spending and warning colours are their own, not the theme accent`); }
ok(I["--pos"] === "#1B6B3A" && I["--neg"] === "#A8360A" && G["--pos"] === "#8BD97A" && G["--neg"] === "#FF8188", "the same green and red family as the other light and dark themes");

section("R84-4. Defaults (Run 84): Ivory everywhere nothing was chosen; a theme the app picked earlier moves to Ivory; a person's choice is kept");
reset(); localStorage.clear();
ok(themeFallback() === "ivory" && readTheme() === "ivory", "a fresh install (nothing stored) shows Ivory");
localStorage.setItem("expense_ledger_v5", "{}");
ok(themeFallback() === "ivory" && readTheme() === "ivory", "a phone with ledger data and no saved theme also shows Ivory");
localStorage.clear(); settleTheme();
ok(localStorage.getItem(THEME_KEY) === "ivory" && localStorage.getItem(THEME_AUTO_KEY) === "1" && themeIsAuto(), "on start a fresh phone writes Ivory down once, marked as picked by the app");
localStorage.clear(); localStorage.setItem(THEME_KEY, "sea"); localStorage.setItem(THEME_AUTO_KEY, "1"); localStorage.setItem("expense_ledger_v5", "{}"); settleTheme();
ok(localStorage.getItem(THEME_KEY) === "ivory" && readTheme() === "ivory", "Sea glass that the app picked by itself (Run 70) moves to Ivory");
localStorage.setItem(THEME_KEY, "graphite"); localStorage.setItem(THEME_AUTO_KEY, "1"); settleTheme();
ok(readTheme() === "ivory", "so does Graphite that the app picked by itself");
localStorage.removeItem(THEME_AUTO_KEY); localStorage.setItem(THEME_KEY, "caspian"); settleTheme();
ok(localStorage.getItem(THEME_KEY) === "ivory", "a saved Caspian (now removed) is rewritten as Ivory");
localStorage.setItem(THEME_KEY, "sea"); settleTheme(); ok(readTheme() === "sea", "Sea glass that the person chose is kept");
ok(writeTheme("ivory") && localStorage.getItem(THEME_KEY) === "ivory" && localStorage.getItem(THEME_AUTO_KEY) === null && !themeIsAuto(), "the person's own choice is stored by name and is no longer 'picked by the app'");
settleTheme(); ok(localStorage.getItem(THEME_KEY) === "ivory", "starting again never overwrites a saved choice");
localStorage.setItem(THEME_KEY, "dusk"); settleTheme(); ok(readTheme() === "dusk", "an earlier saved choice (dusk) still works");
localStorage.setItem(THEME_KEY, "sapphire"); ok(readTheme() === "dusk", "a removed theme saved long ago still maps to its closest one");
ok(localStorage.getItem("expense_ledger_v5") === "{}", "the ledger key itself is never touched by any of this");

section("R70-5. Backups carry the theme by name, any theme");
ok(cleanPrefs({ theme: "sea" }).theme === "sea" && cleanPrefs({ theme: "ivory" }).theme === "ivory" && cleanPrefs({ theme: "caspian" }).theme === "ivory", "Sea glass and Ivory are kept in a backup's settings; the removed Caspian becomes Ivory");
ok(cleanPrefs({ theme: "cocoa" }).theme === "nordic" && cleanPrefs({ theme: "junk" }).theme === undefined && cleanPrefs({ theme: "__proto__" }).theme === undefined, "removed names map to their closest; unknown or hostile names are dropped");

section("R70-6. Previews, category colours and the first paint");
ok(THEME_IDS.every((id) => { const p = themePreview(id); return [p.bg, p.card, p.ink, p.fill, p.pos, p.neg].every((c) => /^#[0-9A-F]{6}$/i.test(c)); }), "every theme has a complete preview");
ok(themePreview("ivory").bg === "#F3F1EB" && themePreview("graphite").bg === "#101419", "previews are drawn in each theme's own page colour");
const app = fs.readFileSync(new URL("../../App.jsx", import.meta.url), "utf8");
ok(app.includes("export function catInk(c) { return c ? `color-mix(in oklab, ${c}, #000 var(--cat-shade, 0%))` : \"var(--ink-3)\"; }") && /color=\{catInk\(color\|\|cat\?\.color/.test(app), "category icons go through one shading rule (darker only where the stylesheet asks, on light themes)");
const css = fs.readFileSync(new URL("../../styles.js", import.meta.url), "utf8");
ok(/:root\[data-scheme="light"\]\{--cat-shade:\d+%;/.test(css) && !/data-theme="mist"/.test(css), "light-theme depth and shading follow light/dark, not theme names (so Ivory gets them)");
ok(!/76,201,196/.test(css), "no original-look teal is left hard-coded in the stylesheet");
const html = fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const map = JSON.parse(((html.match(/var b=(\{[^}]+\})/) || [])[1] || "{}").replace(/(\w+):/g, '"$1":'));
ok(THEME_IDS.every((id) => map[id] === themePreview(id).bg) && map.caspian === "#F3F1EB" && /\|\|"#F3F1EB"/.test(html), "the page's first paint uses each saved theme's own background, Ivory when none is saved (or a removed Caspian)", map);
ok(/<meta name="theme-color" content="#F3F1EB"/.test(html) && /--bg:#F3F1EB;/.test(css) && !/#07151A/.test(css.split("@font-face").join("").slice(0, 3000)), "before any script runs the page is Ivory (stylesheet base and the phone's bar colour)");
const man = JSON.parse(fs.readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8"));
ok(man.background_color === "#F3F1EB" && man.theme_color === "#F3F1EB", "the installed app's splash and bar colours are Ivory", man);
finish("run70themes");
