import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

function readRaw(k) { try { const r=localStorage.getItem(k); return r?JSON.parse(r):null; } catch { return null; } }
function writeRaw(k,v) { try { localStorage.setItem(k,JSON.stringify(v)); return true; } catch { return false; } }

// Set when stored data needed recovery on load; the App shows it once.
let LOAD_NOTICE = null;
// True when a recovery copy could not be written: saving is then paused so the original data is never overwritten.
let SAVE_BLOCKED = false;

// ─── Money grammar ────────────────────────────────────────────────────────────
// Text typed by the user or read from a CSV cell: digits with an optional decimal point and at most 2 decimals,
// up to 9 integer digits. Accepted: "12" "12.5" "12.50" ".5" "0.05".
// Rejected: "" "12." "-5" "+5" "1e3" "0x10" "1,5" "1 000" "NaN" "Infinity" "25abc", and anything above MAX_AMOUNT.
// JSON numbers (stored data and backups) may carry any finite value; their sign and range are still enforced.
const MAX_AMOUNT = 999999999.99;
const MONEY_TEXT_RE = /^(?:\d{1,9}|\d{0,9}\.\d{1,2})$/;

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
  if (positive && n===0) return "zero amount";
  if (n>MAX_AMOUNT) return "amount too large";
  return null;
}

// Money typed by the user: a finite number > 0 ({positive:true}) or ≥ 0; anything else → null (never silently 0).
function parseMoney(v, opts) { return moneyReason(v,opts)===null ? strictNum(v) : null; }

function isPlainObject(x) { return x!==null && typeof x==="object" && !Array.isArray(x); }
const isTrue = (v) => v===true || v==="true";
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
const DATE_TEXT_RE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;
function normType(v) { if (v===undefined||v===null||v==="") return "expense"; return TXN_TYPES[String(v).trim().toLowerCase()] || null; }

function checkRawTxn(t) {
  if (!isPlainObject(t)) return "not a transaction record";
  if (t.date===undefined || t.date===null || (typeof t.date==="string" && t.date.trim()==="")) return "missing date";
  if (typeof t.date!=="string") return "invalid date";
  const d=t.date.trim();
  if (!DATE_TEXT_RE.test(d) || !isValidDateStr(d.slice(0,10))) return "invalid date";
  const r=moneyReason(t.amount ?? t.amt, { positive:true });
  if (r) return r;
  if (normType(t.type)===null) return "unsupported type";
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

function partitionTransactions(list) {
  const good=[], bad=[];
  list.forEach(t=>{
    const reason=checkRawTxn(t);
    if (reason) { bad.push({ record:t, reason }); return; }
    good.push(normaliseTxn(t));
  });
  const u=ensureUniqueIds(good);
  return { good:u.list, bad, rekeyed:u.rekeyed };
}

function sanitizeTransactions(list, label) {
  const { good, bad, rekeyed }=partitionTransactions(list);
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
  { id:"food",     name:"Food & Dining",        tile:"Food",      color:"#5C7A6E", income:false,
    subs:["Restaurants","Fast Food","Coffee","Groceries","Delivery","Snacks","Other"] },
  { id:"transport",name:"Transport",             tile:"Transport", color:"#4A6A7A", income:false,
    subs:["Metro","Bus","Taxi / Ride-hailing","Fuel","Parking","Car Maintenance","Intercity","Other"] },
  { id:"shopping", name:"Shopping",              tile:"Shopping",  color:"#7A6652", income:false,
    subs:["Clothing","Electronics","Personal Items","Home","Accessories","Online Shopping","Other"] },
  { id:"gifts",    name:"Gifts & Personal",      tile:"Gifts",     color:"#7A5C7A", income:false,
    subs:["Gifts","Donations","Personal Care","Barber / Hair","Cosmetics","Other"] },
  { id:"entertain",name:"Entertainment",         tile:"Entertainment",   color:"#5C6A7A", income:false,
    subs:["Cinema","Games","Events","Sports","Hobbies","Other"] },
  { id:"digital",  name:"Bills & Subscriptions", tile:"Bills & subs",     color:"#3A6A5A", income:false,
    subs:["Mobile","Internet","Streaming","Software","Cloud Storage","Other Subs","Other"] },
  { id:"health",   name:"Health & Fitness",      tile:"Health",    color:"#4A5C7A", income:false,
    subs:["Gym","Sports Equipment","Pharmacy","Doctor / Dentist","Supplements","Other"] },
  { id:"edu",      name:"Education",             tile:"Education", color:"#4A4A7A", income:false,
    subs:["University","Books","Courses","Exams","Stationery","Other"] },
  { id:"travel",   name:"Travel",                tile:"Travel",    color:"#6A5A4A", income:false,
    subs:["Flights","Hotels","Visa","Travel Food","Travel Transport","Activities","Other"] },
  { id:"housing",  name:"Home",                  tile:"Home",      color:"#5A5A5A", income:false,
    subs:["Rent","Utilities","Household","Repairs","Other"] },
  { id:"finance",  name:"Finance",               tile:"Finance",   color:"#4A6A4A", income:false,
    subs:["Bank Fees","Transfers","Taxes","Insurance","Investments","Other"] },
  { id:"other",    name:"Other",                 tile:"Other",     color:"#8A8A8A", income:false,
    subs:["Miscellaneous"] },
  { id:"salary",   name:"Salary",                tile:"Salary",    color:"#2D6A4F", income:true, subs:[] },
  { id:"freelance",name:"Freelance",             tile:"Freelance", color:"#2D6A4F", income:true, subs:[] },
  { id:"income",   name:"Other Income",          tile:"Other income",    color:"#3D7A5F", income:true, subs:[] },
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
};

function resolveCategory(raw) {
  if (!raw) return "other";
  const key = String(raw).toLowerCase().trim();
  if (CATEGORIES.find(c=>c.id===key)) return key;  // exact id wins first
  const byName=CATEGORIES.find(c=>c.name.toLowerCase()===key); if (byName) return byName.id;  // exact display name (CSV round-trip)
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  for (const [k,v] of Object.entries(CATEGORY_MAP)) {
    if (key.includes(k)||k.includes(key)) return v;
  }
  return "other";
}

// Callers validate with checkRawTxn() first (see partitionTransactions). normaliseTxn never takes abs(),
// never defaults a date and never turns an unknown type into an expense.
function normaliseTxn(t) {
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
    category:    resolveCategory(t.category||t.catId||t.cat),
    subcategory: txt(t.subcategory||t.subcat),
    merchant:    txt(t.merchant||t.merchantName),
    note:        txt(t.note||t.description||t.name),
    date:        String(t.date).trim().slice(0,10),
    recurring:   isTrue(t.recurring),
    recurFreq:   RECUR_FREQS.has(f) ? f : null,
    isActive:    t.isActive!==undefined ? !!t.isActive : true,
    createdAt:   t.createdAt||new Date().toISOString(),
  };
}

// ─── Settings contract (used for stored data AND imported backups) ───────────
// Each section is validated on its own. Invalid entries are skipped and reported; a section whose entries are ALL
// invalid is rejected so your current value is kept. Sections absent from the source are simply not returned.
const BACKUP_VERSION = 9;
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

function migrateAndLoad() {
  let rawStr=null;
  try { rawStr=localStorage.getItem(KEY); } catch {}
  let current=null;
  if (rawStr) { try { current=JSON.parse(rawStr); } catch { current=null; } }

  if (isPlainObject(current) && Array.isArray(current.transactions)) {
    // Interface language: a saved choice is used (and set first, so load notices appear in it). Data saved by an earlier
    // version has no "language" field: that user has been using English, so they continue in English without the
    // first-launch chooser. Only an explicit null (a fresh install that has not chosen yet) shows the chooser again.
    const language=LANGS.includes(current.language) ? current.language : (current.language===null ? null : "en");
    if (language) setLang(language);
    const v=validateSettings(current);
    if (v.problems.length) {
      const kept=preserveRaw("settings_rejected",{ budgets:current.budgets, templates:current.templates, currency:current.currency, goals:current.goals, safeToSpend:current.safeToSpend });
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
      lastBackup,
      backupConfirmedAt,
      language,
    };
  }

  // Something is stored under the current key but we cannot use it: keep a copy before anything overwrites it.
  if (rawStr) {
    if (preserveRaw("corrupt", rawStr)) noteLoad(t("load.corruptKept"));
    else { SAVE_BLOCKED=true; noteLoad(t("load.corruptBlocked")); }
  }

  // Legacy key migration
  let merged=[], bestSettings=null;
  const seenIds=new Set();   // de-duplicate on the ORIGINAL id, before normalisation may replace it
  for (const k of KEYS_LEGACY) {
    const d=readRaw(k); if (!isPlainObject(d)) continue;
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
  const existingUser=!!rawStr || merged.length>0 || !!bestSettings;
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
    lastBackup:  null,
    backupConfirmedAt: null,
    language:    null,
  };
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
  note:["note","notes","description","memo"], recurring:["recurring","recurfreq","frequency"] };

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
    return { id:Date.now()+i+Math.random(), type:cell(row,"type"), amount:cell(row,"amount"),
      category:cell(row,"categoryId")||cell(row,"category"), subcategory:cell(row,"subcategory"), merchant:cell(row,"merchant"),
      note:cell(row,"note"), date:cell(row,"date"), recurring:isRec, recurFreq:isRec?rec:null, isActive:true, createdAt:new Date().toISOString() };
  });
  return { records };
}

// Reads a file's text into a plan. Nothing is applied here; the user reviews the plan first.
function planImport(raw, filename="") {
  const text=String(raw).replace(/^\uFEFF/,"");
  const isCSV=/\.csv$/i.test(filename) || text.trimStart().toLowerCase().startsWith("date,");
  let list=[], settings={}, problems=[], warnings=[];
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
  if (rekeyed) warnings.push(tn("import.rekeyed",rekeyed));
  return { ok:true, kind:isCSV?"csv":"json", filename, transactions:good, skippedCount:bad.length, skippedSummary:summariseReasons(bad), settings, problems, warnings };
}

function txnFingerprint(t) { return [t.date,t.type,Number(t.amount).toFixed(2),t.category,norm(t.merchant),norm(t.note),norm(t.subcategory)].join("|"); }
function countSuspectedDuplicates(existing, incoming) { const fp=new Set(existing.map(txnFingerprint)); return incoming.filter(t=>fp.has(txnFingerprint(t))).length; }

