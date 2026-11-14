// Run 70 in the real bundled app: Graphite, Ivory and the refined Sea glass. For each, every main screen is opened and checked for
// (a) colours left over from the original teal look, (b) text that is too faint against what is actually behind it, (c) sideways scroll.
// Also (Run 84): a fresh install starts on Ivory, a choice survives a restart, the ledger is never touched. Synthetic data only.
import { launch, openPage, openSettings, wait, ok, section, finish, baseSeed, settle, tx, tab, TODAY } from "./lib.mjs";
const browser = await launch();
const TK = "expense_ledger_v5__theme";
const seed = () => baseSeed({ language: "en", transactions: [
  tx({ merchant: "Bravo Market", category: "food", amount: 23.45 }), tx({ merchant: "Metro", category: "transport", amount: 0.9 }),
  tx({ type: "income", category: "salary", merchant: "Employer", amount: 1500 }), tx({ merchant: "Netflix", category: "digital", amount: 12.99, recurring: true, recurFreq: "monthly" }),
], budgets: { food: 300, transport: 50 }, goals: [{ id: "g1", name: "Laptop", target: 2000, saved: 600, monthlyTarget: 0, targetDate: null }] });
// Every visible text element: its colour against the first opaque background behind it (WCAG ratio). Large text (≥24px, or ≥18.66px bold) needs 3:1.
const scan = (page) => page.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a >= 0.95) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
  const out = { low: [], teal: [], n: 0 };
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    for (const prop of ["color", "backgroundColor", "borderTopColor"]) { const c = parse(cs[prop]); if (c && c.a > 0.2 && c.r === 76 && c.g === 201 && c.b === 196) out.teal.push(`${el.className || el.tagName}.${prop}`); }
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || cs.visibility === "hidden" || +cs.opacity < 0.5 || el.closest('[aria-hidden="true"],[hidden],.theme-mini')) continue;
    if (r.bottom < 0 || r.top > innerHeight * 3) continue;
    const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
    const a = fg.a, mix = { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) };
    const [x, y] = [L(mix), L(bg)].sort((p, q) => q - p), ratio = (x + 0.05) / (y + 0.05);
    const size = parseFloat(cs.fontSize), big = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    out.n++;
    if (ratio < (big ? 3 : 4.5) && !el.closest(":disabled,[aria-disabled=true]")) out.low.push(`${(el.innerText || "").trim().slice(0, 24)} ${ratio.toFixed(2)}`);
  }
  out.wide = document.documentElement.scrollWidth > innerWidth + 1;
  return out;
});
const pickTheme = async (page, id) => { await openSettings(page); await wait(250); await page.evaluate((i) => document.querySelector(`[data-theme-id="${i}"]`).click(), id); await wait(400); };

section("R84-B1. A fresh install starts on Ivory and writes it down once");
{
  const page = await openPage(browser, { seed: null, fresh: true });
  const s = await page.evaluate((k) => ({ th: document.documentElement.getAttribute("data-theme"), saved: localStorage.getItem(k), auto: localStorage.getItem(k + "_auto"), bg: getComputedStyle(document.body).backgroundColor }), TK);
  ok(s.th === "ivory" && s.saved === "ivory" && s.auto === "1" && s.bg === "rgb(243, 241, 235)", "fresh phone: Ivory (#F3F1EB), stored as picked by the app", s);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R84-B2. A phone with data and no saved theme gets Ivory; a theme the app picked moves to Ivory; a saved choice is never changed");
{
  let page = await openPage(browser, { seed: seed(), fresh: true });
  ok(await page.evaluate((k) => document.documentElement.getAttribute("data-theme") === "ivory" && localStorage.getItem(k) === "ivory", TK), "existing data, nothing saved: Ivory, and it is now written down");
  await page.close();
  page = await openPage(browser, { seed: seed(), fresh: true, pre: `localStorage.setItem("${TK}","sea");localStorage.setItem("${TK}_auto","1")` });
  ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme")) === "ivory", "Sea glass that the app picked by itself (Run 70) moves to Ivory");
  await page.close();
  page = await openPage(browser, { seed: seed(), fresh: true, pre: `localStorage.setItem("${TK}","sea")` });
  ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme")) === "sea", "Sea glass that the person chose is kept");
  await page.close();
  page = await openPage(browser, { seed: seed(), fresh: true, pre: `localStorage.setItem("${TK}","mist")` });
  ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme")) === "mist", "an earlier saved choice (Mist) is kept");
  await page.close();
}

section("R70-B3. Choosing works at once, survives a restart and leaves the ledger alone");
{
  const page = await openPage(browser, { seed: seed() });
  const before = await page.evaluate(() => localStorage.getItem("expense_ledger_v5"));
  await pickTheme(page, "ivory");
  const st = await page.evaluate((k) => ({ th: document.documentElement.getAttribute("data-theme"), scheme: document.documentElement.getAttribute("data-scheme"), bg: getComputedStyle(document.body).backgroundColor, saved: localStorage.getItem(k), auto: localStorage.getItem(k + "_auto"), checked: document.querySelector('[data-theme-id="ivory"]').getAttribute("aria-checked") }), TK);
  ok(st.th === "ivory" && st.scheme === "light" && st.saved === "ivory" && st.auto === null && st.checked === "true", "Ivory applies immediately, is saved by name and shows as selected", st);
  await wait(300);
  ok((await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(243, 241, 235)", "the page is Ivory #F3F1EB, not pure white");
  await page.reload(); await settle(page);
  ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme")) === "ivory", "after a restart Ivory is still applied");
  ok(await page.evaluate(() => localStorage.getItem("expense_ledger_v5")) === before, "the ledger data is exactly as it was");
  // category icons are drawn darker on the light theme so they stay visible
  await tab(page, "Ledger"); await wait(300);
  const ico = await page.evaluate(() => { const s = document.querySelector(".txn-ico span"); return s ? getComputedStyle(s).color : ""; });
  ok(ico && ico !== "rgb(240, 196, 111)", "a food icon on Ivory is shaded darker than its dark-theme pastel", ico);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R70-B4. Every main screen in each main theme: no leftover teal, readable text, no sideways scroll");
for (const id of ["graphite", "ivory", "sea"]) {
  const page = await openPage(browser, { seed: seed(), width: 360 });
  await pickTheme(page, id);
  const bad = { low: [], teal: [], wide: [] }; let n = 0;
  for (const name of ["Home", "Ledger", "Analytics", "Goals", "More"]) {
    await tab(page, name); await wait(350);
    const r = await scan(page); n += r.n;
    bad.low.push(...r.low.map((x) => `${name}: ${x}`)); bad.teal.push(...r.teal.map((x) => `${name}: ${x}`)); if (r.wide) bad.wide.push(name);
  }
  ok(n > 150, `${id}: ${n} text elements measured across Home, Entries, Analytics, Goals and Settings`);
  ok(bad.teal.length === 0, `${id}: no colour from the original teal look appears anywhere`, bad.teal.slice(0, 8));
  ok(bad.low.length === 0, `${id}: every visible text meets 4.5:1 (3:1 for large text) against its real background`, bad.low.slice(0, 10));
  ok(bad.wide.length === 0, `${id}: no screen scrolls sideways at 360 px`, bad.wide);
  ok(page.errors.length === 0, `${id}: no JavaScript errors`, page.errors[0]);
  await page.close();
}
await finish("e2e_run70_themes", browser);
