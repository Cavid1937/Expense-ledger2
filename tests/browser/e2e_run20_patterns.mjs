// Run 20: Patterns lines get a heading and can be hidden one by one and brought back; the choice survives closing the app and never touches the ledger.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle, TODAY } from "./lib.mjs";
const browser = await launch();
const KEY = "expense_ledger_v5", MUTE = "expense_ledger_v5__patmute";
const seed = (language) => baseSeed({ language, transactions: [...Array.from({ length: 6 }, (_, i) => tx({ merchant: "Bravo", amount: 20 + i, category: "food" })), tx({ merchant: "Bus", amount: 3, category: "transport" })] });
const items = (page) => page.evaluate(() => [...document.querySelectorAll('[data-section="pattern-item"]')].map((e) => ({ id: e.dataset.id, text: e.innerText })));
const goAnalytics = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(500); };

section("R20-PT1. Heading, hide, bring back, remember (en)");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page); await goAnalytics(page);
  const list = await items(page);
  ok(list.length >= 1 && list.some((x) => x.id === "catconc"), "the category-concentration line is shown", list.map((x) => x.id));
  ok(/One category dominates/.test(list.find((x) => x.id === "catconc").text), "it has a heading above the sentence");
  ok(/Based on 7 entries this month/.test(list.find((x) => x.id === "catconc").text), "it says how many entries it is based on (7 this month)", list.find((x) => x.id === "catconc").text);
  const ledger = await page.evaluate((k) => localStorage.getItem(k), KEY);
  await page.evaluate(() => document.querySelector('[data-id="catconc"] .pattern-hide').click()); await wait(250);
  ok(!(await items(page)).some((x) => x.id === "catconc"), "Hide removes just that line");
  ok(JSON.parse(await page.evaluate((k) => localStorage.getItem(k), MUTE)).includes("catconc"), "the choice is stored under its own key");
  ok((await page.evaluate((k) => localStorage.getItem(k), KEY)) === ledger, "the ledger is byte-for-byte unchanged");
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(500); await goAnalytics(page);
  ok(!(await items(page)).some((x) => x.id === "catconc"), "still hidden after closing and reopening");
  await page.evaluate(() => document.querySelector(".pattern-unhide").click()); await wait(250);
  ok((await items(page)).some((x) => x.id === "catconc") && (await page.evaluate((k) => localStorage.getItem(k), MUTE)) === null, "'Show hidden' brings it back and clears the choice");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.evaluate((k) => localStorage.removeItem(k), MUTE); await page.close();
}
section("R20-PT2. Headings in az and ru");
for (const [l, re] of [["az", /Bir kateqoriya/], ["ru", /Одна категория/]]) {
  const page = await openPage(browser, { seed: seed(l) }); await settle(page); await goAnalytics(page);
  const c = (await items(page)).find((x) => x.id === "catconc");
  ok(!!c && re.test(c.text), `${l}: heading shown`, c && c.text);
  await page.close();
}
await finish("e2e_run20_patterns", browser);