// What each mode does with each part of a backup (shown to the user in the import sheet):
//   Merge   transactions: added unless the id exists (optionally also skipping look-alikes) · budgets: combined, imported categories win ·
//           templates/goals: new ones added · currency and Safe to Spend: YOUR current values stay.
//   Replace transactions: replaced · budgets/templates/goals/currency/Safe to Spend: replaced ONLY if the file contains a valid section.
function applyImport(state, plan, mode, { skipDuplicates=false }={}) {
  const sortDesc=(l)=>[...l].sort((a,b)=>b.date.localeCompare(a.date));
  const S=plan.settings||{};
  if (mode==="replace") {
    const next={ ...state, transactions:sortDesc(plan.transactions) };
    ["budgets","templates","currency","goals","safeToSpend"].forEach(k=>{ if (S[k]!==undefined) next[k]=S[k]; });
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
  const { transactions,budgets,templates,currency,goals,safeToSpend }=state;
  return { version:BACKUP_VERSION, exportedAt:now, meta:{ app:"expense-ledger", transactionCount:transactions.length },
    transactions, budgets, templates, currency, goals, safeToSpend, lastBackup:now };
}

function buildCsv(transactions) {
  const rows=[["Date","Type","Category","Subcategory","Merchant","Amount","Note","Recurring","CategoryId"]];
  transactions.forEach(t=>rows.push([t.date,t.type,CAT(t.category)?.name||t.category,t.subcategory||"",t.merchant||"",Number(t.amount).toFixed(2),t.note||"",t.recurring?(t.recurFreq||""):"",t.category]));
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

// cur* = happened (to date), planned* = dated later in the month, total* = the whole month (Safe to Spend uses totalExp:
// an expense entered ahead of time is money already committed).
function calcMonthSummary(transactions, mon=curMon(), prv=prevMon(), now=new Date()) {
  const isExp=t=>t.type==="expense", isInc=t=>t.type==="income", inMon=t=>t.date.startsWith(mon);
  const done=happenedIn(mon,now), donePrv=happenedIn(prv,now), sum=l=>l.reduce((s,t)=>s+t.amount,0);
  const curExp =sum(transactions.filter(t=>isExp(t)&&done(t)));
  const curInc =sum(transactions.filter(t=>isInc(t)&&done(t)));
  const plannedExp=sum(transactions.filter(t=>isExp(t)&&inMon(t)&&!done(t)));
  const plannedInc=sum(transactions.filter(t=>isInc(t)&&inMon(t)&&!done(t)));
  const totalExp=sum(transactions.filter(t=>isExp(t)&&inMon(t))), totalInc=sum(transactions.filter(t=>isInc(t)&&inMon(t)));
  const prevExp=sum(transactions.filter(t=>isExp(t)&&donePrv(t)));
  const prevInc=sum(transactions.filter(t=>isInc(t)&&donePrv(t)));
  const momDiff=prevExp>0?curExp-prevExp:null;
  // Negative when expenses exceed income — don't clamp, show the deficit
  const surplusRate=curInc>0?Math.round(((curInc-curExp)/curInc)*100):null;
  return { curExp,curInc,plannedExp,plannedInc,totalExp,totalInc,prevExp,prevInc,momDiff,surplusRate };
}

function calcCategorySpend(transactions, mon=curMon(), now=new Date()) {
  const out={}, done=happenedIn(mon,now);
  transactions.filter(t=>t.type==="expense"&&done(t))
    .forEach(t=>{ out[t.category]=(out[t.category]||0)+t.amount; });
  return out;
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
  const catSpendMon=calcCategorySpend(transactions,mon,now);
  const catSpendPrv=calcCategorySpend(transactions,prv,now);
  const { curExp,prevExp,curInc,prevInc }=calcMonthSummary(transactions,mon,prv,now);
  const doneMon=happenedIn(mon,now), donePrv=happenedIn(prv,now);

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

  return { curExp,prevExp,curInc,prevInc,catChanges,merchantChanges,totalDiff:curExp-prevExp };
}

// S4: Safe to Spend — distinguishes available, future commitments, savings
// ─── Recurring model: a SCHEDULE (the repeating commitment) vs its OCCURRENCES (individual dated payments) ───
// Transactions flagged "recurring" are grouped into schedules by what they are — type, category, merchant (or note) and
// frequency — so recording the same rent three months running is ONE schedule with three occurrences, not three commitments.
// Unnamed entries also split by amount so two different unnamed bills never merge.
function scheduleKey(t) {
  const who=norm(t.merchant)||norm(t.note);
  const tail=who ? "" : `${norm(t.subcategory)}|${Number(t.amount).toFixed(2)}`;
  return [t.type,t.category,who,t.recurFreq,tail].join("|");
}
function buildSchedules(transactions) {
  const groups=new Map();
  transactions.forEach(t=>{ if (t.recurring && RECUR_FREQS.has(t.recurFreq)) { const k=scheduleKey(t); if (!groups.has(k)) groups.set(k,[]); groups.get(k).push(t); } });
  return [...groups.entries()].map(([key,members])=>{
    const sorted=[...members].sort((a,b)=>a.date.localeCompare(b.date)||String(a.createdAt).localeCompare(String(b.createdAt)));
    const latest=sorted[sorted.length-1];
    return { key, type:latest.type, category:latest.category, subcategory:latest.subcategory, merchant:latest.merchant, note:latest.note,
      freq:latest.recurFreq, amount:latest.amount, isActive:latest.isActive!==false, occurrences:sorted.map(t=>t.date), memberIds:sorted.map(t=>t.id), latest };
  }).sort((a,b)=>a.key.localeCompare(b.key));
}
const scheduleMonthly = (s) => toMonthlyAmountHelper({ amount:s.amount, recurFreq:s.freq });   // an ESTIMATE of a typical month

// Dates a schedule is expected to fall on inside month `mon`, projected from its latest occurrence (month-end safe).
function scheduleOccurrences(s, mon) {
  const [y,mo]=mon.split("-").map(Number);
  const first=new Date(y,mo-1,1), last=new Date(y,mo,0);
  const anchor=parseLocalDate(s.occurrences[s.occurrences.length-1]), start=parseLocalDate(s.occurrences[0]);
  if (mon<localMonthStr(start)) return [];                       // the commitment did not exist yet
  const out=[];
  if (s.freq==="weekly" || s.freq==="biweekly") {
    const step=s.freq==="weekly" ? 7 : 14;
    for (let k=Math.ceil(daysBetween(anchor,first)/step); ; k++) {
      const d=new Date(anchor.getFullYear(),anchor.getMonth(),anchor.getDate()+k*step);
      if (d>last) break;
      if (d>=first && d>=start) out.push(d);
    }
  } else if (s.freq==="monthly") out.push(addMonths(anchor,(y-anchor.getFullYear())*12+(mo-1-anchor.getMonth())));
  else if (s.freq==="yearly" && anchor.getMonth()===mo-1) out.push(new Date(y,mo-1,Math.min(anchor.getDate(),last.getDate())));
  return out;
}

// Which expected occurrences in `mon` have no recorded payment yet. Monthly/yearly: any payment of the schedule in that month
// settles it. Weekly/biweekly: each payment settles at most one expected date within ±3 / ±6 days.
function scheduleMonthStatus(s, transactions, mon, now=new Date()) {
  const todayStr=localDateStr(now);
  const expected=scheduleOccurrences(s,mon).map(localDateStr);
  const recorded=transactions.filter(t=>t.recurring&&scheduleKey(t)===s.key&&t.date.startsWith(mon)).map(t=>t.date).sort();
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
function calcSafeToSpend(transactions, safeConfig, goals=[], now=new Date()) {
  const { savingsTarget=0 }=safeConfig||{};
  const mon=localMonthStr(now), todayStr=localDateStr(now);
  // Every expense recorded for this month, including ones dated later: money entered ahead of time is already committed.
  const { totalExp:curExp }=calcMonthSummary(transactions,mon,prevMon(),now);
  const monthInc=transactions.filter(t=>t.type==="income"&&t.date.startsWith(mon));
  const curInc=monthInc.filter(t=>t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
  const expectedInc=monthInc.filter(t=>t.date>todayStr).reduce((s,t)=>s+t.amount,0);
  const p=monthProgress(mon,now);

  const schedules=buildSchedules(transactions).filter(s=>s.isActive && s.type==="expense");
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
    curInc, expectedInc, curExp, savingsTarget, effectiveSavingsTarget, goalContributions, goalContributionActive,
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
  if (monthlyTarget>0 && remaining>0) { monthsNeeded=Math.ceil(remaining/monthlyTarget); estDate=addMonths(now,monthsNeeded); estCompletion=monthLabel(estDate,"long"); }

  const daysToTarget = td ? daysBetween(now,td) : null;                      // calendar days, not 24-hour blocks
  const overdue = !!td && !complete && daysToTarget<0;
  const behindSchedule = !!td && !complete && !overdue && !!estDate && daysBetween(td,estDate)>0;   // projected finish is after the target date
  const onTrack = !!td && !complete && !overdue && !!estDate && !behindSchedule;
  const noContribution = !complete && remaining>0 && monthlyTarget===0;

  const whatIf=[];
  if (remaining>0) {
    const baseRate = monthlyTarget>0 ? monthlyTarget : 50;
    [...new Set([baseRate*0.6,baseRate,baseRate*1.4].map(r=>Math.round(r)))].filter(r=>r>0).slice(0,3).forEach(r=>{
      const months=Math.ceil(remaining/r);
      whatIf.push({ monthly:r, months, completion:monthLabel(addMonths(now,months),"short") });
    });
  }
  const milestones=[25,50,75,100].map(pp=>({ pct:pp, amount:parseFloat(((target*pp)/100).toFixed(2)), completed:target>0 && saved>=(target*pp)/100 }));
  return { pct, remaining, complete, monthsNeeded, estCompletion, estDate, whatIf, daysToTarget, overdue, behindSchedule, onTrack, noContribution, milestones };
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
function fmt(n, sym="₼") {
  return `${Math.abs(n||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} ${sym}`;
}
function fmtShort(n, sym="₼") {
  const a=Math.abs(n||0);
  return a>=1e6?`${(a/1e6).toFixed(1)}M ${sym}`:a>=1000?`${(a/1000).toFixed(1)}k ${sym}`:`${a.toFixed(2)} ${sym}`;
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
};

function Icon({ name, size=16, color="currentColor", style={} }) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size,flexShrink:0,color,...style}}
      dangerouslySetInnerHTML={{__html:ICONS[name]||ICONS.other}} aria-hidden="true"/>
  );
}
function CatIcon({ catId, size=16, color }) {
  const cat=CAT(catId);
  return <Icon name={catId} size={size} color={color||cat?.color||"#8A8A8A"}/>;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
button{font-family:inherit;cursor:pointer}
:root{
  --bg:#F7F4EE;--bg-warm:#F0EDE5;--bg-card:#FDFCF9;--bg-inset:#EDEAE2;
  --ink:#1A1814;--ink-2:#3D3A35;--ink-3:#5F5A53;--ink-4:#6E6961;--ink-5:#D5D1C9;
  --rule:#E8E4DC;--rule-2:#C8C4BC;
  --accent:#6B1F2A;--accent-light:#F5ECED;--accent-mid:#C4454F;
  --pos:#1D5C38;--pos-bg:#EBF4EE;
  --neg:#6B1F2A;--neg-bg:#F5ECED;
  --warn:#6B4C00;--warn-bg:#FBF6E7;
}
html,body{background:var(--bg);color:var(--ink);font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
.app{max-width:430px;margin:0 auto;min-height:100vh;background:var(--bg);display:flex;flex-direction:column}
.topbar{position:sticky;top:0;z-index:60;background:rgba(247,244,238,0.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--rule);padding:0 20px;height:52px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.wordmark{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--ink);letter-spacing:-0.1px}
.topbar-right{display:flex;align-items:center;gap:7px}
.topbar-add{width:34px;height:34px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(26,24,20,0.12);transition:transform 120ms,background 120ms;-webkit-tap-highlight-color:transparent}
.topbar-add:active{transform:scale(0.92)}
.topbar-btn{width:34px;height:34px;border-radius:8px;background:transparent;border:none;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 120ms,color 120ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.topbar-btn:hover{background:var(--bg-inset);color:var(--ink)}.topbar-btn:active{transform:scale(0.88)}
.tabbar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(247,244,238,0.96);backdrop-filter:blur(24px);border-top:1px solid var(--rule);display:flex;z-index:60;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px))}
.tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0;border:none;background:transparent;cursor:pointer;color:var(--ink-3);transition:color 150ms,transform 80ms;font-family:'DM Sans',sans-serif;-webkit-tap-highlight-color:transparent}
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
.page{flex:1;overflow-y:auto;padding:20px 20px calc(112px + env(safe-area-inset-bottom,0px));animation:pageIn 240ms cubic-bezier(0.22,1,0.36,1) backwards}
/* "backwards", not "both": a transform kept after the animation makes .page the box that position:fixed sheets are placed in,
   so a sheet opened from a long list landed thousands of pixels below the screen, under the tab bar. */
