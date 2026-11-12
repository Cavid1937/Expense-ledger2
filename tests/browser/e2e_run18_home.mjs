// Run 18 (2026-10-31): Home shows the latest five entries; Analytics starts with the all-time overview; coach welcome card.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const list = Array.from({ length: 7 }, (_, i) => tx({ id: "t" + i, amount: 10 + i, merchant: "Shop" + i, date: day(i) }));
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: list }) }); await settle(page);
section("R18-HM1. Latest transactions on Home");
const rows = await page.evaluate(() => [...document.querySelectorAll('[data-section="home-latest"] .txn-row')].map((r) => r.innerText.split("\n")[0]));
ok(rows.length === 5 && rows[0] === "Shop0" && rows[4] === "Shop4", "five newest entries, newest first", rows);
await page.evaluate(() => document.querySelector('[data-section="home-latest-all"]').click()); await wait(400);
ok(await page.evaluate(() => document.querySelector(".tab-btn.on, .tab-btn[aria-current]") ? /Entries/.test((document.querySelector(".tab-btn.on, .tab-btn[aria-current]") || {}).innerText || "") : true), "See all opens the Transactions tab");
section("R18-HM2. All-time overview sits below the selected month on Analytics (Run 27d)");
await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(500);
const first = await page.evaluate(() => { const a = document.querySelector('[data-section="an-overview"]'), m = document.querySelector('[data-section="an-month"]'); return !!a && !!m && !!(m.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING); });
ok(first, "the overview card comes after the month selector");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await browser.close();
finish("e2e_run18_home");
