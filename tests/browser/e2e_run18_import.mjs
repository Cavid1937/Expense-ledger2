// Run 18 (2026-10-31): importing a backup is all-or-nothing across the main data, the subcategories and the debts store, and Undo
// puts all three back. Synthetic data only; imports go to the temp folder set by tests/run-browser.mjs.
import { launch, openPage, state, openData, wait, ok, section, finish, tx, baseSeed, clickText, fs, path, settle } from "./lib.mjs";
const IMP = process.env.E2E_IMP_DIR || path.join(process.env.TEMP || ".", "ledger-e2e-imp"); fs.mkdirSync(IMP, { recursive: true });
const browser = await launch();
const DKEY = "expense_ledger_v5__debts", SKEY = "expense_ledger_v5__subcats";
const raw = (page, k) => page.evaluate((key) => localStorage.getItem(key), k);
const failWrites = (page, src) => page.evaluate((s) => { const r = new RegExp(s); const orig = Storage.prototype.setItem; window.__origSet = orig; Storage.prototype.setItem = function (k, v) { if (r.test(k)) throw new DOMException("full", "QuotaExceededError"); return orig.call(this, k, v); }; }, src);
const upload = async (page, file) => { const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForFunction((n) => { const s = document.querySelector('[aria-label="Restore backup"]'); return !!s && s.innerText.includes(n); }, { timeout: 5000, polling: 50 }, path.basename(file)).catch(() => {}); await wait(150); };
const bk = (name) => { const file = path.join(IMP, name); fs.writeFileSync(file, JSON.stringify({ version: 9, exportedAt: new Date().toISOString(), transactions: [tx({ id: "imp1", amount: 12, merchant: "Cafe", date: "2026-10-05" })], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 },
  subcategories: { food: ["Coffee beans"] }, debts: [{ id: "dx", direction: "owed", name: "Rauf", principal: 30000, dueDate: "", note: "", payments: [] }], loans: [] })); return file; };
const fresh = async () => { const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: "old1", amount: 5, merchant: "Shop", date: "2026-10-04" })] }) }); await settle(page); await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, DKEY, SKEY); return page; };

section("R18-IM1. Merge brings debts and subcategories; Undo removes them again");
{
  const page = await fresh(); await openData(page); await upload(page, bk("with-aux.json"));
  await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge/); await wait(500);
  ok((await state(page)).transactions.length === 2 && /Rauf/.test((await raw(page, DKEY)) || "") && /Coffee beans/.test((await raw(page, SKEY)) || ""), "after Merge: the entry, the debt and the subcategory are all there");
  await clickText(page, ".snackbar-undo", /Undo/); await wait(400);
  ok((await state(page)).transactions.length === 1 && (await raw(page, DKEY)) === null && (await raw(page, SKEY)) === null, "Undo brings back the entry list AND removes the debts and subcategories that the import added");
  await page.close();
}
section("R18-IM2. Debts cannot be saved: the whole import stops, nothing half-applied");
{
  const page = await fresh(); await openData(page); await upload(page, bk("with-aux2.json")); await failWrites(page, "__debts");
  await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge/); await wait(500);
  ok((await state(page)).transactions.length === 1, "the entry list is unchanged (no half import)");
  ok((await raw(page, DKEY)) === null && (await raw(page, SKEY)) === null, "neither side store was left changed (the subcategories were put back)", [await raw(page, DKEY), await raw(page, SKEY)]);
  ok(/Import stopped/.test(await page.evaluate(() => document.body.innerText)), "a message says the import stopped and nothing changed");
  await page.close();
}
section("R18-IM3. A corrupt debts store stops an import that carries debts");
{
  const page = await fresh(); const BAD = '{"version":1,"debts":[{"id":"d1'; await page.evaluate((k, v) => localStorage.setItem(k, v), DKEY, BAD);
  await openData(page); await upload(page, bk("with-aux3.json"));
  await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge/); await wait(500);
  ok((await state(page)).transactions.length === 1 && (await raw(page, DKEY)) === BAD, "entries unchanged and the unreadable debts text is untouched");
  await page.evaluate((k) => localStorage.removeItem(k), DKEY);
  await page.close();
}
section("R18-IM4. Backup/restore keeps a linked repayment and its entry together");
{
  const page = await fresh(); await openData(page);
  const file = path.join(IMP, "linked.json");
  fs.writeFileSync(file, JSON.stringify({ version: 9, exportedAt: new Date().toISOString(), transactions: [tx({ id: "lk1", amount: 100, merchant: "Rauf", category: "finance", date: "2026-10-05", debtLink: { debtId: "dx", paymentId: "px" } })], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 },
    debts: [{ id: "dx", direction: "owe", name: "Rauf", principal: 30000, dueDate: "", note: "", payments: [{ id: "px", date: "2026-10-05", amount: 10000, txnId: "lk1" }] }], loans: [] }));
  await upload(page, file); await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge/); await wait(500);
  const t = (await state(page)).transactions.find((q) => q.id === "lk1"), d = JSON.parse((await raw(page, DKEY)) || "null");
  ok(!!t && t.debtLink && t.debtLink.paymentId === "px" && d && d.debts[0].payments[0].txnId === "lk1", "after Merge the entry keeps its link and the payment keeps its entry id", [t, d]);
  await page.close();
}await browser.close();
finish("e2e_run18_import");
