// Redesign evidence (2026-10-27): renders the eight reference screens from SYNTHETIC data (no real user data) and saves
// PNGs. Not a pass/fail test (it is outside tests/browser, so the runners and the count guard ignore it).
// Usage: PAGE_URL=<file url of a built page> node tests/visual/redesign-shots.mjs <outDir> [width] [lang]
import { launch, openPage, tx, wait, settle, daysAgo, fs, path } from "../browser/lib.mjs";
const out = path.resolve(process.argv[2] || "shots"); fs.mkdirSync(out, { recursive: true });
const width = Number(process.argv[3] || 390), lang = process.argv[4] || "en", priv = process.argv[5] === "privacy";   // Run 9: optional privacy mode
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, day = (n) => `${ym}-${pad(Math.min(n, d.getDate()))}`;
const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1), pym = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
const p2 = new Date(d.getFullYear(), d.getMonth() - 2, 1), p2ym = `${p2.getFullYear()}-${pad(p2.getMonth() + 1)}`;
const rec = (o, dates) => dates.map((date) => tx({ ...o, date, recurring: true }));
const transactions = [
  tx({ type: "income", category: "salary", amount: 2850, merchant: "Salary", date: day(1) }),
  tx({ type: "income", category: "salary", amount: 2850, merchant: "Salary", date: `${pym}-01` }),
  tx({ amount: 42.6, category: "food", subcategory: "Groceries", merchant: "Araz Supermarket", date: daysAgo(0) }),
  tx({ amount: 12.5, category: "transport", subcategory: "Taxi", merchant: "Baku Taxi", date: daysAgo(0) }),
  tx({ amount: 8.4, category: "food", subcategory: "Coffee", merchant: "Coffee House", note: "Coffee with a friend", date: daysAgo(1) }),
  tx({ amount: 56.2, category: "food", subcategory: "Groceries", merchant: "Bazar Store", date: day(9) }),
  tx({ amount: 0.6, category: "transport", subcategory: "Metro", merchant: "Metro", date: day(10) }),
  tx({ amount: 240.6, category: "shopping", merchant: "Clothing store", date: day(6) }),
  tx({ amount: 176.3, category: "entertain", merchant: "Cinema", date: day(7) }),
  tx({ amount: 64, category: "health", merchant: "Pharmacy", date: day(4) }),
  tx({ amount: 31, category: "gifts", merchant: "Flower shop", date: day(3) }),
  ...rec({ amount: 800, category: "housing", subcategory: "Rent", merchant: "Rent", recurFreq: "monthly" }, [`${p2ym}-01`, `${pym}-01`, day(1)]),
  ...rec({ amount: 35, category: "housing", subcategory: "Utilities", merchant: "Internet", recurFreq: "monthly" }, [`${p2ym}-03`, `${pym}-03`]),
  ...rec({ amount: 50, category: "health", merchant: "Gym", recurFreq: "monthly" }, [`${p2ym}-05`, `${pym}-05`]),
  ...rec({ amount: 9.99, category: "digital", merchant: "Spotify", recurFreq: "monthly" }, [`${p2ym}-10`, `${pym}-10`]),
  tx({ amount: 380, category: "food", merchant: "Market", date: `${pym}-12` }), tx({ amount: 150, category: "transport", merchant: "Fuel", date: `${pym}-15` }),
];
const seed = { transactions, budgets: { food: 600, transport: 400, shopping: 400, entertain: 300 }, templates: [], currency: "₼", language: lang,
  goals: [{ id: "g1", name: "Emergency fund", target: 5000, saved: 1200, monthlyTarget: 300, targetDate: null }],
  safeToSpend: { enabled: true, savingsTarget: 200 }, lastBackup: new Date(Date.now() - 2 * 86400000).toISOString(), backupConfirmedAt: new Date(Date.now() - 2 * 86400000 + 60000).toISOString() };
const browser = await launch();
const shot = async (page, name) => { await settle(page); await wait(200); await page.screenshot({ path: path.join(out, `${name}-${width}-${lang}${priv ? "-privacy" : ""}.png`) }); console.log("saved", name); };
const page = await openPage(browser, { seed, width, height: 844, dsf: 2, chooseLang: lang });
if (priv) { await page.evaluate(() => document.querySelector(".topbar .privacy-toggle").click()); await wait(2200); }   // wait for the toast to go
const tabAt = (i) => page.evaluate((i) => document.querySelectorAll(".tab-btn")[i].click(), i);
await shot(page, "1-home");
await tabAt(1); await shot(page, "2-transactions");
await tabAt(2); await shot(page, "3-analytics");
await tabAt(3); await shot(page, "4-budgets");
await page.evaluate(() => document.querySelectorAll(".seg-btn")[1].click()); await shot(page, "4b-goals");
await tabAt(4); await shot(page, "8-more");
await page.evaluate(() => document.querySelectorAll(".more-page .list-row")[0].click()); await shot(page, "5-recurring");
await tabAt(4); await page.evaluate(() => document.querySelectorAll(".more-page .list-row")[1].click()); await shot(page, "6-import-export");
await tabAt(1); await page.evaluate(() => document.querySelector(".txn-row").click()); await page.waitForSelector(".sheet"); await shot(page, "7-detail");
console.log(page.errors.length ? "PAGE ERRORS: " + page.errors.join(" | ") : "no page errors");
await browser.close();
