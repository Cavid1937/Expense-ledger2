// Run 18g: the number pad can be hidden with one tap and comes back when the amount is tapped. Synthetic data.
import { launch, openPage, wait, ok, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page);
await page.evaluate(() => document.querySelector(".fab-add, .home-empty .btn, [data-section=\"home-empty\"] .btn")?.click()); await wait(500);
const pad = () => page.evaluate(() => !!document.querySelector(".numpad"));
ok(await pad(), "the number pad is open when the add form opens");
await page.evaluate(() => document.querySelector('[data-section="pad-hide"]').click()); await wait(300);
ok(!(await pad()), "Hide number pad removes it");
await page.evaluate(() => document.querySelector(".amount-zone").click()); await wait(300);
ok(await pad(), "tapping the amount brings it back");
// the add form also offers Loan and Debt, which lead to the Debts & loans page (nothing is saved as an expense)
await page.evaluate(() => document.querySelector('[data-section="add-other-loans"]').click()); await wait(500);
ok(await page.evaluate(() => !!document.querySelector('[data-section="debts-page"]') && !document.querySelector(".add-overlay") && document.querySelector('.seg-btn[aria-selected="true"]')?.innerText === "Loans"), "Loan: the add form closes and the Debts & loans page opens on Loans");
ok((await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5") || "{}").transactions?.length || 0)) === 0, "no entry was created by the shortcut");ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await browser.close();
finish("e2e_run18_pad");
