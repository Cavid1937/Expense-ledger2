import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, Fragment, Component } from "react";
import { t, tn, tIn, setLang, locale, LANGS, LANG_NAMES, MESSAGES } from "./i18n.js";
import { readStatement, statementEntries, linesFromText, linesFromGrid, xlsxGrid } from "./statement.js";
import { CSS } from "./styles.js";
import { LockGate, LockSheet } from "./screens/lock.jsx";
import { HomePage } from "./screens/home.jsx";
import { LedgerPage, TxnDetailSheet, TxnRow } from "./screens/ledger.jsx";
import { AddEditOverlay, BillSheet } from "./screens/add.jsx";
import { RecurringHub } from "./screens/recurring.jsx";
import { ImportExportPage, ImportUnlock, InfoSheet, LanguageChooser, MorePage, MyAccounts } from "./screens/settings.jsx";
import { AccountSheet } from "./screens/home.jsx";
import { DebtsPage } from "./screens/debts.jsx";
import { GiftsPage } from "./screens/gifts.jsx";
import { SetupSheet } from "./screens/setup.jsx";
import { BudgetsGoalsPage } from "./screens/goals.jsx";
import { MonthlyView } from "./screens/analytics.jsx";
import { Collapse, motionOff, runBackStep } from "./screens/motion.jsx";
import { finishLaunch, startLaunch } from "./screens/launch.js";

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL FINANCIAL OS v9
// Storage key: expense_ledger_v5 — PERMANENT, never rename
// S0: Reliability — local dates, createdAt duplicate detection, migration
// S1: Goals — target date, estimated completion, what-if scenarios
// S2: Home — financial hierarchy (position → trajectory → explanation → future)
// S3: What Changed — merchant-level explanation per category
// S4: Safe to Spend — future unrecorded commitments separated
// S5: Financial patterns — deterministic, data-only
// S6: Merchant intelligence — profile in detail view
// ─────────────────────────────────────────────────────────────────────────────

export const KEY = "expense_ledger_v5";
const KEYS_LEGACY = [
  "finance_app_data","finance_editorial_v1","finance_editorial_v2",
  "finance_editorial_v3","finance_editorial_v4","finance_os_v3",
];

function writeRaw(k,v) { try { localStorage.setItem(k,JSON.stringify(v)); return true; } catch { return false; } }

// Run 33 (APK level): text shared INTO the app from another app (a bank message, a notification, a note) becomes a suggestion for the add form.
// Nothing is ever saved from here: the user sees the form filled in and must press Save. The wording of real bank messages in Azerbaijan has not been
// sampled yet (needs the owner's examples), so this only looks for the generic shapes below and says so when it is unsure. The message text itself is
// NOT stored (it can hold card digits and balances); only the amount, the kind, the date and a short merchant name are suggested.
const SHARE_CUR="(?:AZN|₼|man\\.?|manat|USD|EUR|RUB|₽|TRY|\\$|€)";
const SHARE_BAL=/balans|balance|qalıq|qaliq|остаток|баланс|limit|лимит|available|mövcud/i;
const SHARE_INC=/mədaxil|medaxil|daxil\s+old|maaş|maas|пополнени|зачислен|поступлен|credited|deposit|received|salary|refund|geri\s+qaytar|возврат/i;
const SHARE_EXP=/alış|alis|ödəniş|odenis|çıxarış|cixaris|покупк|оплат|списани|purchase|payment|debit|withdraw|spent|nağdlaşdır|nagdlasdir|atm|xərc|xerc/i;
export function shareAmount(numText) {
  let s=String(numText).replace(/[\s  ]/g,"");
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const dot=s.lastIndexOf("."), com=s.lastIndexOf(",");
  if (dot>=0 && com>=0) { const dec=Math.max(dot,com), th=dot>com?",":"."; s=s.slice(0,dec).split(th).join("").replace(/[.,]/g,"")+"."+s.slice(dec+1); }
  else if (dot>=0||com>=0) { const sep=dot>=0?".":",", parts=s.split(sep); if (parts.length>2 || (parts.length===2 && parts[1].length===3 && parts[0].length<=3)) s=parts.join(""); else s=parts.join("."); }
  const n=Number(s); return Number.isFinite(n) && n>0 && n<1e9 ? Math.round(n*100)/100 : null;
}
export function parseSharedText(text, now=new Date()) {
  const raw=String(text==null?"":text).slice(0,2000);
  const out={ amount:"", type:"expense", merchant:"", date:"", found:false, unsure:false };
  // amounts that carry a currency, before or after the number; amounts after a balance word are skipped
  const re=new RegExp(`(?:(${SHARE_CUR})\\s*(\\d[\\d\\s\\u00A0.,]*\\d|\\d))|(?:(\\d[\\d\\s\\u00A0.,]*\\d|\\d)\\s*(${SHARE_CUR}))`,"gi");
  const cands=[]; let m;
  while ((m=re.exec(raw))) { const num=m[2]||m[3]; const v=shareAmount(num); if (v===null) continue; const before=raw.slice(Math.max(0,m.index-18),m.index); if (SHARE_BAL.test(before)) continue; cands.push(v); }
  if (cands.length) { out.amount=String(cands[0]); out.found=true; if (new Set(cands).size>1) out.unsure=true; }
  const inc=SHARE_INC.test(raw), exp=SHARE_EXP.test(raw);
  if (inc && !exp) out.type="income";
  if (inc && exp) out.unsure=true;
  const dm=raw.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/);
  if (dm) { const y=dm[3].length===2?2000+Number(dm[3]):Number(dm[3]); const ds=`${y}-${String(dm[2]).padStart(2,"0")}-${String(dm[1]).padStart(2,"0")}`; if (isValidDateStr(ds) && ds<=localDateStr(now)) out.date=ds; }
  const mm=raw.match(/(?:merchant|mağaza|magaza|məkan|yer|место|магазин|terminal)\s*[:\-]\s*([^\n,;|]{2,40}?)(?=\.\s|\.$|[\n,;|]|$)/i) || raw.match(/\b(?:at|в)\s+([A-ZА-ЯƏÖÜŞÇĞİ][^\n,;|.\d]{1,38})/);
  if (mm) out.merchant=mm[1].replace(/\s+/g," ").trim().replace(/[\s.:-]+$/,"");
  return out;
}

// Run 32 (backlog item 17): how full the browser's per-app storage is. Browsers allow about 5 million characters of localStorage per site (Chrome and Firefox;
// Safari is similar); there is no exact way to ask, so this is an estimate: every key and value of this site counted in characters. Measured with synthetic data:
// one typical entry is ~240 characters, so ~20,000 entries already use ~4.8 million. Warn at 80%, "almost full" at 95%.
export const STORAGE_LIMIT_CHARS=5000000;
export function storageUsage(store=(typeof localStorage!=="undefined"?localStorage:null), limit=STORAGE_LIMIT_CHARS) {
  try {
    if (!store) return null;
    let chars=0;
    for (let i=0;i<store.length;i++) { const k=store.key(i); if (k===null) continue; chars+=k.length+String(store.getItem(k)??"").length; }
    const pct=Math.min(100,Math.round(chars/limit*100));
    return { chars, limit, pct, level:pct>=95?"full":pct>=80?"warn":"ok" };
  } catch { return null; }
}

// Set when stored data needed recovery on load; the App shows it once.
let LOAD_NOTICE = null;
// True when a recovery copy could not be written: saving is then paused so the original data is never overwritten.
let SAVE_BLOCKED = false;
// True when saving is paused because stored data could not be READ (not because a copy failed): the banner then says so.
let SAVE_BLOCKED_READ = false;

// ─── Money grammar ────────────────────────────────────────────────────────────
// Text typed by the user or read from a CSV cell: digits with an optional decimal point and at most 2 decimals,
// up to 9 integer digits. Accepted: "12" "12.5" "12.50" ".5" "0.05".
// Rejected: "" "12." "-5" "+5" "1e3" "0x10" "1,5" "1 000" "NaN" "Infinity" "25abc", and anything above MAX_AMOUNT.
// JSON numbers (stored data, older versions, backups, settings) must be whole cents too (Run 6, D13/D22): the number must be
// exactly the 2-decimal value it prints as. 12.345, 10.005 and 0.1+0.2 (= 0.30000000000000004) are refused, never rounded —
// rounding would silently change the figure. This is the rule imports already used (Phase 3), now applied everywhere.
const MAX_AMOUNT = 999999999.99;
const MONEY_TEXT_RE = /^(?:\d{1,9}|\d{0,9}\.\d{1,2})$/;
const isWholeCents = (n) => Number(n.toFixed(2))===n;

function strictNum(v) {
  if (typeof v==="number") return Number.isFinite(v) ? v : NaN;
  if (typeof v==="string") { const s=v.trim(); return MONEY_TEXT_RE.test(s) ? Number(s) : NaN; }
  return NaN;
}

// Why a money value is not acceptable (null when it is). {positive:true} → must be > 0, otherwise ≥ 0.
function moneyReason(v, { positive=false } = {}) {
  if (v===undefined || v===null || (typeof v==="string" && v.trim()==="")) return "missing amount";
  if (typeof v==="number") { if (!Number.isFinite(v)) return "invalid amount"; }
  else if (typeof v==="string") {
    const t=v.trim();
    if (t.startsWith("-") && MONEY_TEXT_RE.test(t.slice(1))) return "negative amount";
    if (!MONEY_TEXT_RE.test(t)) return "invalid amount";
  } else return "invalid amount";
  const n=strictNum(v);
  if (n<0) return "negative amount";
  if (!isWholeCents(n)) return "more than 2 decimal places";
  if (positive && n===0) return "zero amount";
  if (n>MAX_AMOUNT) return "amount too large";
  return null;
}

// Money typed by the user: a finite number > 0 ({positive:true}) or ≥ 0; anything else → null (never silently 0).
export function parseMoney(v, opts) { return moneyReason(v,opts)===null ? strictNum(v) : null; }
// Run 17: what a money box lets through while typing. Phones whose decimal key is a comma used to lose the mark (145,67 was saved as 14567 because the box was type=number).
// Either "." or "," is the decimal mark; when both appear the LAST one is, the other is a thousands mark and goes. Digits are never changed, at most 2 decimals.
export function cleanMoneyText(raw, opts) {
  // A sign or an exponent is never turned into a different valid number (-5 must not become 5): it stays visible and is refused when saving.
  if (/[-+eE]/.test(String(raw??""))) return String(raw).replace(/[\s\u00a0\u202f]/g,"").slice(0,24);
  const s=String(raw??"").replace(/[\s\u00a0\u202f]/g,"").replace(/[^0-9.,]/g,"");
  const dot=s.indexOf("."), com=s.indexOf(","), lastDot=s.lastIndexOf("."), lastCom=s.lastIndexOf(",");
  // Run 32: PASTED text ({paste:true}) like "1,234" or Azerbaijani "1.234" is 1234, not 1.23 (money has at most 2 decimals, so 3 digits after a lone mark are a thousands group).
  // Only when every mark is the same character and each group after the first is 3 digits; a leading 0 ("0,123") stays a decimal.
  // Typing keeps the older rule on purpose (a 3rd digit after the mark is ignored): a typed extra digit must not make the number jump 1000 times.
  if (opts && opts.paste && (dot<0||com<0) && /^[1-9]\d{0,2}([.,]\d{3})+$/.test(s)) return s.replace(/[.,]/g,"");
  let at;                                          // index of the character that is the decimal mark
  if (dot>=0 && com>=0) at=Math.max(lastDot,lastCom);
  else if (dot>=0) at=dot;                          // a repeated dot while typing (1.2.3): the first is the mark
  else if (com>=0) { if (lastCom!==com) return s.replace(/,/g,""); at=com; }   // 1,234,567 pasted: thousands marks
  else return s;
  const intPart=s.slice(0,at).replace(/[.,]/g,""), dec=s.slice(at+1).replace(/[.,]/g,"").slice(0,2);
  return (intPart===""?"0":intPart)+"."+dec;
}// A form value that ends in the decimal mark ("145.") means 145; parseMoney itself stays strict for imports.
// Run 26: an in-app question instead of the browser's own confirm box (same look as the rest, animated, translated). askConfirm(text) gives
// a promise of true/false; the <ConfirmHost/> in the app shell shows it. Without a host (never in the app) it falls back to window.confirm.
let confirmHost=null;
// Run 53: the version a person sees in Settings ("Version 53 (12 Nov 2026)"): the number of the work run and its day. Raise it with every
// run that changes the app. The build code next to it is made by the build tool and only tells two builds apart.
export const APP_RELEASE="57 (2026-11-12)";   // a year-first date: it cannot be mistaken for an amount (the privacy-mode test caught "12.11")
// Run 51: the same "Undo" bar for any screen, without passing it down through every page. offerUndo() gives false when the bar is not
// there (the screen then shows its plain message, as before).
let undoHost=null;
export function setUndoHost(fn) { undoHost=typeof fn==="function" ? fn : null; }
export function offerUndo(message, onUndo, ms=8000, kind="delete") { if (!undoHost) return false; undoHost(message,onUndo,ms,kind); return true; }
export function askConfirm(message) { return new Promise(res=>{ if (!confirmHost) { res(typeof window!=="undefined" && window.confirm ? window.confirm(message) : false); return; } confirmHost({ message, res }); }); }
// Run 26: one shared way to open an inline form without a jump: the view glides to it (smooth scroll) and the first box is focused
// with preventScroll (a plain autoFocus makes phones snap the page). Use as ref={revealFocus}; it only acts once per element.
export function revealFocus(el) {
  if (!el || el.dataset.shown) return; el.dataset.shown="1";
  requestAnimationFrame(()=>{ try { el.scrollIntoView({ behavior:"smooth", block:"center" }); const i=el.matches("input,select,textarea") ? el : el.querySelector("input,select,textarea"); if (i) i.focus({ preventScroll:true }); } catch {} });
}
export function formMoney(v, opts) { return parseMoney(typeof v==="string" ? v.trim().replace(/\.$/,"") : v, opts); }
// Run 42 (owner's wishlist: "the amount field should accept basic math: 45.00 - 20"): a tiny arithmetic parser (+, -, *, /, x, parentheses, unary minus).
// No eval and no Function: it reads the text itself. Numbers have at most 2 decimals (so "1,234" is refused, never read as 1.234), the result is rounded to
// 2 decimals and must be above 0 and within the largest amount; anything else gives null and the form says the amount is not valid.
export function evalAmountExpr(text) {
  const s=String(text??"").replace(/[\s\u00a0\u202f]/g,"").replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");
  if (!s || s.length>40 || !/^[0-9.,+\-*/()]+$/.test(s)) return null;
  let i=0, depth=0;
  const num=()=>{ const m=/^(\d+(?:[.,]\d{1,2})?|[.,]\d{1,2})/.exec(s.slice(i)); if (!m) return NaN; i+=m[0].length; return Number(m[0].replace(",",".")); };
  const factor=()=>{ if (s[i]==="(") { if (++depth>6) return NaN; i++; const v=expr(); if (s[i]!==")") return NaN; i++; depth--; return v; } if (s[i]==="-") { i++; return -factor(); } return num(); };
  const term=()=>{ let v=factor(); while (s[i]==="*"||s[i]==="/") { const o=s[i++], r=factor(); v=o==="*" ? v*r : (r===0 ? NaN : v/r); } return v; };
  const expr=()=>{ let v=term(); while (s[i]==="+"||s[i]==="-") { const o=s[i++], r=term(); v=o==="+" ? v+r : v-r; } return v; };
  const v=expr();
  if (i!==s.length || !Number.isFinite(v)) return null;
  const r=Math.round(v*100)/100;
  return r>0 && r<=MAX_AMOUNT ? r : null;
}

function isPlainObject(x) { return x!==null && typeof x==="object" && !Array.isArray(x); }
// Run 14: a clickable <div> that acts as a button must answer Enter and Space too. Only when the key was pressed ON the element
// itself, so a real button inside it keeps its own keys.
export const activateKey = (fn) => (e) => { if (e.target!==e.currentTarget) return; if (e.key==="Enter" || e.key===" ") { e.preventDefault(); fn(); } };
// A yes/no field: true/false, or the words "true"/"false" (any case, trimmed). Anything else → null (not guessed).
const flagValue = (v) => { if (typeof v==="boolean") return v; if (typeof v==="string") { const s=v.trim().toLowerCase(); if (s==="true") return true; if (s==="false") return false; } return null; };
const isTrue = (v) => flagValue(v)===true;
export const txt = (v) => typeof v==="string" ? v : (typeof v==="number" && Number.isFinite(v) ? String(v) : "");
export const lc = (v) => String(v).toLowerCase().replace(/\u0307/g,"");   // Run 32: Azerbaijani "İ" lower-cases to "i" + a combining dot; drop the dot so "İzmir" and "izmir" are the same name when comparing
export const norm = (v) => lc(txt(v).trim()).replace(/\s+/g," ");

// Keep a recoverable copy of anything we cannot use, so the next save never overwrites it.
function preserveRaw(label, raw) {
  try { localStorage.setItem(`${"expense_ledger_v5"}__${label}_${Date.now()}`, typeof raw==="string"?raw:JSON.stringify(raw)); return true; }
  catch { return false; }
}

export function isValidDateStr(s) {
  if (typeof s!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,m,d]=s.split("-").map(Number);
  const dt=new Date(y,m-1,d);
  return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d;
}

// ─── Transaction record contract ──────────────────────────────────────────────
// A record is stored only if it can be stored exactly as it means. Nothing is repaired or guessed:
// a missing/invalid date, a non-positive amount or an unsupported type is rejected with a reason (never abs()'d, never today).
const TXN_TYPES = { income:"income", inc:"income", incomes:"income", expense:"expense", exp:"expense", expenses:"expense" };
const RECUR_FREQS = new Set(["weekly","biweekly","monthly","yearly"]);
// A date, or a date with a valid time (Run 8): "2026-10-01", "2026-10-01T10:30", "…:15", "…:15.123", optionally "Z" or
// "+04:00"/"-0530", with T or a space. Anything else after the date ("Tgarbage", "T25:00") is refused — it used to be cut
// off and the record silently kept with the first ten characters. The stored date is the written calendar date.
const DATE_TEXT_RE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-](\d{2}):?(\d{2}))?)?$/;
function isValidDateText(s) {
  const m=DATE_TEXT_RE.exec(s); if (!m || !isValidDateStr(m[1])) return false;
  const [,,h,mi,se,oh,om]=m;
  if (h!==undefined && (Number(h)>23 || Number(mi)>59 || (se!==undefined && Number(se)>59))) return false;
  if (oh!==undefined && (Number(oh)>14 || Number(om)>59)) return false;
  return true;
}
function normType(v) { if (v===undefined||v===null||v==="") return "expense"; return TXN_TYPES[String(v).trim().toLowerCase()] || null; }

function checkRawTxn(t) {
  if (!isPlainObject(t)) return "not a transaction record";
  if (t.date===undefined || t.date===null || (typeof t.date==="string" && t.date.trim()==="")) return "missing date";
  if (typeof t.date!=="string") return "invalid date";
  const d=t.date.trim();
  if (!isValidDateText(d)) return "invalid date";
  const r=moneyReason(t.amount ?? t.amt, { positive:true });
  if (r) return r;
  if (normType(t.type)===null) return "unsupported type";
  // isActive: missing = active (as always). An explicit value must be a yes/no: null, 0, 1, "yes", {} … used to be read by
  // truthiness, which could silently re-activate a paused payment. recurring: missing or null = not recurring (null always
  // meant that and it is also the default); any other non-yes/no value is refused.
  // Run 8: null is accepted as paused — the meaning older versions always gave it (!!null) — so such records stay visible.
  if (t.isActive!==undefined && t.isActive!==null && flagValue(t.isActive)===null) return "invalid active flag";
  if (t.recurring!==undefined && t.recurring!==null && flagValue(t.recurring)===null) return "invalid recurrence flag";
  if (isTrue(t.recurring) && !RECUR_FREQS.has(t.recurFreq||t.frequency)) return "invalid recurrence";
  return null;
}
function isUsableRawTxn(t) { return checkRawTxn(t)===null; }

// Several load/import events can each add a line; they are joined, never overwritten.
function noteLoad(msg) { LOAD_NOTICE = LOAD_NOTICE ? `${LOAD_NOTICE} · ${msg}` : msg; }

function summariseReasons(items) {
  const c={}; items.forEach(b=>{ c[b.reason]=(c[b.reason]||0)+1; });
  // Reasons are stable English codes (checkRawTxn); only their display is translated.
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([r,n])=>MESSAGES["reason."+r] ? t("reason."+r,{n}) : `${n} ${r}`).join(", ");
}

function setAside(label, records, detail="") {
  if (!records.length) return;
  const kept=preserveRaw(label, records);
  const why=detail ? ` (${detail})` : "";
  if (kept) noteLoad(tn("load.setAside",records.length,{why}));
  else { SAVE_BLOCKED=true; noteLoad(tn("load.setAsideBlocked",records.length,{why})); }
}

// Two records with the same id would be edited or deleted together: keep the first, give later ones a fresh id.
function ensureUniqueIds(list) {
  const seen=new Set(); let rekeyed=0;
  const out=list.map(t=>{
    if (!seen.has(String(t.id))) { seen.add(String(t.id)); return t; }
    let id; do { id=Date.now()+Math.random(); } while (seen.has(String(id)));
    seen.add(String(id)); rekeyed++; return { ...t, id };
  });
  return { list:out, rekeyed };
}

function partitionTransactions(list, opts={}) {
  const good=[], bad=[];
  list.forEach(t=>{
    const reason=checkRawTxn(t);
    if (reason) { bad.push({ record:t, reason }); return; }
    good.push(normaliseTxn(t,opts));
  });
  const u=ensureUniqueIds(good);
  return { good:u.list, bad, rekeyed:u.rekeyed };
}

function sanitizeTransactions(list, label) {
  const { good, bad, rekeyed }=partitionTransactions(list,{ keepCategoryId:true });   // the app's own saved data: keep category ids a later version added
  setAside(label, bad.map(b=>b.record), summariseReasons(bad));
  if (rekeyed) noteLoad(tn("load.rekeyed",rekeyed));
  return good;
}

// ─── Local date helpers (S0: all UTC bugs eliminated) ────────────────────────
export function localDateStr(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function localMonthStr(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
// Parse a YYYY-MM-DD string as LOCAL calendar date (avoids UTC midnight shift)
export function parseLocalDate(s) {
  if (!s) return new Date();
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}
// Add whole months without overflowing: Jan 31 + 1 month = Feb 28/29 (never Mar 3).
function addMonths(d, n) {
  const r=new Date(d.getFullYear(), d.getMonth()+n, 1);
  const dim=new Date(r.getFullYear(), r.getMonth()+1, 0).getDate();
  r.setDate(Math.min(d.getDate(), dim));
  return r;
}
export const today   = () => localDateStr();
export const curMon  = () => localMonthStr();
export const prevMon = () => { const n=new Date(); const d=new Date(n.getFullYear(),n.getMonth()-1,1); return localMonthStr(d); };
export const nMon    = (n) => { const now=new Date(); const d=new Date(now.getFullYear(),now.getMonth()-n,1); return localMonthStr(d); };

// ─── Category system ──────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id:"food",     name:"Food & Dining",        tile:"Food",      color:"#F0C46F", income:false,
    subs:["Restaurants","Fast Food","Coffee","Groceries","Delivery","Snacks","Bakery","Market / Bazaar","Other"] },
  { id:"transport",name:"Transport",             tile:"Transport", color:"#83B9F5", income:false,
    subs:["Metro","Bus","Taxi / Ride-hailing","Fuel","Parking","Car Maintenance","Intercity","Public transport card","Other"] },
  { id:"shopping", name:"Shopping",              tile:"Shopping",  color:"#B3A1FF", income:false,
    subs:["Clothing","Electronics","Personal Items","Home","Accessories","Online Shopping","Furniture","Appliances","Other"] },
  { id:"gifts",    name:"Gifts & Personal",      tile:"Gifts",     color:"#C9A27E", income:false,
    subs:["Gifts","Donations","Personal Care","Barber / Hair","Cosmetics","Other"] },
  { id:"entertain",name:"Entertainment",         tile:"Entertainment",   color:"#E7A3D6", income:false,
    subs:["Cinema","Games","Events","Sports","Hobbies","Music","Other"] },
  { id:"digital",  name:"Bills & Subscriptions", tile:"Bills & subs",     color:"#9FB4C7", income:false,
    subs:["Mobile","Internet","Streaming","Software","Cloud Storage","Other Subs","Other"] },
  { id:"health",   name:"Health & Fitness",      tile:"Health",    color:"#F2A66E", income:false,
    subs:["Gym","Sports Equipment","Pharmacy","Doctor / Dentist","Supplements","Eye care","Tests / Lab","Other"] },
  { id:"edu",      name:"Education",             tile:"Education", color:"#C9B8FF", income:false,
    subs:["University","Books","Courses","Exams","Stationery","Tutoring","School / Kindergarten","Other"] },
  { id:"travel",   name:"Travel",                tile:"Travel",    color:"#D8CB7E", income:false,
    subs:["Flights","Hotels","Visa","Travel Food","Travel Transport","Activities","Other"] },
  { id:"housing",  name:"Home",                  tile:"Home",      color:"#4CC9C4", income:false,
    subs:["Rent","Utilities","Household","Repairs","Gas","Electricity","Water","Building fees","Other"] },
  { id:"finance",  name:"Finance",               tile:"Finance",   color:"#85D9D0", income:false,
    subs:["Bank Fees","Transfers","Taxes","Insurance","Investments","Loan payment","Interest","Other"] },
  // Run 35: more everyday life. New ids only; every older id, name and subcategory is unchanged, so no stored entry moves.
  { id:"family",   name:"Family & Children",     tile:"Family",    color:"#F2A3B3", income:false,
    subs:["Childcare","Children's needs","Family support","School items","Toys & games","Other"] },
  // Run 38 (owner: "people who have a car, why was it not thought of?"): everything a car costs in one place. Transport keeps its own subcategories
  // (Fuel, Parking, Car Maintenance) so entries already recorded there do not change.
  { id:"car",      name:"Car",                   tile:"Car",       color:"#7FA7C9", income:false,
    subs:["Fuel","Car insurance","Car Maintenance","Tyres & parts","Parking","Fines","Car wash","Car tax & inspection","Other"] },
  { id:"pets",     name:"Pets",                  tile:"Pets",      color:"#D7B98E", income:false,
    subs:["Pet food","Vet","Pet supplies","Pet grooming","Other"] },
  { id:"work",     name:"Work & Business",       tile:"Work",      color:"#8FA8D8", income:false,
    subs:["Tools & supplies","Business travel","Business services","Professional fees","Other"] },
  { id:"other",    name:"Other",                 tile:"Other",     color:"#A5B7B8", income:false,
    subs:["Miscellaneous","Pets","Children"] },
  // Income. "earned" is false for money that arrives but is not earnings (refunds, withdrawals from savings): it counts in account balances
  // but not in income totals, the same way loan money already works (see forSpending).
  { id:"salary",   name:"Salary",                tile:"Salary",    color:"#8BD97A", income:true, subs:["Wages","Bonus","Overtime","Commission"] },
  { id:"freelance",name:"Freelance",             tile:"Freelance", color:"#7CCB9A", income:true, subs:["Consulting","Gig work","Temporary work"] },
  { id:"business", name:"Business Income",       tile:"Business",  color:"#6FCF97", income:true, subs:["Business revenue","Business profit","Other business"] },
  { id:"stipend",  name:"Scholarship & Grants",  tile:"Scholarship", color:"#9BD6A6", income:true, subs:["Scholarship","Student stipend","Educational grant"] },
  { id:"pension",  name:"Pension",               tile:"Pension",   color:"#A5DC86", income:true, subs:["Retirement benefit"] },
  { id:"benefits", name:"Social Support",        tile:"Social support", color:"#86D4B5", income:true, subs:["Social benefit","Allowance","Unemployment support","Other assistance"] },
  { id:"familyin", name:"Family Support",        tile:"From family", color:"#B6E08A", income:true, subs:["From family","Regular contribution","Remittance"] },
  { id:"alimony",  name:"Child Support & Alimony", tile:"Support",  color:"#8ED9C4", income:true, subs:["Child support","Alimony"] },
  { id:"rental",   name:"Rental Income",         tile:"Rental",    color:"#79CDB0", income:true, subs:["Rent received","Other property income"] },
  { id:"investin", name:"Investment Income",     tile:"Investments", color:"#7FD6C2", income:true, subs:["Interest","Dividends","Investment return"] },
  { id:"sales",    name:"Sales & Side Work",     tile:"Sales",     color:"#A3D98F", income:true, subs:["Selling goods","Occasional work"] },
  { id:"giftin",   name:"Gifts Received",        tile:"Gifts",     color:"#C5E29A", income:true, subs:["Money gift"] },
  { id:"income",   name:"Other Income",          tile:"Other income",    color:"#9FDDA0", income:true, subs:["One-time income","Unexpected income"] },
  { id:"refund",   name:"Refunds & Reimbursements", tile:"Refunds", color:"#9DB8C9", income:true, earned:false, subs:["Refund","Reimbursement","Cashback"] },
  { id:"savout",   name:"From Savings",          tile:"From savings", color:"#A7BFC9", income:true, earned:false, subs:["Savings withdrawal","Investment withdrawal","Asset sale"] },
];
export const isEarnedCat = (id) => { const c=CATEGORIES.find(x=>x.id===id); return !c || c.earned!==false; };
export const CAT = (id) => CATEGORIES.find(c=>c.id===id) || CATEGORIES.find(c=>c.id==="other");
// Display names in the interface language. The English `name` above stays the stored/CSV identifier and is never translated.
export const catName = (id) => MESSAGES["cat."+CAT(id).id] ? t("cat."+CAT(id).id) : CAT(id).name;
export const catTile = (id) => MESSAGES["tile."+CAT(id).id] ? t("tile."+CAT(id).id) : CAT(id).tile;
// Built-in subcategory names are translated for display; anything the user typed is shown exactly as stored.
export const subName = (s) => (s && MESSAGES["sub."+s]) ? t("sub."+s) : s;

const CATEGORY_MAP = {
  "food":"food","transport":"transport","housing":"housing","digital":"digital",
  "edu":"edu","other":"other","salary":"salary","freelance":"freelance",
  "sport":"health","personal":"gifts","culture":"shopping",
  "food & dining":"food","groceries & dining":"food","groceries":"food","dining":"food",
  "food and dining":"food","restaurant":"food","restaurants":"food","coffee":"food",
  "cafe":"food","lunch":"food","snacks":"food","breakfast":"food","dinner":"food",
  "sport & fitness":"health","sports":"health","fitness":"health","gym":"health",
  "football":"entertain","health & sport":"health","exercise":"health","workout":"health",
  "personal care":"gifts","skincare":"gifts","health":"health","grooming":"gifts",
  "pharmacy":"health","personal & health":"gifts","beauty":"gifts","medical":"health",
  "doctor":"health","hygiene":"gifts","style & culture":"shopping","culture & style":"shopping",
  "fashion":"shopping","style":"shopping","clothing":"shopping","clothes":"shopping",
  "fragrance":"gifts","entertainment":"entertain","shopping":"shopping","games":"entertain",
  "gaming":"entertain","cinema":"entertain","movies":"entertain","transportation":"transport",
  "travel":"travel","bus":"transport","taxi":"transport","uber":"transport","fuel":"transport",
  "petrol":"transport","metro":"transport","benzin":"transport","rent":"housing","home":"housing",
  "utilities":"housing","bills":"digital","household":"housing","digital & subs":"digital",
  "digital and subs":"digital","subscriptions":"digital","subscription":"digital","subs":"digital",
  "streaming":"digital","software":"digital","apps":"digital","tech":"digital","mobile":"digital",
  "internet":"digital","education":"edu","books":"edu","courses":"edu","tuition":"edu",
  "university":"edu","school":"edu","salary & income":"salary","salary and income":"salary",
  "wage":"salary","wages":"salary","paycheck":"salary","pay":"salary",
  "side income":"freelance","commission":"freelance","consulting":"freelance","gig":"freelance",
  "groceries & cafes":"food","cafes":"food",
  // Run 35: aliases for the newer categories (exact words only, same rule as above)
  "car":"car","vehicle":"car","auto":"car","car wash":"car","car insurance":"car","fines":"car",   // Run 38 (fuel/petrol keep meaning Transport, as before)
  "kids":"family","children":"family","childcare":"family","baby":"family","family":"family","pet":"pets","pet food":"pets","vet":"pets",
  "scholarship":"stipend","scholarships":"stipend","stipend":"stipend","grant":"stipend","grants":"stipend",
  "pensions":"pension","retirement":"pension","benefit":"benefits","benefits":"benefits","social support":"benefits","social benefit":"benefits",
  "unemployment":"benefits","allowance":"familyin","child support":"alimony","aliment":"alimony","rental income":"rental","rent received":"rental",
  "dividends":"investin","dividend":"investin","business":"business","business income":"business","sales":"sales","side work":"sales",
  "gift received":"giftin","gifts received":"giftin","refund":"refund","refunds":"refund","reimbursement":"refund","cashback":"refund",
  "from savings":"savout","savings withdrawal":"savout",
};

// Exact matches only (Run 8): an id, a category's English name or an alias, compared after lower-casing, collapsing spaces
// and treating "and" as "&". Anything else is "other" — the import sheet counts those rows and says so. The old fallback
// matched any part of a word ("Payment" → Salary via "pay", "x" → whatever alias contained an x).
const catKey = (s) => String(s).toLowerCase().trim().replace(/\s+/g," ").replace(/ and /g," & ").replace(/\s*&\s*/g," & ");
const CATEGORY_LOOKUP = (() => {
  const m={}; Object.entries(CATEGORY_MAP).forEach(([k,v])=>{ m[catKey(k)]=v; });
  CATEGORIES.forEach(c=>{ m[catKey(c.name)]=c.id; m[c.id]=c.id; });
  return m;
})();
function resolveCategory(raw, keepUnknownId=false) {
  if (!raw) return "other";
  const known=CATEGORY_LOOKUP[catKey(raw)];
  if (known) return known;
  // Run 17: in the app's OWN saved data (never in imports) an id this version does not know is kept as it is, so an older copy of the app
  // never rewrites a later version's category to "Other". Only id-shaped text qualifies; it is shown as Other until the version knows it.
  if (keepUnknownId && typeof raw==="string" && /^[a-z][a-z0-9_]{1,31}$/.test(raw)) return raw;
  return "other";
}

// ─── Custom categories (Run 24; Phase 2 of the custom-categories design note) ──────────────────────────────────────────────
// The user's own categories live in their own storage key and are added to CATEGORIES at start-up, so every picker, chart and budget
// sees them. An entry keeps only the category's id ("u_…"); the ledger shape is unchanged. A phone or older version that does not
// know an id shows the entry as "Other" and keeps the id (see resolveCategory), and the backup file carries the list.
export const CCAT_KEY=KEY+"__cats", CCAT_MAX=30, CCAT_LEN=24, CCAT_COLORS=["#F28B82","#F6AD55","#ECC94B","#68D391","#4FD1C5","#63B3ED","#A78BFA","#F687B3"];
// Run 35: a stored custom category is NEVER dropped because a later version added a built-in with the same name (e.g. the user's own "Pets" when "Pets" became built-in).
// Names are only compared with the built-ins when a category is being created or renamed (builtinNameTaken); stored lists keep every entry.
const builtinNameTaken=(n)=>{ const k=catKey(n); return CATEGORIES.some(c=>!c.custom && (catKey(c.name)===k || catKey(c.id)===k || catKey(catName(c.id))===k)); };
function cleanCustomCats(raw) {
  const src=Array.isArray(raw) ? raw : (raw && Array.isArray(raw.cats) ? raw.cats : []);
  const ids=new Set(), names=new Set(), out=[];
  src.forEach(v=>{
    if (!isPlainObject(v) || out.length>=CCAT_MAX) return;
    const id=typeof v.id==="string" && /^u_[a-z0-9]{3,12}$/.test(v.id) ? v.id : null;
    const name=typeof v.name==="string" ? v.name.trim().replace(/\s+/g," ") : "";
    if (!id || !name || name.length>CCAT_LEN || ids.has(id) || names.has(catKey(name))) return;
    ids.add(id); names.add(catKey(name));
    out.push({ id, name, income:v.income===true, color:typeof v.color==="string" && /^#[0-9a-fA-F]{6}$/.test(v.color) ? v.color : CCAT_COLORS[out.length%CCAT_COLORS.length] });
  });
  return out;
}
const currentCustomCats=()=>CATEGORIES.filter(c=>c.custom).map(c=>({ id:c.id, name:c.name, income:c.income, color:c.color }));
export function applyCustomCats(list) {   // replaces the custom entries of CATEGORIES in place (same array, so every reader sees the change)
  for (let i=CATEGORIES.length-1;i>=0;i--) if (CATEGORIES[i].custom) { const c=CATEGORIES.splice(i,1)[0]; delete CATEGORY_LOOKUP[c.id]; if (CATEGORY_LOOKUP[catKey(c.name)]===c.id) delete CATEGORY_LOOKUP[catKey(c.name)]; }
  cleanCustomCats(list).forEach(c=>{ CATEGORIES.push({ id:c.id, name:c.name, tile:c.name, color:c.color, income:c.income, subs:[], custom:true }); CATEGORY_LOOKUP[c.id]=c.id; if (!CATEGORY_LOOKUP[catKey(c.name)]) CATEGORY_LOOKUP[catKey(c.name)]=c.id; });
}
function mergeCustomCats(a, b) { return cleanCustomCats([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]); }
export function readCustomCats() { try { const r=localStorage.getItem(CCAT_KEY); return r ? cleanCustomCats(JSON.parse(r)) : []; } catch { return []; } }
export function writeCustomCats(list) {
  try { const c=cleanCustomCats(list); if (!c.length) localStorage.removeItem(CCAT_KEY); else localStorage.setItem(CCAT_KEY,JSON.stringify({ version:1, cats:c })); return true; } catch { return false; }
}
function newCustomCatId(list) { const used=new Set((list||[]).map(c=>c.id)); let id; do { id="u_"+Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,"a").padEnd(6,"a"); } while (used.has(id)); return id; }
// Adds a category to a list; returns the new list or a reason it was refused (empty, long, duplicate of a built-in or own name, full).
export function addCustomCat(list, name, income, color) {
  const n=typeof name==="string" ? name.trim().replace(/\s+/g," ") : "";
  if (!n) return { list, added:false, reason:"empty" };
  if (n.length>CCAT_LEN) return { list, added:false, reason:"long" };
  if ((list||[]).length>=CCAT_MAX) return { list, added:false, reason:"full" };
  if (builtinNameTaken(n)) return { list, added:false, reason:"dup" };
  const next=cleanCustomCats([...(list||[]),{ id:newCustomCatId(list), name:n, income:!!income, color }]);
  return next.length>(list||[]).length ? { list:next, added:true, reason:"" } : { list, added:false, reason:"dup" };
}
// Renames a category and/or changes its colour. Entries and budgets point at the id, so nothing else changes; the type stays as it was.
export function editCustomCat(list, id, name, color) {
  const cur=(list||[]).find(c=>c.id===id);
  if (!cur) return { list, edited:false, reason:"missing" };
  const n=typeof name==="string" ? name.trim().replace(/\s+/g," ") : "";
  if (!n) return { list, edited:false, reason:"empty" };
  if (n.length>CCAT_LEN) return { list, edited:false, reason:"long" };
  if (n!==cur.name && builtinNameTaken(n)) return { list, edited:false, reason:"dup" };
  const next=cleanCustomCats(list.map(c=>c.id===id ? { ...c, name:n, color:color||c.color } : c));
  return next.length===list.length && next.some(c=>c.id===id) ? { list:next, edited:true, reason:"" } : { list, edited:false, reason:"dup" };
}
// ─── Run 36: hide and reorder categories in the pickers (own storage key; the ledger and every report are unchanged) ──────────────────
// Hiding only takes a category out of the quick pickers (add form, bills, budgets, change category). Entries in it keep it, every report and
// chart still counts it, and a form editing such an entry still shows it. "Other" and "Other income" cannot be hidden (the fallbacks).
// Order is a list of ids; ids it does not know (another version's, the other type's) are kept as they are. Nothing here is ever deleted.
export const CPREF_KEY=KEY+"__catprefs", CPREF_UNHIDEABLE=new Set(["other","income"]);
const isCatIdText=(v)=>typeof v==="string" && /^[a-z][a-z0-9_]{1,31}$/.test(v);
export function cleanCatPrefs(raw) {
  const src=isPlainObject(raw) ? raw : {};
  const uniq=(a)=>[...new Set((Array.isArray(a)?a:[]).filter(isCatIdText))].slice(0,300);
  return { hidden:uniq(src.hidden).filter(id=>!CPREF_UNHIDEABLE.has(id)), order:uniq(src.order) };
}
export function readCatPrefs() { try { const r=localStorage.getItem(CPREF_KEY); return cleanCatPrefs(r ? JSON.parse(r) : {}); } catch { return cleanCatPrefs({}); } }
export function writeCatPrefs(p) {
  try { const c=cleanCatPrefs(p); if (!c.hidden.length && !c.order.length) localStorage.removeItem(CPREF_KEY); else localStorage.setItem(CPREF_KEY,JSON.stringify({ version:1, ...c })); return true; } catch { return false; }
}
export function orderedCats(income, prefs) {
  const p=cleanCatPrefs(prefs), pos=new Map(p.order.map((id,i)=>[id,i]));
  return CATEGORIES.filter(c=>!!c.income===!!income).map((c,i)=>({ c, k:pos.has(c.id) ? pos.get(c.id) : 1e6+i })).sort((a,b)=>a.k-b.k).map(x=>x.c);
}
// keep: ids always shown even when hidden (the category of the entry or bill being edited), so editing never changes a category silently.
export function pickerCats(income, prefs, keep=[]) {
  const p=cleanCatPrefs(prefs), hid=new Set(p.hidden), k=new Set((Array.isArray(keep)?keep:[keep]).filter(Boolean));
  return orderedCats(income,p).filter(c=>!hid.has(c.id) || k.has(c.id));
}
// Run 38 (owner: "put the most used categories at the front desk?"): plain counting, no guessing. Categories used in the last 90 days come first,
// most used first; ties and unused ones keep their normal order. Applied only when the user has not arranged this type's order by hand.
export function frequentFirst(list, transactions, now=new Date(), days=90) {
  const to=localDateStr(now), from=localDateStr(new Date(now.getFullYear(),now.getMonth(),now.getDate()-days)), n={};
  (Array.isArray(transactions)?transactions:[]).forEach(x=>{ if (x && typeof x.date==="string" && x.date>=from && x.date<=to) n[x.category]=(n[x.category]||0)+1; });
  return (list||[]).map((c,i)=>({ c, i, k:n[c.id]||0 })).sort((a,b)=>b.k-a.k || a.i-b.i).map(x=>x.c);
}
// Run 42 (owner's wishlist: "the category should default to what I usually buy at this time of day"). Learned from the person's own entries, never a fixed guess:
// among expenses of the last 90 days that were entered on the day they happened (so the entry time is when it was spent), those entered in the same part of the day
// as now (05-11 / 11-16 / 16-22 / night), the top category is suggested when there are at least 5 such entries, it has more than half of them, and they fall on
// at least 3 different days. Otherwise null (the usual first category stays). Only the pre-selected category changes; the picker order never moves.
export function slotCategory(transactions, now=new Date(), days=90) {
  const slot=(h)=>h>=5&&h<11 ? 0 : h>=11&&h<16 ? 1 : h>=16&&h<22 ? 2 : 3;
  const cur=slot(now.getHours()), from=localDateStr(new Date(now.getFullYear(),now.getMonth(),now.getDate()-days)), n={}, ds={}; let total=0;
  (Array.isArray(transactions)?transactions:[]).forEach(x=>{
    if (!x || x.type!=="expense" || x.recurring || x.billId || typeof x.date!=="string" || x.date<from || typeof x.category!=="string") return;
    const d=new Date(x.createdAt); if (isNaN(d.getTime()) || localDateStr(d)!==x.date || slot(d.getHours())!==cur) return;
    n[x.category]=(n[x.category]||0)+1; (ds[x.category]||(ds[x.category]=new Set())).add(x.date); total++;
  });
  if (total<5) return null;
  const top=Object.keys(n).sort((a,b)=>n[b]-n[a] || (a<b?-1:1))[0];
  return top && n[top]*2>total && ds[top].size>=3 ? top : null;
}
export function hasManualOrder(prefs, income) { const p=cleanCatPrefs(prefs); return p.order.some(id=>CATEGORIES.some(c=>c.id===id && !!c.income===!!income)); }
export function moveCat(prefs, income, id, dir) {
  const p=cleanCatPrefs(prefs), ids=orderedCats(income,p).map(c=>c.id), i=ids.indexOf(id), j=i+(dir<0?-1:1);
  if (i<0 || j<0 || j>=ids.length) return p;
  [ids[i],ids[j]]=[ids[j],ids[i]];
  return { ...p, order:[...p.order.filter(x=>!ids.includes(x)), ...ids] };
}
export function toggleHiddenCat(prefs, id) {
  const p=cleanCatPrefs(prefs);
  if (CPREF_UNHIDEABLE.has(id) || !isCatIdText(id)) return p;
  return { ...p, hidden:p.hidden.includes(id) ? p.hidden.filter(x=>x!==id) : [...p.hidden,id] };
}
// Search for the pickers: matches the category's name in the current language, its English name, short name, and its subcategories
// (built-in and the user's own), ignoring case. A subcategory match returns that subcategory too, so one tap picks both.
export function searchCats(list, query, mySubs={}) {
  const q=lc(String(query||"").trim()); if (!q) return list.map(c=>({ cat:c, sub:"" }));
  const byName=[], bySub=[];   // a category whose own name matches comes before one found through a subcategory
  list.forEach(c=>{
    const names=[catName(c.id), catTile(c.id), c.name, c.tile].filter(Boolean).map(lc);
    if (names.some(s=>s.includes(q))) { byName.push({ cat:c, sub:"" }); return; }
    const subs=[...(c.subs||[]), ...((mySubs&&mySubs[c.id])||[])];
    const hit=subs.find(s=>lc(subName(s)).includes(q) || lc(s).includes(q));
    if (hit) bySub.push({ cat:c, sub:hit });
  });
  return [...byName, ...bySub];
}
export function customCatInUse(id, transactions, budgets) { return (transactions||[]).some(x=>x && x.category===id) || !!(budgets && budgets[id]>0); }
try { applyCustomCats(readCustomCats()); } catch {}

// planImport reads a backup's own categories first, so its entries keep their category instead of becoming "Other"; nothing is stored here.
function planImportWithCats(raw, filename="") {
  let inc=[], prefs=null, upref=null; try { const p=JSON.parse(String(raw).replace(/^﻿/,"")); if (isPlainObject(p)) { inc=cleanCustomCats(p.customCategories); if (isPlainObject(p.categoryPrefs)) { const c=cleanCatPrefs(p.categoryPrefs); if (c.hidden.length || c.order.length) prefs=c; } const u=cleanPrefs(p.preferences); if (Object.keys(u).length) upref=u; } } catch {}
  const withPrefs=(r)=>{ if (r && r.ok && prefs) r.catPrefs=prefs; if (r && r.ok && upref) r.prefs=upref; return r; };   // Run 36 / Run 37
  if (!inc.length) return withPrefs(planImport(raw,filename));
  const had=currentCustomCats();
  applyCustomCats(mergeCustomCats(had,inc));
  try { const r=planImport(raw,filename); if (r && r.ok) r.customCats=inc; return withPrefs(r); } finally { applyCustomCats(had); }
}

// Callers validate with checkRawTxn() first (see partitionTransactions). normaliseTxn never takes abs(),
// never defaults a date and never turns an unknown type into an expense.
function normaliseTxn(t, opts={}) {
  // Keep the record's own id whenever it is usable: a finite number or a non-blank string (legacy and imported ids, UUIDs).
  // Anything else (missing, blank, NaN/Infinity, booleans, objects) gets a fresh numeric id.
  const rawId=t.id;
  const usableId=(typeof rawId==="number" && Number.isFinite(rawId)) || (typeof rawId==="string" && rawId.trim()!=="");
  const id=usableId ? rawId : Date.now()+Math.random();
  const f=t.recurFreq||t.frequency;
  return {
    id,
    type:        normType(t.type)==="income" ? "income" : "expense",
    amount:      strictNum(t.amount ?? t.amt),
    category:    resolveCategory(t.category||t.catId||t.cat, !!opts.keepCategoryId),
    subcategory: txt(t.subcategory||t.subcat),
    merchant:    txt(t.merchant||t.merchantName),
    note:        txt(t.note||t.description||t.name),
    date:        String(t.date).trim().slice(0,10),
    recurring:   isTrue(t.recurring),
    recurFreq:   RECUR_FREQS.has(f) ? f : null,
    isActive:    t.isActive===undefined ? true : t.isActive===null ? false : flagValue(t.isActive),   // checkRawTxn has refused anything else
    createdAt:   t.createdAt||new Date().toISOString(),
    // Run 12: the bill this payment paid (explicit bills). Only a short non-blank text id is kept; records without one get
    // no new field, so data written by earlier versions loads byte-for-byte the same.
    ...(isBillId(t.billId) ? { billId:t.billId.trim() } : {}),
    // Run 16: how it was paid. Optional, so entries without one keep exactly the shape older versions wrote.
    ...(walletId(t.wallet) ? { wallet:walletId(t.wallet) } : {}),
    // Run 17: a loan instalment marked paid on the Debts page. Optional; entries without it keep the shape older versions wrote.
    ...(loanRef(t.loan) ? { loan:loanRef(t.loan) } : {}),
    // Run 18: a repayment of a person-to-person debt that the user chose to also record as cash flow. Optional, same rule.
    ...(debtLinkRef(t.debtLink) ? { debtLink:debtLinkRef(t.debtLink) } : {}),
    // Run 22: an optional trip / group name. Same rule: entries without one keep the shape older versions wrote.
    ...(tripName(t.trip) ? { trip:tripName(t.trip) } : {}),
    // Run 24: the account the entry was paid from or received into. Optional, same rule; an id this phone does not know is kept as it is.
    ...(accId(t.account) ? { account:accId(t.account) } : {}),
    // Run 36: which expense category a refund gives money back to. Optional, same rule; kept only on income entries.
    ...(normType(t.type)==="income" && refundForId(t.refundFor) ? { refundFor:refundForId(t.refundFor) } : {}),
    // Run 39: what was really paid in another currency. Optional, same rule; the manat amount above stays the one every figure uses.
    ...(cleanFx(t.fx) ? { fx:cleanFx(t.fx) } : {}),
    // Run 41: an expense whose cost is shown spread over several months in the analytics. Optional, same rule; only on expenses; 2 to 24.
    ...(normType(t.type)!=="income" && spreadMonths(t.spread) ? { spread:spreadMonths(t.spread) } : {}),
    // Run 43: money others will pay back (expenses) / a payment received for such an expense (income). Optional, same rule.
    ...(normType(t.type)!=="income" && cleanReimb(t.reimb) ? { reimb:cleanReimb(t.reimb) } : {}),
    ...(normType(t.type)==="income" && reimbForRef(t.reimbFor)!==null ? { reimbFor:reimbForRef(t.reimbFor) } : {}),
  };
}
// Run 41 (owner wishlist, "amortize"): a big one-off cost (insurance, tuition, a flight) can be spread over 2 to 24 months in every spending view
// (month totals, categories, budgets, pace, trends, coach). The cash still leaves on the real date: balances, the entry list and Safe to Spend use the
// entry itself. Slices are whole cents, any remainder on the first slice, one per month on the same day (the month's last day when it is shorter).
export const SPREAD_MAX=24;
export function spreadMonths(v) { const n=typeof v==="string" && /^\d{1,2}$/.test(v.trim()) ? Number(v) : v; return Number.isInteger(n) && n>=2 && n<=SPREAD_MAX ? n : 0; }
export function expandSpreads(list) {
  return (Array.isArray(list)?list:[]).flatMap(t=>{
    const n=t && t.type==="expense" ? spreadMonths(t.spread) : 0, cents=Math.round((Number(t && t.amount)||0)*100);
    if (!n || !(cents>0) || !isValidDateStr(String(t.date).slice(0,10))) return [t];
    const [y,m,d]=String(t.date).slice(0,10).split("-").map(Number), base=Math.floor(cents/n), rest=cents-base*n, out=[];
    for (let i=0;i<n;i++) {
      const last=new Date(y,m-1+i+1,0), day=Math.min(d,last.getDate()), when=localDateStr(new Date(last.getFullYear(),last.getMonth(),day));
      out.push({ ...t, amount:(base+(i===0?rest:0))/100, date:i===0 ? String(t.date).slice(0,10) : when, id:i===0 ? t.id : `${t.id}#s${i}`, spreadSlice:{ i, n, total:cents/100, date:String(t.date).slice(0,10), id:t.id } });
    }
    return out;
  });
}
// The reverse, for cash figures (Safe to Spend): the first slice becomes the whole entry again on its real date, later slices are dropped.
export function collapseSpreads(list) {
  return (Array.isArray(list)?list:[]).flatMap(t=>{
    const s=t && t.spreadSlice; if (!s) return [t];
    if (s.i>0) return [];
    const { spreadSlice:_s, ...rest }=t; return [{ ...rest, amount:s.total, date:s.date }];
  });
}
// Run 22: a trip is a short free-text label (max 40 characters) on ordinary entries. Anything that is not text gives no trip.
export function tripName(v) { return typeof v==="string" ? v.replace(/[\u0000-\u001f\u007f\s]+/g," ").trim().slice(0,40).trim() : ""; }
// Run 24: one category's all-time total and a total per month (newest first), in whole cents. Loan instalments count only their interest, like every spending view.
export function catTotals(list, catId) {
  const by=new Map(); let cents=0, n=0;
  forSpending(list||[]).forEach(x=>{
    if (!x || x.category!==catId) return;
    const c=Math.round((Number(x.amount)||0)*100), m=String(x.date||"").slice(0,7);
    cents+=c; n++; const g=by.get(m)||{ month:m, cents:0, n:0 }; g.cents+=c; g.n++; by.set(m,g);
  });
  return { total:cents/100, n, months:[...by.values()].filter(g=>/^\d{4}-\d{2}$/.test(g.month)).sort((a,b)=>b.month.localeCompare(a.month)).map(g=>({ month:g.month, total:g.cents/100, n:g.n })) };
}
// Expenses per trip (loan instalments count only their interest, like every spending view), whole cents so 0.1 + 0.2 is exactly 0.30.
// "Baku" and "baku" are one trip; the spelling of the first entry in the list (newest first) is shown. Largest total first.
export function tripTotals(list) {
  const by=new Map();
  forSpending(list).forEach(x=>{
    const n=tripName(x && x.trip); if (!n || x.type==="income") return;
    const k=lc(n), g=by.get(k) || { name:n, cents:0, n:0 };
    g.cents+=Math.round((Number(x.amount)||0)*100); g.n++; by.set(k,g);
  });
  return [...by.values()].map(g=>({ name:g.name, total:g.cents/100, n:g.n })).sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name));
}
// Run 17 (owner rule): a loan payment is recorded as the FULL instalment (money paid out). loan.interest is the part that is a real cost
// (units, 2 decimals) or null when the person does not know the split. Spending views count only the interest; the principal reduces the
// loan and is not ordinary spending. An unknown split adds nothing to spending: no allocation is invented.
function loanRef(v) {
  if (!isPlainObject(v)) return null;
  if (v.interest===null) return { interest:null };
  return (typeof v.interest==="number" && Number.isFinite(v.interest) && v.interest>=0 && v.interest<=1e9) ? { interest:Math.round(v.interest*100)/100 } : null;
}
// Run 18 (owner decision "ask each time"): repaying a person, or being repaid, may also be recorded as a cash-flow entry. The entry is the
// principal only: it reduces the debt and is NOT ordinary spending or income (interest or fees are entered separately as normal entries).
function debtLinkRef(v) {
  if (!isPlainObject(v)) return null;
  const ok=(x)=>typeof x==="string" && x.trim()!=="" && x.length<=64;
  return ok(v.debtId) && ok(v.paymentId) ? { debtId:v.debtId, paymentId:v.paymentId } : null;
}
export function debtCashFlow(list, mon) {
  const out={ out:0, in:0, n:0 };
  (Array.isArray(list)?list:[]).forEach(t=>{
    if (!t || !t.debtLink || !debtLinkRef(t.debtLink) || String(t.date).slice(0,7)!==mon) return;
    out.n++; if (t.type==="income") out.in+=Number(t.amount)||0; else out.out+=Number(t.amount)||0;
  });
  out.out=Math.round(out.out*100)/100; out.in=Math.round(out.in*100)/100;
  return out;
}
// Run 36: a refund the user marked as "refund of <expense category>" (field refundFor) lowers that category's spending in the refund's
// month instead of counting as money in. Rule (written into How it is calculated): only that category, only that calendar month, never
// below zero. The refund takes from the latest entries dated on or before it first, then later ones in the month; an entry brought to
// zero leaves the spending views. Any part with nothing left to lower stays as money in, so money in minus spending always equals the
// raw cash difference (nothing is counted twice or lost). Refunds without refundFor behave exactly as before. Nothing is ever inferred.
// ─── Run 39: an entry paid in another currency (owner: "check these possibilities"; source verified 7 Nov 2026) ─────────────────────────────
// The ledger's own amount stays in manat (every total, budget and report uses it, unchanged). The entry may also carry fx = what was really
// paid: { cur:"EUR", amt:100, rate:1.90371 (manat per 1 unit), on:"2026-11-06" (the rate's day), src:"cbar" | "manual" }.
// Rates: the Central Bank of Azerbaijan's official daily rate, through Frankfurter (api.frankfurter.dev, provider "cbar": free, no key, allows
// browser requests). Only the currency code and the date are sent. Offline or no answer: the person types the rate. Offered only when the
// ledger currency is the manat.
export const FX_CODES=["USD","EUR","RUB","TRY","GBP","GEL","AED","KZT","UAH","CNY","CHF","JPY"];
// Run 53 (owner: "converting does not work in other currencies; it must work both ways"): the ledger's own currency as a code. The app stores
// the currency as the sign the person chose; the signs below are the ones a rate can be found for. Any other sign: no conversion is offered.
const LEDGER_CODES={ "₼":"AZN", "AZN":"AZN", "$":"USD", "USD":"USD", "€":"EUR", "EUR":"EUR", "£":"GBP", "GBP":"GBP", "₽":"RUB", "RUB":"RUB", "₺":"TRY", "TRY":"TRY", "₾":"GEL", "GEL":"GEL" };
export const ledgerCode=(currency)=>{ const s=String(currency==null?"":currency).trim(); return LEDGER_CODES[s] || LEDGER_CODES[s.toUpperCase()] || ""; };
export const fxBaseOk=(currency)=>!!ledgerCode(currency);
export function cleanFx(v) {
  if (!isPlainObject(v)) return null;
  const cur=typeof v.cur==="string" && /^[A-Z]{3}$/.test(v.cur) ? v.cur : null;   // Run 53: the manat too (a dollar ledger can hold a payment made in manat)
  const amt=typeof v.amt==="number" ? v.amt : NaN, rate=typeof v.rate==="number" ? v.rate : NaN;
  if (!cur || !(amt>0) || amt>1e10 || Number(amt.toFixed(2))!==amt || !(rate>0) || rate>1e5) return null;
  return { cur, amt, rate:Number(rate.toPrecision(6)), on:isValidDateStr(v.on)?v.on:"", src:v.src==="manual"?"manual":"cbar" };
}
// Manat amount = foreign amount × rate, rounded half-up to the qəpik, in whole numbers (no floating-point drift): 100.00 EUR × 1.90371 = 190.37.
export function fxToBase(amt, rate) {
  const cents=BigInt(Math.round(amt*100)), micro=BigInt(Math.round(rate*1e6));
  const prod=cents*micro, q=prod/1000000n, r=prod%1000000n;
  return Number(q+(r*2n>=1000000n?1n:0n))/100;
}
const FX_CACHE_KEY=KEY+"__fxcache";
function readFxCache() { try { const v=JSON.parse(localStorage.getItem(FX_CACHE_KEY)||"{}"); return isPlainObject(v) ? v : {}; } catch { return {}; } }
function writeFxCache(c) { try { const keys=Object.keys(c); if (keys.length>300) keys.slice(0,keys.length-300).forEach(k=>delete c[k]); localStorage.setItem(FX_CACHE_KEY,JSON.stringify(c)); } catch {} }
// -> { rate, on } or throws. A day without a published rate (weekend, holiday) gets the latest earlier one, and `on` says which day that was.
export async function fetchCbarRate(cur, date, fetchFn=(typeof fetch!=="undefined"?fetch:null)) {
  if (!/^[A-Z]{3}$/.test(String(cur)) || !fetchFn) throw new Error("bad");
  const today=localDateStr(new Date()), day=isValidDateStr(date) && date<=today ? date : today, key=cur+"|"+day, cache=readFxCache();
  if (cache[key] && cache[key].rate>0) return cache[key];
  // Asked as "1 <cur> = ? AZN": the answer is the Central Bank's own published figure (1 USD = 1.7, 1 EUR = 1.9037, 1 RUB = 0.02084), checked
  // against cbar.az on 7 Nov 2026. (Asking the other way round gives a rounded inverse: 1 / 0.58824 = 1.69999, one qəpik off on 1,000 USD.)
  const res=await fetchFn(`https://api.frankfurter.dev/v2/rates?base=${cur}&providers=cbar&quotes=AZN&date=${day}`);
  if (!res || !res.ok) throw new Error("http");
  const data=await res.json(), rec=Array.isArray(data) ? data.find(x=>x && x.quote==="AZN") : data;
  if (!rec || rec.quote!=="AZN" || !(typeof rec.rate==="number" && rec.rate>0 && rec.rate<1e5)) throw new Error("none");
  const out={ rate:Number(rec.rate.toPrecision(6)), on:isValidDateStr(rec.date)?rec.date:day };
  cache[key]=out; writeFxCache(cache);
  return out;
}
// Run 53: the rate of 1 <cur> in the LEDGER's currency <base>, for a ledger that is not in manat. The Central Bank publishes every currency
// against the manat, so another pair is worked out through it: 1 EUR = 1.9037 AZN and 1 USD = 1.7 AZN give 1 EUR = 1.9037 / 1.7 = 1.11982 USD;
// 1 AZN = 1 / 1.7 = 0.588235 USD. The day shown is the older of the two published days. -> { rate, on } or throws.
export async function fetchLedgerRate(cur, date, base="AZN", fetchFn=(typeof fetch!=="undefined"?fetch:null)) {
  if (!/^[A-Z]{3}$/.test(String(cur)) || !/^[A-Z]{3}$/.test(String(base)) || cur===base) throw new Error("bad");
  if (base==="AZN") return fetchCbarRate(cur,date,fetchFn);
  const b=await fetchCbarRate(base,date,fetchFn);
  if (cur==="AZN") return { rate:Number((1/b.rate).toPrecision(6)), on:b.on };
  const c=await fetchCbarRate(cur,date,fetchFn);
  return { rate:Number((c.rate/b.rate).toPrecision(6)), on:c.on && b.on && b.on<c.on ? b.on : c.on };
}
// The newest rate the phone already holds for a currency (from any earlier day), for when there is no internet: it is offered with its date
// and used only if the person says so; never silently.
export function lastSavedRate(cur, base="AZN") {
  const cache=readFxCache();
  const newest=(code)=>{ let best=null; Object.keys(cache).forEach(k=>{ if (!k.startsWith(code+"|")) return; const r=cache[k]; if (r && r.rate>0 && isValidDateStr(r.on) && (!best || r.on>best.on)) best=r; }); return best; };
  if (!/^[A-Z]{3}$/.test(String(cur)) || cur===base) return null;
  if (base==="AZN") { const c=newest(cur); return c ? { rate:c.rate, on:c.on } : null; }
  const b=newest(base); if (!b) return null;
  if (cur==="AZN") return { rate:Number((1/b.rate).toPrecision(6)), on:b.on };
  const c=newest(cur); return c ? { rate:Number((c.rate/b.rate).toPrecision(6)), on:b.on<c.on ? b.on : c.on } : null;
}
// Run 53 (owner: "the app should get the latest rates every day without being asked"): when the app is opened, today's official rates are
// fetched for the dollar, the euro, the pound and every currency the person has used, so the add form shows them at once. One request per
// currency per day at most (also when it fails: no retry storm on a bad connection). Only the currency code and the date leave the phone.
const FX_WARM_KEY=KEY+"__fxwarm";
export async function warmRates(transactions, currency, fetchFn=(typeof fetch!=="undefined"?fetch:null), now=new Date()) {
  const base=ledgerCode(currency); if (!base || !fetchFn) return { asked:[] };
  const day=localDateStr(now); let st=null; try { st=JSON.parse(localStorage.getItem(FX_WARM_KEY)||"null"); } catch {}
  if (!isPlainObject(st) || st.day!==day || !Array.isArray(st.tried)) st={ day, tried:[] };
  const want=new Set(["USD","EUR","GBP"]); (transactions||[]).forEach(x=>{ const c=x && x.fx && x.fx.cur; if (typeof c==="string" && /^[A-Z]{3}$/.test(c)) want.add(c); });
  if (base!=="AZN") want.add(base); want.delete("AZN");
  const cache=readFxCache(), todo=[...want].filter(c=>!st.tried.includes(c) && !(cache[c+"|"+day] && cache[c+"|"+day].rate>0)).slice(0,10);
  if (!todo.length) return { asked:[] };
  // A currency counts as "asked today" only once its request has ended (with a rate or with a failure). If the app is closed while a
  // request is still on its way, that currency is simply asked again next time.
  for (const c of todo) {
    try { await fetchCbarRate(c,day,fetchFn); } catch { /* offline or no rate: the add form will ask or offer the last saved one */ }
    st.tried.push(c); try { localStorage.setItem(FX_WARM_KEY,JSON.stringify(st)); } catch {}
  }
  return { asked:todo };
}
// ─── Run 39: quick-add link (owner: frictionless entry; Apple Shortcuts / NFC tag / home-screen bookmark) ─────────────────────────────────────
// https://expense-ledger2.vercel.app/?add=expense&amount=4.50&merchant=Coffee&category=food opens the add form already filled in. It never saves
// by itself (the person presses Save), every value is checked, and unknown words fall back to the normal defaults.
export const PUBLIC_URL="https://expense-ledger2.vercel.app/";
export function parseQuickAdd(search) {
  let q; try { q=new URLSearchParams(String(search||"")); } catch { return null; }
  const type=String(q.get("add")||"").toLowerCase();
  if (type!=="expense" && type!=="income") return null;
  const raw=String(q.get("amount")||"").trim().replace(",",".");
  const amount=/^\d{1,9}(\.\d{1,2})?$/.test(raw) && Number(raw)>0 ? Number(raw) : "";
  const catRaw=String(q.get("category")||"").slice(0,40), cid=catRaw ? resolveCategory(catRaw) : "";
  const c=cid && CATEGORIES.find(x=>x.id===cid && !!x.income===(type==="income"));
  const clip=(v,n)=>String(v||"").replace(/[\u0000-\u001f\u007f]+/g," ").trim().slice(0,n);
  const date=String(q.get("date")||"");
  return { type, amount, category:c ? c.id : (type==="income"?"salary":"food"), merchant:clip(q.get("merchant"),80), note:clip(q.get("note"),200), ...(isValidDateStr(date)?{ date }:{}) };
}
// Only an income entry in "Refunds" can name an expense category it refunds; anything else stores no field.
function refundPart(data, refundFor) { const id=refundForId(refundFor), c=id && CATEGORIES.find(x=>x.id===id); return data && data.type==="income" && data.category==="refund" && c && !c.income ? { refundFor:id } : {}; }
export function refundForId(v) { return typeof v==="string" && /^[a-z][a-z0-9_]{1,31}$/.test(v) ? v : ""; }
function netRefunds(rows) {
  // A refund dated after today has not happened yet: until its day it stays expected money in and lowers nothing (spent-so-far stays true).
  const todayS=localDateStr(new Date());
  const refunds=rows.filter(t=>t && t.type==="income" && t.category==="refund" && refundForId(t.refundFor) && /^\d{4}-\d{2}-\d{2}/.test(String(t.date)) && String(t.date).slice(0,10)<=todayS);
  if (!refunds.length) return rows;
  const out=rows.slice(), drop=new Set(), cents=(x)=>Math.round((Number(x)||0)*100);
  refunds.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(r=>{
    const cat=r.refundFor, mon=String(r.date).slice(0,7), rd=String(r.date).slice(0,10);
    const idx=[]; out.forEach((x,i)=>{ if (x && !drop.has(i) && x.type==="expense" && x.category===cat && String(x.date).slice(0,7)===mon) idx.push(i); });
    // latest on or before the refund first, then later in the month (earliest first)
    const before=idx.filter(i=>String(out[i].date).slice(0,10)<=rd).sort((a,b)=>String(out[b].date).localeCompare(String(out[a].date))||b-a);
    const after=idx.filter(i=>String(out[i].date).slice(0,10)>rd).sort((a,b)=>String(out[a].date).localeCompare(String(out[b].date))||a-b);
    let left=cents(r.amount);
    for (const i of [...before,...after]) {
      if (left<=0) break;
      const have=cents(out[i].amount), take=Math.min(have,left);
      left-=take;
      if (have-take<=0) drop.add(i); else out[i]={...out[i], amount:(have-take)/100};
    }
    const ri=out.indexOf(r);
    if (left<=0) drop.add(ri); else out[ri]={...r, amount:left/100};
  });
  return out.filter((_,i)=>!drop.has(i));
}
// Run 36: how much "Refund of" entries lowered spending in a month (shown in Analytics so the lower figure is never a mystery).
export function refundsNetted(list, mon) {
  const pre=forSpendingRows(list), post=netRefunds(pre), m=(x)=>x && x.type==="expense" && String(x.date).slice(0,7)===mon;
  return Math.round((sumCents(pre.filter(m))-sumCents(post.filter(m)))*100)/100;
}
// ─── Run 43: money others will pay back ("float", owner wishlist) ────────────────────────────────────────────────────────────────────────────
// An expense may say: "reimb": { amt, who } = this much of it is for someone else, who will pay it back. Every spending view (month totals,
// categories, budgets, pace, coach, Safe to Spend) then counts only YOUR share (amount - amt, never below 0). Balances and the entry list keep
// the full amount, because that is what really left the account. When the person pays back, the app records a normal "Refunds" income entry
// with reimbFor = the expense's id; those entries are folded into the share (never counted twice); anything paid beyond the amount stays money in.
export function cleanReimb(v) {
  if (!isPlainObject(v)) return null;
  const amt=typeof v.amt==="number" ? v.amt : NaN;
  if (!(amt>0) || amt>1e10 || Number(amt.toFixed(2))!==amt) return null;
  const who=typeof v.who==="string" ? v.who.replace(/[\u0000-\u001f\u007f]+/g," ").trim().slice(0,40) : "";
  return { amt, who };
}
export function reimbForRef(v) { return (typeof v==="number" && Number.isFinite(v)) || (typeof v==="string" && v.trim()!=="" && v.length<=64) ? v : null; }
// How much of an expense is expected back, and how much has come back, from the whole list. Pure; used by Home, the ledger row and the tests.
export function reimbStatus(list, expense) {
  const r=expense && expense.type==="expense" ? cleanReimb(expense.reimb) : null;
  if (!r) return null;
  const c=(x)=>Math.round((Number(x)||0)*100), cap=Math.min(c(expense.amount),c(r.amt));
  let got=0;
  (Array.isArray(list)?list:[]).forEach(t=>{ if (t && t.type==="income" && t.category==="refund" && reimbForRef(t.reimbFor)!==null && String(t.reimbFor)===String(expense.id)) got+=c(t.amount); });
  return { who:r.who, expected:cap/100, received:Math.min(got,cap)/100, owed:Math.max(0,cap-got)/100, extra:Math.max(0,got-cap)/100 };
}
// id -> amount still owed, only for entries that have something owed (one pass; for lists).
export function reimbOwedMap(list) {
  const arr=Array.isArray(list)?list:[], c=(x)=>Math.round((Number(x)||0)*100), got=new Map();
  arr.forEach(t=>{ if (t && t.type==="income" && t.category==="refund" && reimbForRef(t.reimbFor)!==null) got.set(String(t.reimbFor),(got.get(String(t.reimbFor))||0)+c(t.amount)); });
  const out=new Map();
  arr.forEach(t=>{ const r=t && t.type==="expense" ? cleanReimb(t.reimb) : null; if (!r) return; const cap=Math.min(c(t.amount),c(r.amt)), owed=cap-(got.get(String(t.id))||0); if (owed>0) out.set(String(t.id),owed/100); });
  return out;
}
// Total still owed to the person, across all entries (Home line).
export function reimbOwedTotal(list) {
  let cents=0, people=new Set();
  (Array.isArray(list)?list:[]).forEach(t=>{ const s=reimbStatus(list,t); if (s && s.owed>0) { cents+=Math.round(s.owed*100); people.add(s.who||""); } });
  return { total:cents/100, n:people.size };
}
function netReimb(rows) {
  const c=(x)=>Math.round((Number(x)||0)*100), share=new Map();
  rows.forEach(t=>{ if (t && t.type==="expense") { const r=cleanReimb(t.reimb); if (r) share.set(String(t.id),Math.min(c(t.amount),c(r.amt))); } });
  if (!share.size) return rows;
  const used=new Map(), out=[];
  rows.forEach(t=>{
    if (t && t.type==="expense" && share.has(String(t.id))) { const left=c(t.amount)-share.get(String(t.id)); if (left>0) { const { reimb:_rb, ...rest }=t; out.push({ ...rest, amount:left/100 }); } return; }
    if (t && t.type==="income" && t.category==="refund" && reimbForRef(t.reimbFor)!==null && share.has(String(t.reimbFor))) {
      const k=String(t.reimbFor), room=share.get(k)-(used.get(k)||0), have=c(t.amount), take=Math.min(room,have);
      used.set(k,(used.get(k)||0)+take);
      if (have-take>0) out.push({ ...t, amount:(have-take)/100 });
      return;
    }
    out.push(t);
  });
  return out;
}
function forSpending(list) { return expandSpreads(netRefunds(netReimb(forSpendingRows(list)))); }  // Run 41: spread costs are cut into monthly slices last, after refunds were netted against the whole entry
function forSpendingRows(list) {
  return ((Array.isArray(list)?list:[]).flatMap(t=>{
    if (t && t.debtLink && debtLinkRef(t.debtLink)) return [];
    // Run 35b: refunds and withdrawals from savings stay in this list (they are real money in: month net, Safe-to-Spend and the coach count them).
    // Only figures LABELLED income leave them out, via isEarnedCat in calcMonthSummary (curInc vs curIn).
    const r=t&&t.loan?loanRef(t.loan):null;
    if (!r) return [t];
    const part=r.interest===null ? 0 : Math.min(r.interest,Number(t.amount)||0);
    return part>0 ? [{...t,amount:part}] : [];
  }));
}
export function loanCashOut(list, mon) {
  const out={ paid:0, n:0, interest:0, unknown:0 };
  (Array.isArray(list)?list:[]).forEach(t=>{
    const r=t&&t.loan?loanRef(t.loan):null;
    if (!r || String(t.date).slice(0,7)!==mon) return;
    out.n++; out.paid+=Number(t.amount)||0;
    if (r.interest===null) out.unknown++; else out.interest+=Math.min(r.interest,Number(t.amount)||0);
  });
  out.paid=Math.round(out.paid*100)/100; out.interest=Math.round(out.interest*100)/100;
  return out;
}
// Run 16: the wallet an entry was paid from. Only a tag (no balances, no transfers). The built-in ids are below; a short safe
// text id this version does not know (a wallet from a newer version or file) is KEPT, never dropped or turned into another one,
// and shown as "Other". "" means not set.
export const WALLET_IDS = ["cash","card","mobile","other"];
export function walletId(v) { const s=typeof v==="string" ? v.trim().toLowerCase() : ""; return /^[a-z0-9_-]{1,32}$/.test(s) ? s : ""; }
// Names a person types in a CSV, mapped to the ids ("Bank card" has a space, so it is not an id by itself).
const WALLET_ALIASES = { "bank card":"card", "credit card":"card", "debit card":"card", "mobile wallet":"mobile", "e wallet":"mobile" };
function walletFromText(s) { const k=String(s||"").trim().toLowerCase(); return WALLET_ALIASES[k] || walletId(k); }
// The wallet of the newest entry that has one (the list is newest first): the default for the next entry.
function lastWallet(transactions) { const t=(transactions||[]).find(x=>walletId(x && x.wallet)); return t ? walletId(t.wallet) : ""; }
export const walletName=(id)=>WALLET_IDS.includes(id) ? t("wallet."+id) : t("wallet.other");   // an id this version does not know shows as "Other"
// ─── Run 57 (owner, 10 Nov: "Cash is Nağd and ABB card is bank card, the app must understand them"): ONE "paid from" rule ─────────────
// Entries say how they were paid in two ways: the older "wallet" (cash, bank card, mobile wallet) and the newer "account" (Nağd, ABB Card).
// Both are kept exactly as stored. For filters and reports every entry gets one KIND:
//   - an entry on an account this phone knows: the kind of that account (cash; card or credit card = card; mobile wallet = mobile; bank
//     account = bank; other = other);
//   - otherwise its old wallet (cash, card, mobile; any other wallet word = other);
//   - otherwise "none" (not set). An account that no longer exists counts as not linked, so the entry never drops out of every filter.
// Every entry has exactly one kind, so "All cash" + "All cards" + … + "Not set" always add up to every entry.
export const PAID_KINDS=["cash","card","mobile","bank","other"];
const ACC_KIND_GROUP={ cash:"cash", card:"card", credit:"card", wallet:"mobile", bank:"bank", other:"other" };
const WALLET_GROUP={ cash:"cash", card:"card", mobile:"mobile" };
export function accountsMap(data) { const out={}; ((data&&data.accounts)||[]).forEach(a=>{ if (a && accId(a.id)) out[a.id]=a; }); return out; }
export function paidFromAccount(entry, accountsById) { const id=entry ? accId(entry.account) : ""; return id && accountsById && accountsById[id] ? id : ""; }
export function paidFromKind(entry, accountsById) {
  const a=paidFromAccount(entry,accountsById);
  if (a) return ACC_KIND_GROUP[accountsById[a].kind]||"other";
  const w=walletId(entry && entry.wallet);
  return w ? (WALLET_GROUP[w]||"other") : "none";
}
// choice: "all" | "k:<kind>" | "a:<account id>" | "none"
export function paidFromMatch(entry, choice, accountsById) {
  if (!choice || choice==="all") return true;
  if (choice==="none") return paidFromKind(entry,accountsById)==="none";
  if (choice.startsWith("a:")) return paidFromAccount(entry,accountsById)===choice.slice(2);
  if (choice.startsWith("k:")) return paidFromKind(entry,accountsById)===choice.slice(2);
  return true;
}
// The choices worth offering for these entries, in a fixed order: each kind in use followed by its accounts in use, then "not set".
// A kind is left out when it would show exactly the same entries as its only account (no two chips that do the same thing).
export function paidFromOptions(transactions, accountsById) {
  const kinds={}, accs={}; let none=0;
  (transactions||[]).forEach(x=>{ const k=paidFromKind(x,accountsById); if (k==="none") { none++; return; } kinds[k]=(kinds[k]||0)+1; const a=paidFromAccount(x,accountsById); if (a) accs[a]=(accs[a]||0)+1; });
  const out=[];
  PAID_KINDS.forEach(k=>{
    if (!kinds[k]) return;
    const mine=Object.keys(accs).filter(id=>(ACC_KIND_GROUP[accountsById[id].kind]||"other")===k).sort((p,q)=>String(accountsById[p].name).localeCompare(String(accountsById[q].name)));
    if (!(mine.length===1 && accs[mine[0]]===kinds[k])) out.push({ value:"k:"+k, kind:k, n:kinds[k] });
    mine.forEach(id=>out.push({ value:"a:"+id, account:id, n:accs[id] }));
  });
  if (none) out.push({ value:"none", n:none });
  return out;
}
export const paidKindName=(k)=>t("paid.kind."+k);
// Run 16: the user's own subcategories (Phase 1 of the custom-categories design note). A subcategory is already free text on each
// entry, so these are only SUGGESTIONS in the picker, kept in their own storage key. The ledger and every entry stay untouched,
// and an older version simply never shows them. Limits: 20 per category, 30 characters, no duplicates (ignoring case), nothing
// equal to a built-in subcategory of that category.
export const SUBCAT_KEY=KEY+"__subcats", SUBCAT_MAX=20, SUBCAT_LEN=30;
export const subKey=(s)=>lc(String(s).trim());
function cleanSubcats(raw) {
  const out={};
  const src=raw && typeof raw==="object" && !Array.isArray(raw) ? (raw.byCategory && typeof raw.byCategory==="object" && !Array.isArray(raw.byCategory) ? raw.byCategory : raw) : {};
  Object.entries(src).forEach(([cid,list])=>{
    const cat=CATEGORIES.find(c=>c.id===cid); if (!cat || !Array.isArray(list)) return;
    const seen=new Set((cat.subs||[]).map(subKey)), keep=[];
    list.forEach(v=>{ if (typeof v!=="string") return; const s=v.trim().replace(/\s+/g," "); if (!s || s.length>SUBCAT_LEN || seen.has(subKey(s)) || keep.length>=SUBCAT_MAX) return; seen.add(subKey(s)); keep.push(s); });
    if (keep.length) out[cid]=keep;
  });
  return out;
}
export function addUserSubcat(map, catId, text) {
  const cat=CATEGORIES.find(c=>c.id===catId); if (!cat) return { map, added:false, reason:"category" };
  const s=typeof text==="string" ? text.trim().replace(/\s+/g," ") : ""; if (!s) return { map, added:false, reason:"empty" };
  if (s.length>SUBCAT_LEN) return { map, added:false, reason:"long" };
  const mine=(map&&map[catId])||[];
  if ((cat.subs||[]).some(x=>subKey(x)===subKey(s)) || mine.some(x=>subKey(x)===subKey(s))) return { map, added:false, reason:"dup" };
  if (mine.length>=SUBCAT_MAX) return { map, added:false, reason:"full" };
  return { map:{ ...map, [catId]:[...mine,s] }, added:true, reason:"" };
}
export function removeUserSubcat(map, catId, text) {
  const rest=((map&&map[catId])||[]).filter(x=>subKey(x)!==subKey(text)), out={ ...map };
  if (rest.length) out[catId]=rest; else delete out[catId];
  return out;
}
// Run 25: renaming one of the user's own subcategories. Same rules as adding (length, no duplicate, not a built-in name); the position
// in the list is kept. Entries that used the old name are renamed by renameSubcatInEntries (only that category's entries).
export function renameUserSubcat(map, catId, oldText, newText) {
  const cat=CATEGORIES.find(c=>c.id===catId); if (!cat) return { map, edited:false, reason:"category" };
  const mine=(map&&map[catId])||[], idx=mine.findIndex(x=>subKey(x)===subKey(oldText));
  if (idx<0) return { map, edited:false, reason:"missing" };
  const s=typeof newText==="string" ? newText.trim().replace(/\s+/g," ") : ""; if (!s) return { map, edited:false, reason:"empty" };
  if (s.length>SUBCAT_LEN) return { map, edited:false, reason:"long" };
  if ((cat.subs||[]).some(x=>subKey(x)===subKey(s)) || mine.some((x,i)=>i!==idx && subKey(x)===subKey(s))) return { map, edited:false, reason:"dup" };
  const list=[...mine]; list[idx]=s;
  return { map:{ ...map, [catId]:list }, edited:true, reason:"", name:s };
}
function renameSubcatInEntries(transactions, catId, oldText, newText) {
  return (transactions||[]).map(x=> x && x.category===catId && typeof x.subcategory==="string" && subKey(x.subcategory)===subKey(oldText) ? { ...x, subcategory:newText } : x);
}
function mergeSubcats(a, b) { const out={}; const A=cleanSubcats(a), B=cleanSubcats(b); new Set([...Object.keys(A),...Object.keys(B)]).forEach(k=>{ out[k]=[...(A[k]||[]),...(B[k]||[])]; }); return cleanSubcats(out); }
export function readSubcats() { try { const r=localStorage.getItem(SUBCAT_KEY); return r ? cleanSubcats(JSON.parse(r)) : {}; } catch { return {}; } }
export function writeSubcats(map) {   // an empty list removes the key instead of keeping an empty shell
  try { const c=cleanSubcats(map); if (!Object.keys(c).length) localStorage.removeItem(SUBCAT_KEY); else localStorage.setItem(SUBCAT_KEY,JSON.stringify({ version:1, byCategory:c })); return true; } catch { return false; }
}
// ─── Accounts, balances and transfers (Run 24; see handoff/DESIGN_NOTE_ACCOUNTS_TRANSFERS) ────────────────────────────────
// Accounts (a card, cash, a bank account) live in their own storage key with the transfers between them. An ordinary entry may carry
// an optional `account` id. A balance is never stored: opening balance + income − expenses (entries with that account) + transfers in −
// transfers out, all in whole cents. A transfer is its own record, so it can never count as income or spending.
export const ACC_KEY=KEY+"__accounts", ACC_MAX=30, TRANSFER_MAX=2000, ACC_KINDS=["cash","card","wallet","bank","credit","other"];   // Run 41: "credit" = a credit card; what is spent on it is owed until a transfer pays it off. An older app reads the type as "other".
export const accId=(v)=>typeof v==="string" && /^a_[a-z0-9]{3,12}$/.test(v) ? v : "";
const centsOf=(v)=>{ const n=Number(v); return Number.isFinite(n) ? Math.round(n*100) : 0; };
function cleanAccountData(raw) {
  const src=isPlainObject(raw) ? raw : {};
  const accounts=[], ids=new Set(), names=new Set();
  (Array.isArray(src.accounts)?src.accounts:[]).forEach(a=>{
    if (!isPlainObject(a) || accounts.length>=ACC_MAX) return;
    const id=accId(a.id), name=typeof a.name==="string" ? a.name.trim().replace(/\s+/g," ").slice(0,40) : "";
    if (!id || !name || ids.has(id) || names.has(lc(name))) return;
    const op=isPlainObject(a.opening) ? a.opening : {}, amt=Number(op.amount);
    ids.add(id); names.add(lc(name));
    accounts.push({ id, name, kind:ACC_KINDS.includes(a.kind)?a.kind:"other", opening:{ amount:Number.isFinite(amt)&&Math.abs(amt)<1e12 ? Math.round(amt*100)/100 : 0, date:isValidDateStr(op.date)?op.date:"" }, hidden:a.hidden===true });
  });
  const tids=new Set(), transfers=[];
  (Array.isArray(src.transfers)?src.transfers:[]).forEach(x=>{
    if (!isPlainObject(x) || transfers.length>=TRANSFER_MAX) return;
    const id=typeof x.id==="string" && /^t_[a-z0-9]{3,16}$/.test(x.id) ? x.id : "", amt=centsOf(x.amount);
    if (!id || tids.has(id) || !ids.has(accId(x.from)) || !ids.has(accId(x.to)) || x.from===x.to || !(amt>0) || amt>1e14 || !isValidDateStr(x.date)) return;
    tids.add(id); transfers.push({ id, from:x.from, to:x.to, amount:amt/100, date:x.date, note:typeof x.note==="string" ? x.note.trim().slice(0,80) : "" });
  });
  return { accounts, transfers };
}
function mergeAccountData(a, b) {   // by id: what is already here wins; transfers whose accounts are missing are dropped by the cleaner
  const A=cleanAccountData(a), B=cleanAccountData(b);
  const haveA=new Set(A.accounts.map(x=>x.id)), haveT=new Set(A.transfers.map(x=>x.id));
  return cleanAccountData({ accounts:[...A.accounts,...B.accounts.filter(x=>!haveA.has(x.id))], transfers:[...A.transfers,...B.transfers.filter(x=>!haveT.has(x.id))] });
}
export function readAccounts() { try { const r=localStorage.getItem(ACC_KEY); return r ? cleanAccountData(JSON.parse(r)) : { accounts:[], transfers:[] }; } catch { return { accounts:[], transfers:[] }; } }
export function writeAccounts(data) {
  try { const c=cleanAccountData(data); if (!c.accounts.length) localStorage.removeItem(ACC_KEY); else localStorage.setItem(ACC_KEY,JSON.stringify({ version:1, ...c })); return true; } catch { return false; }
}
// Run 26: the name of an account for a row label. Cached against the raw stored text, so listing many rows does not parse it again.
let _accRaw=null, _accMap={};
export function accountName(id) {
  if (!accId(id)) return "";
  try { const raw=localStorage.getItem(ACC_KEY); if (raw!==_accRaw) { _accRaw=raw; _accMap={}; cleanAccountData(raw?JSON.parse(raw):null).accounts.forEach(a=>{ _accMap[a.id]=a.name; }); } } catch { return ""; }
  return _accMap[id]||"";
}
// Balance per account id, in money (exact to the cent). Entries whose account is unknown here are not counted anywhere.
// Run 28: a balance is "as of" a day (default: today). An entry or transfer dated AFTER that day has not happened yet, so it does not move
// the balance (a planned bill for the 20th must not lower the balance on the 5th). Entries without a valid date count, as before.
export function accountBalances(data, transactions, asOf) {
  const d=cleanAccountData(data), out={}, cut=isValidDateStr(asOf) ? asOf : localDateStr();
  const happened=(date)=>!isValidDateStr(date) || date<=cut;
  d.accounts.forEach(a=>{ out[a.id]=centsOf(a.opening.amount); });
  (transactions||[]).forEach(x=>{ if (!x || !(accId(x.account) in out) || !happened(x.date)) return; const c=centsOf(x.amount); out[x.account]+= x.type==="income" ? c : x.type==="expense" ? -c : 0; });
  d.transfers.forEach(x=>{ if (!happened(x.date)) return; out[x.from]-=centsOf(x.amount); out[x.to]+=centsOf(x.amount); });
  Object.keys(out).forEach(k=>{ out[k]=out[k]/100; });
  return out;
}
// Run 41: what is still owed on credit-card accounts today, in money (exact to the cent): for each account of kind "credit" whose balance is below zero, that amount.
// Spending on the card is already counted as spending on its day; this only shows the bill that is still to be paid (a transfer to the card pays it off).
export function creditOwed(data, transactions, asOf) {
  const d=cleanAccountData(data), bal=accountBalances(d,transactions,asOf);
  return d.accounts.filter(a=>a.kind==="credit").reduce((s,a)=>s+Math.max(0,-Math.round((bal[a.id]||0)*100)),0)/100;
}
function newAccId(prefix, used) { let id; do { id=prefix+Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,"a").padEnd(6,"a"); } while (used.has(id)); return id; }
export function addAccount(data, name, kind, openingAmount, openingDate) {
  const d=cleanAccountData(data), n=typeof name==="string" ? name.trim().replace(/\s+/g," ") : "";
  if (!n) return { data:d, added:false, reason:"empty" };
  if (n.length>40) return { data:d, added:false, reason:"long" };
  if (d.accounts.length>=ACC_MAX) return { data:d, added:false, reason:"full" };
  if (d.accounts.some(a=>lc(a.name)===lc(n))) return { data:d, added:false, reason:"dup" };
  const amt=Number(openingAmount||0); if (!Number.isFinite(amt) || Math.abs(amt)>=1e12) return { data:d, added:false, reason:"amount" };
  const id=newAccId("a_",new Set(d.accounts.map(a=>a.id)));
  return { data:cleanAccountData({ accounts:[...d.accounts,{ id, name:n, kind, opening:{ amount:amt, date:openingDate||"" }, hidden:false }], transfers:d.transfers }), added:true, reason:"", id };
}
// Rename an account and/or set its opening amount (the date of the opening stays, or becomes the given date when it had none).
export function editAccount(data, id, name, openingAmount, openingDate) {
  const d=cleanAccountData(data), cur=d.accounts.find(a=>a.id===id);
  if (!cur) return { data:d, edited:false, reason:"account" };
  const n=typeof name==="string" ? name.trim().replace(/\s+/g," ") : "";
  if (!n) return { data:d, edited:false, reason:"empty" };
  if (n.length>40) return { data:d, edited:false, reason:"long" };
  if (d.accounts.some(a=>a.id!==id && lc(a.name)===lc(n))) return { data:d, edited:false, reason:"dup" };
  const amt=Number(openingAmount); if (!Number.isFinite(amt) || Math.abs(amt)>=1e12) return { data:d, edited:false, reason:"amount" };
  const accounts=d.accounts.map(a=>a.id!==id ? a : { ...a, name:n, opening:{ amount:Math.round(amt*100)/100, date:a.opening.date||openingDate||"" } });
  return { data:cleanAccountData({ accounts, transfers:d.transfers }), edited:true, reason:"" };
}
export function addTransfer(data, from, to, amount, date, note="") {
  const d=cleanAccountData(data), c=centsOf(amount);
  if (!d.accounts.some(a=>a.id===from) || !d.accounts.some(a=>a.id===to)) return { data:d, added:false, reason:"account" };
  if (from===to) return { data:d, added:false, reason:"same" };
  if (!(c>0)) return { data:d, added:false, reason:"amount" };
  if (!isValidDateStr(date)) return { data:d, added:false, reason:"date" };
  if (d.transfers.length>=TRANSFER_MAX) return { data:d, added:false, reason:"full" };
  const id=newAccId("t_",new Set(d.transfers.map(x=>x.id)));
  return { data:cleanAccountData({ accounts:d.accounts, transfers:[{ id, from, to, amount:c/100, date, note },...d.transfers] }), added:true, reason:"", id };
}
// Removing an account is refused while any entry or transfer uses it (hide it instead), so nothing is ever orphaned silently.
// ─── Run 57: linking older entries to an account (optional; the person decides; Undo) ───────────────────────────────────────────────
// Entries recorded before accounts existed say only "Cash" or "Bank card". When the person has exactly ONE account of that kind, the app can
// offer to link those entries to it, so its balance and its list include them. Money rules:
//   - Only entries with no account at all and an old wallet of the matching kind (cash -> cash account; bank card -> card or credit-card
//     account; mobile wallet -> mobile-wallet account). Nothing else is ever touched; the old wallet field and the ids stay exactly as they are.
//   - Entries dated BEFORE the account's opening date are never linked: the opening balance the person typed already includes them.
//   - The balance before and after is worked out first and shown, because linking changes it.
const LINK_WALLET_FOR={ cash:"cash", card:"card", credit:"card", wallet:"mobile" };
export function linkCandidates(data, transactions, accountId, asOf) {
  const d=cleanAccountData(data), acc=d.accounts.find(a=>a.id===accountId), list=Array.isArray(transactions)?transactions:[];
  if (!acc || !LINK_WALLET_FOR[acc.kind]) return null;
  const want=LINK_WALLET_FOR[acc.kind];
  if (d.accounts.filter(a=>!a.hidden && LINK_WALLET_FOR[a.kind]===want).length!==1 || acc.hidden) return null;   // never guess between two accounts
  const from=acc.opening.date||"";
  let before=0; const ids=[];
  list.forEach(x=>{ if (!x || accId(x.account) || (WALLET_GROUP[walletId(x.wallet)]||"")!==want) return; if (from && String(x.date)<from) { before++; return; } ids.push(x.id); });
  if (!ids.length) return null;
  const idSet=new Set(ids.map(String)), after=list.map(x=>x && idSet.has(String(x.id)) ? { ...x, account:accountId } : x);
  return { account:acc, kind:want, ids, skippedBefore:before, hasOpeningDate:!!from,
    balanceBefore:accountBalances(d,list,asOf)[accountId]||0, balanceAfter:accountBalances(d,after,asOf)[accountId]||0 };
}
export function applyLink(transactions, ids, accountId) {
  const idSet=new Set((ids||[]).map(String));
  return (transactions||[]).map(x=>x && idSet.has(String(x.id)) && !accId(x.account) ? { ...x, account:accountId } : x);
}
// Undo against the list as it is NOW: the link is removed only where it is still exactly the one added (later edits are kept).
export function undoLink(transactions, ids, accountId) {
  const idSet=new Set((ids||[]).map(String));
  return (transactions||[]).map(x=>{ if (!x || !idSet.has(String(x.id)) || x.account!==accountId) return x; const { account, ...rest }=x; return rest; });
}
export function accountInUse(data, id, transactions) { const d=cleanAccountData(data); return (transactions||[]).some(x=>x && x.account===id) || d.transfers.some(x=>x.from===id||x.to===id); }
// ─── Debts and loans (Run 17) ─────────────────────────────────────────────────
// Informal DEBTS (person to person) and formal LOANS (a rate and a schedule). All money is whole qapik (integers); interest is rounded
// half-up to the qapik each month. Stored under their own key, so the main saved-data key is never touched by this feature. The
// remaining balance of a debt is always derived from its payments, never stored. The schedule of a loan is an ESTIMATE from the terms
// the person typed: the bank's contract (its effective rate, day count and fees) is what counts, so a typed bank payment overrides ours.
const DEBTS_KEY="expense_ledger_v5__debts";
export const LOAN_RATE_TYPES=["annuity","equal","flat","none"], LOAN_KINDS=["cash","card","taksit","other"], MAX_DEBTS=200, MAX_LOANS=100, MAX_QAPIK=1e12;
export const isQapik=(v)=>Number.isInteger(v) && v>0 && v<=MAX_QAPIK;
function loanDate(first, i) {   // same day of the month, shortened to the month's last day when it is shorter (no drift)
  const [y,m,d]=first.split("-").map(Number); const idx=(m-1)+i, yy=y+Math.floor(idx/12), mm=((idx%12)+12)%12;
  const day=Math.min(d,new Date(yy,mm+1,0).getDate());
  return `${String(yy).padStart(4,"0")}-${String(mm+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
export function loanSchedule(l) {
  if (!isPlainObject(l) || !isQapik(l.principal) || !Number.isInteger(l.months) || l.months<1 || l.months>600 || !LOAN_RATE_TYPES.includes(l.rateType)) return null;
  const rate=l.rateType==="none" ? 0 : l.ratePct;
  if (typeof rate!=="number" || !Number.isFinite(rate) || rate<0 || rate>100) return null;
  if (typeof l.firstPayment!=="string" || !isValidDateStr(l.firstPayment)) return null;
  if (l.bankPayment!==null && l.bankPayment!==undefined && !isQapik(l.bankPayment)) return null;
  const P=l.principal, n=l.months, r=rate/1200, rows=[];
  let bal=P;
  const push=(i,payment,interest,principal)=>{ bal-=principal; rows.push({ n:i, date:loanDate(l.firstPayment,i-1), payment, interest, principal, balance:bal }); };
  if (l.rateType==="annuity") {
    const A=(l.bankPayment>0) ? l.bankPayment : (r===0 ? Math.round(P/n) : Math.round(P*r/(1-Math.pow(1+r,-n))));
    for (let i=1;i<=n && bal>0;i++) {
      const interest=Math.round(bal*r);
      if (i===n || A-interest>=bal) { push(i,bal+interest,interest,bal); break; }
      if (A<=interest) return null;                       // the payment never reduces the balance: refuse instead of inventing a plan
      push(i,A,interest,A-interest);
    }
  } else if (l.rateType==="equal") {
    const pr=Math.round(P/n);
    for (let i=1;i<=n && bal>0;i++) { const interest=Math.round(bal*r), part=(i===n||pr>=bal) ? bal : pr; push(i,part+interest,interest,part); }
  } else if (l.rateType==="flat") {
    const I=Math.round(P*rate/100*n/12), total=P+I, pay=Math.round(total/n), ip=Math.round(I/n);
    let paid=0, intPaid=0;
    for (let i=1;i<=n;i++) { const last=i===n, payment=last ? total-paid : pay, interest=last ? I-intPaid : ip; paid+=payment; intPaid+=interest; push(i,payment,interest,payment-interest); }
  } else {
    const base=Math.floor(P/n);
    for (let i=1;i<=n;i++) { const payment=i===n ? bal : base; push(i,payment,0,payment); }
  }
  const totalInterest=rows.reduce((s,p)=>s+p.interest,0), totalPaid=rows.reduce((s,p)=>s+p.payment,0);
  return { payments:rows, totalInterest, totalPaid };
}
// The yearly rate (in %) on the FALLING balance that an equal payment implies: used to show what "18% flat" really costs.
export function impliedNominalPct(principal, months, payment) {
  const pv=(r)=>{ let s=0; for (let k=1;k<=months;k++) s+=payment/Math.pow(1+r,k); return s; };
  let lo=0, hi=1; if (pv(0)<principal) return null;
  for (let i=0;i<80;i++) { const mid=(lo+hi)/2; if (pv(mid)>principal) lo=mid; else hi=mid; }
  return ((lo+hi)/2)*1200;
}
// Run 20 (coach R12): what an extra payment made now would change, with the regular payment kept as it is. An ESTIMATE on the typed terms, for
// annuity loans only (the other repayment types do not shorten the same way). Returns null when it cannot say something true: other loan
// types, an invalid amount, a loan already paid, or an extra payment that would clear the whole balance (then the loan is simply paid off).
export function loanExtraEffect(l, extra) {
  const sc=loanSchedule(l); if (!sc || l.rateType!=="annuity" || !isQapik(extra)) return null;
  const k=Math.min(Array.isArray(l.payments)?l.payments.length:0, sc.payments.length);
  if (k>=sc.payments.length) return null;
  const bal0=k===0 ? l.principal : sc.payments[k-1].balance;
  if (extra>=bal0) return null;
  const rows=sc.payments.slice(k), origMonths=rows.length, origInterest=rows.reduce((s,p)=>s+p.interest,0);
  const A=sc.payments[0].payment, r=(l.ratePct||0)/1200;
  let bal=bal0-extra, months=0, interest=0;
  while (bal>0) {
    const i=Math.round(bal*r); months++; interest+=i;
    if (months>origMonths) return null;
    if (A-i>=bal) break;                 // the last payment is whatever is left
    if (A<=i) return null;               // the payment never reduces the balance: say nothing rather than invent a plan
    bal-=A-i;
  }
  return { monthsSaved:origMonths-months, interestSaved:origInterest-interest, newMonths:months, origMonths };
}
export function debtRemaining(d) { return Math.max(0,d.principal-(d.payments||[]).reduce((s,p)=>s+p.amount,0)); }
export function debtCanPay(d, amount) { return isQapik(amount) && amount<=debtRemaining(d); }
// Run 28: net position = money in the visible accounts + money people owe you − what you owe − what is left on your loans. All in whole cents
// (the debts store keeps cents as integers, so there is no unit conversion). Loan balances come from the repayment schedule after the payments
// recorded so far, so they are ESTIMATES (an extra payment or a bank's own rounding can move them). Returns null when there is nothing owed
// either way, so a screen can stay quiet instead of repeating the accounts total.
export function loanRemainingCents(l) {
  const sc=loanSchedule(l); if (!sc) return 0;
  const k=Math.min(Array.isArray(l.payments)?l.payments.length:0, sc.payments.length);
  return k>=sc.payments.length ? 0 : k===0 ? l.principal : Math.max(0,sc.payments[k-1].balance);
}
export function netPosition(accountData, transactions, debtData, asOf) {
  const a=cleanAccountData(accountData), debts=cleanDebtData(debtData), bal=accountBalances(a,transactions,asOf);
  const accounts=a.accounts.filter(x=>!x.hidden).reduce((s,x)=>s+Math.round((bal[x.id]||0)*100),0);
  const owedToMe=debts.debts.filter(x=>x.direction==="owed").reduce((s,x)=>s+debtRemaining(x),0);
  const iOwe=debts.debts.filter(x=>x.direction==="owe").reduce((s,x)=>s+debtRemaining(x),0);
  const loans=debts.loans.reduce((s,x)=>s+loanRemainingCents(x),0);
  if (!owedToMe && !iOwe && !loans) return null;
  return { accounts, owedToMe, iOwe, loans, net:accounts+owedToMe-iOwe-loans };
}
function cleanPayments(list, withTxn) {
  if (!Array.isArray(list)) return [];
  const seen=new Set(), out=[];
  list.forEach(p=>{
    if (!isPlainObject(p) || typeof p.id!=="string" || !p.id.trim() || p.id.length>64 || seen.has(p.id) || typeof p.date!=="string" || !isValidDateStr(p.date) || !isQapik(p.amount)) return;
    seen.add(p.id);
    out.push({ id:p.id, date:p.date, amount:p.amount, ...(withTxn && (typeof p.txnId==="number"||typeof p.txnId==="string") && String(p.txnId).length<=64 ? { txnId:p.txnId } : {}) });
  });
  return out;
}
const cleanText=(v,max)=>typeof v==="string" ? Array.from(v.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim()).slice(0,max).join("") : "";
export function cleanDebtData(raw) {
  const out={ debts:[], loans:[] };
  if (!isPlainObject(raw)) return out;
  const ids=new Set();
  (Array.isArray(raw.debts)?raw.debts:[]).forEach(d=>{
    if (out.debts.length>=MAX_DEBTS || !isPlainObject(d) || typeof d.id!=="string" || !d.id.trim() || d.id.length>64 || ids.has("d:"+d.id)) return;
    const name=cleanText(d.name,60);
    if (!name || !["owe","owed"].includes(d.direction) || !isQapik(d.principal)) return;
    ids.add("d:"+d.id);
    out.debts.push({ id:d.id, direction:d.direction, name, principal:d.principal, dueDate:(typeof d.dueDate==="string" && isValidDateStr(d.dueDate)) ? d.dueDate : "", note:cleanText(d.note,120), payments:cleanPayments(d.payments,true) });
  });
  (Array.isArray(raw.loans)?raw.loans:[]).forEach(l=>{
    if (out.loans.length>=MAX_LOANS || !isPlainObject(l) || typeof l.id!=="string" || !l.id.trim() || l.id.length>64 || ids.has("l:"+l.id)) return;
    const lender=cleanText(l.lender,60); if (!lender) return;
    const c={ id:l.id, lender, kind:LOAN_KINDS.includes(l.kind)?l.kind:"other", principal:l.principal, ratePct:l.rateType==="none"?0:l.ratePct, rateType:l.rateType, months:l.months, firstPayment:l.firstPayment, bankPayment:isQapik(l.bankPayment)?l.bankPayment:null, payments:cleanPayments(l.payments,true) };
    if (loanSchedule(c)===null) return;
    ids.add("l:"+l.id); out.loans.push(c);
  });
  return out;
}
export function readDebts() { try { const r=localStorage.getItem(DEBTS_KEY); return cleanDebtData(r ? JSON.parse(r) : null); } catch { return { debts:[], loans:[] }; } }
// Run 18: unreadable or corrupt debts data is NEVER treated as an empty list that a later save may overwrite.
//  corrupt / unreadable: the stored value stays exactly as it is, one safe copy is kept, every write is refused (an empty write too).
//  partial (some records cannot be read): a safe copy of the original text is kept BEFORE the first write that would drop them.
let DEBTS_PRESERVED=null;   // the raw text last kept as a safe copy, so repeated saves do not pile up copies
export function debtsHealth() {
  let raw; try { raw=localStorage.getItem(DEBTS_KEY); } catch { return { status:"unreadable", dropped:0, raw:null }; }
  if (raw===null || raw===undefined) return { status:"missing", dropped:0, raw:null };
  let parsed; try { parsed=JSON.parse(raw); } catch { return { status:"corrupt", dropped:0, raw }; }
  if (!isPlainObject(parsed) || (parsed.debts!==undefined && !Array.isArray(parsed.debts)) || (parsed.loans!==undefined && !Array.isArray(parsed.loans))) return { status:"corrupt", dropped:0, raw };
  const c=cleanDebtData(parsed), total=(parsed.debts||[]).length+(parsed.loans||[]).length, kept=c.debts.length+c.loans.length;
  return kept<total ? { status:"partial", dropped:total-kept, raw } : { status:"ok", dropped:0, raw };
}
export function writeDebts(data) {   // nothing to keep removes the key instead of storing an empty shell
  try {
    const h=debtsHealth();
    if (h.status==="unreadable" || h.status==="corrupt") { if (h.raw!==null && h.raw!==DEBTS_PRESERVED && preserveRaw("debts_unreadable",h.raw)) DEBTS_PRESERVED=h.raw; return false; }
    if (h.status==="partial" && h.raw!==DEBTS_PRESERVED) { if (!preserveRaw("debts_dropped",h.raw)) return false; DEBTS_PRESERVED=h.raw; }
    const c=cleanDebtData(data); if (!c.debts.length && !c.loans.length) localStorage.removeItem(DEBTS_KEY); else localStorage.setItem(DEBTS_KEY,JSON.stringify({ version:1, ...c })); return true; } catch { return false; }
}
function mergeDebtData(a, b) {
  const A=cleanDebtData(a), B=cleanDebtData(b);
  const dh=new Set(A.debts.map(d=>d.id)), lh=new Set(A.loans.map(l=>l.id));
  return cleanDebtData({ debts:[...A.debts,...B.debts.filter(d=>!dh.has(d.id))], loans:[...A.loans,...B.loans.filter(l=>!lh.has(l.id))] });
}

// ─── Financial Coach, first rules (Run 17) ────────────────────────────────────
// From the research rulebook: R0 data gate, R1 spent vs recorded income, R9 instalment due soon / overdue, R13 money owed to you is late.
// Facts with their window, never a score. A rule without enough data says so rather than showing a figure. Returns plain cards
// ({id, ...numbers}); the screen words them. Amounts from the Debts page are whole qapik.
export function calcCoach(transactions, debtData, now=new Date(), bills=[]) {
  const txns=Array.isArray(transactions)?transactions:[], dd=debtData&&typeof debtData==="object"?debtData:{};
  const todayS=localDateStr(now), t0=new Date(now); t0.setDate(t0.getDate()-29);
  const startS=localDateStr(t0), midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  const daysTo=(ds)=>{ const [y,m,d]=String(ds).split("-").map(Number); return Math.round((new Date(y,m-1,d).getTime()-midnight)/86400000); };
  const actions=[], numbers=[];
  (Array.isArray(dd.loans)?dd.loans:[]).forEach(l=>{
    const sc=loanSchedule(l), k=Array.isArray(l.payments)?l.payments.length:0;
    if (!sc || k>=sc.payments.length) return;
    const next=sc.payments[k], dt=daysTo(next.date);
    if (dt<0) actions.push({ id:"loanOverdue", lender:l.lender, amount:next.payment, date:next.date });
    else if (dt<=7) actions.push({ id:"loanDue", lender:l.lender, amount:next.payment, date:next.date });
  });
  (Array.isArray(dd.debts)?dd.debts:[]).forEach(d=>{
    if (d.direction==="owed" && d.dueDate && d.dueDate<todayS && debtRemaining(d)>0) actions.push({ id:"owedLate", name:d.name, amount:debtRemaining(d), date:d.dueDate });
  });
  const win=txns.filter(x=>x.date>=startS && x.date<=todayS), future=txns.filter(x=>x.date>todayS).length;
  if (win.length>0) {
    const days=new Set(win.map(x=>x.date)).size;
    if (days<14 || win.length<15) numbers.push({ id:"incomplete", days });
    else {
      const inc=win.filter(x=>x.type==="income").reduce(addAmt,0), exp=win.filter(x=>x.type==="expense").reduce(addAmt,0);
      if (!(inc>0)) numbers.push({ id:"noIncome" });
      else { const pct=Math.round(exp/inc*100); numbers.push(exp<=inc ? { id:"spent", pct, kept:100-pct } : { id:"over", pct:Math.max(101,pct) }); }
    }
  }
  if (future>0) numbers.push({ id:"future", n:future });
  // Run 18 (rulebook R8, R11, R14, R15). Only what was entered; thresholds are design defaults (45% and 70%), not legal limits.
  const past=txns.filter(x=>x.date<=todayS);
  if (past.length>0) {
    const last=past.reduce((m,x)=>x.date>m?x.date:m,"0000-00-00");
    if (daysTo(last)<-3) numbers.unshift({ id:"welcome" });
  }
  const monKey=(d)=>d.getFullYear()*12+d.getMonth(), curK=monKey(now);
  const incBy={}; let firstK=null;
  past.forEach(x=>{ const [y,m]=String(x.date).split("-").map(Number); const k=y*12+(m-1); if (firstK===null||k<firstK) firstK=k; if (x.type==="income" && isEarnedCat(x.category)) incBy[k]=Math.round(((incBy[k]||0)+(Number(x.amount)||0))*100)/100; });
  if (firstK!==null) {
    const from=Math.max(firstK,curK-6), months=[]; for (let k=from;k<curK;k++) months.push(k);
    if (months.length>=4) {
      const vals=months.map(k=>incBy[k]||0), avg=vals.reduce((a,b)=>a+b,0)/vals.length, low=Math.min(...vals);
      if (avg>0 && low<0.7*avg) numbers.push({ id:"incomeDip", have:vals.filter(v=>v>0).length, of:vals.length, pct:Math.round(low/avg*100) });
      const loans=(Array.isArray(dd.loans)?dd.loans:[]).map(l=>({ sc:loanSchedule(l), k:Array.isArray(l.payments)?l.payments.length:0 })).filter(o=>o.sc&&o.k<o.sc.payments.length);
      if (avg>0 && loans.length) {
        const monthly=loans.reduce((s,o)=>s+o.sc.payments[o.k].payment,0)/100, pct=Math.round(monthly/avg*100);
        numbers.push({ id:pct>=45?"loanShareHigh":"loanShare", pct });
      }
    }
  }
  (Array.isArray(dd.loans)?dd.loans:[]).forEach(l=>{
    const sc=loanSchedule(l), k=Array.isArray(l.payments)?l.payments.length:0;
    if (!sc || k>=sc.payments.length-1) return;
    const row=sc.payments[k]; if (row.interest>=row.payment && row.interest>0) numbers.push({ id:"noCover", lender:l.lender });
  });
  // Run 18g (rulebook R3): the monthly estimate of active expense bills against the average income of up to six completed months
  // (at least two months with income recorded). A fact, with no threshold; paused bills and income schedules are left out.
  if (firstK!==null) {
    const from=Math.max(firstK,curK-6), vals=[]; for (let k=from;k<curK;k++) vals.push(incBy[k]||0);
    const avg=vals.length>=2 ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    const monthly=buildSchedules(txns,Array.isArray(bills)?bills:[]).filter(s=>s.isActive&&s.type==="expense"&&s.billId).reduce((a,s)=>a+scheduleMonthly(s),0);
    if (avg>0 && monthly>0 && vals.filter(v=>v>0).length>=2) numbers.push({ id:"billsShare", pct:Math.round(monthly/avg*100) });
  }
  // Run 18f (rulebook R7, R10). R7: a category this month at least 50% (and 20 or more) above its average of the three earlier months,
  // only with all three earlier months present; the biggest rise only. R10: interest still to pay on each running loan (qapik).
  {
    const spend=forSpending(past.filter(x=>x.type==="expense")), byCat={}, seen=new Set();
    spend.forEach(x=>{ const [y,m]=String(x.date).split("-").map(Number); const k=y*12+(m-1); seen.add(k); if (!byCat[x.category]) byCat[x.category]={}; byCat[x.category][k]=Math.round(((byCat[x.category][k]||0)+(Number(x.amount)||0))*100)/100; });
    if ([1,2,3].every(i=>seen.has(curK-i))) {
      let best=null;
      Object.keys(byCat).forEach(c=>{
        // Whole cents, no division: "at least 50% above the average of 3 months" is 2×current ≥ sum of the 3 months, and "20 or more above" is 3×current − sum ≥ 60.
        const curC=Math.round((byCat[c][curK]||0)*100), prevC=[1,2,3].reduce((s,i)=>s+Math.round((byCat[c][curK-i]||0)*100),0);
        if (prevC>0 && 2*curC>=prevC && 3*curC-prevC>=6000 && (!best || (3*curC-prevC)/3>best.d)) best={ d:(3*curC-prevC)/3, id:"catUp", cat:c, pct:Math.round((curC*3/prevC-1)*100) };
      });
      if (best) numbers.push({ id:best.id, cat:best.cat, pct:best.pct });
    }
  }
  (Array.isArray(dd.loans)?dd.loans:[]).forEach(l=>{
    const sc=loanSchedule(l), k=Array.isArray(l.payments)?l.payments.length:0;
    if (!sc || k>=sc.payments.length) return;
    const amount=sc.payments.slice(k).reduce((s,p)=>s+(Number(p.interest)||0),0);
    if (amount>0) numbers.push({ id:"loanInterest", lender:l.lender, amount:Math.round(amount) });
  });
  // Run 41 (owner wishlist 8 Nov): two facts from entered data only, no new stored fields.
  // microSpill: this month so far, expenses under 10 (cents compared); shown from 10 of them. total is whole qapik.
  // priceUp: one merchant charged in each of the last three months; the two older charges are equal and the newest is 1%-50% higher
  // and falls in the last 45 days. Amounts compared in whole cents. Refunds are netted by forSpending first.
  {
    const spend=forSpending(past.filter(x=>x.type==="expense")), monthPrefix=todayS.slice(0,7);
    const micro=spend.filter(x=>String(x.date).slice(0,7)===monthPrefix && Math.round((Number(x.amount)||0)*100)<1000 && Math.round((Number(x.amount)||0)*100)>0);
    if (micro.length>=10) numbers.push({ id:"microSpill", n:micro.length, total:micro.reduce((s,x)=>s+Math.round((Number(x.amount)||0)*100),0) });
    const byM={};
    spend.forEach(x=>{ const m=norm(x.merchant); if (!m) return; const [y,mo]=String(x.date).split("-").map(Number); (byM[m]||(byM[m]=[])).push({ k:y*12+(mo-1), date:x.date, c:Math.round((Number(x.amount)||0)*100), name:txt(x.merchant).trim() }); });
    let top=null;
    Object.keys(byM).forEach(m=>{
      const rows=byM[m].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0), perMonth=[];
      rows.forEach(r=>{ const l=perMonth[perMonth.length-1]; if (l && l.k===r.k) perMonth[perMonth.length-1]=r; else perMonth.push(r); });
      if (perMonth.length<3) return;
      const [a,b,c]=perMonth.slice(-3);
      if (b.k!==a.k+1 || c.k!==b.k+1 || a.c<=0 || a.c!==b.c || c.c<=a.c || c.c*100>a.c*150 || c.c*100<a.c*101) return;
      if (daysTo(c.date)<-45) return;
      const d=c.c-a.c; if (!top || d>top.d) top={ d, id:"priceUp", merchant:c.name, from:a.c, to:c.c, pct:Math.round((c.c/a.c-1)*100) };
    });
    if (top) numbers.push({ id:top.id, merchant:top.merchant, from:top.from, to:top.to, pct:top.pct });
    // lifestyle: the last three completed months against the three before them (all six must have an entry). Income is earned income only.
    // Shown when income rose 5% or more, spending rose too, and spending took at least half of the extra income (cents, no division until the end).
    const spendBy={}, anyBy={};
    spend.forEach(x=>{ const [y,m]=String(x.date).split("-").map(Number), k=y*12+(m-1); spendBy[k]=(spendBy[k]||0)+Math.round((Number(x.amount)||0)*100); });
    past.forEach(x=>{ const [y,m]=String(x.date).split("-").map(Number); anyBy[y*12+(m-1)]=true; });
    const ks=[1,2,3,4,5,6].map(i=>curK-i);
    if (ks.every(k=>anyBy[k])) {
      const sumC=(arr,f)=>arr.reduce((s,k)=>s+f(k),0), recent=ks.slice(0,3), older=ks.slice(3), incC=(k)=>Math.round((incBy[k]||0)*100), spC=(k)=>spendBy[k]||0;
      const incR=sumC(recent,incC), incO=sumC(older,incC), spR=sumC(recent,spC), spO=sumC(older,spC);
      if (incO>0 && incR*100>=incO*105 && spO>0 && spR>spO && (spR-spO)*2>=(incR-incO))
        numbers.push({ id:"lifestyle", inc:Math.round((incR/incO-1)*100), spend:Math.round((spR/spO-1)*100), share:Math.round((spR-spO)/(incR-incO)*100) });
    }
    // windfall: the largest one-off income (gift, other income, sales; not recurring, not tied to a bill) of the last 7 days, so it gets a purpose before it is spent.
    let wind=null;
    past.forEach(x=>{ if (x.type!=="income" || x.recurring || x.billId || !["giftin","income","sales"].includes(x.category) || daysTo(x.date)<-7) return; const c=Math.round((Number(x.amount)||0)*100); if (c>0 && (!wind || c>wind.amount)) wind={ id:"windfall", amount:c, cat:x.category }; });
    if (wind) numbers.push(wind);
    // month end: in the last three days of the month, earned income so far minus spending so far is still above 10: say how much is unspent, once.
    {
      const last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
      if (now.getDate()>=last-2) {
        const earned=Math.round((incBy[curK]||0)*100), spent=spend.filter(x=>String(x.date).slice(0,7)===monthPrefix).reduce((s,x)=>s+Math.round((Number(x.amount)||0)*100),0);
        if (earned-spent>=1000) numbers.push({ id:"monthLeft", amount:earned-spent });
      }
    }
    // income hill: last completed month's earned income at least 50% above the average of the previous months (at least three of them, each with income)
    const prior=[2,3,4,5,6].map(i=>curK-i).filter(k=>(incBy[k]||0)>0), lastInc=Math.round((incBy[curK-1]||0)*100);
    if (prior.length>=3 && lastInc>0) {
      const avg=prior.reduce((s,k)=>s+Math.round(incBy[k]*100),0)/prior.length;
      if (lastInc>=avg*1.5) numbers.push({ id:"incomeHill", pct:Math.round((lastInc/avg-1)*100) });
    }
  }
  return [...actions.sort((a,b)=>(a.id==="loanOverdue"?0:1)-(b.id==="loanOverdue"?0:1)), ...numbers];
}
function isBillId(v) { return typeof v==="string" && v.trim()!=="" && v.trim().length<=64; }

// "Hide amounts" is remembered until the user changes it (Run 20, owner request): it is a preference, kept under its own key like the other
// side settings, so the ledger key is not touched. An unreadable or blocked store simply means "off".
// ─── Colour themes (Run 25, owner-supplied palettes) ───────────────────────────────────────────────────────────────────────────────
// A theme is a set of overrides for the CSS colour variables, applied to the page root; "sea" (the original look) has none. The choice
// is a plain preference in its own storage key (not in the ledger, so backups and imports never touch it). Meaning colours (income,
// spending, warning) stay readable on every theme: tests/logic/run25themes checks the contrast of every text colour on every surface.
const THEME_KEY=`${KEY}__theme`;
const DARK_MEANING={ "--violet":"#B3A1FF","--info":"#83B9F5","--pos":"#8BD97A","--pos-bg":"#173622","--neg":"#FF8188","--neg-bg":"#3B1C22","--warn":"#F0C46F","--warn-bg":"#352B14" };
export const THEMES={
  sea:{ swatch:["#07151A","#4CC9C4"], dark:true, vars:{} },
  nordic:{ swatch:["#1F2933","#A68A64"], dark:true, vars:{ ...DARK_MEANING,
    "--bg":"#171E26","--bg-card":"#1F2933","--bg-warm":"#2B3745","--bg-inset":"#232D39","--ink":"#F7F7F2","--ink-2":"#E2E3DE","--ink-3":"#B3B8BF","--ink-4":"#A0A7AF","--ink-5":"#3A4756",
    "--rule":"#34414F","--rule-2":"#4B5B6C","--accent":"#C2A57C","--accent-light":"#3A3226","--accent-mid":"#D6BE9C","--accent-text":"#C2A57C","--accent-fill":"#A68A64","--on-accent":"#14181D" } },
  mist:{ swatch:["#DEDCDC","#57707A"], dark:false, vars:{
    "--bg":"#DEDCDC","--bg-card":"#EDEBEB","--bg-warm":"#D9D7D9","--bg-inset":"#E6E4E4","--ink":"#191D23","--ink-2":"#2D333B","--ink-3":"#4A525C","--ink-4":"#4B5661","--ink-5":"#B5B7BD",
    "--rule":"#C6C4C6","--rule-2":"#A9AAB0","--accent":"#3A535D","--accent-light":"#CFD9DE","--accent-mid":"#57707A","--accent-text":"#3A535D","--accent-fill":"#57707A","--on-accent":"#FFFFFF",
    "--violet":"#5B43C7","--info":"#1F5A9E","--pos":"#1B6B3A","--pos-bg":"#D5E6D1","--neg":"#A8360A","--neg-bg":"#F0D6D3","--warn":"#7A5200","--warn-bg":"#EBDDB9" } },
  dusk:{ swatch:["#0B132B","#D97706"], dark:true, vars:{ ...DARK_MEANING,
    "--bg":"#0B132B","--bg-card":"#1C2541","--bg-warm":"#26365A","--bg-inset":"#16203D","--ink":"#FBF1E3","--ink-2":"#EAD9C0","--ink-3":"#B7C3D9","--ink-4":"#A3B0C8","--ink-5":"#3A506B",
    "--rule":"#2C3A5E","--rule-2":"#46608A","--accent":"#F0A44B","--accent-light":"#38281A","--accent-mid":"#F4D6B0","--accent-text":"#F0A44B","--accent-fill":"#D97706","--on-accent":"#0B132B" } },
  // Run 42 (owner: "Sapphire and Cocoa are too much, I don't like them"): replaced by two quieter palettes. Graphite is a neutral near-black with a
  // warm-white accent (calm, easy on the eyes at night); Sand is a warm light theme (the only other light theme, Mist, is cool grey).
  graphite:{ swatch:["#121315","#CFC9B8"], dark:true, vars:{ ...DARK_MEANING,
    "--bg":"#121315","--bg-card":"#1B1D20","--bg-warm":"#272A2F","--bg-inset":"#202327","--ink":"#F4F5F6","--ink-2":"#DEE0E3","--ink-3":"#B0B5BC","--ink-4":"#9EA4AC","--ink-5":"#3C4148",
    "--rule":"#2D3036","--rule-2":"#4A4F57","--accent":"#D9D4C7","--accent-light":"#2B2A26","--accent-mid":"#E6E2D6","--accent-text":"#D9D4C7","--accent-fill":"#BDB7A6","--on-accent":"#121315" } },
  sand:{ swatch:["#EFE8DB","#8A4B14"], dark:false, vars:{
    "--bg":"#EFE8DB","--bg-card":"#F8F4EA","--bg-warm":"#E6DECE","--bg-inset":"#F1EBDF","--ink":"#231F18","--ink-2":"#3A342A","--ink-3":"#554D3F","--ink-4":"#5A5244","--ink-5":"#C4BAA7",
    "--rule":"#DCD3C1","--rule-2":"#BDB29C","--accent":"#7A4410","--accent-light":"#EAD9BF","--accent-mid":"#A8691F","--accent-text":"#7A4410","--accent-fill":"#8A4B14","--on-accent":"#FFFFFF",
    "--violet":"#5B43C7","--info":"#1F5A9E","--pos":"#1B6B3A","--pos-bg":"#D9E6D0","--neg":"#A8360A","--neg-bg":"#F0D9D0","--warn":"#7A5200","--warn-bg":"#EBDDB9" } },
};
export const THEME_IDS=Object.keys(THEMES);
// Anyone who had picked a removed theme (or a backup that names one) lands on the closest remaining one instead of the default.
const LEGACY_THEMES={ sapphire:"dusk", cocoa:"nordic" };
const themeId=(v)=>typeof v==="string" && Object.prototype.hasOwnProperty.call(THEMES,v) ? v : (typeof v==="string" && Object.prototype.hasOwnProperty.call(LEGACY_THEMES,v) ? LEGACY_THEMES[v] : "sea");
export function readTheme() { try { return themeId(localStorage.getItem(THEME_KEY)); } catch { return "sea"; } }
export function writeTheme(id) { try { if (themeId(id)==="sea") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY,themeId(id)); return true; } catch { return false; } }
export function applyTheme(id) {   // sets (or clears) the colour variables on the page root; safe to call before the app renders
  if (typeof document==="undefined" || !document.documentElement) return;
  const th=THEMES[themeId(id)], root=document.documentElement, all=new Set(Object.values(THEMES).flatMap(x=>Object.keys(x.vars)));
  all.forEach(k=>root.style.removeProperty(k));
  Object.entries(th.vars).forEach(([k,v])=>root.style.setProperty(k,v));
  root.style.colorScheme=th.dark?"dark":"light"; root.setAttribute("data-theme",themeId(id));
  const m=document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content",th.vars["--bg"]||th.swatch[0]);
}
if (typeof document!=="undefined") applyTheme(readTheme());
if (typeof document!=="undefined") startLaunch();   // Run 40: the opening mark (screens/launch.js); after the theme, so it takes the theme's colours
// Run 40 (owner: "Yes, I meant visitor counting - add it"): the Android app counts its own opening with the website's Vercel Web Analytics.
// The app's page lives at https://localhost inside the phone, and Vercel's collector does not accept data from another address, so the app
// loads one tiny page of the live site (public/app-open.html) in an invisible frame; that page counts itself like any website visit.
// Once per app start, 4 s after opening (never slows the start), only inside the Android app, nothing from the ledger in the address.
// No connection = nothing happens. Described in Privacy (info.privacy.3.hA / 3.bA).
export const APP_OPEN_URL=PUBLIC_URL+"app-open.html", APP_OPEN_DELAY=4000;
export function countAppOpen(win=typeof window!=="undefined"?window:null) {
  try {
    if (!win || !win.LedgerNative || !win.document || !win.document.body) return false;
    const flag=KEY+"__opencounted";
    if (win.sessionStorage.getItem(flag)) return false;   // once per start (a WebView reload in the same start does not count twice)
    win.sessionStorage.setItem(flag,"1");
    const f=win.document.createElement("iframe");
    f.src=APP_OPEN_URL; f.title=""; f.tabIndex=-1; f.setAttribute("aria-hidden","true"); f.setAttribute("data-app-open","1");
    f.setAttribute("referrerpolicy","no-referrer");
    f.style.cssText="position:absolute;left:-9999px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
    win.document.body.appendChild(f);
    win.setTimeout(()=>{ try { f.remove(); } catch {} },20000);
    return true;
  } catch { return false; }
}
if (typeof window!=="undefined") window.setTimeout(()=>countAppOpen(),APP_OPEN_DELAY);

// Run 25: "Reduce effects" - a plain preference (own key). Turns off shadows and highlights; tone and hairline edges stay, so layers remain readable.
const FX_KEY=KEY+"__fx";
export function readFxOff() { try { return localStorage.getItem(FX_KEY)==="off"; } catch { return false; } }
export function writeFxOff(off) { try { if (off) localStorage.setItem(FX_KEY,"off"); else localStorage.removeItem(FX_KEY); return true; } catch { return false; } }
export function applyFx(off) { if (typeof document==="undefined" || !document.documentElement) return; if (off) document.documentElement.setAttribute("data-fx","off"); else document.documentElement.removeAttribute("data-fx"); }
if (typeof document!=="undefined") applyFx(readFxOff());
const PRIVACY_KEY=`${KEY}__privacy`;
function readPrivacy() { try { return localStorage.getItem(PRIVACY_KEY)==="1"; } catch { return false; } }
function writePrivacy(on) { try { if (on) localStorage.setItem(PRIVACY_KEY,"1"); else localStorage.removeItem(PRIVACY_KEY); return true; } catch { return false; } }

// ─── App lock (Run 19) ───────────────────────────────────────────────────────
// A PIN (4–6 digits) and, where the phone allows, a fingerprint prompt keep other people out of the app's screens. It is NOT
// encryption: the ledger stays readable in this browser's storage and the backup files are unchanged. The PIN is never stored;
// only a salted PBKDF2-SHA-256 hash is, under its own key (expense_ledger_v5__lock), which a backup never contains and an import
// never touches. Forgetting the PIN can be fixed on the lock screen (after a short wait) without deleting any record.
const LOCK_KEY=`${KEY}__lock`;
export const LOCK_TIMEOUTS=[0,1,5,15];            // minutes; 0 = lock whenever the app is left or reopened
const LOCK_ITER=150000;
export function validPin(p) { return typeof p==="string" && /^[0-9]{4,6}$/.test(p); }
export function lockSupported() { try { return typeof crypto!=="undefined" && !!crypto.subtle && typeof crypto.getRandomValues==="function"; } catch { return false; } }
function toB64(buf) { let s=""; new Uint8Array(buf).forEach(b=>{ s+=String.fromCharCode(b); }); return btoa(s); }
function fromB64(s) { const bin=atob(String(s)), out=new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
async function pinHash(pin, saltB64, iter) {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);
  return toB64(await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt:fromB64(saltB64), iterations:iter },key,256));
}
function sameText(a, b) { a=String(a); b=String(b); let d=a.length^b.length; for (let i=0;i<Math.max(a.length,b.length);i++) d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0); return d===0; }
// null = no lock; { ok:true, rec } = a lock; { ok:false } = the lock record exists but cannot be read (the lock screen then offers the reset only).
export function readLock() {
  // Storage that cannot be read at all (blocked by the browser) holds no lock to enforce, and the ledger is unreadable too: the app already
  // shows its "saving is paused" notice. Treating that as a damaged lock would lock the user out of an app that otherwise works.
  let raw; try { raw=localStorage.getItem(LOCK_KEY); } catch { return null; }
  if (raw===null) return null;
  try {
    const r=JSON.parse(raw);
    if (!isPlainObject(r) || r.v!==1 || typeof r.salt!=="string" || typeof r.hash!=="string" || !Number.isInteger(r.iter) || r.iter<1000 || r.iter>2000000) return { ok:false };
    return { ok:true, rec:{ v:1, salt:r.salt, hash:r.hash, iter:r.iter, timeout:LOCK_TIMEOUTS.includes(r.timeout)?r.timeout:0,
      bio:typeof r.bio==="string" && r.bio ? r.bio : null, len:Number.isInteger(r.len)&&r.len>=4&&r.len<=6?r.len:0, resetAt:Number.isFinite(r.resetAt)&&r.resetAt>0?r.resetAt:0, fails:Number.isInteger(r.fails)&&r.fails>0?r.fails:0, until:Number.isFinite(r.until)&&r.until>0?r.until:0 } };
  } catch { return { ok:false }; }
}
export function writeLock(rec) { try { localStorage.setItem(LOCK_KEY,JSON.stringify(rec)); return true; } catch { return false; } }
export function removeLock() { try { localStorage.removeItem(LOCK_KEY); return true; } catch { return false; } }
export async function makeLockRecord(pin, timeout=0, bio=null) {
  if (!validPin(pin) || !lockSupported()) return null;
  const salt=toB64(crypto.getRandomValues(new Uint8Array(16)));
  return { v:1, salt, hash:await pinHash(pin,salt,LOCK_ITER), iter:LOCK_ITER, timeout:LOCK_TIMEOUTS.includes(timeout)?timeout:0, bio, len:pin.length, fails:0, until:0 };
}
export async function verifyPin(rec, pin) { if (!rec || !validPin(pin) || !lockSupported()) return false; try { return sameText(await pinHash(pin,rec.salt,rec.iter),rec.hash); } catch { return false; } }
// Wrong PINs: the first four are free, then the wait doubles from 30 s up to 5 minutes. Stored, so closing the app does not reset it.
export function lockWaitMs(fails) { return fails<5 ? 0 : Math.min(300000, 30000*Math.pow(2,fails-5)); }
// When the app should lock. "away" = how long it was out of sight; "idle" = how long without a touch or key while open.
export function lockShouldEngage(timeoutMin, event, ms) {
  if (event==="away") return timeoutMin===0 ? true : ms>=timeoutMin*60000;
  if (event==="idle") return timeoutMin>0 && ms>=timeoutMin*60000;
  return false;
}
// Fingerprint through the phone's own prompt (WebAuthn "platform" authenticator, user verification required). The app has no server
// to check the result against, so this is a convenience in front of the PIN, never a replacement for it.
// Run 33 (Android app only): inside the Android app the web engine has no fingerprint prompt, so the shell offers the phone's own BiometricPrompt
// (window.LedgerNative.biometric, BiometricPlugin.java; strong biometrics only, no device-PIN fallback because this app's own PIN is the fallback).
// The lock record stores the marker below instead of a WebAuthn credential id. A marker with no shell (a backup opened in a browser) never unlocks; the PIN does.
export const screenSecureNative=()=>{ try { const n=window.LedgerNative; return n && n.screenSecure && typeof n.screenSecure.set==="function" && typeof n.screenSecure.get==="function" ? n.screenSecure : null; } catch { return null; } };
export const NATIVE_BIO="native-biometric-v1";
const nativeBio=()=>{ try { const n=window.LedgerNative; return n && n.biometric && typeof n.biometric.authenticate==="function" ? n.biometric : null; } catch { return null; } };
const bioPrompt=()=>({ title:t("lock.useBio"), cancel:t("common.cancel") });
export async function bioAvailable() { const nb=nativeBio(); if (nb) { try { return lockSupported() && (await nb.available())===true; } catch { return false; } }
  try { return typeof PublicKeyCredential!=="undefined" && !!navigator.credentials && lockSupported() && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; } }
export async function bioRegister() {
  const nb=nativeBio(); if (nb) { if ((await nb.authenticate(bioPrompt()))===true) return NATIVE_BIO; throw new Error("bio-cancelled"); }
  const cred=await navigator.credentials.create({ publicKey:{ challenge:crypto.getRandomValues(new Uint8Array(32)), rp:{ name:"Expense Ledger" },
    user:{ id:crypto.getRandomValues(new Uint8Array(16)), name:"ledger", displayName:"Expense Ledger" }, pubKeyCredParams:[{ type:"public-key", alg:-7 },{ type:"public-key", alg:-257 }],
    authenticatorSelection:{ authenticatorAttachment:"platform", userVerification:"required", residentKey:"discouraged" }, timeout:60000 } });
  return cred ? toB64(cred.rawId) : null;
}
export async function bioCheck(idB64) {
  if (idB64===NATIVE_BIO) { const nb=nativeBio(); return !!nb && (await nb.authenticate(bioPrompt()))===true; }
  const r=await navigator.credentials.get({ publicKey:{ challenge:crypto.getRandomValues(new Uint8Array(32)), allowCredentials:[{ type:"public-key", id:fromB64(idB64) }], userVerification:"required", timeout:30000 } });
  return !!r;
}

// ─── Settings contract (used for stored data AND imported backups) ───────────
// Each section is validated on its own. Invalid entries are skipped and reported; a section whose entries are ALL
// invalid is rejected so your current value is kept. Sections absent from the source are simply not returned.
// Run 12: version 10 adds explicit bills ("bills" + each payment's "billId"). Version 9 files import unchanged.
const BACKUP_VERSION = 10;
const EXPENSE_CAT_IDS = () => CATEGORIES.filter(c=>!c.income).map(c=>c.id);
function budgetKey(k) {
  const ids=EXPENSE_CAT_IDS();
  if (ids.includes(k)) return k;
  const m=CATEGORY_MAP[String(k).toLowerCase()];            // exact legacy id only — no fuzzy guessing for budgets
  return m && ids.includes(m) ? m : null;
}
function validateSettings(src) {
  const settings={}, problems=[], warnings=[];
  const has=(k)=>src[k]!==undefined && src[k]!==null;
  const ids=EXPENSE_CAT_IDS();

  if (has("budgets")) {
    if (!isPlainObject(src.budgets)) problems.push(t("settings.budgetsNotList"));
    else {
      const out={}; let bad=0; const entries=Object.entries(src.budgets);
      entries.forEach(([k,v])=>{ const id=budgetKey(k), n=parseMoney(v); if (!id||n===null) bad++; else if (out[id]===undefined) out[id]=n; });
      if (entries.length && !Object.keys(out).length) problems.push(tn("settings.budgetsAllBad",entries.length));
      else { settings.budgets=out; if (bad) problems.push(tn("settings.budgetsSomeBad",bad)); }
    }
  }
  if (has("templates")) {
    if (!Array.isArray(src.templates)) problems.push(t("settings.templatesNotList"));
    else {
      const out=[], used=new Set(); let bad=0;
      src.templates.forEach((t,i)=>{
        if (!isPlainObject(t)) { bad++; return; }
        const name=typeof t.name==="string" ? t.name.trim() : "";
        const amount=parseMoney(t.amount,{positive:true});
        const catId=typeof t.catId==="string" && ids.includes(t.catId) ? t.catId : null;
        if (!name || name.length>60 || amount===null || !catId) { bad++; return; }
        let id=typeof t.id==="string" && t.id ? t.id : `t${Date.now()}_${i}`;
        while (used.has(id)) id+="_"; used.add(id);
        out.push({ id, name, amount, catId, subcat:txt(t.subcat).slice(0,40), merchant:txt(t.merchant).slice(0,80), note:txt(t.note).slice(0,120) });
      });
      if (src.templates.length && !out.length) problems.push(tn("settings.templatesAllBad",src.templates.length));
      else { settings.templates=out; if (bad) problems.push(tn("settings.templatesSomeBad",bad)); }
    }
  }
  if (has("goals")) {
    if (!Array.isArray(src.goals)) problems.push(t("settings.goalsNotList"));
    else {
      const out=[], used=new Set(); let bad=0;
      src.goals.forEach((g,i)=>{
        if (!isPlainObject(g)) { bad++; return; }
        const name=typeof g.name==="string" ? g.name.trim() : "";
        const target=parseMoney(g.target,{positive:true});
        const saved=(g.saved===undefined||g.saved===null||g.saved==="") ? 0 : parseMoney(g.saved);
        const monthly=(g.monthlyTarget===undefined||g.monthlyTarget===null||g.monthlyTarget==="") ? 0 : parseMoney(g.monthlyTarget);
        const hasDate=!(g.targetDate===undefined||g.targetDate===null||g.targetDate==="");
        if (!name || name.length>80 || target===null || saved===null || monthly===null || (hasDate && !isValidDateStr(g.targetDate))) { bad++; return; }
        let id=typeof g.id==="string" && g.id ? g.id : `g${Date.now()}_${i}`;
        while (used.has(id)) id+="_"; used.add(id);
        out.push({ id, name, target, saved, monthlyTarget:monthly, targetDate:hasDate?g.targetDate:null });
      });
      if (src.goals.length && !out.length) problems.push(tn("settings.goalsAllBad",src.goals.length));
      else { settings.goals=out; if (bad) problems.push(tn("settings.goalsSomeBad",bad)); }
    }
  }
  if (has("bills")) {
    if (!Array.isArray(src.bills)) problems.push(t("settings.billsNotList"));
    else {
      const out=[], used=new Set(); let bad=0;
      src.bills.forEach(b=>{ const v=validateBill(b); if (!v || used.has(v.id)) { bad++; return; } used.add(v.id); out.push(v); });
      if (src.bills.length && !out.length) problems.push(tn("settings.billsAllBad",src.bills.length));
      else { settings.bills=out; if (bad) problems.push(tn("settings.billsSomeBad",bad)); }
    }
  }
  if (has("currency")) {
    const c=typeof src.currency==="string" ? src.currency.trim() : "";
    if (c && c.length<=3 && !/[\u0000-\u001f]/.test(c)) settings.currency=c;
    else problems.push(t("settings.currencyBad"));
  }
  if (has("safeToSpend")) {
    const sts=src.safeToSpend;
    const target=(isPlainObject(sts) && (sts.savingsTarget===undefined||sts.savingsTarget===null||sts.savingsTarget==="")) ? 0 : (isPlainObject(sts) ? parseMoney(sts.savingsTarget) : null);
    const enabledOk=isPlainObject(sts) && (sts.enabled===undefined || typeof sts.enabled==="boolean");
    if (isPlainObject(sts) && enabledOk && target!==null) settings.safeToSpend={ savingsTarget:target, enabled:!!sts.enabled };
    else problems.push(t("settings.safeBad"));
  }
  return { settings, problems, warnings };
}

// Reads one key: { value } (null = nothing stored) or { failed:true } when the browser refused the read. A refused read is
// never treated as "nothing stored": that would look like a fresh install and the next save would overwrite the real data.
function readKey(k) { try { return { value:localStorage.getItem(k) }; } catch { return { failed:true }; } }

function migrateAndLoad() {
  const cur=readKey(KEY);
  if (cur.failed) {
    // The data may well be there; it just cannot be read right now. Show an empty view, pause saving, migrate nothing.
    SAVE_BLOCKED=true; SAVE_BLOCKED_READ=true; noteLoad(t("load.readFailed"));
    return { ...buildState([], null), language:"en" };
  }
  const rawStr=cur.value;
  let current=null;
  // An empty string is present-but-unusable data, not absence: it goes through the corrupt path below and is preserved.
  if (rawStr!==null && rawStr!=="") { try { current=JSON.parse(rawStr); } catch { current=null; } }

  if (isPlainObject(current) && Array.isArray(current.transactions)) {
    // Interface language: a saved choice is used (and set first, so load notices appear in it). Data saved by an earlier
    // version has no "language" field: that user has been using English, so they continue in English without the
    // first-launch chooser. Only an explicit null (a fresh install that has not chosen yet) shows the chooser again.
    const language=LANGS.includes(current.language) ? current.language : (current.language===null ? null : "en");
    if (language) setLang(language);
    const v=validateSettings(current);
    if (v.problems.length) {
      const kept=preserveRaw("settings_rejected",{ budgets:current.budgets, templates:current.templates, currency:current.currency, goals:current.goals, safeToSpend:current.safeToSpend, bills:current.bills });
      if (!kept) SAVE_BLOCKED=true;
      noteLoad(t(kept ? "load.settingsResetKept" : "load.settingsResetBlocked"));
    }
    const lastBackup=(typeof current.lastBackup==="string" && !Number.isNaN(Date.parse(current.lastBackup))) ? current.lastBackup : null;
    const backupConfirmedAt=(typeof current.backupConfirmedAt==="string" && !Number.isNaN(Date.parse(current.backupConfirmedAt))) ? current.backupConfirmedAt : null;
    return {
      transactions: sanitizeTransactions(current.transactions, "rejected"),
      budgets:      v.settings.budgets     ?? {},
      templates:    v.settings.templates   ?? DEFAULT_TEMPLATES,
      currency:     v.settings.currency    ?? "₼",
      goals:        v.settings.goals       ?? [],
      safeToSpend:  v.settings.safeToSpend ?? { savingsTarget:0, enabled:false },
      bills:        v.settings.bills       ?? [],
      lastBackup,
      backupConfirmedAt,
      language,
      profileName:  cleanProfileName(current.profileName),
      setupHidden:  current.setupHidden===true,                // Run 17: the Home "Get set up" list was hidden for good
    };
  }

  // Something is stored under the current key but we cannot use it: keep a copy before anything overwrites it.
  if (rawStr!==null) {
    if (preserveRaw("corrupt", rawStr)) noteLoad(t("load.corruptKept"));
    else { SAVE_BLOCKED=true; noteLoad(t("load.corruptBlocked")); }
  }

  // Legacy key migration. Older keys are only read, never modified or removed.
  let merged=[], bestSettings=null, legacyFound=false;
  const seenIds=new Set();   // de-duplicate on the ORIGINAL id, before normalisation may replace it
  for (const k of KEYS_LEGACY) {
    const r=readKey(k);
    // A refused read could hide that version's data behind the new key written on the next save: pause saving instead.
    if (r.failed) { SAVE_BLOCKED=true; SAVE_BLOCKED_READ=true; noteLoad(t("load.legacyReadFailed")); legacyFound=true; continue; }
    if (r.value===null) continue;
    let d=null; try { d=JSON.parse(r.value); } catch { d=null; }
    if (!isPlainObject(d)) {
      // Unparseable older data stays in its key, but the new key would hide it from then on: keep a recovery copy first.
      legacyFound=true;
      if (preserveRaw(`legacy_${k}_corrupt`, r.value)) noteLoad(t("load.legacyCorruptKept"));
      else { SAVE_BLOCKED=true; noteLoad(t("load.corruptBlocked")); }
      continue;
    }
    const list=Array.isArray(d.transactions)?d.transactions:Array.isArray(d.entries)?d.entries:[];
    const bad=[];
    list.forEach(t=>{
      const reason=checkRawTxn(t);
      if (reason) { bad.push({ record:t, reason }); return; }
      const rid=(t.id!==undefined && t.id!==null && t.id!=="") ? String(t.id) : null;
      if (rid!==null && seenIds.has(rid)) return;
      if (rid!==null) seenIds.add(rid);
      merged.push(normaliseTxn(t));
    });
    setAside(`legacy_${k}_rejected`, bad.map(b=>b.record), summariseReasons(bad));
    if (d.currency||d.budgets) bestSettings=d;
  }
  merged=ensureUniqueIds(merged).list;
  merged.sort((a,b)=>b.date.localeCompare(a.date));
  // Anything found (unreadable current data or older versions' data) means an existing user → English, no chooser.
  // Nothing at all means a genuinely fresh install → language null → the first-launch chooser is shown.
  const existingUser=rawStr!==null || merged.length>0 || !!bestSettings || legacyFound;
  return { ...buildState(merged, bestSettings), language: existingUser ? "en" : null };
}

function buildState(transactions=[], settings=null) {
  // No seed data — real users start empty
  const v=isPlainObject(settings) ? validateSettings(settings) : { settings:{}, problems:[] };
  return {
    transactions,
    budgets:     v.settings.budgets     ?? {},
    templates:   v.settings.templates   ?? DEFAULT_TEMPLATES,
    currency:    v.settings.currency    ?? "₼",
    goals:       v.settings.goals       ?? [],
    safeToSpend: v.settings.safeToSpend ?? { savingsTarget:0, enabled:false },
    bills:       v.settings.bills       ?? [],
    lastBackup:  null,
    backupConfirmedAt: null,
    language:    null,
    profileName: "",
    setupHidden: false,
  };
}

// Run 17: the optional name used in the Home greeting. Plain text only: control characters removed, spaces collapsed, 30 characters at most.
// It lives in the app's own saved state and is NOT part of backups or exports (it is not financial data and a backup may be shared).
export const PROFILE_NAME_MAX=30;
export function cleanProfileName(v) {
  if (typeof v!=="string") return "";
  return Array.from(v.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim()).slice(0,PROFILE_NAME_MAX).join("").trim();
}

const DEFAULT_TEMPLATES = [
  { id:"t1",name:"Bus / Metro",    amount:0.6,  catId:"transport",subcat:"Bus",        merchant:"BakuBus",   note:"" },
  { id:"t2",name:"Manatlıq B-S",   amount:1,    catId:"transport",subcat:"Bus",        merchant:"Bus",       note:"Manatlıq B-S" },
  { id:"t3",name:"Groceries",      amount:35,   catId:"food",     subcat:"Groceries",  merchant:"Bravo",     note:"" },
  { id:"t4",name:"Coffee",         amount:4.5,  catId:"food",     subcat:"Coffee",     merchant:"",          note:"" },
  { id:"t5",name:"Football Pitch", amount:12,   catId:"entertain",subcat:"Sports",     merchant:"Pitch 14",  note:"" },
];

// ─── RFC 4180 CSV parser ──────────────────────────────────────────────────────
function parseCSV(raw) {
  const rows=[]; let row=[],field="",inQ=false,i=0;
  const s=raw.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  while (i<s.length) {
    const ch=s[i];
    if (inQ) {
      if (ch==='"'&&s[i+1]==='"') { field+='"'; i+=2; }
      else if (ch==='"') { inQ=false; i++; }
      else { field+=ch; i++; }
    } else {
      if (ch==='"') { inQ=true; i++; }
      else if (ch===',') { row.push(field.trim()); field=""; i++; }
      else if (ch==='\n') {
        row.push(field.trim()); field="";
        if (row.some(f=>f!=="")) rows.push(row);
        row=[]; i++;
      } else { field+=ch; i++; }
    }
  }
  row.push(field.trim());
  if (row.some(f=>f!=="")) rows.push(row);
  rows.unterminated=inQ;   // an opening quote that never closes would silently merge rows
  return rows;
}


// Browser download. Starting a download is all the page can know: it cannot confirm the file was kept.
// ─── Run 10: keeping the data safe ──────────────────────────────────────────────────────────────────────────────────────
// Storage protection. Unless a site asks, browsers may clear its stored data when the device runs low on space (and Safari
// clears script storage of a site not visited for 7 days unless it is on the Home Screen). persist() asks the browser to keep
// it; the browser decides (Chrome grants it to installed or often-used sites without a prompt). Returns "on" | "off" |
// "unsupported" | "unknown". It never touches the ledger data.
async function storageProtection(ask, nav=(typeof navigator!=="undefined"?navigator:null)) {
  const s=nav&&nav.storage;
  if (!s||typeof s.persisted!=="function") return "unsupported";
  try {
    if (await s.persisted()) return "on";
    if (ask&&typeof s.persist==="function") return (await s.persist()) ? "on" : "off";
    return "off";
  } catch { return "unknown"; }
}
// Sends the backup file to the phone's share menu (Google Drive, Telegram, e-mail, Files …), so a copy leaves the phone.
// "shared" (a destination was chosen — the app still can't see whether it arrived), "cancelled", or "unsupported" (no file
// sharing here; the caller then downloads the file instead).
// Run 13: inside a native shell (the Capacitor Android app) the ordinary download link does nothing, so the shell defines
// window.__ledgerNativeShare(filename, text, mime) -> "shared" | "cancelled" (or rejects). The web app uses it when it exists
// and counts only an explicit "shared" as success: anything else is "cancelled" or "failed" and is never reported as saved.
// No hook (the PWA) = the behaviour below, unchanged.
export const nativeShareHook=()=>(typeof window!=="undefined" && typeof window.__ledgerNativeShare==="function") ? window.__ledgerNativeShare : null;
async function shareViaNative(native, filename, text, mime) {
  try { const r=await native(filename, text, mime); return r==="shared" ? "shared" : r==="cancelled" ? "cancelled" : "failed"; }
  catch { return "failed"; }
}
async function shareBackupFile(text, filename, nav=(typeof navigator!=="undefined"?navigator:null), native=nativeShareHook()) {
  if (native) return shareViaNative(native, filename, text, "application/json");
  if (!nav||typeof nav.share!=="function"||typeof nav.canShare!=="function"||typeof File==="undefined") return "unsupported";
  const file=new File([text],filename,{type:"application/json"});
  try { if (!nav.canShare({files:[file]})) return "unsupported"; } catch { return "unsupported"; }
  try { await nav.share({files:[file],title:filename}); return "shared"; }
  catch (e) { return e && e.name==="AbortError" ? "cancelled" : "unsupported"; }
}

// Run 11: which version of the app a page is. The built page loads one script, /assets/index-<hash>.js; the hash changes
// with every release, so it identifies the version. null when it can't be told (the test bundle, a single-file build).
function appVersionOf(html) { const m=String(html||"").match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/); return m?m[1]:null; }
// Compares the running version with the one the site serves now. "update" only when both are known and differ, so an
// unreadable answer (offline, an error page) never nags. fetchHtml() returns the site's current page as text.
async function checkForUpdate(currentVersion, fetchHtml) {
  if (!currentVersion) return "unknown";
  try { const latest=appVersionOf(await fetchHtml()); return !latest ? "unknown" : latest===currentVersion ? "current" : "update"; }
  catch { return "unknown"; }
}

// Run 37 (owner: exported from the app to WhatsApp / Drive, but the file never showed up in Downloads): the Android app now saves a file
// straight into the phone's Downloads folder. The shell defines window.__ledgerNativeSave(filename, text, mime) -> { status:"saved", where }
// after it wrote the file AND read it back byte for byte; { status:"cancelled" } when the user closed the "Save as" picker (older Android);
// rejects on any failure. Only "saved" is ever reported as saved.
export const nativeSaveHook=()=>(typeof window!=="undefined" && typeof window.__ledgerNativeSave==="function") ? window.__ledgerNativeSave : null;
async function saveViaNative(native, filename, text, mime, pick=false) {
  try { const r=await native(filename, text, mime, pick===true); return r && r.status==="saved" ? { status:"saved", where:typeof r.where==="string" ? r.where.slice(0,200) : "", uri:typeof r.uri==="string" && /^content:\/\//.test(r.uri) ? r.uri : "", mime } : r && r.status==="cancelled" ? { status:"cancelled" } : { status:"failed" }; }
  catch { return { status:"failed" }; }
}
// Run 37b (owner: "I still can't see downloaded files anywhere"): after a save the message offers "Open" (the file itself, through the phone),
// and Import / Export offers "Show my Downloads". Both exist only in the Android app (window.__ledgerNativeOpen / __ledgerNativeDownloads).
export const nativeOpenHook=()=>(typeof window!=="undefined" && typeof window.__ledgerNativeOpen==="function") ? window.__ledgerNativeOpen : null;
export const nativeDownloadsHook=()=>(typeof window!=="undefined" && typeof window.__ledgerNativeDownloads==="function") ? window.__ledgerNativeDownloads : null;
export function downloadFile(content, mime, filename) {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const a=document.createElement("a"); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
// Keep only the newest recovery copy with this label (older ones are removed once a newer one is safely stored).
function pruneRecoveryCopies(label) {
  try {
    const prefix=`${KEY}__${label}_`, keys=[];
    for (let i=0;i<localStorage.length;i++) { const k=localStorage.key(i); if (k && k.startsWith(prefix)) keys.push(k); }
    keys.sort().slice(0,-1).forEach(k=>localStorage.removeItem(k));
  } catch {}
}

// ─── Import / export pipeline (pure: no React, no storage) ───────────────────
const CSV_COLUMNS = { date:["date"], amount:["amount","amt","value"], type:["type"], category:["category","cat"],
  categoryId:["categoryid","category id","category_id"], subcategory:["subcategory","subcat"], merchant:["merchant"],
  note:["note","notes","description","memo"], recurring:["recurring","recurfreq","frequency"], wallet:["wallet","paid with"], trip:["trip","group"], spread:["spreadmonths"] };

// Run 24: bank statements. Banks name columns differently, split money into Debit/Credit columns, use ; or tab, day-first dates and
// comma decimals. This rewrites such a file into the app's own CSV (date, amount, type, merchant, note); the normal import review,
// validation and duplicate checks then run on the result. Files the app wrote itself are never touched (they have Date + Amount).
const BANK_HEADERS = {
  date:["date","transaction date","booking date","posting date","value date","tarix","\u0259m\u0259liyyat tarixi","\u0434\u0430\u0442\u0430","\u0434\u0430\u0442\u0430 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438","\u0434\u0430\u0442\u0430 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438"],
  amount:["amount","sum","m\u0259bl\u0259\u011F","\u0441\u0443\u043C\u043C\u0430","\u0441\u0443\u043C\u043C\u0430 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438"],
  debit:["debit","withdrawal","withdrawals","paid out","money out","x\u0259rc","\u00E7\u0131x\u0131\u015F","\u0440\u0430\u0441\u0445\u043E\u0434","\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435"],
  credit:["credit","deposit","deposits","paid in","money in","g\u0259lir","m\u0259daxil","\u043F\u0440\u0438\u0445\u043E\u0434","\u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435"],
  desc:["description","details","narrative","payee","merchant","reference","t\u0259svir","t\u0259yinat","\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435","\u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0430","\u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435","\u0434\u0435\u0442\u0430\u043B\u0438"] };
function splitDelimited(text, d) {
  const rows=[]; let row=[], cur="", q=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (q) { if (c==='"') { if (text[i+1]==='"') { cur+='"'; i++; } else q=false; } else cur+=c; }
    else if (c==='"') q=true;
    else if (c===d) { row.push(cur); cur=""; }
    else if (c==="\n"||c==="\r") { if (c==="\r"&&text[i+1]==="\n") i++; row.push(cur); cur=""; if (row.some(x=>x.trim()!=="")) rows.push(row); row=[]; }
    else cur+=c;
  }
  row.push(cur); if (row.some(x=>x.trim()!=="")) rows.push(row);
  return rows;
}
function bankMoney(s) {   // "1 234,56" "1.234,56" "1,234.56" "-12,5 AZN" "(45.00)" -> cents (integer, signed) or null
  let v=String(s==null?"":s).replace(/[\u00A0\s]/g,"").trim(); if (!v) return null;
  let neg=false; if (/^\(.*\)$/.test(v)) { neg=true; v=v.slice(1,-1); }
  v=v.replace(/[^\d.,+\-]/g,""); if (/^-/.test(v)) { neg=!neg; } v=v.replace(/[+\-]/g,"");
  if (!/\d/.test(v)) return null;
  const lc=v.lastIndexOf(","), ld=v.lastIndexOf(".");
  if (lc>-1 && ld>-1) v = lc>ld ? v.replace(/\./g,"").replace(",",".") : v.replace(/,/g,"");
  else if (lc>-1) v = /,\d{1,2}$/.test(v) && v.indexOf(",")===lc ? v.replace(",",".") : v.replace(/,/g,"");
  else if (ld>-1 && v.indexOf(".")!==ld) v=v.replace(/\./g,"");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(v)) return null;
  const c=Math.round(parseFloat(v)*100); return neg ? -c : c;
}
function bankDate(s) {   // yyyy-mm-dd, dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy (day first); times ignored; real calendar dates only
  const v=String(s||"").trim(); let y,m,d, x;
  if ((x=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/))) { y=+x[1]; m=+x[2]; d=+x[3]; }
  else if ((x=v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[\sT].*)?$/))) { d=+x[1]; m=+x[2]; y=+x[3]; }
  else return null;
  const dt=new Date(y,m-1,d); if (dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d) return null;
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function bankCsvToStandard(raw) {
  const text=String(raw).replace(/^\uFEFF/,""), first=text.split(/\r?\n/,1)[0]||"";
  const d=[";","\t",","].map(c=>[c,first.split(c).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=splitDelimited(text,d); if (rows.length<2) return null;
  const hdr=rows[0].map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase());
  const col=(k)=>BANK_HEADERS[k].map(n=>hdr.indexOf(n)).find(i=>i!==-1) ?? -1;
  const ci={ date:col("date"), amount:col("amount"), debit:col("debit"), credit:col("credit"), desc:col("desc") };
  if (ci.date===-1 || (ci.amount===-1 && ci.debit===-1 && ci.credit===-1)) return null;
  const out=["date,amount,type,merchant,note"]; let skipped=0;
  rows.slice(1).forEach(r=>{
    const date=bankDate(r[ci.date]); let cents=null, type="expense";
    if (ci.amount!==-1) { const a=bankMoney(r[ci.amount]); if (a!==null && a!==0) { cents=Math.abs(a); type=a<0?"expense":"income"; } }
    if (cents===null && (ci.debit!==-1||ci.credit!==-1)) {
      const dv=ci.debit===-1?null:bankMoney(r[ci.debit]), cv=ci.credit===-1?null:bankMoney(r[ci.credit]);
      if (dv) { cents=Math.abs(dv); type="expense"; } else if (cv) { cents=Math.abs(cv); type="income"; }
    }
    if (!date || !cents) { skipped++; return; }
    const desc=ci.desc===-1?"":String(r[ci.desc]||"").trim().replace(/\s+/g," ").slice(0,80);
    const q=(s)=>`"${s.replace(/"/g,'""')}"`;
    out.push([date,(cents/100).toFixed(2),type,q(desc),'""'].join(","));
  });
  return out.length>1 ? { text:out.join("\n"), skipped } : null;
}

function parseCsvImport(raw, _bank=false) {
  const rows=parseCSV(String(raw).replace(/^\uFEFF/,""));
  if (rows.unterminated) return { error:t("csv.unterminated") };
  if (rows.length<2) return { error:t("csv.noRows") };
  const headers=rows[0].map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase());
  const idx={}; Object.entries(CSV_COLUMNS).forEach(([k,names])=>{ idx[k]=names.map(n=>headers.indexOf(n)).find(i=>i!==-1) ?? -1; });
  const missing=["date","amount"].filter(k=>idx[k]===-1);
  if (!_bank && (missing.length || (idx.date!==-1 && !/^\d{4}-\d{2}-\d{2}/.test(String(rows[1][idx.date]||"").trim())))) {   // Run 24: bank statement layouts
    const conv=bankCsvToStandard(raw); if (conv) return { ...parseCsvImport(conv.text,true), bankSkipped:conv.skipped };
  }
  if (missing.length) return { error:t(missing.length===2 ? "csv.needDateAmount" : missing[0]==="date" ? "csv.needDate" : "csv.needAmount", { found:rows[0].map(h=>h.trim()).filter(Boolean).join(", ")||t("csv.noHeaders") }) };
  // A leading apostrophe before = + - @ tab or CR is the formula guard added by buildCsv: remove it to restore the original text.
  const cell=(row,k)=>{ const v=idx[k]===-1 ? "" : String(row[idx[k]] ?? "").trim(); return /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v; };
  const records=rows.slice(1).map((row,i)=>{
    const rec=cell(row,"recurring").toLowerCase();
    const isRec=!!rec && !["no","false","0","none"].includes(rec);
    const wal=walletFromText(cell(row,"wallet"));   // Run 16: free text that is not a wallet gives none, never an error
    const trp=tripName(cell(row,"trip"));            // Run 22
    return { id:Date.now()+i+Math.random(), type:cell(row,"type"), amount:cell(row,"amount"),
      category:cell(row,"categoryId")||cell(row,"category"), subcategory:cell(row,"subcategory"), merchant:cell(row,"merchant"),
      note:cell(row,"note"), date:cell(row,"date"), recurring:isRec, recurFreq:isRec?rec:null, isActive:true, createdAt:new Date().toISOString(),
      ...(wal ? { wallet:wal } : {}), ...(trp ? { trip:trp } : {}), ...(spreadMonths(cell(row,"spread")) ? { spread:cell(row,"spread") } : {}) };   // Run 41 (normaliseTxn keeps it only on expenses)
  });
  return { records };
}

// Run 40 (8 Nov 2026), owner: a backup picked from Google Drive on the website was refused with "not valid JSON or CSV".
// The app's own files always parse, so the website was handed something else. Instead of one vague sentence, say what
// the file actually is, so the person knows what to do. Nothing is ever partly imported from a broken file.
export function badFileReason(raw) {
  const s=String(raw==null?"":raw).replace(/^﻿/,"");
  const head=s.trimStart().slice(0,400);
  if (!s.trim()) return "import.bad.empty";                                                   // 0 bytes: upload/download did not finish
  if (/^%PDF/.test(head)) return "import.bad.pdf";
  if (/^PK\u0003\u0004/.test(s)) return "import.bad.zip";                                      // .xlsx / .docx / .zip
  if (/^</.test(head) && /<(!doctype|html|head|body|\?xml|svg)/i.test(head)) return "import.bad.web";   // a web or sign-in page saved instead of the file
  const odd=(s.slice(0,2000).match(/[\u0000-\u0008\u000E-\u001F�]/g)||[]).length;
  if (odd>8) return "import.bad.binary";                                                       // a picture or other non-text file
  if (/^[{[]/.test(head)) return "import.bad.cut";                                             // starts like a backup but breaks off: incomplete or damaged
  return "import.notJsonCsv";
}

// Reads a file's text into a plan. Nothing is applied here; the user reviews the plan first.
function planImport(raw, filename="") {
  const text=String(raw).replace(/^\uFEFF/,"");
  const isCSV=/\.csv$/i.test(filename) || text.trimStart().toLowerCase().startsWith("date,");
  let list=[], settings={}, problems=[], warnings=[], subcategories={}, debtData={ debts:[], loans:[] }, accountData={ accounts:[], transfers:[] };
  if (isCSV) {
    const r=parseCsvImport(text);
    if (r.error) return { ok:false, error:r.error };
    list=r.records;
    if (r.bankSkipped) warnings.push(t("import.bankSkipped",{ n:r.bankSkipped }));
  } else {
    let parsed;
    try { parsed=JSON.parse(text); } catch { return { ok:false, error:t(badFileReason(text)) }; }
    if (Array.isArray(parsed)) list=parsed;
    else if (isPlainObject(parsed)) {
      if (parsed.version!==undefined) {
        if (!Number.isInteger(parsed.version) || parsed.version<1) return { ok:false, error:t("import.badVersion") };
        if (parsed.version>BACKUP_VERSION) return { ok:false, error:t("import.newerVersion",{v:parsed.version}) };
      }
      if (Array.isArray(parsed.transactions)) list=parsed.transactions;
      else if (Array.isArray(parsed.entries)) list=parsed.entries;
      else { const v=Object.values(parsed).find(v=>Array.isArray(v) && v.length>0 && isPlainObject(v[0]) && v[0].amount!==undefined); if (v) list=v; }
      const v=validateSettings(parsed); settings=v.settings; problems=v.problems; warnings=v.warnings.slice();
      subcategories=cleanSubcats(parsed.subcategories);   // Run 16: the user's own subcategory suggestions (optional)
      accountData=cleanAccountData({ accounts:parsed.accounts, transfers:parsed.transfers });   // Run 24: accounts and transfers (optional)
      debtData=cleanDebtData({ debts:parsed.debts, loans:parsed.loans });   // Run 17: debts and loans (optional)
      // Run 13: an entry list that is present but not a list used to be skipped without a word when the file also held
      // settings (and had no entry count to disagree with). The user is told no entries could be read.
      if ((parsed.transactions!==undefined && !Array.isArray(parsed.transactions) && !Array.isArray(parsed.entries)) || (parsed.entries!==undefined && !Array.isArray(parsed.entries) && !Array.isArray(parsed.transactions)))
        warnings.push(t("import.listUnreadable"));
      if (parsed.exportedAt!==undefined && !(typeof parsed.exportedAt==="string" && !Number.isNaN(Date.parse(parsed.exportedAt)))) warnings.push(t("import.badExportDate"));
      if (isPlainObject(parsed.meta) && Number.isInteger(parsed.meta.transactionCount) && parsed.meta.transactionCount!==list.length)
        warnings.push(t("import.countMismatch",{said:parsed.meta.transactionCount,has:list.length}));
    } else return { ok:false, error:t("import.notBackup") };
  }
  const { good:parsed, bad, rekeyed }=partitionTransactions(list);
  // Amounts in a file must be whole cents. 12.345 or 0.000000001 is refused rather than rounded, because rounding would
  // silently change the figure. (Data already stored on the device is not re-checked here, so loading never drops it.)
  const good=[];
  parsed.forEach(t=>{ if (Number(t.amount.toFixed(2))===t.amount) good.push(t); else bad.push({ record:t, reason:"more than 2 decimal places" }); });
  if (!good.length && !Object.keys(settings).length)
    return { ok:false, error: bad.length ? t("import.nothing",{summary:summariseReasons(bad)}) : t("import.empty") };
  const unknownCat=list.filter(t=>checkRawTxn(t)===null).filter(t=>{ const c=txt(t.category||t.catId||t.cat).trim(); return c && resolveCategory(c)==="other" && !/^(other|miscellaneous)$/i.test(c); }).length;
  if (unknownCat) warnings.push(tn("import.unknownCat",unknownCat));
  // Run 12: a payment's bill link is kept only when the file also contains that bill; otherwise only the link is dropped
  // (the payment stays, still recurring) and the sheet says how many.
  const fileBills=new Set((settings.bills||[]).map(b=>b.id)); let unlinked=0;
  good.forEach((t,i)=>{ if (t.billId && !fileBills.has(t.billId)) { const { billId, ...rest }=t; good[i]=rest; unlinked++; } });
  if (unlinked) warnings.push(tn("import.billUnlinked",unlinked));
  if (rekeyed) warnings.push(tn("import.rekeyed",rekeyed));
  // Rows identical to another row of the same file are all imported (two coffees at the same price on the same day are real),
  // but the user is told, since a file exported twice into one can look the same (Run 6, D10: policy — tell, never auto-remove).
  const seenFp=new Set(); let sameFile=0;
  good.forEach(t=>{ const f=txnFingerprint(t); if (seenFp.has(f)) sameFile++; else seenFp.add(f); });
  if (sameFile) warnings.push(tn("import.sameFileDup",sameFile));
  // A file with no usable transactions (settings only, an empty list, or only refused rows) may update settings, but it can
  // never replace the ledger: Replace would otherwise delete every transaction on the device.
  // Run 8: nor can a file where some rows were refused — Replace would quietly drop those rows along with the whole ledger.
  // Merge (adds the readable rows) stays available; the sheet explains why Replace is not offered.
  return { ok:true, kind:isCSV?"csv":"json", filename, transactions:good, canReplace:good.length>0 && bad.length===0, skippedCount:bad.length, skippedSummary:summariseReasons(bad), settings, problems, warnings, subcategories, debtData, accountData };
}

// Run 8: whether an entry repeats (and how often) is part of what it is, so a monthly bill and an identical one-off purchase
// are not look-alikes. Paused/active is a state that changes over time and is left out (a re-imported entry still matches).
function txnFingerprint(t) { return [t.date,t.type,Number(t.amount).toFixed(2),t.category,norm(t.merchant),norm(t.note),norm(t.subcategory),t.recurring?(t.recurFreq||"r"):""].join("|"); }
function countSuspectedDuplicates(existing, incoming) { const fp=new Set(existing.map(txnFingerprint)); return incoming.filter(t=>fp.has(txnFingerprint(t))).length; }
// Run 51 (owner report: a merge double counted): what a merge would do with each entry of the file, worked out BEFORE anything is added.
//   sameId     the very same record is already here (its id exists): never added.
//   identical  no id match, but every detail equals an entry here (the old "look-alike" rule).
//   similar    no id match and not identical, but the same day, kind and amount as an entry here: most likely the same real payment
//              typed or imported twice with different words. The person chooses; pairs are kept so the sheet can show examples.
//   fresh      nothing like it here: added.
// Matching is one-to-one: an entry here can stand for only ONE entry of the file, so two real coffees at the same price on the same day
// in the file, against one here, give one match and one new entry (nothing real is dropped, nothing is counted twice).
function txnLooseKey(t) { return [t.date,t.type,Math.round(Number(t.amount)*100)].join("|"); }
function planMerge(existing, incoming) {
  const ex=Array.isArray(existing)?existing:[], inc=Array.isArray(incoming)?incoming:[];
  const byId=new Map(), byFp=new Map(), byLoose=new Map(), used=new Set();
  const push=(m,k,i)=>{ const l=m.get(k); if (l) l.push(i); else m.set(k,[i]); };
  ex.forEach((t,i)=>{ byId.set(String(t.id),i); push(byFp,txnFingerprint(t),i); push(byLoose,txnLooseKey(t),i); });
  const take=(m,k)=>{ const l=m.get(k); if (!l) return -1; for (const i of l) if (!used.has(i)) { used.add(i); return i; } return -1; };
  const sameId=[], identical=[], similar=[], fresh=[], rest1=[], rest2=[];
  inc.forEach(t=>{ const i=byId.get(String(t.id)); if (i!==undefined) { used.add(i); sameId.push(t); } else rest1.push(t); });
  rest1.forEach(t=>{ if (take(byFp,txnFingerprint(t))>=0) identical.push(t); else rest2.push(t); });
  rest2.forEach(t=>{ const i=take(byLoose,txnLooseKey(t)); if (i>=0) similar.push({ file:t, here:ex[i] }); else fresh.push(t); });
  return { sameId, identical, similar, fresh };
}
// Run 51: entries ALREADY on this phone that may be one payment counted twice (after an earlier merge, or typed twice): groups of two or
// more entries on the same day, of the same kind, for the same amount. Nothing is decided here; the person looks and chooses. In each group
// the entry that carries the most (a link to a bill, debt or loan; an account; words) comes first, as the one to keep; "extra" is the rest,
// never an entry tied to a debt repayment or a loan payment (those are managed from the Debts page).
export function findDoubleEntries(transactions) {
  const m=new Map();
  (Array.isArray(transactions)?transactions:[]).forEach(t=>{ if (!t || !isValidDateStr(t.date)) return; const k=txnLooseKey(t), l=m.get(k); if (l) l.push(t); else m.set(k,[t]); });
  const score=(t)=>(t.debtLink||t.loan||t.billId ? 8 : 0)+(t.account ? 2 : 0)+(t.merchant ? 1 : 0)+(t.note ? 1 : 0)+(t.subcategory ? 1 : 0);
  return [...m.values()].filter(l=>l.length>1).map(l=>{
    const items=l.map((t,i)=>({ t, i })).sort((a,b)=>score(b.t)-score(a.t) || a.i-b.i).map(x=>x.t);
    return { date:items[0].date, type:items[0].type, amount:items[0].amount, items, extra:items.slice(1).filter(t=>!t.debtLink && !t.loan) };
  }).sort((a,b)=>b.date.localeCompare(a.date) || b.amount-a.amount);
}
// Run 51: accounts of a file against the accounts on this phone. Same id = the same account (what is here wins, as before). NEW: an account
// of the file whose NAME is already used here under another id is the same account too; its id is mapped to the one here, so the file's
// entries and transfers land on the account the person already has (before, that account was dropped and its entries pointed nowhere).
// Opening balances are never added together. A transfer of the file that equals one here (same accounts, amount, day, note) is not added twice.
function planAccountMerge(mine, file) {
  const A=cleanAccountData(mine), B=cleanAccountData(file), remap={};
  const idsA=new Set(A.accounts.map(a=>a.id)), byName=new Map(A.accounts.map(a=>[lc(a.name),a.id]));
  B.accounts.forEach(b=>{ if (!idsA.has(b.id) && byName.has(lc(b.name))) remap[b.id]=byName.get(lc(b.name)); });
  const m=(id)=>remap[id]||id, tkey=(x)=>[x.from,x.to,Math.round(x.amount*100),x.date,norm(x.note)].join("|");
  const haveT=new Set(A.transfers.map(x=>x.id)), haveK=new Map(); A.transfers.forEach(x=>haveK.set(tkey(x),(haveK.get(tkey(x))||0)+1));
  const addT=[];
  B.transfers.forEach(x=>{ if (haveT.has(x.id)) return; const y={ ...x, from:m(x.from), to:m(x.to) }, k=tkey(y), n=haveK.get(k)||0; if (n>0) { haveK.set(k,n-1); return; } addT.push(y); });
  const data=cleanAccountData({ accounts:[...A.accounts,...B.accounts.filter(b=>!idsA.has(b.id) && !remap[b.id])], transfers:[...A.transfers,...addT] });
  return { data, remap, renamed:Object.keys(remap).length };
}
// What the import sheet shows before anything is applied: the four counts, up to three example pairs, and how many accounts of the file
// are the same as an account here under another id. dupCount is kept (= identical) for the older parts of the sheet.
function mergeCounts(existing, plan) {
  const mp=planMerge(existing, plan.transactions||[]);
  const ap=plan.accountData && plan.accountData.accounts.length ? planAccountMerge(readAccounts(),plan.accountData) : null;
  return { dupCount:mp.identical.length, mergeInfo:{ sameId:mp.sameId.length, identical:mp.identical.length, similar:mp.similar.length, fresh:mp.fresh.length, examples:mp.similar.slice(0,3), sameAccounts:ap?ap.renamed:0 } };
}
function remapEntryAccounts(list, remap) { return remap && Object.keys(remap).length ? list.map(t=>t.account && remap[t.account] ? { ...t, account:remap[t.account] } : t) : list; }
// Run 51: removing an account, safely. What it would touch is counted first (shown to the person); then the entries that used it are moved to
// another account or to "no account" (their amounts, dates and ids never change), its transfers are removed (a transfer cannot exist with one
// side missing), and the account itself goes. Everything removed is returned, so Undo can put it back exactly.
export function accountRemovalPlan(data, id, transactions) {
  const d=cleanAccountData(data), acc=d.accounts.find(a=>a.id===id)||null;
  const entries=(transactions||[]).filter(x=>x && x.account===id).length, transfers=d.transfers.filter(x=>x.from===id||x.to===id).length;
  return { account:acc, entries, transfers, balance:acc ? (accountBalances(d,transactions)[id]||0) : 0 };
}
export function removeAccountSafely(data, id, transactions, moveTo="") {
  const d=cleanAccountData(data), acc=d.accounts.find(a=>a.id===id), list=Array.isArray(transactions)?transactions:[];
  if (!acc) return { ok:false, reason:"account", data:d, transactions:list };
  const target=moveTo ? accId(moveTo) : "";
  if (moveTo && (!target || target===id || !d.accounts.some(a=>a.id===target))) return { ok:false, reason:"target", data:d, transactions:list };
  const movedIds=[], next=list.map(x=>{ if (!x || x.account!==id) return x; movedIds.push(x.id); if (target) return { ...x, account:target }; const { account, ...rest }=x; return rest; });
  const removedTransfers=d.transfers.filter(x=>x.from===id||x.to===id);
  const index=d.accounts.findIndex(a=>a.id===id);
  return { ok:true, reason:"", data:cleanAccountData({ accounts:d.accounts.filter(a=>a.id!==id), transfers:d.transfers.filter(x=>x.from!==id&&x.to!==id) }), transactions:movedIds.length?next:list, removed:{ account:acc, index, transfers:removedTransfers, movedIds, movedTo:target } };
}
// Undo of the above against whatever is on the phone NOW (other work done in between is kept): the account and its transfers come back,
// and the moved entries point to it again, but only those that still sit where the removal left them.
export function restoreRemovedAccount(data, transactions, removed) {
  const d=cleanAccountData(data), list=Array.isArray(transactions)?transactions:[];
  if (!removed || !removed.account) return { ok:false, data:d, transactions:list };
  if (d.accounts.some(a=>a.id===removed.account.id || lc(a.name)===lc(removed.account.name)) || d.accounts.length>=ACC_MAX) return { ok:false, data:d, transactions:list };
  const accounts=d.accounts.slice(); accounts.splice(Math.min(Math.max(removed.index||0,0),accounts.length),0,removed.account);
  const haveT=new Set(d.transfers.map(x=>x.id));
  const back=cleanAccountData({ accounts, transfers:[...d.transfers,...(removed.transfers||[]).filter(x=>!haveT.has(x.id))] });
  const ids=new Set((removed.movedIds||[]).map(String)), to=removed.movedTo||"";
  const next=ids.size ? list.map(x=>x && ids.has(String(x.id)) && (x.account||"")===to ? { ...x, account:removed.account.id } : x) : list;
  return { ok:back.accounts.some(a=>a.id===removed.account.id), data:back, transactions:next };
}

// What each mode does with each part of a backup (shown to the user in the import sheet):
//   Merge   transactions: added unless the id exists (optionally also skipping look-alikes) · budgets: combined, imported categories win ·
//           templates/goals: new ones added · currency and Safe to Spend: YOUR current values stay.
//   Replace transactions: replaced · budgets/templates/goals/currency/Safe to Spend: replaced ONLY if the file contains a valid section.
function applyImport(state, plan, mode, { skipDuplicates=false, skipSimilar=false }={}) {
  const sortDesc=(l)=>[...l].sort((a,b)=>b.date.localeCompare(a.date));
  const S=plan.settings||{};
  if (mode==="replace") {
    // Defence in depth (the sheet does not offer Replace then): a file with no usable rows, or with refused rows, never
    // replaces the ledger; only its valid settings are applied.
    const keep=!plan.transactions.length || (plan.skippedCount||0)>0;
    const next={ ...state, transactions:keep ? state.transactions : sortDesc(plan.transactions) };
    ["budgets","templates","currency","goals","safeToSpend","bills"].forEach(k=>{ if (S[k]!==undefined) next[k]=S[k]; });
    const P=plan.prefs||{};   // Run 37: same rule in Replace: only where this phone has none of its own
    if (P.profileName && !state.profileName) next.profileName=P.profileName;
    if (P.setupHidden && !state.setupHidden) next.setupHidden=true;
    return next;
  }
  // Run 37: on a phone that has nothing recorded yet (a new install, or the browser copy being set up), "Merge" also takes the file's
  // currency and Safe to Spend setting; otherwise a fresh phone silently lost them. A phone with its own data keeps its own, as before.
  const emptyHere=!state.transactions.length && !(state.bills||[]).length && !(state.goals||[]).length && !Object.keys(state.budgets||{}).length;
  // Run 51: one-to-one matching (planMerge). An id that is already here is never added; identical and similar entries follow the two choices.
  const mp=planMerge(state.transactions, plan.transactions);
  const add=[...mp.fresh, ...(skipDuplicates ? [] : mp.identical), ...(skipSimilar ? [] : mp.similar.map(p=>p.file))];
  const next={ ...state, transactions:sortDesc([...add, ...state.transactions]) };
  const fresh=(prefix)=>`${prefix}${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  if (S.budgets) next.budgets={ ...state.budgets, ...S.budgets };
  if (S.templates) {
    const key=(t)=>`${norm(t.name)}|${Number(t.amount).toFixed(2)}|${t.catId}`; const have=new Set(state.templates.map(key));
    next.templates=[...state.templates, ...S.templates.filter(t=>!have.has(key(t))).map(t=>state.templates.some(x=>x.id===t.id)?{...t,id:fresh("t")}:t)];
  }
  if (S.goals) {
    const key=(g)=>`${norm(g.name)}|${Number(g.target).toFixed(2)}`; const have=new Set(state.goals.map(key));
    next.goals=[...state.goals, ...S.goals.filter(g=>!have.has(key(g))).map(g=>state.goals.some(x=>x.id===g.id)?{...g,id:fresh("g")}:g)];
  }
  // Run 12: bills are added when their id is not on the device yet (a backup's bill is the same bill as the device's one
  // with that id, so payments linked to it in either place stay linked).
  if (S.bills) { const have=new Set((state.bills||[]).map(b=>b.id)); next.bills=[...(state.bills||[]), ...S.bills.filter(b=>!have.has(b.id))]; }
  if (emptyHere) { if (S.currency!==undefined) next.currency=S.currency; if (S.safeToSpend!==undefined) next.safeToSpend=S.safeToSpend; }
  // Run 37: the name and "set-up list hidden" from the file are used only where this phone has none of its own.
  const P=plan.prefs||{};
  if (P.profileName && !state.profileName) next.profileName=P.profileName;
  if (P.setupHidden && !state.setupHidden) next.setupHidden=true;
  return next;
}

// Backup reminder. lastBackup = when a backup FILE was last created (a download was started); backupConfirmedAt = when the
// user last told the app they have that file. The page cannot see the Downloads folder, so only the user can confirm.
//   "confirm" → a file was created recently but not confirmed: ask the user to check it, never assume it was kept
//   "none"    → a backup was confirmed less than BACKUP_REMINDER_DAYS ago
//   "due"     → otherwise (no backup, or the last one is old)
const BACKUP_REMINDER_DAYS=7;
function backupReminderDue(s, now=new Date()) {
  const at=(v)=>(typeof v==="string" && !Number.isNaN(Date.parse(v))) ? Date.parse(v) : null;
  const created=at(s?.lastBackup), confirmed=at(s?.backupConfirmedAt);
  const recent=(ms)=>ms!==null && (now.getTime()-ms)/86400000<BACKUP_REMINDER_DAYS;
  if (recent(created) && (confirmed===null || created>confirmed)) return "confirm";
  return recent(confirmed) ? "none" : "due";
}

// Run 37 (owner: "I want to see all my data when I import"): personal preferences travel in the backup too. Only what the user chose is
// written (nothing when everything is default). Never the app-lock PIN record, never this phone's notification or widget set-up.
export const COACH_MUTE_KEY=KEY+"__coachmute", PAT_MUTE_KEY=KEY+"__patmute";
const muteList=(v)=>[...new Set((Array.isArray(v)?v:[]).filter(x=>typeof x==="string" && /^[A-Za-z0-9_.:-]{1,60}$/.test(x)))].slice(0,100);
export function readMuteList(key) { try { return muteList(JSON.parse(localStorage.getItem(key)||"[]")); } catch { return []; } }
export function writeMuteList(key, list) { try { const l=muteList(list); if (l.length) localStorage.setItem(key,JSON.stringify(l)); else localStorage.removeItem(key); return true; } catch { return false; } }
// Run 41 (owner wishlist, "true hourly wage"): hours worked in a month, one optional number (1 to 744, steps of 0.5). A preference that travels in the backup.
export const WORKHOURS_KEY=KEY+"__workhours";
export function cleanWorkHours(v) { const n=typeof v==="string" ? Number(v.replace(",",".").trim()) : v; return typeof n==="number" && Number.isFinite(n) && n>=1 && n<=744 ? Math.round(n*2)/2 : null; }
export function readWorkHours() { try { const r=localStorage.getItem(WORKHOURS_KEY); return r===null ? null : cleanWorkHours(JSON.parse(r)); } catch { return null; } }
export function writeWorkHours(v) { try { const n=cleanWorkHours(v); if (n===null) localStorage.removeItem(WORKHOURS_KEY); else localStorage.setItem(WORKHOURS_KEY,JSON.stringify(n)); return true; } catch { return false; } }
// Earned income per hour, in whole qapik: the average earned income of up to the last three completed months that had any, divided by the monthly hours.
// null when hours are not set or no completed month has earned income. Refunds, savings withdrawals and other non-earned income are not counted.
export function incomePerHour(transactions, hours, now=new Date()) {
  const h=cleanWorkHours(hours); if (h===null) return null;
  const cur=now.getFullYear()*12+now.getMonth(), by={};
  (Array.isArray(transactions)?transactions:[]).forEach(x=>{
    if (!x || x.type!=="income" || !isEarnedCat(x.category) || !/^\d{4}-\d{2}/.test(String(x.date))) return;
    const [y,m]=String(x.date).split("-").map(Number), k=y*12+(m-1); if (k>=cur || k<cur-3) return;
    by[k]=(by[k]||0)+Math.round((Number(x.amount)||0)*100);
  });
  const vals=Object.values(by).filter(v=>v>0); if (!vals.length) return null;
  return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length/h);
}
// Hours of work an amount represents, to one decimal; null when there is no hourly figure or the amount is not positive.
export function hoursOfWork(amount, perHourQapik) { const c=Math.round((Number(amount)||0)*100); return perHourQapik>0 && c>0 ? Math.round(c/perHourQapik*10)/10 : null; }
export function cleanPrefs(raw) {
  const s=isPlainObject(raw) ? raw : {}, out={};
  const wh=cleanWorkHours(s.workHours); if (wh!==null) out.workHours=wh;
  const n=cleanProfileName(s.profileName); if (n) out.profileName=n;
  if (s.setupHidden===true) out.setupHidden=true;
  if (typeof s.theme==="string") { const th=themeId(s.theme); if (th!=="sea" && THEME_IDS.includes(th)) out.theme=th; }   // Run 42: a backup that names a removed theme (Sapphire, Cocoa) keeps its closest one
  if (s.reduceEffects===true) out.reduceEffects=true;
  const cm=muteList(s.coachMute), pm=muteList(s.patternMute); if (cm.length) out.coachMute=cm; if (pm.length) out.patternMute=pm;
  return out;
}
// Run 37: what an import plan carries, part by part ([key, count] or [key, null] for a part without a count). Shown in the import sheet.
export const IMPORT_PART_KEY={ entries:"import.part.entries", accounts:"import.part.accounts", transfers:"import.part.transfers", bills:"import.part.bills", budgets:"import.part.budgets", goals:"import.part.goals", templates:"import.part.templates",
  debts:"import.part.debts", loans:"import.part.loans", cats:"import.part.cats", subcats:"import.part.subcats", catprefs:"import.part.catprefs", safe:"import.part.safe", prefs:"import.part.prefs" };
export function fileParts(plan) {
  const p=plan||{}, S=p.settings||{}, A=p.accountData||{}, D=p.debtData||{}, out=[];
  const add=(k,n)=>{ if (n>0) out.push([k,n]); };
  add("entries",(p.transactions||[]).length); add("accounts",(A.accounts||[]).length); add("transfers",(A.transfers||[]).length);
  add("bills",(S.bills||[]).length); add("budgets",Object.keys(S.budgets||{}).length); add("goals",(S.goals||[]).length); add("templates",(S.templates||[]).length);
  add("debts",(D.debts||[]).length); add("loans",(D.loans||[]).length); add("cats",(p.customCats||[]).length);
  add("subcats",Object.values(p.subcategories||{}).reduce((s,l)=>s+(Array.isArray(l)?l.length:0),0));
  if (p.catPrefs) out.push(["catprefs",null]);
  if (S.safeToSpend && S.safeToSpend.enabled) out.push(["safe",null]);
  if (p.prefs && Object.keys(p.prefs).length) out.push(["prefs",null]);
  return out;
}
export function collectPrefs(state) { return cleanPrefs({ profileName:state&&state.profileName, setupHidden:state&&state.setupHidden, theme:readTheme(), reduceEffects:readFxOff(), workHours:readWorkHours(), coachMute:readMuteList(COACH_MUTE_KEY), patternMute:readMuteList(PAT_MUTE_KEY) }); }
function buildBackup(state, now=new Date().toISOString()) {
  const { transactions,budgets,templates,currency,goals,safeToSpend,bills=[],subcategories }=state;
  const subs=cleanSubcats(subcategories);   // Run 16: optional; absent when there are none, so such a file is identical to before
  const dd=cleanDebtData(state.debtData);   // Run 17: debts and loans, optional in the same way
  const acc=cleanAccountData(state.accountData);   // Run 24: accounts and transfers, optional in the same way
  const ccats=cleanCustomCats(state.customCats);   // Run 24: the user's own categories, optional in the same way
  const cprefs=cleanCatPrefs(state.catPrefs);       // Run 36: hidden / reordered categories, optional in the same way
  const prefs=cleanPrefs(state.preferences);          // Run 37: name, theme, hidden tips..., optional in the same way
  return { version:BACKUP_VERSION, exportedAt:now, meta:{ app:"expense-ledger", transactionCount:transactions.length },
    transactions, budgets, templates, currency, goals, safeToSpend, bills, ...(Object.keys(subs).length ? { subcategories:subs } : {}),
    ...(ccats.length ? { customCategories:ccats } : {}),
    ...(cprefs.hidden.length || cprefs.order.length ? { categoryPrefs:cprefs } : {}),
    ...(Object.keys(prefs).length ? { preferences:prefs } : {}),
    ...(acc.accounts.length ? { accounts:acc.accounts, ...(acc.transfers.length ? { transfers:acc.transfers } : {}) } : {}),
    ...(dd.debts.length ? { debts:dd.debts } : {}), ...(dd.loans.length ? { loans:dd.loans } : {}), lastBackup:now };
}

// ─── Run 32 (backlog item 9): optional passphrase-encrypted backup ─────────────────────────────────────────────────────────────────────
// The encrypted file wraps the normal backup text: AES-256-GCM, key from the passphrase with PBKDF2-SHA-256 (random salt, iteration count stored in the
// file). Nothing about the passphrase is stored anywhere; a forgotten passphrase cannot be recovered. The normal (plain) backup is unchanged.
const ENC_FORMAT="expense-ledger-encrypted-backup", ENC_VERSION=1, ENC_ITER=600000, ENC_MIN_PASS=8, ENC_AAD="expense-ledger-encrypted-backup/1";
const b64e=(u8)=>{ let s=""; for (let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s); };
const b64d=(s)=>{ const b=atob(String(s)); const u=new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; };
export function isEncryptedBackup(text) {
  const s=String(text||""); if (!s.includes(ENC_FORMAT)) return false;
  try { const p=JSON.parse(s.replace(/^﻿/,"")); return isPlainObject(p) && p.format===ENC_FORMAT; } catch { return false; }
}
async function encKey(pass, salt, iter, usage) {
  const subtle=globalThis.crypto.subtle;
  const base=await subtle.importKey("raw",new TextEncoder().encode(String(pass).normalize("NFC")),"PBKDF2",false,["deriveKey"]);
  return subtle.deriveKey({ name:"PBKDF2", hash:"SHA-256", salt, iterations:iter },base,{ name:"AES-GCM", length:256 },false,usage);
}
export async function decryptBackupText(envelopeText, pass) {
  const c=globalThis.crypto; if (!c || !c.subtle) return { ok:false, reason:"unsupported" };
  let p; try { p=JSON.parse(String(envelopeText).replace(/^﻿/,"")); } catch { return { ok:false, reason:"damaged" }; }
  if (!isPlainObject(p) || p.format!==ENC_FORMAT) return { ok:false, reason:"damaged" };
  if (Number.isInteger(p.version) && p.version>ENC_VERSION) return { ok:false, reason:"newer" };
  try {
    if (p.version!==ENC_VERSION || p.kdf!=="PBKDF2-SHA256" || p.cipher!=="AES-256-GCM" || !Number.isInteger(p.iterations) || p.iterations<1000 || p.iterations>5000000) return { ok:false, reason:"damaged" };
    const salt=b64d(p.salt), iv=b64d(p.iv), data=b64d(p.data);
    if (salt.length!==16 || iv.length!==12 || data.length<16) return { ok:false, reason:"damaged" };
    const key=await encKey(pass,salt,p.iterations,["decrypt"]);
    let plain; try { plain=await c.subtle.decrypt({ name:"AES-GCM", iv, additionalData:new TextEncoder().encode(ENC_AAD) },key,data); } catch { return { ok:false, reason:"wrong" }; }   // GCM cannot tell a wrong passphrase from an altered file
    return { ok:true, text:new TextDecoder("utf-8",{ fatal:true }).decode(plain) };
  } catch { return { ok:false, reason:"damaged" }; }
}
// Encrypts, then immediately decrypts the result and compares, so a file that could not be opened again is never handed out.
export async function encryptBackupText(text, pass, iterations=ENC_ITER) {
  const c=globalThis.crypto; if (!c || !c.subtle) return { ok:false, reason:"unsupported" };
  if (typeof pass!=="string" || [...pass].length<ENC_MIN_PASS) return { ok:false, reason:"short" };
  try {
    const salt=c.getRandomValues(new Uint8Array(16)), iv=c.getRandomValues(new Uint8Array(12));
    const key=await encKey(pass,salt,iterations,["encrypt"]);
    const ct=new Uint8Array(await c.subtle.encrypt({ name:"AES-GCM", iv, additionalData:new TextEncoder().encode(ENC_AAD) },key,new TextEncoder().encode(String(text))));
    const out=JSON.stringify({ format:ENC_FORMAT, version:ENC_VERSION, kdf:"PBKDF2-SHA256", iterations, cipher:"AES-256-GCM", salt:b64e(salt), iv:b64e(iv), data:b64e(ct) });
    const back=await decryptBackupText(out,pass);
    if (!back.ok || back.text!==String(text)) return { ok:false, reason:"failed" };
    return { ok:true, text:out };
  } catch { return { ok:false, reason:"failed" }; }
}

export function buildCsv(transactions) {
  // Run 16: "Wallet" is the last column, so the columns before it did not move (older readers and the older import still work).
  // Run 32: Account (its name), LoanInterest (the interest part of a loan instalment; "unknown" when the split was not given) and DebtRepayment ("yes" for a person-to-person
  // repayment entry) are appended after "Trip", so earlier columns did not move. They are for the user's spreadsheet: this CSV is NOT a backup and the import ignores them.
  const rows=[["Date","Type","Category","Subcategory","Merchant","Amount","Note","Recurring","CategoryId","Wallet","Trip","Account","LoanInterest","DebtRepayment","RefundOf","PaidAmount","PaidCurrency","Rate","SpreadMonths","OthersPayBack","OthersName"]];   // Run 41: "SpreadMonths" appended last   // Run 36: "RefundOf" appended last; Run 39: what was paid in another currency (earlier columns unchanged)   // Run 22: "Trip" is appended after "Wallet"
  transactions.forEach(t=>{ const lr=loanRef(t.loan);
    rows.push([t.date,t.type,CAT(t.category)?.name||t.category,t.subcategory||"",t.merchant||"",Number(t.amount).toFixed(2),t.note||"",t.recurring?(t.recurFreq||""):"",t.category,walletId(t.wallet),tripName(t.trip),
      accountName(t.account),lr ? (lr.interest===null ? "unknown" : lr.interest.toFixed(2)) : "",debtLinkRef(t.debtLink) ? "yes" : "",refundForId(t.refundFor) ? (CAT(t.refundFor)?.name||t.refundFor) : "",...(cleanFx(t.fx) ? [cleanFx(t.fx).amt.toFixed(2),cleanFx(t.fx).cur,String(cleanFx(t.fx).rate)] : ["","",""]),t.type==="expense" && spreadMonths(t.spread) ? String(spreadMonths(t.spread)) : "",...(t.type==="expense" && cleanReimb(t.reimb) ? [cleanReimb(t.reimb).amt.toFixed(2),cleanReimb(t.reimb).who] : ["",""])]); });   // Run 43b: appended last (what others will pay back, and who); export only, like Account: the import ignores it
  // Formula-injection guard: a cell starting with = + - @ tab or CR would run as a formula in a spreadsheet, so it gets a
  // leading apostrophe (shown as text). parseCsvImport removes it again, so the app's own CSV round trip stays exact.
  const safe=(v)=>{ const s=String(v); return /^[=+\-@\t\r]/.test(s) ? "'"+s : s; };
  return "\uFEFF"+rows.map(r=>r.map(v=>`"${safe(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
}

// ─── Merchant memory ──────────────────────────────────────────────────────────
// Memory is keyed by type + merchant, so a merchant used as both income and expense
// keeps a separate category/subcategory for each. The most recent choice per type wins.
export function memKey(type, merchant) { return `${type==="income"?"income":"expense"}|${lc(String(merchant).trim())}`; }

function buildMerchantMemory(transactions) {
  const mem={};
  [...transactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{
    if (t.merchant&&String(t.merchant).trim()) {
      const type=t.type==="income"?"income":"expense";
      const key=memKey(type,t.merchant);
      if (!mem[key]) mem[key]={ type, merchant:String(t.merchant).trim(), count:0, totalSpent:0 };
      mem[key].category=t.category;
      mem[key].subcategory=t.subcategory||"";
      mem[key].count++;
      mem[key].totalSpent+=(t.amount||0);
    }
  });
  return mem;
}

function merchantSuggest(merchant, memory, type="expense") {
  if (!merchant||!merchant.trim()) return null;
  const exact=memory[memKey(type,merchant)];
  if (exact) return exact;
  const q=lc(merchant.trim());
  return Object.values(memory).find(v=>v.type===(type==="income"?"income":"expense")&&lc(v.merchant).startsWith(q))||null;
}

// Run 42 (owner's wishlist: "Netflix, Spotify, Uber... the app should just know"): a built-in list of common places and services, with Azerbaijan first, that suggests
// a category while typing a merchant. A person's OWN history always comes first and is never overridden; these only fill the gap. Expenses only. Brands I was not sure of
// are left out on purpose; the list is data and easy to extend. Checked against research 8 Nov 2026: removed entries with no evidence (Glovo, Super Online, Irshad, Zeytun Pharm, Rahat, Neptun, Delta Telecom, Naxtel, Lukoil); Umico is now Birmarket (both kept).
export const KNOWN_MERCHANTS=[
  ["Netflix","digital","Streaming"],["Spotify","digital","Streaming"],["YouTube Premium","digital","Streaming"],["Disney+","digital","Streaming"],["HBO Max","digital","Streaming"],["Apple Music","digital","Streaming"],["Amazon Prime","digital","Streaming"],
  ["iCloud","digital","Cloud Storage"],["Google One","digital","Cloud Storage"],["Dropbox","digital","Cloud Storage"],
  ["ChatGPT","digital","Software"],["Claude","digital","Software"],["Microsoft 365","digital","Software"],["Adobe","digital","Software"],["Canva","digital","Software"],
  ["Azercell","digital","Mobile"],["Bakcell","digital","Mobile"],["Nar","digital","Mobile"],
  ["Aztelekom","digital","Internet"],["Baktelekom","digital","Internet"],
  ["Bolt","transport","Taxi / Ride-hailing"],["Uber","transport","Taxi / Ride-hailing"],["Yango","transport","Taxi / Ride-hailing"],["BakıKart","transport","Metro"],["BakiKart","transport","Metro"],
  ["SOCAR","car","Fuel"],["Azpetrol","car","Fuel"],["Shell","car","Fuel"],
  ["Bravo","food","Groceries"],["Araz","food","Groceries"],["Bazarstore","food","Groceries"],["Oba Market","food","Groceries"],
  ["Wolt","food","Delivery"],["Bolt Food","food","Delivery"],
  ["Starbucks","food","Coffee"],["Coffeemania","food","Coffee"],["Gloria Jeans","food","Coffee"],
  ["McDonald's","food","Fast Food"],["KFC","food","Fast Food"],["Burger King","food","Fast Food"],["Papa John's","food","Fast Food"],["Domino's","food","Fast Food"],["Pizza Hut","food","Fast Food"],["Subway","food","Fast Food"],
  
  ["Azərişıq","housing","Electricity"],["Azerishiq","housing","Electricity"],["Azersu","housing","Water"],["Azəriqaz","housing","Gas"],["Azerigaz","housing","Gas"],
  ["Kontakt","shopping","Electronics"],["Baku Electronics","shopping","Electronics"],
  ["Amazon","shopping","Online Shopping"],["AliExpress","shopping","Online Shopping"],["Trendyol","shopping","Online Shopping"],["Temu","shopping","Online Shopping"],["Birmarket","shopping","Online Shopping"],["Umico","shopping","Online Shopping"],["Rossmann","gifts","Cosmetics"],["Avromed","health","Pharmacy"],["Gapgo","transport","Taxi / Ride-hailing"],["Azeronline","digital","Internet"],["iTicket","entertain","Events"],
  ["CinemaPlus","entertain","Cinema"],["Park Cinema","entertain","Cinema"],
];
// Matches what is typed against the start of the name or of any word in it (at least 2 letters). Returns suggestion objects shaped like merchant-memory entries.
export function knownMerchants(query, type="expense", limit=4) {
  const q=lc(String(query||"").trim()); if (type==="income" || q.length<2) return [];
  const out=[];
  for (const [name,category,subcategory] of KNOWN_MERCHANTS) {
    const n=lc(name); if (n.startsWith(q) || n.split(/[\s'’./-]+/).some(w=>w.length>0 && w.startsWith(q))) out.push({ type:"expense", merchant:name, category, subcategory, count:0, totalSpent:0, builtin:true });
    if (out.length>=limit) break;
  }
  return out;
}
// The one exact match (whole name, any letter case) or null.
export function knownMerchantExact(name) { const q=lc(String(name||"").trim()); if (!q) return null; const m=KNOWN_MERCHANTS.find(x=>lc(x[0])===q); return m ? { merchant:m[0], category:m[1], subcategory:m[2] } : null; }
// S6: Full merchant profile per spec — frequency, timing, recurrence detection, forecasting
function detectRecurrence(txns) {
  if (txns.length < 3) return { isRecurring: false, recurringFreq: "irregular", recurringConfidence: 0, avgDaysBetween: null };
  const gaps = [];
  for (let i = 1; i < txns.length; i++) {
    const days = Math.round((parseLocalDate(txns[i].date) - parseLocalDate(txns[i-1].date)) / 86400000);
    if (days > 0) gaps.push(days);
  }
  if (!gaps.length) return { isRecurring: false, recurringFreq: "irregular", recurringConfidence: 0, avgDaysBetween: null };
  const avgGap = gaps.reduce((s,g)=>s+g,0) / gaps.length;
  const stdDev = Math.sqrt(gaps.reduce((s,g)=>s+Math.pow(g-avgGap,2),0) / gaps.length);
  const coefficient = avgGap > 0 ? stdDev / avgGap : 1;
  const confidence = Math.max(0, Math.round((1 - coefficient) * 100) / 100);
  let freq = "irregular";
  if (avgGap >= 5  && avgGap <= 9)   freq = "weekly";
  if (avgGap >= 12 && avgGap <= 16)  freq = "biweekly";
  if (avgGap >= 25 && avgGap <= 35)  freq = "monthly";
  if (avgGap >= 300 && avgGap <= 400) freq = "yearly";
  return { isRecurring: confidence > 0.7, recurringFreq: freq, recurringConfidence: confidence, avgDaysBetween: Math.round(avgGap) };
}

export function calcMerchantProfile(merchant, transactions) {
  if (!merchant) return null;
  const ml = lc(merchant);
  const txns = transactions
    .filter(t => t.merchant && lc(t.merchant) === ml && t.type === "expense")
    .sort((a,b) => a.date.localeCompare(b.date));
  if (!txns.length) return null;

  const amounts = txns.map(t => t.amount);
  const total = amounts.reduce((s,a)=>s+a, 0);
  const avg = total / amounts.length;
  const minSpend = Math.min(...amounts);
  const maxSpend = Math.max(...amounts);
  const stdDevSpend = parseFloat(Math.sqrt(amounts.reduce((s,a)=>s+Math.pow(a-avg,2),0)/amounts.length).toFixed(2));

  // Last 30 / previous 30 days
  const now30 = localDateStr(new Date(Date.now()-30*86400000));
  const prev30 = localDateStr(new Date(Date.now()-60*86400000));
  const last30 = txns.filter(t=>t.date>=now30).reduce(addAmt,0);
  const prev30total = txns.filter(t=>t.date>=prev30&&t.date<now30).reduce(addAmt,0);

  // Visit frequency
  const gaps = [];
  for (let i=1;i<txns.length;i++) {
    const days = Math.round((parseLocalDate(txns[i].date)-parseLocalDate(txns[i-1].date))/86400000);
    if (days>0) gaps.push(days);
  }
  const avgDaysBetween = gaps.length ? Math.round(gaps.reduce((s,g)=>s+g,0)/gaps.length) : null;

  // Day of week (most common)
  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayCounts = [0,0,0,0,0,0,0];
  txns.forEach(t=>{ dayCounts[parseLocalDate(t.date).getDay()]++; });
  const typicalDay = DAY_NAMES[dayCounts.indexOf(Math.max(...dayCounts))];

  // Category stability
  const catCounts = {};
  txns.forEach(t=>{ catCounts[t.category]=(catCounts[t.category]||0)+1; });
  const catEntries = Object.entries(catCounts).sort((a,b)=>b[1]-a[1]);
  const usualCat = catEntries[0]?.[0];
  const categoryConsistency = catEntries[0] ? catEntries[0][1]/txns.length : 0;
  const categoryStable = categoryConsistency > 0.9;

  // Subcategory
  const subCounts = {};
  txns.filter(t=>t.subcategory).forEach(t=>{ subCounts[t.subcategory]=(subCounts[t.subcategory]||0)+1; });
  const usualSub = Object.entries(subCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;

  // Amount stability
  const amountStable = avg > 0 && (maxSpend-minSpend)/avg < 0.15;

  // Recurrence detection
  const hasRecurringFlag = txns.some(t=>t.recurring);
  const recurrence = detectRecurrence(txns);

  // Estimated next visit + next spend
  let estimatedNextVisit = null, estimatedNextSpend = null;
  if (avgDaysBetween && txns.length >= 2) {
    const lastDate = parseLocalDate(txns[txns.length-1].date);
    const nextDate = new Date(lastDate.getTime() + avgDaysBetween*86400000);
    estimatedNextVisit = localDateStr(nextDate);
    // Use last 3 transactions avg as next spend estimate
    const recentAmts = txns.slice(-3).map(t=>t.amount);
    estimatedNextSpend = parseFloat((recentAmts.reduce((s,a)=>s+a,0)/recentAmts.length).toFixed(2));
  }

  // Spending trend (compare last 3 txns to previous 3)
  let spendingTrend = "stable";
  if (txns.length >= 6) {
    const recent3 = txns.slice(-3).reduce(addAmt,0)/3;
    const prev3   = txns.slice(-6,-3).reduce(addAmt,0)/3;
    if (prev3 > 0) {
      const delta = (recent3-prev3)/prev3*100;
      if (delta > 10) spendingTrend = "increasing";
      else if (delta < -10) spendingTrend = "decreasing";
    }
  }

  // Visit count this month and last 30 days
  const mon = curMon();
  const visitCountThisMonth = txns.filter(happenedIn(mon)).length;   // visits that have happened, not ones dated later
  const visitCount30 = txns.filter(t=>t.date>=now30).length;

  return {
    merchant, total: parseFloat(total.toFixed(2)), count: txns.length,
    avg: parseFloat(avg.toFixed(2)), minSpend, maxSpend, stdDevSpend,
    last30: parseFloat(last30.toFixed(2)), prev30total: parseFloat(prev30total.toFixed(2)), diff30: parseFloat((last30-prev30total).toFixed(2)),
    avgDaysBetween, typicalDay, categoryConsistency: parseFloat(categoryConsistency.toFixed(2)),
    usualCat, usualSub, categoryStable, amountStable,
    hasRecurring: hasRecurringFlag || recurrence.isRecurring,
    isRecurring: recurrence.isRecurring, recurringFreq: recurrence.recurringFreq, recurringConfidence: recurrence.recurringConfidence,
    estimatedNextVisit, estimatedNextSpend, spendingTrend,
    visitCountThisMonth, visitCount30Days: visitCount30,
    firstSeen: txns[0]?.date, lastSeen: txns[txns.length-1]?.date,
  };
}

// ─── Shared financial calculation layer ──────────────────────────────────────
// Shared label so every screen agrees: positive=Surplus, zero=Break-even, negative=Deficit
export function surplusLabel(inc, exp) { return inc>exp ? "Surplus" : inc<exp ? "Deficit" : "Break-even"; }

export function surplusColor(inc, exp) { return inc>exp ? "var(--pos)" : inc<exp ? "var(--neg)" : "var(--ink)"; }

// "Has this entry happened?" for month figures: a past month counts whole, the current month up to and including today,
// a future month nothing. Entries dated later are PLANNED: shown separately, never as money already spent or received.
export function happenedIn(mon, now=new Date()) {
  const p=monthProgress(mon,now), todayStr=localDateStr(now);
  return (t)=>t.date.startsWith(mon) && (p.state==="past" || (p.state==="current" && t.date<=todayStr));
}

// How month `mon` is compared with the month before it (Run 7, V9): while `mon` is under way, with the SAME DAYS of the
// previous month (1–27 Oct vs 1–27 Sep — all of a shorter month when today's day is past its end); a finished month with
// the whole previous month; a future month not at all. Returns the filter for the previous month's entries.
function comparisonWindow(mon, prv, now=new Date()) {
  const p=monthProgress(mon,now), donePrv=happenedIn(prv,now);
  if (p.state==="future") return { kind:null, days:0, inPrev:()=>false };
  if (p.state==="current") return { kind:"same", days:p.daysPassed, inPrev:t=>donePrv(t) && Number(t.date.slice(8,10))<=p.daysPassed };
  return { kind:"full", days:0, inPrev:donePrv };
}

// cur* = happened (to date), planned* = dated later in the month, total* = the whole month (Safe to Spend uses totalExp:
// an expense entered ahead of time is money already committed). prev* = the previous month over the comparison window
// (see comparisonWindow); prevFullExp = the whole previous month, for display.
// Run 22 (formula audit): the sum of entry amounts in whole cents. Adding 0.1 ten times in floating point gives 0.9999999999999999, which
// would sit just under an exact budget of 1.00; rounding each amount to cents first makes the total exact.
// Run 24: reducer that keeps a running total exact to the cent (0.1 + 0.2 stays 0.3), for the plain sums that used to add raw decimals.
export const addAmt=(s,t)=>Math.round((s+(Number(t&&t.amount)||0))*100)/100;
function sumCents(list) { return (list||[]).reduce((s,t)=>s+Math.round((Number(t.amount)||0)*100),0)/100; }
export function calcMonthSummary(transactions, mon=curMon(), prv=prevMon(), now=new Date()) {
  // Run 35b: "Inc" figures are income (earnings); "In" figures are all money in, incl. refunds and withdrawals from savings. Net uses In.
  const isExp=t=>t.type==="expense", isIn=t=>t.type==="income", isInc=t=>isIn(t)&&isEarnedCat(t.category), inMon=t=>t.date.startsWith(mon);
  const cw=comparisonWindow(mon,prv,now);
  const done=happenedIn(mon,now), donePrv=cw.inPrev, sum=sumCents;   // Run 22 audit: whole cents, so ten entries of 0.10 are exactly 1.00
  const curExp =sum(transactions.filter(t=>isExp(t)&&done(t)));
  const curInc =sum(transactions.filter(t=>isInc(t)&&done(t)));
  const plannedExp=sum(transactions.filter(t=>isExp(t)&&inMon(t)&&!done(t)));
  const plannedInc=sum(transactions.filter(t=>isInc(t)&&inMon(t)&&!done(t)));
  const totalExp=sum(transactions.filter(t=>isExp(t)&&inMon(t))), totalInc=sum(transactions.filter(t=>isInc(t)&&inMon(t)));
  const prevExp=sum(transactions.filter(t=>isExp(t)&&donePrv(t)));
  const prevInc=sum(transactions.filter(t=>isInc(t)&&donePrv(t)));
  const prevFullExp=sum(transactions.filter(t=>isExp(t)&&happenedIn(prv,now)(t)));
  const momDiff=cw.kind&&prevExp>0?curExp-prevExp:null;
  const curIn=sum(transactions.filter(t=>isIn(t)&&done(t))), curOther=Math.round((curIn-curInc)*100)/100;
  // Negative when expenses exceed money in — don't clamp, show the deficit (money in, as before Run 35: a refund or savings withdrawal is spendable)
  const surplusRate=curIn>0?Math.round(((curIn-curExp)/curIn)*100):null;
  return { curExp,curInc,curIn,curOther,plannedExp,plannedInc,totalExp,totalInc,prevExp,prevInc,prevFullExp,momDiff,surplusRate,cmpKind:cw.kind,cmpDays:cw.days };
}

export function calcCategorySpend(transactions, mon=curMon(), now=new Date()) {
  const out={}, done=happenedIn(mon,now);
  transactions.filter(t=>t.type==="expense"&&done(t))
    .forEach(t=>{ out[t.category]=(out[t.category]||0)+Math.round((Number(t.amount)||0)*100); });
  Object.keys(out).forEach(k=>{ out[k]=out[k]/100; });   // Run 22 audit: summed in whole cents
  return out;
}

// ─── Run 50 (owner list #5): month-end rollover to a goal ─────────────────────────────────────────────────────────────
// In the first week of a month, if last month ended with money left over (money in minus spending, the same figures as the
// month card) and a goal is not finished, Home offers to add that amount to the goal. A goal's "saved" is a number the user
// keeps (it is not linked to an account), so adding to it changes no balance. Declining is remembered per month in its own key.
const ROLLOVER_KEY=KEY+"__rollover";
export function readRolloverSeen() { try { return localStorage.getItem(ROLLOVER_KEY)||""; } catch { return ""; } }
export function writeRolloverSeen(ym) { try { localStorage.setItem(ROLLOVER_KEY,String(ym)); } catch { /* offered again next time */ } }
export function rolloverOffer(transactions, goals, seenYm="", now=new Date()) {
  if (now.getDate()>7) return null;
  const prv=localMonthStr(new Date(now.getFullYear(),now.getMonth()-1,1));
  if (seenYm===prv) return null;
  const s=calcMonthSummary(transactions||[], prv, localMonthStr(new Date(now.getFullYear(),now.getMonth()-2,1)), now);
  const kept=Math.round((s.curIn-s.curExp)*100)/100;
  if (!(kept>=1)) return null;
  const open=(goals||[]).map(g=>({ id:g.id, name:String(g.name||""), remaining:Math.round(((Number(g.target)||0)-(Number(g.saved)||0))*100)/100 }))
    .filter(g=>g.id && g.remaining>0).slice(0,3)
    .map(g=>({ ...g, amount:Math.min(kept,g.remaining) }));
  return open.length ? { month:prv, kept, goals:open } : null;
}
// Adds `amount` (capped at what is still missing) to one goal; every other goal and the goal's other fields stay as they were.
export function applyRollover(goals, goalId, amount) {
  const a=Math.round((Number(amount)||0)*100)/100;
  if (!(a>0)) return goals;
  return (goals||[]).map(g=>{
    if (g.id!==goalId) return g;
    const saved=Number(g.saved)||0, left=Math.max(0,Math.round(((Number(g.target)||0)-saved)*100)/100);
    return { ...g, saved:Math.round((saved+Math.min(a,left))*100)/100 };
  });
}

// ─── Run 50 (owner list #6): set money aside for a yearly bill ──────────────────────────────────────────────────────────
// For each active, explicit YEARLY expense bill whose next due date is ahead, the amount to put aside every month so the whole
// bill is ready on its due date (the same rounded-up figure the goals use). A bill whose name already matches a goal is left out,
// so the offer disappears once the person has made the goal. Nothing is created here; the Goals screen offers a button.
export function sinkingCandidates(transactions, bills, goals, now=new Date()) {
  const have=new Set((goals||[]).map(g=>String(g&&g.name||"").trim().toLowerCase()));
  const out=[];
  for (const s of buildSchedules(transactions||[], bills||[])) {
    if (!s.billId || !s.isActive || s.type!=="expense" || s.freq!=="yearly") continue;
    const name=String(s.merchant||"").trim();
    if (!name || have.has(name.toLowerCase())) continue;
    const due=scheduleNextDue(s, transactions||[], now); if (!due) continue;
    const dueStr=localDateStr(due), r=goalRequiredMonthly({ target:s.amount, saved:0, targetDate:dueStr }, now);
    if (r.state!=="active") continue;
    out.push({ billId:s.billId, name, amount:s.amount, due:dueStr, months:r.periods, perMonth:r.perMonth });
  }
  return out.sort((a,b)=>a.due.localeCompare(b.due)||a.name.localeCompare(b.name));
}

// ─── Run 50 (owner list #2): write entries as a sentence ──────────────────────────────────────────────────────────────
// "bolt 12, market 25 yesterday" becomes two entries to REVIEW; nothing is saved by the parser. Local rules only (no AI, no network).
// Lines, ";" and commas that do not start a decimal ("12,50" is 12.50) separate entries. In each entry: a number is the amount (the last
// one wins and the row is flagged when there are several), "yesterday / dünən / вчера" and "today / bu gün / сегодня" set the date, a
// full date (31.10.2026, 31/10, 2026-10-31) sets it exactly, a leading "+" or a word like salary / maaş / зарплата makes it income.
// What is left is the merchant. The category comes from the person's own history first, then the built-in merchant list, else Other.
// (JavaScript's \b only knows ASCII letters, so words are delimited by spaces here: the text is padded with one before parsing.)
const qtWord=(alts,flags="i")=>new RegExp("(^|\\s)(?:"+alts+")(?=\\s|$)",flags);
const QT_CUR=/₼|(^|\s)(?:azn|manat|manata|manatı|manatdan|руб|руб\.|манат|манатов|манатах|маната)(?=\s|$)/gi;
const QT_INCOME=qtWord("maaş|maas|salary|зарплата|зарплату|зп|income|gəlir|доход");
const QT_DBY=qtWord("day before yesterday|srağagün|позавчера"), QT_Y=qtWord("yesterday|dünən|вчера"), QT_TD=qtWord("today|bu gün|bugün|сегодня");
export function parseQuickText(text, memory={}, now=new Date()) {
  const chunks=String(text==null?"":text).replace(/\r/g,"").split(/\n|;|,(?!\d)/).map(s=>s.trim()).filter(Boolean).slice(0,20);
  const day=(k)=>localDateStr(new Date(now.getFullYear(),now.getMonth(),now.getDate()-k));
  return chunks.map(raw=>{
    let s=" "+raw+" ", type="expense", date=day(0), reason=null, warn=false;
    if (/^\s*\+/.test(s)) { type="income"; s=s.replace(/^\s*\+/," "); }
    if (QT_INCOME.test(s)) type="income";
    s=s.replace(QT_DBY,()=>{ date=day(2); return " "; });
    s=s.replace(QT_Y,()=>{ date=day(1); return " "; });
    s=s.replace(QT_TD," ");
    s=s.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/,(m,y,mo,d)=>{ const v=`${y}-${mo}-${d}`; if (isValidDateStr(v)) date=v; else warn=true; return " "; });
    s=s.replace(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/,(m,d,mo,y)=>{ const v=`${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`; if (isValidDateStr(v)) date=v; else warn=true; return " "; });
    s=s.replace(/\b(\d{1,2})\/(\d{1,2})\b/,(m,d,mo)=>{ let y=now.getFullYear(); let v=`${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`; if (isValidDateStr(v)) { if (v>localDateStr(now)) { y-=1; v=`${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`; } if (isValidDateStr(v)) date=v; else warn=true; } else warn=true; return " "; });
    s=s.replace(QT_CUR," ");
    const nums=[...s.matchAll(/\d+(?:[.,]\d+)?/g)];
    let amount=null;
    if (!nums.length) reason="noAmount";
    else {
      const pick=nums[nums.length-1]; warn=warn||nums.length>1;
      amount=parseMoney(pick[0].replace(",","."),{positive:true});
      if (amount===null) reason="badAmount"; else s=s.slice(0,pick.index)+" "+s.slice(pick.index+pick[0].length);
    }
    let merchant=s.replace(/[€$]/g," ").replace(/\s+/g," ").trim();
    const salaryWord=qtWord("maaş|maas|salary|зарплата|зарплату|зп").test(" "+raw+" ");
    if (type==="income") merchant=(" "+merchant+" ").replace(QT_INCOME," ").replace(/\s+/g," ").trim();
    if (merchant) merchant=merchant.charAt(0).toUpperCase()+merchant.slice(1);
    let category=type==="income" ? (salaryWord ? "salary" : "income") : "other", subcategory="";
    if (merchant) {
      const mem=merchantSuggest(merchant,memory||{},type), kn=type==="expense" ? knownMerchantExact(merchant) : null;
      if (mem && mem.category) { category=mem.category; subcategory=mem.subcategory||""; }
      else if (kn) { category=kn.category; subcategory=kn.subcategory||""; }
    }
    return { raw, ok:reason===null, reason, warn, type, amount, merchant, category, subcategory, date };
  });
}

// ─── Run 50 (owner list #3): gift ledger ──────────────────────────────────────────────────────────────────────────────
// A view over entries that already exist: expenses in the "Gifts & Personal" category are gifts GIVEN, income in "Gifts Received" is gifts
// RECEIVED. The merchant field is the person (or the occasion's host), the note or subcategory is the event ("Wedding", "Birthday").
// Nothing new is stored; the page only reads. A search matches person, note, subcategory and amount, in any letter case.
export function giftLedger(transactions, query="") {
  const q=lc(String(query||"").trim());
  const rows=(transactions||[]).filter(x=>x && ((x.type==="expense" && x.category==="gifts") || (x.type==="income" && x.category==="giftin")) && isValidDateStr(String(x.date)))
    .map(x=>({ txn:x, kind:x.type==="expense" ? "given" : "received", person:String(x.merchant||"").trim(), event:String(x.note||x.subcategory||"").trim(), cents:Math.round((Number(x.amount)||0)*100) }))
    .filter(r=>!q || lc(r.person).includes(q) || lc(r.event).includes(q) || lc(String(r.txn.subcategory||"")).includes(q) || String(r.txn.amount).includes(q))
    .sort((a,b)=>b.txn.date.localeCompare(a.txn.date) || String(b.txn.createdAt||"").localeCompare(String(a.txn.createdAt||"")));
  const people=new Map();
  for (const r of rows) {
    const key=lc(r.person)||"\u0000"; const p=people.get(key)||{ name:r.person, given:0, received:0, count:0 };
    if (r.kind==="given") p.given+=r.cents; else p.received+=r.cents;
    p.count++; people.set(key,p);
  }
  const list=[...people.values()].map(p=>({ ...p, given:p.given/100, received:p.received/100 }))
    .sort((a,b)=>(b.given+b.received)-(a.given+a.received) || a.name.localeCompare(b.name));
  const sum=k=>rows.filter(r=>r.kind===k).reduce((s,r)=>s+r.cents,0)/100;
  return { rows, people:list, given:sum("given"), received:sum("received") };
}

// ─── Run 50 (owner list #9): suggest bills from repeated payments ───────────────────────────────────────────────────
// An expense place that was paid at least 3 times, about once a month or once a year, for almost the same amount, and was paid
// recently enough to still be going, is offered as a bill. Entries already tied to a bill or marked recurring, places that already
// have a bill of the same name, and places the person dismissed are left out. Nothing is created here; the person reviews the bill
// first. The first due date offered is the NEXT one after today (the earlier payments stay as they are, not linked).
const RECSUG_KEY=KEY+"__recsug";
export function readRecSuggestDismissed() { try { const v=JSON.parse(localStorage.getItem(RECSUG_KEY)||"[]"); return Array.isArray(v) ? v.filter(x=>typeof x==="string").slice(0,200) : []; } catch { return []; } }
export function writeRecSuggestDismissed(list) { try { localStorage.setItem(RECSUG_KEY,JSON.stringify([...new Set((list||[]).map(x=>String(x)))].slice(0,200))); } catch { /* offered again next time */ } }
export function recurringSuggestions(transactions, bills, dismissed=[], now=new Date()) {
  const billNames=new Set((bills||[]).map(b=>lc(String(b&&b.name||"").trim()))), gone=new Set((dismissed||[]).map(x=>lc(String(x).trim())));
  const by=new Map();
  for (const x of transactions||[]) {
    if (!x || x.type!=="expense" || x.billId || x.recurring || !isValidDateStr(String(x.date))) continue;
    const name=String(x.merchant||"").trim(); if (!name) continue;
    const k=lc(name); if (!by.has(k)) by.set(k,{ name, list:[] }); by.get(k).list.push(x);
  }
  const out=[], todayStr=localDateStr(now);
  for (const { name, list } of by.values()) {
    if (list.length<3 || billNames.has(lc(name)) || gone.has(lc(name))) continue;
    const sorted=[...list].sort((a,b)=>a.date.localeCompare(b.date));
    const rec=detectRecurrence(sorted);
    if (!rec.isRecurring || (rec.recurringFreq!=="monthly" && rec.recurringFreq!=="yearly")) continue;
    const amts=sorted.map(x=>Math.round((Number(x.amount)||0)*100)).filter(a=>a>0);
    if (amts.length<3 || Math.max(...amts)>Math.min(...amts)*1.25) continue;
    const last=sorted[sorted.length-1];
    if (daysBetween(parseLocalDate(last.date),now)>rec.avgDaysBetween*1.6) continue;
    const step=rec.recurringFreq==="yearly" ? 12 : 1;
    let next=addMonths(parseLocalDate(last.date),step);
    for (let i=0;i<40 && localDateStr(next)<todayStr;i++) next=addMonths(next,step);
    out.push({ name, amount:Math.round((Number(last.amount)||0)*100)/100, freq:rec.recurringFreq, count:sorted.length, lastDate:last.date, anchorDate:localDateStr(next), category:last.category, subcategory:last.subcategory||"" });
  }
  return out.sort((a,b)=>a.name.localeCompare(b.name));
}

// ─── Run 50 (owner list #1): the optional "set up in a minute" questions ──────────────────────────────────────────────
// Answers (all optional) -> a plan of what to create: up to two accounts with an opening balance, one monthly income bill (fixed pay and
// pay day), one goal. Nothing is created here and nothing is guessed: an empty answer creates nothing, an invalid one is reported by
// field and the whole plan is refused so the person can fix it. Accounts whose name already exists are skipped.
export function nextPayDate(day, now=new Date()) {
  const clamp=(y,m)=>Math.min(day,new Date(y,m+1,0).getDate());
  let y=now.getFullYear(), m=now.getMonth(), d=new Date(y,m,clamp(y,m));
  if (localDateStr(d)<localDateStr(now)) { m++; if (m>11) { m=0; y++; } d=new Date(y,m,clamp(y,m)); }
  return localDateStr(d);
}
export function planSetup(a, names, existingAccountNames=[], now=new Date()) {
  const errors={}, plan={ accounts:[], bill:null, goal:null, skipped:[] };
  const money=(v,field,{zeroOk=true}={})=>{ const s=String(v==null?"":v).trim().replace(",","."); if (s==="") return null; const n=parseMoney(s,{positive:true}); if (n===null) { if (zeroOk && Number(s)===0 && /^[0-9.]+$/.test(s)) return null; errors[field]="invalid"; return null; } return n; };
  const have=new Set((existingAccountNames||[]).map(x=>lc(String(x).trim())));
  const cash=money(a&&a.cash,"cash"), bank=money(a&&a.bank,"bank");
  for (const [amt,kind,name] of [[cash,"cash",names&&names.cash],[bank,"card",names&&names.bank]]) {
    if (amt===null) continue;
    if (have.has(lc(String(name||"").trim()))) { plan.skipped.push(name); continue; }
    plan.accounts.push({ name:String(name||"").trim(), kind, amount:amt });
  }
  if (a && a.income==="fixed") {
    const sal=money(a.salary,"salary",{zeroOk:false}), dayN=Number(String(a.payDay==null?"":a.payDay).trim());
    if (sal===null && !errors.salary) errors.salary="required";
    if (!Number.isInteger(dayN) || dayN<1 || dayN>31 || String(a.payDay==null?"":a.payDay).trim()==="") errors.payDay="invalid";
    if (!errors.salary && !errors.payDay) plan.bill={ name:String(names&&names.salary||"").trim(), type:"income", category:"salary", subcategory:"", amount:sal, freq:"monthly", anchorDate:nextPayDate(dayN,now), ...(dayN>28 ? { dueDay:dayN } : {}) };
  }
  const gn=String(a&&a.goalName||"").trim(), gt=money(a&&a.goalTarget,"goalTarget",{zeroOk:false});
  if (gn || gt!==null || errors.goalTarget) {
    if (gn.length>60) errors.goalName="long";
    else if (!gn) errors.goalName="required";
    if (gt===null && !errors.goalTarget) errors.goalTarget="required";
    if (!errors.goalName && !errors.goalTarget) plan.goal={ name:gn, target:gt, saved:0, monthlyTarget:0, targetDate:null };
  }
  return { ...plan, errors, ok:Object.keys(errors).length===0 };
}

// Run 16: money spent in one month by wallet, by the same rule as calcCategorySpend (entries that have happened, not later ones).
// Whole cents, so 0.1 + 0.2 is exactly 0.30. "none" = entries without a wallet. "used" = at least one entry has a wallet.
// Run 57: grouped by the same "paid from" rule as the entry filter (paidFromKind), so the two screens always agree: an entry on a cash
// account and an older entry marked "Cash" are both cash. Without the accounts (older callers) only the old wallet field is used.
export function calcWalletSpend(transactions, mon=curMon(), now=new Date(), accountsById=null) {
  const done=happenedIn(mon,now), cents={}; let totalC=0, used=false;
  (transactions||[]).filter(t=>t.type==="expense"&&done(t)).forEach(t=>{
    const w=paidFromKind(t,accountsById); if (w!=="none") used=true;
    const c=Math.round(Number(t.amount)*100); cents[w]=(cents[w]||0)+c; totalC+=c;
  });
  const byWallet={}; Object.keys(cents).forEach(k=>{ byWallet[k]=cents[k]/100; });
  return { byWallet, total:totalC/100, used };
}

// Where a month sits relative to today. "daysLeft" counts the days AFTER today; "daysRemaining" counts today as well,
// because today's spending is still open. Every screen that shows "days left" or a per-day figure uses daysRemaining.
export function daysBetween(a, b) {   // calendar days from a to b, ignoring time of day and DST
  return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);
}
function monthProgress(mon, now=new Date()) {
  const totalDays=daysInMonth(mon), cur=localMonthStr(now);
  if (mon===cur) { const d=now.getDate(); return { state:"current", totalDays, daysPassed:d, daysLeft:totalDays-d, daysRemaining:totalDays-d+1 }; }
  if (mon<cur)   return { state:"past",   totalDays, daysPassed:totalDays, daysLeft:0, daysRemaining:0 };
  return           { state:"future", totalDays, daysPassed:0, daysLeft:totalDays, daysRemaining:totalDays };
}
// Spending that has actually happened by today (entries dated later this month are planned, not yet spent).
export function calcSpentToDate(transactions, mon=curMon(), now=new Date()) {
  const p=monthProgress(mon,now); if (p.state==="future") return 0;
  const todayStr=localDateStr(now);
  return transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&(p.state==="past"||t.date<=todayStr)).reduce((s,t)=>s+Math.round((Number(t.amount)||0)*100),0)/100;   // Run 22 audit: whole cents
}

export function calcSpendingPace(spent, mon=curMon(), budgetTotal=0, now=new Date()) {
  const p=monthProgress(mon,now);
  const dailyAvg=p.daysPassed>0 ? spent/p.daysPassed : 0;
  const projected=p.state==="current" ? dailyAvg*p.totalDays : spent;
  // A projection from very few days is noise: say so instead of presenting it as a forecast.
  const projectionReliable=p.state!=="current" || p.daysPassed>=5;
  // "On track" only means something against an external benchmark (a budget); otherwise it stays null.
  let onTrack=null, expectedByToday=null, diff=null;
  if (budgetTotal>0 && p.state!=="future") {
    expectedByToday = p.state==="past" ? budgetTotal : (budgetTotal/p.totalDays)*p.daysPassed;
    diff=spent-expectedByToday;
    onTrack = p.state==="past" ? spent<=budgetTotal : spent<=expectedByToday*1.05;
  }
  return { state:p.state, daysPassed:p.daysPassed, totalDays:p.totalDays, daysLeft:p.daysLeft, daysRemaining:p.daysRemaining, dailyAvg, projected, projectionReliable, expectedByToday, diff, onTrack };
}

// Run 17: month-end forecast for the CURRENT month. It replaces "daily average x days in month", which is thrown off by one big early
// payment (rent on the 3rd made a 30-day forecast several times too high).
//   forecast = spent so far + entries already dated later this month + bills still unpaid + days left x the usual daily spend.
// Usual daily spend = the 28 days ending yesterday (at least 7 days of history), without bills/recurring entries (counted on their
// own) and without unusually large single purchases (more than 5x the median purchase). The +/- range is one standard deviation of
// the daily totals x sqrt(days left). `rangeShown` is true only when the same method, run on up to 3 earlier months as of their 10th
// day, put the real total inside the range in at least 2/3 of them (and at least 2 months could be tested).
const FORECAST_WINDOW=28, FORECAST_MIN_HISTORY=7, FORECAST_BIG=5;
function forecastCore(transactions, bills, now) {
  const mon=localMonthStr(now), todayStr=localDateStr(now), p=monthProgress(mon,now);
  const cents=(x)=>Math.round(x*100)/100;
  const expenses=transactions.filter(t=>t.type==="expense");
  if (!expenses.length) return { available:false, reason:"history" };
  const inMon=expenses.filter(t=>t.date.startsWith(mon));
  const spentSoFar=inMon.filter(t=>t.date<=todayStr).reduce(addAmt,0);
  const plannedLater=inMon.filter(t=>t.date>todayStr).reduce(addAmt,0);
  let commitments=0;
  buildSchedules(transactions,bills).filter(s=>s.isActive && s.type==="expense").forEach(s=>{
    const st=scheduleMonthStatus(s,transactions,mon,now);
    commitments+=s.amount*(st.upcoming.length+st.overdue.length);
  });
  const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);              // yesterday: today is only partly over
  const first=parseLocalDate(expenses.reduce((m,t)=>t.date<m?t.date:m,expenses[0].date));
  const winStart=new Date(end.getFullYear(),end.getMonth(),end.getDate()-(FORECAST_WINDOW-1));
  const start=first>winStart?first:winStart;
  const days=daysBetween(start,end)+1;
  if (days<FORECAST_MIN_HISTORY) return { available:false, reason:"history" };
  const s0=localDateStr(start), e0=localDateStr(end);
  const usual=expenses.filter(t=>t.date>=s0 && t.date<=e0 && !t.recurring && !t.billId);
  const sorted=usual.map(t=>t.amount).sort((a,b)=>a-b);
  const median=sorted.length ? (sorted.length%2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2) : 0;
  const kept=median>0 ? usual.filter(t=>t.amount<=FORECAST_BIG*median) : usual;
  const perDay=new Array(days).fill(0);
  kept.forEach(t=>{ perDay[daysBetween(start,parseLocalDate(t.date))]+=t.amount; });
  const mean=perDay.reduce((s,v)=>s+v,0)/days;
  const sd=Math.sqrt(perDay.reduce((s,v)=>s+(v-mean)*(v-mean),0)/days);
  const base=spentSoFar+plannedLater+commitments, point=base+mean*p.daysLeft, half=sd*Math.sqrt(p.daysLeft);
  return { available:true, spentSoFar:cents(spentSoFar), plannedLater:cents(plannedLater), commitments:cents(commitments), usualDaily:cents(mean), daysLeft:p.daysLeft,
    point:cents(point), low:cents(Math.max(base,point-half)), high:cents(point+half) };
}
export function calcMonthEndForecast(transactions, bills=[], now=new Date()) {
  const f=forecastCore(transactions,bills,now);
  if (!f.available) return { ...f, rangeShown:false, backtest:{ months:0, hits:0 } };
  let months=0, hits=0;
  for (let k=1;k<=3;k++) {
    const m=new Date(now.getFullYear(),now.getMonth()-k,1), asOf=new Date(m.getFullYear(),m.getMonth(),10,12,0,0), mon=localMonthStr(m);
    const known=transactions.filter(t=>t.date<=localDateStr(asOf));
    const b=forecastCore(known,bills,asOf); if (!b.available) continue;
    const actual=transactions.filter(t=>t.type==="expense" && t.date.startsWith(mon)).reduce(addAmt,0);
    months++; if (actual>=b.low-0.005 && actual<=b.high+0.005) hits++;
  }
  return { ...f, backtest:{ months, hits }, rangeShown:months>=2 && hits*3>=months*2 };
}

// Run 43: "at your usual pace the money may run out around day N". Uses what the app already trusts: the usual daily spend of the forecast (the 28 days
// before today, without bills/recurring entries and without unusually large purchases, so one big day cannot cause a scare) and the Safe to Spend that is
// left (already after bills still to pay). Shown only when there is a real chance of running short: from the 5th of the month, at least 7 days of
// history, money left, and the cover is at least 2 days shorter than the days remaining. Wording says "around"; it is an estimate, never a promise.
export function calcRunOutDay(transactions, bills, remaining, daysRemaining, now=new Date()) {
  const none={ show:false };
  if (!(remaining>0) || !(daysRemaining>0) || now.getDate()<5) return none;
  const f=forecastCore(Array.isArray(transactions)?transactions:[],Array.isArray(bills)?bills:[],now);
  if (!f.available || !(f.usualDaily>0)) return none;
  const cover=remaining/f.usualDaily;
  if (cover>=daysRemaining-2) return none;
  const day=new Date(now.getFullYear(),now.getMonth(),now.getDate()+Math.floor(cover));
  if (day.getMonth()!==now.getMonth()) return none;
  return { show:true, day:day.getDate(), usualDaily:f.usualDaily, cover:Math.round(cover*10)/10 };
}

// Run 24: split one entry (a shopping receipt, say) into 2–6 entries in different categories. No new data shape: the original is
// replaced by ordinary entries with the same date, merchant, note, wallet and tag, and their amounts add up to the original to the
// cent. Entries that belong to a bill, a repeating schedule or a debt repayment are not split, so those links never break.
export const SPLIT_MAX=6;
export function splitTransaction(txn, parts, mkId=()=>Date.now()+Math.random()) {
  if (!txn || !(Number(txn.amount)>0)) return { ok:false, reason:"invalid" };
  if (txn.recurring || txn.billId || txn.debtLink) return { ok:false, reason:"linked" };
  if (!Array.isArray(parts) || parts.length<2 || parts.length>SPLIT_MAX) return { ok:false, reason:"count" };
  const total=Math.round(Number(txn.amount)*100), isInc=txn.type==="income", { id:_id, ...base }=txn;
  let sum=0; const entries=[];
  for (const p of parts) {
    const cat=p && CATEGORIES.find(x=>x.id===p.category), c=Math.round((Number(p && p.amount)||0)*100);
    if (!cat || cat.income!==isInc) return { ok:false, reason:"category" };
    if (!(c>0)) return { ok:false, reason:"amount" };
    sum+=c;
    entries.push({ ...base, id:mkId(), category:cat.id, amount:c/100, subcategory:cat.id===txn.category ? (txn.subcategory||"") : "" });
  }
  return sum===total ? { ok:true, entries } : { ok:false, reason:"sum", diff:(total-sum)/100 };
}

// Run 41 (owner wishlist): one-tap rebalance. For the category furthest over its limit this month, suggest moving the shortfall (rounded
// up to a whole currency unit) from categories that still have room: each gives at most half of its room, in whole units, largest room first.
// Only a plan that covers the whole shortfall is offered; otherwise null. Pure: it changes nothing. Limits are monthly and apply to every month.
export function planRebalance(items) {
  const list=Array.isArray(items)?items.filter(x=>x && x.catId && Number(x.limit)>0):[];
  const c=(v)=>Math.round((Number(v)||0)*100);
  const over=list.filter(x=>c(x.spent)>c(x.limit)).sort((a,b)=>(c(b.spent)-c(b.limit))-(c(a.spent)-c(a.limit)))[0];
  if (!over) return null;
  const need=Math.ceil((c(over.spent)-c(over.limit))/100);
  const donors=list.filter(x=>x!==over && c(x.spent)<=c(x.limit)).map(x=>({ catId:x.catId, room:Math.floor((c(x.limit)-c(x.spent))/200) })).filter(x=>x.room>=1).sort((a,b)=>b.room-a.room);
  let left=need; const moves=[];
  for (const d of donors) { if (left<=0) break; const give=Math.min(d.room,left); moves.push({ catId:d.catId, amount:give }); left-=give; }
  return left>0 ? null : { catId:over.catId, need, moves };
}
export function applyRebalance(budgets, plan) {
  const b={ ...(budgets||{}) }; if (!plan) return b;
  const cents=(v)=>Math.round((Number(v)||0)*100);
  b[plan.catId]=(cents(b[plan.catId])+plan.moves.reduce((s,m)=>s+m.amount*100,0))/100;
  plan.moves.forEach(m=>{ b[m.catId]=(cents(b[m.catId])-m.amount*100)/100; });
  return b;
}

// Run 24: a newly added expense can push its category past 80% of that month's limit ("near") or past the limit ("over"). Only the
// crossing is reported, once, so entries that follow in the same state stay quiet. Cent-exact; never touches the ledger.
function budgetCrossing(before, after, budgets, txn, now=new Date()) {
  if (!txn || txn.type!=="expense" || !isPlainObject(budgets)) return null;
  const limit=Math.round((Number(budgets[txn.category])||0)*100), mon=String(txn.date||"").slice(0,7);
  if (limit<=0 || !/^\d{4}-\d{2}$/.test(mon)) return null;
  const c=(list)=>Math.round(((calcCategorySpend(list||[],mon,now)[txn.category])||0)*100);
  const b=c(before), a=c(after);
  if (a>limit && b<=limit) return { kind:"over", pct:Math.round(a*100/limit) };
  if (a<=limit && a*5>=limit*4 && b*5<limit*4) return { kind:"near", pct:Math.round(a*100/limit) };
  return null;
}

export function calcBudgetStatus(budgets, catSpend, mon=curMon(), now=new Date()) {
  const p=monthProgress(mon,now);
  const pacePct=p.totalDays ? Math.round((p.daysPassed/p.totalDays)*100) : 0;
  return Object.entries(budgets).filter(([,v])=>v>0).map(([catId,limit])=>{
    const spent=catSpend[catId]||0;
    const pct=Math.min((spent/limit)*100,100);
    const over=spent>limit, warn=pct>=80&&!over;
    const aheadOfPace=p.state==="current" && Math.round(pct)>pacePct+10;   // pace only means something while the month is under way
    return { catId,limit,spent,pct,over,warn,aheadOfPace,daysLeft:p.daysRemaining,daysRemaining:p.daysRemaining,state:p.state };
  });
}

export function calcTxnStats(transactions, mon=curMon(), now=new Date()) {
  const done=happenedIn(mon,now);
  const amts=transactions.filter(t=>t.type==="expense"&&done(t)).map(t=>t.amount);
  const isWkend=d=>[0,6].includes(parseLocalDate(d).getDay());
  const wkdExp=transactions.filter(t=>t.type==="expense"&&done(t)&&!isWkend(t.date)).reduce(addAmt,0);
  const wkndExp=transactions.filter(t=>t.type==="expense"&&done(t)&&isWkend(t.date)).reduce(addAmt,0);
  return { count:amts.length, avgTxn:amts.length?amts.reduce((s,a)=>s+a,0)/amts.length:0, medTxn:median(amts), weekdayExp:wkdExp, weekendExp:wkndExp };
}

// Weekend vs weekday spending PER DAY for one month, counting only days that have passed (today included) and only
// expenses dated on those days. A month has ~2.5× more weekdays than weekend days, so raw totals are never compared.
// heavier: "weekend" | "weekday" | "same" (equal to the cent) | null (no spending, or a group has no elapsed day yet).
export function calcWeekdayWeekend(transactions, mon=curMon(), now=new Date()) {
  const p=monthProgress(mon,now);
  const [y,m]=mon.split("-").map(Number);
  let weDays=0, wdDays=0;
  for (let d=1; d<=p.daysPassed; d++) { if ([0,6].includes(new Date(y,m-1,d).getDay())) weDays++; else wdDays++; }
  const lastStr=p.daysPassed>0 ? `${mon}-${String(p.daysPassed).padStart(2,"0")}` : "";
  const isWkend=d=>[0,6].includes(parseLocalDate(d).getDay());
  const inWindow=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&t.date<=lastStr);
  const weTotal=inWindow.filter(t=>isWkend(t.date)).reduce(addAmt,0);
  const wdTotal=inWindow.filter(t=>!isWkend(t.date)).reduce(addAmt,0);
  const weAvg=weDays>0 ? weTotal/weDays : null, wdAvg=wdDays>0 ? wdTotal/wdDays : null;
  let heavier=null;
  if (weAvg!==null && wdAvg!==null && (weTotal>0 || wdTotal>0)) {
    const a=Math.round(weAvg*100), b=Math.round(wdAvg*100);
    heavier = a===b ? "same" : a>b ? "weekend" : "weekday";
  }
  return { weDays, wdDays, weTotal, wdTotal, weAvg, wdAvg, heavier };
}

// S3: What Changed — category + merchant-level explanation + recurring/one-off flag
export function calcWhatChanged(transactions, mon=curMon(), prv=prevMon(), now=new Date()) {
  // The previous month is taken over the same comparison window as the totals (Run 7, V9).
  const donePrv=comparisonWindow(mon,prv,now).inPrev, doneMon=happenedIn(mon,now);
  const catSpendMon=calcCategorySpend(transactions,mon,now);
  const catSpendPrv={}; transactions.filter(t=>t.type==="expense"&&donePrv(t)).forEach(t=>{ catSpendPrv[t.category]=(catSpendPrv[t.category]||0)+t.amount; });
  const { curExp,prevExp,curInc,prevInc,cmpKind,cmpDays }=calcMonthSummary(transactions,mon,prv,now);

  // Build a set of merchant names that have any recurring transaction
  const recurringMerchants=new Set(
    transactions.filter(t=>t.recurring&&t.merchant).map(t=>lc(t.merchant))
  );

  const cats=[...new Set([...Object.keys(catSpendMon),...Object.keys(catSpendPrv)])];
  const catChanges=cats.map(catId=>{
    const cur=catSpendMon[catId]||0,prev=catSpendPrv[catId]||0,diff=cur-prev;
    const merchantMon={},merchantPrv={};
    transactions.filter(t=>t.type==="expense"&&t.category===catId&&t.merchant&&doneMon(t)).forEach(t=>{merchantMon[t.merchant]=(merchantMon[t.merchant]||0)+t.amount;});
    transactions.filter(t=>t.type==="expense"&&t.category===catId&&t.merchant&&donePrv(t)).forEach(t=>{merchantPrv[t.merchant]=(merchantPrv[t.merchant]||0)+t.amount;});
    const allM=[...new Set([...Object.keys(merchantMon),...Object.keys(merchantPrv)])];
    const merchantDiffs=allM.map(m=>({
      merchant:m,
      cur:merchantMon[m]||0,
      prev:merchantPrv[m]||0,
      diff:(merchantMon[m]||0)-(merchantPrv[m]||0),
      // Fix 3: Is this merchant recurring or one-off?
      isRecurring: recurringMerchants.has(lc(m)),
    })).filter(m=>Math.abs(m.diff)>0.01).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,3);
    return { catId, cur, prev, diff, merchantDiffs };
  }).filter(c=>Math.abs(c.diff)>0.01).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));

  const merchantMon={},merchantPrv={};
  transactions.filter(t=>t.type==="expense"&&t.merchant&&doneMon(t)).forEach(t=>{merchantMon[t.merchant]=(merchantMon[t.merchant]||0)+t.amount;});
  transactions.filter(t=>t.type==="expense"&&t.merchant&&donePrv(t)).forEach(t=>{merchantPrv[t.merchant]=(merchantPrv[t.merchant]||0)+t.amount;});
  const allM=[...new Set([...Object.keys(merchantMon),...Object.keys(merchantPrv)])];
  const merchantChanges=allM.map(m=>({
    merchant:m, cur:merchantMon[m]||0, prev:merchantPrv[m]||0,
    diff:(merchantMon[m]||0)-(merchantPrv[m]||0),
    isRecurring: recurringMerchants.has(lc(m)),
  })).filter(c=>Math.abs(c.diff)>0.01).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,5);

  return { curExp,prevExp,curInc,prevInc,catChanges,merchantChanges,totalDiff:curExp-prevExp,cmpKind,cmpDays };
}

// S4: Safe to Spend — distinguishes available, future commitments, savings
// ─── Recurring model: a SCHEDULE (the repeating commitment) vs its OCCURRENCES (individual dated payments) ───
// Transactions flagged "recurring" are grouped into schedules by what they are — type, category, merchant (or note) and
// frequency — so recording the same rent three months running is ONE schedule with three occurrences, not three commitments.
// The subcategory is part of what a bill is, so electricity and water from the same utility stay two schedules (Run 6, D1);
// the amount is not (a price change keeps one schedule). Unnamed entries also split by amount so two different unnamed bills
// never merge. The key is computed on the fly and never stored.
function scheduleKey(t) {
  const who=norm(t.merchant)||norm(t.note);
  const tail=who ? norm(t.subcategory) : `${norm(t.subcategory)}|${Number(t.amount).toFixed(2)}`;
  return [t.type,t.category,who,t.recurFreq,tail].join("|");
}
// Run 12: explicit bills. A bill is the user's own record of a repeating payment — its name, expected amount, how often,
// and the date it is first due (the due day comes from that date, never from guessing). A payment points to its bill with
// billId. Payments with no (known) bill keep the earlier inferred grouping below, so data from before bills, or not yet
// converted, behaves exactly as it always did.
export function validateBill(b) {
  if (!isPlainObject(b)) return null;
  const id=isBillId(b.id) ? b.id.trim() : null;
  const name=typeof b.name==="string" ? b.name.trim() : "";
  const type=b.type==="income" ? "income" : b.type==="expense" ? "expense" : null;
  const amount=parseMoney(b.amount,{positive:true});
  const anchor=typeof b.anchorDate==="string" && isValidDateStr(b.anchorDate) ? b.anchorDate : null;
  const dueDayOk=b.dueDay===undefined || (Number.isInteger(b.dueDay) && b.dueDay>=1 && b.dueDay<=31);
  // Run 18: an optional last due date (the final instalment of a credit). Empty = none; anything else must be a real date on or after the first due date.
  const endRaw=b.endDate===undefined||b.endDate===null||b.endDate==="" ? null : b.endDate;
  const endOk=endRaw===null || (typeof endRaw==="string" && isValidDateStr(endRaw) && anchor!==null && endRaw>=anchor);
  if (!id || !name || name.length>80 || !type || amount===null || !RECUR_FREQS.has(b.freq) || !anchor || !dueDayOk || !endOk || (b.active!==undefined && typeof b.active!=="boolean")) return null;
  const ids=CATEGORIES.map(c=>c.id);
  return { id, name, type, category:ids.includes(b.category) ? b.category : "other", subcategory:txt(b.subcategory).slice(0,40), amount, freq:b.freq,
    anchorDate:anchor, ...(b.dueDay!==undefined ? { dueDay:b.dueDay } : {}), ...(endRaw!==null ? { endDate:endRaw } : {}), active:b.active!==false, createdAt:typeof b.createdAt==="string" ? b.createdAt : "" };
}
function newBillId(taken) { let id; do { id="b"+Date.now().toString(36)+Math.random().toString(36).slice(2,7); } while (taken && taken.has(id)); return id; }

// ── Run 13: bills mirror ──
// The version-9 app (live before bills) rewrites the whole ledger every time it starts and does not know `bills` or a
// payment's `billId`, so opening it once after a rollback erases both. It cannot be patched and the ledger key cannot change,
// so a small copy of the bills and the payment links is kept under a separate key that version 9 never touches (it only
// prunes its own "before_import" copies). When the ledger has lost bills the mirror still has, the app OFFERS to restore them;
// nothing is ever restored silently, and bills are matched by id only, never by name or amount.
const BILLS_MIRROR_KEY = `${KEY}__bills_mirror`;
function buildBillsMirror(bills, transactions) {
  const links={};
  for (const t of (transactions||[])) if (t && isBillId(t.billId)) links[String(t.id)]=t.billId;
  return { v:1, savedAt:new Date().toISOString(), bills:Array.isArray(bills) ? bills : [], links };
}
function planBillRestore(bills, transactions, mirror) {
  if (!isPlainObject(mirror) || mirror.v!==1 || !Array.isArray(mirror.bills)) return null;
  const have=new Set((bills||[]).map(b=>b.id)), seen=new Set(), add=[];
  for (const raw of mirror.bills) { const b=validateBill(raw); if (!b || have.has(b.id) || seen.has(b.id)) continue; seen.add(b.id); add.push(b); }
  if (!add.length) return null;
  const known=new Set([...have, ...seen]), links=[];
  if (isPlainObject(mirror.links)) for (const t of (transactions||[])) {
    if (t.billId!==undefined) continue;   // a payment that already points somewhere is never re-linked
    const to=mirror.links[String(t.id)];
    if (typeof to==="string" && known.has(to)) links.push({ id:t.id, billId:to });
  }
  return { bills:add, links };
}
function applyBillRestore(s, plan) {
  const have=new Set((s.bills||[]).map(b=>b.id));
  const to=new Map(plan.links.map(l=>[String(l.id), l.billId]));
  return { ...s, bills:[...(s.bills||[]), ...plan.bills.filter(b=>!have.has(b.id))],
    transactions:s.transactions.map(t=>(t.billId===undefined && to.has(String(t.id))) ? { ...t, billId:to.get(String(t.id)) } : t) };
}
function readBillsMirror() { try { const r=localStorage.getItem(BILLS_MIRROR_KEY); return r===null ? null : JSON.parse(r); } catch { return null; } }
// Best effort: the ledger itself was already saved. Users who never had bills get no extra key.
function syncBillsMirror(bills, transactions) {
  try { if (!(bills&&bills.length) && localStorage.getItem(BILLS_MIRROR_KEY)===null) return true; } catch { return false; }
  return writeRaw(BILLS_MIRROR_KEY, buildBillsMirror(bills, transactions));
}

export function buildSchedules(transactions, bills=[]) {
  const known=new Map((bills||[]).map(b=>[b.id,b]));
  const billed=(t)=>!!(t.billId && known.has(t.billId));
  const byDate=(a,b)=>a.date.localeCompare(b.date)||String(a.createdAt).localeCompare(String(b.createdAt));
  const fromBills=[...known.values()].map(b=>{
    const paid=transactions.filter(t=>t.billId===b.id).sort(byDate);
    return { key:"bill:"+b.id, billId:b.id, bill:b, anchorDate:b.anchorDate, type:b.type, category:b.category, subcategory:b.subcategory, merchant:b.name, note:"",
      freq:b.freq, amount:b.amount, isActive:b.active!==false, occurrences:paid.map(t=>t.date), memberIds:paid.map(t=>t.id), latest:paid[paid.length-1]||null, knownBills:known };
  });
  const groups=new Map();
  transactions.forEach(t=>{ if (t.recurring && RECUR_FREQS.has(t.recurFreq) && !billed(t)) { const k=scheduleKey(t); if (!groups.has(k)) groups.set(k,[]); groups.get(k).push(t); } });
  const inferred=[...groups.entries()].map(([key,members])=>{
    const sorted=[...members].sort(byDate);
    const latest=sorted[sorted.length-1];
    return { key, type:latest.type, category:latest.category, subcategory:latest.subcategory, merchant:latest.merchant, note:latest.note,
      freq:latest.recurFreq, amount:latest.amount, isActive:latest.isActive!==false, occurrences:sorted.map(t=>t.date), memberIds:sorted.map(t=>t.id), latest, knownBills:known };
  });
  return [...fromBills, ...inferred].sort((a,b)=>a.key.localeCompare(b.key));
}

// Turns every inferred schedule into a bill (one explicit step the user takes; the app shows Undo). Each bill takes the
// schedule's name, latest amount, frequency, activity and due day (from the earlier rules), starting at its first payment;
// each payment gets that bill's id. Nothing else in any record changes, the inputs are not modified, and running it again
// does nothing. Two bills that were already inferred as one stay one bill — the user separates them (assignToBill).
function convertLegacySchedules(transactions, bills=[], now=new Date()) {
  const legacy=buildSchedules(transactions,bills).filter(s=>!s.billId);
  if (!legacy.length) return { transactions, bills, created:0 };
  const taken=new Set((bills||[]).map(b=>b.id)), link=new Map(), made=[];
  legacy.forEach(s=>{
    const id=newBillId(taken); taken.add(id);
    const first=parseLocalDate(s.occurrences[0]);
    const day=(s.freq==="weekly"||s.freq==="biweekly") ? first.getDate() : Math.min(scheduleDueDay(s), new Date(first.getFullYear(),first.getMonth()+1,0).getDate());
    // dueDay keeps the intended day when it is later than the first payment's month allows (28 Feb, then 31 Mar → due on the 31st).
    made.push({ id, name:(s.merchant||s.note||catName(s.category)).trim().slice(0,80), type:s.type, category:s.category, subcategory:s.subcategory||"", amount:s.amount,
      freq:s.freq, anchorDate:localDateStr(new Date(first.getFullYear(),first.getMonth(),day)), ...((s.freq==="monthly"||s.freq==="yearly") ? { dueDay:scheduleDueDay(s) } : {}), active:s.isActive, createdAt:now.toISOString() });
    s.memberIds.forEach(mid=>link.set(String(mid),id));
  });
  return { transactions:transactions.map(t=>link.has(String(t.id)) ? { ...t, billId:link.get(String(t.id)) } : t), bills:[...(bills||[]), ...made], created:made.length };
}

// Marks one entry as the payment of a bill — an existing bill (target = its id) or a new bill made from this entry
// (target = "new": its name, amount and frequency, due from its date). The entry keeps its own amount, date, category,
// name and id; it becomes recurring with the bill's frequency. Moving a payment to another bill never deletes a bill.
function assignToBill(transactions, bills=[], txnId, target, now=new Date()) {
  const txn=transactions.find(t=>String(t.id)===String(txnId));
  if (!txn) return { transactions, bills, billId:null };
  let list=bills||[], bill=null;
  if (target==="new") {
    bill={ id:newBillId(new Set(list.map(b=>b.id))), name:(txn.merchant||txn.note||catName(txn.category)).trim().slice(0,80), type:txn.type, category:txn.category,
      subcategory:txn.subcategory||"", amount:txn.amount, freq:RECUR_FREQS.has(txn.recurFreq) ? txn.recurFreq : "monthly", anchorDate:txn.date, active:true, createdAt:now.toISOString() };
    list=[...list, bill];
  } else bill=list.find(b=>b.id===target)||null;
  if (!bill) return { transactions, bills, billId:null };
  return { transactions:transactions.map(t=>t===txn ? { ...t, billId:bill.id, recurring:true, recurFreq:bill.freq, isActive:true } : t), bills:list, billId:bill.id };
}
export const scheduleMonthly = (s) => toMonthlyAmountHelper({ amount:s.amount, recurFreq:s.freq });   // an ESTIMATE of a typical month

// The day of the month a monthly/yearly schedule is due on. It is the latest payment's day — except when that payment fell
// on the last day of a short month (28 Feb, 30 Apr), which is only where a later due day was clamped to: then the run of
// month-end payments before it shows the intended day (31 Jan, 28 Feb → 31; 29 Feb 2024, 28 Feb 2025 → 29). A payment on
// a day that is not its month's last day (28 Mar) is a deliberate change and becomes the new due day.
// Run 8: one payment on a different day (paid early or late, or recorded with "Record payment" on the day it was paid)
// does not move the due day when the two payments before it agree; a real change needs two payments in a row on the new
// day. Trade-off: the first payment after a genuine due-date change is read as early/late until the second one confirms it.
function scheduleDueDay(s) {
  const ds=s.occurrences.map(parseLocalDate), isMonthEnd=(d)=>d.getDate()===new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const dueAt=(n)=>{   // the due day implied by the first n payments
    let day=ds[n-1].getDate();
    for (let i=n-1; i>=0 && isMonthEnd(ds[i]); i--) day=Math.max(day, ds[i].getDate());
    return day;
  };
  const n=ds.length, last=dueAt(n);
  if (n>=3) { const prev=dueAt(n-1), prev2=dueAt(n-2); if (prev===prev2 && last!==prev) return prev; }
  return last;
}

// Dates a schedule is expected to fall on inside month `mon`, projected from its latest occurrence on its due day
// (clamped to the month's length: due on the 31st → 30 Apr, 28/29 Feb).
// Run 12: a bill's dates come from the bill itself — it starts on its anchor date and is due on that date's day (or, weekly,
// every 7 / 14 days from it) — whether or not anything has been paid yet.
function scheduleOccurrences(s, mon) {
  const [y,mo]=mon.split("-").map(Number);
  const first=new Date(y,mo-1,1), last=new Date(y,mo,0);
  const fromBill=!!s.billId;
  const anchor=fromBill ? parseLocalDate(s.anchorDate) : parseLocalDate(s.occurrences[s.occurrences.length-1]);
  const start=fromBill ? anchor : parseLocalDate(s.occurrences[0]);
  const dueDay=Math.min(fromBill ? (s.bill.dueDay||anchor.getDate()) : scheduleDueDay(s), last.getDate());
  if (mon<localMonthStr(start)) return [];                       // the commitment did not exist yet
  const out=[];
  if (s.freq==="weekly" || s.freq==="biweekly") {
    const step=s.freq==="weekly" ? 7 : 14;
    for (let k=Math.ceil(daysBetween(anchor,first)/step); ; k++) {
      const d=new Date(anchor.getFullYear(),anchor.getMonth(),anchor.getDate()+k*step);
      if (d>last) break;
      if (d>=first && d>=start) out.push(d);
    }
  } else if (s.freq==="monthly") out.push(new Date(y,mo-1,dueDay));
  else if (s.freq==="yearly" && anchor.getMonth()===mo-1) out.push(new Date(y,mo-1,dueDay));
  const end=fromBill && s.bill.endDate ? s.bill.endDate : null;   // Run 18: nothing is due after a bill's last date
  return end ? out.filter(d=>localDateStr(d)<=end) : out;
}

// Which expected occurrences in `mon` have no recorded payment yet. Monthly/yearly: any payment of the schedule in that month
// settles it. Weekly/biweekly: each payment settles at most one expected date within ±3 / ±6 days.
export function scheduleMonthStatus(s, transactions, mon, now=new Date()) {
  const todayStr=localDateStr(now);
  const expected=scheduleOccurrences(s,mon).map(localDateStr);
  // A bill's payments are the entries linked to it; an inferred schedule's are the unlinked recurring entries with its key.
  const linked=(t)=>!!(t.billId && s.knownBills && s.knownBills.has(t.billId));
  const mine=s.billId ? (t)=>t.billId===s.billId : (t)=>t.recurring && !linked(t) && scheduleKey(t)===s.key;
  const recorded=transactions.filter(t=>mine(t)&&t.date.startsWith(mon)).map(t=>t.date).sort();
  let remaining=[];
  if (s.freq==="monthly" || s.freq==="yearly") remaining = recorded.length ? [] : expected;
  else {
    const tol=s.freq==="weekly" ? 3 : 6, used=new Set();
    expected.forEach(e=>{
      const i=recorded.findIndex((r,ix)=>!used.has(ix) && Math.abs(daysBetween(parseLocalDate(r),parseLocalDate(e)))<=tol);
      if (i>=0) used.add(i); else remaining.push(e);
    });
  }
  return { expected, recorded, remaining, upcoming:remaining.filter(d=>d>=todayStr), overdue:remaining.filter(d=>d<todayStr) };
}

// Next date (today or later) with no payment recorded yet, or null.
export function scheduleNextDue(s, transactions, now=new Date()) {
  const todayStr=localDateStr(now);
  for (let i=0;i<14;i++) {
    const mon=localMonthStr(addMonths(new Date(now.getFullYear(),now.getMonth(),1),i));
    const c=scheduleMonthStatus(s,transactions,mon,now).remaining.filter(d=>d>=todayStr);
    if (c.length) return parseLocalDate(c[0]);
  }
  return null;
}

// Run 24: upcoming unpaid bill dates (next 12 months) as an iCalendar file other calendar apps can import. All-day events, one per
// date; nothing leaves the device and the ledger is not touched. Text is escaped and lines folded per RFC 5545.
function icsEscape(s) { return String(s==null?"":s).replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,"); }
function icsFold(line) { const out=[]; let rest=line; while (rest.length>73) { out.push(rest.slice(0,73)); rest=" "+rest.slice(73); } out.push(rest); return out.join("\r\n"); }
export function billsToIcs(schedules, transactions, now=new Date(), opts={}) {
  const months=opts.months||12, label=opts.label||((x)=>x.merchant||x.note||x.category), amountText=opts.amountText||((x)=>String(x.amount));
  const todayStr=localDateStr(now), stamp=now.toISOString().replace(/[-:]/g,"").replace(/\.\d+Z$/,"Z");
  const ev=[]; let n=0;
  (Array.isArray(schedules)?schedules:[]).filter(s=>s && s.isActive && s.type==="expense").forEach(s=>{
    for (let i=0;i<months;i++) {
      const mon=localMonthStr(addMonths(new Date(now.getFullYear(),now.getMonth(),1),i));
      scheduleMonthStatus(s,transactions,mon,now).remaining.filter(d=>d>=todayStr).forEach(d=>{
        const next=localDateStr(new Date(parseLocalDate(d).getFullYear(),parseLocalDate(d).getMonth(),parseLocalDate(d).getDate()+1));
        ev.push(["BEGIN:VEVENT","UID:"+icsEscape(String(s.key)+"-"+d)+"@expense-ledger","DTSTAMP:"+stamp,"DTSTART;VALUE=DATE:"+d.replace(/-/g,""),"DTEND;VALUE=DATE:"+next.replace(/-/g,""),
          "SUMMARY:"+icsEscape(label(s)+" · "+amountText(s)),"TRANSP:TRANSPARENT","END:VEVENT"].map(icsFold).join("\r\n")); n++;
      });
    }
  });
  return { text:["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Expense Ledger//Bills//EN","CALSCALE:GREGORIAN",...ev,"END:VCALENDAR"].join("\r\n")+"\r\n", count:n };
}

// Run 18: how many payments of a bill with an end date are still to come (today or later, none recorded for them yet). null = no end date.
export function billPaymentsLeft(s, transactions, now=new Date()) {
  const end=s && s.bill && s.bill.endDate; if (!end) return null;
  const todayStr=localDateStr(now), endMon=end.slice(0,7);
  let n=0;
  for (let i=0;i<600;i++) {
    const mon=localMonthStr(addMonths(new Date(now.getFullYear(),now.getMonth(),1),i));
    if (mon>endMon) break;
    n+=scheduleMonthStatus(s,transactions,mon,now).remaining.filter(d=>d>=todayStr).length;
  }
  return n;
}

// S4: Safe to Spend = income received so far this month − savings reserve − spending recorded this month − commitments still to come.
// "Received so far" = income dated today or earlier. Income dated later this month is expected, not available yet: it is
// reported separately (expectedInc) and never added, so the figure is never optimistic. Expenses dated later this month ARE
// subtracted (they are planned spending).
// "Commitments still to come" = every expected payment of an active schedule this month that has no matching recorded payment:
// both upcoming ones and earlier ones that were never recorded (counted so the figure is never optimistic).
// Recurring monthly estimates (recurringMonthly) are informational and are NOT part of this month's subtraction.
export function calcSafeToSpend(transactions, safeConfig, goals=[], now=new Date(), bills=[]) {
  transactions=collapseSpreads(transactions);   // Run 41: Safe to Spend is about cash, so a spread cost counts whole on its real date
  const { savingsTarget=0 }=safeConfig||{};
  const mon=localMonthStr(now), todayStr=localDateStr(now);
  // Every expense recorded for this month, including ones dated later: money entered ahead of time is already committed.
  // laterExp is the part of it dated after today, shown on the card so it is not mistaken for money already spent.
  const { totalExp:curExp, plannedExp:laterExp }=calcMonthSummary(transactions,mon,prevMon(),now);
  const monthInc=transactions.filter(t=>t.type==="income"&&t.date.startsWith(mon));
  const curInc=sumCents(monthInc.filter(t=>t.date<=todayStr));          // Run 22 audit: whole cents
  const expectedInc=sumCents(monthInc.filter(t=>t.date>todayStr));
  const p=monthProgress(mon,now);

  const schedules=buildSchedules(transactions,bills).filter(s=>s.isActive && s.type==="expense");
  let upcomingCommitments=0, unrecordedCommitments=0, upcomingCount=0, unrecordedCount=0, matchedAheadCount=0;
  // F1 (counter-review): a payment typed in as an ordinary entry (not linked to its bill) is already inside curExp, so the bill's
  // own expected payment must not be subtracted a second time. Only entries dated AFTER today count (money deliberately set aside
  // ahead; past-dated look-alikes stay unmatched until the user links them — the Run 12 rule). Such an entry settles an upcoming
  // date only when it is clearly the same payment: this month, linked to no bill, same category, same merchant as the bill's name,
  // same amount to the cent. Each entry settles at most one date. Anything less certain stays counted (never optimistic).
  const knownIds=new Set((bills||[]).map(b=>b.id));
  const looseExp=transactions.filter(t=>t.type==="expense" && t.date.startsWith(mon) && t.date>todayStr && !(t.billId && knownIds.has(t.billId)));
  const usedLoose=new Set();
  const cents=(x)=>Math.round((Number(x)||0)*100);
  schedules.forEach(s=>{
    const st=scheduleMonthStatus(s,transactions,mon,now);
    const settle=(dates)=>{
      if (!s.billId) return dates.length;   // inferred schedules already count their own recurring entries
      let open=0;
      dates.forEach(()=>{
        const hit=looseExp.find(t=>!usedLoose.has(t.id) && t.category===s.category && norm(t.merchant)===norm(s.merchant) && cents(t.amount)===cents(s.amount));
        if (hit) { usedLoose.add(hit.id); matchedAheadCount++; } else open++;
      });
      return open;
    };
    const up=settle(st.upcoming), od=st.overdue.length;
    upcomingCommitments+=s.amount*up;  upcomingCount+=up;
    unrecordedCommitments+=s.amount*od; unrecordedCount+=od;
  });
  const futureCommitments=upcomingCommitments+unrecordedCommitments;
  const recurringMonthly=schedules.reduce((sum,s)=>sum+scheduleMonthly(s),0);

  // Goal reserve: only goals that still need money and have a monthly contribution. The reserve is the LARGER of the manual
  // savings floor and the goal contributions (the floor is treated as an overall minimum that already includes them).
  const goalContributions=(goals||[]).filter(g=>g.monthlyTarget>0 && g.target>0 && (g.saved||0)<g.target).reduce((sum,g)=>sum+g.monthlyTarget,0);
  const effectiveSavingsTarget=Math.max(savingsTarget,goalContributions);
  const goalContributionActive=goalContributions>savingsTarget && goalContributions>0;

  const cents2=(x)=>Math.round(x*100)/100;   // Run 22 audit: no floating-point crumbs (5e-17 instead of 0)
  const disposable=cents2(curInc-effectiveSavingsTarget);
  const remaining=cents2(disposable-curExp-futureCommitments);
  const dailyAllowance=p.daysRemaining>0 ? remaining/p.daysRemaining : 0;

  return {
    curInc, expectedInc, curExp, laterExp, savingsTarget, effectiveSavingsTarget, goalContributions, goalContributionActive,
    futureCommitments, upcomingCommitments, unrecordedCommitments, upcomingCount, unrecordedCount, matchedAheadCount,
    scheduleCount:schedules.length, recurringMonthly,
    disposable, remaining, daysLeft:p.daysLeft, daysRemaining:p.daysRemaining, dailyAllowance,
    feasible:curInc>0,
  };
}

// S1: Goals — full funding plan with target date and what-if
export function calcGoalProgress(goal, now=new Date()) {
  const num=(v)=>Number.isFinite(Number(v)) && Number(v)>0 ? Number(v) : 0;      // malformed values become 0, never NaN
  const target=num(goal.target), saved=num(goal.saved), monthlyTarget=num(goal.monthlyTarget);
  const pct=target>0 ? Math.min((saved/target)*100,100) : 0;
  const remaining=Math.max(target-saved,0);
  const complete=target>0 && saved>=target;
  const td=(goal.targetDate && isValidDateStr(String(goal.targetDate))) ? parseLocalDate(goal.targetDate) : null;
  const monthLabel=(d,style)=>t("date.monthYear",{ m:t((style==="long"?"mon.":"monShort.")+(d.getMonth()+1)), y:d.getFullYear() });

  let monthsNeeded=null, estCompletion=null, estDate=null;
  // Run 15: the user's own monthly amount follows the same rule as goalRequiredMonthly: one payment on the 1st of each month,
  // so N payments finish on the N-th month-start after today (not N months from today). Counted in whole cents.
  if (monthlyTarget>0 && remaining>0) { const mc=goalCents(monthlyTarget); monthsNeeded=Math.floor((goalCents(target)-goalCents(saved)+mc-1)/mc); estDate=new Date(now.getFullYear(),now.getMonth()+monthsNeeded,1); estCompletion=monthLabel(estDate,"long"); }

  const daysToTarget = td ? daysBetween(now,td) : null;                      // calendar days, not 24-hour blocks
  const overdue = !!td && !complete && daysToTarget<0;
  const behindSchedule = !!td && !complete && !overdue && !!estDate && daysBetween(td,estDate)>0;   // projected finish is after the target date
  const onTrack = !!td && !complete && !overdue && !!estDate && !behindSchedule;
  const noContribution = !complete && remaining>0 && monthlyTarget===0;

  // Run 15: the fixed what-if rows (60% / 100% / 140% of the monthly amount, or 50 when none) and the 25/50/75/100% milestone
  // tiles were removed with their screens. The optional what-if is goalScenario(); the required amount is goalRequiredMonthly().
  return { pct, remaining, complete, monthsNeeded, estCompletion, estDate, daysToTarget, overdue, behindSchedule, onTrack, noContribution };
}

// Run 15: the ONE rule for "how much must I save each month to reach this goal on time". The goal cards, the Home coach and the
// what-if all call it, so the same goal never shows two different figures (the coach used to divide days by 30.44).
// Rule: one contribution on the 1st of each month. The periods are the month-starts after today, up to and including the deadline
// month; when none is left (deadline later this month, or today) there is 1 period. Money is whole cents (integers), rounded UP, so
// periods x amount is never short. It is a plan, not a promise: nothing is moved or reserved.
const goalCents=(v)=>{ const n=Number(v); return Number.isFinite(n)&&n>0 ? Math.round(n*100) : 0; };    // malformed or non-positive -> 0, never NaN
function goalPeriods(td, now) {    // td: a valid deadline on or after today
  const months=(td.getFullYear()*12+td.getMonth())-(now.getFullYear()*12+now.getMonth());
  return { periods:Math.max(1,months), thisMonth:months<1 };
}
export function goalRequiredMonthly(goal, now=new Date()) {
  const targetC=goalCents(goal&&goal.target), savedC=goalCents(goal&&goal.saved);
  const remainingC=Math.max(targetC-savedC,0), remaining=remainingC/100;
  const base={ remaining, periods:null, perMonth:null, thisMonth:false };
  if (targetC===0) return { ...base, state:"invalid" };
  if (savedC>=targetC) return { ...base, state:"complete", perMonth:0 };
  const raw=goal.targetDate;
  if (!raw || !isValidDateStr(String(raw))) return { ...base, state:"noDate" };
  const td=parseLocalDate(String(raw));
  if (daysBetween(now,td)<0) return { ...base, state:"overdue" };
  const { periods, thisMonth }=goalPeriods(td,now);
  return { ...base, state:"active", periods, thisMonth, perMonth:Math.floor((remainingC+periods-1)/periods)/100 };
}
// The optional what-if: "if I save this much each month, when do I finish and does that meet the deadline?" Same periods, same cents.
export function goalScenario(goal, amount, now=new Date()) {
  const req=goalRequiredMonthly(goal,now);
  if (req.state==="invalid" || req.state==="complete") return { valid:false, reason:req.state };
  const amtC=goalCents(amount);
  if (amtC===0) return { valid:false, reason:"amount" };
  const months=Math.floor((Math.round(req.remaining*100)+amtC-1)/amtC);
  const d=new Date(now.getFullYear(),now.getMonth()+months,1);
  const completion=t("date.monthYear",{ m:t("mon."+(d.getMonth()+1)), y:d.getFullYear() });
  const meetsDeadline=req.state==="active" ? months<=req.periods : req.state==="overdue" ? false : null;
  return { valid:true, months, completion, meetsDeadline };
}

function toMonthlyAmountHelper(t) {
  if (!t.recurFreq) return t.amount;
  if (t.recurFreq==="weekly")   return t.amount*4.33;
  if (t.recurFreq==="biweekly") return t.amount*2.17;
  if (t.recurFreq==="monthly")  return t.amount;
  if (t.recurFreq==="yearly")   return t.amount/12;
  return t.amount;
}

// Run 20: a short heading for each kind of pattern line (the sentence itself says what was found and from how many entries)
export const PATTERN_BASIS_KEY={ month:"pat.basisMonth", weeks:"pat.basisWeeks", two:"pat.basisTwo", six:"pat.basisSix" };
export const PATTERN_TITLE_KEY={ weekend:"pat.weekend", catconc:"pat.catconc", merchant:"pat.merchant", avgtxn:"pat.avgtxn", dayofweek:"pat.dayofweek", trend:"pat.trend", anomaly:"pat.anomaly" };
// S5: Full financial patterns engine — deterministic, data-only
// Returns { insights, anomalies, dayOfWeek, categoryTrends, correlations }

export function calcPatterns(transactions, currency="₼", now=new Date()) {
  const expenses=transactions.filter(t=>t.type==="expense");
  const monBack=(k)=>localMonthStr(new Date(now.getFullYear(),now.getMonth()-k,1));
  const mon=monBack(0), prv=monBack(1), todayStr=localDateStr(now);
  const insights=[];
  const empty={ insights, anomalies:[], dayOfWeek:{}, categoryTrends:[], correlations:[] };
  if (expenses.length<5) return empty;
  const sumOf=(l)=>l.reduce(addAmt,0);
  const pctChange=(a,b)=>Math.round(((a-b)/b)*100);                       // only called with b>0
  const quantile=(sorted,q)=>{ const i=(sorted.length-1)*q, lo=Math.floor(i), hi=Math.ceil(i); return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo); };
  const isWeekend=(d)=>[0,6].includes(parseLocalDate(d).getDay());
  const DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  // ── Weekend vs weekday: spending PER CALENDAR DAY over up to 56 days (never before the first recorded expense).
  //    Totals and per-transaction figures are not compared: a window holds ~2.5× more weekdays than weekend days.
  const earliest=expenses.reduce((m,t)=>t.date<m?t.date:m,todayStr);
  const winStartLimit=new Date(now.getFullYear(),now.getMonth(),now.getDate()-55);
  const startD=parseLocalDate(earliest)>winStartLimit ? parseLocalDate(earliest) : winStartLimit;
  const startStr=localDateStr(startD);
  let weDays=0, wdDays=0;
  for (let d=new Date(startD); localDateStr(d)<=todayStr; d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1)) { if ([0,6].includes(d.getDay())) weDays++; else wdDays++; }
  const win=expenses.filter(t=>t.date>=startStr && t.date<=todayStr);
  if (win.length>=10 && weDays>=8 && wdDays>=20) {
    const weAvg=sumOf(win.filter(t=>isWeekend(t.date)))/weDays, wdAvg=sumOf(win.filter(t=>!isWeekend(t.date)))/wdDays;
    if (weAvg>0 && wdAvg>0) {
      const pct=pctChange(weAvg,wdAvg);
      if (Math.abs(pct)>=20) insights.push({ id:"weekend", basis:{ n:win.length, per:"weeks" }, text:t(pct>0?"ins.weekendMore":"ins.weekendLess",{ pct:Math.abs(pct), we:fmt(weAvg,currency), wd:fmt(wdAvg,currency), days:weDays+wdDays }) });
    }
  }

  // ── Concentration this month
  const monExp=expenses.filter(t=>t.date.startsWith(mon)&&t.date<=todayStr);   // what has happened this month (not entries dated later)
  const monTotal=sumOf(monExp);
  if (monExp.length>=5 && monTotal>0) {
    const catTotals={}; monExp.forEach(t=>{ catTotals[t.category]=addAmt(catTotals[t.category]||0,t); });
    const topCat=Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    const pct=Math.round((topCat[1]/monTotal)*100);
    if (pct>=40) insights.push({ id:"catconc", basis:{ n:monExp.length, per:"month" }, text:t("ins.catConc",{ cat:catName(topCat[0]), pct }) });
    const mTotals={}, mShown={}; monExp.filter(t=>t.merchant&&t.merchant.trim()).forEach(t=>{ const k=lc(t.merchant.trim()); if (!(k in mShown)) mShown[k]=t.merchant.trim(); mTotals[k]=addAmt(mTotals[k]||0,t); });   // "Bravo" and "bravo " are one merchant
    const top3=Object.entries(mTotals).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if (top3.length>=2) { const pc=Math.round((top3.reduce((a,[,v])=>Math.round((a+v)*100)/100,0)/monTotal)*100); if (pc>=60) insights.push({ id:"merchant", basis:{ n:monExp.length, per:"month" }, text:t("ins.merchantConc",{ names:top3.map(([m])=>mShown[m]).join(", "), pct:pc }) }); }
  }

  // ── Typical transaction vs last month: the MEDIAN per transaction (a part-month stays comparable, and one unusual purchase
  //    cannot read as a general change; unusual purchases are reported separately as anomalies)
  const median=(l)=>quantile([...l].sort((a,b)=>a-b),0.5);
  const curAmts=monExp.map(t=>t.amount), prvAmts=expenses.filter(t=>t.date.startsWith(prv)).map(t=>t.amount);
  if (curAmts.length>=4 && prvAmts.length>=4) {
    const curMed=median(curAmts), prvMed=median(prvAmts);
    if (prvMed>0) { const pct=pctChange(curMed,prvMed); if (Math.abs(pct)>=20) insights.push({ id:"avgtxn", basis:{ n:curAmts.length+prvAmts.length, per:"two" }, text:t(pct>0?"ins.avgHigher":"ins.avgLower",{ pct:Math.abs(pct), a:curAmts.length, b:prvAmts.length }) }); }
  }

  // ── Day of week. The insight and the Analytics card both use the MEDIAN (the typical transaction; the average is kept in
  //    the data), so one unusual purchase cannot produce a claim. Only days with at least 3 transactions on at least 2 different dates
  //    are compared (one busy Monday is not a weekly pattern); differences of 3× or more are stated as a multiple ("5.0×").
  const dayOfWeek={}; DAY_NAMES.forEach(d=>{ dayOfWeek[d]={ avg:0, median:0, count:0, total:0 }; });
  const dayAmts={}, dayDates={}; monExp.forEach(t=>{ const d=DAY_NAMES[parseLocalDate(t.date).getDay()]; dayOfWeek[d].count++; dayOfWeek[d].total+=t.amount; (dayAmts[d]=dayAmts[d]||[]).push(t.amount); (dayDates[d]=dayDates[d]||new Set()).add(t.date); });
  DAY_NAMES.forEach(d=>{ if (dayOfWeek[d].count>0) { dayOfWeek[d].avg=parseFloat((dayOfWeek[d].total/dayOfWeek[d].count).toFixed(2)); dayOfWeek[d].median=median(dayAmts[d]); } });
  const eligible=DAY_NAMES.filter(d=>dayOfWeek[d].count>=3 && dayDates[d].size>=2);
  if (eligible.length>=2) {
    const byMed=[...eligible].sort((a,b)=>dayOfWeek[b].median-dayOfWeek[a].median), hi=byMed[0], lo=byMed[byMed.length-1];
    const mHi=dayOfWeek[hi].median, mLo=dayOfWeek[lo].median;
    if (mLo>0) {
      const pct=pctChange(mHi,mLo), vars={ hi:t("dow.pl."+hi), lo:t("dow.cmp."+lo), pct, x:(mHi/mLo).toFixed(1), a:dayOfWeek[hi].count, b:dayOfWeek[lo].count };
      if (pct>=30) insights.push({ id:"dayofweek", basis:{ n:dayOfWeek[hi].count+dayOfWeek[lo].count, per:"month" }, text:t(pct>=200?"ins.dayOfWeekX":"ins.dayOfWeek",vars) });
    }
  }

  // ── Category trends over the last 6 COMPLETED months (the current part-month would distort a trend)
  const categoryTrends=[];
  const months6=[6,5,4,3,2,1].map(monBack);
  [...new Set(expenses.map(t=>t.category))].forEach(catId=>{
    const data=months6.map((m,i)=>({ x:i, y:sumOf(expenses.filter(t=>t.category===catId&&t.date.startsWith(m))) }));
    if (data.filter(d=>d.y>0).length<3) return;
    // Least-squares direction of a run of months: "increasing" / "decreasing" when the slope exceeds 5% of the average.
    const direction=(pts)=>{ const n=pts.length, sx=pts.reduce((a,d)=>a+d.x,0), sy=pts.reduce((a,d)=>a+d.y,0), sxy=pts.reduce((a,d)=>a+d.x*d.y,0), sx2=pts.reduce((a,d)=>a+d.x*d.x,0), den=n*sx2-sx*sx;
      if (den===0) return { slope:0, trend:"stable" }; const sl=(n*sxy-sx*sy)/den, avg=sy/n; return { slope:sl, trend: sl>avg*0.05?"increasing":sl<-avg*0.05?"decreasing":"stable" }; };
    const n=data.length, { slope, trend }=direction(data);
    const last=data[n-1].y, prev=data[n-2].y;
    const trendPct=prev>0 ? pctChange(last,prev) : 0;
    categoryTrends.push({ catId, trend, trendPct, slope:parseFloat(slope.toFixed(2)), monthlyData:data });
    // "Over recent months" only when the months BEFORE last month already moved the same way; a one-month jump is stated as
    // what it is (last month vs the month before), not as a trend.
    const sustained=direction(data.slice(0,n-1)).trend===trend;
    if (trend!=="stable" && prev>0 && last>0 && Math.abs(trendPct)>=20) {
      const vars={ cat:catName(catId), pct:`${trendPct>0?"+":""}${trendPct}` };
      insights.push({ id:`trend-${catId}`, basis:{ n:expenses.filter(t=>t.category===catId&&months6.some(m=>t.date.startsWith(m))).length, per:"six" }, text: sustained ? t(trend==="increasing"?"ins.trendUp":"ins.trendDown",vars) : t("ins.lastMonthChange",vars) });
    }
  });

  // ── Unusually large transactions this month: above Q3 + 1.5×IQR of that category's history AND at least 1.5× its median
  const hist={}; expenses.forEach(t=>{ (hist[t.category]=hist[t.category]||[]).push(t.amount); });
  const anomalies=[];
  monExp.forEach(tx=>{
    const h=[...(hist[tx.category]||[])].sort((a,b)=>a-b);
    if (h.length<8) return;
    const q1=quantile(h,0.25), q3=quantile(h,0.75), med=quantile(h,0.5);
    if (tx.amount>q3+1.5*(q3-q1) && med>0 && tx.amount>=1.5*med)
      anomalies.push({ date:tx.date, amount:tx.amount, category:tx.category, merchant:tx.merchant||"", reason:t("ins.anomalyReason",{ x:(tx.amount/med).toFixed(1), cat:catName(tx.category), med:fmt(med,currency) }), severity:"high" });
  });
  anomalies.sort((a,b)=>b.amount-a.amount).splice(10);
  if (anomalies.length) insights.push({ id:"anomaly", basis:{ n:monExp.length, per:"month" }, text:tn("ins.anomalies",anomalies.length) });

  // ── Categories recorded on the same day (co-occurrence — it does not mean one causes the other)
  const correlations=[];
  const catByDay={}; monExp.forEach(t=>{ (catByDay[t.date]=catByDay[t.date]||new Set()).add(t.category); });
  const days=Object.keys(catByDay).length, pairCounts={};
  Object.values(catByDay).forEach(set=>{ const u=[...set]; for (let i=0;i<u.length;i++) for (let j=i+1;j<u.length;j++) { const k=[u[i],u[j]].sort().join("__"); pairCounts[k]=(pairCounts[k]||0)+1; } });
  if (days>=8) {
    Object.entries(pairCounts).filter(([,c])=>c>=Math.max(3,Math.ceil(days*0.3))).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([k,c])=>{
      const [c1,c2]=k.split("__"); correlations.push({ category1:c1, category2:c2, frequency:c, correlation:parseFloat((c/days).toFixed(2)) });
    });
    if (correlations.length) { const top=correlations[0]; insights.push({ id:"same-day", text:t("ins.sameDay",{ a:catName(top.category1), b:catName(top.category2), pct:Math.round(top.correlation*100) }) }); }
  }
  return { insights, anomalies, dayOfWeek, categoryTrends, correlations };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Privacy mode (Run 9): a display-only switch for this session. While it is on, every formatted amount, percentage and
// personal name on screen (and in accessible names) is replaced by dots. It never touches stored data, imports, exports or
// calculations, and it is not security: the data is still in the browser's storage, readable by anyone with the phone unlocked.
export let PRIVACY=false;
const MASK="••••";
function setPrivacyMode(on) { PRIVACY=!!on; }
export function maskText(s) { return PRIVACY && s ? "•••••" : s; }
// Run 52: a bank statement that statement.js has read, shaped like a backup's plan so the same review sheet, merge rules and Undo apply.
// The person's own history decides a category first (only when the merchant name is exactly one they have used); then the bank's merchant
// code, then words, then the built-in merchant list. Transfers and not-yet-posted rows are kept apart so the sheet can offer them as choices.
const STATEMENT_BANKS={ abb:"ABB", unibank:"Unibank" };
function statementPick(plan, opts) { return plan.stAll.filter(e=>{ const m=plan.stMeta[String(e.id)]||{}; if (m.pending && !opts.pending) return false; if ((m.kind==="transfer"||m.kind==="cash") && !opts.transfers) return false; return true; }); }
function statementPlan(res, filename, transactions) {
  const memory=buildMerchantMemory(transactions);
  const raw=statementEntries(res.bank,res.rows,{ known:KNOWN_MERCHANTS, suggest:(m,type)=>{ const s=merchantSuggest(m,memory,type); return s && lc(s.merchant||"")===lc(m||"") ? { category:s.category, subcategory:s.subcategory||"" } : null; } });
  const stMeta={}; raw.forEach(e=>{ stMeta[String(e.id)]=e._st; });
  const { good }=partitionTransactions(raw.map(({ _st, ...e })=>e),{ keepCategoryId:true });
  const left=res.problems.filter(p=>/^(rows|left):/.test(p)).reduce((s,p)=>s+Number(p.split(":")[1]),0);
  const plan={ ok:true, kind:"statement", filename, stAll:good, stMeta, stOpts:{ transfers:true, pending:false, account:"" },
    statement:{ bank:res.bank, check:res.check, left, sign:res.problems.includes("sign"), nTransfer:good.filter(e=>["transfer","cash"].includes((stMeta[String(e.id)]||{}).kind)).length, nPending:good.filter(e=>(stMeta[String(e.id)]||{}).pending).length },
    canReplace:false, skippedCount:0, skippedSummary:"", settings:{}, problems:[], warnings:[], subcategories:{}, debtData:{ debts:[], loans:[] }, accountData:{ accounts:[], transfers:[] } };
  plan.transactions=statementPick(plan,plan.stOpts);
  return plan;
}
export function fmtPct(n) { return PRIVACY ? "••%" : `${n}%`; }
export function fmt(n, sym="₼") {
  if (PRIVACY) return `${MASK} ${sym}`;
  return `${Math.abs(n||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} ${sym}`;
}
// The three small Home tiles. Exact below 10,000 (1,050.00 used to show as "1.1k", which reads as 1,100 — Run 7, V4);
// above that the short form is marked "≈" so it is never taken for an exact figure.
export function fmtShort(n, sym="₼") {
  if (PRIVACY) return fmt(n,sym);
  const a=Math.abs(n||0);
  return a>=1e6?`≈${(a/1e6).toFixed(1)}M ${sym}`:a>=10000?`≈${(a/1000).toFixed(1)}k ${sym}`:fmt(a,sym);
}
// Dates and month names follow the interface language. They are built from the catalog (mon.* / monShort.* / monGen.*)
// rather than toLocaleDateString, because Chrome ships without Azerbaijani date data and would show "2026 M10".
// Amounts keep the "1,234.56" form in every language for now, because amounts are typed with a decimal point (see
// MONEY_TEXT_RE); showing "1 234,56" while requiring "1234.56" would mislead.
export function fmtDate(d) {
  if (!d) return "";
  const td=today();
  if (d===td) return t("date.today");
  const y=new Date(); y.setDate(y.getDate()-1);
  if (d===localDateStr(y)) return t("date.yesterday");
  const dt=parseLocalDate(d);
  return t("date.dayMonth",{ d:dt.getDate(), m:t("monShort."+(dt.getMonth()+1)) });
}
// Full date in the interface language (e.g. "13 October 2026"), used wherever a long date is shown.
export function fmtLongDate(v) { const dt=v instanceof Date ? v : new Date(v); return t("date.long",{ d:dt.getDate(), m:t("monGen."+(dt.getMonth()+1)), y:dt.getFullYear() }); }
export function monthName(ym) { const [y,m]=ym.split("-").map(Number); return t("date.monthYear",{ m:t("mon."+m), y }); }
export function monthShort(ym) { return t("monShort."+Number(ym.split("-")[1])); }
function daysInMonth(ym) { const [y,m]=ym.split("-").map(Number); return new Date(y,m,0).getDate(); }
export function median(arr) {
  if (!arr.length) return 0;
  const s=[...arr].sort((a,b)=>a-b),m=Math.floor(s.length/2);
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
}

// ─── Redesign (2026-10-27): figures for the Home ring, the Analytics trend and the Home greeting ───
// Time-of-day greeting for the Home title. No name: the app does not know the user's name and does not ask for it.
function greetingKey(now=new Date()) { const h=now.getHours(); return h<5?"home.greet.evening":h<12?"home.greet.morning":h<18?"home.greet.afternoon":"home.greet.evening"; }
// Whole-number percentages that add up to exactly 100 (largest remainder), so a legend never shows 99% or 101%.
// Rows with no amount get 0. Returns [] when the total is 0.
function pctShares(amounts) {
  const total=amounts.reduce((s,a)=>s+a,0); if (!(total>0)) return [];
  const raw=amounts.map(a=>a/total*100), out=raw.map(Math.floor);
  let left=100-out.reduce((s,a)=>s+a,0);
  raw.map((r,i)=>[r-out[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).forEach(([,i])=>{ if (left>0 && amounts[i]>0) { out[i]++; left--; } });
  return out;
}
// The month's spending by category for the Home ring: the five largest, the rest (if any) combined as "Other".
export function donutSlices(catSpend, max=5) {
  const rows=Object.entries(catSpend).filter(([,a])=>a>0).sort((a,b)=>b[1]-a[1]);
  const top=rows.slice(0,max).map(([id,amt])=>({ id, amt, color:CAT(id)?.color||"#98A5B7", name:catName(id) }));
  const rest=rows.slice(max).reduce((s,[,a])=>s+a,0);
  if (rest>0) top.push({ id:"_rest", amt:rest, color:"#5F6B7C", name:t("home.otherCats") });
  const pct=pctShares(top.map(x=>x.amt));
  return top.map((x,i)=>({ ...x, pct:pct[i] }));
}
// Running total of a month's expenses, day by day: element d-1 is everything spent on days 1…d. Only what has happened
// counts (days after today are null in the current month; a future month is all null), matching the month's "Spent" figure.
export function cumulativeByDay(transactions, mon, now=new Date()) {
  const n=daysInMonth(mon), p=monthProgress(mon,now), last=p.state==="future"?0:p.state==="past"?n:p.daysPassed;
  const perDay=new Array(n).fill(0);
  transactions.forEach(x=>{ if (x.type==="expense" && x.date.startsWith(mon)) { const d=Number(x.date.slice(8,10)); if (d>=1 && d<=last) perDay[d-1]+=x.amount; } });
  let run=0; return perDay.map((v,i)=>{ run=Math.round((run+v)*100)/100; return i<last?run:null; });
}

// Run 23: iPhone/iPad in a Safari-engine browser tab (every iPhone browser) that is NOT installed to the Home Screen. Apple may clear such a site's saved
// data after about a week of non-use, so the app says so once. Installed Home Screen apps are exempt from that rule and are not told.
const IOS_NOTE_KEY=KEY+"__iosnote";
function iosBrowserTab() {
  try {
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
    const installed=navigator.standalone===true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    return ios && !installed;
  } catch { return false; }
}
function iosNoteSeen() { try { return localStorage.getItem(IOS_NOTE_KEY)==="1"; } catch { return false; } }
// Run 29: Android restores an app's data from the user's Google backup (or a phone-to-phone transfer) when the app is installed. That copy can be
// older than the ledger the user had, and nothing in the data says so (confirmed on an emulator, 6 Nov 2026: an entry made after the backup was gone
// after a reinstall, silently). The Android shell keeps a random id in a place that is NOT backed up (window.LedgerNative.installId()); the ledger
// keeps the id it saw last under KEY+"__install" (which IS backed up). A different id means this data came from somewhere else: say so once.
// No id (website, older shell) or no earlier id (first run, ledger from before this feature) never produces a notice.
const INSTALL_KEY=KEY+"__install";
export function restoreCheck(stored, current) {
  const cur=typeof current==="string"?current.trim():"";
  if (!cur || cur.length>128) return "none";
  if (typeof stored!=="string" || !stored) return "first";
  return stored===cur?"same":"restored";
}
// Run 30 (Android app only): reminders. The Android shell (window.LedgerNative.reminders) schedules local notifications; nothing is sent anywhere.
// Preferences are a plain setting kept beside the ledger (KEY+"__reminders"), all OFF until the user turns them on (Android asks for permission then).
// reminderPlan() is a pure function: from the bills / recurring payments and the entries already recorded, it lists the notifications that
// should exist in the next days. The shell cancels what it had and schedules exactly this list, so a paid bill, an edited date or a deleted
// bill can never leave a stale reminder behind. Bills: on the due day. Recurring payments found from entries: the day before. Daily nudge: 21:00.
// Run 33 (Android app only): home-screen widget. Its one optional line (safe to spend) is OFF by default because a home screen is visible to others.
const WIDGET_KEY=KEY+"__widget";
const WIDGET_EVENT="ledger-widget-changed";
export const widgetNative=()=>{ try { const n=window.LedgerNative; return n && n.widget && typeof n.widget.set==="function" ? n.widget : null; } catch { return null; } };
export function readWidgetPrefs() { try { const p=JSON.parse(localStorage.getItem(WIDGET_KEY)||"null"); return { showSafe:!!(p && p.showSafe===true) }; } catch { return { showSafe:false }; } }
export function writeWidgetPrefs(p) { try { localStorage.setItem(WIDGET_KEY,JSON.stringify({ showSafe:!!(p && p.showSafe) })); if (typeof window!=="undefined") window.dispatchEvent(new Event(WIDGET_EVENT)); return true; } catch { return false; } }
// The widget's line: the safe-to-spend amount, only when switched on, Safe to Spend itself is on and can be worked out, and privacy mode is off. "" hides the line.
export function widgetLine(state, spendTxns, prefs, now=new Date()) {
  try {
    if (!prefs || !prefs.showSafe || !state || !state.safeToSpend || !state.safeToSpend.enabled) return { label:"", amount:"" };
    if (maskText("x")!=="x") return { label:"", amount:"" };
    const info=calcSafeToSpend(spendTxns,state.safeToSpend,state.goals||[],now,state.bills||[]);
    if (!info || !info.feasible) return { label:"", amount:"" };
    return { label:t("safe.title"), amount:(info.remaining<0?"−":"")+fmt(Math.abs(info.remaining),state.currency) };
  } catch { return { label:"", amount:"" }; }
}
const REMIND_KEY=KEY+"__reminders";
const REMIND_EVENT="ledger-reminders-changed";
// Run 40 (owner: "it strictly sends at 21:00; I set the time and it didn't come then"): the daily check-in has its own time (dailyTime);
// "time" stays the time for bill and recurring reminders. A saved file without dailyTime keeps 21:00, exactly as before.
export const REMIND_DEFAULT=Object.freeze({ bills:false, recurring:false, daily:false, time:"09:00", dailyTime:"21:00", hideAmount:false, exact:false });   // Run 38: exact = "remind at the exact time"
const HHMM=/^([01]\d|2[0-3]):[0-5]\d$/;
export function cleanReminderPrefs(raw) {
  const r=raw && typeof raw==="object" ? raw : {};
  const time=typeof r.time==="string" && HHMM.test(r.time) ? r.time : REMIND_DEFAULT.time;
  const dailyTime=typeof r.dailyTime==="string" && HHMM.test(r.dailyTime) ? r.dailyTime : REMIND_DEFAULT.dailyTime;
  return { bills:r.bills===true, recurring:r.recurring===true, daily:r.daily===true, time, dailyTime, hideAmount:r.hideAmount===true, exact:r.exact===true };
}
export function readReminders() { try { return cleanReminderPrefs(JSON.parse(localStorage.getItem(REMIND_KEY)||"null")); } catch { return { ...REMIND_DEFAULT }; } }
export function writeReminders(p) {
  try { localStorage.setItem(REMIND_KEY,JSON.stringify(cleanReminderPrefs(p))); if (typeof window!=="undefined") window.dispatchEvent(new Event(REMIND_EVENT)); return true; } catch { return false; }
}
export const remindersAvailable=()=>{ try { const n=window.LedgerNative; return !!(n && n.reminders && typeof n.reminders.sync==="function"); } catch { return false; } };
function reminderId(s) { let h=5381; for (let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return (h%2147483000)+1; }   // stable positive int per (kind, schedule, date)
export function reminderPlan(schedules, transactions, prefs, now=new Date(), opts={}) {
  const p=cleanReminderPrefs(prefs), horizon=opts.horizon||30, cap=opts.cap||60, out=[];
  const [hh,mm]=p.time.split(":").map(Number), todayStr=localDateStr(now);
  const endStr=localDateStr(new Date(now.getFullYear(),now.getMonth(),now.getDate()+horizon));
  const at=(dStr,h,m)=>{ const d=parseLocalDate(dStr); return new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,m,0,0); };
  const push=(kind,key,dStr,when,extra)=>{ if (when.getTime()<=now.getTime()) return; out.push({ id:reminderId(kind+"|"+key+"|"+dStr), kind, date:dStr, atMs:when.getTime(), ...extra }); };
  if (p.bills || p.recurring) {
    (Array.isArray(schedules)?schedules:[]).filter(s=>s && s.isActive && s.type==="expense").forEach(s=>{
      const bill=!!s.billId; if (bill ? !p.bills : !p.recurring) return;
      const seen=new Set();
      for (let i=0;i<=Math.ceil(horizon/28)+1;i++) {
        const mon=localMonthStr(addMonths(new Date(now.getFullYear(),now.getMonth(),1),i));
        scheduleMonthStatus(s,transactions,mon,now).remaining.filter(d=>d>=todayStr && d<=endStr).forEach(d=>{
          if (seen.has(d)) return; seen.add(d);
          const name=s.merchant||s.note||s.category, extra={ name, amount:s.amount };
          if (bill) push("bill",s.key,d,at(d,hh,mm),extra);
          else { const day=parseLocalDate(d); push("recurring",s.key,d,at(localDateStr(new Date(day.getFullYear(),day.getMonth(),day.getDate()-1)),hh,mm),extra); }
        });
      }
    });
  }
  if (p.daily) {
    const spentToday=(Array.isArray(transactions)?transactions:[]).some(x=>x && x.date===todayStr);
    const [dh,dm]=p.dailyTime.split(":").map(Number);
    for (let i=0;i<14;i++) {
      const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i), ds=localDateStr(d);
      if (i===0 && spentToday) continue;
      push("daily","d",ds,new Date(d.getFullYear(),d.getMonth(),d.getDate(),dh,dm,0,0),{});
    }
  }
  return out.sort((a,b)=>a.atMs-b.atMs || a.id-b.id).slice(0,cap);
}
// The text of one notification (shown on the lock screen). With "hide amounts" on, or the app's own privacy mode, no amount is written.
export function reminderMessage(item, prefs, currency) {
  if (item.kind==="daily") return { title:t("remind.dailyTitle"), body:t("remind.dailyBody") };
  const hide=cleanReminderPrefs(prefs).hideAmount || PRIVACY;
  const name=hide ? t("remind.aPayment") : item.name;
  return { title:t(item.kind==="bill"?"remind.billTitle":"remind.recurTitle",{name}), body:hide ? t("remind.bodyHidden") : t("remind.body",{amount:fmt(item.amount,currency)}) };
}
// ─── SVG icon system ──────────────────────────────────────────────────────────
const ICONS = {
  food:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v7"/><path d="M7 2v7"/><path d="M10 2v7"/><path d="M4 7a3 3 0 0 0 6 0"/><path d="M7 10v12"/><path d="M17 2c-2.2 2-3 4.5-3 7v2h6V9c0-2.5-.8-5-3-7Z"/><path d="M17 11v11"/></svg>`,
  transport:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  shopping:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
  gifts:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>`,
  entertain:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  digital:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`,
  health:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  edu:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
  travel:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8l-8.2-1.8a.5.5 0 0 0-.5.8L9 12l-4 4-2.1-.7a.5.5 0 0 0-.6.6L4 19l3.1 1.7a.5.5 0 0 0 .6-.6L7 18l4-4 4 4.7a.5.5 0 0 0 .8-.5Z"/></svg>`,
  housing:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  finance:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
  other:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  salary:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  freelance:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/><path d="M10 12v2h4v-2"/></svg>`,
  income:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg>`,
  car:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14v-4.5l-1.6-4.3A2 2 0 0 0 15.5 7h-7a2 2 0 0 0-1.9 1.2L5 12.5V17z"/><path d="M5 12.5h14"/><circle cx="8" cy="17" r="1.8"/><circle cx="16" cy="17" r="1.8"/></svg>`,   // Run 38
  // Run 35: icons for the new categories (same 24px line style)
  family:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M16 14.2a4 4 0 0 1 5 3.8v2"/></svg>`,
  pets:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="5.8" r="1.8"/><circle cx="14.5" cy="5.8" r="1.8"/><circle cx="18.5" cy="10" r="1.8"/><path d="M12.2 11c-3 0-5.6 3-5.6 5.4 0 1.7 1.5 2.4 3 2 1-.3 1.6-.5 2.6-.5s1.6.2 2.6.5c1.5.4 3-.3 3-2 0-2.4-2.6-5.4-5.6-5.4z"/></svg>`,
  work:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>`,
  business:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 11h.01M15 11h.01"/></svg>`,
  stipend:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/></svg>`,
  pension:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M4 10h16L12 4z"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/></svg>`,
  benefits:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/></svg>`,
  familyin:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="3"/><path d="M2 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M17 4v8"/><path d="M14 9l3 3 3-3"/></svg>`,
  alimony:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3"/><path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M9 3.5 12 1l3 2.5"/></svg>`,
  rental:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><circle cx="14.5" cy="14" r="2.5"/><path d="M8.5 20v-4.5"/></svg>`,
  investin:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>`,
  sales:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>`,
  giftin:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M5 12v9h14v-9"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>`,
  refund:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>`,
  savout:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 8.5V7a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h13v7a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V8"/><path d="M16 14h.01"/></svg>`,
  add:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  repeat:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
  chevDown:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  chevUp:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="6 15 12 9 18 15"/></svg>`,
  backspace:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H9l-6 7 6 7h12z"/><line x1="12" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="12" y2="15"/></svg>`,
  chevRight:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  list:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  chart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  filter:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  calendar:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  arrowUp:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  arrowDown:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
  pace:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  goal:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  card:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/></svg>`,
  wallet:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 015.5 5H19v14H5.5A2.5 2.5 0 013 16.5z"/><path d="M19 9h-4a2 2 0 000 4h4"/><circle cx="15.5" cy="11" r=".6" fill="currentColor"/></svg>`,
  safe:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  merchant:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18"/><path d="M4 10V20h16V10"/><path d="M2 10l2-7h16l2 7"/><path d="M2 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M9 20v-5h6v5"/></svg>`,
  pattern:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8.2 14.5A7 7 0 1 1 15.8 14.5c-.9.6-1.3 1.3-1.5 2.5h-4.6c-.2-1.2-.6-1.9-1.5-2.5Z"/></svg>`,
  compare:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  menu:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
  chevLeft:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  backup:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  eye:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.6"/><path d="M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
};

// Navigation (2026-10-27 redesign): five tabs. Recurring payments and Import / Export are pages under More; on them the
// More tab stays selected, Back (or the title's back arrow) returns to More, and a sideways swipe moves from More's position.
const TABS = [{id:"home",icon:"home"},{id:"ledger",icon:"list"},{id:"monthly",icon:"chart"},{id:"goals",icon:"goal"},{id:"more",icon:"menu"}];
const TAB_ORDER = TABS.map(x=>x.id);
// Run 38: "accounts" is a page of its own opened from Home (it used to jump into the Settings tab, open a fold and scroll at the same time).
const SUBPAGE_PARENT = { recurring:"more", io:"more", debts:"more", gifts:"more", accounts:"home" };

export function Icon({ name, size=16, color="currentColor", style={} }) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size,flexShrink:0,color,...style}}
      dangerouslySetInnerHTML={{__html:ICONS[name]||ICONS.other}} aria-hidden="true"/>
  );
}
export function CatIcon({ catId, size=16, color }) {
  const cat=CAT(catId);
  return <Icon name={catId} size={size} color={color||cat?.color||"#98A5B7"}/>;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
// (the stylesheet lives in styles.js)

// ─── Sheet gestures and keyboard (from patch_H_design.py, reviewed) ──────────
// • Swipe down on a sheet's grip: the sheet follows the finger 1:1; on release the finger's velocity is handed to a spring that
//   either dismisses it or settles it back. The motion starts from where the sheet visibly is, so it can be grabbed again mid-flight.
// • Escape closes the top-most layer. Focus moves into a layer when it opens and returns to where it was when it closes;
//   Tab stays inside the open layer. Reduced-motion users get no spring (the sheet simply closes or resets).
// Dismissal always goes through the sheet's own close handler (a click on its overlay, or the add form's close button).
// closeTopLayer() is that dismissal for the top-most layer, shared by Escape and the phone's Back button; false = nothing open.
function closeTopLayer() {
  const keep=document.querySelector(".discard-overlay .discard-keep"); if (keep) { keep.click(); return true; }   // "unsaved" question: Back/Escape = keep editing
  const add=document.querySelector(".add-overlay .add-close"); if (add) { add.click(); return true; }
  const sheets=document.querySelectorAll(".sheet-overlay"); if (sheets.length) { sheets[sheets.length-1].click(); return true; }
  if (document.querySelector(".lock-screen")) return false;   // never reach behind the lock screen
  return runBackStep();   // Run 40: an editor or "new …" form open inside the page is cancelled before the page is left
}
function useSheetGestures() {
  useEffect(()=>{
    const reduced=()=>!!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let drag=null, anim=null;
    const stop=()=>{ if (anim) { cancelAnimationFrame(anim.raf); anim=null; } };
    const apply=(sheet,overlay,y,h)=>{ sheet.style.transform=`translateY(${y}px)`; overlay.style.background=`rgba(0,0,0,${0.5*(1-Math.min(1,Math.max(0,y)/h))})`; };
    const spring=(sheet,overlay,from,to,v0,h,done)=>{
      stop(); if (reduced()) { apply(sheet,overlay,to,h); done(); return; }
      let x=from, v=v0, last=performance.now(); const k=380, c=2*Math.sqrt(k)*0.92;
      const step=(now)=>{ const dt=Math.min(0.032,(now-last)/1000); last=now; v+=(-k*(x-to)-c*v)*dt; x+=v*dt; apply(sheet,overlay,x,h);
        if (Math.abs(x-to)<0.4 && Math.abs(v)<8) { apply(sheet,overlay,to,h); anim=null; done(); } else anim.raf=requestAnimationFrame(step); };
      anim={ raf:requestAnimationFrame(step) };
    };
    const onDown=(e)=>{
      const grip=e.target.closest && e.target.closest(".sheet-grip"); if (!grip) return;
      const sheet=grip.closest(".sheet"), overlay=grip.closest(".sheet-overlay"); if (!sheet||!overlay) return;
      stop(); let cur=0; try { cur=new DOMMatrix(getComputedStyle(sheet).transform).m42||0; } catch {}
      drag={ sheet, overlay, pid:e.pointerId, startY:e.clientY-cur, y:cur, h:sheet.getBoundingClientRect().height, samples:[{t:e.timeStamp,y:cur}] };
      sheet.classList.add("dragging"); try { grip.setPointerCapture(e.pointerId); } catch {}
    };
    const onMove=(e)=>{
      if (!drag || e.pointerId!==drag.pid) return;
      let y=e.clientY-drag.startY; if (y<0) y*=0.2;                                  // resist pulling up
      drag.y=y; drag.samples.push({t:e.timeStamp,y}); if (drag.samples.length>6) drag.samples.shift();
      apply(drag.sheet,drag.overlay,y,drag.h);
    };
    const onUp=(e)=>{
      if (!drag || e.pointerId!==drag.pid) return;
      const d=drag; drag=null; d.sheet.classList.add("settled"); d.sheet.classList.remove("dragging");
      // Release velocity over the last 100 ms up to the moment of release (a finger that stopped before lifting has ~0 velocity;
      // the patch measured only between move events, so a short drag released after a pause counted as a hard flick).
      const recent=d.samples.filter(s=>e.timeStamp-s.t<=100), a=recent[0]||d.samples[d.samples.length-1];
      const v=e.timeStamp-a.t>0 ? ((d.y-a.y)/(e.timeStamp-a.t))*1000 : 0;               // px/s, downwards positive
      // Where the sheet would come to rest if thrown (momentum projection, deceleration 0.99): dismiss past 45% of its height.
      const projected=d.y+(v/1000)*0.99/(1-0.99);
      if (projected>d.h*0.45) spring(d.sheet,d.overlay,d.y,d.h,v,d.h,()=>{ d.overlay.dataset.out="1"; d.overlay.click(); });
      else spring(d.sheet,d.overlay,d.y,0,v,d.h,()=>{ d.sheet.style.transform=""; d.overlay.style.background=""; });
    };
    const onKey=(e)=>{
      if (e.key==="Escape" && !e.defaultPrevented) {
        if (closeTopLayer()) e.preventDefault();
      } else if (e.key==="Tab") {
        const layers=document.querySelectorAll(".add-overlay,.sheet"); const top=layers[layers.length-1]; if (!top) return;
        const f=[...top.querySelectorAll('button,[href],input:not([type=file]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled && x.offsetParent!==null);
        if (!f.length) return;
        const first=f[0], last=f[f.length-1], inside=top.contains(document.activeElement);
        if (!inside || (e.shiftKey && document.activeElement===first)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); }
      }
    };
    // Closing a sheet (backdrop tap, its Close/Cancel button, Escape, Back) slides it down and fades the dim first, then runs the sheet's own close.
    // The close itself is replayed unchanged after ~0.2 s, so every sheet keeps its own logic; if it refuses to close, the sheet comes back at once.
    const exiting=new WeakSet();
    const onClickCapture=(e)=>{
      const ov=e.target && e.target.closest ? e.target.closest(".sheet-overlay") : null;
      if (!ov || ov.dataset.out==="1" || reduced()) return;
      const closer=e.target.closest("[data-closer]"), backdrop=e.target===ov;
      if (!backdrop && !closer) return;
      e.stopPropagation(); e.preventDefault();
      if (exiting.has(ov)) return;
      exiting.add(ov); ov.classList.add("leaving");
      setTimeout(()=>{
        if (!document.contains(ov)) return;
        ov.dataset.out="1"; (backdrop?ov:closer).click();
        setTimeout(()=>{ if (document.contains(ov)) { ov.classList.remove("leaving"); delete ov.dataset.out; } exiting.delete(ov); },60);
      },190);
    };
    document.addEventListener("click",onClickCapture,true);
    const stack=[];
    const sync=()=>{
      document.querySelectorAll(".sheet,.add-overlay").forEach(el=>{
        if (stack.some(x=>x.el===el)) return;
        stack.push({ el, prev:document.activeElement });
        if (el.classList.contains("sheet")) el.focus({ preventScroll:true });
      });
      for (let i=stack.length-1;i>=0;i--) if (!document.contains(stack[i].el)) { const { prev }=stack.splice(i,1)[0]; if (prev && document.contains(prev) && prev.focus) prev.focus({ preventScroll:true }); }
    };
    const mo=new MutationObserver(sync); mo.observe(document.body,{ childList:true, subtree:true });
    document.addEventListener("pointerdown",onDown); document.addEventListener("pointermove",onMove);
    document.addEventListener("pointerup",onUp); document.addEventListener("pointercancel",onUp); document.addEventListener("keydown",onKey);
    return ()=>{ stop(); mo.disconnect(); document.removeEventListener("click",onClickCapture,true); document.removeEventListener("pointerdown",onDown); document.removeEventListener("pointermove",onMove);
      document.removeEventListener("pointerup",onUp); document.removeEventListener("pointercancel",onUp); document.removeEventListener("keydown",onKey); };
  },[]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
// Run 17: an unexpected error while drawing a screen used to leave a blank page. The recovery screen touches NO stored data;
// the error text (no amounts, no names) goes to a small local log so the cause can be found: key expense_ledger_v5__crashlog, newest 5.
const CRASH_LOG_KEY="expense_ledger_v5__crashlog";
function appendCrashLog(err) {
  try {
    let log=[]; try { const p=JSON.parse(localStorage.getItem(CRASH_LOG_KEY)||"[]"); if (Array.isArray(p)) log=p.filter(isPlainObject); } catch { log=[]; }
    log.push({ at:new Date().toISOString(), message:String((err&&err.message)||err||"unknown").slice(0,300), stack:String((err&&err.stack)||"").slice(0,800) });
    localStorage.setItem(CRASH_LOG_KEY,JSON.stringify(log.slice(-5)));
  } catch { /* storage may be full or blocked: the recovery screen still works */ }
}
// ─── App lock screens (Run 19) ───────────────────────────────────────────────
// The lock sits OUTSIDE the app: while locked the app stays mounted (nothing typed is lost) but is hidden, and the lock screen covers it.
export function lockLang() { try { const r=JSON.parse(localStorage.getItem(KEY)||"null"); return r && LANGS.includes(r.language) ? r.language : "en"; } catch { return "en"; } }
export const LOCK_AFTER_KEY={ 0:"lock.after0", 1:"lock.after1", 5:"lock.after5", 15:"lock.after15" };
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state={ failed:false }; }
  static getDerivedStateFromError() { return { failed:true }; }
  componentDidCatch(err) { appendCrashLog(err); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash-screen" role="alert" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:"24px 28px",textAlign:"center",background:"#07151A",color:"#E8F1F2",fontFamily:"system-ui,sans-serif"}}>
        <h1 style={{fontSize:22,margin:0}}>{t("crash.title")}</h1>
        <p style={{fontSize:15,lineHeight:1.5,margin:0,maxWidth:340,opacity:0.85}}>{t("crash.body")}</p>
        <button onClick={()=>window.location.reload()} style={{minHeight:48,padding:"0 24px",border:"none",borderRadius:14,background:"#4CC9C4",color:"#07151A",fontSize:16,fontWeight:700}}>{t("crash.reload")}</button>
      </div>
    );
  }
}
export default function App() {
  // Run 40: the launch mark hands over once the first screen (Home, the lock screen or the language choice) has been painted.
  useEffect(()=>{ let r2=0; const r1=requestAnimationFrame(()=>{ r2=requestAnimationFrame(()=>finishLaunch()); }); return ()=>{ cancelAnimationFrame(r1); cancelAnimationFrame(r2); }; },[]);
  return <ErrorBoundary><LockGate><AppInner/></LockGate></ErrorBoundary>;
}
function AppInner() {
  const [state,    setState]    = useState(() => migrateAndLoad());
  // The whole tree renders in the saved language. Changing it is an ordinary state update: everything re-renders in place,
  // so the open screen, open sheets and anything typed into a form are kept.
  setLang(state.language||"en");
  useEffect(()=>{ document.documentElement.lang=state.language||"en"; },[state.language]);
  const [tab,      setTab]      = useState("home");
  const [tabKey,   setTabKey]   = useState(0);
  // Privacy mode ("Hide amounts") is remembered across closing the app until the user changes it (Run 20; before that it started off every time).
  const [privacy,  setPrivacy]  = useState(()=>readPrivacy());
  setPrivacyMode(privacy);
  useEffect(()=>{ writePrivacy(privacy); },[privacy]);
  // Budgets & Goals: which half is shown, and a counter the title bar's "+" bumps to open that half's "new" form.
  const [goalsSeg, setGoalsSeg] = useState("budgets");
  const [goalsAdd, setGoalsAdd] = useState(0);
  const [showAdd,  setShowAdd]  = useState(false);
  const [addLeaving, setAddLeaving] = useState(false), addTok=useRef(0);
  const [viewAcc, setViewAcc] = useState(null);   // Run 38: the account whose details sheet is open (tapped on Home)
  const [moreScroll, setMoreScroll] = useState("");   // Run 27b: section the Settings tab should glide to when opened from Home
  
  const [,setCatVer] = useState(0);   // Run 24: bumped when the user's own categories change, so every screen redraws with them
  const [toast,    setToast]    = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [prefill,  setPrefill]  = useState(null);
  const [editId,   setEditId]   = useState(null);
  const [viewTxn,  setViewTxn]  = useState(null);
  const [infoKind, setInfoKind] = useState(null);   // Run 16: "how" | "privacy" | null
  const [showLock, setShowLock] = useState(false);   // Run 19: the App lock sheet
  const [importPending, setImportPending] = useState(null);
  const [skipDup, setSkipDup] = useState(true);
  const [skipSim, setSkipSim] = useState(true);   // Run 51: entries of the file with the same day, kind and amount as one here
  // Recovery messages stay on screen until the user dismisses them; ordinary toasts can never replace them.
  const [recoveryNotice, setRecoveryNotice] = useState(()=>LOAD_NOTICE);
  const stateRef = useRef(state);
  stateRef.current = state;   // always the latest committed state, for callbacks that must not close over a stale copy
  useEffect(()=>{   // Run 29: tell the user once when Android has restored this data from a backup (see restoreCheck)
    let live=true;
    try {
      const nat=window.LedgerNative; if (!nat || typeof nat.installId!=="function") return;
      Promise.resolve(nat.installId()).then(cur=>{   // the shell may answer at once or asynchronously
        if (!live) return;
        const r=restoreCheck(localStorage.getItem(INSTALL_KEY),cur);
        if (r==="none" || r==="same") return;
        localStorage.setItem(INSTALL_KEY,String(cur).trim());
        if (r!=="restored") return;
        const tx=stateRef.current.transactions||[]; if (tx.length===0) return;
        const newest=tx.reduce((m,x)=>x&&x.date&&x.date>m?x.date:m,"");
        const msg=t("restore.notice",{n:tx.length,date:newest?fmtDate(newest):"–"});
        setRecoveryNotice(prev=>prev?prev+" "+msg:msg);
      }).catch(()=>{ /* the shell or storage is unavailable: no notice, nothing else is affected */ });
    } catch { /* same */ }
    return ()=>{ live=false; };
  },[]);
  // Run 13: bills an older app version removed (worked out once, from the data as loaded, against the mirror kept on disk).
  // While the offer is open the mirror is not rewritten, so ignoring the banner never loses the bills; restoring, or
  // choosing "No thanks", closes it and the mirror then follows the ledger again.
  const [restoreOffer] = useState(() => planBillRestore(state.bills, state.transactions, readBillsMirror()));
  const [restoreClosed, setRestoreClosed] = useState(false);
  const restoreOpen = !!restoreOffer && !restoreClosed && restoreOffer.bills.some(b=>!(state.bills||[]).some(x=>x.id===b.id));
  useSheetGestures();
  // Dismissing the backup reminder hides it for this visit only; it is worked out from the saved state on every render.
  const [backupDismissed, setBackupDismissed] = useState(false);
  const [iosNote, setIosNote] = useState(()=>iosBrowserTab() && !iosNoteSeen());
  const [rolloverSeen, setRolloverSeen] = useState(()=>readRolloverSeen());   // Run 50: month already answered (own key)
  const [recDismissed, setRecDismissed] = useState(()=>readRecSuggestDismissed());   // Run 50: places whose "make it a bill" offer was dismissed (own key)
  const backupReminder = backupReminderDue(state);
  const snackTimer=useRef(null);
  const snackActive=useRef(false);   // is an undo window currently open?
  const undoBuffer=useRef([]);       // everything deleted inside the current undo window

  // PWA manifest — only when the page has none (the single-file build). The built app links /manifest.webmanifest.
  useEffect(() => {
    if (document.getElementById("pwa-manifest") || document.querySelector('link[rel="manifest"]')) return;
    const manifest={name:"Expense Ledger",short_name:"Ledger",start_url:"/",display:"standalone",
      background_color:"#07151A",theme_color:"#07151A",orientation:"portrait",
      icons:[{src:"/icon-192.png",sizes:"192x192",type:"image/png",purpose:"any maskable"},
             {src:"/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any maskable"}]};
    const link=document.createElement("link");
    link.id="pwa-manifest"; link.rel="manifest";
    link.href=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:"application/json"}));
    document.head.appendChild(link);
    const addMeta=(n,c)=>{if(document.querySelector(`meta[name="${n}"]`))return;const m=document.createElement("meta");m.name=n;m.content=c;document.head.appendChild(m);};
    addMeta("apple-mobile-web-app-capable","yes");
    addMeta("apple-mobile-web-app-status-bar-style","black-translucent");
    addMeta("apple-mobile-web-app-title","Expense Ledger");
    addMeta("theme-color","#07151A");
  },[]);

  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(()=>{
    // Never overwrite the original stored data if we could not keep a recovery copy of it.
    if (SAVE_BLOCKED) { setStorageFailed(true); return; }
    const ok=writeRaw(KEY,state);
    setStorageFailed(!ok);
    if (ok && !restoreOpen) syncBillsMirror(state.bills, state.transactions);
  },[state, restoreOpen]);

  const merchantMemory=useMemo(()=>buildMerchantMemory(state.transactions),[state.transactions]);

  const toastTimer=useRef(null);
  // A new toast cancels the previous one's timer, so back-to-back messages are never cut short.
  const toastMs=useRef(1800);
  const showToast=useCallback((msg,ms=1800)=>{ clearTimeout(toastTimer.current); toastMs.current=ms; setToast(msg); toastTimer.current=setTimeout(()=>setToast(null),ms); },[]);
  // Undo snackbars (Run 8): a snackbar of the same kind replaces the open one (more deletions share one "N deleted" undo);
  // a different kind waits until the open one's undo window ends, so an undo is never silently taken away.
  const snackQueue=useRef([]), snackKind=useRef(null);
  const openSnack=useCallback(({msg,onUndo,ms,kind,label})=>{
    clearTimeout(snackTimer.current);
    setSnackbar({msg,onUndo,ms,label}); snackActive.current=true; snackKind.current=kind;
    snackTimer.current=setTimeout(()=>closeSnack(),ms);
  },[]);
  const closeSnack=useCallback(()=>{
    clearTimeout(snackTimer.current); setSnackbar(null); snackActive.current=false; snackKind.current=null;
    const next=snackQueue.current.shift(); if (next) setTimeout(()=>openSnack(next),250);
  },[]);
  const showSnackbar=useCallback((msg,onUndo,ms=4000,kind="other",label="")=>{   // Run 37b: label = the button's text ("Open"); default "Undo"
    // Run 16: the undo after ADDING an entry is the least important one. It gives way at once to any other undo (a delete, an
    // import ...) instead of making that one wait, and it never waits behind another undo: a plain message is shown instead.
    if (snackActive.current && snackKind.current==="add" && kind!=="add") { openSnack({msg,onUndo,ms,kind,label}); return; }
    if (kind==="add" && snackActive.current && snackKind.current!=="add") { showToast(msg); return; }
    if (snackActive.current && snackKind.current!==kind) { snackQueue.current.push({msg,onUndo,ms,kind,label}); return; }
    openSnack({msg,onUndo,ms,kind,label});
  },[showToast]);
  useEffect(()=>{ setUndoHost(showSnackbar); return ()=>setUndoHost(null); },[showSnackbar]);
  // Run 51: what the Accounts card needs to remove an account safely: the entries as they are now, a way to change them, and the Undo bar.
  const accTools=useMemo(()=>({ getTransactions:()=>stateRef.current.transactions, setTransactions:(fn)=>setState(s=>({ ...s, transactions:fn(s.transactions) })), showSnackbar }),[showSnackbar]);

  // Run 34: going back out of a sub-page (Recurring, Import / Export, Debts) slides the page away first (~0.19 s) instead of cutting; every other switch is as before.
  const [pageOut,setPageOut]=useState(false), pageOutBusy=useRef(false);
  // Run 38 (owner: "switching pages always looks like it is refreshing"): each tab remembers where it was scrolled, so coming back shows the
  // same place instead of a fresh page from the top. A sub-page (Recurring, Import / Export, Debts, Accounts) always opens at its top.
  const scrollMem=useRef({});
  // Saved relative to the page itself (not the window): a banner easing shut above the page must not shift where the list comes back.
  const pageDocTop=()=>{ const el=document.querySelector("main.page"); return el ? el.getBoundingClientRect().top+(window.scrollY||0) : 0; };
  const saveScroll=(from)=>{ try { const el=document.querySelector("main.page"); scrollMem.current[from]={ w:(window.scrollY||0)-pageDocTop(), p:el?el.scrollTop:0 }; } catch {} };
  const switchTab=useCallback((t)=>{
    const from=tabRef.current;
    if (!SUBPAGE_PARENT[from]) saveScroll(from);
    if (SUBPAGE_PARENT[from] && SUBPAGE_PARENT[from]===t && !motionOff()) {
      if (pageOutBusy.current) return;
      pageOutBusy.current=true; setPageOut(true);
      setTimeout(()=>{ pageOutBusy.current=false; setPageOut(false); setTab(t); setTabKey(k=>k+1); },190);
      return;
    }
    setTab(t); setTabKey(k=>k+1);
  },[]);
  useLayoutEffect(()=>{   // Run 38: put the tab back where it was (instantly, before it is painted)
    const m=SUBPAGE_PARENT[tab] ? null : scrollMem.current[tab];
    const target=()=>m ? Math.max(0,pageDocTop()+m.w) : 0;
    const go=()=>{ try { const el=document.querySelector("main.page"); if (el) el.scrollTop=m?m.p:0; window.scrollTo({ top:target(), behavior:"instant" }); } catch { try { window.scrollTo(0,target()); } catch {} } };
    go();
    if (!m || !(m.w>0 || m.p>0)) return undefined;
    // The page may still be growing (lists, charts) and a banner above may still be easing shut when it is first painted. Try again for a few
    // frames until the remembered place is reached; stop at once if the person scrolls by themselves meanwhile.
    let tries=0, timer=0, lastW=window.scrollY;
    const again=()=>{ tries++; if (Math.abs(window.scrollY-lastW)>2) return; if (Math.abs(window.scrollY-target())<=2 || tries>10) return; go(); lastW=window.scrollY; timer=setTimeout(again,60); };
    timer=setTimeout(again,30);
    return ()=>clearTimeout(timer);
  },[tabKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  // the page softly re-draws when "Hide amounts" changes; Run 38: and when the language changes (the words cross-fade instead of snapping)
  const pfCount=useRef(0), pfPrev=useRef(privacy+"|"+state.language); if (pfPrev.current!==privacy+"|"+state.language) { pfPrev.current=privacy+"|"+state.language; pfCount.current++; }
  const [debtsStart,setDebtsStart]=useState("debts");   // Run 18: the add form can send you straight to the Debts or Loans list
  const tabRef=useRef(tab); tabRef.current=tab;

  // Phone Back button (and browser Back). While the app is open one extra history entry guards it: Back first closes the
  // top sheet, then returns to Home, and on Home with nothing open it only warns; Back again within 2 s leaves the app.
  // history.state marks the guard entry, so a guard is never pushed twice.
  const armBack=useRef(()=>{});
  useEffect(()=>{
    let rearm=null;
    const arm=()=>{ if (!(history.state && history.state.ledgerGuard)) history.pushState({ ledgerGuard:true }, ""); };
    armBack.current=arm;
    const onPop=()=>{
      clearTimeout(rearm);
      if (closeTopLayer()) { arm(); return; }
      if (tabRef.current!=="home") { switchTab(SUBPAGE_PARENT[tabRef.current]||"home"); arm(); return; }
      if (history.state && history.state.ledgerGuard) return;
      showToast(t("nav.backAgain"),2000);
      rearm=setTimeout(arm,2000);
    };
    // A sheet opening while the app is unguarded (just after the warning) guards it again.
    const mo=new MutationObserver(()=>{ if (document.querySelector(".sheet-overlay,.add-overlay")) arm(); });
    mo.observe(document.body,{ childList:true, subtree:true });
    arm(); window.addEventListener("popstate",onPop);
    return ()=>{ clearTimeout(rearm); mo.disconnect(); window.removeEventListener("popstate",onPop); };
  },[switchTab,showToast]);
  useEffect(()=>{ if (tab!=="home") armBack.current(); },[tab]);

  // Run 15: the Android shell hands the phone's Back button to the page here (see MainActivity.java in the Android project). It
  // exists because the WebView's own history is unreliable for the guard entries this page pushes without a touch: on an emulator
  // Back used to close the whole app, even with the add form open. Same rules as above: close what is open, leave a tab, warn
  // once, and only a second press within 2 seconds answers "exit" (the shell then closes the app). Does nothing in a browser.
  useEffect(()=>{
    let warnedAt=0;
    window.__ledgerNativeBack=()=>{
      if (closeTopLayer()) return "handled";
      if (tabRef.current!=="home") { switchTab(SUBPAGE_PARENT[tabRef.current]||"home"); return "handled"; }
      const now=Date.now(); if (now-warnedAt<2000) return "exit";
      warnedAt=now; showToast(t("nav.backAgain"),2000); return "handled";
    };
    return ()=>{ delete window.__ledgerNativeBack; };
  },[switchTab,showToast]);

  // Swipe between the five sections: a quick, clearly sideways swipe on the page. Ignored while a sheet or the add form is
  // open, on form fields, on rows that scroll sideways (e.g. the filter chips), and from the screen edges (the system's own
  // back gesture lives there).
  useEffect(()=>{
    const ORDER=TAB_ORDER;
    let s=null;
    const scrollsSideways=(el)=>{ for (;el && el!==document.body;el=el.parentElement) { const ox=getComputedStyle(el).overflowX; if ((ox==="auto"||ox==="scroll") && el.scrollWidth>el.clientWidth+1) return true; } return false; };
    const onStart=(e)=>{
      s=null; if (e.touches.length!==1) return;
      const tg=e.target, p=e.touches[0];
      if (!tg.closest || !tg.closest(".page") || document.querySelector(".sheet-overlay,.add-overlay")) return;
      if (tg.closest("input,textarea,select,[contenteditable]") || scrollsSideways(tg)) return;
      if (p.clientX<24 || p.clientX>window.innerWidth-24) return;
      s={ x:p.clientX, y:p.clientY, t0:e.timeStamp, dx:0, dy:0 };
    };
    const onMove=(e)=>{ if (!s) return; const p=e.touches[0]; s.dx=p.clientX-s.x; s.dy=p.clientY-s.y; };
    const onEnd=(e)=>{
      if (!s) return; const { dx, dy, t0 }=s; s=null;
      if (Math.abs(dx)<70 || Math.abs(dx)<Math.abs(dy)*1.8 || e.timeStamp-t0>700) return;
      const i=ORDER.indexOf(SUBPAGE_PARENT[tabRef.current]||tabRef.current), j=i+(dx<0?1:-1);
      if (i<0 || j<0 || j>=ORDER.length) return;
      switchTab(ORDER[j]);   // Run 38: the tab restores its own scroll position (no jump to the top)
    };
    const reset=()=>{ s=null; };
    document.addEventListener("touchstart",onStart,{ passive:true }); document.addEventListener("touchmove",onMove,{ passive:true });
    document.addEventListener("touchend",onEnd,{ passive:true }); document.addEventListener("touchcancel",reset,{ passive:true });
    return ()=>{ document.removeEventListener("touchstart",onStart); document.removeEventListener("touchmove",onMove);
      document.removeEventListener("touchend",onEnd); document.removeEventListener("touchcancel",reset); };
  },[switchTab]);

  // Run 18: the round add button slides away while the list is scrolled DOWN (so it never hides an amount under it) and returns on scrolling up.
  const [fabHidden,setFabHidden]=useState(false);
  useEffect(()=>{
    // Run 26d: the screens scroll inside their own box (.page), and scroll events do not bubble to the window - listen in the capture phase
    // so the button really does slide away while the list moves down (it used to stay on top of amounts and buttons).
    let last=0, lastEl=null;
    const onScroll=(e)=>{ const el=e.target; const y=el===document||el===window||el===document.documentElement?(window.scrollY||0):(el.scrollTop||0);
      if (el!==lastEl) { lastEl=el; last=y; return; }
      if (y>last+8 && y>80) setFabHidden(true); else if (y<last-8 || y<=80) setFabHidden(false); last=y; };
    window.addEventListener("scroll",onScroll,{ passive:true, capture:true }); return ()=>window.removeEventListener("scroll",onScroll,{ capture:true });
  },[]);
  // Run 12: the add form may say which bill a recurring entry pays ("new" = make a bill from it, or a bill id). An entry
  // that is not recurring has no bill. billChoice null = grouped the earlier way (while old recurring payments exist).
  const withBill=(s,id,billChoice)=>{
    const txn=s.transactions.find(t=>t.id===id);
    if (txn && !txn.recurring && txn.billId) { const { billId, ...rest }=txn; return { ...s, transactions:s.transactions.map(t=>t.id===id?rest:t) }; }
    if (!txn || !txn.recurring || !billChoice) return s;
    const r=assignToBill(s.transactions,s.bills||[],id,billChoice);
    return { ...s, transactions:r.transactions, bills:r.bills };
  };
  const addTransaction=useCallback((txn)=>{
    const { billChoice, wallet, trip, account, refundFor, fx, spread, reimb, reimbFor, ...data }=txn, id=Date.now()+Math.random();
    const rf={ ...refundPart(data,refundFor), ...(cleanFx(fx)?{ fx:cleanFx(fx) }:{}), ...(data.type==="expense" && spreadMonths(spread) ? { spread:spreadMonths(spread) } : {}), ...(data.type==="expense" && cleanReimb(reimb) ? { reimb:cleanReimb(reimb) } : {}), ...(data.type==="income" && data.category==="refund" && reimbForRef(reimbFor)!==null ? { reimbFor:reimbForRef(reimbFor) } : {}) };   // Run 39: fx kept only when valid; Run 41: spread only on expenses, 2 to 24
    // Run 16: adding can be undone for a few seconds (deleting always could). Undo restores the whole earlier state, including a
    // bill the entry may have created, and refuses if something else changed in the meantime, like the other undo windows.
    const before=stateRef.current;
    const next=withBill({...before,transactions:[{...data,...(walletId(wallet)?{wallet:walletId(wallet)}:{}),...(tripName(trip)?{trip:tripName(trip)}:{}),...(accId(account)?{account:accId(account)}:{}),...rf,id,createdAt:new Date().toISOString()},...before.transactions]},id,billChoice);
    setState(next);
    try { if (!readFxOff() && navigator.vibrate) navigator.vibrate(10); } catch { /* no vibration here */ }   // Run 41: one short tick when an entry is saved (off with "reduce effects")
    freshTxnId=id; setTimeout(()=>{ if (freshTxnId===id) freshTxnId=null; },1500);   // Run 25: the new row settles in (see TxnRow)
    const cross=budgetCrossing(before.transactions,next.transactions,next.budgets,{...data});
    const msg=cross ? t("toast.recorded")+". "+t(cross.kind==="over"?"budget.crossOver":"budget.crossNear",{ cat:catName(data.category), pct:cross.pct }) : t("toast.recorded");
    showSnackbar(msg,()=>{ if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; } setState(before); },6000,"add");
  },[showToast,showSnackbar]);

  // Run 50: several entries written as one sentence, saved in one step with one Undo (the review list already showed each one).
  const addManyTransactions=useCallback((items)=>{
    const list=(items||[]).filter(i=>i&&i.ok&&(i.type==="expense"||i.type==="income")&&i.amount>0&&isValidDateStr(i.date));
    if (!list.length) return;
    const before=stateRef.current, stamp=new Date().toISOString();
    const rows=list.map(i=>({ type:i.type, amount:i.amount, category:i.category, subcategory:i.subcategory||"", merchant:i.merchant||"", note:"", date:i.date, recurring:false, recurFreq:null, isActive:true, id:Date.now()+Math.random(), createdAt:stamp }));
    const next={...before,transactions:[...rows,...before.transactions]};
    setState(next);
    showSnackbar(tn("qt.added",rows.length),()=>{ if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; } setState(before); },6000,"add");
  },[showToast,showSnackbar]);

  // Run 17: a loan payment marked paid adds one plain expense and returns its id (so the payment record can point at it); removing
  // the record removes that entry again. No undo window here: the confirmation on the Debts page already asked.
  const addLoanEntry=useCallback((data)=>{
    const id=Date.now()+Math.random();
    setState(s=>({...s,transactions:[{...data,id,createdAt:new Date().toISOString()},...s.transactions]}));
    return id;
  },[]);
  const removeLoanEntry=useCallback((id)=>setState(s=>({...s,transactions:s.transactions.filter(t=>t.id!==id)})),[]);
  // Run 51: deleting a debt, a loan or a payment can be undone. The entries that go with it are taken out and handed back, so Undo can
  // return exactly the same entries (same ids, amounts and dates); an entry that is already there again is not added twice.
  const takeEntries=useCallback((ids)=>{
    const want=new Set((ids||[]).map(String)), gone=stateRef.current.transactions.filter(x=>want.has(String(x.id)));
    if (gone.length) setState(s=>({...s,transactions:s.transactions.filter(x=>!want.has(String(x.id)))}));
    return gone;
  },[]);
  const putEntries=useCallback((list)=>setState(s=>{
    const have=new Set(s.transactions.map(x=>String(x.id))), back=(list||[]).filter(x=>!have.has(String(x.id)));
    return back.length ? {...s,transactions:[...back,...s.transactions].sort((a,b)=>b.date.localeCompare(a.date))} : s;
  }),[]);

  // Run 18: an entry linked to a debt repayment is changed only from the Debts page, so the debt balance and the entry cannot drift apart.
  const debtLinked=(id)=>{ const tx=stateRef.current.transactions.find(x=>x.id===id); if (!tx || !debtLinkRef(tx.debtLink)) return false;
    const dd=readDebts(), d=dd.debts.find(x=>x.id===tx.debtLink.debtId); return !!(d && d.payments.some(p=>p.id===tx.debtLink.paymentId)); };
  const updateTransaction=useCallback((id,txn)=>{
    if (debtLinked(id)) { showToast(t("debt.linkedLocked"),5000); return; }
    const { billChoice, wallet, trip, account, refundFor, fx, spread, reimb, reimbFor, ...data }=txn;
    const rf={ ...refundPart(data,refundFor), ...(cleanFx(fx)?{ fx:cleanFx(fx) }:{}), ...(data.type==="expense" && spreadMonths(spread) ? { spread:spreadMonths(spread) } : {}), ...(data.type==="expense" && cleanReimb(reimb) ? { reimb:cleanReimb(reimb) } : {}), ...(data.type==="income" && data.category==="refund" && reimbForRef(reimbFor)!==null ? { reimbFor:reimbForRef(reimbFor) } : {}) };   // Run 39: switching back to manat removes fx; Run 41: an empty spread removes it
    // Run 16: the wallet is replaced or removed with the rest of the edit (an empty wallet clears it; no empty text is stored). Run 22: same for the trip. Run 36: same for "refund of".
    setState(s=>withBill({...s,transactions:s.transactions.map(t=>{ if (t.id!==id) return t; const { wallet:_w, trip:_tr, account:_ac, refundFor:_rf, fx:_fx, spread:_sp, reimb:_rb, reimbFor:_rbf, ...rest }=t; return { ...rest, ...data, ...(walletId(wallet)?{wallet:walletId(wallet)}:{}), ...(tripName(trip)?{trip:tripName(trip)}:{}), ...(accId(account)?{account:accId(account)}:{}), ...rf }; })},id,billChoice));
    showToast(t("toast.updated"));
  },[showToast]);

  // Run 24: several entries removed in one step. They share one undo window ("N transactions deleted"); entries tied to a debt
  // repayment are skipped and counted in one notice, exactly as single deletes refuse them.
  const deleteMany=useCallback((ids)=>{
    const want=new Set((ids||[]).map(String));
    const all=stateRef.current.transactions.filter(x=>want.has(String(x.id)));
    const gone=all.filter(x=>!debtLinked(x.id)), kept=all.length-gone.length;
    if (!gone.length) { if (kept) showToast(t("debt.linkedLocked"),5000); return; }
    const goneIds=new Set(gone.map(x=>String(x.id)));
    setState(s=>({...s,transactions:s.transactions.filter(x=>!goneIds.has(String(x.id)))}));
    if (!snackActive.current || snackKind.current!=="delete") undoBuffer.current=[];
    undoBuffer.current.push(...gone);
    const batch=[...undoBuffer.current];
    showSnackbar(tn("toast.deleted",batch.length)+(kept?". "+t("debt.linkedLocked"):""),()=>{
      setState(s=>{
        const have=new Set(s.transactions.map(x=>String(x.id)));
        const back=batch.filter(x=>!have.has(String(x.id)));
        return back.length ? {...s,transactions:[...back,...s.transactions].sort((a,b)=>b.date.localeCompare(a.date))} : s;
      });
      undoBuffer.current=[];
    }, 6000, "delete");
  },[showSnackbar,showToast]);

  // Run 34: put the chosen entries into one group (the existing "trip / group" label), or take them out of it when name is empty. Undo restores each entry's previous label.
  const groupMany=useCallback((ids,name)=>{
    const want=new Set((ids||[]).map(String)), label=tripName(name);
    const prev=new Map(stateRef.current.transactions.filter(x=>want.has(String(x.id))).map(x=>[String(x.id),x.trip]));
    if (!prev.size) return false;
    const apply=(pick)=>setState(s=>({...s,transactions:s.transactions.map(x=>{
      if (!prev.has(String(x.id))) return x;
      const v=pick(x); const { trip:_old, ...rest }=x; return v ? { ...rest, trip:v } : rest;
    })}));
    apply(()=>label);
    showSnackbar(label?tn("toast.grouped",prev.size,{name:label}):tn("toast.ungrouped",prev.size),()=>apply(x=>prev.get(String(x.id))),6000,"group");
    return true;
  },[showSnackbar]);

  // Run 24: splitting replaces one entry with several that add up to it; undo puts the original back unless something changed since.
  const splitEntry=useCallback((id,parts)=>{
    const before=stateRef.current, orig=before.transactions.find(x=>x.id===id);
    if (!orig) return false;
    const r=splitTransaction(orig,parts); if (!r.ok) return false;
    const next={...before,transactions:before.transactions.flatMap(x=>x.id===id?r.entries:[x])};
    setState(next);
    showSnackbar(t("split.done",{ n:r.entries.length }),()=>{ if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; } setState(before); },8000,"split");
    return true;
  },[showSnackbar,showToast]);

  const deleteTransaction=useCallback((id)=>{
    const removed=stateRef.current.transactions.find(t=>t.id===id);
    if (!removed) return;
    if (debtLinked(id)) { showToast(t("debt.linkedLocked"),5000); return; }
    setState(s=>({...s,transactions:s.transactions.filter(t=>t.id!==id)}));
    // Deletions made while one undo window is open share it ("2 transactions deleted"), so none of them is lost.
    if (!snackActive.current || snackKind.current!=="delete") undoBuffer.current=[];
    undoBuffer.current.push(removed);
    const batch=[...undoBuffer.current];
    showSnackbar(tn("toast.deleted",batch.length),()=>{
      // Put back exactly the removed records and nothing else: edits and additions made since are left untouched.
      setState(s=>{
        const have=new Set(s.transactions.map(t=>String(t.id)));
        const back=batch.filter(t=>!have.has(String(t.id)));
        return back.length ? {...s,transactions:[...back,...s.transactions].sort((a,b)=>b.date.localeCompare(a.date))} : s;
      });
      undoBuffer.current=[];
    }, 4000, "delete");
  },[showSnackbar,showToast]);

  // ── Run 12: explicit bills ──
  const [showSetupQ, setShowSetupQ] = useState(false);   // Run 50: the optional "set up in a minute" sheet
  const [editBill, setEditBill] = useState(undefined);   // undefined = closed · null = new bill · a bill = editing it
  // One explicit step: every recurring payment still grouped the old way gets a bill. A recovery copy of the data is kept
  // first (as before a Replace import) and Undo restores it exactly, unless something changed since.
  const convertBills=useCallback(()=>{
    const before=stateRef.current;
    if (!preserveRaw("before_bills", before)) { showToast(t("import.copyFailed"),6000); return; }
    pruneRecoveryCopies("before_bills");
    const r=convertLegacySchedules(before.transactions, before.bills||[]);
    if (!r.created) return;
    const next={ ...before, transactions:r.transactions, bills:r.bills };
    setState(next);
    showSnackbar(tn("bill.converted",r.created),()=>{ if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; } setState(before); },10000,"bills");
  },[showToast,showSnackbar]);
  const saveBill=useCallback((b)=>{
    setState(s=>{ const list=s.bills||[];
      return b.id ? { ...s, bills:list.map(x=>x.id===b.id?b:x) } : { ...s, bills:[...list, { ...b, id:newBillId(new Set(list.map(x=>x.id))) }] }; });
    setEditBill(undefined); showToast(t("bill.saved"));
  },[showToast]);
  // Run 50: apply what the "set up in a minute" sheet planned (planSetup already checked every answer). Accounts go to their own store first;
  // if that cannot be saved nothing else is changed. Bill and goal are added in one state change.
  const applySetupPlan=useCallback((plan)=>{
    if (plan.accounts.length) { let data=readAccounts(); for (const a of plan.accounts) { const r=addAccount(data,a.name,a.kind,a.amount,today()); if (r.added) data=r.data; } if (!writeAccounts(data)) { showToast(t("acc.saveFailed"),5000); return; } }
    if (plan.bill||plan.goal) setState(s=>{ const list=s.bills||[]; return { ...s, ...(plan.bill ? { bills:[...list,{ ...plan.bill, id:newBillId(new Set(list.map(x=>x.id))), active:true, createdAt:new Date().toISOString() }] } : {}), ...(plan.goal ? { goals:[...(s.goals||[]),{ ...plan.goal, id:"g"+Date.now() }] } : {}) }; });
    setCatVer(v=>v+1); showToast(t("setupq.done"));
  },[showToast]);
  // Deleting a bill keeps every payment; they stop pointing to it (and count as recurring payments the earlier way). Undo.
  const deleteBill=useCallback((id)=>{
    const before=stateRef.current;
    const next={ ...before, bills:(before.bills||[]).filter(b=>b.id!==id), transactions:before.transactions.map(t=>{ if (t.billId!==id) return t; const { billId, ...rest }=t; return { ...rest, recurring:false, recurFreq:null }; }) };   // history stays (amount, date, name, id); they leave the recurring system so they are neither set aside again nor offered for conversion
    setState(next); setEditBill(undefined);
    showSnackbar(t("bill.deleted"),()=>{ if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; } setState(before); },8000,"bills");
  },[showToast,showSnackbar]);
  const toggleBill=useCallback((id,active)=>setState(s=>({ ...s, bills:(s.bills||[]).map(b=>b.id===id?{...b,active}:b) })),[]);
  // Run 13: restoring the bills an older app version removed. Explicit, with a recovery copy first and Undo.
  const restoreBills=useCallback(()=>{
    const before=stateRef.current;
    if (!restoreOffer) return;
    if (!preserveRaw("before_bills_restore", before)) { showToast(t("import.copyFailed"),6000); return; }
    pruneRecoveryCopies("before_bills_restore");
    const next=applyBillRestore(before, restoreOffer);
    setState(next); setRestoreClosed(true);
    showSnackbar(tn("bill.restored",restoreOffer.bills.length),()=>{ if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; } setState(before); setRestoreClosed(false); },10000,"bills");
  },[restoreOffer,showToast,showSnackbar]);

  // Pausing or reactivating applies to the WHOLE schedule (every recorded payment of it), so the state is always consistent.
  const toggleScheduleActive=useCallback((ids,makeActive)=>{
    const set=new Set(ids.map(String));
    setState(s=>({...s,transactions:s.transactions.map(t=>set.has(String(t.id))?{...t,isActive:makeActive}:t)}));
  },[]);

  const openAdd=useCallback((prefillData=null,existingId=null)=>{
    if (existingId!==null && debtLinked(existingId)) { showToast(t("debt.linkedLocked"),5000); return; }
    addTok.current++; setAddLeaving(false); setPrefill(prefillData); setEditId(existingId); setShowAdd(true);
  },[showToast]);
  // Closing slides the form down for ~0.2 s, then removes it. A form opened again during that time is left alone (token check).
  const closeAdd=useCallback(()=>{
    const done=()=>{ setShowAdd(false); setPrefill(null); setEditId(null); setAddLeaving(false); };
    if (typeof window!=="undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done(); return; }
    const tok=++addTok.current; setAddLeaving(true);
    setTimeout(()=>{ if (addTok.current===tok) done(); },200);
  },[]);
  // Run 30 (Android app only): keep the phone's reminders equal to reminderPlan() whenever the ledger, language, currency or the reminder settings change.
  const [remindTick,setRemindTick]=useState(0);
  useEffect(()=>{ const f=()=>setRemindTick(n=>n+1); window.addEventListener(REMIND_EVENT,f); return ()=>window.removeEventListener(REMIND_EVENT,f); },[]);
  useEffect(()=>{
    if (!remindersAvailable()) return;
    try {
      const prefs=readReminders(), tx=state.transactions||[], bl=state.bills||[], cur=state.currency;
      const items=(prefs.bills||prefs.recurring||prefs.daily) ? reminderPlan(buildSchedules(tx,bl),tx,prefs,new Date()).map(i=>({ ...i, ...reminderMessage(i,prefs,cur) })) : [];
      Promise.resolve(window.LedgerNative.reminders.sync({ items, exact:readReminders().exact })).catch(()=>{ /* the shell is unavailable: the ledger is not affected */ });
    } catch { /* same */ }
  },[state.transactions,state.bills,state.currency,state.language,remindTick]);
  // Run 30 (Android app only): long-press shortcuts on the app icon ("Add expense" / "Add income") open the add form.
  useEffect(()=>{
    const nat=window.LedgerNative; if (!nat || typeof nat.onShortcut!=="function") return;
    let off=null;
    try {
      off=nat.onShortcut(k=>{
        if (k==="expense") openAdd();
        else if (k==="income") openAdd({type:"income",amount:"",category:"salary",subcategory:"",merchant:"",note:"",recurring:false,recurFreq:null});
      });
    } catch { /* same */ }
    return ()=>{ try { if (typeof off==="function") off(); } catch { /* same */ } };
  },[openAdd]);
  // Run 33 (Android app only): keep the home-screen widget's optional line in step with the ledger and the setting.
  const [widgetTick,setWidgetTick]=useState(0);
  useEffect(()=>{ const f=()=>setWidgetTick(n=>n+1); window.addEventListener(WIDGET_EVENT,f); return ()=>window.removeEventListener(WIDGET_EVENT,f); },[]);
  useEffect(()=>{
    const w=widgetNative(); if (!w) return;
    try { Promise.resolve(w.set(widgetLine(state,forSpending(state.transactions||[]),readWidgetPrefs()))).catch(()=>{ /* the shell is unavailable: the ledger is not affected */ }); } catch { /* same */ }
  },[state.transactions,state.bills,state.goals,state.safeToSpend,state.currency,state.language,widgetTick,privacy]);
  // Run 33 (Android app only): text shared into the app from another app opens the add form with what could be read from it. Never saved by itself.
  useEffect(()=>{
    const nat=window.LedgerNative; if (!nat || typeof nat.onSharedText!=="function") return;
    let off=null;
    try {
      off=nat.onSharedText(txt=>{
        const p=parseSharedText(txt);
        openAdd({ type:p.type, amount:p.amount, category:p.type==="income"?"salary":"food", subcategory:"", merchant:p.merchant, note:"", ...(p.date?{date:p.date}:{}), recurring:false, recurFreq:null });
        showToast(t(p.found ? (p.unsure?"share.unsure":"share.check") : "share.none"),6000);
      });
    } catch { /* same */ }
    return ()=>{ try { if (typeof off==="function") off(); } catch { /* same */ } };
  },[openAdd,showToast]);

  // Run 39: a quick-add link opens the add form once (after the first-launch language choice), then the address is cleaned so a reload does not reopen it.
  const quickDone=useRef(false);
  useEffect(()=>{
    if (quickDone.current || !state.language) return;
    quickDone.current=true;
    try {
      const p=parseQuickAdd(window.location.search); if (!p) return;
      window.history.replaceState(window.history.state,"",window.location.pathname+window.location.hash);
      openAdd({ type:p.type, amount:p.amount, category:p.category, subcategory:"", merchant:p.merchant, note:p.note, ...(p.date?{ date:p.date }:{}), recurring:false, recurFreq:null });
      showToast(t("quick.opened"),5000);
    } catch { /* an unreadable address is simply ignored */ }
  },[state.language,openAdd,showToast]);

  // Run 10: storage protection (asked once at start; again from Import / Export, where a tap counts as a user gesture) and
  // the browser's own "install" offer, kept for the Install button. Neither is stored in the ledger data.
  const [protection, setProtection] = useState("unknown");
  const askProtection = useCallback((ask=true)=>storageProtection(ask).then(r=>{ setProtection(r); return r; }),[]);
  useEffect(()=>{ askProtection(true); },[askProtection]);
  // Run 11: an installed app (or a tab) that stays in the phone's memory keeps showing the version it was opened with.
  // When the app comes back to the screen (and every 30 min while open) it asks the site which version it serves now and,
  // if that is newer, offers "Update". It never reloads by itself, so nothing being typed is lost. The address carries a
  // changing ?v= so neither the offline helper nor the browser answers with a saved copy.
  const runningVersion = useMemo(()=>appVersionOf([...document.scripts].map(s=>s.src).find(s=>/\/assets\/index-/.test(s))),[]);
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(()=>{
    if (!runningVersion) return;
    let last=0;
    const check=()=>{
      if (document.visibilityState!=="visible" || navigator.onLine===false || Date.now()-last<20000) return;   // at most every 20 s
      last=Date.now();
      checkForUpdate(runningVersion,()=>fetch(`/?v=${Date.now()}`,{cache:"no-store"}).then(r=>r.ok?r.text():"")).then(r=>{ if (r==="update") setUpdateReady(true); });
    };
    const t0=setTimeout(check,3000), iv=setInterval(check,30*60*1000);
    document.addEventListener("visibilitychange",check); window.addEventListener("online",check);
    return ()=>{ clearTimeout(t0); clearInterval(iv); document.removeEventListener("visibilitychange",check); window.removeEventListener("online",check); };
  },[runningVersion]);
  // Run 53: today's official rates are fetched quietly when the app is opened or comes back to the front (once per currency per day).
  useEffect(()=>{
    const warm=()=>{ if (document.visibilityState!=="visible" || navigator.onLine===false) return; warmRates(stateRef.current.transactions,stateRef.current.currency).catch(()=>{}); };
    const t0=setTimeout(warm,1500);
    document.addEventListener("visibilitychange",warm); window.addEventListener("online",warm);
    return ()=>{ clearTimeout(t0); document.removeEventListener("visibilitychange",warm); window.removeEventListener("online",warm); };
  },[]);
  const [installEvt, setInstallEvt] = useState(null);
  useEffect(()=>{
    const onBip=(e)=>{ e.preventDefault(); setInstallEvt(e); };
    const onInstalled=()=>{ setInstallEvt(null); askProtection(true); };
    window.addEventListener("beforeinstallprompt",onBip); window.addEventListener("appinstalled",onInstalled);
    return ()=>{ window.removeEventListener("beforeinstallprompt",onBip); window.removeEventListener("appinstalled",onInstalled); };
  },[askProtection]);

  // Run 37b: "Saved to Download/…" with an Open button (the phone opens the file with an app that can show it).
  const savedNotice=(r)=>{ const open=nativeOpenHook(); showSnackbar(t("io.savedTo",{where:r.where||"Downloads"}), open&&r.uri ? ()=>{ Promise.resolve(open(r.uri,r.mime||"application/json")).catch(()=>showToast(t("io.openFailed"),5000)); } : null, 10000, "saved", open&&r.uri ? t("io.openFile") : ""); };
  // Run 37: one complete backup text for every way of saving it (download, Downloads folder, share, encrypted).
  const backupText=(now)=>JSON.stringify(buildBackup({...state,subcategories:readSubcats(),debtData:readDebts(),customCats:readCustomCats(),catPrefs:readCatPrefs(),preferences:collectPrefs(state),accountData:readAccounts()},now),null,2);
  const exportCSV=useCallback(async ()=>{
    const save=nativeSaveHook();
    if (save) {   // Run 37: the Android app saves the spreadsheet into Downloads
      const r=await saveViaNative(save,`ledger-${today()}.csv`,buildCsv(state.transactions),"text/csv");
      if (r.status==="saved") savedNotice(r);
      else if (r.status==="failed") showToast(t("io.saveFailed"),6000);
      return;
    }
    const native=nativeShareHook();
    if (native) {   // Run 13: in the native shell a download link does nothing; success is claimed only after the hand-over says so
      const r=await shareViaNative(native,`ledger-${today()}.csv`,buildCsv(state.transactions),"text/csv;charset=utf-8;");
      if (r==="shared") showToast(tn("toast.csvCreated",state.transactions.length));
      else if (r==="failed") showToast(t("io.shareFailed"),6000);
      return;
    }
    downloadFile(buildCsv(state.transactions),"text/csv;charset=utf-8;",`ledger-${today()}.csv`);
    showToast(tn("toast.csvCreated",state.transactions.length));
  },[state.transactions,showToast]);

  const shareBackupRef=useRef(null);
  const exportJSON=useCallback(async (opts)=>{
    const pick=!!(opts && opts.pick===true);   // Run 39b: "Save to a folder I choose…" (system Save-as screen)
    const save=nativeSaveHook();
    if (save) {
      // Run 37: the Android app writes the file into Downloads and reads it back. Because the app itself checked the file, this backup is
      // recorded as created AND confirmed (no "do you have the file?" question afterwards).
      const now=new Date().toISOString();
      const r=await saveViaNative(save,`ledger-backup-${today()}.json`,backupText(now),"application/json",pick);
      if (r.status==="failed") { showToast(t("io.saveFailed"),6000); return; }
      if (r.status!=="saved") return;
      setState(s=>({...s,lastBackup:now,backupConfirmedAt:new Date().toISOString()}));
      setBackupDismissed(false);
      savedNotice(r);
      return;
    }
    if (nativeShareHook()) { shareBackupRef.current?.(); return; }   // Run 13: an older native shell without the save hook → the hand-over, never a dead download link
    const now=new Date().toISOString();
    downloadFile(backupText(now),"application/json",`ledger-backup-${today()}.json`);
    // lastBackup records when the file was CREATED. The app cannot know whether the browser actually kept it.
    // It is not a confirmed backup until the user says they have the file (see backupReminderDue).
    setState(s=>({...s,lastBackup:now}));
    setBackupDismissed(false);
    showToast(tn("toast.backupCreated",state.transactions.length),5000);
  },[state,showToast]);

  // Run 10: the same backup file, sent through the phone's share menu (Google Drive, Telegram, e-mail …) so a copy leaves
  // the phone. Cancelled → nothing changes. No file sharing on this device → falls back to the download above.
  const shareBackup=useCallback(async ()=>{
    const now=new Date().toISOString();
    const r=await shareBackupFile(backupText(now),`ledger-backup-${today()}.json`);
    if (r==="unsupported") { exportJSON(); return; }
    if (r==="failed") { showToast(t("io.shareFailed"),6000); return; }   // Run 13: told, and nothing is recorded
    if (r!=="shared") return;
    setState(s=>({...s,lastBackup:now}));
    setBackupDismissed(false);
    showToast(t("io.sharedToast"),5000);
  },[state,showToast,exportJSON]);
  shareBackupRef.current=shareBackup;

  const importFile=useCallback((file)=>{
    if (!file) return;
    const reader=new FileReader();
    reader.onerror=()=>setImportPending({ error:t("import.readFailed"), filename:file.name });
    reader.onload=async e=>{
      // Run 52: the file is looked at by its first bytes, not its name: a PDF or an Excel file is read as a bank statement; anything else is
      // text, handled as before (backup, CSV) and, when it is neither, tried as a statement that was saved or pasted as text.
      const buf=e.target.result, head=String.fromCharCode(...new Uint8Array(buf.slice(0,5))), name=file.name||"";
      const isPdf=head.startsWith("%PDF"), isZip=head.startsWith("PK");
      if (isPdf || isZip) {
        setImportPending({ busy:true, filename:name });
        try {
          const lines=isPdf ? await (await import("./pdfText.js")).pdfLines(buf) : linesFromGrid(await xlsxGrid(buf));
          openStatement(readStatement(lines), name);
        } catch { setImportPending({ error:t(isPdf?"st.pdfFailed":"st.xlsxFailed"), filename:name }); }
        return;
      }
      const raw=new TextDecoder("utf-8").decode(buf);
      if (isEncryptedBackup(raw)) { setImportPending({ needPass:true, text:raw, filename:name }); return; }   // Run 32: asks for the passphrase first
      const plan=planImportWithCats(raw, name);
      if (!plan.ok) {
        const st=readStatement(linesFromText(raw));
        if (st.rows.length) { openStatement(st, name); return; }
        setImportPending({ error:plan.error, filename:name }); return;
      }
      setSkipDup(true); setSkipSim(true);
      setImportPending({ ...plan, ...mergeCounts(stateRef.current.transactions, plan) });
    };
    reader.readAsArrayBuffer(file);
  },[]);
  // Run 52: a statement that was read (from a PDF, an Excel file or text) is shown in the same review sheet as a backup: the same counts,
  // the same "skip what is already here" choices, the same Undo. Nothing is added until the person presses the button.
  const openStatement=(res, name)=>{
    if (!res.rows.length) { setImportPending({ error:t(res.problems.includes("columns")?"st.columns":"st.none"), filename:name }); return; }
    const plan=statementPlan(res, name, stateRef.current.transactions);
    setSkipDup(true); setSkipSim(true);
    setImportPending({ ...plan, ...mergeCounts(stateRef.current.transactions, plan) });
  };
  const importText=useCallback((text)=>{ openStatement(readStatement(linesFromText(text)), t("st.pasted")); },[]);
  const setStOpt=(k,v)=>setImportPending(p=>{ if (!p || p.kind!=="statement") return p; const stOpts={ ...p.stOpts, [k]:v }, transactions=statementPick(p,stOpts); return { ...p, stOpts, transactions, ...mergeCounts(stateRef.current.transactions,{ ...p, transactions }) }; });

  // Run 32: returns null when the file was opened (the normal review sheet then shows), otherwise the reason, so the sheet can say why.
  const unlockImport=useCallback(async (pass)=>{
    const p=importPending; if (!p || !p.needPass) return "damaged";
    const r=await decryptBackupText(p.text,pass);
    if (!r.ok) return r.reason;
    const plan=planImportWithCats(r.text,"backup.json");
    if (!plan.ok) { setImportPending({ error:plan.error, filename:p.filename }); return null; }
    setSkipDup(true); setSkipSim(true);
    setImportPending({ ...plan, filename:p.filename, ...mergeCounts(stateRef.current.transactions, plan) });
    return null;
  },[importPending]);

  const exportEncrypted=useCallback(async (pass)=>{
    const now=new Date().toISOString();
    const r=await encryptBackupText(backupText(now),pass);
    if (!r.ok) return r.reason;
    const name=`ledger-backup-encrypted-${today()}.json`, native=nativeShareHook(), save=nativeSaveHook();
    if (save) {   // Run 37: into Downloads, checked by reading it back
      const s=await saveViaNative(save,name,r.text,"application/json");
      if (s.status==="failed") { showToast(t("io.saveFailed"),6000); return "shown"; }
      if (s.status!=="saved") return "shown";
      setState(st=>({...st,lastBackup:now,backupConfirmedAt:new Date().toISOString()}));
      setBackupDismissed(false);
      savedNotice(s);
      return "ok";
    }
    if (native) {
      const s=await shareViaNative(native,name,r.text,"application/json");
      if (s==="failed") { showToast(t("io.shareFailed"),6000); return "shown"; }
      if (s!=="shared") return "shown";
    } else downloadFile(r.text,"application/json",name);
    setState(s=>({...s,lastBackup:now}));
    setBackupDismissed(false);
    showToast(t("enc.created"),6000);
    return "ok";
  },[state,showToast]);

  // mode: "merge" · "replace" · "settings" (a file with no usable transactions: apply its settings, keep every transaction).
  const commitImport=useCallback((mode)=>{
    const plan=importPending;
    if (!plan || plan.error) return;
    if (mode==="replace" && !plan.canReplace) return;
    const settingsOnly=mode==="settings";
    if (settingsOnly) mode="replace";      // applyImport's replace keeps the transactions when the file has none
    const before=stateRef.current;
    if (mode==="replace") {
      // Never overwrite without a recoverable copy of what is being replaced.
      if (!preserveRaw("before_import", before)) { showToast(t("import.copyFailed"),6000); return; }
      pruneRecoveryCopies("before_import");
    }
    // Run 51: an account of the file that has the same name as one here IS that account: its entries and transfers are pointed at the one here.
    const accPlan=plan.accountData && plan.accountData.accounts.length ? planAccountMerge(readAccounts(),plan.accountData) : null;
    // Run 52: a bank statement's entries go on the account the person chose in the sheet (or on none).
    const stAcc=plan.kind==="statement" && plan.stOpts ? accId(plan.stOpts.account) : "";
    const planUse=stAcc ? { ...plan, transactions:plan.transactions.map(x=>({ ...x, account:stAcc })) } : accPlan && accPlan.renamed ? { ...plan, transactions:remapEntryAccounts(plan.transactions,accPlan.remap) } : plan;
    const next=applyImport(before, planUse, mode, { skipDuplicates:skipDup, skipSimilar:skipSim });
    // Run 18: the import is all-or-nothing. The side stores are written FIRST and checked; if one cannot be written, the others are put
    // back exactly as they were and the main data is not touched. Undo restores them too.
    const snap=(k)=>{ try { return localStorage.getItem(k); } catch { return undefined; } };
    const restore=(k,raw)=>{ try { if (raw===undefined) return; if (raw===null) localStorage.removeItem(k); else localStorage.setItem(k,raw); } catch {} };
    const auxBefore={ [SUBCAT_KEY]:snap(SUBCAT_KEY), [DEBTS_KEY]:snap(DEBTS_KEY), [CCAT_KEY]:snap(CCAT_KEY), [ACC_KEY]:snap(ACC_KEY), [CPREF_KEY]:snap(CPREF_KEY), [THEME_KEY]:snap(THEME_KEY), [FX_KEY]:snap(FX_KEY), [WORKHOURS_KEY]:snap(WORKHOURS_KEY), [COACH_MUTE_KEY]:snap(COACH_MUTE_KEY), [PAT_MUTE_KEY]:snap(PAT_MUTE_KEY) };
    const catsHad=currentCustomCats();
    const undoAux=()=>{ for (const k of Object.keys(auxBefore)) restore(k,auxBefore[k]); applyCustomCats(catsHad); applyTheme(readTheme()); applyFx(readFxOff()); };
    // Run 24: the file's own categories are added to the ones on this phone (by id; a name already in use is skipped, never renamed).
    if (plan.customCats && plan.customCats.length) {
      const merged=mergeCustomCats(readCustomCats(),plan.customCats);
      if (!writeCustomCats(merged)) { undoAux(); showToast(t("import.auxFailed"),6000); return; }
      applyCustomCats(merged); setCatVer(v=>v+1);
    }
    // Run 37: theme, "reduce effects" and hidden tips from the file are used only where this phone still has the default (never overwritten).
    if (plan.prefs) {
      const P=plan.prefs; let okp=true;
      if (P.theme && readTheme()==="sea") okp=writeTheme(P.theme) && okp;
      if (P.reduceEffects && !readFxOff()) okp=writeFxOff(true) && okp;
      if (P.workHours && readWorkHours()===null) okp=writeWorkHours(P.workHours) && okp;
      if (P.coachMute && !readMuteList(COACH_MUTE_KEY).length) okp=writeMuteList(COACH_MUTE_KEY,P.coachMute) && okp;
      if (P.patternMute && !readMuteList(PAT_MUTE_KEY).length) okp=writeMuteList(PAT_MUTE_KEY,P.patternMute) && okp;
      if (!okp) { undoAux(); showToast(t("import.auxFailed"),6000); return; }
      applyTheme(readTheme()); applyFx(readFxOff());
    }
    // Run 36: the file's hidden / ordered categories are used only when this phone has none of its own (they are never mixed or overwritten).
    if (plan.catPrefs) { const mine=readCatPrefs(); if (!mine.hidden.length && !mine.order.length && !writeCatPrefs(plan.catPrefs)) { undoAux(); showToast(t("import.auxFailed"),6000); return; } }
    // Run 16: the file's own-subcategory suggestions are added to the ones on this phone (union; nothing is overwritten or removed).
    const hasSub=plan.subcategories && Object.keys(plan.subcategories).length;
    // Run 17: debts and loans from the file are added by id (what is already on this phone is never overwritten).
    const hasDebts=plan.debtData && (plan.debtData.debts.length || plan.debtData.loans.length);
    if (accPlan && !writeAccounts(accPlan.data)) { undoAux(); showToast(t("import.auxFailed"),6000); return; }
    if (hasSub && !writeSubcats(mergeSubcats(readSubcats(),plan.subcategories))) { undoAux(); showToast(t("import.auxFailed"),6000); return; }
    if (hasDebts && !writeDebts(mergeDebtData(readDebts(),plan.debtData))) { undoAux(); showToast(t("import.auxFailed"),6000); return; }
    setState(next);
    setImportPending(null);
    const delta=next.transactions.length-before.transactions.length;
    showSnackbar(settingsOnly ? t("import.settingsApplied") : mode==="replace" ? tn("import.replaced",plan.transactions.length) : tn("import.added",delta), ()=>{
      // Undo only if nothing has changed since; otherwise it would erase newer work.
      if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; }
      undoAux();
      setState(before);
    }, 8000, "import");
  },[importPending,skipDup,skipSim,showToast,showSnackbar]);

  const {transactions,budgets,templates,currency,goals,safeToSpend}=state; const bills=state.bills||[];
  const recSuggestions=tab==="recurring" ? recurringSuggestions(transactions,bills,recDismissed) : [];   // Run 50: only worked out while the Recurring page is open (no hook here: it sits after possible early returns)
  // Run 17: spending views see loan payments as only their interest part (see forSpending); Transactions and backups keep the full payment.
  const spendTxns=useMemo(()=>forSpending(transactions),[transactions]);
  // Run 18: newest five entries for the Home list (date, then creation time).
  const latestTxns=useMemo(()=>[...transactions].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt||"").localeCompare(String(a.createdAt||""))).slice(0,5),[transactions]);
  const spendState=useMemo(()=>({...state,transactions:spendTxns}),[state,spendTxns]);
  const changeProfileName=useCallback((v)=>{ const n=cleanProfileName(v); setState(s=>({...s,profileName:n})); showToast(t(n?"st.profileSaved":"st.profileRemoved")); },[showToast]);
  const changeLanguage=useCallback((l)=>{ setState(s=>({...s,language:l})); showToast(tIn(l,"lang.changed")); },[showToast]);

  // Genuinely fresh install: the language is chosen before anything else is shown. The starter quick-fill templates are
  // given names in that language — only while they are still exactly the untouched defaults (never a user's own templates).
  const chooseFirstLanguage=(l)=>setState(s=>({ ...s, language:l,
    templates: JSON.stringify(s.templates)===JSON.stringify(DEFAULT_TEMPLATES) ? DEFAULT_TEMPLATES.map(tp=>MESSAGES["tpl."+tp.id]?{...tp,name:tIn(l,"tpl."+tp.id)}:tp) : s.templates }));
  if (state.language===null) return (<><style>{CSS}</style><LanguageChooser onChoose={chooseFirstLanguage}/></>);

  return (
    <>
      <style>{CSS}</style>
      <div className={`app${privacy?" privacy-on":""}`} lang={state.language}>
        {toast&&<div className="toast" role="status" style={{"--toast-out":Math.max(0,toastMs.current-220)+"ms"}}>{toast}</div>}
        {snackbar&&(
          <div className="snackbar" role="status" key={snackbar.msg} style={{"--snack-out":Math.max(0,(snackbar.ms||4000)-220)+"ms"}}>
            <span>{snackbar.msg}</span>
            {snackbar.onUndo&&<button className="snackbar-undo" onClick={()=>{snackbar.onUndo?.();closeSnack();}}>{snackbar.label||t("common.undo")}</button>}
          </div>
        )}
        {recoveryNotice&&(
          <div className="backup-banner" role="alert" style={{background:"var(--warn-bg)"}}>
            <span>{recoveryNotice}</span>
            <button className="backup-dismiss" onClick={()=>setRecoveryNotice(null)} aria-label={t("common.dismissNotice")}>×</button>
          </div>
        )}
        {restoreOpen&&(
          <div className="backup-banner backup-reminder bill-restore" role="alert">
            <span>{tn("bill.restoreAsk",restoreOffer.bills.length)}</span>
            <button className="backup-banner-btn bill-restore-yes" onClick={restoreBills}>{t("bill.restoreBtn")}</button>
            <button className="backup-banner-btn bill-restore-no" style={{background:"transparent",color:"var(--ink-2)",border:"1px solid var(--rule-2)"}} onClick={()=>setRestoreClosed(true)}>{t("bill.restoreNo")}</button>
          </div>
        )}
        {storageFailed&&(
          <div className="backup-banner" role="alert" style={{background:"var(--neg-bg)",borderBottomColor:"var(--neg)",color:"var(--neg)"}}>
            <span>{SAVE_BLOCKED?t(SAVE_BLOCKED_READ?"banner.readPaused":"banner.savePaused"):t("banner.saveFailed")}</span>
            <button className="backup-banner-btn" style={{background:"var(--neg)"}} onClick={exportJSON}>{t("banner.backUp")}</button>
          </div>
        )}
        {updateReady&&(
          <div className="backup-banner backup-reminder update-banner" role="status">
            <span>{t("update.ready")}</span>
            <button className="backup-banner-btn update-now" onClick={()=>window.location.reload()}>{t("update.now")}</button>
          </div>
        )}
        {/* Run 14: the routine backup reminders appear where they can be acted on (Home, Import / Export), not above every screen.
            Warnings about the data's safety (recovery notices, "cannot save", update) above stay on every screen. */}
        {/* Run 34: these notices slide away (height + fade) when dismissed or when you leave the screen, instead of vanishing in one frame. */}
        <Collapse open={!backupDismissed&&(tab==="home"||tab==="io")&&backupReminder==="due"&&transactions.length>0}>
          <div className="backup-banner backup-reminder" role="alert">
            <span>{t("banner.backupDue")}</span>
            <button className="backup-banner-btn" onClick={exportJSON}>{t("banner.backUpNow")}</button>
            <button className="backup-dismiss" onClick={()=>setBackupDismissed(true)} aria-label={t("common.dismiss")}>×</button>
          </div>
        </Collapse>
        <Collapse open={!backupDismissed&&(tab==="home"||tab==="io")&&backupReminder==="confirm"&&transactions.length>0}>
          <div className="backup-banner backup-reminder" role="status">
            <span>{t("banner.backupConfirm")}</span>
            <button className="backup-banner-btn" onClick={()=>{ setState(s=>({...s,backupConfirmedAt:new Date().toISOString()})); showToast(tn("banner.confirmThanks",BACKUP_REMINDER_DAYS)); }}>{t("banner.haveFile")}</button>
            <button className="backup-dismiss" onClick={()=>setBackupDismissed(true)} aria-label={t("common.dismiss")}>×</button>
          </div>
        </Collapse>

        <Collapse open={!!iosNote&&tab==="home"}>
          <div className="backup-banner backup-reminder" role="note" data-section="ios-note">
            <span>{t("banner.iosNote")}</span>
            <button className="backup-dismiss" onClick={()=>{ setIosNote(false); try { localStorage.setItem(IOS_NOTE_KEY,"1"); } catch { /* shown again next time */ } }} aria-label={t("common.dismiss")}>×</button>
          </div>
        </Collapse>

        <header className="topbar">
          {SUBPAGE_PARENT[tab]
            ? <div className="topbar-back">
                <button className="topbar-btn" onClick={()=>switchTab(SUBPAGE_PARENT[tab])} aria-label={t("common.back")} title={t("common.back")}><Icon name="chevLeft" size={22}/></button>
                <h1 className="wordmark">{t(tab==="io"?"io.title":tab==="debts"?"debt.title":tab==="accounts"?"acc.title":tab==="gifts"?"gifts.title":"rec.title")}</h1>
              </div>
            : <h1 className="wordmark">{tab==="home"?t(greetingKey())+(state.profileName?", "+state.profileName:""):tab==="goals"?t("goals.pageTitle"):t("nav."+tab)}</h1>}
          <div className="topbar-right">
            <button className={`topbar-btn privacy-toggle${privacy?" on":""}`} aria-pressed={privacy} aria-label={t(privacy?"privacy.show":"privacy.hide")} title={t(privacy?"privacy.show":"privacy.hide")}
              onClick={()=>{ setPrivacy(p=>!p); showToast(t(privacy?"privacy.offToast":"privacy.onToast")); }}><Icon key={privacy?"off":"on"} name={privacy?"eyeOff":"eye"} size={20}/></button>
          </div>
        </header>

        <main className={(SUBPAGE_PARENT[tab]?"page page-sub":"page")+(pageOut?" page-out":"")+(pfCount.current>0?(pfCount.current%2?" pf-a":" pf-b"):"")} key={tabKey}>
          {tab==="home"      && <HomePage transactions={spendTxns} accountTxns={transactions} onAccounts={()=>switchTab("accounts")} onAccount={id=>setViewAcc(id)} latest={latestTxns} bills={bills} budgets={budgets} templates={templates} currency={currency} safeToSpend={safeToSpend} goals={goals} onAdd={()=>openAdd()} onTemplate={tpl=>openAdd({type:"expense",amount:tpl.amount,category:tpl.catId,subcategory:tpl.subcat||"",merchant:tpl.merchant||"",note:tpl.note||tpl.name,recurring:false,recurFreq:null})} onView={txn=>setViewTxn(txn)} onOpenLedger={()=>switchTab("ledger")} onInfo={setInfoKind}
            rollover={{ offer:rolloverOffer(spendTxns,goals,rolloverSeen), onSkip:()=>{ const m=rolloverOffer(spendTxns,goals,rolloverSeen)?.month; if (m) { writeRolloverSeen(m); setRolloverSeen(m); } },
              onApply:(g)=>{ const o=rolloverOffer(spendTxns,goals,rolloverSeen); if (!o) return; setState(s=>({...s,goals:applyRollover(s.goals,g.id,g.amount)})); writeRolloverSeen(o.month); setRolloverSeen(o.month); showToast(t("rollover.done",{ amount:fmt(g.amount,currency), goal:g.name||t("rollover.goalFallback") })); } }}
            setup={{hidden:!!state.setupHidden,backedUp:!!(state.lastBackup||state.backupConfirmedAt)}} onSetupHide={()=>setState(s=>({...s,setupHidden:true}))}
            onSetupWizard={()=>setShowSetupQ(true)} onSetupGo={id=>id==="txn"?openAdd():id==="income"?openAdd({type:"income",amount:"",category:"salary",subcategory:"",merchant:"",note:"",recurring:false,recurFreq:null}):switchTab(id==="plan"?"goals":"io")}/>}
          {tab==="ledger"    && <LedgerPage transactions={transactions} currency={currency} onDelete={deleteTransaction} onDeleteMany={deleteMany} onGroupMany={groupMany} onEdit={txn=>openAdd(txn,txn.id)} onView={txn=>setViewTxn(txn)} onAdd={()=>openAdd()}/>}
          {tab==="monthly"   && <MonthlyView transactions={spendTxns} rawTransactions={transactions} currency={currency} budgets={budgets} bills={bills} onView={txn=>setViewTxn(txn&&txn.spreadSlice ? (transactions.find(x=>x.id===txn.spreadSlice.id)||txn) : txn)}/>}
          {tab==="goals"     && <BudgetsGoalsPage state={spendState} rawState={state} onCatsChanged={()=>setCatVer(v=>v+1)} showToast={showToast} seg={goalsSeg} onSeg={setGoalsSeg} addSignal={goalsAdd}
            onSetBudget={(catId,amount)=>setState(s=>({...s,budgets:{...s.budgets,[catId]:amount}}))}
            onRebalance={(plan)=>{ const prev=stateRef.current.budgets, next=applyRebalance(prev,plan); setState(s=>({...s,budgets:next})); showSnackbar(t("budget.rebalDone"),()=>setState(s=>s.budgets===next?{...s,budgets:prev}:s),6000,"rebalance"); }}
            onAddGoal={g=>setState(s=>({...s,goals:[...s.goals,{...g,id:"g"+Date.now()}]}))}
            onUpdateGoal={(id,patch)=>setState(s=>({...s,goals:s.goals.map(g=>g.id===id?{...g,...patch}:g)}))}
            onDeleteGoal={id=>{
              const idx=stateRef.current.goals.findIndex(g=>g.id===id), gone=stateRef.current.goals[idx]; if (!gone) return;
              setState(s=>({...s,goals:s.goals.filter(g=>g.id!==id)}));
              showSnackbar(t("toast.goalDeleted",{name:gone.name||""}),()=>setState(s=>s.goals.some(g=>g.id===id)?s:{...s,goals:[...s.goals.slice(0,idx),gone,...s.goals.slice(idx)]}),6000,"goal");
            }}
            onAddTemplate={tpl=>setState(s=>({...s,templates:[...s.templates,{...tpl,id:"t"+Date.now()}]}))}
            onDeleteTemplate={id=>{
              const idx=stateRef.current.templates.findIndex(x=>x.id===id), gone=stateRef.current.templates[idx]; if (!gone) return;
              setState(s=>({...s,templates:s.templates.filter(x=>x.id!==id)}));
              showSnackbar(t("toast.tplDeleted",{name:gone.name||""}),()=>setState(s=>s.templates.some(x=>x.id===id)?s:{...s,templates:[...s.templates.slice(0,idx),gone,...s.templates.slice(idx)]}),6000,"template");
            }}
            onUpdateTemplate={(id,patch)=>setState(s=>({...s,templates:s.templates.map(x=>x.id===id?{...x,...patch}:x)}))}
            onSafeToSpendChange={cfg=>setState(s=>({...s,safeToSpend:{...s.safeToSpend,...cfg}}))}/>}
          {tab==="more"      && <MorePage language={state.language} profileName={state.profileName||""} onLanguageChange={changeLanguage} onProfileName={changeProfileName} onOpen={tb=>{ if (tb==="goals") setGoalsSeg("goals"); switchTab(tb); }} state={state} onCatsChanged={()=>setCatVer(v=>v+1)} onCurrencyChange={c=>setState(s=>({...s,currency:c}))} onSafeToSpendChange={cfg=>setState(s=>({...s,safeToSpend:{...s.safeToSpend,...cfg}}))} showToast={showToast} accTools={accTools} scrollTo={moreScroll} onScrolled={()=>setMoreScroll("")} onInfo={setInfoKind} onLock={()=>setShowLock(true)} version={runningVersion}/>}
          {tab==="recurring" && <RecurringHub transactions={transactions} bills={bills} currency={currency} onView={txn=>setViewTxn(txn)} onToggleSchedule={toggleScheduleActive}
            onConvert={convertBills} onEditBill={b=>setEditBill(b)} onToggleBill={toggleBill} onAddBill={()=>setEditBill(null)}
            suggestions={recSuggestions} onReviewSuggestion={s=>setEditBill({ prefill:true, name:s.name, type:"expense", amount:s.amount, category:s.category, subcategory:s.subcategory, freq:s.freq, anchorDate:s.anchorDate, active:true })}
            onDismissSuggestion={s=>{ const next=[...recDismissed,s.name]; writeRecSuggestDismissed(next); setRecDismissed(next); }}
            onRecordPayment={x=>openAdd({ type:x.type, amount:x.amount, category:x.category, subcategory:x.subcategory, merchant:x.merchant, note:x.note, recurring:true, recurFreq:x.freq, billId:x.billId||undefined })}/>}
          {tab==="accounts"  && <div data-section="accounts-page"><MyAccounts state={state} currency={currency} showToast={showToast} accTools={accTools}/></div>}
          {tab==="gifts"     && <GiftsPage transactions={transactions} currency={currency} showToast={showToast} onView={txn=>setViewTxn(txn)} onAdd={k=>openAdd(k==="received"?{type:"income",category:"giftin"}:{type:"expense",category:"gifts"})}/>}
          {tab==="debts"     && <DebtsPage key={debtsStart} initialSeg={debtsStart} currency={currency} onAddEntry={addLoanEntry} onRemoveEntry={removeLoanEntry} onTakeEntries={takeEntries} onPutEntries={putEntries} showToast={showToast} showSnackbar={showSnackbar}/>}
          {tab==="io"        && <ImportExportPage state={state} onDeleteMany={deleteMany} onImportText={importText} onExportCSV={exportCSV} onExportJSON={exportJSON} onImportFile={importFile}
            onShareBackup={shareBackup} onExportEncrypted={exportEncrypted} protection={protection} onProtect={()=>askProtection(true)}
            onInstall={installEvt?()=>{ installEvt.prompt(); installEvt.userChoice?.finally?.(()=>setInstallEvt(null)); }:null}
            onConfirmBackup={()=>{ setState(s=>({...s,backupConfirmedAt:new Date().toISOString()})); showToast(tn("banner.confirmThanks",BACKUP_REMINDER_DAYS)); }}/>}
        </main>


        <nav className="tabbar" role="navigation" style={{"--tab-index":TAB_ORDER.indexOf(SUBPAGE_PARENT[tab]||tab),"--tab-count":TABS.length}}>
          {TABS.map(tb=>{ const on=(SUBPAGE_PARENT[tab]||tab)===tb.id; return (
            <button key={tb.id} className={`tab-btn${on?" active":""}`} onClick={()=>switchTab(tb.id)} aria-label={t("nav."+tb.id)} aria-current={tab===tb.id?"page":undefined}>
              <Icon name={tb.icon} size={22}/><span className="tab-lbl">{t("nav."+tb.id)}</span>
            </button>
          ); })}
        </nav>

        {/* Run 17: the "+" moved from the top-right (out of thumb reach on a tall phone) to the bottom-right, just above the tab bar.
            Run 9 rule kept: it creates what the screen is about (none where nothing is created). */}
        {!showAdd && (()=>{ const a=tab==="home"||tab==="ledger" ? { label:t("nav.addTxn"), run:()=>openAdd() }
            : tab==="goals" ? { label:t(goalsSeg==="goals"?"goals.addGoal":"goals.addBudget"), run:()=>setGoalsAdd(n=>n+1) }
            : tab==="recurring" ? { label:t("bill.add"), run:()=>setEditBill(null) }
            : null;
          return a && <button className={`fab-add${fabHidden?" fab-hide":""}`} tabIndex={fabHidden?-1:undefined} aria-hidden={fabHidden||undefined} onClick={a.run} aria-label={a.label} title={a.label}><Icon name="add" size={26} color="var(--on-accent)"/></button>; })()}

        {showAdd&&(
          <AddEditOverlay leaving={addLeaving} templates={templates} currency={currency} transactions={transactions} bills={bills} prefill={prefill} editId={editId} merchantMemory={merchantMemory}
            onSave={txn=>{ editId?updateTransaction(editId,txn):addTransaction(txn); closeAdd(); }} onSaveMany={items=>{ addManyTransactions(items); closeAdd(); }} onClose={closeAdd}
            onRenameSub={(cid,from,to)=>{ setState(s=>({...s,transactions:renameSubcatInEntries(s.transactions,cid,from,to)})); showToast(t("subcat.renamed")); }}
            onOtherKind={k=>{ setDebtsStart(k); closeAdd(); switchTab("debts"); }}/>
        )}
        <ConfirmHost/>
        {infoKind&&<InfoSheet kind={infoKind} onClose={()=>setInfoKind(null)}/>}
        {viewAcc&&<AccountSheet id={viewAcc} transactions={transactions} currency={currency} onClose={()=>setViewAcc(null)} onManage={()=>{ setViewAcc(null); switchTab("accounts"); }} onView={txn=>{ setViewAcc(null); setViewTxn(txn); }}/>}
        {showLock&&<LockSheet onClose={()=>setShowLock(false)} showToast={showToast}/>}
        
        {importPending&&(
          <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&setImportPending(null)}>
            <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1}aria-label={t("import.dialogLabel")}>
              <div className="sheet-grip"><div className="sheet-handle"/></div>
              <div className="sheet-title">{t(importPending.needPass?"enc.unlockTitle":importPending.kind==="statement"?"st.sheetTitle":"import.title")}</div>
              {importPending.needPass?(
                <ImportUnlock filename={importPending.filename} onUnlock={unlockImport} onCancel={()=>setImportPending(null)}/>
              ):importPending.busy?(
                <div role="status" data-section="import-busy" style={{fontSize:13,color:"var(--ink-2)",padding:"8px 2px 16px",lineHeight:1.55}}>{t("st.reading")}<div style={{fontSize:12,color:"var(--ink-3)",overflowWrap:"anywhere"}}>{importPending.filename}</div></div>
              ):importPending.error?(
                <>
                  <div role="alert" style={{background:"var(--neg-bg)",color:"var(--neg)",borderRadius:8,padding:"12px 14px",marginBottom:16,fontSize:13,lineHeight:1.55}}>{importPending.error}</div>
                  <button className="btn btn-primary btn-full" data-closer="1" style={{marginTop:0}} onClick={()=>setImportPending(null)}>{t("common.ok")}</button>
                </>
              ):(
                <>
                  <div style={{background:"var(--bg-warm)",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:4,overflowWrap:"anywhere"}}>{importPending.filename}</div>
                    <div style={{fontSize:12,color:"var(--ink-3)"}}>{tn("import.ready",importPending.transactions.length)}</div>
                    <div data-section="import-compare" style={{fontSize:12,color:"var(--ink-3)",marginTop:4}}>{(()=>{   // Run 32: what the file holds next to what this device holds, so Replace is an informed choice
                      const ds=importPending.transactions.map(x=>String(x.date).slice(0,10)).filter(isValidDateStr).sort();
                      return t("import.compare",{ n:importPending.transactions.length, m:state.transactions.length, range:ds.length ? ` (${fmtDate(ds[0])} – ${fmtDate(ds[ds.length-1])})` : "" });
                    })()}</div>
                    {/* Run 37: everything the file holds, part by part, so nothing is a guess (owner: "I want to see all my data") */}
                    {(()=>{ const parts=fileParts(importPending); return parts.length>0&&(
                      <div data-section="import-parts" style={{fontSize:12,color:"var(--ink-2)",marginTop:8}}>
                        <div style={{fontWeight:600,marginBottom:2}}>{t("import.hasTitle")}</div>
                        <ul style={{margin:0,paddingLeft:18,lineHeight:1.55}}>{parts.map(([k,n])=><li key={k} data-part={k}>{n===null?t(IMPORT_PART_KEY[k]):t(IMPORT_PART_KEY[k],{n})}</li>)}</ul>
                      </div>); })()}
                    {importPending.skippedCount>0&&<div style={{fontSize:12,color:"var(--warn)",marginTop:4}}>{tn("import.skipped",importPending.skippedCount,{summary:importPending.skippedSummary})}</div>}
                    {importPending.problems.map((m,i)=><div key={"p"+i} style={{fontSize:12,color:"var(--warn)",marginTop:4}}>{m}</div>)}
                    {importPending.warnings.map((m,i)=><div key={"w"+i} style={{fontSize:12,color:"var(--ink-3)",marginTop:4}}>{m}</div>)}
                  </div>
                  {/* Run 52: a bank statement: which bank layout was recognised, whether the bank's own running balance confirms the rows, and three choices */}
                  {importPending.kind==="statement"&&(()=>{ const s=importPending.statement, o=importPending.stOpts, accs=readAccounts().accounts.filter(a=>!a.hidden), row={display:"flex",gap:8,alignItems:"flex-start",marginTop:8,lineHeight:1.45}; return (
                    <div data-section="import-statement" style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.55,marginBottom:12}}>
                      <div style={{fontWeight:600}} data-st="bank">{t("st.title",{ bank:STATEMENT_BANKS[s.bank]||t("st.bankOther") })}</div>
                      <div data-st="check" data-ok={s.check.has?String(s.check.ok):"none"} style={s.check.has&&!s.check.ok?{color:"var(--warn)"}:null}>{!s.check.has ? t("st.checkNone") : s.check.ok ? t("st.checkOk") : t("st.checkBad",{n:s.check.breaks})}</div>
                      {s.left>0&&<div data-st="left" style={{color:"var(--warn)"}}>{t("st.left",{n:s.left})}</div>}
                      {s.sign&&<div data-st="sign" style={{color:"var(--warn)"}}>{t("st.sign")}</div>}
                      {accs.length>0&&(
                        <label style={{display:"block",marginTop:8}}>{t("st.account")}
                          <select className="field-input" data-st="account" style={{marginTop:4}} value={o.account} onChange={e=>setStOpt("account",e.target.value)}>
                            <option value="">{t("acc.rm.noAccount")}</option>{accs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </label>)}
                      {s.nTransfer>0&&<label style={row}><input type="checkbox" data-st="transfers" checked={o.transfers} onChange={e=>setStOpt("transfers",e.target.checked)} style={{marginTop:2}}/><span>{tn("st.transfers",s.nTransfer)}</span></label>}
                      {s.nPending>0&&<label style={row}><input type="checkbox" data-st="pending" checked={o.pending} onChange={e=>setStOpt("pending",e.target.checked)} style={{marginTop:2}}/><span>{tn("st.pending",s.nPending)}</span></label>}
                      {/* every row that will be added, so nothing is taken on trust (a long statement scrolls inside this box) */}
                      <div style={{fontWeight:600,marginTop:10}}>{t("st.rowsTitle")}</div>
                      <div data-st="rows" role="list" tabIndex={0} aria-label={t("st.rowsTitle")} style={{maxHeight:188,overflowY:"auto",marginTop:4,border:"1px solid var(--rule)",borderRadius:8,padding:"2px 10px"}}>
                        {importPending.transactions.slice(0,300).map(x=>(
                          <div role="listitem" data-st-row={String(x.id)} key={String(x.id)} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"6px 0",borderBottom:"1px solid var(--rule)"}}>
                            <span style={{minWidth:0,overflowWrap:"anywhere"}}>{fmtDate(x.date)} · {maskText(x.merchant||x.note||catName(x.category))}<span style={{color:"var(--ink-3)"}}> · {catName(x.category)}</span></span>
                            <span style={{flexShrink:0,whiteSpace:"nowrap",color:x.type==="income"?"var(--pos)":"var(--ink)"}}>{x.type==="income"?"+":"−"}{fmt(x.amount,currency)}</span>
                          </div>))}
                        {importPending.transactions.length>300&&<div style={{padding:"6px 0",color:"var(--ink-3)"}}>{t("st.moreRows",{n:importPending.transactions.length-300})}</div>}
                      </div>
                      <div style={{marginTop:8}}>{t("st.mergeText")}</div>
                    </div>); })()}
                  <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.55,marginBottom:12,display:importPending.kind==="statement"?"none":undefined}}>
                    <strong>{t("import.mergeLabel")}</strong> {t("import.mergeText")}<br/>
                    {importPending.canReplace
                      ? <><strong>{t("import.replaceLabel")}</strong> {t("import.replaceText")}</>
                      : importPending.transactions.length>0
                        ? <span className="import-replace-blocked"><strong>{t("import.replaceBlockedLabel")}</strong> {tn("import.replaceBlockedText",importPending.skippedCount)}</span>
                        : <><strong>{t("import.settingsOnlyLabel")}</strong> {t("import.settingsOnlyText")}</>}
                    {importPending.canReplace && (state.bills||[]).length>0 && importPending.settings?.bills===undefined&&(
                      <div className="import-bills-stay" style={{marginTop:6,color:"var(--warn)"}}>{tn("import.billsStay",state.bills.length)}</div>
                    )}
                  </div>
                  {/* Run 51: what a merge will do, in numbers, before anything is added (owner: a merge double counted) */}
                  {importPending.mergeInfo&&importPending.transactions.length>0&&(()=>{ const mi=importPending.mergeInfo, words=(x)=>[x.merchant||x.note,x.subcategory,catName(x.category)].filter(Boolean).join(", "); return (
                    <div data-section="import-merge-plan" style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.55,marginBottom:12}}>
                      {importPending.kind!=="statement"&&<div style={{fontWeight:600}}>{t("import.planTitle")}</div>}
                      <div data-merge="fresh">{t("import.planNew",{n:mi.fresh})}</div>
                      {mi.sameId>0&&<div data-merge="sameId">{t("import.planSameId",{n:mi.sameId})}</div>}
                      {mi.sameAccounts>0&&<div data-merge="accounts">{t("import.planAccounts",{n:mi.sameAccounts})}</div>}
                      {mi.identical>0&&(
                        <label style={{display:"flex",gap:8,alignItems:"flex-start",marginTop:8,lineHeight:1.45}}>
                          <input type="checkbox" data-merge="skip-identical" checked={skipDup} onChange={e=>setSkipDup(e.target.checked)} style={{marginTop:2}}/>
                          <span>{t("import.skipDup",{n:mi.identical})}</span>
                        </label>
                      )}
                      {mi.similar>0&&(<>
                        <label style={{display:"flex",gap:8,alignItems:"flex-start",marginTop:8,lineHeight:1.45}}>
                          <input type="checkbox" data-merge="skip-similar" checked={skipSim} onChange={e=>setSkipSim(e.target.checked)} style={{marginTop:2}}/>
                          <span>{t("import.skipSim",{n:mi.similar})}</span>
                        </label>
                        <ul data-merge="examples" style={{margin:"4px 0 0",paddingLeft:26,color:"var(--ink-3)"}}>
                          {mi.examples.map((p,i)=><li key={i} style={{overflowWrap:"anywhere"}}>{t("import.simExample",{ date:fmtDate(p.file.date), amount:fmt(p.file.amount,currency), here:maskText(words(p.here)), file:maskText(words(p.file)) })}</li>)}
                        </ul>
                      </>)}
                    </div>); })()}
                  <button className="btn btn-primary btn-full" style={{marginTop:0}} data-section="import-go" disabled={importPending.kind==="statement"&&!importPending.transactions.length} onClick={()=>commitImport("merge")}>{t(importPending.kind==="statement"?"st.addBtn":"import.mergeBtn")}</button>
                  {importPending.canReplace
                    ? <button className="btn btn-ghost btn-full" style={{marginTop:8,color:"var(--neg)",borderColor:"var(--neg-bg)"}} onClick={()=>commitImport("replace")}>{t("import.replaceBtn")}</button>
                    : Object.keys(importPending.settings||{}).length>0
                      ? <button className="btn btn-ghost btn-full import-settings-only" style={{marginTop:8}} onClick={()=>commitImport("settings")}>{t("import.settingsOnlyBtn")}</button>
                      : null}
                  <button className="btn btn-ghost btn-full" data-closer="1" onClick={()=>setImportPending(null)}>{t("common.cancel")}</button>
                </>
              )}
            </div>
          </div>
        )}
        {showSetupQ&&<SetupSheet currency={currency} onClose={()=>setShowSetupQ(false)} onOpenDebts={()=>{ setDebtsStart("debts"); switchTab("debts"); }} onSave={applySetupPlan}/>}
        {editBill!==undefined&&(
          <BillSheet bill={editBill} currency={currency} onSave={saveBill} onDelete={deleteBill} onClose={()=>setEditBill(undefined)} showToast={showToast}/>
        )}
        {viewTxn&&(
          <TxnDetailSheet txn={viewTxn} currency={currency} transactions={transactions} bills={bills}
            onAssignBill={target=>{
              // Explicit bills: this entry becomes the payment of the chosen bill (or of a new bill made from it). Undo.
              const before=stateRef.current, r=assignToBill(before.transactions,before.bills||[],viewTxn.id,target);
              if (!r.billId) return;
              const next={ ...before, transactions:r.transactions, bills:r.bills }; setState(next); setViewTxn(null);
              const b=r.bills.find(x=>x.id===r.billId);
              showSnackbar(t("detail.linkedToast",{name:maskText(b.name)}),()=>{ if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; } setState(before); },8000,"link");
            }}
            onClose={()=>setViewTxn(null)}
            onEdit={()=>{ openAdd(viewTxn,viewTxn.id); setViewTxn(null); }}
            onDuplicate={()=>{ openAdd({...viewTxn,date:today(),id:undefined},null); setViewTxn(null); }}
            onSplit={parts=>{ if (splitEntry(viewTxn.id,parts)) setViewTxn(null); }}
            onRepaid={()=>{ const s=reimbStatus(stateRef.current.transactions,viewTxn); if (!s || !(s.owed>0)) { setViewTxn(null); return; } addTransaction({ type:"income", category:"refund", amount:s.owed, merchant:s.who, note:"", subcategory:"", date:today(), recurring:false, recurFreq:null, isActive:true, reimbFor:viewTxn.id }); showToast(t("reimb.paidToast",{ amt:fmt(s.owed,currency) })); setViewTxn(null); }}
            onDelete={()=>{ deleteTransaction(viewTxn.id); setViewTxn(null); }}
            onLinkBill={x=>{
              // The entry becomes that bill's payment: it takes the bill's name, category and frequency (the fields that identify
              // a bill today); its amount, date and id stay. Undo restores the entry exactly, unless it was changed again since.
              const before=viewTxn, linked={...viewTxn, recurring:true, recurFreq:x.freq, category:x.category, subcategory:x.subcategory||"", merchant:x.merchant||viewTxn.merchant};
              setState(s=>({...s,transactions:s.transactions.map(t=>t.id===before.id?linked:t)}));
              setViewTxn(null);
              showSnackbar(t("detail.linkedToast",{name:maskText(x.merchant||x.note)||catName(x.category)}),()=>{
                setState(s=>({...s,transactions:s.transactions.map(t=>t.id===before.id && JSON.stringify(t)===JSON.stringify(linked)?before:t)}));
              },8000,"link");
            }}/>
        )}
      </div>
    </>
  );
}

// Run 26: the app's own confirm dialog (askConfirm lives with the helpers above; this part draws it).
function ConfirmHost() {
  const [q,setQ]=useState(null);
  useEffect(()=>{ confirmHost=setQ; return ()=>{ confirmHost=null; }; },[]);
  if (!q) return null;
  const done=(v)=>{ q.res(v); setQ(null); };
  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&done(false)} data-section="confirm-overlay">
      <div className="sheet" role="alertdialog" aria-modal="true" tabIndex={-1} aria-label={q.message}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div style={{fontSize:15,lineHeight:1.55,margin:"6px 2px 16px"}}>{q.message}</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost" style={{flex:1}} data-section="confirm-cancel" onClick={()=>done(false)}>{t("common.cancel")}</button>
          <button className="btn btn-primary" style={{flex:1}} data-section="confirm-ok" onClick={()=>done(true)}>{t("common.delete")}</button>
        </div>
      </div>
    </div>
  );
}
export let freshTxnId=null;   // id of the entry saved a moment ago; its row plays the settle tint once
// ─────────────────────────────────────────────────────────────────────────────
// SMART HELPER — deterministic advice cards based on real data
// Not AI. Not guessing. Every card has a clear data source and impact.
// ─────────────────────────────────────────────────────────────────────────────
export function calcHelperCards(transactions, budgets, goals, safeToSpend, currency, bills=[]) {
  const cards = [];
  const mon = curMon();
  const { curExp, curInc } = calcMonthSummary(transactions, mon);
  const catSpend = calcCategorySpend(transactions, mon);
  const budgetTotal = Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const spentToDate = calcSpentToDate(transactions, mon);
  const paceInfo = calcSpendingPace(spentToDate, mon, budgetTotal);
  const budgetItems = calcBudgetStatus(budgets||{}, catSpend, mon);
  const safeInfo = calcSafeToSpend(transactions, safeToSpend, goals, new Date(), bills);

  // 1. Spending pace — only fire when compared against a real budget (onTrack===false)
  if (paceInfo.onTrack === false && paceInfo.daysRemaining > 0 && spentToDate > 0) {
    const overage = spentToDate - paceInfo.expectedByToday;
    const remainingBudget = budgetTotal - curExp;
    cards.push({
      id:"pace", type:"warn", icon:"pace",
      title:t("pace.title"),
      text:t("help.paceText",{amount:fmt(overage,currency)}),
      impact: remainingBudget>0
        ? tn("help.paceLeft",paceInfo.daysRemaining,{ left:fmt(remainingBudget,currency), perDay:fmt(remainingBudget/paceInfo.daysRemaining,currency) })
        : remainingBudget<0
          ? tn("help.paceUsedOver",paceInfo.daysRemaining,{ over:fmt(Math.abs(remainingBudget),currency) })
          : tn("help.paceUsed",paceInfo.daysRemaining),
    });
  }

  // 2. Budget warnings — over or approaching
  budgetItems.filter(b=>b.over||b.warn).forEach(b=>{
    const name=catName(b.catId);
    cards.push({
      id:`budget-${b.catId}`, type:b.over?"neg":"warn", icon:b.catId,
      title:t("help.budgetTitle",{cat:name}),
      text:b.over
        ?t("help.budgetOver",{cat:name,amount:fmt(b.spent-b.limit,currency)})
        :tn("help.budgetWarn",b.daysLeft,{cat:name,pct:PRIVACY?"••":Math.round(b.pct)}),
      impact:b.over
        ?t("help.budgetOverImpact",{cat:name})
        :t("help.budgetWarnImpact",{left:fmt(b.limit-b.spent,currency),perDay:fmt((b.limit-b.spent)/Math.max(b.daysLeft,1),currency)}),
    });
  });

  // 3. Goals that will miss their target date, or whose date has passed
  goals?.forEach(goal=>{
    const gp=calcGoalProgress(goal);
    // Run 15: a short alert only. The required monthly amount, the dates and the what-if are on the Goals tab, not repeated here.
    if (gp.behindSchedule && goal.monthlyTarget>0) {
      cards.push({
        id:`goal-${goal.id}`, type:"warn", icon:"goal",
        title:t("help.goalTitle",{name:goal.name}),
        text:t("help.goalBehind",{name:goal.name}),
        impact:t("help.goalBehindImpact"),
      });
    } else if (gp.overdue) {
      cards.push({
        id:`goal-${goal.id}`, type:"warn", icon:"goal",
        title:t("help.goalTitle",{name:goal.name}),
        text:t("help.goalOverdue",{name:goal.name}),
        impact:t("help.goalOverdueImpact"),
      });
    }
  });

  // 4. Safe to Spend negative
  if (safeToSpend?.enabled && safeInfo.feasible && safeInfo.remaining < 0) {
    cards.push({
      id:"safe-neg", type:"neg", icon:"safe",
      title:t("help.safeNegTitle"),
      text:t("help.safeNegText",{amount:fmt(Math.abs(safeInfo.remaining),currency)}),
      impact:t("help.safeNegImpact",{income:fmt(safeInfo.curInc,currency)})+(safeInfo.expectedInc>0?" "+t("help.safeNegExpected",{amount:fmt(safeInfo.expectedInc,currency)}):"")+" "+t("help.safeNegReview"),
    });
  }

  // 5. Recurring audit — one line per schedule, not per recorded payment
  const activeSchedules = buildSchedules(transactions, bills).filter(x=>x.isActive && x.type==="expense");
  if (activeSchedules.length >= 3) {
    const monthlyTotal = activeSchedules.reduce((sum,x)=>sum+scheduleMonthly(x),0);
    const pctOfIncome = curInc>0 ? Math.round((monthlyTotal/curInc)*100) : 0;
    if (pctOfIncome >= 30) {
      cards.push({
        id:"recur-audit", type:"info", icon:"repeat",
        title:t("help.recurTitle"),
        text:t("help.recurText",{n:activeSchedules.length,amount:fmt(monthlyTotal,currency),pct:PRIVACY?"••":pctOfIncome}),
        impact:t("help.recurImpact"),
      });
    }
  }

  // 6. High-spend anomaly this month
  const patternsData = calcPatterns(transactions, currency);
  if (patternsData.anomalies.length > 0) {
    const top = patternsData.anomalies[0];
    cards.push({
      id:"anomaly-top", type:"info", icon:"other",
      title:t("help.anomalyTitle"),
      text:t("help.anomalyText",{who:top.merchant||catName(top.category),date:fmtDate(top.date),amount:fmt(top.amount,currency),reason:top.reason}),
      impact:t("help.anomalyImpact",{cat:catName(top.category)}),
    });
  }

  // Limit to 4 most impactful cards
  return cards.slice(0, 4);
}
