// Run 22 (2026-11-01), apple-design lens: the app follows the user's reduced-transparency and high-contrast preferences. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, tx, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const seed = baseSeed({ language: "en", transactions: [tx({ id: 1790003000001, merchant: "Shop", amount: 5 })] });
const bf = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); const c = e ? getComputedStyle(e) : null; return c ? [c.backdropFilter || c.webkitBackdropFilter || "none", c.backgroundColor] : null; }, sel);

section("R22-M1. Default (changed in Run 25, layering research): the top bar and tab bar are solid, with no blur over scrolling lists");
{
  const page = await openPage(browser, { seed }); await settle(page);
  const top = await bf(page, ".topbar"), tab = await bf(page, ".tabbar");
  ok(top && tab && top[0] === "none" && tab[0] === "none" && /^rgb\(/.test(top[1]) && /^rgb\(/.test(tab[1]), "both bars are opaque with no blur by default", [top, tab]);
  await page.close();
}
section("R22-M2. 'Reduce transparency' on: no blur, solid backgrounds");
{
  const page = await openPage(browser, { seed }); await page.emulateMediaFeatures([{ name: "prefers-reduced-transparency", value: "reduce" }]); await settle(page); await wait(200);
  const top = await bf(page, ".topbar"), tab = await bf(page, ".tabbar");
  ok(top && tab && top[0] === "none" && tab[0] === "none", "the blur is removed from both bars", [top, tab]);
  const solid = (c) => /^rgb\(/.test(c) || /,\s*1\)$/.test(c);
  ok(solid(top[1]) && solid(tab[1]), "their backgrounds are fully opaque", [top[1], tab[1]]);
  await page.close();
}
section("R22-M3. 'More contrast' on: stronger borders and secondary text");
{
  const page = await openPage(browser, { seed }); const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--rule-2").trim());
  await page.emulateMediaFeatures([{ name: "prefers-contrast", value: "more" }]); await wait(200);
  const after = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--rule-2").trim());
  // Run 84: the phone is on Ivory (the default); its stronger divider is #63696D (from #848A8E)
  ok(before !== after && before.toUpperCase() === "#848A8E" && after.toUpperCase() === "#63696D", "the divider colour becomes the stronger one", [before, after]);
  await page.close();
}
await browser.close();
finish("e2e_run22_media");
