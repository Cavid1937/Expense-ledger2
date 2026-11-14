// Run 88: "try this" notes in the bell, chosen from the first-launch answers (expense_ledger_v5__first_choices). Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, hasNotice, noticeText, noticeAct } from "./lib.mjs";
const browser = await launch();
const FIRST = "expense_ledger_v5__first_choices";
const seed = () => baseSeed({ transactions: [tx({ merchant: "Bravo", amount: 3 })], bills: [], lastBackup: new Date().toISOString(), backupConfirmedAt: new Date().toISOString() });
const setFirst = async (page, v) => { await page.evaluate((k, x) => localStorage.setItem(k, JSON.stringify(x)), FIRST, v); await page.reload(); await page.waitForSelector(".tabbar"); await wait(400); };
const first = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), FIRST);

section("R88-X1. Regular pay chosen at first launch, a day later: the bell suggests adding it");
{
  const page = await openPage(browser, { seed: seed() });
  await setFirst(page, { income: "fixed", at: Date.now() - 2 * 24 * 3600 * 1000 });
  ok(await hasNotice(page, "explore-pay"), "the regular-pay note waits in the bell");
  ok(/regularly/.test(await noticeText(page, "explore-pay")), "it refers to the answer given at first launch");
  await noticeAct(page, "explore-pay", "go"); await wait(700);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="rec-empty-add"], [data-section="rec-summary"]')), "Show me opens the Recurring page (its add button is shown)");
  const f = await first(page);
  ok(f && f.income === "fixed" && Array.isArray(f.exploreDone) && f.exploreDone.includes("pay") && typeof f.exploreAt === "number", "the note is remembered as answered, the first-launch answer kept", f);
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(400);
  ok(!(await hasNotice(page, "explore-pay")), "after reopening it does not come back");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.evaluate((k) => localStorage.removeItem(k), FIRST);
  await page.close();
}
section("R88-X2. Right after setting up: no note yet; 'Not now' also ends a note");
{
  const page = await openPage(browser, { seed: seed() });
  await setFirst(page, { income: "fixed", at: Date.now() - 3600 * 1000 });
  ok(!(await hasNotice(page, "explore-pay")), "an hour after the first launch: nothing yet");
  await setFirst(page, { income: "fixed", at: Date.now() - 2 * 24 * 3600 * 1000 });
  await noticeAct(page, "explore-pay", "no"); await wait(300);
  ok(!(await hasNotice(page, "explore-pay")) && (await first(page)).exploreDone.includes("pay"), "Not now: gone and remembered");
  await page.evaluate((k) => localStorage.removeItem(k), FIRST);
  await page.close();
}
await browser.close();
finish("e2e_run88_explore");
