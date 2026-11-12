// Run 54: screenshots of the main screens for the plain-language review (not a test). Synthetic data only.
// Usage: env as for a single browser test, plus SHOT_DIR and optional SHOT_TAG (file name prefix, e.g. "before" / "after").
import { launch, openPage, openAdd, wait, baseSeed, settle, tx, daysAgo, TODAY, fs, path } from "./lib.mjs";
const OUT = process.env.SHOT_DIR, TAG = process.env.SHOT_TAG || "now"; fs.mkdirSync(OUT, { recursive: true });
const R = (o) => tx({ recurring: true, recurFreq: "monthly", category: "digital", amount: 15, ...o });
const seed = (language) => baseSeed({ language, budgets: { food: 300, transport: 60 }, goals: [{ id: "g1", name: language === "az" ? "Yeni telefon" : "New phone", target: 1200, saved: 300, monthly: 100 }],
  transactions: [tx({ type: "income", category: "salary", amount: 1450, merchant: "Employer", date: daysAgo(9) }), R({ merchant: "Rent", category: "housing", amount: 400, subcategory: "Rent", date: daysAgo(8) }), R({ merchant: "Netflix", date: daysAgo(6) }),
    tx({ merchant: "Bravo", amount: 31.4, date: daysAgo(2) }), tx({ merchant: "BakuBus", amount: 0.6, category: "transport", date: daysAgo(1) }), tx({ merchant: "Cafe", amount: 8, date: TODAY }), tx({ merchant: "Pharmacy", amount: 12.3, category: "health", date: TODAY })] });
const browser = await launch();
if (process.env.SHOT_EMPTY) {   // a brand-new user: nothing recorded yet
  for (const lang of (process.env.SHOT_LANGS || "en,az").split(",")) {
    const page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: [], budgets: {}, goals: [], templates: [] }), chooseLang: lang, width: 360, height: 760, dsf: 2 }); await settle(page); await wait(600);
    await page.screenshot({ path: path.join(OUT, `${TAG}-empty-home-${lang}.png`), fullPage: true });
    console.log(`--- ${lang} EMPTY HOME TEXT ---\n` + (await page.evaluate(() => document.querySelector(".page, #root").innerText)).slice(0, 2500));
    await page.close();
  }
  await browser.close(); process.exit(0);
}
for (const lang of (process.env.SHOT_LANGS || "en,az").split(",")) {
  const page = await openPage(browser, { seed: seed(lang), chooseLang: lang, width: 360, height: 760, dsf: 2 }); await settle(page); await wait(600);
  const shot = async (name, full = true) => { await page.screenshot({ path: path.join(OUT, `${TAG}-${name}-${lang}.png`), fullPage: full }); };
  await shot("home");
  console.log(`--- ${lang} HOME TEXT ---\n` + (await page.evaluate(() => document.querySelector(".page, #root").innerText)).slice(0, 2500));
  await openAdd(page); await wait(400); await shot("add", false);
  console.log(`--- ${lang} ADD TEXT ---\n` + (await page.evaluate(() => (document.querySelector(".add-overlay") || document.body).innerText)).slice(0, 1800));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".add-overlay .btn")].find((x) => /cancel|ləğv/i.test(x.innerText)); if (b) b.click(); }); await wait(600);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(600); await shot("more");
  console.log(`--- ${lang} MORE TEXT ---\n` + (await page.evaluate(() => document.querySelector(".more-page").innerText)).slice(0, 1800));
  await page.close();
}
await browser.close(); console.log("shots saved to " + OUT); process.exit(0);
