import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE LEDGER — Focused rebuild
// Two screens: Dashboard + Ledger. One instant-add flow.
// Editorial Minimalism: #F7F4EE cream · #141414 ink · Playfair Display + DM Sans
// ─────────────────────────────────────────────────────────────────────────────

// ── Storage keys (ALL previous versions, for migration) ──────────────────────
const KEYS_LEGACY = [
  "finance_app_data",
  "finance_editorial_v1",
  "finance_editorial_v2",
  "finance_editorial_v3",
  "finance_editorial_v4",
  "finance_os_v3",
];
const KEY = "expense_ledger_v5"; // Current key — bump only on breaking schema change

function readRaw(k) {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; }
}
function writeRaw(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {} 
}

// ── Data migration ────────────────────────────────────────────────────────────
// Reads every known previous key, merges unique transactions by id,
// preserves all other settings from the most recent key found.
function migrateAndLoad() {
  // First check if we already have current-version data
  const current = readRaw(KEY);
  if (current?.transactions) return current;

  console.log("[Ledger] No v5 data found — scanning legacy keys for migration…");

  let mergedTransactions = [];
  let bestSettings = null;

  for (const k of KEYS_LEGACY) {
    const d = readRaw(k);
    if (!d) continue;

    // Pull transactions from various schema shapes used across versions
    const txns = d.transactions || d.entries || [];
    if (txns.length > 0) {
      console.log(`[Ledger] Found ${txns.length} transactions in "${k}"`);
      // Merge, deduplicating by id
      const existingIds = new Set(mergedTransactions.map(t => String(t.id)));
      txns.forEach(t => {
        if (!existingIds.has(String(t.id))) {
          mergedTransactions.push(normaliseTransaction(t));
          existingIds.add(String(t.id));
        }
      });
    }

    // Keep settings from the most recent key that has them
    if (d.currency || d.budgets || d.categories) {
      bestSettings = d;
    }
  }

  // Sort merged transactions newest-first
  mergedTransactions.sort((a, b) => b.date.localeCompare(a.date));

  if (mergedTransactions.length > 0) {
    console.log(`[Ledger] Migration complete — ${mergedTransactions.length} total transactions restored`);
  }

  return buildState(mergedTransactions, bestSettings);
}

// Normalise a transaction from any schema version into the current shape
function normaliseTransaction(t) {
  return {
    id:        t.id || Date.now() + Math.random(),
    type:      t.type || (t.amount < 0 ? "expense" : "expense"),
    amount:    Math.abs(parseFloat(t.amount || t.amt || 0)),
    category:  t.category || t.catId || t.cat || "other",
    note:      t.note || t.description || t.name || "",
    date:      t.date || new Date().toISOString().slice(0, 10),
    recurring: t.recurring || false,
    recurFreq: t.recurFreq || t.frequency || null,
  };
}

function buildState(transactions = [], settings = null) {
  return {
    transactions,
    budgets:    settings?.budgets    || {},
    categories: settings?.categories || DEFAULT_CATEGORIES,
    templates:  settings?.templates  || DEFAULT_TEMPLATES,
    currency:   settings?.currency   || "£",
  };
}

// ── Categories ────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: "food",      name: "Food & Dining",    icon: "🥗", color: "#5C7A6E" },
  { id: "sport",     name: "Sport & Fitness",  icon: "⚽", color: "#4A5C7A" },
  { id: "personal",  name: "Personal Care",    icon: "🧴", color: "#7A5C7A" },
  { id: "culture",   name: "Style & Culture",  icon: "🪞", color: "#7A6652" },
  { id: "transport", name: "Transport",        icon: "🚆", color: "#4A6A7A" },
  { id: "housing",   name: "Housing",          icon: "🏠", color: "#5A5A5A" },
  { id: "digital",   name: "Digital & Subs",   icon: "📱", color: "#3A6A5A" },
  { id: "edu",       name: "Education",        icon: "📚", color: "#4A4A7A" },
  { id: "other",     name: "Other",            icon: "◦",  color: "#8A8A8A" },
  { id: "salary",    name: "Salary",           icon: "💼", color: "#2D6A4F" },
  { id: "freelance", name: "Freelance",        icon: "💻", color: "#2D6A4F" },
];

const DEFAULT_TEMPLATES = [
  { id: "t1", name: "High-Protein Groceries", amount: 35,   catId: "food",      icon: "🥗" },
  { id: "t2", name: "Football Pitch",         amount: 12,   catId: "sport",     icon: "⚽" },
  { id: "t3", name: "Fragrance Decant",       amount: 18,   catId: "culture",   icon: "🪞" },
  { id: "t4", name: "Coffee",                 amount: 4.5,  catId: "food",      icon: "☕" },
  { id: "t5", name: "Adapalene Restock",      amount: 12,   catId: "personal",  icon: "🧴" },
  { id: "t6", name: "Bus / Tram",             amount: 2.4,  catId: "transport", icon: "🚌" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const today    = () => new Date().toISOString().slice(0, 10);
const curMon   = () => new Date().toISOString().slice(0, 7);
const prevMon  = () => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); };

