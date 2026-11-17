// Run 107 (security order 17 Nov): hostile text in saved data must never break the money figures or reach the page as code.
// Built-in object names ("constructor", "__proto__", "toString") used as a category, account or merchant are treated as plain text.
// Synthetic data only; every expected figure is worked out by hand in the comment beside it.
import { H, ok, section, reset, finish, KEY, T, SRC } from "./lib.mjs";
reset();
const HOSTILE = ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", "prototype"];
const load = (txns) => { globalThis.__store.set(KEY, JSON.stringify({ transactions: txns, language: "en" })); return H.migrateAndLoad(); };

section("SEC-1. A built-in object name as a category in saved data");
{
  for (const name of HOSTILE) {
    reset();
    const s = load([T({ id: 1, amount: 10, category: name, date: "2026-10-05" }), T({ id: 2, amount: 2.5, category: "food", date: "2026-10-06" })]);
    const cats = s.transactions.map((t) => t.category);
    ok(s.transactions.length === 2 && cats.every((c) => typeof c === "string"), `"${name}": both entries kept, each category is text`, cats);
    // "prototype" is not a name every object has, so it is kept like any unknown id from a newer version
    const expectCat = name in Object.prototype || !/^[a-z]/.test(name) ? "other" : name;
    ok(cats[0] === expectCat, `"${name}": category becomes "${expectCat}"`, cats[0]);
    // 10.00 + 2.50 = 12.50 spent in October, whatever the first category is called
    const spend = H.calcCategorySpend(s.transactions, "2026-10", new Date(2026, 9, 20));
    const total = Object.values(spend).reduce((a, b) => a + b, 0);
    ok(Object.values(spend).every((v) => typeof v === "number" && Number.isFinite(v)) && Math.abs(total - 12.5) < 1e-9, `"${name}": category totals are numbers adding to 12.50`, spend);
  }
  // A shop literally called "constructor": October 6.00, September 4.00, so it changed by +2.00
  const tx = [T({ id: 7, amount: 6, merchant: "constructor", date: "2026-10-05" }), T({ id: 8, amount: 4, merchant: "constructor", date: "2026-09-05" })];
  const wc = H.calcWhatChanged(tx, "2026-10", "2026-09", new Date(2026, 9, 31));
  const m = wc.merchantChanges.find((x) => x.merchant === "constructor");
  ok(m && m.cur === 6 && m.prev === 4 && m.diff === 2, "a shop named \"constructor\" compares 6.00 with 4.00", wc.merchantChanges);
  ok(({}).polluted === undefined && Object.prototype.toString.call([]) === "[object Array]", "nothing was added to every object");
}

section("SEC-2. HTML in names stays text");
{
  reset();
  const evil = '<img src=x onerror="window.__pwn=1">';
  const s = load([T({ id: 3, amount: 4, merchant: evil, note: evil, date: "2026-10-05" })]);
  ok(s.transactions[0].merchant === evil.trim() || s.transactions[0].merchant.includes("<img"), "the merchant text is kept as typed (React shows it as text)", s.transactions[0].merchant);
  // The only places HTML is set directly carry fixed drawings from the code, never a person's text
  const sinks = [...SRC.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+)\}\}/g)].map((m) => m[1].trim());
  ok(sinks.length > 0 && sinks.every((x) => /^(Object\.prototype\.hasOwnProperty\.call\(ICONS,name\)|LAUNCH_GLYPH|GOOGLE_G|DRIVE_IC|iconSvg\()/.test(x)), "every HTML insertion takes a fixed drawing", sinks);
  ok(!/ICONS\[name\]\|\|/.test(SRC), "the icon lookup does not fall into built-in object names");
}

section("SEC-3. Exports cannot run spreadsheet formulas");
{
  // = + - @ tab and CR at the start of a text cell would run as a formula; the cell gets a leading apostrophe. Amounts stay numbers.
  const csv = H.buildCsv ? H.buildCsv([T({ id: 4, amount: 5, merchant: "=HYPERLINK(\"http://x\")", note: "+1+1", date: "2026-10-05" }), T({ id: 5, amount: 7, merchant: "@SUM(A1)", note: "\tx", date: "2026-10-06" })]) : null;
  if (csv === null) ok(/function buildCsv[\s\S]{0,900}\[=\+\\-@\\t\\r\]/.test(SRC), "buildCsv carries the formula guard (source check: not exported to the logic bundle)");
  else {
    ok(!/(^|,)"?[=+@\t]/m.test(csv.split("\n").slice(1).join("\n").replace(/(^|,)"?-?\d/g, "$1")), "no text cell starts with a formula character", csv);
    ok(/'=HYPERLINK/.test(csv) && /'@SUM/.test(csv), "formula-like text is kept, behind an apostrophe", csv);
  }
}

