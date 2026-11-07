// Run 32 (backlog item 17): the Data page shows how full the app's storage is, and warns when it is nearly full. Synthetic data only.
import { launch, openPage, openData, tab, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const fill = (page, chars) => page.evaluate((n) => { try { localStorage.removeItem("zz_filler"); localStorage.setItem("zz_filler", "x".repeat(n)); return true; } catch (e) { return String(e); } }, chars);
const read = (page) => page.evaluate(() => { const el = document.querySelector('[data-section="storage-usage"]'); return el ? { level: el.dataset.level, text: el.innerText.replace(/\s+/g, " ").trim(), alert: (el.querySelector('[role="alert"]') || {}).textContent || null } : null; });
const reopen = async (page) => { await tab(page, "Home"); await settle(page); await openData(page); };

section("R32-S4. Normal use: a usage line, no warning");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await openData(page);
  const r = await read(page);
  ok(r && r.level === "ok" && /^Space used on this device About \d+% of the space the browser allows for this app\.$/.test(r.text) && r.alert === null, "a small ledger shows 'About N%' and no warning", r);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R32-S5. Warning at 80%, 'almost full' at 95%");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await openData(page);
  ok((await fill(page, 4100000)) === true, "premise: the test could store 4.1 million filler characters");
  await reopen(page); let r = await read(page);
  ok(r && r.level === "warn" && /Space is running low\. Create a backup file now/.test(r.alert || ""), "about 82%: the 'running low' warning with the advice to back up", r);
  await fill(page, 4800000); await reopen(page); r = await read(page);
  ok(r && r.level === "full" && /Almost full\. New entries may not be saved/.test(r.alert || ""), "about 96%: the 'almost full' warning", r);
  await page.evaluate(() => localStorage.removeItem("zz_filler")); await reopen(page); r = await read(page);
  ok(r && r.level === "ok" && r.alert === null, "after the space is freed the warning is gone", r);
  await page.close();
}
section("R32-S6. az and ru");
for (const [l, head, warn] of [["az", "Bu cihazda istifadə olunan yer", "Yer azalır"], ["ru", "Занято на этом устройстве", "Место заканчивается"]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l }) }); await openData(page);
  await fill(page, 4100000); await reopen(page); const r = await read(page);
  ok(r && r.text.startsWith(head) && (r.alert || "").startsWith(warn), `${l}: heading and warning are translated`, r);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: no horizontal scroll`);
  await page.close();
}
await finish("e2e_run32_storage", browser);
