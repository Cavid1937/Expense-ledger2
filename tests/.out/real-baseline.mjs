
const RealDate=Date;
globalThis.__NOW=new RealDate(2026,9,13,12,0,0).getTime();
class FakeDate extends RealDate{ constructor(...a){ if(a.length===0) super(globalThis.__NOW); else super(...a);} static now(){return globalThis.__NOW;} }
globalThis.Date=FakeDate;
const __store=new Map(); globalThis.__failKeys=[]; globalThis.__throwAll=false;
globalThis.localStorage={ getItem:k=>{ if(globalThis.__throwAll) throw new Error("SecurityError"); return __store.has(k)?__store.get(k):null; },
  setItem:(k,v)=>{ if(globalThis.__throwAll||globalThis.__failKeys.some(f=>k.includes(f))) throw new Error("QuotaExceededError"); __store.set(k,String(v)); },
  removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>[...__store.keys()][i], get length(){return __store.size;} };
globalThis.__store=__store;


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
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`${n} ${r}`).join(", ");
}

function setAside(label, records, detail="") {
  if (!records.length) return;
  const kept=preserveRaw(label, records);
  const n=`${records.length} unreadable record${records.length>1?"s":""}`;
  const why=detail ? ` (${detail})` : "";
  if (kept) noteLoad(`${n} set aside${why} — the rest of your data is intact`);
  else { SAVE_BLOCKED=true; noteLoad(`${n}${why} found but a recovery copy could not be made (storage may be full) — saving is paused so nothing is overwritten`); }
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
  if (rekeyed) noteLoad(`${rekeyed} duplicate id${rekeyed>1?"s":""} re-assigned`);
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
  const rawId=t.id;
  const id=(rawId!==undefined && rawId!==null && rawId!=="" && !Number.isNaN(Number(rawId))) ? rawId : Date.now()+Math.random();
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
  const plural=(n,a,b)=>n>1?b:a;
  const ids=EXPENSE_CAT_IDS();

  if (has("budgets")) {
    if (!isPlainObject(src.budgets)) problems.push("Budgets are not a valid list — your current budgets were kept.");
    else {
      const out={}; let bad=0; const entries=Object.entries(src.budgets);
      entries.forEach(([k,v])=>{ const id=budgetKey(k), n=parseMoney(v); if (!id||n===null) bad++; else if (out[id]===undefined) out[id]=n; });
      if (entries.length && !Object.keys(out).length) problems.push(`All ${entries.length} budget entries were invalid — your current budgets were kept.`);
      else { settings.budgets=out; if (bad) problems.push(`${bad} invalid budget ${plural(bad,"entry was","entries were")} skipped.`); }
    }
  }
  if (has("templates")) {
    if (!Array.isArray(src.templates)) problems.push("Templates are not a valid list — your current templates were kept.");
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
      if (src.templates.length && !out.length) problems.push(`All ${src.templates.length} templates were invalid — your current templates were kept.`);
      else { settings.templates=out; if (bad) problems.push(`${bad} invalid ${plural(bad,"template was","templates were")} skipped.`); }
    }
  }
  if (has("goals")) {
    if (!Array.isArray(src.goals)) problems.push("Goals are not a valid list — your current goals were kept.");
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
      if (src.goals.length && !out.length) problems.push(`All ${src.goals.length} goals were invalid — your current goals were kept.`);
      else { settings.goals=out; if (bad) problems.push(`${bad} invalid ${plural(bad,"goal was","goals were")} skipped.`); }
    }
  }
  if (has("currency")) {
    const c=typeof src.currency==="string" ? src.currency.trim() : "";
    if (c && c.length<=3 && !/[\u0000-\u001f]/.test(c)) settings.currency=c;
    else problems.push("The currency symbol was not valid — your current symbol was kept.");
  }
  if (has("safeToSpend")) {
    const sts=src.safeToSpend;
    const target=(isPlainObject(sts) && (sts.savingsTarget===undefined||sts.savingsTarget===null||sts.savingsTarget==="")) ? 0 : (isPlainObject(sts) ? parseMoney(sts.savingsTarget) : null);
    const enabledOk=isPlainObject(sts) && (sts.enabled===undefined || typeof sts.enabled==="boolean");
    if (isPlainObject(sts) && enabledOk && target!==null) settings.safeToSpend={ savingsTarget:target, enabled:!!sts.enabled };
    else problems.push("The Safe to Spend settings were not valid — your current settings were kept.");
  }
  return { settings, problems, warnings };
}

