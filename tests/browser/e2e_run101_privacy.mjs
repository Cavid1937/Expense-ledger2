// Run 101 (code review of Runs 97-101): with privacy mode on, the "Entries with no account" sheet showed each entry's shop name and
// note in plain words, on screen and in the screen-reader label of every account button. The rest of the app masks them. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, daysAgo, wait } from "./lib.mjs";
const browser = await launch();
const accs = new Function(`try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:"${daysAgo(10)}"},hidden:false}],transfers:[]}));}}catch(e){}`);
const seed = baseSeed({ language: "en", transactions: [
  tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: daysAgo(3), account: "a_card01" }),
  tx({ amount: 12.5, merchant: "Secret Bakery", date: daysAgo(1) }),
  tx({ amount: 7.5, merchant: "", note: "Private note", category: "transport", date: daysAgo(2) }),
] });
const sheet = (page) => page.evaluate(() => { const s = document.querySelector('[data-section="loose-sheet"]'); return s ? { text: s.textContent, labels: [...s.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")).join(" | ") } : null; });
section("R101-P1. Privacy mode hides names and notes in the no-account sheet");
{
  const page = await openPage(browser, { seed, pre: accs }); await settle(page);
  await page.evaluate(() => document.querySelector('[data-section="home-loose-fix"]').click()); await wait(400);
  let s = await sheet(page);
  ok(s && /Secret Bakery/.test(s.text) && /Private note/.test(s.text), "privacy off: the names are shown (so the person can tell entries apart)", s && s.text.slice(0, 160));
  await page.evaluate(() => document.querySelector('[data-section="loose-sheet"] [data-closer="1"]').click()); await wait(300);
  await page.evaluate(() => document.querySelector(".topbar .privacy-toggle").click()); await wait(400);
  await page.evaluate(() => document.querySelector('[data-section="home-loose-fix"]').click()); await wait(400);
  s = await sheet(page);
  ok(s && !/Secret Bakery|Private note/.test(s.text), "privacy on: no shop name or note on screen", s && s.text.slice(0, 200));
  ok(s && !/Secret Bakery|Private note|12\.50|7\.50/.test(s.labels), "privacy on: no name, note or amount in the screen-reader labels", s && s.labels.slice(0, 200));
  ok(s && /•••••/.test(s.text), "the hidden names show the same dots as elsewhere");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run101_privacy", browser);
