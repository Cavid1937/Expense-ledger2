// Run 24: accounts in Settings — add two, see balances, transfer, use one in the add form. Synthetic data only.
import { launch, openPage, openSettings, openAdd, clickText, wait, ok, section, finish, baseSeed, tx, settle, state, bodyText } from "./lib.mjs";
const browser = await launch();
const AK = "expense_ledger_v5__accounts";
const type = (page, sel, v) => page.$eval(sel, (el, val) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const store = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), AK);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);

section("R24-ACB1. Add accounts, transfer, balances");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 5 })] }) }); await settle(page);
  await openSettings(page);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="my-accounts"]')), "the Accounts section is in Settings");
  await type(page, "#acc-name", "Kapital card"); await type(page, "#acc-open", "100.10"); await wait(150);
  await click(page, '[data-section="acc-add"]'); await wait(350);
  await type(page, "#acc-name", "Cash"); await click(page, '[data-section="acc-add"]'); await wait(350);
  const s1 = await store(page);
  ok(s1 && s1.accounts.length === 2 && s1.accounts[0].opening.amount === 100.1, "two accounts saved under their own key; opening balance 100.10", s1);
  ok(await page.evaluate(() => /100\.10/.test(document.querySelector('[data-section="my-accounts"] [data-balance]').innerText)), "the first balance shows 100.10");
  ok(await page.evaluate(() => !!document.querySelector('[data-section="acc-total"]') && /not your net worth/i.test(document.querySelector('[data-section="acc-total"]').innerText)), "a total is shown with the 'not your net worth' note");
  await type(page, '[data-section="acc-transfer"] input', "30"); await wait(150);
  await click(page, '[data-section="acc-transfer-go"]'); await wait(400);
  const s2 = await store(page);
  const bal = await page.evaluate(() => [...document.querySelectorAll("[data-balance]")].map((e) => e.innerText));
  ok(s2.transfers.length === 1 && s2.transfers[0].amount === 30 && /70\.10/.test(bal[0]) && /30\.00/.test(bal[1]), "after moving 30: 70.10 and 30.00", bal);
  const st = await state(page);
  ok(st.transactions.length === 1, "the transfer is not an entry: the ledger is unchanged");
  await page.evaluate(() => document.querySelector('[data-section="my-accounts"] [data-account] button').click()); await wait(300);
  ok((await store(page)).accounts[0].hidden === true, "Hide hides the account without deleting it");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-ACB2. Use an account in the add form; in-use account cannot be removed; az and ru");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 5, account: "a_card01" })] });
  const page = await openPage(browser, { seed, pre: () => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); localStorage.setItem("expense_ledger_v5__accounts", JSON.stringify({ version: 1, accounts: [{ id: "a_card01", name: "My card", kind: "card", opening: { amount: 10, date: "" }, hidden: false }], transfers: [] })); } } catch {} } });
  await settle(page);
  await openAdd(page);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="add-account"] [data-acc-pick="a_card01"]') && !document.querySelector('[data-section="add-wallet"]')), "the add form offers the account as a one-tap 'Paid from' choice, and no cash/card/mobile chips (Run 38)");
  await page.evaluate(() => { document.querySelector(".add-overlay .icon-btn, .add-overlay [aria-label='Close']")?.click(); }); await page.reload(); await settle(page); await openSettings(page);
  await page.evaluate(() => document.querySelectorAll('[data-section="my-accounts"] [data-account] button')[1].click()); await wait(300);
  ok((await store(page)).accounts.length === 1, "an account used by an entry is not removed");
  ok(await page.evaluate(() => /(^|[^\d.])5\.00/.test(document.querySelector("[data-balance]").innerText)), "balance counts the entry (10 opening − 5 = 5.00)");
  await page.close();
  for (const [l, re] of [["az", /Hesablar və qalıqlar/], ["ru", /Счета и остатки/]]) {
    const p = await openPage(browser, { seed: baseSeed({ language: l }) }); await settle(p); await openSettings(p);
    ok(re.test(await p.evaluate(() => document.querySelector('[data-fold-head="accounts"]').innerText)), `${l}: section title`);
    await p.close();
  }
}
await finish("e2e_run24_accounts", browser);