function fmt(n, sym = "£") {
  return `${sym}${Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d) {
  const dt = new Date(d + "T00:00:00");
  const now = new Date();
  if (d === today()) return "Today";
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  if (d === yest.toISOString().slice(0,10)) return "Yesterday";
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS — Editorial Minimalism, strictly maintained
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #F7F4EE;
  --bg-alt:   #EFECE4;
  --bg-card:  #FFFFFF;
  --ink:      #141414;
  --ink-mid:  #4A4A4A;
  --ink-muted:#8A8A8A;
  --ink-faint:#C8C8C8;
  --div:      #E5E5E5;
  --pos:      #1A6B3C;
  --pos-bg:   #EDF7F1;
  --neg:      #8B1A1A;
  --neg-bg:   #FDF0F0;
  --warn:     #7A5500;
  --warn-bg:  #FFF8EC;
  --sk1:      #E8E4DC;
  --sk2:      #D8D4CC;
}

html, body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'DM Sans', system-ui, sans-serif;
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

/* ── Typography ── */
.playfair { font-family: 'Playfair Display', Georgia, serif; }

/* ── Top bar ── */
.topbar {
  position: sticky; top: 0; z-index: 60;
  background: rgba(247,244,238,0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--div);
  padding: 0 18px;
  height: 52px;
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.wordmark {
  font-family: 'Playfair Display', serif;
  font-size: 16px; font-weight: 700;
  color: var(--ink); letter-spacing: -0.2px;
}
.topbar-right { display: flex; gap: 6px; align-items: center; }
.icon-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: transparent; border: 1px solid var(--div);
  color: var(--ink-muted); font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 120ms, color 120ms; flex-shrink: 0;
  font-family: 'DM Sans', sans-serif;
}
.icon-btn:hover { border-color: var(--ink-muted); color: var(--ink); }

/* ── Tab bar ── */
.tabbar {
  position: fixed; bottom: 0;
  left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 430px;
  background: rgba(247,244,238,0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--div);
  display: flex; z-index: 60;
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom, 0px));
}
.tab-btn {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 2px;
  padding: 6px 0; border: none; background: transparent;
  cursor: pointer; color: var(--ink-faint);
  transition: color 120ms; font-family: 'DM Sans', sans-serif;
}
.tab-btn.active { color: var(--ink); }
.tab-icon { font-size: 18px; line-height: 1; }
.tab-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }
.tab-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--ink); margin-top: 1px; }

/* ── Page ── */
.page {
  flex: 1; overflow-y: auto;
  padding: 20px 18px 90px;
  animation: pageIn 180ms ease both;
}
@keyframes pageIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

/* ── Section header ── */
.sec-hdr {
  display: flex; align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.sec-title {
  font-size: 10px; font-weight: 700;
  letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--ink-muted);
}
.sec-link {
  font-size: 12px; font-weight: 600; color: var(--ink-muted);
  cursor: pointer; text-decoration: underline;
  text-underline-offset: 2px;
}
.sec-link:hover { color: var(--ink); }

/* ── Divider ── */
.rule { height: 1px; background: var(--div); margin: 20px 0; }

/* ── Skeleton ── */
@keyframes skelShim {
  0%   { background-position: -400% 0; }
  100% { background-position: 400% 0; }
}
.skel {
  background: linear-gradient(90deg, var(--sk1) 25%, var(--sk2) 50%, var(--sk1) 75%);
  background-size: 400% 100%;
  animation: skelShim 1.8s ease infinite;
  border-radius: 4px;
}

/* ── Hero block ── */
.hero {
  padding: 24px 0 20px;
  border-bottom: 1px solid var(--div);
  margin-bottom: 22px;
}
.hero-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--ink-muted);
  margin-bottom: 5px;
}
.hero-number {
  font-family: 'Playfair Display', serif;
  font-size: 52px; font-weight: 900;
  letter-spacing: -2.5px; line-height: 1;
  margin-bottom: 6px;
}
.hero-number.pos { color: var(--pos); }
.hero-number.neg { color: var(--neg); }
.hero-sub { font-size: 12px; color: var(--ink-muted); margin-bottom: 16px; }
.hero-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  gap: 1px; background: var(--div);
  border: 1px solid var(--div); border-radius: 8px; overflow: hidden;
}
.hero-cell {
  background: var(--bg-card);
  padding: 12px 10px;
}
.hero-cell-val {
  font-family: 'Playfair Display', serif;
  font-size: 18px; font-weight: 700;
  letter-spacing: -0.5px; margin-bottom: 3px;
}
.hero-cell-val.pos { color: var(--pos); }
.hero-cell-val.neg { color: var(--neg); }
.hero-cell-lbl {
  font-size: 9px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: var(--ink-muted);
}

/* ── Donut chart ── */
.donut-wrap {
  display: flex; gap: 18px; align-items: center;
  padding: 16px; background: var(--bg-card);
  border: 1px solid var(--div); border-radius: 10px;
  margin-bottom: 20px;
}
.donut-right { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.legend-row { display: flex; align-items: center; gap: 8px; }
.legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.legend-name {
  flex: 1; font-size: 12px; font-weight: 500;
  color: var(--ink-mid); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.legend-amt {
  font-size: 12px; font-weight: 700;
  color: var(--ink); font-family: 'Playfair Display', serif;
  flex-shrink: 0;
}
.donut-center-lbl {
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.6px; color: var(--ink-muted);
}
.donut-center-val {
  font-family: 'Playfair Display', serif;
  font-size: 15px; font-weight: 700; color: var(--ink);
  margin-top: 1px;
}

/* ── Budget bars ── */
.budget-block { margin-bottom: 20px; }
.budget-row { margin-bottom: 12px; }
.budget-hdr {
  display: flex; justify-content: space-between;
  align-items: baseline; margin-bottom: 5px;
}
.budget-name { font-size: 12px; font-weight: 600; color: var(--ink); }
.budget-nums { font-size: 11px; color: var(--ink-muted); }
.budget-nums b { color: var(--ink); font-weight: 700; }
.budget-track {
  height: 3px; background: var(--div);
  border-radius: 99px; overflow: hidden;
}
.budget-fill {
  height: 100%; border-radius: 99px;
  transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
}
.budget-msg { font-size: 10px; margin-top: 3px; font-weight: 600; color: var(--ink-muted); }
.budget-msg.warn { color: var(--warn); }
.budget-msg.over { color: var(--neg); }

/* ── Transactions ── */
.txn-group { margin-bottom: 14px; }
.txn-date-hdr {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 5px 0; margin-bottom: 0;
}
.txn-date-lbl {
  font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
  text-transform: uppercase; color: var(--ink-muted);
}
.txn-date-total {
  font-family: 'Playfair Display', serif;
  font-size: 14px; font-weight: 600; color: var(--ink);
}
.txn-card {
  background: var(--bg-card); border: 1px solid var(--div);
  border-radius: 10px; overflow: hidden;
}
.txn-row {
  display: flex; align-items: center; gap: 11px;
  padding: 12px 13px;
  border-bottom: 1px solid var(--div);
  cursor: pointer; transition: background 100ms;
}
.txn-row:last-child { border-bottom: none; }
.txn-row:hover { background: var(--bg-alt); }
.txn-ico {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0;
}
.txn-info { flex: 1; min-width: 0; }
.txn-name {
  font-size: 13px; font-weight: 600; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 1px;
}
.txn-meta { font-size: 11px; color: var(--ink-muted); display: flex; gap: 5px; align-items: center; }
.txn-tag {
  background: var(--bg-alt); border-radius: 3px;
  padding: 1px 5px; font-size: 10px;
  font-weight: 600; color: var(--ink-muted);
}
.rec-tag {
  background: var(--warn-bg); color: var(--warn);
  border-radius: 3px; padding: 1px 5px;
  font-size: 10px; font-weight: 700;
}
.txn-amt {
  font-family: 'Playfair Display', serif;
  font-size: 15px; font-weight: 600; flex-shrink: 0;
}
.txn-amt.exp { color: var(--ink); }
.txn-amt.inc { color: var(--pos); }

/* ── Empty state ── */
.empty {
  text-align: center; padding: 48px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.empty-ico { font-size: 32px; opacity: 0.4; }
.empty-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px; font-weight: 600; color: var(--ink);
}
.empty-body { font-size: 13px; color: var(--ink-muted); line-height: 1.6; max-width: 250px; }

/* ── FAB ── */
.fab {
  position: fixed;
  bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 14px);
  right: 20px; left: auto;
  width: 52px; height: 52px; border-radius: 15px;
  background: var(--ink); color: var(--bg);
  border: none; font-size: 24px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(20,20,20,0.2), 0 1px 4px rgba(20,20,20,0.1);
  z-index: 50; transition: transform 140ms, box-shadow 140ms;
  font-family: 'DM Sans', sans-serif;
  /* Centre within app max-width */
}
.fab:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(20,20,20,0.24); }
.fab:active { transform: scale(0.94); }

/* ── Add overlay (full screen) ── */
.add-overlay {
  position: fixed; inset: 0;
  background: var(--bg);
  z-index: 100; display: flex; flex-direction: column;
  max-width: 430px; margin: 0 auto;
  animation: addSlideIn 200ms cubic-bezier(0.32,0.72,0,1);
  overflow-y: auto;
}
@keyframes addSlideIn {
  from { transform: translateY(100%); opacity: 0.6; }
  to   { transform: translateY(0);   opacity: 1;   }
}
.add-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 10px; flex-shrink: 0;
  border-bottom: 1px solid var(--div);
}
.add-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px; font-weight: 700;
}
.add-close {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid var(--div); background: transparent;
  color: var(--ink-muted); font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 120ms, color 120ms;
  font-family: 'DM Sans', sans-serif;
}
.add-close:hover { border-color: var(--ink-muted); color: var(--ink); }
.add-body { flex: 1; padding: 16px 18px 32px; display: flex; flex-direction: column; gap: 0; }

/* ── Type toggle ── */
.type-toggle {
  display: flex; border: 1px solid var(--div);
  border-radius: 7px; overflow: hidden; margin-bottom: 16px;
}
.type-btn {
  flex: 1; padding: 10px; border: none; background: transparent;
  color: var(--ink-muted); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: background 120ms, color 120ms;
  font-family: 'DM Sans', sans-serif; letter-spacing: 0.2px;
}
.type-btn:not(:last-child) { border-right: 1px solid var(--div); }
.type-btn.active { background: var(--ink); color: var(--bg); }

/* ── Amount zone ── */
.amount-zone {
  display: flex; align-items: baseline; justify-content: center;
  padding: 12px 0 16px; border-bottom: 1px solid var(--div);
  margin-bottom: 18px; gap: 3px;
}
.amount-sym {
  font-family: 'Playfair Display', serif;
  font-size: 30px; font-weight: 400; color: var(--ink-faint);
}
.amount-field {
  font-family: 'Playfair Display', serif;
  font-size: 58px; font-weight: 900; letter-spacing: -3px;
  background: transparent; border: none; outline: none;
  color: var(--ink); width: 210px; text-align: center;
  caret-color: var(--ink);
}
.amount-field::placeholder { color: var(--ink-faint); }
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }

/* ── Templates ── */
.tpl-strip {
  display: flex; gap: 7px; overflow-x: auto;
  padding-bottom: 2px; margin-bottom: 16px;
  scrollbar-width: none;
}
.tpl-strip::-webkit-scrollbar { display: none; }
.tpl-chip {
  flex-shrink: 0; display: flex; align-items: center; gap: 5px;
  padding: 8px 13px; border: 1px solid var(--div);
  border-radius: 99px; background: var(--bg-card);
  cursor: pointer; font-size: 12px; font-weight: 600;
  color: var(--ink-mid); white-space: nowrap;
  transition: border-color 120ms, background 120ms, color 120ms;
  font-family: 'DM Sans', sans-serif;
}
.tpl-chip:hover { border-color: var(--ink-muted); background: var(--bg-alt); color: var(--ink); }
.tpl-chip.selected { background: var(--ink); border-color: var(--ink); color: var(--bg); }
.tpl-amt {
  font-family: 'Playfair Display', serif;
  font-size: 12px; opacity: 0.7;
}
.tpl-chip.selected .tpl-amt { opacity: 0.85; }

/* ── Category row ── */
.cat-row {
  display: flex; gap: 7px; overflow-x: auto;
  padding-bottom: 4px; margin-bottom: 16px;
  scrollbar-width: none;
}
.cat-row::-webkit-scrollbar { display: none; }
.cat-chip {
  flex-shrink: 0; display: flex; flex-direction: column;
  align-items: center; gap: 3px;
  width: 58px; padding: 8px 4px;
  border: 1.5px solid var(--div); border-radius: 9px;
  background: var(--bg-card); cursor: pointer;
  transition: border-color 100ms, background 100ms;
}
.cat-chip.sel { border-color: var(--ink); background: var(--bg-alt); }
.cat-chip-ico { font-size: 19px; line-height: 1; }
.cat-chip-name {
  font-size: 9px; font-weight: 600; color: var(--ink-muted);
  text-align: center; line-height: 1.2;
  white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; width: 100%;
}
.cat-chip.sel .cat-chip-name { color: var(--ink); }

/* ── Form fields ── */
.field { margin-bottom: 14px; }
.field-lbl {
  font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--ink-muted);
  margin-bottom: 6px; display: block;
}
.field-input {
  width: 100%; background: var(--bg-card);
  border: 1px solid var(--div); border-radius: 7px;
  padding: 10px 13px; font-size: 14px; color: var(--ink);
  font-family: 'DM Sans', sans-serif;
  transition: border-color 120ms;
}
.field-input:focus { outline: none; border-color: var(--ink-muted); }
.field-select { appearance: none; cursor: pointer; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* ── Toggle ── */
.toggle-row { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.toggle-track {
  width: 42px; height: 23px; border-radius: 12px;
  background: var(--div); position: relative;
  transition: background 150ms; flex-shrink: 0; cursor: pointer;
}
.toggle-track.on { background: var(--ink); }
.toggle-knob {
  width: 17px; height: 17px; border-radius: 50%;
  background: white; position: absolute; top: 3px; left: 3px;
  transition: transform 150ms cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.18);
}
.toggle-track.on .toggle-knob { transform: translateX(19px); }

/* ── Buttons ── */
.btn-primary {
  width: 100%; padding: 13px;
  background: var(--ink); color: var(--bg);
  border: 1px solid var(--ink); border-radius: 7px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  font-family: 'DM Sans', sans-serif; letter-spacing: 0.2px;
  transition: opacity 120ms; margin-top: 8px;
}
.btn-primary:hover { opacity: 0.85; }
.btn-primary:active { opacity: 0.7; transform: scale(0.99); }
.btn-ghost {
  width: 100%; padding: 12px;
  background: transparent; color: var(--ink-muted);
  border: 1px solid var(--div); border-radius: 7px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: border-color 120ms, color 120ms; margin-top: 6px;
}
.btn-ghost:hover { border-color: var(--ink-muted); color: var(--ink); }
.btn-danger { color: var(--neg); border-color: var(--neg-bg); }
.btn-danger:hover { border-color: var(--neg); }

/* ── Search ── */
.search-wrap { position: relative; margin-bottom: 10px; }
.search-ico {
  position: absolute; left: 11px; top: 50%;
  transform: translateY(-50%); color: var(--ink-muted);
  font-size: 14px; pointer-events: none;
}
.search-input {
  width: 100%; background: var(--bg-card);
  border: 1px solid var(--div); border-radius: 7px;
  padding: 9px 12px 9px 34px; font-size: 13px; color: var(--ink);
  font-family: 'DM Sans', sans-serif;
  transition: border-color 120ms;
}
.search-input:focus { outline: none; border-color: var(--ink-muted); }
.filter-strip {
  display: flex; gap: 6px; overflow-x: auto;
  padding-bottom: 2px; margin-bottom: 14px;
  scrollbar-width: none;
}
.filter-strip::-webkit-scrollbar { display: none; }
.filter-chip {
  flex-shrink: 0; padding: 5px 12px;
  border: 1px solid var(--div); border-radius: 99px;
  background: var(--bg-card); color: var(--ink-muted);
  font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all 120ms; white-space: nowrap;
  font-family: 'DM Sans', sans-serif;
}
.filter-chip.on { background: var(--ink); border-color: var(--ink); color: var(--bg); }
.filter-chip:hover:not(.on) { border-color: var(--ink-muted); color: var(--ink); }

/* ── Settings panel ── */
.settings-overlay {
  position: fixed; inset: 0; background: rgba(20,20,20,0.4);
  backdrop-filter: blur(6px); z-index: 80;
  display: flex; align-items: flex-end; justify-content: center;
  animation: fadeIn 150ms ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.settings-sheet {
  background: var(--bg); width: 100%; max-width: 430px;
  border-radius: 18px 18px 0 0; border-top: 1px solid var(--div);
  max-height: 92vh; overflow-y: auto;
  animation: sheetUp 200ms cubic-bezier(0.32,0.72,0,1);
  padding: 0 18px 40px;
}
@keyframes sheetUp {
  from { transform: translateY(30px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.sheet-handle {
  width: 34px; height: 4px; background: var(--div);
  border-radius: 99px; margin: 12px auto 18px;
}
.sheet-title {
  font-family: 'Playfair Display', serif;
  font-size: 22px; font-weight: 700; margin-bottom: 20px;
}
.settings-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 0; border-bottom: 1px solid var(--div); gap: 12px;
}
.settings-row:last-child { border-bottom: none; }
.settings-row-lbl { font-size: 14px; font-weight: 600; color: var(--ink); }
.settings-row-sub { font-size: 12px; color: var(--ink-muted); margin-top: 2px; }
.settings-btn {
  padding: 7px 14px; border: 1px solid var(--div);
  border-radius: 6px; background: transparent;
  font-size: 12px; font-weight: 600; color: var(--ink-mid);
  cursor: pointer; font-family: 'DM Sans', sans-serif;
  transition: border-color 120ms, color 120ms; white-space: nowrap;
}
.settings-btn:hover { border-color: var(--ink-muted); color: var(--ink); }
.settings-btn.primary { background: var(--ink); color: var(--bg); border-color: var(--ink); }

/* ── Toast ── */
.toast {
  position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
  background: var(--ink); color: var(--bg);
  padding: 9px 18px; border-radius: 99px;
  font-size: 13px; font-weight: 600; z-index: 200;
  white-space: nowrap; pointer-events: none;
  animation: toastIn 180ms ease;
  box-shadow: 0 4px 16px rgba(20,20,20,0.2);
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ── Dupe warning ── */
.dupe-warn {
  background: var(--warn-bg); border: 1px solid #D4A82A;
  border-radius: 6px; padding: 9px 13px;
  font-size: 12px; font-weight: 600; color: var(--warn);
  margin-bottom: 12px; display: flex; align-items: center; gap: 7px;
}

/* ── Budget inline editor ── */
.budget-edit-row { display: flex; gap: 7px; margin-top: 8px; }
.budget-edit-row .field-input { flex: 1; padding: 8px 11px; font-size: 13px; }
.budget-edit-row .save-btn {
  padding: 8px 13px; border: 1px solid var(--ink);
  border-radius: 6px; background: var(--ink); color: var(--bg);
  font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: 'DM Sans', sans-serif; white-space: nowrap;
}
.budget-edit-row .cancel-btn {
  padding: 8px 10px; border: 1px solid var(--div);
  border-radius: 6px; background: transparent; color: var(--ink-muted);
  font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif;
}

/* ── Restore drop zone ── */
.restore-zone {
  border: 1.5px dashed var(--div); border-radius: 8px;
  padding: 20px; text-align: center; cursor: pointer;
  transition: border-color 150ms, background 150ms;
  margin-top: 8px;
}
.restore-zone:hover { border-color: var(--ink-muted); background: var(--bg-alt); }
.restore-zone input { display: none; }

/* Utility */
.mt8  { margin-top:  8px; }
.mt12 { margin-top: 12px; }
.mt16 { margin-top: 16px; }
.mb8  { margin-bottom:  8px; }
.mb12 { margin-bottom: 12px; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(() => migrateAndLoad());
  const [tab,   setTab]   = useState("dashboard");
  const [tabKey, setTabKey] = useState(0);
  const [showAdd,      setShowAdd]      = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [prefillTemplate, setPrefillTemplate] = useState(null);

  // Persist every state change
  useEffect(() => { writeRaw(KEY, state); }, [state]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const switchTab = (t) => { setTab(t); setTabKey(k => k+1); };

  const addTransaction = useCallback((txn) => {
    setState(s => ({
      ...s,
      transactions: [{ ...txn, id: Date.now() + Math.random() }, ...s.transactions],
    }));
    showToast("Transaction recorded");
  }, [showToast]);

  const deleteTransaction = useCallback((id) => {
    if (!window.confirm("Delete this transaction?")) return;
    setState(s => ({ ...s, transactions: s.transactions.filter(t => t.id !== id) }));
    showToast("Deleted");
  }, [showToast]);

  const setBudget = useCallback((catId, amount) => {
    setState(s => ({ ...s, budgets: { ...s.budgets, [catId]: amount } }));
  }, []);

  const openAddWithTemplate = useCallback((tpl) => {
    setPrefillTemplate(tpl);
    setShowAdd(true);
  }, []);

  const exportCSV = useCallback(() => {
    const rows = [["Date","Type","Category","Amount","Note","Recurring"]];
    state.transactions.forEach(t => rows.push([
      t.date, t.type, t.category,
      t.amount.toFixed(2), t.note || "", t.recurring ? t.recurFreq : ""
    ]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `ledger-${today()}.csv`;
    a.click();
    showToast("CSV exported");
  }, [state.transactions, showToast]);

  const exportJSON = useCallback(() => {
    const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString(), version: 5 }, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    a.download = `ledger-backup-${today()}.json`;
    a.click();
    showToast(`Backup saved — ${state.transactions.length} transactions`);
  }, [state, showToast]);

  const importJSON = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const txns = parsed.transactions || parsed.entries || [];
        if (!txns.length) { showToast("No transactions found in file"); return; }
        if (!window.confirm(`Restore ${txns.length} transactions? This will merge with your current data.`)) return;
        setState(s => {
          const existingIds = new Set(s.transactions.map(t => String(t.id)));
          const newTxns = txns
            .map(normaliseTransaction)
            .filter(t => !existingIds.has(String(t.id)));
          const merged = [...newTxns, ...s.transactions]
            .sort((a, b) => b.date.localeCompare(a.date));
          return {
            ...s,
            transactions: merged,
            budgets:    parsed.budgets    || s.budgets,
            categories: parsed.categories || s.categories,
            templates:  parsed.templates  || s.templates,
            currency:   parsed.currency   || s.currency,
          };
        });
        showToast(`Restored ${txns.length} transactions`);
      } catch {
        showToast("Could not read backup file");
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

        {/* Top bar */}
        <header className="topbar">
          <span className="wordmark">Expense Ledger</span>
          <div className="topbar-right">
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">≡</button>
          </div>
        </header>

        {/* Pages */}
        <main className="page" key={tabKey}>
          {tab === "dashboard" && (
            <Dashboard
              transactions={transactions}
              budgets={budgets}
              categories={categories}
              templates={templates}
              currency={currency}
              onAddClick={() => setShowAdd(true)}
              onTemplateClick={openAddWithTemplate}
              onSetBudget={setBudget}
            />
          )}
          {tab === "ledger" && (
            <Ledger
              transactions={transactions}
              categories={categories}
              currency={currency}
              onDelete={deleteTransaction}
              onAddClick={() => setShowAdd(true)}
            />
          )}
        </main>

        {/* FAB */}
        <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add transaction">+</button>

        {/* Tab bar */}
        <nav className="tabbar">
          {[
            { id: "dashboard", icon: "◈", label: "Dashboard" },
            { id: "ledger",    icon: "≡", label: "Ledger"    },
          ].map(t => (
            <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={() => switchTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-lbl">{t.label}</span>
              {tab === t.id && <span className="tab-dot" />}
            </button>
          ))}
        </nav>

        {/* Add overlay */}
        {showAdd && (
          <AddOverlay
            categories={categories}
            templates={templates}
            currency={currency}
            transactions={transactions}
            prefill={prefillTemplate}
            onAdd={addTransaction}
            onClose={() => { setShowAdd(false); setPrefillTemplate(null); }}
          />
        )}

        {/* Settings */}
        {showSettings && (
          <SettingsPanel
            state={state}
            onExportCSV={exportCSV}
            onExportJSON={exportJSON}
            onImportJSON={importJSON}
            onSetBudget={setBudget}
            onCurrencyChange={(c) => setState(s => ({ ...s, currency: c }))}
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
function Dashboard({ transactions, budgets, categories, templates, currency, onAddClick, onTemplateClick, onSetBudget }) {
  const now  = curMon();
  const prev = prevMon();

  const curTxns = transactions.filter(t => t.date.startsWith(now));
  const curExp  = curTxns.filter(t => t.type === "expense").reduce((s,t) => s+t.amount, 0);
  const curInc  = curTxns.filter(t => t.type === "income").reduce((s,t) => s+t.amount, 0);
  const net     = curInc - curExp;

  const prevExp = transactions.filter(t => t.date.startsWith(prev) && t.type === "expense").reduce((s,t) => s+t.amount, 0);
  const expDiff = prevExp > 0 ? ((curExp - prevExp) / prevExp * 100) : 0;

  // Category spending for donut
  const catSpend = {};
  curTxns.filter(t => t.type === "expense").forEach(t => {
    catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
  });
  const catData = Object.entries(catSpend)
    .map(([id, amt]) => ({ ...(categories.find(c => c.id===id) || { id, name: id, icon:"◦", color:"#888" }), amt }))
    .sort((a, b) => b.amt - a.amt);

  const recent = transactions.slice(0, 8);

  return (
    <div>
      {/* ── Hero numbers ── */}
      <div className="hero">
        <div className="hero-eyebrow">
          {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </div>
        <div className={`hero-number${net >= 0 ? " pos" : " neg"}`}>
          {net < 0 ? "−" : ""}{fmt(Math.abs(net), currency)}
        </div>
        <div className="hero-sub">
          {net >= 0 ? "surplus this month" : "deficit this month"}
          {prevExp > 0 && (
            <span style={{ marginLeft: 8, color: expDiff > 0 ? "var(--neg)" : "var(--pos)", fontWeight: 600 }}>
              · {expDiff > 0 ? "▲" : "▼"}{Math.abs(expDiff).toFixed(0)}% vs last month
            </span>
          )}
        </div>
        <div className="hero-row">
          <div className="hero-cell">
            <div className={`hero-cell-val${curInc > 0 ? " pos" : ""}`}>{fmt(curInc, currency)}</div>
            <div className="hero-cell-lbl">Income</div>
          </div>
          <div className="hero-cell">
            <div className={`hero-cell-val${curExp > 0 ? " neg" : ""}`}>{fmt(curExp, currency)}</div>
            <div className="hero-cell-lbl">Spent</div>
          </div>
          <div className="hero-cell">
            <div className="hero-cell-val" style={{ color: curInc > 0 ? `var(--pos)` : "var(--ink-muted)" }}>
              {curInc > 0 ? `${Math.max(0,Math.round(((curInc-curExp)/curInc)*100))}%` : "—"}
            </div>
            <div className="hero-cell-lbl">Saved</div>
          </div>
        </div>
      </div>

      {/* ── Category donut ── */}
      {catData.length > 0 ? (
        <>
          <div className="sec-hdr">
            <span className="sec-title">Spending by Category</span>
          </div>
          <Donut data={catData} total={curExp} currency={currency} />
        </>
      ) : (
        transactions.length === 0 && (
          <div className="empty">
            <div className="empty-ico">◌</div>
            <div className="empty-title">Nothing recorded yet</div>
            <div className="empty-body">Tap + to add your first transaction. Your spending breakdown will appear here.</div>
            <button className="btn-primary mt12" style={{ width: "auto", padding: "11px 24px" }} onClick={onAddClick}>
              Add first transaction
            </button>
          </div>
        )
      )}

      {/* ── Budget progress ── */}
      <BudgetSection
        budgets={budgets}
        catSpend={catSpend}
        categories={categories}
        currency={currency}
        onSetBudget={onSetBudget}
      />

      {/* ── Quick templates ── */}
      {templates.length > 0 && (
        <>
          <div className="sec-hdr mt16">
            <span className="sec-title">Quick Add</span>
          </div>
          <div className="tpl-strip mb12">
            {templates.map(tpl => (
              <button key={tpl.id} className="tpl-chip" onClick={() => onTemplateClick(tpl)}>
                <span>{tpl.icon}</span>
                {tpl.name}
                <span className="tpl-amt">{fmt(tpl.amount, currency)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Recent transactions ── */}
      {recent.length > 0 && (
        <>
          <div className="sec-hdr mt8">
            <span className="sec-title">Recent</span>
          </div>
          <GroupedTxns txns={recent} categories={categories} currency={currency} />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DONUT CHART
// ─────────────────────────────────────────────────────────────────────────────
function Donut({ data, total, currency }) {
  const size = 100, stroke = 16, r = (size-stroke)/2, circ = 2*Math.PI*r;
  let off = 0;
  const segs = data.slice(0, 7).filter(d => d.amt > 0).map(d => {
    const pct = d.amt / Math.max(total, 1);
    const seg = { ...d, pct, dash: `${pct*circ} ${circ}`, offset: -(off*circ) + (circ/4) };
    off += pct;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
        <svg width={size} height={size} role="img" aria-label="Spending breakdown donut chart">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--div)" strokeWidth={stroke} />
          {segs.map((s,i) => (
            <circle key={i}
              cx={size/2} cy={size/2} r={r}
              fill="none" stroke={s.color} strokeWidth={stroke-2}
              strokeDasharray={s.dash} strokeDashoffset={s.offset}
              style={{ transition: `stroke-dasharray 0.5s ${i*0.06}s ease` }}
            />
          ))}
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <div className="donut-center-lbl">Total</div>
          <div className="donut-center-val">{fmt(total, currency)}</div>
        </div>
      </div>
      <div className="donut-right">
        {segs.map((s,i) => (
          <div key={i} className="legend-row">
            <div className="legend-dot" style={{ background: s.color }} />
            <span className="legend-name">{s.icon} {s.name}</span>
            <span className="legend-amt">{fmt(s.amt, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET SECTION
// ─────────────────────────────────────────────────────────────────────────────
function BudgetSection({ budgets, catSpend, categories, currency, onSetBudget }) {
  const [editing,   setEditing]   = useState(null);
  const [budgetVal, setBudgetVal] = useState("");

  const activeBudgets = Object.entries(budgets).filter(([,v]) => v > 0);
  if (activeBudgets.length === 0) return null;

  return (
    <div className="budget-block">
      <div className="sec-hdr mt16">
        <span className="sec-title">Budgets</span>
      </div>
      {activeBudgets.map(([catId, limit]) => {
        const cat   = categories.find(c => c.id === catId);
        const spent = catSpend[catId] || 0;
        const pct   = Math.min((spent / limit) * 100, 100);
        const over  = spent > limit;
        const warn  = pct >= 80 && !over;

        return (
          <div key={catId} className="budget-row">
            <div className="budget-hdr">
              <span className="budget-name">{cat?.icon} {cat?.name}</span>
              <span className="budget-nums">
                <b>{fmt(spent, currency)}</b> / {fmt(limit, currency)}
                {" "}
                <span
                  style={{ color:"var(--ink-muted)", textDecoration:"underline", cursor:"pointer", fontSize:11 }}
                  onClick={() => { setEditing(catId); setBudgetVal(String(limit)); }}
                >edit</span>
              </span>
            </div>
            <div className="budget-track">
              <div className="budget-fill" style={{
                width: `${pct}%`,
                background: over ? "var(--neg)" : warn ? "var(--warn)" : (cat?.color || "var(--ink-mid)"),
              }} />
            </div>
            <div className={`budget-msg${over?" over":warn?" warn":""}`}>
              {over
                ? `${fmt(spent-limit, currency)} over limit`
                : warn
                ? `${fmt(limit-spent, currency)} left — approaching limit`
                : `${fmt(limit-spent, currency)} remaining`}
            </div>
            {editing === catId && (
              <div className="budget-edit-row" onClick={e => e.stopPropagation()}>
                <input
                  className="field-input"
                  type="number" min="0" step="1"
                  placeholder="Monthly limit"
                  value={budgetVal}
                  onChange={e => setBudgetVal(e.target.value)}
                  autoFocus
                />
                <button className="save-btn" onClick={() => {
                  onSetBudget(catId, parseFloat(budgetVal) || 0);
                  setEditing(null);
                }}>Save</button>
                <button className="cancel-btn" onClick={() => setEditing(null)}>✕</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER
// ─────────────────────────────────────────────────────────────────────────────
function Ledger({ transactions, categories, currency, onDelete, onAddClick }) {
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    let t = [...transactions];
    if (search)           t = t.filter(x => (x.note||"").toLowerCase().includes(search.toLowerCase()) || x.category.toLowerCase().includes(search.toLowerCase()));
    if (catFilter  !== "all") t = t.filter(x => x.category === catFilter);
    if (typeFilter !== "all") t = t.filter(x => x.type === typeFilter);
    return t;
  }, [transactions, search, catFilter, typeFilter]);

  const usedCats = useMemo(() =>
    [...new Set(transactions.map(t => t.category))]
      .map(id => categories.find(c => c.id===id))
      .filter(Boolean),
    [transactions, categories]);

  if (transactions.length === 0) return (
    <div className="empty">
      <div className="empty-ico">≡</div>
      <div className="empty-title">No transactions yet</div>
      <div className="empty-body">Start recording to build your ledger.</div>
      <button className="btn-primary mt12" style={{ width:"auto", padding:"11px 24px" }} onClick={onAddClick}>
        Add first transaction
      </button>
    </div>
  );

  const total = filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
        <span className="playfair" style={{ fontSize:20, fontWeight:700 }}>Ledger</span>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:"var(--ink-mid)" }}>
          {filtered.length} entries
        </span>
      </div>

      <div className="search-wrap">
        <span className="search-ico">⌕</span>
        <input className="search-input" placeholder="Search note or category…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="filter-strip">
        {["all","expense","income"].map(t => (
          <button key={t} className={`filter-chip${typeFilter===t?" on":""}`} onClick={() => setTypeFilter(t)}>
            {t==="all"?"All":t==="expense"?"Expenses":"Income"}
          </button>
        ))}
      </div>

      <div className="filter-strip">
        <button className={`filter-chip${catFilter==="all"?" on":""}`} onClick={() => setCatFilter("all")}>All categories</button>
        {usedCats.map(c => (
          <button key={c.id} className={`filter-chip${catFilter===c.id?" on":""}`} onClick={() => setCatFilter(catFilter===c.id?"all":c.id)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty" style={{ padding:"32px 0" }}>
          <div className="empty-ico">⌕</div>
          <div className="empty-title">No results</div>
          <div className="empty-body">Try a different search term or clear the filters.</div>
        </div>
      ) : (
        <GroupedTxns txns={filtered} categories={categories} currency={currency} onDelete={onDelete} />
      )}
    </div>
  );
}

// ── Grouped transaction list ──────────────────────────────────────────────────
function GroupedTxns({ txns, categories, currency, onDelete }) {
  const groups = useMemo(() => {
    const g = {};
    txns.forEach(t => { (g[t.date] = g[t.date] || []).push(t); });
    return Object.entries(g).sort((a,b) => b[0].localeCompare(a[0]));
  }, [txns]);

  return (
    <>
      {groups.map(([date, rows]) => {
        const dayTotal = rows.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
        return (
          <div key={date} className="txn-group">
            <div className="txn-date-hdr">
              <span className="txn-date-lbl">{fmtDate(date)}</span>
              {dayTotal > 0 && <span className="txn-date-total">{fmt(dayTotal, currency)}</span>}
            </div>
            <div className="txn-card">
              {rows.map(t => <TxnRow key={t.id} txn={t} categories={categories} currency={currency} onDelete={onDelete} />)}
            </div>
          </div>
        );
      })}
    </>
  );
}

function TxnRow({ txn, categories, currency, onDelete }) {
  const cat   = categories.find(c => c.id === txn.category) || { icon:"◦", color:"#888", name: txn.category };
  const isInc = txn.type === "income";
  return (
    <div className="txn-row" onClick={() => onDelete?.(txn.id)}>
      <div className="txn-ico" style={{ background: cat.color + "1A" }}>{cat.icon}</div>
      <div className="txn-info">
        <div className="txn-name">{txn.note || cat.name}</div>
        <div className="txn-meta">
          <span>{txn.date}</span>
          <span className="txn-tag">{cat.name}</span>
          {txn.recurring && <span className="rec-tag">↻ {txn.recurFreq}</span>}
        </div>
      </div>
      <div className={`txn-amt ${isInc ? "inc" : "exp"}`}>
        {isInc ? "+" : "−"}{fmt(txn.amount, currency)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD OVERLAY — Full screen, instant keyboard, < 5 taps
// ─────────────────────────────────────────────────────────────────────────────
function AddOverlay({ categories, templates, currency, transactions, prefill, onAdd, onClose }) {
  const [type,      setType]     = useState("expense");
  const [amount,    setAmount]   = useState(prefill ? String(prefill.amount) : "");
  const [catId,     setCatId]    = useState(prefill?.catId || "food");
  const [note,      setNote]     = useState(prefill?.note || "");
  const [date,      setDate]     = useState(today());
  const [recur,     setRecur]    = useState(false);
  const [freq,      setFreq]     = useState("monthly");
  const [err,       setErr]      = useState("");
  const [selTpl,    setSelTpl]   = useState(prefill?.id || null);
  const amtRef = useRef();

  const expCats = categories.filter(c => !["salary","freelance"].includes(c.id));
  const incCats = categories.filter(c => ["salary","freelance","other"].includes(c.id));
  const displayCats = type === "income" ? incCats : expCats;

  // Auto-focus amount on open
  useEffect(() => {
    const timer = setTimeout(() => amtRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // Switch default cat when type changes
  useEffect(() => {
    setCatId(type === "income" ? "salary" : (prefill?.catId || "food"));
  }, [type]);

  // Duplicate detection
  const isDupe = useMemo(() => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return false;
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    return transactions.some(t =>
      t.category === catId &&
      Math.abs(t.amount - amt) < 0.01 &&
      new Date(t.date + "T00:00:00").getTime() > tenMinAgo
    );
  }, [amount, catId, transactions]);

  const applyTemplate = (tpl) => {
    setAmount(String(tpl.amount));
    setCatId(tpl.catId);
    setNote(tpl.note || tpl.name);
    setType("expense");
    setSelTpl(tpl.id);
    amtRef.current?.focus();
  };

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setErr("Enter a valid amount"); return; }
    if (!catId) { setErr("Select a category"); return; }
    onAdd({ type, amount: amt, category: catId, note: note.trim(), date, recurring: recur, recurFreq: recur ? freq : null });
    onClose();
  };

  // Submit on Enter in note field
  const onNoteKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } };

  return (
    <div className="add-overlay">
      <div className="add-topbar">
        <span className="add-title">New Transaction</span>
        <button className="add-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="add-body">
        {/* Type toggle */}
        <div className="type-toggle">
          <button className={`type-btn${type==="expense"?" active":""}`} onClick={() => setType("expense")}>Expense</button>
          <button className={`type-btn${type==="income"?" active":""}`}  onClick={() => setType("income")}>Income</button>
        </div>

        {/* Amount — keyboard opens automatically */}
        <div className="amount-zone">
          <span className="amount-sym">{currency}</span>
          <input
            ref={amtRef}
            className="amount-field"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={e => { setAmount(e.target.value); setErr(""); setSelTpl(null); }}
            min="0" step="0.01"
          />
        </div>

        {err && <div style={{ color:"var(--neg)", fontSize:12, textAlign:"center", marginBottom:12, fontWeight:600 }}>{err}</div>}
        {isDupe && <div className="dupe-warn">⚠ Similar transaction was just recorded — double entry?</div>}

        {/* Quick templates */}
        {templates.length > 0 && (
          <div className="mb12">
            <div className="field-lbl">Quick add</div>
            <div className="tpl-strip">
              {templates.map(tpl => (
                <button key={tpl.id} className={`tpl-chip${selTpl===tpl.id?" selected":""}`} onClick={() => applyTemplate(tpl)}>
                  <span>{tpl.icon}</span>
                  {tpl.name}
                  <span className="tpl-amt">{fmt(tpl.amount, currency)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category — always visible, no scroll needed */}
        <div className="field">
          <div className="field-lbl">Category</div>
          <div className="cat-row">
            {displayCats.map(cat => (
              <button key={cat.id} className={`cat-chip${catId===cat.id?" sel":""}`} onClick={() => setCatId(cat.id)}>
                <span className="cat-chip-ico">{cat.icon}</span>
                <span className="cat-chip-name">{cat.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Note — optional */}
        <div className="field">
          <div className="field-lbl">Note <span style={{ color:"var(--ink-faint)", fontWeight:400, textTransform:"none", letterSpacing:0 }}>(optional)</span></div>
          <input
            className="field-input"
            placeholder="e.g., Weekly shop, Barber, Netflix"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={onNoteKeyDown}
          />
        </div>

        {/* Date + Recurring */}
        <div className="field-row" style={{ marginBottom:14 }}>
          <div className="field">
            <div className="field-lbl">Date</div>
            <input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field">
            <div className="field-lbl">Recurring</div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
              <div className={`toggle-track${recur?" on":""}`} onClick={() => setRecur(r=>!r)} role="switch" aria-checked={recur}>
                <div className="toggle-knob" />
              </div>
              {recur && (
                <select className="field-select" value={freq} onChange={e=>setFreq(e.target.value)} style={{ fontSize:12, color:"var(--ink)", background:"transparent", border:"none", outline:"none", cursor:"pointer" }}>
                  {["weekly","biweekly","monthly","yearly"].map(f => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button className="btn-primary" onClick={submit}>
          Save {type === "income" ? "Income" : "Expense"}
        </button>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────────────
function SettingsPanel({ state, onExportCSV, onExportJSON, onImportJSON, onSetBudget, onCurrencyChange, onClose, showToast }) {
  const { transactions, budgets, categories, currency } = state;
  const [curSymbol,  setCurSymbol]  = useState(currency);
  const [editBudget, setEditBudget] = useState(null);
  const [budgetVal,  setBudgetVal]  = useState("");
  const fileRef = useRef();

  const totalInc = transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExp = transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  return (
    <div className="settings-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="settings-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">Settings</div>

        {/* Account summary */}
        <div style={{ background:"var(--bg-alt)", borderRadius:8, padding:"14px 14px", marginBottom:20 }}>
          <div className="sec-title" style={{ marginBottom:10 }}>Overview</div>
          {[
            ["Total income",   fmt(totalInc, currency), "var(--pos)"],
            ["Total expenses", fmt(totalExp, currency), "var(--neg)"],
            ["Net balance",    fmt(totalInc-totalExp, currency), totalInc>=totalExp?"var(--pos)":"var(--neg)"],
            ["Transactions",   String(transactions.length), "var(--ink)"],
          ].map(([lbl, val, col]) => (
            <div key={lbl} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid var(--div)" }}>
              <span style={{ fontSize:13, color:"var(--ink-muted)" }}>{lbl}</span>
              <span style={{ fontSize:13, fontWeight:700, color:col, fontFamily:"'Playfair Display',serif" }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Currency */}
        <div className="settings-row">
          <div>
            <div className="settings-row-lbl">Currency symbol</div>
            <div className="settings-row-sub">Currently: {currency}</div>
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center" }}>
            <input
              className="field-input"
              value={curSymbol}
              onChange={e => setCurSymbol(e.target.value)}
              maxLength={3}
              style={{ width:56, textAlign:"center", padding:"7px 10px" }}
            />
            <button className="settings-btn primary" onClick={() => { onCurrencyChange(curSymbol); showToast("Currency updated"); }}>
              Save
            </button>
          </div>
        </div>

        {/* Budgets */}
        <div style={{ padding:"14px 0" }}>
          <div className="sec-title" style={{ marginBottom:12 }}>Monthly Budgets</div>
          {categories.filter(c => !["salary","freelance"].includes(c.id)).map((cat, i, arr) => {
            const limit = budgets[cat.id] || 0;
            return (
              <div key={cat.id} style={{ padding:"10px 0", borderBottom: i < arr.length-1 ? "1px solid var(--div)" : "none" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{cat.icon} {cat.name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {limit > 0 && (
                      <span style={{ fontSize:13, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>
                        {fmt(limit, currency)}
                      </span>
                    )}
                    <span
                      style={{ fontSize:11, color:"var(--ink-muted)", textDecoration:"underline", cursor:"pointer", textUnderlineOffset:2 }}
                      onClick={() => { setEditBudget(cat.id); setBudgetVal(limit > 0 ? String(limit) : ""); }}
                    >
                      {limit > 0 ? "Edit" : "Set"}
                    </span>
                  </div>
                </div>
                {editBudget === cat.id && (
                  <div className="budget-edit-row" style={{ marginTop:8 }} onClick={e => e.stopPropagation()}>
                    <input
                      className="field-input"
                      type="number" min="0" step="1"
                      placeholder="Monthly limit"
                      value={budgetVal}
                      onChange={e => setBudgetVal(e.target.value)}
                      autoFocus
                    />
                    <button className="save-btn" onClick={() => {
                      onSetBudget(cat.id, parseFloat(budgetVal) || 0);
                      setEditBudget(null);
                      showToast("Budget saved");
                    }}>Save</button>
                    <button className="cancel-btn" onClick={() => setEditBudget(null)}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Data export / import */}
        <div style={{ padding:"14px 0 0" }}>
          <div className="sec-title" style={{ marginBottom:12 }}>Data</div>

          <div className="settings-row">
            <div>
              <div className="settings-row-lbl">Export CSV</div>
              <div className="settings-row-sub">Full ledger as spreadsheet</div>
            </div>
            <button className="settings-btn" onClick={onExportCSV}>Export</button>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-row-lbl">Export JSON backup</div>
              <div className="settings-row-sub">Complete backup — {transactions.length} transactions</div>
            </div>
            <button className="settings-btn" onClick={onExportJSON}>Backup</button>
          </div>

          <div className="settings-row" style={{ flexDirection:"column", alignItems:"flex-start", gap:10 }}>
            <div>
              <div className="settings-row-lbl">Restore from backup</div>
              <div className="settings-row-sub">Select a .json backup file. New transactions will be merged — nothing is deleted.</div>
            </div>
            <div
              className="restore-zone"
              style={{ width:"100%" }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); onImportJSON(e.dataTransfer.files[0]); }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={e => { onImportJSON(e.target.files[0]); e.target.value=""; }}
              />
              <div style={{ fontSize:13, color:"var(--ink-muted)", fontWeight:600 }}>
                Click to choose file, or drag & drop
              </div>
              <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:4 }}>
                Accepts .json backup files
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop:20, paddingBottom:8, textAlign:"center", fontSize:11, color:"var(--ink-faint)" }}>
          Data is stored locally in your browser. Export regularly to avoid data loss.
        </div>

        <button className="btn-ghost mt8" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
