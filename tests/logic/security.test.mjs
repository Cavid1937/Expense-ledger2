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
finish("security");
