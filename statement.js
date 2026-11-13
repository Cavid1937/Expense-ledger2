// Run 52: bank statements -> rows the app can import. Pure module: no React, no storage, no network. Everything runs on the phone.
//
// Three layers:
//   1. Readers turn a file into LINES: [{ page, y, cells:[text...] }] (PDF text with positions, a pasted text, or an Excel / CSV grid).
//   2. readStatement(lines) finds the bank layout (ABB, Unibank, or a generic table), joins wrapped rows, and returns ROWS:
//        { date, posted, time, type:"income"|"expense", cents, desc, merchant, balance, ref, mcc, cur, orig, pending, kind }
//   3. statementEntries(rows, opts) turns rows into the app's entries (stable ids, category guess, notes).
// Layouts were learned from two real statements (ABB, Unibank). Only the LAYOUT is recorded here; tests use made-up statements.
// Private details of a statement (names, card and account numbers, balances) are never kept: card digits are dropped while reading.

const CUR_WORDS = ["AZN", "USD", "EUR", "GBP", "RUB", "TRY", "GEL", "KZT", "UAH", "AED", "CHF"];
const CUR_SIGNS = { "₼": "AZN", "$": "USD", "€": "EUR", "£": "GBP", "₽": "RUB", "₺": "TRY" };
const curOf = (s) => { const u = String(s || "").toUpperCase(); const w = CUR_WORDS.find((c) => u.includes(c)); if (w) return w; for (const k of Object.keys(CUR_SIGNS)) if (u.includes(k)) return CUR_SIGNS[k]; return ""; };

