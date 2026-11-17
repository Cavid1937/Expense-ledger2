// Run 106 (owner: "everything that's a reminder must go to notifications"): a failing Drive backup and low storage now remind from the
// bell, on every screen, with one button that does something. "Later" hides each until the situation gets worse. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, daysAgo, wait, hasNotice, noticeText, noticeAct } from "./lib.mjs";
const browser = await launch();
const seed = () => baseSeed({ language: "en", transactions: [tx({ amount: 5, merchant: "Kiosk", date: daysAgo(1) })] });
section("R106-B1. Drive backup failing for 4 days: in the bell");
{
  const pre = new Function(`try{if(!sessionStorage.getItem("__d")){sessionStorage.setItem("__d","1");localStorage.setItem("expense_ledger_v5__drive",JSON.stringify({on:true,lastAt:"",lastDay:"",lastHash:"",fails:4}));}}catch(e){}`);
  const page = await openPage(browser, { seed: seed(), pre }); await settle(page);
  ok(await hasNotice(page, "drive-fail"), "the bell carries the Drive reminder");
  const txt = await noticeText(page, "drive-fail");
  ok(/4 days/.test(txt) && /Back up now/.test(txt) && !/\{[a-z]+\}/.test(txt), "it says 4 days and offers Back up now", txt);
  ok(!(await hasNotice(page, "storage-low")), "storage is fine: no storage reminder");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.evaluate(() => { try { localStorage.removeItem("expense_ledger_v5__drive"); } catch (e) {} });
  await page.close();
}
section("R106-B2. Storage over 80%: in the bell, and its button opens Data");
{
  const pre = new Function(`try{localStorage.setItem("zz_test_filler","x".repeat(4100000));}catch(e){}`);
  const page = await openPage(browser, { seed: seed(), pre }); await settle(page);
  const filled = await page.evaluate(() => (localStorage.getItem("zz_test_filler") || "").length);
  if (filled < 4000000) ok(true, "browser refused the filler; storage case skipped", filled);
  else {
    ok(await hasNotice(page, "storage-low"), "the bell carries the low-storage reminder");
    const txt = await noticeText(page, "storage-low");
    ok(/Space is running low/.test(txt), "it uses the same words as the Data page", txt);
    await noticeAct(page, "storage-low", "open"); await wait(600);
    ok(await page.evaluate(() => !!document.querySelector('[data-section="storage-usage"]')), "Show me opens the page with the storage figure");
  }
  ok(!(await hasNotice(page, "drive-fail")), "Drive not connected: no Drive reminder");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.evaluate(() => { try { localStorage.removeItem("zz_test_filler"); } catch (e) {} });
  await page.close();
}
await finish("e2e_run106_bell", browser);
