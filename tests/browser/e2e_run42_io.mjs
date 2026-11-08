// Run 42: backup round trip of the newest features on the real screens (spread entry, credit-card account, work hours, Graphite theme), Undo of the import,
// and an older file that names a removed theme. Synthetic data only; downloads go to a temp folder.
import { launch, openPage, openData, wait, ok, section, finish, tx, baseSeed, clickText, fs, path, settle, state, TODAY } from "./lib.mjs";
const DL = fs.mkdtempSync(path.join(process.env.TEMP || ".", "ledger-e2e-r42-")); process.env.E2E_DL_DIR = DL;
const browser = await launch();
const K = "expense_ledger_v5";
const acc = { version: 1, accounts: [{ id: "a_cred01", name: "Credit card", kind: "credit", opening: { amount: 0, date: "2026-10-01" }, hidden: false }, { id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 50, date: "2026-10-01" }, hidden: false }], transfers: [] };
const main = baseSeed({ language: "en", transactions: [tx({ id: "s1", amount: 600, category: "shopping", date: TODAY, spread: 6 }), tx({ id: "s2", amount: 20, category: "food", date: TODAY, account: "a_cred01" })] });
const pre = `(() => { if (!sessionStorage.getItem("__side")) { sessionStorage.setItem("__side","1"); localStorage.setItem("${K}__accounts", ${JSON.stringify(JSON.stringify(acc))}); localStorage.setItem("${K}__workhours","160"); localStorage.setItem("${K}__theme","graphite"); } })()`;
let file;
section("R42-IO-B1. Save a backup");
{
  const page = await openPage(browser, { seed: main, pre }); await settle(page);
  await openData(page);
  await clickText(page, ".io-page .btn", /^Save backup to this device|^Create backup file/); await wait(1500);
  const files = fs.readdirSync(DL).filter((f) => f.endsWith(".json")); file = path.join(DL, files[0]);
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  ok(j.transactions.find((x) => x.id === "s1").spread === 6 && j.accounts.some((a) => a.kind === "credit") && j.preferences.workHours === 160 && j.preferences.theme === "graphite", "the file holds the spread, the credit account, 160 work hours and the theme", j.preferences);
  await page.close();
}
section("R42-IO-B2. A wiped phone imports it; Undo puts the side settings back");
{
  const page = await openPage(browser, { fresh: true, seed: null }); await settle(page);
  await openData(page);
  const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 5000 }); await wait(300);
  await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge|^Add/); await wait(900);
  const s = await state(page);
  ok(s.transactions.length === 2 && s.transactions.find((x) => x.id === "s1").spread === 6, "both entries, the spread kept");
  const side = await page.evaluate((k) => ({ wh: localStorage.getItem(k + "__workhours"), th: localStorage.getItem(k + "__theme"), acc: JSON.parse(localStorage.getItem(k + "__accounts") || "null"), attr: document.documentElement.getAttribute("data-theme") }), K);
  ok(side.wh === "160" && side.th === "graphite" && side.attr === "graphite" && side.acc.accounts.some((a) => a.kind === "credit"), "work hours 160, Graphite applied, credit account present", side);
  const undone = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^undo$/i.test(x.textContent.trim())); if (b) { b.click(); return true; } return false; }); await wait(700);
  const after = await page.evaluate((k) => ({ wh: localStorage.getItem(k + "__workhours"), th: localStorage.getItem(k + "__theme"), n: (JSON.parse(localStorage.getItem(k) || "null") || { transactions: [] }).transactions.length }), K);
  ok(undone && after.wh === null && after.n === 0, "Undo removes the entries and puts work hours back to unset", { undone, after });
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R42-IO-B3. An older file that names the removed Sapphire theme");
{
  const old = { version: 5, exportedAt: "2026-11-01T00:00:00.000Z", meta: { app: "expense-ledger", transactionCount: 1 }, transactions: [{ id: "o1", type: "expense", amount: 5, category: "food", subcategory: "", merchant: "", note: "", date: TODAY, recurring: false, recurFreq: null, isActive: true, createdAt: "2026-11-01T00:00:00.000Z" }], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 }, bills: [], preferences: { theme: "sapphire" }, lastBackup: "2026-11-01T00:00:00.000Z" };
  const f2 = path.join(DL, "old-sapphire.json"); fs.writeFileSync(f2, JSON.stringify(old));
  const page = await openPage(browser, { fresh: true, seed: null }); await settle(page);
  await openData(page);
  const input = await page.$(".io-page input[type=file]"); await input.uploadFile(f2);
  await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 5000 }); await wait(300);
  await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge|^Add/); await wait(900);
  ok(await page.evaluate((k) => localStorage.getItem(k + "__theme"), K) === "dusk", "Sapphire from an older file lands on Dusk");
  await page.close();
}
await browser.close();
finish("e2e_run42_io");