function migrateAndLoad() {
  let rawStr=null;
  try { rawStr=localStorage.getItem(KEY); } catch {}
  let current=null;
  if (rawStr) { try { current=JSON.parse(rawStr); } catch { current=null; } }

  if (isPlainObject(current) && Array.isArray(current.transactions)) {
    const v=validateSettings(current);
    if (v.problems.length) {
      const kept=preserveRaw("settings_rejected",{ budgets:current.budgets, templates:current.templates, currency:current.currency, goals:current.goals, safeToSpend:current.safeToSpend });
      if (!kept) SAVE_BLOCKED=true;
      noteLoad(`Some saved settings were not valid and were reset${kept?" (the originals were kept)":" — saving is paused because they could not be copied"}`);
    }
    const lastBackup=(typeof current.lastBackup==="string" && !Number.isNaN(Date.parse(current.lastBackup))) ? current.lastBackup : null;
    return {
      transactions: sanitizeTransactions(current.transactions, "rejected"),
      budgets:      v.settings.budgets     ?? {},
      templates:    v.settings.templates   ?? DEFAULT_TEMPLATES,
      currency:     v.settings.currency    ?? "₼",
      goals:        v.settings.goals       ?? [],
      safeToSpend:  v.settings.safeToSpend ?? { savingsTarget:0, enabled:false },
      lastBackup,
    };
  }

  // Something is stored under the current key but we cannot use it: keep a copy before anything overwrites it.
  if (rawStr) {
    if (preserveRaw("corrupt", rawStr)) noteLoad("Saved data could not be read — a recovery copy was kept");
    else { SAVE_BLOCKED=true; noteLoad("Saved data could not be read and a recovery copy could not be made (storage may be full) — saving is paused so nothing is overwritten"); }
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
  return buildState(merged, bestSettings);
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
  if (rows.unterminated) return { error:"This CSV has an opening quote that is never closed, so rows could be merged or lost. Nothing was imported." };
  if (rows.length<2) return { error:"No data rows were found in the CSV." };
  const headers=rows[0].map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase());
  const idx={}; Object.entries(CSV_COLUMNS).forEach(([k,names])=>{ idx[k]=names.map(n=>headers.indexOf(n)).find(i=>i!==-1) ?? -1; });
  const missing=["date","amount"].filter(k=>idx[k]===-1);
  if (missing.length) return { error:`The CSV needs a ${missing.join(" and ")} column. Found: ${rows[0].map(h=>h.trim()).filter(Boolean).join(", ")||"no headers"}. Nothing was imported.` };
  const cell=(row,k)=>idx[k]===-1 ? "" : String(row[idx[k]] ?? "").trim();
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
    try { parsed=JSON.parse(text); } catch { return { ok:false, error:"This file is not valid JSON or CSV, so nothing was imported." }; }
    if (Array.isArray(parsed)) list=parsed;
    else if (isPlainObject(parsed)) {
      if (parsed.version!==undefined) {
        if (!Number.isInteger(parsed.version) || parsed.version<1) return { ok:false, error:"The backup's version number is not valid, so it was not imported." };
        if (parsed.version>BACKUP_VERSION) return { ok:false, error:`This backup was made by a newer version of the app (v${parsed.version}). Update the app before importing it.` };
      }
      if (Array.isArray(parsed.transactions)) list=parsed.transactions;
      else if (Array.isArray(parsed.entries)) list=parsed.entries;
      else { const v=Object.values(parsed).find(v=>Array.isArray(v) && v.length>0 && isPlainObject(v[0]) && v[0].amount!==undefined); if (v) list=v; }
      const v=validateSettings(parsed); settings=v.settings; problems=v.problems; warnings=v.warnings.slice();
      if (parsed.exportedAt!==undefined && !(typeof parsed.exportedAt==="string" && !Number.isNaN(Date.parse(parsed.exportedAt)))) warnings.push("The backup's export date is not valid and was ignored.");
      if (isPlainObject(parsed.meta) && Number.isInteger(parsed.meta.transactionCount) && parsed.meta.transactionCount!==list.length)
        warnings.push(`The file says it holds ${parsed.meta.transactionCount} transactions but contains ${list.length} — it may be incomplete.`);
    } else return { ok:false, error:"This file does not look like a ledger backup." };
  }
  const { good, bad, rekeyed }=partitionTransactions(list);
  if (!good.length && !Object.keys(settings).length)
    return { ok:false, error: bad.length ? `Nothing could be imported — ${summariseReasons(bad)}.` : "No transactions or settings were found in this file." };
  const unknownCat=list.filter(t=>checkRawTxn(t)===null).filter(t=>{ const c=txt(t.category||t.catId||t.cat).trim(); return c && resolveCategory(c)==="other" && !/^(other|miscellaneous)$/i.test(c); }).length;
  if (unknownCat) warnings.push(`${unknownCat} transaction${unknownCat>1?"s have":" has"} a category the app does not recognise and ${unknownCat>1?"were":"was"} filed under Other.`);
  if (rekeyed) warnings.push(`${rekeyed} duplicate id${rekeyed>1?"s were":" was"} re-assigned.`);
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

