// Run 24: sheets slide away before they close; sub-pages slide in. Synthetic data only.
import { launch, openPage, openHowSheet, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();

section("R24-EX1. A sheet closes with an exit animation, and still closes");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await openHowSheet(page);
  await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(60);
  ok(await page.evaluate(() => { const o = document.querySelector(".sheet-overlay"); return !!o && o.classList.contains("leaving"); }), "just after a backdrop tap the sheet is still there and leaving");
  await wait(500);
  ok(!(await page.$(".sheet-overlay")), "after the animation the sheet is removed");
  await openHowSheet(page);
  await page.evaluate(() => document.querySelector('.sheet [data-closer]').click()); await wait(600);
  ok(!(await page.$(".sheet-overlay")), "the Close button closes it too");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-EX2. Sub-pages slide in");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await page.evaluate(() => { [...document.querySelectorAll("nav button, .tabbar button, [role=tab]")].find((b) => /settings/i.test(b.innerText))?.click(); }); await wait(400);
  await page.evaluate(() => { [...document.querySelectorAll(".list-row")].find((b) => /import/i.test(b.innerText))?.click(); }); await wait(500);
  ok(await page.evaluate(() => !!document.querySelector("main.page.page-sub")), "Import / Export opens on a page that slides in from the right");
  await page.close();
}
await finish("e2e_run24_exit", browser);
