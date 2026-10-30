// Run 16 (2026-10-29) in the real bundled app: the "How it works" and Privacy sheets. Synthetic data only.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const rows = (page) => page.evaluate(() => [...document.querySelectorAll(".more-page .list-row")].map((r) => r.innerText.replace(/\s+/g, " ").trim()));
const openRow = async (page, i) => { await page.evaluate((i) => document.querySelectorAll(".more-page .list-row")[i].click(), i); await wait(400); };
const sheet = (page, kind) => page.evaluate((k) => { const e = document.querySelector(`[data-section="info-${k}"]`); return e ? { heads: [...e.querySelectorAll(".list-title")].map((x) => x.innerText.trim()), text: e.innerText } : null; }, kind);

section("R16-I1. More lists the two new rows after the first three, and each opens a sheet (en)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await tab(page, "More"); await settle(page);
  const r = await rows(page); ok(r.length === 5 && /Recurring|payments/i.test(r[0]) && /Import/i.test(r[1]) && /Settings/i.test(r[2]), "five rows; Recurring, Import / Export and Settings keep places 1 to 3", r);
  await openRow(page, 3); const how = await sheet(page, "how");
  ok(!!how && how.heads.length === 4 && /Add what you spend/.test(how.heads[0]) && /Safe to Spend/.test(how.heads[1]), "How it works: four steps, the second explains Safe to Spend", how && how.heads);
  ok(/no account/i.test(how.text) && /backup/i.test(how.text), "it tells the user there is no account and to keep a backup file");
  await page.evaluate(() => document.querySelector('[data-section="info-how"] .btn-primary').click()); await wait(300); ok(!(await sheet(page, "how")), "Close closes it");
  await openRow(page, 4); const pr = await sheet(page, "privacy");
  ok(!!pr && pr.heads.length === 6 && /no account, no ads and no analytics/i.test(pr.text) && /Nothing is sent to us/i.test(pr.text) && /Vercel/.test(pr.text), "Privacy: six short sections; says no account, no ads, no analytics, nothing is sent, and names the website host", pr && pr.heads);
  await page.evaluate(() => document.querySelector('[data-section="info-privacy"] [aria-label="Close"]').click()); await wait(300); ok(!(await sheet(page, "privacy")), "the x button closes it");
  await openRow(page, 3); await page.evaluate(() => window.__ledgerNativeBack && window.__ledgerNativeBack()); await wait(300); ok(!(await sheet(page, "how")), "the phone's Back button closes the sheet first");
  await page.close();
}
section("R16-I2. A brand-new ledger offers 'How it works' on Home");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page);
  ok(!!(await page.$('[data-section="home-how"]')), "the empty Home has a 'How it works' button next to 'Add first transaction'");
  await page.evaluate(() => document.querySelector('[data-section="home-how"]').click()); await wait(300); ok(!!(await sheet(page, "how")), "it opens the same sheet");
  await page.close();
}
section("R16-I3. az and ru show real text, nothing overflows, and the app asks for nothing from the network");
for (const lang of ["az", "ru"]) {
  const page = await openPage(browser, { seed: baseSeed({ language: lang }) }); await tab(page, "More"); await settle(page);
  await openRow(page, 4); const pr = await sheet(page, "privacy");
  ok(!!pr && pr.heads.length === 6 && pr.heads.every((h) => h.length > 3 && !/info\./.test(h)) && !/info\.privacy/.test(pr.text), `${lang}: six translated sections, no raw keys`, pr && pr.heads);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); ok(!ov, `${lang}: no horizontal overflow`);
  await page.close();
}
{
  const page = await browser.newPage(); const external = [];
  await page.setRequestInterception(true); page.on("request", (r) => { const u = r.url(); if (/^https?:/.test(u) && !/^http:\/\/localhost|^http:\/\/127\./.test(u)) external.push(u); r.continue().catch(() => {}); });
  await page.evaluateOnNewDocument((k, d) => { if (!sessionStorage.getItem("__s")) { sessionStorage.setItem("__s", "1"); localStorage.setItem(k, JSON.stringify(d)); } }, "expense_ledger_v5", baseSeed({ language: "en" }));
  await page.goto(process.env.PAGE_URL || "file:///tmp/tools/page/index.html"); await page.waitForSelector(".tabbar"); await wait(1500);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(400);
  ok(external.length === 0, "opening and using the app in the test bundle makes no request to any outside address (supports the privacy text; the real site also checks its own page for updates)", external);
  await page.close();
}
await browser.close();
finish("e2e_run16_info");