function buildBackup(state, now=new Date().toISOString()) {
  const { transactions,budgets,templates,currency,goals,safeToSpend }=state;
  return { version:BACKUP_VERSION, exportedAt:now, meta:{ app:"expense-ledger", transactionCount:transactions.length },
    transactions, budgets, templates, currency, goals, safeToSpend, lastBackup:now };
}

function buildCsv(transactions) {
  const rows=[["Date","Type","Category","Subcategory","Merchant","Amount","Note","Recurring","CategoryId"]];
  transactions.forEach(t=>rows.push([t.date,t.type,CAT(t.category)?.name||t.category,t.subcategory||"",t.merchant||"",Number(t.amount).toFixed(2),t.note||"",t.recurring?(t.recurFreq||""):"",t.category]));
  return "\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
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
  const visitCountThisMonth = txns.filter(t=>t.date.startsWith(mon)).length;
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

function calcMonthSummary(transactions, mon=curMon(), prv=prevMon()) {
  const isExp=t=>t.type==="expense", isInc=t=>t.type==="income";
  const curExp =transactions.filter(t=>isExp(t)&&t.date.startsWith(mon)).reduce((s,t)=>s+t.amount,0);
  const curInc =transactions.filter(t=>isInc(t)&&t.date.startsWith(mon)).reduce((s,t)=>s+t.amount,0);
  const prevExp=transactions.filter(t=>isExp(t)&&t.date.startsWith(prv)).reduce((s,t)=>s+t.amount,0);
  const prevInc=transactions.filter(t=>isInc(t)&&t.date.startsWith(prv)).reduce((s,t)=>s+t.amount,0);
  const momDiff=prevExp>0?curExp-prevExp:null;
  // Negative when expenses exceed income — don't clamp, show the deficit
  const surplusRate=curInc>0?Math.round(((curInc-curExp)/curInc)*100):null;
  return { curExp,curInc,prevExp,prevInc,momDiff,surplusRate };
}

function calcCategorySpend(transactions, mon=curMon()) {
  const out={};
  transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon))
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

function calcTxnStats(transactions, mon=curMon()) {
  const amts=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)).map(t=>t.amount);
  const isWkend=d=>[0,6].includes(parseLocalDate(d).getDay());
  const wkdExp=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&!isWkend(t.date)).reduce((s,t)=>s+t.amount,0);
  const wkndExp=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&isWkend(t.date)).reduce((s,t)=>s+t.amount,0);
  return { count:amts.length, avgTxn:amts.length?amts.reduce((s,a)=>s+a,0)/amts.length:0, medTxn:median(amts), weekdayExp:wkdExp, weekendExp:wkndExp };
}

