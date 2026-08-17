import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE LEDGER — Premium Editorial Redesign
// Storage key: expense_ledger_v5 — never changes, data is safe
// All existing functionality preserved. Design language unified.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "expense_ledger_v5";
const KEYS_LEGACY = [
  "finance_app_data","finance_editorial_v1","finance_editorial_v2",
  "finance_editorial_v3","finance_editorial_v4","finance_os_v3",
];

function readRaw(k) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } }
function writeRaw(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ─── Category mapping (all known old names → current ids) ────────────────────
const CATEGORY_MAP = {
  "food":"food","sport":"sport","personal":"personal","culture":"culture",
  "transport":"transport","housing":"housing","digital":"digital",
  "edu":"edu","other":"other","salary":"salary","freelance":"freelance",
  "food & dining":"food","groceries & dining":"food","groceries":"food","dining":"food",
  "food and dining":"food","restaurant":"food","restaurants":"food","coffee":"food",
  "cafe":"food","lunch":"food","snacks":"food","breakfast":"food","dinner":"food",
  "sport & fitness":"sport","sport and fitness":"sport","sports":"sport","fitness":"sport",
  "gym":"sport","football":"sport","health & sport":"sport","exercise":"sport","workout":"sport",
  "personal care":"personal","skincare":"personal","health":"personal","grooming":"personal",
  "pharmacy":"personal","personal & health":"personal","beauty":"personal","medical":"personal",
  "doctor":"personal","hygiene":"personal",
  "style & culture":"culture","culture & style":"culture","fashion":"culture","style":"culture",
  "clothing":"culture","clothes":"culture","fragrance":"culture","entertainment":"culture",
  "shopping":"culture","games":"culture","gaming":"culture","cinema":"culture","movies":"culture",
  "transportation":"transport","travel":"transport","bus":"transport","taxi":"transport",
  "uber":"transport","fuel":"transport","petrol":"transport","metro":"transport","benzin":"transport",
  "rent":"housing","home":"housing","utilities":"housing","bills":"housing","household":"housing",
  "digital & subs":"digital","digital and subs":"digital","subscriptions":"digital",
  "subscription":"digital","subs":"digital","streaming":"digital","software":"digital",
  "apps":"digital","tech":"digital","mobile":"digital","internet":"digital",
  "education":"edu","books":"edu","courses":"edu","tuition":"edu","university":"edu","school":"edu",
  "salary & income":"salary","salary and income":"salary","income":"salary","wage":"salary",
  "wages":"salary","paycheck":"salary","pay":"salary",
  "side income":"freelance","commission":"freelance","consulting":"freelance","gig":"freelance",
};

function resolveCategory(raw) {
  if (!raw) return "other";
  const key = String(raw).toLowerCase().trim();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  for (const [k, v] of Object.entries(CATEGORY_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "other";
}

function normaliseTxn(t) {
  return {
    id:        t.id || Date.now() + Math.random(),
    type:      (t.type||"expense").toLowerCase().includes("inc") ? "income" : "expense",
    amount:    Math.abs(parseFloat(t.amount || t.amt || 0)),
    category:  resolveCategory(t.category || t.catId || t.cat),
    note:      t.note || t.description || t.name || "",
    date:      (t.date || new Date().toISOString().slice(0,10)).slice(0,10),
    recurring: t.recurring || false,
    recurFreq: t.recurFreq || t.frequency || null,
  };
}

function migrateAndLoad() {
  const current = readRaw(KEY);
  if (current?.transactions) {
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
  merged.sort((a,b) => b.date.localeCompare(a.date));
  return buildState(merged, bestSettings);
}

function buildState(transactions = [], settings = null) {
  const seeded = transactions.length === 0 ? SEED_TRANSACTIONS() : transactions;
  return {
    transactions: seeded,
    budgets:    settings?.budgets    || { food: 200, sport: 80, personal: 60, digital: 30 },
    categories: settings?.categories || DEFAULT_CATEGORIES,
    templates:  settings?.templates  || DEFAULT_TEMPLATES,
    currency:   settings?.currency   || "₼",
    lastBackup: settings?.lastBackup || null,
  };
}

function SEED_TRANSACTIONS() {
  const d = n => { const dt = new Date(); dt.setDate(dt.getDate()-n); return dt.toISOString().slice(0,10); };
  return [
    { id:1001,type:"income", amount:2400, category:"salary",   note:"Monthly salary",           date:d(5),  recurring:true, recurFreq:"monthly" },
    { id:1002,type:"expense",amount:850,  category:"housing",  note:"Rent",                     date:d(5),  recurring:true, recurFreq:"monthly" },
    { id:1003,type:"expense",amount:45,   category:"sport",    note:"Gym membership",           date:d(6),  recurring:true, recurFreq:"monthly" },
    { id:1004,type:"expense",amount:10.99,category:"digital",  note:"Spotify Premium",          date:d(4),  recurring:true, recurFreq:"monthly" },
    { id:1005,type:"expense",amount:34.5, category:"food",     note:"High-protein groceries",   date:d(2),  recurring:false,recurFreq:null },
    { id:1006,type:"expense",amount:12,   category:"sport",    note:"Football pitch fee",       date:d(3),  recurring:false,recurFreq:null },
    { id:1007,type:"expense",amount:22,   category:"transport",note:"Monthly bus pass",         date:d(6),  recurring:true, recurFreq:"monthly" },
    { id:1008,type:"expense",amount:18,   category:"culture",  note:"Fragrance decant",         date:d(7),  recurring:false,recurFreq:null },
    { id:1009,type:"expense",amount:22,   category:"personal", note:"Adapalene & glycolic acid",date:d(8),  recurring:false,recurFreq:null },
    { id:1010,type:"expense",amount:4.5,  category:"food",     note:"Coffee",                   date:d(1),  recurring:false,recurFreq:null },
  ];
}

// ─── Categories — SVG icons, no emojis ───────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id:"food",     name:"Food & Dining",   color:"#5C7A6E" },
  { id:"sport",    name:"Sport & Fitness", color:"#4A5C7A" },
  { id:"personal", name:"Personal Care",   color:"#7A5C7A" },
  { id:"culture",  name:"Style & Culture", color:"#7A6652" },
  { id:"transport",name:"Transport",       color:"#4A6A7A" },
  { id:"housing",  name:"Housing",         color:"#5A5A5A" },
  { id:"digital",  name:"Digital & Subs",  color:"#3A6A5A" },
  { id:"edu",      name:"Education",       color:"#4A4A7A" },
  { id:"other",    name:"Other",           color:"#8A8A8A" },
  { id:"salary",   name:"Salary",          color:"#2D6A4F" },
  { id:"freelance",name:"Freelance",       color:"#2D6A4F" },
];

const DEFAULT_TEMPLATES = [
  { id:"t1",name:"Groceries",      amount:35,  catId:"food",     note:"Weekly shop"       },
  { id:"t2",name:"Football Pitch", amount:12,  catId:"sport",    note:"5-a-side pitch"    },
  { id:"t3",name:"Fragrance",      amount:18,  catId:"culture",  note:"Sample decant"     },
  { id:"t4",name:"Coffee",         amount:4.5, catId:"food",     note:"Café"              },
  { id:"t5",name:"Adapalene",      amount:12,  catId:"personal", note:"Skincare restock"  },
  { id:"t6",name:"Bus / Metro",    amount:2.4, catId:"transport",note:"Public transport"  },
];

// ─── SVG icon system ──────────────────────────────────────────────────────────
// Thin-stroke, consistent weight. One visual language across the entire app.
const ICONS = {
  food:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
  sport:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>`,
  personal:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l1 9H8L9 3z"/><path d="M8 12v9h8v-9"/><path d="M10 7h4"/></svg>`,
  culture:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 9h18"/><path d="M9 21l3-4 3 4"/></svg>`,
  transport: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  housing:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  digital:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`,
  edu:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
  other:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  salary:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  freelance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  add:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  close:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  search:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  settings:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  edit:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  repeat:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
  chevronDown:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  home:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  list:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  chart:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  download:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  filter:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  calendar:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  moreH:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>`,
  arrowUp:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  arrowDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
};

function Icon({ name, size = 16, color = "currentColor", style = {} }) {
  const svg = ICONS[name] || ICONS.other;
  return (
    <span
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:size, height:size, flexShrink:0, color, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-hidden="true"
    />
  );
}

function CatIcon({ catId, size = 16, color }) {
  const cat = DEFAULT_CATEGORIES.find(c => c.id === catId);
  return <Icon name={catId} size={size} color={color || cat?.color || "#8A8A8A"} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today  = () => new Date().toISOString().slice(0,10);
const curMon = () => new Date().toISOString().slice(0,7);

function fmt(n, sym = "₼") {
  return `${Math.abs(n).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} ${sym}`;
}
function fmtCompact(n, sym = "₼") {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(abs/1000).toFixed(1)}k ${sym}`;
  return `${abs.toFixed(2)} ${sym}`;
}
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d+"T00:00:00");
  if (d === today()) return "Today";
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  if (d === yest.toISOString().slice(0,10)) return "Yesterday";
  return dt.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
}
function monthName(ym) {
  return new Date(ym+"-02").toLocaleDateString("en-GB",{month:"long",year:"numeric"});
}
function monthShort(ym) {
  return new Date(ym+"-02").toLocaleDateString("en-GB",{month:"short"});
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

:root {
  /* Surface */
  --bg:      #F7F4EE;
  --bg-warm: #F0EDE5;
  --bg-card: #FDFCF9;
  --bg-inset:#EDEAE2;

  /* Ink */
  --ink:     #1A1814;
  --ink-2:   #3D3A35;
  --ink-3:   #7A756D;
  --ink-4:   #B5B0A8;
  --ink-5:   #D5D1C9;

  /* Dividers */
  --rule:    #E8E4DC;
  --rule-2:  #D5D1C9;

  /* Burgundy accent */
  --accent:       #6B1F2A;
  --accent-light: #F5ECED;
  --accent-mid:   #C4454F;

  /* Semantic */
  --pos:     #1D5C38;
  --pos-bg:  #EBF4EE;
  --neg:     #6B1F2A;
  --neg-bg:  #F5ECED;
  --warn:    #6B4C00;
  --warn-bg: #FBF6E7;

  /* Skeletons */
  --sk1: #EAE6DE;
  --sk2: #DAD6CE;
}

html, body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}

.app {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ── Topbar ─────────────────────────────────────────────────────────────────── */
.topbar {
  position: sticky; top: 0; z-index: 60;
  background: rgba(247,244,238,0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid var(--rule);
  padding: 0 20px;
  height: 52px;
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.wordmark {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 15px; font-weight: 700;
  color: var(--ink); letter-spacing: -0.1px;
}
.topbar-right { display: flex; gap: 4px; align-items: center; }
.topbar-btn {
  width: 34px; height: 34px;
  border-radius: 8px;
  background: transparent; border: none;
  color: var(--ink-3); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 120ms, color 120ms;
}
.topbar-btn:hover { background: var(--bg-inset); color: var(--ink); }

/* ── Tab bar ────────────────────────────────────────────────────────────────── */
.tabbar {
  position: fixed; bottom: 0;
  left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 430px;
  background: rgba(247,244,238,0.96);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid var(--rule);
  display: flex; z-index: 60;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom, 0px));
}
.tab-btn {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 3px;
  padding: 6px 0;
  border: none; background: transparent;
  cursor: pointer; color: var(--ink-4);
  transition: color 150ms;
  font-family: 'DM Sans', sans-serif;
}
.tab-btn.active { color: var(--ink); }
.tab-lbl {
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.6px; text-transform: uppercase;
}
.tab-active-line {
  width: 16px; height: 1.5px;
  background: var(--accent); border-radius: 99px;
  margin-top: 1px;
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
.page {
  flex: 1; overflow-y: auto;
  padding: 24px 20px 96px;
  animation: pageIn 160ms ease both;
}
@keyframes pageIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0);   }
}

/* ── Section labels ─────────────────────────────────────────────────────────── */
.sec-label {
  font-size: 9px; font-weight: 700;
  letter-spacing: 1.6px; text-transform: uppercase;
  color: var(--ink-3); margin-bottom: 10px;
  display: flex; align-items: center; justify-content: space-between;
}
.sec-label-action {
  font-size: 11px; font-weight: 500;
  color: var(--ink-3); cursor: pointer; letter-spacing: 0;
  text-transform: none;
  text-decoration: underline; text-underline-offset: 2px;
}
.sec-label-action:hover { color: var(--ink); }
.rule { height: 1px; background: var(--rule); margin: 20px 0; }

/* ── Skeleton ───────────────────────────────────────────────────────────────── */
@keyframes skelShim {
  0%   { background-position: -400% 0; }
  100% { background-position:  400% 0; }
}
.skel {
  background: linear-gradient(90deg, var(--sk1) 25%, var(--sk2) 50%, var(--sk1) 75%);
  background-size: 400% 100%;
  animation: skelShim 1.8s ease infinite;
  border-radius: 4px;
}

/* ── Hero block ─────────────────────────────────────────────────────────────── */
.hero { padding: 20px 0 22px; border-bottom: 1px solid var(--rule); margin-bottom: 24px; }
.hero-eyebrow {
  font-size: 10px; font-weight: 600;
  letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--ink-3); margin-bottom: 6px;
}
.hero-amount {
  font-family: 'Playfair Display', serif;
  font-size: 48px; font-weight: 900;
  letter-spacing: -2px; line-height: 1;
  color: var(--ink); margin-bottom: 5px;
}
.hero-meta {
  font-size: 13px; color: var(--ink-3);
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 18px;
}
.hero-trend {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; font-weight: 600;
  padding: 2px 7px; border-radius: 4px;
}
.hero-trend.down { background: var(--pos-bg); color: var(--pos); }
.hero-trend.up   { background: var(--neg-bg); color: var(--neg); }
.hero-stats {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  border: 1px solid var(--rule); border-radius: 8px;
  overflow: hidden; background: var(--bg-card);
}
.hero-stat { padding: 12px 10px; position: relative; }
.hero-stat:not(:last-child)::after {
  content: ''; position: absolute; right: 0; top: 8px; bottom: 8px;
  width: 1px; background: var(--rule);
}
.hero-stat-val {
  font-family: 'Playfair Display', serif;
  font-size: 16px; font-weight: 700;
  letter-spacing: -0.3px; margin-bottom: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hero-stat-val.pos { color: var(--pos); }
.hero-stat-val.neg { color: var(--neg); }
.hero-stat-lbl {
  font-size: 9px; font-weight: 600;
  letter-spacing: 0.8px; text-transform: uppercase;
  color: var(--ink-4);
}

/* ── Quick-add templates ────────────────────────────────────────────────────── */
.tpl-strip {
  display: flex; gap: 6px; overflow-x: auto;
  padding-bottom: 2px; scrollbar-width: none;
  margin-bottom: 20px;
}
.tpl-strip::-webkit-scrollbar { display: none; }
.tpl-card {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  background: var(--bg-card); border: 1px solid var(--rule);
  border-radius: 6px; cursor: pointer;
  transition: border-color 120ms, background 120ms;
  min-width: 0;
}
.tpl-card:hover { border-color: var(--rule-2); background: var(--bg-warm); }
.tpl-card:active { transform: scale(0.98); }
.tpl-card-name {
  font-size: 12px; font-weight: 600;
  color: var(--ink-2); white-space: nowrap;
}
.tpl-card-amt {
  font-family: 'Playfair Display', serif;
  font-size: 12px; color: var(--ink-3); white-space: nowrap;
}

/* ── Budget bars ────────────────────────────────────────────────────────────── */
.budget-item { margin-bottom: 14px; }
.budget-hdr { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
.budget-name { font-size: 12px; font-weight: 600; color: var(--ink-2); display: flex; align-items: center; gap: 6px; }
.budget-nums { font-size: 11px; color: var(--ink-3); }
.budget-nums strong { color: var(--ink); font-weight: 700; }
.budget-track { height: 2px; background: var(--rule); border-radius: 99px; overflow: hidden; }
.budget-fill  { height: 100%; border-radius: 99px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }
.budget-msg   { font-size: 10px; margin-top: 4px; color: var(--ink-4); font-weight: 500; }
.budget-msg.warn { color: var(--warn); }
.budget-msg.over { color: var(--neg); }

/* ── Transaction list ───────────────────────────────────────────────────────── */
.txn-group { margin-bottom: 20px; }
.txn-date-hdr {
  display: flex; justify-content: space-between; align-items: baseline;
  padding-bottom: 6px; margin-bottom: 0;
  border-bottom: 1px solid var(--rule);
}
.txn-date-lbl {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.6px; text-transform: uppercase; color: var(--ink-3);
}
.txn-date-total {
  font-family: 'Playfair Display', serif;
  font-size: 13px; font-weight: 600; color: var(--ink);
}
.txn-list { background: var(--bg-card); border: 1px solid var(--rule); border-top: none; border-radius: 0 0 8px 8px; }
.txn-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--rule);
  transition: background 100ms; position: relative;
}
.txn-row:last-child { border-bottom: none; border-radius: 0 0 8px 8px; }
.txn-row:hover { background: var(--bg-warm); }
.txn-ico {
  width: 34px; height: 34px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.txn-body { flex: 1; min-width: 0; }
.txn-name {
  font-size: 13px; font-weight: 600; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.txn-note {
  font-size: 11px; color: var(--ink-3); margin-top: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.txn-sub {
  font-size: 11px; color: var(--ink-4); margin-top: 1px;
  display: flex; gap: 5px; align-items: center;
}
.rec-pill {
  display: inline-flex; align-items: center; gap: 3px;
  background: var(--warn-bg); color: var(--warn);
  font-size: 9px; font-weight: 700; letter-spacing: 0.3px;
  padding: 1px 5px; border-radius: 3px;
}
.txn-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
.txn-amt {
  font-family: 'Playfair Display', serif;
  font-size: 14px; font-weight: 600;
}
.txn-amt.exp { color: var(--ink); }
.txn-amt.inc { color: var(--pos); }
.txn-actions { display: flex; gap: 2px; }
.txn-action-btn {
  width: 28px; height: 28px; border-radius: 6px;
  border: none; background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-4); transition: background 120ms, color 120ms;
}
.txn-action-btn:hover { background: var(--bg-inset); color: var(--ink-2); }
.txn-action-btn.danger:hover { background: var(--neg-bg); color: var(--neg); }

/* ── Empty state ────────────────────────────────────────────────────────────── */
.empty {
  text-align: center; padding: 52px 24px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.empty-icon { color: var(--ink-5); margin-bottom: 4px; }
.empty-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px; font-weight: 600; color: var(--ink);
}
.empty-body { font-size: 13px; color: var(--ink-3); line-height: 1.65; max-width: 240px; }

/* ── FAB ────────────────────────────────────────────────────────────────────── */
.fab {
  position: fixed;
  bottom: calc(68px + env(safe-area-inset-bottom, 0px) + 16px);
  right: calc(max(20px, 50vw - 195px));
  width: 46px; height: 46px;
  border-radius: 12px;
  background: var(--ink); color: var(--bg);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 12px rgba(26,24,20,0.22);
  z-index: 50;
  transition: transform 140ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 140ms;
}
.fab:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,24,20,0.26); }
.fab:active { transform: scale(0.94); box-shadow: 0 1px 6px rgba(26,24,20,0.18); }

/* ── Add/Edit overlay ───────────────────────────────────────────────────────── */
.add-overlay {
  position: fixed; inset: 0; background: var(--bg);
  z-index: 100; display: flex; flex-direction: column;
  max-width: 430px; margin: 0 auto;
  animation: sheetUp 220ms cubic-bezier(0.32,0.72,0,1);
  overflow-y: auto;
}
@keyframes sheetUp {
  from { transform: translateY(100%); opacity: 0.7; }
  to   { transform: translateY(0);    opacity: 1;   }
}
.add-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--rule); flex-shrink: 0;
}
.add-bar-title {
  font-family: 'Playfair Display', serif;
  font-size: 17px; font-weight: 700;
}
.add-close {
  width: 30px; height: 30px; border-radius: 50%;
  border: 1px solid var(--rule); background: transparent;
  color: var(--ink-3); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 120ms, color 120ms;
}
.add-close:hover { border-color: var(--ink-3); color: var(--ink); }
.add-body { flex: 1; padding: 20px 20px 36px; display: flex; flex-direction: column; }

/* Amount input */
.amount-zone {
  text-align: center; padding: 14px 0 18px;
  border-bottom: 1px solid var(--rule); margin-bottom: 20px;
}
.amount-sym {
  font-family: 'Playfair Display', serif;
  font-size: 24px; font-weight: 400; color: var(--ink-4);
  vertical-align: middle; margin-right: 2px;
}
.amount-input {
  font-family: 'Playfair Display', serif;
  font-size: 54px; font-weight: 900; letter-spacing: -2.5px;
  background: transparent; border: none; outline: none;
  color: var(--ink); width: 200px; text-align: center;
  caret-color: var(--accent);
}
.amount-input::placeholder { color: var(--ink-5); }
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }

/* Type toggle */
.type-toggle {
  display: flex; border: 1px solid var(--rule);
  border-radius: 6px; overflow: hidden; margin-bottom: 18px;
}
.type-btn {
  flex: 1; padding: 9px; border: none; background: transparent;
  color: var(--ink-3); font-size: 12px; font-weight: 700;
  cursor: pointer; transition: background 120ms, color 120ms;
  font-family: 'DM Sans', sans-serif; letter-spacing: 0.3px;
  text-transform: uppercase;
}
.type-btn:not(:last-child) { border-right: 1px solid var(--rule); }
.type-btn.active { background: var(--ink); color: var(--bg); }

/* Category selector */
.cat-scroll {
  display: flex; gap: 6px; overflow-x: auto;
  padding-bottom: 4px; margin-bottom: 18px;
  scrollbar-width: none;
}
.cat-scroll::-webkit-scrollbar { display: none; }
.cat-tile {
  flex-shrink: 0; display: flex; flex-direction: column;
  align-items: center; gap: 4px; width: 56px;
  padding: 8px 4px; border: 1px solid var(--rule);
  border-radius: 8px; background: var(--bg-card); cursor: pointer;
  transition: border-color 120ms, background 120ms;
}
.cat-tile.sel { border-color: var(--ink); background: var(--bg-warm); }
.cat-tile-name {
  font-size: 9px; font-weight: 600; color: var(--ink-3);
  text-align: center; line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;
}
.cat-tile.sel .cat-tile-name { color: var(--ink); }

/* Form fields */
.field { margin-bottom: 14px; }
.field-lbl {
  font-size: 9px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--ink-3);
  margin-bottom: 6px; display: block;
}
.field-input {
  width: 100%; background: var(--bg-card);
  border: 1px solid var(--rule); border-radius: 6px;
  padding: 10px 13px; font-size: 14px; color: var(--ink);
  font-family: 'DM Sans', sans-serif; transition: border-color 120ms;
}
.field-input:focus { outline: none; border-color: var(--rule-2); }
.field-select { appearance: none; cursor: pointer; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* Toggle */
.toggle-wrap { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.toggle-track {
  width: 40px; height: 22px; border-radius: 11px;
  background: var(--ink-5); position: relative;
  transition: background 150ms; flex-shrink: 0; cursor: pointer;
}
.toggle-track.on { background: var(--ink); }
.toggle-knob {
  width: 16px; height: 16px; border-radius: 50%; background: white;
  position: absolute; top: 3px; left: 3px;
  transition: transform 150ms cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.toggle-track.on .toggle-knob { transform: translateX(18px); }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  border-radius: 6px; font-family: 'DM Sans', sans-serif;
  font-weight: 600; cursor: pointer; transition: opacity 120ms, background 120ms, border-color 120ms;
}
.btn-full { width: 100%; }
.btn-primary {
  padding: 12px 20px;
  background: var(--ink); color: var(--bg);
  border: 1px solid var(--ink); font-size: 14px; font-weight: 700;
  letter-spacing: 0.2px; margin-top: 8px;
}
.btn-primary:hover { opacity: 0.87; }
.btn-primary:active { opacity: 0.75; }
.btn-ghost {
  padding: 11px 20px;
  background: transparent; color: var(--ink-3);
  border: 1px solid var(--rule); font-size: 13px;
  margin-top: 6px;
}
.btn-ghost:hover { border-color: var(--rule-2); color: var(--ink); }
.btn-sm {
  padding: 6px 13px; font-size: 11px; font-weight: 700;
  letter-spacing: 0.3px;
  background: transparent; border: 1px solid var(--rule);
  color: var(--ink-2);
}
.btn-sm:hover { border-color: var(--rule-2); }
.btn-sm-primary { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.btn-sm-accent  { background: var(--accent-light); color: var(--accent); border-color: var(--accent-light); }

/* Search + filter */
.search-wrap { position: relative; margin-bottom: 10px; }
.search-ico {
  position: absolute; left: 12px; top: 50%;
  transform: translateY(-50%); color: var(--ink-4); pointer-events: none;
}
.search-input {
  width: 100%; background: var(--bg-card);
  border: 1px solid var(--rule); border-radius: 6px;
  padding: 9px 12px 9px 36px; font-size: 13px; color: var(--ink);
  font-family: 'DM Sans', sans-serif; transition: border-color 120ms;
}
.search-input:focus { outline: none; border-color: var(--rule-2); }

.filter-bar { display: flex; gap: 5px; overflow-x: auto; scrollbar-width: none; margin-bottom: 10px; }
.filter-bar::-webkit-scrollbar { display: none; }
.chip {
  flex-shrink: 0; padding: 5px 11px;
  border: 1px solid var(--rule); border-radius: 4px;
  background: var(--bg-card); color: var(--ink-3);
  font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all 120ms; white-space: nowrap;
  font-family: 'DM Sans', sans-serif;
}
.chip.on { background: var(--ink); border-color: var(--ink); color: var(--bg); }
.chip:hover:not(.on) { border-color: var(--rule-2); color: var(--ink); }

/* Date range */
.date-filter-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.date-filter-toggle {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  background: none; border: 1px solid var(--rule); border-radius: 4px;
  padding: 5px 10px; cursor: pointer; font-family: 'DM Sans', sans-serif;
  transition: border-color 120ms, color 120ms; white-space: nowrap;
}
.date-filter-toggle.active { background: var(--bg-warm); border-color: var(--rule-2); color: var(--ink); }
.date-filter-toggle:hover { border-color: var(--rule-2); color: var(--ink); }
.date-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.date-input-wrap { display: flex; flex-direction: column; gap: 3px; }
.date-lbl { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-3); }
.date-input {
  background: var(--bg-card); border: 1px solid var(--rule);
  border-radius: 5px; padding: 7px 9px; font-size: 12px;
  color: var(--ink); font-family: 'DM Sans', sans-serif; width: 100%;
}
.date-input:focus { outline: none; border-color: var(--rule-2); }

/* Settings sheet */
.sheet-overlay {
  position: fixed; inset: 0; background: rgba(26,24,20,0.38);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  z-index: 80; display: flex; align-items: flex-end; justify-content: center;
  animation: fadeIn 150ms ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.sheet {
  background: var(--bg); width: 100%; max-width: 430px;
  border-radius: 16px 16px 0 0; border-top: 1px solid var(--rule);
  max-height: 90vh; overflow-y: auto;
  animation: sheetRise 200ms cubic-bezier(0.32,0.72,0,1);
  padding: 0 20px 48px;
}
@keyframes sheetRise {
  from { transform: translateY(32px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.sheet-handle {
  width: 32px; height: 3px; background: var(--ink-5);
  border-radius: 99px; margin: 12px auto 20px;
}
.sheet-title {
  font-family: 'Playfair Display', serif;
  font-size: 22px; font-weight: 700; margin-bottom: 22px;
}
.settings-section-title {
  font-size: 9px; font-weight: 700; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--ink-3);
  padding: 14px 0 8px; border-bottom: 1px solid var(--rule); margin-bottom: 0;
}
.settings-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 13px 0; border-bottom: 1px solid var(--rule); gap: 12px;
}
.settings-row:last-of-type { border-bottom: none; }
.settings-row-title { font-size: 13px; font-weight: 600; color: var(--ink); }
.settings-row-sub   { font-size: 11px; color: var(--ink-3); margin-top: 2px; }

/* Analytics */
.analytics-card {
  background: var(--bg-card); border: 1px solid var(--rule);
  border-radius: 8px; padding: 16px; margin-bottom: 14px;
}
.analytics-card-title {
  font-size: 9px; font-weight: 700; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--ink-3); margin-bottom: 14px;
}
.cat-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.cat-bar-row:last-child { margin-bottom: 0; }
.cat-bar-name { font-size: 12px; font-weight: 500; color: var(--ink-2); width: 100px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px; }
.cat-bar-track { flex: 1; height: 3px; background: var(--rule); border-radius: 99px; overflow: hidden; }
.cat-bar-fill  { height: 100%; border-radius: 99px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
.cat-bar-amt   { font-family: 'Playfair Display', serif; font-size: 12px; font-weight: 600; color: var(--ink); width: 72px; text-align: right; flex-shrink: 0; white-space: nowrap; }
.cat-bar-pct   { font-size: 10px; color: var(--ink-4); width: 28px; text-align: right; flex-shrink: 0; }

.month-bars { display: flex; align-items: flex-end; gap: 4px; height: 72px; }
.month-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
.month-bar-inner { flex: 1; width: 100%; display: flex; align-items: flex-end; gap: 2px; }
.month-bar-exp { border-radius: 2px 2px 0 0; transition: height 0.5s ease; min-height: 2px; }
.month-bar-lbl { font-size: 9px; font-weight: 700; color: var(--ink-4); letter-spacing: 0.3px; }

.heatmap { display: grid; grid-template-columns: 26px repeat(7,1fr); gap: 2px; }
.heatmap-corner { }
.heatmap-day-hdr { font-size: 9px; font-weight: 700; color: var(--ink-4); text-align: center; padding-bottom: 3px; }
.heatmap-wk-lbl { font-size: 8px; color: var(--ink-5); text-align: right; padding-right: 4px; display: flex; align-items: center; justify-content: flex-end; }
.heat-cell { aspect-ratio: 1; border-radius: 2px; cursor: default; position: relative; }
.heat-cell[title]:hover::after {
  content: attr(title); position: absolute; bottom: calc(100% + 4px); left: 50%;
  transform: translateX(-50%); background: var(--ink); color: var(--bg);
  font-size: 9px; padding: 3px 6px; border-radius: 4px;
  white-space: nowrap; pointer-events: none; z-index: 20;
  font-family: 'DM Sans', sans-serif; font-weight: 600;
}

/* Backup banner */
.backup-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 16px; background: var(--warn-bg);
  border-bottom: 1px solid #D4A82A;
  font-size: 11px; font-weight: 600; color: var(--warn);
}
.backup-banner span { flex: 1; }
.backup-banner-btn {
  flex-shrink: 0; padding: 4px 10px;
  background: var(--warn); color: #fff;
  border: none; border-radius: 4px; font-size: 10px; font-weight: 700;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
}
.backup-banner-close {
  background: none; border: none; color: var(--warn);
  font-size: 14px; cursor: pointer; padding: 2px; flex-shrink: 0; line-height: 1;
}

/* Toast */
.toast {
  position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
  background: var(--ink); color: var(--bg);
  padding: 9px 16px; border-radius: 6px;
  font-size: 12px; font-weight: 600; z-index: 300;
  white-space: nowrap; pointer-events: none;
  animation: toastIn 180ms ease;
  box-shadow: 0 4px 16px rgba(26,24,20,0.2);
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Dupe warning */
.dupe-warn {
  display: flex; align-items: center; gap: 8px;
  background: var(--warn-bg); border: 1px solid #D4A82A;
  border-radius: 6px; padding: 9px 12px; font-size: 12px;
  font-weight: 600; color: var(--warn); margin-bottom: 12px;
}

/* Restore drop zone */
.drop-zone {
  border: 1.5px dashed var(--rule); border-radius: 7px;
  padding: 18px 16px; text-align: center; cursor: pointer;
  transition: border-color 150ms, background 150ms; width: 100%;
}
.drop-zone:hover { border-color: var(--rule-2); background: var(--bg-warm); }
.drop-zone input { display: none; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [state,    setState]    = useState(() => migrateAndLoad());
  const [tab,      setTab]      = useState("home");
  const [tabKey,   setTabKey]   = useState(0);
  const [showAdd,  setShowAdd]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast,    setToast]    = useState(null);
  const [prefill,  setPrefill]  = useState(null);
  const [editId,   setEditId]   = useState(null);
  const [showBackupBanner, setShowBackupBanner] = useState(() => {
    const s = readRaw(KEY);
    if (!s?.lastBackup) return true;
    return (Date.now() - new Date(s.lastBackup).getTime()) / 86400000 >= 7;
  });

  useEffect(() => { writeRaw(KEY, state); }, [state]);

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 2000);
  }, []);

  const switchTab = useCallback((t) => { setTab(t); setTabKey(k => k+1); }, []);

  const addTransaction = useCallback((txn) => {
    setState(s => ({ ...s, transactions: [{ ...txn, id: Date.now()+Math.random() }, ...s.transactions] }));
    showToast("Transaction recorded");
  }, [showToast]);

  const updateTransaction = useCallback((id, txn) => {
    setState(s => ({ ...s, transactions: s.transactions.map(t => t.id===id ? {...t,...txn} : t) }));
    showToast("Transaction updated");
  }, [showToast]);

  const deleteTransaction = useCallback((id) => {
    if (!window.confirm("Delete this transaction?")) return;
    setState(s => ({ ...s, transactions: s.transactions.filter(t => t.id !== id) }));
    showToast("Deleted");
  }, [showToast]);

  const setBudget = useCallback((catId, amount) => {
    setState(s => ({ ...s, budgets: { ...s.budgets, [catId]: amount } }));
  }, []);

  const openAdd = useCallback((prefillData = null, existingId = null) => {
    setPrefill(prefillData); setEditId(existingId); setShowAdd(true);
  }, []);

  const closeAdd = useCallback(() => {
    setShowAdd(false); setPrefill(null); setEditId(null);
  }, []);

  const exportCSV = useCallback(() => {
    const rows = [["Date","Type","Category","Amount","Note","Recurring"]];
    state.transactions.forEach(t => rows.push([t.date,t.type,t.category,t.amount.toFixed(2),t.note||"",t.recurring?t.recurFreq:""]));
    const csv = rows.map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    a.download = `ledger-${today()}.csv`; a.click();
    showToast("CSV exported");
  }, [state.transactions, showToast]);

  const exportJSON = useCallback(() => {
    const now = new Date().toISOString();
    const payload = JSON.stringify({ ...state, exportedAt: now, version: 5 }, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([payload],{type:"application/json"}));
    a.download = `ledger-backup-${today()}.json`; a.click();
    setState(s => ({ ...s, lastBackup: now }));
    setShowBackupBanner(false);
    showToast(`Backup saved — ${state.transactions.length} transactions`);
  }, [state, showToast]);

  const importFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target.result;
        const isCSV = file.name?.toLowerCase().endsWith(".csv") ||
          raw.trimStart().toLowerCase().startsWith("date,") ||
          raw.trimStart().toLowerCase().startsWith('"date"');
        let txns = [], parsed = null;
        if (isCSV) {
          const lines = raw.trim().split(/\r?\n/);
          const headers = lines[0].toLowerCase().split(",").map(h=>h.replace(/"/g,"").trim());
          txns = lines.slice(1).filter(l=>l.trim()).map((line,i)=>{
            const fields=[]; let cur="",inQ=false;
            for(const ch of line){
              if(ch==='"'){inQ=!inQ;}
              else if(ch===","&&!inQ){fields.push(cur.trim());cur="";}
              else cur+=ch;
            }
            fields.push(cur.trim());
            const get=(...keys)=>{
              for(const k of keys){
                const idx=headers.indexOf(k);
                if(idx!==-1&&fields[idx]!==undefined) return fields[idx].replace(/^"|"$/g,"").trim();
              }
              return "";
            };
            const amount=Math.abs(parseFloat(get("amount","amt","value"))||0);
            return {
              id:Date.now()+i+Math.random(),
              type:get("type").toLowerCase().includes("inc")?"income":"expense",
              amount,
              category:resolveCategory(get("category","cat")),
              note:get("note","notes","description","memo"),
              date:(get("date")||today()).slice(0,10),
              recurring:false,recurFreq:null,
            };
          }).filter(t=>t.amount>0);
        } else {
          parsed=JSON.parse(raw);
          if(Array.isArray(parsed.transactions)) txns=parsed.transactions;
          else if(Array.isArray(parsed.entries)) txns=parsed.entries;
          else if(Array.isArray(parsed.data?.transactions)) txns=parsed.data.transactions;
          else if(Array.isArray(parsed)) txns=parsed;
          else {
            const arrVal=Object.values(parsed).find(v=>Array.isArray(v)&&v.length>0&&v[0]?.amount!==undefined);
            if(arrVal) txns=arrVal;
          }
        }
        if(!txns.length){
          alert("No transactions found in this file.\n\nFor JSON: file should contain a 'transactions' array.\nFor CSV: file should have columns: Date, Type, Amount, Category, Note.");
          return;
        }
        const normalised=txns.map(normaliseTxn).filter(t=>t.amount>0);
        if(!window.confirm(`Found ${normalised.length} transactions. Merge with current data?`)) return;
        setState(s=>{
          const existingIds=new Set(s.transactions.map(t=>String(t.id)));
          const newTxns=normalised.filter(t=>!existingIds.has(String(t.id)));
          return {...s,
            transactions:[...newTxns,...s.transactions].sort((a,b)=>b.date.localeCompare(a.date)),
            budgets:    parsed?.budgets    ||s.budgets,
            categories: parsed?.categories ||s.categories,
            templates:  parsed?.templates  ||s.templates,
            currency:   parsed?.currency   ||s.currency,
          };
        });
        showToast(`Restored ${normalised.length} transactions`);
      } catch(err) {
        alert("Import failed: "+err.message);
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  const { transactions, budgets, categories, templates, currency } = state;

  const pages = {
    home: <HomePage
      key={tabKey} transactions={transactions} budgets={budgets}
      categories={categories} templates={templates} currency={currency}
      onAdd={() => openAdd()} onTemplate={tpl => openAdd({type:"expense",amount:tpl.amount,category:tpl.catId,note:tpl.note||tpl.name,recurring:false,recurFreq:null})}
      onSetBudget={setBudget}
    />,
    ledger: <LedgerPage
      key={tabKey} transactions={transactions} categories={categories}
      currency={currency} onDelete={deleteTransaction}
      onEdit={txn => openAdd(txn, txn.id)} onAdd={() => openAdd()}
    />,
    analytics: <AnalyticsPage
      key={tabKey} transactions={transactions} categories={categories} currency={currency}
    />,
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {toast && <div className="toast" role="status">{toast}</div>}

        {showBackupBanner && transactions.length > 0 && (
          <div className="backup-banner" role="alert">
            <span>Back up your data to avoid losing it</span>
            <button className="backup-banner-btn" onClick={exportJSON}>Back up now</button>
            <button className="backup-banner-close" onClick={() => setShowBackupBanner(false)} aria-label="Dismiss">×</button>
          </div>
        )}

        <header className="topbar">
          <span className="wordmark">Expense Ledger</span>
          <div className="topbar-right">
            <button className="topbar-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
              <Icon name="settings" size={17} />
            </button>
          </div>
        </header>

        <main className="page">
          {pages[tab] || pages.home}
        </main>

        <button className="fab" onClick={() => openAdd()} aria-label="Add transaction">
          <Icon name="add" size={20} color="#F7F4EE" />
        </button>

        <nav className="tabbar" role="navigation" aria-label="Main navigation">
          {[
            { id:"home",      label:"Home",      icon:"home"  },
            { id:"ledger",    label:"Ledger",    icon:"list"  },
            { id:"analytics", label:"Analytics", icon:"chart" },
          ].map(t => (
            <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`}
              onClick={() => switchTab(t.id)} aria-label={t.label} aria-current={tab===t.id?"page":undefined}>
              <Icon name={t.icon} size={18} />
              <span className="tab-lbl">{t.label}</span>
              {tab === t.id && <span className="tab-active-line" />}
            </button>
          ))}
        </nav>

        {showAdd && (
          <AddEditOverlay
            categories={categories} templates={templates} currency={currency}
            transactions={transactions} prefill={prefill} editId={editId}
            onSave={txn => { editId ? updateTransaction(editId, txn) : addTransaction(txn); closeAdd(); }}
            onClose={closeAdd}
          />
        )}

        {showSettings && (
          <SettingsSheet
            state={state}
            onExportCSV={exportCSV} onExportJSON={exportJSON} onImportFile={importFile}
            onSetBudget={setBudget}
            onCurrencyChange={c => setState(s => ({...s,currency:c}))}
            onAddTemplate={tpl => setState(s=>({...s,templates:[...s.templates,{...tpl,id:"t"+Date.now()}]}))}
            onDeleteTemplate={id => setState(s=>({...s,templates:s.templates.filter(t=>t.id!==id)}))}
            onClose={() => setShowSettings(false)}
            showToast={showToast}
          />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────
function HomePage({ transactions, budgets, categories, templates, currency, onAdd, onTemplate, onSetBudget }) {
  const now  = curMon();
  const prev = (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();

  const curTxns  = transactions.filter(t => t.date.startsWith(now));
  const curExp   = curTxns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const curInc   = curTxns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const balance  = curInc - curExp;
  const prevExp  = transactions.filter(t=>t.date.startsWith(prev)&&t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const expDiff  = prevExp > 0 ? ((curExp-prevExp)/prevExp*100) : null;
  const savingsRate = curInc > 0 ? Math.max(0, Math.round(((curInc-curExp)/curInc)*100)) : null;

  const catSpend = {};
  curTxns.filter(t=>t.type==="expense").forEach(t=>{catSpend[t.category]=(catSpend[t.category]||0)+t.amount;});
  const activeBudgets = Object.entries(budgets).filter(([,v])=>v>0);
  const recent = transactions.slice(0,7);

  return (
    <div>
      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero-eyebrow">{monthName(now)}</div>
        <div className="hero-amount">{fmt(curExp, currency)}</div>
        <div className="hero-meta">
          <span>spent this month</span>
          {expDiff !== null && (
            <span className={`hero-trend ${expDiff <= 0 ? "down" : "up"}`}>
              <Icon name={expDiff <= 0 ? "arrowDown" : "arrowUp"} size={10} />
              {Math.abs(expDiff).toFixed(0)}% vs {monthShort(prev)}
            </span>
          )}
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className={`hero-stat-val${curInc>0?" pos":""}`}>{fmtCompact(curInc,currency)}</div>
            <div className="hero-stat-lbl">Income</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val neg">{fmtCompact(curExp,currency)}</div>
            <div className="hero-stat-lbl">Spent</div>
          </div>
          <div className="hero-stat">
            <div className={`hero-stat-val${balance>=0?" pos":" neg"}`}>
              {savingsRate !== null ? `${savingsRate}%` : "—"}
            </div>
            <div className="hero-stat-lbl">Saved</div>
          </div>
        </div>
      </div>

      {/* ── Quick-add templates ── */}
      {templates.length > 0 && (
        <>
          <div className="sec-label" style={{marginBottom:8}}>Quick Add</div>
          <div className="tpl-strip">
            {templates.map(tpl => {
              const cat = DEFAULT_CATEGORIES.find(c=>c.id===tpl.catId);
              return (
                <button key={tpl.id} className="tpl-card" onClick={() => onTemplate(tpl)}>
                  <CatIcon catId={tpl.catId} size={14} />
                  <span className="tpl-card-name">{tpl.name}</span>
                  <span className="tpl-card-amt">{fmt(tpl.amount,currency)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Budget bars ── */}
      {activeBudgets.length > 0 && (
        <div style={{marginBottom:22}}>
          <div className="sec-label">Budgets</div>
          {activeBudgets.map(([catId,limit]) => {
            const cat   = DEFAULT_CATEGORIES.find(c=>c.id===catId);
            const spent = catSpend[catId]||0;
            const pct   = Math.min((spent/limit)*100,100);
            const over  = spent>limit, warn=pct>=80&&!over;
            return (
              <div key={catId} className="budget-item">
                <div className="budget-hdr">
                  <div className="budget-name">
                    <CatIcon catId={catId} size={13} />
                    {cat?.name}
                  </div>
                  <span className="budget-nums">
                    <strong>{fmt(spent,currency)}</strong> / {fmt(limit,currency)}
                  </span>
                </div>
                <div className="budget-track">
                  <div className="budget-fill" style={{
                    width:`${pct}%`,
                    background: over?"var(--neg)":warn?"var(--warn)":(cat?.color||"var(--ink-3)")
                  }} />
                </div>
                <div className={`budget-msg${over?" over":warn?" warn":""}`}>
                  {over ? `${fmt(spent-limit,currency)} over limit`
                    : warn ? `${fmt(limit-spent,currency)} remaining — approaching limit`
                    : `${fmt(limit-spent,currency)} remaining`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recent ── */}
      {recent.length > 0 ? (
        <>
          <div className="sec-label">Recent Activity</div>
          <GroupedTxns txns={recent} categories={categories} currency={currency} compact />
        </>
      ) : (
        <div className="empty">
          <div className="empty-icon"><Icon name="list" size={32} /></div>
          <div className="empty-title">Nothing recorded yet</div>
          <div className="empty-body">Tap the + button to add your first transaction. Your spending summary will appear here.</div>
          <button className="btn btn-primary btn-full" style={{maxWidth:220,marginTop:4}} onClick={onAdd}>
            Add first transaction
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER PAGE
// ─────────────────────────────────────────────────────────────────────────────
function LedgerPage({ transactions, categories, currency, onDelete, onEdit, onAdd }) {
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [showDates,  setShowDates]  = useState(false);

  const filtered = useMemo(() => {
    let t = [...transactions];
    if (search) t = t.filter(x=>(x.note||"").toLowerCase().includes(search.toLowerCase())||x.category.toLowerCase().includes(search.toLowerCase()));
    if (catFilter  !== "all") t = t.filter(x=>x.category===catFilter);
    if (typeFilter !== "all") t = t.filter(x=>x.type===typeFilter);
    if (dateFrom)  t = t.filter(x=>x.date>=dateFrom);
    if (dateTo)    t = t.filter(x=>x.date<=dateTo);
    return t;
  }, [transactions, search, catFilter, typeFilter, dateFrom, dateTo]);

  const usedCats = useMemo(() =>
    [...new Set(transactions.map(t=>t.category))].map(id=>DEFAULT_CATEGORIES.find(c=>c.id===id)).filter(Boolean),
    [transactions]);

  const hasDateFilter = dateFrom || dateTo;

  if (transactions.length === 0) return (
    <div className="empty">
      <div className="empty-icon"><Icon name="list" size={32} /></div>
      <div className="empty-title">Ledger is empty</div>
      <div className="empty-body">Start recording expenses and income to see your full transaction history here.</div>
      <button className="btn btn-primary btn-full" style={{maxWidth:220,marginTop:4}} onClick={onAdd}>Add first entry</button>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:16}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700}}>Ledger</span>
        <span style={{fontSize:11,color:"var(--ink-3)"}}>{filtered.length} of {transactions.length}</span>
      </div>

      <div className="search-wrap">
        <span className="search-ico"><Icon name="search" size={14} /></span>
        <input className="search-input" placeholder="Search note or category…"
          value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search transactions" />
      </div>

      <div className="filter-bar">
        {["all","expense","income"].map(t=>(
          <button key={t} className={`chip${typeFilter===t?" on":""}`} onClick={()=>setTypeFilter(t)}>
            {t==="all"?"All types":t==="expense"?"Expenses":"Income"}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <button className={`chip${catFilter==="all"?" on":""}`} onClick={()=>setCatFilter("all")}>All categories</button>
        {usedCats.map(c=>(
          <button key={c.id} className={`chip${catFilter===c.id?" on":""}`} onClick={()=>setCatFilter(catFilter===c.id?"all":c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="date-filter-row">
        <button className={`date-filter-toggle${(showDates||hasDateFilter)?" active":""}`}
          onClick={()=>setShowDates(s=>!s)}>
          <Icon name="calendar" size={12} />
          {hasDateFilter ? "Date filter active" : "Filter by date"}
          <Icon name="chevronDown" size={11} style={{transform:showDates?"rotate(180deg)":"none",transition:"transform 150ms"}} />
        </button>
        {hasDateFilter && (
          <button className="chip on" onClick={()=>{setDateFrom("");setDateTo("");}} style={{fontSize:10}}>
            Clear ×
          </button>
        )}
      </div>

      {showDates && (
        <div className="date-inputs">
          <div className="date-input-wrap">
            <span className="date-lbl">From</span>
            <input type="date" className="date-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          </div>
          <div className="date-input-wrap">
            <span className="date-lbl">To</span>
            <input type="date" className="date-input" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty" style={{padding:"36px 0"}}>
          <div className="empty-icon"><Icon name="search" size={28} /></div>
          <div className="empty-title">No results</div>
          <div className="empty-body">Try adjusting your search or clearing the filters.</div>
        </div>
      ) : (
        <GroupedTxns txns={filtered} categories={categories} currency={currency}
          onDelete={onDelete} onEdit={onEdit} />
      )}
    </div>
  );
}

// ─── Grouped transaction list ─────────────────────────────────────────────────
function GroupedTxns({ txns, categories, currency, onDelete, onEdit, compact }) {
  const groups = useMemo(() => {
    const g = {};
    txns.forEach(t => { (g[t.date]=g[t.date]||[]).push(t); });
    return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]));
  }, [txns]);

  return (
    <>
      {groups.map(([date, rows]) => {
        const dayTotal = rows.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
        return (
          <div key={date} className="txn-group">
            <div className="txn-date-hdr">
              <span className="txn-date-lbl">{fmtDate(date)}</span>
              {dayTotal > 0 && <span className="txn-date-total">{fmt(dayTotal,currency)}</span>}
            </div>
            <div className="txn-list">
              {rows.map(t => (
                <TxnRow key={t.id} txn={t} currency={currency}
                  onDelete={onDelete} onEdit={onEdit} compact={compact} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function TxnRow({ txn, currency, onDelete, onEdit, compact }) {
  const cat   = DEFAULT_CATEGORIES.find(c=>c.id===txn.category) || {id:"other",name:txn.category,color:"#8A8A8A"};
  const isInc = txn.type === "income";

  return (
    <div className="txn-row">
      <div className="txn-ico" style={{background:cat.color+"18"}}>
        <CatIcon catId={cat.id} size={16} color={cat.color} />
      </div>
      <div className="txn-body">
        <div className="txn-name">{txn.note || cat.name}</div>
        <div className="txn-sub">
          <span>{cat.name}</span>
          {txn.note && txn.note !== cat.name && <span>·</span>}
          {!compact && <span>{fmtDate(txn.date)}</span>}
          {txn.recurring && (
            <span className="rec-pill">
              <Icon name="repeat" size={9} />
              {txn.recurFreq}
            </span>
          )}
        </div>
      </div>
      <div className="txn-right">
        <div className={`txn-amt ${isInc?"inc":"exp"}`}>
          {isInc ? "+" : "−"}{fmt(txn.amount,currency)}
        </div>
        {(onEdit || onDelete) && (
          <div className="txn-actions">
            {onEdit && (
              <button className="txn-action-btn" onClick={e=>{e.stopPropagation();onEdit(txn);}}
                aria-label="Edit transaction" title="Edit">
                <Icon name="edit" size={13} />
              </button>
            )}
            {onDelete && (
              <button className="txn-action-btn danger" onClick={e=>{e.stopPropagation();onDelete(txn.id);}}
                aria-label="Delete transaction" title="Delete">
                <Icon name="trash" size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsPage({ transactions, categories, currency }) {
  const now  = curMon();
  const prev = (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();

  const expenses    = transactions.filter(t=>t.type==="expense");
  const curExp      = expenses.filter(t=>t.date.startsWith(now)).reduce((s,t)=>s+t.amount,0);
  const prevExp     = expenses.filter(t=>t.date.startsWith(prev)).reduce((s,t)=>s+t.amount,0);
  const curInc      = transactions.filter(t=>t.type==="income"&&t.date.startsWith(now)).reduce((s,t)=>s+t.amount,0);
  const expChange   = prevExp > 0 ? ((curExp-prevExp)/prevExp*100) : null;

  // Category breakdown
  const catSpend = {};
  expenses.filter(t=>t.date.startsWith(now)).forEach(t=>{catSpend[t.category]=(catSpend[t.category]||0)+t.amount;});
  const catData = Object.entries(catSpend)
    .map(([id,amt])=>({...DEFAULT_CATEGORIES.find(c=>c.id===id)||{id,name:id,color:"#8A8A8A"},amt}))
    .sort((a,b)=>b.amt-a.amt);
  const maxCat = catData[0]?.amt || 1;

  // 6-month bars
  const months6 = Array.from({length:6},(_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-(5-i));
    return d.toISOString().slice(0,7);
  });
  const monthlyData = months6.map(m=>({
    label: monthShort(m),
    exp:   expenses.filter(t=>t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0),
    isCur: m===now,
  }));
  const maxMonth = Math.max(...monthlyData.map(m=>m.exp),1);

  // Weekly heatmap — last 8 weeks Mon–Sun
  const DAY_LBLS = ["M","T","W","T","F","S","S"];
  const heatRows = [];
  const now_ = new Date();
  const dow = now_.getDay(); // 0=Sun
  const toLastMon = dow === 0 ? 6 : dow - 1;
  const lastMon = new Date(now_); lastMon.setDate(now_.getDate() - toLastMon);

  for (let w=7; w>=0; w--) {
    const row = [];
    for (let d=0; d<7; d++) {
      const dt = new Date(lastMon); dt.setDate(lastMon.getDate() - (w*7) + d);
      const ds = dt.toISOString().slice(0,10);
      const amt = expenses.filter(t=>t.date===ds).reduce((s,t)=>s+t.amount,0);
      row.push({ date:ds, amt, isToday: ds===today() });
    }
    heatRows.push(row);
  }
  const maxHeat = Math.max(...heatRows.flat().map(c=>c.amt),1);

  // Most expensive day this month
  const dayTotals = {};
  expenses.filter(t=>t.date.startsWith(now)).forEach(t=>{dayTotals[t.date]=(dayTotals[t.date]||0)+t.amount;});
  const topDay = Object.entries(dayTotals).sort((a,b)=>b[1]-a[1])[0];

  if (expenses.length === 0) return (
    <div className="empty">
      <div className="empty-icon"><Icon name="chart" size={32} /></div>
      <div className="empty-title">No data yet</div>
      <div className="empty-body">Add a few weeks of transactions to see spending patterns and monthly comparisons.</div>
    </div>
  );

  return (
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,marginBottom:20}}>Analytics</div>

      {/* Summary card */}
      <div className="analytics-card">
        <div className="analytics-card-title">This Month — {monthName(now)}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:900,letterSpacing:-1.5,marginBottom:4}}>
          {fmt(curExp, currency)}
        </div>
        <div style={{fontSize:12,color:"var(--ink-3)",marginBottom:expChange!==null?8:0}}>total spent</div>
        {expChange !== null && (
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
            <span className={`hero-trend ${expChange<=0?"down":"up"}`} style={{fontSize:11}}>
              <Icon name={expChange<=0?"arrowDown":"arrowUp"} size={10} />
              {Math.abs(expChange).toFixed(0)}% vs {monthShort(prev)}
            </span>
            <span style={{color:"var(--ink-3)"}}>
              {expChange<=0?"less than":"more than"} last month ({fmt(prevExp,currency)})
            </span>
          </div>
        )}
        {topDay && (
          <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--rule)",fontSize:12,color:"var(--ink-3)"}}>
            Most expensive day: <strong style={{color:"var(--ink)",fontFamily:"'Playfair Display',serif"}}>{fmtDate(topDay[0])}</strong> — {fmt(topDay[1],currency)}
          </div>
        )}
        {curInc > 0 && (
          <div style={{marginTop:6,fontSize:12,color:"var(--ink-3)"}}>
            Savings rate: <strong style={{color:curInc>curExp?"var(--pos)":"var(--neg)",fontFamily:"'Playfair Display',serif"}}>
              {Math.max(0,Math.round(((curInc-curExp)/curInc)*100))}%
            </strong>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {catData.length > 0 && (
        <div className="analytics-card">
          <div className="analytics-card-title">By Category</div>
          {catData.map((cat,i) => (
            <div key={i} className="cat-bar-row">
              <div className="cat-bar-name">
                <CatIcon catId={cat.id} size={13} color={cat.color} />
                {cat.name}
              </div>
              <div className="cat-bar-track">
                <div className="cat-bar-fill" style={{width:`${(cat.amt/maxCat)*100}%`,background:cat.color}} />
              </div>
              <div className="cat-bar-amt">{fmt(cat.amt,currency)}</div>
              <div className="cat-bar-pct">{Math.round((cat.amt/curExp)*100)}%</div>
            </div>
          ))}
        </div>
      )}

      {/* 6-month comparison */}
      <div className="analytics-card">
        <div className="analytics-card-title">6-Month Spending</div>
        <div className="month-bars">
          {monthlyData.map((m,i) => (
            <div key={i} className="month-bar-col">
              <div className="month-bar-inner">
                <div className="month-bar-exp" style={{
                  height: m.exp>0 ? `${Math.max(4,(m.exp/maxMonth)*100)}%` : "2px",
                  width: "100%",
                  background: m.isCur ? "var(--accent)" : "var(--ink-4)",
                }} title={`${m.label}: ${fmt(m.exp,currency)}`} />
              </div>
              <div className="month-bar-lbl" style={{color:m.isCur?"var(--accent)":"var(--ink-4)",fontWeight:m.isCur?700:600}}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"var(--ink-3)"}}>
            <span style={{width:10,height:2,background:"var(--accent)",borderRadius:1,display:"inline-block"}} />
            Current month
          </span>
          <span style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"var(--ink-3)"}}>
            <span style={{width:10,height:2,background:"var(--ink-4)",borderRadius:1,display:"inline-block"}} />
            Previous months
          </span>
        </div>
      </div>

      {/* Weekly heatmap */}
      <div className="analytics-card">
        <div className="analytics-card-title">Weekly Spending — Last 8 Weeks</div>
        <div className="heatmap">
          <div className="heatmap-corner" />
          {DAY_LBLS.map((d,i)=>(
            <div key={i} className="heatmap-day-hdr">{d}</div>
          ))}
          {heatRows.map((row,wi)=>(
            <>
              <div key={`lbl${wi}`} className="heatmap-wk-lbl">
                {wi===7 ? <span style={{color:"var(--accent)",fontWeight:700}}>now</span> : ""}
              </div>
              {row.map((cell,di)=>{
                const intensity = cell.amt > 0 ? Math.max(0.1,(cell.amt/maxHeat)*0.9) : 0;
                return (
                  <div key={`${wi}-${di}`} className="heat-cell"
                    title={cell.amt>0?`${fmtDate(cell.date)}: ${fmt(cell.amt,currency)}`:`${fmtDate(cell.date)}: no spending`}
                    style={{
                      background: cell.amt>0 ? `rgba(107,31,42,${intensity})` : "var(--bg-inset)",
                      outline: cell.isToday ? "1.5px solid var(--ink)" : "none",
                      outlineOffset: "1px",
                    }}
                  />
                );
              })}
            </>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10,justifyContent:"flex-end"}}>
          <span style={{fontSize:9,color:"var(--ink-4)"}}>Less</span>
          {[0.1,0.3,0.6,0.9].map(o=>(
            <div key={o} style={{width:10,height:10,borderRadius:2,background:`rgba(107,31,42,${o})`}} />
          ))}
          <span style={{fontSize:9,color:"var(--ink-4)"}}>More</span>
        </div>
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

  const expCats = DEFAULT_CATEGORIES.filter(c=>!["salary","freelance"].includes(c.id));
  const incCats = DEFAULT_CATEGORIES.filter(c=>["salary","freelance","other"].includes(c.id));
  const displayCats = type==="income" ? incCats : expCats;

  useEffect(() => { setTimeout(()=>amtRef.current?.focus(),60); }, []);
  useEffect(() => {
    if (!prefill) setCatId(type==="income"?"salary":"food");
  }, [type]);

  const isDupe = useMemo(() => {
    if (isEditing || !amount || !parseFloat(amount)) return false;
    const amt = parseFloat(amount);
    const tenMinAgo = Date.now()-10*60*1000;
    return transactions.some(t=>t.category===catId&&Math.abs(t.amount-amt)<0.01&&new Date(t.date+"T00:00:00").getTime()>tenMinAgo);
  }, [amount, catId, transactions, isEditing]);

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt||amt<=0) { setErr("Please enter a valid amount"); return; }
    onSave({ type, amount:amt, category:catId, note:note.trim(), date, recurring:recur, recurFreq:recur?freq:null });
  };

  return (
    <div className="add-overlay" role="dialog" aria-modal="true" aria-label={isEditing?"Edit Transaction":"New Transaction"}>
      <div className="add-bar">
        <span className="add-bar-title">{isEditing?"Edit Transaction":"New Transaction"}</span>
        <button className="add-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="add-body">

        <div className="type-toggle" role="group" aria-label="Transaction type">
          <button className={`type-btn${type==="expense"?" active":""}`} onClick={()=>setType("expense")}>Expense</button>
          <button className={`type-btn${type==="income"?" active":""}`}  onClick={()=>setType("income")}>Income</button>
        </div>

        <div className="amount-zone">
          <input
            ref={amtRef}
            className="amount-input"
            type="number" inputMode="decimal"
            placeholder="0.00" value={amount}
            onChange={e=>{setAmount(e.target.value);setErr("");}}
            min="0" step="0.01"
            aria-label="Amount"
          />
          <div style={{fontSize:13,color:"var(--ink-3)",marginTop:4}}>{currency}</div>
        </div>

        {err && <div style={{color:"var(--neg)",fontSize:12,textAlign:"center",marginBottom:12,fontWeight:600}}>{err}</div>}
        {isDupe && (
          <div className="dupe-warn">
            <Icon name="other" size={14} />
            Similar transaction recorded recently — double entry?
          </div>
        )}

        {/* Templates (only on new transaction) */}
        {!isEditing && templates.length > 0 && (
          <div style={{marginBottom:16}}>
            <div className="field-lbl">Quick fill</div>
            <div className="tpl-strip" style={{marginBottom:0}}>
              {templates.filter(t=>t.catId&&(type==="income"?["salary","freelance","other"].includes(t.catId):!["salary","freelance"].includes(t.catId))).map(tpl=>(
                <button key={tpl.id} className="tpl-card" onClick={()=>{
                  setAmount(String(tpl.amount));setCatId(tpl.catId);setNote(tpl.note||tpl.name);setType("expense");
                }}>
                  <CatIcon catId={tpl.catId} size={13} />
                  <span className="tpl-card-name">{tpl.name}</span>
                  <span className="tpl-card-amt">{fmt(tpl.amount,currency)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label className="field-lbl">Category</label>
          <div className="cat-scroll">
            {displayCats.map(cat=>(
              <button key={cat.id} className={`cat-tile${catId===cat.id?" sel":""}`} onClick={()=>setCatId(cat.id)}>
                <CatIcon catId={cat.id} size={18} color={catId===cat.id?cat.color:undefined} />
                <span className="cat-tile-name">{cat.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-lbl" htmlFor="txn-note">Note <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ink-4)"}}>(optional)</span></label>
          <input id="txn-note" className="field-input"
            placeholder="e.g., Weekly shop, Barber, Netflix"
            value={note} onChange={e=>setNote(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&submit()} />
        </div>

        <div className="field-row" style={{marginBottom:16}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-lbl" htmlFor="txn-date">Date</label>
            <input id="txn-date" className="field-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-lbl">Recurring</label>
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
              <div className={`toggle-track${recur?" on":""}`} onClick={()=>setRecur(r=>!r)}
                role="switch" aria-checked={recur} tabIndex={0}
                onKeyDown={e=>(e.key===" "||e.key==="Enter")&&setRecur(r=>!r)}>
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

        <button className="btn btn-primary btn-full" onClick={submit}>
          {isEditing ? "Save Changes" : `Record ${type==="income"?"Income":"Expense"}`}
        </button>
        <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS SHEET
// ─────────────────────────────────────────────────────────────────────────────
function SettingsSheet({ state, onExportCSV, onExportJSON, onImportFile, onSetBudget, onCurrencyChange, onAddTemplate, onDeleteTemplate, onClose, showToast }) {
  const { transactions, budgets, categories, templates, currency } = state;
  const [curSym,     setCurSym]     = useState(currency);
  const [editBudget, setEditBudget] = useState(null);
  const [budgetVal,  setBudgetVal]  = useState("");
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [tplName,    setTplName]    = useState("");
  const [tplAmt,     setTplAmt]     = useState("");
  const [tplCatId,   setTplCatId]   = useState("food");
  const [tplNote,    setTplNote]    = useState("");
  const fileRef = useRef();

  const totalInc = transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExp = transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  const saveTpl = () => {
    if (!tplName.trim()||!parseFloat(tplAmt)) { showToast("Name and amount required"); return; }
    onAddTemplate({ name:tplName.trim(), amount:parseFloat(tplAmt), catId:tplCatId, note:tplNote.trim() });
    setTplName(""); setTplAmt(""); setTplNote(""); setShowNewTpl(false);
  };

  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="sheet-handle" />
        <div className="sheet-title">Settings</div>

        {/* OVERVIEW */}
        <div className="settings-section-title">Overview</div>
        <div style={{background:"var(--bg-warm)",borderRadius:7,padding:"12px 14px",marginBottom:4}}>
          {[
            ["Total income",   fmt(totalInc,currency), totalInc>0?"var(--pos)":"var(--ink)"],
            ["Total expenses", fmt(totalExp,currency), totalExp>0?"var(--neg)":"var(--ink)"],
            ["Net balance",    fmt(Math.abs(totalInc-totalExp),currency), totalInc>=totalExp?"var(--pos)":"var(--neg)"],
            ["Transactions",   String(transactions.length), "var(--ink)"],
          ].map(([lbl,val,col])=>(
            <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--rule)"}}>
              <span style={{fontSize:12,color:"var(--ink-3)"}}>{lbl}</span>
              <span style={{fontSize:13,fontWeight:700,color:col,fontFamily:"'Playfair Display',serif"}}>{val}</span>
            </div>
          ))}
        </div>

        {/* PREFERENCES */}
        <div className="settings-section-title" style={{marginTop:16}}>Preferences</div>

        {/* Currency */}
        <div className="settings-row">
          <div>
            <div className="settings-row-title">Currency</div>
            <div className="settings-row-sub">Symbol shown throughout the app</div>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <input className="field-input" value={curSym} onChange={e=>setCurSym(e.target.value)}
              maxLength={3} style={{width:52,textAlign:"center",padding:"7px 8px"}} aria-label="Currency symbol" />
            <button className="btn btn-sm btn-sm-primary" onClick={()=>{onCurrencyChange(curSym);showToast("Currency updated");}}>Save</button>
          </div>
        </div>

        {/* Templates */}
        <div style={{padding:"12px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--ink)"}}>Quick-Add Templates</span>
            <button className="btn btn-sm" onClick={()=>setShowNewTpl(s=>!s)}>
              {showNewTpl?"Cancel":"+ Add"}
            </button>
          </div>

          {showNewTpl && (
            <div style={{background:"var(--bg-warm)",borderRadius:7,padding:14,marginBottom:12}}>
              <div className="field-row" style={{marginBottom:10}}>
                <div className="field" style={{marginBottom:0}}>
                  <label className="field-lbl">Name</label>
                  <input className="field-input" placeholder="e.g., Coffee" value={tplName} onChange={e=>setTplName(e.target.value)} autoFocus />
                </div>
                <div className="field" style={{marginBottom:0}}>
                  <label className="field-lbl">Amount</label>
                  <input className="field-input" type="number" min="0" step="0.01" placeholder="0.00" value={tplAmt} onChange={e=>setTplAmt(e.target.value)} />
                </div>
              </div>
              <div className="field" style={{marginBottom:10}}>
                <label className="field-lbl">Category</label>
                <select className="field-input field-select" value={tplCatId} onChange={e=>setTplCatId(e.target.value)}>
                  {DEFAULT_CATEGORIES.filter(c=>!["salary","freelance"].includes(c.id)).map(c=>(
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{marginBottom:10}}>
                <label className="field-lbl">Note (optional)</label>
                <input className="field-input" placeholder="Pre-filled note" value={tplNote} onChange={e=>setTplNote(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-full" style={{marginTop:0,padding:"10px"}} onClick={saveTpl}>Save Template</button>
            </div>
          )}

          {templates.length === 0 && !showNewTpl && (
            <div style={{fontSize:12,color:"var(--ink-3)",padding:"6px 0"}}>No templates yet.</div>
          )}
          {templates.map(tpl=>(
            <div key={tpl.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid var(--rule)"}}>
              <CatIcon catId={tpl.catId} size={14} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{tpl.name}</div>
                <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmt(tpl.amount,currency)} · {DEFAULT_CATEGORIES.find(c=>c.id===tpl.catId)?.name}</div>
              </div>
              <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>onDeleteTemplate(tpl.id)} aria-label={`Delete ${tpl.name} template`}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Budgets */}
        <div style={{marginTop:8}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--ink)",marginBottom:10}}>Monthly Budgets</div>
          {DEFAULT_CATEGORIES.filter(c=>!["salary","freelance"].includes(c.id)).map((cat,i,arr)=>{
            const limit = budgets[cat.id]||0;
            return (
              <div key={cat.id} style={{padding:"10px 0",borderBottom:i<arr.length-1?"1px solid var(--rule)":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:600}}>
                    <CatIcon catId={cat.id} size={13} />
                    {cat.name}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {limit>0&&<span style={{fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:600}}>{fmt(limit,currency)}</span>}
                    <button className="btn btn-sm" style={{fontSize:10,padding:"4px 9px"}}
                      onClick={()=>{setEditBudget(cat.id);setBudgetVal(limit>0?String(limit):"");}}>
                      {limit>0?"Edit":"Set"}
                    </button>
                  </div>
                </div>
                {editBudget===cat.id&&(
                  <div style={{display:"flex",gap:7,marginTop:8}}>
                    <input className="field-input" type="number" min="0" step="1"
                      placeholder="Monthly limit" value={budgetVal}
                      onChange={e=>setBudgetVal(e.target.value)} autoFocus
                      style={{flex:1,padding:"8px 11px",fontSize:13}} />
                    <button className="btn btn-sm btn-sm-primary" onClick={()=>{onSetBudget(cat.id,parseFloat(budgetVal)||0);setEditBudget(null);showToast("Budget saved");}}>Save</button>
                    <button className="btn btn-sm" onClick={()=>setEditBudget(null)}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* DATA */}
        <div className="settings-section-title" style={{marginTop:16}}>Data</div>

        <div className="settings-row">
          <div>
            <div className="settings-row-title">Export CSV</div>
            <div className="settings-row-sub">Full ledger as spreadsheet</div>
          </div>
          <button className="btn btn-sm" onClick={onExportCSV} style={{display:"flex",alignItems:"center",gap:5}}>
            <Icon name="download" size={12} />Export
          </button>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-title">JSON Backup</div>
            <div className="settings-row-sub">{transactions.length} transactions · complete backup</div>
          </div>
          <button className="btn btn-sm btn-sm-primary" onClick={onExportJSON} style={{display:"flex",alignItems:"center",gap:5}}>
            <Icon name="download" size={12} />Backup
          </button>
        </div>

        <div className="settings-row" style={{flexDirection:"column",alignItems:"flex-start",gap:10}}>
          <div>
            <div className="settings-row-title">Restore from Backup</div>
            <div className="settings-row-sub">Accepts .json or .csv — merges with existing data, nothing deleted</div>
          </div>
          <div className="drop-zone" onClick={()=>fileRef.current?.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();onImportFile(e.dataTransfer.files[0]);}}>
            <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv"
              onChange={e=>{onImportFile(e.target.files[0]);e.target.value="";}} />
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:12,color:"var(--ink-3)",fontWeight:600}}>
              <Icon name="upload" size={14} />
              Click to select file, or drag & drop
            </div>
          </div>
        </div>

        {state.lastBackup ? (
          <div style={{fontSize:11,color:"var(--pos)",fontWeight:600,marginTop:8,display:"flex",alignItems:"center",gap:5}}>
            ✓ Last backup: {new Date(state.lastBackup).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}
          </div>
        ) : (
          <div style={{fontSize:11,color:"var(--neg)",fontWeight:600,marginTop:8}}>
            No backup yet — export one above to protect your data
          </div>
        )}

        <button className="btn btn-ghost btn-full" onClick={onClose} style={{marginTop:20}}>Close</button>
      </div>
    </div>
  );
}
