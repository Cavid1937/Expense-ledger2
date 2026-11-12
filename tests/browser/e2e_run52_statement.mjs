// Run 52: bank statements through the real import screen: a PDF, an Excel file, a text file and pasted text. Every file is made here from
// invented rows in the two layouts the app knows (ABB, Unibank) and in a plain table. Synthetic data only.
import { launch, openPage, openData, clickText, state, wait, ok, section, finish, baseSeed, tx, settle, fs, path } from "./lib.mjs";
import zlib from "zlib";
const IMP = process.env.E2E_IMP_DIR || "/tmp/tools/imp"; fs.mkdirSync(IMP, { recursive: true });
const browser = await launch();
const AK = "expense_ledger_v5__accounts";
const sheet = (page) => page.evaluate(() => (document.querySelector('[aria-label="Restore backup"]') || {}).innerText || "");
const snack = (page) => page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "");
const upload = async (page, file, ready = '[data-section="import-statement"], [aria-label="Restore backup"] [role="alert"]') => { const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file); await page.waitForSelector(ready, { timeout: 20000 }).catch(() => {}); await wait(250); };
const add = async (page) => { await page.evaluate(() => document.querySelector('[data-section="import-go"]').click()); await wait(500); };
const spent = (l) => l.filter((x) => x.type === "expense").reduce((s, x) => s + Math.round(x.amount * 100), 0), got = (l) => l.filter((x) => x.type === "income").reduce((s, x) => s + Math.round(x.amount * 100), 0);