// S3: What Changed — category + merchant-level explanation + recurring/one-off flag
function calcWhatChanged(transactions, mon=curMon(), prv=prevMon()) {
  const catSpendMon=calcCategorySpend(transactions,mon);
  const catSpendPrv=calcCategorySpend(transactions,prv);
  const { curExp,prevExp,curInc,prevInc }=calcMonthSummary(transactions,mon,prv);

  // Build a set of merchant names that have any recurring transaction
  const recurringMerchants=new Set(
    transactions.filter(t=>t.recurring&&t.merchant).map(t=>t.merchant.toLowerCase())
  );

  const cats=[...new Set([...Object.keys(catSpendMon),...Object.keys(catSpendPrv)])];
  const catChanges=cats.map(catId=>{
    const cur=catSpendMon[catId]||0,prev=catSpendPrv[catId]||0,diff=cur-prev;
    const merchantMon={},merchantPrv={};
    transactions.filter(t=>t.type==="expense"&&t.category===catId&&t.merchant&&t.date.startsWith(mon)).forEach(t=>{merchantMon[t.merchant]=(merchantMon[t.merchant]||0)+t.amount;});
    transactions.filter(t=>t.type==="expense"&&t.category===catId&&t.merchant&&t.date.startsWith(prv)).forEach(t=>{merchantPrv[t.merchant]=(merchantPrv[t.merchant]||0)+t.amount;});
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
  transactions.filter(t=>t.type==="expense"&&t.merchant&&t.date.startsWith(mon)).forEach(t=>{merchantMon[t.merchant]=(merchantMon[t.merchant]||0)+t.amount;});
  transactions.filter(t=>t.type==="expense"&&t.merchant&&t.date.startsWith(prv)).forEach(t=>{merchantPrv[t.merchant]=(merchantPrv[t.merchant]||0)+t.amount;});
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

// S4: Safe to Spend = income recorded so far − savings reserve − spending recorded this month − commitments still to come.
// "Commitments still to come" = every expected payment of an active schedule this month that has no matching recorded payment:
// both upcoming ones and earlier ones that were never recorded (counted so the figure is never optimistic).
// Recurring monthly estimates (recurringMonthly) are informational and are NOT part of this month's subtraction.
function calcSafeToSpend(transactions, safeConfig, goals=[], now=new Date()) {
  const { savingsTarget=0 }=safeConfig||{};
  const mon=localMonthStr(now);
  const { curInc,curExp }=calcMonthSummary(transactions,mon);
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
    curInc, curExp, savingsTarget, effectiveSavingsTarget, goalContributions, goalContributionActive,
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
  const monthLabel=(d,style)=>d.toLocaleDateString("en-GB",{month:style,year:"numeric"});

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
      if (Math.abs(pct)>=20) insights.push({ id:"weekend", text:`Per day, you spend ${Math.abs(pct)}% ${pct>0?"more":"less"} on weekends than on weekdays (${fmt(weAvg,currency)} vs ${fmt(wdAvg,currency)} a day, last ${weDays+wdDays} days)` });
    }
  }

  // ── Concentration this month
  const monExp=expenses.filter(t=>t.date.startsWith(mon));
  const monTotal=sumOf(monExp);
  if (monExp.length>=5 && monTotal>0) {
    const catTotals={}; monExp.forEach(t=>{ catTotals[t.category]=(catTotals[t.category]||0)+t.amount; });
    const topCat=Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    const pct=Math.round((topCat[1]/monTotal)*100);
    if (pct>=40) insights.push({ id:"catconc", text:`${CAT(topCat[0])?.name} accounts for ${pct}% of spending this month` });
    const mTotals={}; monExp.filter(t=>t.merchant).forEach(t=>{ mTotals[t.merchant]=(mTotals[t.merchant]||0)+t.amount; });
    const top3=Object.entries(mTotals).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if (top3.length>=2) { const pc=Math.round((top3.reduce((a,[,v])=>a+v,0)/monTotal)*100); if (pc>=60) insights.push({ id:"merchant", text:`${top3.map(([m])=>m).join(", ")} account for ${pc}% of spending this month` }); }
  }

  // ── Average transaction vs last month (a per-transaction average, so a part-month is comparable)
  const curAmts=expenses.filter(t=>t.date.startsWith(mon)).map(t=>t.amount), prvAmts=expenses.filter(t=>t.date.startsWith(prv)).map(t=>t.amount);
  if (curAmts.length>=4 && prvAmts.length>=4) {
    const curAvg=curAmts.reduce((a,b)=>a+b,0)/curAmts.length, prvAvg=prvAmts.reduce((a,b)=>a+b,0)/prvAmts.length;
    if (prvAvg>0) { const pct=pctChange(curAvg,prvAvg); if (Math.abs(pct)>=20) insights.push({ id:"avgtxn", text:`Average transaction is ${Math.abs(pct)}% ${pct>0?"higher":"lower"} than last month (${curAmts.length} vs ${prvAmts.length} transactions)` }); }
  }

  // ── Day of week (average per transaction; only days with at least 3 transactions are compared)
  const dayOfWeek={}; DAY_NAMES.forEach(d=>{ dayOfWeek[d]={ avg:0, count:0, total:0 }; });
  monExp.forEach(t=>{ const d=DAY_NAMES[parseLocalDate(t.date).getDay()]; dayOfWeek[d].count++; dayOfWeek[d].total+=t.amount; });
  DAY_NAMES.forEach(d=>{ if (dayOfWeek[d].count>0) dayOfWeek[d].avg=parseFloat((dayOfWeek[d].total/dayOfWeek[d].count).toFixed(2)); });
  const eligible=DAY_NAMES.filter(d=>dayOfWeek[d].count>=3);
  if (eligible.length>=2) {
    const byAvg=[...eligible].sort((a,b)=>dayOfWeek[b].avg-dayOfWeek[a].avg), hi=byAvg[0], lo=byAvg[byAvg.length-1];
    if (dayOfWeek[lo].avg>0) { const pct=pctChange(dayOfWeek[hi].avg,dayOfWeek[lo].avg); if (pct>=30) insights.push({ id:"dayofweek", text:`${hi}s average ${pct}% more per transaction than ${lo}s this month (${dayOfWeek[hi].count} vs ${dayOfWeek[lo].count} transactions)` }); }
  }

  // ── Category trends over the last 6 COMPLETED months (the current part-month would distort a trend)
  const categoryTrends=[];
  const months6=[6,5,4,3,2,1].map(monBack);
  [...new Set(expenses.map(t=>t.category))].forEach(catId=>{
    const data=months6.map((m,i)=>({ x:i, y:sumOf(expenses.filter(t=>t.category===catId&&t.date.startsWith(m))) }));
    if (data.filter(d=>d.y>0).length<3) return;
    const n=data.length, sumX=data.reduce((a,d)=>a+d.x,0), sumY=data.reduce((a,d)=>a+d.y,0);
    const sumXY=data.reduce((a,d)=>a+d.x*d.y,0), sumX2=data.reduce((a,d)=>a+d.x*d.x,0), denom=n*sumX2-sumX*sumX;
    if (denom===0) return;
    const slope=(n*sumXY-sumX*sumY)/denom, avgY=sumY/n;
    const trend=slope>avgY*0.05 ? "increasing" : slope<-avgY*0.05 ? "decreasing" : "stable";
    const last=data[n-1].y, prev=data[n-2].y;
    const trendPct=prev>0 ? pctChange(last,prev) : 0;
    categoryTrends.push({ catId, trend, trendPct, slope:parseFloat(slope.toFixed(2)), monthlyData:data });
    if (trend!=="stable" && prev>0 && last>0 && Math.abs(trendPct)>=20)
      insights.push({ id:`trend-${catId}`, text:`${CAT(catId)?.name} spending has been ${trend} over recent months (${trendPct>0?"+":""}${trendPct}% last month vs the month before)` });
  });

  // ── Unusually large transactions this month: above Q3 + 1.5×IQR of that category's history AND at least 1.5× its median
  const quantile=(sorted,q)=>{ const i=(sorted.length-1)*q, lo=Math.floor(i), hi=Math.ceil(i); return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo); };
  const hist={}; expenses.forEach(t=>{ (hist[t.category]=hist[t.category]||[]).push(t.amount); });
  const anomalies=[];
  monExp.forEach(t=>{
    const h=[...(hist[t.category]||[])].sort((a,b)=>a-b);
    if (h.length<8) return;
    const q1=quantile(h,0.25), q3=quantile(h,0.75), med=quantile(h,0.5);
    if (t.amount>q3+1.5*(q3-q1) && med>0 && t.amount>=1.5*med)
      anomalies.push({ date:t.date, amount:t.amount, category:t.category, merchant:t.merchant||"", reason:`${(t.amount/med).toFixed(1)}× the usual ${CAT(t.category)?.name} amount (median ${fmt(med,currency)})`, severity:"high" });
  });
  anomalies.sort((a,b)=>b.amount-a.amount).splice(10);
  if (anomalies.length) insights.push({ id:"anomaly", text:`${anomalies.length} unusually large transaction${anomalies.length>1?"s":""} this month` });

  // ── Categories recorded on the same day (co-occurrence — it does not mean one causes the other)
  const correlations=[];
  const catByDay={}; monExp.forEach(t=>{ (catByDay[t.date]=catByDay[t.date]||new Set()).add(t.category); });
  const days=Object.keys(catByDay).length, pairCounts={};
  Object.values(catByDay).forEach(set=>{ const u=[...set]; for (let i=0;i<u.length;i++) for (let j=i+1;j<u.length;j++) { const k=[u[i],u[j]].sort().join("__"); pairCounts[k]=(pairCounts[k]||0)+1; } });
  if (days>=8) {
    Object.entries(pairCounts).filter(([,c])=>c>=Math.max(3,Math.ceil(days*0.3))).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([k,c])=>{
      const [c1,c2]=k.split("__"); correlations.push({ category1:c1, category2:c2, frequency:c, correlation:parseFloat((c/days).toFixed(2)) });
    });
    if (correlations.length) { const t=correlations[0]; insights.push({ id:"same-day", text:`${CAT(t.category1)?.name} and ${CAT(t.category2)?.name} are often recorded on the same day (${Math.round(t.correlation*100)}% of spending days this month)` }); }
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
function fmtDate(d) {
  if (!d) return "";
  const td=today();
  if (d===td) return "Today";
  const y=new Date(); y.setDate(y.getDate()-1);
  if (d===localDateStr(y)) return "Yesterday";
  return parseLocalDate(d).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
}
function monthName(ym) { return new Date(ym+"-02").toLocaleDateString("en-GB",{month:"long",year:"numeric"}); }
function monthShort(ym) { return new Date(ym+"-02").toLocaleDateString("en-GB",{month:"short"}); }
function daysInMonth(ym) { const [y,m]=ym.split("-").map(Number); return new Date(y,m,0).getDate(); }
function median(arr) {
  if (!arr.length) return 0;
  const s=[...arr].sort((a,b)=>a-b),m=Math.floor(s.length/2);
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
}


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
      title:"Spending Pace",
      text:`You are ${fmt(overage,currency)} above budget pace for this point in the month.`,
      impact: remainingBudget>0
        ? `Your remaining budget of ${fmt(remainingBudget,currency)} allows about ${fmt(remainingBudget/paceInfo.daysRemaining,currency)}/day for the ${paceInfo.daysRemaining} days left (today included).`
        : `Your total budget is fully used${remainingBudget<0?` (${fmt(Math.abs(remainingBudget),currency)} over)`:""} with ${paceInfo.daysRemaining} days left (today included).`,
    });
  }

  // 2. Budget warnings — over or approaching
  budgetItems.filter(b=>b.over||b.warn).forEach(b=>{
    const cat=CAT(b.catId);
    cards.push({
      id:`budget-${b.catId}`, type:b.over?"neg":"warn", icon:b.catId,
      title:`${cat?.name} Budget`,
      text:b.over
        ?`You have exceeded your ${cat?.name} budget by ${fmt(b.spent-b.limit,currency)} this month.`
        :`You have used ${Math.round(b.pct)}% of your ${cat?.name} budget with ${b.daysLeft} days remaining.`,
      impact:b.over
        ?`Consider pausing ${cat?.name} spending for the rest of the month.`
        :`You have ${fmt(b.limit-b.spent,currency)} left — ${fmt((b.limit-b.spent)/Math.max(b.daysLeft,1),currency)}/day available.`,
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
        title:`Goal: ${goal.name}`,
        text:`At ${fmt(goal.monthlyTarget,currency)}/mo, "${goal.name}" is projected to finish in ${gp.estCompletion}, after its target date.`,
        impact:`Finishing by the target date would take about ${fmt(neededMonthly,currency)}/mo.`,
      });
    } else if (gp.overdue) {
      cards.push({
        id:`goal-${goal.id}`, type:"warn", icon:"goal",
        title:`Goal: ${goal.name}`,
        text:`The target date for "${goal.name}" has passed with ${fmt(gp.remaining,currency)} still to go.`,
        impact:gp.estCompletion ? `At ${fmt(goal.monthlyTarget,currency)}/mo it would finish in ${gp.estCompletion}.` : `No monthly contribution is set for this goal.`,
      });
    }
  });

  // 4. Safe to Spend negative
  if (safeToSpend?.enabled && safeInfo.feasible && safeInfo.remaining < 0) {
    cards.push({
      id:"safe-neg", type:"neg", icon:"safe",
      title:"Over Discretionary Limit",
      text:`You have spent ${fmt(Math.abs(safeInfo.remaining),currency)} beyond your discretionary budget this month.`,
      impact:`Income: ${fmt(safeInfo.curInc,currency)} − commitments − savings target leaves no room. Review recurring or reduce spending.`,
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
        title:"Recurring Audit",
        text:`${activeSchedules.length} active recurring payments come to about ${fmt(monthlyTotal,currency)} in a typical month — ${pctOfIncome}% of the income recorded this month.`,
        impact:`Review them in the Recurring tab. Pausing ones you no longer use frees up discretionary budget.`,
      });
    }
  }

  // 6. High-spend anomaly this month
  const patternsData = calcPatterns(transactions, currency);
  if (patternsData.anomalies.length > 0) {
    const top = patternsData.anomalies[0];
    cards.push({
      id:"anomaly-top", type:"info", icon:"other",
      title:"Unusual Transaction",
      text:`${top.merchant||CAT(top.category)?.name} on ${fmtDate(top.date)}: ${fmt(top.amount,currency)} — ${top.reason}.`,
      impact:`This is significantly above your normal spend for ${CAT(top.category)?.name}. Was this expected?`,
    });
  }

  // Limit to 4 most impactful cards
  return cards.slice(0, 4);
}



