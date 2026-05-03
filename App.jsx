import { useState, useEffect, useCallback } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "expense_ledger_v3";

const DEFAULT_CATEGORIES = [
  { id: "food",          name: "Food & Dining",   icon: "🍽️",  color: "#141414" },
  { id: "transport",     name: "Transport",        icon: "🚗",  color: "#141414" },
  { id: "entertainment", name: "Entertainment",    icon: "🎬",  color: "#141414" },
  { id: "health",        name: "Health",           icon: "💊",  color: "#141414" },
  { id: "shopping",      name: "Shopping",         icon: "🛍️",  color: "#141414" },
  { id: "subscriptions", name: "Subscriptions",    icon: "📱",  color: "#141414" },
  { id: "savings",       name: "Savings",          icon: "💰",  color: "#141414" },
];

const SEED_EXPENSES = (() => {
  const today = new Date();
  const d = (offset, catId, amount, note) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - offset);
    return { id: Math.random(), amount, categoryId: catId, date: dt.toISOString().slice(0, 10), note, recurring: false, intervalDays: null, nextDue: null, receiptImg: null };
  };
  return [
    d(0,  "food",          34.50,  "Dinner at Noma"),
    d(1,  "transport",     12.80,  "Uber to office"),
    d(1,  "food",           8.20,  "Morning coffee"),
    d(2,  "shopping",      89.00,  "New headphones"),
    d(3,  "health",        45.00,  "Gym membership"),
    d(3,  "entertainment", 14.99,  "Netflix"),
    d(5,  "food",          62.40,  "Grocery run"),
    d(6,  "subscriptions",  9.99,  "Spotify"),
    d(7,  "transport",     28.00,  "Train to downtown"),
    d(8,  "food",          22.50,  "Lunch with team"),
    d(10, "shopping",     156.00,  "Winter jacket"),
    d(12, "entertainment", 24.00,  "Cinema tickets"),
    d(14, "food",          48.75,  "Date night"),
    d(15, "health",        85.00,  "Dentist"),
    d(16, "subscriptions", 12.99,  "iCloud"),
    d(18, "transport",     55.00,  "Monthly transit pass"),
    d(20, "food",          19.30,  "Sushi takeout"),
    d(22, "savings",      200.00,  "Emergency fund"),
    d(25, "entertainment", 38.00,  "Concert ticket"),
    d(28, "shopping",      42.50,  "Running shoes"),
  ];
})();

