import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE LEDGER v6
// Storage key: expense_ledger_v5 — NEVER changed, your data is safe
// New in this version:
//   · Quick-add templates (tap → pre-filled form)
//   · Analytics tab: donut, 6-month comparison, Mon–Sun heatmap
//   · Edit any transaction in-place
//   · Date range filter in Ledger
//   · Notes shown as subtitle on every transaction row
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "expense_ledger_v5"; // permanent — do not change

const KEYS_LEGACY = [
  "finance_app_data","finance_editorial_v1","finance_editorial_v2",
  "finance_editorial_v3","finance_editorial_v4","finance_os_v3",
];

function readRaw(k) {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; }
}
function writeRaw(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

function migrateAndLoad() {
  const current = readRaw(KEY);
  if (current?.transactions) {
    // Patch: add templates if missing (users upgrading from older build)
    if (!current.templates) current.templates = DEFAULT_TEMPLATES;
    return current;
  }
  let merged = [], bestSettings = null;
  for (const k of KEYS_LEGACY) {
    const d = readRaw(k);
    if (!d) continue;
    const txns = d.transactions || d.entries || [];
    const existingIds = new Set(merged.map(t => String(t.id)));
    txns.forEach(t => {
      if (!existingIds.has(String(t.id))) { merged.push(normaliseTxn(t)); existingIds.add(String(t.id)); }
    });
    if (d.currency || d.budgets || d.categories) bestSettings = d;
  }
  merged.sort((a, b) => b.date.localeCompare(a.date));
  return buildState(merged, bestSettings);
}

function normaliseTxn(t) {
  return {
    id:        t.id || Date.now() + Math.random(),
    type:      t.type || "expense",
    amount:    Math.abs(parseFloat(t.amount || t.amt || 0)),
    category:  t.category || t.catId || t.cat || "other",
    note:      t.note || t.description || t.name || "",
    date:      t.date || new Date().toISOString().slice(0, 10),
    recurring: t.recurring || false,
    recurFreq: t.recurFreq || t.frequency || null,
  };
}

function buildState(transactions = [], settings = null) {
  const seedIfEmpty = transactions.length === 0 ? SEED_TRANSACTIONS() : transactions;
  return {
    transactions: seedIfEmpty,
    budgets:    settings?.budgets    || { food: 200, sport: 80, personal: 60, digital: 30 },
    categories: settings?.categories || DEFAULT_CATEGORIES,
    templates:  settings?.templates  || DEFAULT_TEMPLATES,
    currency:   settings?.currency   || "£",
    lastBackup: settings?.lastBackup || null,
  };
}

function SEED_TRANSACTIONS() {
  const d = n => { const dt = new Date(); dt.setDate(dt.getDate()-n); return dt.toISOString().slice(0,10); };
  return [
    { id:1001,type:"income", amount:2400, category:"salary",   note:"Monthly salary",          date:d(5), recurring:true, recurFreq:"monthly" },
    { id:1002,type:"expense",amount:850,  category:"housing",  note:"Rent",                    date:d(5), recurring:true, recurFreq:"monthly" },
    { id:1003,type:"expense",amount:45,   category:"sport",    note:"Gym membership",          date:d(6), recurring:true, recurFreq:"monthly" },
    { id:1004,type:"expense",amount:10.99,category:"digital",  note:"Spotify Premium",         date:d(4), recurring:true, recurFreq:"monthly" },
    { id:1005,type:"expense",amount:2.99, category:"digital",  note:"iCloud Storage",          date:d(4), recurring:true, recurFreq:"monthly" },
    { id:1006,type:"expense",amount:34.5, category:"food",     note:"High-protein groceries",  date:d(2), recurring:false,recurFreq:null },
    { id:1007,type:"expense",amount:12,   category:"sport",    note:"Mini-football pitch fee", date:d(3), recurring:false,recurFreq:null },
    { id:1008,type:"expense",amount:22,   category:"transport",note:"Monthly bus pass",        date:d(6), recurring:true, recurFreq:"monthly" },
    { id:1009,type:"expense",amount:18,   category:"culture",  note:"Fragrance decant",        date:d(7), recurring:false,recurFreq:null },
    { id:1010,type:"expense",amount:22,   category:"personal", note:"Adapalene & glycolic acid",date:d(8),recurring:false,recurFreq:null },
    { id:1011,type:"expense",amount:4.5,  category:"food",     note:"Coffee",                  date:d(1), recurring:false,recurFreq:null },
    { id:1012,type:"expense",amount:8.5,  category:"food",     note:"Lunch",                   date:d(9), recurring:false,recurFreq:null },
  ];
}

const DEFAULT_CATEGORIES = [
  { id:"food",     name:"Food & Dining",   icon:"🥗",color:"#5C7A6E" },
  { id:"sport",    name:"Sport & Fitness", icon:"⚽",color:"#4A5C7A" },
  { id:"personal", name:"Personal Care",   icon:"🧴",color:"#7A5C7A" },
  { id:"culture",  name:"Style & Culture", icon:"🪞",color:"#7A6652" },
  { id:"transport",name:"Transport",       icon:"🚆",color:"#4A6A7A" },
  { id:"housing",  name:"Housing",         icon:"🏠",color:"#5A5A5A" },
  { id:"digital",  name:"Digital & Subs",  icon:"📱",color:"#3A6A5A" },
  { id:"edu",      name:"Education",       icon:"📚",color:"#4A4A7A" },
  { id:"other",    name:"Other",           icon:"◦", color:"#8A8A8A" },
  { id:"salary",   name:"Salary",          icon:"💼",color:"#2D6A4F" },
  { id:"freelance",name:"Freelance",       icon:"💻",color:"#2D6A4F" },
];

const DEFAULT_TEMPLATES = [
  { id:"t1",name:"High-Protein Groceries",amount:35,  catId:"food",     note:"Weekly shop",      icon:"🥗" },
  { id:"t2",name:"Football Pitch",        amount:12,  catId:"sport",    note:"5-a-side pitch",   icon:"⚽" },
  { id:"t3",name:"Fragrance Decant",      amount:18,  catId:"culture",  note:"Sample decant",    icon:"🪞" },
  { id:"t4",name:"Coffee",               amount:4.5, catId:"food",     note:"Café",              icon:"☕" },
  { id:"t5",name:"Adapalene Restock",    amount:12,  catId:"personal", note:"Skincare restock",  icon:"🧴" },
  { id:"t6",name:"Bus / Tram",           amount:2.4, catId:"transport",note:"Public transport",  icon:"🚌" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const today   = () => new Date().toISOString().slice(0,10);
const curMon  = () => new Date().toISOString().slice(0,7);

function fmt(n, sym="£") {
  return `${sym}${Math.abs(n).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}
function fmtDate(d) {
  const dt = new Date(d+"T00:00:00");
  if (d === today()) return "Today";
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  if (d === yest.toISOString().slice(0,10)) return "Yesterday";
  return dt.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
}
function monthLabel(ym) {
  return new Date(ym+"-02").toLocaleDateString("en-GB",{month:"short",year:"2-digit"});
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F7F4EE;--bg-alt:#EFECE4;--bg-card:#FFFFFF;
  --ink:#141414;--ink-mid:#4A4A4A;--ink-muted:#8A8A8A;--ink-faint:#C8C8C8;
  --div:#E5E5E5;
  --pos:#1A6B3C;--pos-bg:#EDF7F1;
  --neg:#8B1A1A;--neg-bg:#FDF0F0;
  --warn:#7A5500;--warn-bg:#FFF8EC;
  --sk1:#E8E4DC;--sk2:#D8D4CC;
}
html,body{background:var(--bg);color:var(--ink);font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
.app{max-width:430px;margin:0 auto;min-height:100vh;background:var(--bg);display:flex;flex-direction:column;position:relative}
.playfair{font-family:'Playfair Display',Georgia,serif}

/* Topbar */
.topbar{position:sticky;top:0;z-index:60;background:rgba(247,244,238,0.94);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--div);padding:0 18px;height:52px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.wordmark{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--ink);letter-spacing:-0.2px}
.topbar-right{display:flex;gap:6px;align-items:center}
.icon-btn{width:32px;height:32px;border-radius:50%;background:transparent;border:1px solid var(--div);color:var(--ink-muted);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color 120ms,color 120ms;flex-shrink:0;font-family:'DM Sans',sans-serif}
.icon-btn:hover{border-color:var(--ink-muted);color:var(--ink)}

/* Tab bar */
.tabbar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(247,244,238,0.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid var(--div);display:flex;z-index:60;padding:6px 0 calc(6px + env(safe-area-inset-bottom,0px))}
.tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;border:none;background:transparent;cursor:pointer;color:var(--ink-faint);transition:color 120ms;font-family:'DM Sans',sans-serif}
.tab-btn.active{color:var(--ink)}
.tab-icon{font-size:18px;line-height:1}
.tab-lbl{font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase}
.tab-dot{width:3px;height:3px;border-radius:50%;background:var(--ink);margin-top:1px}

/* Page */
.page{flex:1;overflow-y:auto;padding:20px 18px 90px;animation:pageIn 180ms ease both}
@keyframes pageIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}

/* Section header */
.sec-hdr{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px}
.sec-title{font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-muted)}
.sec-link{font-size:12px;font-weight:600;color:var(--ink-muted);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.sec-link:hover{color:var(--ink)}
.rule{height:1px;background:var(--div);margin:20px 0}

/* Skeleton */
@keyframes skelShim{0%{background-position:-400% 0}100%{background-position:400% 0}}
.skel{background:linear-gradient(90deg,var(--sk1) 25%,var(--sk2) 50%,var(--sk1) 75%);background-size:400% 100%;animation:skelShim 1.8s ease infinite;border-radius:4px}

/* Hero */
.hero{padding:24px 0 20px;border-bottom:1px solid var(--div);margin-bottom:22px}
.hero-eyebrow{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-muted);margin-bottom:5px}
.hero-number{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;letter-spacing:-2.5px;line-height:1;margin-bottom:6px}
.hero-number.pos{color:var(--pos)}
.hero-number.neg{color:var(--neg)}
.hero-sub{font-size:12px;color:var(--ink-muted);margin-bottom:16px}
.hero-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--div);border:1px solid var(--div);border-radius:8px;overflow:hidden}
.hero-cell{background:var(--bg-card);padding:12px 10px}
.hero-cell-val{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;letter-spacing:-0.5px;margin-bottom:3px}
.hero-cell-val.pos{color:var(--pos)}
.hero-cell-val.neg{color:var(--neg)}
.hero-cell-lbl{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--ink-muted)}

/* Templates strip */
.tpl-strip{display:flex;gap:7px;overflow-x:auto;padding-bottom:3px;margin-bottom:18px;scrollbar-width:none}
.tpl-strip::-webkit-scrollbar{display:none}
.tpl-chip{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--div);border-radius:99px;background:var(--bg-card);cursor:pointer;font-size:12px;font-weight:600;color:var(--ink-mid);white-space:nowrap;transition:border-color 120ms,background 120ms,color 120ms;font-family:'DM Sans',sans-serif}
.tpl-chip:hover{border-color:var(--ink-muted);background:var(--bg-alt);color:var(--ink)}
.tpl-chip:active{transform:scale(0.97)}
.tpl-amt{font-family:'Playfair Display',serif;font-size:12px;color:var(--ink-muted)}

/* Budget bars */
.budget-block{margin-bottom:20px}
.budget-row{margin-bottom:12px}
.budget-hdr{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
.budget-name{font-size:12px;font-weight:600;color:var(--ink)}
.budget-nums{font-size:11px;color:var(--ink-muted)}
.budget-nums b{color:var(--ink);font-weight:700}
.budget-track{height:3px;background:var(--div);border-radius:99px;overflow:hidden}
.budget-fill{height:100%;border-radius:99px;transition:width 0.5s cubic-bezier(0.4,0,0.2,1)}
.budget-msg{font-size:10px;margin-top:3px;font-weight:600;color:var(--ink-muted)}
.budget-msg.warn{color:var(--warn)}
.budget-msg.over{color:var(--neg)}

/* Transaction rows */
.txn-group{margin-bottom:14px}
.txn-date-hdr{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;margin-bottom:0}
.txn-date-lbl{font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-muted)}
.txn-date-total{font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:var(--ink)}
.txn-card{background:var(--bg-card);border:1px solid var(--div);border-radius:10px;overflow:hidden}
.txn-row{display:flex;align-items:center;gap:11px;padding:12px 13px;border-bottom:1px solid var(--div);cursor:pointer;transition:background 100ms}
.txn-row:last-child{border-bottom:none}
.txn-row:hover{background:var(--bg-alt)}
.txn-ico{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.txn-info{flex:1;min-width:0}
.txn-name{font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1px}
.txn-note{font-size:11px;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.txn-meta{font-size:11px;color:var(--ink-muted);display:flex;gap:5px;align-items:center}
.txn-tag{background:var(--bg-alt);border-radius:3px;padding:1px 5px;font-size:10px;font-weight:600;color:var(--ink-muted)}
.rec-tag{background:var(--warn-bg);color:var(--warn);border-radius:3px;padding:1px 5px;font-size:10px;font-weight:700}
.txn-right{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0}
.txn-amt{font-family:'Playfair Display',serif;font-size:15px;font-weight:600}
.txn-amt.exp{color:var(--ink)}
.txn-amt.inc{color:var(--pos)}
.txn-edit-btn{font-size:10px;font-weight:700;color:var(--ink-muted);text-decoration:underline;text-underline-offset:2px;cursor:pointer;white-space:nowrap}
.txn-edit-btn:hover{color:var(--ink)}

/* Empty state */
.empty{text-align:center;padding:48px 20px;display:flex;flex-direction:column;align-items:center;gap:10px}
.empty-ico{font-size:32px;opacity:0.4}
.empty-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:600;color:var(--ink)}
.empty-body{font-size:13px;color:var(--ink-muted);line-height:1.6;max-width:250px}

/* FAB */
.fab{position:fixed;bottom:calc(64px + env(safe-area-inset-bottom,0px) + 14px);right:calc(50% - 215px + 20px);width:52px;height:52px;border-radius:15px;background:var(--ink);color:var(--bg);border:none;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(20,20,20,0.2),0 1px 4px rgba(20,20,20,0.1);z-index:50;transition:transform 140ms,box-shadow 140ms;font-family:'DM Sans',sans-serif}
.fab:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(20,20,20,0.24)}
.fab:active{transform:scale(0.94)}

/* Add / Edit overlay */
.add-overlay{position:fixed;inset:0;background:var(--bg);z-index:100;display:flex;flex-direction:column;max-width:430px;margin:0 auto;animation:addSlideIn 200ms cubic-bezier(0.32,0.72,0,1);overflow-y:auto}
@keyframes addSlideIn{from{transform:translateY(100%);opacity:0.6}to{transform:translateY(0);opacity:1}}
.add-topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;flex-shrink:0;border-bottom:1px solid var(--div)}
.add-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700}
.add-close{width:32px;height:32px;border-radius:50%;border:1px solid var(--div);background:transparent;color:var(--ink-muted);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color 120ms,color 120ms;font-family:'DM Sans',sans-serif}
.add-close:hover{border-color:var(--ink-muted);color:var(--ink)}
.add-body{flex:1;padding:16px 18px 32px;display:flex;flex-direction:column}

/* Amount zone */
.amount-zone{display:flex;align-items:baseline;justify-content:center;padding:12px 0 16px;border-bottom:1px solid var(--div);margin-bottom:18px;gap:3px}
.amount-sym{font-family:'Playfair Display',serif;font-size:30px;font-weight:400;color:var(--ink-faint)}
.amount-field{font-family:'Playfair Display',serif;font-size:58px;font-weight:900;letter-spacing:-3px;background:transparent;border:none;outline:none;color:var(--ink);width:210px;text-align:center;caret-color:var(--ink)}
.amount-field::placeholder{color:var(--ink-faint)}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
input[type=number]{-moz-appearance:textfield}

/* Type toggle */
.type-toggle{display:flex;border:1px solid var(--div);border-radius:7px;overflow:hidden;margin-bottom:16px}
.type-btn{flex:1;padding:10px;border:none;background:transparent;color:var(--ink-muted);font-size:13px;font-weight:700;cursor:pointer;transition:background 120ms,color 120ms;font-family:'DM Sans',sans-serif;letter-spacing:0.2px}
.type-btn:not(:last-child){border-right:1px solid var(--div)}
.type-btn.active{background:var(--ink);color:var(--bg)}

/* Category chips */
.cat-row{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;scrollbar-width:none}
.cat-row::-webkit-scrollbar{display:none}
.cat-chip{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px;width:58px;padding:8px 4px;border:1.5px solid var(--div);border-radius:9px;background:var(--bg-card);cursor:pointer;transition:border-color 100ms,background 100ms}
.cat-chip.sel{border-color:var(--ink);background:var(--bg-alt)}
.cat-chip-ico{font-size:19px;line-height:1}
.cat-chip-name{font-size:9px;font-weight:600;color:var(--ink-muted);text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%}
.cat-chip.sel .cat-chip-name{color:var(--ink)}

/* Form fields */
.field{margin-bottom:14px}
.field-lbl{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px;display:block}
.field-input{width:100%;background:var(--bg-card);border:1px solid var(--div);border-radius:7px;padding:10px 13px;font-size:14px;color:var(--ink);font-family:'DM Sans',sans-serif;transition:border-color 120ms}
.field-input:focus{outline:none;border-color:var(--ink-muted)}
.field-select{appearance:none;cursor:pointer}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* Toggle */
.toggle-row{display:flex;align-items:center;gap:10px;cursor:pointer}
.toggle-track{width:42px;height:23px;border-radius:12px;background:var(--div);position:relative;transition:background 150ms;flex-shrink:0;cursor:pointer}
.toggle-track.on{background:var(--ink)}
.toggle-knob{width:17px;height:17px;border-radius:50%;background:white;position:absolute;top:3px;left:3px;transition:transform 150ms cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 1px 3px rgba(0,0,0,0.18)}
.toggle-track.on .toggle-knob{transform:translateX(19px)}

/* Buttons */
.btn-primary{width:100%;padding:13px;background:var(--ink);color:var(--bg);border:1px solid var(--ink);border-radius:7px;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;letter-spacing:0.2px;transition:opacity 120ms;margin-top:8px}
.btn-primary:hover{opacity:0.85}
.btn-primary:active{opacity:0.7;transform:scale(0.99)}
.btn-ghost{width:100%;padding:12px;background:transparent;color:var(--ink-muted);border:1px solid var(--div);border-radius:7px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:border-color 120ms,color 120ms;margin-top:6px}
.btn-ghost:hover{border-color:var(--ink-muted);color:var(--ink)}
.btn-danger{color:var(--neg);border-color:var(--neg-bg)}
.btn-danger:hover{border-color:var(--neg)}

/* Search + filter */
.search-wrap{position:relative;margin-bottom:10px}
.search-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--ink-muted);font-size:14px;pointer-events:none}
.search-input{width:100%;background:var(--bg-card);border:1px solid var(--div);border-radius:7px;padding:9px 12px 9px 34px;font-size:13px;color:var(--ink);font-family:'DM Sans',sans-serif;transition:border-color 120ms}
.search-input:focus{outline:none;border-color:var(--ink-muted)}
.filter-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:10px;scrollbar-width:none}
.filter-strip::-webkit-scrollbar{display:none}
.filter-chip{flex-shrink:0;padding:5px 12px;border:1px solid var(--div);border-radius:99px;background:var(--bg-card);color:var(--ink-muted);font-size:11px;font-weight:600;cursor:pointer;transition:all 120ms;white-space:nowrap;font-family:'DM Sans',sans-serif}
.filter-chip.on{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.filter-chip:hover:not(.on){border-color:var(--ink-muted);color:var(--ink)}

/* Date range filter */
.date-range{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.date-range-field{display:flex;flex-direction:column;gap:4px}
.date-range-lbl{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--ink-muted)}
.date-range-input{background:var(--bg-card);border:1px solid var(--div);border-radius:6px;padding:7px 10px;font-size:12px;color:var(--ink);font-family:'DM Sans',sans-serif;width:100%}
.date-range-input:focus{outline:none;border-color:var(--ink-muted)}
.filter-toggle-btn{font-size:11px;font-weight:600;color:var(--ink-muted);cursor:pointer;text-decoration:underline;text-underline-offset:2px;background:none;border:none;font-family:'DM Sans',sans-serif;padding:0;margin-bottom:8px}
.filter-toggle-btn:hover{color:var(--ink)}

/* Settings sheet */
.settings-overlay{position:fixed;inset:0;background:rgba(20,20,20,0.4);backdrop-filter:blur(6px);z-index:80;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 150ms ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.settings-sheet{background:var(--bg);width:100%;max-width:430px;border-radius:18px 18px 0 0;border-top:1px solid var(--div);max-height:92vh;overflow-y:auto;animation:sheetUp 200ms cubic-bezier(0.32,0.72,0,1);padding:0 18px 40px}
@keyframes sheetUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
.sheet-handle{width:34px;height:4px;background:var(--div);border-radius:99px;margin:12px auto 18px}
.sheet-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;margin-bottom:20px}
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--div);gap:12px}
.settings-row:last-child{border-bottom:none}
.settings-row-lbl{font-size:14px;font-weight:600;color:var(--ink)}
.settings-row-sub{font-size:12px;color:var(--ink-muted);margin-top:2px}
.settings-btn{padding:7px 14px;border:1px solid var(--div);border-radius:6px;background:transparent;font-size:12px;font-weight:600;color:var(--ink-mid);cursor:pointer;font-family:'DM Sans',sans-serif;transition:border-color 120ms,color 120ms;white-space:nowrap}
.settings-btn:hover{border-color:var(--ink-muted);color:var(--ink)}
.settings-btn.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}

/* Analytics charts */
.chart-card{background:var(--bg-card);border:1px solid var(--div);border-radius:10px;padding:16px;margin-bottom:16px}
.chart-title{font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-muted);margin-bottom:14px}
.donut-wrap{display:flex;gap:16px;align-items:center}
.donut-legend{flex:1;display:flex;flex-direction:column;gap:7px;min-width:0}
.legend-row{display:flex;align-items:center;gap:8px}
.legend-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.legend-name{flex:1;font-size:12px;font-weight:500;color:var(--ink-mid);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.legend-amt{font-family:'Playfair Display',serif;font-size:12px;font-weight:700;color:var(--ink);flex-shrink:0}
.bar-chart-wrap{display:flex;align-items:flex-end;gap:5px;height:88px}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%}
.bar-fill{width:100%;border-radius:3px 3px 0 0;transition:height 0.5s cubic-bezier(0.34,1.56,0.64,1);min-height:2px;cursor:default}
.bar-lbl{font-size:9px;font-weight:700;color:var(--ink-muted);letter-spacing:0.3px;text-align:center}
.bar-amt{font-size:8px;font-weight:600;color:var(--ink-muted);text-align:center;white-space:nowrap}
.heatmap-grid{display:grid;grid-template-columns:28px repeat(7,1fr);gap:2px}
.heatmap-day-lbl{font-size:9px;font-weight:700;color:var(--ink-muted);text-align:right;padding-right:4px;display:flex;align-items:center;justify-content:flex-end;line-height:1}
.heatmap-col-lbl{font-size:9px;font-weight:700;color:var(--ink-muted);text-align:center;padding-bottom:3px}
.heat-cell{aspect-ratio:1;border-radius:3px;position:relative}
.heat-cell[title]:hover::after{content:attr(title);position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);font-size:10px;padding:3px 7px;border-radius:5px;white-space:nowrap;pointer-events:none;z-index:10;font-family:'DM Sans',sans-serif;font-weight:600}

/* Template manager */
.tpl-manage-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--div)}
.tpl-manage-row:last-child{border-bottom:none}
.tpl-manage-icon{font-size:18px;flex-shrink:0}
.tpl-manage-info{flex:1;min-width:0}
.tpl-manage-name{font-size:13px;font-weight:600;color:var(--ink)}
.tpl-manage-sub{font-size:11px;color:var(--ink-muted)}
.tpl-del-btn{font-size:13px;color:var(--ink-muted);cursor:pointer;padding:4px 6px;border:none;background:none;transition:color 120ms;flex-shrink:0}
.tpl-del-btn:hover{color:var(--neg)}
.tpl-edit-btn{font-size:11px;font-weight:600;color:var(--ink-muted);cursor:pointer;text-decoration:underline;text-underline-offset:2px;border:none;background:none;font-family:'DM Sans',sans-serif;padding:0;flex-shrink:0}
.tpl-edit-btn:hover{color:var(--ink)}

/* Backup banner */
.backup-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:var(--warn-bg);border-bottom:1px solid #D4A82A;font-size:12px;font-weight:600;color:var(--warn);animation:pageIn 300ms ease both}
.backup-banner-btn{flex-shrink:0;padding:5px 11px;background:var(--warn);color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap}
.backup-dismiss{background:transparent;border:none;color:var(--warn);font-size:14px;cursor:pointer;padding:2px 4px;flex-shrink:0}

/* Toast */
.toast{position:fixed;top:64px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 18px;border-radius:99px;font-size:13px;font-weight:600;z-index:300;white-space:nowrap;animation:toastIn 200ms ease;box-shadow:0 4px 16px rgba(20,20,20,0.2)}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
`;

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [state,    setState]    = useState(() => migrateAndLoad());
  const [tab,      setTab]      = useState("dashboard");
  const [tabKey,   setTabKey]   = useState(0);
  const [showAdd,  setShowAdd]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast,    setToast]    = useState(null);
  const [prefill,  setPrefill]  = useState(null);   // template or txn to edit
  const [editId,   setEditId]   = useState(null);   // null = new, id = editing
  const [showBackupBanner, setShowBackupBanner] = useState(() => {
    const s = readRaw(KEY);
    if (!s?.lastBackup) return true;
    return (Date.now() - new Date(s.lastBackup).getTime()) / 86400000 >= 7;
  });

  useEffect(() => { writeRaw(KEY, state); }, [state]);

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 2000);
  }, []);

  const switchTab = (t) => { setTab(t); setTabKey(k => k+1); };

  // ── Transaction CRUD ──────────────────────────────────────────────────────
  const addTransaction = useCallback((txn) => {
    setState(s => ({ ...s, transactions: [{ ...txn, id: Date.now()+Math.random() }, ...s.transactions] }));
    showToast("Transaction recorded");
  }, [showToast]);

  const updateTransaction = useCallback((id, txn) => {
    setState(s => ({ ...s, transactions: s.transactions.map(t => t.id === id ? { ...t, ...txn } : t) }));
    showToast("Transaction updated");
  }, [showToast]);

  const deleteTransaction = useCallback((id) => {
    if (!window.confirm("Delete this transaction?")) return;
    setState(s => ({ ...s, transactions: s.transactions.filter(t => t.id !== id) }));
    showToast("Deleted");
  }, [showToast]);

  // ── Template CRUD ─────────────────────────────────────────────────────────
  const addTemplate = useCallback((tpl) => {
    setState(s => ({ ...s, templates: [...s.templates, { ...tpl, id: "t"+Date.now() }] }));
    showToast("Template saved");
  }, [showToast]);

  const deleteTemplate = useCallback((id) => {
    setState(s => ({ ...s, templates: s.templates.filter(t => t.id !== id) }));
    showToast("Template deleted");
  }, [showToast]);

  // ── Open add form ─────────────────────────────────────────────────────────
  const openAdd = useCallback((prefillData = null, existingId = null) => {
    setPrefill(prefillData);
    setEditId(existingId);
    setShowAdd(true);
  }, []);

  const closeAdd = useCallback(() => {
    setShowAdd(false); setPrefill(null); setEditId(null);
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const rows = [["Date","Type","Category","Amount","Note","Recurring"]];
    state.transactions.forEach(t => rows.push([t.date,t.type,t.category,t.amount.toFixed(2),t.note||"",t.recurring?t.recurFreq:""]));
    const csv = rows.map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    a.download = `ledger-${today()}.csv`; a.click();
    showToast("CSV exported");
  }, [state.transactions, showToast]);

  const exportJSON = useCallback(() => {
    const now = new Date().toISOString();
    const payload = JSON.stringify({ ...state, exportedAt: now, version: 5 }, null, 2);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([payload],{type:"application/json"}));
    a.download = `ledger-backup-${today()}.json`; a.click();
    setState(s => ({ ...s, lastBackup: now }));
    setShowBackupBanner(false);
    showToast(`Backup saved — ${state.transactions.length} transactions`);
  }, [state, showToast]);

  const importJSON = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target.result;
        const isCSV = file.name?.toLowerCase().endsWith(".csv") || raw.trimStart().startsWith("Date,") || raw.trimStart().startsWith("date,");

        let txns = [];
        let parsed = null;

        if (isCSV) {
          // ── Parse CSV ──────────────────────────────────────────────────────
          const lines = raw.trim().split(/\r?\n/);
          const headers = lines[0].toLowerCase().split(",").map(h => h.replace(/"/g,"").trim());
          txns = lines.slice(1).filter(l => l.trim()).map((line, i) => {
            // Handle quoted fields
            const fields = [];
            let cur = "", inQuote = false;
            for (const ch of line) {
              if (ch === '"') { inQuote = !inQuote; }
              else if (ch === "," && !inQuote) { fields.push(cur.trim()); cur = ""; }
              else cur += ch;
            }
            fields.push(cur.trim());

            const get = (keys) => {
              for (const k of keys) {
                const idx = headers.indexOf(k);
                if (idx !== -1 && fields[idx]) return fields[idx].replace(/^"|"$/g,"").trim();
              }
              return "";
            };

            const amount = Math.abs(parseFloat(get(["amount","amt","value"])) || 0);
            const type   = get(["type"]) || (amount >= 0 ? "expense" : "income");
            const date   = get(["date"]) || new Date().toISOString().slice(0,10);

            return {
              id:        Date.now() + i + Math.random(),
              type:      type.toLowerCase().includes("inc") ? "income" : "expense",
              amount,
              category:  get(["category","cat"]) || "other",
              note:      get(["note","description","notes","memo"]) || "",
              date:      date.slice(0,10),
              recurring: get(["recurring","recur"])?.toLowerCase() === "yes" || false,
              recurFreq: get(["recurfreq","frequency","freq"]) || null,
            };
          }).filter(t => t.amount > 0);

        } else {
          // ── Parse JSON — handle every known shape ──────────────────────────
          parsed = JSON.parse(raw);

          // Shape 1: { transactions: [...] }
          if (Array.isArray(parsed.transactions)) txns = parsed.transactions;
          // Shape 2: { entries: [...] }
          else if (Array.isArray(parsed.entries))     txns = parsed.entries;
          // Shape 3: { data: { transactions: [...] } }
          else if (Array.isArray(parsed.data?.transactions)) txns = parsed.data.transactions;
          // Shape 4: raw array at root
          else if (Array.isArray(parsed))             txns = parsed;
          // Shape 5: object with numeric keys (some export formats)
          else {
            const vals = Object.values(parsed);
            const arrVal = vals.find(v => Array.isArray(v) && v.length > 0 && v[0]?.amount !== undefined);
            if (arrVal) txns = arrVal;
          }
        }

        if (!txns.length) {
          showToast("No transactions found in this file");
          alert(
            "Could not find transactions in this file.\n\n" +
            "For JSON: the file should contain a 'transactions' array.\n" +
            "For CSV: the file should have columns: Date, Type, Amount, Category, Note.\n\n" +
            "If you exported from this app, use the JSON backup file (not the CSV)."
          );
          return;
        }

        const normalisedTxns = txns.map(normaliseTxn).filter(t => t.amount > 0);

        if (!window.confirm(`Found ${normalisedTxns.length} transactions. Restore them? This will merge with your current data — nothing existing will be deleted.`)) return;

        setState(s => {
          const existingIds = new Set(s.transactions.map(t => String(t.id)));
          const newTxns = normalisedTxns.filter(t => !existingIds.has(String(t.id)));
          const merged  = [...newTxns, ...s.transactions].sort((a,b) => b.date.localeCompare(a.date));
          return {
            ...s,
            transactions: merged,
            budgets:    parsed?.budgets    || s.budgets,
            categories: parsed?.categories || s.categories,
            templates:  parsed?.templates  || s.templates,
            currency:   parsed?.currency   || s.currency,
          };
        });

        showToast(`Restored ${normalisedTxns.length} transactions`);
      } catch (err) {
        console.error("Import error:", err);
        showToast("Could not read file");
        alert("Import failed: " + err.message + "\n\nMake sure you're uploading the JSON backup file downloaded from this app.");
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  const { transactions, budgets, categories, templates, currency } = state;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {toast && <div className="toast">{toast}</div>}

        {showBackupBanner && transactions.length > 0 && (
          <div className="backup-banner">
            <span>⚠ Back up your data — download a JSON file to keep it safe</span>
            <button className="backup-banner-btn" onClick={exportJSON}>Back up now</button>
            <button className="backup-dismiss" onClick={() => setShowBackupBanner(false)}>✕</button>
          </div>
        )}

        <header className="topbar">
          <span className="wordmark">Expense Ledger</span>
          <div className="topbar-right">
            <button className="icon-btn" onClick={() => setShowSettings(true)}>≡</button>
          </div>
        </header>

        <main className="page" key={tabKey}>
          {tab === "dashboard" && (
            <Dashboard
              transactions={transactions} budgets={budgets} categories={categories}
              templates={templates} currency={currency}
              onAddClick={() => openAdd()}
              onTemplateClick={(tpl) => openAdd({ type:"expense", amount:tpl.amount, category:tpl.catId, note:tpl.note || tpl.name, recurring:false, recurFreq:null })}
            />
          )}
          {tab === "ledger" && (
            <Ledger
              transactions={transactions} categories={categories} currency={currency}
              onDelete={deleteTransaction}
              onEdit={(txn) => openAdd(txn, txn.id)}
              onAddClick={() => openAdd()}
            />
          )}
          {tab === "analytics" && (
            <Analytics transactions={transactions} categories={categories} currency={currency} />
          )}
        </main>

        <button className="fab" onClick={() => openAdd()} aria-label="Add transaction">+</button>

        <nav className="tabbar">
          {[
            { id:"dashboard", icon:"◈", label:"Home"      },
            { id:"ledger",    icon:"≡", label:"Ledger"    },
            { id:"analytics", icon:"◎", label:"Analytics" },
          ].map(t => (
            <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={() => switchTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-lbl">{t.label}</span>
              {tab === t.id && <span className="tab-dot" />}
            </button>
          ))}
        </nav>

        {showAdd && (
          <AddEditOverlay
            categories={categories} templates={templates} currency={currency}
            transactions={transactions} prefill={prefill} editId={editId}
            onSave={(txn) => {
              if (editId) updateTransaction(editId, txn);
              else addTransaction(txn);
              closeAdd();
            }}
            onClose={closeAdd}
          />
        )}

        {showSettings && (
          <SettingsPanel
            state={state}
            onExportCSV={exportCSV} onExportJSON={exportJSON} onImportJSON={importJSON}
            onSetBudget={(catId, amount) => setState(s => ({ ...s, budgets: { ...s.budgets, [catId]: amount } }))}
            onCurrencyChange={(c) => setState(s => ({ ...s, currency: c }))}
            onAddTemplate={addTemplate} onDeleteTemplate={deleteTemplate}
            onClose={() => setShowSettings(false)}
            showToast={showToast}
          />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ transactions, budgets, categories, templates, currency, onAddClick, onTemplateClick }) {
  const now  = curMon();
  const prev = (() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();

  const curTxns = transactions.filter(t => t.date.startsWith(now));
  const curExp  = curTxns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const curInc  = curTxns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const net     = curInc - curExp;
  const prevExp = transactions.filter(t=>t.date.startsWith(prev)&&t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const expDiff = prevExp > 0 ? ((curExp-prevExp)/prevExp*100) : 0;

  const catSpend = {};
  curTxns.filter(t=>t.type==="expense").forEach(t => { catSpend[t.category]=(catSpend[t.category]||0)+t.amount; });
  const activeBudgets = Object.entries(budgets).filter(([,v])=>v>0);
  const recent = transactions.slice(0, 6);

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">{new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</div>
        <div className={`hero-number${net>=0?" pos":" neg"}`}>
          {net<0?"−":""}{fmt(Math.abs(net),currency)}
        </div>
        <div className="hero-sub">
          {net>=0?"surplus this month":"deficit this month"}
          {prevExp>0 && (
            <span style={{marginLeft:8,color:expDiff>0?"var(--neg)":"var(--pos)",fontWeight:600}}>
              · {expDiff>0?"▲":"▼"}{Math.abs(expDiff).toFixed(0)}% vs last month
            </span>
          )}
        </div>
        <div className="hero-row">
          <div className="hero-cell">
            <div className={`hero-cell-val${curInc>0?" pos":""}`}>{fmt(curInc,currency)}</div>
            <div className="hero-cell-lbl">Income</div>
          </div>
          <div className="hero-cell">
            <div className={`hero-cell-val${curExp>0?" neg":""}`}>{fmt(curExp,currency)}</div>
            <div className="hero-cell-lbl">Spent</div>
          </div>
          <div className="hero-cell">
            <div className="hero-cell-val" style={{color:curInc>0?"var(--pos)":"var(--ink-muted)"}}>
              {curInc>0?`${Math.max(0,Math.round(((curInc-curExp)/curInc)*100))}%`:"—"}
            </div>
            <div className="hero-cell-lbl">Saved</div>
          </div>
        </div>
      </div>

      {/* Quick-add templates */}
      {templates.length > 0 && (
        <>
          <div className="sec-hdr">
            <span className="sec-title">Quick Add</span>
          </div>
          <div className="tpl-strip">
            {templates.map(tpl => (
              <button key={tpl.id} className="tpl-chip" onClick={() => onTemplateClick(tpl)}>
                <span>{tpl.icon}</span>
                {tpl.name}
                <span className="tpl-amt">{fmt(tpl.amount,currency)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Budget bars */}
      {activeBudgets.length > 0 && (
        <div className="budget-block">
          <div className="sec-hdr"><span className="sec-title">Budgets</span></div>
          {activeBudgets.map(([catId,limit]) => {
            const cat   = categories.find(c=>c.id===catId);
            const spent = catSpend[catId]||0;
            const pct   = Math.min((spent/limit)*100,100);
            const over  = spent>limit, warn=pct>=80&&!over;
            return (
              <div key={catId} className="budget-row">
                <div className="budget-hdr">
                  <span className="budget-name">{cat?.icon} {cat?.name}</span>
                  <span className="budget-nums"><b>{fmt(spent,currency)}</b> / {fmt(limit,currency)}</span>
                </div>
                <div className="budget-track">
                  <div className="budget-fill" style={{width:`${pct}%`,background:over?"var(--neg)":warn?"var(--warn)":(cat?.color||"var(--ink-mid)")}} />
                </div>
                <div className={`budget-msg${over?" over":warn?" warn":""}`}>
                  {over?`${fmt(spent-limit,currency)} over limit`:warn?`${fmt(limit-spent,currency)} left — watch this`:`${fmt(limit-spent,currency)} remaining`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent */}
      {recent.length > 0 ? (
        <>
          <div className="sec-hdr"><span className="sec-title">Recent</span></div>
          <div className="txn-card">
            {recent.map(t => <TxnRow key={t.id} txn={t} categories={categories} currency={currency} />)}
          </div>
        </>
      ) : (
        <div className="empty">
          <div className="empty-ico">◌</div>
          <div className="empty-title">Nothing recorded yet</div>
          <div className="empty-body">Tap + to add your first transaction, or use a Quick Add template above.</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER
// ─────────────────────────────────────────────────────────────────────────────
function Ledger({ transactions, categories, currency, onDelete, onEdit, onAddClick }) {
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [showDates,  setShowDates]  = useState(false);

  const filtered = useMemo(() => {
    let t = [...transactions];
    if (search)           t = t.filter(x=>(x.note||"").toLowerCase().includes(search.toLowerCase())||x.category.toLowerCase().includes(search.toLowerCase()));
    if (catFilter!=="all")  t = t.filter(x=>x.category===catFilter);
    if (typeFilter!=="all") t = t.filter(x=>x.type===typeFilter);
    if (dateFrom)         t = t.filter(x=>x.date>=dateFrom);
    if (dateTo)           t = t.filter(x=>x.date<=dateTo);
    return t;
  }, [transactions, search, catFilter, typeFilter, dateFrom, dateTo]);

  const usedCats = useMemo(() =>
    [...new Set(transactions.map(t=>t.category))].map(id=>categories.find(c=>c.id===id)).filter(Boolean),
    [transactions, categories]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(t => { (g[t.date]=g[t.date]||[]).push(t); });
    return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]));
  }, [filtered]);

  const hasDateFilter = dateFrom || dateTo;

  if (transactions.length === 0) return (
    <div className="empty">
      <div className="empty-ico">≡</div>
      <div className="empty-title">No transactions yet</div>
      <div className="empty-body">Start recording to build your ledger.</div>
      <button className="btn-primary" style={{width:"auto",padding:"11px 24px",marginTop:12}} onClick={onAddClick}>Add first transaction</button>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
        <span className="playfair" style={{fontSize:20,fontWeight:700}}>Ledger</span>
        <span style={{fontSize:12,color:"var(--ink-muted)"}}>{filtered.length} of {transactions.length}</span>
      </div>

      <div className="search-wrap">
        <span className="search-ico">⌕</span>
        <input className="search-input" placeholder="Search note or category…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <div className="filter-strip">
        {["all","expense","income"].map(t=>(
          <button key={t} className={`filter-chip${typeFilter===t?" on":""}`} onClick={()=>setTypeFilter(t)}>
            {t==="all"?"All":t==="expense"?"Expenses":"Income"}
          </button>
        ))}
      </div>

      <div className="filter-strip">
        <button className={`filter-chip${catFilter==="all"?" on":""}`} onClick={()=>setCatFilter("all")}>All categories</button>
        {usedCats.map(c=>(
          <button key={c.id} className={`filter-chip${catFilter===c.id?" on":""}`} onClick={()=>setCatFilter(catFilter===c.id?"all":c.id)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <button className="filter-toggle-btn" onClick={()=>setShowDates(s=>!s)}>
        {showDates?"Hide date filter ↑":"Filter by date range ↓"}
        {hasDateFilter&&!showDates && <span style={{color:"var(--warn)",marginLeft:5}}>●</span>}
      </button>

      {showDates && (
        <div className="date-range">
          <div className="date-range-field">
            <span className="date-range-lbl">From</span>
            <input type="date" className="date-range-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          </div>
          <div className="date-range-field">
            <span className="date-range-lbl">To</span>
            <input type="date" className="date-range-input" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          </div>
        </div>
      )}

      {hasDateFilter && (
        <div style={{marginBottom:8}}>
          <button className="filter-chip on" onClick={()=>{setDateFrom("");setDateTo("");}}>
            Clear dates ✕
          </button>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="empty" style={{padding:"32px 0"}}>
          <div className="empty-ico">⌕</div>
          <div className="empty-title">No results</div>
          <div className="empty-body">Try adjusting your search or filters.</div>
        </div>
      ) : (
        grouped.map(([date,txns]) => {
          const dayTotal = txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
          return (
            <div key={date} className="txn-group">
              <div className="txn-date-hdr">
                <span className="txn-date-lbl">{fmtDate(date)}</span>
                {dayTotal>0 && <span className="txn-date-total">{fmt(dayTotal,currency)}</span>}
              </div>
              <div className="txn-card">
                {txns.map(t=><TxnRow key={t.id} txn={t} categories={categories} currency={currency} onDelete={onDelete} onEdit={onEdit} />)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
function Analytics({ transactions, categories, currency }) {
  const expenses = transactions.filter(t=>t.type==="expense");
  const now = curMon();

  // Month-over-month: last 6 months
  const months6 = Array.from({length:6},(_,i)=>{
    const d = new Date(); d.setMonth(d.getMonth()-(5-i));
    return d.toISOString().slice(0,7);
  });
  const monthlyAmts = months6.map(m=>({
    label: monthLabel(m),
    exp:   expenses.filter(t=>t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0),
    inc:   transactions.filter(t=>t.type==="income"&&t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0),
  }));
  const maxBar = Math.max(...monthlyAmts.map(m=>Math.max(m.exp,m.inc)),1);

  // Donut: current month category breakdown
  const catSpend = {};
  expenses.filter(t=>t.date.startsWith(now)).forEach(t=>{catSpend[t.category]=(catSpend[t.category]||0)+t.amount;});
  const totalCurExp = Object.values(catSpend).reduce((s,v)=>s+v,0);
  const catData = Object.entries(catSpend)
    .map(([id,amt])=>({...(categories.find(c=>c.id===id)||{id,name:id,icon:"◦",color:"#888"}),amt}))
    .sort((a,b)=>b.amt-a.amt);

  // Heatmap: last 8 weeks (Mon–Sun)
  const DAY_LABELS = ["Mo","Tu","We","Th","Fr","Sa","Su"];
  // Build 8 rows × 7 cols grid (each row = one week, Mon first)
  const heatRows = [];
  const refDate = new Date();
  // Find the most recent Sunday
  const refDay = refDate.getDay(); // 0=Sun
  const daysToLastSun = refDay === 0 ? 0 : refDay;
  const lastSun = new Date(refDate); lastSun.setDate(refDate.getDate() - daysToLastSun);

  for (let w = 7; w >= 0; w--) {
    const row = [];
    for (let d = 1; d <= 7; d++) { // Mon=1 .. Sun=7
      const dt = new Date(lastSun);
      dt.setDate(lastSun.getDate() - (w*7) + (d - 7)); // offset from last Sunday
      const ds = dt.toISOString().slice(0,10);
      const amt = expenses.filter(t=>t.date===ds).reduce((s,t)=>s+t.amount,0);
      row.push({ date: ds, amt });
    }
    heatRows.push(row);
  }
  const maxHeat = Math.max(...heatRows.flat().map(c=>c.amt),1);

  if (expenses.length === 0) return (
    <div className="empty">
      <div className="empty-ico">◎</div>
      <div className="empty-title">No data yet</div>
      <div className="empty-body">Add at least a few transactions to see charts and spending patterns.</div>
    </div>
  );

  return (
    <div>
      <div className="playfair" style={{fontSize:20,fontWeight:700,marginBottom:18}}>Analytics</div>

      {/* Category donut */}
      {catData.length > 0 && (
        <div className="chart-card">
          <div className="chart-title">This Month · By Category</div>
          <div className="donut-wrap">
            <DonutChart data={catData} total={totalCurExp} />
            <div className="donut-legend">
              {catData.slice(0,7).map((c,i)=>(
                <div key={i} className="legend-row">
                  <div className="legend-dot" style={{background:c.color}} />
                  <span className="legend-name">{c.icon} {c.name}</span>
                  <span className="legend-amt">{fmt(c.amt,currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6-month comparison */}
      <div className="chart-card">
        <div className="chart-title">6-Month Comparison</div>
        <div className="bar-chart-wrap">
          {monthlyAmts.map((m,i)=>(
            <div key={i} className="bar-col">
              <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end",gap:2}}>
                {/* Income bar */}
                <div className="bar-fill" style={{
                  height:`${(m.inc/maxBar)*100}%`,
                  flex:1,
                  background:"var(--pos)",
                  opacity:0.35,
                  borderRadius:"3px 3px 0 0",
                }} title={`Income: ${fmt(m.inc,currency)}`} />
                {/* Expense bar */}
                <div className="bar-fill" style={{
                  height:`${(m.exp/maxBar)*100}%`,
                  flex:1,
                  background:i===5?"var(--ink)":"var(--ink-faint)",
                  borderRadius:"3px 3px 0 0",
                }} title={`Expenses: ${fmt(m.exp,currency)}`} />
              </div>
              <div className="bar-lbl" style={{color:i===5?"var(--ink)":"var(--ink-muted)",fontWeight:i===5?700:600}}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12,marginTop:10}}>
          <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--ink-muted)",fontWeight:600}}>
            <span style={{width:10,height:10,borderRadius:2,background:"var(--ink)",display:"inline-block"}} />Expenses
          </span>
          <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--ink-muted)",fontWeight:600}}>
            <span style={{width:10,height:10,borderRadius:2,background:"var(--pos)",opacity:0.5,display:"inline-block"}} />Income
          </span>
        </div>
      </div>

      {/* Weekly heatmap */}
      <div className="chart-card">
        <div className="chart-title">Weekly Spending · Last 8 Weeks</div>
        {/* Column headers: Mon–Sun */}
        <div className="heatmap-grid">
          <div /> {/* empty corner */}
          {DAY_LABELS.map(d=>(
            <div key={d} className="heatmap-col-lbl">{d}</div>
          ))}
          {heatRows.map((row,wi)=>(
            <>
              <div key={`lbl-${wi}`} className="heatmap-day-lbl">
                {/* Show week label on first col of each row */}
                <span style={{fontSize:8,color:"var(--ink-faint)"}}>{wi===7?"now":""}</span>
              </div>
              {row.map((cell,di)=>{
                const intensity = cell.amt>0 ? Math.max(0.12, (cell.amt/maxHeat)*0.88) : 0;
                const isToday   = cell.date===today();
                return (
                  <div key={`${wi}-${di}`} className="heat-cell"
                    title={`${fmtDate(cell.date)}: ${fmt(cell.amt,currency)}`}
                    style={{
                      background: cell.amt>0 ? `rgba(139,26,26,${intensity})` : "var(--bg-alt)",
                      outline: isToday ? "1.5px solid var(--ink)" : "none",
                      outlineOffset: "1px",
                    }}
                  />
                );
              })}
            </>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10,justifyContent:"flex-end"}}>
          <span style={{fontSize:10,color:"var(--ink-muted)"}}>Less</span>
          {[0.1,0.3,0.55,0.8].map(o=>(
            <div key={o} style={{width:11,height:11,borderRadius:2,background:`rgba(139,26,26,${o})`}} />
          ))}
          <span style={{fontSize:10,color:"var(--ink-muted)"}}>More</span>
        </div>
      </div>

      {/* Top expenses this month */}
      {catData.length > 0 && (
        <div className="chart-card">
          <div className="chart-title">Top Expenses This Month</div>
          {catData.slice(0,5).map((c,i)=>{
            const pct = totalCurExp>0?(c.amt/totalCurExp*100):0;
            return (
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600}}>{c.icon} {c.name}</span>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700}}>{fmt(c.amt,currency)}</span>
                </div>
                <div style={{height:3,background:"var(--div)",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:c.color,borderRadius:99,transition:"width 0.6s ease"}} />
                </div>
                <div style={{fontSize:10,color:"var(--ink-muted)",marginTop:2,fontWeight:600}}>{pct.toFixed(0)}% of spending</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, total }) {
  const size=100, stroke=16, r=(size-stroke)/2, circ=2*Math.PI*r;
  let off=0;
  const segs = data.slice(0,8).filter(d=>d.amt>0).map(d=>{
    const pct=d.amt/Math.max(total,1);
    const seg={...d,pct,dash:`${pct*circ} ${circ}`,offset:-(off*circ)+(circ/4)};
    off+=pct; return seg;
  });
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--div)" strokeWidth={stroke} />
        {segs.map((s,i)=>(
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={s.color} strokeWidth={stroke-2}
            strokeDasharray={s.dash} strokeDashoffset={s.offset}
            style={{transition:`stroke-dasharray 0.5s ${i*0.06}s ease`}}
          />
        ))}
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",color:"var(--ink-muted)"}}>Total</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:"var(--ink)"}}>{`${Math.round(total)}`}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION ROW
// ─────────────────────────────────────────────────────────────────────────────
function TxnRow({ txn, categories, currency, onDelete, onEdit }) {
  const cat   = categories.find(c=>c.id===txn.category)||{icon:"◦",color:"#888",name:txn.category};
  const isInc = txn.type==="income";
  return (
    <div className="txn-row">
      <div className="txn-ico" style={{background:cat.color+"1A"}}>{cat.icon}</div>
      <div className="txn-info">
        <div className="txn-name">{cat.name}</div>
        {txn.note ? (
          <div className="txn-note">{txn.note}</div>
        ) : (
          <div className="txn-meta">
            <span>{txn.date}</span>
            {txn.recurring && <span className="rec-tag">↻ {txn.recurFreq}</span>}
          </div>
        )}
        {txn.note && (
          <div className="txn-meta" style={{marginTop:2}}>
            <span>{fmtDate(txn.date)}</span>
            {txn.recurring && <span className="rec-tag">↻ {txn.recurFreq}</span>}
          </div>
        )}
      </div>
      <div className="txn-right">
        <div className={`txn-amt ${isInc?"inc":"exp"}`}>
          {isInc?"+":"−"}{fmt(txn.amount,currency)}
        </div>
        {(onEdit || onDelete) && (
          <div style={{display:"flex",gap:8}}>
            {onEdit && <button className="txn-edit-btn" onClick={e=>{e.stopPropagation();onEdit(txn);}}>edit</button>}
            {onDelete && <button className="txn-edit-btn" style={{color:"var(--neg)"}} onClick={e=>{e.stopPropagation();onDelete(txn.id);}}>delete</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD / EDIT OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
function AddEditOverlay({ categories, templates, currency, transactions, prefill, editId, onSave, onClose }) {
  const isEditing = !!editId;
  const [type,   setType]   = useState(prefill?.type      || "expense");
  const [amount, setAmount] = useState(prefill?.amount    ? String(prefill.amount) : "");
  const [catId,  setCatId]  = useState(prefill?.category  || "food");
  const [note,   setNote]   = useState(prefill?.note      || "");
  const [date,   setDate]   = useState(prefill?.date      || today());
  const [recur,  setRecur]  = useState(prefill?.recurring || false);
  const [freq,   setFreq]   = useState(prefill?.recurFreq || "monthly");
  const [err,    setErr]    = useState("");
  const amtRef = useRef();

  const expCats = categories.filter(c=>!["salary","freelance"].includes(c.id));
  const incCats = categories.filter(c=>["salary","freelance","other"].includes(c.id));
  const displayCats = type==="income"?incCats:expCats;

  useEffect(() => { setTimeout(()=>amtRef.current?.focus(),50); }, []);
  useEffect(() => {
    if (!prefill) setCatId(type==="income"?"salary":"food");
  }, [type]);

  // Duplicate detection (only for new transactions)
  const isDupe = useMemo(() => {
    if (isEditing || !amount || !parseFloat(amount)) return false;
    const amt = parseFloat(amount);
    const tenMinAgo = Date.now()-10*60*1000;
    return transactions.some(t=>t.category===catId&&Math.abs(t.amount-amt)<0.01&&new Date(t.date+"T00:00:00").getTime()>tenMinAgo);
  }, [amount, catId, transactions, isEditing]);

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt||amt<=0) { setErr("Enter a valid amount"); return; }
    onSave({ type, amount:amt, category:catId, note:note.trim(), date, recurring:recur, recurFreq:recur?freq:null });
  };

  return (
    <div className="add-overlay">
      <div className="add-topbar">
        <span className="add-title">{isEditing?"Edit Transaction":"New Transaction"}</span>
        <button className="add-close" onClick={onClose}>✕</button>
      </div>
      <div className="add-body">

        <div className="type-toggle">
          <button className={`type-btn${type==="expense"?" active":""}`} onClick={()=>setType("expense")}>Expense</button>
          <button className={`type-btn${type==="income"?" active":""}`}  onClick={()=>setType("income")}>Income</button>
        </div>

        <div className="amount-zone">
          <span className="amount-sym">{currency}</span>
          <input
            ref={amtRef}
            className="amount-field"
            type="number" inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={e=>{setAmount(e.target.value);setErr("");}}
            min="0" step="0.01"
          />
        </div>

        {err && <div style={{color:"var(--neg)",fontSize:12,textAlign:"center",marginBottom:12,fontWeight:600}}>{err}</div>}

        {isDupe && (
          <div style={{background:"var(--warn-bg)",border:"1px solid #D4A82A",borderRadius:6,padding:"9px 13px",fontSize:12,fontWeight:600,color:"var(--warn)",marginBottom:12,display:"flex",alignItems:"center",gap:7}}>
            ⚠ Similar transaction recorded recently — double entry?
          </div>
        )}

        <div className="field">
          <div className="field-lbl">Category</div>
          <div className="cat-row">
            {displayCats.map(cat=>(
              <button key={cat.id} className={`cat-chip${catId===cat.id?" sel":""}`} onClick={()=>setCatId(cat.id)}>
                <span className="cat-chip-ico">{cat.icon}</span>
                <span className="cat-chip-name">{cat.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-lbl">Note <span style={{color:"var(--ink-faint)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></div>
          <input className="field-input" placeholder="e.g., Weekly shop, Barber, Netflix"
            value={note} onChange={e=>setNote(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&submit()}
          />
        </div>

        <div className="field-row" style={{marginBottom:14}}>
          <div className="field">
            <div className="field-lbl">Date</div>
            <input className="field-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="field">
            <div className="field-lbl">Recurring</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
              <div className={`toggle-track${recur?" on":""}`} onClick={()=>setRecur(r=>!r)} role="switch" aria-checked={recur}>
                <div className="toggle-knob" />
              </div>
              {recur && (
                <select className="field-select" value={freq} onChange={e=>setFreq(e.target.value)}
                  style={{fontSize:12,color:"var(--ink)",background:"transparent",border:"none",outline:"none",cursor:"pointer"}}>
                  {["weekly","biweekly","monthly","yearly"].map(f=>(
                    <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <button className="btn-primary" onClick={submit}>
          {isEditing?"Save Changes":`Save ${type==="income"?"Income":"Expense"}`}
        </button>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────────────
function SettingsPanel({ state, onExportCSV, onExportJSON, onImportJSON, onSetBudget, onCurrencyChange, onAddTemplate, onDeleteTemplate, onClose, showToast }) {
  const { transactions, budgets, categories, templates, currency } = state;
  const [curSymbol,  setCurSymbol]  = useState(currency);
  const [editBudget, setEditBudget] = useState(null);
  const [budgetVal,  setBudgetVal]  = useState("");
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [tplName,    setTplName]    = useState("");
  const [tplAmt,     setTplAmt]     = useState("");
  const [tplCatId,   setTplCatId]   = useState("food");
  const [tplNote,    setTplNote]    = useState("");
  const [tplIcon,    setTplIcon]    = useState("⚡");
  const fileRef = useRef();

  const totalInc = transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExp = transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  const saveTpl = () => {
    if (!tplName.trim()||!parseFloat(tplAmt)) { showToast("Name and amount required"); return; }
    onAddTemplate({ name:tplName.trim(), amount:parseFloat(tplAmt), catId:tplCatId, note:tplNote.trim(), icon:tplIcon });
    setTplName(""); setTplAmt(""); setTplNote(""); setTplIcon("⚡");
    setShowNewTpl(false);
  };

  return (
    <div className="settings-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="settings-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">Settings</div>

        {/* Account summary */}
        <div style={{background:"var(--bg-alt)",borderRadius:8,padding:"14px",marginBottom:20}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--ink-muted)",marginBottom:10}}>Overview</div>
          {[
            ["Total income",   fmt(totalInc,currency),"var(--pos)"],
            ["Total expenses", fmt(totalExp,currency),"var(--neg)"],
            ["Net balance",    fmt(totalInc-totalExp,currency),totalInc>=totalExp?"var(--pos)":"var(--neg)"],
            ["Transactions",   String(transactions.length),"var(--ink)"],
          ].map(([lbl,val,col])=>(
            <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--div)"}}>
              <span style={{fontSize:13,color:"var(--ink-muted)"}}>{lbl}</span>
              <span style={{fontSize:13,fontWeight:700,color:col,fontFamily:"'Playfair Display',serif"}}>{val}</span>
            </div>
          ))}
        </div>

        {/* Currency */}
        <div className="settings-row">
          <div>
            <div className="settings-row-lbl">Currency symbol</div>
            <div className="settings-row-sub">Currently: {currency}</div>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <input className="field-input" value={curSymbol} onChange={e=>setCurSymbol(e.target.value)} maxLength={3}
              style={{width:56,textAlign:"center",padding:"7px 10px"}} />
            <button className="settings-btn primary" onClick={()=>{onCurrencyChange(curSymbol);showToast("Currency updated");}}>Save</button>
          </div>
        </div>

        {/* Quick-add templates */}
        <div style={{padding:"14px 0"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--ink-muted)",marginBottom:12}}>Quick-Add Templates</div>

          {templates.length === 0 && (
            <div style={{fontSize:13,color:"var(--ink-muted)",padding:"8px 0",marginBottom:8}}>No templates yet. Add one below.</div>
          )}

          {templates.map(tpl=>(
            <div key={tpl.id} className="tpl-manage-row">
              <span className="tpl-manage-icon">{tpl.icon}</span>
              <div className="tpl-manage-info">
                <div className="tpl-manage-name">{tpl.name}</div>
                <div className="tpl-manage-sub">{fmt(tpl.amount,currency)} · {categories.find(c=>c.id===tpl.catId)?.name||tpl.catId}</div>
              </div>
              <button className="tpl-del-btn" onClick={()=>onDeleteTemplate(tpl.id)} title="Delete template">✕</button>
            </div>
          ))}

          {showNewTpl ? (
            <div style={{background:"var(--bg-alt)",borderRadius:8,padding:14,marginTop:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div className="field" style={{marginBottom:0}}>
                  <div className="field-lbl">Name</div>
                  <input className="field-input" placeholder="e.g., Lunch" value={tplName} onChange={e=>setTplName(e.target.value)} />
                </div>
                <div className="field" style={{marginBottom:0}}>
                  <div className="field-lbl">Amount ({currency})</div>
                  <input className="field-input" type="number" placeholder="0.00" min="0" step="0.01" value={tplAmt} onChange={e=>setTplAmt(e.target.value)} />
                </div>
                <div className="field" style={{marginBottom:0}}>
                  <div className="field-lbl">Category</div>
                  <select className="field-input field-select" value={tplCatId} onChange={e=>setTplCatId(e.target.value)}>
                    {categories.filter(c=>!["salary","freelance"].includes(c.id)).map(c=>(
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{marginBottom:0}}>
                  <div className="field-lbl">Icon</div>
                  <input className="field-input" placeholder="⚡" value={tplIcon} onChange={e=>setTplIcon(e.target.value)} maxLength={2} style={{textAlign:"center",fontSize:20}} />
                </div>
              </div>
              <div className="field" style={{marginBottom:10}}>
                <div className="field-lbl">Note (optional)</div>
                <input className="field-input" placeholder="Pre-filled note" value={tplNote} onChange={e=>setTplNote(e.target.value)} />
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn-primary" style={{marginTop:0,flex:1,padding:"10px"}} onClick={saveTpl}>Save Template</button>
                <button className="btn-ghost"   style={{marginTop:0,flex:1,padding:"10px"}} onClick={()=>setShowNewTpl(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="settings-btn" style={{marginTop:10,width:"100%",textAlign:"center"}} onClick={()=>setShowNewTpl(true)}>
              + Add Template
            </button>
          )}
        </div>

        {/* Budgets */}
        <div style={{padding:"14px 0"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--ink-muted)",marginBottom:12}}>Monthly Budgets</div>
          {categories.filter(c=>!["salary","freelance"].includes(c.id)).map((cat,i,arr)=>{
            const limit = budgets[cat.id]||0;
            return (
              <div key={cat.id} style={{padding:"10px 0",borderBottom:i<arr.length-1?"1px solid var(--div)":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:600}}>{cat.icon} {cat.name}</span>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {limit>0&&<span style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:600}}>{fmt(limit,currency)}</span>}
                    <span style={{fontSize:11,color:"var(--ink-muted)",textDecoration:"underline",cursor:"pointer",textUnderlineOffset:2}}
                      onClick={()=>{setEditBudget(cat.id);setBudgetVal(limit>0?String(limit):"");}}>
                      {limit>0?"Edit":"Set"}
                    </span>
                  </div>
                </div>
                {editBudget===cat.id&&(
                  <div style={{display:"flex",gap:8,marginTop:8}} onClick={e=>e.stopPropagation()}>
                    <input className="field-input" type="number" min="0" step="1" placeholder="Monthly limit"
                      value={budgetVal} onChange={e=>setBudgetVal(e.target.value)} autoFocus
                      style={{flex:1,padding:"8px 11px",fontSize:13}} />
                    <button style={{padding:"8px 13px",border:"1px solid var(--ink)",borderRadius:6,background:"var(--ink)",color:"var(--bg)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}
                      onClick={()=>{onSetBudget(cat.id,parseFloat(budgetVal)||0);setEditBudget(null);showToast("Budget saved");}}>Save</button>
                    <button style={{padding:"8px 10px",border:"1px solid var(--div)",borderRadius:6,background:"transparent",color:"var(--ink-muted)",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}
                      onClick={()=>setEditBudget(null)}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Data */}
        <div style={{padding:"14px 0 0"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--ink-muted)",marginBottom:12}}>Data</div>
          <div className="settings-row">
            <div><div className="settings-row-lbl">Export CSV</div><div className="settings-row-sub">Full ledger as spreadsheet</div></div>
            <button className="settings-btn" onClick={onExportCSV}>Export</button>
          </div>
          <div className="settings-row">
            <div><div className="settings-row-lbl">Export JSON backup</div><div className="settings-row-sub">{transactions.length} transactions</div></div>
            <button className="settings-btn" onClick={onExportJSON}>Backup</button>
          </div>
          <div className="settings-row" style={{flexDirection:"column",alignItems:"flex-start",gap:10}}>
            <div><div className="settings-row-lbl">Restore from backup</div><div className="settings-row-sub">Merges with existing data — nothing deleted</div></div>
            <div style={{border:"1.5px dashed var(--div)",borderRadius:8,padding:"16px",textAlign:"center",cursor:"pointer",width:"100%",transition:"border-color 150ms"}}
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();onImportJSON(e.dataTransfer.files[0]);}}>
              <input ref={fileRef} type="file" accept=".json,application/json" style={{display:"none"}}
                onChange={e=>{onImportJSON(e.target.files[0]);e.target.value="";}} />
              <div style={{fontSize:13,color:"var(--ink-muted)",fontWeight:600}}>Click to choose file, or drag & drop</div>
              <div style={{fontSize:11,color:"var(--ink-faint)",marginTop:4}}>Accepts .json backup files</div>
            </div>
          </div>
        </div>

        {state.lastBackup && (
          <div style={{fontSize:11,color:"var(--pos)",fontWeight:600,marginTop:4,paddingBottom:4}}>
            ✓ Last backup: {new Date(state.lastBackup).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
          </div>
        )}
        {!state.lastBackup && (
          <div style={{fontSize:11,color:"var(--neg)",fontWeight:600,marginTop:4,paddingBottom:4}}>
            ✗ No backup yet — export one above
          </div>
        )}

        <button className="btn-ghost" onClick={onClose} style={{marginTop:12}}>Close</button>
      </div>
    </div>
  );
}
