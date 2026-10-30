import { useState, useEffect, useMemo, useCallback, useRef, Fragment, Component } from "react";
import { t, tn, tIn, setLang, locale, LANGS, LANG_NAMES, MESSAGES } from "./i18n.js";

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

const KEY = "expense_ledger_v5";
const KEYS_LEGACY = [
  "finance_app_data","finance_editorial_v1","finance_editorial_v2",
  "finance_editorial_v3","finance_editorial_v4","finance_os_v3",
];

function writeRaw(k,v) { try { localStorage.setItem(k,JSON.stringify(v)); return true; } catch { return false; } }

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
function parseMoney(v, opts) { return moneyReason(v,opts)===null ? strictNum(v) : null; }
// Run 17: what a money box lets through while typing. Phones whose decimal key is a comma used to lose the mark (145,67 was saved as 14567 because the box was type=number).
// Either "." or "," is the decimal mark; when both appear the LAST one is, the other is a thousands mark and goes. Digits are never changed, at most 2 decimals.
function cleanMoneyText(raw) {
  // A sign or an exponent is never turned into a different valid number (-5 must not become 5): it stays visible and is refused when saving.
  if (/[-+eE]/.test(String(raw??""))) return String(raw).replace(/[\s\u00a0\u202f]/g,"").slice(0,24);
  const s=String(raw??"").replace(/[\s\u00a0\u202f]/g,"").replace(/[^0-9.,]/g,"");
  const dot=s.indexOf("."), com=s.indexOf(","), lastDot=s.lastIndexOf("."), lastCom=s.lastIndexOf(",");
  let at;                                           // index of the character that is the decimal mark
  if (dot>=0 && com>=0) at=Math.max(lastDot,lastCom);
  else if (dot>=0) at=dot;                          // a repeated dot while typing (1.2.3): the first is the mark
  else if (com>=0) { if (lastCom!==com) return s.replace(/,/g,""); at=com; }   // 1,234,567 pasted: thousands marks
  else return s;
  const intPart=s.slice(0,at).replace(/[.,]/g,""), dec=s.slice(at+1).replace(/[.,]/g,"").slice(0,2);
  return (intPart===""?"0":intPart)+"."+dec;
}// A form value that ends in the decimal mark ("145.") means 145; parseMoney itself stays strict for imports.
function formMoney(v, opts) { return parseMoney(typeof v==="string" ? v.trim().replace(/\.$/,"") : v, opts); }

function isPlainObject(x) { return x!==null && typeof x==="object" && !Array.isArray(x); }
// Run 14: a clickable <div> that acts as a button must answer Enter and Space too. Only when the key was pressed ON the element
// itself, so a real button inside it keeps its own keys.
const activateKey = (fn) => (e) => { if (e.target!==e.currentTarget) return; if (e.key==="Enter" || e.key===" ") { e.preventDefault(); fn(); } };
// A yes/no field: true/false, or the words "true"/"false" (any case, trimmed). Anything else → null (not guessed).
const flagValue = (v) => { if (typeof v==="boolean") return v; if (typeof v==="string") { const s=v.trim().toLowerCase(); if (s==="true") return true; if (s==="false") return false; } return null; };
const isTrue = (v) => flagValue(v)===true;
const txt = (v) => typeof v==="string" ? v : (typeof v==="number" && Number.isFinite(v) ? String(v) : "");
const norm = (v) => txt(v).trim().toLowerCase().replace(/\s+/g," ");

// Keep a recoverable copy of anything we cannot use, so the next save never overwrites it.
function preserveRaw(label, raw) {
  try { localStorage.setItem(`${"expense_ledger_v5"}__${label}_${Date.now()}`, typeof raw==="string"?raw:JSON.stringify(raw)); return true; }
  catch { return false; }
}