// "35.00 AZN" "-0.02 AZN" ".90" "1,234.56" "1 234,56" "AZN0.90" "-0.90₼" "(45.00)" "+12" -> signed whole qapik, or null when it is not money.
export function stMoney(s) {
  let v = String(s == null ? "" : s).replace(/[  ]/g, " ").trim(); if (!v) return null;
  v = v.replace(new RegExp("(" + CUR_WORDS.join("|") + ")", "ig"), "").replace(/[₼$€£₽₺]/g, "").trim();
  let neg = false; if (/^\(.*\)$/.test(v)) { neg = true; v = v.slice(1, -1).trim(); }
  if (/^[\-−–]/.test(v)) { neg = !neg; v = v.slice(1).trim(); } else if (/^\+/.test(v)) v = v.slice(1).trim();
  if (!/^[\d .,']+$/.test(v) || !/\d/.test(v)) return null;
  v = v.replace(/[ ']/g, "");
  const lc = v.lastIndexOf(","), ld = v.lastIndexOf(".");
  if (lc > -1 && ld > -1) v = lc > ld ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
  else if (lc > -1) v = /,\d{1,2}$/.test(v) && v.indexOf(",") === lc ? v.replace(",", ".") : v.replace(/,/g, "");
  else if (ld > -1 && v.indexOf(".") !== ld) v = v.replace(/\./g, "");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(v)) return null;
  const c = Math.round(parseFloat(v) * 100); if (!Number.isFinite(c) || c > 1e14) return null;
  return neg ? -c : c;
}
const pad = (n) => String(n).padStart(2, "0");
const realDate = (y, m, d) => { const dt = new Date(y, m - 1, d); return y > 1990 && y < 2100 && dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null; };
// yyyy-mm-dd, dd-mm-yyyy, dd.mm.yyyy, dd/mm/yyyy, yyyymmdd; an optional time after a space, a "T" or " | ". Day first, real calendar days only.
export function stDate(s) {
  const v = String(s || "").trim(); let x, date = null, rest = "";
  if ((x = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/))) { date = realDate(+x[1], +x[2], +x[3]); rest = x[4]; }
  else if ((x = v.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(.*)$/))) { date = realDate(+x[3], +x[2], +x[1]); rest = x[4]; }
  else if ((x = v.match(/^(\d{4})(\d{2})(\d{2})$/))) { date = realDate(+x[1], +x[2], +x[3]); }
  if (!date) return null;
  const tm = rest.match(/^\s*(?:[T|,]\s*)?(\d{1,2}):(\d{2})(?::\d{2})?\s*$/);
  if (rest.trim() && !tm) return null;
  return { date, time: tm && +tm[1] < 24 && +tm[2] < 60 ? `${pad(+tm[1])}:${tm[2]}` : "" };
}
const clean = (s) => String(s == null ? "" : s).replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();

// ── Readers that need no library ─────────────────────────────────────────────
// A pasted text (or a .txt file): one line per text line. Cells are split on tabs or runs of 2+ spaces; a line without them stays one cell.
export function linesFromText(text) {
  return String(text || "").replace(/^﻿/, "").split(/\r?\n/).map((l) => l.replace(/ /g, " ")).filter((l) => l.trim() !== "")
    .map((l) => ({ page: 0, y: null, cells: l.split(/\t| {2,}/).map(clean).filter(Boolean) }));
}
// A grid (Excel sheet, CSV): one line per row, one cell per column (empty cells kept, so columns stay in place).
export function linesFromGrid(grid) {
  return (Array.isArray(grid) ? grid : []).map((r) => ({ page: 0, y: null, grid: true, cells: (Array.isArray(r) ? r : []).map(clean) })).filter((l) => l.cells.some(Boolean));
}

// ── Bank layouts ─────────────────────────────────────────────────────────────
const MONEY_END = "(-?(?:[\\d,]*\\.\\d{1,2}|\\d[\\d,]*))";
const ABB_ROW = new RegExp("^(\\d{4}-\\d{2}-\\d{2})\\s+(?:(.*\\S)\\s+)?" + MONEY_END + "\\s+" + MONEY_END + "\\s+" + MONEY_END + "$");
const ABB_MARK = /~\d{8}~[A-Z]{3}~/;
const UNI_ROW = /^(\d{2}-\d{2}-\d{4})\s*\|\s*(\d{1,2}:\d{2})\s+(\S+)\s+(-|[\d.,]+\s?[A-Z]{3})\s+(-|[\d.,]+\s?[A-Z]{3})(?:\s+(.*))?$/;
const UNI_START = /^\d{2}-\d{2}-\d{4}\s*\|\s*\d{1,2}:\d{2}\b/;
const lineText = (l) => l.cells.filter(Boolean).join(" ");

// What kind of money move a row is, from its words. A transfer or a cash withdrawal is real money leaving or arriving, but it is not shopping.
const KIND_RULES = [
  ["cashback", /cash ?back|ke[sş]bek|кэшб[еэ]к/i],
  ["cash", /\batm\b|bankomat|na[gğ]dla[sş]d[iı]rma|cash ?(out|withdraw)|снятие/i],
  ["transfer", /\bc2c\b|\bp2p\b|card ?to ?card|karta m.?daxil|k[oö][cç][uü]rm[eə]|\btransfer\b|перевод|^(to|from)\s|top ?up|wallet|pul k[oö][cç]/i],
];
const kindOf = (text) => { const k = KIND_RULES.find(([, re]) => re.test(text)); return k ? k[0] : "payment"; };

function abbRow(m, desc) {
  const cr = stMoney(m[3]), dr = stMoney(m[4]), bal = stMoney(m[5]);
  const f = desc.split("~").map((x) => x.trim());
  const real = f[1] && /^\d{8}$/.test(f[1]) ? stDate(f[1]) : null;
  const cents = cr > 0 ? cr : dr > 0 ? dr : 0;
  const described = stMoney(f[3]), cur = f[2] && /^[A-Z]{3}$/.test(f[2]) ? f[2] : "";
  const merchant = clean(f[0]).slice(0, 80);
  return { date: real ? real.date : m[1], posted: m[1], time: "", type: cr > 0 ? "income" : "expense", cents, desc: merchant, merchant, balance: bal,
    ref: f[7] && /^[A-Z0-9]{6,}$/i.test(f[7]) ? f[7] : "", mcc: f[6] && /^\d{4}$/.test(f[6]) ? f[6] : "", cur: "AZN",
    orig: cur && described !== null && (cur !== "AZN" || Math.abs(described) !== cents) ? `${(Math.abs(described) / 100).toFixed(2)} ${cur}` : "",
    city: clean(f[4] || ""), pending: false, kind: kindOf(merchant) };
}
function uniRow(m, extra) {
  const d = stDate(m[1]), posted = stDate(m[3]);
  const cin = m[4] === "-" ? 0 : stMoney(m[4]), cout = m[5] === "-" ? 0 : stMoney(m[5]);
  const desc = clean([m[6] || "", extra].join(" "));
  const cut = desc.lastIndexOf(" / "), merchant = clean(cut > 0 ? desc.slice(0, cut) : desc).slice(0, 80), tail = cut > 0 ? clean(desc.slice(cut + 3)) : "";
  const cents = cin > 0 ? cin : cout > 0 ? cout : 0, cur = curOf(cin > 0 ? m[4] : m[5]) || "AZN", tcur = curOf(tail), tamt = stMoney(tail);
  return { date: d ? d.date : "", posted: posted ? posted.date : "", time: (d && d.time) || pad(+m[2].split(":")[0]) + ":" + m[2].split(":")[1], type: cin > 0 ? "income" : "expense", cents, desc, merchant, balance: null,
    ref: "", mcc: "", cur, orig: tcur && tamt !== null && (tcur !== cur || Math.abs(tamt) !== cents) ? `${(Math.abs(tamt) / 100).toFixed(2)} ${tcur}` : "", city: "", pending: !posted, kind: kindOf(merchant) };
}

// Wrapped rows. A long description is printed on extra lines above and below the line that holds the date and the amounts.
// With positions (PDF): each extra line belongs to the nearest dated line on its page, if it is close (a header or footer is not).
// Without positions (pasted text): an extra line completes the row before it when that row's text is not complete yet, else it starts the next row.
function attach(lines, isAnchor, complete, isFragment) {
  const anchors = []; lines.forEach((l, i) => { const m = isAnchor(l); if (m) anchors.push({ i, l, m, before: [], after: [] }); });
  if (!anchors.length) return anchors;
  const positioned = lines.every((l) => l.grid || typeof l.y === "number") && !lines.some((l) => l.grid);
  let ai = 0;
  lines.forEach((l, i) => {
    if (l.grid || isAnchor(l)) return;
    if (positioned) {
      let best = null, bd = 13;
      for (const a of anchors) { if (a.l.page !== l.page) continue; const d = Math.abs(a.l.y - l.y); if (d < bd) { bd = d; best = a; } }
      if (best) { (l.y > best.l.y ? best.before : best.after).push(l); return; }
      // A row cut in two by a page break: its other half sits alone at the foot of one page or the head of the next. Only pieces that
      // look like part of a row are moved (never a page heading or footer), and only to the row at that edge.
      if (isFragment && isFragment(lineText(l))) {
        const mine = anchors.filter((a) => a.l.page === l.page);
        const above = mine.length ? l.y > Math.max(...mine.map((a) => a.l.y)) : true, below = mine.length ? l.y < Math.min(...mine.map((a) => a.l.y)) : false;
        if (above) { const prev = anchors.filter((a) => a.l.page < l.page).pop(); if (prev) { prev.after.push({ ...l, y: prev.l.y - 20 - prev.after.length }); } }
        else if (below) { const next = anchors.find((a) => a.l.page > l.page); if (next) { next.before.push({ ...l, y: next.l.y + 20 - next.before.length }); } }
      }
      return;
    }
    while (ai < anchors.length - 1 && anchors[ai + 1].i < i) ai++;
    const prev = anchors[ai].i < i ? anchors[ai] : null, next = anchors.find((a) => a.i > i) || null;
    if (prev && next) { const have = [...prev.before.map(lineText), lineText(prev.l), ...prev.after.map(lineText)].join(" "); (complete(have, prev) ? next.before : prev.after).push(l); }
    else if (next && next.i - i <= 2) next.before.push(l);
    else if (prev && i - prev.i <= 2 + prev.after.length) prev.after.push(l);
  });
  // With positions, ANY column can wrap (a wide amount is printed as "100.00" above the line and "AZN" below it, in its own column).
  // The pieces are put back column by column: a piece joins the cell of the dated line that starts at about the same place, or makes a
  // new cell there; the row is then read left to right as if it had been printed on one line.
  if (positioned) anchors.forEach((a) => {
    if (!Array.isArray(a.l.xs) || (!a.before.length && !a.after.length)) { a.text = lineText(a.l); return; }
    const cols = a.l.cells.map((s, k) => ({ x: a.l.xs[k], top: [], mid: s, bottom: [] }));
    const put = (l, where) => l.cells.forEach((s, k) => { if (!s) return; const x = Array.isArray(l.xs) ? l.xs[k] : 0; let c = null, bd = 31; for (const q of cols) { const d = Math.abs(q.x - x); if (d < bd) { bd = d; c = q; } } if (!c) { c = { x, top: [], mid: "", bottom: [] }; cols.push(c); } c[where].push(s); });
    a.before.slice().sort((p, q) => q.y - p.y).forEach((l) => put(l, "top")); a.after.slice().sort((p, q) => q.y - p.y).forEach((l) => put(l, "bottom"));
    a.text = cols.sort((p, q) => p.x - q.x).map((c) => [...c.top, c.mid, ...c.bottom].filter(Boolean).join(" ")).filter(Boolean).join(" ");
  });
  return anchors;
}

// ── Generic table: a date, some money columns and words, in any order the bank likes ─────────────────────────────────────────────────────────
const ROLE_WORDS = {
  credit: ["credit", "cr", "paid in", "money in", "deposit", "deposits", "income", "mədaxil", "medaxil", "daxilolma", "gəlir", "kredit", "приход", "зачисление", "кредит", "+"],
  debit: ["debit", "dr", "paid out", "money out", "withdrawal", "withdrawals", "expense", "məxaric", "mexaric", "silinmə", "xərc", "debet", "расход", "списание", "дебет", "-"],
  balance: ["balance", "balans", "qalıq", "qaliq", "остаток", "баланс"],
  amount: ["amount", "sum", "məbləğ", "mebleg", "сумма"],
};
const roleOf = (text) => { const t = clean(text).toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim(); if (!t) return ""; for (const r of ["balance", "credit", "debit", "amount"]) if (ROLE_WORDS[r].some((w) => t === w || (w.length > 2 && (" " + t + " ").includes(" " + w + " ")))) return r; return ""; };
const isMoneyCell = (c) => c === "-" || c === "–" || (c !== "" && stMoney(c) !== null && !stDate(c) && !/^\d{5,}$/.test(c.replace(/\s/g, "")) && /[.,]\d{1,2}(\D|$)|[A-Za-z₼$€]/.test(c));
function genericParse(lines) {
  const problems = [], recs = [];
  lines.forEach((l, i) => {
    const cells = l.cells; let di = cells.findIndex((c) => c && stDate(c)); if (di < 0 || di > 2) return;
    const d = stDate(cells[di]); let time = d.time, posted = "";
    const money = [], words = [];
    cells.forEach((c, k) => { if (k === di || !c && !l.grid) return; if (k > di && isMoneyCell(c)) money.push({ k, c }); else if (c && k !== di) { const d2 = stDate(c); if (d2 && k > di && !posted) posted = d2.date; else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(c) && !time) time = c.slice(0, 5).padStart(5, "0"); else words.push(c); } });
    if (!money.length && !l.grid) return;
    recs.push({ i, l, di, date: d.date, time, posted, money, desc: clean(words.join(" ")) });
  });
  if (!recs.length) return { rows: [], problems: ["none"] };
  // A grid keeps its columns: a money column is one where many rows hold a number; an empty cell in it means "nothing", not "missing".
  // (In a spreadsheet a whole number such as 600 is money too; in loose text only numbers with decimals or a currency are.)
  if (recs[0].l.grid) {
    const gridMoney = (c) => c !== "" && stMoney(c) !== null && !stDate(c) && c.replace(/\D/g, "").length < 9;
    const hits = {}; recs.forEach((r) => r.l.cells.forEach((c, k) => { if (k > r.di && gridMoney(c)) hits[k] = (hits[k] || 0) + 1; }));
    // With headings, the money columns are exactly the ones a heading names (a rarely used "money in" column still counts, a column of
    // codes does not). Without headings: columns where at least three rows in ten hold a number.
    const headRows = lines.slice(Math.max(0, recs[0].i - 6), recs[0].i), named = (k) => headRows.some((h) => roleOf(h.cells[k] || ""));
    const cand = Object.keys(hits).map(Number).sort((a, b) => a - b), withRole = cand.filter(named);
    const cols = withRole.length ? withRole : cand.filter((k) => hits[k] >= Math.max(1, recs.length * 0.3));
    recs.forEach((r) => { r.money = cols.map((k) => ({ k, c: gridMoney(r.l.cells[k] || "") || r.l.cells[k] === "-" ? r.l.cells[k] : "" })); r.desc = clean(r.l.cells.filter((c, k) => c && k !== r.di && !cols.includes(k) && !stDate(c) && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(c)).join(" ")); });
  }
  // The usual number of money columns; rows that differ (totals, notes) are left out and counted.
  const counts = {}; recs.forEach((r) => { counts[r.money.length] = (counts[r.money.length] || 0) + 1; });
  const n = +Object.keys(counts).sort((a, b) => counts[b] - counts[a] || b - a)[0];
  if (!n) return { rows: [], problems: ["none"] };
  const use = recs.filter((r) => r.money.length === n), left = recs.length - use.length;
  const val = (c) => (c === "-" || c === "–" || c === "" ? 0 : stMoney(c));
  // Roles from the heading above the first row: by column for a grid, by reading order for text.
  let roles = null;
  const first = use[0], head = lines.slice(Math.max(0, first.i - 6), first.i);
  if (first.l.grid) {
    for (let h = head.length - 1; h >= 0 && !roles; h--) { const r = first.money.map((m) => roleOf(head[h].cells[m.k] || "")); if (r.every(Boolean) && new Set(r).size === r.length) roles = r; }
  } else {
    const seq = []; head.forEach((h) => h.cells.forEach((c) => { const r = roleOf(c); if (r && !seq.includes(r)) seq.push(r); }));
    if (seq.length === n) roles = seq;
  }
  // No usable heading: work the roles out from the numbers. A running balance proves which column adds and which takes away.
  const chain = (get) => { let okN = 0, tot = 0; for (const dir of [1, -1]) { let o = 0, t2 = 0; for (let i = 0; i < use.length; i++) { const p = use[i + dir]; if (!p) continue; const a = get(use[i]), b = get(p); if (a.bal === null || b.bal === null) continue; t2++; if (b.bal + a.delta === a.bal) o++; } if (o > okN) { okN = o; tot = t2; } } return tot ? okN / tot : 0; };
  if (!roles && n === 3) {
    const cand = [["credit", "debit", "balance"], ["debit", "credit", "balance"]];
    const score = cand.map((r) => chain((x) => ({ bal: val(x.money[2].c), delta: val(x.money[r.indexOf("credit")].c) - val(x.money[r.indexOf("debit")].c) })));
    if (Math.max(...score) >= 0.8) roles = cand[score[0] >= score[1] ? 0 : 1];
  }
  // Two money columns without a heading: an amount and a running balance, if each balance differs from its neighbour by exactly the amount.
  // Whether a row is money in or out is then read from the balance itself (it went up or down).
  let byBalance = 0;
  if (!roles && n === 2) {
    const fit = (dir) => { let o = 0, t2 = 0; for (let i = 0; i < use.length; i++) { const p = use[i + dir]; if (!p) continue; t2++; if (Math.abs(val(use[i].money[1].c) - val(p.money[1].c)) === Math.abs(val(use[i].money[0].c))) o++; } return t2 ? o / t2 : 0; };
    const f = [fit(1), fit(-1)];
    if (use.length >= 3 && Math.max(...f) >= 0.8) { roles = ["amount", "balance"]; byBalance = f[0] >= f[1] ? 1 : -1; }
  }
  if (!roles && n === 1) roles = ["amount"];
  if (!roles) return { rows: [], problems: ["columns"], moneyColumns: n };
  const anyNeg = roles.includes("amount") && use.some((x) => val(x.money[roles.indexOf("amount")].c) < 0);
  if (roles.includes("amount") && !anyNeg && !byBalance && !roles.includes("credit") && !roles.includes("debit")) problems.push("sign");
  const rows = [];
  use.forEach((r, idx) => {
    const g = (role) => { const k = roles.indexOf(role); return k < 0 ? null : val(r.money[k].c); };
    const cr = g("credit"), dr = g("debit"), am = g("amount"), bal = roles.includes("balance") ? g("balance") : null;
    let type = "expense", cents = 0;
    if (cr) { type = "income"; cents = Math.abs(cr); } else if (dr) { cents = Math.abs(dr); }
    else if (am && byBalance) { const p = use[idx + byBalance]; cents = Math.abs(am); if (p) type = bal - val(p.money[roles.indexOf("balance")].c) > 0 ? "income" : "expense"; else { type = am < 0 ? "expense" : "expense"; problems.push("first"); } }
    else if (am) { cents = Math.abs(am); type = am > 0 && anyNeg ? "income" : "expense"; }
    if (!cents) return;
    const cur = curOf(r.money.map((m) => m.c).join(" ")) || "";
    const merchant = r.desc.slice(0, 80);
    rows.push({ date: r.date, posted: r.posted, time: r.time, type, cents, desc: r.desc, merchant, balance: bal, ref: "", mcc: "", cur, orig: "", city: "", pending: false, kind: kindOf(merchant) });
  });
  if (left) problems.push("left:" + left);
  return { rows, problems };
}

