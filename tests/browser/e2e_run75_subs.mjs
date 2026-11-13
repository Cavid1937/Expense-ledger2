// Run 75 in the real bundled app: subscriptions apart from other repeating payments on the Recurring page. Synthetic data only.
import { launch, openPage, tab, state, ok, section, finish, baseSeed, wait, daysAgo } from "./lib.mjs";
const browser = await launch();
const bill = (o) => ({ id: o.id, name: o.name, type: "expense", amount: o.amount, freq: "monthly", anchorDate: daysAgo(20), category: o.category, subcategory: "", active: true, createdAt: "2026-10-01T00:00:00Z", ...(o.kind ? { kind: o.kind } : {}) });
const seed = baseSeed({ language: "en", transactions: [], bills: [bill({ id: "b1", name: "Netflix", amount: 12, category: "digital" }), bill({ id: "b2", name: "Spotify", amount: 6, category: "entertain" }), bill({ id: "b3", name: "Rent", amount: 500, category: "housing" })] });
const page = await openPage(browser, { seed }); await tab(page, "Recurring"); await wait(500);
const groups = () => page.evaluate(() => ({ subs: [...document.querySelectorAll('[data-section="rec-subs"] [data-section="rec-item"]')].map((r) => r.innerText.split("\n")[0]), others: [...document.querySelectorAll('[data-section="rec-others"] [data-section="rec-item"]')].map((r) => r.innerText.split("\n")[0]), total: (document.querySelector('[data-section="rec-subs-total"]') || {}).innerText || "" }));

section("R75-SB1. Two groups in the same place");
let g = await groups();
ok(g.subs.join() === "Netflix,Spotify" || g.subs.join() === "Spotify,Netflix", "Netflix (Phone & Subscriptions) and Spotify (by its name) are under Subscriptions", g);
ok(g.others.join() === "Rent" && /Other repeating payments/.test(await page.evaluate(() => document.querySelector('[data-section="rec-others-title"]').innerText)), "Rent is under 'Other repeating payments'", g);
ok(/18\.00/.test(g.total) && /216\.00/.test(g.total), "the subscriptions show their own total: 18.00 a month, 216.00 a year", g.total);

section("R75-SB2. The person can move one");
await page.evaluate(() => [...document.querySelectorAll('[data-section="rec-subs"] .bill-row')].find((r) => /Spotify/.test(r.innerText)).click()); await page.waitForSelector(".bill-sheet"); await wait(300);
await page.select("#bill-kind", "bill"); await wait(150);
await page.evaluate(() => document.querySelector(".bill-save").click()); await wait(600);
g = await groups();
ok(g.subs.join() === "Netflix" && g.others.length === 2 && g.others.includes("Spotify"), "marking Spotify as 'Other repeating payment' moves it, and the totals follow", g);
ok((await state(page)).bills.find((b) => b.id === "b2").kind === "bill", "the choice is saved with the bill");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await browser.close();
finish("e2e_run75_subs");
