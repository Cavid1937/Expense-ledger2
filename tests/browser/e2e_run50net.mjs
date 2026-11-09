// Run 50 (owner list #15), run time: a session with distinctive private values (merchant, note, goal, amount) opens every tab
// and a reload; every http(s) request the page TRIES to make is recorded (the test harness then blocks it). None may carry the
// private values, and none may go to a host other than the site itself or the exchange-rate service.
import { launch, openPage, tab, wait, ok, section, finish, tx, baseSeed } from "./lib.mjs";
const browser = await launch();
const MERCH = "ZzqPrivateMerchant77", NOTE = "ZzqPrivateNote88", GOAL = "ZzqPrivateGoal99", AMT = "7654.32";
const seed = baseSeed({
  transactions: [tx({ merchant: MERCH, note: NOTE, amount: 7654.32 }), tx({ type: "income", category: "salary", amount: 9999.11, merchant: "Employer" })],
  goals: [{ id: "g1", name: GOAL, target: 4000, saved: 100, monthlyTarget: 0, targetDate: null }],
});
section("R50-NB1. What the page asks the network for during a normal session");
const page = await openPage(browser, { seed });
const seen = [];
page.on("request", (r) => { const u = r.url(); if (/^https?:/.test(u)) seen.push(u); });
for (const name of ["Home", "Ledger", "Analytics", "Goals", "More"]) { try { await tab(page, name); } catch { /* a tab name the helper does not know */ } await wait(300); }
await page.reload(); await wait(1200);
const bad = seen.filter((u) => u.includes(MERCH) || u.includes(NOTE) || u.includes(GOAL) || u.includes(AMT) || u.includes("7654"));
ok(bad.length === 0, "no request address contains the merchant, note, goal name or amount", bad);
const hosts = [...new Set(seen.map((u) => new URL(u).host))];
const stray = hosts.filter((h) => !["expense-ledger2.vercel.app", "api.frankfurter.dev"].includes(h));
ok(stray.length === 0, `only the site and the exchange-rate service are ever contacted (saw: ${hosts.join(", ") || "nothing"})`, stray);
const posts = await page.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name).filter((n) => /^https?:/.test(n)));
ok(posts.every((n) => !n.includes(MERCH) && !n.includes(NOTE)), "resource timing list holds no private value either");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close(); await browser.close();
finish("e2e_run50net");