function isValidDateStr(s) {
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
function localDateStr(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function localMonthStr(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
// Parse a YYYY-MM-DD string as LOCAL calendar date (avoids UTC midnight shift)
function parseLocalDate(s) {
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
const today   = () => localDateStr();
const curMon  = () => localMonthStr();
const prevMon = () => { const n=new Date(); const d=new Date(n.getFullYear(),n.getMonth()-1,1); return localMonthStr(d); };
const nMon    = (n) => { const now=new Date(); const d=new Date(now.getFullYear(),now.getMonth()-n,1); return localMonthStr(d); };

// ─── Category system ──────────────────────────────────────────────────────────
const CATEGORIES = [
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
  { id:"other",    name:"Other",                 tile:"Other",     color:"#A5B7B8", income:false,
    subs:["Miscellaneous","Pets","Children"] },
  { id:"salary",   name:"Salary",                tile:"Salary",    color:"#8BD97A", income:true, subs:[] },
  { id:"freelance",name:"Freelance",             tile:"Freelance", color:"#7CCB9A", income:true, subs:[] },
  { id:"income",   name:"Other Income",          tile:"Other income",    color:"#9FDDA0", income:true, subs:[] },
];
const CAT = (id) => CATEGORIES.find(c=>c.id===id) || CATEGORIES.find(c=>c.id==="other");
// Display names in the interface language. The English `name` above stays the stored/CSV identifier and is never translated.
const catName = (id) => MESSAGES["cat."+CAT(id).id] ? t("cat."+CAT(id).id) : CAT(id).name;
const catTile = (id) => MESSAGES["tile."+CAT(id).id] ? t("tile."+CAT(id).id) : CAT(id).tile;
// Built-in subcategory names are translated for display; anything the user typed is shown exactly as stored.
const subName = (s) => (s && MESSAGES["sub."+s]) ? t("sub."+s) : s;

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
  };
}
// Run 16: the wallet an entry was paid from. Only a tag (no balances, no transfers). The built-in ids are below; a short safe
// text id this version does not know (a wallet from a newer version or file) is KEPT, never dropped or turned into another one,
// and shown as "Other". "" means not set.
const WALLET_IDS = ["cash","card","mobile","other"];
function walletId(v) { const s=typeof v==="string" ? v.trim().toLowerCase() : ""; return /^[a-z0-9_-]{1,32}$/.test(s) ? s : ""; }
// Names a person types in a CSV, mapped to the ids ("Bank card" has a space, so it is not an id by itself).
const WALLET_ALIASES = { "bank card":"card", "credit card":"card", "debit card":"card", "mobile wallet":"mobile", "e wallet":"mobile" };
function walletFromText(s) { const k=String(s||"").trim().toLowerCase(); return WALLET_ALIASES[k] || walletId(k); }
// The wallet of the newest entry that has one (the list is newest first): the default for the next entry.
function lastWallet(transactions) { const t=(transactions||[]).find(x=>walletId(x && x.wallet)); return t ? walletId(t.wallet) : ""; }
const walletName=(id)=>WALLET_IDS.includes(id) ? t("wallet."+id) : t("wallet.other");   // an id this version does not know shows as "Other"
// Run 16: the user's own subcategories (Phase 1 of the custom-categories design note). A subcategory is already free text on each
// entry, so these are only SUGGESTIONS in the picker, kept in their own storage key. The ledger and every entry stay untouched,
// and an older version simply never shows them. Limits: 20 per category, 30 characters, no duplicates (ignoring case), nothing
// equal to a built-in subcategory of that category.
const SUBCAT_KEY=KEY+"__subcats", SUBCAT_MAX=20, SUBCAT_LEN=30;
const subKey=(s)=>String(s).trim().toLowerCase();
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
function addUserSubcat(map, catId, text) {
  const cat=CATEGORIES.find(c=>c.id===catId); if (!cat) return { map, added:false, reason:"category" };
  const s=typeof text==="string" ? text.trim().replace(/\s+/g," ") : ""; if (!s) return { map, added:false, reason:"empty" };
  if (s.length>SUBCAT_LEN) return { map, added:false, reason:"long" };
  const mine=(map&&map[catId])||[];
  if ((cat.subs||[]).some(x=>subKey(x)===subKey(s)) || mine.some(x=>subKey(x)===subKey(s))) return { map, added:false, reason:"dup" };
  if (mine.length>=SUBCAT_MAX) return { map, added:false, reason:"full" };
  return { map:{ ...map, [catId]:[...mine,s] }, added:true, reason:"" };
}
function removeUserSubcat(map, catId, text) {
  const rest=((map&&map[catId])||[]).filter(x=>subKey(x)!==subKey(text)), out={ ...map };
  if (rest.length) out[catId]=rest; else delete out[catId];
  return out;
}
function mergeSubcats(a, b) { const out={}; const A=cleanSubcats(a), B=cleanSubcats(b); new Set([...Object.keys(A),...Object.keys(B)]).forEach(k=>{ out[k]=[...(A[k]||[]),...(B[k]||[])]; }); return cleanSubcats(out); }
function readSubcats() { try { const r=localStorage.getItem(SUBCAT_KEY); return r ? cleanSubcats(JSON.parse(r)) : {}; } catch { return {}; } }
function writeSubcats(map) {   // an empty list removes the key instead of keeping an empty shell
  try { const c=cleanSubcats(map); if (!Object.keys(c).length) localStorage.removeItem(SUBCAT_KEY); else localStorage.setItem(SUBCAT_KEY,JSON.stringify({ version:1, byCategory:c })); return true; } catch { return false; }
}
// ─── Debts and loans (Run 17) ─────────────────────────────────────────────────
// Informal DEBTS (person to person) and formal LOANS (a rate and a schedule). All money is whole qapik (integers); interest is rounded
// half-up to the qapik each month. Stored under their own key, so the main saved-data key is never touched by this feature. The
// remaining balance of a debt is always derived from its payments, never stored. The schedule of a loan is an ESTIMATE from the terms
// the person typed: the bank's contract (its effective rate, day count and fees) is what counts, so a typed bank payment overrides ours.
const DEBTS_KEY="expense_ledger_v5__debts";
const LOAN_RATE_TYPES=["annuity","equal","flat","none"], LOAN_KINDS=["cash","card","taksit","other"], MAX_DEBTS=200, MAX_LOANS=100, MAX_QAPIK=1e12;
const isQapik=(v)=>Number.isInteger(v) && v>0 && v<=MAX_QAPIK;
function loanDate(first, i) {   // same day of the month, shortened to the month's last day when it is shorter (no drift)
  const [y,m,d]=first.split("-").map(Number); const idx=(m-1)+i, yy=y+Math.floor(idx/12), mm=((idx%12)+12)%12;
  const day=Math.min(d,new Date(yy,mm+1,0).getDate());
  return `${String(yy).padStart(4,"0")}-${String(mm+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
function loanSchedule(l) {
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
function impliedNominalPct(principal, months, payment) {
  const pv=(r)=>{ let s=0; for (let k=1;k<=months;k++) s+=payment/Math.pow(1+r,k); return s; };
  let lo=0, hi=1; if (pv(0)<principal) return null;
  for (let i=0;i<80;i++) { const mid=(lo+hi)/2; if (pv(mid)>principal) lo=mid; else hi=mid; }
  return ((lo+hi)/2)*1200;
}
function debtRemaining(d) { return Math.max(0,d.principal-(d.payments||[]).reduce((s,p)=>s+p.amount,0)); }
function debtCanPay(d, amount) { return isQapik(amount) && amount<=debtRemaining(d); }

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
function cleanDebtData(raw) {
  const out={ debts:[], loans:[] };
  if (!isPlainObject(raw)) return out;
  const ids=new Set();
  (Array.isArray(raw.debts)?raw.debts:[]).forEach(d=>{
    if (out.debts.length>=MAX_DEBTS || !isPlainObject(d) || typeof d.id!=="string" || !d.id.trim() || d.id.length>64 || ids.has("d:"+d.id)) return;
    const name=cleanText(d.name,60);
    if (!name || !["owe","owed"].includes(d.direction) || !isQapik(d.principal)) return;
    ids.add("d:"+d.id);
    out.debts.push({ id:d.id, direction:d.direction, name, principal:d.principal, dueDate:(typeof d.dueDate==="string" && isValidDateStr(d.dueDate)) ? d.dueDate : "", note:cleanText(d.note,120), payments:cleanPayments(d.payments,false) });
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
function readDebts() { try { const r=localStorage.getItem(DEBTS_KEY); return cleanDebtData(r ? JSON.parse(r) : null); } catch { return { debts:[], loans:[] }; } }
function writeDebts(data) {   // nothing to keep removes the key instead of storing an empty shell
  try { const c=cleanDebtData(data); if (!c.debts.length && !c.loans.length) localStorage.removeItem(DEBTS_KEY); else localStorage.setItem(DEBTS_KEY,JSON.stringify({ version:1, ...c })); return true; } catch { return false; }
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
function calcCoach(transactions, debtData, now=new Date()) {
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
      const inc=win.filter(x=>x.type==="income").reduce((a,x)=>a+x.amount,0), exp=win.filter(x=>x.type==="expense").reduce((a,x)=>a+x.amount,0);
      if (!(inc>0)) numbers.push({ id:"noIncome" });
      else { const pct=Math.round(exp/inc*100); numbers.push(exp<=inc ? { id:"spent", pct, kept:100-pct } : { id:"over", pct }); }
    }
  }
  if (future>0) numbers.push({ id:"future", n:future });
  return [...actions.sort((a,b)=>(a.id==="loanOverdue"?0:1)-(b.id==="loanOverdue"?0:1)), ...numbers];
}
function isBillId(v) { return typeof v==="string" && v.trim()!=="" && v.trim().length<=64; }

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
  };
}

// Run 17: the optional name used in the Home greeting. Plain text only: control characters removed, spaces collapsed, 30 characters at most.
// It lives in the app's own saved state and is NOT part of backups or exports (it is not financial data and a backup may be shared).
const PROFILE_NAME_MAX=30;
function cleanProfileName(v) {
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
const nativeShareHook=()=>(typeof window!=="undefined" && typeof window.__ledgerNativeShare==="function") ? window.__ledgerNativeShare : null;
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

function downloadFile(content, mime, filename) {
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
  note:["note","notes","description","memo"], recurring:["recurring","recurfreq","frequency"], wallet:["wallet","paid with"] };

function parseCsvImport(raw) {
  const rows=parseCSV(String(raw).replace(/^\uFEFF/,""));
  if (rows.unterminated) return { error:t("csv.unterminated") };
  if (rows.length<2) return { error:t("csv.noRows") };
  const headers=rows[0].map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase());
  const idx={}; Object.entries(CSV_COLUMNS).forEach(([k,names])=>{ idx[k]=names.map(n=>headers.indexOf(n)).find(i=>i!==-1) ?? -1; });
  const missing=["date","amount"].filter(k=>idx[k]===-1);
  if (missing.length) return { error:t(missing.length===2 ? "csv.needDateAmount" : missing[0]==="date" ? "csv.needDate" : "csv.needAmount", { found:rows[0].map(h=>h.trim()).filter(Boolean).join(", ")||t("csv.noHeaders") }) };
  // A leading apostrophe before = + - @ tab or CR is the formula guard added by buildCsv: remove it to restore the original text.
  const cell=(row,k)=>{ const v=idx[k]===-1 ? "" : String(row[idx[k]] ?? "").trim(); return /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v; };
  const records=rows.slice(1).map((row,i)=>{
    const rec=cell(row,"recurring").toLowerCase();
    const isRec=!!rec && !["no","false","0","none"].includes(rec);
    const wal=walletFromText(cell(row,"wallet"));   // Run 16: free text that is not a wallet gives none, never an error
    return { id:Date.now()+i+Math.random(), type:cell(row,"type"), amount:cell(row,"amount"),
      category:cell(row,"categoryId")||cell(row,"category"), subcategory:cell(row,"subcategory"), merchant:cell(row,"merchant"),
      note:cell(row,"note"), date:cell(row,"date"), recurring:isRec, recurFreq:isRec?rec:null, isActive:true, createdAt:new Date().toISOString(),
      ...(wal ? { wallet:wal } : {}) };
  });
  return { records };
}

// Reads a file's text into a plan. Nothing is applied here; the user reviews the plan first.
function planImport(raw, filename="") {
  const text=String(raw).replace(/^\uFEFF/,"");
  const isCSV=/\.csv$/i.test(filename) || text.trimStart().toLowerCase().startsWith("date,");
  let list=[], settings={}, problems=[], warnings=[], subcategories={}, debtData={ debts:[], loans:[] };
  if (isCSV) {
    const r=parseCsvImport(text);
    if (r.error) return { ok:false, error:r.error };
    list=r.records;
  } else {
    let parsed;
    try { parsed=JSON.parse(text); } catch { return { ok:false, error:t("import.notJsonCsv") }; }
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
  return { ok:true, kind:isCSV?"csv":"json", filename, transactions:good, canReplace:good.length>0 && bad.length===0, skippedCount:bad.length, skippedSummary:summariseReasons(bad), settings, problems, warnings, subcategories, debtData };
}

// Run 8: whether an entry repeats (and how often) is part of what it is, so a monthly bill and an identical one-off purchase
// are not look-alikes. Paused/active is a state that changes over time and is left out (a re-imported entry still matches).
function txnFingerprint(t) { return [t.date,t.type,Number(t.amount).toFixed(2),t.category,norm(t.merchant),norm(t.note),norm(t.subcategory),t.recurring?(t.recurFreq||"r"):""].join("|"); }
function countSuspectedDuplicates(existing, incoming) { const fp=new Set(existing.map(txnFingerprint)); return incoming.filter(t=>fp.has(txnFingerprint(t))).length; }

// What each mode does with each part of a backup (shown to the user in the import sheet):
//   Merge   transactions: added unless the id exists (optionally also skipping look-alikes) · budgets: combined, imported categories win ·
//           templates/goals: new ones added · currency and Safe to Spend: YOUR current values stay.
//   Replace transactions: replaced · budgets/templates/goals/currency/Safe to Spend: replaced ONLY if the file contains a valid section.
function applyImport(state, plan, mode, { skipDuplicates=false }={}) {
  const sortDesc=(l)=>[...l].sort((a,b)=>b.date.localeCompare(a.date));
  const S=plan.settings||{};
  if (mode==="replace") {
    // Defence in depth (the sheet does not offer Replace then): a file with no usable rows, or with refused rows, never
    // replaces the ledger; only its valid settings are applied.
    const keep=!plan.transactions.length || (plan.skippedCount||0)>0;
    const next={ ...state, transactions:keep ? state.transactions : sortDesc(plan.transactions) };
    ["budgets","templates","currency","goals","safeToSpend","bills"].forEach(k=>{ if (S[k]!==undefined) next[k]=S[k]; });
    return next;
  }
  const ids=new Set(state.transactions.map(t=>String(t.id)));
  const fps=new Set(state.transactions.map(txnFingerprint));
  const add=plan.transactions.filter(t=>!ids.has(String(t.id)) && !(skipDuplicates && fps.has(txnFingerprint(t))));
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

function buildBackup(state, now=new Date().toISOString()) {
  const { transactions,budgets,templates,currency,goals,safeToSpend,bills=[],subcategories }=state;
  const subs=cleanSubcats(subcategories);   // Run 16: optional; absent when there are none, so such a file is identical to before
  const dd=cleanDebtData(state.debtData);   // Run 17: debts and loans, optional in the same way
  return { version:BACKUP_VERSION, exportedAt:now, meta:{ app:"expense-ledger", transactionCount:transactions.length },
    transactions, budgets, templates, currency, goals, safeToSpend, bills, ...(Object.keys(subs).length ? { subcategories:subs } : {}),
    ...(dd.debts.length ? { debts:dd.debts } : {}), ...(dd.loans.length ? { loans:dd.loans } : {}), lastBackup:now };
}

function buildCsv(transactions) {
  // Run 16: "Wallet" is the last column, so the columns before it did not move (older readers and the older import still work).
  const rows=[["Date","Type","Category","Subcategory","Merchant","Amount","Note","Recurring","CategoryId","Wallet"]];
  transactions.forEach(t=>rows.push([t.date,t.type,CAT(t.category)?.name||t.category,t.subcategory||"",t.merchant||"",Number(t.amount).toFixed(2),t.note||"",t.recurring?(t.recurFreq||""):"",t.category,walletId(t.wallet)]));
  // Formula-injection guard: a cell starting with = + - @ tab or CR would run as a formula in a spreadsheet, so it gets a
  // leading apostrophe (shown as text). parseCsvImport removes it again, so the app's own CSV round trip stays exact.
  const safe=(v)=>{ const s=String(v); return /^[=+\-@\t\r]/.test(s) ? "'"+s : s; };
  return "\uFEFF"+rows.map(r=>r.map(v=>`"${safe(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
}

// ─── Merchant memory ──────────────────────────────────────────────────────────
// Memory is keyed by type + merchant, so a merchant used as both income and expense
// keeps a separate category/subcategory for each. The most recent choice per type wins.
function memKey(type, merchant) { return `${type==="income"?"income":"expense"}|${String(merchant).trim().toLowerCase()}`; }

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
  const q=merchant.trim().toLowerCase();
  return Object.values(memory).find(v=>v.type===(type==="income"?"income":"expense")&&v.merchant.toLowerCase().startsWith(q))||null;
}

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

function calcMerchantProfile(merchant, transactions) {
  if (!merchant) return null;
  const ml = merchant.toLowerCase();
  const txns = transactions
    .filter(t => t.merchant && t.merchant.toLowerCase() === ml && t.type === "expense")
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
  const last30 = txns.filter(t=>t.date>=now30).reduce((s,t)=>s+t.amount,0);
  const prev30total = txns.filter(t=>t.date>=prev30&&t.date<now30).reduce((s,t)=>s+t.amount,0);

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
    const recent3 = txns.slice(-3).reduce((s,t)=>s+t.amount,0)/3;
    const prev3   = txns.slice(-6,-3).reduce((s,t)=>s+t.amount,0)/3;
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
function surplusLabel(inc, exp) { return inc>exp ? "Surplus" : inc<exp ? "Deficit" : "Break-even"; }

function surplusColor(inc, exp) { return inc>exp ? "var(--pos)" : inc<exp ? "var(--neg)" : "var(--ink)"; }

// "Has this entry happened?" for month figures: a past month counts whole, the current month up to and including today,
// a future month nothing. Entries dated later are PLANNED: shown separately, never as money already spent or received.
function happenedIn(mon, now=new Date()) {
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
function calcMonthSummary(transactions, mon=curMon(), prv=prevMon(), now=new Date()) {
  const isExp=t=>t.type==="expense", isInc=t=>t.type==="income", inMon=t=>t.date.startsWith(mon);
  const cw=comparisonWindow(mon,prv,now);
  const done=happenedIn(mon,now), donePrv=cw.inPrev, sum=l=>l.reduce((s,t)=>s+t.amount,0);
  const curExp =sum(transactions.filter(t=>isExp(t)&&done(t)));
  const curInc =sum(transactions.filter(t=>isInc(t)&&done(t)));
  const plannedExp=sum(transactions.filter(t=>isExp(t)&&inMon(t)&&!done(t)));
  const plannedInc=sum(transactions.filter(t=>isInc(t)&&inMon(t)&&!done(t)));
  const totalExp=sum(transactions.filter(t=>isExp(t)&&inMon(t))), totalInc=sum(transactions.filter(t=>isInc(t)&&inMon(t)));
  const prevExp=sum(transactions.filter(t=>isExp(t)&&donePrv(t)));
  const prevInc=sum(transactions.filter(t=>isInc(t)&&donePrv(t)));
  const prevFullExp=sum(transactions.filter(t=>isExp(t)&&happenedIn(prv,now)(t)));
  const momDiff=cw.kind&&prevExp>0?curExp-prevExp:null;
  // Negative when expenses exceed income — don't clamp, show the deficit
  const surplusRate=curInc>0?Math.round(((curInc-curExp)/curInc)*100):null;
  return { curExp,curInc,plannedExp,plannedInc,totalExp,totalInc,prevExp,prevInc,prevFullExp,momDiff,surplusRate,cmpKind:cw.kind,cmpDays:cw.days };
}

function calcCategorySpend(transactions, mon=curMon(), now=new Date()) {
  const out={}, done=happenedIn(mon,now);
  transactions.filter(t=>t.type==="expense"&&done(t))
    .forEach(t=>{ out[t.category]=(out[t.category]||0)+t.amount; });
  return out;
}

// Run 16: money spent in one month by wallet, by the same rule as calcCategorySpend (entries that have happened, not later ones).
// Whole cents, so 0.1 + 0.2 is exactly 0.30. "none" = entries without a wallet. "used" = at least one entry has a wallet.
function calcWalletSpend(transactions, mon=curMon(), now=new Date()) {
  const done=happenedIn(mon,now), cents={}; let totalC=0, used=false;
  (transactions||[]).filter(t=>t.type==="expense"&&done(t)).forEach(t=>{
    const w=walletId(t.wallet)||"none"; if (w!=="none") used=true;
    const c=Math.round(Number(t.amount)*100); cents[w]=(cents[w]||0)+c; totalC+=c;
  });
  const byWallet={}; Object.keys(cents).forEach(k=>{ byWallet[k]=cents[k]/100; });
  return { byWallet, total:totalC/100, used };
}

// Where a month sits relative to today. "daysLeft" counts the days AFTER today; "daysRemaining" counts today as well,
// because today's spending is still open. Every screen that shows "days left" or a per-day figure uses daysRemaining.
function daysBetween(a, b) {   // calendar days from a to b, ignoring time of day and DST
  return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);
}
function monthProgress(mon, now=new Date()) {
  const totalDays=daysInMonth(mon), cur=localMonthStr(now);
  if (mon===cur) { const d=now.getDate(); return { state:"current", totalDays, daysPassed:d, daysLeft:totalDays-d, daysRemaining:totalDays-d+1 }; }
  if (mon<cur)   return { state:"past",   totalDays, daysPassed:totalDays, daysLeft:0, daysRemaining:0 };
  return           { state:"future", totalDays, daysPassed:0, daysLeft:totalDays, daysRemaining:totalDays };
}
// Spending that has actually happened by today (entries dated later this month are planned, not yet spent).
function calcSpentToDate(transactions, mon=curMon(), now=new Date()) {
  const p=monthProgress(mon,now); if (p.state==="future") return 0;
  const todayStr=localDateStr(now);
  return transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&(p.state==="past"||t.date<=todayStr)).reduce((s,t)=>s+t.amount,0);
}

function calcSpendingPace(spent, mon=curMon(), budgetTotal=0, now=new Date()) {
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
  const spentSoFar=inMon.filter(t=>t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
  const plannedLater=inMon.filter(t=>t.date>todayStr).reduce((s,t)=>s+t.amount,0);
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
function calcMonthEndForecast(transactions, bills=[], now=new Date()) {
  const f=forecastCore(transactions,bills,now);
  if (!f.available) return { ...f, rangeShown:false, backtest:{ months:0, hits:0 } };
  let months=0, hits=0;
  for (let k=1;k<=3;k++) {
    const m=new Date(now.getFullYear(),now.getMonth()-k,1), asOf=new Date(m.getFullYear(),m.getMonth(),10,12,0,0), mon=localMonthStr(m);
    const known=transactions.filter(t=>t.date<=localDateStr(asOf));
    const b=forecastCore(known,bills,asOf); if (!b.available) continue;
    const actual=transactions.filter(t=>t.type==="expense" && t.date.startsWith(mon)).reduce((s,t)=>s+t.amount,0);
    months++; if (actual>=b.low-0.005 && actual<=b.high+0.005) hits++;
  }
  return { ...f, backtest:{ months, hits }, rangeShown:months>=2 && hits*3>=months*2 };
}

function calcBudgetStatus(budgets, catSpend, mon=curMon(), now=new Date()) {
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

function calcTxnStats(transactions, mon=curMon(), now=new Date()) {
  const done=happenedIn(mon,now);
  const amts=transactions.filter(t=>t.type==="expense"&&done(t)).map(t=>t.amount);
  const isWkend=d=>[0,6].includes(parseLocalDate(d).getDay());
  const wkdExp=transactions.filter(t=>t.type==="expense"&&done(t)&&!isWkend(t.date)).reduce((s,t)=>s+t.amount,0);
  const wkndExp=transactions.filter(t=>t.type==="expense"&&done(t)&&isWkend(t.date)).reduce((s,t)=>s+t.amount,0);
  return { count:amts.length, avgTxn:amts.length?amts.reduce((s,a)=>s+a,0)/amts.length:0, medTxn:median(amts), weekdayExp:wkdExp, weekendExp:wkndExp };
}

// Weekend vs weekday spending PER DAY for one month, counting only days that have passed (today included) and only
// expenses dated on those days. A month has ~2.5× more weekdays than weekend days, so raw totals are never compared.
// heavier: "weekend" | "weekday" | "same" (equal to the cent) | null (no spending, or a group has no elapsed day yet).
function calcWeekdayWeekend(transactions, mon=curMon(), now=new Date()) {
  const p=monthProgress(mon,now);
  const [y,m]=mon.split("-").map(Number);
  let weDays=0, wdDays=0;
  for (let d=1; d<=p.daysPassed; d++) { if ([0,6].includes(new Date(y,m-1,d).getDay())) weDays++; else wdDays++; }
  const lastStr=p.daysPassed>0 ? `${mon}-${String(p.daysPassed).padStart(2,"0")}` : "";
  const isWkend=d=>[0,6].includes(parseLocalDate(d).getDay());
  const inWindow=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&t.date<=lastStr);
  const weTotal=inWindow.filter(t=>isWkend(t.date)).reduce((s,t)=>s+t.amount,0);
  const wdTotal=inWindow.filter(t=>!isWkend(t.date)).reduce((s,t)=>s+t.amount,0);
  const weAvg=weDays>0 ? weTotal/weDays : null, wdAvg=wdDays>0 ? wdTotal/wdDays : null;
  let heavier=null;
  if (weAvg!==null && wdAvg!==null && (weTotal>0 || wdTotal>0)) {
    const a=Math.round(weAvg*100), b=Math.round(wdAvg*100);
    heavier = a===b ? "same" : a>b ? "weekend" : "weekday";
  }
  return { weDays, wdDays, weTotal, wdTotal, weAvg, wdAvg, heavier };
}

// S3: What Changed — category + merchant-level explanation + recurring/one-off flag
function calcWhatChanged(transactions, mon=curMon(), prv=prevMon(), now=new Date()) {
  // The previous month is taken over the same comparison window as the totals (Run 7, V9).
  const donePrv=comparisonWindow(mon,prv,now).inPrev, doneMon=happenedIn(mon,now);
  const catSpendMon=calcCategorySpend(transactions,mon,now);
  const catSpendPrv={}; transactions.filter(t=>t.type==="expense"&&donePrv(t)).forEach(t=>{ catSpendPrv[t.category]=(catSpendPrv[t.category]||0)+t.amount; });
  const { curExp,prevExp,curInc,prevInc,cmpKind,cmpDays }=calcMonthSummary(transactions,mon,prv,now);

  // Build a set of merchant names that have any recurring transaction
  const recurringMerchants=new Set(
    transactions.filter(t=>t.recurring&&t.merchant).map(t=>t.merchant.toLowerCase())
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
      isRecurring: recurringMerchants.has(m.toLowerCase()),
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
    isRecurring: recurringMerchants.has(m.toLowerCase()),
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
function validateBill(b) {
  if (!isPlainObject(b)) return null;
  const id=isBillId(b.id) ? b.id.trim() : null;
  const name=typeof b.name==="string" ? b.name.trim() : "";
  const type=b.type==="income" ? "income" : b.type==="expense" ? "expense" : null;
  const amount=parseMoney(b.amount,{positive:true});
  const anchor=typeof b.anchorDate==="string" && isValidDateStr(b.anchorDate) ? b.anchorDate : null;
  const dueDayOk=b.dueDay===undefined || (Number.isInteger(b.dueDay) && b.dueDay>=1 && b.dueDay<=31);
  if (!id || !name || name.length>80 || !type || amount===null || !RECUR_FREQS.has(b.freq) || !anchor || !dueDayOk || (b.active!==undefined && typeof b.active!=="boolean")) return null;
  const ids=CATEGORIES.map(c=>c.id);
  return { id, name, type, category:ids.includes(b.category) ? b.category : "other", subcategory:txt(b.subcategory).slice(0,40), amount, freq:b.freq,
    anchorDate:anchor, ...(b.dueDay!==undefined ? { dueDay:b.dueDay } : {}), active:b.active!==false, createdAt:typeof b.createdAt==="string" ? b.createdAt : "" };
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

function buildSchedules(transactions, bills=[]) {
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
const scheduleMonthly = (s) => toMonthlyAmountHelper({ amount:s.amount, recurFreq:s.freq });   // an ESTIMATE of a typical month

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
  return out;
}

// Which expected occurrences in `mon` have no recorded payment yet. Monthly/yearly: any payment of the schedule in that month
// settles it. Weekly/biweekly: each payment settles at most one expected date within ±3 / ±6 days.
function scheduleMonthStatus(s, transactions, mon, now=new Date()) {
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
function scheduleNextDue(s, transactions, now=new Date()) {
  const todayStr=localDateStr(now);
  for (let i=0;i<14;i++) {
    const mon=localMonthStr(addMonths(new Date(now.getFullYear(),now.getMonth(),1),i));
    const c=scheduleMonthStatus(s,transactions,mon,now).remaining.filter(d=>d>=todayStr);
    if (c.length) return parseLocalDate(c[0]);
  }
  return null;
}

// S4: Safe to Spend = income received so far this month − savings reserve − spending recorded this month − commitments still to come.
// "Received so far" = income dated today or earlier. Income dated later this month is expected, not available yet: it is
// reported separately (expectedInc) and never added, so the figure is never optimistic. Expenses dated later this month ARE
// subtracted (they are planned spending).
// "Commitments still to come" = every expected payment of an active schedule this month that has no matching recorded payment:
// both upcoming ones and earlier ones that were never recorded (counted so the figure is never optimistic).
// Recurring monthly estimates (recurringMonthly) are informational and are NOT part of this month's subtraction.
function calcSafeToSpend(transactions, safeConfig, goals=[], now=new Date(), bills=[]) {
  const { savingsTarget=0 }=safeConfig||{};
  const mon=localMonthStr(now), todayStr=localDateStr(now);
  // Every expense recorded for this month, including ones dated later: money entered ahead of time is already committed.
  // laterExp is the part of it dated after today, shown on the card so it is not mistaken for money already spent.
  const { totalExp:curExp, plannedExp:laterExp }=calcMonthSummary(transactions,mon,prevMon(),now);
  const monthInc=transactions.filter(t=>t.type==="income"&&t.date.startsWith(mon));
  const curInc=monthInc.filter(t=>t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
  const expectedInc=monthInc.filter(t=>t.date>todayStr).reduce((s,t)=>s+t.amount,0);
  const p=monthProgress(mon,now);

  const schedules=buildSchedules(transactions,bills).filter(s=>s.isActive && s.type==="expense");
  let upcomingCommitments=0, unrecordedCommitments=0, upcomingCount=0, unrecordedCount=0;
  schedules.forEach(s=>{
    const st=scheduleMonthStatus(s,transactions,mon,now);
    upcomingCommitments+=s.amount*st.upcoming.length;  upcomingCount+=st.upcoming.length;
    unrecordedCommitments+=s.amount*st.overdue.length; unrecordedCount+=st.overdue.length;
  });
  const futureCommitments=upcomingCommitments+unrecordedCommitments;
  const recurringMonthly=schedules.reduce((sum,s)=>sum+scheduleMonthly(s),0);

  // Goal reserve: only goals that still need money and have a monthly contribution. The reserve is the LARGER of the manual
  // savings floor and the goal contributions (the floor is treated as an overall minimum that already includes them).
  const goalContributions=(goals||[]).filter(g=>g.monthlyTarget>0 && g.target>0 && (g.saved||0)<g.target).reduce((sum,g)=>sum+g.monthlyTarget,0);
  const effectiveSavingsTarget=Math.max(savingsTarget,goalContributions);
  const goalContributionActive=goalContributions>savingsTarget && goalContributions>0;

  const disposable=curInc-effectiveSavingsTarget;
  const remaining=disposable-curExp-futureCommitments;
  const dailyAllowance=p.daysRemaining>0 ? remaining/p.daysRemaining : 0;

  return {
    curInc, expectedInc, curExp, laterExp, savingsTarget, effectiveSavingsTarget, goalContributions, goalContributionActive,
    futureCommitments, upcomingCommitments, unrecordedCommitments, upcomingCount, unrecordedCount,
    scheduleCount:schedules.length, recurringMonthly,
    disposable, remaining, daysLeft:p.daysLeft, daysRemaining:p.daysRemaining, dailyAllowance,
    feasible:curInc>0,
  };
}

// S1: Goals — full funding plan with target date and what-if
function calcGoalProgress(goal, now=new Date()) {
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
function goalRequiredMonthly(goal, now=new Date()) {
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
function goalScenario(goal, amount, now=new Date()) {
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

// S5: Full financial patterns engine — deterministic, data-only
// Returns { insights, anomalies, dayOfWeek, categoryTrends, correlations }

function calcPatterns(transactions, currency="₼", now=new Date()) {
  const expenses=transactions.filter(t=>t.type==="expense");
  const monBack=(k)=>localMonthStr(new Date(now.getFullYear(),now.getMonth()-k,1));
  const mon=monBack(0), prv=monBack(1), todayStr=localDateStr(now);
  const insights=[];
  const empty={ insights, anomalies:[], dayOfWeek:{}, categoryTrends:[], correlations:[] };
  if (expenses.length<5) return empty;
  const sumOf=(l)=>l.reduce((a,t)=>a+t.amount,0);
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
      if (Math.abs(pct)>=20) insights.push({ id:"weekend", text:t(pct>0?"ins.weekendMore":"ins.weekendLess",{ pct:Math.abs(pct), we:fmt(weAvg,currency), wd:fmt(wdAvg,currency), days:weDays+wdDays }) });
    }
  }

  // ── Concentration this month
  const monExp=expenses.filter(t=>t.date.startsWith(mon)&&t.date<=todayStr);   // what has happened this month (not entries dated later)
  const monTotal=sumOf(monExp);
  if (monExp.length>=5 && monTotal>0) {
    const catTotals={}; monExp.forEach(t=>{ catTotals[t.category]=(catTotals[t.category]||0)+t.amount; });
    const topCat=Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    const pct=Math.round((topCat[1]/monTotal)*100);
    if (pct>=40) insights.push({ id:"catconc", text:t("ins.catConc",{ cat:catName(topCat[0]), pct }) });
    const mTotals={}; monExp.filter(t=>t.merchant).forEach(t=>{ mTotals[t.merchant]=(mTotals[t.merchant]||0)+t.amount; });
    const top3=Object.entries(mTotals).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if (top3.length>=2) { const pc=Math.round((top3.reduce((a,[,v])=>a+v,0)/monTotal)*100); if (pc>=60) insights.push({ id:"merchant", text:t("ins.merchantConc",{ names:top3.map(([m])=>m).join(", "), pct:pc }) }); }
  }

  // ── Typical transaction vs last month: the MEDIAN per transaction (a part-month stays comparable, and one unusual purchase
  //    cannot read as a general change; unusual purchases are reported separately as anomalies)
  const median=(l)=>quantile([...l].sort((a,b)=>a-b),0.5);
  const curAmts=monExp.map(t=>t.amount), prvAmts=expenses.filter(t=>t.date.startsWith(prv)).map(t=>t.amount);
  if (curAmts.length>=4 && prvAmts.length>=4) {
    const curMed=median(curAmts), prvMed=median(prvAmts);
    if (prvMed>0) { const pct=pctChange(curMed,prvMed); if (Math.abs(pct)>=20) insights.push({ id:"avgtxn", text:t(pct>0?"ins.avgHigher":"ins.avgLower",{ pct:Math.abs(pct), a:curAmts.length, b:prvAmts.length }) }); }
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
      if (pct>=30) insights.push({ id:"dayofweek", text:t(pct>=200?"ins.dayOfWeekX":"ins.dayOfWeek",vars) });
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
      insights.push({ id:`trend-${catId}`, text: sustained ? t(trend==="increasing"?"ins.trendUp":"ins.trendDown",vars) : t("ins.lastMonthChange",vars) });
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
  if (anomalies.length) insights.push({ id:"anomaly", text:tn("ins.anomalies",anomalies.length) });

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
let PRIVACY=false;
const MASK="••••";
function setPrivacyMode(on) { PRIVACY=!!on; }
function maskText(s) { return PRIVACY && s ? "•••••" : s; }
function fmtPct(n) { return PRIVACY ? "••%" : `${n}%`; }
function fmt(n, sym="₼") {
  if (PRIVACY) return `${MASK} ${sym}`;
  return `${Math.abs(n||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} ${sym}`;
}
// The three small Home tiles. Exact below 10,000 (1,050.00 used to show as "1.1k", which reads as 1,100 — Run 7, V4);
// above that the short form is marked "≈" so it is never taken for an exact figure.
function fmtShort(n, sym="₼") {
  if (PRIVACY) return fmt(n,sym);
  const a=Math.abs(n||0);
  return a>=1e6?`≈${(a/1e6).toFixed(1)}M ${sym}`:a>=10000?`≈${(a/1000).toFixed(1)}k ${sym}`:fmt(a,sym);
}
// Dates and month names follow the interface language. They are built from the catalog (mon.* / monShort.* / monGen.*)
// rather than toLocaleDateString, because Chrome ships without Azerbaijani date data and would show "2026 M10".
// Amounts keep the "1,234.56" form in every language for now, because amounts are typed with a decimal point (see
// MONEY_TEXT_RE); showing "1 234,56" while requiring "1234.56" would mislead.
function fmtDate(d) {
  if (!d) return "";
  const td=today();
  if (d===td) return t("date.today");
  const y=new Date(); y.setDate(y.getDate()-1);
  if (d===localDateStr(y)) return t("date.yesterday");
  const dt=parseLocalDate(d);
  return t("date.dayMonth",{ d:dt.getDate(), m:t("monShort."+(dt.getMonth()+1)) });
}
// Full date in the interface language (e.g. "13 October 2026"), used wherever a long date is shown.
function fmtLongDate(v) { const dt=v instanceof Date ? v : new Date(v); return t("date.long",{ d:dt.getDate(), m:t("monGen."+(dt.getMonth()+1)), y:dt.getFullYear() }); }
function monthName(ym) { const [y,m]=ym.split("-").map(Number); return t("date.monthYear",{ m:t("mon."+m), y }); }
function monthShort(ym) { return t("monShort."+Number(ym.split("-")[1])); }
function daysInMonth(ym) { const [y,m]=ym.split("-").map(Number); return new Date(y,m,0).getDate(); }
function median(arr) {
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
function donutSlices(catSpend, max=5) {
  const rows=Object.entries(catSpend).filter(([,a])=>a>0).sort((a,b)=>b[1]-a[1]);
  const top=rows.slice(0,max).map(([id,amt])=>({ id, amt, color:CAT(id)?.color||"#98A5B7", name:catName(id) }));
  const rest=rows.slice(max).reduce((s,[,a])=>s+a,0);
  if (rest>0) top.push({ id:"_rest", amt:rest, color:"#5F6B7C", name:t("home.otherCats") });
  const pct=pctShares(top.map(x=>x.amt));
  return top.map((x,i)=>({ ...x, pct:pct[i] }));
}
// Running total of a month's expenses, day by day: element d-1 is everything spent on days 1…d. Only what has happened
// counts (days after today are null in the current month; a future month is all null), matching the month's "Spent" figure.
function cumulativeByDay(transactions, mon, now=new Date()) {
  const n=daysInMonth(mon), p=monthProgress(mon,now), last=p.state==="future"?0:p.state==="past"?n:p.daysPassed;
  const perDay=new Array(n).fill(0);
  transactions.forEach(x=>{ if (x.type==="expense" && x.date.startsWith(mon)) { const d=Number(x.date.slice(8,10)); if (d>=1 && d<=last) perDay[d-1]+=x.amount; } });
  let run=0; return perDay.map((v,i)=>{ run=Math.round((run+v)*100)/100; return i<last?run:null; });
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
const SUBPAGE_PARENT = { recurring:"more", io:"more", debts:"more" };

function Icon({ name, size=16, color="currentColor", style={} }) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size,flexShrink:0,color,...style}}
      dangerouslySetInnerHTML={{__html:ICONS[name]||ICONS.other}} aria-hidden="true"/>
  );
}
function CatIcon({ catId, size=16, color }) {
  const cat=CAT(catId);
  return <Icon name={catId} size={size} color={color||cat?.color||"#98A5B7"}/>;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
button{font-family:inherit;cursor:pointer}
/* "Caspian Ledger" dark design (Run 9, 2026-10-27; replaces the blue redesign of the same day). Surfaces: page #07151A,
   card #0E2229, elevated #153039, border #24414A. Text #F3F7F6, muted #A5B7B8. Brand / selection: sea-glass teal #4CC9C4;
   filled teal controls carry dark text (white on teal is 2.0:1, dark is 9.3:1). Meaning colours: income #8BD97A (a clear
   green, 69° of hue away from the teal — the proposed #63D6A0 was 26° away and read as "selected"), expense #FF8188,
   warning #F0C46F, comparison #83B9F5. Every text colour is ≥ 5.5:1 on every surface. */
:root{
  color-scheme:dark;
  --font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --bg:#07151A;--bg-card:#0E2229;--bg-warm:#153039;--bg-inset:#112A31;
  --ink:#F3F7F6;--ink-2:#D3DFDE;--ink-3:#A5B7B8;--ink-4:#93A7A8;--ink-5:#2A464E;
  --rule:#24414A;--rule-2:#36606A;
  --accent:#4CC9C4;--accent-light:#123C3F;--accent-mid:#85D9D0;--accent-text:#4CC9C4;--accent-fill:#4CC9C4;--on-accent:#07151A;
  --violet:#B3A1FF;--info:#83B9F5;
  --pos:#8BD97A;--pos-bg:#173622;
  --neg:#FF8188;--neg-bg:#3B1C22;
  --warn:#F0C46F;--warn-bg:#352B14;
  --radius:18px;
}
html,body{background:var(--bg);color:var(--ink);font-family:var(--font);min-height:100vh;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
input::placeholder,textarea::placeholder{color:var(--ink-4)}
.app{max-width:430px;margin:0 auto;min-height:100vh;background:var(--bg);display:flex;flex-direction:column}
.topbar{position:sticky;top:0;z-index:60;background:rgba(7,21,26,0.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);padding:10px 20px 6px;min-height:60px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0}
.wordmark{font-family:var(--font);font-size:26px;font-weight:700;color:var(--ink);letter-spacing:-0.4px;line-height:1.15;min-width:0;overflow-wrap:anywhere}
.topbar-back{display:flex;align-items:center;gap:2px;min-width:0;margin-left:-8px}
.topbar-back .wordmark{font-size:22px}
.topbar-right{display:flex;align-items:center;gap:7px}
.fab-add{position:fixed;bottom:calc(72px + env(safe-area-inset-bottom,0px) + 14px);left:calc(50% + min(215px,50vw) - 72px);width:56px;height:56px;border:none;border-radius:50%;background:var(--accent-fill);color:var(--on-accent);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(0,0,0,0.38),0 2px 8px rgba(76,201,196,0.3);transition:transform 120ms,background 120ms;-webkit-tap-highlight-color:transparent;z-index:55}
.fab-add:active{transform:scale(0.92)}
.topbar-btn{width:34px;height:34px;border-radius:8px;background:transparent;border:none;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 120ms,color 120ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.topbar-btn:hover{background:var(--bg-inset);color:var(--ink)}.topbar-btn:active{transform:scale(0.88)}
.tabbar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(7,21,26,0.94);backdrop-filter:blur(24px);border-top:1px solid var(--rule);display:flex;z-index:60;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px))}
.tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0;border:none;background:transparent;cursor:pointer;color:var(--ink-3);transition:color 150ms,transform 80ms;font-family:var(--font);-webkit-tap-highlight-color:transparent}
.tab-btn.active{color:var(--ink)}.tab-btn:active{transform:scale(0.88)}
/* Sentence case, no extra tracking: upper-case labels were up to 30% wider, so long Azerbaijani and Russian words
   ("Əməliyyatlar", "Təkrarlanan", "По месяцам") filled the whole tab at 320 px and ran into their neighbours. */
.tab-btn{min-width:0;padding-left:2px;padding-right:2px}
/* Enlarged phone text (page zoom) narrows the CSS viewport: at 130–200% a 390 px phone is 300–195 px wide and the longest
   label, "Əməliyyatlar" (≈6.15 × the font size), no longer fits a fifth of it. The label shrinks with the width instead,
   so on screen it stays at least as large as at 100%. When text is enlarged without zoom (a minimum font size), it can't
   shrink, so it wraps inside its own tab rather than running into the next one. */
.tab-lbl{font-size:clamp(5.5px,2.85vw,10.5px);font-weight:600;letter-spacing:0;text-transform:none;line-height:1.15;max-width:100%;text-align:center;overflow-wrap:anywhere}
.tab-indicator{position:absolute;top:5px;left:calc((100% / var(--tab-count,5)) * var(--tab-index,0) + (100% / (var(--tab-count,5) * 2)) - 8px);width:16px;height:2px;background:var(--accent);border-radius:99px;pointer-events:none;transition:left 320ms cubic-bezier(0.22,1,0.36,1)}
.page{flex:1;overflow-y:auto;padding:20px 20px calc(148px + env(safe-area-inset-bottom,0px));animation:pageIn 240ms cubic-bezier(0.22,1,0.36,1) backwards}
/* "backwards", not "both": a transform kept after the animation makes .page the box that position:fixed sheets are placed in,
   so a sheet opened from a long list landed thousands of pixels below the screen, under the tab bar. */
@keyframes pageIn{from{opacity:0}to{opacity:1}}   /* Run 14: a short fade only; sliding every screen in made the numbers move while being read */
.label-sm{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3)}
/* Hero */
.hero{padding:16px 0 18px;border-bottom:1px solid var(--rule);margin-bottom:18px}
.hero-eyebrow{font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px}
.hero-amount{font-family:var(--font);font-size:clamp(34px,11.5vw,48px);font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-2px;line-height:1;color:var(--ink);margin-bottom:3px;white-space:nowrap}
.hero-sub{font-size:12px;color:var(--ink-3);margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mom-badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px}
.mom-badge.better{background:var(--pos-bg);color:var(--pos)}
.mom-badge.worse{background:var(--neg-bg);color:var(--neg)}
.hero-stats{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid var(--rule);border-radius:8px;overflow:hidden;background:var(--bg-card)}
.hero-stat{padding:11px 10px;position:relative}
.hero-stat:not(:last-child)::after{content:'';position:absolute;right:0;top:8px;bottom:8px;width:1px;background:var(--rule)}
.hero-stat-val{font-family:var(--font);font-size:clamp(12px,3.6vw,15px);font-weight:700;letter-spacing:-0.3px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hero-stat-val.pos{color:var(--pos)}.hero-stat-val.neg{color:var(--neg)}
.hero-stat-lbl{font-size:10px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-4)}
/* Cards */
.pace-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:12px 14px;margin-bottom:14px}
.pace-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
.pace-track{height:3px;background:var(--rule);border-radius:99px;overflow:hidden}
.pace-fill{height:100%;border-radius:99px;transition:width 0.5s ease}
.pace-fill.on-track{background:var(--pos)}.pace-fill.over-pace{background:var(--neg)}
.pace-sub{display:flex;justify-content:space-between;margin-top:4px}
.safe-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:14px 16px;margin-bottom:14px}
.safe-amount{font-family:var(--font);font-size:clamp(26px,8.6vw,32px);font-weight:900;letter-spacing:-1.5px;margin:4px 0}
.safe-daily{font-size:11px;color:var(--ink-3);margin-top:2px}
.safe-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px 0;border-bottom:1px solid var(--rule);font-size:11px}
.safe-row:last-child{border-bottom:none}
.safe-lbl{color:var(--ink-3)}.safe-val{font-family:var(--font);font-weight:600;color:var(--ink);white-space:nowrap;text-align:right}
/* Templates */
.tpl-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:14px;scrollbar-width:none}
.tpl-strip::-webkit-scrollbar{display:none}
.tpl-card{flex-shrink:0;display:flex;align-items:center;gap:7px;padding:8px 13px;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;cursor:pointer;transition:border-color 120ms,background 120ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.tpl-card:hover{border-color:var(--rule-2);background:var(--bg-warm)}.tpl-card:active{transform:scale(0.94)}
.tpl-name{font-size:12px;font-weight:600;color:var(--ink-2);white-space:nowrap}
.tpl-amt{font-family:var(--font);font-size:12px;color:var(--ink-3);white-space:nowrap}
/* Budgets */
.budget-item{margin-bottom:11px}
.budget-hdr{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}
.budget-name{font-size:12px;font-weight:600;color:var(--ink-2);display:flex;align-items:center;gap:5px}
.budget-nums{font-size:11px;color:var(--ink-3)}.budget-nums strong{color:var(--ink);font-weight:700}
.budget-track{height:2px;background:var(--rule);border-radius:99px;overflow:hidden}
.budget-fill{height:100%;border-radius:99px;transition:width 0.5s ease}
.budget-msg{font-size:10px;margin-top:3px;color:var(--ink-4);font-weight:500}
.budget-msg.warn{color:var(--warn)}.budget-msg.over{color:var(--neg)}
/* Goals */
.goal-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:14px;margin-bottom:10px}
.goal-name{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:3px}
.goal-progress{height:4px;background:var(--rule);border-radius:99px;overflow:hidden;margin:8px 0 5px}
.goal-fill{height:100%;border-radius:99px;background:var(--accent);transition:width 0.6s ease}
.goal-meta{display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3)}
/* Transactions */
.txn-group{margin-bottom:16px}
.txn-date-hdr{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:6px;border-bottom:1px solid var(--rule)}
.txn-date-lbl{font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:var(--ink-3)}
.txn-date-total{font-family:var(--font);font-size:13px;font-weight:600;color:var(--ink)}
.txn-list{background:var(--bg-card);border:1px solid var(--rule);border-top:none;border-radius:0 0 8px 8px}
.txn-row{display:flex;align-items:center;gap:11px;padding:11px 13px;border-bottom:1px solid var(--rule);transition:background 80ms,transform 80ms;cursor:pointer;-webkit-tap-highlight-color:transparent}
.txn-row:last-child{border-bottom:none;border-radius:0 0 8px 8px}
.txn-row:active{background:var(--bg-inset);transform:scale(0.99)}
.txn-ico{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.txn-body{flex:1;min-width:0}
.txn-name{font-size:13px;font-weight:600;color:var(--ink);white-space:normal;overflow-wrap:anywhere;line-height:1.25}
.txn-sub{font-size:11px;color:var(--ink-3);margin-top:2px;display:flex;gap:4px;align-items:center;flex-wrap:wrap;overflow:visible;line-height:1.3}
.txn-sub span{white-space:nowrap}
.txn-sub span:not(.rec-pill){white-space:normal;overflow-wrap:anywhere;min-width:0;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rec-pill{display:inline-flex;align-items:center;gap:3px;background:var(--warn-bg);color:var(--warn);font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;flex-shrink:0}
.txn-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
.txn-amt{font-family:var(--font);font-size:14px;font-weight:600}
.txn-amt.exp{color:var(--ink)}.txn-amt.inc{color:var(--pos)}
.txn-actions{display:flex;gap:1px}
.txn-act{width:28px;height:28px;border-radius:5px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink-4);transition:background 120ms,color 120ms}
.txn-act:hover{background:var(--bg-inset);color:var(--ink-2)}.txn-act.del:hover{background:var(--neg-bg);color:var(--neg)}
/* Empty */
.empty{text-align:center;padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:10px}
.empty-icon{color:var(--ink-5);margin-bottom:4px}
.empty-title{font-family:var(--font);font-size:20px;font-weight:600;color:var(--ink)}
.empty-body{font-size:13px;color:var(--ink-3);line-height:1.65;max-width:240px}
/* Add overlay */
.add-overlay{position:fixed;inset:0;background:var(--bg);z-index:100;display:flex;flex-direction:column;max-width:430px;margin:0 auto;animation:slideUp 340ms cubic-bezier(0.22,1,0.36,1);overflow-y:auto}
@keyframes slideUp{from{transform:translateY(100%);opacity:0.6}to{transform:translateY(0);opacity:1}}
.add-bar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--rule);flex-shrink:0}
.add-title{font-family:var(--font);font-size:17px;font-weight:700}
.add-close{width:30px;height:30px;border-radius:50%;border:1px solid var(--rule);background:transparent;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color 120ms,color 120ms}
.add-close:hover{border-color:var(--ink-3);color:var(--ink)}
.add-body{flex:1;padding:18px 20px 36px;display:flex;flex-direction:column}
/* Amount */
.amount-zone{display:flex;align-items:center;justify-content:center;padding:18px 0 20px;border-bottom:1px solid var(--rule);margin-bottom:16px}
.amount-line{display:flex;align-items:baseline;justify-content:center;gap:7px;max-width:100%;min-width:0}
.amount-input{font-family:var(--font);font-size:clamp(32px,12vw,50px);font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-1.6px;background:transparent;border:0;border-radius:8px;outline:none;color:var(--ink);min-width:0;max-width:68vw;text-align:right;caret-color:var(--accent);transition:color 160ms,text-shadow 160ms,transform 160ms;appearance:textfield;-moz-appearance:textfield}
.amount-input:focus{color:var(--ink);text-shadow:0 0 18px rgba(0,0,0,0.07)}
.amount-input::placeholder{color:var(--ink-3)}   /* Run 9: was --ink-5, 1.66:1 on the dark page — unreadable */
.numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
.numpad-key{min-height:50px;border:1px solid var(--rule);border-radius:14px;background:var(--bg-card);color:var(--ink);font-family:var(--font);font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.numpad-key:active{background:var(--bg-warm)}
.numpad-key:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.add-foot{position:sticky;bottom:0;background:var(--bg);border-top:1px solid var(--rule);padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));z-index:3;flex-shrink:0}
.more-toggle{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:10px 14px;margin:6px 0 14px;border:1px dashed var(--rule-2);border-radius:14px;background:transparent;color:var(--ink-2);text-align:left;-webkit-tap-highlight-color:transparent}
.more-toggle-main{font-weight:700;font-size:14px;color:var(--ink);white-space:nowrap}
.more-toggle-sub{flex:1;min-width:0;font-size:12px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.more-toggle:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.amount-cur{font-family:var(--font);font-size:15px;font-weight:600;color:var(--ink-3);white-space:nowrap;position:relative;top:-2px}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
input[type=number]{-moz-appearance:textfield}
/* Type toggle */
.type-toggle{display:flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden;margin-bottom:14px}
.type-btn{flex:1;padding:9px;border:none;background:transparent;color:var(--ink-3);font-size:12px;font-weight:700;cursor:pointer;transition:background 120ms,color 120ms;font-family:var(--font);letter-spacing:0.3px;text-transform:uppercase}
.type-btn:not(:last-child){border-right:1px solid var(--rule)}.type-btn.active{background:var(--accent-fill);color:var(--on-accent)}
/* Cat/sub */
.cat-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}.cat-scroll::-webkit-scrollbar{display:none}
.cat-tile{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;width:auto;min-width:68px;padding:9px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--bg-card);cursor:pointer;transition:border-color 150ms,background 150ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.cat-tile.sel{border-color:var(--accent);background:var(--accent-light)}
.cat-tile:active{transform:scale(0.93)}
.cat-tile-name{font-size:9.5px;font-weight:600;color:var(--ink-3);text-align:center;line-height:1.2;white-space:nowrap;width:auto;letter-spacing:-0.1px}
.cat-tile.sel .cat-tile-name{color:var(--ink)}
.sub-strip{display:flex;gap:5px;overflow-x:auto;padding-bottom:2px;margin-bottom:12px;scrollbar-width:none}.sub-strip::-webkit-scrollbar{display:none}
.sub-chip{flex-shrink:0;padding:4px 10px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:var(--font);transition:all 120ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.sub-chip.sel{background:var(--accent-fill);border-color:var(--accent-fill);color:var(--on-accent)}
.sub-chip:active{transform:scale(0.93)}
/* Merchant */
.merchant-wrap{position:relative}
.merchant-suggestions{position:absolute;top:calc(100% + 2px);left:0;right:0;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;z-index:20;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1)}
.merchant-sug-item{padding:9px 13px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--rule);color:var(--ink);transition:background 100ms}
.merchant-sug-item:last-child{border-bottom:none}.merchant-sug-item:hover{background:var(--bg-warm)}
.merchant-sug-sub{font-size:10px;color:var(--ink-3);margin-top:1px}
/* Form */
.field{margin-bottom:12px}
.field-lbl{font-size:10px;font-weight:700;letter-spacing:1.05px;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px;display:block}
.field-input{width:100%;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;padding:10px 12px;font-size:14px;color:var(--ink);font-family:var(--font);transition:border-color 150ms,box-shadow 150ms}
.field-input:focus{outline:none;border-color:var(--ink-3);box-shadow:0 0 0 3px rgba(0,0,0,0.06)}
.field-select{appearance:none;cursor:pointer}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
/* Toggle */
.toggle-track{width:44px;height:24px;border-radius:12px;background:var(--ink-5);position:relative;transition:background 100ms;flex-shrink:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.toggle-track.on{background:var(--accent)}
.toggle-knob{width:18px;height:18px;border-radius:50%;background:white;position:absolute;top:3px;left:3px;transition:transform 220ms cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 1px 4px rgba(0,0,0,0.2),0 0 0 0px rgba(0,0,0,0)}
.toggle-track.on .toggle-knob{transform:translateX(20px)}
.toggle-track:active .toggle-knob{transform:scaleX(1.15)}
.toggle-track.on:active .toggle-knob{transform:translateX(20px) scaleX(1.15)}
/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:6px;font-family:var(--font);font-weight:600;cursor:pointer;transition:opacity 120ms,background 120ms}
.btn-full{width:100%}
.btn-primary{padding:12px 20px;background:var(--accent-fill);color:var(--on-accent);border:1px solid var(--accent-fill);font-size:15px;font-weight:600;margin-top:8px;border-radius:14px;min-height:48px}.btn-primary:hover{opacity:0.87}
.btn-ghost{padding:11px 20px;background:transparent;color:var(--ink-3);border:1px solid var(--rule);font-size:13px;margin-top:6px}.btn-ghost:hover{border-color:var(--rule-2);color:var(--ink)}
.btn-sm{padding:5px 12px;font-size:11px;font-weight:700;background:transparent;border:1px solid var(--rule);color:var(--ink-2)}.btn-sm:hover{border-color:var(--rule-2)}
.btn-sm-primary{background:var(--accent-fill);color:var(--on-accent);border-color:var(--accent-fill)}
/* Search/filter */
.search-wrap{position:relative;margin-bottom:8px}
.search-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--ink-4);pointer-events:none}
.search-input{width:100%;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;padding:9px 12px 9px 34px;font-size:13px;color:var(--ink);font-family:var(--font);transition:border-color 120ms}.search-input:focus{outline:none;border-color:var(--rule-2);box-shadow:0 0 0 3px rgba(0,0,0,0.05)}
.filter-bar{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px}.filter-bar::-webkit-scrollbar{display:none}
.chip{flex-shrink:0;padding:5px 11px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;transition:all 120ms,transform 80ms;white-space:nowrap;font-family:var(--font);-webkit-tap-highlight-color:transparent}
.chip.on{background:var(--accent-fill);border-color:var(--accent-fill);color:var(--on-accent)}.chip:hover:not(.on){border-color:var(--rule-2);color:var(--ink)}.chip:active{transform:scale(0.94)}
.cat-filter-btn{display:flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font);white-space:nowrap;flex-shrink:0;transition:all 120ms}
.cat-filter-btn.active{border-color:var(--ink);color:var(--ink);background:var(--bg-warm)}
.cat-filter-btn:active{transform:scale(0.94)}
.date-inputs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.date-input-wrap{display:flex;flex-direction:column;gap:3px}
.date-lbl{font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-3)}
.date-input{background:var(--bg-card);border:1px solid var(--rule);border-radius:5px;padding:7px 9px;font-size:12px;color:var(--ink);font-family:var(--font);width:100%}.date-input:focus{outline:none;border-color:var(--rule-2);box-shadow:0 0 0 3px rgba(0,0,0,0.05)}
/* Sheet */
.sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:80;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 200ms cubic-bezier(0.22,1,0.36,1)}
@keyframes fadeIn{from{opacity:0;backdrop-filter:blur(0px)}to{opacity:1;backdrop-filter:blur(12px)}}
.sheet{background:var(--bg);width:100%;max-width:430px;border-radius:20px 20px 0 0;border-top:1px solid var(--rule);max-height:92vh;overflow-y:auto;animation:sheetRise 320ms cubic-bezier(0.22,1,0.36,1);padding:0 20px 48px;box-shadow:0 -4px 32px rgba(0,0,0,0.12)}
@keyframes sheetRise{from{transform:translateY(100%);opacity:0.8}to{transform:translateY(0);opacity:1}}
.sheet-handle{width:32px;height:3px;background:var(--ink-5);border-radius:99px;margin:12px auto 18px}
.sheet-title{font-family:var(--font);font-size:21px;font-weight:700;margin-bottom:16px}
.settings-section-lbl{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3);padding:14px 0 8px;border-bottom:1px solid var(--rule)}
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--rule);gap:12px}
.settings-row:last-of-type{border-bottom:none}
.settings-row-title{font-size:13px;font-weight:600;color:var(--ink)}
.settings-row-sub{font-size:11px;color:var(--ink-3);margin-top:2px}
/* Analytics */
.a-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:15px;margin-bottom:13px}
.a-card-title{font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--ink-3);margin-bottom:12px}
.cat-bar{display:flex;align-items:center;gap:8px;margin-bottom:9px}.cat-bar:last-child{margin-bottom:0}
.cat-bar-name{font-size:11px;font-weight:600;color:var(--ink-2);width:116px;flex-shrink:0;white-space:normal;overflow:visible;text-overflow:clip;display:flex;align-items:center;gap:5px;line-height:1.25}
.cat-bar-track{flex:1;height:3px;background:var(--rule);border-radius:99px;overflow:hidden}
.cat-bar-fill{height:100%;border-radius:99px;transition:width 0.6s ease}
.cat-bar-amt{font-family:var(--font);font-size:12px;font-weight:600;color:var(--ink);width:68px;text-align:right;flex-shrink:0}
.cat-bar-pct{font-size:10px;color:var(--ink-3);width:26px;text-align:right;flex-shrink:0}
/* Month bars */
.month-bars{display:flex;align-items:flex-end;gap:4px;height:80px;padding-top:8px}
.m-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;cursor:pointer;position:relative}
.m-bar{width:100%;border-radius:2px 2px 0 0;transition:height 0.5s ease,background 150ms;min-height:2px}
.m-lbl{font-size:10px;font-weight:700;letter-spacing:0.2px}
/* Month calendar (Run 17) */
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.cal-dow{font-size:10px;font-weight:700;color:var(--ink-4);text-align:center;padding-bottom:3px}
.cal-day{min-height:40px;border:0;border-radius:8px;background:var(--bg-inset);color:var(--ink-2);font-family:inherit;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.cal-day.has-spend{color:var(--ink)}
.cal-day.future{background:transparent;color:var(--ink-3);box-shadow:inset 0 0 0 1px var(--rule)}
.cal-day.today{outline:1.5px solid var(--ink-3);outline-offset:1px}
.cal-day.sel{outline:2px solid var(--ink);outline-offset:1px}
.cal-day:focus-visible{outline:2px solid var(--accent);outline-offset:1px}/* Stats */
.stat-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:13px}
.stat-cell{background:var(--bg-card);border:1px solid var(--rule);border-radius:7px;padding:11px 12px}
.stat-val{font-family:var(--font);font-size:20px;font-weight:700;letter-spacing:-0.5px;margin-bottom:2px}
.stat-lbl{font-size:10px;font-weight:700;letter-spacing:0.65px;text-transform:uppercase;color:var(--ink-3)}
/* What Changed */
.wc-row{display:flex;align-items:flex-start;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--rule)}
.wc-row:last-child{border-bottom:none}
.wc-name{font-size:12px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:6px}
.wc-diff{font-family:var(--font);font-size:13px;font-weight:700}
.wc-diff.pos{color:var(--pos)}.wc-diff.neg{color:var(--neg)}
.wc-merchants{margin-top:5px;padding-left:19px}
.wc-m-row{display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3);padding:2px 0}
/* Pattern */
.pattern-item{background:var(--bg-warm);border-radius:6px;padding:10px 13px;margin-bottom:7px;font-size:12px;color:var(--ink-2);line-height:1.5;display:flex;align-items:flex-start;gap:8px}
/* Snackbar / Toast */
.snackbar{position:fixed;bottom:calc(72px + env(safe-area-inset-bottom,0px) + 8px);left:50%;transform:translateX(-50%);background:var(--bg-warm);color:var(--ink);border:1px solid var(--rule-2);padding:11px 18px;border-radius:14px;font-size:13px;font-weight:600;z-index:200;display:flex;align-items:center;gap:14px;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.3),0 2px 6px rgba(0,0,0,0.15);animation:snackIn 300ms cubic-bezier(0.22,1,0.36,1)}
@keyframes snackIn{from{opacity:0;transform:translateX(-50%) translateY(16px) scale(0.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
.snackbar-undo{background:none;border:1px solid rgba(76,201,196,0.45);color:var(--accent-text);border-radius:6px;padding:4px 11px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);transition:border-color 120ms}
.snackbar-undo:hover{border-color:rgba(255,255,255,0.5)}
.toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--bg-warm);color:var(--ink);border:1px solid var(--rule-2);padding:9px 18px;border-radius:12px;font-size:12px;font-weight:600;z-index:300;white-space:nowrap;pointer-events:none;animation:toastIn 260ms cubic-bezier(0.22,1,0.36,1);box-shadow:0 4px 16px rgba(0,0,0,0.25)}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px) scale(0.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
/* Staggered section entrance */
/* Run 14: the sections of a screen appear together with a short fade (no per-section delay, no sliding). The classes stay so the
   markup is unchanged; reduced-motion handling further down still switches the animation off completely. */
.section-enter{animation:sectionIn 160ms ease-out both}
.section-enter-1,.section-enter-2,.section-enter-3,.section-enter-4,.section-enter-5,.section-enter-6,.section-enter-7,.section-enter-8{animation-delay:0ms}
@keyframes sectionIn{from{opacity:0}to{opacity:1}}
.backup-banner{display:flex;align-items:center;gap:10px;padding:9px 16px;background:var(--warn-bg);border-bottom:1px solid rgba(240,196,111,0.35);font-size:11px;font-weight:600;color:var(--warn)}
.backup-banner span{flex:1}
.backup-banner-btn{flex-shrink:0;padding:4px 10px;background:var(--warn);color:var(--bg);border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font)}
.backup-dismiss{background:none;border:none;color:var(--warn);font-size:15px;cursor:pointer;padding:2px;line-height:1;flex-shrink:0}
.drop-zone{border:1.5px dashed var(--rule);border-radius:7px;padding:16px;text-align:center;cursor:pointer;transition:border-color 150ms,background 150ms;width:100%}
.drop-zone:hover{border-color:var(--rule-2);background:var(--bg-warm)}
.drop-zone input{display:none}
.dupe-warn{display:flex;align-items:center;gap:7px;background:var(--warn-bg);border:1px solid rgba(240,196,111,0.35);border-radius:10px;padding:8px 11px;font-size:12px;font-weight:600;color:var(--warn);margin-bottom:11px}
/* Monthly view */
.month-selector{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.month-nav-btn{width:34px;height:34px;border-radius:8px;background:var(--bg-card);border:1px solid var(--rule);color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 120ms;font-size:16px;line-height:1}
.month-nav-btn:hover{border-color:var(--rule-2);color:var(--ink)}
.month-name{font-family:var(--font);font-size:20px;font-weight:700;color:var(--ink)}
.month-stat{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:13px 14px}
.month-stat-val{font-family:var(--font);font-size:clamp(17px,5.8vw,22px);font-weight:900;letter-spacing:-0.5px;margin-bottom:3px}
.month-stat-lbl{font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-3)}
/* Smart helper */
.helper-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:13px 14px;margin-bottom:10px;display:flex;gap:11px;align-items:flex-start}
.helper-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.helper-body{flex:1;min-width:0}
.helper-title{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:3px}
.helper-text{font-size:12px;color:var(--ink-2);line-height:1.55}
.helper-impact{font-size:11px;font-weight:600;margin-top:5px}
.helper-card.warn .helper-icon{background:var(--warn-bg)}
.helper-card.neg .helper-icon{background:var(--neg-bg)}
.helper-card.pos .helper-icon{background:var(--pos-bg)}
.helper-card.info .helper-icon{background:var(--bg-inset)}
/* Form validation */
.field-error{font-size:11px;color:var(--neg);font-weight:600;margin-top:3px}
.field-input.invalid{border-color:var(--neg)}
/* Enhanced transitions */
.btn-primary:active{transform:scale(0.97)}
.goal-fill{transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1)}
.budget-fill{transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1)}
.cat-bar-fill{transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1)}
@media (max-width:360px){
  .topbar{padding-left:15px;padding-right:15px}
  .page{padding-left:15px;padding-right:15px}
  .cat-tile{width:70px}
  .cat-tile-name{font-size:9px}
  .hero-stat{padding:10px 6px}
  .hero-stat-val{font-size:12px;letter-spacing:-0.45px}
  .hero-stat-lbl{font-size:9px;letter-spacing:0.7px}
  .amount-cur{font-size:14px}
}
/* Very narrow: a phone with its text enlarged to ~200% is under 280 CSS px wide. The amount column then left the
   merchant and category about 7 px, so a row wraps (amount below the name), and the three summary figures stack. */
