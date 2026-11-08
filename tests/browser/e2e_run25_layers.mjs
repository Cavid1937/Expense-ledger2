// Run 25: layering. Surface levels are ordered and readable in every theme; Reduce effects works and is remembered. Synthetic data only.
import { launch, openPage, openSettings, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const seed = baseSeed({ language: "en", transactions: [tx({ id: 1790001000001, merchant: "Shop", amount: 12 })] });
const THEMES = ["sea", "nordic", "mist", "dusk", "graphite", "sand"];

// Reads the real, resolved colours (color-mix included) by painting them onto a canvas pixel.
const probe = (page) => page.evaluate(() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgb = (css) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = css; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
  const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const out = {}; for (const n of ["--bg", "--bg-card", "--surface-sunken", "--surface-raised", "--surface-float", "--ink-3", "--ink-4"]) out[n] = rgb(v(n));
  return out;
});
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

section("R25-LY1. Five opaque levels, ordered and readable, in all six themes");
for (const id of THEMES) {
  const page = await openPage(browser, { seed }); await settle(page);
  await page.evaluate((id) => localStorage.setItem("expense_ledger_v5__theme", id), id); await page.reload(); await settle(page); await wait(300);
  const c = await probe(page);
  const L = (k) => lum(c[k]);
  ok(L("--surface-sunken") < L("--bg-card") && L("--bg-card") < L("--surface-raised") && L("--surface-raised") < L("--surface-float"), `${id}: sunken < card < raised < floating`, { s: L("--surface-sunken"), c: L("--bg-card"), r: L("--surface-raised"), f: L("--surface-float") });
  ok(ratio(c["--surface-float"], c["--bg-card"]) >= 1.05, `${id}: a floating layer is visibly different from a card`, ratio(c["--surface-float"], c["--bg-card"]));
  const worst = Math.min(...["--surface-sunken", "--surface-raised", "--surface-float"].flatMap((s) => ["--ink-3", "--ink-4"].map((t) => ratio(c[t], c[s]))));
  ok(worst >= 4.5, `${id}: secondary text stays at 4.5:1 or better on every layer`, worst);
  await page.close();
}

section("R25-LY2. Bars are solid (no blur) and Reduce effects works and is remembered");
{
  const page = await openPage(browser, { seed }); await settle(page); await wait(300);
  ok(await page.evaluate(() => ["backdropFilter", "webkitBackdropFilter"].every((p) => ["", "none", undefined].includes(getComputedStyle(document.querySelector(".tabbar"))[p]))), "the bottom bar has no blur");
  const shadow = () => page.evaluate(() => getComputedStyle(document.querySelector(".fab-add")).boxShadow);
  const before = await shadow(); ok(before && before !== "none", "the + button has a shadow by default", before);
  await openSettings(page); await wait(300);
  await page.evaluate(() => document.querySelector('[data-section="fx-toggle"]').click()); await wait(200);
  ok(await page.evaluate(() => document.documentElement.getAttribute("data-fx") === "off" && localStorage.getItem("expense_ledger_v5__fx") === "off"), "switching it on sets data-fx=off and remembers it");
  ok(await page.evaluate(() => document.querySelector('[data-section="fx-toggle"]').getAttribute("aria-checked") === "true"), "the switch reports it is on");
  await page.reload(); await settle(page); await wait(300);
  ok(await page.evaluate(() => document.documentElement.getAttribute("data-fx") === "off"), "it is still off after a reload");
  const after = await shadow(); ok(!after || after === "none" || /rgba\(0, 0, 0, 0\) 0px 0px 0px 0px/.test(after), "the + button shadow is gone", after);
  await openSettings(page); await wait(300);
  await page.evaluate(() => document.querySelector('[data-section="fx-toggle"]').click()); await wait(200);
  ok(await page.evaluate(() => !document.documentElement.hasAttribute("data-fx") && localStorage.getItem("expense_ledger_v5__fx") === null), "switching it off restores effects and clears the setting");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run25_layers", browser);
