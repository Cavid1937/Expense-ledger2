// Run 85: the notifications bell, and the one-time "Help improve the app?" question inside it. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, hasNotice, noticeText, noticeAct, openBell } from "./lib.mjs";
const browser = await launch();
const LEARN = "expense_ledger_v5__learn";
const five = () => [1, 2, 3, 4, 5].map((i) => tx({ id: 1790000500000 + i, merchant: "Shop " + i, amount: i, category: "food" }));
const learn = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), LEARN);

section("R85-B1. Nothing to say: the bell is quiet");
{
  const page = await openPage(browser, { seed: baseSeed({ transactions: [tx({ merchant: "Bravo", amount: 3 })], lastBackup: new Date().toISOString(), backupConfirmedAt: new Date().toISOString() }) });
  const s = await page.evaluate(() => ({ bell: !!document.querySelector("[data-inbox-bell]"), count: document.querySelector("[data-inbox-bell] .inbox-count")?.textContent || "", ids: document.querySelector("[data-inbox-bell]")?.getAttribute("data-notices") }));
  ok(s.bell && s.count === "" && s.ids === "", "the bell is there with no count when there is nothing to tell", s);
  await openBell(page);
  ok(/No notifications|nothing/i.test(await page.evaluate(() => document.querySelector("[data-inbox-pop]")?.innerText || "")), "opening it says there is nothing new");
  await page.keyboard.press("Escape"); await wait(320);
  ok(!(await page.$("[data-inbox-pop]")), "Escape closes it");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R85-B2. After 5 entries the app asks once; 'No' is final");
{
  const page = await openPage(browser, { seed: baseSeed({ transactions: five(), lastBackup: new Date().toISOString(), backupConfirmedAt: new Date().toISOString() }) });
  ok(await hasNotice(page, "learn-ask"), "5 entries: the question waits in the bell");
  const txt = await noticeText(page, "learn-ask");
  ok(/anonymous/.test(txt) && /Never amounts/.test(txt) && /Settings/.test(txt), "it says what is shared, what never is, and where to change it", txt);
  await noticeAct(page, "learn-ask", "no"); await wait(300);
  const L = await learn(page);
  ok(L && L.asked === true && L.on === false, "No: remembered as answered, sharing off", L);
  ok(!(await hasNotice(page, "learn-ask")), "the question is gone");
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(400);
  ok(!(await hasNotice(page, "learn-ask")), "and it does not come back after reopening");
  await page.close();
}

section("R85-B3. 'Yes' turns sharing on");
{
  const page = await openPage(browser, { seed: baseSeed({ transactions: five(), lastBackup: new Date().toISOString(), backupConfirmedAt: new Date().toISOString() }) });
  await page.evaluate((k) => localStorage.removeItem(k), LEARN);
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(400);
  await noticeAct(page, "learn-ask", "yes"); await wait(300);
  const L = await learn(page);
  ok(L && L.on === true && L.asked === true, "Yes: sharing is on and the question is answered", L);
  ok(!(await hasNotice(page, "learn-ask")), "the question is gone");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.evaluate((k) => localStorage.removeItem(k), LEARN);
  await page.close();
}

section("R85-B4. Fewer than 5 entries: not asked yet");
{
  const page = await openPage(browser, { seed: baseSeed({ transactions: five().slice(0, 4) }) });
  await page.evaluate((k) => localStorage.removeItem(k), LEARN); await page.reload(); await page.waitForSelector(".tabbar"); await wait(400);
  ok(!(await hasNotice(page, "learn-ask")), "4 entries: no question");
  await page.close();
}
await finish("e2e_run85_bell", browser);
