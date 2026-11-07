// Run 34 (7 Nov 2026): the "Claude app feel". Things that open/close inside a screen ease both ways, deletes can be undone,
// selected transactions can be put in a group, and Analytics has four sections. English only; the texts are checked by the logic i18n test.
import { launch, openPage, baseSeed, tx, tab, wait, ok, section, finish, state, openAnSeg, openGoals, settle } from "./lib.mjs";

const browser = await launch();
const click = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error("not found: " + s); e.click(); }, sel);
const exists = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);

section("R34-1. 'How is this calculated?' eases open and closed (it used to close in one frame)");
{
  const page = await openPage(browser, {});
  await click(page, ".safe-toggle"); await wait(120);
  ok(await exists(page, "#safe-breakdown.collapse"), "opening mounts the explanation");
  await wait(400);
  ok(await exists(page, "#safe-breakdown.collapse.is-open"), "it reaches its open look");
  await click(page, ".safe-toggle"); await wait(90);
  ok(await exists(page, "#safe-breakdown.collapse") && !(await exists(page, "#safe-breakdown.collapse.is-open")), "right after closing it is still drawn and is playing its closing motion");
  await wait(450);
  ok(!(await exists(page, "#safe-breakdown")), "after the motion it is removed (no hidden clutter)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R34-2. 'Reduce effects' makes the same thing instant (as before)");
{
  const page = await openPage(browser, {});
  await page.evaluate(() => document.documentElement.setAttribute("data-fx", "off"));
  await click(page, ".safe-toggle"); await wait(80);
  await click(page, ".safe-toggle"); await wait(80);
  ok(!(await exists(page, "#safe-breakdown")), "with effects off it closes at once");
  await page.close();
}

section("R34-3. Deleting a quick-add template leaves smoothly and can be undone");
{
  const page = await openPage(browser, {});
  await openGoals(page, "goals"); await settle(page);
  ok((await state(page)).templates.length === 1, "one template to start with");
  await click(page, '[data-section="gl-templates"] .topbar-btn'); await wait(60);
  ok(await exists(page, '[data-section="gl-templates"] .row-leaving'), "the row plays its leaving motion first");
  await wait(500);
  ok((await state(page)).templates.length === 0, "then it is removed");
  const snack = await page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "");
  ok(/Bus/.test(snack) && /Undo/i.test(snack), "an undo bar names the template", snack);
  await click(page, ".snackbar-undo"); await wait(300);
  const s = await state(page);
  ok(s.templates.length === 1 && s.templates[0].id === "t1" && s.templates[0].name === "Bus", "Undo puts back the same template in the same place");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R34-4. Deleting a goal can be undone too");
{
  const page = await openPage(browser, {});
  await openGoals(page, "goals"); await settle(page);
  await click(page, '[data-section="goal-card"] .topbar-btn'); await wait(500);
  ok((await state(page)).goals.length === 0, "the goal is removed");
  ok(/Master/.test(await page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "")), "the undo bar names it");
  await click(page, ".snackbar-undo"); await wait(300);
  const g = (await state(page)).goals;
  ok(g.length === 1 && g[0].id === "g1" && g[0].saved === 3200, "Undo restores the goal with its saved amount");
  await page.close();
}

section("R34-5. Goal editors: the 'update' row and the what-if close smoothly");
{
  const page = await openPage(browser, {});
  await openGoals(page, "goals"); await settle(page);
  await click(page, '[data-section="goal-update"]'); await wait(400);
  ok(await exists(page, '[data-section="goal-update-row"]'), "Update opens an amount row");
  await click(page, '[data-section="goal-update"]'); await wait(90);
  ok(await exists(page, '[data-section="goal-update-row"]'), "right after closing the row is still there (easing out)");
  await wait(450);
  ok(!(await exists(page, '[data-section="goal-update-row"]')), "then it is gone");
  await click(page, ".goal-scenario .gs-toggle"); await wait(400);
  ok(await page.evaluate(() => document.querySelector(".goal-scenario .gs-toggle").getAttribute("aria-expanded") === "true"), "the what-if reports it is open");
  await click(page, ".goal-scenario .gs-toggle"); await wait(450);
  ok(!(await exists(page, ".goal-scenario .collapse")), "and it closes");
  await page.close();
}

