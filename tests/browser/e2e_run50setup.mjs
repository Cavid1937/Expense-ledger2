// Run 50 in the real bundled app: the optional "Set up in a minute" sheet opened from the Home checklist.
// Run 79: the questions are one per page now (Next / Back / Done); the money rules and what gets created are unchanged.
import { launch, openPage, state, ok, section, finish, baseSeed, wait } from "./lib.mjs";
const browser = await launch();
const clock = `() => { try { if (!sessionStorage.getItem("__r50u")) { sessionStorage.setItem("__r50u", "1"); localStorage.removeItem("expense_ledger_v5__accounts"); } } catch (e) {} const fixed = new Date(2026, 9, 20, 12, 0, 0).getTime(); const RD = Date; class FD extends RD { constructor(...a) { if (a.length === 0) super(fixed); else super(...a); } static now() { return fixed; } } window.Date = FD; }`;
const empty = () => baseSeed({ transactions: [], goals: [], budgets: {}, bills: [], lastBackup: null });
const accounts = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("expense_ledger_v5__accounts") || "null"); } catch { return null; } });
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const next = async (page) => { await click(page, '[data-section="setupq-next"]'); await wait(420); };
const onPage = (page) => page.evaluate(() => document.querySelector(".setup-page")?.dataset.step);

section("R50-UB1. A refused answer creates nothing and is shown on its own page");
let page = await openPage(browser, { seed: empty(), pre: eval(clock) });
await wait(500);
ok(await page.$('[data-section="setup-wizard"]') !== null, "the Home checklist offers 'Set up in a minute'");
await click(page, '[data-section="setup-wizard"]'); await page.waitForSelector('[data-section="setupq"]', { timeout: 4000 }); await wait(400);
await page.type("#setupq-cash", "120");
await next(page);
await click(page, '[data-income="fixed"]'); await wait(300);
await next(page); await next(page);
ok(await onPage(page) === "debts" && !!(await page.$('[data-section="setupq-save"]')), "four pages; the last one has Done");
await click(page, '[data-section="setupq-save"]'); await wait(500);
ok(await onPage(page) === "income" && await page.$('[data-section="setupq-err-salary"]') !== null && await page.$('[data-section="setupq-err-payDay"]') !== null, "fixed pay without an amount and day: Done goes back to that page and shows the problem at those fields", await onPage(page));
const st0 = await state(page);
ok((st0.bills || []).length === 0 && (await accounts(page)) === null, "nothing was created while an answer is invalid", { bills: st0.bills, acc: await accounts(page) });

section("R50-UB2. Valid answers create accounts, a pay bill and a goal");
await click(page, '[data-section="setupq-back"]'); await wait(420);
ok(await onPage(page) === "money" && (await page.$eval("#setupq-cash", (e) => e.value)) === "120", "Back keeps what was typed");
await page.type("#setupq-bank", "350.5");
await next(page);
await page.type("#setupq-salary", "1500");
await page.type("#setupq-day", "5");
await next(page);
await page.type("#setupq-goal", "Laptop");
await page.type("#setupq-target", "2000");
await next(page);
await click(page, '[data-section="setupq-save"]'); await wait(800);
const st = await state(page), acc = await accounts(page);
ok(acc && acc.accounts.length === 2 && acc.accounts.some((a) => a.name === "Cash" && a.kind === "cash" && a.opening.amount === 120) && acc.accounts.some((a) => a.name === "Bank card" && a.kind === "card" && a.opening.amount === 350.5), "two accounts with their opening balances (Cash 120, Bank card 350.50)", acc);
ok(st.bills.length === 1 && st.bills[0].type === "income" && st.bills[0].amount === 1500 && st.bills[0].freq === "monthly" && st.bills[0].anchorDate === "2026-11-05", "one monthly income bill: 1500, first on 5 Nov", st.bills);
ok(st.goals.length === 1 && st.goals[0].name === "Laptop" && st.goals[0].target === 2000 && st.goals[0].saved === 0, "one goal: Laptop, 2000, nothing saved", st.goals);
ok(st.transactions.length === 0, "no entries were invented");
ok(await page.$('[data-section="setupq"]') === null, "the sheet closed");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R50-UB3. Skipping changes nothing");
page = await openPage(browser, { seed: empty(), pre: eval(clock) });
await wait(500);
await click(page, '[data-section="setup-wizard"]'); await page.waitForSelector('[data-section="setupq"]'); await wait(300);
await page.type("#setupq-cash", "50");
await click(page, '[data-section="setupq-skip"]'); await wait(400);
const s3 = await state(page);
ok((s3.bills || []).length === 0 && s3.goals.length === 0 && (await accounts(page)) === null, "Not now creates nothing, even with something typed");
await page.close(); await browser.close();
finish("e2e_run50setup");
