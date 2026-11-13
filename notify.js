// Run 68 (plan: 'a "paste a notification text" box can be built first and tested without the APK'): reads the text of bank notifications that the
// person copied or pasted, and turns it into statement ROWS (the same shape statement.js gives), so the same review sheet, the same "already
// here" check and the same Undo are used. Pure module: no storage, no network. Layouts learned from real samples (ABB push and in-app list,
// Google Wallet, Birbank card-to-card, Leobank); only the LAYOUT is recorded here, tests use made-up texts.
// Never kept: card digits, the bank's balance (used only to tell money in from money out, then dropped), limits.
import { stMoney } from "./statement.js";

const MONEY = /([+\-−–]?)\s*(?:(₼|AZN|USD|EUR|\$|€)\s*)?(\d[\d\s,.]*\d|\d)(?:\s*(₼|AZN|USD|EUR|\$|€))?/;
const CURTAG = /₼|AZN|USD|EUR|\$|€/;
const BALANCE = /\b(balance|balans|qalıq|qaliq|остаток|баланс)\b/i;
const LIMIT = /\b(limit|limiti|лимит)\b/i;
const CARD = /(\*{2,}|\.{2})\s?\d{4}\b|\bPAN\b|\bcard\s*:|\bkart\s*:|карта\s*:/i;
const IN_WORDS = /\b(transfer from|from|received|credit|daxil olub|mədaxil|medaxil|köçürmə alındı|зачисление|поступление|пополнение|refund|geri qaytarma|возврат)\b/i;
const OUT_WORDS = /\b(payment|purchase|ödəniş|odenis|alış|alis|оплата|покупка|списание|transfer to|withdrawal|nağdlaşdırma|снятие)\b/i;
const TITLE_ONLY = /^(payment|purchase|card to card|ödəniş|оплата|покупка|amount|məbləğ|сумма)\s*:?\s*$/i;
const clean = (s) => String(s || "").replace(/[​-‍️]/g, "").replace(/[☀-➿\u{1f300}-\u{1faff}]/gu, "").replace(/\s+/g, " ").trim();
const cur = (s) => { const m = String(s).match(CURTAG); return !m ? "" : m[0] === "₼" ? "AZN" : m[0] === "$" ? "USD" : m[0] === "€" ? "EUR" : m[0]; };
const pad = (n) => String(n).padStart(2, "0");

// One money amount from a line: { cents (signed if a sign was written), signed, cur } or null. A number counts only with a currency next to it.
function moneyIn(line) {
  const m = line.match(MONEY); if (!m || (!m[2] && !m[4])) return null;
  const c = stMoney(m[3]); if (c === null || c === 0) return null;
  const sign = m[1] && /[\-−–]/.test(m[1]) ? -1 : m[1] === "+" ? 1 : 0;
  return { cents: Math.abs(c), sign, cur: cur((m[2] || "") + (m[4] || "")) };
}

// One notification (a few lines) -> a row, or null when it holds no amount. now = when it arrived (no date is written in them).
export function readNotification(text, now = new Date()) {
  const lines = String(text || "").split(/\r?\n/).map(clean).filter(Boolean);
  if (!lines.length) return null;
  let amount = null, balance = null, words = [], inHint = 0;
  for (const l of lines) {
    if (BALANCE.test(l)) { const b = moneyIn(l.replace(BALANCE, "")); if (b) balance = b.cents; continue; }
    if (LIMIT.test(l)) continue;
    if (IN_WORDS.test(l)) inHint = 1; else if (OUT_WORDS.test(l) && inHint === 0) inHint = -1;
    const mo = !amount ? moneyIn(l) : null;
    if (mo) { amount = mo; const rest = clean(l.replace(MONEY, "").replace(/\b(with|ilə|с)\b.*$/i, "").replace(/^(payment|purchase|amount|ödəniş|məbləğ|оплата|покупка|сумма)\s*:?/i, "").replace(/[:·•|]+/g, " ")); if (rest && !TITLE_ONLY.test(rest) && !CARD.test(rest)) words.push(rest); continue; }
    if (CARD.test(l) || TITLE_ONLY.test(l)) continue;
    const w = clean(l.replace(/^(transfer from|transfer to|from|to)\s*[:•·]?\s*/i, "").replace(/(\*{2,}|\.{2})\s?\d{4}\b/g, ""));
    if (w && !/^\d+$/.test(w)) words.push(w);
  }
  if (!amount) return null;
  const type = amount.sign < 0 ? "expense" : amount.sign > 0 ? "income" : inHint > 0 ? "income" : inHint < 0 ? "expense" : "";
  const merchant = clean(words[0] || "").slice(0, 80);
  const d = now instanceof Date ? now : new Date();
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, posted: "", time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, type, cents: amount.cents, desc: merchant, merchant,
    balance, ref: "", mcc: "", cur: amount.cur === "AZN" ? "" : amount.cur, orig: "", city: "", pending: false, kind: /card to card|kartdan karta|с карты на карту|transfer|köçürmə|перевод/i.test(lines.join(" ")) ? "transfer" : /atm|bankomat|nağdlaşdırma|снятие/i.test(lines.join(" ")) ? "cash" : "payment", _unsure: !type };
}

