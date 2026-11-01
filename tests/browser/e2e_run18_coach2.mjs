// Run 18f: the two new coach cards are visible on Analytics (category above usual, interest still to pay). Synthetic data.
import { launch, openPage, tab, wait, ok, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const ymd = (o, day) => { const x = new Date(d.getFullYear(), d.getMonth() + o, day); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const list = [-3, -2, -1].map((o, i) => tx({ id: "h" + i, amount: 100, category: "food", merchant: "Shop", date: ymd(o, 5) }));
list.push(tx({ id: "cur", amount: 200, category: "food", merchant: "Shop", date: ymd(0, 1) }));
const loan = { id: "l1", lender: "Bank", kind: "cash", principal: 120000, ratePct: 12, rateType: "annuity", months: 12, firstPayment: ymd(1, 1), bankPayment: null, payments: [] };
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: list }) });
await page.evaluate((l) => localStorage.setItem("expense_ledger_v5__debts", JSON.stringify({ version: 1, debts: [], loans: [l] })), loan);
await page.reload(); await page.waitForSelector(".tabbar"); await settle(page);
await tab(page, "Analytics"); await wait(500);
const txt = await page.evaluate(() => document.body.innerText);
ok(/Food[^.]*% above your usual so far this month|% above your usual/.test(txt) && /100% above/.test(txt), "the category card says food is 100% above the usual");
ok(/If you pay Bank exactly as scheduled, about 79\.\d\d \S+ of what you pay will be interest/.test(txt), "the loan card names the lender and says part of the payments is interest");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
// hide a tip, keep it hidden after a reload, bring it back
await page.evaluate(() => document.querySelector('[data-coach="catUp"] .coach-hide').click()); await wait(300);
ok(!(await page.$('[data-coach="catUp"]')) && !!(await page.$('[data-coach="loanInterest"]')), "Hide removes only that tip");
await page.reload(); await page.waitForSelector(".tabbar"); await settle(page); await tab(page, "Analytics"); await wait(500);
ok(!(await page.$('[data-coach="catUp"]')) && /Show hidden tips \(1\)/.test(await page.evaluate(() => document.body.innerText)), "it stays hidden after a reload, and the way back is offered");
await page.evaluate(() => document.querySelector(".coach-unhide").click()); await wait(300);
ok(!!(await page.$('[data-coach="catUp"]')) && !(await page.$(".coach-unhide")), "Show hidden tips brings it back");
ok(page.errors.length === 0, "no JavaScript errors after hiding and showing", page.errors[0]);
await browser.close();
finish("e2e_run18_coach2");
