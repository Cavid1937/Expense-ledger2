// Run 107 (security order 17 Nov): hostile text in saved data stays text in the real app, and a file over 50 MB is refused before it is read.
// Synthetic data only; the large file is made in the temp folder and deleted afterwards.
import { launch, openPage, openData, settle, state, wait, ok, section, finish, baseSeed, tx, daysAgo, fs, path } from "./lib.mjs";
import os from "os";
const browser = await launch();

section("R107-B1. Script-like names and built-in object names in saved data");
{
  const evil = '<img src=x onerror="window.__pwn=1">';
  const seed = baseSeed({ language: "en", transactions: [tx({ amount: 12, merchant: evil, note: evil, date: daysAgo(1) }), tx({ amount: 3, merchant: "constructor", category: "constructor", date: daysAgo(2) }), tx({ amount: 4, merchant: "toString", date: daysAgo(3) })] });
  const page = await openPage(browser, { seed }); await settle(page);
  const r = await page.evaluate(() => ({ pwn: window.__pwn === 1, imgs: [...document.querySelectorAll("img")].filter((i) => i.getAttribute("src") === "x").length, text: document.body.innerText }));
  ok(!r.pwn && r.imgs === 0 && r.text.includes('<img src=x'), "the HTML-like shop name is shown as text and never runs", { pwn: r.pwn, imgs: r.imgs });
  ok(/constructor/.test(r.text) && /toString/.test(r.text), "shops named \"constructor\" and \"toString\" are listed like any other");
  const s = await state(page);
  ok(s.transactions.length === 3 && s.transactions.every((t) => typeof t.category === "string") && s.transactions.find((t) => t.amount === 3).category === "other", "the saved \"constructor\" category is kept as Other; all 3 entries stay", s.transactions.map((t) => t.category));
  await page.evaluate(() => { const tabs = [...document.querySelectorAll(".tab-btn")]; const a = tabs.find((b) => /analytics|insight/i.test(b.getAttribute("aria-label") || b.textContent)); (a || tabs[2]).click(); }); await wait(700);
  const an = await page.evaluate(() => document.body.innerText);
  ok(!/NaN|function Object|\[object Object\]|undefined/.test(an), "Analytics shows no broken figures (NaN, function text, [object Object])", an.slice(0, 300));
  await page.close();
}

section("R107-B2. A file over 50 MB is refused before it is read");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const before = JSON.stringify((await state(page)).transactions);
  await openData(page);
  const big = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ledger-big-")), "huge-backup.json");
  const fd = fs.openSync(big, "w"); fs.writeSync(fd, "{", 0); fs.ftruncateSync(fd, 50 * 1024 * 1024 + 1); fs.closeSync(fd);   // sparse: 50 MB + 1 byte, no real disk use
  const input = await page.$(".io-page input[type=file]"); await input.uploadFile(big);
  await page.waitForSelector('[aria-label="Restore backup"] [role="alert"]', { timeout: 8000 }).catch(() => {}); await wait(300);
  const msg = await page.evaluate(() => (document.querySelector('[aria-label="Restore backup"]') || {}).innerText || "");
  fs.rmSync(path.dirname(big), { recursive: true, force: true });
  ok(/larger than 50 MB/.test(msg) && /Nothing was changed/.test(msg), "the sheet says the file is over 50 MB and nothing changed", msg.slice(0, 200));
  ok(JSON.stringify((await state(page)).transactions) === before, "the ledger is exactly as before");
  await page.close();
}
await finish("e2e_run107_security", browser);
