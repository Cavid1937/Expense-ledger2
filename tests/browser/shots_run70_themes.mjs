// Run 70 evidence: screenshots of Graphite, Ivory and Sea glass on the main screens at 390 (en), 360 (ru) and 320 (az) CSS px, plus one
// overview sheet per theme and width. Output folder: SHOTS_OUT (required). Synthetic data only; nothing is asserted here (see e2e_run70_themes).
import { launch, openPage, openSettings, openAdd, openGoals, tab, wait, baseSeed, tx, daysAgo, settle } from "./lib.mjs";
import fs from "fs"; import path from "path";
const OUT = process.env.SHOTS_OUT; if (!OUT) { console.error("SHOTS_OUT must be set"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const seed = (lang) => baseSeed({ language: lang, profileName: "Aysel", transactions: [
  tx({ merchant: "Bravo Market", category: "food", subcategory: "Groceries", amount: 48.6, date: daysAgo(0) }),
  tx({ merchant: "Bakı Metro", category: "transport", amount: 0.9, date: daysAgo(1) }),
  tx({ merchant: "Kafe Araz", category: "food", subcategory: "Coffee", amount: 6.5, date: daysAgo(2) }),
  tx({ merchant: "Aptek Zəfər", category: "health", amount: 23.4, date: daysAgo(3) }),
  tx({ merchant: "Netflix", category: "digital", amount: 12.99, date: daysAgo(4), recurring: true, recurFreq: "monthly" }),
  tx({ merchant: "Azercell", category: "digital", amount: 15, date: daysAgo(6), recurring: true, recurFreq: "monthly" }),
  tx({ merchant: "Zara", category: "shopping", amount: 1249.99, date: daysAgo(8) }),
  tx({ type: "income", category: "salary", merchant: "Employer LLC", amount: 2850, date: daysAgo(9) }),
  tx({ type: "income", category: "freelance", merchant: "Design job", amount: 420, date: daysAgo(12) }),
  tx({ merchant: "Kino Park", category: "entertain", amount: 18, date: daysAgo(15) }),
], budgets: { food: 300, transport: 60, shopping: 400, digital: 40 }, goals: [{ id: "g1", name: "Master's degree", target: 12000, saved: 3600, monthlyTarget: 0, targetDate: null }, { id: "g2", name: "Laptop", target: 2500, saved: 2500, monthlyTarget: 0, targetDate: null }] });
const runs = [{ w: 390, lang: "en" }, { w: 360, lang: "ru" }, { w: 320, lang: "az" }];
for (const theme of ["graphite", "ivory", "sea"]) for (const { w, lang } of runs) {
  const page = await openPage(browser, { seed: seed(lang), width: w, height: 760, fresh: true, chooseLang: lang, pre: `localStorage.setItem("expense_ledger_v5__theme","${theme}")` });
  await settle(page);
  const names = [];
  const snap = async (name) => { const f = `${theme}-${w}-${lang}-${name}.png`; await page.screenshot({ path: path.join(OUT, f) }); names.push(f); };
  await tab(page, "Home"); await wait(400); await snap("1-home");
  await tab(page, "Ledger"); await wait(400); await snap("2-entries");
  await openAdd(page); await snap("3-add");
  await page.keyboard.press("Escape"); await wait(400); await page.evaluate(() => { const b = document.querySelector('[data-section="add-cancel"],.add-cancel'); if (b) b.click(); }); await wait(300);
  await tab(page, "Analytics"); await wait(500); await snap("4-analytics");
  await page.evaluate(() => { const c = document.querySelector(".cal"); if (c) c.scrollIntoView({ block: "center" }); }); await wait(300); await snap("5-analytics-chart");
  await openGoals(page, "budgets"); await wait(400); await snap("6-budgets");
  await page.evaluate(() => { const b = [...document.querySelectorAll(".seg .seg-btn")]; if (b[b.length - 1]) b[b.length - 1].click(); }); await wait(400); await snap("7-goals");
  await openSettings(page); await page.evaluate(() => { const c = document.querySelector('[data-section="theme-chips"]'); if (c) c.scrollIntoView({ block: "center" }); }); await wait(350); await snap("8-theme-picker");
  await page.close();
  // overview sheet: the 8 screens side by side
  const sheet = await browser.newPage(); const scale = 0.5;
  await sheet.setViewport({ width: Math.ceil((w * scale + 8) * 4 + 8), height: Math.ceil((760 * scale + 26) * 2 + 8) });
  const img = (f) => `<figure style="margin:0;display:inline-block;vertical-align:top;margin:4px;width:${w * scale}px"><img src="data:image/png;base64,${fs.readFileSync(path.join(OUT, f)).toString("base64")}" style="width:100%;display:block;border:1px solid #888"><figcaption style="font:11px sans-serif;color:#333">${f.replace(/\.png$/, "")}</figcaption></figure>`;
  await sheet.setContent(`<body style="margin:4px;background:#ddd">${names.map(img).join("")}</body>`); await wait(200);
  await sheet.screenshot({ path: path.join(OUT, `SHEET-${theme}-${w}-${lang}.png`), fullPage: true }); await sheet.close();
  console.log("done", theme, w, lang);
}
await browser.close();
