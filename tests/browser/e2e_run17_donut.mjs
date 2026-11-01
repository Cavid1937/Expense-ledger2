// Run 17 (2026-10-30), owner feedback: "I want the donut to focus on that selected expense when touched, and go back when retouched.
// I think it would be better if the donut could get bigger when touched." Contract (spending breakdown on Home):
// tapping a slice (or its legend row) selects it: the ring grows, the slice gets thicker, the others fade, the centre shows that
// category's name, amount and share; tapping it again, or tapping another slice, reverts / moves the selection. Written BEFORE the change.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle } from "./lib.mjs";
const browser = await launch();
const seed = () => baseSeed({ language: "en", transactions: [tx({ category: "food", amount: 60 }), tx({ category: "transport", amount: 30 }), tx({ category: "shopping", amount: 10 }), tx({ type: "income", category: "salary", amount: 2000 })] });
const info = (page) => page.evaluate(() => { const d = document.querySelector(".donut"); const r = d.getBoundingClientRect(); const slices = [...d.querySelectorAll(".donut-slice")].map((c) => ({ id: c.dataset.id, w: Number(c.getAttribute("stroke-width")), o: Number(getComputedStyle(c).opacity) })); return { w: r.width, sel: d.classList.contains("has-sel"), center: d.querySelector(".donut-center").innerText, slices, pressed: [...document.querySelectorAll(".donut-legend button")].map((b) => [b.dataset.id, b.getAttribute("aria-pressed")]) }; });
const tapSlice = (page, id) => page.evaluate((id) => document.querySelector(`.donut-slice[data-id="${id}"]`).dispatchEvent(new MouseEvent("click", { bubbles: true })), id);
const tapLegend = (page, id) => page.evaluate((id) => document.querySelector(`.donut-legend button[data-id="${id}"]`).click(), id);

section("R17-G1. Tapping a slice focuses it; tapping again reverts");
{
  const page = await openPage(browser, { seed: seed() }); await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await settle(page);
  const a = await info(page);
  ok(a.slices.length === 3 && !a.sel, "three slices, nothing selected at first", a.slices.map((s) => s.id));
  ok(/100\.00/.test(a.center), "the centre shows the month's total at first", a.center);
  await tapSlice(page, "food"); await wait(450);
  const b = await info(page);
  ok(b.sel && /Food/.test(b.center) && /60\.00/.test(b.center) && /60/.test(b.center), "tapping Food: the centre names it and shows 60.00", b.center);
  ok(/60\s?%/.test(b.center), "and its share of the month (60%)", b.center);
  const food = b.slices.find((s) => s.id === "food"), other = b.slices.find((s) => s.id === "transport");
  ok(food.w > other.w, "the selected slice is thicker than the others", [food.w, other.w]);
  ok(other.o < 0.6 && food.o >= 0.99, "the others fade, the selected one does not", [other.o, food.o]);
  ok(b.w >= a.w * 1.08, "the whole ring grows (at least 8%)", [a.w, b.w]);
  ok(b.pressed.find((x) => x[0] === "food")[1] === "true", "its legend row says it is pressed");
  await tapSlice(page, "food"); await wait(450);
  const c = await info(page);
  ok(!c.sel && Math.abs(c.w - a.w) < 1 && c.slices.every((s) => s.w === a.slices[0].w && s.o >= 0.99), "tapping again reverts size, thickness and fading", [a.w, c.w]);
  ok(c.center === a.center, "and the centre shows the total again", c.center);
  await page.close();
}
section("R17-G2. Another slice moves the selection; the legend works the same; only one is selected");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  await tapSlice(page, "food"); await wait(300); await tapSlice(page, "transport"); await wait(450);
  let b = await info(page);
  ok(/Transport/.test(b.center) && b.pressed.filter((x) => x[1] === "true").length === 1 && b.pressed.find((x) => x[0] === "transport")[1] === "true", "tapping Transport moves the selection to it", b.center);
  await tapLegend(page, "transport"); await wait(450);
  b = await info(page); ok(!b.sel, "tapping its legend row reverts it", b.center);
  await tapLegend(page, "shopping"); await wait(450);
  b = await info(page); ok(b.sel && /Shopping/.test(b.center), "a legend row selects too", b.center);
  const kb = await page.evaluate(() => { const bt = document.querySelector(".donut-legend button"); return { tag: bt.tagName, ti: bt.tabIndex, h: bt.getBoundingClientRect().height }; });
  ok(kb.tag === "BUTTON" && kb.h >= 32, "legend rows are real buttons (keyboard and screen reader) of a usable height", kb);
  await page.close();
}
section("R17-G3. Screen readers get the same facts");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  const al = await page.evaluate(() => document.querySelector(".donut").getAttribute("aria-label") || "");
  ok(/Food/.test(al) && /Transport/.test(al), "the ring still has a text summary of all slices", al.slice(0, 80));
  await page.close();
}
await browser.close();
finish("e2e_run17_donut");
