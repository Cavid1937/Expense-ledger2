// Run 25: Home hierarchy - one big number (Safe to Spend), latest entries before the long donut. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const today = new Date().toISOString().slice(0, 10);
const T = [tx({ id: 1790001000001, merchant: "Salary", amount: 2400, type: "income", category: "salary", date: today }), tx({ id: 1790001000002, merchant: "Bravo", amount: 40, category: "groceries", date: today })];
const size = (page, sel) => page.evaluate((s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize), sel);

section("R25-HM1. With Safe to Spend on, its figure is the largest on Home");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: T }) }); await settle(page); await wait(400);
  const safe = await size(page, ".safe-amount"), month = await size(page, ".hero-amount");
  ok(safe > month, "Safe to Spend amount is larger than the month total", { safe, month });
  const order = await page.evaluate(() => [...document.querySelectorAll("[data-section]")].map((e) => e.getAttribute("data-section")).filter((s) => ["home-safe", "home-month", "home-latest", "home-breakdown"].includes(s)));
  ok(order.join(">") === "home-safe>home-month>home-latest>home-breakdown", "order is Safe to Spend, month, latest, breakdown", order);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "no horizontal scroll");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run25_home", browser);