const INITIAL_STATE = {
  expenses: SEED_EXPENSES,
  categories: DEFAULT_CATEGORIES,
  budgets: { overall: 1200, perCategory: { food: 300, transport: 150, entertainment: 100, health: 150, shopping: 200, subscriptions: 50, savings: 300 } },
  currency: "$",
  setupDone: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n, cur) => `${cur}${parseFloat(Math.abs(n).toFixed(2)).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate  = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtMonth = (m) => new Date(m + "-02").toLocaleDateString("en-US", { month: "long", year: "numeric" });
const addDays  = (dateStr, days) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

function loadState() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function persist(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:         #F7F4EE;
    --ink:        #141414;
    --ink-mid:    #6B6860;
    --ink-faint:  #A8A49C;
    --rule:       #E5E5E5;
    --accent:     #8C6A4A;
    --accent-bg:  #F0EAE2;
    --danger:     #B04A2F;
    --serif:      'Playfair Display', Georgia, serif;
    --sans:       'DM Sans', Helvetica Neue, sans-serif;
  }

  html, body { background: var(--bg); }

  ::-webkit-scrollbar { width: 2px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 2px; }

  .app {
    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes barFill { from { width: 0%; } to { width: var(--w); } }
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes modalIn {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .fade-up   { animation: fadeUp 0.4s cubic-bezier(.2,.8,.4,1) both; }
  .fade-up-1 { animation-delay: 0.03s; }
  .fade-up-2 { animation-delay: 0.08s; }
  .fade-up-3 { animation-delay: 0.14s; }
  .fade-up-4 { animation-delay: 0.20s; }
  .fade-up-5 { animation-delay: 0.26s; }

  /* Nav */
  .nav-item {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    padding: 10px 0 12px;
    margin-right: 24px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    font-family: var(--sans);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    position: relative;
    transition: color 0.2s;
  }
  .nav-item:hover { color: var(--ink-mid); }
  .nav-item.active {
    color: var(--ink);
    font-weight: 600;
  }
  .nav-item.active::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px;
    background: var(--ink);
  }

  /* Divider */
  .rule { border: none; border-top: 1px solid var(--rule); margin: 0; }

  /* Buttons */
  .btn-primary {
    background: var(--ink);
    color: var(--bg);
    border: none;
    border-radius: 2px;
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.85; }

  .btn-ghost {
    background: transparent;
    border: 1px solid var(--rule);
    color: var(--ink-mid);
    border-radius: 2px;
    font-family: var(--sans);
    font-size: 11px;
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-ghost:hover { border-color: var(--ink-mid); color: var(--ink); }

  /* Inputs */
  input, select, textarea {
    font-family: var(--sans);
    outline: none;
    color: var(--ink);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--rule);
    border-radius: 0;
    padding: 8px 0;
    font-size: 14px;
    width: 100%;
    transition: border-color 0.2s;
    appearance: none;
    -webkit-appearance: none;
  }
  input:focus, select:focus, textarea:focus {
    border-bottom-color: var(--ink);
    outline: none;
    box-shadow: none;
  }
  input::placeholder { color: var(--ink-faint); }
  select { cursor: pointer; background: var(--bg); }
  select option { background: var(--bg); color: var(--ink); }

  /* Modal */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(247,244,238,0.85);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  .modal-shell {
    background: var(--bg);
    border-top: 1px solid var(--rule);
    width: 100%; max-width: 560px;
    padding: 32px 28px 48px;
    max-height: 92vh;
    overflow-y: auto;
    animation: modalIn 0.3s cubic-bezier(.2,.8,.4,1);
  }

  /* Progress bar */
  .bar-track {
    height: 3px;
    background: var(--rule);
    border-radius: 0;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    animation: barFill 0.7s cubic-bezier(.4,0,.2,1) both;
  }

  /* Transaction row */
  .tx-row {
    cursor: pointer;
    transition: background 0.1s;
  }
  .tx-row:hover { background: var(--accent-bg); }

  /* Filter pill */
  .filter-pill {
    padding: 4px 12px;
    border-radius: 0;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border: 1px solid var(--rule);
    background: transparent;
    color: var(--ink-faint);
    font-family: var(--sans);
    transition: all 0.15s;
  }
  .filter-pill:hover { color: var(--ink); border-color: var(--ink-mid); }
  .filter-pill.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }

  /* Toast */
  .toast {
    position: fixed;
    bottom: 28px; right: 24px;
    z-index: 9999;
    padding: 12px 20px;
    background: var(--ink);
    color: var(--bg);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    animation: toastIn 0.25s cubic-bezier(.2,.8,.4,1);
  }

  /* Section label */
  .section-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  /* Hero number */
  .hero-num {
    font-family: var(--serif);
    font-weight: 400;
    line-height: 1;
    color: var(--ink);
  }

  /* Search bar */
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 2px;
    transition: border-color 0.2s;
  }
  .search-wrap:focus-within { border-bottom-color: var(--ink); }
  .search-wrap input {
    border: none;
    padding: 6px 0;
    font-size: 13px;
    flex: 1;
  }
  .search-wrap input:focus { border: none; }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 64px 20px;
    color: var(--ink-faint);
  }

  /* Bar chart hover */
  .bar-col {
    transition: opacity 0.15s;
    cursor: pointer;
  }
  .bar-col:hover { opacity: 1 !important; }

  /* Donut */
  @keyframes donutReveal {
    from { stroke-dashoffset: var(--full); }
    to   { stroke-dashoffset: var(--offset); }
  }
`;

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [s, setS]       = useState(() => loadState() || INITIAL_STATE);
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState(null);

  const { expenses, categories, budgets, currency } = s;

  useEffect(() => { if (!s.setupDone) setModal("setup"); }, []);
  useEffect(() => { persist(s); }, [s]);

  useEffect(() => {
    const now = todayStr();
    const due = expenses.filter(e => e.recurring && e.nextDue && e.nextDue <= now && e.nextDue !== e.date);
    if (!due.length) return;
    const next = [...expenses];
    due.forEach(e => {
      const clone = { ...e, id: Date.now() + Math.random(), date: now, nextDue: addDays(now, e.intervalDays) };
      const idx = next.findIndex(x => x.id === e.id);
      if (idx !== -1) next[idx] = { ...e, nextDue: addDays(now, e.intervalDays) };
      next.unshift(clone);
    });
    setS(p => ({ ...p, expenses: next }));
  }, []);

  const update = useCallback((patch) => setS(p => ({ ...p, ...patch })), []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const addExpense = (exp) => {
    update({ expenses: [exp, ...expenses] });
    showToast("Entry recorded");
    setModal(null);
  };

  const deleteExpense = (id) => {
    update({ expenses: expenses.filter(e => e.id !== id) });
    showToast("Entry removed");
  };

  const monthExp   = expenses.filter(e => e.date.startsWith(month));
  const totalSpent = monthExp.reduce((s, e) => s + e.amount, 0);
  const remaining  = (budgets.overall || 0) - totalSpent;
  const budgetPct  = budgets.overall ? Math.min((totalSpent / budgets.overall) * 100, 100) : 0;

  const catData = categories.map(cat => {
    const items = monthExp.filter(e => e.categoryId === cat.id);
    const spent = items.reduce((s, e) => s + e.amount, 0);
    return { ...cat, spent, limit: budgets.perCategory[cat.id] || 0, count: items.length };
  }).filter(c => c.spent > 0 || c.limit > 0).sort((a, b) => b.spent - a.spent);

  const allMonths = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort().reverse();
  if (!allMonths.includes(month)) allMonths.unshift(month);

  const filteredExp = monthExp.filter(e => {
    const matchesCat = !filterCat || e.categoryId === filterCat;
    const matchesSearch = !search || (e.note && e.note.toLowerCase().includes(search.toLowerCase())) || (categories.find(c => c.id === e.categoryId)?.name.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const exportCSV = () => {
    const rows = [["Date","Amount","Category","Note","Recurring","Interval(days)"]];
    expenses.forEach(e => {
      const cat = categories.find(c => c.id === e.categoryId);
      rows.push([e.date, e.amount, cat?.name||"", e.note||"", e.recurring?"Yes":"No", e.intervalDays||""]);
    });
    dl(rows.map(r => r.map(v=>`"${v}"`).join(",")).join("\n"), "expenses.csv", "text/csv");
  };
  const exportJSON = () => dl(JSON.stringify(expenses, null, 2), "expenses.json", "application/json");
  const dl = (content, name, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click();
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* Toast */}
        {toast && <div className="toast">{toast}</div>}

        {/* Modals */}
        {modal === "setup"    && <SetupModal onDone={(cur) => { update({ currency: cur, setupDone: true }); setModal(null); }} />}
        {modal === "add"      && <AddModal categories={categories} currency={currency} onAdd={addExpense} onClose={() => setModal(null)} />}
        {modal === "settings" && <SettingsModal state={s} onUpdate={update} onClose={() => setModal(null)} onExportCSV={exportCSV} onExportJSON={exportJSON} showToast={showToast} />}

        {/* Header */}
        <header style={{ background: "var(--bg)", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid var(--rule)" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 20, paddingBottom: 12 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 3 }}>Personal Finance</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Expense Ledger</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn-ghost" onClick={() => setModal("settings")} style={{ padding: "6px 12px", fontSize: 11 }}>Settings</button>
                <button className="btn-primary" onClick={() => setModal("add")} style={{ padding: "8px 16px" }}>+ Add</button>
              </div>
            </div>
            <nav style={{ display: "flex" }}>
              {[["dashboard","Overview"],["timeline","Timeline"],["monthly","History"],["analytics","Analytics"]].map(([k,label]) => (
                <button key={k} className={`nav-item ${view===k?"active":""}`} onClick={() => setView(k)}>{label}</button>
              ))}
            </nav>
          </div>
        </header>

        {/* Month bar */}
        <div style={{ borderBottom: "1px solid var(--rule)", background: "var(--bg)" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <select value={month} onChange={e => setMonth(e.target.value)} style={{ width: "auto", padding: "4px 0", fontSize: 12, fontWeight: 500, color: "var(--ink)", borderBottom: "none" }}>
              {allMonths.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
            <span style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.05em" }}>{monthExp.length} entries</span>
            <div style={{ flex: 1 }} />
            {budgets.overall > 0 && (
              <span style={{ fontSize: 11, color: budgetPct > 90 ? "var(--danger)" : "var(--ink-faint)" }}>
                {Math.round(budgetPct)}% of budget
              </span>
            )}
          </div>
        </div>

        <main style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px 100px" }}>

          {/* ── OVERVIEW ─────────────────────────────────────── */}
          {view === "dashboard" && (
            <div>
              {/* Hero */}
              <div className="fade-up fade-up-1" style={{ marginBottom: 48 }}>
                <div className="section-label" style={{ marginBottom: 16 }}>Total Spent</div>
                <div className="hero-num" style={{ fontSize: 64, marginBottom: 8 }}>
                  {fmtMoney(totalSpent, currency)}
                </div>
                {budgets.overall > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
                    <div className="bar-track" style={{ flex: 1 }}>
                      <div className="bar-fill" style={{
                        "--w": `${budgetPct}%`,
                        background: budgetPct > 90 ? "var(--danger)" : "var(--ink)"
                      }} />
                    </div>
                    <span style={{ fontSize: 12, color: remaining >= 0 ? "var(--ink-mid)" : "var(--danger)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                      {remaining >= 0 ? fmtMoney(remaining, currency) : `−${fmtMoney(Math.abs(remaining), currency)}`} left
                    </span>
                  </div>
                )}
              </div>

              <hr className="rule" />

              {/* Stats row */}
              <div className="fade-up fade-up-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, margin: "32px 0" }}>
                {[
                  { label: "Transactions",  value: monthExp.length },
                  { label: "Daily Average", value: fmtMoney(monthExp.length ? totalSpent / new Set(monthExp.map(e => e.date)).size : 0, currency) },
                  { label: "Categories",    value: catData.filter(c => c.spent > 0).length },
                ].map((stat, i) => (
                  <div key={i} style={{ paddingRight: 20, borderRight: i < 2 ? "1px solid var(--rule)" : "none", paddingLeft: i > 0 ? 20 : 0 }}>
                    <div className="section-label" style={{ marginBottom: 8 }}>{stat.label}</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 400, lineHeight: 1 }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <hr className="rule" />

              {/* Category breakdown */}
              {catData.filter(c => c.spent > 0).length > 0 && (
                <div className="fade-up fade-up-3" style={{ margin: "32px 0" }}>
                  <div className="section-label" style={{ marginBottom: 24 }}>By Category</div>
                  {catData.filter(c => c.spent > 0).map((cat, i) => {
                    const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                    const barPct = cat.limit > 0 ? Math.min((cat.spent / cat.limit) * 100, 100) : pct;
                    const over = cat.limit > 0 && cat.spent > cat.limit;
                    return (
                      <div key={cat.id} style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13 }}>{cat.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.name}</span>
                            {over && <span style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--danger)", fontWeight: 700, textTransform: "uppercase" }}>Over</span>}
                          </div>
                          <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                            {cat.limit > 0 && <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{fmtMoney(cat.limit, currency)}</span>}
                            <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: over ? "var(--danger)" : "var(--ink)" }}>{fmtMoney(cat.spent, currency)}</span>
                          </div>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ "--w": `${barPct}%`, background: over ? "var(--danger)" : "var(--ink)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <hr className="rule" />

              {/* Recent */}
              <div className="fade-up fade-up-4" style={{ marginTop: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div className="section-label">Recent Entries</div>
                  {monthExp.length > 5 && (
                    <button onClick={() => setView("timeline")} style={{ background: "none", border: "none", fontSize: 11, color: "var(--ink-mid)", cursor: "pointer", letterSpacing: "0.05em", textDecoration: "underline", textUnderlineOffset: 3 }}>
                      View all
                    </button>
                  )}
                </div>
                {monthExp.length === 0
                  ? <EmptyState text="No entries this month" />
                  : monthExp.slice(0, 6).map(exp => <TxRow key={exp.id} exp={exp} categories={categories} currency={currency} onDelete={deleteExpense} />)
                }
              </div>
            </div>
          )}

          {/* ── TIMELINE ─────────────────────────────────────── */}
          {view === "timeline" && (
            <div>
              <div className="fade-up fade-up-1" style={{ marginBottom: 28 }}>
                <div className="search-wrap">
                  <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>↗</span>
                  <input placeholder="Search entries…" value={search} onChange={e => setSearch(e.target.value)} />
                  {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                  <button className={`filter-pill ${!filterCat?"active":""}`} onClick={() => setFilterCat(null)}>All</button>
                  {catData.filter(c=>c.spent>0).map(cat => (
                    <button key={cat.id} className={`filter-pill ${filterCat===cat.id?"active":""}`} onClick={() => setFilterCat(filterCat===cat.id?null:cat.id)}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {filteredExp.length === 0
                ? <EmptyState text={search || filterCat ? "No matching entries" : "No entries this month"} />
                : (
                  <>
                    <MiniBarChart expenses={filteredExp} currency={currency} />
                    {Object.entries(
                      filteredExp.reduce((acc, e) => { (acc[e.date]=acc[e.date]||[]).push(e); return acc; }, {})
                    ).sort((a,b) => b[0].localeCompare(a[0])).map(([date, exps], gi) => (
                      <div key={date} className="fade-up" style={{ animationDelay:`${gi*0.04}s`, marginBottom: 28 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 10, borderBottom: "1px solid var(--rule)", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "var(--ink-mid)", textTransform: "uppercase" }}>{fmtDate(date)}</span>
                          <span style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{fmtMoney(exps.reduce((s,e)=>s+e.amount,0), currency)}</span>
                        </div>
                        {exps.map(exp => <TxRow key={exp.id} exp={exp} categories={categories} currency={currency} onDelete={deleteExpense} />)}
                      </div>
                    ))}
                  </>
                )
              }
            </div>
          )}

          {/* ── HISTORY ──────────────────────────────────────── */}
          {view === "monthly" && (
            <div>
              {allMonths.filter(m => expenses.some(e => e.date.startsWith(m))).length === 0
                ? <EmptyState text="No data yet" />
                : allMonths.filter(m => expenses.some(e => e.date.startsWith(m))).map((m, i) => {
                  const mExp   = expenses.filter(e => e.date.startsWith(m));
                  const mTotal = mExp.reduce((s,e) => s+e.amount, 0);
                  const mOver  = budgets.overall > 0 && mTotal > budgets.overall;
                  const mPct   = budgets.overall ? Math.min((mTotal/budgets.overall)*100, 100) : 0;
                  const mCats  = categories.map(cat => ({
                    ...cat, spent: mExp.filter(e=>e.categoryId===cat.id).reduce((s,e)=>s+e.amount,0)
                  })).filter(c=>c.spent>0).sort((a,b)=>b.spent-a.spent);

                  return (
                    <div key={m} className="fade-up" style={{ animationDelay:`${i*0.05}s`, paddingBottom: 32, marginBottom: 32, borderBottom: "1px solid var(--rule)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 400 }}>{fmtMonth(m)}</div>
                          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 3 }}>{mExp.length} entries{mCats[0] ? ` · mostly ${mCats[0].name}` : ""}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "var(--serif)", fontSize: 24, color: mOver ? "var(--danger)" : "var(--ink)" }}>{fmtMoney(mTotal, currency)}</div>
                          {mOver && <div style={{ fontSize: 9, color: "var(--danger)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Over budget</div>}
                        </div>
                      </div>
                      {budgets.overall > 0 && (
                        <div className="bar-track" style={{ marginBottom: 16 }}>
                          <div className="bar-fill" style={{ "--w":`${mPct}%`, background: mOver ? "var(--danger)" : "var(--ink)" }} />
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {mCats.map(c => (
                          <div key={c.id} style={{ fontSize: 11, color: "var(--ink-mid)" }}>
                            <span style={{ marginRight: 4 }}>{c.icon}</span>{fmtMoney(c.spent, currency)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* ── ANALYTICS ────────────────────────────────────── */}
          {view === "analytics" && <Analytics expenses={expenses} categories={categories} currency={currency} budgets={budgets} />}
        </main>
      </div>
    </>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function Analytics({ expenses, categories, currency, budgets }) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    months.push(d.toISOString().slice(0,7));
  }
  const monthTotals = months.map(m => ({
    month: m,
    label: new Date(m+"-02").toLocaleDateString("en-US",{month:"short"}),
    total: expenses.filter(e=>e.date.startsWith(m)).reduce((s,e)=>s+e.amount,0)
  }));
  const maxTotal = Math.max(...monthTotals.map(m=>m.total),1);

  const topCats = categories.map(cat => ({
    ...cat,
    total: expenses.filter(e=>e.categoryId===cat.id).reduce((s,e)=>s+e.amount,0),
    count: expenses.filter(e=>e.categoryId===cat.id).length
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
  const grandTotal = topCats.reduce((s,c)=>s+c.total,0);

  const dowTotals = Array(7).fill(0), dowCounts = Array(7).fill(0);
  expenses.forEach(e => {
    const dow = new Date(e.date+"T00:00:00").getDay();
    dowTotals[dow]+=e.amount; dowCounts[dow]++;
  });
  const dowAvg = dowTotals.map((t,i)=>({ day:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i], avg: dowCounts[i]?t/dowCounts[i]:0 }));
  const maxDow = Math.max(...dowAvg.map(d=>d.avg),1);

  return (
    <div>
      {/* 6-month trend */}
      <div className="fade-up fade-up-1" style={{ marginBottom: 48 }}>
        <div className="section-label" style={{ marginBottom: 24 }}>Six-Month Trend</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {monthTotals.map((m,i) => (
            <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div className="bar-col" style={{
                width: "100%",
                height: `${(m.total/maxTotal)*68}px`,
                minHeight: m.total>0?2:0,
                background: i===monthTotals.length-1 ? "var(--ink)" : "var(--rule)",
                borderRadius: 0,
                opacity: 0.9
              }} />
              <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="rule" />

      {/* All-time categories */}
      <div className="fade-up fade-up-2" style={{ margin: "32px 0 48px" }}>
        <div className="section-label" style={{ marginBottom: 24 }}>All-Time by Category</div>
        {topCats.map(cat => {
          const pct = grandTotal>0?(cat.total/grandTotal)*100:0;
          return (
            <div key={cat.id} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{cat.icon} {cat.name} <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 400 }}>({cat.count})</span></div>
                <div style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(cat.total, currency)} <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{pct.toFixed(0)}%</span></div>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ "--w":`${pct}%`, background: "var(--ink)" }} />
              </div>
            </div>
          );
        })}
      </div>

      <hr className="rule" />

      {/* Day of week */}
      <div className="fade-up fade-up-3" style={{ margin: "32px 0 48px" }}>
        <div className="section-label" style={{ marginBottom: 24 }}>Avg. Spend by Weekday</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72 }}>
          {dowAvg.map((d,i) => (
            <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div className="bar-col" style={{
                width: "100%",
                height: `${(d.avg/maxDow)*60}px`,
                minHeight: d.avg>0?2:0,
                background: (i===0||i===6)?"var(--accent)":"var(--ink)",
                opacity: 0.75
              }} />
              <div style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.05em" }}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="rule" />

      {/* Insights */}
      <div className="fade-up fade-up-4" style={{ marginTop: 32 }}>
        <div className="section-label" style={{ marginBottom: 20 }}>Observations</div>
        {(() => {
          const insights = [];
          const cur = todayStr().slice(0,7);
          const thisTotal = expenses.filter(e=>e.date.startsWith(cur)).reduce((s,e)=>s+e.amount,0);
          const prev = (() => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
          const lastTotal = expenses.filter(e=>e.date.startsWith(prev)).reduce((s,e)=>s+e.amount,0);
          const change = lastTotal>0?((thisTotal-lastTotal)/lastTotal)*100:0;
          if (lastTotal>0) insights.push({ text:`${Math.abs(change).toFixed(0)}% ${change>0?"more":"less"} spent vs. last month (${fmtMoney(lastTotal,currency)})`, up: change>0 });
          if (topCats[0]) insights.push({ text:`${topCats[0].name} is your largest category all-time`, up: null });
          const recCount = expenses.filter(e=>e.recurring).length;
          if (recCount>0) insights.push({ text:`${recCount} recurring ${recCount===1?"entry":"entries"} tracked`, up: null });
          return insights.length>0
            ? insights.map((ins,i) => (
              <div key={i} style={{ padding: "14px 0", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--ink-mid)", lineHeight: 1.5 }}>{ins.text}</span>
                {ins.up !== null && <span style={{ fontSize: 13, color: ins.up?"var(--danger)":"var(--accent)", fontWeight: 600 }}>{ins.up?"↑":"↓"}</span>}
              </div>
            ))
            : <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>Add more entries to see observations.</div>;
        })()}
      </div>
    </div>
  );
}

// ─── Mini Bar Chart (daily) ───────────────────────────────────────────────────
function MiniBarChart({ expenses, currency }) {
  const [hovered, setHovered] = useState(null);
  const byDay = expenses.reduce((acc,e)=>{ acc[e.date]=(acc[e.date]||0)+e.amount; return acc; },{});
  const days = Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0]));
  if (!days.length) return null;
  const max = Math.max(...days.map(d=>d[1]));
  return (
    <div style={{ marginBottom: 32 }}>
      <div className="section-label" style={{ marginBottom: 16 }}>Daily</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 52, marginBottom: 8 }}>
        {days.map(([d, amt]) => (
          <div key={d} className="bar-col" onMouseEnter={()=>setHovered(d)} onMouseLeave={()=>setHovered(null)}
            style={{ flex:1, height:`${(amt/max)*100}%`, minHeight:2, background: hovered===d?"var(--accent)":"var(--ink)", opacity: hovered&&hovered!==d?0.3:0.8, position:"relative", transition:"opacity 0.1s, background 0.1s" }}>
            {hovered===d && (
              <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:"50%", transform:"translateX(-50%)", background:"var(--ink)", color:"var(--bg)", padding:"4px 8px", fontSize:10, fontWeight:600, whiteSpace:"nowrap", zIndex:10, letterSpacing:"0.05em" }}>
                {fmtDate(d)} · {fmtMoney(amt,currency)}
              </div>
            )}
          </div>
        ))}
      </div>
      <hr className="rule" />
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ exp, categories, currency, onDelete }) {
  const [open, setOpen] = useState(false);
  const cat = categories.find(c=>c.id===exp.categoryId)||{};
  return (
    <div className="tx-row" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0" }} onClick={() => setOpen(o=>!o)}>
        <span style={{ fontSize:16, width:20, flexShrink:0, textAlign:"center" }}>{cat.icon||"·"}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
            {cat.name||"Unknown"}
            {exp.recurring && <span style={{ fontSize:9, letterSpacing:"0.1em", color:"var(--accent)", fontWeight:700, textTransform:"uppercase" }}>↻ Recurring</span>}
          </div>
          {exp.note && <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{exp.note}</div>}
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:14, fontWeight:500, fontVariantNumeric:"tabular-nums" }}>{fmtMoney(exp.amount, currency)}</div>
          <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1 }}>{fmtDate(exp.date)}</div>
        </div>
        <span style={{ fontSize:10, color:"var(--ink-faint)", transition:"transform 0.2s", transform:open?"rotate(180deg)":"none", flexShrink:0 }}>▾</span>
      </div>
      {open && (
        <div style={{ padding:"0 0 14px 34px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
          <div style={{ fontSize:12, color:"var(--ink-mid)", lineHeight:1.6, flex:1 }}>
            {exp.note||"No note."}
            {exp.recurring && <div style={{ marginTop:4, fontSize:11, color:"var(--accent)" }}>Repeats every {exp.intervalDays} day{exp.intervalDays!==1?"s":""} · Next: {exp.nextDue}</div>}
            {exp.receiptImg && <img src={exp.receiptImg} alt="receipt" style={{ marginTop:8, width:60, height:60, objectFit:"cover", display:"block" }} />}
          </div>
          <button onClick={()=>onDelete(exp.id)} style={{ background:"none", border:"none", fontSize:11, color:"var(--danger)", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600, fontFamily:"var(--sans)", flexShrink:0, padding:"2px 0" }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ categories, currency, onAdd, onClose }) {
  const [amount, setAmount]     = useState("");
  const [catId, setCatId]       = useState(categories[0]?.id||"");
  const [date, setDate]         = useState(todayStr());
  const [note, setNote]         = useState("");
  const [recur, setRecur]       = useState(false);
  const [interval, setInterval] = useState(30);
  const [img, setImg]           = useState(null);

  const handleImg = (e) => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = ev => setImg(ev.target.result); r.readAsDataURL(f);
  };

  const submit = () => {
    const n = parseFloat(amount);
    if(!n||n<=0) return;
    onAdd({ id:Date.now()+Math.random(), amount:n, categoryId:catId, date, note:note.trim(), recurring:recur, intervalDays:recur?Number(interval):null, nextDue:recur?addDays(date,Number(interval)):null, receiptImg:img });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal-shell">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:32 }}>
          <div style={{ fontFamily:"var(--serif)", fontSize:22, fontWeight:400 }}>New Entry</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--ink-faint)", lineHeight:1 }}>×</button>
        </div>

        <div style={{ marginBottom:28 }}>
          <FLabel>Amount</FLabel>
          <div style={{ display:"flex", alignItems:"baseline", gap:4, borderBottom:"1px solid var(--rule)", paddingBottom:6 }}>
            <span style={{ fontFamily:"var(--serif)", fontSize:28, color:"var(--ink-mid)" }}>{currency}</span>
            <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus
              style={{ fontFamily:"var(--serif)", fontSize:36, fontWeight:400, border:"none", padding:0, letterSpacing:"-0.02em" }} />
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginBottom:24 }}>
          <div>
            <FLabel>Category</FLabel>
            <select value={catId} onChange={e=>setCatId(e.target.value)}>
              {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <FLabel>Date</FLabel>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <FLabel>Note</FLabel>
          <input placeholder="Optional note…" value={note} onChange={e=>setNote(e.target.value)} />
        </div>

        <div style={{ marginBottom:24 }}>
          <FLabel>Receipt Photo</FLabel>
          <input type="file" accept="image/*" onChange={handleImg} style={{ fontSize:12, color:"var(--ink-faint)" }} />
          {img && <img src={img} alt="preview" style={{ marginTop:10, width:64, height:64, objectFit:"cover" }} />}
        </div>

        <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:recur?24:32 }}>
          <input type="checkbox" checked={recur} onChange={e=>setRecur(e.target.checked)} style={{ accentColor:"var(--ink)", width:"auto", padding:0, border:"none" }} />
          <span style={{ fontSize:13, color:"var(--ink-mid)" }}>Recurring expense</span>
        </label>

        {recur && (
          <div style={{ marginBottom:32 }}>
            <FLabel>Repeat every (days)</FLabel>
            <input type="number" min={1} value={interval} onChange={e=>setInterval(e.target.value)} />
          </div>
        )}

        <button className="btn-primary" onClick={submit} style={{ width:"100%", padding:"14px 0", fontSize:11 }}>
          Record Entry
        </button>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ state, onUpdate, onClose, onExportCSV, onExportJSON, showToast }) {
  const { categories, budgets, currency } = state;
  const [cur, setCur]         = useState(currency);
  const [overall, setOverall] = useState(budgets.overall||"");
  const [perCat, setPerCat]   = useState({...budgets.perCategory});
  const [newCat, setNewCat]   = useState("");
  const [tab, setTab]         = useState("general");

  const save = () => {
    onUpdate({ currency:cur, budgets:{ overall:Number(overall)||0, perCategory:Object.fromEntries(Object.entries(perCat).map(([k,v])=>[k,Number(v)||0])) } });
    showToast("Settings saved");
    onClose();
  };

  const addCat = () => {
    if(!newCat.trim()) return;
    const id = newCat.toLowerCase().replace(/\s+/g,"_")+"_"+Date.now();
    const icons = ["📦","🎯","⭐","🔑","🌿","🎪","🏠","✈️","📚","🎵"];
    const i = categories.length % icons.length;
    onUpdate({ categories:[...categories, { id, name:newCat.trim(), icon:icons[i], color:"#141414" }] });
    setNewCat(""); showToast("Category added");
  };

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-shell">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:28 }}>
          <div style={{ fontFamily:"var(--serif)", fontSize:22, fontWeight:400 }}>Settings</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--ink-faint)", lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:"flex", gap:0, marginBottom:28, borderBottom:"1px solid var(--rule)" }}>
          {[["general","General"],["budgets","Budgets"],["categories","Categories"],["export","Export"]].map(([k,label])=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              background:"none", border:"none", borderBottom:`1px solid ${tab===k?"var(--ink)":"transparent"}`, marginBottom:-1,
              padding:"8px 16px 10px", fontSize:11, fontWeight:tab===k?600:400, letterSpacing:"0.1em", textTransform:"uppercase",
              cursor:"pointer", color:tab===k?"var(--ink)":"var(--ink-faint)", fontFamily:"var(--sans)", transition:"color 0.15s"
            }}>{label}</button>
          ))}
        </div>

        {tab==="general" && (
          <div>
            <FLabel>Currency Symbol</FLabel>
            <input value={cur} onChange={e=>setCur(e.target.value)} maxLength={3} style={{ fontSize:24, fontFamily:"var(--serif)", marginBottom:20 }} />
          </div>
        )}

        {tab==="budgets" && (
          <div>
            <FLabel>Monthly Budget</FLabel>
            <input type="number" value={overall} onChange={e=>setOverall(e.target.value)} placeholder="0" style={{ marginBottom:28 }} />
            <FLabel>Per-Category</FLabel>
            <div style={{ maxHeight:240, overflowY:"auto" }}>
              {categories.map(cat=>(
                <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid var(--rule)" }}>
                  <span style={{ fontSize:14 }}>{cat.icon}</span>
                  <span style={{ flex:1, fontSize:13 }}>{cat.name}</span>
                  <input type="number" value={perCat[cat.id]||""} onChange={e=>setPerCat(p=>({...p,[cat.id]:e.target.value}))} placeholder="0" style={{ width:80, textAlign:"right" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="categories" && (
          <div>
            <FLabel>New Category</FLabel>
            <div style={{ display:"flex", gap:12, alignItems:"flex-end", marginBottom:24 }}>
              <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Name" onKeyDown={e=>e.key==="Enter"&&addCat()} style={{ flex:1 }} />
              <button onClick={addCat} className="btn-primary" style={{ padding:"8px 16px", whiteSpace:"nowrap" }}>Add</button>
            </div>
            {categories.map(cat=>(
              <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid var(--rule)" }}>
                <span style={{ fontSize:14 }}>{cat.icon}</span>
                <span style={{ fontSize:13 }}>{cat.name}</span>
              </div>
            ))}
          </div>
        )}

        {tab==="export" && (
          <div>
            <div style={{ fontSize:13, color:"var(--ink-mid)", marginBottom:24, lineHeight:1.7 }}>Export your data as CSV or JSON.</div>
            <div style={{ display:"grid", gap:12 }}>
              <button onClick={onExportCSV} className="btn-ghost" style={{ padding:"12px 0", fontSize:12, letterSpacing:"0.1em", textTransform:"uppercase" }}>Export CSV</button>
              <button onClick={onExportJSON} className="btn-ghost" style={{ padding:"12px 0", fontSize:12, letterSpacing:"0.1em", textTransform:"uppercase" }}>Export JSON</button>
            </div>
          </div>
        )}

        <div style={{ marginTop:32, paddingTop:24, borderTop:"1px solid var(--rule)" }}>
          <button className="btn-primary" onClick={save} style={{ width:"100%", padding:"13px 0", fontSize:11 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Modal ──────────────────────────────────────────────────────────────
function SetupModal({ onDone }) {
  const [cur, setCur] = useState("$");
  return (
    <div style={{ position:"fixed", inset:0, background:"var(--bg)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div className="fade-up" style={{ maxWidth:320, width:"100%", textAlign:"center" }}>
        <div style={{ fontFamily:"var(--serif)", fontSize:36, fontWeight:400, marginBottom:12 }}>Welcome.</div>
        <div style={{ fontSize:14, color:"var(--ink-mid)", marginBottom:40, lineHeight:1.7 }}>Choose your currency symbol to begin.</div>
        <input value={cur} onChange={e=>setCur(e.target.value)} maxLength={3} autoFocus
          style={{ textAlign:"center", fontSize:32, fontFamily:"var(--serif)", marginBottom:32, width:60 }} />
        <button className="btn-primary" onClick={()=>cur&&onDone(cur)} style={{ display:"block", width:"100%", padding:"14px 0", fontSize:11 }}>
          Begin →
        </button>
      </div>
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function FLabel({ children }) {
  return (
    <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.2em", color:"var(--ink-faint)", textTransform:"uppercase", marginBottom:10, fontFamily:"var(--sans)" }}>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <div style={{ fontFamily:"var(--serif)", fontSize:18, marginBottom:8, color:"var(--ink-faint)" }}>—</div>
      <div style={{ fontSize:13 }}>{text}</div>
    </div>
  );
}
