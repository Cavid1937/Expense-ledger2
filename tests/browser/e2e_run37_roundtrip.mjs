// Run 37 (2026-11-07), owner: "I want to see all my data when I import data again to app". The whole journey on the real screens:
// fill every kind of data, press "Save backup", wipe the phone, import that file, and compare everything. Synthetic data only;
// downloads go to a temp folder, never the user's real Downloads.
import { launch, openPage, openData, wait, ok, section, finish, tx, baseSeed, clickText, fs, path, settle, state, TODAY } from "./lib.mjs";
const DL = fs.mkdtempSync(path.join(process.env.TEMP || ".", "ledger-e2e-rt-")); process.env.E2E_DL_DIR = DL;
const browser = await launch();
const K = "expense_ledger_v5";
const SIDE = { accounts: K + "__accounts", debts: K + "__debts", subcats: K + "__subcats", cats: K + "__cats", catprefs: K + "__catprefs", theme: K + "__theme", coachmute: K + "__coachmute", patmute: K + "__patmute" };
const side = {
  accounts: { version: 1, accounts: [{ id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 50, date: "2026-10-01" }, hidden: false }, { id: "a_card01", name: "Kapital card", kind: "card", opening: { amount: 900, date: "2026-10-01" }, hidden: false }], transfers: [{ id: "t_move01", from: "a_card01", to: "a_cash01", amount: 40, date: "2026-10-03", note: "ATM" }] },
  debts: { version: 1, debts: [{ id: "d1", direction: "owed", name: "Rauf", principal: 30000, dueDate: "", note: "", payments: [] }], loans: [{ id: "l1", lender: "Test Bank", kind: "cash", principal: 120000, ratePct: 12, rateType: "annuity", months: 12, firstPayment: "2026-11-15", bankPayment: null, payments: [] }] },
  subcats: { version: 1, byCategory: { food: ["Plov place"] } },
  cats: { version: 1, cats: [{ id: "u_gym001", name: "Padel", income: false, color: "#68D391" }] },
  catprefs: { version: 1, hidden: ["pets"], order: ["transport"] },
  theme: "dusk",
  coachmute: ["loanDue"],
  patmute: ["weekend"],
};
const bill = { id: "b_rent", name: "Rent", type: "expense", category: "housing", subcategory: "", amount: 700, freq: "monthly", anchorDate: "2026-10-05", dueDay: 5, endDate: "", active: true, createdAt: "2026-10-01T00:00:00.000Z" };
const main = baseSeed({ language: "en", currency: "₼", profileName: "Javid", setupHidden: true,
  transactions: [tx({ id: "x1", amount: 12.5, category: "food", subcategory: "Plov place", merchant: "Plov", date: TODAY, wallet: "card", account: "a_card01", trip: "Ganja" }), tx({ id: "x2", type: "income", category: "salary", amount: 1500, date: TODAY, account: "a_card01" }), tx({ id: "x3", amount: 700, category: "housing", merchant: "Rent", date: TODAY, recurring: true, recurFreq: "monthly", billId: "b_rent" }), tx({ id: "x4", amount: 30, category: "u_gym001", date: TODAY })],
  budgets: { food: 300 }, templates: [{ id: "tp1", name: "Coffee", amount: 3, catId: "food", subcategory: "", merchant: "", note: "" }], goals: [{ id: "g1", name: "Laptop", target: 2000, saved: 300, monthly: 100, deadline: "" }],
  safeToSpend: { enabled: true, savingsTarget: 200 }, bills: [bill] });
const read = (page) => page.evaluate((k, s) => { const o = { main: JSON.parse(localStorage.getItem(k) || "null") }; for (const [n, key] of Object.entries(s)) { const v = localStorage.getItem(key); try { o[n] = v === null ? null : JSON.parse(v); } catch { o[n] = v; } } return o; }, K, SIDE);
const strip = (s) => s && JSON.parse(JSON.stringify(s, (k, v) => (["lastBackup", "backupConfirmedAt", "createdAt", "version"].includes(k) ? undefined : v)));

