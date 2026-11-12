// Run 55 (owner, 10 Nov screenshots: "I can't figure out what this entry description wants to say"): the entry detail sheet.
// The note has a label and is not repeated; the history at a place is in plain sentences, folded, and only with enough history; every
// action looks like a button and says what it does; Edit first, Delete last; amounts hidden in privacy mode; az and ru fit at 320 px.
// Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, settle, tx, daysAgo, TODAY, tab } from "./lib.mjs";
const browser = await launch();
const openRow = async (page, merchant) => {   // go to Entries only when not there yet, wait until the row is really on screen, then tap it
  if (!(await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].getAttribute("aria-current") === "page"))) { await tab(page, "Ledger"); await wait(350); }
  await page.waitForFunction((m) => [...document.querySelectorAll(".txn-row")].some((x) => x.innerText.includes(m) && x.getBoundingClientRect().height > 0), { timeout: 5000 }, merchant);
  await page.evaluate((m) => { const r = [...document.querySelectorAll(".txn-row")].find((x) => x.innerText.includes(m) && x.getBoundingClientRect().height > 0); r.scrollIntoView({ block: "center" }); r.click(); }, merchant);
  await page.waitForSelector(".sheet", { timeout: 5000 }); await wait(450); };
const sheet = (page) => page.evaluate(() => (document.querySelector(".sheet") || {}).innerText || "");
// Bus/Metro: 4 rides of 0.60 every 4 days (enough history); Cafe: once; a note that only repeats the place
const seed = (language) => baseSeed({ language, transactions: [
  tx({ merchant: "Bus/Metro", note: "to work", amount: 0.6, category: "transport", date: daysAgo(12) }), tx({ merchant: "Bus/Metro", amount: 0.6, category: "transport", date: daysAgo(8) }),
  tx({ merchant: "Bus/Metro", amount: 0.6, category: "transport", date: daysAgo(4) }), tx({ merchant: "Bus/Metro", note: "bus / metro", amount: 0.6, category: "transport", date: TODAY }),
  tx({ merchant: "Cafe", note: "with Aysel", amount: 8, date: TODAY }), tx({ note: "Only a note here", amount: 3, date: daysAgo(1) }) ] });

