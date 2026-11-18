// Run 108 (release readiness, accessibility): a sweep of every main screen, every page under More and the add form, in az, ru and en.
// A screen reader reads each button, link, switch and field by its name; one without a name is read as just "button". Checked with the
// browser's own accessibility tree (what TalkBack/VoiceOver use), plus: the page language matches the chosen one, and no two elements
// share an id (labels pointing at the wrong field). Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, openAdd, tab, tx, baseSeed } from "./lib.mjs";
const browser = await launch();
const ROLES = new Set(["button", "link", "textbox", "searchbox", "combobox", "listbox", "checkbox", "switch", "radio", "slider", "spinbutton", "tab", "menuitem", "option"]);
const seed = (language) => baseSeed({ language, transactions: [tx({ id: 1, amount: 12.5, merchant: "Bazar", category: "food" }), tx({ id: 2, type: "income", category: "salary", amount: 900, merchant: "Employer" }), tx({ id: 3, amount: 40, merchant: "Kommunal", category: "housing", recurring: true, recurFreq: "monthly" })],
  budgets: { food: 300 }, goals: [{ id: "g1", name: "Trip", target: 500, saved: 50, monthlyTarget: 50, createdAt: "2026-09-01T00:00:00Z" }], safeToSpend: { enabled: true, savingsTarget: 0 } });
const unnamed = async (page) => {
  const tree = await page.accessibility.snapshot({ interestingOnly: true });
  const out = [];
  const walk = (n) => { if (!n) return; if (ROLES.has(n.role) && !String(n.name || "").trim()) out.push(n.role + (n.value ? " value=" + String(n.value).slice(0, 20) : "")); (n.children || []).forEach(walk); };
  walk(tree); return out;
};
const dupIds = (page) => page.evaluate(() => { const seen = {}, d = []; document.querySelectorAll("[id]").forEach((e) => { if (seen[e.id]) d.push(e.id); seen[e.id] = 1; }); return [...new Set(d)]; });
for (const lang of ["az", "ru", "en"]) {
  section(`R108-A11Y. ${lang}: every control on every main screen has a name`);
  const page = await openPage(browser, { seed: seed(lang), chooseLang: lang }); await settle(page);
  ok(await page.evaluate(() => document.documentElement.lang) === lang, `${lang}: the page says its language is ${lang} (so the screen reader uses the right voice)`, await page.evaluate(() => document.documentElement.lang));
  // the check itself must see a nameless control: a planted icon-only button is found, then removed
  await page.evaluate(() => { const b = document.createElement("button"); b.id = "probe-unnamed"; b.innerHTML = "<svg width='10' height='10'></svg>"; document.body.appendChild(b); });
  const probe = await unnamed(page); await page.evaluate(() => document.getElementById("probe-unnamed").remove());
  ok(probe.includes("button"), `${lang}: the sweep does notice a planted button that has no name`, probe);
  const bad = {}, dups = {};
  const sweep = async (name) => { await settle(page); const u = await unnamed(page); if (u.length) bad[name] = u; const d = await dupIds(page); if (d.length) dups[name] = d; };
  for (const t of ["Home", "Ledger", "Analytics", "Goals", "More"]) { await tab(page, t); await wait(250); await sweep(t); }
  const rows = await page.evaluate(() => [...document.querySelectorAll(".more-page [data-more]")].map((e) => e.getAttribute("data-more")));
  for (const r of rows) {
    await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(200);
    const opened = await page.evaluate((i) => { const el = document.querySelector(`.more-page [data-more="${i}"]`); if (!el) return false; el.click(); return true; }, r); await wait(350);
    if (opened) await sweep("More/" + r);
    // close anything the row opened (a sheet or a page) before the next one
    await page.keyboard.press("Escape"); await wait(200);
  }
  await openAdd(page); await sweep("Add form"); await page.keyboard.press("Escape"); await wait(250);
  ok(Object.keys(bad).length === 0, `${lang}: ${5 + rows.length + 1} screens swept: no button, link, switch or field without a spoken name`, bad);
  ok(Object.keys(dups).length === 0, `${lang}: no two elements share an id on any screen`, dups);
  ok(rows.length >= 5, `${lang}: the sweep reached the pages under More (${rows.length})`, rows);
  ok(page.errors.length === 0, `${lang}: no JavaScript errors`, page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run108_a11y");
