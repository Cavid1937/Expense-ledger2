// Run 57 (owner, 10 Nov: "Category button closes instantly, Claude app feel must be applied"): the category filter sheet, and the import
// sheet's Cancel / OK, close with the same slide-down as every other sheet instead of vanishing in one frame. Synthetic data only.
import { launch, openPage, openData, wait, ok, section, finish, settle, tab, baseSeed, tx, TODAY, fs, path } from "./lib.mjs";
const IMP = process.env.E2E_IMP_DIR || "/tmp/tools/imp"; fs.mkdirSync(IMP, { recursive: true });
const browser = await launch();
// Tap, then watch the sheet for 600 ms: is it still there (leaving) for a moment, and is it gone at the end? The tap and the watching run in one
// step, so every sample is taken after the tap has landed (two separate steps let a sample slip in before the tap: a test timing flaw, not the app).
const tapAndWatch = (page, sel, text) => page.evaluate((sel, text) => new Promise((res) => { const el = [...document.querySelectorAll(sel)].find((b) => !text || new RegExp(text).test(b.innerText.trim())); const seen = []; const t0 = performance.now(); el.click(); const tick = () => { const ov = document.querySelector(".sheet-overlay"); seen.push({ t: Math.round(performance.now() - t0), there: !!ov, leaving: !!(ov && ov.classList.contains("leaving")) }); if (performance.now() - t0 < 600) requestAnimationFrame(tick); else res(seen); }; tick(); }), sel, text || null);

section("R57-C1. Choosing a category: the sheet slides away, then the filter applies");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "Bravo", amount: 12, date: TODAY }), tx({ merchant: "Bus", amount: 1, category: "transport", date: TODAY })] }) }); await tab(page, "Ledger"); await settle(page);
  await page.evaluate(() => document.querySelector(".cat-filter-btn").click()); await page.waitForSelector(".sheet"); await wait(450);
  const seen = await tapAndWatch(page, '.sheet [data-cat-pick="transport"]');
  const early = seen.filter((s) => s.t < 120), late = seen[seen.length - 1];
  ok(early.length > 0 && early.every((s) => s.there && s.leaving), "for the first moment after the tap the sheet is still there, sliding away", early.slice(0, 3));
  ok(late && !late.there, "and 0.6 s later it is gone", late);
  await wait(200);
  const rows = await page.evaluate(() => [...document.querySelectorAll(".txn-row")].map((r) => r.innerText));
  ok(rows.length === 1 && /Bus/.test(rows[0]), "the chosen category (Transport) is applied", rows);
  await page.evaluate(() => document.querySelector(".cat-filter-btn").click()); await page.waitForSelector(".sheet"); await wait(450);
  const seen2 = await tapAndWatch(page, ".sheet .btn", "Close");
  ok(seen2.filter((s) => s.t < 120).every((s) => s.there && s.leaving) && !seen2[seen2.length - 1].there, "Close slides it away too", seen2.filter((s, i) => i < 4 || i === seen2.length - 1));
  ok((await page.evaluate(() => document.querySelectorAll(".txn-row").length)) === 1, "Close keeps the filter that was on");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R57-C2. With reduced motion the sheet closes at once (nothing waits)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "Bravo", amount: 12, date: TODAY })] }) });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]); await tab(page, "Ledger"); await settle(page);
  await page.evaluate(() => document.querySelector(".cat-filter-btn").click()); await page.waitForSelector(".sheet"); await wait(300);
  await page.evaluate(() => document.querySelector('.sheet [data-cat-pick="all"]').click()); await wait(80);
  ok(!(await page.$(".sheet-overlay")), "reduced motion: closed immediately");
  await page.close();
}

section("R57-C3. The import sheet's Cancel slides away too");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openData(page);
  const f = path.join(IMP, "cat57.csv"); fs.writeFileSync(f, "Date,Amount,Merchant\r\n2026-11-01,5,Shop");
  const input = await page.$(".io-page input[type=file]"); await input.uploadFile(f); await page.waitForSelector('[aria-label="Restore backup"]'); await wait(400);
  const seen = await tapAndWatch(page, '[aria-label="Restore backup"] .btn', "^Cancel");
  ok(seen.filter((s) => s.t < 120).every((s) => s.there && s.leaving) && !seen[seen.length - 1].there, "Cancel: the sheet slides away, then it is gone", seen.filter((s, i) => i < 4 || i === seen.length - 1));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run57_catsheet", browser);
