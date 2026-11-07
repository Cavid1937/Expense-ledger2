// Run 32 (backlog item 9): the encrypted backup, end to end in the browser: create it on the Data page, open it again through Import with the passphrase.
// Synthetic data only; files go to the temp folders set by tests/run-browser.mjs.
import { launch, openPage, state, openData, wait, ok, section, finish, tx, baseSeed, fs, path, settle } from "./lib.mjs";
const DL = process.env.E2E_DL_DIR || path.join(process.env.TEMP || ".", "ledger-e2e-dl"); fs.mkdirSync(DL, { recursive: true });
const browser = await launch();
const PASS = "blue-fern-2026";
const A = (lang) => baseSeed({ language: lang, transactions: [tx({ id: "a1", amount: 12.5, merchant: "Zebra Cafe", date: "2026-09-01" }), tx({ id: "a2", amount: 40, merchant: "Quokka Fuel", date: "2026-10-05", category: "transport" })] });
const B = (lang) => baseSeed({ language: lang, transactions: [tx({ id: "b1", amount: 5, merchant: "Shop", date: "2026-10-04" })] });
for (const f of fs.readdirSync(DL)) if (/^ledger-backup-encrypted-/.test(f)) fs.unlinkSync(path.join(DL, f));   // only this test's own earlier output
const listEnc = () => fs.readdirSync(DL).filter((f) => /^ledger-backup-encrypted-.*\.json$/.test(f));
const clear = async (page, el) => { await el.click(); await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control"); await page.keyboard.press("Backspace"); };
const fill = async (page, a, b) => { const ins = await page.$$('[data-section="enc-backup"] input'); await clear(page, ins[0]); await ins[0].type(a); await clear(page, ins[1]); await ins[1].type(b); };
const press = async (page) => { await page.evaluate(() => document.querySelector('[data-section="enc-backup"] button[type=submit]').click()); await wait(250); };
const alertText = (page, sel) => page.evaluate((s) => (document.querySelector(s + ' [role="alert"]') || {}).textContent || null, sel);

section("R32-N1. Creating the encrypted file");
let file;
{
  const page = await openPage(browser, { seed: A("en") }); await openData(page); const lb0 = (await state(page)).lastBackup;
  await page.evaluate(() => document.querySelector('[data-section="enc-toggle"]').click()); await wait(400);   // Run 37: the optional form starts folded
  ok(await page.evaluate(() => !!document.querySelector('[data-section="enc-backup"]')), "the Data page offers the encrypted backup form");
  await fill(page, "abc", "abc"); await press(page);
  ok(/at least 8/.test(await alertText(page, '[data-section="enc-backup"]') || ""), "a 3-character passphrase is refused with a message", await alertText(page, '[data-section="enc-backup"]'));
  await fill(page, PASS, "blue-fern-2027"); await press(page);
  ok(/not the same/.test(await alertText(page, '[data-section="enc-backup"]') || ""), "two different passphrases are refused");
  ok(listEnc().length === 0 && (await state(page)).lastBackup === lb0, "no file was made and no backup was recorded by the refusals");
  await fill(page, PASS, PASS); await press(page);
  for (let i = 0; i < 40 && !listEnc().length; i++) await wait(250);
  file = listEnc()[0] && path.join(DL, listEnc()[0]);
  ok(!!file, "a file named ledger-backup-encrypted-<date>.json is downloaded", listEnc());
  const txt = file ? fs.readFileSync(file, "utf8") : "";
  ok(/"format":"expense-ledger-encrypted-backup"/.test(txt) && !/Zebra|Quokka|12\.5|blue-fern/.test(txt), "it is the encrypted format and shows neither the entries nor the passphrase");
  ok((await state(page)).lastBackup !== lb0, "the app records that a backup file was created");
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-section="enc-backup"] input')].every((i) => i.value === "")), "the passphrase fields are cleared afterwards");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
const upload = async (page, f) => { const input = await page.$(".io-page input[type=file]"); await input.uploadFile(f); await page.waitForSelector('[data-section="import-unlock"]', { timeout: 5000 }).catch(() => {}); await wait(150); };
const unlock = async (page, pass) => { await page.type('[data-section="import-unlock"] input', pass); await page.evaluate(() => document.querySelector('[data-section="import-unlock"] button[type=submit]').click()); await wait(1200); };

section("R32-N2. Opening it: wrong passphrase, then the right one");
{
  const page = await openPage(browser, { seed: B("en") }); await openData(page); await upload(page, file);
  ok(await page.evaluate(() => /This backup is encrypted/.test(document.querySelector(".sheet-title").textContent)), "importing the file asks for a passphrase first");
  await unlock(page, "wrong-passphrase");
  ok(/Wrong passphrase/.test(await alertText(page, '[data-section="import-unlock"]') || "") && !!(await page.$('[data-section="import-unlock"]')), "a wrong passphrase says so and the sheet stays open", await alertText(page, '[data-section="import-unlock"]'));
  ok((await state(page)).transactions.length === 1, "nothing was imported");
  await unlock(page, PASS);
  await page.waitForSelector('[data-section="import-compare"]', { timeout: 5000 }).catch(() => {});
  const cmp = await page.evaluate(() => (document.querySelector('[data-section="import-compare"]') || {}).textContent || null);
  ok(/^Entries in this file: 2 /.test(cmp || "") && /On this device now: 1\./.test(cmp || ""), "the right passphrase opens the normal review sheet: 2 entries in the file, 1 here", cmp);
  ok((await state(page)).transactions.length === 1, "still nothing imported until the user chooses");
  await page.evaluate(() => document.querySelector(".sheet .btn-primary").click()); await wait(500);
  const st = await state(page);
  ok(st.transactions.length === 3 && ["Zebra Cafe", "Quokka Fuel", "Shop"].every((m) => st.transactions.some((x) => x.merchant === m)), "Merge adds the two entries to the one already here", st.transactions.map((x) => x.merchant));
  ok(st.transactions.find((x) => x.merchant === "Zebra Cafe").amount === 12.5, "amounts survive the round trip exactly");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R32-N3. Cancel leaves everything as it was");
{
  const page = await openPage(browser, { seed: B("en") }); await openData(page); await upload(page, file);
  await page.evaluate(() => [...document.querySelectorAll(".sheet .btn")].find((b) => /Cancel/i.test(b.textContent)).click()); await wait(300);
  ok(!(await page.$(".sheet-overlay")) && (await state(page)).transactions.length === 1, "cancelling closes the sheet and imports nothing");
  await page.close();
}
section("R32-N4. az and ru");
for (const [l, title, unlockBtn, wrong] of [["az", "Bu ehtiyat nüsxə şifrəlidir", "Aç", "yanlışdır"], ["ru", "Эта копия зашифрована", "Открыть", "Неверная"]]) {
  const page = await openPage(browser, { seed: B(l) }); await openData(page);
  ok(await page.evaluate(() => !/Lock the file|passphrase/i.test(document.querySelector('[data-section="enc-toggle"]').textContent)), `${l}: the fold button is translated`);
  await page.evaluate(() => document.querySelector('[data-section="enc-toggle"]').click()); await wait(400);
  ok(await page.evaluate(() => document.querySelector('[data-section="enc-backup"]').textContent.length > 20 && !/Encrypted backup|passphrase/i.test(document.querySelector('[data-section="enc-backup"]').textContent)), `${l}: the form is translated`);
  await upload(page, file);
  const got = await page.evaluate(() => ({ t: document.querySelector(".sheet-title").textContent, b: document.querySelector('[data-section="import-unlock"] button[type=submit]').textContent }));
  ok(got.t === title && got.b === unlockBtn, `${l}: unlock sheet title and button are translated`, got);
  await unlock(page, "wrong-passphrase");
  ok((await alertText(page, '[data-section="import-unlock"]') || "").includes(wrong), `${l}: the wrong-passphrase message is translated`, await alertText(page, '[data-section="import-unlock"]'));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: no horizontal scroll`);
  await page.close();
}
await finish("e2e_run32_enc", browser);
