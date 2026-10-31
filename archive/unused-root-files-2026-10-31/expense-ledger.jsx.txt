import { useState, useEffect, useRef, useCallback } from "react";

// ─── Storage (persistent) ─────────────────────────────────────────────────────
const STORAGE_KEY = "expense_ledger_v3";

const DEFAULT_CATEGORIES = [
  { id: "food",          name: "Food & Dining",   icon: "🍽️",  color: "#FF6B6B" },
  { id: "transport",     name: "Transport",        icon: "🚗",  color: "#4ECDC4" },
  { id: "entertainment", name: "Entertainment",    icon: "🎬",  color: "#FFE66D" },
  { id: "health",        name: "Health",           icon: "💊",  color: "#95E1D3" },
  { id: "shopping",      name: "Shopping",         icon: "🛍️",  color: "#F38181" },
  { id: "subscriptions", name: "Subscriptions",    icon: "📱",  color: "#A8D8EA" },
  { id: "savings",       name: "Savings",          icon: "💰",  color: "#AA96DA" },
];

const SEED_EXPENSES = (() => {
  const today = new Date();
  const d = (offset, catId, amount, note) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - offset);
    return { id: Math.random(), amount, categoryId: catId, date: dt.toISOString().slice(0, 10), note, recurring: false, intervalDays: null, nextDue: null, receiptImg: null };
  };
  return [
    d(0, "food", 34.50, "Dinner at Noma"),
    d(1, "transport", 12.80, "Uber to office"),
    d(1, "food", 8.20, "Morning coffee"),
    d(2, "shopping", 89.00, "New headphones"),
    d(3, "health", 45.00, "Gym membership"),
    d(3, "entertainment", 14.99, "Netflix"),
    d(5, "food", 62.40, "Grocery run"),
    d(6, "subscriptions", 9.99, "Spotify"),
    d(7, "transport", 28.00, "Train to downtown"),
    d(8, "food", 22.50, "Lunch with team"),
    d(10, "shopping", 156.00, "Winter jacket"),
    d(12, "entertainment", 24.00, "Cinema tickets"),
    d(14, "food", 48.75, "Date night"),
    d(15, "health", 85.00, "Dentist"),
    d(16, "subscriptions", 12.99, "iCloud"),
    d(18, "transport", 55.00, "Monthly transit pass"),
    d(20, "food", 19.30, "Sushi takeout"),
    d(22, "savings", 200.00, "Emergency fund"),
    d(25, "entertainment", 38.00, "Concert ticket"),
    d(28, "shopping", 42.50, "Running shoes"),
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
const fmtMoney = (n, cur) => `${cur}${Math.abs(n).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0A0A0E;
    --bg-card: #12121A;
    --bg-elevated: #1A1A26;
    --border: #1E1E2E;
    --border-bright: #2E2E48;
    --text: #E8E6F4;
    --text-mid: #7A788A;
    --text-muted: #44424E;
    --purple: #7C6BFF;
    --purple-light: #A78BFA;
    --purple-glow: rgba(124,107,255,0.18);
    --green: #4ADE80;
    --green-bg: rgba(74,222,128,0.1);
    --red: #F87171;
    --red-bg: rgba(248,113,113,0.1);
    --amber: #FBBF24;
  }

  body { background: var(--bg); }

  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 10px; }

  .app {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'Outfit', sans-serif;
  }

  /* Noise texture overlay */
  .app::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 0;
    opacity: 0.4;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes barFill {
    from { width: 0%; } to { width: var(--w); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; } 50% { opacity: 0.5; }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes toastOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to   { opacity: 0; transform: translateY(10px) scale(0.95); }
  }
  @keyframes modalIn {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .fade-up   { animation: fadeUp 0.45s cubic-bezier(.2,.8,.4,1) forwards; }
  .fade-up-1 { animation-delay: 0.04s; opacity: 0; }
  .fade-up-2 { animation-delay: 0.10s; opacity: 0; }
  .fade-up-3 { animation-delay: 0.17s; opacity: 0; }
  .fade-up-4 { animation-delay: 0.24s; opacity: 0; }
  .fade-up-5 { animation-delay: 0.31s; opacity: 0; }

  .nav-item {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 10px 14px 12px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    font-family: 'Outfit', sans-serif;
    position: relative;
    transition: color 0.2s;
    letter-spacing: 0.01em;
  }
  .nav-item:hover { color: var(--text-mid); }
  .nav-item.active { color: var(--purple-light); font-weight: 600; }
  .nav-item.active::after {
    content: '';
    position: absolute;
    bottom: 0; left: 14px; right: 14px;
    height: 2px;
    background: linear-gradient(90deg, var(--purple), var(--purple-light));
    border-radius: 1px;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    transition: border-color 0.2s, transform 0.18s;
  }
  .card:hover { border-color: var(--border-bright); }

  .exp-row {
    transition: background 0.15s;
    cursor: pointer;
  }
  .exp-row:hover { background: var(--bg-elevated) !important; }

  .btn-primary {
    background: linear-gradient(135deg, var(--purple), var(--purple-light));
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'Outfit', sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 4px 20px rgba(124,107,255,0.3);
  }
  .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 28px rgba(124,107,255,0.4); }
  .btn-primary:active { transform: translateY(0); opacity: 1; }

  .btn-ghost {
    background: var(--bg-elevated);
    border: 1px solid var(--border-bright);
    color: var(--text-mid);
    border-radius: 8px;
    font-family: 'Outfit', sans-serif;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .btn-ghost:hover { border-color: var(--purple); color: var(--purple-light); background: var(--purple-glow); }

  input, select, textarea {
    font-family: 'Outfit', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    color: var(--text);
    background: var(--bg-elevated);
    border: 1px solid var(--border-bright);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    width: 100%;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--purple) !important;
    box-shadow: 0 0 0 3px var(--purple-glow);
  }
  input::placeholder { color: var(--text-muted); }
  select option { background: #1A1A26; }

  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(6px);
    z-index: 200;
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  .modal-shell {
    background: var(--bg-card);
    border: 1px solid var(--border-bright);
    border-radius: 20px 20px 0 0;
    width: 100%; max-width: 560px;
    padding: 24px 22px 36px;
    max-height: 92vh; overflow-y: auto;
    animation: modalIn 0.3s cubic-bezier(.2,.8,.4,1);
  }

  .stat-pill {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    transition: border-color 0.2s;
  }
  .stat-pill:hover { border-color: var(--border-bright); }

  .category-chip {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 12px;
    color: var(--text-mid);
  }

  .search-bar {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-bright);
    border-radius: 10px;
    padding: 0 12px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .search-bar:focus-within {
    border-color: var(--purple);
    box-shadow: 0 0 0 3px var(--purple-glow);
  }
  .search-bar input {
    border: none; background: transparent; box-shadow: none;
    padding: 10px 0; font-size: 14px; flex: 1;
  }
  .search-bar input:focus { box-shadow: none !important; border-color: transparent !important; }

  .progress-track {
    height: 5px;
    background: var(--bg);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 4px;
    animation: barFill 0.8s cubic-bezier(.4,0,.2,1) forwards;
  }

  .badge {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 4px;
  }

  .section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .amount-display {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(135deg, #E8E6F4 0%, #A78BFA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Glow ring on hero card */
  .hero-glow {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  /* Thin separator */
  hr.rule { border: none; border-top: 1px solid var(--border); margin: 16px 0; }

  .toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 13px; font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: flex; align-items: center; gap: 8px;
    animation: toastIn 0.3s cubic-bezier(.2,.8,.4,1);
    max-width: 300px;
  }

  .empty-state {
    text-align: center;
    padding: 56px 20px;
    color: var(--text-muted);
  }

  /* Animated donut */
  @keyframes donutReveal {
    from { stroke-dashoffset: var(--full-circ); }
    to   { stroke-dashoffset: var(--offset); }
  }

  /* Month bar chart bar hover */
  .bar-col {
    transition: opacity 0.15s;
    cursor: pointer;
    opacity: 0.75;
  }
  .bar-col:hover { opacity: 1; }

  /* Filter pill buttons */
  .filter-pill {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px; font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--border-bright);
    background: transparent;
    color: var(--text-mid);
    font-family: 'Outfit', sans-serif;
    transition: all 0.15s;
  }
  .filter-pill:hover { border-color: var(--purple); color: var(--purple-light); }
  .filter-pill.active { background: var(--purple-glow); border-color: var(--purple); color: var(--purple-light); }

  /* Expense details expand area */
  .exp-details {
    overflow: hidden;
    transition: max-height 0.3s ease;
  }
`;

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [s, setS]         = useState(() => loadState() || INITIAL_STATE);
  const [view, setView]   = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState(null);

  const { expenses, categories, budgets, currency } = s;

  useEffect(() => { if (!s.setupDone) setModal("setup"); }, []);
  useEffect(() => { persist(s); }, [s]);

  // Recurring expense auto-spawn
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

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const addExpense = (exp) => {
    update({ expenses: [exp, ...expenses] });
    showToast("Transaction added");
    setModal(null);
  };

  const deleteExpense = (id) => {
    update({ expenses: expenses.filter(e => e.id !== id) });
    showToast("Transaction deleted", "error");
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

  // Filtered expenses for ledger
  const filteredExp = monthExp.filter(e => {
    const matchesCat = !filterCat || e.categoryId === filterCat;
    const matchesSearch = !search || (e.note && e.note.toLowerCase().includes(search.toLowerCase())) || (categories.find(c => c.id === e.categoryId)?.name.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const exportCSV = () => {
    const rows = [["Date", "Amount", "Category", "Note", "Recurring", "Interval(days)"]];
    expenses.forEach(e => {
      const cat = categories.find(c => c.id === e.categoryId);
      rows.push([e.date, e.amount, cat?.name || "", e.note || "", e.recurring ? "Yes" : "No", e.intervalDays || ""]);
    });
    dl(rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n"), "expenses.csv", "text/csv");
  };
  const exportJSON = () => dl(JSON.stringify(expenses, null, 2), "expenses.json", "application/json");
  const dl = (content, name, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app" style={{ position: "relative", zIndex: 1 }}>
        {/* Toast */}
        {toast && (
          <div className="toast" style={{
            background: toast.type === "error" ? "rgba(248,113,113,0.12)" : "rgba(124,107,255,0.12)",
            border: `1px solid ${toast.type === "error" ? "rgba(248,113,113,0.4)" : "rgba(124,107,255,0.4)"}`,
            color: toast.type === "error" ? "#F87171" : "#A78BFA",
          }}>
            <span style={{ fontSize: 16 }}>{toast.type === "error" ? "🗑️" : "✓"}</span>
            {toast.msg}
          </div>
        )}

        {/* Modals */}
        {modal === "setup"    && <SetupModal onDone={(cur) => { update({ currency: cur, setupDone: true }); setModal(null); }} />}
        {modal === "add"      && <AddModal categories={categories} currency={currency} onAdd={addExpense} onClose={() => setModal(null)} />}
        {modal === "settings" && <SettingsModal state={s} onUpdate={update} onClose={() => setModal(null)} onExportCSV={exportCSV} onExportJSON={exportJSON} showToast={showToast} />}

        {/* Header */}
        <header style={{ background: "linear-gradient(180deg, #0E0E14 0%, var(--bg) 100%)", borderBottom: "1px solid var(--border)", padding: "0 20px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#7C6BFF,#A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💸</div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--purple)", fontWeight: 700, textTransform: "uppercase" }}>Personal Finance</div>
                  <div style={{ fontSize: 18, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>Expense Ledger</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-ghost" onClick={() => setModal("settings")} style={{ width: 36, height: 36, fontSize: 15 }}>⚙️</button>
                <button className="btn-primary" onClick={() => setModal("add")} style={{ padding: "0 16px", height: 36, fontSize: 13 }}>
                  + Add
                </button>
              </div>
            </div>
            <nav style={{ display: "flex", gap: 2, marginTop: 8 }}>
              {[["dashboard", "Overview"], ["timeline", "Timeline"], ["monthly", "History"], ["analytics", "Analytics"]].map(([k, label]) => (
                <button key={k} className={`nav-item ${view === k ? "active" : ""}`} onClick={() => setView(k)}>{label}</button>
              ))}
            </nav>
          </div>
        </header>

        {/* Month selector bar */}
        <div style={{ borderBottom: "1px solid var(--border)", padding: "10px 20px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
            <select value={month} onChange={e => setMonth(e.target.value)} style={{ width: "auto", padding: "6px 10px", fontSize: 13, cursor: "pointer" }}>
              {allMonths.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{monthExp.length} transaction{monthExp.length !== 1 ? "s" : ""}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: budgetPct > 90 ? "#F87171" : "var(--text-muted)" }}>
              {budgets.overall > 0 && `${Math.round(budgetPct)}% of budget`}
            </span>
          </div>
        </div>

        <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px", position: "relative", zIndex: 1 }}>

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          {view === "dashboard" && (
            <div>
              {/* Hero card */}
              <div className="fade-up fade-up-1 card" style={{ padding: 24, marginBottom: 14, position: "relative", overflow: "hidden", background: "linear-gradient(145deg, #14142A 0%, #0E0E1C 100%)", borderColor: "#252545" }}>
                <div className="hero-glow" style={{ top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(124,107,255,0.2) 0%, transparent 70%)" }} />
                <div className="hero-glow" style={{ bottom: -40, left: -20, width: 140, height: 140, background: "radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, position: "relative" }}>
                  <div>
                    <div className="section-label" style={{ color: "var(--purple)", marginBottom: 6 }}>Total Spent</div>
                    <div className="amount-display" style={{ fontSize: 46 }}>{fmtMoney(totalSpent, currency)}</div>
                  </div>
                  {budgets.overall > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div className="section-label" style={{ marginBottom: 4 }}>Remaining</div>
                      <div style={{ fontSize: 22, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: remaining >= 0 ? "var(--green)" : "var(--red)" }}>
                        {remaining >= 0 ? fmtMoney(remaining, currency) : `-${fmtMoney(Math.abs(remaining), currency)}`}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>of {fmtMoney(budgets.overall, currency)}</div>
                    </div>
                  )}
                </div>
                {budgets.overall > 0 && (
                  <div style={{ position: "relative" }}>
                    <div className="progress-track">
                      <div className="progress-fill" style={{
                        "--w": `${budgetPct}%`,
                        background: budgetPct > 90 ? "linear-gradient(90deg,#F87171,#FCA5A5)" : budgetPct > 70 ? "linear-gradient(90deg,#FBBF24,#FDE68A)" : "linear-gradient(90deg,var(--purple),var(--purple-light))"
                      }} />
                    </div>
                    {budgetPct > 90 && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "var(--red)" }}>⚠ {Math.round(budgetPct)}% budget consumed</div>
                    )}
                  </div>
                )}
              </div>

              {/* Stat pills */}
              <div className="fade-up fade-up-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Transactions", value: monthExp.length, icon: "📋", color: "var(--purple)" },
                  { label: "Daily Avg", value: fmtMoney(monthExp.length ? totalSpent / new Set(monthExp.map(e => e.date)).size : 0, currency), icon: "📅", color: "var(--amber)" },
                  { label: "Categories", value: catData.filter(c => c.spent > 0).length, icon: "🏷️", color: "var(--green)" },
                ].map((stat, i) => (
                  <div key={i} className="stat-pill">
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              {catData.length > 0 && (
                <div className="fade-up fade-up-3 card" style={{ padding: 20, marginBottom: 16 }}>
                  <div className="section-label" style={{ marginBottom: 16 }}>By Category</div>
                  <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
                    <DonutChart data={catData} total={totalSpent} currency={currency} />
                    <div style={{ flex: 1, minWidth: 180 }}>
                      {catData.map(cat => {
                        const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                        const over = cat.limit > 0 && cat.spent > cat.limit;
                        const barPct = cat.limit > 0 ? Math.min((cat.spent / cat.limit) * 100, 100) : pct;
                        return (
                          <div key={cat.id} style={{ marginBottom: 11 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 13 }}>{cat.icon}</span>
                                <span style={{ fontSize: 12, fontWeight: 500 }}>{cat.name}</span>
                                {over && <span className="badge" style={{ background: "var(--red-bg)", color: "var(--red)" }}>Over</span>}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: over ? "var(--red)" : "var(--text)" }}>{fmtMoney(cat.spent, currency)}</span>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ "--w": `${barPct}%`, background: over ? "var(--red)" : cat.color, opacity: 0.85 }} />
                            </div>
                            {cat.limit > 0 && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{fmtMoney(cat.spent, currency)} / {fmtMoney(cat.limit, currency)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent transactions */}
              <div className="fade-up fade-up-4">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div className="section-label">Recent Transactions</div>
                  {monthExp.length > 5 && (
                    <button className="filter-pill" onClick={() => setView("timeline")}>View all →</button>
                  )}
                </div>
                {monthExp.length === 0
                  ? <EmptyState text="No transactions this month" />
                  : monthExp.slice(0, 6).map(exp => <ExpRow key={exp.id} exp={exp} categories={categories} currency={currency} onDelete={deleteExpense} />)
                }
              </div>
            </div>
          )}

          {/* ── TIMELINE ─────────────────────────────────────────────── */}
          {view === "timeline" && (
            <div>
              {/* Search + filters */}
              <div className="fade-up fade-up-1" style={{ marginBottom: 16 }}>
                <div className="search-bar" style={{ marginBottom: 12 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>🔍</span>
                  <input placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)} />
                  {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className={`filter-pill ${!filterCat ? "active" : ""}`} onClick={() => setFilterCat(null)}>All</button>
                  {catData.filter(c => c.spent > 0).map(cat => (
                    <button key={cat.id} className={`filter-pill ${filterCat === cat.id ? "active" : ""}`} onClick={() => setFilterCat(filterCat === cat.id ? null : cat.id)}>
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {filteredExp.length === 0
                ? <EmptyState text={search || filterCat ? "No matching transactions" : "No transactions this month"} />
                : (
                  <>
                    <BarChart expenses={filteredExp} currency={currency} />
                    {Object.entries(
                      filteredExp.reduce((acc, e) => { (acc[e.date] = acc[e.date] || []).push(e); return acc; }, {})
                    ).sort((a, b) => b[0].localeCompare(a[0])).map(([date, exps], gi) => (
                      <div key={date} className="fade-up" style={{ animationDelay: `${gi * 0.04}s`, opacity: 0, marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--purple-light)" }}>{fmtDate(date)}</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtMoney(exps.reduce((s, e) => s + e.amount, 0), currency)}</div>
                        </div>
                        {exps.map(exp => <ExpRow key={exp.id} exp={exp} categories={categories} currency={currency} onDelete={deleteExpense} />)}
                      </div>
                    ))}
                  </>
                )
              }
            </div>
          )}

          {/* ── MONTHLY HISTORY ──────────────────────────────────────── */}
          {view === "monthly" && (
            <div>
              {allMonths.filter(m => expenses.some(e => e.date.startsWith(m))).length === 0
                ? <EmptyState text="No data yet — start adding expenses!" />
                : allMonths.filter(m => expenses.some(e => e.date.startsWith(m))).map((m, i) => {
                  const mExp   = expenses.filter(e => e.date.startsWith(m));
                  const mTotal = mExp.reduce((s, e) => s + e.amount, 0);
                  const mBudget = budgets.overall;
                  const mOver  = mBudget > 0 && mTotal > mBudget;
                  const mPct   = mBudget ? Math.min((mTotal / mBudget) * 100, 100) : 0;
                  const mCats  = categories.map(cat => ({
                    ...cat,
                    spent: mExp.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0)
                  })).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent);

                  return (
                    <div key={m} className="fade-up card" style={{ animationDelay: `${i * 0.06}s`, opacity: 0, padding: 20, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 17, fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>{fmtMonth(m)}</div>
                          {mCats[0] && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Top: {mCats[0].icon} {mCats[0].name}</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: mOver ? "var(--red)" : "var(--text)" }}>{fmtMoney(mTotal, currency)}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{mExp.length} transaction{mExp.length !== 1 ? "s" : ""}</div>
                          {mOver && <span className="badge" style={{ background: "var(--red-bg)", color: "var(--red)", marginTop: 2 }}>Over budget</span>}
                        </div>
                      </div>
                      {/* Stacked category bar */}
                      <div style={{ height: 7, display: "flex", borderRadius: 4, overflow: "hidden", gap: 1, marginBottom: 12 }}>
                        {mCats.map(c => (
                          <div key={c.id} title={`${c.name}: ${fmtMoney(c.spent, currency)}`} style={{ flex: c.spent, background: c.color, opacity: 0.85, minWidth: 2 }} />
                        ))}
                      </div>
                      {/* Budget bar */}
                      {mBudget > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ "--w": `${mPct}%`, background: mOver ? "var(--red)" : "linear-gradient(90deg,var(--purple),var(--purple-light))" }} />
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{Math.round(mPct)}% of {fmtMoney(mBudget, currency)} budget</div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {mCats.map(c => (
                          <div key={c.id} className="category-chip">
                            <span style={{ fontSize: 11 }}>{c.icon}</span>
                            <span>{fmtMoney(c.spent, currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* ── ANALYTICS ────────────────────────────────────────────── */}
          {view === "analytics" && (
            <Analytics expenses={expenses} categories={categories} currency={currency} budgets={budgets} />
          )}
        </main>
      </div>
    </>
  );
}

// ─── Analytics View ───────────────────────────────────────────────────────────
function Analytics({ expenses, categories, currency, budgets }) {
  // Last 6 months trend
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  const monthTotals = months.map(m => ({
    month: m,
    label: new Date(m + "-02").toLocaleDateString("en-US", { month: "short" }),
    total: expenses.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0)
  }));
  const maxTotal = Math.max(...monthTotals.map(m => m.total), 1);

  // Top categories all-time
  const topCats = categories.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
    count: expenses.filter(e => e.categoryId === cat.id).length
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const grandTotal = topCats.reduce((s, c) => s + c.total, 0);

  // Avg per day of week
  const dowTotals = Array(7).fill(0);
  const dowCounts = Array(7).fill(0);
  expenses.forEach(e => {
    const dow = new Date(e.date + "T00:00:00").getDay();
    dowTotals[dow] += e.amount;
    dowCounts[dow]++;
  });
  const dowAvg = dowTotals.map((t, i) => ({ day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i], avg: dowCounts[i] ? t / dowCounts[i] : 0 }));
  const maxDowAvg = Math.max(...dowAvg.map(d => d.avg), 1);

  return (
    <div>
      {/* Spending trend */}
      <div className="fade-up fade-up-1 card" style={{ padding: 20, marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>6-Month Trend</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {monthTotals.map((m, i) => (
            <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{m.total > 0 ? `${currency}${Math.round(m.total)}` : ""}</div>
              <div
                className="bar-col"
                style={{
                  width: "100%",
                  height: `${(m.total / maxTotal) * 80}px`,
                  minHeight: m.total > 0 ? 4 : 0,
                  borderRadius: "4px 4px 0 0",
                  background: i === monthTotals.length - 1
                    ? "linear-gradient(180deg,var(--purple),var(--purple-light))"
                    : "linear-gradient(180deg,#2E2E48,#1E1E2E)",
                }}
              />
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* All-time category totals */}
      <div className="fade-up fade-up-2 card" style={{ padding: 20, marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>All-Time by Category</div>
        {topCats.map(cat => {
          const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
          return (
            <div key={cat.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{cat.count} tx</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtMoney(cat.total, currency)}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ "--w": `${pct}%`, background: cat.color, opacity: 0.75 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Day of week pattern */}
      <div className="fade-up fade-up-3 card" style={{ padding: 20, marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Avg Spend by Day of Week</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
          {dowAvg.map((d, i) => (
            <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                className="bar-col"
                style={{
                  width: "100%",
                  height: `${(d.avg / maxDowAvg) * 72}px`,
                  minHeight: d.avg > 0 ? 4 : 0,
                  borderRadius: "4px 4px 0 0",
                  background: (i === 0 || i === 6)
                    ? "linear-gradient(180deg,#FBBF24,#F59E0B)"
                    : "linear-gradient(180deg,var(--purple),var(--purple-light))",
                  opacity: 0.8
                }}
              />
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="fade-up fade-up-4 card" style={{ padding: 20 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Insights</div>
        {(() => {
          const insights = [];
          const currentMonth = todayStr().slice(0, 7);
          const thisMonthExp = expenses.filter(e => e.date.startsWith(currentMonth));
          const thisMonthTotal = thisMonthExp.reduce((s, e) => s + e.amount, 0);
          const prevMonth = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
          const lastMonthTotal = expenses.filter(e => e.date.startsWith(prevMonth)).reduce((s, e) => s + e.amount, 0);
          const change = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

          if (lastMonthTotal > 0) {
            insights.push({
              icon: change > 0 ? "📈" : "📉",
              text: `${Math.abs(change).toFixed(0)}% ${change > 0 ? "more" : "less"} than last month (${fmtMoney(lastMonthTotal, currency)})`,
              color: change > 0 ? "var(--red)" : "var(--green)"
            });
          }
          if (topCats[0]) insights.push({ icon: "🏆", text: `Biggest spending category all-time: ${topCats[0].icon} ${topCats[0].name}`, color: "var(--amber)" });
          const recurringTotal = expenses.filter(e => e.recurring).reduce((s, e) => s + e.amount, 0);
          if (recurringTotal > 0) insights.push({ icon: "🔄", text: `${expenses.filter(e => e.recurring).length} recurring expenses tracked`, color: "var(--purple-light)" });

          return insights.length > 0 ? insights.map((ins, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, padding: "12px 14px", background: "var(--bg-elevated)", borderRadius: 10 }}>
              <span style={{ fontSize: 18 }}>{ins.icon}</span>
              <span style={{ fontSize: 13, color: ins.color, lineHeight: 1.5 }}>{ins.text}</span>
            </div>
          )) : <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Add more transactions to see personalized insights.</div>;
        })()}
      </div>
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, total, currency }) {
  const size = 120, stroke = 18, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = data.filter(d => d.spent > 0).map(d => {
    const pct = d.spent / total;
    const seg = { ...d, dashArray: `${pct * circ} ${circ}`, dashOffset: -offset * circ };
    offset += pct;
    return seg;
  });
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E1E2E" strokeWidth={stroke} />
        {segs.map((seg, i) => (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke - 2}
            strokeDasharray={seg.dashArray} strokeDashoffset={seg.dashOffset} strokeLinecap="round"
          />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.15em" }}>TOTAL</div>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Syne',sans-serif" }}>{currency}{Math.round(total)}</div>
      </div>
    </div>
  );
}

// ─── Bar Chart (daily) ────────────────────────────────────────────────────────
function BarChart({ expenses, currency }) {
  const [hoveredDay, setHoveredDay] = useState(null);
  const byDay = expenses.reduce((acc, e) => { acc[e.date] = (acc[e.date] || 0) + e.amount; return acc; }, {});
  const days  = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
  if (!days.length) return null;
  const max = Math.max(...days.map(d => d[1]));
  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <div className="section-label" style={{ marginBottom: 14 }}>Daily Spending</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 72 }}>
        {days.map(([d, amt]) => (
          <div
            key={d}
            className="bar-col"
            title={`${fmtDate(d)}: ${fmtMoney(amt, currency)}`}
            style={{
              flex: 1,
              borderRadius: "3px 3px 0 0",
              background: hoveredDay === d ? "linear-gradient(180deg,#C9B8FF,#7C6BFF)" : "linear-gradient(180deg,var(--purple),#5A4EBF)",
              height: `${(amt / max) * 100}%`,
              minHeight: 4,
              position: "relative"
            }}
            onMouseEnter={() => setHoveredDay(d)}
            onMouseLeave={() => setHoveredDay(null)}
          >
            {hoveredDay === d && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1A1A26", border: "1px solid var(--border-bright)", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", zIndex: 10 }}>
                {fmtDate(d)}: {fmtMoney(amt, currency)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmtDate(days[0][0])}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmtDate(days[days.length - 1][0])}</span>
      </div>
    </div>
  );
}

// ─── Expense Row ──────────────────────────────────────────────────────────────
function ExpRow({ exp, categories, currency, onDelete }) {
  const [open, setOpen] = useState(false);
  const cat = categories.find(c => c.id === exp.categoryId) || {};
  return (
    <div className="exp-row card" style={{ marginBottom: 6, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: (cat.color || "#7C6BFF") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {cat.icon || "💸"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            {cat.name || "Unknown"}
            {exp.recurring && <span className="badge" style={{ background: "var(--purple-glow)", color: "var(--purple-light)" }}>↻ {exp.intervalDays}d</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fmtDate(exp.date)}{exp.note ? ` · ${exp.note.slice(0, 28)}${exp.note.length > 28 ? "…" : ""}` : ""}
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Syne',sans-serif", flexShrink: 0 }}>{fmtMoney(exp.amount, currency)}</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}>▾</div>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px 14px", borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", gap: 12, alignItems: "flex-start", background: "var(--bg-elevated)" }}>
          {exp.receiptImg && <img src={exp.receiptImg} alt="receipt" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border-bright)", flexShrink: 0 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.6 }}>{exp.note || "No note attached."}</div>
            {exp.recurring && <div style={{ fontSize: 12, color: "var(--purple-light)", marginTop: 6 }}>↻ Recurring every {exp.intervalDays} day{exp.intervalDays !== 1 ? "s" : ""} · Next: {exp.nextDue}</div>}
          </div>
          <button onClick={() => onDelete(exp.id)} style={{ background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Outfit',sans-serif", flexShrink: 0 }}>Delete</button>
        </div>
      )}
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ categories, currency, onAdd, onClose }) {
  const [amount, setAmount]     = useState("");
  const [catId, setCatId]       = useState(categories[0]?.id || "");
  const [date, setDate]         = useState(todayStr());
  const [note, setNote]         = useState("");
  const [recur, setRecur]       = useState(false);
  const [interval, setInterval] = useState(30);
  const [img, setImg]           = useState(null);

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => setImg(ev.target.result);
    r.readAsDataURL(f);
  };

  const submit = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    onAdd({
      id: Date.now() + Math.random(),
      amount: n,
      categoryId: catId,
      date,
      note: note.trim(),
      recurring: recur,
      intervalDays: recur ? Number(interval) : null,
      nextDue: recur ? addDays(date, Number(interval)) : null,
      receiptImg: img
    });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 20, fontFamily: "'Syne',sans-serif", fontWeight: 800 }}>Add Transaction</div>
          <button onClick={onClose} className="btn-ghost" style={{ width: 32, height: 32, fontSize: 16 }}>×</button>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 14 }}>
          <FLabel>Amount</FLabel>
          <div style={{ display: "flex", alignItems: "center", background: "var(--bg-elevated)", border: "1px solid var(--border-bright)", borderRadius: 10, transition: "border-color 0.2s, box-shadow 0.2s" }}>
            <span style={{ padding: "0 14px", color: "var(--purple)", fontWeight: 700, fontSize: 18 }}>{currency}</span>
            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus
              style={{ background: "transparent", border: "none", boxShadow: "none", flex: 1, fontSize: 22, fontWeight: 700, padding: "12px 12px 12px 0" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <FLabel>Category</FLabel>
            <select value={catId} onChange={e => setCatId(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <FLabel>Date</FLabel>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <FLabel>Note</FLabel>
          <input placeholder="Optional note…" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <FLabel>Receipt Photo</FLabel>
          <input type="file" accept="image/*" onChange={handleImg} style={{ fontSize: 12, padding: "8px 0", background: "transparent", border: "none", boxShadow: "none", color: "var(--text-muted)" }} />
          {img && <img src={img} alt="preview" style={{ marginTop: 8, width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border-bright)" }} />}
        </div>

        <div style={{ marginBottom: recur ? 14 : 22 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, padding: "10px 0" }}>
            <input type="checkbox" checked={recur} onChange={e => setRecur(e.target.checked)} style={{ accentColor: "var(--purple)", width: 16, height: 16, border: "none", background: "transparent", boxShadow: "none", width: "auto", padding: 0 }} />
            <span style={{ color: "var(--text-mid)" }}>Recurring expense</span>
          </label>
        </div>

        {recur && (
          <div style={{ marginBottom: 22 }}>
            <FLabel>Repeat every (days)</FLabel>
            <input type="number" min={1} value={interval} onChange={e => setInterval(e.target.value)} />
          </div>
        )}

        <button className="btn-primary" onClick={submit} style={{ width: "100%", padding: 14, fontSize: 15 }}>
          Add Transaction
        </button>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ state, onUpdate, onClose, onExportCSV, onExportJSON, showToast }) {
  const { categories, budgets, currency } = state;
  const [cur, setCur]         = useState(currency);
  const [overall, setOverall] = useState(budgets.overall || "");
  const [perCat, setPerCat]   = useState({ ...budgets.perCategory });
  const [newCat, setNewCat]   = useState("");
  const [tab, setTab]         = useState("general");

  const save = () => {
    onUpdate({ currency: cur, budgets: { overall: Number(overall) || 0, perCategory: Object.fromEntries(Object.entries(perCat).map(([k, v]) => [k, Number(v) || 0])) } });
    showToast("Settings saved");
    onClose();
  };

  const addCat = () => {
    if (!newCat.trim()) return;
    const id = newCat.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const icons  = ["📦", "🎯", "⭐", "🔑", "🌿", "🎪", "🏠", "✈️", "📚", "🎵"];
    const colors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#A8D8EA", "#AA96DA"];
    const i = categories.length % icons.length;
    onUpdate({ categories: [...categories, { id, name: newCat.trim(), icon: icons[i], color: colors[i % colors.length] }] });
    setNewCat("");
    showToast("Category added");
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontFamily: "'Syne',sans-serif", fontWeight: 800 }}>Settings</div>
          <button onClick={onClose} className="btn-ghost" style={{ width: 32, height: 32, fontSize: 16 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 22, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {[["general", "General"], ["budgets", "Budgets"], ["categories", "Categories"], ["export", "Export"]].map(([k, label]) => (
            <button key={k} className={`nav-item ${tab === k ? "active" : ""}`} onClick={() => setTab(k)} style={{ padding: "8px 12px 10px", fontSize: 12 }}>{label}</button>
          ))}
        </div>

        {tab === "general" && (
          <div>
            <FLabel>Currency Symbol</FLabel>
            <input value={cur} onChange={e => setCur(e.target.value)} maxLength={3} style={{ textAlign: "center", fontWeight: 700, fontSize: 18, marginBottom: 16 }} />
          </div>
        )}

        {tab === "budgets" && (
          <div>
            <FLabel>Monthly Budget</FLabel>
            <input type="number" value={overall} onChange={e => setOverall(e.target.value)} placeholder="0" style={{ marginBottom: 16 }} />
            <FLabel>Per-Category Budgets</FLabel>
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: 12, marginBottom: 16, maxHeight: 240, overflowY: "auto" }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{cat.icon}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{cat.name}</span>
                  <input type="number" value={perCat[cat.id] || ""} onChange={e => setPerCat(p => ({ ...p, [cat.id]: e.target.value }))} placeholder="0" style={{ width: 80, textAlign: "right", padding: "6px 10px" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "categories" && (
          <div>
            <FLabel>Add Category</FLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Category name" onKeyDown={e => e.key === "Enter" && addCat()} />
              <button onClick={addCat} className="btn-ghost" style={{ padding: "0 16px", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600 }}>Add</button>
            </div>
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: 12 }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{cat.name}</span>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "export" && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.7 }}>Export all your transactions to CSV or JSON for use in spreadsheets or other tools.</div>
            <div style={{ display: "grid", gap: 10 }}>
              <button onClick={onExportCSV} className="btn-ghost" style={{ padding: 14, fontSize: 14, fontWeight: 600 }}>📊 Export CSV</button>
              <button onClick={onExportJSON} className="btn-ghost" style={{ padding: 14, fontSize: 14, fontWeight: 600 }}>📋 Export JSON</button>
            </div>
          </div>
        )}

        <hr className="rule" />
        <button className="btn-primary" onClick={save} style={{ width: "100%", padding: 13, fontSize: 14 }}>Save Settings</button>
      </div>
    </div>
  );
}

// ─── Setup Modal ──────────────────────────────────────────────────────────────
function SetupModal({ onDone }) {
  const [cur, setCur] = useState("$");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)" }}>
      <div className="fade-up card" style={{ padding: 40, maxWidth: 340, width: "90%", textAlign: "center", borderColor: "var(--border-bright)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💸</div>
        <div style={{ fontSize: 26, fontFamily: "'Syne',sans-serif", fontWeight: 800, marginBottom: 6 }}>Welcome!</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>Choose your preferred currency symbol to get started.</div>
        <input value={cur} onChange={e => setCur(e.target.value)} maxLength={3} autoFocus
          style={{ textAlign: "center", fontSize: 28, fontWeight: 700, width: 80, marginBottom: 22, borderRadius: 10, padding: "10px 0" }} />
        <button className="btn-primary" onClick={() => cur && onDone(cur)} style={{ display: "block", width: "100%", padding: 14, fontSize: 15 }}>
          Get Started →
        </button>
      </div>
    </div>
  );
}

// ─── Shared Atoms ─────────────────────────────────────────────────────────────
function FLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 7, fontFamily: "'Outfit',sans-serif" }}>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{text}</div>
    </div>
  );
}
