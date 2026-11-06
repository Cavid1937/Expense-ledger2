// Run 29: when Android restores the app's data from a backup, the app says so once (and never touches the ledger). The Android shell
// is simulated with window.LedgerNative.installId(). Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle, state, storageKeys } from "./lib.mjs";
const browser = await launch();
const KEYI = "expense_ledger_v5__install";
const pre = (stored, bridge) => `(function(){ ${bridge}; if(!sessionStorage.getItem("__r29")){ sessionStorage.setItem("__r29","1"); ${stored === null ? "" : `localStorage.setItem("${KEYI}",${JSON.stringify(stored)});`} } })()`;
const NEW = `window.LedgerNative={installId:function(){return "ID-NEW";}}`;
const banner = (page) => page.evaluate(() => [...document.querySelectorAll('.backup-banner[role="alert"]')].map((b) => b.textContent).join(" | "));
const seed = (o = {}) => baseSeed({ transactions: [tx({ amount: 10, date: "2026-10-01" }), tx({ amount: 20, date: "2026-10-05" }), tx({ type: "income", category: "salary", amount: 2000, date: "2026-10-03" })], ...o });

section("R29-R1. Not on Android, first run, same install: no notice");
{
  let page = await openPage(browser, { seed: seed(), pre: "void 0" }); await settle(page);
  ok(!/restored/i.test(await banner(page)), "website (no Android shell): no notice");
  ok(!(await storageKeys(page)).includes(KEYI), "website: nothing extra is stored");
  await page.close();
  page = await openPage(browser, { seed: seed(), pre: pre(null, NEW) }); await settle(page);
  ok(!/restored/i.test(await banner(page)), "first run on Android (no earlier id): no notice");
  ok(await page.evaluate((k) => localStorage.getItem(k), KEYI) === "ID-NEW", "the current id is remembered");
  await page.close();
  page = await openPage(browser, { seed: seed(), pre: pre("ID-NEW", NEW) }); await settle(page);
  ok(!/restored/i.test(await banner(page)), "same id: no notice");
  await page.close();
}
section("R29-R2. Different id: one notice, ledger untouched, not shown again");
{
  const page = await openPage(browser, { seed: seed(), pre: pre("ID-OLD", NEW) }); await settle(page);
  const b = await banner(page);
  ok(/restored from a backup/i.test(b) && /3 entries/.test(b) && /may be missing/i.test(b), "notice names the backup and the entry count", b);
  ok(/latest: [^)]*Oct/.test(b), "notice gives the date of the newest entry (5 Oct)", b);
  const s = await state(page);
  ok(s.transactions.length === 3 && s.transactions.some((x) => x.amount === 2000) && s.transactions.some((x) => x.amount === 20), "all three entries are exactly as they were");
  ok(await page.evaluate((k) => localStorage.getItem(k), KEYI) === "ID-NEW", "the new id is stored, so the notice appears once");
  await page.evaluate(() => document.querySelector('.backup-banner[role="alert"] .backup-dismiss').click()); await wait(200);
  ok(!/restored/i.test(await banner(page)), "dismiss closes it");
  await page.reload(); await page.waitForSelector(".tabbar"); await settle(page);
  ok(!/restored/i.test(await banner(page)), "after a reload the notice does not come back");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R29-R3. Empty ledger, failing bridge, other languages");
{
  let page = await openPage(browser, { seed: seed({ transactions: [] }), pre: pre("ID-OLD", NEW) }); await settle(page);
  ok(!/restored/i.test(await banner(page)), "different id but no entries: nothing to warn about");
  ok(await page.evaluate((k) => localStorage.getItem(k), KEYI) === "ID-NEW", "the id is still updated");
  await page.close();
  page = await openPage(browser, { seed: seed(), pre: pre("ID-OLD", `window.LedgerNative={installId:function(){throw new Error("boom");}}`) }); await settle(page);
  ok(!/restored/i.test(await banner(page)) && (await state(page)).transactions.length === 3 && page.errors.length === 0, "a failing bridge changes nothing and causes no error");
  await page.close();
  page = await openPage(browser, { seed: seed(), pre: pre("ID-OLD", `window.LedgerNative={installId:function(){return new Promise(function(r){setTimeout(function(){r("ID-ASYNC");},120);});}}`) }); await wait(500); await settle(page);
  ok(/restored from a backup/i.test(await banner(page)), "an id that arrives a moment later (the real Android shell answers asynchronously) also gives the notice");
  await page.close();
  page = await openPage(browser, { seed: seed(), pre: pre("ID-OLD", `window.LedgerNative={installId:function(){return Promise.reject(new Error("nope"));}}`) }); await wait(300); await settle(page);
  ok(!/restored/i.test(await banner(page)) && (await state(page)).transactions.length === 3 && page.errors.length === 0, "a rejected answer changes nothing and causes no error");
  await page.close();
  for (const [l, re] of [["az", /bərpa olunub/], ["ru", /восстановлены/]]) {
    page = await openPage(browser, { seed: seed({ language: l }), pre: pre("ID-OLD", NEW) }); await settle(page);
    ok(re.test(await banner(page)), `${l}: notice wording`, await banner(page)); await page.close();
  }
}
await finish("e2e_run29_restored", browser);