// ── The one entry point ──────────────────────────────────────────────────────
export function readStatement(lines) {
  const L = (Array.isArray(lines) ? lines : []).filter((l) => l && Array.isArray(l.cells));
  const texts = L.map(lineText);
  const uniN = texts.filter((t) => UNI_START.test(t)).length, abbN = texts.filter((t) => ABB_ROW.test(t)).length, abbMark = texts.some((t) => ABB_MARK.test(t));
  let bank = "generic", rows = [], problems = [];
  if (uniN >= 1 && uniN >= abbN) {
    bank = "unibank";
    const done = (text) => /\/\s*[\d.,]+\s*[A-Z]{3}$/.test(text);
    attach(L, (l) => lineText(l).match(UNI_START), done).forEach((a) => {
      let m, tail = "";
      if (a.text !== undefined) m = a.text.match(UNI_ROW);   // positions known: the row was put back together column by column
      else { m = lineText(a.l).match(UNI_ROW); if (m) { m = m.slice(); m[6] = clean([a.before.map(lineText).join(" "), m[6] || ""].join(" ")); tail = a.after.map(lineText).join(" "); } }
      const r = m ? uniRow(m, tail) : null; if (r && r.date && r.cents) rows.push(r); else problems.push(r && r.date ? "zero" : "row");   // a 0.00 line (a card check) moves no money
    });
  } else if (abbN >= 1 && abbMark) {
    bank = "abb";
    const done = (text) => (text.match(/~/g) || []).length >= 9;
    attach(L, (l) => lineText(l).match(ABB_ROW), done, (text) => /~.*~/.test(text) && !stDate(text.split(/\s/)[0])).forEach((a) => {
      let m = a.m, desc;
      if (a.text !== undefined) { m = a.text.match(ABB_ROW) || a.m; desc = m[2] || ""; }
      else desc = [...a.before.map(lineText), a.m[2] || "", ...a.after.map(lineText)].filter(Boolean).join(" ");
      // the card mask is split across the wrap ("4127.." + "2416~..."): the two pieces are one field
      const r = abbRow(m, desc.replace(/\.\.\s+(?=\d{4}~)/, "..")); if (r.cents) rows.push(r); else problems.push("row");
    });
  } else {
    const g = genericParse(L); rows = g.rows; problems = g.problems;
  }
  // Two rows that are one move: money in and the same money out within five minutes (a wallet top-up passing through the card).
  const mins = (r) => (r.time ? +r.time.slice(0, 2) * 60 + +r.time.slice(3) : null);
  rows.forEach((r, i) => { if (r.pair || r.type !== "income" || mins(r) === null) return; const j = rows.findIndex((o, k) => k !== i && !o.pair && o.type === "expense" && o.date === r.date && o.cents === r.cents && mins(o) !== null && Math.abs(mins(o) - mins(r)) <= 5); if (j >= 0) { r.pair = rows[j].pair = true; } });
  const count = (k) => problems.filter((p) => p === k).length;
  const notes = problems.filter((p) => p !== "row" && p !== "zero").concat(count("row") ? ["rows:" + count("row")] : [], count("zero") ? ["zero:" + count("zero")] : []);
  return { bank, rows, problems: notes, check: statementCheck(rows) };
}