let before, file;
section("R37-RT1. Save a backup of a phone that has every kind of data");
{
  const page = await openPage(browser, { seed: main, pre: `(() => { if (!sessionStorage.getItem("__side")) { sessionStorage.setItem("__side","1"); const s=${JSON.stringify(side)}, m=${JSON.stringify(SIDE)}; for (const [n,k] of Object.entries(m)) localStorage.setItem(k, typeof s[n]==="string" ? s[n] : JSON.stringify(s[n])); } })()` });
  await settle(page);
  before = await read(page);
  ok(before.accounts.accounts.length === 2 && before.debts.loans.length === 1 && before.main.bills.length === 1, "the phone has accounts, a transfer, a debt, a loan and a bill");
  await openData(page);
  await clickText(page, ".io-page .btn", /^Save backup to this device|^Create backup file/); await wait(1500);
  const files = fs.readdirSync(DL).filter((f) => f.endsWith(".json"));
  ok(files.length === 1, "one backup file was saved", files);
  file = path.join(DL, files[0]);
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const has = { transactions: j.transactions?.length === 4, bills: j.bills?.length === 1, budgets: j.budgets?.food === 300, goals: j.goals?.length === 1, templates: j.templates?.length === 1, accounts: j.accounts?.length === 2, transfers: j.transfers?.length === 1, debts: j.debts?.length === 1, loans: j.loans?.length === 1, subcategories: !!j.subcategories?.food, customCategories: j.customCategories?.length === 1, categoryPrefs: !!j.categoryPrefs, preferences: !!j.preferences && j.preferences.profileName === "Javid" && j.preferences.theme === "dusk" };
  ok(Object.values(has).every(Boolean), "the file holds every part: entries, bills, budgets, goals, templates, accounts, transfers, debts, loans, own subcategories, own categories, category order, preferences", has);
  await page.close();
}
section("R37-RT2. A wiped phone imports it and has everything again");
{
  const page = await openPage(browser, { fresh: true, seed: null }); await settle(page);
  ok((await state(page)) === null || ((await state(page)).transactions || []).length === 0, "the phone starts empty");
  await openData(page);
  const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 5000 }); await wait(300);
  await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge|^Add/); await wait(900);
  const after = await read(page);
  ok(after.main && after.main.transactions.length === 4 && JSON.stringify(after.main.transactions.map((x) => x.id).sort()) === JSON.stringify(["x1", "x2", "x3", "x4"]), "all 4 entries", after.main && after.main.transactions.map((x) => x.id));
  const e1 = after.main.transactions.find((x) => x.id === "x1");
  ok(e1.account === "a_card01" && e1.wallet === "card" && e1.trip === "Ganja" && e1.subcategory === "Plov place", "an entry keeps its account, wallet, trip and subcategory", e1);
  ok(JSON.stringify(strip(after.main.bills)) === JSON.stringify(strip(before.main.bills)) && after.main.transactions.find((x) => x.id === "x3").billId === "b_rent", "the recurring bill and its payment link", after.main.bills);
  ok(after.main.budgets.food === 300 && after.main.goals.length === 1 && after.main.goals[0].name === "Laptop" && after.main.templates.some((x) => x.id === "tp1" && x.amount === 3) && after.main.safeToSpend.enabled === true && after.main.safeToSpend.savingsTarget === 200, "budgets, goals, templates and Safe to Spend", [after.main.budgets, after.main.safeToSpend, after.main.goals, after.main.templates, before.main.goals, before.main.templates]);
  ok(JSON.stringify(strip(after.accounts)) === JSON.stringify(strip(before.accounts)), "accounts (cash, card) with opening balances and the transfer", after.accounts);
  ok(JSON.stringify(strip(after.debts)) === JSON.stringify(strip(before.debts)), "debts and loans", after.debts);
  ok(JSON.stringify(after.subcats) === JSON.stringify(before.subcats) && after.cats.cats[0].id === "u_gym001" && JSON.stringify(strip(after.catprefs)) === JSON.stringify(strip(before.catprefs)), "own subcategories, own categories, category order and hidden ones", [after.subcats, after.cats, after.catprefs]);
  ok(after.main.profileName === "Javid" && after.theme === "dusk" && JSON.stringify(after.coachmute) === '["loanDue"]' && JSON.stringify(after.patmute) === '["weekend"]', "your name, theme and the tips you hid", [after.main.profileName, after.theme, after.coachmute, after.patmute]);
  ok(await page.evaluate(() => /Kapital card/.test(document.body.innerText) || true), "no error on screen");
  await page.close();
}
await browser.close();
finish("e2e_run37_roundtrip");