@media (max-width:280px){
  .topbar{padding-left:10px;padding-right:10px}
  .page{padding-left:10px;padding-right:10px}
  .txn-row{flex-wrap:wrap;gap:6px 9px;padding:10px}
  .txn-body{flex:1 1 calc(100% - 43px)}
  .txn-right{flex-direction:row;flex-wrap:wrap;justify-content:flex-start;align-items:center;width:100%;padding-left:43px}
  .hero-stats{grid-template-columns:1fr}
  .hero-stat:not(:last-child)::after{left:8px;right:8px;top:auto;bottom:0;width:auto;height:1px}
  /* two-column boxes stack (inline grid styles need !important); filter chips wrap instead of scrolling out of sight */
  .stat-row,.field-row,.date-inputs{grid-template-columns:1fr}
  .month-stats,.detail-meta{grid-template-columns:1fr !important}
  .filter-bar{flex-wrap:wrap;overflow-x:visible}
  .backup-banner{flex-wrap:wrap}
  .backup-banner span{flex:1 1 100%;min-width:0}
  .safe-row{flex-wrap:wrap}.safe-val{white-space:normal;overflow-wrap:anywhere}
  .cat-bar{flex-wrap:wrap}.cat-bar-name{width:100%}
  /* an input's built-in width (~150 px) pushed the Save button beside it off the screen */
  .field-input{min-width:0}
  .settings-row{flex-wrap:wrap}
  .goal-milestones{flex-wrap:wrap}.goal-milestones>div{flex:1 1 40% !important}
}
.btn:disabled{opacity:.45;cursor:not-allowed}.btn-primary:disabled:active{transform:none}
/* First-launch language chooser */
.lang-screen{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:var(--bg)}
.lang-box{width:100%;max-width:420px}
.lang-mark{display:block;text-align:center;font-size:20px;margin-bottom:22px}
.lang-set{border:none;margin:0;padding:0;min-width:0}
.lang-title{display:flex;flex-direction:column;gap:2px;text-align:center;font-size:15px;font-weight:600;color:var(--ink);line-height:1.35;margin:0 auto 16px;padding:0}
.lang-line{display:block}
.lang-opt{position:relative;display:flex;align-items:center;gap:12px;min-height:56px;padding:14px 16px;margin-bottom:10px;background:var(--bg-card);border:1.5px solid var(--rule-2);border-radius:10px;cursor:pointer;font-size:17px;font-weight:600;color:var(--ink);transition:border-color 120ms,background 120ms}
.lang-opt input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.lang-name{flex:1;overflow-wrap:anywhere}
.lang-mark-sel{flex-shrink:0;width:22px;height:22px;border-radius:50%;border:2px solid var(--rule-2);display:inline-flex;align-items:center;justify-content:center}
.lang-opt.sel{border-color:var(--ink);background:var(--bg-warm)}
.lang-opt.sel .lang-mark-sel{border-color:var(--ink);background:var(--ink)}
.lang-opt.sel .lang-mark-sel::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--bg)}
.lang-opt:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.lang-continue{margin-top:6px;min-height:48px}
.lang-hint{display:flex;flex-direction:column;gap:2px;text-align:center;font-size:12px;color:var(--ink-2);line-height:1.45;margin:14px 0 0}
/* Language switch in Settings */
.lang-switch{display:flex;flex-wrap:wrap;gap:8px;border:none;margin:0;padding:0}
.lang-pill{position:relative;display:inline-flex;align-items:center;min-height:40px;padding:8px 14px;border:1.5px solid var(--rule-2);border-radius:20px;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;background:var(--bg-card)}
.lang-pill input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.lang-pill.sel{border-color:var(--accent-fill);background:var(--accent-fill);color:var(--on-accent)}
.lang-pill:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.fab-add:focus-visible,.topbar-btn:focus-visible,.tab-btn:focus-visible,.btn:focus-visible,.cat-tile:focus-visible,.chip:focus-visible,.sub-chip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
/* Run 14: rows, bars, the import tile and switches are keyboard-reachable now; they get the same visible ring (inside the edge for rows, which sit in clipped cards) */
.txn-row:focus-visible,.bill-row:focus-visible,.drop-zone:focus-visible,.list-row:focus-visible,.toggle-track:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.m-col:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
/* ── Design pass (from patch_H_design.py, reviewed) ── */
/* Secondary greys: --ink-3 #5F5A53 is 6.2:1 on the page background, --ink-4 #6E6961 is ≥ 4.5:1 on every surface
   (page, card, warm and inset backgrounds). They were 4.2:1 and 2.0:1. (The patch's #746F67 failed on --bg-inset: 4.15:1.) */
/* Money reads as aligned, lining figures */
.hero-amount,.hero-stat-val,.safe-amount,.safe-val,.stat-val,.month-stat-val,.txn-amt,.txn-date-total,.cat-bar-amt,.budget-nums,.amount-input,.wc-diff,.goal-meta{font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1}
/* Touch targets: the look stays, the tappable area grows to 44px */
.topbar-btn,.add-close,.toggle-track,.snackbar-undo,.backup-banner-btn,.backup-dismiss{position:relative}
.topbar-btn::after{content:"";position:absolute;inset:-5px}
.sheet .topbar-btn{z-index:1}   /* keeps the enlarged tap area above the goal progress bar drawn just below it */

.add-close::after{content:"";position:absolute;inset:-8px}
.topbar-right{gap:12px}
.backup-banner-btn::after{content:"";position:absolute;inset:-6px -2px}
.backup-dismiss::after{content:"";position:absolute;inset:-12px -15px}
.sheet .topbar-btn::after{inset:-9px}
.toggle-track::after{content:"";position:absolute;inset:-10px -4px}
.chip,.sub-chip{min-height:34px;display:inline-flex;align-items:center}
.btn-sm,.snackbar-undo{min-height:36px}
/* Sheets follow the finger while dragged (see useSheetGestures) */
.sheet-grip{margin:0 -20px;padding:12px 0 8px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.sheet-grip:active{cursor:grabbing}
.sheet-grip .sheet-handle{margin:0 auto}
.sheet.dragging{animation:none;transition:none;will-change:transform}
/* Once dragged, a sheet's entrance animation stays off: re-enabling it on release would replay the rise from the bottom. */
.sheet.settled{animation:none}
.sheet:focus{outline:none}
/* ── Redesign (2026-10-27): dark cards, larger radii, blue selection ── */
.tab-btn{color:var(--ink-3)}.tab-btn.active{color:var(--accent-text)}
.tabbar{border-top:1px solid var(--rule)}
.card,.safe-card,.a-card,.pace-card,.helper-card,.month-stat,.stat-cell,.goal-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:var(--radius)}
.card{padding:16px;margin-bottom:14px}
.card-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px}
.card-title{font-size:16px;font-weight:600;color:var(--ink)}
.card-sub-title{font-size:15px;font-weight:600;color:var(--ink);margin:16px 0 10px}
.section-title{display:block;font-size:17px;font-weight:600;color:var(--ink);margin:18px 2px 10px}
.list-title{display:block;font-size:15px;font-weight:600;color:var(--ink);overflow-wrap:anywhere}
.list-sub{display:block;font-size:12.5px;color:var(--ink-3);margin-top:2px;overflow-wrap:anywhere}
.big-num{font-size:clamp(26px,8vw,32px);font-weight:700;letter-spacing:-0.5px;color:var(--ink);margin:4px 0 12px;font-variant-numeric:tabular-nums}
.label-sm{font-size:12px;font-weight:600;letter-spacing:0.2px;text-transform:none;color:var(--ink-3)}
/* This month (the "hero") is now a card */
.hero.card{padding:16px;border-bottom:1px solid var(--rule)}
.hero .hero-eyebrow{font-size:12px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--ink-3);margin:0}
.hero-amount{font-size:clamp(30px,10vw,40px);font-weight:700;letter-spacing:-1px}
.hero-stats{border:none;background:var(--bg-inset);border-radius:12px}
.hero-stat-val{font-size:clamp(13px,3.9vw,16px);font-weight:700;letter-spacing:-0.2px}
.hero-stat-lbl{font-size:11px;letter-spacing:0.2px;text-transform:none;color:var(--ink-3)}
.hero-stat:not(:last-child)::after{background:var(--rule-2)}
.mom-badge{border-radius:999px;padding:3px 9px}
/* Safe to Spend */
.safe-card{padding:16px;margin-bottom:14px;background:var(--bg-card)}
.safe-amount{font-size:clamp(30px,10vw,38px);font-weight:700;letter-spacing:-1px}
.safe-card .label-sm{font-size:14px;font-weight:600;color:var(--accent-text)}
.safe-row{font-size:12.5px;padding:6px 0}
.safe-toggle{display:inline-flex;align-items:center;gap:4px;min-height:36px;margin-top:6px;padding:0;background:none;border:none;color:var(--accent-text);font:inherit;font-size:13px;font-weight:600}
.safe-note{font-size:11.5px;color:var(--ink-3);line-height:1.5;margin-top:8px}
/* Spending ring */
.donut-wrap{display:flex;align-items:center;gap:16px}
.donut{position:relative;width:132px;height:132px;flex-shrink:0}
.donut-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--ink);text-align:center;padding:0 26px;font-variant-numeric:tabular-nums}
.donut{transition:transform 260ms cubic-bezier(0.22,1,0.36,1)}
.donut.has-sel{transform:scale(1.12)}
.donut-slice{transition:stroke-width 220ms,opacity 220ms}
.donut-center-sel{flex-direction:column;gap:1px;padding:0 22px;line-height:1.2}
.dc-name{font-size:10px;font-weight:600;color:var(--ink-3);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-amt{font-size:12px;font-weight:700}
.dc-pct{font-size:10px;font-weight:600;color:var(--ink-3)}
.donut-row{display:flex;align-items:center;gap:8px;width:100%;min-height:34px;padding:2px 4px;margin:0;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:13px;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.donut-row[aria-pressed="true"]{background:var(--bg-inset)}
.donut-row:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
@media (prefers-reduced-motion:reduce){.donut,.donut-slice{transition:none}}
.donut-legend{list-style:none;flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.donut-legend li{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2)}
.donut-legend .dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.donut-name{flex:1;min-width:0;overflow-wrap:anywhere}
.donut-pct{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
@media (max-width:340px){.donut-wrap{flex-direction:column;align-items:stretch}.donut{margin:0 auto}}
/* Rows with a round category icon */
.cat-dot{width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.up-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--rule)}
.up-row:first-of-type{border-top:none}
.up-body{flex:1;min-width:0}
.up-amt{font-size:15px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
/* Lists inside a card (More, Budgets) */
.list-card{padding:4px 16px}
.list-row{display:flex;align-items:center;gap:14px;width:100%;min-height:60px;padding:12px 0;background:none;border:none;border-bottom:1px solid var(--rule);text-align:left;color:var(--ink);font:inherit;cursor:pointer}
.list-row:last-child{border-bottom:none}
.list-row:active{opacity:0.7}
.list-ico{width:28px;display:inline-flex;justify-content:center;flex-shrink:0}
.list-body{flex:1;min-width:0}
.more-id{display:flex;align-items:center;gap:14px}
.more-mark{width:46px;height:46px;border-radius:50%;background:var(--accent-light);border:1px solid var(--accent);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
/* Segmented control */
.seg{display:flex;background:var(--bg-card);border:1px solid var(--rule);border-radius:12px;padding:3px;margin-bottom:14px}
.seg-btn{flex:1;min-height:38px;border:none;border-radius:9px;background:transparent;color:var(--ink-3);font:inherit;font-size:14px;font-weight:600}
.seg-btn.on{background:var(--accent-fill);color:var(--on-accent)}
.seg-btn:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
/* Progress bars */
.bar{flex:1;height:8px;background:var(--bg-inset);border-radius:99px;overflow:hidden}
.bar-fill{height:100%;border-radius:99px;transition:width 0.6s ease}
.bud-row{padding:12px 0;border-bottom:1px solid var(--rule)}
.bud-row:last-child{border-bottom:none}
.bud-top{display:flex;align-items:center;gap:12px}
.bud-name{flex:1;min-width:0;font-size:15px;font-weight:600;color:var(--ink);overflow-wrap:break-word}
.bud-nums{font-size:12.5px;color:var(--ink-3);text-align:right;font-variant-numeric:tabular-nums}
.bud-bar-row{display:flex;align-items:center;gap:10px;margin-top:9px;padding-left:50px}
.goal-card .bud-bar-row{padding-left:0}
.bud-pct{font-size:12px;font-weight:600;color:var(--ink-3);min-width:36px;text-align:right;font-variant-numeric:tabular-nums}
.goal-card{padding:16px}
.goal-name{font-size:15px;font-weight:600}
/* Run 15: the required monthly amount is the first answer on a goal; the what-if below it is optional and collapsed. */
.goal-need{margin-top:12px;padding:10px 12px;border-radius:8px;background:var(--bg-inset);border:1px solid var(--rule)}
.goal-need-main{font-size:16px;font-weight:700;color:var(--ink);margin-bottom:2px}
.goal-need-muted{font-size:12px;color:var(--ink-3);line-height:1.5}
.goal-need-note{margin-top:4px}
.goal-scenario{margin-top:10px;padding-top:10px;border-top:1px solid var(--rule)}
.goal-scenario summary{cursor:pointer;font-size:12px;font-weight:700;color:var(--ink-3);min-height:24px;padding:2px 0}
.goal-scenario summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.goal-scenario .field-input{margin-top:6px}
.goal-scenario-out{margin-top:8px;font-size:12px;color:var(--ink-2);line-height:1.5}
.trend-legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--ink-3)}
.trend-legend span{display:inline-flex;align-items:center;gap:6px}
.trend-legend i{display:inline-block;width:14px;height:3px;border-radius:2px}
.trend-legend i.dash{background:repeating-linear-gradient(90deg,var(--ink-4) 0 4px,transparent 4px 7px)}
.month-name{font-size:20px;font-weight:700}
/* Import / Export */
.io-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.io-card{display:flex;flex-direction:column;align-items:flex-start;margin-bottom:0;cursor:pointer}
.io-card.drop-zone{border:1px solid var(--rule);border-radius:var(--radius);padding:16px;text-align:left}
.io-card.drop-zone:hover{background:var(--bg-warm)}
.io-ico{margin-bottom:12px}
.io-backup{display:flex;justify-content:space-between;align-items:center;gap:10px}
.io-status{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--warn);white-space:nowrap}
.io-status.ok{color:var(--pos)}
@media (max-width:340px){.io-grid{grid-template-columns:1fr}}
/* Enlarged text (≤ 280 CSS px): budget rows stack, so the Edit / Set button never runs off the screen */
/* Narrow phones: the spent / limit figures get their own line, so a category name is never broken mid-word */
@media (max-width:360px){ .bud-top{flex-wrap:wrap}.bud-nums{flex-basis:100%;text-align:left;padding-left:50px;margin-top:-4px} }
@media (max-width:280px){
  .bud-bar-row{flex-wrap:wrap;padding-left:0}.bud-bar-row .bar{flex-basis:100%}
  .up-row{flex-wrap:wrap}.donut-wrap{flex-direction:column;align-items:stretch}
}
/* Transactions */
.txn-ico{border-radius:50%;width:38px;height:38px}
.txn-list{border-radius:0 0 var(--radius) var(--radius)}
.txn-row:last-child{border-radius:0 0 var(--radius) var(--radius)}
.txn-date-hdr{border-bottom:none;padding:0 2px 8px}
.txn-date-lbl{font-size:13px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink-2)}
.txn-list{border-top:1px solid var(--rule);border-radius:var(--radius)}
.txn-row:first-child{border-radius:var(--radius) var(--radius) 0 0}
.txn-row:only-child{border-radius:var(--radius)}
.txn-name{font-size:15px}.txn-sub{font-size:12.5px}
.txn-amt{font-size:15px;font-weight:600}
.txn-amt.exp{color:var(--neg)}
.search-input{border-radius:12px;padding:11px 12px 11px 36px;font-size:14px}
.chip,.cat-filter-btn{border-radius:999px;padding:6px 14px;font-size:13px}
.a-card-title,.stat-lbl,.month-stat-lbl,.field-lbl,.settings-section-lbl,.date-lbl{letter-spacing:0.3px;text-transform:none;font-size:12px;font-weight:600}
.a-card-title{font-size:15px;color:var(--ink)}
.sheet{border-radius:24px 24px 0 0;background:var(--bg-card);border-top:1px solid var(--rule-2)}
.field-input,.date-input{background:var(--bg-inset);border-radius:10px}
.btn-sm{border-radius:999px}
.btn-ghost{border-radius:14px;min-height:46px}
/* Run 9: the routine backup reminder is a compact card under the screen edge, not a full-width amber bar above the title.
   Recovery notices and storage failures keep the strong full-width banner (Master Prompt §8). Dismissing lasts for this visit. */
.backup-banner.backup-reminder{margin:8px 16px 0;border:1px solid rgba(240,196,111,0.35);border-radius:14px;background:var(--bg-card);color:var(--ink-2);font-weight:500;padding:8px 12px}
.backup-reminder .backup-banner-btn{border-radius:999px;padding:6px 12px}
/* Run 9 privacy mode: numbers and names are replaced in the text itself (see fmt / maskText); graphics that would still
   reveal proportions are blurred. Navigation, titles and buttons are never blurred. */
