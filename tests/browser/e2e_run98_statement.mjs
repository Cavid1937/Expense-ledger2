// Run 98 (audit A4c): a bank statement whose rows do not add up with the bank's own running balance cannot be added with one tap any more.
// The person must tick that they looked through the rows. A statement that adds up is added as before. Synthetic data only.
import { launch, openPage, openData, state, wait, ok, section, finish, baseSeed, tx, settle, fs, path } from "./lib.mjs";
import zlib from "zlib";
const IMP = process.env.E2E_IMP_DIR || "/tmp/tools/imp"; fs.mkdirSync(IMP, { recursive: true });
const browser = await launch();
function zip(parts) {
  const chunks = [], central = []; let off = 0;
  for (const p of parts) { const name = Buffer.from(p.name), raw = Buffer.from(p.text, "utf8"), data = zlib.deflateRawSync(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    chunks.push(lh, name, data); central.push(ch, name); off += 30 + name.length + data.length; }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(parts.length, 8); end.writeUInt16LE(parts.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...chunks, cd, end]);
}
const xlsx = (rows) => zip([{ name: "xl/worksheets/sheet1.xml", text: `<worksheet><sheetData>${rows.map((r, i) => `<row r="${i + 1}">${r.map((c, k) => (c === "" ? "" : `<c r="${String.fromCharCode(65 + k)}${i + 1}" t="inlineStr"><is><t>${String(c).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</t></is></c>`)).join("")}</row>`).join("")}</sheetData></worksheet>` }]);
// ABB layout, newest first. Opening 100.00: +50.00 -> 150.00; -0.90 -> 149.10; -12.50 -> 136.60; -34.40 -> 102.20.
// The broken copy prints 130.00 where 136.60 belongs: the rows no longer add up with the bank's balance.
const rows = (bal) => [["", "Account statement"], ["", "Date", "Description", "CR amount", "DR amount", "Balance"],
  ["", "2026-10-05", "OPENAI *CHATGPT~20261004~USD~20.00~SAN FRANCISCO~4000..1111~5734~RD00000000004~~USA~~", "0.00", "34.40", "102.20"],
  ["", "2026-10-03", "BRAVO MARKET~20261003~AZN~12.50~BAKU~4000..1111~5411~RD00000000003~~AZE~~", "0.00", "12.50", bal], ["", "2026-10-02", "BUS 594~20261001~AZN~.90~BAKU~4000..1111~4131~RD00000000002~~AZE~~", "0.00", "0.90", "149.10"],
  ["", "2026-10-01", "Karta m*daxil~20260930~AZN~50.00~~4000..1111~~RD00000000001~CT000000001A~~~", "50.00", "0.00", "150.00"]];
const good = path.join(IMP, "r98-good.xlsx"), bad = path.join(IMP, "r98-bad.xlsx");
fs.writeFileSync(good, xlsx(rows("136.60"))); fs.writeFileSync(bad, xlsx(rows("130.00")));
const upload = async (page, file) => { const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file); await page.waitForSelector('[data-section="import-statement"], [aria-label="Restore backup"] [role="alert"]', { timeout: 20000 }).catch(() => {}); await wait(250); };
const look = (page) => page.evaluate(() => ({ ok: (document.querySelector('[data-st="check"]') || { getAttribute: () => null }).getAttribute("data-ok"), box: !!document.querySelector('[data-st="anyway"]'), ticked: !!(document.querySelector('[data-st="anyway"]') || {}).checked, off: !!(document.querySelector('[data-section="import-go"]') || {}).disabled, text: (document.querySelector('[data-st="anyway-row"]') || {}).textContent || "" }));
const go = async (page) => { await page.evaluate(() => document.querySelector('[data-section="import-go"]').click()); await wait(500); };
section("R98-S1. A statement that does not add up needs a tick before it can be added");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "Old entry", amount: 3 })] }) }); await settle(page); await openData(page);
  const before = (await state(page)).transactions.length;
  await upload(page, bad);
  let r = await look(page);
  ok(r.ok === "false" && r.box && !r.ticked && r.off && /did not pass/.test(r.text), "the check fails; a tick box is shown, not ticked; the Add button is off", r);
  await go(page);
  ok((await state(page)).transactions.length === before, "pressing the button does nothing: no entry is added");
  await page.evaluate(() => document.querySelector('[data-st="anyway"]').click()); await wait(200); r = await look(page);
  ok(r.ticked && !r.off, "ticking the box turns the button on", r);
  await go(page);
  ok((await state(page)).transactions.length === before + 4, "then the 4 rows are added (the person's choice)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R98-S2. A statement that adds up is added as before");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "Old entry", amount: 3 })] }) }); await settle(page); await openData(page);
  const before = (await state(page)).transactions.length;
  await upload(page, good);
  const r = await look(page);
  ok(r.ok === "true" && !r.box && !r.off, "the check passes; no tick box; the button is on", r);
  await go(page);
  ok((await state(page)).transactions.length === before + 4, "4 rows added with one tap");
  await page.close();
}
for (const [l, re] of [["az", /yoxlamalar keçmədi/], ["ru", /Проверки выше не прошли/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l }) }); await settle(page); await openData(page);
  await upload(page, bad);
  const r = await look(page);
  ok(r.box && r.off && re.test(r.text), `${l}: the tick box is translated and the button is off`, r);
  await page.close();
}
await finish("e2e_run98_statement", browser);
