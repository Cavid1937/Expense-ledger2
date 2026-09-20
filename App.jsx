import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE LEDGER v8
// Storage key: expense_ledger_v5 — PERMANENT, never rename
// New in v8:
//   · Merchant as first-class field (separate from note)
//   · Merchant memory — learns from your own history, suggests on next entry
//   · Hierarchical categories (primary → subcategory)
//   · "What Changed?" — data-driven MoM comparison in Analytics
//   · Safe to Spend — income minus commitments minus savings target
//   · Goals — target amount + progress tracking
//   · Expanded shared calculation layer
//   · All existing features preserved
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "expense_ledger_v5";
const KEYS_LEGACY = [
  "finance_app_data","finance_editorial_v1","finance_editorial_v2",
  "finance_editorial_v3","finance_editorial_v4","finance_os_v3",
];

function readRaw(k) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } }
function writeRaw(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ─── Hierarchical category system ────────────────────────────────────────────
const CATEGORIES = [
  { id:"food",     name:"Food & Dining",        color:"#5C7A6E", income:false,
    subs:["Restaurants","Fast Food","Coffee","Groceries","Delivery","Snacks","Other"] },
  { id:"transport",name:"Transport",             color:"#4A6A7A", income:false,
    subs:["Metro","Bus","Taxi / Ride-hailing","Fuel","Parking","Car Maintenance","Intercity","Other"] },
  { id:"shopping", name:"Shopping",              color:"#7A6652", income:false,
    subs:["Clothing","Electronics","Personal Items","Home","Accessories","Online Shopping","Other"] },
  { id:"gifts",    name:"Gifts & Personal",      color:"#7A5C7A", income:false,
    subs:["Gifts","Donations","Personal Care","Barber / Hair","Cosmetics","Other"] },
  { id:"entertain",name:"Entertainment",         color:"#5C6A7A", income:false,
    subs:["Cinema","Games","Events","Sports","Hobbies","Other"] },
  { id:"digital",  name:"Bills & Subscriptions", color:"#3A6A5A", income:false,
    subs:["Mobile","Internet","Streaming","Software","Cloud Storage","Other Subs","Other"] },
  { id:"health",   name:"Health & Fitness",      color:"#4A5C7A", income:false,
    subs:["Gym","Sports Equipment","Pharmacy","Doctor / Dentist","Supplements","Other"] },
  { id:"edu",      name:"Education",             color:"#4A4A7A", income:false,
    subs:["University","Books","Courses","Exams","Stationery","Other"] },
  { id:"travel",   name:"Travel",                color:"#6A5A4A", income:false,
    subs:["Flights","Hotels","Visa","Travel Food","Travel Transport","Activities","Other"] },
  { id:"housing",  name:"Home",                  color:"#5A5A5A", income:false,
    subs:["Rent","Utilities","Household","Repairs","Other"] },
  { id:"finance",  name:"Finance",               color:"#4A6A4A", income:false,
    subs:["Bank Fees","Transfers","Taxes","Insurance","Investments","Other"] },
  { id:"other",    name:"Other",                 color:"#8A8A8A", income:false,
    subs:["Miscellaneous"] },
  { id:"salary",   name:"Salary",                color:"#2D6A4F", income:true,  subs:[] },
  { id:"freelance",name:"Freelance",             color:"#2D6A4F", income:true,  subs:[] },
  { id:"income",   name:"Other Income",          color:"#3D7A5F", income:true,  subs:[] },
];

const CAT = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === "other");

// Legacy category ID mapping → new IDs
const CATEGORY_MAP = {
  "food":"food","sport":"health","personal":"gifts","culture":"shopping",
  "transport":"transport","housing":"housing","digital":"digital",
  "edu":"edu","other":"other","salary":"salary","freelance":"freelance",
  "food & dining":"food","groceries & dining":"food","groceries":"food","dining":"food",
  "food and dining":"food","restaurant":"food","restaurants":"food","coffee":"food",
  "cafe":"food","lunch":"food","snacks":"food","breakfast":"food","dinner":"food",
  "sport & fitness":"health","sports":"health","fitness":"health",
  "gym":"health","football":"entertain","health & sport":"health","exercise":"health","workout":"health",
  "personal care":"gifts","skincare":"gifts","health":"health","grooming":"gifts","pharmacy":"health",
  "personal & health":"gifts","beauty":"gifts","medical":"health","doctor":"health","hygiene":"gifts",
  "style & culture":"shopping","culture & style":"shopping","fashion":"shopping","style":"shopping",
  "clothing":"shopping","clothes":"shopping","fragrance":"gifts","entertainment":"entertain",
  "shopping":"shopping","games":"entertain","gaming":"entertain","cinema":"entertain","movies":"entertain",
  "transportation":"transport","travel":"travel","bus":"transport","taxi":"transport",
  "uber":"transport","fuel":"transport","petrol":"transport","metro":"transport","benzin":"transport",
  "rent":"housing","home":"housing","utilities":"housing","bills":"digital","household":"housing",
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
  // Direct id match
  if (CATEGORIES.find(c => c.id === key)) return key;
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
    subcategory: t.subcategory || t.subcat || "",
    merchant:  t.merchant || t.merchantName || "",
    note:      t.note || t.description || t.name || "",
    date:      (t.date || new Date().toISOString().slice(0,10)).slice(0,10),
    recurring: t.recurring || false,
    recurFreq: t.recurFreq || t.frequency || null,
    isActive:  t.isActive !== undefined ? t.isActive : true,
    createdAt: t.createdAt || new Date().toISOString(),
  };
}

function migrateAndLoad() {
  const current = readRaw(KEY);
  if (current?.transactions) {
    if (!current.templates)  current.templates  = DEFAULT_TEMPLATES;
    if (!current.currency)   current.currency   = "₼";
    if (!current.goals)      current.goals      = [];
    if (!current.safeToSpend) current.safeToSpend = { savingsTarget: 0, enabled: false };
    // Migrate old transactions to include merchant/subcategory if missing
    current.transactions = current.transactions.map(t => ({
      ...t,
      merchant:    t.merchant    !== undefined ? t.merchant    : "",
      subcategory: t.subcategory !== undefined ? t.subcategory : "",
      isActive:    t.isActive    !== undefined ? t.isActive    : true,
    }));
    return current;
  }
  let merged = [], bestSettings = null;
  for (const k of KEYS_LEGACY) {
    const d = readRaw(k);
    if (!d) continue;
    const txns = d.transactions || d.entries || [];
    const existingIds = new Set(merged.map(t => String(t.id)));
    txns.forEach(t => {
      if (!existingIds.has(String(t.id))) {
        merged.push(normaliseTxn(t));
        existingIds.add(String(t.id));
      }
    });
    if (d.currency || d.budgets) bestSettings = d;
  }
  merged.sort((a,b) => b.date.localeCompare(a.date));
  return buildState(merged, bestSettings);
}

function buildState(transactions = [], settings = null) {
  const seeded = transactions.length === 0 ? SEED_TRANSACTIONS() : transactions;
  return {
    transactions: seeded,
    budgets:      settings?.budgets      || { food: 120, transport: 40, health: 50, digital: 20 },
    templates:    settings?.templates    || DEFAULT_TEMPLATES,
    currency:     settings?.currency     || "₼",
    goals:        settings?.goals        || [],
    safeToSpend:  settings?.safeToSpend  || { savingsTarget: 0, enabled: false },
    lastBackup:   settings?.lastBackup   || null,
  };
}

function SEED_TRANSACTIONS() {
  const d = n => { const dt = new Date(); dt.setDate(dt.getDate()-n); return dt.toISOString().slice(0,10); };
  return [
    { id:1001,type:"income", amount:800,  category:"salary",   subcategory:"",        merchant:"",           note:"Monthly stipend",          date:d(5),  recurring:true, recurFreq:"monthly",isActive:true },
    { id:1002,type:"expense",amount:30,   category:"health",   subcategory:"Gym",     merchant:"IdmanYeri",  note:"Gym membership",           date:d(6),  recurring:true, recurFreq:"monthly",isActive:true },
    { id:1003,type:"expense",amount:4.99, category:"digital",  subcategory:"Streaming",merchant:"Spotify",   note:"Spotify Premium",          date:d(4),  recurring:true, recurFreq:"monthly",isActive:true },
    { id:1004,type:"expense",amount:34.5, category:"food",     subcategory:"Groceries",merchant:"Bravo",     note:"High-protein groceries",   date:d(2),  recurring:false,recurFreq:null,     isActive:true },
    { id:1005,type:"expense",amount:12,   category:"entertain",subcategory:"Sports",  merchant:"Pitch 14",  note:"Football pitch fee",       date:d(3),  recurring:false,recurFreq:null,     isActive:true },
    { id:1006,type:"expense",amount:0.6,  category:"transport",subcategory:"Bus",     merchant:"BakuBus",   note:"BakuBus 594",             date:d(1),  recurring:false,recurFreq:null,     isActive:true },
    { id:1007,type:"expense",amount:18,   category:"gifts",    subcategory:"Cosmetics",merchant:"Scentbird", note:"Fragrance decant",         date:d(7),  recurring:false,recurFreq:null,     isActive:true },
    { id:1008,type:"expense",amount:22,   category:"gifts",    subcategory:"Personal Care",merchant:"Aptek", note:"Adapalene & glycolic acid",date:d(8),  recurring:false,recurFreq:null,     isActive:true },
    { id:1009,type:"expense",amount:4.5,  category:"food",     subcategory:"Coffee",  merchant:"Café Baku", note:"Coffee",                   date:d(1),  recurring:false,recurFreq:null,     isActive:true },
    { id:1010,type:"expense",amount:8,    category:"food",     subcategory:"Restaurants",merchant:"",        note:"Lunch",                    date:d(9),  recurring:false,recurFreq:null,     isActive:true },
  ];
}

const DEFAULT_TEMPLATES = [
  { id:"t1",name:"Groceries",      amount:35,  catId:"food",     subcat:"Groceries",  merchant:"Bravo",     note:"Weekly shop"    },
  { id:"t2",name:"Football Pitch", amount:12,  catId:"entertain",subcat:"Sports",     merchant:"Pitch 14",  note:"5-a-side pitch" },
  { id:"t3",name:"Fragrance",      amount:18,  catId:"gifts",    subcat:"Cosmetics",  merchant:"Scentbird", note:"Sample decant"  },
  { id:"t4",name:"Coffee",         amount:4.5, catId:"food",     subcat:"Coffee",     merchant:"Café Baku", note:"Café"           },
  { id:"t5",name:"Adapalene",      amount:12,  catId:"gifts",    subcat:"Personal Care",merchant:"Aptek",   note:"Skincare"       },
  { id:"t6",name:"Bus / Metro",    amount:0.6, catId:"transport",subcat:"Bus",        merchant:"BakuBus",   note:""               },
];

