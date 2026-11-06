// Run 29: the add sheet must be fully opaque while it slides in and out. At opacity 0.6 the screen behind showed through the moving sheet
// (a double exposure, seen in the owner's 6 Nov phone video). Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle } from "./lib.mjs";
const browser = await launch();
const names = (page) => page.evaluate(() => document.getAnimations().filter((a) => a.animationName === "slideUp" || a.animationName === "addOut").map((a) => ({ n: a.animationName, k: a.effect.getKeyframes().map((f) => ({ t: f.transform, o: f.opacity })) })));
section("R29-A1. Add sheet: no transparency while sliding in or out");
{
  const page = await openPage(browser, {}); await settle(page);
  await page.evaluate(() => document.querySelector(".fab-add").click()); await wait(90);
  const inn = await names(page);
  ok(inn.some((a) => a.n === "slideUp"), "the slide-in animation is running 90 ms after the tap", JSON.stringify(inn));
  ok(inn.filter((a) => a.n === "slideUp").every((a) => a.k.every((f) => f.o === undefined || f.o === null || String(f.o) === "1")), "slide-in keyframes do not change opacity", JSON.stringify(inn));
  ok(await page.evaluate(() => getComputedStyle(document.querySelector(".add-overlay")).opacity) === "1", "the sheet is fully opaque while it moves in");
  ok(await page.evaluate(() => getComputedStyle(document.querySelector(".add-overlay")).backgroundColor) !== "rgba(0, 0, 0, 0)", "the sheet has a solid background (nothing shows through it)");
  await wait(500); await settle(page);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".add-overlay button")].find((x) => /cancel/i.test(x.textContent)); b.click(); }); await wait(80);
  const out = await names(page);
  ok(out.some((a) => a.n === "addOut"), "the slide-out animation is running 80 ms after Cancel", JSON.stringify(out));
  ok(out.filter((a) => a.n === "addOut").every((a) => a.k.every((f) => f.o === undefined || f.o === null || String(f.o) === "1")), "slide-out keyframes do not change opacity", JSON.stringify(out));
  ok(await page.evaluate(() => { const e = document.querySelector(".add-overlay"); return !e || getComputedStyle(e).opacity === "1"; }), "the sheet is fully opaque while it moves out");
  await wait(500);
  ok(await page.evaluate(() => !document.querySelector(".add-overlay")), "the sheet is gone afterwards (closing still works)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run29_addsheet", browser);