section("R55-1. The note: labelled, never repeated");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  await openRow(page, "Cafe");
  let n = await page.evaluate(() => (document.querySelector('[data-section="detail-note"]') || {}).innerText || "");
  ok(/^Note\s*\n?\s*with Aysel/.test(n.trim()), "a note different from the place is shown under the label 'Note'", n);
  ok(!(await page.$('[data-section="detail-history"]')), "one visit only: no history card");
  await page.evaluate(() => document.querySelector('.sheet [data-closer="1"]').click()); await page.waitForFunction(() => !document.querySelector(".sheet"), { timeout: 4000 }).catch(() => {}); await wait(200);
  await openRow(page, "Only a note");
  ok(!(await page.$('[data-section="detail-note"]')) && /Only a note here/.test(await sheet(page)), "an entry with only a note: the note is the title and is not shown a second time");
  await page.evaluate(() => document.querySelector('.sheet [data-closer="1"]').click()); await page.waitForFunction(() => !document.querySelector(".sheet"), { timeout: 4000 }).catch(() => {}); await wait(200);
  await wait(300); await openRow(page, "Bus/Metro");   // the newest Bus/Metro entry is today's, whose note is "bus / metro"
  ok(!(await page.$('[data-section="detail-note"]')), "note 'bus / metro' on the place 'Bus/Metro': the same words, so no note box");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R55-2. History at a place: folded, plain sentences");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  await openRow(page, "Bus/Metro");
  ok(!!(await page.$('[data-section="detail-history"]')) && (await page.evaluate(() => document.querySelector('[data-section="detail-history-toggle"]').getAttribute("aria-expanded"))) === "false", "four visits: the card is there, folded");
  let txt = await sheet(page);
  ok(!/Merchant Profile|Visits|Avg spend|Visit frequency|Typical day|Est\. next visit|Detected pattern|±15%/.test(txt), "none of the old analytics words appear", txt.slice(0, 500));
  await page.evaluate(() => document.querySelector('[data-section="detail-history-toggle"]').click()); await wait(450);
  const lines = await page.evaluate(() => [...document.querySelectorAll('[data-section="detail-history-lines"] li')].map((li) => li.innerText));
  ok(lines.length >= 4 && /You paid here 4 times, 2\.40 .* in all\./.test(lines[0]) && /0\.60/.test(lines[1]) && /About once every 4 days\./.test(lines[2]) && /likely around/.test(lines.join(" ")), "opened: 'You paid here 4 times, 2.40 in all', the usual amount, 'About once every 4 days', the next one", lines);
  ok((await page.evaluate(() => document.querySelector('[data-section="detail-history-toggle"]').getAttribute("aria-expanded"))) === "true", "the button says it is open (for screen readers)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R55-3. Actions: real buttons with verbs; Edit first, Delete last");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  await openRow(page, "Cafe");
  const acts = await page.evaluate(() => [...document.querySelectorAll(".sheet button")].filter((b) => !b.closest(".sheet-grip") && b.innerText.trim() && b.offsetParent !== null).map((b) => ({ t: b.innerText.trim(), bg: getComputedStyle(b).backgroundColor, h: Math.round(b.getBoundingClientRect().height) })));
  const names = acts.map((a) => a.t);
  ok(/^Edit/.test(names[0]) && /Duplicate/.test(names[1]) && /Delete/.test(names[names.length - 2]) && /Close/.test(names[names.length - 1]), "Edit and Duplicate first; Delete, then Close, last", names);
  const split = acts.find((a) => /Split between categories/.test(a.t)), bill = acts.find((a) => /Mark as a bill payment/.test(a.t));
  ok(!!split && !!bill, "the actions say what they do: 'Split between categories', 'Mark as a bill payment'", names);
  ok([split, bill].every((a) => a && a.bg !== "rgba(0, 0, 0, 0)" && a.h >= 44), "both are filled buttons at least 44 px tall (not outline-only text)", [split, bill]);
  const gap = await page.evaluate(() => { const d = document.querySelector('[data-section="detail-delete"]'), prev = d.previousElementSibling; return Math.round(d.getBoundingClientRect().top - prev.getBoundingClientRect().bottom); });
  ok(gap >= 14, "Delete is set apart from the other actions", gap);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R55-4. Privacy mode hides the amounts in the history");
{
  const page = await openPage(browser, { seed: seed("en"), pre: () => { try { localStorage.setItem("expense_ledger_v5__privacy", "1"); } catch {} } }); await settle(page);
  await openRow(page, "Transport");   // with privacy on, the place name is hidden; its category is not
  await page.evaluate(() => document.querySelector('[data-section="detail-history-toggle"]').click()); await wait(450);
  const lines = await page.evaluate(() => document.querySelector('[data-section="detail-history-lines"]').innerText);
  ok(!/\d+\.\d{2}/.test(lines) && /•/.test(lines), "no amount is readable in the history lines", lines);
  await page.evaluate(() => localStorage.removeItem("expense_ledger_v5__privacy"));   // the pages of one test browser share storage: privacy off again for the next section
  await page.close();
}

section("R55-5. Azerbaijani and Russian fit at 320 px");
for (const [l, split, hist] of [["az", /Kateqoriyalar arasında böl/, /Burada 4 dəfə ödəmisiniz/], ["ru", /Разделить между категориями/, /Вы платили здесь 4 раза/]]) {
  const page = await openPage(browser, { seed: seed(l), chooseLang: l, width: 320, height: 640 }); await settle(page);
  await openRow(page, "Bus/Metro");
  await page.evaluate(() => document.querySelector('[data-section="detail-history-toggle"]').click()); await wait(450);
  const txt = await sheet(page);
  const fits = await page.evaluate(() => { const bad = []; document.querySelectorAll(".sheet button, .sheet li").forEach((e) => { if (e.offsetParent !== null && e.scrollWidth > e.clientWidth + 1) bad.push(e.innerText.slice(0, 40)); }); return { bad, page: document.documentElement.scrollWidth <= innerWidth }; });
  ok(split.test(txt) && hist.test(txt), `${l}: the actions and history are translated`, txt.slice(0, 400));
  ok(fits.bad.length === 0 && fits.page, `${l}: no button or line is cut off at 320 px`, fits);
  await page.close();
}
await finish("e2e_run55_detail", browser);