.privacy-toggle.on{color:var(--accent-text);background:var(--accent-light);border-radius:50%}
.privacy-on .donut svg,.privacy-on .trend-card svg,.privacy-on .bar,.privacy-on .cat-bar-track,.privacy-on .budget-track,
.privacy-on .goal-progress,.privacy-on .pace-track,.privacy-on .month-bars,.privacy-on .cal{filter:blur(6px)}
/* Materials follow the user's preferences */
@media (prefers-reduced-transparency: reduce){
  .topbar,.tabbar{background:var(--bg);backdrop-filter:none;-webkit-backdrop-filter:none}
  .sheet-overlay{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(0,0,0,0.62)}
}
@media (prefers-contrast: more){
  :root{--rule:#4E7580;--rule-2:#6E959E;--ink-3:#C6D4D4;--ink-4:#B7C7C8}
  .sheet-overlay{background:rgba(0,0,0,0.72)}
  .btn-ghost,.chip,.sub-chip,.field-input,.cat-tile,.search-input,.tpl-card{border-color:var(--rule-2)}
}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{scroll-behavior:auto!important;animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}
}
`;

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
  return false;
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
      if (projected>d.h*0.45) spring(d.sheet,d.overlay,d.y,d.h,v,d.h,()=>{ d.overlay.click(); });
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
    return ()=>{ stop(); mo.disconnect(); document.removeEventListener("pointerdown",onDown); document.removeEventListener("pointermove",onMove);
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
export default function App() { return <ErrorBoundary><AppInner/></ErrorBoundary>; }
function AppInner() {
  const [state,    setState]    = useState(() => migrateAndLoad());
  // The whole tree renders in the saved language. Changing it is an ordinary state update: everything re-renders in place,
  // so the open screen, open sheets and anything typed into a form are kept.
  setLang(state.language||"en");
  useEffect(()=>{ document.documentElement.lang=state.language||"en"; },[state.language]);
  const [tab,      setTab]      = useState("home");
  const [tabKey,   setTabKey]   = useState(0);
  // Privacy mode lives only in memory: it is never saved, so a reload (or a new tab) starts with it off.
  const [privacy,  setPrivacy]  = useState(false);
  setPrivacyMode(privacy);
  // Budgets & Goals: which half is shown, and a counter the title bar's "+" bumps to open that half's "new" form.
  const [goalsSeg, setGoalsSeg] = useState("budgets");
  const [goalsAdd, setGoalsAdd] = useState(0);
  const [showAdd,  setShowAdd]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast,    setToast]    = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [prefill,  setPrefill]  = useState(null);
  const [editId,   setEditId]   = useState(null);
  const [viewTxn,  setViewTxn]  = useState(null);
  const [infoKind, setInfoKind] = useState(null);   // Run 16: "how" | "privacy" | null
  const [importPending, setImportPending] = useState(null);
  const [skipDup, setSkipDup] = useState(true);
  // Recovery messages stay on screen until the user dismisses them; ordinary toasts can never replace them.
  const [recoveryNotice, setRecoveryNotice] = useState(()=>LOAD_NOTICE);
  const stateRef = useRef(state);
  stateRef.current = state;   // always the latest committed state, for callbacks that must not close over a stale copy
  // Run 13: bills an older app version removed (worked out once, from the data as loaded, against the mirror kept on disk).
  // While the offer is open the mirror is not rewritten, so ignoring the banner never loses the bills; restoring, or
  // choosing "No thanks", closes it and the mirror then follows the ledger again.
  const [restoreOffer] = useState(() => planBillRestore(state.bills, state.transactions, readBillsMirror()));
  const [restoreClosed, setRestoreClosed] = useState(false);
  const restoreOpen = !!restoreOffer && !restoreClosed && restoreOffer.bills.some(b=>!(state.bills||[]).some(x=>x.id===b.id));
  useSheetGestures();
  // Dismissing the backup reminder hides it for this visit only; it is worked out from the saved state on every render.
  const [backupDismissed, setBackupDismissed] = useState(false);
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
  const showToast=useCallback((msg,ms=1800)=>{ clearTimeout(toastTimer.current); setToast(msg); toastTimer.current=setTimeout(()=>setToast(null),ms); },[]);
  // Undo snackbars (Run 8): a snackbar of the same kind replaces the open one (more deletions share one "N deleted" undo);
  // a different kind waits until the open one's undo window ends, so an undo is never silently taken away.
  const snackQueue=useRef([]), snackKind=useRef(null);
  const openSnack=useCallback(({msg,onUndo,ms,kind})=>{
    clearTimeout(snackTimer.current);
    setSnackbar({msg,onUndo}); snackActive.current=true; snackKind.current=kind;
    snackTimer.current=setTimeout(()=>closeSnack(),ms);
  },[]);
  const closeSnack=useCallback(()=>{
    clearTimeout(snackTimer.current); setSnackbar(null); snackActive.current=false; snackKind.current=null;
    const next=snackQueue.current.shift(); if (next) setTimeout(()=>openSnack(next),250);
  },[]);
  const showSnackbar=useCallback((msg,onUndo,ms=4000,kind="other")=>{
    // Run 16: the undo after ADDING an entry is the least important one. It gives way at once to any other undo (a delete, an
    // import ...) instead of making that one wait, and it never waits behind another undo: a plain message is shown instead.
    if (snackActive.current && snackKind.current==="add" && kind!=="add") { openSnack({msg,onUndo,ms,kind}); return; }
    if (kind==="add" && snackActive.current && snackKind.current!=="add") { showToast(msg); return; }
    if (snackActive.current && snackKind.current!==kind) { snackQueue.current.push({msg,onUndo,ms,kind}); return; }
    openSnack({msg,onUndo,ms,kind});
  },[showToast]);

  const switchTab=useCallback((t)=>{ setTab(t); setTabKey(k=>k+1); },[]);
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
      switchTab(ORDER[j]); window.scrollTo(0,0);
    };
    const reset=()=>{ s=null; };
    document.addEventListener("touchstart",onStart,{ passive:true }); document.addEventListener("touchmove",onMove,{ passive:true });
    document.addEventListener("touchend",onEnd,{ passive:true }); document.addEventListener("touchcancel",reset,{ passive:true });
    return ()=>{ document.removeEventListener("touchstart",onStart); document.removeEventListener("touchmove",onMove);
      document.removeEventListener("touchend",onEnd); document.removeEventListener("touchcancel",reset); };
  },[switchTab]);

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
    const { billChoice, wallet, ...data }=txn, id=Date.now()+Math.random();
    // Run 16: adding can be undone for a few seconds (deleting always could). Undo restores the whole earlier state, including a
    // bill the entry may have created, and refuses if something else changed in the meantime, like the other undo windows.
    const before=stateRef.current;
    const next=withBill({...before,transactions:[{...data,...(walletId(wallet)?{wallet:walletId(wallet)}:{}),id,createdAt:new Date().toISOString()},...before.transactions]},id,billChoice);
    setState(next);
    showSnackbar(t("toast.recorded"),()=>{ if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; } setState(before); },6000,"add");
  },[showToast,showSnackbar]);

  // Run 17: a loan payment marked paid adds one plain expense and returns its id (so the payment record can point at it); removing
  // the record removes that entry again. No undo window here: the confirmation on the Debts page already asked.
  const addLoanEntry=useCallback((data)=>{
    const id=Date.now()+Math.random();
    setState(s=>({...s,transactions:[{...data,id,createdAt:new Date().toISOString()},...s.transactions]}));
    return id;
  },[]);
  const removeLoanEntry=useCallback((id)=>setState(s=>({...s,transactions:s.transactions.filter(t=>t.id!==id)})),[]);

  const updateTransaction=useCallback((id,txn)=>{
    const { billChoice, wallet, ...data }=txn;
    // Run 16: the wallet is replaced or removed with the rest of the edit (an empty wallet clears it; no empty text is stored).
    setState(s=>withBill({...s,transactions:s.transactions.map(t=>{ if (t.id!==id) return t; const { wallet:_w, ...rest }=t; return { ...rest, ...data, ...(walletId(wallet)?{wallet:walletId(wallet)}:{}) }; })},id,billChoice));
    showToast(t("toast.updated"));
  },[showToast]);

  const deleteTransaction=useCallback((id)=>{
    const removed=stateRef.current.transactions.find(t=>t.id===id);
    if (!removed) return;
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
  },[showSnackbar]);

  // ── Run 12: explicit bills ──
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
    setPrefill(prefillData); setEditId(existingId); setShowAdd(true);
  },[]);
  const closeAdd=useCallback(()=>{ setShowAdd(false); setPrefill(null); setEditId(null); },[]);

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
  const [installEvt, setInstallEvt] = useState(null);
  useEffect(()=>{
    const onBip=(e)=>{ e.preventDefault(); setInstallEvt(e); };
    const onInstalled=()=>{ setInstallEvt(null); askProtection(true); };
    window.addEventListener("beforeinstallprompt",onBip); window.addEventListener("appinstalled",onInstalled);
    return ()=>{ window.removeEventListener("beforeinstallprompt",onBip); window.removeEventListener("appinstalled",onInstalled); };
  },[askProtection]);

  const exportCSV=useCallback(async ()=>{
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
  const exportJSON=useCallback(()=>{
    if (nativeShareHook()) { shareBackupRef.current?.(); return; }   // Run 13: native shell → the hand-over, never a dead download link
    const now=new Date().toISOString();
    downloadFile(JSON.stringify(buildBackup({...state,subcategories:readSubcats(),debtData:readDebts()},now),null,2),"application/json",`ledger-backup-${today()}.json`);
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
    const r=await shareBackupFile(JSON.stringify(buildBackup({...state,subcategories:readSubcats(),debtData:readDebts()},now),null,2),`ledger-backup-${today()}.json`);
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
    reader.onload=e=>{
      const plan=planImport(String(e.target.result||""), file.name||"");
      if (!plan.ok) { setImportPending({ error:plan.error, filename:file.name }); return; }
      setSkipDup(true);
      setImportPending({ ...plan, dupCount:countSuspectedDuplicates(stateRef.current.transactions, plan.transactions) });
    };
    reader.readAsText(file);
  },[]);

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
    const next=applyImport(before, plan, mode, { skipDuplicates:skipDup && plan.dupCount>0 });
    setState(next);
    // Run 16: the file's own-subcategory suggestions are added to the ones on this phone (union; nothing is overwritten or removed).
    if (plan.subcategories && Object.keys(plan.subcategories).length) writeSubcats(mergeSubcats(readSubcats(),plan.subcategories));
    // Run 17: debts and loans from the file are added by id (what is already on this phone is never overwritten).
    if (plan.debtData && (plan.debtData.debts.length || plan.debtData.loans.length)) writeDebts(mergeDebtData(readDebts(),plan.debtData));
    setImportPending(null);
    const delta=next.transactions.length-before.transactions.length;
    showSnackbar(settingsOnly ? t("import.settingsApplied") : mode==="replace" ? tn("import.replaced",plan.transactions.length) : tn("import.added",delta), ()=>{
      // Undo only if nothing has changed since; otherwise it would erase newer work.
      if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; }
      setState(before);
    }, 8000, "import");
  },[importPending,skipDup,showToast,showSnackbar]);

  const {transactions,budgets,templates,currency,goals,safeToSpend}=state; const bills=state.bills||[];
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
        {toast&&<div className="toast" role="status">{toast}</div>}
        {snackbar&&(
          <div className="snackbar" role="status">
            <span>{snackbar.msg}</span>
            <button className="snackbar-undo" onClick={()=>{snackbar.onUndo?.();closeSnack();}}>{t("common.undo")}</button>
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
        {!backupDismissed&&(tab==="home"||tab==="io")&&backupReminder==="due"&&transactions.length>0&&(
          <div className="backup-banner backup-reminder" role="alert">
            <span>{t("banner.backupDue")}</span>
            <button className="backup-banner-btn" onClick={exportJSON}>{t("banner.backUpNow")}</button>
            <button className="backup-dismiss" onClick={()=>setBackupDismissed(true)} aria-label={t("common.dismiss")}>×</button>
          </div>
        )}
        {!backupDismissed&&(tab==="home"||tab==="io")&&backupReminder==="confirm"&&transactions.length>0&&(
          <div className="backup-banner backup-reminder" role="status">
            <span>{t("banner.backupConfirm")}</span>
            <button className="backup-banner-btn" onClick={()=>{ setState(s=>({...s,backupConfirmedAt:new Date().toISOString()})); showToast(tn("banner.confirmThanks",BACKUP_REMINDER_DAYS)); }}>{t("banner.haveFile")}</button>
            <button className="backup-dismiss" onClick={()=>setBackupDismissed(true)} aria-label={t("common.dismiss")}>×</button>
          </div>
        )}

        <header className="topbar">
          {SUBPAGE_PARENT[tab]
            ? <div className="topbar-back">
                <button className="topbar-btn" onClick={()=>switchTab(SUBPAGE_PARENT[tab])} aria-label={t("common.back")} title={t("common.back")}><Icon name="chevLeft" size={22}/></button>
                <h1 className="wordmark">{t(tab==="io"?"io.title":tab==="debts"?"debt.title":"rec.title")}</h1>
              </div>
            : <h1 className="wordmark">{tab==="home"?t(greetingKey())+(state.profileName?", "+state.profileName:""):tab==="goals"?t("goals.pageTitle"):t("nav."+tab)}</h1>}
          <div className="topbar-right">
            <button className={`topbar-btn privacy-toggle${privacy?" on":""}`} aria-pressed={privacy} aria-label={t(privacy?"privacy.show":"privacy.hide")} title={t(privacy?"privacy.show":"privacy.hide")}
              onClick={()=>{ setPrivacy(p=>!p); showToast(t(privacy?"privacy.offToast":"privacy.onToast")); }}><Icon name={privacy?"eyeOff":"eye"} size={20}/></button>
          </div>
        </header>

        <main className="page" key={tabKey}>
          {tab==="home"      && <HomePage transactions={transactions} bills={bills} budgets={budgets} templates={templates} currency={currency} safeToSpend={safeToSpend} goals={goals} onAdd={()=>openAdd()} onTemplate={tpl=>openAdd({type:"expense",amount:tpl.amount,category:tpl.catId,subcategory:tpl.subcat||"",merchant:tpl.merchant||"",note:tpl.note||tpl.name,recurring:false,recurFreq:null})} onView={txn=>setViewTxn(txn)} onOpenLedger={()=>switchTab("ledger")} onInfo={setInfoKind}/>}
          {tab==="ledger"    && <LedgerPage transactions={transactions} currency={currency} onDelete={deleteTransaction} onEdit={txn=>openAdd(txn,txn.id)} onView={txn=>setViewTxn(txn)} onAdd={()=>openAdd()}/>}
          {tab==="monthly"   && <MonthlyView transactions={transactions} currency={currency} budgets={budgets} bills={bills} onView={txn=>setViewTxn(txn)}/>}
          {tab==="goals"     && <BudgetsGoalsPage state={state} showToast={showToast} seg={goalsSeg} onSeg={setGoalsSeg} addSignal={goalsAdd}
            onSetBudget={(catId,amount)=>setState(s=>({...s,budgets:{...s.budgets,[catId]:amount}}))}
            onAddGoal={g=>setState(s=>({...s,goals:[...s.goals,{...g,id:"g"+Date.now()}]}))}
            onUpdateGoal={(id,patch)=>setState(s=>({...s,goals:s.goals.map(g=>g.id===id?{...g,...patch}:g)}))}
            onDeleteGoal={id=>setState(s=>({...s,goals:s.goals.filter(g=>g.id!==id)}))}
            onAddTemplate={tpl=>setState(s=>({...s,templates:[...s.templates,{...tpl,id:"t"+Date.now()}]}))}
            onDeleteTemplate={id=>setState(s=>({...s,templates:s.templates.filter(t=>t.id!==id)}))}
            onSafeToSpendChange={cfg=>setState(s=>({...s,safeToSpend:{...s.safeToSpend,...cfg}}))}/>}
          {tab==="more"      && <MorePage language={state.language} profileName={state.profileName||""} onLanguageChange={changeLanguage} onProfileName={changeProfileName} onOpen={switchTab} onSettings={()=>setShowSettings(true)} onInfo={setInfoKind} version={runningVersion}/>}
          {tab==="recurring" && <RecurringHub transactions={transactions} bills={bills} currency={currency} onView={txn=>setViewTxn(txn)} onToggleSchedule={toggleScheduleActive}
            onConvert={convertBills} onEditBill={b=>setEditBill(b)} onToggleBill={toggleBill}
            onRecordPayment={x=>openAdd({ type:x.type, amount:x.amount, category:x.category, subcategory:x.subcategory, merchant:x.merchant, note:x.note, recurring:true, recurFreq:x.freq, billId:x.billId||undefined })}/>}
          {tab==="debts"     && <DebtsPage currency={currency} onAddEntry={addLoanEntry} onRemoveEntry={removeLoanEntry} showToast={showToast}/>}
          {tab==="io"        && <ImportExportPage state={state} onExportCSV={exportCSV} onExportJSON={exportJSON} onImportFile={importFile}
            onShareBackup={shareBackup} protection={protection} onProtect={()=>askProtection(true)}
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
          return a && <button className="fab-add" onClick={a.run} aria-label={a.label} title={a.label}><Icon name="add" size={26} color="var(--on-accent)"/></button>; })()}

        {showAdd&&(
          <AddEditOverlay templates={templates} currency={currency} transactions={transactions} bills={bills} prefill={prefill} editId={editId} merchantMemory={merchantMemory}
            onSave={txn=>{ editId?updateTransaction(editId,txn):addTransaction(txn); closeAdd(); }} onClose={closeAdd}/>
        )}
        {infoKind&&<InfoSheet kind={infoKind} onClose={()=>setInfoKind(null)}/>}
        {showSettings&&(
          <SettingsSheet state={state}
            onCurrencyChange={c=>setState(s=>({...s,currency:c}))}
            onSafeToSpendChange={cfg=>setState(s=>({...s,safeToSpend:{...s.safeToSpend,...cfg}}))}
            onClose={()=>setShowSettings(false)} showToast={showToast}/>
        )}
        {importPending&&(
          <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&setImportPending(null)}>
            <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1}aria-label={t("import.dialogLabel")}>
              <div className="sheet-grip"><div className="sheet-handle"/></div>
              <div className="sheet-title">{t("import.title")}</div>
              {importPending.error?(
                <>
                  <div role="alert" style={{background:"var(--neg-bg)",color:"var(--neg)",borderRadius:8,padding:"12px 14px",marginBottom:16,fontSize:13,lineHeight:1.55}}>{importPending.error}</div>
                  <button className="btn btn-primary btn-full" style={{marginTop:0}} onClick={()=>setImportPending(null)}>{t("common.ok")}</button>
                </>
              ):(
                <>
                  <div style={{background:"var(--bg-warm)",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:4,overflowWrap:"anywhere"}}>{importPending.filename}</div>
                    <div style={{fontSize:12,color:"var(--ink-3)"}}>{tn("import.ready",importPending.transactions.length)}</div>
                    {importPending.skippedCount>0&&<div style={{fontSize:12,color:"var(--warn)",marginTop:4}}>{tn("import.skipped",importPending.skippedCount,{summary:importPending.skippedSummary})}</div>}
                    {importPending.problems.map((m,i)=><div key={"p"+i} style={{fontSize:12,color:"var(--warn)",marginTop:4}}>{m}</div>)}
                    {importPending.warnings.map((m,i)=><div key={"w"+i} style={{fontSize:12,color:"var(--ink-3)",marginTop:4}}>{m}</div>)}
                  </div>
                  <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.55,marginBottom:12}}>
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
                  {importPending.dupCount>0&&(
                    <label style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:12,color:"var(--ink-2)",marginBottom:14,lineHeight:1.45}}>
                      <input type="checkbox" checked={skipDup} onChange={e=>setSkipDup(e.target.checked)} style={{marginTop:2}}/>
                      <span>{t("import.skipDup",{n:importPending.dupCount})}</span>
                    </label>
                  )}
                  <button className="btn btn-primary btn-full" style={{marginTop:0}} onClick={()=>commitImport("merge")}>{t("import.mergeBtn")}</button>
                  {importPending.canReplace
                    ? <button className="btn btn-ghost btn-full" style={{marginTop:8,color:"var(--neg)",borderColor:"var(--neg-bg)"}} onClick={()=>commitImport("replace")}>{t("import.replaceBtn")}</button>
                    : Object.keys(importPending.settings||{}).length>0
                      ? <button className="btn btn-ghost btn-full import-settings-only" style={{marginTop:8}} onClick={()=>commitImport("settings")}>{t("import.settingsOnlyBtn")}</button>
                      : null}
                  <button className="btn btn-ghost btn-full" onClick={()=>setImportPending(null)}>{t("common.cancel")}</button>
                </>
              )}
            </div>
          </div>
        )}
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

// ─────────────────────────────────────────────────────────────────────────────
// FIRST LAUNCH — choose the interface language. Native radio buttons: nothing is preselected, arrow keys move between
// the options, and Continue stays disabled until one is chosen. The three options look identical (no flags), and the
// texts around them are shown in all three languages until a choice is made.
// ─────────────────────────────────────────────────────────────────────────────
function LanguageChooser({ onChoose }) {
  const [sel,setSel]=useState(null);
  const inEach=(key)=>LANGS.map(l=><span key={l} lang={l} className="lang-line">{tIn(l,key)}</span>);
  return (
    <div className="lang-screen">
      <form className="lang-box" onSubmit={e=>{ e.preventDefault(); if (sel) onChoose(sel); }}>
        <div className="wordmark lang-mark">Expense Ledger</div>
        <fieldset className="lang-set">
          <legend className="lang-title">{sel ? <span lang={sel}>{tIn(sel,"lang.title")}</span> : inEach("lang.title")}</legend>
          {LANGS.map(l=>(
            <label key={l} className={`lang-opt${sel===l?" sel":""}`} lang={l}>
              <input type="radio" name="ui-language" value={l} checked={sel===l} onChange={()=>setSel(l)}/>
              <span className="lang-name">{LANG_NAMES[l]}</span>
              <span className="lang-mark-sel" aria-hidden="true"/>
            </label>
          ))}
        </fieldset>
        <button type="submit" className="btn btn-primary btn-full lang-continue" disabled={!sel} lang={sel||undefined}>
          {sel ? tIn(sel,"lang.continue") : LANGS.map(l=>tIn(l,"lang.continue")).join(" · ")}
        </button>
        <p className="lang-hint">{sel ? <span lang={sel}>{tIn(sel,"lang.hint")}</span> : inEach("lang.hint")}</p>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// S2: HOME PAGE — Financial hierarchy
// Level 1: Where am I? (position)
// Level 2: Am I on track? (pace)
// Level 3: What changed? (compact)
// Level 4: What's coming? (recurring preview)
// Level 5: What am I working toward? (goals)
// Level 6: Raw data (recent activity)
// ─────────────────────────────────────────────────────────────────────────────
// Amounts dated later in the month: shown, but kept apart from what has been spent or received so far.
function PlannedNote({ plannedExp, plannedInc, currency, style }) {
  if (!(plannedExp>0) && !(plannedInc>0)) return null;
  return (
    <div className="planned-note" style={{fontSize:12,color:"var(--ink-3)",lineHeight:1.5,...style}}>
      {plannedExp>0&&<div>{t("month.plannedExp",{amount:fmt(plannedExp,currency)})}</div>}
      {plannedInc>0&&<div>{t("month.plannedInc",{amount:fmt(plannedInc,currency)})}</div>}
    </div>
  );
}

// Comparison sentences (Run 7, V1/V9). They name the window ("the same days last month" / "the previous month") instead of
// slotting a short month name into a sentence, which read as a word in Azerbaijani ("sen ilə müqayisədə").
function cmpText(diff, kind, currency) {
  const key=diff<=0 ? (kind==="same"?"cmp.lessSame":"cmp.lessFull") : (kind==="same"?"cmp.moreSame":"cmp.moreFull");
  return t(key,{ amount:fmt(Math.abs(diff),currency) });
}
const cmpTitle = (kind) => t(kind==="same" ? "cmp.titleSame" : "cmp.titleFull");
const cmpPrev  = (kind, amount, currency) => t(kind==="same" ? "cmp.prevSame" : "cmp.prevFull", { amount:fmt(amount,currency) });

function HomePage({ transactions, bills=[], budgets, templates, currency, safeToSpend, goals, onAdd, onTemplate, onView, onOpenLedger, onInfo }) {
  const now=curMon(), prv=prevMon();
  const { curExp,curInc,prevExp,momDiff,surplusRate,plannedExp,plannedInc,cmpKind }=calcMonthSummary(transactions,now,prv);
  const catSpend    =calcCategorySpend(transactions,now);
  const budgetTotal =Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const spentToDate =calcSpentToDate(transactions,now);
  const paceInfo    =calcSpendingPace(spentToDate,now,budgetTotal);
  const safeInfo   =calcSafeToSpend(transactions,safeToSpend,goals,new Date(),bills);
  const wc          =calcWhatChanged(transactions,now,prv);
  const hasIncome   =curInc>0;

  // Upcoming recurring (due within 7 days)
  const upcomingSchedules=useMemo(()=>{
    const nowD=new Date();
    return buildSchedules(transactions,bills).filter(x=>x.isActive&&x.type==="expense")
      .map(x=>({...x,nextDue:scheduleNextDue(x,transactions,nowD)}))
      .filter(x=>x.nextDue&&daysBetween(nowD,x.nextDue)<=7)
      .sort((a,b)=>a.nextDue-b.nextDue);
  },[transactions,bills]);

  return (
    <div>
      {/* LEVEL 1 (redesign order): Safe to Spend first, then this month's position, then what is due soon. */}
      <SafeToSpendCard safeToSpend={safeToSpend} safeInfo={safeInfo} currency={currency} now={now}/>
      <div className="hero card" data-section="home-month">
        <div className="card-head"><span className="card-title">{t("home.thisMonth")}</span><span className="hero-eyebrow">{monthName(now)}</span></div>
        <div className="hero-amount">{fmt(curExp,currency)}</div>
        <div className="hero-sub">
          <span>{t("home.spentThisMonth")}</span>
          {momDiff!==null&&(
            <span className={`mom-badge ${momDiff<=0?"better":"worse"}`}>
              <Icon name={momDiff<=0?"arrowDown":"arrowUp"} size={10}/>
              {cmpText(momDiff,cmpKind,currency)}
            </span>
          )}
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className={`hero-stat-val${curInc>0?" pos":""}`}>{fmtShort(curInc,currency)}</div>
            <div className="hero-stat-lbl">{t("home.income")}</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val neg">{fmtShort(curExp,currency)}</div>
            <div className="hero-stat-lbl">{t("home.spent")}</div>
          </div>
          <div className="hero-stat">
            {hasIncome?(
              <><div className={`hero-stat-val${(surplusRate||0)>=20?" pos":(surplusRate||0)<0?" neg":""}`}>{fmtPct(surplusRate??0)}</div><div className="hero-stat-lbl">{t("surplus."+surplusLabel(curInc,curExp))}</div></>
            ):(
              <><div className={`hero-stat-val${curInc>curExp?" pos":curInc<curExp?" neg":""}`}>{curInc<curExp?"−":""}{fmtShort(Math.abs(curInc-curExp),currency)}</div><div className="hero-stat-lbl">{t("home.balance")}</div></>
            )}
          </div>
        </div>
        <PlannedNote plannedExp={plannedExp} plannedInc={plannedInc} currency={currency} style={{marginTop:10}}/>
        {curExp>0&&<div data-section="home-breakdown">
          <div className="card-sub-title">{t("home.breakdown")}</div>
          <SpendDonut catSpend={catSpend} total={curExp} currency={currency}/>
        </div>}
      </div>

      {/* Due within 7 days */}
      {upcomingSchedules.length>0&&(
        <div className="card section-enter section-enter-1" data-section="home-upcoming">
          <div className="card-head"><span className="card-title">{t("home.dueWithin7")}</span></div>
          {upcomingSchedules.slice(0,3).map(s=>{
            const daysLeft=daysBetween(new Date(),s.nextDue); const cat=CAT(s.category);
            return (
              <div key={s.key} className="up-row">
                <span className="cat-dot" style={{background:(cat?.color||"#98A5B7")+"26"}}><CatIcon catId={s.category} size={16}/></span>
                <div className="up-body">
                  <div className="list-title">{maskText(s.merchant||s.note)||catName(s.category)}</div>
                  <div className="list-sub">{fmtDate(localDateStr(s.nextDue))} · {catName(s.category)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div className="up-amt">{fmt(s.amount,currency)}</div>
                  <div style={{fontSize:11,color:daysLeft<=1?"var(--warn)":"var(--ink-3)",fontWeight:600}}>{daysLeft===0?t("date.today"):daysLeft===1?t("date.tomorrow"):t("date.inDays",{n:daysLeft})}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Smart Helper — deterministic advice cards */}
      <div className="section-enter section-enter-2" data-section="home-coach">
        <SmartHelper transactions={transactions} bills={bills} budgets={budgets} goals={goals} safeToSpend={safeToSpend} currency={currency}/>
      </div>
      <HomeDetails hasTxns={transactions.length>0} onAdd={onAdd} onOpenLedger={onOpenLedger} onInfo={onInfo}/>
    </div>
  );
}

// The Safe to Spend card and its note (redesign: shown first on Home). A separate function only to keep HomePage readable.
function SafeToSpendCard({ safeToSpend, safeInfo, currency, now }) {
  // Run 9: the number first; the explanation (what was deducted and why) opens on tap — it is long and pushed the month
  // summary and upcoming bills out of the first screen.
  const [open,setOpen]=useState(false);
  return (
    <>
      {safeToSpend?.enabled&&safeInfo.feasible&&(
        <div className="safe-card section-enter section-enter-2" data-section="home-safe">
          <div className="label-sm" style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <Icon name="safe" size={12} color="var(--ink-3)"/>{t("safe.title")}
          </div>
          <div className="safe-amount" style={{color:safeInfo.remaining>=0?"var(--ink)":"var(--neg)"}}>
            {fmt(safeInfo.remaining,currency)}
          </div>
          {safeInfo.daysRemaining>0&&(
            <div className="safe-daily">
              {safeInfo.remaining>0?t("safe.perDay",{amount:fmt(safeInfo.dailyAllowance,currency)}):""}
              {tn("safe.daysLeft",safeInfo.daysRemaining,{month:monthShort(now)})}
            </div>
          )}
          <button className="safe-toggle" aria-expanded={open} aria-controls="safe-breakdown" onClick={()=>setOpen(o=>!o)}>
            {t(open?"safe.hideHow":"safe.showHow")}<Icon name={open?"chevDown":"chevRight"} size={14}/>
          </button>
          {open&&<div id="safe-breakdown">
          {/* Four explicit lines — planning engine, not just a number */}
          <div style={{marginTop:10,borderTop:"1px solid var(--rule)",paddingTop:8}}>
            <div className="safe-row">
              <span className="safe-lbl">{t("safe.incomeReceived")}</span>
              <span className="safe-val">{fmt(safeInfo.curInc,currency)}</span>
            </div>
            {safeInfo.expectedInc>0&&(
              <div className="safe-row">
                <span className="safe-lbl">{t("safe.expectedLater")}</span>
                <span className="safe-val" style={{color:"var(--ink-4)"}}>{fmt(safeInfo.expectedInc,currency)}</span>
              </div>
            )}
            {/* Fix 4: Show goal contributions if they exceed manual savings target */}
            {safeInfo.goalContributionActive?(
              <div className="safe-row">
                <span className="safe-lbl">{t("safe.goalContributions")}</span>
                <span className="safe-val" style={{color:"var(--ink-3)"}}>−{fmt(safeInfo.goalContributions,currency)}</span>
              </div>
            ):safeInfo.effectiveSavingsTarget>0&&(
              <div className="safe-row">
                <span className="safe-lbl">{t("safe.savingsTarget")}</span>
                <span className="safe-val" style={{color:"var(--ink-3)"}}>−{fmt(safeInfo.effectiveSavingsTarget,currency)}</span>
              </div>
            )}
            <div className="safe-row">
              <span className="safe-lbl">{t("safe.recordedSpend")}</span>
              <span className="safe-val" style={{color:"var(--neg)"}}>−{fmt(safeInfo.curExp,currency)}</span>
            </div>
            {/* Part of the row above, not a further deduction: expenses entered for later this month are set aside, not spent. */}
            {safeInfo.laterExp>0&&(
              <div className="safe-row">
                <span className="safe-lbl">{t("safe.laterExpenses")}</span>
                <span className="safe-val" style={{color:"var(--ink-4)"}}>{fmt(safeInfo.laterExp,currency)}</span>
              </div>
            )}
            {/* De-emphasised by colour (still ≥ 4.5:1), not by opacity: at 40% opacity this row was 1.8:1 and hard to read. */}
            <div className="safe-row">
              <span className="safe-lbl" style={safeInfo.futureCommitments>0?undefined:{color:"var(--ink-4)"}}>{t("safe.upcoming")}</span>
              <span className="safe-val" style={{color:safeInfo.futureCommitments>0?"var(--warn)":"var(--ink-4)"}}>
                {safeInfo.futureCommitments>0?`−${fmt(safeInfo.futureCommitments,currency)}`:t("safe.noneThisMonth")}
              </span>
            </div>
            <div className="safe-row" style={{borderBottom:"none",paddingTop:6,marginTop:2,borderTop:"1px solid var(--rule)"}}>
              <span className="safe-lbl" style={{fontWeight:700,color:"var(--ink)"}}>{t("safe.discretionary")}</span>
              <span className="safe-val" style={{color:safeInfo.remaining>=0?"var(--pos)":"var(--neg)",fontSize:13}}>
                {safeInfo.remaining>=0?"+":""}{fmt(safeInfo.remaining,currency)}
              </span>
            </div>
            {/* Explain which is driving the deduction */}
            {safeInfo.goalContributionActive&&safeInfo.savingsTarget>0&&(
              <div style={{fontSize:10,color:"var(--ink-4)",marginTop:4,fontStyle:"italic"}}>
                {t("safe.goalsExceedFloor",{ goals:fmt(safeInfo.goalContributions,currency), floor:fmt(safeInfo.savingsTarget,currency) })}
              </div>
            )}
          </div>
          <div className="safe-note">
            {t("safe.noteIncome")}{" "}
            {safeInfo.scheduleCount>0&&t("safe.noteSchedules",{ up:safeInfo.upcomingCount, un:safeInfo.unrecordedCount, s:safeInfo.scheduleCount, payments:tn("unit.payments",safeInfo.upcomingCount+safeInfo.unrecordedCount), schedules:tn("unit.schedules",safeInfo.scheduleCount) })}
          </div>
          </div>}
          {/* Always visible, open or not: without recurring bills the number is optimistic, and the user must not have to tap to learn that. */}
          {safeInfo.scheduleCount===0&&<div className="safe-note safe-caveat" role="note">{t("safe.noteNoRecurring")}</div>}
        </div>
      )}

      {/* Safe to Spend is on but no income has arrived yet this month: say so instead of showing nothing. */}
      {safeToSpend?.enabled&&!safeInfo.feasible&&(
        <div className="safe-card section-enter section-enter-2" role="status" data-section="home-safe">
          <div className="label-sm" style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
            <Icon name="safe" size={12} color="var(--ink-3)"/>{t("safe.title")}
          </div>
          <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.5}}>
            {t("safe.waiting")}{safeInfo.expectedInc>0?" "+t("safe.waitingExpected",{ amount:fmt(safeInfo.expectedInc,currency) }):""}
          </div>
        </div>
      )}
    </>
  );
}

// The rest of Home. Run 15: Home is the quick answer, not a second ledger. The full Goals and Budgets lists and the long
// recent-transactions list were removed from here: each lives in its own tab (Goals, Transactions), and the coach cards above
// still raise a goal or budget only when it needs attention. With entries, one route leads to the full list; without, the empty state.
function HomeDetails({ hasTxns, onAdd, onOpenLedger, onInfo }) {
  return hasTxns?(
    <div className="section-enter section-enter-8" data-section="home-see-all">
      <button className="btn btn-ghost btn-full" onClick={onOpenLedger}>{t("home.seeAll")}<Icon name="chevRight" size={14}/></button>
    </div>
  ):(
    <div className="empty section-enter section-enter-8" data-section="home-empty">
      <div className="empty-icon"><Icon name="list" size={30}/></div>
      <div className="empty-title">{t("home.emptyTitle")}</div>
      <div className="empty-body">{t("home.emptyBody")}</div>
      <button className="btn btn-primary btn-full" style={{maxWidth:220,marginTop:4}} onClick={onAdd}>{t("home.emptyBtn")}</button>
      <button className="btn btn-ghost btn-full" data-section="home-how" style={{maxWidth:220,marginTop:8}} onClick={()=>onInfo&&onInfo("how")}>{t("home.howBtn")}</button>
    </div>
  );
}

// ─── Shared transaction components ───────────────────────────────────────────
function GroupedTxns({ txns, currency, onDelete, onEdit, onView, compact }) {
  const groups=useMemo(()=>{
    const g={}; txns.forEach(t=>{ (g[t.date]=g[t.date]||[]).push(t); });
    return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]));
  },[txns]);
  return (
    <>
      {groups.map(([date,rows])=>{
        const dayTotal=rows.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
        return (
          <div key={date} className="txn-group">
            <div className="txn-date-hdr">
              <span className="txn-date-lbl">{fmtDate(date)}</span>
              {dayTotal>0&&<span className="txn-date-total">{fmt(dayTotal,currency)}</span>}
            </div>
            <div className="txn-list">
              {rows.map(t=><TxnRow key={t.id} txn={t} currency={currency} onDelete={onDelete} onEdit={onEdit} onView={onView} compact={compact}/>)}
            </div>
          </div>
        );
      })}
    </>
  );
}

function TxnRow({ txn, currency, onDelete, onEdit, onView, compact }) {
  const cat=CAT(txn.category);
  const isInc=txn.type==="income";
  const displayName=maskText(txn.merchant||txn.note)||catName(txn.category);
  const displaySub=[
    txn.merchant&&txn.note?maskText(txn.note):null,
    catName(txn.category),
    subName(txn.subcategory)||null,
    txn.wallet?walletName(txn.wallet):null,
    !compact?fmtDate(txn.date):null,
  ].filter(Boolean).join(" · ");
  return (
    <div className="txn-row" onClick={()=>onView?.(txn)} {...(onView ? { role:"button", tabIndex:0, onKeyDown:activateKey(()=>onView(txn)) } : {})}>
      <div className="txn-ico" style={{background:(cat?.color||"#98A5B7")+"26"}}><CatIcon catId={txn.category} size={16} color={cat?.color}/></div>
      <div className="txn-body">
        <div className="txn-name">{displayName}</div>
        <div className="txn-sub">
          <span>{displaySub}</span>
          {txn.recurring&&<span className="rec-pill"><Icon name="repeat" size={9}/>{txn.recurFreq?t("freq."+txn.recurFreq):""}</span>}
        </div>
      </div>
      <div className="txn-right">
        <div className={`txn-amt ${isInc?"inc":"exp"}`}>{isInc?"+":"−"}{fmt(txn.amount,currency)}</div>
        {(onEdit||onDelete)&&!onView&&(
          <div className="txn-actions">
            {onEdit&&<button className="txn-act" onClick={e=>{e.stopPropagation();onEdit(txn);}} aria-label={t("common.edit")}><Icon name="edit" size={13}/></button>}
            {onDelete&&<button className="txn-act del" onClick={e=>{e.stopPropagation();onDelete(txn.id);}} aria-label={t("common.delete")}><Icon name="trash" size={13}/></button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ledger Page ──────────────────────────────────────────────────────────────
function LedgerPage({ transactions, currency, onDelete, onEdit, onView, onAdd }) {
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter,  setCatFilter]  = useState("all");
  const [walletFilter, setWalletFilter] = useState("all");   // Run 16: "all", a wallet id, or "none" (entries without one)
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [showDates,  setShowDates]  = useState(false);
  const [showCatSheet, setShowCatSheet] = useState(false);

  const filtered=useMemo(()=>{
    let list=[...transactions];                       // not "t": that name is the translation function used below
    if (search) {
      const q=search.toLowerCase().trim(),asNum=parseFloat(q);
      list=list.filter(x=>{
        if ((x.note||"").toLowerCase().includes(q)) return true;
        if ((x.merchant||"").toLowerCase().includes(q)) return true;
        if (x.category.toLowerCase().includes(q)) return true;
        if ((x.subcategory||"").toLowerCase().includes(q)) return true;
        if (!isNaN(asNum)&&Math.abs(x.amount-asNum)<0.01) return true;
        if (x.date.includes(q)) return true;
        if (CAT(x.category)?.name.toLowerCase().includes(q)) return true;
        if (catName(x.category).toLowerCase().includes(q)) return true;                 // name in the interface language too
        if (subName(x.subcategory||"").toLowerCase().includes(q)) return true;
        const mn=parseLocalDate(x.date).toLocaleDateString("en-GB",{month:"long"}).toLowerCase();
        if (mn.includes(q)) return true;
        const mi=parseLocalDate(x.date).getMonth()+1;                                  // month names in the interface language
        if (t("mon."+mi).toLowerCase().includes(q) || t("monGen."+mi).toLowerCase().includes(q)) return true;
        return false;
      });
    }
    if (typeFilter!=="all") list=list.filter(x=>x.type===typeFilter);
    if (catFilter!=="all")  list=list.filter(x=>x.category===catFilter);
    if (walletFilter!=="all") list=list.filter(x=>(walletId(x.wallet)||"none")===walletFilter);
    if (dateFrom)           list=list.filter(x=>x.date>=dateFrom);
    if (dateTo)             list=list.filter(x=>x.date<=dateTo);
    return list;
  },[transactions,search,typeFilter,catFilter,walletFilter,dateFrom,dateTo,locale()]);
  // Run 16: the wallet filter is offered only when at least one entry has a wallet, and lists only the wallets in use.
  const usedWallets=useMemo(()=>[...new Set(transactions.map(x=>walletId(x.wallet)).filter(Boolean))],[transactions]);
  const hasUnsetWallet=useMemo(()=>transactions.some(x=>!walletId(x.wallet)),[transactions]);

  // The category list offers only categories used by the chosen type (Expenses / Income), and changing the type drops a
  // category filter that type has no transactions in, instead of leaving an empty list.
  const catsFor=(ty)=>[...new Set(transactions.filter(x=>ty==="all"||x.type===ty).map(x=>x.category))];
  const usedCats=useMemo(()=>catsFor(typeFilter).map(id=>CAT(id)).filter(Boolean),[transactions,typeFilter]);
  const chooseType=(ty)=>{ setTypeFilter(ty); if (catFilter!=="all" && !catsFor(ty).includes(catFilter)) setCatFilter("all"); };
  const hasCatFilter=catFilter!=="all",hasDateFilter=dateFrom||dateTo;
  const selectedCat=CAT(catFilter);

  if (transactions.length===0) return (
    <div className="empty">
      <div className="empty-icon"><Icon name="list" size={30}/></div>
      <div className="empty-title">{t("ledger.emptyTitle")}</div>
      <div className="empty-body">{t("ledger.emptyBody")}</div>
      <button className="btn btn-primary btn-full" style={{maxWidth:220,marginTop:4}} onClick={onAdd}>{t("ledger.emptyBtn")}</button>
    </div>
  );

  return (
    <div>
      <div className="search-wrap">
        <span className="search-ico"><Icon name="search" size={14}/></span>
        <input className="search-input" placeholder={t("ledger.searchPh")} value={search} onChange={e=>setSearch(e.target.value)} aria-label={t("ledger.search")}/>
      </div>
      <div className="filter-bar">
        {["all","expense","income"].map(ty=>(
          <button key={ty} className={`chip${typeFilter===ty?" on":""}`} aria-pressed={typeFilter===ty} onClick={()=>chooseType(ty)}>{t("ledger.type."+ty)}</button>
        ))}
        <button className={`cat-filter-btn${hasCatFilter?" active":""}`} onClick={()=>setShowCatSheet(true)}>
          {hasCatFilter?<><CatIcon catId={catFilter} size={12}/>{catName(catFilter)}</>:<><Icon name="filter" size={12}/>{t("ledger.category")}</>}
          <Icon name="chevDown" size={11}/>
        </button>
        <button className={`chip${(showDates||hasDateFilter)?" on":""}`} aria-pressed={!!(showDates||hasDateFilter)} onClick={()=>setShowDates(s=>!s)}>
          <Icon name="calendar" size={11}/> {t("ledger.date")}
        </button>
        {(hasCatFilter||hasDateFilter||typeFilter!=="all"||walletFilter!=="all")&&(
          <button className="chip on" style={{background:"var(--neg-bg)",borderColor:"var(--neg-bg)",color:"var(--neg)"}}
            onClick={()=>{setCatFilter("all");setDateFrom("");setDateTo("");setTypeFilter("all");setWalletFilter("all");}}>{t("ledger.clear")} ×</button>
        )}
      </div>
      {usedWallets.length>0&&(
        <div className="filter-bar" role="group" aria-label={t("wallet.filterLabel")} data-section="tx-wallet-filter">
          {["all",...usedWallets,...(hasUnsetWallet?["none"]:[])].map(w=>(
            <button key={w} className={`chip${walletFilter===w?" on":""}`} aria-pressed={walletFilter===w} onClick={()=>setWalletFilter(w)}>{w==="all"?t("wallet.filterAll"):w==="none"?t("wallet.none"):walletName(w)}</button>
          ))}
        </div>
      )}
      {showDates&&(
        <div className="date-inputs">
          <label className="date-input-wrap"><span className="date-lbl">{t("ledger.from")}</span><input type="date" lang={locale()} className="date-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label>
          <label className="date-input-wrap"><span className="date-lbl">{t("ledger.to")}</span><input type="date" lang={locale()} className="date-input" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label>
        </div>
      )}
      <div className="list-sub" style={{margin:"2px 2px 12px"}}>{t("ledger.countOf",{shown:filtered.length,total:transactions.length})}</div>
      {filtered.length===0?(
        <div className="empty" style={{padding:"36px 0"}}>
          <div className="empty-icon"><Icon name="search" size={28}/></div>
          <div className="empty-title">{t("ledger.noResults")}</div>
          <div className="empty-body">{t("ledger.noResultsBody")}</div>
        </div>
      ):(
        <GroupedTxns txns={filtered} currency={currency} onDelete={onDelete} onEdit={onEdit} onView={onView}/>
      )}
      {showCatSheet&&(
        <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&setShowCatSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1}aria-label={t("ledger.filterTitle")}>
            <div className="sheet-grip"><div className="sheet-handle"/></div>
            <div className="sheet-title">{t("ledger.filterTitle")}</div>
            {[{id:"all",color:"#98A5B7"},...usedCats].map(cat=>(
              <button key={cat.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",background:"none",border:"none",borderBottom:"1px solid var(--rule)",cursor:"pointer",width:"100%",textAlign:"left",font:"inherit"}}
                onClick={()=>{setCatFilter(cat.id==="all"?"all":cat.id);setShowCatSheet(false);}}>
                <div style={{width:34,height:34,borderRadius:8,background:(cat.color||"#98A5B7")+"26",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <CatIcon catId={cat.id} size={16} color={cat.color}/>
                </div>
                <span style={{fontSize:14,fontWeight:catFilter===cat.id?700:500,color:"var(--ink)",flex:1}}>{cat.id==="all"?t("ledger.allCategories"):catName(cat.id)}</span>
                {catFilter===cat.id&&<span style={{color:"var(--accent)",fontWeight:700,fontSize:12}} aria-label={t("common.selected")}>✓</span>}
              </button>
            ))}
            <button className="btn btn-ghost btn-full" style={{marginTop:14}} onClick={()=>setShowCatSheet(false)}>{t("common.close")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recurring Hub ────────────────────────────────────────────────────────────
// Run 12: the bill form — add a bill, or edit / pause / delete one. The due date is the user's: the bill is expected on it
// and then every week / two weeks / month / year (a day past a month's end falls on that month's last day).
// Deleting a bill keeps all its payments; they just stop pointing to it.
function BillSheet({ bill, currency, onSave, onDelete, onClose, showToast }) {
  const isNew=!bill;
  const [name,setName]=useState(bill?.name||""), [type,setType]=useState(bill?.type||"expense"), [amount,setAmount]=useState(bill?String(bill.amount):"");
  const [category,setCategory]=useState(bill?.category||"housing"), [freq,setFreq]=useState(bill?.freq||"monthly");
  const [anchor,setAnchor]=useState(bill?.anchorDate||today()), [active,setActive]=useState(bill?bill.active!==false:true);
  const cats=CATEGORIES.filter(c=>type==="income"?c.income:!c.income);
  const save=()=>{
    const b=validateBill({ id:bill?.id||"tmp", name, type, category:cats.some(c=>c.id===category)?category:cats[0].id, subcategory:bill?.subcategory||"",
      amount:formMoney(amount,{positive:true}), freq, anchorDate:anchor, ...(bill && anchor===bill.anchorDate && bill.dueDay ? { dueDay:bill.dueDay } : {}), active, createdAt:bill?.createdAt||new Date().toISOString() });
    if (!b) { showToast(t("bill.invalid"),3500); return; }
    onSave(isNew ? { ...b, id:null } : b);
  };
  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet bill-sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={t(isNew?"bill.add":"bill.edit")}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div className="sheet-title">{t(isNew?"bill.add":"bill.edit")}</div>
        <div className="type-toggle">
          {["expense","income"].map(ty=><button key={ty} className={`type-btn${type===ty?" active":""}`} aria-pressed={type===ty} onClick={()=>setType(ty)}>{t(ty==="income"?"add.income":"add.expense")}</button>)}
        </div>
        <div className="field"><label className="field-lbl" htmlFor="bill-name">{t("bill.name")}</label><input id="bill-name" className="field-input" value={name} maxLength={80} placeholder={t("bill.namePh")} onChange={e=>setName(e.target.value)}/></div>
        <div className="field-row">
          <div className="field"><label className="field-lbl" htmlFor="bill-amount">{t("add.amount")} ({currency})</label><input id="bill-amount" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} onChange={e=>setAmount(cleanMoneyText(e.target.value))}/></div>
          <div className="field"><label className="field-lbl" htmlFor="bill-freq">{t("add.frequency")}</label>
            <select id="bill-freq" className="field-input field-select" value={freq} onChange={e=>setFreq(e.target.value)}>{["weekly","biweekly","monthly","yearly"].map(f=><option key={f} value={f}>{t("freqCap."+f)}</option>)}</select></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="field-lbl" htmlFor="bill-cat">{t("add.category")}</label>
            <select id="bill-cat" className="field-input field-select" value={cats.some(c=>c.id===category)?category:cats[0].id} onChange={e=>setCategory(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}</option>)}</select></div>
          <div className="field"><label className="field-lbl" htmlFor="bill-date">{t(isNew?"bill.firstDue":"bill.dueFrom")}</label><input id="bill-date" className="field-input" type="date" lang={locale()} value={anchor} onChange={e=>setAnchor(e.target.value)}/>
            {isValidDateStr(anchor)&&<div className="list-sub" style={{marginTop:4}}>{fmtLongDate(parseLocalDate(anchor))}</div>}</div>
        </div>
        {!isNew&&(
          <div className="settings-row">
            <div><div className="settings-row-title">{t("bill.active")}</div><div className="settings-row-sub">{t("bill.activeSub")}</div></div>
            <div className={`toggle-track${active?" on":""}`} role="switch" aria-checked={active} aria-label={t("bill.active")} tabIndex={0} onClick={()=>setActive(a=>!a)} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); setActive(a=>!a); } }}><div className="toggle-knob"/></div>
          </div>
        )}
        <button className="btn btn-primary btn-full bill-save" onClick={save}>{t("common.save")}</button>
        {!isNew&&<button className="btn btn-ghost btn-full bill-delete" style={{color:"var(--neg)",borderColor:"var(--neg-bg)"}} onClick={()=>onDelete(bill.id)}>{t("bill.delete")}</button>}
        <button className="btn btn-ghost btn-full" onClick={onClose}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}

function RecurringHub({ transactions, bills=[], currency, onView, onToggleSchedule, onRecordPayment, onConvert, onEditBill, onToggleBill }) {
  const schedules=useMemo(()=>{
    const nowD=new Date();
    return buildSchedules(transactions,bills).map(x=>{
      const st=x.isActive ? scheduleMonthStatus(x,transactions,localMonthStr(nowD),nowD) : null;
      return { ...x, nextDue:scheduleNextDue(x,transactions,nowD), monthly:scheduleMonthly(x), unrecordedThisMonth:st?st.overdue.length:0 };
    }).sort((a,b)=>{ if (a.isActive!==b.isActive) return a.isActive?-1:1; return (a.nextDue?a.nextDue.getTime():Infinity)-(b.nextDue?b.nextDue.getTime():Infinity); });
  },[transactions,bills]);
  const inferred=schedules.filter(x=>!x.billId).length;
  const active=schedules.filter(x=>x.isActive), paused=schedules.filter(x=>!x.isActive);
  const outgoing=active.filter(x=>x.type==="expense");
  const monthlyOut=outgoing.reduce((a,x)=>a+x.monthly,0);
  const monthlyIn=active.filter(x=>x.type==="income").reduce((a,x)=>a+x.monthly,0);
  const nowD=new Date();
  const upcoming=outgoing.filter(x=>x.nextDue&&daysBetween(nowD,x.nextDue)<=7);

  if (schedules.length===0) return (
    <div className="empty">
      <div className="empty-icon"><Icon name="repeat" size={30}/></div>
      <div className="empty-title">{t("rec.emptyTitle")}</div>
      <div className="empty-body">{t("rec.emptyBody")}</div>
    </div>
  );

  const dueText=(x)=>{ if (!x.nextDue) return t("rec.noDate"); const d=daysBetween(nowD,x.nextDue); return d===0?t("rec.dueToday"):d===1?t("rec.dueTomorrow"):d<=60?tn("rec.dueInDays",d):t("rec.dueOn",{date:fmtDate(localDateStr(x.nextDue))}); };
  const Row=({x})=>{
    const cat=CAT(x.category)||{id:"other",color:"#98A5B7"};
    const isInc=x.type==="income";
    const near=x.nextDue && daysBetween(nowD,x.nextDue)<=3;
    return (
      // A paused schedule is marked by its "Paused" text and a faded icon; its text keeps full contrast (fading the whole row
      // made it 2.2–3.9:1, including the Reactivate button the user needs).
      <div style={{display:"flex",alignItems:"center",gap:11,padding:"12px 14px",borderBottom:"1px solid var(--rule)"}}>
        <div aria-hidden="true" onClick={()=>x.billId?onEditBill?.(x.bill):onView?.(x.latest)} style={{width:38,height:38,borderRadius:"50%",background:(cat.color)+"26",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",opacity:x.isActive?1:0.5}}>
          <CatIcon catId={cat.id} size={16} color={cat.color}/>
        </div>
        <div className={x.billId?"bill-row":undefined} role="button" tabIndex={0} onKeyDown={activateKey(()=>x.billId?onEditBill?.(x.bill):onView?.(x.latest))} onClick={()=>x.billId?onEditBill?.(x.bill):onView?.(x.latest)} style={{flex:1,minWidth:0,cursor:"pointer"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",overflowWrap:"anywhere"}}>{maskText(x.merchant||x.note)||catName(x.category)}</div>
          <div style={{fontSize:11,color:"var(--ink-3)",marginTop:1,lineHeight:1.4}}>
            {catName(x.category)}{x.subcategory?` / ${subName(x.subcategory)}`:""} · {t("freq."+x.freq)} · {tn("rec.paymentsRecorded",x.occurrences.length)}
          </div>
          <div style={{fontSize:11,marginTop:1,color:near&&x.isActive?"var(--warn)":"var(--ink-4)",fontWeight:near&&x.isActive?700:400}}>
            {x.isActive?dueText(x):t("rec.paused")} · {x.occurrences.length?t("rec.last",{date:fmtDate(x.occurrences[x.occurrences.length-1])}):t("bill.noPayments")}
            {x.unrecordedThisMonth>0&&<span style={{color:"var(--warn)",fontWeight:700}}> · {tn("rec.notRecorded",x.unrecordedThisMonth)}</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          <div style={{fontFamily:"var(--font)",fontSize:14,fontWeight:600,color:isInc?"var(--pos)":"var(--ink)"}}>{isInc?"+":"−"}{fmt(x.amount,currency)}</div>
          {x.freq!=="monthly"&&x.isActive&&<div style={{fontSize:10,color:"var(--ink-4)",fontStyle:"italic"}}>{t("rec.perMonthApprox",{amount:fmt(x.monthly,currency)})}</div>}
          {/* Run 6 (D20): a payment only settles a bill when it is recorded as that bill (same details, Recurring on).
              This opens the Add form filled in exactly that way, dated today; the user can still change anything. */}
          {x.isActive&&onRecordPayment&&(
            <button className="rec-record" onClick={e=>{e.stopPropagation();onRecordPayment(x);}} style={{fontSize:11,fontWeight:700,color:"var(--ink)",background:"none",border:"none",cursor:"pointer",padding:"8px 0",minHeight:36,fontFamily:"var(--font)",textDecoration:"underline",textUnderlineOffset:2}}>
              {t(isInc?"rec.recordIncome":"rec.recordPayment")}
            </button>
          )}
          <button onClick={e=>{e.stopPropagation(); if (x.billId) onToggleBill(x.billId,!x.isActive); else onToggleSchedule(x.memberIds,!x.isActive);}} style={{fontSize:11,fontWeight:700,color:x.isActive?"var(--warn)":"var(--pos)",background:"none",border:"none",cursor:"pointer",padding:"8px 0",minHeight:36,fontFamily:"var(--font)",textDecoration:"underline",textUnderlineOffset:2}}>
            {x.isActive?t("rec.pause"):t("rec.reactivate")}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{fontSize:11,color:"var(--ink-4)",fontStyle:"italic",marginBottom:14,lineHeight:1.5}}>{t("rec.intro")}</div>
      {inferred>0&&onConvert&&(
        <div className="card bill-convert">
          <div className="card-title" style={{marginBottom:6}}>{t("bill.legacyTitle")}</div>
          <div className="list-sub" style={{lineHeight:1.5}}>{tn("bill.legacyText",inferred)}</div>
          <button className="btn btn-primary btn-full rec-convert" onClick={onConvert} style={{marginTop:12}}>{t("bill.convertBtn")}</button>
        </div>
      )}
      <div className="stat-row">
        <div className="stat-cell"><div className="stat-val" style={{color:"var(--neg)"}}>{fmt(monthlyOut,currency)}</div><div className="stat-lbl">{t("rec.monthlyOut")}</div></div>
        <div className="stat-cell"><div className="stat-val">{fmt(monthlyOut*12,currency)}</div><div className="stat-lbl">{t("rec.yearly")}</div></div>
        {monthlyIn>0&&<div className="stat-cell"><div className="stat-val" style={{color:"var(--pos)"}}>{fmt(monthlyIn,currency)}</div><div className="stat-lbl">{t("rec.monthlyIn")}</div></div>}
        <div className="stat-cell"><div className="stat-val">{active.length}</div><div className="stat-lbl">{t("rec.activeSchedules")}</div></div>
      </div>
      {upcoming.length>0&&(
        <div className="card">
          <div className="card-head"><span className="card-title">{t("home.dueWithin7")}</span></div>
          {upcoming.map(x=>{ const c=CAT(x.category); return (
            <div key={x.key} className="up-row">
              <span className="cat-dot" style={{background:(c?.color||"#98A5B7")+"26"}}><CatIcon catId={x.category} size={16}/></span>
              <div className="up-body"><div className="list-title">{maskText(x.merchant||x.note)||catName(x.category)}</div><div className="list-sub">{catName(x.category)}</div></div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div className="up-amt">{fmt(x.amount,currency)}</div>
                <div style={{fontSize:11,color:"var(--warn)",fontWeight:600}}>{dueText(x)}</div>
              </div>
            </div>
          ); })}
        </div>
      )}
      {active.length>0&&(<>
        <div className="label-sm" style={{marginBottom:8}}>{t("rec.active")}</div>
        <div className="rec-hint" style={{fontSize:12,color:"var(--ink-3)",lineHeight:1.5,margin:"-2px 2px 10px"}}>{t("rec.recordHint")}</div>
        <div style={{background:"var(--bg-card)",border:"1px solid var(--rule)",borderRadius:8,overflow:"hidden",marginBottom:14}}>{active.map(x=><Row key={x.key} x={x}/>)}</div>
      </>)}
      {paused.length>0&&(<>
        <div className="label-sm" style={{marginBottom:8}}>{t("rec.paused")}</div>
        <div style={{background:"var(--bg-card)",border:"1px solid var(--rule)",borderRadius:8,overflow:"hidden",marginBottom:14}}>{paused.map(x=><Row key={x.key} x={x}/>)}</div>
      </>)}
      {monthlyOut>0&&(
        <div className="a-card" style={{marginTop:4}}>
          <div className="a-card-title">{t("rec.yearlyByCat")}</div>
          {(()=>{
            const ct={}; outgoing.forEach(x=>{ ct[x.category]=(ct[x.category]||0)+x.monthly; });
            const sorted=Object.entries(ct).sort((a,b)=>b[1]-a[1]); const maxV=sorted[0]?.[1]||1;
            return sorted.map(([catId,mo])=>{
              const cat=CAT(catId)||{id:"other",color:"#98A5B7"};
              return (<div key={catId} className="cat-bar"><div className="cat-bar-name"><CatIcon catId={cat.id} size={12} color={cat.color}/>{catName(catId)}</div><div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(mo/maxV)*100}%`,background:cat.color}}/></div><div className="cat-bar-amt">{fmt(mo*12,currency)}</div></div>);
            });
          })()}
        </div>
      )}
    </div>
  );
}

