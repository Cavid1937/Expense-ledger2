// Run 27c (owner: "it is too much, it must be expandable by choice"): the Settings sections (Accounts, Categories, Currency and
// Safe to Spend, Appearance) are closed rows until the user opens them. Synthetic data only.
import { openPage, tab, wait, ok, section, finish, launch, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const sel = (k) => `.more-page [data-fold-head="${k}"]`;
const state = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-fold-head]")].map((b) => [b.dataset.foldHead, b.getAttribute("aria-expanded")])));
section("R27C-1. Everything starts closed; each section opens and closes on its own");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await tab(page, "More"); await wait(300);
  const s0 = await state(page);
  // Run 80 added the Privacy fold
  ok(Object.keys(s0).join() === "accounts,money,look,privacy" &&Object.values(s0).every((v) => v === "false"), "three sections, all closed to start (Run 38: categories moved to Budgets & Goals)", s0);
  ok(await page.evaluate(() => !document.querySelector('[data-section="my-accounts"]') && !document.querySelector('[data-section="theme-chips"]')), "closed means their contents are not on the page");
  await page.click(sel("accounts")); await wait(300);
  const s1 = await state(page);
  ok(s1.accounts === "true" && s1.money === "false", "opening Accounts leaves the others closed", s1);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="my-accounts"]')), "the accounts card is shown");
  await page.focus(sel("look")); await page.keyboard.press("Enter"); await wait(300);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="theme-chips"]') && document.querySelector('[data-fold-head="look"]').getAttribute("aria-expanded") === "true"), "the keyboard (Enter) opens Appearance");
  await page.click(sel("accounts")); await wait(300);
  ok((await state(page)).accounts === "false" && !(await page.$('[data-section="my-accounts"]')), "tapping again closes it");
  const h = await page.evaluate(() => document.querySelector('[data-fold-head="money"]').getBoundingClientRect().height);
  ok(h >= 44, "the row is at least 44 px tall", h);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R27C-2. Home > Accounts > Manage opens the Settings tab with Accounts expanded");
{
  const accs = { version: 1, accounts: [{ id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 120, date: "" }, hidden: false }], transfers: [] };
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: () => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); localStorage.setItem("expense_ledger_v5__accounts", JSON.stringify({ version: 1, accounts: [{ id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 120, date: "" }, hidden: false }], transfers: [] })); } } catch (e) {} } }); await settle(page); await wait(400);
  await page.evaluate(() => document.querySelector('[data-section="home-accounts-manage"]').click()); await wait(1000);   // Run 31: Home is taller now (balance note), so a mouse click could land on the floating + button
  ok(await page.evaluate(() => !!document.querySelector('[data-section="accounts-page"] [data-section="my-accounts"]') && !document.querySelector(".more-page")), "Run 38: Manage opens the Accounts page (no Settings fold opening and scrolling at the same time)");
  ok(await page.evaluate(() => !!document.querySelector('[data-section="my-accounts"]') && !document.querySelector(".sheet")), "the accounts card is on the page (no sheet)");
  await page.close();
}
section("R27C-3. Texts exist in all three languages");
for (const [lang, re] of [["az", /Hesablar/], ["ru", /Счета/], ["en", /Accounts/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: lang }) }); await settle(page); await tab(page, "More"); await wait(300);
  ok(re.test(await page.evaluate(() => document.querySelector('[data-fold-head="accounts"]').innerText)), `${lang}: Accounts row title`);
  await page.close();
}
await finish("e2e_run27_fold", browser);