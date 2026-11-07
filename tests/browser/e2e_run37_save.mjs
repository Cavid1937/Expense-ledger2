// Run 37 (2026-11-07): inside the Android app, "Save to Downloads" hands the complete backup to the shell's save hook (window.__ledgerNativeSave),
// which writes it into the phone's Downloads folder and reads it back. Here the hook is a fake that records the call; the real Java side
// (SaveFilePlugin.java) can only be checked on a phone. Only "saved" is ever reported; cancel and failure record nothing. Synthetic data only.
import { launch, openPage, openData, wait, ok, section, finish, baseSeed, tx, settle, state, clickText, TODAY } from "./lib.mjs";
const browser = await launch();
const fake = (mode) => `(() => {
  window.__saves = [];
  window.__ledgerNativeShare = async () => "shared";
  window.__ledgerNativeSave = async (name, text, mime, pick) => { window.__saves.push({ name, text, mime, pick });
    if ("${mode}" === "fail") throw new Error("disk"); if ("${mode}" === "cancel") return { status: "cancelled" };
    return { status: "saved", where: "Download/" + name }; };
})()`;
const seed = () => baseSeed({ language: "en", lastBackup: null, backupConfirmedAt: null, transactions: [tx({ amount: 9, date: TODAY })] });
const saves = (page) => page.evaluate(() => window.__saves);

section("R37-S1. Save to Downloads: the whole backup goes to the shell; saved means saved and checked");
{
  const page = await openPage(browser, { seed: seed(), pre: fake("ok") }); await settle(page); await openData(page);
  const txt = await page.evaluate(() => document.querySelector(".io-page").innerText);
  ok(/Save to Downloads/.test(txt) && /Send or share/.test(txt), "the app offers 'Save to Downloads' and 'Send or share'", txt.slice(0, 300));
  ok(!/Install on the Home Screen/.test(txt), "no 'install on the Home Screen' advice inside the app");
  await page.evaluate(() => document.querySelector('[data-section="io-save"]').click()); await wait(600);
  const s = await saves(page);
  ok(s.length === 1 && /^ledger-backup-\d{4}-\d{2}-\d{2}\.json$/.test(s[0].name) && s[0].mime === "application/json", "one file, named ledger-backup-<date>.json", s.map((x) => x.name));
  const j = JSON.parse(s[0].text);
  ok(j.version >= 10 && j.transactions.length === 1, "it is a complete backup (version and entries)");
  const st = await state(page);
  ok(!!st.lastBackup && !!st.backupConfirmedAt && Date.parse(st.backupConfirmedAt) >= Date.parse(st.lastBackup), "recorded as created AND confirmed (the shell checked the file), so no 'do you have it?' question");
  ok(/Saved: Download\/ledger-backup/.test(await page.evaluate(() => document.body.innerText)), "the message says where the file is");
  const fits = await page.evaluate(() => { const e = document.querySelector(".snackbar"); if (!e) return null; const b = e.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; });
  ok(fits === true, "the message fits on the screen (Run 39b: it used to run past the edge)", fits);
  await clickText(page, ".io-page .btn-sm", /Export CSV/); await wait(500);
  const s2 = await saves(page);
  ok(s2.length === 2 && /\.csv$/.test(s2[1].name) && s2[1].mime === "text/csv" && /^﻿?"?Date/.test(s2[1].text), "Export CSV also saves into Downloads", s2.map((x) => x.name));
  await page.evaluate(() => document.querySelector('[data-section="io-save-choose"]').click()); await wait(500);
  const s3 = await saves(page);
  ok(s3.length === 3 && s3[2].pick === true && s3[0].pick !== true, "'Save to a folder I choose…' asks for the system Save-as screen; the main button does not", s3.map((x) => x.pick));
  await page.close();
}
section("R37-S1b. The import picker shows every file (Drive often labels .json as plain text)");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page); await openData(page);
  ok(await page.evaluate(() => !document.querySelector(".io-page input[type=file]").hasAttribute("accept")), "no file-type filter on the website either (Run 39c)");
  await page.close();
}
section("R37-S2. Cancel and failure record nothing");
{
  let page = await openPage(browser, { seed: seed(), pre: fake("cancel") }); await settle(page); await openData(page);
  await page.evaluate(() => document.querySelector('[data-section="io-save"]').click()); await wait(500);
  ok(!(await state(page)).lastBackup, "cancelled: no backup recorded");
  await page.close();
  page = await openPage(browser, { seed: seed(), pre: fake("fail") }); await settle(page); await openData(page);
  await page.evaluate(() => document.querySelector('[data-section="io-save"]').click()); await wait(500);
  ok(!(await state(page)).lastBackup && /Couldn't save the file/.test(await page.evaluate(() => document.body.innerText)), "failed: nothing recorded, and the user is told", (await state(page)).lastBackup);
  await page.close();
}
section("R37-S3. An older app shell without the save hook still uses the share menu");
{
  const page = await openPage(browser, { seed: seed(), pre: `(() => { window.__shares = []; window.__ledgerNativeShare = async (n) => { window.__shares.push(n); return "shared"; }; })()` }); await settle(page); await openData(page);
  ok(!/Save to Downloads/.test(await page.evaluate(() => document.querySelector(".io-page").innerText)), "no 'Save to Downloads' button without the hook");
  await clickText(page, ".io-page .btn", /Create backup file/); await wait(500);
  ok((await page.evaluate(() => window.__shares)).length === 1, "the backup goes to the share menu, as before");
  await page.close();
}
await browser.close();
finish("e2e_run37_save");