// Several pasted notifications, separated by empty lines (or each starting with a line that holds an amount). The same payment told twice
// (the bank's notification and the wallet's, within a few minutes) becomes one row. Rows without a written direction get it from the bank's
// balance going down or up between neighbouring notifications; any still unknown are marked as money out and flagged "sign" for the review.
export function readNotifications(text, now = new Date()) {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const rows = []; let skipped = 0;
  blocks.forEach((b) => { const r = readNotification(b, now); if (r) rows.push(r); else skipped++; });
  return settleRows(rows, skipped);
}
// Run 75: notices kept by the Android listener, each with the time it arrived ({ text, time }). Each is dated by its own time; the bank's
// and the wallet's notice about one payment become one entry only when they arrived within 5 minutes of each other.
export function readNoticeItems(items) {
  const rows = []; let skipped = 0;
  (Array.isArray(items) ? items : []).filter((x) => x && typeof x.text === "string" && Number.isFinite(Number(x.time))).sort((a, b) => a.time - b.time)
    .forEach((x) => { const r = readNotification(x.text, new Date(Number(x.time))); if (r) rows.push({ ...r, _t: Number(x.time) }); else skipped++; });
  return settleRows(rows, skipped);
}
function settleRows(rows, skipped) {
  // same payment twice: same amount, and one merchant starts with the other (e.g. "8 Noyabr" and "8 Noyabr Metro")
  const out = [];
  for (const r of rows) {
    const twin = out.find((o) => o.cents === r.cents && (o._t === undefined || r._t === undefined || Math.abs(o._t - r._t) <= 300000) && (o.type === r.type || !o.type || !r.type) && o.merchant && r.merchant && (o.merchant.toLowerCase().startsWith(r.merchant.toLowerCase()) || r.merchant.toLowerCase().startsWith(o.merchant.toLowerCase())));
    if (twin) { if (!twin.type) twin.type = r.type; if (twin.balance === null) twin.balance = r.balance; if (r.merchant.length > twin.merchant.length) { twin.merchant = r.merchant; twin.desc = r.merchant; } continue; }
    out.push({ ...r });
  }
  // direction from the balance chain (pasted newest first or oldest first: whichever order makes the balances add up)
  const fits = (dir) => { let ok = 0, n = 0; for (let i = 0; i < out.length; i++) { const p = out[i + dir]; if (!p || out[i].balance === null || p.balance === null) continue; n++; if (Math.abs(out[i].balance - p.balance) === out[i].cents) ok++; } return n ? ok / n : 0; };
  const dir = fits(1) >= fits(-1) ? 1 : -1;
  out.forEach((r, i) => { if (r.type) return; const p = out[i + dir]; if (p && r.balance !== null && p.balance !== null && Math.abs(r.balance - p.balance) === r.cents) r.type = r.balance < p.balance ? "expense" : "income"; });
  const problems = []; if (out.some((r) => !r.type)) problems.push("sign"); if (skipped) problems.push("rows:" + skipped);
  out.forEach((r) => { if (!r.type) r.type = "expense"; delete r._unsure; delete r._t; });
  return { bank: "notification", rows: out, problems };
}

// Run 75: a notice the reader could NOT understand, reduced to its bare layout so it can teach the app new bank formats (only with the
// opt-in "Help improve the app"). Every digit becomes "#" and every word that is not a common banking word becomes "[W]", so no name,
// place, card or amount can leave the phone: "Payment: -4.20 ₼ KAFE ARAZ **4321" -> "Payment: -#.## ₼ [W] [W] **####".
const KEEP = new Set(("payment purchase paid debit credit card balance available amount refund transfer withdrawal deposit cash income expense " +
  "with from to on at in for of the your account approved declined successful ödəniş ödənildi alış balans kart hesab mədaxil məxaric köçürmə " +
  "mədaxil nağd uğurlu məbləğ qalıq оплата покупка списание зачисление баланс карта счёт счет доступно перевод возврат снятие пополнение сумма " +
  "успешно azn usd eur rub my").split(/\s+/));
export function maskNotice(text) {
  return String(text || "").replace(/\d/g, "#").split(/(\s+)/).map((w) => {
    if (/^\s+$/.test(w) || !/\p{L}/u.test(w)) return w;
    const core = w.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    return KEEP.has(core) ? w : w.replace(/\p{L}[\p{L}'’.-]*/gu, "[W]");
  }).join("").replace(/(\[W\]\s*){3,}/g, "[W] [W] ").trim().slice(0, 400);
}