// ─── SVG icon system ──────────────────────────────────────────────────────────
const ICONS = {
  food:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
  transport: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  shopping:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
  gifts:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>`,
  entertain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  digital:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`,
  health:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  edu:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
  travel:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.14a16 16 0 006 6l1.5-1.5a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`,
  housing:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  finance:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
  other:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  salary:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  freelance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  income:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg>`,
  add:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  close:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  search:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  settings:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  edit:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  repeat:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
  chevDown:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  home:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  list:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  chart:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  download:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  filter:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  calendar:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  arrowUp:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  arrowDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
  pace:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  goal:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  safe:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  merchant:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>`,
  compare:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
};

function Icon({ name, size=16, color="currentColor", style={} }) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size,flexShrink:0,color,...style}}
      dangerouslySetInnerHTML={{__html:ICONS[name]||ICONS.other}} aria-hidden="true" />
  );
}
function CatIcon({ catId, size=16, color }) {
  const cat = CAT(catId);
  return <Icon name={catId} size={size} color={color||cat?.color||"#8A8A8A"} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today   = () => new Date().toISOString().slice(0,10);
const curMon  = () => new Date().toISOString().slice(0,7);
const prevMon = () => { const d=new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); };
const nMon    = (n) => { const d=new Date(); d.setMonth(d.getMonth()-n); return d.toISOString().slice(0,7); };

function fmt(n, sym="₼") {
  return `${Math.abs(n).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} ${sym}`;
}
function fmtShort(n, sym="₼") {
  const a = Math.abs(n);
  return a >= 1000 ? `${(a/1000).toFixed(1)}k ${sym}` : `${a.toFixed(2)} ${sym}`;
}
function fmtDate(d) {
  if (!d) return "";
  if (d === today()) return "Today";
  const y = new Date(); y.setDate(y.getDate()-1);
  if (d === y.toISOString().slice(0,10)) return "Yesterday";
  return new Date(d+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"});
}
function monthName(ym) { return new Date(ym+"-02").toLocaleDateString("en-GB",{month:"long",year:"numeric"}); }
function monthShort(ym) { return new Date(ym+"-02").toLocaleDateString("en-GB",{month:"short"}); }
function daysInMonth(ym) { const [y,m]=ym.split("-").map(Number); return new Date(y,m,0).getDate(); }
function median(arr) {
  if (!arr.length) return 0;
  const s=[...arr].sort((a,b)=>a-b),m=Math.floor(s.length/2);
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
}

// ─── Merchant memory ──────────────────────────────────────────────────────────
// Builds a map of merchant → {category, subcategory} from actual user history.
// Most recent occurrence wins. Used to suggest on next entry — never forced.
function buildMerchantMemory(transactions) {
  const mem = {};
  // Sort oldest first so newest overwrites
  [...transactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t => {
    if (t.merchant && t.merchant.trim()) {
      mem[t.merchant.trim().toLowerCase()] = { category: t.category, subcategory: t.subcategory||"", merchant: t.merchant.trim() };
    }
  });
  return mem;
}

function merchantSuggest(merchant, memory) {
  if (!merchant || !merchant.trim()) return null;
  const key = merchant.trim().toLowerCase();
  if (memory[key]) return memory[key];
  // Fuzzy: check if any remembered merchant starts with or contains the typed string
  for (const [k, v] of Object.entries(memory)) {
    if (k.startsWith(key) || key.startsWith(k)) return v;
  }
  return null;
}

// ─── Shared financial calculation layer ──────────────────────────────────────
function calcMonthSummary(transactions, mon=curMon(), prv=prevMon()) {
  const exp    = t => t.type==="expense";
  const inc    = t => t.type==="income";
  const inMon  = t => t.date.startsWith(mon);
  const inPrv  = t => t.date.startsWith(prv);
  const curExp  = transactions.filter(t=>exp(t)&&inMon(t)).reduce((s,t)=>s+t.amount,0);
  const curInc  = transactions.filter(t=>inc(t)&&inMon(t)).reduce((s,t)=>s+t.amount,0);
  const prevExp = transactions.filter(t=>exp(t)&&inPrv(t)).reduce((s,t)=>s+t.amount,0);
  const momDiff = prevExp > 0 ? curExp - prevExp : null;
  const savingsRate = curInc > 0 ? Math.max(0,Math.round(((curInc-curExp)/curInc)*100)) : null;
  return { curExp, curInc, prevExp, momDiff, savingsRate };
}

function calcCategorySpend(transactions, mon=curMon()) {
  const out = {};
  transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon))
    .forEach(t=>{ out[t.category]=(out[t.category]||0)+t.amount; });
  return out;
}

function calcSpendingPace(curExp, mon=curMon()) {
  const daysPassed = new Date().getDate();
  const totalDays  = daysInMonth(mon);
  const dailyAvg   = daysPassed>0?curExp/daysPassed:0;
  const projected  = dailyAvg*totalDays;
  const paceRatio  = totalDays>0?daysPassed/totalDays:0;
  const spendRatio = projected>0?curExp/projected:0;
  return { daysPassed,totalDays,dailyAvg,projected,onTrack:spendRatio<=paceRatio+0.05 };
}

function calcBudgetStatus(budgets, catSpend) {
  return Object.entries(budgets).filter(([,v])=>v>0).map(([catId,limit])=>{
    const spent=catSpend[catId]||0,pct=Math.min((spent/limit)*100,100);
    return { catId,limit,spent,pct,over:spent>limit,warn:pct>=80&&spent<=limit };
  });
}

function calcTxnStats(transactions, mon=curMon()) {
  const amts=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)).map(t=>t.amount);
  const isWkend=d=>[0,6].includes(new Date(d+"T00:00:00").getDay());
  const wkdExp=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&!isWkend(t.date)).reduce((s,t)=>s+t.amount,0);
  const wkndExp=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&isWkend(t.date)).reduce((s,t)=>s+t.amount,0);
  return { count:amts.length, avgTxn:amts.length?amts.reduce((s,a)=>s+a,0)/amts.length:0, medTxn:median(amts), weekdayExp:wkdExp, weekendExp:wkndExp };
}

function calcWhatChanged(transactions, mon=curMon(), prv=prevMon()) {
  const catSpendMon = calcCategorySpend(transactions, mon);
  const catSpendPrv = calcCategorySpend(transactions, prv);
  const { curExp, prevExp, curInc } = calcMonthSummary(transactions, mon, prv);
  const prevInc = transactions.filter(t=>t.type==="income"&&t.date.startsWith(prv)).reduce((s,t)=>s+t.amount,0);

  const cats = [...new Set([...Object.keys(catSpendMon),...Object.keys(catSpendPrv)])];
  const catChanges = cats.map(catId=>{
    const cur=catSpendMon[catId]||0, prev=catSpendPrv[catId]||0, diff=cur-prev;
    return { catId, cur, prev, diff };
  }).filter(c=>Math.abs(c.diff)>0.01).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));

  // Merchant-level changes
  const merchantMon={}, merchantPrv={};
  transactions.filter(t=>t.type==="expense"&&t.merchant&&t.date.startsWith(mon)).forEach(t=>{merchantMon[t.merchant]=(merchantMon[t.merchant]||0)+t.amount;});
  transactions.filter(t=>t.type==="expense"&&t.merchant&&t.date.startsWith(prv)).forEach(t=>{merchantPrv[t.merchant]=(merchantPrv[t.merchant]||0)+t.amount;});
  const merchants=[...new Set([...Object.keys(merchantMon),...Object.keys(merchantPrv)])];
  const merchantChanges=merchants.map(m=>({merchant:m,cur:merchantMon[m]||0,prev:merchantPrv[m]||0,diff:(merchantMon[m]||0)-(merchantPrv[m]||0)}))
    .filter(c=>Math.abs(c.diff)>0.01).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,5);

  return { curExp,prevExp,curInc,prevInc,catChanges,merchantChanges,totalDiff:curExp-prevExp };
}

function calcSafeToSpend(transactions, safeConfig, budgets) {
  const { savingsTarget=0 } = safeConfig||{};
  const mon = curMon();
  const { curInc, curExp } = calcMonthSummary(transactions, mon);
  const expenses = transactions.filter(t=>t.type==="expense");
  // Monthly recurring commitment (active only)
  const recurringTotal = transactions.filter(t=>t.recurring&&t.recurFreq&&t.isActive!==false&&t.type==="expense")
    .reduce((s,t)=>s+toMonthlyAmountHelper(t),0);
  const daysPassed = new Date().getDate();
  const totalDays  = daysInMonth(mon);
  const daysLeft   = totalDays - daysPassed;
  const disposable = curInc - recurringTotal - savingsTarget;
  const spent      = curExp;
  const remaining  = disposable - spent;
  const dailyAllowance = daysLeft > 0 ? remaining/daysLeft : 0;
  return { curInc, recurringTotal, savingsTarget, disposable, spent, remaining, daysLeft, dailyAllowance, feasible: curInc > 0 };
}

function calcGoalProgress(goal) {
  const { target=0, saved=0, monthlyTarget=0, targetDate } = goal;
  const pct   = target>0 ? Math.min((saved/target)*100,100) : 0;
  const remaining = Math.max(target-saved,0);
  let monthsNeeded = null;
  if (monthlyTarget>0 && remaining>0) monthsNeeded = Math.ceil(remaining/monthlyTarget);
  return { pct,remaining,monthsNeeded };
}

function toMonthlyAmountHelper(t) {
  if (!t.recurFreq) return t.amount;
  if (t.recurFreq==="weekly")   return t.amount*4.33;
  if (t.recurFreq==="biweekly") return t.amount*2.17;
  if (t.recurFreq==="monthly")  return t.amount;
  if (t.recurFreq==="yearly")   return t.amount/12;
  return t.amount;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F7F4EE;--bg-warm:#F0EDE5;--bg-card:#FDFCF9;--bg-inset:#EDEAE2;
  --ink:#1A1814;--ink-2:#3D3A35;--ink-3:#7A756D;--ink-4:#B5B0A8;--ink-5:#D5D1C9;
  --rule:#E8E4DC;--rule-2:#C8C4BC;
  --accent:#6B1F2A;--accent-light:#F5ECED;--accent-mid:#C4454F;
  --pos:#1D5C38;--pos-bg:#EBF4EE;
  --neg:#6B1F2A;--neg-bg:#F5ECED;
  --warn:#6B4C00;--warn-bg:#FBF6E7;
}
html,body{background:var(--bg);color:var(--ink);font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
.app{max-width:430px;margin:0 auto;min-height:100vh;background:var(--bg);display:flex;flex-direction:column}

/* Topbar */
.topbar{position:sticky;top:0;z-index:60;background:rgba(247,244,238,0.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--rule);padding:0 20px;height:52px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.wordmark{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:var(--ink);letter-spacing:-0.1px}
.topbar-right{display:flex;gap:4px}
.topbar-btn{width:34px;height:34px;border-radius:8px;background:transparent;border:none;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 120ms,color 120ms}
.topbar-btn:hover{background:var(--bg-inset);color:var(--ink)}

/* Tab bar */
.tabbar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(247,244,238,0.96);backdrop-filter:blur(24px);border-top:1px solid var(--rule);display:flex;z-index:60;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px))}
.tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0;border:none;background:transparent;cursor:pointer;color:var(--ink-4);transition:color 150ms;font-family:'DM Sans',sans-serif}
.tab-btn.active{color:var(--ink)}
.tab-lbl{font-size:9px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase}
.tab-line{width:16px;height:1.5px;background:var(--accent);border-radius:99px;margin-top:1px}

/* Page */
.page{flex:1;overflow-y:auto;padding:20px 20px 92px;animation:pageIn 160ms ease both}
@keyframes pageIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

/* Labels */
.label-sm{font-size:9px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink-3)}
.rule-line{height:1px;background:var(--rule);margin:18px 0}

/* Hero */
.hero{padding:18px 0 20px;border-bottom:1px solid var(--rule);margin-bottom:20px}
.hero-eyebrow{font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px}
.hero-amount{font-family:'Playfair Display',serif;font-size:44px;font-weight:900;letter-spacing:-2px;line-height:1;color:var(--ink);margin-bottom:4px}
.hero-sub{font-size:12px;color:var(--ink-3);margin-bottom:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mom-badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px}
.mom-badge.better{background:var(--pos-bg);color:var(--pos)}
.mom-badge.worse{background:var(--neg-bg);color:var(--neg)}
.hero-stats{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid var(--rule);border-radius:8px;overflow:hidden;background:var(--bg-card)}
.hero-stat{padding:11px 10px;position:relative}
.hero-stat:not(:last-child)::after{content:'';position:absolute;right:0;top:8px;bottom:8px;width:1px;background:var(--rule)}
.hero-stat-val{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;letter-spacing:-0.3px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hero-stat-val.pos{color:var(--pos)}
.hero-stat-val.neg{color:var(--neg)}
.hero-stat-lbl{font-size:9px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-4)}

/* Pace card */
.pace-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:12px 14px;margin-bottom:16px}
.pace-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
.pace-track{height:3px;background:var(--rule);border-radius:99px;overflow:hidden}
.pace-fill{height:100%;border-radius:99px;transition:width 0.5s ease}
.pace-fill.on-track{background:var(--pos)}
.pace-fill.over-pace{background:var(--neg)}
.pace-sub{display:flex;justify-content:space-between;margin-top:4px}

/* Safe to spend card */
.safe-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:14px 16px;margin-bottom:16px}
.safe-amount{font-family:'Playfair Display',serif;font-size:32px;font-weight:900;letter-spacing:-1.5px;margin:4px 0}
.safe-daily{font-size:11px;color:var(--ink-3);margin-top:3px}
.safe-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--rule);font-size:11px}
.safe-row:last-child{border-bottom:none}
.safe-lbl{color:var(--ink-3)}
.safe-val{font-family:'Playfair Display',serif;font-weight:600;color:var(--ink)}

/* Templates */
.tpl-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:16px;scrollbar-width:none}
.tpl-strip::-webkit-scrollbar{display:none}
.tpl-card{flex-shrink:0;display:flex;align-items:center;gap:7px;padding:8px 13px;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;cursor:pointer;transition:border-color 120ms,background 120ms}
.tpl-card:hover{border-color:var(--rule-2);background:var(--bg-warm)}
.tpl-card:active{transform:scale(0.97)}
.tpl-name{font-size:12px;font-weight:600;color:var(--ink-2);white-space:nowrap}
.tpl-amt{font-family:'Playfair Display',serif;font-size:12px;color:var(--ink-3);white-space:nowrap}

/* Budget bars */
.budget-item{margin-bottom:11px}
.budget-hdr{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}
.budget-name{font-size:12px;font-weight:600;color:var(--ink-2);display:flex;align-items:center;gap:5px}
.budget-nums{font-size:11px;color:var(--ink-3)}
.budget-nums strong{color:var(--ink);font-weight:700}
.budget-track{height:2px;background:var(--rule);border-radius:99px;overflow:hidden}
.budget-fill{height:100%;border-radius:99px;transition:width 0.5s ease}
.budget-msg{font-size:10px;margin-top:3px;color:var(--ink-4);font-weight:500}
.budget-msg.warn{color:var(--warn)}
.budget-msg.over{color:var(--neg)}

/* Transactions */
.txn-group{margin-bottom:16px}
.txn-date-hdr{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:6px;border-bottom:1px solid var(--rule)}
.txn-date-lbl{font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:var(--ink-3)}
.txn-date-total{font-family:'Playfair Display',serif;font-size:13px;font-weight:600;color:var(--ink)}
.txn-list{background:var(--bg-card);border:1px solid var(--rule);border-top:none;border-radius:0 0 8px 8px}
.txn-row{display:flex;align-items:center;gap:11px;padding:11px 13px;border-bottom:1px solid var(--rule);transition:background 100ms;cursor:pointer}
.txn-row:last-child{border-bottom:none;border-radius:0 0 8px 8px}
.txn-row:hover,.txn-row:active{background:var(--bg-warm)}
.txn-ico{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.txn-body{flex:1;min-width:0}
.txn-name{font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.txn-sub{font-size:11px;color:var(--ink-3);margin-top:1px;display:flex;gap:4px;align-items:center;flex-wrap:nowrap;overflow:hidden}
.txn-sub span{white-space:nowrap}
.rec-pill{display:inline-flex;align-items:center;gap:3px;background:var(--warn-bg);color:var(--warn);font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;flex-shrink:0}
.txn-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
.txn-amt{font-family:'Playfair Display',serif;font-size:14px;font-weight:600}
.txn-amt.exp{color:var(--ink)}
.txn-amt.inc{color:var(--pos)}
.txn-actions{display:flex;gap:1px}
.txn-act{width:28px;height:28px;border-radius:5px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink-4);transition:background 120ms,color 120ms}
.txn-act:hover{background:var(--bg-inset);color:var(--ink-2)}
.txn-act.del:hover{background:var(--neg-bg);color:var(--neg)}

/* Empty state */
.empty{text-align:center;padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:10px}
.empty-icon{color:var(--ink-5);margin-bottom:4px}
.empty-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:600;color:var(--ink)}
.empty-body{font-size:13px;color:var(--ink-3);line-height:1.65;max-width:240px}

/* FAB */
.fab{position:fixed;bottom:calc(68px + env(safe-area-inset-bottom,0px) + 14px);right:calc(max(18px,50vw - 197px));width:46px;height:46px;border-radius:12px;background:var(--ink);color:var(--bg);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(26,24,20,0.22);z-index:50;transition:transform 140ms cubic-bezier(0.34,1.56,0.64,1),box-shadow 140ms}
.fab:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(26,24,20,0.26)}
.fab:active{transform:scale(0.94)}

/* Add overlay */
.add-overlay{position:fixed;inset:0;background:var(--bg);z-index:100;display:flex;flex-direction:column;max-width:430px;margin:0 auto;animation:slideUp 220ms cubic-bezier(0.32,0.72,0,1);overflow-y:auto}
@keyframes slideUp{from{transform:translateY(100%);opacity:0.7}to{transform:translateY(0);opacity:1}}
.add-bar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--rule);flex-shrink:0}
.add-title{font-family:'Playfair Display',serif;font-size:17px;font-weight:700}
.add-close{width:30px;height:30px;border-radius:50%;border:1px solid var(--rule);background:transparent;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color 120ms,color 120ms}
.add-close:hover{border-color:var(--ink-3);color:var(--ink)}
.add-body{flex:1;padding:18px 20px 36px;display:flex;flex-direction:column}

/* Amount */
.amount-zone{text-align:center;padding:12px 0 16px;border-bottom:1px solid var(--rule);margin-bottom:16px}
.amount-input{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;letter-spacing:-2.5px;background:transparent;border:none;outline:none;color:var(--ink);width:200px;text-align:center;caret-color:var(--accent)}
.amount-input::placeholder{color:var(--ink-5)}
.amount-cur{font-size:13px;color:var(--ink-3);margin-top:2px}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
input[type=number]{-moz-appearance:textfield}

/* Type toggle */
.type-toggle{display:flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden;margin-bottom:14px}
.type-btn{flex:1;padding:9px;border:none;background:transparent;color:var(--ink-3);font-size:12px;font-weight:700;cursor:pointer;transition:background 120ms,color 120ms;font-family:'DM Sans',sans-serif;letter-spacing:0.3px;text-transform:uppercase}
.type-btn:not(:last-child){border-right:1px solid var(--rule)}
.type-btn.active{background:var(--ink);color:var(--bg)}

/* Category & subcategory */
.cat-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}
.cat-scroll::-webkit-scrollbar{display:none}
.cat-tile{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;width:54px;padding:8px 3px;border:1px solid var(--rule);border-radius:8px;background:var(--bg-card);cursor:pointer;transition:border-color 120ms,background 120ms}
.cat-tile.sel{border-color:var(--ink);background:var(--bg-warm)}
.cat-tile-name{font-size:9px;font-weight:600;color:var(--ink-3);text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%}
.cat-tile.sel .cat-tile-name{color:var(--ink)}
.sub-strip{display:flex;gap:5px;overflow-x:auto;padding-bottom:2px;margin-bottom:12px;scrollbar-width:none}
.sub-strip::-webkit-scrollbar{display:none}
.sub-chip{flex-shrink:0;padding:4px 10px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif;transition:all 120ms}
.sub-chip.sel{background:var(--ink);border-color:var(--ink);color:var(--bg)}

/* Merchant autocomplete */
.merchant-wrap{position:relative}
.merchant-suggestions{position:absolute;top:calc(100% + 2px);left:0;right:0;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;z-index:20;overflow:hidden;box-shadow:0 4px 16px rgba(26,24,20,0.1)}
.merchant-sug-item{padding:9px 13px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--rule);color:var(--ink);transition:background 100ms}
.merchant-sug-item:last-child{border-bottom:none}
.merchant-sug-item:hover{background:var(--bg-warm)}
.merchant-sug-sub{font-size:10px;color:var(--ink-3);margin-top:1px}

/* Form */
.field{margin-bottom:12px}
.field-lbl{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px;display:block}
.field-input{width:100%;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;padding:10px 12px;font-size:14px;color:var(--ink);font-family:'DM Sans',sans-serif;transition:border-color 120ms}
.field-input:focus{outline:none;border-color:var(--rule-2)}
.field-select{appearance:none;cursor:pointer}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* Toggle */
.toggle-track{width:40px;height:22px;border-radius:11px;background:var(--ink-5);position:relative;transition:background 150ms;flex-shrink:0;cursor:pointer}
.toggle-track.on{background:var(--ink)}
.toggle-knob{width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:3px;left:3px;transition:transform 150ms cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 1px 3px rgba(0,0,0,0.15)}
.toggle-track.on .toggle-knob{transform:translateX(18px)}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:6px;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer;transition:opacity 120ms,background 120ms}
.btn-full{width:100%}
.btn-primary{padding:12px 20px;background:var(--ink);color:var(--bg);border:1px solid var(--ink);font-size:14px;font-weight:700;margin-top:8px}
.btn-primary:hover{opacity:0.87}
.btn-ghost{padding:11px 20px;background:transparent;color:var(--ink-3);border:1px solid var(--rule);font-size:13px;margin-top:6px}
.btn-ghost:hover{border-color:var(--rule-2);color:var(--ink)}
.btn-sm{padding:5px 12px;font-size:11px;font-weight:700;background:transparent;border:1px solid var(--rule);color:var(--ink-2)}
.btn-sm:hover{border-color:var(--rule-2)}
.btn-sm-primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}

/* Search + filters */
.search-wrap{position:relative;margin-bottom:8px}
.search-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--ink-4);pointer-events:none}
.search-input{width:100%;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;padding:9px 12px 9px 34px;font-size:13px;color:var(--ink);font-family:'DM Sans',sans-serif;transition:border-color 120ms}
.search-input:focus{outline:none;border-color:var(--rule-2)}
.filter-bar{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px}
.filter-bar::-webkit-scrollbar{display:none}
.chip{flex-shrink:0;padding:5px 11px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;transition:all 120ms;white-space:nowrap;font-family:'DM Sans',sans-serif}
.chip.on{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.chip:hover:not(.on){border-color:var(--rule-2);color:var(--ink)}
.cat-filter-btn{display:flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;flex-shrink:0;transition:all 120ms}
.cat-filter-btn.active{border-color:var(--ink);color:var(--ink);background:var(--bg-warm)}
.date-filter-row{display:flex;align-items:center;gap:7px;margin-bottom:8px}
.date-filter-toggle{display:flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all 120ms}
.date-filter-toggle.active{background:var(--bg-warm);border-color:var(--rule-2);color:var(--ink)}
.date-inputs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.date-input-wrap{display:flex;flex-direction:column;gap:3px}
.date-lbl{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--ink-3)}
.date-input{background:var(--bg-card);border:1px solid var(--rule);border-radius:5px;padding:7px 9px;font-size:12px;color:var(--ink);font-family:'DM Sans',sans-serif;width:100%}
.date-input:focus{outline:none;border-color:var(--rule-2)}

/* Sheet */
.sheet-overlay{position:fixed;inset:0;background:rgba(26,24,20,0.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:80;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 150ms ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.sheet{background:var(--bg);width:100%;max-width:430px;border-radius:16px 16px 0 0;border-top:1px solid var(--rule);max-height:88vh;overflow-y:auto;animation:sheetRise 200ms cubic-bezier(0.32,0.72,0,1);padding:0 20px 44px}
@keyframes sheetRise{from{transform:translateY(32px);opacity:0}to{transform:translateY(0);opacity:1}}
.sheet-handle{width:32px;height:3px;background:var(--ink-5);border-radius:99px;margin:12px auto 18px}
.sheet-title{font-family:'Playfair Display',serif;font-size:21px;font-weight:700;margin-bottom:16px}
.settings-section-lbl{font-size:9px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-3);padding:14px 0 8px;border-bottom:1px solid var(--rule)}
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--rule);gap:12px}
.settings-row:last-of-type{border-bottom:none}
.settings-row-title{font-size:13px;font-weight:600;color:var(--ink)}
.settings-row-sub{font-size:11px;color:var(--ink-3);margin-top:2px}

/* Analytics */
.a-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:15px;margin-bottom:13px}
.a-card-title{font-size:9px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-3);margin-bottom:12px}
.cat-bar{display:flex;align-items:center;gap:8px;margin-bottom:9px}
.cat-bar:last-child{margin-bottom:0}
.cat-bar-name{font-size:12px;font-weight:500;color:var(--ink-2);width:96px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:5px}
.cat-bar-track{flex:1;height:3px;background:var(--rule);border-radius:99px;overflow:hidden}
.cat-bar-fill{height:100%;border-radius:99px;transition:width 0.6s ease}
.cat-bar-amt{font-family:'Playfair Display',serif;font-size:12px;font-weight:600;color:var(--ink);width:68px;text-align:right;flex-shrink:0}
.cat-bar-pct{font-size:10px;color:var(--ink-4);width:26px;text-align:right;flex-shrink:0}

/* Month bars */
.month-bars{display:flex;align-items:flex-end;gap:4px;height:80px;padding-top:8px}
.m-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;cursor:pointer;position:relative}
.m-bar{width:100%;border-radius:2px 2px 0 0;transition:height 0.5s ease,background 150ms;min-height:2px}
.m-lbl{font-size:9px;font-weight:700;letter-spacing:0.3px}

/* Heatmap */
.heatmap{display:grid;grid-template-columns:22px repeat(7,1fr);gap:2px}
.hm-corner{}
.hm-day-hdr{font-size:9px;font-weight:700;color:var(--ink-4);text-align:center;padding-bottom:3px}
.hm-wk-lbl{font-size:8px;color:var(--ink-5);text-align:right;padding-right:3px;display:flex;align-items:center;justify-content:flex-end}
.hm-cell{aspect-ratio:1;border-radius:2px;cursor:pointer}

/* Stats */
.stat-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:13px}
.stat-cell{background:var(--bg-card);border:1px solid var(--rule);border-radius:7px;padding:11px 12px}
.stat-val{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;letter-spacing:-0.5px;margin-bottom:2px}
.stat-lbl{font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-4)}

/* What Changed rows */
.wc-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--rule)}
.wc-row:last-child{border-bottom:none}
.wc-name{font-size:12px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:6px}
.wc-diff{font-family:'Playfair Display',serif;font-size:13px;font-weight:700}
.wc-diff.pos{color:var(--pos)}
.wc-diff.neg{color:var(--neg)}

/* Goals */
.goal-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:14px;margin-bottom:10px}
.goal-name{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:3px}
.goal-progress{height:4px;background:var(--rule);border-radius:99px;overflow:hidden;margin:8px 0 5px}
.goal-fill{height:100%;border-radius:99px;background:var(--accent);transition:width 0.6s ease}
.goal-meta{display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3)}

/* Snackbar */
.snackbar{position:fixed;bottom:calc(72px + env(safe-area-inset-bottom,0px) + 8px);left:50%;transform:translateX(-50%);background:var(--ink-2);color:var(--bg);padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;z-index:200;display:flex;align-items:center;gap:12px;white-space:nowrap;box-shadow:0 4px 16px rgba(26,24,20,0.25);animation:snackIn 200ms ease}
@keyframes snackIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.snackbar-undo{background:none;border:1px solid rgba(255,255,255,0.3);color:var(--bg);border-radius:5px;padding:3px 10px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif}

/* Toast */
.toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:9px 16px;border-radius:6px;font-size:12px;font-weight:600;z-index:300;white-space:nowrap;pointer-events:none;animation:toastIn 180ms ease;box-shadow:0 4px 16px rgba(26,24,20,0.2)}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* Backup banner */
.backup-banner{display:flex;align-items:center;gap:10px;padding:9px 16px;background:var(--warn-bg);border-bottom:1px solid #D4A82A;font-size:11px;font-weight:600;color:var(--warn)}
.backup-banner span{flex:1}
.backup-banner-btn{flex-shrink:0;padding:4px 10px;background:var(--warn);color:#fff;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif}
.backup-dismiss{background:none;border:none;color:var(--warn);font-size:15px;cursor:pointer;padding:2px;line-height:1;flex-shrink:0}

/* Drop zone */
.drop-zone{border:1.5px dashed var(--rule);border-radius:7px;padding:16px;text-align:center;cursor:pointer;transition:border-color 150ms,background 150ms;width:100%}
.drop-zone:hover{border-color:var(--rule-2);background:var(--bg-warm)}
.drop-zone input{display:none}

/* Dupe warning */
.dupe-warn{display:flex;align-items:center;gap:7px;background:var(--warn-bg);border:1px solid #D4A82A;border-radius:6px;padding:8px 11px;font-size:12px;font-weight:600;color:var(--warn);margin-bottom:11px}
`;

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [state,    setState]    = useState(() => migrateAndLoad());
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
  const [showBackupBanner, setShowBackupBanner] = useState(() => {
    const s = readRaw(KEY);
    if (!s?.lastBackup) return true;
    return (Date.now() - new Date(s.lastBackup).getTime()) / 86400000 >= 7;
  });
  const snackTimer = useRef(null);

  // PWA manifest
  useEffect(() => {
    if (document.getElementById("pwa-manifest")) return;
    const manifest = { name:"Expense Ledger",short_name:"Ledger",start_url:"/",display:"standalone",
      background_color:"#F7F4EE",theme_color:"#1A1814",orientation:"portrait",
      icons:[{src:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='36' fill='%231A1814'/%3E%3Ctext x='96' y='130' font-family='Georgia,serif' font-size='100' font-weight='700' fill='%23F7F4EE' text-anchor='middle'%3E%E2%82%BC%3C/text%3E%3C/svg%3E",sizes:"192x192",type:"image/svg+xml"}]
    };
    const link = document.createElement("link");
    link.id="pwa-manifest"; link.rel="manifest";
    link.href=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:"application/json"}));
    document.head.appendChild(link);
    const meta=(n,c)=>{const m=document.createElement("meta");m.name=n;m.content=c;document.head.appendChild(m);};
    meta("apple-mobile-web-app-capable","yes");
    meta("apple-mobile-web-app-status-bar-style","black-translucent");
    meta("apple-mobile-web-app-title","Expense Ledger");
    meta("theme-color","#1A1814");
  },[]);

  useEffect(() => { writeRaw(KEY, state); }, [state]);

  const merchantMemory = useMemo(() => buildMerchantMemory(state.transactions), [state.transactions]);

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 1800);
  }, []);

  const showSnackbar = useCallback((msg, onUndo) => {
    clearTimeout(snackTimer.current);
    setSnackbar({ msg, onUndo });
    snackTimer.current = setTimeout(() => setSnackbar(null), 4000);
  }, []);

  const switchTab = useCallback((t) => { setTab(t); setTabKey(k=>k+1); }, []);

  const addTransaction = useCallback((txn) => {
    setState(s => ({ ...s, transactions: [{ ...txn, id: Date.now()+Math.random(), createdAt: new Date().toISOString() }, ...s.transactions] }));
    showToast("Transaction recorded");
  }, [showToast]);

  const updateTransaction = useCallback((id, txn) => {
    setState(s => ({ ...s, transactions: s.transactions.map(t => t.id===id?{...t,...txn}:t) }));
    showToast("Transaction updated");
  }, [showToast]);

  const deleteTransaction = useCallback((id) => {
    let removed;
    setState(s => { removed=s.transactions.find(t=>t.id===id); return {...s,transactions:s.transactions.filter(t=>t.id!==id)}; });
    showSnackbar("Transaction deleted", () => {
      if (removed) setState(s=>({...s,transactions:[removed,...s.transactions].sort((a,b)=>b.date.localeCompare(a.date))}));
    });
  }, [showSnackbar]);

  const toggleRecurringActive = useCallback((id) => {
    setState(s => ({ ...s, transactions: s.transactions.map(t => t.id===id?{...t,isActive:t.isActive===false?true:false}:t) }));
  }, []);

  const openAdd = useCallback((prefillData=null, existingId=null) => {
    setPrefill(prefillData); setEditId(existingId); setShowAdd(true);
  }, []);
  const closeAdd = useCallback(() => { setShowAdd(false); setPrefill(null); setEditId(null); }, []);

  const exportCSV = useCallback(() => {
    const rows = [["Date","Type","Category","Subcategory","Merchant","Amount","Note","Recurring"]];
    state.transactions.forEach(t => rows.push([t.date,t.type,CAT(t.category)?.name||t.category,t.subcategory||"",t.merchant||"",t.amount.toFixed(2),t.note||"",t.recurring?t.recurFreq:""]));
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    a.download=`ledger-${today()}.csv`; a.click();
    showToast("CSV exported");
  }, [state.transactions, showToast]);

  const exportJSON = useCallback(() => {
    const now=new Date().toISOString();
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify({...state,exportedAt:now,version:8},null,2)],{type:"application/json"}));
    a.download=`ledger-backup-${today()}.json`; a.click();
    setState(s=>({...s,lastBackup:now}));
    setShowBackupBanner(false);
    showToast(`Backup saved — ${state.transactions.length} transactions`);
  }, [state, showToast]);

  const importFile = useCallback((file) => {
    if (!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try {
        const raw=e.target.result;
        const isCSV=file.name?.toLowerCase().endsWith(".csv")||raw.trimStart().toLowerCase().startsWith("date,");
        let txns=[],parsed=null;
        if (isCSV) {
          const lines=raw.trim().split(/\r?\n/);
          const headers=lines[0].toLowerCase().split(",").map(h=>h.replace(/"/g,"").trim());
          txns=lines.slice(1).filter(l=>l.trim()).map((line,i)=>{
            const fields=[]; let cur="",inQ=false;
            for(const ch of line){if(ch==='"'){inQ=!inQ;}else if(ch===","&&!inQ){fields.push(cur.trim());cur="";}else cur+=ch;}
            fields.push(cur.trim());
            const get=(...keys)=>{for(const k of keys){const idx=headers.indexOf(k);if(idx!==-1&&fields[idx]!==undefined)return fields[idx].replace(/^"|"$/g,"").trim();}return "";};
            const amount=Math.abs(parseFloat(get("amount","amt","value"))||0);
            return {id:Date.now()+i+Math.random(),type:get("type").toLowerCase().includes("inc")?"income":"expense",
              amount,category:resolveCategory(get("category","cat")),subcategory:get("subcategory","subcat"),
              merchant:get("merchant"),note:get("note","notes","description","memo"),
              date:(get("date")||today()).slice(0,10),recurring:false,recurFreq:null,isActive:true};
          }).filter(t=>t.amount>0);
        } else {
          parsed=JSON.parse(raw);
          if(Array.isArray(parsed.transactions)) txns=parsed.transactions;
          else if(Array.isArray(parsed.entries)) txns=parsed.entries;
          else if(Array.isArray(parsed)) txns=parsed;
          else{const v=Object.values(parsed).find(v=>Array.isArray(v)&&v.length>0&&v[0]?.amount!==undefined);if(v)txns=v;}
        }
        if (!txns.length) { showToast("No transactions found in file"); return; }
        const normalised=txns.map(normaliseTxn).filter(t=>t.amount>0);
        setImportPending({ normalised, parsed, filename: file.name });
      } catch(err) { showToast("Import failed: "+err.message); }
    };
    reader.readAsText(file);
  }, [showToast]);

  const commitImport = useCallback((mode) => {
    if (!importPending) return;
    const { normalised, parsed } = importPending;
    setState(s => {
      if (mode==="replace") return {...s,transactions:normalised.sort((a,b)=>b.date.localeCompare(a.date)),
        budgets:parsed?.budgets||s.budgets,templates:parsed?.templates||s.templates,currency:parsed?.currency||s.currency,goals:parsed?.goals||s.goals};
      const existingIds=new Set(s.transactions.map(t=>String(t.id)));
      const newTxns=normalised.filter(t=>!existingIds.has(String(t.id)));
      return {...s,transactions:[...newTxns,...s.transactions].sort((a,b)=>b.date.localeCompare(a.date)),
        budgets:parsed?.budgets||s.budgets,templates:parsed?.templates||s.templates,currency:parsed?.currency||s.currency,goals:parsed?.goals||s.goals};
    });
    showToast(mode==="replace"?`Replaced with ${importPending.normalised.length} transactions`:`Merged ${importPending.normalised.length} transactions`);
    setImportPending(null);
  }, [importPending, showToast]);

  const { transactions, budgets, templates, currency, goals, safeToSpend } = state;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {toast && <div className="toast" role="status">{toast}</div>}

        {snackbar && (
          <div className="snackbar" role="status">
            <span>{snackbar.msg}</span>
            <button className="snackbar-undo" onClick={()=>{snackbar.onUndo?.();setSnackbar(null);clearTimeout(snackTimer.current);}}>Undo</button>
          </div>
        )}

        {showBackupBanner && transactions.length>0 && (
          <div className="backup-banner" role="alert">
            <span>Back up your data to avoid losing it</span>
            <button className="backup-banner-btn" onClick={exportJSON}>Back up now</button>
            <button className="backup-dismiss" onClick={()=>setShowBackupBanner(false)} aria-label="Dismiss">×</button>
          </div>
        )}

        <header className="topbar">
          <span className="wordmark">Expense Ledger</span>
          <div className="topbar-right">
            <button className="topbar-btn" onClick={()=>setShowSettings(true)} aria-label="Settings">
              <Icon name="settings" size={17}/>
            </button>
          </div>
        </header>

        <main className="page" key={tabKey}>
          {tab==="home"      && <HomePage transactions={transactions} budgets={budgets} templates={templates} currency={currency} safeToSpend={safeToSpend} goals={goals} onAdd={()=>openAdd()} onTemplate={tpl=>openAdd({type:"expense",amount:tpl.amount,category:tpl.catId,subcategory:tpl.subcat||"",merchant:tpl.merchant||"",note:tpl.note||tpl.name,recurring:false,recurFreq:null})} onView={txn=>setViewTxn(txn)}/>}
          {tab==="ledger"    && <LedgerPage transactions={transactions} currency={currency} onDelete={deleteTransaction} onEdit={txn=>openAdd(txn,txn.id)} onView={txn=>setViewTxn(txn)} onAdd={()=>openAdd()}/>}
          {tab==="analytics" && <AnalyticsPage transactions={transactions} currency={currency} budgets={budgets}/>}
          {tab==="recurring" && <RecurringHub transactions={transactions} currency={currency} onView={txn=>setViewTxn(txn)} onToggleActive={toggleRecurringActive}/>}
        </main>

        <button className="fab" onClick={()=>openAdd()} aria-label="Add transaction">
          <Icon name="add" size={20} color="#F7F4EE"/>
        </button>

        <nav className="tabbar" role="navigation">
          {[{id:"home",label:"Home",icon:"home"},{id:"ledger",label:"Ledger",icon:"list"},{id:"analytics",label:"Analytics",icon:"chart"},{id:"recurring",label:"Recurring",icon:"repeat"}].map(t=>(
            <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>switchTab(t.id)} aria-label={t.label} aria-current={tab===t.id?"page":undefined}>
              <Icon name={t.icon} size={18}/>
              <span className="tab-lbl">{t.label}</span>
              {tab===t.id&&<span className="tab-line"/>}
            </button>
          ))}
        </nav>

        {showAdd && (
          <AddEditOverlay templates={templates} currency={currency} transactions={transactions} prefill={prefill} editId={editId} merchantMemory={merchantMemory}
            onSave={txn=>{editId?updateTransaction(editId,txn):addTransaction(txn);closeAdd();}} onClose={closeAdd}/>
        )}

        {showSettings && (
          <SettingsSheet state={state}
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

        {importPending && (
          <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&setImportPending(null)}>
            <div className="sheet" role="dialog" aria-modal="true">
              <div className="sheet-handle"/>
              <div className="sheet-title">Restore Backup</div>
              <div style={{background:"var(--bg-warm)",borderRadius:8,padding:"12px 14px",marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:4}}>{importPending.filename}</div>
                <div style={{fontSize:12,color:"var(--ink-3)"}}>{importPending.normalised.length} transactions found</div>
              </div>
              <div style={{fontSize:13,color:"var(--ink-2)",lineHeight:1.6,marginBottom:18}}>How would you like to restore this data?</div>
              <button className="btn btn-primary btn-full" style={{marginTop:0}} onClick={()=>commitImport("merge")}>Merge — add new, keep existing</button>
              <button className="btn btn-ghost btn-full" style={{marginTop:8,color:"var(--neg)",borderColor:"var(--neg-bg)"}} onClick={()=>commitImport("replace")}>Replace — overwrite all current data</button>
              <button className="btn btn-ghost btn-full" onClick={()=>setImportPending(null)}>Cancel</button>
            </div>
          </div>
        )}

        {viewTxn && (
          <TxnDetailSheet txn={viewTxn} currency={currency}
            onClose={()=>setViewTxn(null)}
            onEdit={()=>{openAdd(viewTxn,viewTxn.id);setViewTxn(null);}}
            onDuplicate={()=>{openAdd({...viewTxn,date:today(),id:undefined},null);setViewTxn(null);}}
            onDelete={()=>{deleteTransaction(viewTxn.id);setViewTxn(null);}}/>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────
function HomePage({ transactions, budgets, templates, currency, safeToSpend, goals, onAdd, onTemplate, onView }) {
  const now = curMon(), prv = prevMon();
  const { curExp, curInc, prevExp, momDiff, savingsRate } = calcMonthSummary(transactions, now, prv);
  const catSpend    = calcCategorySpend(transactions, now);
  const paceInfo    = calcSpendingPace(curExp, now);
  const budgetItems = calcBudgetStatus(budgets, catSpend);
  const safeInfo    = calcSafeToSpend(transactions, safeToSpend, budgets);
  const hasIncome   = curInc > 0;
  const recent      = transactions.slice(0, 7);

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">{monthName(now)}</div>
        <div className="hero-amount">{fmt(curExp,currency)}</div>
        <div className="hero-sub">
          <span>spent this month</span>
          {momDiff!==null && (
            <span className={`mom-badge ${momDiff<=0?"better":"worse"}`}>
              <Icon name={momDiff<=0?"arrowDown":"arrowUp"} size={10}/>
              {fmt(Math.abs(momDiff),currency)} {momDiff<=0?"less":"more"} than {monthShort(prv)}
            </span>
          )}
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className={`hero-stat-val${curInc>0?" pos":""}`}>{fmtShort(curInc,currency)}</div>
            <div className="hero-stat-lbl">Income</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val neg">{fmtShort(curExp,currency)}</div>
            <div className="hero-stat-lbl">Spent</div>
          </div>
          <div className="hero-stat">
            {hasIncome ? (
              <><div className={`hero-stat-val${savingsRate>=20?" pos":""}`}>{savingsRate}%</div><div className="hero-stat-lbl">Saved</div></>
            ) : (
              <><div className={`hero-stat-val${curInc-curExp>=0?" pos":" neg"}`}>{fmtShort(Math.abs(curInc-curExp),currency)}</div><div className="hero-stat-lbl">Balance</div></>
            )}
          </div>
        </div>
      </div>

      {/* Spending pace */}
      {curExp>0 && (
        <div className="pace-card">
          <div className="pace-row">
            <span className="label-sm" style={{display:"flex",alignItems:"center",gap:5}}><Icon name="pace" size={12} color="var(--ink-3)"/>Spending Pace</span>
            <span style={{fontSize:11,color:"var(--ink-3)"}}>Day {paceInfo.daysPassed} of {paceInfo.totalDays}</span>
          </div>
          <div className="pace-track">
            <div className={`pace-fill ${paceInfo.onTrack?"on-track":"over-pace"}`} style={{width:`${Math.min((paceInfo.projected>0?curExp/paceInfo.projected:0)*100,100)}%`}}/>
          </div>
          <div className="pace-sub">
            <span style={{fontSize:11,color:"var(--ink-3)"}}>{fmt(paceInfo.dailyAvg,currency)}/day avg</span>
            <span style={{fontSize:11,color:paceInfo.onTrack?"var(--pos)":"var(--neg)",fontWeight:600}}>~{fmt(paceInfo.projected,currency)} projected</span>
          </div>
        </div>
      )}

      {/* Safe to Spend */}
      {safeToSpend?.enabled && safeInfo.feasible && (
        <div className="safe-card" style={{marginBottom:16}}>
          <div className="label-sm" style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><Icon name="safe" size={12} color="var(--ink-3)"/>Safe to Spend</div>
          <div className={`safe-amount ${safeInfo.remaining<0?"":""}`} style={{color:safeInfo.remaining>=0?"var(--ink)":"var(--neg)"}}>{fmt(safeInfo.remaining,currency)}</div>
          {safeInfo.daysLeft>0 && <div className="safe-daily">{fmt(safeInfo.dailyAllowance,currency)}/day for {safeInfo.daysLeft} days remaining</div>}
          <div style={{marginTop:10,borderTop:"1px solid var(--rule)",paddingTop:8}}>
            <div className="safe-row"><span className="safe-lbl">Income this month</span><span className="safe-val">{fmt(safeInfo.curInc,currency)}</span></div>
            <div className="safe-row"><span className="safe-lbl">Recurring commitments</span><span className="safe-val">−{fmt(safeInfo.recurringTotal,currency)}</span></div>
            {safeInfo.savingsTarget>0&&<div className="safe-row"><span className="safe-lbl">Savings target</span><span className="safe-val">−{fmt(safeInfo.savingsTarget,currency)}</span></div>}
            <div className="safe-row"><span className="safe-lbl">Already spent</span><span className="safe-val">−{fmt(safeInfo.spent,currency)}</span></div>
          </div>
        </div>
      )}

      {/* Quick-add templates */}
      {templates.length>0 && (
        <>
          <div className="label-sm" style={{marginBottom:8}}>Quick Add</div>
          <div className="tpl-strip">
            {templates.map(tpl=>(
              <button key={tpl.id} className="tpl-card" onClick={()=>onTemplate(tpl)}>
                <CatIcon catId={tpl.catId} size={13}/>
                <span className="tpl-name">{tpl.name}</span>
                <span className="tpl-amt">{fmt(tpl.amount,currency)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Goals */}
      {goals?.length>0 && (
        <div style={{marginBottom:18}}>
          <div className="label-sm" style={{marginBottom:10}}>Goals</div>
          {goals.map(goal=>{
            const {pct,remaining,monthsNeeded}=calcGoalProgress(goal);
            return (
              <div key={goal.id} className="goal-card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <div className="goal-name">{goal.name}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700}}>{Math.round(pct)}%</div>
                </div>
                <div className="goal-progress"><div className="goal-fill" style={{width:`${pct}%`}}/></div>
                <div className="goal-meta">
                  <span>{fmt(goal.saved||0,currency)} of {fmt(goal.target||0,currency)}</span>
                  <span>{remaining>0?`${fmt(remaining,currency)} remaining`:""}{monthsNeeded?` · ~${monthsNeeded}mo`:""}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget bars */}
      {budgetItems.length>0 && (
        <div style={{marginBottom:18}}>
          <div className="label-sm" style={{marginBottom:10}}>Budgets</div>
          {budgetItems.map(({catId,limit,spent,pct,over,warn})=>{
            const cat=CAT(catId);
            return (
              <div key={catId} className="budget-item">
                <div className="budget-hdr">
                  <div className="budget-name"><CatIcon catId={catId} size={12}/>{cat?.name}</div>
                  <span className="budget-nums"><strong>{fmt(spent,currency)}</strong> / {fmt(limit,currency)}</span>
                </div>
                <div className="budget-track"><div className="budget-fill" style={{width:`${pct}%`,background:over?"var(--neg)":warn?"var(--warn)":(cat?.color||"var(--ink-3)")}}/></div>
                <div className={`budget-msg${over?" over":warn?" warn":""}`}>
                  {over?`${fmt(spent-limit,currency)} over limit`:warn?`${fmt(limit-spent,currency)} left — approaching limit`:`${fmt(limit-spent,currency)} remaining`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent */}
      {recent.length>0 ? (
        <>
          <div className="label-sm" style={{marginBottom:10}}>Recent Activity</div>
          <GroupedTxns txns={recent} currency={currency} onView={onView} compact/>
        </>
      ) : (
        <div className="empty">
          <div className="empty-icon"><Icon name="list" size={30}/></div>
          <div className="empty-title">Nothing recorded yet</div>
          <div className="empty-body">Tap + to add your first transaction.</div>
          <button className="btn btn-primary btn-full" style={{maxWidth:220,marginTop:4}} onClick={onAdd}>Add first transaction</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER PAGE
// ─────────────────────────────────────────────────────────────────────────────
function LedgerPage({ transactions, currency, onDelete, onEdit, onView, onAdd }) {
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter,  setCatFilter]  = useState("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [showDates,  setShowDates]  = useState(false);
  const [showCatSheet, setShowCatSheet] = useState(false);

  const filtered = useMemo(() => {
    let t=[...transactions];
    if (search) {
      const q=search.toLowerCase().trim(), asNum=parseFloat(q);
      t=t.filter(x=>{
        if ((x.note||"").toLowerCase().includes(q)) return true;
        if ((x.merchant||"").toLowerCase().includes(q)) return true;
        if (x.category.toLowerCase().includes(q)) return true;
        if ((x.subcategory||"").toLowerCase().includes(q)) return true;
        if (!isNaN(asNum)&&Math.abs(x.amount-asNum)<0.01) return true;
        if (x.date.includes(q)) return true;
        if (CAT(x.category)?.name.toLowerCase().includes(q)) return true;
        // Month name search
        const mn=new Date(x.date+"T00:00:00").toLocaleDateString("en-GB",{month:"long"}).toLowerCase();
        if (mn.includes(q)) return true;
        return false;
      });
    }
    if (typeFilter!=="all") t=t.filter(x=>x.type===typeFilter);
    if (catFilter!=="all")  t=t.filter(x=>x.category===catFilter);
    if (dateFrom)           t=t.filter(x=>x.date>=dateFrom);
    if (dateTo)             t=t.filter(x=>x.date<=dateTo);
    return t;
  }, [transactions,search,typeFilter,catFilter,dateFrom,dateTo]);

  const usedCats=useMemo(()=>[...new Set(transactions.map(t=>t.category))].map(id=>CAT(id)).filter(Boolean),[transactions]);
  const hasDateFilter=dateFrom||dateTo,hasCatFilter=catFilter!=="all";
  const selectedCat=CAT(catFilter);

  if (transactions.length===0) return (
    <div className="empty">
      <div className="empty-icon"><Icon name="list" size={30}/></div>
      <div className="empty-title">Ledger is empty</div>
      <div className="empty-body">Start recording to build your transaction history.</div>
      <button className="btn btn-primary btn-full" style={{maxWidth:220,marginTop:4}} onClick={onAdd}>Add first entry</button>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700}}>Ledger</span>
        <span style={{fontSize:11,color:"var(--ink-3)"}}>{filtered.length} of {transactions.length}</span>
      </div>

      <div className="search-wrap">
        <span className="search-ico"><Icon name="search" size={14}/></span>
        <input className="search-input" placeholder="Search merchant, note, category, amount, date…"
          value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search"/>
      </div>

      <div className="filter-bar">
        {["all","expense","income"].map(t=>(
          <button key={t} className={`chip${typeFilter===t?" on":""}`} onClick={()=>setTypeFilter(t)}>
            {t==="all"?"All":t==="expense"?"Expenses":"Income"}
          </button>
        ))}
        <button className={`cat-filter-btn${hasCatFilter?" active":""}`} onClick={()=>setShowCatSheet(true)}>
          {hasCatFilter?<><CatIcon catId={catFilter} size={12}/>{selectedCat?.name}</>:<><Icon name="filter" size={12}/>Category</>}
          <Icon name="chevDown" size={11}/>
        </button>
        <button className={`date-filter-toggle${(showDates||hasDateFilter)?" active":""}`} onClick={()=>setShowDates(s=>!s)}>
          <Icon name="calendar" size={12}/>{hasDateFilter?"Date active":"Date"}
        </button>
        {(hasCatFilter||hasDateFilter||typeFilter!=="all") && (
          <button className="chip on" style={{background:"var(--neg-bg)",borderColor:"var(--neg-bg)",color:"var(--neg)"}}
            onClick={()=>{setCatFilter("all");setDateFrom("");setDateTo("");setTypeFilter("all");}}>Clear ×</button>
        )}
      </div>

      {showDates && (
        <div className="date-inputs">
          <div className="date-input-wrap"><span className="date-lbl">From</span><input type="date" className="date-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
          <div className="date-input-wrap"><span className="date-lbl">To</span><input type="date" className="date-input" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>
        </div>
      )}

      {filtered.length===0 ? (
        <div className="empty" style={{padding:"36px 0"}}>
          <div className="empty-icon"><Icon name="search" size={28}/></div>
          <div className="empty-title">No results</div>
          <div className="empty-body">Try adjusting your search or clearing filters.</div>
        </div>
      ) : (
        <GroupedTxns txns={filtered} currency={currency} onDelete={onDelete} onEdit={onEdit} onView={onView}/>
      )}

      {showCatSheet && (
        <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&setShowCatSheet(false)}>
          <div className="sheet">
            <div className="sheet-handle"/>
            <div className="sheet-title">Filter by Category</div>
            {[{id:"all",name:"All Categories",color:"#8A8A8A"},...usedCats].map(cat=>(
              <button key={cat.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid var(--rule)",background:"none",border:"none",borderBottom:"1px solid var(--rule)",cursor:"pointer",width:"100%",textAlign:"left",font:"inherit"}}
                onClick={()=>{setCatFilter(cat.id==="all"?"all":cat.id);setShowCatSheet(false);}}>
                <div style={{width:34,height:34,borderRadius:8,background:(cat.color||"#8A8A8A")+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <CatIcon catId={cat.id} size={16} color={cat.color}/>
                </div>
                <span style={{fontSize:14,fontWeight:catFilter===cat.id?700:500,color:"var(--ink)",flex:1}}>{cat.name}</span>
                {catFilter===cat.id&&<span style={{color:"var(--accent)",fontWeight:700,fontSize:12}}>✓</span>}
              </button>
            ))}
            <button className="btn btn-ghost btn-full" style={{marginTop:14}} onClick={()=>setShowCatSheet(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupedTxns({ txns, currency, onDelete, onEdit, onView, compact }) {
  const groups=useMemo(()=>{
    const g={}; txns.forEach(t=>{(g[t.date]=g[t.date]||[]).push(t);});
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
  const displayName = txn.merchant || txn.note || cat?.name || txn.category;
  const displaySub  = [
    txn.merchant && txn.note ? txn.note : null,
    cat?.name,
    txn.subcategory || null,
    !compact ? fmtDate(txn.date) : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="txn-row" onClick={()=>onView?.(txn)}>
      <div className="txn-ico" style={{background:(cat?.color||"#8A8A8A")+"18"}}>
        <CatIcon catId={txn.category} size={16} color={cat?.color}/>
      </div>
      <div className="txn-body">
        <div className="txn-name">{displayName}</div>
        <div className="txn-sub">
          <span>{displaySub}</span>
          {txn.recurring&&<span className="rec-pill"><Icon name="repeat" size={9}/>{txn.recurFreq}</span>}
        </div>
      </div>
      <div className="txn-right">
        <div className={`txn-amt ${isInc?"inc":"exp"}`}>{isInc?"+":"−"}{fmt(txn.amount,currency)}</div>
        {(onEdit||onDelete)&&!onView&&(
          <div className="txn-actions">
            {onEdit&&<button className="txn-act" onClick={e=>{e.stopPropagation();onEdit(txn);}} aria-label="Edit"><Icon name="edit" size={13}/></button>}
            {onDelete&&<button className="txn-act del" onClick={e=>{e.stopPropagation();onDelete(txn.id);}} aria-label="Delete"><Icon name="trash" size={13}/></button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsPage({ transactions, currency, budgets }) {
  const now=curMon(),prv=prevMon();
  const {curExp,curInc,prevExp,momDiff}=calcMonthSummary(transactions,now,prv);
  const catSpend   =calcCategorySpend(transactions,now);
  const paceInfo   =calcSpendingPace(curExp,now);
  const txnStats   =calcTxnStats(transactions,now);
  const budgetItems=calcBudgetStatus(budgets||{},catSpend);
  const wc         =calcWhatChanged(transactions,now,prv);
  const expenses   =transactions.filter(t=>t.type==="expense");

  const [activeBar,  setActiveBar]  = useState(null);
  const [activeCell, setActiveCell] = useState(null);

  const catData=Object.entries(catSpend).map(([id,amt])=>({...CAT(id)||{id,name:id,color:"#8A8A8A"},amt})).sort((a,b)=>b.amt-a.amt);
  const maxCat=catData[0]?.amt||1;
  const topExpenses=expenses.filter(t=>t.date.startsWith(now)).sort((a,b)=>b.amount-a.amount).slice(0,5);
  const months6=Array.from({length:6},(_,i)=>nMon(5-i));
  const monthlyData=months6.map(m=>({label:monthShort(m),exp:expenses.filter(t=>t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0),isCur:m===now,ym:m}));
  const maxMonth=Math.max(...monthlyData.map(m=>m.exp),1);
  const monthAvg=monthlyData.filter(m=>!m.isCur&&m.exp>0).reduce((s,m,_,a)=>s+m.exp/a.length,0);
  const daysInMon=daysInMonth(now),daysLeft=daysInMon-new Date().getDate();

  const DAY_LBLS=["M","T","W","T","F","S","S"];
  const heatRows=[];
  const now_=new Date(),dow=now_.getDay(),toLastMon=dow===0?6:dow-1;
  const lastMon=new Date(now_);lastMon.setDate(now_.getDate()-toLastMon);
  for(let w=7;w>=0;w--){
    const row=[];
    for(let d=0;d<7;d++){
      const dt=new Date(lastMon);dt.setDate(lastMon.getDate()-(w*7)+d);
      const ds=dt.toISOString().slice(0,10);
      const amt=expenses.filter(t=>t.date===ds).reduce((s,t)=>s+t.amount,0);
      const cats=expenses.filter(t=>t.date===ds).map(t=>CAT(t.category)?.name||t.category).filter((v,i,a)=>a.indexOf(v)===i).join(", ");
      row.push({date:ds,amt,cats,isToday:ds===today()});
    }
    heatRows.push(row);
  }
  const maxHeat=Math.max(...heatRows.flat().map(c=>c.amt),1);

  if (expenses.length===0) return (
    <div className="empty">
      <div className="empty-icon"><Icon name="chart" size={30}/></div>
      <div className="empty-title">No data yet</div>
      <div className="empty-body">Add a few transactions to see spending patterns.</div>
    </div>
  );

  return (
    <div onClick={()=>{setActiveBar(null);setActiveCell(null);}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,marginBottom:18}}>Analytics</div>

      {/* Summary */}
      <div className="a-card">
        <div className="a-card-title">{monthName(now)}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:900,letterSpacing:-1.5,marginBottom:4}}>{fmt(curExp,currency)}</div>
        <div style={{fontSize:12,color:"var(--ink-3)",marginBottom:momDiff!==null?8:0}}>total spent</div>
        {momDiff!==null&&(
          <div style={{display:"flex",alignItems:"center",gap:7,fontSize:12,flexWrap:"wrap"}}>
            <span className={`mom-badge ${momDiff<=0?"better":"worse"}`}>
              <Icon name={momDiff<=0?"arrowDown":"arrowUp"} size={10}/>
              {fmt(Math.abs(momDiff),currency)} {momDiff<=0?"less":"more"} than {monthShort(prv)}
            </span>
            {prevExp>0&&<span style={{color:"var(--ink-3)"}}>({fmt(prevExp,currency)} last month)</span>}
          </div>
        )}
        {paceInfo.dailyAvg>0&&(
          <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--rule)",display:"flex",justifyContent:"space-between",fontSize:12}}>
            <span style={{color:"var(--ink-3)"}}>Daily avg: <strong style={{fontFamily:"'Playfair Display',serif",color:"var(--ink)"}}>{fmt(paceInfo.dailyAvg,currency)}</strong></span>
            <span style={{color:"var(--ink-3)"}}>Projected: <strong style={{fontFamily:"'Playfair Display',serif",color:paceInfo.projected>prevExp+20?"var(--neg)":"var(--ink)"}}>{fmt(paceInfo.projected,currency)}</strong></span>
          </div>
        )}
        {curInc>0&&<div style={{marginTop:6,fontSize:12,color:"var(--ink-3)"}}>Savings rate: <strong style={{fontFamily:"'Playfair Display',serif",color:curInc>curExp?"var(--pos)":"var(--neg)"}}>{Math.max(0,Math.round(((curInc-curExp)/curInc)*100))}%</strong></div>}
      </div>

      {/* What Changed */}
      {(wc.totalDiff!==0||wc.catChanges.length>0)&&prevExp>0&&(
        <div className="a-card">
          <div className="a-card-title">What Changed vs {monthShort(prv)}</div>
          <div className="wc-row" style={{paddingTop:0}}>
            <span className="wc-name" style={{fontWeight:700}}>Total spending</span>
            <div style={{textAlign:"right"}}>
              <div className={`wc-diff ${wc.totalDiff<=0?"pos":"neg"}`}>{wc.totalDiff>0?"+":""}{fmt(wc.totalDiff,currency)}</div>
              <div style={{fontSize:10,color:"var(--ink-3)"}}>{fmt(wc.curExp,currency)} vs {fmt(wc.prevExp,currency)}</div>
            </div>
          </div>
          {wc.catChanges.slice(0,5).map(({catId,cur,prev,diff})=>{
            const cat=CAT(catId);
            return (
              <div key={catId} className="wc-row">
                <div className="wc-name"><CatIcon catId={catId} size={13} color={cat?.color}/>{cat?.name}</div>
                <div style={{textAlign:"right"}}>
                  <div className={`wc-diff ${diff<=0?"pos":"neg"}`}>{diff>0?"+":""}{fmt(diff,currency)}</div>
                  <div style={{fontSize:10,color:"var(--ink-3)"}}>{fmt(cur,currency)} vs {fmt(prev,currency)}</div>
                </div>
              </div>
            );
          })}
          {wc.merchantChanges.length>0&&(
            <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--rule)"}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--ink-3)",marginBottom:8}}>By Merchant</div>
              {wc.merchantChanges.map(({merchant,cur,prev,diff})=>(
                <div key={merchant} className="wc-row">
                  <div className="wc-name" style={{display:"flex",alignItems:"center",gap:6}}><Icon name="merchant" size={12} color="var(--ink-3)"/>{merchant}</div>
                  <div style={{textAlign:"right"}}>
                    <div className={`wc-diff ${diff<=0?"pos":"neg"}`}>{diff>0?"+":""}{fmt(diff,currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction stats */}
      {txnStats.count>0&&(
        <div className="stat-row">
          <div className="stat-cell"><div className="stat-val">{txnStats.count}</div><div className="stat-lbl">Transactions</div></div>
          <div className="stat-cell"><div className="stat-val">{fmt(txnStats.avgTxn,currency)}</div><div className="stat-lbl">Avg per txn</div></div>
          <div className="stat-cell"><div className="stat-val">{fmt(txnStats.medTxn,currency)}</div><div className="stat-lbl">Median</div></div>
          <div className="stat-cell"><div className="stat-val">{fmt(txnStats.weekendExp>txnStats.weekdayExp?txnStats.weekendExp:txnStats.weekdayExp,currency)}</div><div className="stat-lbl">{txnStats.weekendExp>txnStats.weekdayExp?"Weekends":"Weekdays"} heavier</div></div>
        </div>
      )}

      {/* Budget insights */}
      {budgetItems.length>0&&(
        <div className="a-card">
          <div className="a-card-title">Budget Status — {monthName(now)}</div>
          {budgetItems.map(({catId,limit,spent,pct,over,warn})=>{
            const cat=CAT(catId);
            const budgetPace=Math.round((paceInfo.daysPassed/daysInMon)*100);
            const aheadOfBudget=Math.round(pct)>budgetPace+10;
            return (
              <div key={catId} style={{marginBottom:13,paddingBottom:13,borderBottom:"1px solid var(--rule)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6}}><CatIcon catId={catId} size={13}/>{cat?.name}</div>
                  <div style={{fontSize:11,color:over?"var(--neg)":warn?"var(--warn)":"var(--ink-3)",fontWeight:600}}>{Math.round(pct)}% used</div>
                </div>
                <div style={{height:3,background:"var(--rule)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",width:`${pct}%`,background:over?"var(--neg)":warn?"var(--warn)":(cat?.color||"var(--ink-3)"),borderRadius:99}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                  <span style={{color:over?"var(--neg)":warn?"var(--warn)":"var(--ink-3)",fontWeight:over||warn?600:400}}>
                    {over?`${fmt(spent-limit,currency)} over limit`:`${fmt(limit-spent,currency)} remaining`}
                  </span>
                  <span style={{color:"var(--ink-4)"}}>{over?"exceeded":`${daysLeft}d left`}</span>
                </div>
                {aheadOfBudget&&!over&&<div style={{fontSize:10,color:"var(--warn)",fontWeight:600,marginTop:2}}>Spending pace is ahead of budget pace</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Category breakdown */}
      {catData.length>0&&(
        <div className="a-card">
          <div className="a-card-title">By Category</div>
          {catData.map((cat,i)=>(
            <div key={i} className="cat-bar">
              <div className="cat-bar-name"><CatIcon catId={cat.id} size={13} color={cat.color}/>{cat.name}</div>
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
          <div className="a-card-title">Top Expenses This Month</div>
          {topExpenses.map((t,i)=>{
            const cat=CAT(t.category)||{color:"#8A8A8A",name:t.category};
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<topExpenses.length-1?"1px solid var(--rule)":"none"}}>
                <div style={{width:32,height:32,borderRadius:7,background:(cat.color)+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <CatIcon catId={t.category} size={15} color={cat.color}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.merchant||t.note||cat.name}</div>
                  <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmtDate(t.date)} · {cat.name}{t.subcategory?` / ${t.subcategory}`:""}</div>
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,flexShrink:0}}>−{fmt(t.amount,currency)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6-month chart — tap interaction */}
      <div className="a-card">
        <div className="a-card-title">6-Month Spending</div>
        {monthAvg>0&&<div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10}}>6-month avg: <strong style={{fontFamily:"'Playfair Display',serif",color:"var(--ink)"}}>{fmt(monthAvg,currency)}</strong></div>}
        {activeBar!==null&&monthlyData[activeBar]&&(
          <div style={{background:"var(--ink)",color:"var(--bg)",borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:600,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
            <span>{new Date(monthlyData[activeBar].ym+"-02").toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</span>
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
        <div className="a-card-title">Weekly Spending — Last 8 Weeks</div>
        {activeCell!==null&&(()=>{
          const cell=heatRows[activeCell.wi]?.[activeCell.di];
          if(!cell) return null;
          return (
            <div style={{background:"var(--ink)",color:"var(--bg)",borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:600,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:cell.cats?3:0}}>
                <span>{fmtDate(cell.date)}</span>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:14}}>{cell.amt>0?fmt(cell.amt,currency):"No spending"}</span>
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
              <div key={`w${wi}`} className="hm-wk-lbl">{wi===7?<span style={{color:"var(--accent)",fontWeight:700,fontSize:7}}>now</span>:""}</div>
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
          <span style={{fontSize:9,color:"var(--ink-4)"}}>Less</span>
          {[0.1,0.3,0.6,0.9].map(o=><div key={o} style={{width:10,height:10,borderRadius:2,background:`rgba(107,31,42,${o})`}}/>)}
          <span style={{fontSize:9,color:"var(--ink-4)"}}>More · tap to see details</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURRING HUB
// ─────────────────────────────────────────────────────────────────────────────
function nextDueDate(txn) {
  const freq=txn.recurFreq;
  let d=new Date(txn.date+"T00:00:00");
  const now=new Date(); now.setHours(0,0,0,0);
  while(d<=now){
    if(freq==="weekly")    d.setDate(d.getDate()+7);
    else if(freq==="biweekly") d.setDate(d.getDate()+14);
    else if(freq==="monthly")  d.setMonth(d.getMonth()+1);
    else if(freq==="yearly")   d.setFullYear(d.getFullYear()+1);
    else break;
  }
  return d;
}

function RecurringHub({ transactions, currency, onView, onToggleActive }) {
  const allRecurring=useMemo(()=>
    transactions.filter(t=>t.recurring&&t.recurFreq)
      .map(t=>({...t,isActive:t.isActive!==false,nextDue:nextDueDate(t)}))
      .sort((a,b)=>{ if(a.isActive&&!b.isActive) return -1; if(!a.isActive&&b.isActive) return 1; return a.nextDue-b.nextDue; }),
    [transactions]
  );
  const active=allRecurring.filter(t=>t.isActive),inactive=allRecurring.filter(t=>!t.isActive);
  const monthlyTotal=active.filter(t=>t.type==="expense").reduce((s,t)=>s+toMonthlyAmountHelper(t),0);
  const annualTotal=monthlyTotal*12;
  const incomeRecur=active.filter(t=>t.type==="income").reduce((s,t)=>s+toMonthlyAmountHelper(t),0);
  const nowMs=Date.now();
  const upcoming=active.filter(t=>t.nextDue.getTime()-nowMs<=7*24*60*60*1000);

  if (allRecurring.length===0) return (
    <div className="empty">
      <div className="empty-icon"><Icon name="repeat" size={30}/></div>
      <div className="empty-title">No recurring transactions</div>
      <div className="empty-body">Mark a transaction as recurring when adding it — rent, gym, subscriptions — and they'll appear here.</div>
    </div>
  );

  const RecurRow=({t})=>{
    const cat=CAT(t.category)||{id:"other",name:t.category,color:"#8A8A8A"};
    const isInc=t.type==="income";
    const daysLeft=Math.round((t.nextDue.getTime()-nowMs)/86400000);
    const monthly=toMonthlyAmountHelper(t);
    return (
      <div style={{display:"flex",alignItems:"center",gap:11,padding:"12px 14px",borderBottom:"1px solid var(--rule)",opacity:t.isActive?1:0.5}}>
        <div onClick={()=>onView?.(t)} style={{width:36,height:36,borderRadius:9,background:(cat.color)+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}>
          <CatIcon catId={cat.id} size={16} color={cat.color}/>
        </div>
        <div onClick={()=>onView?.(t)} style={{flex:1,minWidth:0,cursor:"pointer"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.merchant||t.note||cat.name}</div>
          <div style={{fontSize:11,color:"var(--ink-3)",marginTop:1,display:"flex",gap:4,flexWrap:"wrap"}}>
            <span>{cat.name}{t.subcategory?` / ${t.subcategory}`:""}</span>
            <span>·</span>
            <span style={{fontWeight:600,textTransform:"capitalize"}}>{t.recurFreq}</span>
            {t.isActive&&<span style={{color:daysLeft<=3?"var(--warn)":"var(--ink-4)",fontWeight:daysLeft<=3?700:400}}>· {daysLeft===0?"Due today":daysLeft===1?"Due tomorrow":`Due in ${daysLeft}d`}</span>}
            {!t.isActive&&<span style={{color:"var(--ink-4)",fontWeight:600}}>· Inactive</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:600,color:isInc?"var(--pos)":"var(--ink)"}}>{isInc?"+":"−"}{fmt(t.amount,currency)}</div>
          {t.recurFreq!=="monthly"&&t.isActive&&<div style={{fontSize:10,color:"var(--ink-4)"}}>≈{fmt(monthly,currency)}/mo</div>}
          <button onClick={e=>{e.stopPropagation();onToggleActive(t.id);}} style={{fontSize:10,fontWeight:700,color:t.isActive?"var(--warn)":"var(--pos)",background:"none",border:"none",cursor:"pointer",padding:"1px 0",fontFamily:"'DM Sans',sans-serif",textDecoration:"underline",textUnderlineOffset:2}}>
            {t.isActive?"Pause":"Reactivate"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,marginBottom:18}}>Recurring</div>
      <div className="stat-row">
        <div className="stat-cell"><div className="stat-val" style={{color:"var(--neg)"}}>{fmt(monthlyTotal,currency)}</div><div className="stat-lbl">Monthly outgoing</div></div>
        <div className="stat-cell"><div className="stat-val">{fmt(annualTotal,currency)}</div><div className="stat-lbl">Annual commitment</div></div>
        {incomeRecur>0&&<div className="stat-cell"><div className="stat-val" style={{color:"var(--pos)"}}>{fmt(incomeRecur,currency)}</div><div className="stat-lbl">Monthly income</div></div>}
        <div className="stat-cell"><div className="stat-val">{active.length}</div><div className="stat-lbl">Active</div></div>
      </div>

      {upcoming.length>0&&(
        <div style={{background:"var(--warn-bg)",border:"1px solid #D4A82A",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--warn)",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <Icon name="calendar" size={12} color="var(--warn)"/>Due within 7 days
          </div>
          {upcoming.map(t=>{
            const cat=CAT(t.category)||{name:t.category};
            const daysLeft=Math.round((t.nextDue.getTime()-nowMs)/86400000);
            return (
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(212,168,42,0.2)"}}>
                <span style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{t.merchant||t.note||cat.name}</span>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:"var(--neg)"}}>{fmt(t.amount,currency)}</div>
                  <div style={{fontSize:10,color:"var(--warn)",fontWeight:700}}>{daysLeft===0?"Today":daysLeft===1?"Tomorrow":`In ${daysLeft} days`}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active.length>0&&(
        <>
          <div className="label-sm" style={{marginBottom:8}}>Active</div>
          <div style={{background:"var(--bg-card)",border:"1px solid var(--rule)",borderRadius:8,overflow:"hidden",marginBottom:14}}>
            {active.map(t=><RecurRow key={t.id} t={t}/>)}
          </div>
        </>
      )}
      {inactive.length>0&&(
        <>
          <div className="label-sm" style={{marginBottom:8}}>Paused</div>
          <div style={{background:"var(--bg-card)",border:"1px solid var(--rule)",borderRadius:8,overflow:"hidden",marginBottom:14}}>
            {inactive.map(t=><RecurRow key={t.id} t={t}/>)}
          </div>
        </>
      )}

      {monthlyTotal>0&&(
        <div className="a-card" style={{marginTop:4}}>
          <div className="a-card-title">Annual Cost by Category</div>
          {(()=>{
            const ct={};
            active.filter(t=>t.type==="expense").forEach(t=>{ct[t.category]=(ct[t.category]||0)+toMonthlyAmountHelper(t);});
            const sorted=Object.entries(ct).sort((a,b)=>b[1]-a[1]);
            const maxV=sorted[0]?.[1]||1;
            return sorted.map(([catId,mo])=>{
              const cat=CAT(catId)||{id:"other",name:catId,color:"#8A8A8A"};
              return (
                <div key={catId} className="cat-bar">
                  <div className="cat-bar-name"><CatIcon catId={cat.id} size={12} color={cat.color}/>{cat.name}</div>
                  <div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(mo/maxV)*100}%`,background:cat.color}}/></div>
                  <div className="cat-bar-amt">{fmt(mo*12,currency)}</div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD / EDIT TRANSACTION
// ─────────────────────────────────────────────────────────────────────────────
function AddEditOverlay({ templates, currency, transactions, prefill, editId, merchantMemory, onSave, onClose }) {
  const isEditing=!!editId;
  const [type,    setType]    = useState(prefill?.type       ||"expense");
  const [amount,  setAmount]  = useState(prefill?.amount     ?String(prefill.amount):"");
  const [catId,   setCatId]   = useState(prefill?.category   ||"food");
  const [subcat,  setSubcat]  = useState(prefill?.subcategory||"");
  const [merchant,setMerchant]= useState(prefill?.merchant   ||"");
  const [note,    setNote]    = useState(prefill?.note       ||"");
  const [date,    setDate]    = useState(prefill?.date       ||today());
  const [recur,   setRecur]   = useState(prefill?.recurring  ||false);
  const [freq,    setFreq]    = useState(prefill?.recurFreq  ||"monthly");
  const [err,     setErr]     = useState("");
  const [showMerchantSugs, setShowMerchantSugs] = useState(false);
  const amtRef=useRef();

  const expCats=CATEGORIES.filter(c=>!c.income);
  const incCats=CATEGORIES.filter(c=>c.income);
  const displayCats=type==="income"?incCats:expCats;
  const selectedCat=CAT(catId);

  useEffect(()=>{ setTimeout(()=>amtRef.current?.focus(),60); },[]);
  useEffect(()=>{ if(!prefill)setCatId(type==="income"?"salary":"food"); },[type]);

  // Merchant memory suggestion
  const merchantSug=useMemo(()=>merchantSuggest(merchant,merchantMemory),[merchant,merchantMemory]);
  const merchantMatches=useMemo(()=>{
    if(!merchant.trim()) return [];
    const q=merchant.toLowerCase();
    return Object.values(merchantMemory).filter(m=>m.merchant.toLowerCase().startsWith(q)).slice(0,4);
  },[merchant,merchantMemory]);

  const applySuggestion=(sug)=>{
    setMerchant(sug.merchant);
    setCatId(sug.category||catId);
    setSubcat(sug.subcategory||"");
    setShowMerchantSugs(false);
  };

  const isDupe=useMemo(()=>{
    if(isEditing||!amount||!parseFloat(amount)) return false;
    const amt=parseFloat(amount);
    const tenMinAgo=Date.now()-10*60*1000;
    return transactions.some(t=>t.category===catId&&Math.abs(t.amount-amt)<0.01&&new Date(t.date+"T00:00:00").getTime()>tenMinAgo);
  },[amount,catId,transactions,isEditing]);

  const submit=()=>{
    const amt=parseFloat(amount);
    if(!amt||amt<=0){setErr("Please enter a valid amount");return;}
    onSave({type,amount:amt,category:catId,subcategory:subcat,merchant:merchant.trim(),note:note.trim(),date,recurring:recur,recurFreq:recur?freq:null,isActive:true});
  };

  const relevantTpls=!isEditing?templates.filter(t=>!CATEGORIES.find(c=>c.id===t.catId)?.income&&type==="expense"):[];

  return (
    <div className="add-overlay" role="dialog" aria-modal="true">
      <div className="add-bar">
        <span className="add-title">{isEditing?"Edit Transaction":"New Transaction"}</span>
        <button className="add-close" onClick={onClose}><Icon name="close" size={14}/></button>
      </div>
      <div className="add-body">

        <div className="type-toggle">
          <button className={`type-btn${type==="expense"?" active":""}`} onClick={()=>setType("expense")}>Expense</button>
          <button className={`type-btn${type==="income"?" active":""}`}  onClick={()=>setType("income")}>Income</button>
        </div>

        <div className="amount-zone">
          <input ref={amtRef} className="amount-input" type="number" inputMode="decimal"
            placeholder="0.00" value={amount}
            onChange={e=>{setAmount(e.target.value);setErr("");}}
            min="0" step="0.01" aria-label="Amount"/>
          <div className="amount-cur">{currency}</div>
        </div>

        {err&&<div style={{color:"var(--neg)",fontSize:12,textAlign:"center",marginBottom:10,fontWeight:600}}>{err}</div>}
        {isDupe&&<div className="dupe-warn"><Icon name="other" size={13}/>Similar transaction recorded recently — double entry?</div>}

        {/* Quick-fill templates */}
        {relevantTpls.length>0&&(
          <div style={{marginBottom:12}}>
            <div className="field-lbl">Quick fill</div>
            <div className="tpl-strip" style={{marginBottom:0}}>
              {relevantTpls.map(tpl=>(
                <button key={tpl.id} className="tpl-card" onClick={()=>{setAmount(String(tpl.amount));setCatId(tpl.catId);setSubcat(tpl.subcat||"");setMerchant(tpl.merchant||"");setNote(tpl.note||tpl.name);}}>
                  <CatIcon catId={tpl.catId} size={12}/><span className="tpl-name">{tpl.name}</span><span className="tpl-amt">{fmt(tpl.amount,currency)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Merchant field with memory */}
        <div className="field merchant-wrap">
          <label className="field-lbl">Merchant <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ink-4)"}}>(optional)</span></label>
          <input className="field-input" placeholder="e.g., BakuBus, Bravo, Spotify"
            value={merchant}
            onChange={e=>{setMerchant(e.target.value);setShowMerchantSugs(true);}}
            onBlur={()=>setTimeout(()=>setShowMerchantSugs(false),150)}
            onFocus={()=>setShowMerchantSugs(true)}
          />
          {showMerchantSugs&&merchantMatches.length>0&&(
            <div className="merchant-suggestions">
              {merchantMatches.map((m,i)=>{
                const cat=CAT(m.category);
                return (
                  <div key={i} className="merchant-sug-item" onMouseDown={()=>applySuggestion(m)}>
                    <div>{m.merchant}</div>
                    <div className="merchant-sug-sub">{cat?.name}{m.subcategory?` / ${m.subcategory}`:""}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category */}
        <div className="field">
          <label className="field-lbl">Category</label>
          <div className="cat-scroll">
            {displayCats.map(cat=>(
              <button key={cat.id} className={`cat-tile${catId===cat.id?" sel":""}`} onClick={()=>{setCatId(cat.id);setSubcat("");}}>
                <CatIcon catId={cat.id} size={18} color={catId===cat.id?cat.color:undefined}/>
                <span className="cat-tile-name">{cat.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Subcategory — only for expense categories with subs */}
          {selectedCat?.subs?.length>0&&(
            <>
              <div className="field-lbl" style={{marginBottom:5,marginTop:4}}>Subcategory <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ink-4)"}}>(optional)</span></div>
              <div className="sub-strip">
                {selectedCat.subs.map(s=>(
                  <button key={s} className={`sub-chip${subcat===s?" sel":""}`} onClick={()=>setSubcat(subcat===s?"":s)}>{s}</button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="field">
          <label className="field-lbl" htmlFor="txn-note">Note <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ink-4)"}}>(optional)</span></label>
          <input id="txn-note" className="field-input" placeholder="Additional detail"
            value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>

        <div className="field-row" style={{marginBottom:14}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-lbl">Date</label>
            <input className="field-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-lbl">Recurring</label>
            <div style={{display:"flex",alignItems:"center",gap:9,marginTop:9}}>
              <div className={`toggle-track${recur?" on":""}`} onClick={()=>setRecur(r=>!r)} role="switch" aria-checked={recur} tabIndex={0}>
                <div className="toggle-knob"/>
              </div>
              {recur&&(
                <select className="field-select" value={freq} onChange={e=>setFreq(e.target.value)}
                  style={{fontSize:12,color:"var(--ink)",background:"transparent",border:"none",outline:"none",cursor:"pointer"}}>
                  {["weekly","biweekly","monthly","yearly"].map(f=><option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-full" onClick={submit}>
          {isEditing?"Save Changes":`Record ${type==="income"?"Income":"Expense"}`}
        </button>
        <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION DETAIL SHEET
// ─────────────────────────────────────────────────────────────────────────────
function TxnDetailSheet({ txn, currency, onClose, onEdit, onDuplicate, onDelete }) {
  const cat=CAT(txn.category)||{id:"other",name:txn.category,color:"#8A8A8A"};
  const isInc=txn.type==="income";
  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle"/>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:12,background:(cat.color)+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <CatIcon catId={cat.id} size={22} color={cat.color}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{txn.merchant||txn.note||cat.name}</div>
            <div style={{fontSize:12,color:"var(--ink-3)"}}>{cat.name}{txn.subcategory?` / ${txn.subcategory}`:""} · {fmtDate(txn.date)}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"1px solid var(--rule)",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-3)",flexShrink:0}}><Icon name="close" size={13}/></button>
        </div>

        <div style={{textAlign:"center",padding:"14px 0 16px",borderTop:"1px solid var(--rule)",borderBottom:"1px solid var(--rule)",marginBottom:16}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:44,fontWeight:900,letterSpacing:-2,color:isInc?"var(--pos)":"var(--ink)"}}>{isInc?"+":"−"}{fmt(txn.amount,currency)}</div>
          <div style={{fontSize:12,color:"var(--ink-3)",marginTop:3}}>{txn.type==="income"?"Income":"Expense"}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
          {[
            ["Date",      fmtDate(txn.date)],
            ["Merchant",  txn.merchant||"—"],
            ["Category",  cat.name+(txn.subcategory?` / ${txn.subcategory}`:"")],
            ["Recurring", txn.recurring?(txn.recurFreq?.charAt(0).toUpperCase()+txn.recurFreq?.slice(1)||"Yes"):"No"],
          ].map(([lbl,val])=>(
            <div key={lbl} style={{background:"var(--bg-warm)",borderRadius:7,padding:"10px 12px"}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"var(--ink-4)",marginBottom:3}}>{lbl}</div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val}</div>
            </div>
          ))}
        </div>

        {txn.note&&<div style={{fontSize:13,color:"var(--ink-2)",background:"var(--bg-warm)",borderRadius:7,padding:"10px 12px",marginBottom:16}}>{txn.note}</div>}

        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button className="btn btn-sm btn-full" style={{flex:1,padding:"11px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={onEdit}><Icon name="edit" size={14}/>Edit</button>
          <button className="btn btn-sm btn-full" style={{flex:1,padding:"11px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={onDuplicate}><Icon name="repeat" size={14}/>Duplicate</button>
        </div>
        <button className="btn btn-ghost btn-full" style={{color:"var(--neg)",borderColor:"var(--neg-bg)",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:0}} onClick={onDelete}><Icon name="trash" size={14}/>Delete</button>
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{marginTop:6}}>Close</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS SHEET
// ─────────────────────────────────────────────────────────────────────────────
function SettingsSheet({ state, onExportCSV, onExportJSON, onImportFile, onSetBudget, onCurrencyChange,
  onAddTemplate, onDeleteTemplate, onAddGoal, onUpdateGoal, onDeleteGoal,
  onSafeToSpendChange, onClose, showToast }) {
  const { transactions, budgets, templates, currency, goals=[], safeToSpend={} } = state;
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
  const [savingsT,    setSavingsT]    = useState(String(safeToSpend.savingsTarget||0));
  const fileRef=useRef();

  const totalInc=transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExp=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  const saveTpl=()=>{
    if(!tplName.trim()||!parseFloat(tplAmt)){showToast("Name and amount required");return;}
    onAddTemplate({name:tplName.trim(),amount:parseFloat(tplAmt),catId:tplCatId,subcat:tplSubcat,merchant:tplMerchant.trim(),note:tplNote.trim()});
    setTplName("");setTplAmt("");setTplSubcat("");setTplMerchant("");setTplNote("");setShowNewTpl(false);
  };
  const saveGoal=()=>{
    if(!goalName.trim()||!parseFloat(goalTarget)){showToast("Name and target required");return;}
    onAddGoal({name:goalName.trim(),target:parseFloat(goalTarget),saved:parseFloat(goalSaved)||0,monthlyTarget:parseFloat(goalMonthly)||0});
    setGoalName("");setGoalTarget("");setGoalSaved("");setGoalMonthly("");setShowNewGoal(false);
  };

  const expCats=CATEGORIES.filter(c=>!c.income);

  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle"/>
        <div className="sheet-title">Settings</div>

        {/* Overview */}
        <div className="settings-section-lbl">Overview</div>
        <div style={{background:"var(--bg-warm)",borderRadius:7,padding:"10px 13px",marginBottom:4}}>
          {[["Total income",fmt(totalInc,currency),"var(--pos)"],["Total expenses",fmt(totalExp,currency),"var(--neg)"],["Net",fmt(Math.abs(totalInc-totalExp),currency),totalInc>=totalExp?"var(--pos)":"var(--neg)"],["Transactions",String(transactions.length),"var(--ink)"]].map(([lbl,val,col])=>(
            <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--rule)"}}>
              <span style={{fontSize:12,color:"var(--ink-3)"}}>{lbl}</span>
              <span style={{fontSize:13,fontWeight:700,color:col,fontFamily:"'Playfair Display',serif"}}>{val}</span>
            </div>
          ))}
        </div>

        {/* Safe to Spend */}
        <div className="settings-section-lbl" style={{marginTop:14}}>Safe to Spend</div>
        <div className="settings-row">
          <div><div className="settings-row-title">Enable Safe to Spend</div><div className="settings-row-sub">Shows discretionary budget on Dashboard</div></div>
          <div className={`toggle-track${safeToSpend.enabled?" on":""}`} onClick={()=>onSafeToSpendChange({enabled:!safeToSpend.enabled})} role="switch" aria-checked={safeToSpend.enabled} tabIndex={0}><div className="toggle-knob"/></div>
        </div>
        {safeToSpend.enabled&&(
          <div className="settings-row" style={{flexDirection:"column",alignItems:"flex-start",gap:8}}>
            <div><div className="settings-row-title">Monthly savings target</div><div className="settings-row-sub">Deducted from disposable income</div></div>
            <div style={{display:"flex",gap:8,width:"100%"}}>
              <input className="field-input" type="number" min="0" step="1" placeholder="0.00" value={savingsT} onChange={e=>setSavingsT(e.target.value)} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
              <button className="btn btn-sm btn-sm-primary" onClick={()=>{onSafeToSpendChange({savingsTarget:parseFloat(savingsT)||0});showToast("Saved");}}>Save</button>
            </div>
          </div>
        )}

        {/* Currency */}
        <div className="settings-section-lbl" style={{marginTop:14}}>Preferences</div>
        <div className="settings-row">
          <div><div className="settings-row-title">Currency</div><div className="settings-row-sub">Currently: {currency}</div></div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <input className="field-input" value={curSym} onChange={e=>setCurSym(e.target.value)} maxLength={3} style={{width:52,textAlign:"center",padding:"7px 8px"}}/>
            <button className="btn btn-sm btn-sm-primary" onClick={()=>{onCurrencyChange(curSym);showToast("Currency updated");}}>Save</button>
          </div>
        </div>

        {/* Templates */}
        <div style={{padding:"12px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--ink)"}}>Quick-Add Templates</span>
            <button className="btn btn-sm" onClick={()=>setShowNewTpl(s=>!s)}>{showNewTpl?"Cancel":"+ Add"}</button>
          </div>
          {showNewTpl&&(
            <div style={{background:"var(--bg-warm)",borderRadius:7,padding:13,marginBottom:11}}>
              <div className="field-row" style={{marginBottom:10}}>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl">Name</label><input className="field-input" placeholder="Coffee" value={tplName} onChange={e=>setTplName(e.target.value)} autoFocus/></div>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl">Amount</label><input className="field-input" type="number" min="0" step="0.01" placeholder="0.00" value={tplAmt} onChange={e=>setTplAmt(e.target.value)}/></div>
              </div>
              <div className="field-row" style={{marginBottom:10}}>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl">Category</label><select className="field-input field-select" value={tplCatId} onChange={e=>setTplCatId(e.target.value)}>{expCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl">Merchant</label><input className="field-input" placeholder="Optional" value={tplMerchant} onChange={e=>setTplMerchant(e.target.value)}/></div>
              </div>
              <div className="field" style={{marginBottom:10}}><label className="field-lbl">Note (optional)</label><input className="field-input" placeholder="Pre-filled note" value={tplNote} onChange={e=>setTplNote(e.target.value)}/></div>
              <button className="btn btn-primary btn-full" style={{marginTop:0,padding:"10px"}} onClick={saveTpl}>Save Template</button>
            </div>
          )}
          {templates.length===0&&!showNewTpl&&<div style={{fontSize:12,color:"var(--ink-3)",padding:"6px 0"}}>No templates yet.</div>}
          {templates.map(tpl=>(
            <div key={tpl.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid var(--rule)"}}>
              <CatIcon catId={tpl.catId} size={14}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{tpl.name}</div>
                <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmt(tpl.amount,currency)}{tpl.merchant?` · ${tpl.merchant}`:""} · {CAT(tpl.catId)?.name}</div>
              </div>
              <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>onDeleteTemplate(tpl.id)}><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>

        {/* Budgets */}
        <div style={{marginTop:8}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--ink)",marginBottom:10}}>Monthly Budgets</div>
          {expCats.map((cat,i,arr)=>{
            const limit=budgets[cat.id]||0;
            return (
              <div key={cat.id} style={{padding:"9px 0",borderBottom:i<arr.length-1?"1px solid var(--rule)":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600}}><CatIcon catId={cat.id} size={13}/>{cat.name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    {limit>0&&<span style={{fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:600}}>{fmt(limit,currency)}</span>}
                    <button className="btn btn-sm" style={{fontSize:10,padding:"4px 9px"}} onClick={()=>{setEditBudget(cat.id);setBudgetVal(limit>0?String(limit):"");}}>{limit>0?"Edit":"Set"}</button>
                  </div>
                </div>
                {editBudget===cat.id&&(
                  <div style={{display:"flex",gap:7,marginTop:7}}>
                    <input className="field-input" type="number" min="0" step="1" placeholder="Monthly limit" value={budgetVal} onChange={e=>setBudgetVal(e.target.value)} autoFocus style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                    <button className="btn btn-sm btn-sm-primary" onClick={()=>{onSetBudget(cat.id,parseFloat(budgetVal)||0);setEditBudget(null);showToast("Budget saved");}}>Save</button>
                    <button className="btn btn-sm" onClick={()=>setEditBudget(null)}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Goals */}
        <div className="settings-section-lbl" style={{marginTop:14}}>Goals</div>
        <div style={{padding:"12px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--ink)"}}>Financial Goals</span>
            <button className="btn btn-sm" onClick={()=>setShowNewGoal(s=>!s)}>{showNewGoal?"Cancel":"+ Add"}</button>
          </div>
          {showNewGoal&&(
            <div style={{background:"var(--bg-warm)",borderRadius:7,padding:13,marginBottom:11}}>
              <div className="field" style={{marginBottom:10}}><label className="field-lbl">Goal name</label><input className="field-input" placeholder="e.g., Travel, Emergency Fund" value={goalName} onChange={e=>setGoalName(e.target.value)} autoFocus/></div>
              <div className="field-row" style={{marginBottom:10}}>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl">Target ({currency})</label><input className="field-input" type="number" min="0" step="1" placeholder="0" value={goalTarget} onChange={e=>setGoalTarget(e.target.value)}/></div>
                <div className="field" style={{marginBottom:0}}><label className="field-lbl">Saved so far</label><input className="field-input" type="number" min="0" step="1" placeholder="0" value={goalSaved} onChange={e=>setGoalSaved(e.target.value)}/></div>
              </div>
              <div className="field" style={{marginBottom:10}}><label className="field-lbl">Monthly contribution ({currency})</label><input className="field-input" type="number" min="0" step="1" placeholder="Optional" value={goalMonthly} onChange={e=>setGoalMonthly(e.target.value)}/></div>
              <button className="btn btn-primary btn-full" style={{marginTop:0,padding:"10px"}} onClick={saveGoal}>Save Goal</button>
            </div>
          )}
          {goals.length===0&&!showNewGoal&&<div style={{fontSize:12,color:"var(--ink-3)"}}>No goals yet.</div>}
          {goals.map(goal=>{
            const {pct,remaining}=calcGoalProgress(goal);
            return (
              <div key={goal.id} style={{padding:"10px 0",borderBottom:"1px solid var(--rule)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{goal.name}</div>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    <button className="btn btn-sm" style={{fontSize:10,padding:"3px 8px"}} onClick={()=>{
                      const newSaved=prompt(`Update saved amount for "${goal.name}" (currently ${fmt(goal.saved||0,currency)}):`,goal.saved||0);
                      if(newSaved!==null) onUpdateGoal(goal.id,{saved:parseFloat(newSaved)||0});
                    }}>Update</button>
                    <button className="topbar-btn" style={{color:"var(--ink-4)",width:26,height:26}} onClick={()=>onDeleteGoal(goal.id)}><Icon name="trash" size={13}/></button>
                  </div>
                </div>
                <div className="goal-progress"><div className="goal-fill" style={{width:`${pct}%`}}/></div>
                <div className="goal-meta">
                  <span>{fmt(goal.saved||0,currency)} of {fmt(goal.target||0,currency)}</span>
                  <span>{Math.round(pct)}% · {fmt(remaining,currency)} to go</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data */}
        <div className="settings-section-lbl" style={{marginTop:14}}>Data</div>
        <div className="settings-row">
          <div><div className="settings-row-title">Export CSV</div><div className="settings-row-sub">Full ledger as spreadsheet (includes merchant, subcategory)</div></div>
          <button className="btn btn-sm" onClick={onExportCSV} style={{display:"flex",alignItems:"center",gap:5}}><Icon name="download" size={12}/>Export</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-row-title">JSON Backup</div><div className="settings-row-sub">{transactions.length} transactions · complete backup</div></div>
          <button className="btn btn-sm btn-sm-primary" onClick={onExportJSON} style={{display:"flex",alignItems:"center",gap:5}}><Icon name="download" size={12}/>Backup</button>
        </div>
        <div className="settings-row" style={{flexDirection:"column",alignItems:"flex-start",gap:8}}>
          <div><div className="settings-row-title">Restore Backup</div><div className="settings-row-sub">Accepts .json or .csv — asks before any mutation</div></div>
          <div className="drop-zone" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onImportFile(e.dataTransfer.files[0]);}}>
            <input ref={fileRef} type="file" accept=".json,.csv" onChange={e=>{onImportFile(e.target.files[0]);e.target.value="";}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:12,color:"var(--ink-3)",fontWeight:600}}><Icon name="upload" size={13}/>Click to select or drag & drop</div>
          </div>
        </div>
        {state.lastBackup?<div style={{fontSize:11,color:"var(--pos)",fontWeight:600,marginTop:8}}>✓ Last backup: {new Date(state.lastBackup).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>:<div style={{fontSize:11,color:"var(--neg)",fontWeight:600,marginTop:8}}>No backup yet — export one above</div>}
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{marginTop:18}}>Close</button>
      </div>
    </div>
  );
}
