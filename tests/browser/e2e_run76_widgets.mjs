// Run 76 in the real bundled app: the widget section in Settings and the package sent to the Android widgets. The Android side is a
// stand-in (window.LedgerNative.widget) that records what the page sends. Synthetic data only.
import { launch, openPage, openSettings, ok, section, finish, baseSeed, tx, wait, TODAY } from "./lib.mjs";
const browser = await launch();
const SHELL = `window.__pins = []; window.__snaps = []; window.LedgerNative = { widget: { canPin: () => Promise.resolve(true), requestPin: (k) => { window.__pins.push(k); return Promise.resolve(true); }, set: () => Promise.resolve(true), update: (j) => { window.__snaps.push(JSON.parse(j)); return Promise.resolve(true); } } };`;
const seed = () => baseSeed({ language: "en", goals: [], budgets: { food: 300 }, safeToSpend: { enabled: true, savingsTarget: 0 }, transactions: [tx({ type: "income", category: "salary", amount: 2000, date: TODAY }), tx({ merchant: "Bravo", category: "food", amount: 120, date: TODAY })] });
const last = (page) => page.evaluate(() => window.__snaps[window.__snaps.length - 1] || null);

section("R76-WB1. Five widgets can be placed from Settings");
const page = await openPage(browser, { seed: seed(), fresh: true, pre: SHELL });
await openSettings(page); await wait(500);
const kinds = await page.evaluate(() => [...document.querySelectorAll('[data-section^="widget-add-"]')].map((b) => b.getAttribute("data-section").replace("widget-add-", "")));
ok(kinds.join() === "safe,summary,budget,accounts,quick", "Safe to Spend, This month, Budget, Accounts and Quick actions are offered", kinds);
await page.evaluate(() => document.querySelector('[data-section="widget-add-budget"]').click()); await wait(300);
ok((await page.evaluate(() => window.__pins)).join() === "budget", "Add asks the phone to place exactly that widget");

section("R76-WB2. The package the widgets show");
let s = await last(page);
ok(s && s.v === 1 && /Safe to spend/.test(s.safe.title) && /1,880\.00/.test(s.safe.amount) && s.month.exp.includes("120.00") && s.budget.pct === 40, "Safe to Spend 1,880.00 (2,000 − 120), this month's 120.00 spent, the Food budget 40% used", s && { safe: s.safe.amount, exp: s.month.exp, pct: s.budget.pct });
ok(s && /^#[0-9A-F]{6}$/i.test(s.theme.card) && s.quick.transfer === "Transfer", "it carries the theme's colours and the labels");
await page.evaluate(() => document.querySelector('[data-section="widget-hide"]').click()); await wait(500);
s = await last(page);
ok(s && s.hide === true && s.safe.amount === "••••" && s.month.inc === "••••", "'Hide amounts on widgets' replaces every amount with ••••", s && s.safe.amount);
await page.evaluate(() => document.querySelector('[data-section="widget-hide"]').click()); await wait(400);
await page.evaluate(() => document.querySelector('[data-theme-id="graphite"]').click()); await wait(600);
s = await last(page);
ok(s && s.theme.bg === "#101419" && s.hide === false, "choosing another theme sends the new colours to the widgets at once", s && s.theme.bg);
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R76-WB3. While an app lock is set, amounts never reach the home screen");
{
  const p2 = await openPage(browser, { seed: seed(), fresh: true, pre: SHELL + `localStorage.setItem("expense_ledger_v5__lock", JSON.stringify({ v: 1, salt: "x", hash: "y", timeout: 0 }));` });
  await wait(1500);
  const s2 = await last(p2);
  ok(!s2 || (s2.hide === true && !JSON.stringify(s2).includes("1,880")), "with a lock record present, the package has no amounts (or none is sent before unlocking)", s2 && s2.safe);
  await p2.close();
}
await browser.close();
finish("e2e_run76_widgets");