section("SEC-4. The PDF reader keeps the guard against the PDF.js font bug (GHSA-wgrm-67xf-hhpq)");
{
  const fs = await import("fs");
  const pdf = fs.readFileSync(new URL("../../pdfText.js", import.meta.url), "utf8");
  ok(/isEvalSupported:\s*false/.test(pdf), "getDocument is called with isEvalSupported: false");
  ok(/PDF_MAX_BYTES\s*=\s*30\s*\*\s*1024\s*\*\s*1024/.test(pdf) && /PDF_MAX_PAGES\s*=\s*400/.test(pdf), "PDF size and page limits are in place");
}
section("SEC-5. A hostile or damaged backup file");
{
  reset(); H.setLang("en");
  // Cut off half-way (an unfinished download): refused as a whole, with the "incomplete" reason, nothing partly read
  const cut = H.planImport('{"version":2,"transactions":[{"id":1,"type":"expense","amount":5,', "backup.json");
  ok(cut.ok === false && cut.error === H.t("import.bad.cut"), "a backup that breaks off is refused as incomplete", cut);
  // JSON.parse turns "__proto__" into an ordinary key; nothing may reach every object, and the saved entry must not carry it
  const evil = '{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted2":1}},"currency":"₼","transactions":[{"id":1,"type":"expense","amount":5,"category":"food","merchant":"<b>x</b>","date":"2026-10-05","__proto__":{"isAdmin":true}}]}';
  const p = H.planImport(evil, "backup.json");
  const e = p.ok ? p.transactions[0] : null;
  ok(p.ok && p.transactions.length === 1 && e.amount === 5 && e.merchant === "<b>x</b>", "the one real entry is read (5.00, its text kept as text)", p);
  ok(({}).polluted === undefined && ({}).polluted2 === undefined && ({}).isAdmin === undefined && e && e.isAdmin === undefined, "nothing reached every object or the entry", e);
  ok(e && !Object.prototype.hasOwnProperty.call(e, "__proto__") && Object.getPrototypeOf(e) === Object.prototype, "the entry is a plain object without a smuggled prototype");
  // A backup over 50 MB is refused before it is read (checked in the source: file pickers do not exist in the logic tests)
  ok(H.IMPORT_MAX_BYTES === undefined ? /IMPORT_MAX_BYTES=50\*1024\*1024/.test(SRC) : H.IMPORT_MAX_BYTES === 52428800, "the import size limit is 50 MB");
  ok(/if \(!file\) return;\s*\n[^\n]*\n\s*if \(file\.size>IMPORT_MAX_BYTES\)[^\n]*return; \}\s*\n\s*const reader=new FileReader\(\);/.test(SRC), "the size is checked before the file is read");
}
section("SEC-6. Built-in names as shop, subcategory and budget key (reviewer sweep)");
{
  reset(); H.setLang("en");
  // October so far: constructor 40 + 30 = 70, Bravo 20, toString 5, no shop 5; month 100.00; top three = 95% (at least 60%: insight shown)
  const tx = [T({ id: 21, amount: 40, merchant: "constructor", date: "2026-10-02" }), T({ id: 22, amount: 30, merchant: "constructor", date: "2026-10-03" }),
    T({ id: 23, amount: 20, merchant: "Bravo", date: "2026-10-04" }), T({ id: 24, amount: 5, merchant: "toString", date: "2026-10-05" }), T({ id: 25, amount: 5, date: "2026-10-06" })];
  const ins = H.calcPatterns(tx, "₼", new Date(2026, 9, 20)).insights.find((x) => x.id === "merchant");
  ok(ins && /constructor, Bravo, toString/.test(ins.text) && /95/.test(ins.text) && !/function|native code|NaN/.test(ins.text), "the shop insight names constructor, Bravo, toString at 95%", ins);
  // A shop's usual subcategory typed as "constructor" (twice) beats "lunch" (once)
  const pr = H.calcMerchantProfile("Bravo", [T({ id: 31, amount: 5, merchant: "Bravo", subcategory: "constructor", date: "2026-10-02" }),
    T({ id: 32, amount: 5, merchant: "Bravo", subcategory: "constructor", date: "2026-10-03" }), T({ id: 33, amount: 5, merchant: "Bravo", subcategory: "lunch", date: "2026-10-04" })]);
  ok(pr && pr.usualSub === "constructor", "the usual subcategory is \"constructor\" (2 of 3)", pr && pr.usualSub);
  // Nothing remembered for a shop called "constructor": no suggestion, not a built-in object
  ok(H.merchantSuggest("constructor", H.buildMerchantMemory([]), "expense") === null, "no suggestion is invented for \"constructor\"");
  // Budgets from a backup: only the real category is kept; the two built-in names are counted as unusable
  const v = H.validateSettings(JSON.parse('{"budgets":{"__proto__":{"x":1},"constructor":50,"food":100}}'));
  ok(v.settings.budgets && Object.keys(v.settings.budgets).join() === "food" && v.settings.budgets.food === 100 && ({}).x === undefined, "budgets keep food 100.00 only", v);
}
finish("security");
