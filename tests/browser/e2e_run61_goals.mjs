// Run 61 in the real bundled app (owner batch C7/C8): "Add money" with a note, the goal's history, correcting the total, and the reached
// state with its day. Synthetic data only.
import { launch, openPage, openGoals, state, toast, ok, section, finish, baseSeed, wait, TODAY } from "./lib.mjs";
const browser = await launch();
const put = (page, sel, v) => page.evaluate((s, v) => { const el = document.querySelector(s); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, sel, v);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);

section("R61-B1. Add money, see it in the history, correct the total, reach the goal");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", goals: [{ id: "g1", name: "Laptop", target: 1000, saved: 300, monthlyTarget: 0, targetDate: null }] }) });
  await openGoals(page, "goals");
  ok(!(await page.$('[data-section="goal-history"]')), "an older goal with no history shows no history button yet");
  await click(page, '[data-section="goal-update"]'); await wait(400);
  await put(page, '[data-section="goal-update-input"]', "150"); await put(page, '[data-section="goal-update-note"]', "Birthday money");
  await click(page, '[data-section="goal-update-save"]'); await wait(300);
  let g = (await state(page)).goals[0];
  ok(g.saved === 450 && g.contribs.length === 1 && g.contribs[0].note === "Birthday money" && g.contribs[0].date === TODAY, "300 + 150 = 450, with the note and today's date in the history", g);
  ok(/Added 150\.00 ₼ to Laptop/.test(await toast(page)), "a message says what was added");
  await click(page, '[data-section="goal-history-toggle"]'); await wait(450);
  const rows = await page.evaluate(() => document.querySelector('[data-section="goal-history-rows"]').innerText.replace(/\s+/g, " "));
  ok(/Birthday money \+150\.00/.test(rows) && /Before the history began 300\.00/.test(rows), "History (1): the addition with its note, and the 300 it held before", rows);
  // correct the total down to 400
  await click(page, '[data-section="goal-update"]'); await wait(400);
  await click(page, '[data-section="goal-update-mode"]'); await wait(200);
  ok((await page.evaluate(() => document.querySelector('[data-section="goal-update-input"]').value)) === "450", "'Correct the total instead' shows the current total to change");
  await put(page, '[data-section="goal-update-input"]', "400"); await click(page, '[data-section="goal-update-save"]'); await wait(300);
  g = (await state(page)).goals[0];
  ok(g.saved === 400 && g.contribs.length === 2 && g.contribs[1].amount === -50 && g.contribs[1].src === "set", "correcting to 400 records -50, so the history still adds up");
  // reach it
  await click(page, '[data-section="goal-update"]'); await wait(400);
  await put(page, '[data-section="goal-update-input"]', "600"); await click(page, '[data-section="goal-update-save"]'); await wait(300);
  g = (await state(page)).goals[0];
  ok(g.saved === 1000 && g.doneAt === TODAY && /Goal reached: Laptop/.test(await toast(page, 50)), "adding 600 reaches 1,000: the day is kept and a message celebrates it", g.doneAt);
  const card = await page.evaluate(() => document.querySelector('[data-section="goal-card"]').innerText);
  ok(/Reached on/.test(card), "the card says when it was reached", card.slice(0, 300));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R61-B2. The goal card fits at 320 px in Azerbaijani and Russian");
for (const lang of ["az", "ru"]) {
  const page = await openPage(browser, { width: 320, height: 760, chooseLang: lang, seed: baseSeed({ language: lang, goals: [{ id: "g1", name: "Noutbuk", target: 1000, saved: 300, monthlyTarget: 0, targetDate: null, contribs: [{ id: "c1", date: TODAY, amount: 100, src: "add" }] }] }) });
  await openGoals(page, "goals");
  await click(page, '[data-section="goal-update"]'); await wait(400);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('[data-section="goal-card"] *')].some((e) => e.getBoundingClientRect().right > innerWidth + 1));
  ok(!wide, `${lang}: nothing on the goal card is wider than the screen with the add row open`);
  await page.close();
}
await browser.close();
finish("e2e_run61_goals");