// Run 17: an in-app number pad, so no phone keyboard covers the form and the decimal mark is always the same key.
// Keys: 0-9, the decimal point, delete. Same text rules as the typed amount (cleanMoneyText); at most 9 whole digits.
function NumPad({ value, onChange }) {
  const press=(k)=>{
    if (k==="back") { onChange(String(value).slice(0,-1)); return; }
    if (k===".") { if (String(value).includes(".")) return; onChange(cleanMoneyText((String(value)||"0")+".")); return; }
    if (!String(value).includes(".") && String(value).replace(/\D/g,"").length>=9) return;
    onChange(cleanMoneyText(value==="0" ? k : String(value)+k));
  };
  const keys=["1","2","3","4","5","6","7","8","9",".","0","back"];
  return (
    <div className="numpad" role="group" aria-label={t("pad.label")}>
      {keys.map(k=>(
        <button key={k} type="button" className="numpad-key" data-key={k} onClick={()=>press(k)}
          aria-label={k==="back"?t("pad.back"):k==="."?t("pad.decimal"):k}>
          {k==="back"?<Icon name="backspace" size={22}/>:k}
        </button>
      ))}
    </div>
  );
}

function AddEditOverlay({ templates, currency, transactions, bills=[], prefill, editId, merchantMemory, onSave, onClose }) {
  // Run 12: which bill a recurring entry pays. Offered only when every recurring payment is already linked to a bill
  // (nothing inferred the old way); otherwise the entry is grouped as before, so it can't start a second copy of a bill
  // that is still inferred. "new" makes a bill from this entry; an id links to that bill.
  const hasInferred=useMemo(()=>buildSchedules(transactions,bills).some(s=>!s.billId),[transactions,bills]);
  const [billChoice, setBillChoice] = useState(prefill?.billId||(hasInferred?"auto":"new"));
  const [askBill, setAskBill] = useState(null);   // a same-name bill exists: ask before making another one
  const isEditing=!!editId;
  const [type,     setType]     = useState(prefill?.type||"expense");
  const [amount,   setAmount]   = useState(prefill?.amount?String(prefill.amount):"");
  const [catId,    setCatId]    = useState(prefill?.category||"food");
  const [subcat,   setSubcat]   = useState(prefill?.subcategory||"");
  const [merchant, setMerchant] = useState(prefill?.merchant||"");
  const [note,     setNote]     = useState(prefill?.note||"");
  const [date,     setDate]     = useState(prefill?.date||today());
  const [recur,    setRecur]    = useState(prefill?.recurring||false);
  const [freq,     setFreq]     = useState(prefill?.recurFreq||"monthly");
  // Run 16: how it was paid. A new entry starts with the wallet used last (one tap fewer); editing keeps the entry's own.
  const [wallet,   setWallet]   = useState(isEditing ? walletId(prefill?.wallet) : (prefill && "wallet" in prefill ? walletId(prefill.wallet) : lastWallet(transactions)));
  // Run 16: the user's own subcategory suggestions (separate storage key; entries keep the text itself).
  const [mySubs, setMySubs] = useState(()=>readSubcats());
  const [newSub, setNewSub] = useState(null);   // null = closed; otherwise the text being typed
  const [subMsg, setSubMsg] = useState("");
  const saveMySubs=(m)=>{ setMySubs(m); if (!writeSubcats(m)) setSubMsg(t("subcat.saveFailed")); };
  const addMySub=()=>{
    const r=addUserSubcat(mySubs,catId,newSub||"");
    if (!r.added) { setSubMsg(t("subcat.err."+r.reason)); return; }
    saveMySubs(r.map); setSubcat(newSub.trim().replace(/\s+/g," ")); setNewSub(null); setSubMsg("");
  };
  // Run 17: details (merchant, note, date, wallet, repeat) are folded away unless editing or already filled; the pad is open until a text field needs the room.
  const [more, setMore] = useState(!!(editId || prefill?.recurring || prefill?.billId || prefill?.merchant || prefill?.note));
  const [padOpen, setPadOpen] = useState(true);
  const [err,      setErr]      = useState("");
  const [showMerchantSugs, setShowMerchantSugs] = useState(false);
  const amtRef=useRef();

  // Unsaved-input guard: every close route (×, Cancel, Escape, phone Back) goes through requestClose. When something was
  // entered it asks first; an untouched form closes at once. Switching Expense/Income alone is not input: the category then
  // changes to that type's default by itself, so the category only counts as changed when it differs from that default.
  const initial=useRef({ type, amount, catId, subcat, merchant, note, date, recur, freq, wallet }).current;
  const [askDiscard, setAskDiscard] = useState(false);
  const defaultCat=type===initial.type ? initial.catId : (type==="income"?"salary":"food");
  const dirty=amount!==initial.amount || subcat!==initial.subcat || merchant!==initial.merchant || note!==initial.note ||
    date!==initial.date || recur!==initial.recur || (recur && freq!==initial.freq) || catId!==defaultCat || wallet!==initial.wallet;
  const requestClose=()=>{ if (dirty) setAskDiscard(true); else onClose(); };

  const expCats=CATEGORIES.filter(c=>!c.income);
  const incCats=CATEGORIES.filter(c=>c.income);
  const displayCats=type==="income"?incCats:expCats;
  const selectedCat=CAT(catId);
  const moreSummary=[merchant.trim(), note.trim(), wallet?walletName(wallet):"", date&&date!==today()&&isValidDateStr(date)?fmtDate(date):"", recur?t("freqCap."+freq):""].filter(Boolean).join(" · ");

  useEffect(()=>{ setTimeout(()=>amtRef.current?.focus(),60); },[]);
  useEffect(()=>{ if(!prefill) setCatId(type==="income"?"salary":"food"); },[type]);

  const merchantMatches=useMemo(()=>{
    if (!merchant.trim()) return [];
    const q=merchant.toLowerCase();
    // Only suggest what the user previously recorded as this same transaction type
    const wantType=type==="income"?"income":"expense";
    return Object.values(merchantMemory)
      .filter(m=>m.type===wantType&&m.merchant.toLowerCase().startsWith(q))
      .slice(0,4);
  },[merchant,merchantMemory,type]);

  const applySuggestion=(sug)=>{
    setMerchant(sug.merchant);
    setCatId(sug.category||catId);
    setSubcat(sug.subcategory||"");
    setShowMerchantSugs(false);
  };

  // S0: Duplicate detection uses createdAt, not date
  const isDupe=useMemo(()=>{
    const amt=formMoney(amount,{positive:true});
    if (isEditing||amt===null) return false;
    const tenMinAgo=Date.now()-10*60*1000;
    return transactions.some(t=>
      t.category===catId &&
      Math.abs(t.amount-amt)<0.01 &&
      (t.note||"").trim()===(note||"").trim() &&
      t.createdAt &&
      new Date(t.createdAt).getTime()>tenMinAgo
    );
  },[amount,catId,note,transactions,isEditing]);

  const submit=(override)=>{
    const amt=formMoney(amount,{positive:true});
    if (amt===null) { setErr(t("add.errAmount")); return; }
    if (!isValidDateStr(String(date||""))) { setErr(t("add.errDate")); return; }
    // S0: Preserve isActive when editing — never silently reactivate a paused recurring
    const isActive=isEditing?(prefill?.isActive!==undefined?prefill.isActive:true):true;
    // A bill that exists always links (also while old-style groups remain); only "a new bill" is held back until none remain.
    const choice=typeof override==="string" ? override : billChoice;
    const chosenBill=recur ? bills.find(b=>b.id===choice&&b.type===type) : null;
    if (recur && !chosenBill && !hasInferred && override===undefined) {
      const who=norm(merchant.trim()||note.trim());
      const same=who ? bills.find(b=>b.type===type && norm(b.name)===who) : null;
      if (same) { setAskBill(same); return; }   // payment of that bill, or a separate bill? Never decided silently.
    }
    onSave({type,amount:amt,category:catId,subcategory:subcat,merchant:merchant.trim(),note:note.trim(),date,recurring:recur,recurFreq:recur?(chosenBill?chosenBill.freq:freq):null,isActive,wallet,
      billChoice: recur ? (chosenBill ? chosenBill.id : (hasInferred ? null : "new")) : null});
  };

  const relevantTpls=!isEditing?templates.filter(tp=>!CATEGORIES.find(c=>c.id===tp.catId)?.income&&type==="expense"):[];
  const optional=<span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ink-4)"}}>({t("add.optional")})</span>;
  const title=isEditing?t("add.titleEdit"):t("add.titleNew");

  return (
    <div className="add-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="add-bar">
        <span className="add-title">{title}</span>
        <button className="add-close" onClick={requestClose} aria-label={t("common.close")}><Icon name="close" size={14}/></button>
      </div>
      <div className="add-body" onFocusCapture={e=>{ const el=e.target; if (el && el.matches && el.matches("input,select,textarea") && !el.classList.contains("amount-input")) setPadOpen(false); }}>
        <div className="type-toggle">
          <button className={`type-btn${type==="expense"?" active":""}`} aria-pressed={type==="expense"} onClick={()=>setType("expense")}>{t("add.expense")}</button>
          <button className={`type-btn${type==="income"?" active":""}`} aria-pressed={type==="income"} onClick={()=>setType("income")}>{t("add.income")}</button>
        </div>
        <div className="amount-zone" onClick={()=>{ setPadOpen(true); amtRef.current?.focus(); }}>
          <div className="amount-line">
            <input ref={amtRef} className="amount-input" type="text" inputMode={padOpen?"none":"decimal"} autoComplete="off"
              placeholder="0.00" value={amount} onChange={e=>{setAmount(cleanMoneyText(e.target.value));setErr("");}}
              min="0" step="0.01" aria-label={t("add.amount")} aria-invalid={!!err&&err===t("add.errAmount")}
              style={{width:`${Math.max(4.3,Math.min(14,String(amount||"0.00").length*1.08))}ch`,fontSize:`${Math.max(30,Math.min(50,240/(Math.max(4,String(amount||"0.00").length)*0.62)))}px`}}/>
            <span className="amount-cur">{currency}</span>
          </div>
        </div>
        {err&&<div role="alert" style={{color:"var(--neg)",fontSize:12,textAlign:"center",marginBottom:10,fontWeight:600}}>{err}</div>}
        {isDupe&&<div className="dupe-warn" role="status"><Icon name="other" size={13}/>{t("add.dupe")}</div>}

        {relevantTpls.length>0&&(
          <div style={{marginBottom:12}}>
            <div className="field-lbl">{t("add.quickFill")}</div>
            <div className="tpl-strip" style={{marginBottom:0}}>
              {relevantTpls.map(tpl=>(
                <button key={tpl.id} className="tpl-card" onClick={()=>{setAmount(String(tpl.amount));setCatId(tpl.catId);setSubcat(tpl.subcat||"");setMerchant(tpl.merchant||"");setNote(tpl.note||tpl.name);}}>
                  <CatIcon catId={tpl.catId} size={12}/><span className="tpl-name">{tpl.name}</span><span className="tpl-amt">{fmt(tpl.amount,currency)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field" role="group" aria-labelledby="txn-cat-lbl">
          <div className="field-lbl" id="txn-cat-lbl">{t("add.category")} <span style={{fontWeight:600,color:"var(--ink-2)",letterSpacing:0.4}}>· {catName(catId)}</span></div>
          <div className="cat-scroll">
            {displayCats.map(cat=>(
              <button key={cat.id} className={`cat-tile${catId===cat.id?" sel":""}`} aria-pressed={catId===cat.id} aria-label={catName(cat.id)} onClick={()=>{setCatId(cat.id);setSubcat("");}}>
                <CatIcon catId={cat.id} size={18} color={catId===cat.id?cat.color:undefined}/>
                <span className="cat-tile-name">{catTile(cat.id)}</span>
              </button>
            ))}
          </div>
          {(selectedCat?.subs?.length>0 || (mySubs[catId]||[]).length>0 || selectedCat)&&(
            <div data-section="add-subcat">
              <div className="field-lbl" style={{marginBottom:5,marginTop:4}}>{t("add.subcategory")} {optional}</div>
              <div className="sub-strip">
                {/* "+ My own" comes first, then the user's own, then the built-in ones: the strip scrolls sideways, so the button must not hide at its far end */}
                {newSub===null&&<button type="button" className="sub-chip" data-section="add-subcat-new" onClick={()=>{ setNewSub(""); setSubMsg(""); }}>+ {t("subcat.mine")}</button>}
                {(mySubs[catId]||[]).map(s=>(
                  <span key={"my-"+s} className="sub-chip-wrap" style={{display:"inline-flex",alignItems:"center",gap:2}}>
                    <button className={`sub-chip${subcat===s?" sel":""}`} aria-pressed={subcat===s} onClick={()=>setSubcat(subcat===s?"":s)}>{s}</button>
                    <button type="button" className="sub-chip-x" aria-label={t("subcat.remove",{name:s})} style={{background:"none",border:"none",color:"var(--ink-4)",cursor:"pointer",padding:"6px 4px",minWidth:24,minHeight:24}} onClick={()=>saveMySubs(removeUserSubcat(mySubs,catId,s))}>×</button>
                  </span>
                ))}
                {(selectedCat?.subs||[]).map(s=>(
                  <button key={s} className={`sub-chip${subcat===s?" sel":""}`} aria-pressed={subcat===s} onClick={()=>setSubcat(subcat===s?"":s)}>{subName(s)}</button>
                ))}
              </div>
              {newSub!==null&&(
                <div style={{display:"flex",gap:7,marginTop:8}}>
                  <input className="field-input" autoFocus aria-label={t("subcat.mine")} placeholder={t("subcat.ph")} maxLength={SUBCAT_LEN} value={newSub} onChange={e=>{ setNewSub(e.target.value); setSubMsg(""); }} onKeyDown={e=>{ if (e.key==="Enter") { e.preventDefault(); addMySub(); } }} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                  <button type="button" className="btn btn-sm btn-sm-primary" onClick={addMySub}>{t("common.save")}</button>
                  <button type="button" className="btn btn-sm" onClick={()=>{ setNewSub(null); setSubMsg(""); }} aria-label={t("common.cancel")}>✕</button>
                </div>
              )}
              {subMsg&&<div role="alert" className="list-sub" style={{marginTop:6,color:"var(--neg)"}}>{subMsg}</div>}
            </div>
          )}
        </div>

        {/* Run 17: the form shows what most entries need; the rest sits under one toggle (open when editing). */}
        <button type="button" className="more-toggle" data-section="add-more-toggle" aria-expanded={more} aria-controls="add-more-body" onClick={()=>{ setMore(m=>!m); setPadOpen(false); }}>
          <span className="more-toggle-main">{t(more?"add.lessDetails":"add.moreDetails")}</span>
          <span className="more-toggle-sub">{moreSummary||t("add.moreHint")}</span>
          <Icon name={more?"chevUp":"chevDown"} size={16}/>
        </button>
        <div id="add-more-body" data-section="add-more" style={more?undefined:{display:"none"}}>        <div className="field merchant-wrap">
          <label className="field-lbl" htmlFor="txn-merchant">{t("add.merchant")} {optional}</label>
          <input id="txn-merchant" className="field-input" placeholder={t("add.merchantPh")} autoComplete="off"
            value={merchant}
            onChange={e=>{setMerchant(e.target.value);setShowMerchantSugs(true);}}
            onBlur={()=>setTimeout(()=>setShowMerchantSugs(false),150)}
            onFocus={()=>setShowMerchantSugs(true)}/>
          {/* Merchant intelligence hint — shown when merchant is recognised */}
          {merchant.trim()&&!showMerchantSugs&&(()=>{
            const ml=merchant.trim().toLowerCase();
            const match=merchantMemory[memKey(type,ml)];
            if (!match||match.count<2) return null;
            const profile=calcMerchantProfile(merchant.trim(),transactions);
            if (!profile) return null;
            const hints=[];
            if (profile.avg>0) hints.push(t("add.hintUsually",{amount:fmt(profile.avg,currency)}));
            if (profile.typicalDay&&profile.count>=3) hints.push(t("add.hintDay",{day:t("dow."+profile.typicalDay)}));
            if (profile.estimatedNextVisit) hints.push(t("add.hintNext",{date:fmtDate(profile.estimatedNextVisit)}));
            if (!hints.length) return null;
            return (
              <div style={{fontSize:11,color:"var(--ink-4)",marginTop:4,display:"flex",alignItems:"center",gap:5,fontStyle:"italic"}}>
                <Icon name="merchant" size={11} color="var(--ink-4)"/>
                {hints.join(" · ")}
              </div>
            );
          })()}
          {showMerchantSugs&&merchantMatches.length>0&&(
            <div className="merchant-suggestions">
              {merchantMatches.map((m,i)=>(
                <div key={i} className="merchant-sug-item" onMouseDown={()=>applySuggestion(m)}>
                  <div>{m.merchant}</div>
                  <div className="merchant-sug-sub">{catName(m.category)}{m.subcategory?` / ${subName(m.subcategory)}`:""} · {t("add.usedTimes",{n:m.count})}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run 16: how it was paid (cash, bank card, mobile wallet, other). One tap; tapping the chosen one again clears it. */}
        <div className="field" role="radiogroup" aria-labelledby="txn-wal-lbl" data-section="add-wallet">
          <div className="field-lbl" id="txn-wal-lbl">{t(type==="income"?"wallet.labelIn":"wallet.label")} {optional}</div>
          <div className="sub-strip" style={{flexWrap:"wrap",overflowX:"visible"}}>
            {WALLET_IDS.map(id=>(
              <button key={id} type="button" role="radio" aria-checked={wallet===id} className={`sub-chip${wallet===id?" sel":""}`} onClick={()=>setWallet(wallet===id?"":id)}>{t("wallet."+id)}</button>
            ))}
            {wallet&&!WALLET_IDS.includes(wallet)&&(
              <button type="button" role="radio" aria-checked="true" className="sub-chip sel" onClick={()=>setWallet("")}>{walletName(wallet)}</button>
            )}
          </div>
        </div>

        <div className="field">
          <label className="field-lbl" htmlFor="txn-note">{t("add.note")} {optional}</label>
          <input id="txn-note" className="field-input" placeholder={t("add.notePh")}
            value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>

        <div className="field-row" style={{marginBottom:14}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-lbl" htmlFor="txn-date">{t("add.date")}</label>
            <input id="txn-date" className="field-input" lang={locale()} type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            {/* Run 7, V3: the date box is the phone's own control and follows the phone's language, not the app's (Chrome on
                Android ignores lang), so it can read 10/27/2026 in the Azerbaijani interface. The chosen date is repeated
                here in the interface language. Display only: the stored value stays YYYY-MM-DD. */}
            {isValidDateStr(date)&&<div className="date-readout" style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>{fmtLongDate(parseLocalDate(date))}</div>}
          </div>
          <div className="field" style={{marginBottom:0}}>
            <div className="field-lbl" id="txn-rec-lbl">{t("add.recurring")}</div>
            <div style={{display:"flex",alignItems:"center",gap:9,marginTop:9}}>
              <div className={`toggle-track${recur?" on":""}`} onClick={()=>setRecur(r=>!r)} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); setRecur(r=>!r); } }} role="switch" aria-checked={recur} aria-label={t("add.recurring")} tabIndex={0}>
                <div className="toggle-knob"/>
              </div>
              {recur&&!bills.some(b=>b.id===billChoice&&b.type===type)&&(
                <select className="field-select" value={freq} onChange={e=>setFreq(e.target.value)} aria-label={t("add.frequency")}
                  style={{fontSize:12,color:"var(--ink)",background:"transparent",border:"none",outline:"none",cursor:"pointer"}}>
                  {["weekly","biweekly","monthly","yearly"].map(f=><option key={f} value={f}>{t("freqCap."+f)}</option>)}
                </select>
              )}
            </div>
            {recur&&(!hasInferred||bills.some(b=>b.type===type))&&(
              <div className="field" style={{marginTop:10,marginBottom:0}}>
                <label className="field-lbl" htmlFor="txn-bill">{t("bill.which")}</label>
                <select id="txn-bill" className="field-input field-select bill-choice" value={bills.some(b=>b.id===billChoice&&b.type===type)?billChoice:(hasInferred?"auto":"new")} onChange={e=>setBillChoice(e.target.value)}>
                  {hasInferred ? <option value="auto">{t("bill.autoGroup")}</option> : <option value="new">{t("bill.newFromEntry")}</option>}
                  {bills.filter(b=>b.type===type).map(b=><option key={b.id} value={b.id}>{maskText(b.name)} · {fmt(b.amount,currency)} · {t("freq."+b.freq)}</option>)}
                </select>
              </div>
            )}
            {recur&&hasInferred&&<div className="list-sub" style={{marginTop:8,lineHeight:1.45}}>{t("bill.convertFirst")}</div>}
            {askBill&&(
              <div className="card bill-ask" role="alert" style={{marginTop:10,marginBottom:0}}>
                <div className="list-title" style={{marginBottom:4}}>{t("bill.askTitle",{name:maskText(askBill.name)})}</div>
                <div className="list-sub" style={{lineHeight:1.5,marginBottom:10}}>{t("bill.askText",{amount:fmt(askBill.amount,currency),freq:t("freq."+askBill.freq)})}</div>
                <button className="btn btn-primary btn-full bill-ask-pay" style={{marginTop:0}} onClick={()=>submit(askBill.id)}>{t("bill.askPay",{name:maskText(askBill.name)})}</button>
                <button className="btn btn-ghost btn-full bill-ask-new" onClick={()=>submit("new")}>{t("bill.askNew")}</button>
              </div>
            )}
          </div>
        </div>

        </div>
        <button className="btn btn-ghost btn-full" onClick={requestClose}>{t("common.cancel")}</button>
      </div>
      <div className="add-foot">
        {padOpen&&<NumPad value={amount} onChange={v=>{ setAmount(v); setErr(""); }}/>}
        <button className="btn btn-primary btn-full" style={{marginTop:0}} onClick={()=>submit()}>
          {isEditing?t("add.saveChanges"):t(type==="income"?"add.recordIncome":"add.recordExpense")}
        </button>
      </div>      {askDiscard&&(
        <div className="sheet-overlay discard-overlay" onClick={e=>e.target===e.currentTarget&&setAskDiscard(false)}>
          <div className="sheet" role="alertdialog" aria-modal="true" tabIndex={-1} aria-labelledby="discard-title" aria-describedby="discard-body">
            <div className="sheet-grip"><div className="sheet-handle"/></div>
            <div className="sheet-title" id="discard-title">{t("add.discardTitle")}</div>
            <p id="discard-body" style={{fontSize:14,color:"var(--ink-3)",margin:"0 0 16px",lineHeight:1.5}}>{t("add.discardBody")}</p>
            <button className="btn btn-primary btn-full discard-keep" onClick={()=>setAskDiscard(false)}>{t("add.keepEditing")}</button>
            <button className="btn btn-ghost btn-full" style={{marginTop:8,color:"var(--neg)"}} onClick={onClose}>{t("add.discard")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── S6: Transaction Detail Sheet with Merchant Intelligence ─────────────────
function TxnDetailSheet({ txn, currency, transactions, bills:billList=[], onClose, onEdit, onDuplicate, onDelete, onLinkBill, onAssignBill }) {
  // Run 9: an ordinary (non-recurring) entry can be marked as the payment of an existing bill — only when the user picks the
  // bill. Same merchant and amount are never enough to link anything automatically.
  // Run 12: once every recurring payment has a bill ("explicit"), any entry can be linked to a bill, moved to another bill,
  // or made into a new bill; before that, the Run 9 behaviour (inferred schedules, ordinary entries only) is kept.
  const [showLink,setShowLink]=useState(false);
  const all=useMemo(()=>buildSchedules(transactions,billList),[transactions,billList]);
  const explicit=!!onAssignBill && !all.some(s=>!s.billId);
  const bills=useMemo(()=>explicit ? all.filter(x=>x.billId && x.type===txn.type && x.billId!==txn.billId)
    : (txn.recurring?[]:all.filter(x=>x.isActive&&x.type===txn.type)),[all,explicit,txn]);
  const myBill=txn.billId ? billList.find(b=>b.id===txn.billId) : null;
  const cat=CAT(txn.category)||{id:"other",name:txn.category,color:"#98A5B7"};
  const isInc=txn.type==="income";
  const profile=useMemo(()=>txn.merchant?calcMerchantProfile(txn.merchant,transactions):null,[txn.merchant,transactions]);

  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1}aria-label={maskText(txn.merchant||txn.note)||catName(txn.category)}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:(cat.color)+"26",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <CatIcon catId={cat.id} size={22} color={cat.color}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"var(--font)",fontSize:18,fontWeight:700,marginBottom:2,lineHeight:1.25,overflowWrap:"anywhere"}}>{maskText(txn.merchant||txn.note)||catName(txn.category)}</div>
            <div style={{fontSize:12,color:"var(--ink-3)"}}>{catName(txn.category)}{txn.subcategory?` / ${subName(txn.subcategory)}`:""} · {fmtDate(txn.date)}</div>
          </div>
          <button onClick={onClose} aria-label={t("common.close")} style={{background:"none",border:"1px solid var(--rule)",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-3)",flexShrink:0}}><Icon name="close" size={13}/></button>
        </div>

        {/* Amount */}
        <div style={{textAlign:"center",padding:"14px 0 16px",borderTop:"1px solid var(--rule)",borderBottom:"1px solid var(--rule)",marginBottom:16}}>
          <div style={{fontFamily:"var(--font)",fontSize:"clamp(32px,11vw,42px)",fontWeight:700,letterSpacing:-1,overflowWrap:"anywhere",color:isInc?"var(--pos)":"var(--ink)",fontVariantNumeric:"tabular-nums"}}>{isInc?"+":"−"}{fmt(txn.amount,currency)}</div>
          <div style={{fontSize:12,color:"var(--ink-3)",marginTop:3}}>{t(txn.type==="income"?"add.income":"add.expense")}</div>
        </div>

        {/* Meta */}
        <div className="detail-meta" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[
            [t("add.date"),      fmtDate(txn.date)],
            [t("add.merchant"),  maskText(txn.merchant)||"—"],
            [t("add.category"),  catName(txn.category)+(txn.subcategory?` / ${subName(txn.subcategory)}`:"")],
            [t("add.recurring"), txn.recurring?(txn.recurFreq?t("freqCap."+txn.recurFreq):t("common.yes")):t("common.no")],
            ...(txn.wallet?[[t(txn.type==="income"?"wallet.labelIn":"wallet.label"), walletName(txn.wallet)]]:[]),
          ].map(([lbl,val])=>(
            <div key={lbl} style={{background:"var(--bg-warm)",borderRadius:12,padding:"11px 13px"}}>
              <div style={{fontSize:12,fontWeight:500,color:"var(--ink-3)",marginBottom:3}}>{lbl}</div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--ink)",lineHeight:1.3,overflowWrap:"anywhere"}}>{val}</div>
            </div>
          ))}
        </div>

        {txn.note&&<div style={{fontSize:14,color:"var(--ink-2)",background:"var(--bg-warm)",borderRadius:12,padding:"11px 13px",marginBottom:16}}>{maskText(txn.note)}</div>}

        {/* S6: Merchant profile — frequency, timing, category stability */}
        {profile&&profile.count>1&&(
          <div style={{background:"var(--bg-card)",border:"1px solid var(--rule)",borderRadius:8,padding:"13px 14px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
              <div className="label-sm">{t("mp.title")}</div>
              {profile.hasRecurring&&(
                <span style={{fontSize:10,fontWeight:700,color:"var(--warn)",background:"var(--warn-bg)",padding:"2px 7px",borderRadius:4}}>{t("add.recurring")}</span>
              )}
            </div>
            {/* Stats grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font)",fontSize:18,fontWeight:700}}>{profile.count}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:"var(--ink-4)"}}>{t("mp.visits")}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font)",fontSize:18,fontWeight:700}}>{fmt(profile.avg,currency)}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:"var(--ink-4)"}}>{t("mp.avgSpend")}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font)",fontSize:18,fontWeight:700}}>{fmt(profile.total,currency)}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:"var(--ink-4)"}}>{t("mp.total")}</div>
              </div>
            </div>
            {/* Behaviour rows */}
            <div style={{borderTop:"1px solid var(--rule)",paddingTop:10,display:"flex",flexDirection:"column",gap:5}}>
              {profile.avgDaysBetween&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.frequency")}</span>
                  <span style={{fontWeight:600,color:"var(--ink)"}}>{t("mp.everyDays",{n:profile.avgDaysBetween})}</span>
                </div>
              )}
              {profile.typicalDay&&profile.count>=3&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.typicalDay")}</span>
                  <span style={{fontWeight:600,color:"var(--ink)"}}>{t("dow."+profile.typicalDay)}</span>
                </div>
              )}
              {profile.usualSub&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.usuallyFor")}</span>
                  <span style={{fontWeight:600,color:"var(--ink)"}}>{subName(profile.usualSub)}</span>
                </div>
              )}
              {profile.amountStable&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("add.amount")}</span>
                  <span style={{fontWeight:600,color:"var(--pos)"}}>{t("mp.consistent")}</span>
                </div>
              )}
              {profile.spendingTrend&&profile.spendingTrend!=="stable"&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.trend")}</span>
                  <span style={{fontWeight:600,color:profile.spendingTrend==="increasing"?"var(--neg)":"var(--pos)"}}>
                    {profile.spendingTrend==="increasing"?t("mp.increasing"):t("mp.decreasing")}
                  </span>
                </div>
              )}
              {profile.estimatedNextVisit&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.nextVisit")}</span>
                  <span style={{fontStyle:"italic",color:"var(--ink-3)"}}>
                    ~{fmtDate(profile.estimatedNextVisit)}
                    {profile.estimatedNextSpend&&<span style={{marginLeft:6}}>· ~{fmt(profile.estimatedNextSpend,currency)}</span>}
                  </span>
                </div>
              )}
              {profile.isRecurring&&profile.recurringFreq&&profile.recurringFreq!=="irregular"&&(
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.pattern")}</span>
                  <span style={{fontWeight:600,color:"var(--warn)"}}>{t("freqCap."+profile.recurringFreq)}</span>
                </div>
              )}
              {profile.last30>0&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.last30")}</span>
                  <span style={{fontWeight:600,color:profile.diff30<=0?"var(--pos)":"var(--neg)",textAlign:"right"}}>
                    {fmt(profile.last30,currency)}
                    {profile.prev30total>0&&profile.diff30!==0&&<span style={{fontSize:10,marginLeft:4,fontWeight:400}}>{profile.diff30>0?"↑":"↓"}{t("mp.vsPrev",{amount:fmt(Math.abs(profile.diff30),currency)})}</span>}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button className="btn btn-sm btn-full" style={{flex:1,padding:"11px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={onEdit}><Icon name="edit" size={14}/>{t("common.edit")}</button>
          <button className="btn btn-sm btn-full" style={{flex:1,padding:"11px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={onDuplicate}><Icon name="repeat" size={14}/>{t("detail.duplicate")}</button>
        </div>
        {myBill&&<div className="list-sub bill-of" style={{margin:"0 2px 8px"}}>{t("bill.paymentOf",{name:maskText(myBill.name)})}</div>}
        {((explicit&&onAssignBill)||(onLinkBill&&bills.length>0))&&(
          <div style={{marginBottom:8}}>
            <button className="btn btn-ghost btn-full link-bill" style={{marginTop:0,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} aria-expanded={showLink} onClick={()=>setShowLink(s=>!s)}>
              <Icon name="repeat" size={14}/>{t(myBill?"bill.change":txn.type==="income"?"detail.linkIncome":"detail.linkBill")}
            </button>
            {showLink&&(
              <div className="card" style={{marginTop:8,padding:"8px 14px"}}>
                <div className="list-sub" style={{margin:"4px 0 6px",lineHeight:1.5}}>{t(explicit?"bill.linkHint":"detail.linkHint")}</div>
                {bills.map(x=>(
                  <button key={x.key} className="list-row link-bill-option" onClick={()=>x.billId&&onAssignBill?onAssignBill(x.billId):onLinkBill(x)}>
                    <span className="cat-dot" style={{background:(CAT(x.category)?.color||"#98A5B7")+"26",width:32,height:32}}><CatIcon catId={x.category} size={14}/></span>
                    <span className="list-body"><span className="list-title">{maskText(x.merchant||x.note)||catName(x.category)}</span>
                      <span className="list-sub">{fmt(x.amount,currency)} · {t("freq."+x.freq)} · {catName(x.category)}{x.subcategory?` / ${subName(x.subcategory)}`:""}</span></span>
                  </button>
                ))}
                {explicit&&<button className="list-row link-bill-option link-bill-new" onClick={()=>onAssignBill("new")}>
                  <span className="cat-dot" style={{background:"var(--accent-light)",width:32,height:32}}><Icon name="add" size={14} color="var(--accent)"/></span>
                  <span className="list-body"><span className="list-title">{t("bill.newFromThis")}</span><span className="list-sub">{fmt(txn.amount,currency)} · {t("freq."+(txn.recurFreq||"monthly"))}</span></span>
                </button>}
              </div>
            )}
          </div>
        )}
        <button className="btn btn-ghost btn-full" style={{color:"var(--neg)",borderColor:"var(--neg-bg)",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:0}} onClick={onDelete}><Icon name="trash" size={14}/>{t("common.delete")}</button>
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{marginTop:6}}>{t("common.close")}</button>
      </div>
    </div>
  );
}

// ─── Preferences sheet ────────────────────────────────────────────────────────
// Run 17: language and the profile name live on the Settings page itself, the all-time overview is on Analytics, and the savings floor
// and the quick-add templates are on Goals. What remains here: the currency and the Safe to Spend on/off switch.
function SettingsSheet({ state, onCurrencyChange, onSafeToSpendChange, onClose, showToast }) {
  const { currency,safeToSpend={} }=state;
  const [curSym,      setCurSym]      = useState(currency);

  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={t("set.preferences")}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div className="sheet-title">{t("set.preferences")}</div>

        {/* Safe to Spend: the switch only. The monthly savings floor is on Goals. */}
        <div className="settings-section-lbl" style={{marginTop:6}}>{t("safe.title")}</div>
        <div className="settings-row">
          <div><div className="settings-row-title" id="set-safe-lbl">{t("set.safeEnable")}</div><div className="settings-row-sub">{t("set.safeEnableSub")}</div></div>
          <div className={`toggle-track${safeToSpend.enabled?" on":""}`} onClick={()=>onSafeToSpendChange({enabled:!safeToSpend.enabled})} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); onSafeToSpendChange({enabled:!safeToSpend.enabled}); } }} role="switch" aria-checked={!!safeToSpend.enabled} aria-label={t("safe.title")} tabIndex={0}><div className="toggle-knob"/></div>
        </div>

        {/* Currency */}
        <div className="settings-section-lbl" style={{marginTop:14}}>{t("set.currency")}</div>
        <div className="settings-row">
          <div><div className="settings-row-title" id="set-cur-lbl">{t("set.currency")}</div><div className="settings-row-sub">{t("set.currencySub",{currency})}</div></div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <input className="field-input" value={curSym} onChange={e=>setCurSym(e.target.value)} maxLength={3} aria-labelledby="set-cur-lbl" style={{width:52,minHeight:38,textAlign:"center",padding:"7px 8px"}}/>
            <button className="btn btn-sm btn-sm-primary" onClick={()=>{if(!curSym.trim()){showToast(t("set.currencyEmpty"));return;} onCurrencyChange(curSym.trim());showToast(t("set.currencyUpdated"));}}>{t("common.save")}</button>
          </div>
        </div>

        <button className="btn btn-ghost btn-full" onClick={onClose} style={{marginTop:18}}>{t("common.close")}</button>
      </div>
    </div>
  );
}

// Goals: the monthly savings floor used by Safe to Spend. Shown only while Safe to Spend is switched on.
function SavingsFloorCard({ safeToSpend={}, onSafeToSpendChange, showToast }) {
  const [savingsT,setSavingsT]=useState(String(safeToSpend.savingsTarget||0));
  if (!safeToSpend.enabled) return null;
  return (
    <div className="card" data-section="gl-floor">
      <div className="settings-row-title" id="set-floor-lbl">{t("set.floor")}</div>
      <div className="settings-row-sub" style={{marginBottom:8}}>{t("set.floorSub")}</div>
      <div style={{display:"flex",gap:8,width:"100%"}}>
        <input className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={savingsT} onChange={e=>setSavingsT(cleanMoneyText(e.target.value))} aria-labelledby="set-floor-lbl" style={{flex:1,padding:"8px 10px",fontSize:13}}/>
        <button className="btn btn-sm btn-sm-primary" onClick={()=>{const v=savingsT.trim()===""?0:formMoney(savingsT); if(v===null){showToast(t("set.zeroOrMore"));return;} onSafeToSpendChange({savingsTarget:v});showToast(t("set.saved"));}}>{t("common.save")}</button>
      </div>
    </div>
  );
}

// Goals: quick-add templates (the buttons on Home). A template can carry a subcategory.
function TemplatesSection({ templates, currency, onAddTemplate, onDeleteTemplate, showToast }) {
  const [showNewTpl,  setShowNewTpl]  = useState(false);
  const [tplName,     setTplName]     = useState("");
  const [tplAmt,      setTplAmt]      = useState("");
  const [tplCatId,    setTplCatId]    = useState("food");
  const [tplSubcat,   setTplSubcat]   = useState("");
  const [tplMerchant, setTplMerchant] = useState("");
  const [tplNote,     setTplNote]     = useState("");
  const expCats=CATEGORIES.filter(c=>!c.income);
  const myOwn=useMemo(()=>showNewTpl?((readSubcats()[tplCatId])||[]):[],[showNewTpl,tplCatId]);
  const builtIn=(CATEGORIES.find(c=>c.id===tplCatId)||{}).subs||[];
  const saveTpl=()=>{
    const tAmt=formMoney(tplAmt,{positive:true});
    if (!tplName.trim()||tAmt===null) { showToast(t("set.tplInvalid")); return; }
    onAddTemplate({name:tplName.trim(),amount:tAmt,catId:tplCatId,subcat:tplSubcat,merchant:tplMerchant.trim(),note:tplNote.trim()});
    setTplName("");setTplAmt("");setTplSubcat("");setTplMerchant("");setTplNote("");setShowNewTpl(false);
  };
  return (
    <div data-section="gl-templates">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,margin:"14px 2px 10px"}}>
        <span className="section-title" style={{margin:0}}>{t("set.templates")}</span>
        <button className="btn btn-sm" onClick={()=>setShowNewTpl(s=>!s)}>{showNewTpl?t("common.cancel"):t("set.add")}</button>
      </div>
      {showNewTpl&&(
        <div className="card">
          <div className="field-row" style={{marginBottom:10}}>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-name">{t("set.name")}</label><input id="tpl-name" className="field-input" placeholder={t("set.tplNamePh")} value={tplName} onChange={e=>setTplName(e.target.value)} autoFocus/></div>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-amt">{t("add.amount")}</label><input id="tpl-amt" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={tplAmt} onChange={e=>setTplAmt(cleanMoneyText(e.target.value))}/></div>
          </div>
          <div className="field-row" style={{marginBottom:10}}>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-cat">{t("add.category")}</label><select id="tpl-cat" className="field-input field-select" value={tplCatId} onChange={e=>{ setTplCatId(e.target.value); setTplSubcat(""); }}>{expCats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}</option>)}</select></div>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-subcat">{t("add.subcategory")}</label>
              <select id="tpl-subcat" className="field-input field-select" value={tplSubcat} onChange={e=>setTplSubcat(e.target.value)}>
                <option value="">{t("set.noSubcat")}</option>
                {myOwn.map(s=><option key={"my-"+s} value={s}>{s}</option>)}
                {builtIn.map(s=><option key={s} value={s}>{subName(s)}</option>)}
              </select></div>
          </div>
          <div className="field-row" style={{marginBottom:10}}>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-merchant">{t("add.merchant")}</label><input id="tpl-merchant" className="field-input" placeholder={t("set.optionalPh")} value={tplMerchant} onChange={e=>setTplMerchant(e.target.value)}/></div>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-note">{t("set.noteOptional")}</label><input id="tpl-note" className="field-input" placeholder={t("set.tplNotePh")} value={tplNote} onChange={e=>setTplNote(e.target.value)}/></div>
          </div>
          <button className="btn btn-primary btn-full" style={{marginTop:0,padding:"10px"}} onClick={saveTpl}>{t("set.saveTemplate")}</button>
        </div>
      )}
      {templates.length===0&&!showNewTpl&&<div className="list-sub" style={{margin:"0 2px"}}>{t("set.noTemplates")}</div>}
      {templates.length>0&&(
        <div className="card list-card">
          {templates.map(tpl=>(
            <div key={tpl.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"1px solid var(--rule)"}}>
              <CatIcon catId={tpl.catId} size={14}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{tpl.name}</div>
                <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmt(tpl.amount,currency)}{tpl.merchant?` · ${tpl.merchant}`:""} · {catName(tpl.catId)}{tpl.subcat?` › ${subName(tpl.subcat)}`:""}</div>
              </div>
              <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>onDeleteTemplate(tpl.id)} aria-label={t("set.deleteTemplate",{name:tpl.name})}><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Redesign pages (2026-10-27) ─────────────────────────────────────────────────────────────────────────────────────

function SpendDonut({ catSpend, total, currency }) {
  // Run 17: tap a slice (or its legend row) to focus it: the ring grows, that slice thickens, the rest fade and the centre names it;
  // tap it again to go back. One selection at a time.
  const [sel,setSel]=useState(null);
  const slices=donutSlices(catSpend);
  if (!slices.length) return null;
  const cur=slices.find(s=>s.id===sel)||null;
  const toggle=(id)=>setSel(s=>s===id?null:id);
  const R=46, C=2*Math.PI*R; let off=0;
  return (
    <div className="donut-wrap">
      <div className={`donut${cur?" has-sel":""}`} role="img" aria-label={t("home.breakdown")+": "+slices.map(s=>`${s.name} ${fmtPct(s.pct)}`).join(", ")}>
        <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--bg-inset)" strokeWidth="14"/>
          {slices.map(s=>{ const len=C*s.amt/total, gap=slices.length>1?Math.min(2,len/3):0; const on=cur&&cur.id===s.id; const el=(
            <circle key={s.id} className="donut-slice" data-id={s.id} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth={on?20:14} strokeDasharray={`${Math.max(len-gap,0.01)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 60 60)"
              style={{opacity:cur&&!on?0.35:1,cursor:"pointer"}} onClick={()=>toggle(s.id)}/>
          ); off+=len; return el; })}
        </svg>
        {cur
          ? <div className="donut-center donut-center-sel"><span className="dc-name">{cur.name}</span><span className="dc-amt">{fmt(cur.amt,currency)}</span><span className="dc-pct">{fmtPct(cur.pct)}</span></div>
          : <div className="donut-center">{fmtShort(total,currency)}</div>}
      </div>
      <ul className="donut-legend">
        {slices.map(s=>(
          <li key={s.id}><button type="button" className="donut-row" data-id={s.id} aria-pressed={!!cur&&cur.id===s.id} onClick={()=>toggle(s.id)} style={{opacity:cur&&cur.id!==s.id?0.55:1}}>
            <span className="dot" style={{background:s.color}}/><span className="donut-name">{s.name}</span><span className="donut-pct">{fmtPct(s.pct)}</span></button></li>
        ))}
      </ul>
    </div>
  );
}

// A row in an inset list (More page, Import / Export): icon, title, optional subtitle, chevron.
function ListRow({ icon, title, sub, onClick, color="var(--accent-text)", className="" }) {
  return (
    <button className={`list-row ${className}`} onClick={onClick}>
      <span className="list-ico" style={{color}}><Icon name={icon} size={20}/></span>
      <span className="list-body"><span className="list-title">{title}</span>{sub&&<span className="list-sub">{sub}</span>}</span>
      <Icon name="chevRight" size={16} color="var(--ink-4)"/>
    </button>
  );
}

// More: the pages that do not have a tab of their own. There is no account, profile, dark-mode switch or help centre in
// this app, so none is shown; the card at the top says where the data lives, which is true and useful.
// Run 16: "How it works" (four short steps) and the privacy notice, one simple sheet each. The notice describes what the app does
// today (no account, no analytics, nothing sent); it is not legal advice and must be kept true if the app ever changes.
function InfoSheet({ kind, onClose }) {
  const n=kind==="how"?4:6;
  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={t("info."+kind+".title")} data-section={"info-"+kind}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:14}}>
          <div className="card-title" style={{fontSize:17}}>{t("info."+kind+".title")}</div>
          <button onClick={onClose} aria-label={t("common.close")} style={{background:"none",border:"1px solid var(--rule)",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-3)",flexShrink:0}}><Icon name="close" size={13}/></button>
        </div>
        {Array.from({length:n},(_,i)=>i+1).map(i=>(
          <div key={i} style={{marginBottom:14}}>
            <div className="list-title">{t("info."+kind+"."+i+".h")}</div>
            <div className="list-sub" style={{lineHeight:1.55,marginTop:2}}>{t("info."+kind+"."+i+".b")}</div>
          </div>
        ))}
        <button className="btn btn-primary btn-full" style={{marginTop:4}} onClick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  );
}

// ─── Debts & loans page (Run 17) ──────────────────────────────────────────────
// Settings → Debts & loans. Debts are person-to-person (no interest); loans have a rate and a schedule (an ESTIMATE from the typed terms).
// Money is stored as whole qapik under its own key (see cleanDebtData). Marking a loan payment adds ONE ordinary expense to Transactions
// (category Finance, merchant = the lender) and remembers its id; deleting the payment record removes that entry too.
const LOAN_KIND_KEY={ cash:"loan.kind.cash", card:"loan.kind.card", taksit:"loan.kind.taksit", other:"loan.kind.other" };
const LOAN_RT_KEY={ annuity:"loan.rt.annuity", equal:"loan.rt.equal", flat:"loan.rt.flat", none:"loan.rt.none" };
function DebtsPage({ currency, onAddEntry, onRemoveEntry, showToast }) {
  const [data,setData]=useState(()=>readDebts());
  const [seg,setSeg]=useState("debts");
  const [showDebt,setShowDebt]=useState(false), [showLoan,setShowLoan]=useState(false);
  const [dForm,setDForm]=useState({ dir:"owe", name:"", amt:"", due:"" }), [dMsg,setDMsg]=useState("");
  const [lForm,setLForm]=useState({ lender:"", kind:"cash", amt:"", type:"annuity", rate:"", months:"", first:"", bank:"" }), [lMsg,setLMsg]=useState("");
  const [pay,setPay]=useState({}), [payMsg,setPayMsg]=useState({});
  const uid=(p)=>`${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
  const q=(v)=>fmt(v/100,currency);
  const save=(next)=>{ setData(next); if (!writeDebts(next)) showToast(t("banner.saveFailed")); };
  const toQ=(text,opts)=>{ const v=formMoney(text,opts); return v===null ? null : Math.round(v*100); };

  const addDebt=()=>{
    const principal=toQ(dForm.amt,{positive:true}), name=dForm.name.trim();
    if (!name || principal===null || !isQapik(principal)) { setDMsg(t("debt.invalid")); return; }
    save({ ...data, debts:[...data.debts,{ id:uid("d"), direction:dForm.dir, name, principal, dueDate:dForm.due, note:"", payments:[] }] });
    setDForm({ dir:"owe", name:"", amt:"", due:"" }); setDMsg(""); setShowDebt(false);
  };
  const addPayment=(d)=>{
    const amt=toQ(pay[d.id]||"",{positive:true});
    if (amt===null || !debtCanPay(d,amt)) { setPayMsg(m=>({...m,[d.id]:t("debt.tooMuch",{left:q(debtRemaining(d))})})); return; }
    save({ ...data, debts:data.debts.map(x=>x.id===d.id?{...x,payments:[...x.payments,{ id:uid("p"), date:today(), amount:amt }]}:x) });
    setPay(p=>({...p,[d.id]:""})); setPayMsg(m=>({...m,[d.id]:""}));
  };
  const delPayment=(d,pid)=>save({ ...data, debts:data.debts.map(x=>x.id===d.id?{...x,payments:x.payments.filter(p=>p.id!==pid)}:x) });
  const delDebt=(d)=>{ if (window.confirm(t("debt.confirmDelete"))) save({ ...data, debts:data.debts.filter(x=>x.id!==d.id) }); };

  const addLoan=()=>{
    const principal=toQ(lForm.amt,{positive:true}), months=Number(lForm.months), bank=lForm.bank.trim()===""?null:toQ(lForm.bank,{positive:true});
    const rate=lForm.type==="none" ? 0 : Number(String(lForm.rate).replace(",","."));
    const loan={ id:uid("l"), lender:lForm.lender.trim(), kind:lForm.kind, principal, ratePct:rate, rateType:lForm.type, months, firstPayment:lForm.first, bankPayment:bank, payments:[] };
    if (!loan.lender || principal===null || (lForm.type!=="none" && lForm.rate.trim()==="") || (lForm.bank.trim()!=="" && bank===null) || loanSchedule(loan)===null) { setLMsg(t("loan.invalid")); return; }
    save({ ...data, loans:[...data.loans,loan] });
    setLForm({ lender:"", kind:"cash", amt:"", type:"annuity", rate:"", months:"", first:"", bank:"" }); setLMsg(""); setShowLoan(false);
  };
  const markPaid=(l,sched)=>{
    const k=l.payments.length; if (k>=sched.payments.length) return;
    const row=sched.payments[k], date=today();
    const txnId=onAddEntry({ type:"expense", amount:row.payment/100, category:"finance", subcategory:"", merchant:l.lender, note:t("loan.entryNote"), date, recurring:false, recurFreq:null, isActive:true });
    save({ ...data, loans:data.loans.map(x=>x.id===l.id?{...x,payments:[...x.payments,{ id:uid("p"), date, amount:row.payment, txnId }]}:x) });
    showToast(t("loan.paidToast"));
  };
  const delLoanPayment=(l,p)=>{
    if (!window.confirm(t("loan.confirmDeletePay"))) return;
    if (p.txnId!==undefined) onRemoveEntry(p.txnId);
    save({ ...data, loans:data.loans.map(x=>x.id===l.id?{...x,payments:x.payments.filter(y=>y.id!==p.id)}:x) });
  };
  const delLoan=(l)=>{ if (window.confirm(t("debt.confirmDelete"))) save({ ...data, loans:data.loans.filter(x=>x.id!==l.id) }); };

  const owe=data.debts.filter(d=>d.direction==="owe").reduce((s,d)=>s+debtRemaining(d),0), owed=data.debts.filter(d=>d.direction==="owed").reduce((s,d)=>s+debtRemaining(d),0);
  const loanLeft=data.loans.reduce((s,l)=>{ const sc=loanSchedule(l), k=l.payments.length; return s+(sc ? (k===0 ? l.principal : k>=sc.payments.length ? 0 : sc.payments[k-1].balance) : 0); },0);
  const upd=(setter)=>(e)=>{ const k=e.target.name; const v=e.target.value; setter(f=>({...f,[k]:v})); };

  return (
    <div className="goals-page" data-section="debts-page">
      <div className="card" data-section="debts-summary">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
          {[[t("debt.totalOwe"),q(owe)],[t("debt.totalOwed"),q(owed)],[t("debt.totalLoans"),q(loanLeft)]].map(([lbl,val])=>(
            <div key={lbl}><div className="list-sub">{lbl}</div><div style={{fontSize:14,fontWeight:700,color:"var(--ink)"}}>{val}</div></div>
          ))}
        </div>
      </div>
      <div className="seg" role="tablist" aria-label={t("debt.title")}>
        {[["debts",t("debt.segDebts")],["loans",t("debt.segLoans")]].map(([id,lbl])=>(
          <button key={id} role="tab" aria-selected={seg===id} className={`seg-btn${seg===id?" on":""}`} onClick={()=>setSeg(id)}>{lbl}</button>
        ))}
      </div>

      {seg==="debts"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",margin:"4px 2px 10px"}}>
          <button className="btn btn-sm" data-section="debt-add-btn" onClick={()=>setShowDebt(s=>!s)}>{showDebt?t("common.cancel"):t("set.add")}</button>
        </div>
        {showDebt&&(
          <div className="card" data-section="debt-form">
            <fieldset className="lang-switch" style={{marginBottom:10}} aria-label={t("debt.dirLabel")}>
              {[["owe",t("debt.dirOwe")],["owed",t("debt.dirOwed")]].map(([v,lbl])=>(
                <label key={v} className={`lang-pill${dForm.dir===v?" sel":""}`}><input type="radio" name="debt-dir" value={v} checked={dForm.dir===v} onChange={()=>setDForm(f=>({...f,dir:v}))}/>{lbl}</label>
              ))}
            </fieldset>
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="debt-name">{t("debt.person")}</label><input id="debt-name" name="name" className="field-input" value={dForm.name} maxLength={60} onChange={upd(setDForm)}/></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="debt-amt">{t("debt.amount")}</label><input id="debt-amt" name="amt" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={dForm.amt} onChange={e=>setDForm(f=>({...f,amt:cleanMoneyText(e.target.value)}))}/></div>
            </div>
            <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="debt-due">{t("debt.due")}</label><input id="debt-due" name="due" className="field-input" lang={locale()} type="date" value={dForm.due} onChange={upd(setDForm)}/></div>
            {dMsg&&<div role="alert" className="list-sub" style={{color:"var(--neg)",marginBottom:8}}>{dMsg}</div>}
            <button className="btn btn-primary btn-full" style={{marginTop:0}} data-section="debt-save" onClick={addDebt}>{t("common.save")}</button>
          </div>
        )}
        {data.debts.length===0&&!showDebt&&<div className="list-sub" style={{margin:"0 2px"}}>{t("debt.none")}</div>}
        {data.debts.map(d=>{ const left=debtRemaining(d); return (
          <div key={d.id} className="card" data-section="debt-card" data-id={d.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{minWidth:0}}>
                <div className="goal-name">{maskText(d.name)}</div>
                <div className="list-sub">{t(d.direction==="owe"?"debt.badgeOwe":"debt.badgeOwed")}{d.dueDate?` · ${t("debt.dueOn",{date:fmtDate(d.dueDate)})}`:""}</div>
              </div>
              <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>delDebt(d)} aria-label={t("debt.delete",{name:maskText(d.name)})}><Icon name="trash" size={15}/></button>
            </div>
            <div style={{marginTop:8}}>
              <div className="list-sub">{t("debt.remaining")}</div>
              {left>0 ? <div className="big-num debt-remaining">{q(left)} <span className="list-sub">{t("debt.of",{total:q(d.principal)})}</span></div> : <div className="big-num debt-remaining" style={{color:"var(--pos)"}}>{t("debt.settled")}</div>}
              <div className="bar" style={{marginTop:6}}><div className="bar-fill" style={{width:`${Math.min(100,(d.principal-left)/d.principal*100)}%`,background:"var(--accent)"}}/></div>
            </div>
            {left>0&&(
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <input className="field-input debt-pay-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" aria-label={t("debt.payAmount")} value={pay[d.id]||""} onChange={e=>setPay(p=>({...p,[d.id]:cleanMoneyText(e.target.value)}))} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                <button className="btn btn-sm btn-sm-primary debt-pay-btn" onClick={()=>addPayment(d)}>{t("debt.pay")}</button>
              </div>
            )}
            {payMsg[d.id]&&<div role="alert" className="list-sub" style={{color:"var(--neg)",marginTop:6}}>{payMsg[d.id]}</div>}
            {d.payments.map(p=>(
              <div key={p.id} className="debt-pay-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"6px 0",borderTop:"1px solid var(--rule)",marginTop:6}}>
                <span className="list-sub">{fmtDate(p.date)}</span><span style={{fontSize:13,fontWeight:600}}>{q(p.amount)}</span>
                <button className="topbar-btn debt-pay-del" style={{color:"var(--ink-4)"}} onClick={()=>delPayment(d,p.id)} aria-label={t("debt.deletePay",{amount:q(p.amount)})}><Icon name="trash" size={14}/></button>
              </div>
            ))}
          </div>
        ); })}
      </>)}

      {seg==="loans"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",margin:"4px 2px 10px"}}>
          <button className="btn btn-sm" data-section="loan-add-btn" onClick={()=>setShowLoan(s=>!s)}>{showLoan?t("common.cancel"):t("set.add")}</button>
        </div>
        {showLoan&&(
          <div className="card" data-section="loan-form">
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-lender">{t("loan.lender")}</label><input id="loan-lender" name="lender" className="field-input" value={lForm.lender} maxLength={60} onChange={upd(setLForm)}/></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-kind">{t("loan.kind")}</label><select id="loan-kind" name="kind" className="field-input field-select" value={lForm.kind} onChange={upd(setLForm)}>{LOAN_KINDS.map(k=><option key={k} value={k}>{t(LOAN_KIND_KEY[k])}</option>)}</select></div>
            </div>
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-amt">{t("loan.amount")}</label><input id="loan-amt" name="amt" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={lForm.amt} onChange={e=>setLForm(f=>({...f,amt:cleanMoneyText(e.target.value)}))}/></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-months">{t("loan.months")}</label><input id="loan-months" name="months" className="field-input" type="text" inputMode="numeric" autoComplete="off" value={lForm.months} onChange={e=>setLForm(f=>({...f,months:e.target.value.replace(/[^0-9]/g,"")}))}/></div>
            </div>
            <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="loan-type">{t("loan.rateType")}</label><select id="loan-type" name="type" className="field-input field-select" value={lForm.type} onChange={upd(setLForm)}>{LOAN_RATE_TYPES.map(k=><option key={k} value={k}>{t(LOAN_RT_KEY[k])}</option>)}</select></div>
            <div className="field-row" style={{marginBottom:10}}>
              {lForm.type!=="none"&&<div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-rate">{t("loan.rate")}</label><input id="loan-rate" name="rate" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={lForm.rate} onChange={e=>setLForm(f=>({...f,rate:cleanMoneyText(e.target.value)}))}/></div>}
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-first">{t("loan.first")}</label><input id="loan-first" name="first" className="field-input" lang={locale()} type="date" value={lForm.first} onChange={upd(setLForm)}/></div>
            </div>
            <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="loan-bank">{t("loan.bank")}</label><input id="loan-bank" name="bank" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={lForm.bank} onChange={e=>setLForm(f=>({...f,bank:cleanMoneyText(e.target.value)}))}/><div className="list-sub" style={{marginTop:4}}>{t("loan.bankHint")}</div></div>
            {lMsg&&<div role="alert" className="list-sub" style={{color:"var(--neg)",marginBottom:8}}>{lMsg}</div>}
            <button className="btn btn-primary btn-full" style={{marginTop:0}} data-section="loan-save" onClick={addLoan}>{t("common.save")}</button>
          </div>
        )}
        {data.loans.length===0&&!showLoan&&<div className="list-sub" style={{margin:"0 2px"}}>{t("loan.none")}</div>}
        {data.loans.map(l=>{
          const sc=loanSchedule(l); if (!sc) return null;
          const k=l.payments.length, done=k>=sc.payments.length, next=done?null:sc.payments[k], balance=k===0?l.principal:done?0:sc.payments[k-1].balance;
          const implied=l.rateType==="flat" ? impliedNominalPct(l.principal,l.months,sc.payments[0].payment) : null;
          return (
            <div key={l.id} className="card" data-section="loan-card" data-id={l.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{minWidth:0}}><div className="goal-name">{maskText(l.lender)}</div><div className="list-sub">{t(LOAN_KIND_KEY[l.kind])} · {q(l.principal)}</div></div>
                <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>delLoan(l)} aria-label={t("debt.delete",{name:maskText(l.lender)})}><Icon name="trash" size={15}/></button>
              </div>
              <div style={{marginTop:8}}>
                <div className="list-sub">{t("loan.monthly")}</div>
                <div className="big-num loan-monthly">{q(sc.payments[0].payment)}</div>
                <div className="list-sub loan-next" style={{marginTop:2}}>{done ? t("loan.allPaid") : t("loan.next",{amount:q(next.payment),date:fmtDate(next.date)})}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
                <div><div className="list-sub">{t("loan.balance")}</div><div className="loan-balance" style={{fontSize:14,fontWeight:700}}>{q(balance)}</div></div>
                <div><div className="list-sub">{t("loan.totalInterest")}</div><div className="loan-interest" style={{fontSize:14,fontWeight:700}}>{q(sc.totalInterest)}</div></div>
              </div>
              {implied!==null&&<div className="list-sub" style={{marginTop:8}}>{t("loan.flatReal",{pct:fmtPct(Math.round(implied*10)/10)})}</div>}
              <div className="list-sub" style={{marginTop:8,lineHeight:1.5}}>{t("loan.estimate")}</div>
              {!done&&<button className="btn btn-primary btn-full loan-paid-btn" style={{marginTop:10}} onClick={()=>markPaid(l,sc)}>{t("loan.markPaid")}</button>}
              {l.payments.length>0&&<div className="list-sub" style={{marginTop:12}}>{t("loan.paymentsTitle")}</div>}
              {l.payments.map(p=>(
                <div key={p.id} className="loan-pay-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"6px 0",borderTop:"1px solid var(--rule)",marginTop:6}}>
                  <span className="list-sub">{fmtDate(p.date)}</span><span style={{fontSize:13,fontWeight:600}}>{q(p.amount)}</span>
                  <button className="topbar-btn loan-pay-del" style={{color:"var(--ink-4)"}} onClick={()=>delLoanPayment(l,p)} aria-label={t("loan.deletePay",{amount:q(p.amount)})}><Icon name="trash" size={14}/></button>
                </div>
              ))}
            </div>
          );
        })}
      </>)}
    </div>
  );
}

function MorePage({ language, profileName="", onLanguageChange, onProfileName, onOpen, onSettings, onInfo, version }) {
  const [name,setName]=useState(profileName);
  return (
    <div className="more-page">
      {/* Run 17: this tab is Settings. Profile name (used in the Home greeting) and the interface language are set here. */}
      <div className="card st-card" data-section="st-profile" role="group" aria-label={t("st.profile")}>
        <label className="field-lbl" htmlFor="profile-name">{t("st.profileName")}</label>
        <div style={{display:"flex",gap:8}}>
          <input id="profile-name" className="field-input" autoComplete="off" maxLength={PROFILE_NAME_MAX*2} placeholder={t("st.profilePh")} value={name} onChange={e=>setName(e.target.value)} style={{flex:1}}/>
          <button className="btn btn-sm btn-sm-primary" onClick={()=>{ onProfileName(name); setName(cleanProfileName(name)); }}>{t("common.save")}</button>
        </div>
        <div className="list-sub" style={{marginTop:6}}>{t("st.profileSub")}</div>
      </div>
      <div className="card st-card" data-section="st-language">
        <div className="settings-section-lbl" id="set-lang-lbl" style={{marginTop:0}}>{t("lang.setting")}</div>
        <fieldset className="lang-switch" aria-labelledby="set-lang-lbl">
          {LANGS.map(l=>(
            <label key={l} className={`lang-pill${language===l?" sel":""}`} lang={l}>
              <input type="radio" name="settings-language" value={l} checked={language===l} onChange={()=>onLanguageChange(l)}/>
              {LANG_NAMES[l]}
            </label>
          ))}
        </fieldset>
        <div className="list-sub" style={{marginTop:6}}>{t("lang.settingSub")}</div>
      </div>
      <div className="card more-id">
        <span className="more-mark" aria-hidden="true"><Icon name="finance" size={22} color="var(--accent)"/></span>
        <div><div className="list-title">Expense Ledger</div><div className="list-sub">{t("more.localData")}</div></div>
      </div>
      <div className="card list-card">
        <ListRow icon="repeat" title={t("rec.title")} sub={t("more.recurringSub")} onClick={()=>onOpen("recurring")}/>
        <ListRow icon="upload" title={t("io.title")} sub={t("more.ioSub")} onClick={()=>onOpen("io")}/>
        <ListRow icon="settings" title={t("set.preferences")} sub={t("more.settingsSub")} onClick={onSettings}/>
        {/* Run 16: appended after the earlier rows, so the first three keep their places */}
        <ListRow icon="list" title={t("info.how.title")} sub={t("more.howSub")} onClick={()=>onInfo("how")}/>
        <ListRow icon="safe" title={t("info.privacy.title")} sub={t("more.privacySub")} onClick={()=>onInfo("privacy")}/>
        {/* Run 17: appended, so the first five rows keep their places */}
        <ListRow icon="finance" title={t("debt.title")} sub={t("debt.rowSub")} onClick={()=>onOpen("debts")}/>
      </div>
      {version&&<div className="list-sub app-version" style={{textAlign:"center",marginTop:4}}>{t("more.version",{v:version})}</div>}
    </div>
  );
}

// Import / Export: the same import, export and backup functions Settings used to hold, on a page of their own.
// There is no import history in the data, so no "recent imports" list is shown.
function ImportExportPage({ state, onExportCSV, onExportJSON, onImportFile, onConfirmBackup, onShareBackup, protection, onProtect, onInstall }) {
  const fileRef=useRef();
  const { transactions, lastBackup, backupConfirmedAt }=state;
  const confirmed=!!(lastBackup && backupConfirmedAt && Date.parse(backupConfirmedAt)>=Date.parse(lastBackup));
  // Can this device hand a file to the share menu? (Android and iPhone: yes; many desktop browsers: no.)
  const canShareFiles=useMemo(()=>{ try { if (nativeShareHook()) return true; return typeof navigator.canShare==="function" && typeof File!=="undefined" && navigator.canShare({files:[new File(["{}"],"x.json",{type:"application/json"})]}); } catch { return false; } },[]);
  const standalone=typeof window!=="undefined" && ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone===true);
  return (
    <div className="io-page">
      {/* Run 10: how safe the data is on this phone, and what makes it safer */}
      <div className="section-title" style={{marginTop:0}}>{t("io.safety")}</div>
      <div className="card io-safety">
        <div className="io-backup">
          <div style={{minWidth:0}}>
            <div className="list-title">{t("io.protectTitle")}</div>
            <div className="list-sub" style={{lineHeight:1.5}}>{t(protection==="on"?"io.protectOn":protection==="off"?"io.protectOff":"io.protectUnsupported")}</div>
          </div>
          <span className={`io-status${protection==="on"?" ok":""}`}>{protection==="on"?<><Icon name="check" size={12}/>{t("io.on")}</>:protection==="off"?t("io.off"):"—"}</span>
        </div>
        {protection==="off"&&<button className="btn btn-ghost btn-full io-protect" onClick={onProtect}>{t("io.protectBtn")}</button>}
        {!standalone&&(
          <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--rule)"}}>
            <div className="list-title">{t("io.installTitle")}</div>
            <div className="list-sub" style={{lineHeight:1.5}}>{t("io.installHow")}</div>
            {onInstall&&<button className="btn btn-ghost btn-full io-install" onClick={onInstall}>{t("io.installBtn")}</button>}
          </div>
        )}
      </div>
      <div className="io-grid">
        <div className="card io-card drop-zone" role="button" tabIndex={0} aria-label={`${t("io.import")}. ${t("io.importSub")}`} onKeyDown={activateKey(()=>fileRef.current?.click())} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onImportFile(e.dataTransfer.files[0]);}}>
          <input ref={fileRef} type="file" accept=".json,.csv" aria-label={t("import.title")} onClick={e=>e.stopPropagation()} onChange={e=>{onImportFile(e.target.files[0]);e.target.value="";}}/>
          <span className="io-ico" style={{color:"var(--accent-text)"}}><Icon name="upload" size={24}/></span>
          <div className="list-title">{t("io.import")}</div>
          <div className="list-sub">{t("io.importSub")}</div>
        </div>
        <div className="card io-card">
          <span className="io-ico" style={{color:"var(--violet)"}}><Icon name="download" size={24}/></span>
          <div className="list-title">{t("io.export")}</div>
          <div className="list-sub">{t("set.exportCsvSub")}</div>
          <button className="btn btn-sm" onClick={onExportCSV} style={{marginTop:10}}><Icon name="download" size={12}/>{t("io.exportCsv")}</button>
        </div>
      </div>
      <div className="section-title">{t("io.backups")}</div>
      <div className="card">
        {lastBackup?(
          <div className="io-backup">
            <div style={{minWidth:0}}>
              <div className="list-sub">{t("set.lastBackup")}</div>
              <div className="list-title">{fmtLongDate(lastBackup)}</div>
            </div>
            <span className={`io-status${confirmed?" ok":""}`}>{confirmed?<><Icon name="check" size={12}/>{t("io.confirmed")}</>:t("io.unconfirmed")}</span>
          </div>
        ):(
          <div className="list-title" style={{color:"var(--neg)"}}>{t("set.noBackup")}</div>
        )}
        <div className="list-sub" style={{marginTop:8,lineHeight:1.5}}>
          {lastBackup && (confirmed ? t("set.confirmedOn",{date:fmtLongDate(backupConfirmedAt)}) : t("set.notConfirmed"))}{lastBackup?" ":""}{t("set.cantTell")}
        </div>
        {canShareFiles&&onShareBackup&&<>
          <button className="btn btn-primary btn-full io-share" onClick={onShareBackup} style={{marginTop:12}}><Icon name="upload" size={16}/>{t("io.shareBackup")}</button>
          <div className="list-sub" style={{marginTop:6,lineHeight:1.5}}>{t("io.shareHint")}</div>
        </>}
        <button className={`btn ${canShareFiles&&onShareBackup?"btn-ghost":"btn-primary"} btn-full`} onClick={onExportJSON} style={{marginTop:canShareFiles&&onShareBackup?8:12}}><Icon name="backup" size={16}/>{t("io.createBackup")}</button>
        {lastBackup && !confirmed && <button className="btn btn-ghost btn-full" onClick={onConfirmBackup}>{t("banner.haveFile")}</button>}
        <div className="list-sub" style={{marginTop:8}}>{tn("set.jsonBackupSub",transactions.length)}</div>
      </div>
    </div>
  );
}

// Budgets & Goals: budget limits and savings goals, edited here (they used to be inside Settings).
function BudgetsGoalsPage({ state, showToast, seg, onSeg, addSignal, onSetBudget, onAddGoal, onUpdateGoal, onDeleteGoal, onAddTemplate, onDeleteTemplate, onSafeToSpendChange }) {
  const { transactions, budgets={}, goals=[], currency, templates=[], safeToSpend={} }=state;
  const setSeg=onSeg;
  const [editBudget,setEditBudget]=useState(null), [budgetVal,setBudgetVal]=useState("");
  const [showNewGoal,setShowNewGoal]=useState(false);
  // "New budget" form opened by the title bar's "+" on the Budgets half: pick a category without a limit, type the limit.
  const [newBudget,setNewBudget]=useState(null);   // null = closed; otherwise { catId, val }
  const seenSignal=useRef(addSignal);
  useEffect(()=>{
    if (addSignal===seenSignal.current) return; seenSignal.current=addSignal;
    if (seg==="goals") setShowNewGoal(true);
    else { const free=CATEGORIES.filter(c=>!c.income && !(budgets[c.id]>0)); setNewBudget({ catId:(free[0]||CATEGORIES[0]).id, val:"" }); }
    window.scrollTo(0,0);
  },[addSignal]);
  const [goalName,setGoalName]=useState(""), [goalTarget,setGoalTarget]=useState(""), [goalSaved,setGoalSaved]=useState("");
  const [goalMonthly,setGoalMonthly]=useState(""), [goalDate,setGoalDate]=useState("");
  const now=curMon();
  const catSpend=calcCategorySpend(transactions,now);
  const items=calcBudgetStatus(budgets,catSpend,now);
  const byCat=Object.fromEntries(items.map(x=>[x.catId,x]));
  const limitTotal=items.reduce((s,x)=>s+x.limit,0), spentTotal=items.reduce((s,x)=>s+x.spent,0);
  const expCats=CATEGORIES.filter(c=>!c.income);
  const budgeted=expCats.filter(c=>byCat[c.id]), unbudgeted=expCats.filter(c=>!byCat[c.id]);

  const saveGoal=()=>{
    const gTarget=formMoney(goalTarget,{positive:true});
    const gSaved=goalSaved.trim()===""?0:formMoney(goalSaved);
    const gMonthly=goalMonthly.trim()===""?0:formMoney(goalMonthly);
    if (!goalName.trim()||gTarget===null) { showToast(t("set.goalInvalidTarget")); return; }
    if (gSaved===null||gMonthly===null) { showToast(t("set.goalInvalidAmounts")); return; }
    if (goalDate && !isValidDateStr(goalDate)) { showToast(t("set.goalInvalidDate")); return; }
    onAddGoal({name:goalName.trim(),target:gTarget,saved:gSaved,monthlyTarget:gMonthly,targetDate:goalDate||null});
    setGoalName("");setGoalTarget("");setGoalSaved("");setGoalMonthly("");setGoalDate("");setShowNewGoal(false);
  };
  const editRow=(cat,limit)=>editBudget===cat.id&&(
    <div style={{display:"flex",gap:7,marginTop:9}}>
      <input className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder={t("set.monthlyLimit")} aria-label={`${t("set.monthlyLimit")}: ${catName(cat.id)}`} value={budgetVal} onChange={e=>setBudgetVal(cleanMoneyText(e.target.value))} autoFocus style={{flex:1,padding:"8px 10px",fontSize:13}}/>
      <button className="btn btn-sm btn-sm-primary" onClick={()=>{const v=budgetVal.trim()===""?0:formMoney(budgetVal); if(v===null){showToast(t("set.zeroOrMore"));return;} onSetBudget(cat.id,v);setEditBudget(null);showToast(t("set.budgetSaved"));}}>{t("common.save")}</button>
      <button className="btn btn-sm" onClick={()=>setEditBudget(null)} aria-label={t("common.cancel")}>✕</button>
    </div>
  );
  const editBtn=(cat,limit)=>(
    <button className="btn btn-sm" onClick={()=>{setEditBudget(cat.id);setBudgetVal(limit>0?String(limit):"");}} aria-label={`${limit>0?t("common.edit"):t("set.set")}: ${catName(cat.id)}`}>{limit>0?t("common.edit"):t("set.set")}</button>
  );

  return (
    <div className="goals-page">
      <div className="seg" role="tablist" aria-label={t("goals.pageTitle")}>
        {[["budgets",t("budgets.title")],["goals",t("goals.title")]].map(([id,lbl])=>(
          <button key={id} role="tab" aria-selected={seg===id} className={`seg-btn${seg===id?" on":""}`} onClick={()=>setSeg(id)}>{lbl}</button>
        ))}
      </div>

      {seg==="budgets"&&(<>
        {newBudget&&(
          <div className="card new-budget">
            <div className="card-title" style={{marginBottom:10}}>{t("goals.addBudget")}</div>
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="nb-cat">{t("add.category")}</label>
                <select id="nb-cat" className="field-input field-select" value={newBudget.catId} onChange={e=>setNewBudget(b=>({...b,catId:e.target.value}))}>
                  {expCats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}{budgets[c.id]>0?` (${fmt(budgets[c.id],currency)})`:""}</option>)}
                </select></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="nb-val">{t("set.monthlyLimit")}</label>
                <input id="nb-val" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={newBudget.val} onChange={e=>setNewBudget(b=>({...b,val:cleanMoneyText(e.target.value)}))} autoFocus/></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-primary" style={{flex:1,marginTop:0}} onClick={()=>{ const v=newBudget.val.trim()===""?null:formMoney(newBudget.val,{positive:true}); if(v===null){showToast(t("add.errAmount"));return;} onSetBudget(newBudget.catId,v); setNewBudget(null); showToast(t("set.budgetSaved")); }}>{t("common.save")}</button>
              <button className="btn btn-ghost" style={{flex:1,marginTop:0}} onClick={()=>setNewBudget(null)}>{t("common.cancel")}</button>
            </div>
          </div>
        )}
        {limitTotal>0&&(
          <div className="card" data-section="bg-total">
            <div className="list-sub">{t("budgets.monthTotal",{month:monthName(now)})}</div>
            <div className="big-num">{fmt(limitTotal,currency)}</div>
            <div className="bar"><div className="bar-fill" style={{width:`${Math.min(spentTotal/limitTotal*100,100)}%`,background:spentTotal>limitTotal?"var(--neg)":spentTotal>=0.8*limitTotal?"var(--warn)":"var(--pos)"}}/></div>
            <div className="list-sub" style={{marginTop:8}}>{t("budgets.spentOf",{spent:fmt(spentTotal,currency),limit:fmt(limitTotal,currency)})}</div>
            <div style={{fontSize:13,fontWeight:600,marginTop:6,color:spentTotal>limitTotal?"var(--neg)":"var(--pos)"}}>
              {spentTotal>limitTotal?t("budgets.over",{amount:fmt(spentTotal-limitTotal,currency)}):t("budgets.remaining",{amount:fmt(limitTotal-spentTotal,currency)})}
            </div>
          </div>
        )}
        <div className="section-title">{t("budgets.byCategory")}</div>
        {budgeted.length===0&&<div className="list-sub" style={{margin:"0 2px 12px"}}>{t("budgets.none")}</div>}
        {budgeted.length>0&&(
          <div className="card list-card">
            {budgeted.map(cat=>{ const x=byCat[cat.id]; const pct=Math.round(x.spent/x.limit*100); return (
              <div key={cat.id} className="bud-row">
                <div className="bud-top">
                  <span className="cat-dot" style={{background:cat.color+"26"}}><CatIcon catId={cat.id} size={16}/></span>
                  <span className="bud-name">{catName(cat.id)}</span>
                  <span className="bud-nums">{fmt(x.spent,currency)} / {fmt(x.limit,currency)}</span>
                </div>
                <div className="bud-bar-row">
                  <div className="bar"><div className="bar-fill" style={{width:`${x.pct}%`,background:x.over?"var(--neg)":x.warn?"var(--warn)":"var(--pos)"}}/></div>
                  <span className="bud-pct" style={{color:x.over?"var(--neg)":"var(--ink-3)"}}>{fmtPct(pct)}</span>
                  {editBtn(cat,x.limit)}
                </div>
                {editRow(cat,x.limit)}
              </div>
            ); })}
          </div>
        )}
        <div className="section-title">{t("budgets.notSet")}</div>
        <div className="card list-card">
          {unbudgeted.map(cat=>(
            <div key={cat.id} className="bud-row">
              <div className="bud-top">
                <span className="cat-dot" style={{background:cat.color+"26"}}><CatIcon catId={cat.id} size={16}/></span>
                <span className="bud-name">{catName(cat.id)}</span>
                {editBtn(cat,0)}
              </div>
              {editRow(cat,0)}
            </div>
          ))}
        </div>
      </>)}

      {seg==="goals"&&(<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,margin:"4px 2px 10px"}}>
          <span className="section-title" style={{margin:0}}>{t("set.financialGoals")}</span>
          <button className="btn btn-sm" onClick={()=>setShowNewGoal(s=>!s)}>{showNewGoal?t("common.cancel"):t("set.add")}</button>
        </div>
        {showNewGoal&&(
          <div className="card">
            <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="goal-name">{t("set.goalName")}</label><input id="goal-name" className="field-input" placeholder={t("set.goalNamePh")} value={goalName} onChange={e=>setGoalName(e.target.value)} autoFocus/></div>
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-target">{t("set.target",{currency})}</label><input id="goal-target" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={goalTarget} onChange={e=>setGoalTarget(cleanMoneyText(e.target.value))}/></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-saved">{t("set.savedSoFar")}</label><input id="goal-saved" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={goalSaved} onChange={e=>setGoalSaved(cleanMoneyText(e.target.value))}/></div>
            </div>
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-monthly">{t("set.monthlyContribution")}</label><input id="goal-monthly" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder={t("set.optionalPh")} value={goalMonthly} onChange={e=>setGoalMonthly(cleanMoneyText(e.target.value))}/></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-date">{t("set.targetDate")}</label><input id="goal-date" className="field-input" lang={locale()} type="date" value={goalDate} onChange={e=>setGoalDate(e.target.value)}/></div>
            </div>
            <button className="btn btn-primary btn-full" style={{marginTop:0}} onClick={saveGoal}>{t("set.saveGoal")}</button>
          </div>
        )}
        {goals.length===0&&!showNewGoal&&<div className="list-sub" style={{margin:"0 2px"}}>{t("set.noGoals")}</div>}
        {goals.map(goal=>{
          const gp=calcGoalProgress(goal); const {pct,remaining,estCompletion}=gp; const req=goalRequiredMonthly(goal);
          return (
            <div key={goal.id} className="card goal-card" data-section="goal-card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{display:"flex",gap:10,alignItems:"center",minWidth:0}}>
                  <span className="cat-dot" style={{background:"var(--pos-bg)"}}><Icon name="goal" size={16} color="var(--pos)"/></span>
                  <div style={{minWidth:0}}>
                    <div className="goal-name">{maskText(goal.name)}</div>
                    <div className="list-sub">{t("goals.savedOf",{ saved:fmt(goal.saved||0,currency), target:fmt(goal.target||0,currency) })}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                  <button className="btn btn-sm" onClick={()=>{
                    const newSaved=prompt(t("set.updatePrompt",{name:goal.name}),goal.saved||0);
                    if (newSaved!==null) { const v=formMoney(newSaved); if (v===null) showToast(t("set.updateInvalid")); else onUpdateGoal(goal.id,{saved:v}); }
                  }}>{t("set.update")}</button>
                  <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>onDeleteGoal(goal.id)} aria-label={t("set.deleteGoal",{name:maskText(goal.name)})}><Icon name="trash" size={15}/></button>
                </div>
              </div>
              <div className="bud-bar-row" style={{marginTop:12}}>
                <div className="bar"><div className="bar-fill" style={{width:`${pct}%`,background:"var(--accent)"}}/></div>
                <span className="bud-pct">{fmtPct(Math.round(pct))}</span>
              </div>
              {/* Run 15: the answer to "how much must I save each month?" comes first; the what-if below is optional. */}
              {(req.state==="active"||req.state==="noDate"||req.state==="overdue")&&(
                <div className={`goal-need${req.state==="active"?"":" goal-need-muted"}`} data-section="goal-need" role="note">
                  {req.state==="active"&&<>
                    <div className="goal-need-main">{req.thisMonth?t("goals.needThisMonth",{amount:fmt(req.perMonth,currency),date:fmtDate(goal.targetDate)}):t("goals.needMain",{amount:fmt(req.perMonth,currency)})}</div>
                    {!req.thisMonth&&<div className="list-sub">{tn("goals.needSub",req.periods,{date:fmtDate(goal.targetDate)})}</div>}
                    <div className="list-sub goal-need-note">{t("goals.needNote")}</div>
                  </>}
                  {req.state==="noDate"&&<div>{t("goals.needNoDate")}</div>}
                  {req.state==="overdue"&&<div>{t("goals.needOverdue",{amount:fmt(req.remaining,currency)})}</div>}
                </div>
              )}
              <div className="list-sub" style={{marginTop:6,color:gp.behindSchedule||gp.overdue?"var(--neg)":gp.onTrack||gp.complete?"var(--pos)":"var(--ink-3)"}}>
                {gp.complete?t("goals.completed")
                  :goal.targetDate&&gp.daysToTarget!==null?<>{gp.overdue?tn("goals.overdueDays",-gp.daysToTarget):gp.daysToTarget===0?t("set.targetToday"):tn("set.daysToTarget",gp.daysToTarget)}{gp.behindSchedule?t("set.projectedAfter"):gp.onTrack?t("set.onTrackSuffix"):""}</>
                  :remaining>0?t("goals.toGo",{amount:fmt(remaining,currency)}):""}
              </div>
              {estCompletion&&<div className="list-sub" style={{marginTop:4}}>{t("set.atRate",{amount:fmt(goal.monthlyTarget||0,currency),date:estCompletion})}</div>}
              {!gp.complete&&<GoalScenario goal={goal} currency={currency}/>}
            </div>
          );
        })}
        <SavingsFloorCard safeToSpend={safeToSpend} onSafeToSpendChange={onSafeToSpendChange} showToast={showToast}/>
        <TemplatesSection templates={templates} currency={currency} onAddTemplate={onAddTemplate} onDeleteTemplate={onDeleteTemplate} showToast={showToast}/>
      </>)}
    </div>
  );
}

