// Run 18 (2026-10-31): the round add button must not cover amounts: it slides away when the page is scrolled down and returns when scrolled up.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const many = Array.from({ length: 30 }, (_, i) => tx({ id: "t" + i, amount: 10 + i, merchant: "Shop " + i, date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10) }));
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: many }) }); await settle(page);
await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500);
const hidden = () => page.evaluate(() => document.querySelector(".fab-add").classList.contains("fab-hide"));
section("R18-FAB1. Hide on scroll down, show on scroll up");
ok(!(await hidden()), "visible at the top");
await page.evaluate(() => window.scrollTo(0, 600)); await wait(300);
ok(await hidden(), "hidden after scrolling down");
ok(await page.evaluate(() => document.querySelector(".fab-add").getAttribute("aria-hidden") === "true" && document.querySelector(".fab-add").tabIndex === -1), "hidden from keyboard and screen readers while away");
await page.evaluate(() => window.scrollTo(0, 400)); await wait(300);
ok(!(await hidden()), "back after scrolling up");
await page.evaluate(() => window.scrollTo(0, 0)); await wait(300);
ok(!(await hidden()) && page.errors.length === 0, "visible at the top again, no JavaScript errors");
await browser.close();
finish("e2e_run18_fab");
