// Run 106 (owner: "everything that's a reminder must go to notifications"): a failing Drive backup and low storage now remind from the
// bell, on every screen, with one button that does something. "Later" hides each until the situation gets worse. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, daysAgo, wait, hasNotice, noticeText, noticeAct } from "./lib.mjs";
const browser = await launch();
// 6 entries: the one-time "help improve the app?" question (asked from 5 entries) is the long notice the fold is checked on
const seed = () => baseSeed({ language: "en", transactions: [1, 2, 3, 4, 5, 6].map((i) => tx({ amount: 5 + i, merchant: "Kiosk " + i, date: daysAgo(i) })) });
section("R106-B1. Drive backup failing for 4 days: in the bell");
{
  const pre = new Function(`try{if(!sessionStorage.getItem("__d")){sessionStorage.setItem("__d","1");localStorage.setItem("expense_ledger_v5__drive",JSON.stringify({on:true,lastAt:"",lastDay:"",lastHash:"",fails:4}));}}catch(e){}`);
  const page = await openPage(browser, { seed: seed(), pre }); await settle(page);
  ok(await hasNotice(page, "drive-fail"), "the bell carries the Drive reminder");
  const txt = await noticeText(page, "drive-fail");
  ok(/4 days/.test(txt) && /Back up now/.test(txt) && !/\{[a-z]+\}/.test(txt), "it says 4 days and offers Back up now", txt);
  ok(!(await hasNotice(page, "storage-low")), "storage is fine: no storage reminder");
  section("R106-B1b. The bell panel: what needs the person first, kinds shown, long texts fold, Later slides away");
  const order = await page.evaluate(() => [...document.querySelectorAll("[data-notice]")].map((e) => e.getAttribute("data-kind")));
  const rank = { warn: 0, money: 1, ask: 2, tip: 3 };
  ok(order.length >= 2 && order[0] === "warn" && order.every((k, i) => i === 0 || rank[order[i - 1]] <= rank[k]), "warnings first, then money, questions, tips", order);
  ok(await page.evaluate(() => [...document.querySelectorAll("[data-notice]")].every((e) => !!e.querySelector(".inbox-ico svg"))), "every notice shows its kind with an icon");
  const learn = await page.evaluate(() => { const n = document.querySelector('[data-notice="learn-ask"]'); if (!n) return null; const tx = n.querySelector(".inbox-text"); const h0 = tx.getBoundingClientRect().height; n.querySelector(".inbox-more").click(); return { clamped: h0, more: !!n.querySelector('.inbox-more[aria-expanded]') }; });
  if (learn) { await wait(150); const h1 = await page.evaluate(() => document.querySelector('[data-notice="learn-ask"] .inbox-text').getBoundingClientRect().height); ok(h1 > learn.clamped + 20, "the long sharing question shows 3 lines, and Read all opens the rest", [learn.clamped, h1]); }
  await page.evaluate(() => document.querySelector('[data-notice="drive-fail"] [data-act="later"]').click()); await wait(60);
  ok(await page.evaluate(() => !!document.querySelector('[data-notice="drive-fail"].leaving')), "Later: the notice slides away first");
  await wait(500);
  ok(!(await hasNotice(page, "drive-fail")), "then it is gone from the bell");
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
section("R106-A1. Signed in and working: the account card moves to the end of Settings; signed out it stays near the top");
{
  const where = (page) => page.evaluate(() => { const a = document.querySelector('[data-section="st-account"]'), p = document.querySelector('[data-section="st-profile"]'), v = document.querySelector('[data-section="app-version"]');
    if (!a || !p || !v) return "missing"; return (a.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) ? "top" : (a.compareDocumentPosition(v) & Node.DOCUMENT_POSITION_FOLLOWING) ? "bottom" : "other"; });
  const goSettings = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(700); };
  const out = await openPage(browser, { seed: seed() }); await goSettings(out);
  ok((await where(out)) === "top", "signed out: the sign-in offer is near the top", await where(out));
  await out.close();
  const session = { access: "A1", refresh: "R1", until: Date.now() + 3600000, userId: "11111111-2222-3333-4444-555555555555", email: "test@example.invalid", name: "Test Person", version: 3, syncedAt: "2026-11-16T09:00:00Z", lastHash: "", paused: "", lastError: "" };
  const pre = new Function(`try{window.fetch=async()=>{throw new TypeError("Failed to fetch")};if(!sessionStorage.getItem("__s")){sessionStorage.setItem("__s","1");localStorage.setItem("expense_ledger_v5__account",${JSON.stringify(JSON.stringify(session))});}}catch(e){}`);
  const inn = await openPage(browser, { seed: seed(), pre }); await goSettings(inn);
  ok((await where(inn)) === "bottom", "signed in: the account card sits after the other settings, above the version line", await where(inn));
  ok(inn.errors.length === 0, "no JavaScript errors", inn.errors[0]);
  await inn.evaluate(() => { try { localStorage.removeItem("expense_ledger_v5__account"); } catch (e) {} });
  await inn.close();
}
await finish("e2e_run106_bell", browser);