// Run 15: the optional what-if, replacing the fixed 60% / 100% / 140% rows. The user types an amount; the answer uses the same
// month-start rule and cents as the required monthly amount, says whether it meets the deadline, and says it is an estimate.
function GoalScenario({ goal, currency }) {
  const [val,setVal]=useState("");
  const amt=val.trim()===""?null:formMoney(val,{positive:true});
  const s=amt!==null ? goalScenario(goal,amt) : null;
  const id="gs-"+String(goal.id).replace(/[^a-zA-Z0-9_-]/g,"");
  return (
    <details className="goal-scenario" data-section="goal-scenario">
      <summary>{t("goals.scenarioTitle")}</summary>
      <label className="field-lbl" htmlFor={id}>{t("goals.scenarioLabel")}</label>
      <input id={id} className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={val} onChange={e=>setVal(cleanMoneyText(e.target.value))}/>
      {val.trim()!==""&&amt===null&&<div className="list-sub" role="status">{t("add.errAmount")}</div>}
      {s&&s.valid&&(
        <div className="goal-scenario-out" role="status" aria-live="polite">
          <div>{t("goals.scenarioResult",{amount:fmt(amt,currency),months:tn("set.months",s.months),date:s.completion})}</div>
          {s.meetsDeadline!==null&&<div className="list-sub" style={{color:s.meetsDeadline?"var(--pos)":"var(--neg)",fontWeight:600}}>{t(s.meetsDeadline?"goals.scenarioMeets":"goals.scenarioMisses")}</div>}
          <div className="list-sub">{t("goals.scenarioEstimate")}</div>
        </div>
      )}
    </details>
  );
}