// ── Run 67: CSV files from banks, and "match the columns" when a table cannot be worked out ─────────────────────────────────────────
// A CSV text -> a grid (rows of cells). The separator is the one (; tab ,) that splits the first line most; quotes are honoured ("a;b" is one cell,
// "" inside quotes is one quote). Pure.
export function gridFromCsv(text) {
  const s = String(text || "").replace(/^﻿/, ""), first = s.split(/\r?\n/, 1)[0] || "";
  const sep = [";", "\t", ","].map((c) => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"' && cell === "") { q = true; continue; }
    if (ch === sep) { row.push(cell); cell = ""; continue; }
    if (ch === "\n" || ch === "\r") { if (ch === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map(clean)).filter((r) => r.some(Boolean));
}
// A first guess for the columns of a grid: the column that holds dates most often, the money columns, and the longest-text column as the
// description. map = { header, date, desc, mode: "signed" | "out" | "inout", amount, debit, credit, balance } (column numbers; -1 = none).
export function guessMap(grid) {
  const g = Array.isArray(grid) ? grid : [], width = Math.max(0, ...g.map((r) => r.length));
  const dateHits = Array(width).fill(0), moneyHits = Array(width).fill(0), textLen = Array(width).fill(0);
  let firstData = -1;
  g.forEach((r, i) => r.forEach((c, k) => { if (stDate(c)) { dateHits[k]++; if (firstData < 0) firstData = i; } else if (c && stMoney(c) !== null && c.replace(/\D/g, "").length < 12) moneyHits[k]++; else if (c) textLen[k] += c.length; }));
  const best = (arr, skip = []) => { let b = -1; arr.forEach((v, k) => { if (!skip.includes(k) && v > 0 && (b < 0 || v > arr[b])) b = k; }); return b; };
  const date = best(dateHits), desc = best(textLen, [date]);
  const money = moneyHits.map((v, k) => [k, v]).filter(([k, v]) => k !== date && v >= Math.max(1, (g.length - Math.max(0, firstData)) * 0.3)).map(([k]) => k);
  const header = firstData > 0 ? firstData - 1 : -1;
  const named = (k) => header >= 0 ? roleOf(g[header][k] || "") : "";
  let debit = money.find((k) => named(k) === "debit") ?? -1, credit = money.find((k) => named(k) === "credit") ?? -1, balance = money.find((k) => named(k) === "balance") ?? -1;
  let amount = money.find((k) => named(k) === "amount") ?? (money.find((k) => k !== balance && k !== debit && k !== credit) ?? -1);
  const mode = debit >= 0 && credit >= 0 ? "inout" : "signed";
  return { header, date, desc, mode, amount, debit, credit, balance };
}
// Reads a grid with the columns the person chose. Rows above `header` (and the header row) are skipped; a row without a real date in the
// date column is skipped and counted. mode "signed": one amount column, a minus sign means money out; "out": one amount column, every row is
// money out; "inout": two columns, money out and money in. Returns the same shape as readStatement, so the same review sheet is used.
export function readMapped(grid, map) {
  const g = Array.isArray(grid) ? grid : [], m = map || {}, rows = [], problems = [];
  const cell = (r, k) => (k >= 0 && k < r.length ? r[k] : "");
  let skipped = 0;
  g.forEach((r, i) => {
    if (i <= (m.header ?? -1)) return;
    const d = stDate(cell(r, m.date)); if (!d) { if (r.some(Boolean)) skipped++; return; }
    let type = "expense", cents = 0;
    if (m.mode === "inout") { const o = stMoney(cell(r, m.debit)), n = stMoney(cell(r, m.credit)); if (o) cents = Math.abs(o); else if (n) { cents = Math.abs(n); type = "income"; } }
    else { const a = stMoney(cell(r, m.amount)); if (a) { cents = Math.abs(a); type = m.mode === "out" ? "expense" : a < 0 ? "expense" : "income"; } }
    if (!cents) { skipped++; return; }
    const descCols = Array.isArray(m.desc) ? m.desc : [m.desc];
    const desc = clean(descCols.map((k) => cell(r, k)).filter(Boolean).join(" "));
    const bal = m.balance >= 0 ? stMoney(cell(r, m.balance)) : null;
    const merchant = desc.slice(0, 80);
    rows.push({ date: d.date, posted: "", time: d.time, type, cents, desc, merchant, balance: bal, ref: "", mcc: "", cur: curOf(cell(r, m.mode === "inout" ? (type === "income" ? m.credit : m.debit) : m.amount)) || "", orig: "", city: "", pending: false, kind: kindOf(merchant) });
  });
  if (skipped) problems.push("rows:" + skipped);
  const mins = (r) => (r.time ? +r.time.slice(0, 2) * 60 + +r.time.slice(3) : null);
  rows.forEach((r, i) => { if (r.pair || r.type !== "income" || mins(r) === null) return; const j = rows.findIndex((o, k) => k !== i && !o.pair && o.type === "expense" && o.date === r.date && o.cents === r.cents && mins(o) !== null && Math.abs(mins(o) - mins(r)) <= 5); if (j >= 0) { r.pair = rows[j].pair = true; } });
  return { bank: "generic", rows, problems, check: statementCheck(rows) };
}

// The running balance, when the statement has one, proves every row: the balance before, plus money in, minus money out, is the balance after.
export function statementCheck(rows) {
  const withBal = rows.filter((r) => r.balance !== null && r.balance !== undefined);
  if (withBal.length < 2 || withBal.length !== rows.length) return { has: false, ok: null, breaks: 0, order: "" };
  const delta = (r) => (r.type === "income" ? r.cents : -r.cents);
  const run = (dir) => { let bad = 0; for (let i = 0; i < rows.length; i++) { const p = rows[i + dir]; if (p && p.balance + delta(rows[i]) !== rows[i].balance) bad++; } return bad; };
  const newest = run(1), oldest = run(-1), breaks = Math.min(newest, oldest);
  return { has: true, ok: breaks === 0, breaks, order: newest <= oldest ? "newest" : "oldest" };
}

// ── Rows -> the app's entries ────────────────────────────────────────────────
// The bank's merchant type code. Only codes whose meaning is certain; anything else falls through to the words.
const MCC = { 4111: ["transport", "Public transport card"], 4112: ["transport", "Intercity"], 4131: ["transport", "Bus"], 4121: ["transport", "Taxi / Ride-hailing"], 5411: ["food", "Groceries"], 5422: ["food", "Groceries"], 5441: ["food", "Snacks"], 5451: ["food", "Groceries"], 5462: ["food", "Bakery"], 5499: ["food", "Groceries"],
  5812: ["food", "Restaurants"], 5813: ["food", "Restaurants"], 5814: ["food", "Fast Food"], 5541: ["car", "Fuel"], 5542: ["car", "Fuel"], 5912: ["health", "Pharmacy"], 8011: ["health", "Doctor / Dentist"], 8021: ["health", "Doctor / Dentist"], 8062: ["health", "Doctor / Dentist"], 8099: ["health", "Doctor / Dentist"],
  4812: ["digital", "Mobile"], 4814: ["digital", "Mobile"], 4816: ["digital", "Internet"], 4899: ["digital", "TV"], 5734: ["digital", "Software"], 5815: ["digital", "Streaming"], 5816: ["entertain", "Games"], 5817: ["digital", "Software"], 5818: ["digital", "Software"], 4900: ["housing", "Utilities"],
  5651: ["shopping", "Clothing"], 5691: ["shopping", "Clothing"], 5699: ["shopping", "Clothing"], 5661: ["shopping", "Clothing"], 5732: ["shopping", "Electronics"], 5722: ["shopping", "Appliances"], 5712: ["shopping", "Furniture"], 5942: ["edu", "Books"], 8211: ["edu", "School / Kindergarten"], 8220: ["edu", "University"], 8299: ["edu", "Courses"],
  7832: ["entertain", "Cinema"], 7997: ["health", "Gym"], 7230: ["personal", "Barber / Hair"], 5977: ["personal", "Cosmetics"], 7011: ["travel", "Hotels"], 4511: ["travel", "Flights"], 6300: ["finance", "Insurance"], 9311: ["finance", "Taxes"] };
const WORD_RULES = [
  [/\bmetro\b/i, "transport", "Metro"], [/^bus\b|\bbakubus\b|\btp bus\b/i, "transport", "Bus"], [/bak[iı\*]\s*\*?\s*kart|bakikart/i, "transport", "Public transport card"], [/\b(bolt|uber|yango|taxi|taksi)\b/i, "transport", "Taxi / Ride-hailing"],
  [/\b(azercell|bakcell|nar)\b/i, "digital", "Mobile"], [/\b(citynet|aztelekom|baktelekom|azeronline)\b/i, "digital", "Internet"],
  [/\b(market|bazarstore|bravo|araz|oba)\b/i, "food", "Groceries"], [/\b(aptek|pharm)/i, "health", "Pharmacy"], [/ponchik|domino|mcdonald|kfc|burger|pizza|doner|d[oö]n[eə]r/i, "food", "Fast Food"], [/\b(cafe|kafe|coffee|kofe|restoran|restaurant)\b/i, "food", "Restaurants"],
  [/\b(neft|petrol|socar|azpetrol)/i, "car", "Fuel"],
];
// A short stable code for a row, so the same statement imported twice gives the same entry ids (and adds nothing the second time).
function hashKey(s) { let h1 = 0x811c9dc5, h2 = 0x1b873593; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0; h2 = Math.imul(h2 + c, 0x5bd1e995) >>> 0; h2 ^= h2 >>> 13; } return h1.toString(36) + (h2 >>> 0).toString(36); }
export function statementKey(bank, r) { return r.ref ? `${bank}|ref|${r.ref}` : [bank, r.date, r.time, r.type, r.cents, clean(r.desc).toLowerCase()].join("|"); }

// opts: account (id or ""), suggest(merchant, type) -> { category, subcategory } | null (the person's own history: always wins),
//       known: [[name, category, subcategory]...] (the app's built-in merchant list), notes: { foreign, pending } (words for the note).
export function statementEntries(bank, rows, opts = {}) {
  const seen = new Map(), out = [];
  (rows || []).forEach((r) => {
    if (!r || !r.cents || !r.date) return;
    const key = statementKey(bank, r), n = seen.get(key) || 0; seen.set(key, n + 1);
    let category = r.type === "income" ? "income" : "other", subcategory = "";
    const mine = typeof opts.suggest === "function" ? opts.suggest(r.merchant, r.type) : null;
    if (mine && mine.category) { category = mine.category; subcategory = mine.subcategory || ""; }
    else if (r.kind === "cashback" && r.type === "income") { category = "refund"; subcategory = "Cashback"; }
    // Run 58: three different things, kept apart. Cash taken out (ATM) is not spending yet: what is bought with it is recorded later, so counting
    // the withdrawal too would count the same money twice. A pair (out and back in within minutes, same amount) is money moved between the
    // person's own accounts. Other transfers are money sent to someone else. The import sheet offers the first two separately, off by default.
    else if (r.pair) { if (r.type === "expense") { category = "finance"; subcategory = "Transfers"; } }
    else if (r.kind === "cash") { if (r.type === "expense") { category = "finance"; subcategory = "Cash withdrawal"; } }
    else if (r.kind === "transfer") { if (r.type === "expense") { category = "finance"; subcategory = "Money sent to people"; } }
    else if (r.type === "expense") {
      const m = r.mcc && MCC[+r.mcc], w = !m && WORD_RULES.find(([re]) => re.test(r.merchant));
      const k = !m && !w && Array.isArray(opts.known) ? opts.known.find(([name]) => name.length > 2 && new RegExp("(^|[^\\p{L}\\p{N}])" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^\\p{L}\\p{N}])", "iu").test(r.merchant)) : null;
      if (m) { category = m[0]; subcategory = /\bmetro\b/i.test(r.merchant) && m[0] === "transport" ? "Metro" : m[1]; } else if (w) { category = w[1]; subcategory = w[2]; } else if (k) { category = k[1]; subcategory = k[2] || ""; }
    }
    const note = [r.orig, r.city && r.city.toUpperCase() !== "BAKU" ? r.city : ""].filter(Boolean).join(", ").slice(0, 80);
    out.push({ id: "s" + hashKey(key) + (n ? "_" + n : ""), type: r.type, amount: r.cents / 100, category, subcategory, merchant: r.merchant, note, date: r.date, recurring: false, recurFreq: null, isActive: true,
      ...(opts.account ? { account: opts.account } : {}), _st: { kind: r.pair ? "own" : r.kind, pending: !!r.pending } });
  });
  return out;
}

// ── Excel (.xlsx) without a library ──────────────────────────────────────────
// An .xlsx file is a zip. Only two small parts are read: the shared texts and the first sheet. Pictures and other parts are never opened,
// so a file whose embedded image is damaged (seen in a real bank file) still reads. Needs the browser's own unzip (DecompressionStream).
async function inflateRaw(bytes) {
  const ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter(); w.write(bytes); w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
export async function zipEntries(buf, want) {
  const u = new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength), out = {};
  let e = -1; for (let i = u.length - 22; i >= Math.max(0, u.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("zip");
  const count = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
  for (let n = 0; n < count && p + 46 <= u.length; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commLen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nameLen));
    if (want(name)) {
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true), data = u.subarray(start, start + csize);
      out[name] = new TextDecoder().decode(method === 0 ? data : await inflateRaw(data));
    }
    p += 46 + nameLen + extraLen + commLen;
  }
  return out;
}
const xmlText = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
const colIndex = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
// A real Excel date is a day count; turn it into yyyy-mm-dd only when the cell's value looks like one and the column holds dates.
const excelDay = (v) => { const n = Number(v); if (!Number.isFinite(n) || n < 20000 || n > 80000) return null; const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
export function sheetGrid(sheetXml, sharedXml) {
  const shared = []; (sharedXml || "").replace(/<si\b[^>]*>([\s\S]*?)<\/si>/g, (m, body) => { shared.push(xmlText((body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) || []).map((t) => t.replace(/<[^>]+>/g, "")).join(""))); return ""; });
  const grid = [];
  (sheetXml || "").replace(/<row\b[^>]*>([\s\S]*?)<\/row>/g, (m, body) => {
    const row = [];
    body.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (mm, attrs, inner) => {
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1], type = (attrs.match(/\bt="(\w+)"/) || [])[1] || "n"; if (!ref) return "";
      const v = inner ? (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] : undefined, is = inner ? (inner.match(/<is>[\s\S]*?<\/is>/) || [])[0] : "";
      let text = "";
      if (type === "s") text = shared[+v] || ""; else if (type === "inlineStr") text = xmlText((is.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) || []).map((t) => t.replace(/<[^>]+>/g, "")).join("")); else if (v !== undefined) text = xmlText(v);
      const k = colIndex(ref); while (row.length < k) row.push(""); row[k] = text; return "";
    });
    grid.push(row); return "";
  });
  // Columns whose values are mostly Excel day numbers next to money columns are dates: convert those cells.
  const width = Math.max(0, ...grid.map((r) => r.length));
  // A column is a date column when its heading says so, when other cells in it are written dates, or when most of it is day numbers.
  for (let c = 0; c < width; c++) {
    const vals = grid.map((r) => r[c]).filter((v) => v !== undefined && v !== ""), isDay = (v) => /^\d{5}(\.\d+)?$/.test(v) && excelDay(v), days = vals.filter(isDay);
    if (!days.length) continue;
    const dated = vals.some((v) => stDate(v)) || vals.some((v) => /^(date|tarix|дата)\b|\bdate$|tarixi$/i.test(v.trim())) || (days.length >= 2 && days.length >= vals.length * 0.6);
    if (dated) grid.forEach((r) => { if (r[c] && isDay(r[c])) r[c] = excelDay(r[c]); });
  }
  return grid;
}
export async function xlsxGrid(buf) {
  const parts = await zipEntries(buf, (n) => /^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(n));
  const sheet = Object.keys(parts).filter((n) => /sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/sheet(\d+)/)[1]) - parseInt(b.match(/sheet(\d+)/)[1]))[0];
  if (!sheet) throw new Error("sheet");
  return sheetGrid(parts[sheet], parts["xl/sharedStrings.xml"] || "");
}
