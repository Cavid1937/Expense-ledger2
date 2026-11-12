// Run 56 (owner decision, 12 Nov: "Where you paid" instead of "Merchant"): the add form and the detail sheet name the field in everyday
// words, and for income they ask "Who paid you". Azerbaijani and Russian keep their own words. Synthetic data only.
import { launch, openPage, openAdd, wait, ok, section, finish, baseSeed, settle, tx, TODAY, tab } from "./lib.mjs";
const browser = await launch();
const label = (page) => page.evaluate(() => (document.querySelector('label[for="txn-merchant"]') || {}).innerText || "");
const openMore = (page) => page.evaluate(() => { const b = document.querySelector(".more-toggle"); if (b && b.getAttribute("aria-expanded") !== "true") b.click(); });

section("R56-1. Add form: spending and income");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page);
  const hint = await page.evaluate(() => (document.querySelector(".more-toggle-sub") || {}).innerText || "");
  ok(/^Where you paid, note, date/.test(hint), "the folded section says 'Where you paid, note, date, …'", hint);
  await openMore(page); await wait(450);
  ok(/^Where you paid/.test(await label(page)) && !/Merchant/.test(await label(page)), "spending: the field is 'Where you paid'", await label(page));
  await page.evaluate(() => document.querySelectorAll(".type-pick")[1].click()); await wait(450);   // the second type button is Income
  await openMore(page); await wait(300);
  ok(/^Who paid you/.test(await label(page)), "income: the same field asks 'Who paid you'", await label(page));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R56-2. Detail sheet, search box and Analytics");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "Bravo", amount: 12, date: TODAY }), tx({ type: "income", category: "salary", merchant: "Employer", amount: 900, date: TODAY })] }) }); await settle(page);
  await tab(page, "Ledger"); await wait(400);
  ok((await page.evaluate(() => document.querySelector(".search-input").placeholder)) === "Search place, note, amount…", "the search box says 'Search place, note, amount…'");
  const open = async (m) => { await page.evaluate((m) => [...document.querySelectorAll(".txn-row")].find((x) => x.innerText.includes(m)).click(), m); await page.waitForSelector(".sheet"); await wait(450); };
  await open("Bravo");
  let s = await page.evaluate(() => document.querySelector(".detail-meta").innerText);
  ok(/Where you paid\s*\n?\s*Bravo/.test(s) && !/Merchant/.test(s), "spending entry: 'Where you paid: Bravo'", s);
  await page.evaluate(() => document.querySelector('.sheet [data-closer="1"]').click()); await page.waitForFunction(() => !document.querySelector(".sheet"), { timeout: 4000 }).catch(() => {}); await wait(300);
  await open("Employer");
  s = await page.evaluate(() => document.querySelector(".detail-meta").innerText);
  ok(/Who paid you\s*\n?\s*Employer/.test(s), "income entry: 'Who paid you: Employer'", s);
  await page.evaluate(() => document.querySelector('.sheet [data-closer="1"]').click()); await page.waitForFunction(() => !document.querySelector(".sheet"), { timeout: 4000 }).catch(() => {}); await wait(300);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(700);
  await page.evaluate(() => document.querySelectorAll(".an-panel[hidden]").forEach((p) => p.removeAttribute("hidden"))); await wait(200);
  const an = await page.evaluate(() => document.body.innerText);
  ok(/By place/.test(an) && !/By Merchant/.test(an), "Analytics: 'By place'");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R56-3. Azerbaijani and Russian keep their own words; the income label is translated");
for (const [l, sp, inc] of [["az", /Satıcı \/ xidmət/, /Kimdən gəlib/], ["ru", /Продавец/, /От кого/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l }), chooseLang: l, width: 320, height: 640 }); await settle(page); await openAdd(page); await openMore(page); await wait(450);
  const a = await label(page);
  await page.evaluate(() => document.querySelectorAll(".type-pick")[1].click()); await wait(450);   // the second type button is Income await openMore(page); await wait(300);
  const b = await label(page);
  ok(sp.test(a) && inc.test(b), `${l}: '${a.trim()}' for spending, '${b.trim()}' for income`, [a, b]);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: nothing pushes the page sideways at 320 px`);
  await page.close();
}
await finish("e2e_run56_place", browser);