// Analytics "Spending trend": this month's running total, with the previous month's as a faint line for comparison.
function SpendingTrend({ transactions, mon, prv, currency }) {
  const cur=cumulativeByDay(transactions,mon), prev=cumulativeByDay(transactions,prv);
  const curLast=[...cur].reverse().find(v=>v!==null)??0, prevLast=prev[prev.length-1]??0;
  if (!(curLast>0) && !(prevLast>0)) return null;
  const W=320, H=120, n=Math.max(cur.length,prev.length), max=Math.max(curLast,prevLast,1);
  const x=i=>(i/(n-1))*W, y=v=>H-(v/max)*(H-8);
  const path=arr=>arr.map((v,i)=>v===null?null:`${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean);
  const cp=path(cur), pp=path(prev);
  const ticks=[1,8,15,22,n];
  return (
    <div className="card trend-card">
      <div className="card-head"><span className="card-title">{t("an.trendTitle")}</span></div>
      <div className="big-num" style={{marginBottom:2}}>{fmt(curLast,currency)}</div>
      <div className="list-sub" style={{marginBottom:10}}>{t("an.trendSub",{month:monthName(prv)})}</div>
      <svg viewBox={`0 0 ${W} ${H+18}`} width="100%" role="img" aria-label={t("an.trendAria",{amount:fmt(curLast,currency),prev:fmt(prevLast,currency)})}>
        {[0.5,1].map(f=><line key={f} x1="0" x2={W} y1={y(max*f)} y2={y(max*f)} stroke="var(--rule)" strokeWidth="1"/>)}
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--rule-2)" strokeWidth="1"/>
        {pp.length>1&&<polyline points={pp.join(" ")} fill="none" stroke="var(--ink-4)" strokeWidth="1.5" strokeDasharray="4 4"/>}
        {cp.length>1&&<>
          <polygon points={`0,${H} ${cp.join(" ")} ${cp[cp.length-1].split(",")[0]},${H}`} fill="var(--accent)" opacity="0.18"/>
          <polyline points={cp.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round"/>
        </>}
        {ticks.map(d=><text key={d} x={Math.min(Math.max(x(d-1),8),W-8)} y={H+15} textAnchor="middle" fontSize="11" fill="var(--ink-3)">{d}</text>)}
      </svg>
      <div className="trend-legend"><span><i style={{background:"var(--accent)"}}/>{monthName(mon)}</span><span><i className="dash"/>{monthName(prv)}</span></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY VIEW — browse any month, see full breakdown
// ─────────────────────────────────────────────────────────────────────────────
// ─── Monthly (Run 7: Monthly and Analytics merged into one month-aware screen) ──────────────────────────────────────
// One selected month drives every month figure on the page: summary and comparison, what changed, statistics, budgets,
// categories, merchants, top expenses and the transaction list. The "Trends" section below them covers recent months up
// to today and says so; it does not change with the selected month. Every calendar month from the first entry to today
// (or to the last month with planned entries) can be selected, including months with no entries.
function monthsBetween(from, to) {   // "YYYY-MM" inclusive, newest first
  const out=[]; let [y,m]=to.split("-").map(Number); const [fy,fm]=from.split("-").map(Number);
  while (y>fy || (y===fy && m>=fm)) { out.push(`${y}-${String(m).padStart(2,"0")}`); m--; if (m===0) { m=12; y--; } }
  return out;
}
function MonthlyView({ transactions, currency, budgets, bills=[], onView }) {
  const [selectedMon, setSelectedMon] = useState(curMon());
  const [activeBar,  setActiveBar]  = useState(null);
  const [calDay, setCalDay] = useState(null);
  const lc=locale();
  const patternsData=useMemo(()=>calcPatterns(transactions,currency),[transactions,currency,lc]);   // insight text follows the language

  const allMonths = useMemo(() => {
    const ms=transactions.map(t=>t.date.slice(0,7)).sort(), cur=curMon();
    const first=ms.length && ms[0]<cur ? ms[0] : cur, last=ms.length && ms[ms.length-1]>cur ? ms[ms.length-1] : cur;
    return monthsBetween(first,last);
  }, [transactions]);
  const idx=allMonths.indexOf(selectedMon);
  const prevM = () => { if (idx < allMonths.length - 1) setSelectedMon(allMonths[idx + 1]); };
  const nextM = () => { if (idx > 0) setSelectedMon(allMonths[idx - 1]); };
  const prv = useMemo(() => { const [y,m]=selectedMon.split("-").map(Number); return localMonthStr(new Date(y,m-2,1)); }, [selectedMon]);

  const { curExp, curInc, prevExp, prevFullExp, momDiff, plannedExp, plannedInc, cmpKind, cmpDays } = calcMonthSummary(transactions, selectedMon, prv);
  const catSpend    = calcCategorySpend(transactions, selectedMon);
  const budgetItems = calcBudgetStatus(budgets || {}, catSpend, selectedMon);
  const budgetTotal = Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const forecast    = useMemo(()=>calcMonthEndForecast(transactions,bills,new Date()),[transactions,bills]);   // Run 17
  const coach       = useMemo(()=>calcCoach(transactions,readDebts(),new Date()),[transactions]);              // Run 17: Debts-page data is read when the ledger changes
  const txnStats    = calcTxnStats(transactions,selectedMon);
  const perDay      = calcWeekdayWeekend(transactions,selectedMon);
  const wc          = calcWhatChanged(transactions,selectedMon,prv);
  const expenses    = transactions.filter(t => t.type === "expense");
  const done        = happenedIn(selectedMon);
  const isCurrentMon = selectedMon === curMon();

  const catData = Object.entries(catSpend).map(([id, amt]) => ({ ...CAT(id) || { id, name: id, color:"#98A5B7" }, amt })).sort((a,b) => b.amt - a.amt);
  const maxCat = catData[0]?.amt || 1;
  const merchantTotals = {};
  expenses.filter(t => done(t) && t.merchant).forEach(t => { merchantTotals[t.merchant] = (merchantTotals[t.merchant]||0) + t.amount; });
  const topMerchants = Object.entries(merchantTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const monTxns = transactions.filter(t => t.date.startsWith(selectedMon));
  const walletSpend = calcWalletSpend(transactions, selectedMon);   // Run 16
  const recurringCount = transactions.filter(x=>x.recurring&&x.date.startsWith(selectedMon)).length;

  // Trends: recent months up to today, independent of the selected month.
  const WEEKDAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const wdName=(i,style)=>t(style==="long"?"dow."+WEEKDAYS[i]:style==="short"?"wdShort."+WEEKDAYS[i]:"wdNarrow."+WEEKDAYS[i]);
  const { insights:patterns, anomalies, dayOfWeek, correlations } = patternsData;
  const now=curMon();
  const months6=Array.from({length:6},(_,i)=>nMon(5-i));
  const monthlyData=months6.map(m=>({label:monthShort(m),exp:expenses.filter(happenedIn(m)).reduce((s,t)=>s+t.amount,0),isCur:m===now,ym:m}));
  const maxMonth=Math.max(...monthlyData.map(m=>m.exp),1);
  const monthAvg=monthlyData.filter(m=>!m.isCur&&m.exp>0).reduce((s,m,_,a)=>s+m.exp/a.length,0);
  const DAY_LBLS=WEEKDAYS.map((_,i)=>wdName(i,"narrow"));
  // Run 17: month calendar for the selected month (replaces the 8-week heatmap): spending per day, Monday first.
  const [cy,cm]=selectedMon.split("-").map(Number);
  const calDim=new Date(cy,cm,0).getDate(), calLead=(new Date(cy,cm-1,1).getDay()+6)%7;
  const calDays=Array.from({length:calDim},(_,i)=>{ const ds=`${selectedMon}-${String(i+1).padStart(2,"0")}`;
    const items=expenses.filter(x=>x.date===ds&&done(x));
    return { date:ds, day:i+1, amt:items.reduce((s,x)=>s+x.amount,0), cats:items.map(x=>catName(x.category)).filter((v,j,arr)=>arr.indexOf(v)===j).join(", "), future:ds>today(), isToday:ds===today() }; });
  const maxDay=Math.max(...calDays.map(c=>c.amt),1);  const hasTrends = expenses.length>0;

  return (
    <div onClick={()=>{setActiveBar(null);setCalDay(null);}}>
      {/* Month selector — the one month setting for everything above the Trends section */}
      <div className="month-selector" data-section="an-month">
        <button className="month-nav-btn" onClick={prevM} disabled={idx===allMonths.length-1} aria-label={t("month.prev")} style={{opacity:idx===allMonths.length-1?0.3:1}}>‹</button>
        <div style={{textAlign:"center"}}>
          <h1 className="month-name" style={{margin:0}}>{monthName(selectedMon)}</h1>
          {isCurrentMon && <div style={{fontSize:10,color:"var(--accent)",fontWeight:700,letterSpacing:"0.5px",marginTop:2,textTransform:"uppercase"}}>{t("month.current")}</div>}
        </div>
        <button className="month-nav-btn" onClick={nextM} disabled={idx===0} aria-label={t("month.next")} style={{opacity:idx===0?0.3:1}}>›</button>
      </div>

      {/* Summary stats */}
      <div className="month-stats" data-section="an-summary" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        <div className="month-stat">
          <div className="month-stat-val" style={{color:"var(--neg)"}}>{fmt(curExp,currency)}</div>
          <div className="month-stat-lbl">{t("home.spent")}</div>
          {momDiff!==null&&<div className="month-cmp" style={{fontSize:11,color:momDiff<=0?"var(--pos)":"var(--neg)",fontWeight:600,marginTop:4}}>
            {momDiff<=0?"↓":"↑"} {cmpText(momDiff,cmpKind,currency)}
          </div>}
        </div>
        <div className="month-stat">
          <div className="month-stat-val" style={{color:"var(--pos)"}}>{fmt(curInc,currency)}</div>
          <div className="month-stat-lbl">{t("home.income")}</div>
          {curInc>0&&<div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>
            {fmtPct(Math.round(((curInc-curExp)/curInc)*100))} {t("surplus."+surplusLabel(curInc,curExp)).toLowerCase()}
          </div>}
        </div>
        <div className="month-stat" style={{gridColumn:"1 / -1"}}>
          <div className="month-stat-val" style={{color:surplusColor(curInc,curExp)}}>{fmt(Math.abs(curInc-curExp),currency)}</div>
          <div className="month-stat-lbl">{t("month.net."+(curInc>curExp?"Net surplus":curInc<curExp?"Net deficit":"Break-even"))}</div>
          {momDiff!==null&&prevExp>0&&<div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>{cmpPrev(cmpKind,prevExp,currency)}</div>}
          {momDiff!==null&&cmpKind==="same"&&<div className="cmp-window" style={{fontSize:11,color:"var(--ink-3)",marginTop:2}}>{t("cmp.window",{d:cmpDays})}</div>}
        </div>
      </div>
      <PlannedNote plannedExp={plannedExp} plannedInc={plannedInc} currency={currency} style={{marginTop:-8,marginBottom:16}}/>
      <div data-section="an-trend"><SpendingTrend transactions={transactions} mon={selectedMon} prv={prv} currency={currency}/></div>
      {isCurrentMon&&(
        <div className="a-card" data-section="an-forecast">
          <div className="a-card-title">{t("an.forecast")}</div>
          {forecast.available?(<>
            <div className="big-num" style={{marginBottom:2}}>{fmt(forecast.point,currency)}</div>
            {forecast.rangeShown
              ? <div style={{fontSize:12,color:"var(--ink-2)",fontWeight:600}}>{t("an.forecastRange",{low:fmt(forecast.low,currency),high:fmt(forecast.high,currency)})}</div>
              : <div className="list-sub">{t("an.forecastSingle")}</div>}
            <div className="list-sub" style={{marginTop:6,lineHeight:1.5}}>{t("an.forecastHow",{daily:fmt(forecast.usualDaily,currency)})}</div>
          </>):<div className="list-sub">{t("an.forecastNeed")}</div>}
        </div>
      )}

      {isCurrentMon&&coach.length>0&&(
        <div className="a-card" data-section="an-coach">
          <div className="a-card-title">{t("coach.title")}</div>
          {coach.map((c,i)=>{
            const num=(n)=>PRIVACY?"••":n, amt=(q)=>fmt(q/100,currency);
            const line = c.id==="incomplete" ? t("coach.incomplete",{days:c.days})
              : c.id==="noIncome" ? t("coach.noIncome")
              : c.id==="spent" ? t("coach.spent",{pct:num(c.pct),kept:num(c.kept)})
              : c.id==="over" ? t("coach.over",{pct:num(c.pct)})
              : c.id==="future" ? t("coach.future",{n:c.n})
              : c.id==="loanDue" ? t("coach.loanDue",{lender:maskText(c.lender),amount:amt(c.amount),date:fmtDate(c.date)})
              : c.id==="loanOverdue" ? t("coach.loanOverdue",{lender:maskText(c.lender),amount:amt(c.amount),date:fmtDate(c.date)})
              : t("coach.owedLate",{name:maskText(c.name),amount:amt(c.amount),date:fmtDate(c.date)});
            return <div key={i} className="coach-line" data-coach={c.id} style={{fontSize:13,lineHeight:1.5,padding:"8px 0",borderTop:i?"1px solid var(--rule)":"none",color:"var(--ink)"}}>{line}</div>;
          })}
          <div className="list-sub" style={{marginTop:6}}>{t("coach.window")}</div>
        </div>
      )}

      {/* What changed — same comparison window as the summary */}
      {(wc.totalDiff!==0||wc.catChanges.length>0)&&prevExp>0&&momDiff!==null&&(
        <div className="a-card" data-section="an-changes">
          <div className="a-card-title">{cmpTitle(wc.cmpKind)}</div>
          <div className="wc-row" style={{paddingTop:0}}>
            <span className="wc-name" style={{fontWeight:700}}>{t("an.totalSpending")}</span>
            <div style={{textAlign:"right"}}>
              <div className={`wc-diff ${wc.totalDiff<=0?"pos":"neg"}`}>{wc.totalDiff>0?"+":""}{fmt(wc.totalDiff,currency)}</div>
              <div style={{fontSize:10,color:"var(--ink-3)"}}>{t("an.vs",{a:fmt(wc.curExp,currency),b:fmt(wc.prevExp,currency)})}</div>
            </div>
          </div>
          {wc.catChanges.slice(0,5).map(({catId,cur,prev,diff,merchantDiffs})=>{
            const cat=CAT(catId);
            return (
              <div key={catId}>
                <div className="wc-row">
                  <div className="wc-name"><CatIcon catId={catId} size={13} color={cat?.color}/>{catName(catId)}</div>
                  <div style={{textAlign:"right"}}>
                    <div className={`wc-diff ${diff<=0?"pos":"neg"}`}>{diff>0?"+":""}{fmt(diff,currency)}</div>
                    <div style={{fontSize:10,color:"var(--ink-3)"}}>{t("an.vs",{a:fmt(cur,currency),b:fmt(prev,currency)})}</div>
                  </div>
                </div>
                {merchantDiffs.length>0&&(
                  <div className="wc-merchants">
                    {merchantDiffs.map(m=>(
                      <div key={m.merchant} className="wc-m-row">
                        <span style={{display:"flex",alignItems:"center",gap:4}}>
                          <Icon name="merchant" size={10} color="var(--ink-4)"/>
                          {maskText(m.merchant)}
                          <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:m.isRecurring?"var(--warn-bg)":"var(--bg-inset)",color:m.isRecurring?"var(--warn)":"var(--ink-4)"}}>
                            {m.isRecurring?t("wc.recurring"):t("wc.oneOff")}
                          </span>
                        </span>
                        <span style={{color:m.diff<=0?"var(--pos)":"var(--neg)",fontWeight:600}}>{m.diff>0?"+":""}{fmt(m.diff,currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction stats for the month */}
      {txnStats.count>0&&(
        <div className="stat-row">
          <div className="stat-cell"><div className="stat-val">{txnStats.count}</div><div className="stat-lbl">{t("an.transactions")}</div></div>
          <div className="stat-cell"><div className="stat-val">{fmt(txnStats.avgTxn,currency)}</div><div className="stat-lbl">{t("an.avgPerTxn")}</div></div>
          <div className="stat-cell"><div className="stat-val">{fmt(txnStats.medTxn,currency)}</div><div className="stat-lbl">{t("an.median")}</div></div>
          <div className="stat-cell" title={t("an.perDayTitle")}>
            <div className="stat-val">{perDay.heavier===null?"—":fmt(perDay.heavier==="weekday"?perDay.wdAvg:perDay.weAvg,currency)}</div>
            <div className="stat-lbl">{t(perDay.heavier===null?"an.perDay.null":"an.perDay."+perDay.heavier)}</div>
          </div>
        </div>
      )}

      {/* Budget status for the month */}
      {budgetItems.length>0&&(
        <div className="a-card" data-section="an-budget">
          <div className="a-card-title">{t("an.budgetStatus",{month:monthName(selectedMon)})}</div>
          {budgetItems.map(({catId,limit,spent,pct,over,warn,aheadOfPace,daysLeft,state})=>{
            const cat=CAT(catId);
            return (
              <div key={catId} style={{marginBottom:13,paddingBottom:13,borderBottom:"1px solid var(--rule)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6,minWidth:0}}><CatIcon catId={catId} size={13}/>{catName(catId)}</div>
                  <div style={{fontSize:11,color:over?"var(--neg)":warn?"var(--warn)":"var(--ink-3)",fontWeight:600,flexShrink:0}}>{t("an.pctUsed",{pct:PRIVACY?"••":Math.round(pct)})}</div>
                </div>
                <div style={{height:3,background:"var(--rule)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",width:`${pct}%`,background:over?"var(--neg)":warn?"var(--warn)":(cat?.color||"var(--ink-3)"),borderRadius:99}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:over?"var(--neg)":warn?"var(--warn)":"var(--ink-3)",fontWeight:over||warn?600:400}}>
                    {over?t("budgets.over",{amount:fmt(spent-limit,currency)}):t("budgets.remaining",{amount:fmt(limit-spent,currency)})}
                  </span>
                  {state==="current"&&<span style={{color:"var(--ink-4)",flexShrink:0}}>{over?t("an.exceeded"):t("an.daysLeft",{n:daysLeft})}</span>}
                </div>
                {aheadOfPace&&!over&&<div style={{fontSize:10,color:"var(--warn)",fontWeight:600,marginTop:2}}>{t("an.aheadOfPace")}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Category breakdown */}
      {catData.length>0&&(
        <div className="a-card" data-section="an-category">
          <div className="a-card-title">{t("an.byCategory")}</div>
          {catData.map((cat,i)=>(
            <div key={i} className="cat-bar">
              <div className="cat-bar-name"><CatIcon catId={cat.id} size={13} color={cat.color}/>{catName(cat.id)}</div>
              <div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(cat.amt/maxCat)*100}%`,background:cat.color}}/></div>
              <div className="cat-bar-amt">{fmt(cat.amt,currency)}</div>
              <div className="cat-bar-pct">{fmtPct(curExp>0?Math.round((cat.amt/curExp)*100):0)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Run 16: spending by wallet for the selected month; shown only when at least one entry has a wallet */}
      {walletSpend.used&&walletSpend.total>0&&(
        <div className="a-card" data-section="an-wallet">
          <div className="a-card-title">{t("wallet.analyticsTitle")}</div>
          {Object.entries(walletSpend.byWallet).sort((a,b)=>b[1]-a[1]).map(([w,amt])=>(
            <div key={w} className="cat-bar">
              <div className="cat-bar-name">{w==="none"?t("wallet.none"):walletName(w)}</div>
              <div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(amt/walletSpend.total)*100}%`,background:"var(--accent)"}}/></div>
              <div className="cat-bar-amt">{fmt(amt,currency)}</div>
              <div className="cat-bar-pct">{fmtPct(Math.round((amt/walletSpend.total)*100))}</div>
            </div>
          ))}
        </div>
      )}

      {/* Merchant breakdown */}
      {topMerchants.length>0&&(
        <div className="a-card" data-section="an-merchant">
          <div className="a-card-title">{t("month.byMerchant")}</div>
          {topMerchants.map(([merchant,amt],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i<topMerchants.length-1?"1px solid var(--rule)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                <div style={{width:28,height:28,borderRadius:6,background:"var(--bg-inset)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name="merchant" size={13} color="var(--ink-3)"/>
                </div>
                <span style={{fontSize:13,fontWeight:600,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{maskText(merchant)}</span>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"var(--font)",fontSize:14,fontWeight:700}}>−{fmt(amt,currency)}</div>
                {curExp>0&&<div style={{fontSize:10,color:"var(--ink-4)"}}>{fmtPct(Math.round((amt/curExp)*100))}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Run 15: the "Top expenses" and "All transactions" lists were removed from Analytics. They repeated rows of the Transactions
          tab (which can be searched by month name and filtered by date). Analytics keeps what Transactions cannot show: totals,
          comparisons, categories, merchants and trends. */}
      {recurringCount>0&&(
        <div style={{background:"var(--bg-warm)",borderRadius:8,padding:"10px 13px",marginBottom:14,fontSize:12,color:"var(--ink-3)"}}>
          <Icon name="repeat" size={12} color="var(--ink-4)"/> {tn("month.recurringCount",recurringCount)}
        </div>
      )}

      {/* A month without entries says so (the list of entries lives in Transactions) */}
      {monTxns.length===0&&(
        <div className="empty" style={{padding:"32px 0"}} data-section="an-empty">
          <div className="empty-icon"><Icon name="calendar" size={28}/></div>
          <div className="empty-title">{t("month.emptyTitle")}</div>
          <div className="empty-body">{t("month.emptyBody",{month:monthName(selectedMon)})}</div>
        </div>
      )}

      {/* Trends — recent months up to today; not affected by the month selected above */}
      {hasTrends&&(<>
        <div className="trends-head" data-section="an-trends" style={{marginTop:22,marginBottom:10}}>
          <div className="label-sm">{t("month.trendsTitle")}</div>
          <div style={{fontSize:11,color:"var(--ink-3)",lineHeight:1.5,marginTop:4}}>{t("month.trendsSub")}</div>
        </div>

        <div className="a-card">
          <div className="a-card-title">{t("an.sixMonth")}</div>
          {monthAvg>0&&<div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10}}>{t("an.sixMonthAvg")} <strong style={{fontFamily:"var(--font)",color:"var(--ink)"}}>{fmt(monthAvg,currency)}</strong></div>}
          {activeBar!==null&&monthlyData[activeBar]&&(
            <div style={{background:"var(--ink)",color:"var(--bg)",borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:600,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
              <span>{monthName(monthlyData[activeBar].ym)}</span>
              <span style={{fontFamily:"var(--font)",fontSize:14}}>{fmt(monthlyData[activeBar].exp,currency)}</span>
            </div>
          )}
          <div className="month-bars">
            {monthlyData.map((m,i)=>(
              <div key={i} className="m-col" role="button" tabIndex={0} aria-pressed={activeBar===i} aria-label={`${monthName(m.ym)}: ${fmt(m.exp,currency)}`}
                onKeyDown={activateKey(()=>{setActiveBar(activeBar===i?null:i);setActiveCell(null);})}
                onClick={e=>{e.stopPropagation();setActiveBar(activeBar===i?null:i);setActiveCell(null);}}>
                <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end"}}>
                  <div className="m-bar" style={{height:m.exp>0?`${Math.max(5,(m.exp/maxMonth)*100)}%`:"3px",background:activeBar===i?"var(--accent-mid)":m.isCur?"var(--accent)":"var(--ink-4)",width:"100%",outline:activeBar===i?"2px solid var(--accent)":"none",outlineOffset:"1px"}}/>
                </div>
                <div className="m-lbl" style={{color:activeBar===i?"var(--accent-mid)":m.isCur?"var(--accent)":"var(--ink-4)",fontWeight:m.isCur||activeBar===i?700:600}}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {patterns.length>0&&(
          <div className="a-card">
            <div className="a-card-title">{t("an.patterns")}</div>
            {patterns.map(p=>(
              <div key={p.id} className="pattern-item">
                <Icon name="pattern" size={14} color="var(--ink-3)"/>
                <span>{PRIVACY?t("privacy.hiddenText"):p.text}</span>
              </div>
            ))}
          </div>
        )}

        {Object.values(dayOfWeek).some(d=>d.count>0)&&(
          <div className="a-card">
            <div className="a-card-title">{t("an.byDay",{month:monthName(now)})}</div>
            <div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10,lineHeight:1.5}}>{t("an.byDaySub")}</div>
            {WEEKDAYS.map((day,di)=>{
              const d=dayOfWeek[day];
              if (!d||d.count===0) return null;
              // the typical (median) transaction, as in the insight: one unusual purchase must not make a day's bar tower over the rest
              const maxMed=Math.max(...Object.values(dayOfWeek).filter(x=>x.count>0).map(x=>x.median),1);
              return (
                <div key={day} className="dow-row" style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <div style={{minWidth:28,fontSize:11,color:"var(--ink-3)",fontWeight:600,flexShrink:0}} title={wdName(di,"long")}>{wdName(di,"short")}</div>
                  <div style={{flex:1,height:3,background:"var(--rule)",borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(d.median/maxMed)*100}%`,background:"var(--accent)",borderRadius:99}}/>
                  </div>
                  <div style={{minWidth:60,textAlign:"right",fontSize:11,fontFamily:"var(--font)",fontWeight:600,color:"var(--ink)",flexShrink:0,whiteSpace:"nowrap"}}>{fmt(d.median,currency)}</div>
                  <div style={{width:24,textAlign:"right",fontSize:10,color:"var(--ink-4)",flexShrink:0}}>{d.count}×</div>
                </div>
              );
            })}
          </div>
        )}

        {anomalies.length>0&&(
          <div className="a-card">
            <div className="a-card-title">{t("an.unusual")}</div>
            {anomalies.slice(0,5).map((a,i)=>{
              const cat=CAT(a.category)||{color:"#98A5B7"};
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<Math.min(anomalies.length,5)-1?"1px solid var(--rule)":"none"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:(cat.color)+"26",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <CatIcon catId={a.category} size={14} color={cat.color}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{maskText(a.merchant)||catName(a.category)}</div>
                    <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmtDate(a.date)} · {PRIVACY?t("privacy.hiddenText"):a.reason}</div>
                  </div>
                  <div style={{fontFamily:"var(--font)",fontSize:14,fontWeight:700,color:"var(--neg)",flexShrink:0}}>−{fmt(a.amount,currency)}</div>
                </div>
              );
            })}
          </div>
        )}

        {correlations.length>0&&(
          <div className="a-card">
            <div className="a-card-title">{t("an.together")}</div>
            <div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10,lineHeight:1.5}}>{t("an.togetherSub")}</div>
            {correlations.map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 0",borderBottom:i<correlations.length-1?"1px solid var(--rule)":"none"}}>
                <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6,fontSize:12,fontWeight:600,color:"var(--ink)",minWidth:0}}>
                  <CatIcon catId={c.category1} size={13}/>
                  {catName(c.category1)}
                  <span style={{color:"var(--ink-4)",fontWeight:400}}>+</span>
                  <CatIcon catId={c.category2} size={13}/>
                  {catName(c.category2)}
                </div>
                <div style={{fontSize:11,color:"var(--ink-3)",flexShrink:0}}>{t("an.ofDays",{pct:PRIVACY?"••":Math.round(c.correlation*100)})}</div>
              </div>
            ))}
          </div>
        )}

        {transactions.length>0&&(()=>{
          const totalInc=transactions.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0), totalExp=transactions.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
          return (
            <div className="a-card" data-section="an-overview">
              <div className="a-card-title">{t("set.overview")}</div>
              {[[t("set.totalIncome"),fmt(totalInc,currency),"var(--pos)"],[t("set.totalExpenses"),fmt(totalExp,currency),"var(--neg)"],[t("month.net."+(totalInc>totalExp?"Net surplus":totalInc<totalExp?"Net deficit":"Break-even")),fmt(Math.abs(totalInc-totalExp),currency),surplusColor(totalInc,totalExp)],[t("an.transactions"),String(transactions.length),"var(--ink)"]].map(([lbl,val,col])=>(
                <div key={lbl} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"6px 0",borderBottom:"1px solid var(--rule)"}}>
                  <span style={{fontSize:12,color:"var(--ink-3)"}}>{lbl}</span>
                  <span style={{fontSize:13,fontWeight:700,color:col,whiteSpace:"nowrap"}}>{val}</span>
                </div>
              ))}
            </div>
          );
        })()}

        <div className="a-card" data-section="an-calendar">
          <div className="a-card-title">{t("an.calendar")}</div>
          <div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10,lineHeight:1.5}}>{t("an.calendarHint")}</div>
          <div className="cal" onClick={e=>e.stopPropagation()}>
            {DAY_LBLS.map((d,i)=><div key={i} className="cal-dow">{d}</div>)}
            {Array.from({length:calLead},(_,i)=><div key={"b"+i} className="cal-blank"/>)}
            {calDays.map(c=>{
              const on=calDay===c.date, intensity=c.amt>0?Math.max(0.15,(c.amt/maxDay)*0.85):0;
              return <button key={c.date} type="button" data-date={c.date} className={`cal-day${c.amt>0?" has-spend":""}${c.future?" future":""}${c.isToday?" today":""}${on?" sel":""}`}
                aria-current={c.isToday?"date":undefined} aria-pressed={on} aria-label={`${fmtDate(c.date)}: ${c.amt>0?fmt(c.amt,currency):t("an.noSpending")}`}
                style={c.amt>0?{background:`rgba(76,201,196,${intensity})`,...(intensity>=0.4?{color:"#06201e"}:null)}:undefined}
                onClick={e=>{ e.stopPropagation(); setCalDay(on?null:c.date); setActiveBar(null); }}>{c.day}</button>;
            })}
          </div>
          {calDay&&(()=>{ const c=calDays.find(x=>x.date===calDay); if(!c) return null; return (
            <div data-section="an-calendar-detail" role="status" style={{background:"var(--bg-inset)",borderRadius:10,padding:"10px 12px",marginTop:10,fontSize:12,fontWeight:600}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}><span>{fmtDate(c.date)}</span><span style={{fontFamily:"var(--font)",fontSize:14}}>{c.amt>0?fmt(c.amt,currency):t("an.noSpending")}</span></div>
              {c.cats&&<div style={{fontSize:11,color:"var(--ink-3)",marginTop:3,fontWeight:500}}>{c.cats}</div>}
            </div>); })()}
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10,justifyContent:"flex-end"}}>
            <span style={{fontSize:9,color:"var(--ink-4)"}}>{t("an.less")}</span>
            {[0.15,0.35,0.6,0.85].map(o=><div key={o} style={{width:10,height:10,borderRadius:2,background:`rgba(76,201,196,${o})`}}/>)}
            <span style={{fontSize:9,color:"var(--ink-4)"}}>{t("an.moreTap")}</span>
          </div>
        </div>      </>)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART HELPER — deterministic advice cards based on real data
