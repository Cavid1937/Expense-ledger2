// Diagnostic follow-up to polish_probe: checks the four items the first probe flagged (more filters, row pick, theme chips).
import { launch, openPage, wait, baseSeed, tx, settle, ymd } from "./lib.mjs";
const browser = await launch();
const txns = [];
for (let i = 0; i < 12; i++) txns.push(tx({ amount: 5 + i, category: "food", merchant: "Bravo", date: ymd(new Date(Date.now() - i * 86400000)) }));
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: txns }) });
await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await settle(page);
const q = (fn, ...a) => page.evaluate(fn, ...a);
await q(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(600);

const anim = (label) => q(async (l) => { await new Promise((r) => setTimeout(r, 40)); return l + " anims=" + document.getAnimations().filter((a) => a.playState === "running").length; }, label);
await q(() => [...document.querySelectorAll(".filter-bar .chip")].find((e)=>/date/i.test(e.textContent)).click());
console.log(await anim("more open"), "expanded=", await q(() => 1));
await wait(500);
await q(() => [...document.querySelectorAll(".filter-bar .chip")].find((e)=>/date/i.test(e.textContent)).click());
console.log(await anim("more close"));
await wait(500);
await q(() => document.querySelector('[data-section="tx-select-toggle"]').click()); await wait(500);
console.log("rows:", await q(() => document.querySelectorAll(".txn-sel-row").length), "checkbox-ish:", await q(() => document.querySelectorAll('.txn-row input[type=checkbox], .txn-row [role=checkbox], .txn-row .sel-box').length));
await q(() => { window.__t = performance.now(); document.querySelectorAll(".txn-sel-row")[0].click(); });
console.log(await anim("pick row"), "picked marked:", await q(() => document.querySelectorAll('.txn-row[aria-selected="true"], .txn-row.picked, .txn-sel-row.on, .txn-row [aria-checked="true"], .txn-row input:checked').length));
await q(() => document.querySelector('[data-section="tx-select-toggle"]').click()); await wait(500);
await q(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(600);
const folds = await q(() => [...document.querySelectorAll("[data-fold-head]")].map((e) => e.textContent.trim().slice(0, 20)));
console.log("folds:", JSON.stringify(folds));
for (let i = 0; i < folds.length; i++) {
  await q((k) => document.querySelectorAll("[data-fold-head]")[k].click(), i); await wait(500);
  const has = await q(() => document.querySelectorAll("[data-theme-id]").length);
  if (has) {
    console.log("theme chips found in fold", i, has);
    await q(() => document.querySelector('[data-theme-id="graphite"]').click());
    console.log(await anim("theme change"), "bg now:", await q(() => getComputedStyle(document.body).backgroundColor));
    break;
  }
  await q((k) => document.querySelectorAll("[data-fold-head]")[k].click(), i); await wait(400);
}
console.log("errors:", page.errors.slice(0, 3));
await browser.close();


