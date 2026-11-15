// Run 90 (design review 2): the Analytics Overview is four blocks (month result, trend, top three categories, one insight);
// the forecast moved to Insights, the debt / loan / recurring lines to Spending. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle, TODAY } from "./lib.mjs";
const browser = await launch();
const seed = baseSeed({ language: "en", transactions: [
  tx({ type: "income", category: "salary", amount: 1000, merchant: "Employer", date: TODAY }),
  tx({ category: "food", amount: 120, merchant: "Shop A", date: TODAY }), tx({ category: "transport", amount: 40, merchant: "Bus", date: TODAY }),
  tx({ category: "housing", amount: 300, merchant: "Rent", date: TODAY }), tx({ category: "health", amount: 15, merchant: "Pharmacy", date: TODAY })] });
const panelSections = (page, id) => page.evaluate((p) => [...document.querySelectorAll(`.an-panel[data-panel="${p}"] [data-section]`)].map((e) => e.dataset.section), id);

section("R90-OV1. Overview shows only the four blocks");
{
  const page = await openPage(browser, { seed }); await settle(page);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(500);
  const ov = await panelSections(page, "overview");
  ok(ov.includes("an-summary") && ov.includes("an-trend") && ov.includes("an-topcats"), "month result, trend and top categories are in Overview", ov);
  ok(!ov.includes("an-forecast") && !ov.includes("an-debtcash") && !ov.includes("an-loancash"), "the forecast and the cash lines are no longer in Overview", ov);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-section="an-topcats"] .cat-bar-name')].map((e) => e.innerText.trim()));
  ok(rows.length === 3 && /Home|Housing/i.test(rows[0]) && /Food/i.test(rows[1]) && /Transport/i.test(rows[2]), "the top three categories, largest first (300, 120, 40)", rows);
  ok(await page.evaluate(() => document.querySelectorAll('[data-section="an-oneinsight"] .coach-line').length === 0), "at most one insight sentence, without the full coach list");
  ok((await panelSections(page, "insights")).includes("an-forecast"), "the forecast now lives in Insights");
  await page.evaluate(() => document.querySelector('[data-section="an-topcats-more"]').click()); await wait(300);
  ok(await page.evaluate(() => document.querySelector('[data-seg="spending"]').getAttribute("aria-selected") === "true"), "All categories opens the Spending tab");
  ok(!!(await page.evaluate(() => { const c = document.querySelector('[data-section="an-category"]'); return c && c.offsetParent; })), "the full category list is visible there");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R90-OV2. The all-time card is called All time, not Overview");
{
  const page = await openPage(browser, { seed }); await settle(page);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(500);
  ok(await page.evaluate(() => /^All time/.test(document.querySelector('[data-section="an-overview"] .a-card-title').innerText.trim())), "the all-time card title is All time");
  await page.close();
}
await finish("e2e_run90_overview", browser);
