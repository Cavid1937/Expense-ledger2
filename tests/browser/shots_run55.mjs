// Run 55: text and screenshots of Analytics (all its parts) for the plain-language review (not a test). Synthetic data only.
import { launch, openPage, wait, baseSeed, settle, tx, daysAgo, TODAY, showAllAnalytics, fs, path } from "./lib.mjs";
const OUT = process.env.SHOT_DIR, TAG = process.env.SHOT_TAG || "now"; fs.mkdirSync(OUT, { recursive: true });
const R = (o) => tx({ recurring: true, recurFreq: "monthly", category: "digital", amount: 15, ...o });
const list = [];
for (let m = 0; m < 3; m++) {   // three months of ordinary life, so every part of Analytics has something to say
  const d = (n) => daysAgo(n + m * 30);
  list.push(tx({ type: "income", category: "salary", amount: 1450, merchant: "Employer", date: d(9) }), R({ merchant: "Rent", category: "housing", amount: 400, subcategory: "Rent", date: d(8) }), R({ merchant: "Netflix", date: d(6) }),
    tx({ merchant: "Bravo", amount: 31.4 + m * 9, date: d(2) }), tx({ merchant: "BakuBus", amount: 0.6, category: "transport", date: d(1) }), tx({ merchant: "Cafe", amount: 8 + m, date: d(0) }), tx({ merchant: "Pharmacy", amount: 12.3, category: "health", date: d(3) }),
    tx({ merchant: "Bravo", amount: 22, date: d(5) }), tx({ merchant: "Wolt", amount: 18.5, date: d(11) }), tx({ merchant: "Kontakt", amount: m === 0 ? 260 : 15, category: "shopping", date: d(12) }));
}
const browser = await launch();
for (const lang of (process.env.SHOT_LANGS || "en").split(",")) {
  const page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: list, budgets: { food: 150, transport: 30, shopping: 100 }, goals: [{ id: "g1", name: "New phone", target: 1200, saved: 300, monthly: 100 }] }), chooseLang: lang, width: 360, height: 760, dsf: 2 });
  await settle(page); await wait(400);
  console.log(`--- ${lang} HOME COACH ---\n` + (await page.evaluate(() => { const h = [...document.querySelectorAll(".section-title, .label-sm")].find((e) => /coach|məsləhət|совет/i.test(e.innerText)); let n = h; const parts = []; for (let i = 0; i < 4 && n; i++) { n = n.nextElementSibling; if (n) parts.push(n.innerText); } return parts.join("\n"); })));
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(700); await showAllAnalytics(page); await wait(300);
  await page.screenshot({ path: path.join(OUT, `${TAG}-analytics-${lang}.png`), fullPage: true });
  console.log(`--- ${lang} ANALYTICS TEXT ---\n` + (await page.evaluate(() => document.querySelector(".page, #root").innerText)));
  await page.close();
}
await browser.close(); console.log("shots saved to " + OUT); process.exit(0);