@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.label-sm{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3)}
/* Hero */
.hero{padding:16px 0 18px;border-bottom:1px solid var(--rule);margin-bottom:18px}
.hero-eyebrow{font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px}
.hero-amount{font-family:'Playfair Display',serif;font-size:clamp(34px,11.5vw,48px);font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-2px;line-height:1;color:var(--ink);margin-bottom:3px;white-space:nowrap}
.hero-sub{font-size:12px;color:var(--ink-3);margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mom-badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px}
.mom-badge.better{background:var(--pos-bg);color:var(--pos)}
.mom-badge.worse{background:var(--neg-bg);color:var(--neg)}
.hero-stats{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid var(--rule);border-radius:8px;overflow:hidden;background:var(--bg-card)}
.hero-stat{padding:11px 10px;position:relative}
.hero-stat:not(:last-child)::after{content:'';position:absolute;right:0;top:8px;bottom:8px;width:1px;background:var(--rule)}
.hero-stat-val{font-family:'Playfair Display',serif;font-size:clamp(12px,3.6vw,15px);font-weight:700;letter-spacing:-0.3px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
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
.safe-amount{font-family:'Playfair Display',serif;font-size:clamp(26px,8.6vw,32px);font-weight:900;letter-spacing:-1.5px;margin:4px 0}
.safe-daily{font-size:11px;color:var(--ink-3);margin-top:2px}
.safe-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px 0;border-bottom:1px solid var(--rule);font-size:11px}
.safe-row:last-child{border-bottom:none}
.safe-lbl{color:var(--ink-3)}.safe-val{font-family:'Playfair Display',serif;font-weight:600;color:var(--ink);white-space:nowrap;text-align:right}
/* Templates */
.tpl-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:14px;scrollbar-width:none}
.tpl-strip::-webkit-scrollbar{display:none}
.tpl-card{flex-shrink:0;display:flex;align-items:center;gap:7px;padding:8px 13px;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;cursor:pointer;transition:border-color 120ms,background 120ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.tpl-card:hover{border-color:var(--rule-2);background:var(--bg-warm)}.tpl-card:active{transform:scale(0.94)}
.tpl-name{font-size:12px;font-weight:600;color:var(--ink-2);white-space:nowrap}
.tpl-amt{font-family:'Playfair Display',serif;font-size:12px;color:var(--ink-3);white-space:nowrap}
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
.txn-date-total{font-family:'Playfair Display',serif;font-size:13px;font-weight:600;color:var(--ink)}
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
.txn-amt{font-family:'Playfair Display',serif;font-size:14px;font-weight:600}
.txn-amt.exp{color:var(--ink)}.txn-amt.inc{color:var(--pos)}
.txn-actions{display:flex;gap:1px}
.txn-act{width:28px;height:28px;border-radius:5px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink-4);transition:background 120ms,color 120ms}
.txn-act:hover{background:var(--bg-inset);color:var(--ink-2)}.txn-act.del:hover{background:var(--neg-bg);color:var(--neg)}
/* Empty */
.empty{text-align:center;padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:10px}
.empty-icon{color:var(--ink-5);margin-bottom:4px}
.empty-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:600;color:var(--ink)}
.empty-body{font-size:13px;color:var(--ink-3);line-height:1.65;max-width:240px}
/* Add overlay */
.add-overlay{position:fixed;inset:0;background:var(--bg);z-index:100;display:flex;flex-direction:column;max-width:430px;margin:0 auto;animation:slideUp 340ms cubic-bezier(0.22,1,0.36,1);overflow-y:auto}
@keyframes slideUp{from{transform:translateY(100%);opacity:0.6}to{transform:translateY(0);opacity:1}}
.add-bar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--rule);flex-shrink:0}
.add-title{font-family:'Playfair Display',serif;font-size:17px;font-weight:700}
.add-close{width:30px;height:30px;border-radius:50%;border:1px solid var(--rule);background:transparent;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color 120ms,color 120ms}
.add-close:hover{border-color:var(--ink-3);color:var(--ink)}
.add-body{flex:1;padding:18px 20px 36px;display:flex;flex-direction:column}
/* Amount */
.amount-zone{display:flex;align-items:center;justify-content:center;padding:18px 0 20px;border-bottom:1px solid var(--rule);margin-bottom:16px}
.amount-line{display:flex;align-items:baseline;justify-content:center;gap:7px;max-width:100%;min-width:0}
.amount-input{font-family:'Playfair Display',serif;font-size:clamp(32px,12vw,50px);font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-1.6px;background:transparent;border:0;border-radius:8px;outline:none;color:var(--ink);min-width:0;max-width:68vw;text-align:right;caret-color:var(--accent);transition:color 160ms,text-shadow 160ms,transform 160ms;appearance:textfield;-moz-appearance:textfield}
.amount-input:focus{color:var(--ink);text-shadow:0 0 18px rgba(26,24,20,0.07)}
.amount-input::placeholder{color:var(--ink-5)}
.amount-cur{font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;color:var(--ink-3);white-space:nowrap;position:relative;top:-2px}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
input[type=number]{-moz-appearance:textfield}
/* Type toggle */
.type-toggle{display:flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden;margin-bottom:14px}
.type-btn{flex:1;padding:9px;border:none;background:transparent;color:var(--ink-3);font-size:12px;font-weight:700;cursor:pointer;transition:background 120ms,color 120ms;font-family:'DM Sans',sans-serif;letter-spacing:0.3px;text-transform:uppercase}
.type-btn:not(:last-child){border-right:1px solid var(--rule)}.type-btn.active{background:var(--ink);color:var(--bg)}
/* Cat/sub */
.cat-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}.cat-scroll::-webkit-scrollbar{display:none}
.cat-tile{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;width:auto;min-width:68px;padding:9px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--bg-card);cursor:pointer;transition:border-color 150ms,background 150ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.cat-tile.sel{border-color:var(--ink);background:var(--bg-warm)}
.cat-tile:active{transform:scale(0.93)}
.cat-tile-name{font-size:9.5px;font-weight:600;color:var(--ink-3);text-align:center;line-height:1.2;white-space:nowrap;width:auto;letter-spacing:-0.1px}
.cat-tile.sel .cat-tile-name{color:var(--ink)}
.sub-strip{display:flex;gap:5px;overflow-x:auto;padding-bottom:2px;margin-bottom:12px;scrollbar-width:none}.sub-strip::-webkit-scrollbar{display:none}
.sub-chip{flex-shrink:0;padding:4px 10px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif;transition:all 120ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.sub-chip.sel{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.sub-chip:active{transform:scale(0.93)}
/* Merchant */
.merchant-wrap{position:relative}
.merchant-suggestions{position:absolute;top:calc(100% + 2px);left:0;right:0;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;z-index:20;overflow:hidden;box-shadow:0 4px 16px rgba(26,24,20,0.1)}
.merchant-sug-item{padding:9px 13px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--rule);color:var(--ink);transition:background 100ms}
.merchant-sug-item:last-child{border-bottom:none}.merchant-sug-item:hover{background:var(--bg-warm)}
.merchant-sug-sub{font-size:10px;color:var(--ink-3);margin-top:1px}
/* Form */
.field{margin-bottom:12px}
.field-lbl{font-size:10px;font-weight:700;letter-spacing:1.05px;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px;display:block}
.field-input{width:100%;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;padding:10px 12px;font-size:14px;color:var(--ink);font-family:'DM Sans',sans-serif;transition:border-color 150ms,box-shadow 150ms}
.field-input:focus{outline:none;border-color:var(--ink-3);box-shadow:0 0 0 3px rgba(26,24,20,0.06)}
.field-select{appearance:none;cursor:pointer}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
/* Toggle */
.toggle-track{width:44px;height:24px;border-radius:12px;background:var(--ink-5);position:relative;transition:background 100ms;flex-shrink:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.toggle-track.on{background:var(--ink)}
.toggle-knob{width:18px;height:18px;border-radius:50%;background:white;position:absolute;top:3px;left:3px;transition:transform 220ms cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 1px 4px rgba(0,0,0,0.2),0 0 0 0px rgba(26,24,20,0)}
.toggle-track.on .toggle-knob{transform:translateX(20px)}
.toggle-track:active .toggle-knob{transform:scaleX(1.15)}
.toggle-track.on:active .toggle-knob{transform:translateX(20px) scaleX(1.15)}
/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:6px;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer;transition:opacity 120ms,background 120ms}
.btn-full{width:100%}
.btn-primary{padding:12px 20px;background:var(--ink);color:var(--bg);border:1px solid var(--ink);font-size:14px;font-weight:700;margin-top:8px}.btn-primary:hover{opacity:0.87}
.btn-ghost{padding:11px 20px;background:transparent;color:var(--ink-3);border:1px solid var(--rule);font-size:13px;margin-top:6px}.btn-ghost:hover{border-color:var(--rule-2);color:var(--ink)}
.btn-sm{padding:5px 12px;font-size:11px;font-weight:700;background:transparent;border:1px solid var(--rule);color:var(--ink-2)}.btn-sm:hover{border-color:var(--rule-2)}
.btn-sm-primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}
/* Search/filter */
.search-wrap{position:relative;margin-bottom:8px}
.search-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--ink-4);pointer-events:none}
.search-input{width:100%;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;padding:9px 12px 9px 34px;font-size:13px;color:var(--ink);font-family:'DM Sans',sans-serif;transition:border-color 120ms}.search-input:focus{outline:none;border-color:var(--rule-2);box-shadow:0 0 0 3px rgba(26,24,20,0.05)}
.filter-bar{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px}.filter-bar::-webkit-scrollbar{display:none}
.chip{flex-shrink:0;padding:5px 11px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;transition:all 120ms,transform 80ms;white-space:nowrap;font-family:'DM Sans',sans-serif;-webkit-tap-highlight-color:transparent}
.chip.on{background:var(--ink);border-color:var(--ink);color:var(--bg)}.chip:hover:not(.on){border-color:var(--rule-2);color:var(--ink)}.chip:active{transform:scale(0.94)}
.cat-filter-btn{display:flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;flex-shrink:0;transition:all 120ms}
.cat-filter-btn.active{border-color:var(--ink);color:var(--ink);background:var(--bg-warm)}
.cat-filter-btn:active{transform:scale(0.94)}
.date-inputs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.date-input-wrap{display:flex;flex-direction:column;gap:3px}
.date-lbl{font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-3)}
.date-input{background:var(--bg-card);border:1px solid var(--rule);border-radius:5px;padding:7px 9px;font-size:12px;color:var(--ink);font-family:'DM Sans',sans-serif;width:100%}.date-input:focus{outline:none;border-color:var(--rule-2);box-shadow:0 0 0 3px rgba(26,24,20,0.05)}
/* Sheet */
.sheet-overlay{position:fixed;inset:0;background:rgba(26,24,20,0.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:80;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 200ms cubic-bezier(0.22,1,0.36,1)}
@keyframes fadeIn{from{opacity:0;backdrop-filter:blur(0px)}to{opacity:1;backdrop-filter:blur(12px)}}
.sheet{background:var(--bg);width:100%;max-width:430px;border-radius:20px 20px 0 0;border-top:1px solid var(--rule);max-height:92vh;overflow-y:auto;animation:sheetRise 320ms cubic-bezier(0.22,1,0.36,1);padding:0 20px 48px;box-shadow:0 -4px 32px rgba(26,24,20,0.12)}
@keyframes sheetRise{from{transform:translateY(100%);opacity:0.8}to{transform:translateY(0);opacity:1}}
.sheet-handle{width:32px;height:3px;background:var(--ink-5);border-radius:99px;margin:12px auto 18px}
.sheet-title{font-family:'Playfair Display',serif;font-size:21px;font-weight:700;margin-bottom:16px}
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
.cat-bar-amt{font-family:'Playfair Display',serif;font-size:12px;font-weight:600;color:var(--ink);width:68px;text-align:right;flex-shrink:0}
.cat-bar-pct{font-size:10px;color:var(--ink-3);width:26px;text-align:right;flex-shrink:0}
/* Month bars */
.month-bars{display:flex;align-items:flex-end;gap:4px;height:80px;padding-top:8px}
.m-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;cursor:pointer;position:relative}
.m-bar{width:100%;border-radius:2px 2px 0 0;transition:height 0.5s ease,background 150ms;min-height:2px}
.m-lbl{font-size:10px;font-weight:700;letter-spacing:0.2px}
/* Heatmap */
.heatmap{display:grid;grid-template-columns:22px repeat(7,1fr);gap:2px}
.hm-corner{}.hm-day-hdr{font-size:10px;font-weight:700;color:var(--ink-4);text-align:center;padding-bottom:3px}
.hm-wk-lbl{font-size:9px;color:var(--ink-3);text-align:right;padding-right:3px;display:flex;align-items:center;justify-content:flex-end}
.hm-cell{aspect-ratio:1;border-radius:2px;cursor:pointer}
/* Stats */
.stat-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:13px}
.stat-cell{background:var(--bg-card);border:1px solid var(--rule);border-radius:7px;padding:11px 12px}
.stat-val{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;letter-spacing:-0.5px;margin-bottom:2px}
.stat-lbl{font-size:10px;font-weight:700;letter-spacing:0.65px;text-transform:uppercase;color:var(--ink-3)}
/* What Changed */
.wc-row{display:flex;align-items:flex-start;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--rule)}
.wc-row:last-child{border-bottom:none}
.wc-name{font-size:12px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:6px}
.wc-diff{font-family:'Playfair Display',serif;font-size:13px;font-weight:700}
.wc-diff.pos{color:var(--pos)}.wc-diff.neg{color:var(--neg)}
.wc-merchants{margin-top:5px;padding-left:19px}
.wc-m-row{display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3);padding:2px 0}
/* Pattern */
.pattern-item{background:var(--bg-warm);border-radius:6px;padding:10px 13px;margin-bottom:7px;font-size:12px;color:var(--ink-2);line-height:1.5;display:flex;align-items:flex-start;gap:8px}
/* Snackbar / Toast */
.snackbar{position:fixed;bottom:calc(72px + env(safe-area-inset-bottom,0px) + 8px);left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:11px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;display:flex;align-items:center;gap:14px;white-space:nowrap;box-shadow:0 8px 24px rgba(26,24,20,0.3),0 2px 6px rgba(26,24,20,0.15);animation:snackIn 300ms cubic-bezier(0.22,1,0.36,1)}
@keyframes snackIn{from{opacity:0;transform:translateX(-50%) translateY(16px) scale(0.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
.snackbar-undo{background:none;border:1px solid rgba(255,255,255,0.25);color:var(--bg);border-radius:6px;padding:4px 11px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:border-color 120ms}
.snackbar-undo:hover{border-color:rgba(255,255,255,0.5)}
.toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:9px 18px;border-radius:8px;font-size:12px;font-weight:600;z-index:300;white-space:nowrap;pointer-events:none;animation:toastIn 260ms cubic-bezier(0.22,1,0.36,1);box-shadow:0 4px 16px rgba(26,24,20,0.25)}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px) scale(0.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
/* Staggered section entrance */
.section-enter{animation:sectionIn 280ms cubic-bezier(0.22,1,0.36,1) both}
.section-enter-1{animation-delay:0ms}
.section-enter-2{animation-delay:40ms}
.section-enter-3{animation-delay:80ms}
.section-enter-4{animation-delay:120ms}
.section-enter-5{animation-delay:160ms}
.section-enter-6{animation-delay:200ms}
.section-enter-7{animation-delay:240ms}
.section-enter-8{animation-delay:280ms}
@keyframes sectionIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.backup-banner{display:flex;align-items:center;gap:10px;padding:9px 16px;background:var(--warn-bg);border-bottom:1px solid #D4A82A;font-size:11px;font-weight:600;color:var(--warn)}
.backup-banner span{flex:1}
.backup-banner-btn{flex-shrink:0;padding:4px 10px;background:var(--warn);color:#fff;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif}
.backup-dismiss{background:none;border:none;color:var(--warn);font-size:15px;cursor:pointer;padding:2px;line-height:1;flex-shrink:0}
.drop-zone{border:1.5px dashed var(--rule);border-radius:7px;padding:16px;text-align:center;cursor:pointer;transition:border-color 150ms,background 150ms;width:100%}
.drop-zone:hover{border-color:var(--rule-2);background:var(--bg-warm)}
.drop-zone input{display:none}
.dupe-warn{display:flex;align-items:center;gap:7px;background:var(--warn-bg);border:1px solid #D4A82A;border-radius:6px;padding:8px 11px;font-size:12px;font-weight:600;color:var(--warn);margin-bottom:11px}
/* Monthly view */
.month-selector{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.month-nav-btn{width:34px;height:34px;border-radius:8px;background:var(--bg-card);border:1px solid var(--rule);color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 120ms;font-size:16px;line-height:1}
.month-nav-btn:hover{border-color:var(--rule-2);color:var(--ink)}
.month-name{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--ink)}
.month-stat{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:13px 14px}
.month-stat-val{font-family:'Playfair Display',serif;font-size:clamp(17px,5.8vw,22px);font-weight:900;letter-spacing:-0.5px;margin-bottom:3px}
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
.lang-pill.sel{border-color:var(--ink);background:var(--ink);color:var(--bg)}
.lang-pill:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.topbar-add:focus-visible,.topbar-btn:focus-visible,.tab-btn:focus-visible,.btn:focus-visible,.cat-tile:focus-visible,.chip:focus-visible,.sub-chip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
/* ── Design pass (from patch_H_design.py, reviewed) ── */
/* Secondary greys: --ink-3 #5F5A53 is 6.2:1 on the page background, --ink-4 #6E6961 is ≥ 4.5:1 on every surface
   (page, card, warm and inset backgrounds). They were 4.2:1 and 2.0:1. (The patch's #746F67 failed on --bg-inset: 4.15:1.) */
/* Money reads as aligned, lining figures */
.hero-amount,.hero-stat-val,.safe-amount,.safe-val,.stat-val,.month-stat-val,.txn-amt,.txn-date-total,.cat-bar-amt,.budget-nums,.amount-input,.wc-diff,.goal-meta{font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1}
/* Touch targets: the look stays, the tappable area grows to 44px */
.topbar-btn,.add-close,.toggle-track,.snackbar-undo,.topbar-add,.backup-banner-btn,.backup-dismiss{position:relative}
.topbar-btn::after{content:"";position:absolute;inset:-5px}
.sheet .topbar-btn{z-index:1}   /* keeps the enlarged tap area above the goal progress bar drawn just below it */
.topbar-add::after{content:"";position:absolute;inset:-6px}
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
/* Materials follow the user's preferences */
@media (prefers-reduced-transparency: reduce){
  .topbar,.tabbar{background:var(--bg);backdrop-filter:none;-webkit-backdrop-filter:none}
  .sheet-overlay{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(26,24,20,0.62)}
}
@media (prefers-contrast: more){
  :root{--rule:#8B867E;--rule-2:#5F5A53;--ink-3:#4A4640;--ink-4:#504B45}
  .sheet-overlay{background:rgba(26,24,20,0.72)}
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
    const apply=(sheet,overlay,y,h)=>{ sheet.style.transform=`translateY(${y}px)`; overlay.style.background=`rgba(26,24,20,${0.5*(1-Math.min(1,Math.max(0,y)/h))})`; };
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
export default function App() {
  const [state,    setState]    = useState(() => migrateAndLoad());
  // The whole tree renders in the saved language. Changing it is an ordinary state update: everything re-renders in place,
  // so the open screen, open sheets and anything typed into a form are kept.
  setLang(state.language||"en");
  useEffect(()=>{ document.documentElement.lang=state.language||"en"; },[state.language]);
  const [tab,      setTab]      = useState("home");
  const [tabKey,   setTabKey]   = useState(0);
  const [showAdd,  setShowAdd]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast,    setToast]    = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [prefill,  setPrefill]  = useState(null);
  const [editId,   setEditId]   = useState(null);
  const [viewTxn,  setViewTxn]  = useState(null);
  const [importPending, setImportPending] = useState(null);
  const [skipDup, setSkipDup] = useState(true);
  // Recovery messages stay on screen until the user dismisses them; ordinary toasts can never replace them.
  const [recoveryNotice, setRecoveryNotice] = useState(()=>LOAD_NOTICE);
  const stateRef = useRef(state);
  stateRef.current = state;   // always the latest committed state, for callbacks that must not close over a stale copy
  useSheetGestures();
  // Dismissing the backup reminder hides it for this visit only; it is worked out from the saved state on every render.
  const [backupDismissed, setBackupDismissed] = useState(false);
  const backupReminder = backupReminderDue(state);
  const snackTimer=useRef(null);
  const snackActive=useRef(false);   // is an undo window currently open?
  const undoBuffer=useRef([]);       // everything deleted inside the current undo window

  // PWA manifest
  useEffect(() => {
    if (document.getElementById("pwa-manifest")) return;
    const manifest={name:"Expense Ledger",short_name:"Ledger",start_url:"/",display:"standalone",
      background_color:"#F7F4EE",theme_color:"#1A1814",orientation:"portrait",
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
    addMeta("theme-color","#1A1814");
  },[]);

  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(()=>{
    // Never overwrite the original stored data if we could not keep a recovery copy of it.
    if (SAVE_BLOCKED) { setStorageFailed(true); return; }
    const ok=writeRaw(KEY,state);
    setStorageFailed(!ok);
  },[state]);

  const merchantMemory=useMemo(()=>buildMerchantMemory(state.transactions),[state.transactions]);

  const toastTimer=useRef(null);
  // A new toast cancels the previous one's timer, so back-to-back messages are never cut short.
  const showToast=useCallback((msg,ms=1800)=>{ clearTimeout(toastTimer.current); setToast(msg); toastTimer.current=setTimeout(()=>setToast(null),ms); },[]);
  const showSnackbar=useCallback((msg,onUndo,ms=4000)=>{
    clearTimeout(snackTimer.current);
    setSnackbar({msg,onUndo}); snackActive.current=true;
    snackTimer.current=setTimeout(()=>{ setSnackbar(null); snackActive.current=false; },ms);
  },[]);

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
      if (tabRef.current!=="home") { switchTab("home"); arm(); return; }
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

  // Swipe between the five sections: a quick, clearly sideways swipe on the page. Ignored while a sheet or the add form is
  // open, on form fields, on rows that scroll sideways (e.g. the filter chips), and from the screen edges (the system's own
  // back gesture lives there).
  useEffect(()=>{
    const ORDER=["home","ledger","monthly","analytics","recurring"];
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
      const i=ORDER.indexOf(tabRef.current), j=i+(dx<0?1:-1);
      if (i<0 || j<0 || j>=ORDER.length) return;
      switchTab(ORDER[j]); window.scrollTo(0,0);
    };
    const reset=()=>{ s=null; };
    document.addEventListener("touchstart",onStart,{ passive:true }); document.addEventListener("touchmove",onMove,{ passive:true });
    document.addEventListener("touchend",onEnd,{ passive:true }); document.addEventListener("touchcancel",reset,{ passive:true });
    return ()=>{ document.removeEventListener("touchstart",onStart); document.removeEventListener("touchmove",onMove);
      document.removeEventListener("touchend",onEnd); document.removeEventListener("touchcancel",reset); };
  },[switchTab]);

  const addTransaction=useCallback((txn)=>{
    setState(s=>({...s,transactions:[{...txn,id:Date.now()+Math.random(),createdAt:new Date().toISOString()},...s.transactions]}));
    showToast(t("toast.recorded"));
  },[showToast]);

  const updateTransaction=useCallback((id,txn)=>{
    setState(s=>({...s,transactions:s.transactions.map(t=>t.id===id?{...t,...txn}:t)}));
    showToast(t("toast.updated"));
  },[showToast]);

  const deleteTransaction=useCallback((id)=>{
    const removed=stateRef.current.transactions.find(t=>t.id===id);
    if (!removed) return;
    setState(s=>({...s,transactions:s.transactions.filter(t=>t.id!==id)}));
    // Deletions made while one undo window is open share it ("2 transactions deleted"), so none of them is lost.
    if (!snackActive.current) undoBuffer.current=[];
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
    });
  },[showSnackbar]);

  // Pausing or reactivating applies to the WHOLE schedule (every recorded payment of it), so the state is always consistent.
  const toggleScheduleActive=useCallback((ids,makeActive)=>{
    const set=new Set(ids.map(String));
    setState(s=>({...s,transactions:s.transactions.map(t=>set.has(String(t.id))?{...t,isActive:makeActive}:t)}));
  },[]);

  const openAdd=useCallback((prefillData=null,existingId=null)=>{
    setPrefill(prefillData); setEditId(existingId); setShowAdd(true);
  },[]);
  const closeAdd=useCallback(()=>{ setShowAdd(false); setPrefill(null); setEditId(null); },[]);

  const exportCSV=useCallback(()=>{
    downloadFile(buildCsv(state.transactions),"text/csv;charset=utf-8;",`ledger-${today()}.csv`);
    showToast(tn("toast.csvCreated",state.transactions.length));
  },[state.transactions,showToast]);

  const exportJSON=useCallback(()=>{
    const now=new Date().toISOString();
    downloadFile(JSON.stringify(buildBackup(state,now),null,2),"application/json",`ledger-backup-${today()}.json`);
    // lastBackup records when the file was CREATED. The app cannot know whether the browser actually kept it.
    // It is not a confirmed backup until the user says they have the file (see backupReminderDue).
    setState(s=>({...s,lastBackup:now}));
    setBackupDismissed(false);
    showToast(tn("toast.backupCreated",state.transactions.length),5000);
  },[state,showToast]);

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

  const commitImport=useCallback((mode)=>{
    const plan=importPending;
    if (!plan || plan.error) return;
    const before=stateRef.current;
    if (mode==="replace") {
      // Never overwrite without a recoverable copy of what is being replaced.
      if (!preserveRaw("before_import", before)) { showToast(t("import.copyFailed"),6000); return; }
      pruneRecoveryCopies("before_import");
    }
    const next=applyImport(before, plan, mode, { skipDuplicates:skipDup && plan.dupCount>0 });
    setState(next);
    setImportPending(null);
    const delta=next.transactions.length-before.transactions.length;
    showSnackbar(mode==="replace" ? tn("import.replaced",plan.transactions.length) : tn("import.added",delta), ()=>{
      // Undo only if nothing has changed since; otherwise it would erase newer work.
      if (stateRef.current!==next) { showToast(t("import.cantUndo")); return; }
      setState(before);
    }, 8000);
  },[importPending,skipDup,showToast,showSnackbar]);

  const {transactions,budgets,templates,currency,goals,safeToSpend}=state;
  const changeLanguage=useCallback((l)=>{ setState(s=>({...s,language:l})); showToast(tIn(l,"lang.changed")); },[showToast]);

  // Genuinely fresh install: the language is chosen before anything else is shown. The starter quick-fill templates are
  // given names in that language — only while they are still exactly the untouched defaults (never a user's own templates).
  const chooseFirstLanguage=(l)=>setState(s=>({ ...s, language:l,
    templates: JSON.stringify(s.templates)===JSON.stringify(DEFAULT_TEMPLATES) ? DEFAULT_TEMPLATES.map(tp=>MESSAGES["tpl."+tp.id]?{...tp,name:tIn(l,"tpl."+tp.id)}:tp) : s.templates }));
  if (state.language===null) return (<><style>{CSS}</style><LanguageChooser onChoose={chooseFirstLanguage}/></>);

  return (
    <>
      <style>{CSS}</style>
      <div className="app" lang={state.language}>
        {toast&&<div className="toast" role="status">{toast}</div>}
        {snackbar&&(
          <div className="snackbar" role="status">
            <span>{snackbar.msg}</span>
            <button className="snackbar-undo" onClick={()=>{snackbar.onUndo?.();setSnackbar(null);snackActive.current=false;clearTimeout(snackTimer.current);}}>{t("common.undo")}</button>
          </div>
        )}
        {recoveryNotice&&(
          <div className="backup-banner" role="alert" style={{background:"var(--warn-bg)"}}>
            <span>{recoveryNotice}</span>
            <button className="backup-dismiss" onClick={()=>setRecoveryNotice(null)} aria-label={t("common.dismissNotice")}>×</button>
          </div>
        )}
        {storageFailed&&(
          <div className="backup-banner" role="alert" style={{background:"var(--neg-bg)",borderBottomColor:"var(--neg)",color:"var(--neg)"}}>
            <span>{SAVE_BLOCKED?t("banner.savePaused"):t("banner.saveFailed")}</span>
            <button className="backup-banner-btn" style={{background:"var(--neg)"}} onClick={exportJSON}>{t("banner.backUp")}</button>
          </div>
        )}
        {!backupDismissed&&backupReminder==="due"&&transactions.length>0&&(
          <div className="backup-banner" role="alert">
            <span>{t("banner.backupDue")}</span>
            <button className="backup-banner-btn" onClick={exportJSON}>{t("banner.backUpNow")}</button>
            <button className="backup-dismiss" onClick={()=>setBackupDismissed(true)} aria-label={t("common.dismiss")}>×</button>
          </div>
        )}
        {!backupDismissed&&backupReminder==="confirm"&&transactions.length>0&&(
          <div className="backup-banner" role="status">
            <span>{t("banner.backupConfirm")}</span>
            <button className="backup-banner-btn" onClick={()=>{ setState(s=>({...s,backupConfirmedAt:new Date().toISOString()})); showToast(tn("banner.confirmThanks",BACKUP_REMINDER_DAYS)); }}>{t("banner.haveFile")}</button>
            <button className="backup-dismiss" onClick={()=>setBackupDismissed(true)} aria-label={t("common.dismiss")}>×</button>
          </div>
        )}

        <header className="topbar">
          <span className="wordmark">Expense Ledger</span>
          <div className="topbar-right">
            <button className="topbar-add" onClick={()=>openAdd()} aria-label={t("nav.addTxn")} title={t("nav.addTxn")}><Icon name="add" size={18} color="var(--bg)"/></button>
            <button className="topbar-btn" onClick={()=>setShowSettings(true)} aria-label={t("nav.settings")} title={t("nav.settings")}><Icon name="settings" size={18}/></button>
          </div>
        </header>

        <main className="page" key={tabKey}>
          {tab==="home"      && <HomePage transactions={transactions} budgets={budgets} templates={templates} currency={currency} safeToSpend={safeToSpend} goals={goals} onAdd={()=>openAdd()} onTemplate={tpl=>openAdd({type:"expense",amount:tpl.amount,category:tpl.catId,subcategory:tpl.subcat||"",merchant:tpl.merchant||"",note:tpl.note||tpl.name,recurring:false,recurFreq:null})} onView={txn=>setViewTxn(txn)}/>}
          {tab==="ledger"    && <LedgerPage transactions={transactions} currency={currency} onDelete={deleteTransaction} onEdit={txn=>openAdd(txn,txn.id)} onView={txn=>setViewTxn(txn)} onAdd={()=>openAdd()}/>}
          {tab==="analytics" && <AnalyticsPage transactions={transactions} currency={currency} budgets={budgets}/>}
          {tab==="monthly"   && <MonthlyView transactions={transactions} currency={currency} budgets={budgets} onView={txn=>setViewTxn(txn)}/>}
          {tab==="recurring" && <RecurringHub transactions={transactions} currency={currency} onView={txn=>setViewTxn(txn)} onToggleSchedule={toggleScheduleActive}/>}
        </main>


        <nav className="tabbar" role="navigation" style={{"--tab-index":tab==="home"?0:tab==="ledger"?1:tab==="monthly"?2:tab==="analytics"?3:4,"--tab-count":5}}>
          {[{id:"home",icon:"home"},{id:"ledger",icon:"list"},{id:"monthly",icon:"calendar"},{id:"analytics",icon:"chart"},{id:"recurring",icon:"repeat"}].map(tb=>(
            <button key={tb.id} className={`tab-btn${tab===tb.id?" active":""}`} onClick={()=>switchTab(tb.id)} aria-label={t("nav."+tb.id)} aria-current={tab===tb.id?"page":undefined}>
              <Icon name={tb.icon} size={18}/><span className="tab-lbl">{t("nav."+tb.id)}</span>
            </button>
          ))}
          <span className="tab-indicator" aria-hidden="true"/>
        </nav>

        {showAdd&&(
          <AddEditOverlay templates={templates} currency={currency} transactions={transactions} prefill={prefill} editId={editId} merchantMemory={merchantMemory}
            onSave={txn=>{ editId?updateTransaction(editId,txn):addTransaction(txn); closeAdd(); }} onClose={closeAdd}/>
        )}
        {showSettings&&(
          <SettingsSheet state={state} onLanguageChange={changeLanguage}
            onExportCSV={exportCSV} onExportJSON={exportJSON} onImportFile={importFile}
            onSetBudget={(catId,amount)=>setState(s=>({...s,budgets:{...s.budgets,[catId]:amount}}))}
            onCurrencyChange={c=>setState(s=>({...s,currency:c}))}
            onAddTemplate={tpl=>setState(s=>({...s,templates:[...s.templates,{...tpl,id:"t"+Date.now()}]}))}
            onDeleteTemplate={id=>setState(s=>({...s,templates:s.templates.filter(t=>t.id!==id)}))}
            onAddGoal={g=>setState(s=>({...s,goals:[...s.goals,{...g,id:"g"+Date.now()}]}))}
            onUpdateGoal={(id,patch)=>setState(s=>({...s,goals:s.goals.map(g=>g.id===id?{...g,...patch}:g)}))}
            onDeleteGoal={id=>setState(s=>({...s,goals:s.goals.filter(g=>g.id!==id)}))}
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
                    <strong>{t("import.replaceLabel")}</strong> {t("import.replaceText")}
                  </div>
                  {importPending.dupCount>0&&(
                    <label style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:12,color:"var(--ink-2)",marginBottom:14,lineHeight:1.45}}>
                      <input type="checkbox" checked={skipDup} onChange={e=>setSkipDup(e.target.checked)} style={{marginTop:2}}/>
                      <span>{t("import.skipDup",{n:importPending.dupCount})}</span>
                    </label>
                  )}
                  <button className="btn btn-primary btn-full" style={{marginTop:0}} onClick={()=>commitImport("merge")}>{t("import.mergeBtn")}</button>
                  <button className="btn btn-ghost btn-full" style={{marginTop:8,color:"var(--neg)",borderColor:"var(--neg-bg)"}} onClick={()=>commitImport("replace")}>{t("import.replaceBtn")}</button>
                  <button className="btn btn-ghost btn-full" onClick={()=>setImportPending(null)}>{t("common.cancel")}</button>
                </>
              )}
            </div>
          </div>
        )}
        {viewTxn&&(
          <TxnDetailSheet txn={viewTxn} currency={currency} transactions={transactions}
            onClose={()=>setViewTxn(null)}
            onEdit={()=>{ openAdd(viewTxn,viewTxn.id); setViewTxn(null); }}
            onDuplicate={()=>{ openAdd({...viewTxn,date:today(),id:undefined},null); setViewTxn(null); }}
            onDelete={()=>{ deleteTransaction(viewTxn.id); setViewTxn(null); }}/>
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

function HomePage({ transactions, budgets, templates, currency, safeToSpend, goals, onAdd, onTemplate, onView }) {
  const now=curMon(), prv=prevMon();
  const { curExp,curInc,prevExp,momDiff,surplusRate,plannedExp,plannedInc }=calcMonthSummary(transactions,now,prv);
  const catSpend    =calcCategorySpend(transactions,now);
  const budgetTotal =Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const spentToDate =calcSpentToDate(transactions,now);
  const paceInfo    =calcSpendingPace(spentToDate,now,budgetTotal);
  const budgetItems =calcBudgetStatus(budgets,catSpend,now);
  const safeInfo    =calcSafeToSpend(transactions,safeToSpend,goals);
  const wc          =calcWhatChanged(transactions,now,prv);
  const hasIncome   =curInc>0;
  const recent      =transactions.slice(0,6);

  // Upcoming recurring (due within 7 days)
  const upcomingSchedules=useMemo(()=>{
    const nowD=new Date();
    return buildSchedules(transactions).filter(x=>x.isActive&&x.type==="expense")
      .map(x=>({...x,nextDue:scheduleNextDue(x,transactions,nowD)}))
      .filter(x=>x.nextDue&&daysBetween(nowD,x.nextDue)<=7)
      .sort((a,b)=>a.nextDue-b.nextDue);
  },[transactions]);

  return (
    <div>
      {/* LEVEL 1: Financial position */}
      <div className="hero">
        <div className="hero-eyebrow">{monthName(now)}</div>
        <div className="hero-amount">{fmt(curExp,currency)}</div>
        <div className="hero-sub">
          <span>{t("home.spentThisMonth")}</span>
          {momDiff!==null&&(
            <span className={`mom-badge ${momDiff<=0?"better":"worse"}`}>
              <Icon name={momDiff<=0?"arrowDown":"arrowUp"} size={10}/>
              {t(momDiff<=0?"home.momLess":"home.momMore",{ amount:fmt(Math.abs(momDiff),currency), month:monthShort(prv) })}
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
              <><div className={`hero-stat-val${(surplusRate||0)>=20?" pos":(surplusRate||0)<0?" neg":""}`}>{surplusRate??0}%</div><div className="hero-stat-lbl">{t("surplus."+surplusLabel(curInc,curExp))}</div></>
            ):(
              <><div className={`hero-stat-val${curInc>curExp?" pos":curInc<curExp?" neg":""}`}>{fmtShort(Math.abs(curInc-curExp),currency)}</div><div className="hero-stat-lbl">{t("home.balance")}</div></>
            )}
          </div>
        </div>
        <PlannedNote plannedExp={plannedExp} plannedInc={plannedInc} currency={currency} style={{marginTop:10}}/>
      </div>

      {/* Smart Helper — deterministic advice cards */}
      <div className="section-enter section-enter-1">
        <SmartHelper transactions={transactions} budgets={budgets} goals={goals} safeToSpend={safeToSpend} currency={currency}/>
      </div>

      {/* LEVEL 2: Available — Safe to Spend (decision-first) */}
      {safeToSpend?.enabled&&safeInfo.feasible&&(
        <div className="safe-card section-enter section-enter-2">
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
        </div>
      )}

      {safeToSpend?.enabled&&safeInfo.feasible&&(
        <div style={{fontSize:10,color:"var(--ink-4)",fontStyle:"italic",margin:"-6px 2px 14px",lineHeight:1.5}}>
          {t("safe.noteIncome")}{" "}
          {safeInfo.scheduleCount>0
            ? t("safe.noteSchedules",{ up:safeInfo.upcomingCount, un:safeInfo.unrecordedCount, s:safeInfo.scheduleCount, payments:tn("unit.payments",safeInfo.upcomingCount+safeInfo.unrecordedCount), schedules:tn("unit.schedules",safeInfo.scheduleCount) })
            : t("safe.noteNoRecurring")}
        </div>
      )}

      {/* Safe to Spend is on but no income has arrived yet this month: say so instead of showing nothing. */}
      {safeToSpend?.enabled&&!safeInfo.feasible&&(
        <div className="safe-card section-enter section-enter-2" role="status">
          <div className="label-sm" style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
            <Icon name="safe" size={12} color="var(--ink-3)"/>{t("safe.title")}
          </div>
          <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.5}}>
            {t("safe.waiting")}{safeInfo.expectedInc>0?" "+t("safe.waitingExpected",{ amount:fmt(safeInfo.expectedInc,currency) }):""}
          </div>
        </div>
      )}

      {/* LEVEL 3: Goals — trajectory */}
      {goals?.length>0&&(
        <div className="section-enter section-enter-3" style={{marginBottom:16}}>
          <div className="label-sm" style={{marginBottom:10}}>{t("goals.title")}</div>
          {goals.map(goal=>{
            const gp=calcGoalProgress(goal); const {pct,remaining,estCompletion,behindSchedule}=gp;
            return (
              <div key={goal.id} className="goal-card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <div className="goal-name">{goal.name}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:behindSchedule?"var(--neg)":"var(--ink)"}}>{Math.round(pct)}%</div>
                </div>
                <div className="goal-progress"><div className="goal-fill" style={{width:`${pct}%`}}/></div>
                <div className="goal-meta">
                  <span>{t("goals.savedOf",{ saved:fmt(goal.saved||0,currency), target:fmt(goal.target||0,currency) })}</span>
                  <span>{gp.complete?t("goals.completed"):gp.overdue?t("goals.overdueToGo",{amount:fmt(remaining,currency)}):estCompletion?t("goals.est",{date:estCompletion}):remaining>0?t("goals.toGo",{amount:fmt(remaining,currency)}):""}</span>
                </div>
                {gp.behindSchedule&&<div style={{fontSize:10,color:"var(--neg)",fontWeight:600,marginTop:4}}>{t("goals.behind")}</div>}
                {gp.onTrack&&<div style={{fontSize:10,color:"var(--pos)",fontWeight:600,marginTop:4}}>{t("goals.onTrack")}</div>}
                {gp.overdue&&<div style={{fontSize:10,color:"var(--neg)",fontWeight:600,marginTop:4}}>{tn("goals.overdueDays",-gp.daysToTarget)}</div>}
                {gp.noContribution&&<div style={{fontSize:10,color:"var(--ink-4)",marginTop:4}}>{t("goals.noContribution")}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* LEVEL 4: Budget status */}
      {budgetItems.length>0&&(
        <div className="section-enter section-enter-4" style={{marginBottom:16}}>
          <div className="label-sm" style={{marginBottom:10}}>{t("budgets.title")}</div>
          {budgetItems.map(({catId,limit,spent,pct,over,warn})=>{
            const cat=CAT(catId);
            return (
              <div key={catId} className="budget-item">
                <div className="budget-hdr">
                  <div className="budget-name"><CatIcon catId={catId} size={12}/>{catName(catId)}</div>
                  <span className="budget-nums"><strong>{fmt(spent,currency)}</strong> / {fmt(limit,currency)}</span>
                </div>
                <div className="budget-track"><div className="budget-fill" style={{width:`${pct}%`,background:over?"var(--neg)":warn?"var(--warn)":(cat?.color||"var(--ink-3)")}}/></div>
                <div className={`budget-msg${over?" over":warn?" warn":""}`}>
                  {over?t("budgets.over",{amount:fmt(spent-limit,currency)}):warn?t("budgets.warn",{amount:fmt(limit-spent,currency)}):t("budgets.remaining",{amount:fmt(limit-spent,currency)})}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LEVEL 5: Upcoming recurring commitments */}
      {upcomingSchedules.length>0&&(
        <div className="section-enter section-enter-5" style={{background:"var(--warn-bg)",border:"1px solid #D4A82A",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
          <div className="label-sm" style={{marginBottom:8,display:"flex",alignItems:"center",gap:5,color:"var(--warn)"}}>
            <Icon name="calendar" size={12} color="var(--warn)"/>{t("home.dueWithin7")}
          </div>
          {upcomingSchedules.slice(0,3).map(s=>{
            const daysLeft=daysBetween(new Date(),s.nextDue);
            return (
              <div key={s.key} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(212,168,42,0.2)"}}>
                <span style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{s.merchant||s.note||catName(s.category)}</span>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:12,fontWeight:600,color:"var(--neg)"}}>{fmt(s.amount,currency)}</div>
                  <div style={{fontSize:10,color:"var(--warn)",fontWeight:700}}>{daysLeft===0?t("date.today"):daysLeft===1?t("date.tomorrow"):t("date.inDays",{n:daysLeft})}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LEVEL 6: What changed — compact signal */}
      {wc.catChanges.length>0&&prevExp>0&&(
        <div className="section-enter section-enter-6" style={{background:"var(--bg-card)",border:"1px solid var(--rule)",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
          <div className="label-sm" style={{marginBottom:10}}>{t("wc.title",{month:monthShort(prv)})}</div>
          {wc.catChanges.slice(0,3).map(({catId,diff,merchantDiffs})=>{
            const cat=CAT(catId);
            // Show top merchant driver if available
            const topM=merchantDiffs?.[0];
            return (
              <div key={catId} style={{padding:"6px 0",borderBottom:"1px solid var(--rule)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--ink)"}}><CatIcon catId={catId} size={13} color={cat?.color}/>{catName(catId)}</div>
                  <div style={{fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,color:diff<=0?"var(--pos)":"var(--neg)"}}>{diff>0?"+":""}{fmt(diff,currency)}</div>
                </div>
                {topM&&(
                  <div style={{fontSize:11,color:"var(--ink-3)",marginTop:2,display:"flex",alignItems:"center",gap:5}}>
                    <Icon name="merchant" size={10} color="var(--ink-4)"/>
                    {topM.merchant}
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:topM.isRecurring?"var(--warn-bg)":"var(--bg-inset)",color:topM.isRecurring?"var(--warn)":"var(--ink-4)"}}>
                      {topM.isRecurring?t("wc.recurring"):t("wc.oneOff")}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Spending pace — trajectory context */}
      {spentToDate>0&&(
        <div className="pace-card section-enter section-enter-7">
          <div className="pace-row">
            <span className="label-sm" style={{display:"flex",alignItems:"center",gap:5}}><Icon name="pace" size={12} color="var(--ink-3)"/>{t("pace.title")}</span>
            <span style={{fontSize:11,color:"var(--ink-3)"}}>{t("pace.dayOf",{d:paceInfo.daysPassed,total:paceInfo.totalDays})}</span>
          </div>
          {budgetTotal>0&&(
            <div className="pace-track" style={{position:"relative",height:5}}>
              <div className={`pace-fill ${paceInfo.onTrack?"on-track":"over-pace"}`} style={{width:`${Math.min((spentToDate/budgetTotal)*100,100)}%`}}/>
              <span aria-hidden="true" title={t("pace.marker")} style={{position:"absolute",top:0,bottom:0,width:2,background:"var(--ink)",opacity:0.55,left:`${(paceInfo.daysPassed/paceInfo.totalDays)*100}%`}}/>
            </div>
          )}
          <div className="pace-sub">
            <span style={{fontSize:11,color:"var(--ink-3)"}}>{t("pace.dailyAvg",{amount:fmt(paceInfo.dailyAvg,currency)})}</span>
            <span style={{fontSize:11,color:paceInfo.onTrack===null?"var(--ink-3)":paceInfo.onTrack?"var(--pos)":"var(--neg)",fontWeight:600}}>
              {paceInfo.projectionReliable?t("pace.projected",{amount:fmt(paceInfo.projected,currency)}):t("pace.tooEarly")}
            </span>
          </div>
          {paceInfo.onTrack===null&&(
            <div style={{fontSize:10,color:"var(--ink-4)",marginTop:3,fontStyle:"italic"}}>{t("pace.setBudget")}</div>
          )}
          {paceInfo.onTrack===false&&paceInfo.diff>0&&(
            <div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>{t("pace.aboveToday",{amount:fmt(paceInfo.diff,currency)})}</div>
          )}
        </div>
      )}

      {/* LEVEL 7: Recent activity */}
      {recent.length>0?(
        <div className="section-enter section-enter-8">
          <div className="label-sm" style={{marginBottom:10}}>{t("home.recent")}</div>
          <GroupedTxns txns={recent} currency={currency} onView={onView} compact/>
        </div>
      ):(
        <div className="empty section-enter section-enter-8">
          <div className="empty-icon"><Icon name="list" size={30}/></div>
          <div className="empty-title">{t("home.emptyTitle")}</div>
          <div className="empty-body">{t("home.emptyBody")}</div>
          <button className="btn btn-primary btn-full" style={{maxWidth:220,marginTop:4}} onClick={onAdd}>{t("home.emptyBtn")}</button>
        </div>
      )}
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
  const displayName=txn.merchant||txn.note||catName(txn.category);
  const displaySub=[
    txn.merchant&&txn.note?txn.note:null,
    catName(txn.category),
    subName(txn.subcategory)||null,
    !compact?fmtDate(txn.date):null,
  ].filter(Boolean).join(" · ");
  return (
    <div className="txn-row" onClick={()=>onView?.(txn)}>
      <div className="txn-ico" style={{background:(cat?.color||"#8A8A8A")+"18"}}><CatIcon catId={txn.category} size={16} color={cat?.color}/></div>
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
    if (dateFrom)           list=list.filter(x=>x.date>=dateFrom);
    if (dateTo)             list=list.filter(x=>x.date<=dateTo);
    return list;
  },[transactions,search,typeFilter,catFilter,dateFrom,dateTo,locale()]);

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
      <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"baseline",marginBottom:14,gap:8}}>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,margin:0}}>{t("nav.ledger")}</h1>
        <span style={{fontSize:11,color:"var(--ink-3)"}}>{t("ledger.countOf",{shown:filtered.length,total:transactions.length})}</span>
      </div>
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
        {(hasCatFilter||hasDateFilter||typeFilter!=="all")&&(
          <button className="chip on" style={{background:"var(--neg-bg)",borderColor:"var(--neg-bg)",color:"var(--neg)"}}
            onClick={()=>{setCatFilter("all");setDateFrom("");setDateTo("");setTypeFilter("all");}}>{t("ledger.clear")} ×</button>
        )}
      </div>
      {showDates&&(
        <div className="date-inputs">
          <label className="date-input-wrap"><span className="date-lbl">{t("ledger.from")}</span><input type="date" lang={locale()} className="date-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label>
          <label className="date-input-wrap"><span className="date-lbl">{t("ledger.to")}</span><input type="date" lang={locale()} className="date-input" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label>
        </div>
      )}
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
            {[{id:"all",color:"#8A8A8A"},...usedCats].map(cat=>(
              <button key={cat.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",background:"none",border:"none",borderBottom:"1px solid var(--rule)",cursor:"pointer",width:"100%",textAlign:"left",font:"inherit"}}
                onClick={()=>{setCatFilter(cat.id==="all"?"all":cat.id);setShowCatSheet(false);}}>
                <div style={{width:34,height:34,borderRadius:8,background:(cat.color||"#8A8A8A")+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
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

// ─── Analytics Page ───────────────────────────────────────────────────────────
function AnalyticsPage({ transactions, currency, budgets }) {
  const now=curMon(),prv=prevMon();
  const {curExp,curInc,prevExp,momDiff,plannedExp,plannedInc}=calcMonthSummary(transactions,now,prv);
  const catSpend   =calcCategorySpend(transactions,now);
  const budgetTotal=Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const paceInfo   =calcSpendingPace(calcSpentToDate(transactions,now),now,budgetTotal);
  const txnStats   =calcTxnStats(transactions,now);
  const perDay     =calcWeekdayWeekend(transactions,now);
  const budgetItems=calcBudgetStatus(budgets||{},catSpend,now);
  const wc         =calcWhatChanged(transactions,now,prv);
  const lc=locale();
  const patternsData=useMemo(()=>calcPatterns(transactions,currency),[transactions,currency,lc]);   // insight text follows the language
  const patterns    =patternsData.insights;
  const anomalies   =patternsData.anomalies;
  const dayOfWeek   =patternsData.dayOfWeek;
  const correlations=patternsData.correlations;
  const expenses   =transactions.filter(t=>t.type==="expense");
  const [activeBar,  setActiveBar]  = useState(null);
  const [activeCell, setActiveCell] = useState(null);
  // Weekday names from the catalog (i = 0 is Monday); the browser's own data lacks Azerbaijani.
  const WEEKDAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const wdName=(i,style)=>t(style==="long"?"dow."+WEEKDAYS[i]:style==="short"?"wdShort."+WEEKDAYS[i]:"wdNarrow."+WEEKDAYS[i]);

  const catData=Object.entries(catSpend).map(([id,amt])=>({...CAT(id)||{id,name:id,color:"#8A8A8A"},amt})).sort((a,b)=>b.amt-a.amt);
  const maxCat=catData[0]?.amt||1;
  const topExpenses=expenses.filter(happenedIn(now)).sort((a,b)=>b.amount-a.amount).slice(0,5);   // spent so far, not entries dated later
  const months6=Array.from({length:6},(_,i)=>nMon(5-i));
  const monthlyData=months6.map(m=>({label:monthShort(m),exp:expenses.filter(happenedIn(m)).reduce((s,t)=>s+t.amount,0),isCur:m===now,ym:m}));
  const maxMonth=Math.max(...monthlyData.map(m=>m.exp),1);
  const monthAvg=monthlyData.filter(m=>!m.isCur&&m.exp>0).reduce((s,m,_,a)=>s+m.exp/a.length,0);
  const daysInMon=daysInMonth(now);

  const DAY_LBLS=WEEKDAYS.map((_,i)=>wdName(i,"narrow"));
  const heatRows=[];
  const now_=new Date(),dow=now_.getDay(),toLastMon=dow===0?6:dow-1;
  const lastMon=new Date(now_); lastMon.setDate(now_.getDate()-toLastMon);
  for(let w=7;w>=0;w--) {
    const row=[];
    for(let d=0;d<7;d++){
      const dt=new Date(lastMon); dt.setDate(lastMon.getDate()-(w*7)+d);
      const ds=localDateStr(dt);
      const amt=expenses.filter(t=>t.date===ds).reduce((s,t)=>s+t.amount,0);
      const cats=expenses.filter(x=>x.date===ds).map(x=>catName(x.category)).filter((v,i,a)=>a.indexOf(v)===i).join(", ");
      row.push({date:ds,amt,cats,isToday:ds===today()});
    }
    heatRows.push(row);
  }
  const maxHeat=Math.max(...heatRows.flat().map(c=>c.amt),1);

  if (expenses.length===0) return (
    <div className="empty">
      <div className="empty-icon"><Icon name="chart" size={30}/></div>
      <div className="empty-title">{t("an.emptyTitle")}</div>
      <div className="empty-body">{t("an.emptyBody")}</div>
    </div>
  );

  return (
    <div onClick={()=>{setActiveBar(null);setActiveCell(null);}}>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,margin:"0 0 18px"}}>{t("nav.analytics")}</h1>

      {/* Monthly summary */}
      <div className="a-card">
        <div className="a-card-title">{monthName(now)}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,9.2vw,36px)",fontWeight:900,letterSpacing:-1.5,marginBottom:4}}>{fmt(curExp,currency)}</div>
        <div style={{fontSize:12,color:"var(--ink-3)",marginBottom:momDiff!==null?8:0}}>{t("an.totalSpent")}</div>
        <PlannedNote plannedExp={plannedExp} plannedInc={plannedInc} currency={currency} style={{marginBottom:8}}/>
        {momDiff!==null&&(
          <div style={{display:"flex",alignItems:"center",gap:7,fontSize:12,flexWrap:"wrap"}}>
            <span className={`mom-badge ${momDiff<=0?"better":"worse"}`}>
              <Icon name={momDiff<=0?"arrowDown":"arrowUp"} size={10}/>
              {t(momDiff<=0?"home.momLess":"home.momMore",{ amount:fmt(Math.abs(momDiff),currency), month:monthShort(prv) })}
            </span>
            {prevExp>0&&<span style={{color:"var(--ink-3)"}}>({t("an.lastMonth",{amount:fmt(prevExp,currency)})})</span>}
          </div>
        )}
        {paceInfo.dailyAvg>0&&(
          <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--rule)",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"4px 12px",fontSize:12}}>
            <span style={{color:"var(--ink-3)"}}>{t("an.dailyAvg")} <strong style={{fontFamily:"'Playfair Display',serif",color:"var(--ink)"}}>{fmt(paceInfo.dailyAvg,currency)}</strong></span>
            <span style={{color:"var(--ink-3)"}}>{t("an.projected")} <strong style={{fontFamily:"'Playfair Display',serif",color:paceInfo.projected>prevExp+20?"var(--neg)":"var(--ink)"}}>{fmt(paceInfo.projected,currency)}</strong></span>
          </div>
        )}
        {curInc>0&&<div style={{marginTop:6,fontSize:12,color:"var(--ink-3)"}}>{t("an.rate."+surplusLabel(curInc,curExp))} <strong style={{fontFamily:"'Playfair Display',serif",color:surplusColor(curInc,curExp)}}>{Math.round(((curInc-curExp)/curInc)*100)}%</strong></div>}
      </div>

      {/* S3: What Changed — with merchant-level explanation */}
      {(wc.totalDiff!==0||wc.catChanges.length>0)&&prevExp>0&&(
        <div className="a-card">
          <div className="a-card-title">{t("wc.title",{month:monthShort(prv)})}</div>
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
                          {m.merchant}
                          {/* Fix 3: recurring vs one-off label */}
                          <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,
                            background:m.isRecurring?"var(--warn-bg)":"var(--bg-inset)",
                            color:m.isRecurring?"var(--warn)":"var(--ink-4)"}}>
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

      {/* Transaction stats */}
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

      {/* S5: Financial patterns — insights */}
      {patterns.length>0&&(
        <div className="a-card">
          <div className="a-card-title">{t("an.patterns")}</div>
          {patterns.map(p=>(
            <div key={p.id} className="pattern-item">
              <Icon name="pattern" size={14} color="var(--ink-3)"/>
              <span>{p.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* S5: Day of week breakdown */}
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
                <div style={{minWidth:60,textAlign:"right",fontSize:11,fontFamily:"'Playfair Display',serif",fontWeight:600,color:"var(--ink)",flexShrink:0,whiteSpace:"nowrap"}}>{fmt(d.median,currency)}</div>
                <div style={{width:24,textAlign:"right",fontSize:10,color:"var(--ink-4)",flexShrink:0}}>{d.count}×</div>
              </div>
            );
          })}
        </div>
      )}

      {/* S5: Anomalies */}
      {anomalies.length>0&&(
        <div className="a-card">
          <div className="a-card-title">{t("an.unusual")}</div>
          {anomalies.slice(0,5).map((a,i)=>{
            const cat=CAT(a.category)||{color:"#8A8A8A"};
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<Math.min(anomalies.length,5)-1?"1px solid var(--rule)":"none"}}>
                <div style={{width:30,height:30,borderRadius:7,background:(cat.color)+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <CatIcon catId={a.category} size={14} color={cat.color}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{a.merchant||catName(a.category)}</div>
                  <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmtDate(a.date)} · {a.reason}</div>
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:"var(--neg)",flexShrink:0}}>−{fmt(a.amount,currency)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* S5: Same-day category patterns */}
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
              <div style={{fontSize:11,color:"var(--ink-3)",flexShrink:0}}>{t("an.ofDays",{pct:Math.round(c.correlation*100)})}</div>
            </div>
          ))}
        </div>
      )}

      {/* Budget insights */}
      {budgetItems.length>0&&(
        <div className="a-card">
          <div className="a-card-title">{t("an.budgetStatus",{month:monthName(now)})}</div>
          {budgetItems.map(({catId,limit,spent,pct,over,warn,aheadOfPace,daysLeft})=>{
            const cat=CAT(catId);
            return (
              <div key={catId} style={{marginBottom:13,paddingBottom:13,borderBottom:"1px solid var(--rule)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6,minWidth:0}}><CatIcon catId={catId} size={13}/>{catName(catId)}</div>
                  <div style={{fontSize:11,color:over?"var(--neg)":warn?"var(--warn)":"var(--ink-3)",fontWeight:600,flexShrink:0}}>{t("an.pctUsed",{pct:Math.round(pct)})}</div>
                </div>
                <div style={{height:3,background:"var(--rule)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",width:`${pct}%`,background:over?"var(--neg)":warn?"var(--warn)":(cat?.color||"var(--ink-3)"),borderRadius:99}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:over?"var(--neg)":warn?"var(--warn)":"var(--ink-3)",fontWeight:over||warn?600:400}}>
                    {over?t("budgets.over",{amount:fmt(spent-limit,currency)}):t("budgets.remaining",{amount:fmt(limit-spent,currency)})}
                  </span>
                  <span style={{color:"var(--ink-4)",flexShrink:0}}>{over?t("an.exceeded"):t("an.daysLeft",{n:daysLeft})}</span>
                </div>
                {aheadOfPace&&!over&&<div style={{fontSize:10,color:"var(--warn)",fontWeight:600,marginTop:2}}>{t("an.aheadOfPace")}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Category breakdown */}
      {catData.length>0&&(
        <div className="a-card">
          <div className="a-card-title">{t("an.byCategory")}</div>
          {catData.map((cat,i)=>(
            <div key={i} className="cat-bar">
              <div className="cat-bar-name"><CatIcon catId={cat.id} size={13} color={cat.color}/>{catName(cat.id)}</div>
              <div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(cat.amt/maxCat)*100}%`,background:cat.color}}/></div>
              <div className="cat-bar-amt">{fmt(cat.amt,currency)}</div>
              <div className="cat-bar-pct">{Math.round((cat.amt/curExp)*100)}%</div>
            </div>
          ))}
        </div>
      )}

      {/* Top expenses */}
      {topExpenses.length>0&&(
        <div className="a-card">
          <div className="a-card-title">{t("an.topExpenses")}</div>
          {topExpenses.map((x,i)=>{
            const cat=CAT(x.category)||{color:"#8A8A8A"};
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<topExpenses.length-1?"1px solid var(--rule)":"none"}}>
                <div style={{width:32,height:32,borderRadius:7,background:(cat.color)+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <CatIcon catId={x.category} size={15} color={cat.color}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.merchant||x.note||catName(x.category)}</div>
                  <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmtDate(x.date)} · {catName(x.category)}{x.subcategory?` / ${subName(x.subcategory)}`:""}</div>
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,flexShrink:0}}>−{fmt(x.amount,currency)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6-month chart — tap interaction */}
      <div className="a-card">
        <div className="a-card-title">{t("an.sixMonth")}</div>
        {monthAvg>0&&<div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10}}>{t("an.sixMonthAvg")} <strong style={{fontFamily:"'Playfair Display',serif",color:"var(--ink)"}}>{fmt(monthAvg,currency)}</strong></div>}
        {activeBar!==null&&monthlyData[activeBar]&&(
          <div style={{background:"var(--ink)",color:"var(--bg)",borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:600,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
            <span>{monthName(monthlyData[activeBar].ym)}</span>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:14}}>{fmt(monthlyData[activeBar].exp,currency)}</span>
          </div>
        )}
        <div className="month-bars">
          {monthlyData.map((m,i)=>(
            <div key={i} className="m-col" onClick={e=>{e.stopPropagation();setActiveBar(activeBar===i?null:i);setActiveCell(null);}}>
              <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end"}}>
                <div className="m-bar" style={{height:m.exp>0?`${Math.max(5,(m.exp/maxMonth)*100)}%`:"3px",background:activeBar===i?"var(--accent-mid)":m.isCur?"var(--accent)":"var(--ink-4)",width:"100%",outline:activeBar===i?"2px solid var(--accent)":"none",outlineOffset:"1px"}}/>
              </div>
              <div className="m-lbl" style={{color:activeBar===i?"var(--accent-mid)":m.isCur?"var(--accent)":"var(--ink-4)",fontWeight:m.isCur||activeBar===i?700:600}}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap — tap interaction */}
      <div className="a-card">
        <div className="a-card-title">{t("an.weekly")}</div>
        {activeCell!==null&&(()=>{
          const cell=heatRows[activeCell.wi]?.[activeCell.di];
          if(!cell) return null;
          return (
            <div style={{background:"var(--ink)",color:"var(--bg)",borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:600,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:cell.cats?3:0}}>
                <span>{fmtDate(cell.date)}</span>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:14}}>{cell.amt>0?fmt(cell.amt,currency):t("an.noSpending")}</span>
              </div>
              {cell.cats&&<div style={{fontSize:10,color:"rgba(247,244,238,0.7)"}}>{cell.cats}</div>}
            </div>
          );
        })()}
        <div className="heatmap" onClick={e=>e.stopPropagation()}>
          <div className="hm-corner"/>
          {DAY_LBLS.map((d,i)=><div key={i} className="hm-day-hdr">{d}</div>)}
          {heatRows.map((row,wi)=>(
            <>
              <div key={`w${wi}`} className="hm-wk-lbl">{wi===7?<span style={{color:"var(--accent)",fontWeight:700,fontSize:7}}>{t("an.now")}</span>:""}</div>
              {row.map((cell,di)=>{
                const intensity=cell.amt>0?Math.max(0.1,(cell.amt/maxHeat)*0.9):0;
                const isActive=activeCell?.wi===wi&&activeCell?.di===di;
                return (
                  <div key={`${wi}-${di}`} className="hm-cell"
                    onClick={e=>{e.stopPropagation();setActiveCell(isActive?null:{wi,di});setActiveBar(null);}}
                    style={{background:cell.amt>0?`rgba(107,31,42,${intensity})`:"var(--bg-inset)",outline:isActive?"2px solid var(--ink)":cell.isToday?"1.5px solid var(--ink-3)":"none",outlineOffset:"1px"}}
                  />
                );
              })}
            </>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,justifyContent:"flex-end"}}>
          <span style={{fontSize:9,color:"var(--ink-4)"}}>{t("an.less")}</span>
          {[0.1,0.3,0.6,0.9].map(o=><div key={o} style={{width:10,height:10,borderRadius:2,background:`rgba(107,31,42,${o})`}}/>)}
          <span style={{fontSize:9,color:"var(--ink-4)"}}>{t("an.moreTap")}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Recurring Hub ────────────────────────────────────────────────────────────
function RecurringHub({ transactions, currency, onView, onToggleSchedule }) {
  const schedules=useMemo(()=>{
    const nowD=new Date();
    return buildSchedules(transactions).map(x=>{
      const st=x.isActive ? scheduleMonthStatus(x,transactions,localMonthStr(nowD),nowD) : null;
      return { ...x, nextDue:scheduleNextDue(x,transactions,nowD), monthly:scheduleMonthly(x), unrecordedThisMonth:st?st.overdue.length:0 };
    }).sort((a,b)=>{ if (a.isActive!==b.isActive) return a.isActive?-1:1; return (a.nextDue?a.nextDue.getTime():Infinity)-(b.nextDue?b.nextDue.getTime():Infinity); });
  },[transactions]);
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
    const cat=CAT(x.category)||{id:"other",color:"#8A8A8A"};
    const isInc=x.type==="income";
    const near=x.nextDue && daysBetween(nowD,x.nextDue)<=3;
    return (
      // A paused schedule is marked by its "Paused" text and a faded icon; its text keeps full contrast (fading the whole row
      // made it 2.2–3.9:1, including the Reactivate button the user needs).
      <div style={{display:"flex",alignItems:"center",gap:11,padding:"12px 14px",borderBottom:"1px solid var(--rule)"}}>
        <div onClick={()=>onView?.(x.latest)} style={{width:36,height:36,borderRadius:9,background:(cat.color)+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",opacity:x.isActive?1:0.5}}>
          <CatIcon catId={cat.id} size={16} color={cat.color}/>
        </div>
        <div onClick={()=>onView?.(x.latest)} style={{flex:1,minWidth:0,cursor:"pointer"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",overflowWrap:"anywhere"}}>{x.merchant||x.note||catName(x.category)}</div>
          <div style={{fontSize:11,color:"var(--ink-3)",marginTop:1,lineHeight:1.4}}>
            {catName(x.category)}{x.subcategory?` / ${subName(x.subcategory)}`:""} · {t("freq."+x.freq)} · {tn("rec.paymentsRecorded",x.occurrences.length)}
          </div>
          <div style={{fontSize:11,marginTop:1,color:near&&x.isActive?"var(--warn)":"var(--ink-4)",fontWeight:near&&x.isActive?700:400}}>
            {x.isActive?dueText(x):t("rec.paused")} · {t("rec.last",{date:fmtDate(x.occurrences[x.occurrences.length-1])})}
            {x.unrecordedThisMonth>0&&<span style={{color:"var(--warn)",fontWeight:700}}> · {tn("rec.notRecorded",x.unrecordedThisMonth)}</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:600,color:isInc?"var(--pos)":"var(--ink)"}}>{isInc?"+":"−"}{fmt(x.amount,currency)}</div>
          {x.freq!=="monthly"&&x.isActive&&<div style={{fontSize:10,color:"var(--ink-4)",fontStyle:"italic"}}>{t("rec.perMonthApprox",{amount:fmt(x.monthly,currency)})}</div>}
          <button onClick={e=>{e.stopPropagation();onToggleSchedule(x.memberIds,!x.isActive);}} style={{fontSize:11,fontWeight:700,color:x.isActive?"var(--warn)":"var(--pos)",background:"none",border:"none",cursor:"pointer",padding:"8px 0",minHeight:36,fontFamily:"'DM Sans',sans-serif",textDecoration:"underline",textUnderlineOffset:2}}>
            {x.isActive?t("rec.pause"):t("rec.reactivate")}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,margin:"0 0 6px"}}>{t("rec.title")}</h1>
      <div style={{fontSize:11,color:"var(--ink-4)",fontStyle:"italic",marginBottom:14,lineHeight:1.5}}>{t("rec.intro")}</div>
      <div className="stat-row">
        <div className="stat-cell"><div className="stat-val" style={{color:"var(--neg)"}}>{fmt(monthlyOut,currency)}</div><div className="stat-lbl">{t("rec.monthlyOut")}</div></div>
        <div className="stat-cell"><div className="stat-val">{fmt(monthlyOut*12,currency)}</div><div className="stat-lbl">{t("rec.yearly")}</div></div>
        {monthlyIn>0&&<div className="stat-cell"><div className="stat-val" style={{color:"var(--pos)"}}>{fmt(monthlyIn,currency)}</div><div className="stat-lbl">{t("rec.monthlyIn")}</div></div>}
        <div className="stat-cell"><div className="stat-val">{active.length}</div><div className="stat-lbl">{t("rec.activeSchedules")}</div></div>
      </div>
      {upcoming.length>0&&(
        <div style={{background:"var(--warn-bg)",border:"1px solid #D4A82A",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--warn)",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <Icon name="calendar" size={12} color="var(--warn)"/>{t("home.dueWithin7")}
          </div>
          {upcoming.map(x=>(
            <div key={x.key} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(212,168,42,0.2)"}}>
              <span style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{x.merchant||x.note||catName(x.category)}</span>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:"var(--neg)"}}>{fmt(x.amount,currency)}</div>
                <div style={{fontSize:10,color:"var(--warn)",fontWeight:700}}>{dueText(x)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {active.length>0&&(<>
        <div className="label-sm" style={{marginBottom:8}}>{t("rec.active")}</div>
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
              const cat=CAT(catId)||{id:"other",color:"#8A8A8A"};
              return (<div key={catId} className="cat-bar"><div className="cat-bar-name"><CatIcon catId={cat.id} size={12} color={cat.color}/>{catName(catId)}</div><div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(mo/maxV)*100}%`,background:cat.color}}/></div><div className="cat-bar-amt">{fmt(mo*12,currency)}</div></div>);
            });
          })()}
        </div>
      )}
    </div>
  );
}

function AddEditOverlay({ templates, currency, transactions, prefill, editId, merchantMemory, onSave, onClose }) {
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
  const [err,      setErr]      = useState("");
  const [showMerchantSugs, setShowMerchantSugs] = useState(false);
  const amtRef=useRef();

  // Unsaved-input guard: every close route (×, Cancel, Escape, phone Back) goes through requestClose. When something was
  // entered it asks first; an untouched form closes at once. Switching Expense/Income alone is not input: the category then
  // changes to that type's default by itself, so the category only counts as changed when it differs from that default.
  const initial=useRef({ type, amount, catId, subcat, merchant, note, date, recur, freq }).current;
  const [askDiscard, setAskDiscard] = useState(false);
  const defaultCat=type===initial.type ? initial.catId : (type==="income"?"salary":"food");
  const dirty=amount!==initial.amount || subcat!==initial.subcat || merchant!==initial.merchant || note!==initial.note ||
    date!==initial.date || recur!==initial.recur || (recur && freq!==initial.freq) || catId!==defaultCat;
  const requestClose=()=>{ if (dirty) setAskDiscard(true); else onClose(); };

  const expCats=CATEGORIES.filter(c=>!c.income);
  const incCats=CATEGORIES.filter(c=>c.income);
  const displayCats=type==="income"?incCats:expCats;
  const selectedCat=CAT(catId);

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
    const amt=parseMoney(amount,{positive:true});
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

  const submit=()=>{
    const amt=parseMoney(amount,{positive:true});
    if (amt===null) { setErr(t("add.errAmount")); return; }
    if (!isValidDateStr(String(date||""))) { setErr(t("add.errDate")); return; }
    // S0: Preserve isActive when editing — never silently reactivate a paused recurring
    const isActive=isEditing?(prefill?.isActive!==undefined?prefill.isActive:true):true;
    onSave({type,amount:amt,category:catId,subcategory:subcat,merchant:merchant.trim(),note:note.trim(),date,recurring:recur,recurFreq:recur?freq:null,isActive});
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
      <div className="add-body">
        <div className="type-toggle">
          <button className={`type-btn${type==="expense"?" active":""}`} aria-pressed={type==="expense"} onClick={()=>setType("expense")}>{t("add.expense")}</button>
          <button className={`type-btn${type==="income"?" active":""}`} aria-pressed={type==="income"} onClick={()=>setType("income")}>{t("add.income")}</button>
        </div>
        <div className="amount-zone">
          <div className="amount-line">
            <input ref={amtRef} className="amount-input" type="number" inputMode="decimal"
              placeholder="0.00" value={amount} onChange={e=>{setAmount(e.target.value);setErr("");}}
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

        <div className="field merchant-wrap">
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
          {selectedCat?.subs?.length>0&&(
            <>
              <div className="field-lbl" style={{marginBottom:5,marginTop:4}}>{t("add.subcategory")} {optional}</div>
              <div className="sub-strip">
                {selectedCat.subs.map(s=>(
                  <button key={s} className={`sub-chip${subcat===s?" sel":""}`} aria-pressed={subcat===s} onClick={()=>setSubcat(subcat===s?"":s)}>{subName(s)}</button>
                ))}
              </div>
            </>
          )}
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
          </div>
          <div className="field" style={{marginBottom:0}}>
            <div className="field-lbl" id="txn-rec-lbl">{t("add.recurring")}</div>
            <div style={{display:"flex",alignItems:"center",gap:9,marginTop:9}}>
              <div className={`toggle-track${recur?" on":""}`} onClick={()=>setRecur(r=>!r)} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); setRecur(r=>!r); } }} role="switch" aria-checked={recur} aria-label={t("add.recurring")} tabIndex={0}>
                <div className="toggle-knob"/>
              </div>
              {recur&&(
                <select className="field-select" value={freq} onChange={e=>setFreq(e.target.value)} aria-label={t("add.frequency")}
                  style={{fontSize:12,color:"var(--ink)",background:"transparent",border:"none",outline:"none",cursor:"pointer"}}>
                  {["weekly","biweekly","monthly","yearly"].map(f=><option key={f} value={f}>{t("freqCap."+f)}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-full" onClick={submit}>
          {isEditing?t("add.saveChanges"):t(type==="income"?"add.recordIncome":"add.recordExpense")}
        </button>
        <button className="btn btn-ghost btn-full" onClick={requestClose}>{t("common.cancel")}</button>
      </div>
      {askDiscard&&(
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
function TxnDetailSheet({ txn, currency, transactions, onClose, onEdit, onDuplicate, onDelete }) {
  const cat=CAT(txn.category)||{id:"other",name:txn.category,color:"#8A8A8A"};
  const isInc=txn.type==="income";
  const profile=useMemo(()=>txn.merchant?calcMerchantProfile(txn.merchant,transactions):null,[txn.merchant,transactions]);

  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1}aria-label={txn.merchant||txn.note||catName(txn.category)}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:12,background:(cat.color)+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <CatIcon catId={cat.id} size={22} color={cat.color}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,marginBottom:2,lineHeight:1.25,overflowWrap:"anywhere"}}>{txn.merchant||txn.note||catName(txn.category)}</div>
            <div style={{fontSize:12,color:"var(--ink-3)"}}>{catName(txn.category)}{txn.subcategory?` / ${subName(txn.subcategory)}`:""} · {fmtDate(txn.date)}</div>
          </div>
          <button onClick={onClose} aria-label={t("common.close")} style={{background:"none",border:"1px solid var(--rule)",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-3)",flexShrink:0}}><Icon name="close" size={13}/></button>
        </div>

        {/* Amount */}
        <div style={{textAlign:"center",padding:"14px 0 16px",borderTop:"1px solid var(--rule)",borderBottom:"1px solid var(--rule)",marginBottom:16}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(32px,11vw,44px)",fontWeight:900,letterSpacing:-2,overflowWrap:"anywhere",color:isInc?"var(--pos)":"var(--ink)"}}>{isInc?"+":"−"}{fmt(txn.amount,currency)}</div>
          <div style={{fontSize:12,color:"var(--ink-3)",marginTop:3}}>{t(txn.type==="income"?"add.income":"add.expense")}</div>
        </div>

        {/* Meta */}
        <div className="detail-meta" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[
            [t("add.date"),      fmtDate(txn.date)],
            [t("add.merchant"),  txn.merchant||"—"],
            [t("add.category"),  catName(txn.category)+(txn.subcategory?` / ${subName(txn.subcategory)}`:"")],
            [t("add.recurring"), txn.recurring?(txn.recurFreq?t("freqCap."+txn.recurFreq):t("common.yes")):t("common.no")],
          ].map(([lbl,val])=>(
            <div key={lbl} style={{background:"var(--bg-warm)",borderRadius:7,padding:"10px 12px"}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--ink-4)",marginBottom:3}}>{lbl}</div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",lineHeight:1.3,overflowWrap:"anywhere"}}>{val}</div>
            </div>
          ))}
        </div>

        {txn.note&&<div style={{fontSize:13,color:"var(--ink-2)",background:"var(--bg-warm)",borderRadius:7,padding:"10px 12px",marginBottom:16}}>{txn.note}</div>}

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
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700}}>{profile.count}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:"var(--ink-4)"}}>{t("mp.visits")}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700}}>{fmt(profile.avg,currency)}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:"var(--ink-4)"}}>{t("mp.avgSpend")}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700}}>{fmt(profile.total,currency)}</div>
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
        <button className="btn btn-ghost btn-full" style={{color:"var(--neg)",borderColor:"var(--neg-bg)",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:0}} onClick={onDelete}><Icon name="trash" size={14}/>{t("common.delete")}</button>
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{marginTop:6}}>{t("common.close")}</button>
      </div>
    </div>
  );
}

// ─── Settings Sheet ───────────────────────────────────────────────────────────
function SettingsSheet({ state, onLanguageChange, onExportCSV, onExportJSON, onImportFile, onSetBudget, onCurrencyChange,
  onAddTemplate, onDeleteTemplate, onAddGoal, onUpdateGoal, onDeleteGoal, onSafeToSpendChange, onClose, showToast }) {
  const { transactions,budgets,templates,currency,goals=[],safeToSpend={} }=state;
  const [curSym,      setCurSym]      = useState(currency);
  const [editBudget,  setEditBudget]  = useState(null);
  const [budgetVal,   setBudgetVal]   = useState("");
  const [showNewTpl,  setShowNewTpl]  = useState(false);
  const [tplName,     setTplName]     = useState("");
  const [tplAmt,      setTplAmt]      = useState("");
  const [tplCatId,    setTplCatId]    = useState("food");
  const [tplSubcat,   setTplSubcat]   = useState("");
  const [tplMerchant, setTplMerchant] = useState("");
  const [tplNote,     setTplNote]     = useState("");
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [goalName,    setGoalName]    = useState("");
  const [goalTarget,  setGoalTarget]  = useState("");
  const [goalSaved,   setGoalSaved]   = useState("");
  const [goalMonthly, setGoalMonthly] = useState("");
  const [goalDate,    setGoalDate]    = useState("");
  const [savingsT,    setSavingsT]    = useState(String(safeToSpend.savingsTarget||0));
  const fileRef=useRef();

  const totalInc=transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExp=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const expCats=CATEGORIES.filter(c=>!c.income);

  const saveTpl=()=>{
    const tAmt=parseMoney(tplAmt,{positive:true});
    if (!tplName.trim()||tAmt===null) { showToast(t("set.tplInvalid")); return; }
    onAddTemplate({name:tplName.trim(),amount:tAmt,catId:tplCatId,subcat:tplSubcat,merchant:tplMerchant.trim(),note:tplNote.trim()});
    setTplName("");setTplAmt("");setTplSubcat("");setTplMerchant("");setTplNote("");setShowNewTpl(false);
  };

  const saveGoal=()=>{
    const gTarget=parseMoney(goalTarget,{positive:true});
    const gSaved=goalSaved.trim()===""?0:parseMoney(goalSaved);
    const gMonthly=goalMonthly.trim()===""?0:parseMoney(goalMonthly);
    if (!goalName.trim()||gTarget===null) { showToast(t("set.goalInvalidTarget")); return; }
    if (gSaved===null||gMonthly===null) { showToast(t("set.goalInvalidAmounts")); return; }
    if (goalDate && !isValidDateStr(goalDate)) { showToast(t("set.goalInvalidDate")); return; }
    onAddGoal({name:goalName.trim(),target:gTarget,saved:gSaved,monthlyTarget:gMonthly,targetDate:goalDate||null});
    setGoalName("");setGoalTarget("");setGoalSaved("");setGoalMonthly("");setGoalDate("");setShowNewGoal(false);
  };

  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1}aria-label={t("nav.settings")}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div className="sheet-title">{t("nav.settings")}</div>

        {/* Language — changes only the interface text; data, currency and open forms are untouched */}
        <div className="settings-section-lbl" id="set-lang-lbl">{t("lang.setting")}</div>
        <div className="settings-row" style={{flexDirection:"column",alignItems:"flex-start",gap:8}}>
          <fieldset className="lang-switch" aria-labelledby="set-lang-lbl">
            {LANGS.map(l=>(
              <label key={l} className={`lang-pill${state.language===l?" sel":""}`} lang={l}>
                <input type="radio" name="settings-language" value={l} checked={state.language===l} onChange={()=>onLanguageChange(l)}/>
                {LANG_NAMES[l]}
              </label>
            ))}
          </fieldset>
          <div className="settings-row-sub">{t("lang.settingSub")}</div>
        </div>

        {/* Overview */}
        <div className="settings-section-lbl" style={{marginTop:14}}>{t("set.overview")}</div>
        <div style={{background:"var(--bg-warm)",borderRadius:7,padding:"10px 13px",marginBottom:4}}>
          {[[t("set.totalIncome"),fmt(totalInc,currency),"var(--pos)"],[t("set.totalExpenses"),fmt(totalExp,currency),"var(--neg)"],[t("set.net"),fmt(Math.abs(totalInc-totalExp),currency),totalInc>=totalExp?"var(--pos)":"var(--neg)"],[t("an.transactions"),String(transactions.length),"var(--ink)"]].map(([lbl,val,col])=>(
            <div key={lbl} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"5px 0",borderBottom:"1px solid var(--rule)"}}>
              <span style={{fontSize:12,color:"var(--ink-3)"}}>{lbl}</span>
              <span style={{fontSize:13,fontWeight:700,color:col,fontFamily:"'Playfair Display',serif",whiteSpace:"nowrap"}}>{val}</span>
            </div>
          ))}
        </div>

        {/* Safe to Spend */}
        <div className="settings-section-lbl" style={{marginTop:14}}>{t("safe.title")}</div>
        <div className="settings-row">
          <div><div className="settings-row-title" id="set-safe-lbl">{t("set.safeEnable")}</div><div className="settings-row-sub">{t("set.safeEnableSub")}</div></div>
          <div className={`toggle-track${safeToSpend.enabled?" on":""}`} onClick={()=>onSafeToSpendChange({enabled:!safeToSpend.enabled})} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); onSafeToSpendChange({enabled:!safeToSpend.enabled}); } }} role="switch" aria-checked={!!safeToSpend.enabled} aria-label={t("safe.title")} tabIndex={0}><div className="toggle-knob"/></div>
        </div>
        {safeToSpend.enabled&&(
          <div className="settings-row" style={{flexDirection:"column",alignItems:"flex-start",gap:8}}>
            <div>
              <div className="settings-row-title" id="set-floor-lbl">{t("set.floor")}</div>
              <div className="settings-row-sub">{t("set.floorSub")}</div>
            </div>
            <div style={{display:"flex",gap:8,width:"100%"}}>
              <input className="field-input" type="number" min="0" step="1" placeholder="0.00" value={savingsT} onChange={e=>setSavingsT(e.target.value)} aria-labelledby="set-floor-lbl" style={{flex:1,padding:"8px 10px",fontSize:13}}/>
              <button className="btn btn-sm btn-sm-primary" onClick={()=>{const v=savingsT.trim()===""?0:parseMoney(savingsT); if(v===null){showToast(t("set.zeroOrMore"));return;} onSafeToSpendChange({savingsTarget:v});showToast(t("set.saved"));}}>{t("common.save")}</button>
            </div>
          </div>
        )}

        {/* Currency */}
        <div className="settings-section-lbl" style={{marginTop:14}}>{t("set.preferences")}</div>
        <div className="settings-row">
          <div><div className="settings-row-title" id="set-cur-lbl">{t("set.currency")}</div><div className="settings-row-sub">{t("set.currencySub",{currency})}</div></div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <input className="field-input" value={curSym} onChange={e=>setCurSym(e.target.value)} maxLength={3} aria-labelledby="set-cur-lbl" style={{width:52,minHeight:38,textAlign:"center",padding:"7px 8px"}}/>
            <button className="btn btn-sm btn-sm-primary" onClick={()=>{if(!curSym.trim()){showToast(t("set.currencyEmpty"));return;} onCurrencyChange(curSym.trim());showToast(t("set.currencyUpdated"));}}>{t("common.save")}</button>
          </div>
        </div>

        {/* Templates */}
        <div style={{padding:"12px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--ink)"}}>{t("set.templates")}</span>
            <button className="btn btn-sm" onClick={()=>setShowNewTpl(s=>!s)}>{showNewTpl?t("common.cancel"):t("set.add")}</button>
          </div>
          {showNewTpl&&(
            <div style={{background:"var(--bg-warm)",borderRadius:7,padding:13,marginBottom:11}}>
              <div className="field-row" style={{marginBottom:10}}>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-name">{t("set.name")}</label><input id="tpl-name" className="field-input" placeholder={t("set.tplNamePh")} value={tplName} onChange={e=>setTplName(e.target.value)} autoFocus/></div>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-amt">{t("add.amount")}</label><input id="tpl-amt" className="field-input" type="number" min="0" step="0.01" placeholder="0.00" value={tplAmt} onChange={e=>setTplAmt(e.target.value)}/></div>
              </div>
              <div className="field-row" style={{marginBottom:10}}>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-cat">{t("add.category")}</label><select id="tpl-cat" className="field-input field-select" value={tplCatId} onChange={e=>setTplCatId(e.target.value)}>{expCats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}</option>)}</select></div>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-merchant">{t("add.merchant")}</label><input id="tpl-merchant" className="field-input" placeholder={t("set.optionalPh")} value={tplMerchant} onChange={e=>setTplMerchant(e.target.value)}/></div>
              </div>
              <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="tpl-note">{t("set.noteOptional")}</label><input id="tpl-note" className="field-input" placeholder={t("set.tplNotePh")} value={tplNote} onChange={e=>setTplNote(e.target.value)}/></div>
              <button className="btn btn-primary btn-full" style={{marginTop:0,padding:"10px"}} onClick={saveTpl}>{t("set.saveTemplate")}</button>
            </div>
          )}
          {templates.length===0&&!showNewTpl&&<div style={{fontSize:12,color:"var(--ink-3)",padding:"6px 0"}}>{t("set.noTemplates")}</div>}
          {templates.map(tpl=>(
            <div key={tpl.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid var(--rule)"}}>
              <CatIcon catId={tpl.catId} size={14}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{tpl.name}</div>
                <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmt(tpl.amount,currency)}{tpl.merchant?` · ${tpl.merchant}`:""} · {catName(tpl.catId)}</div>
              </div>
              <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>onDeleteTemplate(tpl.id)} aria-label={t("set.deleteTemplate",{name:tpl.name})}><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>

        {/* Budgets */}
        <div style={{marginTop:8}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--ink)",marginBottom:10}}>{t("set.budgets")}</div>
          {expCats.map((cat,i,arr)=>{
            const limit=budgets[cat.id]||0;
            return (
              <div key={cat.id} style={{padding:"9px 0",borderBottom:i<arr.length-1?"1px solid var(--rule)":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,minWidth:0}}><CatIcon catId={cat.id} size={13}/>{catName(cat.id)}</div>
                  <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
                    {limit>0&&<span style={{fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:600}}>{fmt(limit,currency)}</span>}
                    <button className="btn btn-sm" style={{fontSize:10,padding:"4px 9px"}} onClick={()=>{setEditBudget(cat.id);setBudgetVal(limit>0?String(limit):"");}} aria-label={`${limit>0?t("common.edit"):t("set.set")}: ${catName(cat.id)}`}>{limit>0?t("common.edit"):t("set.set")}</button>
                  </div>
                </div>
                {editBudget===cat.id&&(
                  <div style={{display:"flex",gap:7,marginTop:7}}>
                    <input className="field-input" type="number" min="0" step="1" placeholder={t("set.monthlyLimit")} aria-label={`${t("set.monthlyLimit")}: ${catName(cat.id)}`} value={budgetVal} onChange={e=>setBudgetVal(e.target.value)} autoFocus style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                    <button className="btn btn-sm btn-sm-primary" onClick={()=>{const v=budgetVal.trim()===""?0:parseMoney(budgetVal); if(v===null){showToast(t("set.zeroOrMore"));return;} onSetBudget(cat.id,v);setEditBudget(null);showToast(t("set.budgetSaved"));}}>{t("common.save")}</button>
                    <button className="btn btn-sm" onClick={()=>setEditBudget(null)} aria-label={t("common.cancel")}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* S1: Goals — with target date */}
        <div className="settings-section-lbl" style={{marginTop:14}}>{t("goals.title")}</div>
        <div style={{padding:"12px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--ink)"}}>{t("set.financialGoals")}</span>
            <button className="btn btn-sm" onClick={()=>setShowNewGoal(s=>!s)}>{showNewGoal?t("common.cancel"):t("set.add")}</button>
          </div>
          {showNewGoal&&(
            <div style={{background:"var(--bg-warm)",borderRadius:7,padding:13,marginBottom:11}}>
              <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="goal-name">{t("set.goalName")}</label><input id="goal-name" className="field-input" placeholder={t("set.goalNamePh")} value={goalName} onChange={e=>setGoalName(e.target.value)} autoFocus/></div>
              <div className="field-row" style={{marginBottom:10}}>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-target">{t("set.target",{currency})}</label><input id="goal-target" className="field-input" type="number" min="0" step="1" placeholder="0" value={goalTarget} onChange={e=>setGoalTarget(e.target.value)}/></div>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-saved">{t("set.savedSoFar")}</label><input id="goal-saved" className="field-input" type="number" min="0" step="1" placeholder="0" value={goalSaved} onChange={e=>setGoalSaved(e.target.value)}/></div>
              </div>
              <div className="field-row" style={{marginBottom:10}}>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-monthly">{t("set.monthlyContribution")}</label><input id="goal-monthly" className="field-input" type="number" min="0" step="1" placeholder={t("set.optionalPh")} value={goalMonthly} onChange={e=>setGoalMonthly(e.target.value)}/></div>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-date">{t("set.targetDate")}</label><input id="goal-date" className="field-input" lang={locale()} type="date" value={goalDate} onChange={e=>setGoalDate(e.target.value)}/></div>
              </div>
              <button className="btn btn-primary btn-full" style={{marginTop:0,padding:"10px"}} onClick={saveGoal}>{t("set.saveGoal")}</button>
            </div>
          )}
          {goals.length===0&&!showNewGoal&&<div style={{fontSize:12,color:"var(--ink-3)"}}>{t("set.noGoals")}</div>}
          {goals.map(goal=>{
            const gp=calcGoalProgress(goal); const {pct,remaining,estCompletion,whatIf,milestones}=gp;
            return (
              <div key={goal.id} style={{padding:"12px 0",borderBottom:"1px solid var(--rule)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--ink)"}}>{goal.name}</div>
                    {goal.targetDate&&gp.daysToTarget!==null&&(
                      <div style={{fontSize:11,color:gp.behindSchedule||gp.overdue?"var(--neg)":gp.onTrack?"var(--pos)":"var(--ink-3)",marginTop:2}}>
                        {gp.complete?t("goals.completed"):gp.overdue?tn("goals.overdueDays",-gp.daysToTarget):gp.daysToTarget===0?t("set.targetToday"):tn("set.daysToTarget",gp.daysToTarget)}
                        {gp.behindSchedule?t("set.projectedAfter"):gp.onTrack?t("set.onTrackSuffix"):""}
                      </div>
                    )}
                    {!goal.targetDate&&gp.complete&&<div style={{fontSize:11,color:"var(--pos)",marginTop:2}}>{t("goals.completed")}</div>}
                  </div>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    <button className="btn btn-sm" style={{fontSize:10,padding:"3px 8px"}} onClick={()=>{
                      const newSaved=prompt(t("set.updatePrompt",{name:goal.name}),goal.saved||0);
                      if (newSaved!==null) {
                        const v=parseMoney(newSaved);
                        if (v===null) showToast(t("set.updateInvalid"));
                        else onUpdateGoal(goal.id,{saved:v});
                      }
                    }}>{t("set.update")}</button>
                    <button className="topbar-btn" style={{color:"var(--ink-4)",width:26,height:26}} onClick={()=>onDeleteGoal(goal.id)} aria-label={t("set.deleteGoal",{name:goal.name})}><Icon name="trash" size={13}/></button>
                  </div>
                </div>
                <div className="goal-progress"><div className="goal-fill" style={{width:`${pct}%`}}/></div>
                <div className="goal-meta">
                  <span>{t("goals.savedOf",{ saved:fmt(goal.saved||0,currency), target:fmt(goal.target||0,currency) })}</span>
                  <span>{Math.round(pct)}%{remaining>0?` · ${t("goals.toGo",{amount:fmt(remaining,currency)})}`:""}</span>
                </div>
                {estCompletion&&<div style={{fontSize:11,color:"var(--ink-3)",marginTop:5}}>{t("set.atRate",{amount:fmt(goal.monthlyTarget||0,currency),date:estCompletion})}</div>}
                {/* Milestones */}
                {milestones&&(
                  <div className="goal-milestones" style={{marginTop:8,display:"flex",gap:6}}>
                    {milestones.map(m=>(
                      <div key={m.pct} style={{flex:1,textAlign:"center",padding:"4px 2px",borderRadius:5,
                        background:m.completed?"var(--pos-bg)":"var(--bg-inset)",
                        border:`1px solid ${m.completed?"var(--pos)":"var(--rule)"}`}}>
                        <div style={{fontSize:10,fontWeight:700,color:m.completed?"var(--pos)":"var(--ink-4)"}}>{m.pct}%</div>
                        <div style={{fontSize:9,color:m.completed?"var(--pos)":"var(--ink-4)"}}>
                          {m.completed?"✓":t("goals.toGo",{amount:fmt(m.amount-Math.min(goal.saved||0,m.amount),currency)})}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* S1: What-if scenarios */}
                {whatIf.length>1&&(
                  <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid var(--rule)"}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--ink-4)",marginBottom:6}}>{t("set.whatIf")}</div>
                    {whatIf.map((w,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11,color:"var(--ink-3)",padding:"2px 0"}}>
                        <span>{t("set.perMonth",{amount:fmt(w.monthly,currency)})}</span>
                        <span style={{color:i===1?"var(--ink)":"var(--ink-3)",fontWeight:i===1?600:400,textAlign:"right"}}>{tn("set.months",w.months)} · {w.completion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Data */}
        <div className="settings-section-lbl" style={{marginTop:14}}>{t("set.data")}</div>
        <div className="settings-row">
          <div><div className="settings-row-title">{t("set.exportCsv")}</div><div className="settings-row-sub">{t("set.exportCsvSub")}</div></div>
          <button className="btn btn-sm" onClick={onExportCSV} style={{display:"flex",alignItems:"center",gap:5}}><Icon name="download" size={12}/>{t("set.export")}</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-row-title">{t("set.jsonBackup")}</div><div className="settings-row-sub">{tn("set.jsonBackupSub",transactions.length)}</div></div>
          <button className="btn btn-sm btn-sm-primary" onClick={onExportJSON} style={{display:"flex",alignItems:"center",gap:5}}><Icon name="download" size={12}/>{t("set.backup")}</button>
        </div>
        <div className="settings-row" style={{flexDirection:"column",alignItems:"flex-start",gap:8}}>
          <div><div className="settings-row-title">{t("import.title")}</div><div className="settings-row-sub">{t("set.restoreSub")}</div></div>
          <div className="drop-zone" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onImportFile(e.dataTransfer.files[0]);}}>
            <input ref={fileRef} type="file" accept=".json,.csv" aria-label={t("import.title")} onChange={e=>{onImportFile(e.target.files[0]);e.target.value="";}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:12,color:"var(--ink-3)",fontWeight:600}}><Icon name="upload" size={13}/>{t("set.dropHint")}</div>
          </div>
        </div>
        {state.lastBackup?
          <div style={{fontSize:11,color:"var(--ink-3)",marginTop:8,lineHeight:1.5}}>
            <strong style={{color:"var(--ink-2)"}}>{t("set.lastBackup")}</strong> {fmtLongDate(state.lastBackup)}
            <div>{state.backupConfirmedAt && Date.parse(state.backupConfirmedAt)>=Date.parse(state.lastBackup)
              ? t("set.confirmedOn",{date:fmtLongDate(state.backupConfirmedAt)})
              : t("set.notConfirmed")}</div>
            <div style={{fontStyle:"italic",color:"var(--ink-4)"}}>{t("set.cantTell")}</div>
          </div>:
          <div style={{fontSize:11,color:"var(--neg)",fontWeight:600,marginTop:8}}>{t("set.noBackup")}</div>
        }
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{marginTop:18}}>{t("common.close")}</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY VIEW — browse any month, see full breakdown
// ─────────────────────────────────────────────────────────────────────────────
function MonthlyView({ transactions, currency, budgets, onView }) {
  const [selectedMon, setSelectedMon] = useState(curMon());

  const allMonths = useMemo(() => {
    const monSet = new Set(transactions.map(t => t.date.slice(0,7)));
    monSet.add(curMon());
    return [...monSet].sort((a,b) => b.localeCompare(a));
  }, [transactions]);

  const prevM = () => {
    const idx = allMonths.indexOf(selectedMon);
    if (idx < allMonths.length - 1) setSelectedMon(allMonths[idx + 1]);
  };
  const nextM = () => {
    const idx = allMonths.indexOf(selectedMon);
    if (idx > 0) setSelectedMon(allMonths[idx - 1]);
  };

  const prv = useMemo(() => {
    const d = new Date(selectedMon + "-02");
    d.setMonth(d.getMonth() - 1);
    return localMonthStr(d);
  }, [selectedMon]);

  const { curExp, curInc, prevExp, momDiff, plannedExp, plannedInc } = calcMonthSummary(transactions, selectedMon, prv);
  const catSpend    = calcCategorySpend(transactions, selectedMon);
  const budgetItems = calcBudgetStatus(budgets || {}, catSpend, selectedMon);
  const expenses    = transactions.filter(t => t.type === "expense");

  const catData = Object.entries(catSpend)
    .map(([id, amt]) => ({ ...CAT(id) || { id, name: id, color:"#8A8A8A" }, amt }))
    .sort((a,b) => b.amt - a.amt);
  const maxCat = catData[0]?.amt || 1;

  // Merchant breakdown for selected month
  const merchantTotals = {};
  transactions.filter(t => t.type==="expense" && happenedIn(selectedMon)(t) && t.merchant)
    .forEach(t => { merchantTotals[t.merchant] = (merchantTotals[t.merchant]||0) + t.amount; });
  const topMerchants = Object.entries(merchantTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);

  const monTxns = transactions.filter(t => t.date.startsWith(selectedMon));
  const isCurrentMon = selectedMon === curMon();

  return (
    <div>
      {/* Month selector */}
      <div className="month-selector">
        <button className="month-nav-btn" onClick={prevM} aria-label={t("month.prev")}>‹</button>
        <div style={{textAlign:"center"}}>
          <h1 className="month-name" style={{margin:0}}>{monthName(selectedMon)}</h1>
          {isCurrentMon && <div style={{fontSize:10,color:"var(--accent)",fontWeight:700,letterSpacing:"0.5px",marginTop:2,textTransform:"uppercase"}}>{t("month.current")}</div>}
        </div>
        <button className="month-nav-btn" onClick={nextM} disabled={selectedMon===allMonths[0]} aria-label={t("month.next")}
          style={{opacity:selectedMon===allMonths[0]?0.3:1}}>›</button>
      </div>

      {/* Summary stats */}
      <div className="month-stats" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        <div className="month-stat">
          <div className="month-stat-val" style={{color:"var(--neg)"}}>{fmt(curExp,currency)}</div>
          <div className="month-stat-lbl">{t("home.spent")}</div>
          {momDiff!==null&&<div style={{fontSize:11,color:momDiff<=0?"var(--pos)":"var(--neg)",fontWeight:600,marginTop:4}}>
            {momDiff<=0?"↓":"↑"} {t("month.vs",{amount:fmt(Math.abs(momDiff),currency),month:monthShort(prv)})}
          </div>}
        </div>
        <div className="month-stat">
          <div className="month-stat-val" style={{color:"var(--pos)"}}>{fmt(curInc,currency)}</div>
          <div className="month-stat-lbl">{t("home.income")}</div>
          {curInc>0&&<div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>
            {Math.round(((curInc-curExp)/curInc)*100)}% {t("surplus."+surplusLabel(curInc,curExp)).toLowerCase()}
          </div>}
        </div>
        <div className="month-stat" style={{gridColumn:"1 / -1"}}>
          <div className="month-stat-val" style={{color:surplusColor(curInc,curExp)}}>{fmt(Math.abs(curInc-curExp),currency)}</div>
          <div className="month-stat-lbl">{t("month.net."+(curInc>curExp?"Net surplus":curInc<curExp?"Net deficit":"Break-even"))}</div>
          {prevExp>0&&<div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>{t("month.vsSpentIn",{amount:fmt(prevExp,currency),month:monthShort(prv)})}</div>}
        </div>
      </div>
      <PlannedNote plannedExp={plannedExp} plannedInc={plannedInc} currency={currency} style={{marginTop:-8,marginBottom:16}}/>

      {/* Category breakdown */}
      {catData.length>0&&(
        <div className="a-card">
          <div className="a-card-title">{t("an.byCategory")}</div>
          {catData.map((cat,i)=>(
            <div key={i} className="cat-bar">
              <div className="cat-bar-name"><CatIcon catId={cat.id} size={13} color={cat.color}/>{catName(cat.id)}</div>
              <div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(cat.amt/maxCat)*100}%`,background:cat.color}}/></div>
              <div className="cat-bar-amt">{fmt(cat.amt,currency)}</div>
              <div className="cat-bar-pct">{curExp>0?Math.round((cat.amt/curExp)*100):0}%</div>
            </div>
          ))}
        </div>
      )}

      {/* Merchant breakdown */}
      {topMerchants.length>0&&(
        <div className="a-card">
          <div className="a-card-title">{t("month.byMerchant")}</div>
          {topMerchants.map(([merchant,amt],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i<topMerchants.length-1?"1px solid var(--rule)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                <div style={{width:28,height:28,borderRadius:6,background:"var(--bg-inset)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name="merchant" size={13} color="var(--ink-3)"/>
                </div>
                <span style={{fontSize:13,fontWeight:600,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{merchant}</span>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700}}>−{fmt(amt,currency)}</div>
                {curExp>0&&<div style={{fontSize:10,color:"var(--ink-4)"}}>{Math.round((amt/curExp)*100)}%</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Budget status for month */}
      {budgetItems.length>0&&(
        <div className="a-card">
          <div className="a-card-title">{t("month.budgetStatus")}</div>
          {budgetItems.map(({catId,limit,spent,pct,over,warn})=>{
            const cat=CAT(catId);
            return (
              <div key={catId} style={{marginBottom:11}}>
                <div className="budget-hdr">
                  <div className="budget-name"><CatIcon catId={catId} size={12}/>{catName(catId)}</div>
                  <span className="budget-nums"><strong>{fmt(spent,currency)}</strong> / {fmt(limit,currency)}</span>
                </div>
                <div className="budget-track"><div className="budget-fill" style={{width:`${pct}%`,background:over?"var(--neg)":warn?"var(--warn)":(cat?.color||"var(--ink-3)")}}/></div>
                <div className={`budget-msg${over?" over":warn?" warn":""}`}>
                  {over?t("budgets.over",{amount:fmt(spent-limit,currency)}):warn?t("budgets.warn",{amount:fmt(limit-spent,currency)}):t("budgets.remaining",{amount:fmt(limit-spent,currency)})}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recurring tab link */}
      {transactions.filter(x=>x.recurring&&x.date.startsWith(selectedMon)).length>0&&(
        <div style={{background:"var(--bg-warm)",borderRadius:8,padding:"10px 13px",marginBottom:14,fontSize:12,color:"var(--ink-3)"}}>
          <Icon name="repeat" size={12} color="var(--ink-4)"/> {tn("month.recurringCount",transactions.filter(x=>x.recurring&&x.date.startsWith(selectedMon)).length)}
        </div>
      )}

      {/* Transaction list */}
      {monTxns.length>0?(
        <>
          <div className="label-sm" style={{marginBottom:10}}>{t("month.allTxns",{month:monthName(selectedMon)})}</div>
          <GroupedTxns txns={monTxns} currency={currency} onView={onView}/>
        </>
      ):(
        <div className="empty" style={{padding:"32px 0"}}>
          <div className="empty-icon"><Icon name="calendar" size={28}/></div>
          <div className="empty-title">{t("month.emptyTitle")}</div>
          <div className="empty-body">{t("month.emptyBody",{month:monthName(selectedMon)})}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART HELPER — deterministic advice cards based on real data
// Not AI. Not guessing. Every card has a clear data source and impact.
// ─────────────────────────────────────────────────────────────────────────────
function calcHelperCards(transactions, budgets, goals, safeToSpend, currency) {
  const cards = [];
  const mon = curMon();
  const { curExp, curInc } = calcMonthSummary(transactions, mon);
  const catSpend = calcCategorySpend(transactions, mon);
  const budgetTotal = Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const spentToDate = calcSpentToDate(transactions, mon);
  const paceInfo = calcSpendingPace(spentToDate, mon, budgetTotal);
  const budgetItems = calcBudgetStatus(budgets||{}, catSpend, mon);
  const safeInfo = calcSafeToSpend(transactions, safeToSpend, goals);

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
        :tn("help.budgetWarn",b.daysLeft,{cat:name,pct:Math.round(b.pct)}),
      impact:b.over
        ?t("help.budgetOverImpact",{cat:name})
        :t("help.budgetWarnImpact",{left:fmt(b.limit-b.spent,currency),perDay:fmt((b.limit-b.spent)/Math.max(b.daysLeft,1),currency)}),
    });
  });

  // 3. Goals that will miss their target date, or whose date has passed
  goals?.forEach(goal=>{
    const gp=calcGoalProgress(goal);
    if (gp.behindSchedule && goal.monthlyTarget>0) {
      const monthsLeft=Math.max(1,Math.ceil(gp.daysToTarget/30.44));
      const neededMonthly=Math.ceil(gp.remaining/monthsLeft);
      cards.push({
        id:`goal-${goal.id}`, type:"warn", icon:"goal",
        title:t("help.goalTitle",{name:goal.name}),
        text:t("help.goalBehind",{amount:fmt(goal.monthlyTarget,currency),name:goal.name,date:gp.estCompletion}),
        impact:t("help.goalBehindImpact",{amount:fmt(neededMonthly,currency)}),
      });
    } else if (gp.overdue) {
      cards.push({
        id:`goal-${goal.id}`, type:"warn", icon:"goal",
        title:t("help.goalTitle",{name:goal.name}),
        text:t("help.goalOverdue",{name:goal.name,amount:fmt(gp.remaining,currency)}),
        impact:gp.estCompletion ? t("help.goalOverdueAt",{amount:fmt(goal.monthlyTarget,currency),date:gp.estCompletion}) : t("help.goalNoContribution"),
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
  const activeSchedules = buildSchedules(transactions).filter(x=>x.isActive && x.type==="expense");
  if (activeSchedules.length >= 3) {
    const monthlyTotal = activeSchedules.reduce((sum,x)=>sum+scheduleMonthly(x),0);
    const pctOfIncome = curInc>0 ? Math.round((monthlyTotal/curInc)*100) : 0;
    if (pctOfIncome >= 30) {
      cards.push({
        id:"recur-audit", type:"info", icon:"repeat",
        title:t("help.recurTitle"),
        text:t("help.recurText",{n:activeSchedules.length,amount:fmt(monthlyTotal,currency),pct:pctOfIncome}),
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

function SmartHelper({ transactions, budgets, goals, safeToSpend, currency }) {
  const lc = locale();
  const cards = useMemo(
    () => calcHelperCards(transactions, budgets, goals, safeToSpend, currency),
    [transactions, budgets, goals, safeToSpend, currency, lc]   // card text follows the interface language
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
            <div className="helper-text">{card.text}</div>
            <div className="helper-impact" style={{color:ICON_COLOR[card.type]}}>{card.impact}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