section("R34-6. Transactions: select several and put them in a group (with undo)");
{
  const seed = baseSeed({ transactions: [tx({ merchant: "A", amount: 5 }), tx({ merchant: "B", amount: 6 }), tx({ merchant: "C", amount: 7, trip: "Old trip" })] });
  const page = await openPage(browser, { seed });
  await tab(page, "Ledger"); await wait(300);
  await click(page, '[data-section="tx-select-toggle"]'); await wait(400);
  ok(await exists(page, '[data-section="tx-select"]'), "Select opens the selection tools");
  ok(await page.evaluate(() => document.querySelector('[data-section="tx-select-group"]').disabled), "'Add to group' waits until something is selected");
  await page.evaluate(() => { const rows = [...document.querySelectorAll('[role="checkbox"]')]; rows[0].click(); rows[1].click(); });
  await wait(150);
  await click(page, '[data-section="tx-select-group"]'); await wait(400);
  ok(await exists(page, '[data-section="tx-group-panel"]'), "the group panel opens");
  ok(await page.evaluate(() => document.querySelector('[data-section="tx-group-apply"]').disabled), "Apply stays off until a name is typed");
  await page.evaluate(() => { const el = document.getElementById("tx-group-name"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "Quba trip"); el.dispatchEvent(new Event("input", { bubbles: true })); });
  await wait(120);
  await click(page, '[data-section="tx-group-apply"]'); await wait(400);
  let s = await state(page);
  const withTrip = s.transactions.filter((x) => x.trip === "Quba trip").length;
  ok(withTrip === 2, "exactly the two selected entries joined the group", s.transactions.map((x) => [x.merchant, x.trip]));
  ok(s.transactions.find((x) => x.merchant === "C").trip === "Old trip", "an entry that was not selected keeps its own group");
  ok(/Quba trip/.test(await page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "")), "an undo bar names the group");
  await click(page, ".snackbar-undo"); await wait(300);
  s = await state(page);
  ok(s.transactions.filter((x) => x.trip === "Quba trip").length === 0 && s.transactions.find((x) => x.merchant === "C").trip === "Old trip", "Undo restores every entry's previous group (none, none, 'Old trip')");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R34-7. Analytics has four sections; only one is shown, and switching keeps the rest mounted");
{
  const page = await openPage(browser, {});
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(500);
  const vis = () => page.evaluate(() => [...document.querySelectorAll(".an-panel")].filter((p) => !p.hidden).map((p) => p.dataset.panel).filter((v, i, a) => a.indexOf(v) === i));
  ok(JSON.stringify(await vis()) === '["overview"]', "it opens on Overview", await vis());
  ok(await page.evaluate(() => document.querySelectorAll('[data-section="an-seg"] [role="tab"]').length === 4), "four tabs");
  ok(!(await page.evaluate(() => !!document.querySelector('[data-panel="overview"][hidden]'))), "the summary is visible");
  await openAnSeg(page, "trends");
  ok(JSON.stringify(await vis()) === '["trends"]', "Trends shows only Trends", await vis());
  ok(await page.evaluate(() => { const c = document.querySelector('[data-section="an-calendar"]'); return !!c && c.getBoundingClientRect().height > 0; }), "the calendar is in Trends");
  await openAnSeg(page, "insights");
  ok(JSON.stringify(await vis()) === '["insights"]', "Insights shows only Insights", await vis());
  await openAnSeg(page, "spending");
  ok(JSON.stringify(await vis()) === '["spending"]', "Spending shows only Spending", await vis());
  ok(await page.evaluate(() => document.querySelector('[data-section="an-seg"] [aria-selected="true"]').dataset.seg === "spending"), "the selected tab is marked");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R34-8. Switching month re-draws the content with a direction instead of snapping");
{
  const seed = baseSeed({ transactions: [tx({ merchant: "Now", amount: 10 }), tx({ merchant: "Then", amount: 12, date: (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); })() })] });
  const page = await openPage(browser, { seed });
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(500);
  const before = await page.evaluate(() => document.querySelector(".month-name").innerText);
  await click(page, '.month-nav-btn[aria-label]'); await wait(60);
  const mid = await page.evaluate(() => { const s = document.querySelector(".swap"); return { name: document.querySelector(".month-name").innerText, cls: s ? s.className : "" }; });
  ok(mid.name !== before, "the month changed", mid);
  ok(/swap-in/.test(mid.cls) && /swap-prev/.test(mid.cls), "going back plays the 'from the left' entry", mid.cls);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

await finish("e2e_run34_motion", browser);