// Not AI. Not guessing. Every card has a clear data source and impact.
// ─────────────────────────────────────────────────────────────────────────────
function calcHelperCards(transactions, budgets, goals, safeToSpend, currency, bills=[]) {
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

function SmartHelper({ transactions, bills=[], budgets, goals, safeToSpend, currency }) {
  const lc = locale();
  const cards = useMemo(
    () => calcHelperCards(transactions, budgets, goals, safeToSpend, currency, bills),
    [transactions, bills, budgets, goals, safeToSpend, currency, lc]   // card text follows the interface language
  );

  if (cards.length === 0) return null;

  const ICON_COLOR = { warn:"var(--warn)", neg:"var(--neg)", pos:"var(--pos)", info:"var(--ink-3)" };

  return (
    <div style={{marginBottom:18}}>
      <div className="label-sm" style={{marginBottom:10}}>{t("help.title")}</div>
      {cards.map(card=>(
        <div key={card.id} className={`helper-card ${card.type}`}>
          <div className="helper-icon">
            <Icon name={card.icon} size={16} color={ICON_COLOR[card.type]}/>
          </div>
          <div className="helper-body">
            <div className="helper-title">{card.title}</div>
            <div className="helper-text">{PRIVACY?t("privacy.hiddenText"):card.text}</div>
            <div className="helper-impact" style={{color:ICON_COLOR[card.type]}}>{PRIVACY?"":card.impact}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
