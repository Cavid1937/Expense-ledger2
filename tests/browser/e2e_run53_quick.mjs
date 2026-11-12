// Run 53: the owner's quick fixes on the real screens. (1) Spread a cost over any number of months from 2 to 24. (2) Cancel stays next to Save
// while editing a quick-add template far down the list. (3) A long press selects text only inside boxes a person types in. (4) Currency: rates
// are fetched when the app opens (once per currency per day), a dollar ledger can record a payment in euro or manat, and with no internet
// the last saved rate is offered. The rate service is replaced by a fake inside the page. Synthetic data only.
import { launch, openPage, openAdd, openGoals, wait, ok, section, finish, baseSeed, settle, state, tx, TODAY } from "./lib.mjs";
const browser = await launch();
const phone = (page) => page.setViewport({ width: 360, height: 640, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const setVal = (page, sel, v) => page.$eval(sel, (el, val) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const save = (page) => page.evaluate(() => document.querySelector(".add-foot .btn-primary").click());
const fake = (up) => `(() => { const real = window.fetch; window.__fxCalls = []; window.__fxUp = ${up}; window.fetch = async (u, o) => { const s = String(u); if (s.includes("api.frankfurter.dev")) { window.__fxCalls.push(s); if (!window.__fxUp) throw new TypeError("offline"); const cur = (s.match(/base=([A-Z]{3})/) || [])[1]; const rate = { EUR: 1.9037, USD: 1.7, GBP: 2.2 }[cur]; return new Response(JSON.stringify(rate ? { date: "${TODAY}", base: cur, quote: "AZN", rate } : {}), { status: rate ? 200 : 404, headers: { "Content-Type": "application/json" } }); } return real(u, o); }; })()`;
const calls = (page) => page.evaluate(() => window.__fxCalls.map((u) => (u.match(/base=([A-Z]{3})/) || [])[1]).sort());
const line = (page) => page.evaluate(() => (document.querySelector('[data-section="fx-line"]') || {}).innerText || "");

section("R53-B1. Spread the cost over 4 months (any number from 2 to 24)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page);
  await setVal(page, ".amount-input", "100"); await wait(150);
  const chips = await page.evaluate(() => [...document.querySelectorAll('[data-section="add-spread"] [data-spread]')].map((b) => b.getAttribute("data-spread")));
  ok(JSON.stringify(chips) === JSON.stringify(["0", "3", "6", "12", "own"]) && !(await page.evaluate(() => { const i = document.querySelector("#txn-spread-own"); return !!i && i.offsetParent !== null; })), "No, 3, 6, 12 months and 'Other'; the box for your own number is closed", chips);
  await page.evaluate(() => document.querySelector('[data-spread="own"]').click()); await wait(450);
  await setVal(page, "#txn-spread-own", "1"); await wait(200);
  let box = await page.evaluate(() => document.querySelector('[data-section="add-spread"]').innerText);
  ok(/Type a whole number from 2 to 24/.test(box) && !/a month for/.test(box), "1 is refused with a plain message, and nothing is spread", box);
  await setVal(page, "#txn-spread-own", "25"); await wait(200);
  ok(/Type a whole number from 2 to 24/.test(await page.evaluate(() => document.querySelector('[data-section="add-spread"]').innerText)), "25 is refused too");
  await setVal(page, "#txn-spread-own", "4x"); await wait(200);
  box = await page.evaluate(() => document.querySelector('[data-section="add-spread"]').innerText);
  ok((await page.$eval("#txn-spread-own", (e) => e.value)) === "4" && /25\.00/.test(box) && /4 months/.test(box) && !/Type a whole number/.test(box), "letters are dropped; 4 is accepted: about 25.00 a month for 4 months", box);
  await save(page); await wait(600);
  const e = (await state(page)).transactions.find((x) => x.amount === 100);
  ok(e && e.spread === 4, "the saved entry is spread over 4 months", e);
  // editing it again shows a '4 months' chip, already chosen
  await openAdd(page); await setVal(page, ".amount-input", "60"); await page.evaluate(() => document.querySelector('[data-spread="own"]').click()); await wait(450);
  await setVal(page, "#txn-spread-own", "24"); await wait(200); await page.evaluate(() => document.querySelector('[data-spread="6"]').click()); await wait(300);
  await save(page); await wait(600);
  ok((await state(page)).transactions.find((x) => x.amount === 60).spread === 6, "choosing a chip after typing a number uses the chip (6)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R53-B2. Editing the last of many templates: Cancel is in the form, on screen");
{
  const templates = Array.from({ length: 14 }, (_, i) => ({ id: "t" + (i + 1), name: "Template " + (i + 1), amount: i + 1, catId: "food", subcat: "", merchant: "", note: "" }));
  const page = await openPage(browser, { seed: baseSeed({ language: "en", templates }) }); await phone(page); await settle(page); await openGoals(page);
  // the templates list sits on one of the page's sections: open the one that shows it
  await page.evaluate(async () => { for (const b of document.querySelectorAll(".goals-page .seg-btn")) { if (document.querySelector('[data-section="gl-templates"]')) break; b.click(); await new Promise((r) => setTimeout(r, 350)); } });
  const opened = await page.evaluate(() => { const all = [...document.querySelectorAll('[data-section="gl-templates"] [data-section="tpl-edit"]')], last = all.pop(); if (!last) return 0; last.scrollIntoView({ block: "center" }); last.click(); return all.length + 1; });
  await wait(700);
  ok(opened === 14 && !!(await page.$('[data-section="tpl-form"] [data-section="tpl-cancel"]')), "14 templates are listed; the edit form of the last one has its own Cancel next to Save", opened);
  const vis = await page.evaluate(() => { const c = document.querySelector('[data-section="tpl-form"] [data-section="tpl-cancel"]'), s = document.querySelector('[data-section="tpl-form"] [data-section="tpl-save"]'); c.scrollIntoView({ block: "nearest" }); const r = c.getBoundingClientRect(), q = s.getBoundingClientRect(); return { inView: r.top >= 0 && r.bottom <= innerHeight, sameRow: Math.abs(r.top - q.top) < 4, h: Math.round(r.height), name: document.querySelector("#tpl-name").value }; });
  ok(vis.inView && vis.sameRow && vis.h >= 36 && vis.name === "Template 14", "Cancel and Save sit side by side inside the screen, at the template being edited (Template 14)", vis);
  await setVal(page, "#tpl-name", "Changed name"); await wait(150);
  await page.evaluate(() => document.querySelector('[data-section="tpl-cancel"]').click()); await wait(600);
  const st = await state(page);
  ok(st.templates.length === 14 && st.templates[13].name === "Template 14" && !(await page.evaluate(() => { const f = document.querySelector('[data-section="tpl-form"]'); return !!f && f.offsetParent !== null; })), "Cancel closes the form and changes nothing");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R53-B3. Text can be selected only where a person types");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const sel = (q) => page.evaluate((q) => { const e = document.querySelector(q); return e ? getComputedStyle(e).userSelect || getComputedStyle(e).webkitUserSelect : "missing"; }, q);
  ok((await sel("body")) === "none" && (await sel(".tab-btn")) === "none" && (await sel(".card")) === "none", "the page, a card and a tab button are not selectable", [await sel("body"), await sel(".tab-btn"), await sel(".card")]);
  await openAdd(page);
  ok((await sel(".amount-input")) === "text" && (await sel(".add-overlay .field-lbl")) === "none", "the amount box is selectable; its label is not", [await sel(".amount-input"), await sel(".add-overlay .field-lbl")]);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R53-B4. Rates are fetched when the app opens, once a day");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", currency: "₼", transactions: [tx({ amount: 68, fx: { cur: "USD", amt: 40, rate: 1.7, on: TODAY, src: "cbar" } })] }), pre: fake(true) }); await settle(page);
  // start from a phone that has asked for nothing today, then open the app once and give it a moment
  await page.evaluate(() => { localStorage.removeItem("expense_ledger_v5__fxcache"); localStorage.removeItem("expense_ledger_v5__fxwarm"); }); await page.reload(); await settle(page); await wait(3000);
  ok(JSON.stringify(await calls(page)) === JSON.stringify(["EUR", "GBP", "USD"]), "a moment after opening: the dollar, the euro and the pound were asked for, once each", await calls(page));
  ok((await page.evaluate(() => window.__fxCalls)).every((u) => /^https:\/\/api\.frankfurter\.dev\/v2\/rates\?base=[A-Z]{3}&providers=cbar&quotes=AZN&date=\d{4}-\d{2}-\d{2}$/.test(u)), "each request is a currency code and today's date, nothing else");
  await page.reload(); await settle(page); await wait(2500);
  ok((await calls(page)).length === 0, "closing and opening the app again the same day asks for nothing");
  await openAdd(page); await page.evaluate(() => document.querySelector('[data-section="fx-cur"]').click()); await wait(350);
  await page.evaluate(() => document.querySelector('[data-section="fx-list"] [data-fx="EUR"]').click()); await wait(400);
  ok(/1 EUR = 1\.9037/.test(await line(page)) && (await calls(page)).length === 0, "choosing the euro shows 1 EUR = 1.9037 at once, from what was fetched on opening (no new request)", await line(page));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R53-B5. A dollar ledger: paying in euro and in manat (both ways)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", currency: "$", transactions: [] }), pre: fake(true) }); await settle(page); await openAdd(page);
  ok(!!(await page.$('[data-section="fx-cur"]')), "the currency sign is a button in a dollar ledger too (it was offered only for the manat)");
  await page.evaluate(() => document.querySelector('[data-section="fx-cur"]').click()); await wait(350);
  const list = await page.evaluate(() => [...document.querySelectorAll('[data-section="fx-list"] [data-fx]')].map((b) => b.getAttribute("data-fx")));
  ok(list[0] === "base" && list[1] === "AZN" && !list.includes("USD") && list.includes("EUR"), "the list offers the manat first and the other currencies, not the dollar itself", list);
  await page.evaluate(() => document.querySelector('[data-section="fx-list"] [data-fx="EUR"]').click()); await wait(500);
  await setVal(page, ".amount-input", "100"); await wait(200);
  let l = await line(page);
  ok(/=\s*\$?\s*111\.98/.test(l.replace(/\s/g, " ")) && /1 EUR = 1\.11982 \$/.test(l) && /Worked out from the Central Bank/.test(l), "100 EUR = 111.98 $ at 1 EUR = 1.11982 $ (1.9037 / 1.7), and it says the rate was worked out", l);
  await save(page); await wait(600);
  let e = (await state(page)).transactions.find((x) => x.fx && x.fx.cur === "EUR");
  ok(e && e.amount === 111.98 && e.fx.amt === 100 && e.fx.rate === 1.11982, "stored: 111.98 in dollars, plus 100.00 EUR at 1.11982", e);
  await openAdd(page); await page.evaluate(() => document.querySelector('[data-section="fx-cur"]').click()); await wait(350);
  await page.evaluate(() => document.querySelector('[data-section="fx-list"] [data-fx="AZN"]').click()); await wait(500);
  await setVal(page, ".amount-input", "100"); await wait(200);
  l = await line(page);
  ok(/58\.82/.test(l) && /1 AZN = 0\.588235 \$/.test(l), "100 AZN = 58.82 $ at 1 AZN = 0.588235 $ (1 / 1.7)", l);
  await save(page); await wait(600);
  e = (await state(page)).transactions.find((x) => x.fx && x.fx.cur === "AZN");
  ok(e && e.amount === 58.82 && e.fx.amt === 100 && e.fx.rate === 0.588235, "stored: 58.82 in dollars, plus 100.00 AZN at 0.588235", e);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R53-B6. No internet: the last saved rate is offered with its date, and used only on a tap");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", currency: "₼", transactions: [] }), pre: fake(true) }); await settle(page); await wait(2500);   // rates saved on opening
  await page.evaluate(() => { window.__fxUp = false; window.__fxCalls = []; });
  await openAdd(page);
  // an entry dated yesterday: no rate is saved for that day, and the service is now unreachable
  const y = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  await page.evaluate((v) => { const el = document.querySelector('input[type="date"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, y); await wait(200);
  await page.evaluate(() => document.querySelector('[data-section="fx-cur"]').click()); await wait(350);
  await page.evaluate(() => document.querySelector('[data-section="fx-list"] [data-fx="EUR"]').click()); await wait(600);
  await setVal(page, ".amount-input", "10"); await wait(200);
  let l = await line(page);
  ok(/Couldn't get the official rate/.test(l) && /Use the last saved official rate: 1 EUR = 1\.9037/.test(l) && !/=\s*19\.04/.test(l), "it says the rate could not be fetched, offers the saved 1.9037 with its date, and has NOT used it yet", l);
  await save(page); await wait(400);
  ok(!(await state(page)).transactions.some((x) => x.fx), "pressing Save without choosing a rate saves nothing");
  await page.evaluate(() => document.querySelector('[data-section="fx-saved"]').click()); await wait(400);
  l = await line(page);
  ok(/=\s*19\.04/.test(l.replace(/\s/g, " ")) && /1 EUR = 1\.9037/.test(l), "after the tap: 10 EUR = 19.04 at the saved rate, with the day it was published", l);
  await save(page); await wait(600);
  const e = (await state(page)).transactions.find((x) => x.fx);
  ok(e && e.amount === 19.04 && e.fx.rate === 1.9037 && e.fx.on === TODAY && e.date === y, "stored with the rate and the day that rate is from", e);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run53_quick", browser);
