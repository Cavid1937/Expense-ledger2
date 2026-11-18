// Run 108 (release readiness): a money figure below zero shows its minus sign. Before, an overspend read "Safe to Spend 395.06 ₼" and a
// credit card in debt read "120.00 ₼": only the red colour said minus, which a screen reader and colour-blind eyes miss. Synthetic data only.
import { launch, openPage, openSettings, wait, ok, section, finish, baseSeed, tx, settle } from "./lib.mjs";
const browser = await launch();
const accPre = () => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); localStorage.setItem("expense_ledger_v5__accounts", JSON.stringify({ version: 1, accounts: [{ id: "a_cred01", name: "Credit card", kind: "credit", opening: { amount: 0, date: "2026-10-01" }, hidden: false }, { id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 50, date: "2026-10-01" }, hidden: false }], transfers: [] })); } } catch {} };
const text = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).textContent || null, sel);

section("R108-S1. Safe to Spend below zero shows a minus sign");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: 3, amount: 1000, merchant: "Salary", category: "salary", type: "income" }), tx({ id: 1, amount: 5000, merchant: "Big repair", category: "home", type: "expense" })] }) });
  await settle(page);
  const amount = await text(page, '[data-section="home-safe"] .safe-amount');
  ok(amount !== null && /^[−-]/.test(amount.trim()), "the overspent figure starts with a minus", amount);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R108-S2. A credit card in debt shows a minus; cash with money does not");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ id: 2, amount: 120, merchant: "Shop", type: "expense", account: "a_cred01" })] });
  const page = await openPage(browser, { seed, pre: accPre });
  await settle(page); await openSettings(page); await wait(200);
  const cred = await text(page, '[data-account="a_cred01"] [data-balance]'), cash = await text(page, '[data-account="a_cash01"] [data-balance]');
  ok(cred !== null && /[−-]\s?120\.00/.test(cred), "Settings: the credit card reads −120.00", cred);
  ok(cash !== null && /50\.00/.test(cash) && !/[−-]/.test(cash), "Settings: the cash account reads 50.00 with no sign", cash);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
finish("e2e_run108_signs");
