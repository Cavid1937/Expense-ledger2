// Run 28: net position (accounts + owed to you - what you owe - loan balances) on Home and in Settings, and balances that ignore entries
// dated in the future. Synthetic data only.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, tx, settle, openSettings, TODAY } from "./lib.mjs";
const browser = await launch();
const ACC = { version: 1, accounts: [{ id: "a_card01", name: "Card", kind: "card", opening: { amount: 100, date: "" }, hidden: false }, { id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 20, date: "" }, hidden: false }], transfers: [] };
const DEBTS = { version: 1, debts: [{ id: "d1", direction: "owe", name: "Aysel", principal: 4000, payments: [] }, { id: "d2", direction: "owed", name: "Rauf", principal: 20000, payments: [{ id: "p1", date: "2026-10-20", amount: 5000 }] }], loans: [] };
const seedWith = (acc, debts, language = "en") => ({ seed: baseSeed({ language, transactions: [tx({ merchant: "Shop", amount: 30, account: "a_card01" }), tx({ merchant: "Later", amount: 500, date: "2099-01-01", account: "a_card01" })] }),
  pre: `(() => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); ${acc ? `localStorage.setItem("expense_ledger_v5__accounts", ${JSON.stringify(JSON.stringify(acc))});` : ""} ${debts ? `localStorage.setItem("expense_ledger_v5__debts", ${JSON.stringify(JSON.stringify(debts))});` : `localStorage.removeItem("expense_ledger_v5__debts");`} } } catch (e) {} })()` });
const open = async (o) => { const page = await openPage(browser, { seed: o.seed, pre: o.pre }); await settle(page); await wait(400); return page; };
section("R28-UI1. Home: balances ignore entries from the future; net position appears when something is owed");
{
  const page = await open(seedWith(ACC, DEBTS));
  const home = await page.evaluate(() => (document.querySelector('[data-section="home-accounts"]') || {}).innerText || "");
  ok(/70\.00/.test(home) && !/-?430\.00/.test(home), "Card shows 100.00 - 30.00 = 70.00; the 500.00 planned for 2099 is not taken off yet", home);
  ok(/Total in shown accounts: 90\.00/.test(home), "total of the two accounts: 70.00 + 20.00 = 90.00", home);
  ok(/Net position: 90\.00 \S+ ?[+]?/.test(home) === false && /Net position: 200\.00/.test(home), "net position: 90.00 + 150.00 owed to you - 40.00 you owe = 200.00", home);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R28-UI2. Settings shows the same net position with its explanation");
{
  const page = await open(seedWith(ACC, DEBTS)); await openSettings(page);
  const t = await page.evaluate(() => (document.querySelector('[data-section="acc-net"]') || {}).innerText || "");
  ok(/Net position: 200\.00/.test(t) && /estimates/.test(t), "net position and the note that loan balances are estimates", t);
  await page.close();
}
section("R28-UI3. Nothing owed either way: no net position line (it would only repeat the total)");
{
  const page = await open(seedWith(ACC, null));
  const txt = await page.evaluate(() => ({ net: !!document.querySelector('[data-section="home-netpos"]'), text: document.querySelector('[data-section="home-accounts"]').innerText }));
  ok(!txt.net && /Total in shown accounts: 90\.00/.test(txt.text), "no net line; the total is still shown", txt);
  await page.close();
}
section("R28-UI4. Texts in the three languages");
for (const [lang, re] of [["az", /Xalis vəziyyət: 200\.00/], ["ru", /Чистая позиция: 200\.00/]]) {
  const o = seedWith(ACC, DEBTS, lang);
  const page = await open(o);
  ok(re.test(await page.evaluate(() => document.querySelector('[data-section="home-netpos"]').innerText)), `${lang}: net position line`);
  await page.close();
}
await finish("e2e_run28_netpos", browser);