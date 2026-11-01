// Run 24: an account can be renamed and its balance corrected from Settings. Synthetic data only.
import { launch, openPage, openSettings, wait, ok, section, finish, baseSeed, tx, settle } from "./lib.mjs";
const browser = await launch();
const AK = "expense_ledger_v5__accounts";
const type = (page, sel, v) => page.$eval(sel, (el, val) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const store = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), AK);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);

section("R24-ACE1. Rename an account and correct its balance");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 5, type: "expense", account: "a_card01" })] });
  const page = await openPage(browser, { seed, pre: () => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); localStorage.setItem("expense_ledger_v5__accounts", JSON.stringify({ version: 1, accounts: [{ id: "a_card01", name: "My card", kind: "card", opening: { amount: 100, date: "2026-10-01" }, hidden: false }, { id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 0, date: "" }, hidden: false }], transfers: [] })); } } catch {} } });
  await settle(page); await openSettings(page);
  ok(await page.evaluate(() => /95\.00/.test(document.querySelector('[data-account="a_card01"] [data-balance]').innerText)), "the card shows 95.00 (100 opening minus the 5 entry)");
  await click(page, '[data-account="a_card01"] [data-section="acc-edit"]'); await wait(250);
  ok(await page.evaluate(() => !!document.querySelector("#acc-edit-name") && document.querySelector("#acc-edit-name").value === "My card" && document.querySelector("#acc-edit-bal").value === "95"), "the edit boxes open with the current name and balance");
  await type(page, "#acc-edit-name", "Kapital card"); await type(page, "#acc-edit-bal", "120.50"); await wait(150);
  await click(page, '[data-section="acc-edit-save"]'); await wait(350);
  const s = await store(page); const a = s.accounts.find((x) => x.id === "a_card01");
  ok(a.name === "Kapital card" && a.opening.amount === 125.5, "saved: new name; opening moved so the balance now reads 120.50 (125.50 - 5)", a);
  ok(await page.evaluate(() => /120\.50/.test(document.querySelector('[data-account="a_card01"] [data-balance]').innerText)), "the list shows 120.50");
  ok(await page.evaluate(() => /Kapital card/.test(document.querySelector('[data-account="a_card01"]').innerText)), "the list shows the new name");
  await click(page, '[data-account="a_cash01"] [data-section="acc-edit"]'); await wait(250);
  await type(page, "#acc-edit-name", "kapital CARD"); await click(page, '[data-section="acc-edit-save"]'); await wait(300);
  ok((await store(page)).accounts.find((x) => x.id === "a_cash01").name === "Cash", "a name already used by another account is refused");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run24_accedit", browser);