// ── test files ───────────────────────────────────────────────────────────────
// A PDF with plain text at exact places (what a bank's PDF holds once opened): pages of [x, y, text].
function pdf(pages) {
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const objs = []; const addObj = (body) => { objs.push(body); return objs.length; };
  const font = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"), pagesId = objs.length + 1 + pages.length * 2; const kids = [];
  pages.forEach((items) => { const stream = items.map(([x, y, s]) => `BT /F1 9 Tf ${x} ${y} Td (${esc(s)}) Tj ET`).join("\n"); const c = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`); kids.push(addObj(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${c} 0 R /Resources << /Font << /F1 ${font} 0 R >> >> >>`)); });
  addObj(`<< /Type /Pages /Kids [${kids.map((k) => k + " 0 R").join(" ")}] /Count ${kids.length} >>`); const cat = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let out = "%PDF-1.4\n"; const offs = []; objs.forEach((b, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${b}\nendobj\n`; });
  const xref = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("") + `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
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

// ABB layout, newest first. Opening 100.00: +50.00 -> 150.00; -0.90 -> 149.10; -12.50 -> 136.60; -34.40 (20.00 USD) -> 102.20; -40.00 cash -> 62.20.
const abbPages = [[
  [225, 760, "Account statement"], [33, 527, "Date"], [89, 527, "Description"], [526, 527, "Balance"],
  [89, 507, "ATM NAGDLASDIRMA~20261006~AZN~40.00~BAKU~4000.."], [33, 500, "2026-10-06"], [454, 500, "0.00"], [494, 500, "40.00"], [539, 500, "62.20"], [89, 493, "1111~6011~RD00000000005~~AZE~~"],
  [33, 460, "2026-10-05"], [89, 460, "OPENAI *CHATGPT~20261004~USD~20.00~SAN FRANCISCO~4000..1111~5734~RD00000000004~~USA~~"], [454, 460, "0.00"], [494, 460, "34.40"], [534, 460, "102.20"],
  [89, 427, "BRAVO MARKET~20261003~AZN~12.50~BAKU~4000.."], [33, 420, "2026-10-03"], [454, 420, "0.00"], [494, 420, "12.50"], [534, 420, "136.60"], [89, 413, "1111~5411~RD00000000003~~AZE~~"],
  [33, 380, "2026-10-02"], [89, 380, "BUS 594~20261001~AZN~.90~BAKU~4000.."], [454, 380, "0.00"], [500, 380, "0.90"], [534, 380, "149.10"], [280, 30, "Page 1 of 2"],
], [
  [89, 780, "1111~4131~RD00000000002~~AZE~~"], [33, 740, "2026-10-01"], [89, 740, "Karta m*daxil~20260930~AZN~50.00~~4000..1111~~RD00000000001~CT000000001A~~~"], [443, 740, "50.00"], [500, 740, "0.00"], [534, 740, "150.00"], [280, 30, "Page 2 of 2"],
]];
const abbPdfFile = path.join(IMP, "abb-statement.pdf"); fs.writeFileSync(abbPdfFile, pdf(abbPages));
const abbXlsxFile = path.join(IMP, "abb-statement.xlsx");
fs.writeFileSync(abbXlsxFile, xlsx([["", "Account statement"], ["", "Date", "Description", "CR amount", "DR amount", "Balance"],
  ["", "2026-10-06", "ATM NAGDLASDIRMA~20261006~AZN~40.00~BAKU~4000..1111~6011~RD00000000005~~AZE~~", "0.00", "40.00", "62.20"], ["", "2026-10-05", "OPENAI *CHATGPT~20261004~USD~20.00~SAN FRANCISCO~4000..1111~5734~RD00000000004~~USA~~", "0.00", "34.40", "102.20"],
  ["", "2026-10-03", "BRAVO MARKET~20261003~AZN~12.50~BAKU~4000..1111~5411~RD00000000003~~AZE~~", "0.00", "12.50", "136.60"], ["", "2026-10-02", "BUS 594~20261001~AZN~.90~BAKU~4000..1111~4131~RD00000000002~~AZE~~", "0.00", "0.90", "149.10"],
  ["", "2026-10-01", "Karta m*daxil~20260930~AZN~50.00~~4000..1111~~RD00000000001~CT000000001A~~~", "50.00", "0.00", "150.00"]]));
const uniText = ["12-11-2026 | 09:15 12-11-2026 - 0.60 AZN BAKU METRO / 0.60 AZN", "11-11-2026 | 16:40 Lock - 5.00 AZN KAFE 21 / 5.00 AZN", "11-11-2026 | 14:02 11-11-2026 - 20.00 AZN PAYMENT SERVICE / 20.00 AZN",
  "11-11-2026 | 14:00 11-11-2026 20.00 AZN - M10 WALLET / 20.00 AZN", "A VERY LONG MERCHANT NAME /", "10-11-2026 | 10:00 10-11-2026 - 7.50 AZN", "7.50 AZN", "09-11-2026 | 08:00 09-11-2026 3.00 AZN - CASHBACK / 3.00 AZN"].join("\n");
const uniTxtFile = path.join(IMP, "unibank-statement.txt"); fs.writeFileSync(uniTxtFile, uniText);
const otherXlsxFile = path.join(IMP, "other-bank.xlsx");
fs.writeFileSync(otherXlsxFile, xlsx([["Hesabdan çıxarış"], ["Tarix", "Təyinat", "Məxaric", "Mədaxil", "Qalıq"], ["01.10.2026", "Market A", "12,50", "", "87,50"], ["02.10.2026", "Əmək haqqı", "", "1 000,00", "1 087,50"], ["03.10.2026", "Kirayə", "600", "", "487,50"]]));

section("R52-B1. A PDF statement (ABB layout): read, checked, added, undone, and not added twice");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "Old entry", amount: 3 })] }), pre: eval(`(() => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); localStorage.setItem("${AK}", ${JSON.stringify(JSON.stringify({ version: 1, accounts: [{ id: "a_card01", name: "ABB Card", kind: "card", opening: { amount: 100, date: "" }, hidden: false }], transfers: [] }))}); } } catch {} })`) });
  await settle(page); await openData(page);
  const before = await state(page);
  await upload(page, abbPdfFile);
  let sh = await sheet(page);
  ok(/Bank statement: ABB/.test(sh) && /5 entries ready to import/.test(sh), "the PDF is recognised as an ABB statement with 5 rows", sh.slice(0, 500));
  ok(/every row adds up/.test(sh) && (await page.evaluate(() => document.querySelector('[data-st="check"]').getAttribute("data-ok"))) === "true", "the sheet says the bank's running balance confirms every row");
  ok(/Include 2 transfers, top-ups and cash withdrawals/.test(sh) && (await page.evaluate(() => document.querySelector('[data-st="transfers"]').checked)) && !(await page.$('[data-st="pending"]')), "the cash withdrawal and the money-in are offered as a choice (ticked); no 'not finished' rows in this file");
  ok(/New, will be added: 5/.test(sh) && /Add these entries/.test(sh) && !/Replace/.test(sh.replace(/Restore Backup/i, "")), "5 new entries; the button says 'Add these entries'; Replace is not offered for a statement", sh.slice(-400));
  const list = await page.evaluate(() => ({ title: document.querySelector(".sheet-title").innerText, n: document.querySelectorAll("[data-st-row]").length, text: document.querySelector('[data-st="rows"]').innerText }));
  ok(list.title === "Bank statement" && list.n === 5 && /BUS 594/.test(list.text) && /0\.90/.test(list.text) && /Karta m\*daxil/.test(list.text) && /\+/.test(list.text), "the sheet is titled 'Bank statement' and lists all 5 rows with merchant, category and amount before anything is added", list);
  await page.select('[data-st="account"]', "a_card01"); await wait(150);
  await add(page);
  let st = await state(page); const added = st.transactions.filter((x) => String(x.id).startsWith("s"));
  ok(st.transactions.length === before.transactions.length + 5 && spent(added) === 4000 + 3440 + 1250 + 90 && got(added) === 5000, "5 entries added: 40.00 + 34.40 + 12.50 + 0.90 out, 50.00 in", added.map((x) => [x.type, x.amount]));
  const by = (m) => added.find((x) => x.merchant === m);
  ok(by("BUS 594").category === "transport" && by("BUS 594").subcategory === "Bus" && by("BUS 594").date === "2026-10-01" && by("BRAVO MARKET").category === "food" && by("OPENAI *CHATGPT").category === "digital" && by("OPENAI *CHATGPT").note === "20.00 USD, SAN FRANCISCO" && by("ATM NAGDLASDIRMA").category === "finance", "categories from the bank's merchant codes, the real payment date, and the dollar amount kept as a note", added.map((x) => [x.merchant, x.category, x.subcategory, x.date, x.note]));
  ok(added.every((x) => x.account === "a_card01") && !JSON.stringify(added).includes("1111") && !JSON.stringify(added).includes("RD0000"), "all five sit on the chosen account; no card digits or bank references are stored");
  const bal = await page.evaluate(() => null);
  ok(/Added 5 entries/.test(await snack(page)) && /Undo/.test(await snack(page)), "an Undo bar is shown", await snack(page));
  await page.evaluate(() => document.querySelector(".snackbar-undo").click()); await wait(500);
  ok(JSON.stringify((await state(page)).transactions) === JSON.stringify(before.transactions), "Undo: the entries are exactly as before");
  // add again, then the SAME statement as Excel: nothing new
  await openData(page); await upload(page, abbPdfFile); await add(page);
  await openData(page); await upload(page, abbXlsxFile);
  sh = await sheet(page);
  ok(/Bank statement: ABB/.test(sh) && /Already here, left as they are: 5/.test(sh) && /New, will be added: 0/.test(sh), "the same statement as an Excel file: all 5 are recognised as already here", sh.slice(-500));
  await add(page);
  ok((await state(page)).transactions.length === before.transactions.length + 5, "adding it again changes nothing: still 5 statement entries");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R52-B2. A text file (Unibank layout): transfers and unfinished payments are choices");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page); await openData(page);
  await upload(page, uniTxtFile);
  let sh = await sheet(page);
  ok(/Bank statement: Unibank/.test(sh) && /no running balance/.test(sh), "recognised as Unibank; the sheet says there is no running balance to check against", sh.slice(0, 500));
  ok(/Include 2 transfers/.test(sh) && /Include 1 payment the bank has not finished yet/.test(sh) && (await page.evaluate(() => document.querySelector('[data-st="transfers"]').checked && !document.querySelector('[data-st="pending"]').checked)), "2 transfers (the wallet pair) ticked; 1 unfinished payment NOT ticked");
  ok(/5 entries ready to import/.test(sh) && /New, will be added: 5/.test(sh), "5 of the 6 rows are ready (the unfinished one is left out)");
  await page.evaluate(() => document.querySelector('[data-st="transfers"]').click()); await wait(200);
  ok(/3 entries ready to import/.test(await sheet(page)) && /New, will be added: 3/.test(await sheet(page)) && (await page.evaluate(() => document.querySelectorAll("[data-st-row]").length)) === 3 && !/M10 WALLET/.test(await sheet(page)), "unticking transfers: 3 rows, and the list shows exactly those 3");
  await page.evaluate(() => document.querySelector('[data-st="pending"]').click()); await wait(200);
  ok(/4 entries ready to import/.test(await sheet(page)), "ticking the unfinished payment: 4 rows");
  await add(page);
  const st = await state(page), m = (n) => st.transactions.find((x) => x.merchant === n);
  ok(st.transactions.length === 4 && m("BAKU METRO").subcategory === "Metro" && m("A VERY LONG MERCHANT NAME").amount === 7.5 && m("CASHBACK").type === "income" && m("CASHBACK").category === "refund" && m("KAFE 21").amount === 5 && !m("M10 WALLET"), "the 4 chosen rows are added: metro ride, the wrapped merchant with 7.50, the cashback as a refund, the cafe; the wallet pair is not", st.transactions.map((x) => [x.merchant, x.type, x.amount, x.category]));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R52-B3. Another bank's Excel file with Azerbaijani headings; pasted text");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page); await openData(page);
  await upload(page, otherXlsxFile);
  let sh = await sheet(page);
  ok(/Bank statement: read by its columns/.test(sh) && /every row adds up/.test(sh) && /3 entries ready/.test(sh), "an unknown bank is read by its column headings, and its balance column confirms the rows", sh.slice(0, 400));
  await add(page);
  let st = await state(page);
  ok(st.transactions.length === 3 && spent(st.transactions) === 61250 && got(st.transactions) === 100000 && st.transactions.some((x) => x.merchant === "Əmək haqqı" && x.type === "income"), "12.50 + 600.00 out and 1 000.00 in, with Azerbaijani letters intact", st.transactions.map((x) => [x.merchant, x.type, x.amount]));
  await openData(page);
  ok(!(await page.$("#st-paste")) && !!(await page.$('[data-section="io-paste-open"]')), "the paste box is closed until asked for");
  await page.evaluate(() => document.querySelector('[data-section="io-paste-open"]').click()); await wait(300);
  ok(await page.evaluate(() => document.querySelector('[data-section="io-paste-go"]').disabled), "'Read the text' is off while the box is empty");
  await page.$eval("#st-paste", (el, v) => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, "Date\tDetails\tDebit\tCredit\tBalance\n04.10.2026\tPharmacy Plus\t9.00 AZN\t-\t478.50 AZN\n05.10.2026\tGift from aunt\t-\t100.00 AZN\t578.50 AZN");
  await wait(150); await page.evaluate(() => document.querySelector('[data-section="io-paste-go"]').click());
  await page.waitForSelector('[data-section="import-statement"]', { timeout: 5000 }).catch(() => {}); await wait(250);
  sh = await sheet(page);
  ok(/Pasted text/.test(sh) && /2 entries ready/.test(sh) && /every row adds up/.test(sh), "pasted rows open the same sheet: 2 rows, balance confirmed", sh.slice(0, 300));
  await add(page); st = await state(page);
  ok(st.transactions.length === 5 && st.transactions.some((x) => x.merchant === "Pharmacy Plus" && x.amount === 9 && x.category === "health"), "both pasted rows are added; 'Pharmacy' is filed under Health");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R52-B4. Files that are not statements are refused with a reason; nothing changes");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openData(page);
  const before = JSON.stringify((await state(page)).transactions);
  const cases = [["broken.pdf", Buffer.from("%PDF-1.4\nthis is not a real pdf file"), /This PDF could not be opened/], ["letter.pdf", pdf([[[72, 700, "Dear customer, thank you for banking with us."], [72, 680, "Kind regards"]]]), /No bank statement rows were found/],
    ["word.xlsx", zip([{ name: "word/document.xml", text: "<w/>" }]), /This Excel file could not be opened/], ["notes.xlsx", xlsx([["Shopping list"], ["Milk", "Bread"]]), /No bank statement rows were found/],
    ["two-columns.xlsx", xlsx([["2026-10-01", "A", "10.00", "7.00"], ["2026-10-02", "B", "50.00", "1.00"], ["2026-10-03", "C", "5.00", "2.00"]]), /cannot tell which column is money in/]];
  for (const [name, data, re] of cases) {
    const f = path.join(IMP, name); fs.writeFileSync(f, data); await upload(page, f); const sh = await sheet(page);
    ok(re.test(sh) && JSON.stringify((await state(page)).transactions) === before, `${name}: refused with a clear reason, saved data unchanged`, sh.slice(0, 240));
    await clickText(page, '[aria-label="Restore backup"] .btn', /^OK/); await wait(250);
  }
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R52-B5. Azerbaijani and Russian");
for (const [l, title, check, btn] of [["az", /Bank çıxarışı: ABB/, /bütün sətirlər düz gəlir/, /Bu qeydləri əlavə et/], ["ru", /Банковская выписка: ABB/, /все строки сходятся/, /Добавить эти записи/]]) {
  const p = await openPage(browser, { seed: baseSeed({ language: l, transactions: [] }), chooseLang: l }); await settle(p); await openData(p);
  const input = await p.$(".io-page input[type=file]"); await input.uploadFile(abbXlsxFile); await p.waitForSelector('[data-section="import-statement"]', { timeout: 20000 }).catch(() => {}); await wait(250);
  const sh = await p.evaluate(() => (document.querySelector(".sheet") || {}).innerText || "");
  ok(title.test(sh) && check.test(sh) && btn.test(sh), `${l}: bank line, balance line and button are translated`, sh.slice(0, 300));
  await p.close();
}
await finish("e2e_run52_statement", browser);
