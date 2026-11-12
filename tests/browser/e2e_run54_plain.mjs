// Run 54 (owner: "explain the app in simple language"): Home tells a new person what the app is in three plain sentences, says in one
// sentence what "Safe to Spend" means, and names the month's result in everyday words. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle, tx, daysAgo, TODAY } from "./lib.mjs";
const browser = await launch();
const card = (page) => page.evaluate(() => (document.querySelector('[data-section="home-welcome"]') || {}).innerText || "");
const empty = (language) => baseSeed({ language, transactions: [], budgets: {}, goals: [], templates: [] });
const noWelcome = () => { try { localStorage.removeItem("expense_ledger_v5__welcome"); } catch {} };

section("R54-1. A new person: three plain sentences, at the top, until 'Got it'");
{
  const page = await openPage(browser, { seed: empty("en"), pre: `(() => { try { if (!sessionStorage.getItem("__w")) { sessionStorage.setItem("__w", "1"); localStorage.removeItem("expense_ledger_v5__welcome"); } } catch {} })()` }); await settle(page);
  let c = await card(page);
  ok(/Welcome to Expense Ledger/.test(c) && /Write down what you spend and what you earn/.test(c) && /where your money goes and how much you can still spend/.test(c) && /Everything stays on this phone\. No account is needed/.test(c), "the card says what to do, what you gain and that it is private", c);
  ok(await page.evaluate(() => { const w = document.querySelector('[data-section="home-welcome"]'), first = document.querySelector('[data-section="home-month"], [data-section="home-safe"]'); return !!w && !!first && w.getBoundingClientRect().top < first.getBoundingClientRect().top && document.querySelectorAll('[data-section="home-welcome"] li').length === 3; }), "it sits above the numbers and has exactly three lines");
  ok(await page.evaluate(() => { const w = document.querySelector('[data-section="home-welcome"]'); return w.scrollWidth <= w.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth; }), "nothing is cut off or pushes the page sideways at phone width");
  await page.evaluate(() => document.querySelector('[data-section="welcome-ok"]').click()); await wait(300);
  ok((await card(page)) === "" && (await page.evaluate(() => localStorage.getItem("expense_ledger_v5__welcome"))) === "1", "'Got it' removes the card and remembers that under its own key");
  ok(JSON.stringify(Object.keys(JSON.parse(await page.evaluate(() => localStorage.getItem("expense_ledger_v5")))).includes("welcome")) === "false", "the main saved data is not touched by it");
  await page.reload(); await settle(page);
  ok((await card(page)) === "", "it stays away after closing and opening the app");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R54-2. Someone who already has entries never sees it; the numbers are named in plain words");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ type: "income", category: "salary", amount: 1000, merchant: "Employer", date: daysAgo(3) }), tx({ merchant: "Bravo", amount: 200, date: TODAY })] });
  const page = await openPage(browser, { seed, pre: noWelcome }); await settle(page);
  ok((await card(page)) === "", "with entries on record there is no welcome card (even if it was never dismissed)");
  const safe = await page.evaluate(() => (document.querySelector('[data-section="home-safe"]') || {}).innerText || "");
  ok(/What you can still spend this month, after your bills and savings\./.test(safe) && /Safe to Spend/.test(safe), "under Safe to Spend one sentence says what the number is", safe.slice(0, 200));
  const month = await page.evaluate(() => (document.querySelector('[data-section="home-month"]') || {}).innerText || "");
  ok(/Not spent/.test(month) && /80%/.test(month) && !/Surplus/.test(month), "1 000 in, 200 out: '80% Not spent' (it used to say 'Surplus')", month);
  await page.close();
  const over = baseSeed({ language: "en", transactions: [tx({ type: "income", category: "salary", amount: 100, merchant: "Employer", date: daysAgo(3) }), tx({ merchant: "Bravo", amount: 250, date: TODAY })] });
  const p2 = await openPage(browser, { seed: over }); await settle(p2);
  const m2 = await p2.evaluate(() => (document.querySelector('[data-section="home-month"]') || {}).innerText || ""), s2 = await p2.evaluate(() => (document.querySelector('[data-section="home-safe"]') || {}).innerText || "");
  ok(/Overspent/.test(m2) && !/Deficit/.test(m2), "100 in, 250 out: 'Overspent' (it used to say 'Deficit')", m2);
  ok(s2 === "" || /You have spent more than this month allows/.test(s2), "and Safe to Spend, when it is shown below zero, says so in words", s2.slice(0, 160));
  await p2.close();
}

section("R54-3. Azerbaijani and Russian");
for (const [l, title, line, plain, label] of [["az", /Expense Ledger-ə xoş gəlmisiniz/, /Hər şey bu telefonda qalır/, /bu ay hələ xərcləyə biləcəyiniz məbləğ/, /Qalıb/], ["ru", /Добро пожаловать в Expense Ledger/, /Всё хранится на этом телефоне/, /ещё можно потратить в этом месяце/, /Не потрачено/]]) {
  let p = await openPage(browser, { seed: empty(l), chooseLang: l, pre: noWelcome }); await settle(p);
  const c = await card(p);
  ok(title.test(c) && line.test(c), `${l}: the welcome card is translated`, c);
  await p.close();
  p = await openPage(browser, { seed: baseSeed({ language: l, transactions: [tx({ type: "income", category: "salary", amount: 1000, merchant: "E", date: daysAgo(3) }), tx({ merchant: "B", amount: 200, date: TODAY })] }), chooseLang: l }); await settle(p);
  const t = await p.evaluate(() => document.querySelector(".page, #root").innerText);
  ok(plain.test(t) && label.test(t), `${l}: the Safe to Spend sentence and the 'not spent' label are translated`, t.slice(0, 300));
  await p.close();
}
await finish("e2e_run54_plain", browser);