export { migrateAndLoad, buildMerchantMemory, merchantSuggest, memKey, calcHelperCards, calcSafeToSpend, calcSpendingPace, calcBudgetStatus, calcMonthSummary, calcPatterns, calcGoalProgress, calcCategorySpend, calcWhatChanged, calcTxnStats, calcSpentToDate, prevMon, nMon, surplusLabel, surplusColor, normaliseTxn, addMonths, strictNum, parseMoney, moneyReason, isUsableRawTxn, checkRawTxn, isValidDateStr, localDateStr, localMonthStr, parseLocalDate, daysInMonth, daysBetween, parseCSV, validateSettings, planImport, applyImport, buildBackup, buildCsv, countSuspectedDuplicates, txnFingerprint, partitionTransactions, ensureUniqueIds, summariseReasons, noteLoad, buildSchedules, scheduleOccurrences, scheduleMonthStatus, scheduleNextDue, scheduleKey, monthProgress, toMonthlyAmountHelper, fmt, detectRecurrence, calcMerchantProfile, resolveCategory, curMon, sanitizeTransactions, MAX_AMOUNT, CATEGORIES, CAT };
export const getNotice=()=>LOAD_NOTICE; export const getSaveBlocked=()=>SAVE_BLOCKED;
export const resetFlags=()=>{LOAD_NOTICE=null;SAVE_BLOCKED=false;};
