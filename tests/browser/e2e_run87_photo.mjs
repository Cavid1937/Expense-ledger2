// Run 87: a receipt photo on a saved entry. Stored in its own IndexedDB database (never in expense_ledger_v5), downscaled,
// kept through reloads, split and delete+undo; photos of gone entries cleared only after 30 days and only after a clean load.
// Synthetic pictures drawn in the page; no real receipts, nothing written to the user's folders.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle, state, KEY } from "./lib.mjs";
const browser = await launch();
const seed = (txs) => baseSeed({ transactions: txs, lastBackup: new Date().toISOString(), backupConfirmedAt: new Date().toISOString() });
const openRow = async (page, name) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[1].click()); await wait(500); await page.evaluate((nm) => [...document.querySelectorAll(".txn-row")].find((r) => r.innerText.includes(nm)).click(), name); await wait(450); };
const closeSheet = async (page) => { await page.evaluate(() => document.querySelector('.sheet [data-closer="1"]').click()); await wait(450); };
// kind: "png" (2000x1000 drawing), "bad" (text pretending to be an image), "huge" (26 MB)
const give = (page, kind) => page.evaluate(async (k) => {
  let file;
  if (k === "png") { const c = document.createElement("canvas"); c.width = 2000; c.height = 1000; const g = c.getContext("2d"); g.fillStyle = "#2a6"; g.fillRect(0, 0, 2000, 1000); g.fillStyle = "#fff"; g.fillRect(100, 100, 600, 300);
    const b = await new Promise((r) => c.toBlob(r, "image/png")); file = new File([b], "test.png", { type: "image/png" }); }
  else if (k === "bad") file = new File(["not a picture"], "x.png", { type: "image/png" });
  else file = new File([new Uint8Array(26 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
  const inp = document.querySelector('[data-section="photo-input"]'); const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
}, kind);
const idb = (page, op, arg) => page.evaluate(async ([o, a]) => {
  const d = await new Promise((res, rej) => { const r = indexedDB.open("expense_ledger_v5__photos", 1); r.onupgradeneeded = () => r.result.createObjectStore("photos"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = d.transaction("photos", o === "keys" || o === "get" ? "readonly" : "readwrite"), st = tx.objectStore("photos");
  let out;
  if (o === "keys") { const q = st.getAllKeys(); q.onsuccess = () => { out = q.result.map(String); }; }
  if (o === "get") { const q = st.get(String(a)); q.onsuccess = () => { const v = q.result; out = v ? { type: v.blob && v.blob.type, w: v.w, h: v.h, orphanSince: v.orphanSince || null } : null; }; }
  if (o === "put") { const b = new Blob([new Uint8Array([255, 216, 255])], { type: "image/jpeg" }); st.put({ blob: b, at: new Date().toISOString(), ...(a.orphanSince ? { orphanSince: a.orphanSince } : {}) }, String(a.id)); }
  await new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });
  d.close(); return out;
}, [op, arg]);
const DAY = 86400000;

section("R87-P1. Attach: shown, downscaled, kept apart from the ledger data, survives reopening and reload");
{
  const page = await openPage(browser, { seed: seed([tx({ id: 1790000870001, merchant: "Bravo", amount: 12 })]) }); await settle(page);
  await openRow(page, "Bravo");
  const note = await page.evaluate(() => document.querySelector('[data-section="photo-note"]')?.innerText || "");
  ok(/on this phone only/.test(note) && /not in backups/.test(note), "the entry view says in plain words: on this phone only, not in backups", note);
  await give(page, "png"); await wait(900);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="photo-img"]')), "the photo shows on the entry");
  const rec = await idb(page, "get", 1790000870001);
  ok(rec && rec.type === "image/jpeg" && rec.w === 1280 && rec.h === 640, "stored as a JPEG, longest side 1280 (was 2000x1000)", rec);
  const raw = await page.evaluate((k) => localStorage.getItem(k), KEY);
  ok(raw && !/blob|data:image|photo/i.test(raw), "nothing about the photo is written into expense_ledger_v5");
  await page.evaluate(() => document.querySelector('[data-section="photo-open"]').click()); await wait(250);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="photo-full"] img')), "tapping it opens the full-size view");
  await page.keyboard.press("Escape"); await wait(250);
  ok(!(await page.$('[data-section="photo-full"]')) && !!(await page.$('[data-section="photo-img"]')), "Escape closes the full view and leaves the entry open");
  await closeSheet(page); await openRow(page, "Bravo"); await wait(300);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="photo-img"]')), "closing and reopening the entry: still there");
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(400); await openRow(page, "Bravo"); await wait(300);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="photo-img"]')), "after reloading the app: still there");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R87-P2. Bad files get a clear message; Remove asks twice");
{
  const page = await openPage(browser, { seed: seed([tx({ id: 1790000870002, merchant: "Kafe", amount: 5 })]) }); await settle(page);
  await openRow(page, "Kafe");
  await give(page, "bad"); await wait(700);
  ok(/could not be read/.test(await page.evaluate(() => document.querySelector('[data-section="photo-err"]')?.innerText || "")), "a file that is not a picture: 'could not be read'");
  await give(page, "huge"); await wait(500);
  ok(/too large/.test(await page.evaluate(() => document.querySelector('[data-section="photo-err"]')?.innerText || "")), "over 25 MB: 'too large' (not decoded at all)");
  ok(!(await idb(page, "get", 1790000870002)), "neither was stored");
  await give(page, "png"); await wait(900);
  ok(!(await page.$('[data-section="photo-err"]')), "a good picture clears the message");
  await page.evaluate(() => document.querySelector('[data-section="photo-remove"]').click()); await wait(200);
  ok(/Tap again/.test(await page.evaluate(() => document.querySelector('[data-section="photo-remove"]').innerText)) && !!(await idb(page, "get", 1790000870002)), "first tap only asks 'Tap again to remove'");
  await page.evaluate(() => document.querySelector('[data-section="photo-remove"]').click()); await wait(400);
  ok(!(await idb(page, "get", 1790000870002)) && !!(await page.$('[data-section="photo-add"]')), "second tap removes it");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R87-P3. Split: the photo goes with the first part");
{
  const page = await openPage(browser, { seed: seed([tx({ id: 1790000870003, merchant: "Market", amount: 40, category: "shopping" })]) }); await settle(page);
  await openRow(page, "Market"); await give(page, "png"); await wait(900);
  await page.evaluate(() => document.querySelector('[data-section="split-open"]').click()); await wait(300);
  await page.evaluate(() => { const ins = document.querySelectorAll('[data-section="split"] input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; [["25", 0], ["15", 1]].forEach(([v, i]) => { set.call(ins[i], v); ins[i].dispatchEvent(new Event("input", { bubbles: true })); }); }); await wait(200);
  await page.evaluate(() => { const sel = document.querySelectorAll('[data-section="split"] select')[1]; if (sel) { const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; set.call(sel, "food"); sel.dispatchEvent(new Event("change", { bubbles: true })); } }); await wait(200);
  await page.evaluate(() => document.querySelector('[data-section="split-save"]').click()); await wait(700);
  const st = await state(page); const ids = st.transactions.map((x) => String(x.id));
  const keys = await idb(page, "keys");
  ok(st.transactions.length === 2, "the entry was split in two", st.transactions.length);
  ok(ids.filter((i) => keys.includes(i)).length === 1, "exactly one of the new parts has the photo", { keys, ids });
  ok(keys.includes("1790000870003"), "the original's copy is kept (Undo would bring it back)");
  await page.close();
}

section("R87-P4. Clean-up: only after 30 days missing, never on an empty list");
{
  const now = Date.now();
  const page = await openPage(browser, { seed: seed([tx({ id: 1790000870004, merchant: "Live", amount: 3 })]) }); await settle(page);
  await idb(page, "put", { id: 1790000870004, orphanSince: now - 5 * DAY });
  await idb(page, "put", { id: 1111, orphanSince: now - 31 * DAY });
  await idb(page, "put", { id: 2222, orphanSince: now - 10 * DAY });
  await idb(page, "put", { id: 3333 });
  await page.reload(); await page.waitForSelector(".tabbar"); await wait(16500);
  const keys = await idb(page, "keys");
  ok(!keys.includes("1111"), "missing for 31 days: cleared");
  ok(keys.includes("2222"), "missing for 10 days: kept");
  const n3 = await idb(page, "get", 3333);
  ok(n3 && n3.orphanSince > 0, "newly missing: kept and only marked", n3);
  const live = await idb(page, "get", 1790000870004);
  ok(live && live.orphanSince === null, "an entry that is back (Undo, older backup) loses its mark", live);
  await page.close();
  const empty = await openPage(browser, { seed: seed([]) }); await settle(empty);
  await idb(empty, "put", { id: 4444, orphanSince: now - 40 * DAY });
  await empty.reload(); await empty.waitForSelector(".tabbar"); await wait(16500);
  ok((await idb(empty, "keys")).includes("4444"), "with no entries at all (a bad or empty start) nothing is ever cleared");
  await empty.close();
}
await finish("e2e_run87_photo", browser);
