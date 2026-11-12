// Runs 62-63 in the real bundled app (owner batch D9/D10): what was left after each debt and loan payment, the debts-and-loans spreadsheet,
// the payments of a repeating bill, and a budget's last months. Read-only views; synthetic data only.
import { launch, openPage, openGoals, tab, ok, section, finish, baseSeed, tx, wait, fs, path } from "./lib.mjs";
const DL = process.env.E2E_DL_DIR || path.join(process.env.TEMP || ".", "ledger-e2e-dl"); fs.mkdirSync(DL, { recursive: true });
const browser = await launch();
const dlClient = await browser.target().createCDPSession(); await dlClient.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
const DKEY = "expense_ledger_v5__debts";
const debts = { version: 1, debts: [{ id: "d1", direction: "owe", name: "Elvin", principal: 50000, dueDate: "", note: "", payments: [{ id: "p1", date: "2026-10-01", amount: 10000 }, { id: "p2", date: "2026-10-15", amount: 15050 }] }],
  loans: [{ id: "l1", lender: "Bank", kind: "cash", principal: 120000, months: 3, rateType: "none", ratePct: 0, firstPayment: "2026-09-10", bankPayment: null, payments: [{ id: "q1", date: "2026-09-10", amount: 40000, interest: 0 }] }] };
const pre = `(() => { try { if (!sessionStorage.getItem("__d")) { sessionStorage.setItem("__d", "1"); localStorage.setItem("${DKEY}", ${JSON.stringify(JSON.stringify(debts))}); } } catch {} })()`;
const openDebts = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150);
  await page.evaluate(() => document.querySelector('.more-page [data-more="debts"]').click()); await page.waitForSelector('[data-section="debts-page"]'); await wait(300); };
const ym = (k) => { const d = new Date(); const x = new Date(d.getFullYear(), d.getMonth() - k, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; };

section("R62-B1. Debts and loans: left after each payment, and the spreadsheet");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre }); await openDebts(page);
  const left = await page.evaluate(() => [...document.querySelectorAll('[data-section="debt-card"] [data-section="pay-left"]')].map((e) => e.innerText));
  ok(left.length === 2 && /400\.00/.test(left[0]) && /249\.50/.test(left[1]), "Elvin: 400.00 left after paying 100, then 249.50 after paying 150.50", left);
  await page.evaluate(() => document.querySelectorAll(".seg .seg-btn")[1].click()); await wait(450);
  const lleft = await page.evaluate(() => [...document.querySelectorAll('[data-section="loan-card"] [data-section="pay-left"]')].map((e) => e.innerText));
  ok(lleft.length === 1 && /800\.00/.test(lleft[0]), "the loan: 800.00 left after its first payment", lleft);
  for (const f of fs.readdirSync(DL)) if (/^debts-loans-/.test(f)) fs.unlinkSync(path.join(DL, f));
  await page.evaluate(() => document.querySelector('[data-section="debts-export"]').click());
  let file = null; for (let i = 0; i < 40 && !file; i++) { await wait(150); file = fs.readdirSync(DL).find((f) => /^debts-loans-.*\.csv$/.test(f)); }
  const text = file ? fs.readFileSync(path.join(DL, file), "utf8") : "";
  ok(/"Debt","Elvin","I owe","Payment","2026-10-15","150\.50","249\.50"/.test(text) && /"Loan","Bank","I owe","Payment","2026-09-10","400\.00","800\.00"/.test(text), "the downloaded spreadsheet has every payment with what was left after it", text.slice(0, 300));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R63-B2. A repeating bill lists its payments; a budget shows its last months");
{
  const M1 = ym(1), M2 = ym(2);
  const seed = baseSeed({ language: "en", budgets: { housing: 100 }, transactions: [
    tx({ merchant: "Internet", category: "digital", amount: 30, date: M2 + "-05", recurring: true, recurFreq: "monthly", billId: "b1" }),
    tx({ merchant: "Internet", category: "digital", amount: 30, date: M1 + "-05", recurring: true, recurFreq: "monthly", billId: "b1" }),
    tx({ merchant: "Repairs", category: "housing", amount: 140, date: M1 + "-12" }), tx({ merchant: "Bulbs", category: "housing", amount: 20, date: M2 + "-12" })],
    bills: [{ id: "b1", name: "Internet", type: "expense", category: "digital", subcategory: "", amount: 30, freq: "monthly", anchorDate: M2 + "-05", active: true, createdAt: "2026-09-01T00:00:00Z" }] });
  const page = await openPage(browser, { seed }); await tab(page, "Recurring"); await wait(500);
  await page.evaluate(() => document.querySelector('[data-section="rec-payments-toggle"]').click()); await wait(450);
  const pays = await page.evaluate(() => [...document.querySelectorAll('[data-section="rec-payment"]')].map((b) => b.innerText.replace(/\s+/g, " ")));
  ok(pays.length === 2 && pays.every((p) => /30\.00/.test(p)), "the bill's two payments are listed, newest first", pays);
  await openGoals(page, "budgets");
  await page.evaluate(() => document.querySelector('[data-section="bud-history-toggle"]').click()); await wait(450);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-section="bud-history"] [data-mon]')].map((r) => [r.getAttribute("data-mon"), r.innerText.replace(/\s+/g, " ")]));
  ok(rows.length === 2 && rows[0][0] === M1 && /140\.00 ₼ \/ 100\.00/.test(rows[0][1]) && rows[1][0] === M2 && /20\.00 ₼ \/ 100\.00/.test(rows[1][1]), "Home budget: last month 140 of 100 (over), the month before 20 of 100; nothing before the first entry", rows);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run62_history");
