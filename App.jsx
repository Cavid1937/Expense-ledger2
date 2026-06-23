import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "expense_ledger_v4";

const DEFAULT_CATEGORIES = [
  { id: "food",          name: "Food & Dining",   icon: "🍽️",  color: "#141414" },
  { id: "transport",     name: "Transport",        icon: "🚗",  color: "#141414" },
  { id: "entertainment", name: "Entertainment",    icon: "🎬",  color: "#141414" },
  { id: "health",        name: "Health",           icon: "💊",  color: "#141414" },
  { id: "shopping",      name: "Shopping",         icon: "🛍️",  color: "#141414" },
  { id: "subscriptions", name: "Subscriptions",    icon: "📱",  color: "#141414" },
  { id: "savings",       name: "Savings",          icon: "💰",  color: "#141414" },
  { id: "personal",      name: "Personal Care",    icon: "🧴",  color: "#141414" },
  { id: "sport",         name: "Sport",            icon: "⚽",  color: "#141414" },
  { id: "education",     name: "Education",        icon: "🎓",  color: "#141414" },
];

const SEED_EXPENSES = (() => {
  const today = new Date();
  const d = (offset, catId, amount, note, type = "expense") => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - offset);
    return {
      id: Math.random(),
      amount,
      categoryId: catId,
      date: dt.toISOString().slice(0, 10),
      note,
      type,
      recurring: false,
      intervalDays: null,
      nextDue: null,
      emoji: null,
    };
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
    d(2,  "food",         1200.00, "Freelance payment", "income"),
    d(15, "food",          800.00, "Monthly salary",    "income"),
  ];
})();

const SEED_GOALS = [
  { id: "g1", title: "Top-500 University Application Fees", emoji: "🎓", targetAmount: 1200, savedAmount: 340, monthlyAllocation: 120, color: "#2D6A4F" },
  { id: "g2", title: "Iberian Peninsula Road Trip Fund",    emoji: "🚗", targetAmount: 4500, savedAmount: 890, monthlyAllocation: 200, color: "#8B2E2E" },
];

const SEED_SUBSCRIPTIONS = [
  { id: "s1", title: "Gym Membership",                      emoji: "🏋️", amount: 35,    billingDay: 5,  category: "health",        active: true },
  { id: "s2", title: "Skincare Restock (Adapalene/Glycolic)",emoji: "🧴", amount: 28,    billingDay: 18, category: "personal",       active: true },
  { id: "s3", title: "Spotify Premium",                     emoji: "🎵", amount: 10.99, billingDay: 22, category: "entertainment",   active: true },
];

const SEED_TEMPLATES = [
  { id: "t1", title: "High-Protein Groceries", emoji: "🥩", amount: 45,   categoryId: "food",    type: "expense" },
  { id: "t2", title: "Mini-Football Pitch Fee", emoji: "⚽", amount: 8,    categoryId: "sport",   type: "expense" },
  { id: "t3", title: "Fragrance Decant",        emoji: "🌿", amount: 22,   categoryId: "personal",type: "expense" },
  { id: "t4", title: "Morning Coffee",          emoji: "☕", amount: 4.5,  categoryId: "food",    type: "expense" },
  { id: "t5", title: "Transport",              emoji: "🚌", amount: 3,    categoryId: "transport",type: "expense" },
];

const INITIAL_STATE = {
  expenses:      SEED_EXPENSES,
  categories:    DEFAULT_CATEGORIES,
  budgets:       { overall: 1200, perCategory: { food: 300, transport: 150, entertainment: 100, health: 150, shopping: 200, subscriptions: 50, savings: 300 } },
  currency:      "$",
  setupDone:     true,
  goals:         SEED_GOALS,
  subscriptions: SEED_SUBSCRIPTIONS,
  templates:     SEED_TEMPLATES,
  notifications: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().slice(0, 10);
const fmtMoney  = (n, cur) => `${cur}${parseFloat(Math.abs(n).toFixed(2)).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate   = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtMonth  = (m) => new Date(m + "-02").toLocaleDateString("en-US", { month: "long", year: "numeric" });
const addDays   = (dateStr, days) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const genId     = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function loadState() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function persist(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getUpcomingSubscriptions(subscriptions) {
  const today = new Date();
  const currentDay = today.getDate();
  return subscriptions
    .filter(s => s.active)
    .map(s => {
      const due = new Date(today.getFullYear(), today.getMonth(), s.billingDay);
      const daysUntil = Math.max(0, Math.ceil((due - today) / 86400000));
      return { ...s, daysUntil };
    })
    .filter(s => s.billingDay >= currentDay)
    .sort((a, b) => a.daysUntil - b.daysUntil);
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
    --positive:   #2D6A4F;
    --serif:      'Playfair Display', Georgia, serif;
    --sans:       'DM Sans', Helvetica Neue, sans-serif;
  }

  html, body { background: var(--bg); }

  ::-webkit-scrollbar { width: 2px; height: 2px; }
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

  @keyframes fadeUp   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn   { from { opacity: 0; } to { opacity: 1; } }
  @keyframes barFill  { from { width: 0%; } to { width: var(--w); } }
  @keyframes shimmer  { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
  @keyframes toastIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes modalIn  { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes screenIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes ringFill {
    from { stroke-dashoffset: var(--ring-full); }
    to   { stroke-dashoffset: var(--ring-offset); }
  }

  .screen-enter { animation: screenIn 200ms ease both; }

  .fade-up   { animation: fadeUp 0.4s cubic-bezier(.2,.8,.4,1) both; }
  .fade-up-1 { animation-delay: 0.03s; }
  .fade-up-2 { animation-delay: 0.08s; }
  .fade-up-3 { animation-delay: 0.14s; }
  .fade-up-4 { animation-delay: 0.20s; }
  .fade-up-5 { animation-delay: 0.26s; }

  /* Skeleton */
  .skeleton {
    background: linear-gradient(90deg, #EDEAE4 25%, #F7F4EE 50%, #EDEAE4 75%);
    background-size: 600px 100%;
    animation: shimmer 1.4s infinite linear;
    border-radius: 2px;
    display: inline-block;
  }

  /* Nav */
  .nav-item {
    background: transparent; border: none;
    color: var(--ink-faint);
    padding: 10px 0 12px; margin-right: 24px;
    cursor: pointer; font-size: 11px; font-weight: 500;
    font-family: var(--sans); letter-spacing: 0.12em;
    text-transform: uppercase; position: relative;
    transition: color 0.2s; white-space: nowrap;
  }
  .nav-item:hover { color: var(--ink-mid); }
  .nav-item.active { color: var(--ink); font-weight: 600; }
  .nav-item.active::after {
    content: ''; position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px; background: var(--ink);
  }

  .rule { border: none; border-top: 1px solid var(--rule); margin: 0; }

  .btn-primary {
    background: var(--ink); color: var(--bg);
    border: none; border-radius: 2px;
    font-family: var(--sans); font-size: 11px;
    font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.85; }

  .btn-ghost {
    background: transparent; border: 1px solid var(--rule);
    color: var(--ink-mid); border-radius: 2px;
    font-family: var(--sans); font-size: 11px;
    letter-spacing: 0.08em; cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-ghost:hover { border-color: var(--ink-mid); color: var(--ink); }

  input, select, textarea {
    font-family: var(--sans); outline: none;
    color: var(--ink); background: transparent;
    border: none; border-bottom: 1px solid var(--rule);
    border-radius: 0; padding: 8px 0; font-size: 14px;
    width: 100%; transition: border-color 0.2s;
    appearance: none; -webkit-appearance: none;
  }
  input:focus, select:focus, textarea:focus {
    border-bottom-color: var(--ink); outline: none; box-shadow: none;
  }
  input::placeholder { color: var(--ink-faint); }
  select { cursor: pointer; background: var(--bg); }
  select option { background: var(--bg); color: var(--ink); }
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }

  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(247,244,238,0.85);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  .modal-shell {
    background: var(--bg); border-top: 1px solid var(--rule);
    width: 100%; max-width: 560px;
    padding: 32px 28px 48px;
    max-height: 92vh; overflow-y: auto;
    animation: modalIn 0.3s cubic-bezier(.2,.8,.4,1);
  }

  .bar-track { height: 3px; background: var(--rule); border-radius: 0; overflow: hidden; }
  .bar-fill  { height: 100%; animation: barFill 0.7s cubic-bezier(.4,0,.2,1) both; }

  .tx-row { cursor: pointer; transition: background 0.1s; }
  .tx-row:hover { background: var(--accent-bg); }

  .filter-pill {
    padding: 4px 12px; border-radius: 0;
    font-size: 10px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    cursor: pointer; border: 1px solid var(--rule);
    background: transparent; color: var(--ink-faint);
    font-family: var(--sans); transition: all 0.15s;
    white-space: nowrap;
  }
  .filter-pill:hover { color: var(--ink); border-color: var(--ink-mid); }
  .filter-pill.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }

  .toast {
    position: fixed; bottom: 28px; right: 24px; z-index: 9999;
    padding: 12px 20px; background: var(--ink); color: var(--bg);
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    animation: toastIn 0.25s cubic-bezier(.2,.8,.4,1);
  }

  .section-label {
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.25em; text-transform: uppercase;
    color: var(--ink-faint);
  }

  .hero-num {
    font-family: var(--serif); font-weight: 400;
    line-height: 1; color: var(--ink);
  }

  .search-wrap {
    display: flex; align-items: center; gap: 8px;
    border-bottom: 1px solid var(--rule); padding-bottom: 2px;
    transition: border-color 0.2s;
  }
  .search-wrap:focus-within { border-bottom-color: var(--ink); }
  .search-wrap input { border: none; padding: 6px 0; font-size: 13px; flex: 1; }
  .search-wrap input:focus { border: none; }

  .empty-state { text-align: center; padding: 64px 20px; color: var(--ink-faint); }

  .bar-col { transition: opacity 0.15s; cursor: pointer; }
  .bar-col:hover { opacity: 1 !important; }

  /* Template chips */
  .tpl-chip {
    display: inline-flex; flex-direction: column; align-items: center;
    gap: 4px; padding: 10px 14px;
    border: 1px solid var(--rule); background: var(--bg);
    cursor: pointer; transition: background 0.15s, transform 0.12s;
    flex-shrink: 0; min-width: 80px; text-align: center;
  }
  .tpl-chip:hover { background: var(--accent-bg); transform: translateY(-1px); }
  .tpl-chip:active { transform: translateY(0); }

  /* Subscription row */
  .sub-row { transition: background 0.12s; }
  .sub-row:hover { background: var(--accent-bg); }

  /* Goal card */
  .goal-card { transition: background 0.12s; }
  .goal-card:hover { background: var(--accent-bg); }

  /* Ring */
  .ring-arc {
    animation: ringFill 900ms cubic-bezier(0.34,1.1,0.64,1) forwards;
    animation-delay: 150ms;
  }

  /* Scroll x hidden */
  .scroll-x { overflow-x: auto; scrollbar-width: none; }
  .scroll-x::-webkit-scrollbar { display: none; }

  /* Notification dot */
  .notif-dot {
    display: inline-block; width: 7px; height: 7px;
    border-radius: 50%; background: var(--danger);
    margin-left: 5px; vertical-align: middle;
  }

  /* Days pill */
  .days-pill {
    display: inline-flex; align-items: center;
    padding: 2px 7px; font-size: 10px; font-weight: 600;
    letter-spacing: 0.05em; font-family: var(--sans);
    white-space: nowrap;
  }

  /* Heatmap cell */
  .heat-cell {
    aspect-ratio: 1; border-radius: 2px;
    display: flex; align-items: center; justify-content: center;
    cursor: default; transition: opacity 0.1s;
    position: relative;
  }
  .heat-cell:hover .heat-tooltip {
    display: block;
  }
  .heat-tooltip {
    display: none;
    position: absolute; bottom: calc(100% + 4px); left: 50%;
    transform: translateX(-50%);
    background: var(--ink); color: var(--bg);
    font-size: 9px; font-family: var(--sans);
    padding: 3px 7px; white-space: nowrap; z-index: 10;
    pointer-events: none;
  }

  /* Type toggle */
  .type-toggle { display: flex; border: 1px solid var(--rule); }
  .type-btn {
    flex: 1; padding: 8px; border: none;
    font-family: var(--sans); font-size: 11px; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    cursor: pointer; transition: background 0.15s, color 0.15s;
  }

  @keyframes donutReveal {
    from { stroke-dashoffset: var(--full); }
    to   { stroke-dashoffset: var(--offset); }
  }
`;

// ─── Skeleton primitives ──────────────────────────────────────────────────────
function Sk({ w = "100%", h = 14, style = {} }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: 2, ...style }} />;
}

// ─── Progress Ring (SVG) ──────────────────────────────────────────────────────
function ProgressRing({ size = 76, stroke = 5, pct = 0, color = "#2D6A4F", label, sub }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E5E5" strokeWidth={stroke} />
        <circle
          className="ring-arc"
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ "--ring-full": circ, "--ring-offset": offset }}
        />
      </svg>
      {(label || sub) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {label && <span style={{ fontFamily: "var(--serif)", fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>{label}</span>}
          {sub   && <span style={{ fontFamily: "var(--sans)",  fontSize: 9,  color: "var(--ink-faint)", marginTop: 2, letterSpacing: "0.04em" }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Setup Modal ──────────────────────────────────────────────────────────────
function SetupModal({ onDone }) {
  const [cur, setCur] = useState("$");
  const [name, setName] = useState("");
  return (
    <div className="modal-backdrop">
      <div className="modal-shell" style={{ maxWidth: 420 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Welcome</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 26, marginBottom: 28 }}>Set up your ledger</div>
        <div style={{ marginBottom: 20 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Your name</div>
          <input placeholder="e.g. Cavid" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 32 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Currency symbol</div>
          <select value={cur} onChange={e => setCur(e.target.value)}>
            {["$","€","£","₼","₺","₸","¥"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn-primary" style={{ width: "100%", padding: 14 }} onClick={() => onDone(cur, name)}>
          Open ledger
        </button>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function AddModal({ categories, currency, onAdd, onClose, templates, addTemplate }) {
  const [type,      setType]      = useState("expense");
  const [amount,    setAmount]    = useState("");
  const [catId,     setCatId]     = useState(categories[0]?.id || "");
  const [note,      setNote]      = useState("");
  const [emoji,     setEmoji]     = useState("");
  const [date,      setDate]      = useState(todayStr());
  const [recurring, setRecurring] = useState(false);
  const [interval,  setInterval]  = useState(30);
  const [dupWarn,   setDupWarn]   = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceErr,  setVoiceErr]  = useState("");
  const [saveTpl,   setSaveTpl]   = useState(false);
  const amtRef = useRef(null);

  useEffect(() => { setTimeout(() => amtRef.current?.focus(), 200); }, []);

  // Merchant auto-category
  const MERCHANT_MAP = { starbucks:"food", mcdonalds:"food", spotify:"subscriptions", netflix:"entertainment", uber:"transport", gym:"health" };
  function handleNoteChange(val) {
    setNote(val);
    const lower = val.toLowerCase();
    for (const [k, v] of Object.entries(MERCHANT_MAP)) {
      if (lower.includes(k)) { setCatId(v); break; }
    }
  }

  // Apply template
  function applyTemplate(tpl) {
    setNote(tpl.title);
    setAmount(String(tpl.amount));
    setCatId(tpl.categoryId);
    setType(tpl.type || "expense");
    if (tpl.emoji) setEmoji(tpl.emoji);
    amtRef.current?.focus();
  }

  // Voice input
  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceErr("Voice not supported in this browser."); return; }
    const r = new SR(); r.lang = "en-US"; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onend   = () => setListening(false);
    r.onresult = e => {
      const t = e.results[0][0].transcript;
      const m = t.match(/(?:add\s+)?(\d+(?:\.\d+)?)\s+(.+)/i);
      if (m) { setAmount(m[1]); handleNoteChange(m[2].trim()); }
      else setVoiceErr(`Couldn't parse "${t}". Try: "add 12.50 coffee"`);
    };
    r.onerror = e => { setListening(false); setVoiceErr("Mic error: " + e.error); };
    r.start();
  }

  function handleSave(force = false) {
    if (!note.trim() || !amount || parseFloat(amount) <= 0) return;
    // Duplicate check (same amount + category in last 10 min, skip if forced)
    if (!force) {
      const tenAgo = Date.now() - 600000;
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const dup = (stored.expenses || []).find(e =>
        e.amount === parseFloat(amount) && e.categoryId === catId &&
        new Date(e.date).getTime() > tenAgo
      );
      if (dup) { setDupWarn(true); return; }
    }
    const exp = {
      id: genId(), amount: parseFloat(amount), categoryId: catId,
      note, date, type, emoji: emoji || null,
      recurring, intervalDays: recurring ? interval : null,
      nextDue: recurring ? addDays(date, interval) : null,
    };
    if (saveTpl) {
      addTemplate({ id: genId(), title: note, emoji: emoji || null, amount: parseFloat(amount), categoryId: catId, type });
    }
    onAdd(exp);
  }

  const amtNum = parseFloat(amount) || 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell" onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div style={{ width: 32, height: 3, background: "var(--rule)", borderRadius: 2, margin: "0 auto 24px" }} />

        {/* Type toggle */}
        <div className="type-toggle" style={{ marginBottom: 20 }}>
          {["expense","income"].map(t => (
            <button key={t} className="type-btn"
              style={{ background: type === t ? "var(--ink)" : "transparent", color: type === t ? "var(--bg)" : "var(--ink-faint)" }}
              onClick={() => setType(t)}>
              {t === "expense" ? "Expense" : "Income"}
            </button>
          ))}
        </div>

        {/* Templates */}
        {templates.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Quick add</div>
            <div className="scroll-x" style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
              {templates.map(tpl => (
                <button key={tpl.id} className="tpl-chip" onClick={() => applyTemplate(tpl)}>
                  <span style={{ fontSize: 18 }}>{tpl.emoji || "•"}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: "var(--ink)", whiteSpace: "nowrap", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{tpl.title}</span>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 12, color: "var(--ink-mid)" }}>{currency}{tpl.amount}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount hero input */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 28, color: "var(--ink-faint)" }}>{currency}</span>
          <input
            ref={amtRef} type="number" placeholder="0.00" value={amount}
            onChange={e => { setAmount(e.target.value); setDupWarn(false); }}
            style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 700, letterSpacing: "-0.02em", borderBottom: "none", width: "100%" }}
          />
        </div>

        {dupWarn && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "#FDF5E4", fontSize: 12, color: "#8B6A00", display: "flex", alignItems: "center", gap: 10 }}>
            <span>⚠ Similar entry logged recently.</span>
            <button style={{ background: "none", border: "1px solid #B5860A", color: "#8B6A00", padding: "2px 10px", fontSize: 11, cursor: "pointer", fontFamily: "var(--sans)" }} onClick={() => handleSave(true)}>Save anyway</button>
            <button style={{ background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 11 }} onClick={() => setDupWarn(false)}>Cancel</button>
          </div>
        )}

        <hr className="rule" style={{ marginBottom: 20 }} />

        {/* Fields */}
        {[
          { label: "Description", el: <input type="text" placeholder="What for?" value={note} onChange={e => handleNoteChange(e.target.value)} /> },
          { label: "Category",    el: (
            <select value={catId} onChange={e => setCatId(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          )},
          { label: "Emoji",       el: <input type="text" placeholder="Optional" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} style={{ width: 60, textAlign: "center", fontSize: 20 }} /> },
          { label: "Date",        el: <input type="date" value={date} onChange={e => setDate(e.target.value)} /> },
        ].map(({ label, el }) => (
          <div key={label} style={{ marginBottom: 20 }}>
            <div className="section-label" style={{ marginBottom: 6 }}>{label}</div>
            {el}
          </div>
        ))}

        {/* Recurring */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} style={{ width: "auto", borderBottom: "none" }} />
            <span className="section-label">Recurring</span>
          </label>
          {recurring && (
            <select value={interval} onChange={e => setInterval(+e.target.value)} style={{ width: "auto" }}>
              {[[7,"Weekly"],[14,"Bi-weekly"],[30,"Monthly"],[90,"Quarterly"],[365,"Yearly"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
        </div>

        {/* Voice */}
        <div style={{ marginBottom: 16 }}>
          <button
            style={{ background: listening ? "var(--ink)" : "transparent", color: listening ? "var(--bg)" : "var(--ink-mid)", border: "1px solid var(--rule)", padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "var(--sans)", letterSpacing: "0.06em", transition: "all 0.15s" }}
            onClick={startVoice}
          >
            {listening ? "⏹ Listening…" : "🎙 Voice input"}
          </button>
          {voiceErr && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>{voiceErr}</p>}
        </div>

        {/* Save as template */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 24 }}>
          <input type="checkbox" checked={saveTpl} onChange={e => setSaveTpl(e.target.checked)} style={{ width: "auto", borderBottom: "none" }} />
          <span style={{ fontSize: 11, color: "var(--ink-mid)", letterSpacing: "0.04em" }}>Save as quick-add template</span>
        </label>

        <button className="btn-primary" style={{ width: "100%", padding: 14, opacity: (!note || !amount) ? 0.4 : 1 }} onClick={() => handleSave()}>
          Add {type}
        </button>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ state, onUpdate, onClose, onExportCSV, onExportJSON, showToast }) {
  const { budgets, currency } = state;
  const [overall, setOverall] = useState(budgets.overall || "");

  const importJSON = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.expenses) { onUpdate(data); showToast("Backup restored"); onClose(); }
          else showToast("Invalid backup file");
        } catch { showToast("Could not parse file"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell" onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 28 }}>Settings</div>
        <div className="section-label" style={{ marginBottom: 8 }}>Monthly budget</div>
        <input type="number" value={overall} placeholder="0" onChange={e => setOverall(e.target.value)} style={{ marginBottom: 24 }} />
        <button className="btn-primary" style={{ padding: "10px 20px", marginBottom: 32 }}
          onClick={() => { onUpdate({ budgets: { ...budgets, overall: parseFloat(overall) || 0 } }); showToast("Saved"); }}>
          Save budget
        </button>
        <hr className="rule" style={{ marginBottom: 24 }} />
        <div className="section-label" style={{ marginBottom: 16 }}>Data</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn-ghost" style={{ padding: "10px 16px", textAlign: "left" }} onClick={onExportCSV}>Export CSV</button>
          <button className="btn-ghost" style={{ padding: "10px 16px", textAlign: "left" }} onClick={onExportJSON}>Export JSON</button>
          <button className="btn-ghost" style={{ padding: "10px 16px", textAlign: "left" }} onClick={importJSON}>Restore from backup</button>
        </div>
        <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 16, lineHeight: 1.6 }}>
          Your data is stored locally in this browser. No servers. No tracking. Export a JSON backup regularly to avoid losing your data if you switch devices.
        </p>
      </div>
    </div>
  );
}

// ─── Goal Modal ───────────────────────────────────────────────────────────────
function GoalModal({ onSave, onClose }) {
  const [title,       setTitle]       = useState("");
  const [emoji,       setEmoji]       = useState("🎯");
  const [target,      setTarget]      = useState("");
  const [saved,       setSaved]       = useState("");
  const [allocation,  setAllocation]  = useState("");
  const colors = ["#2D6A4F","#8B2E2E","#3D3D8B","#8B6A00","#141414"];
  const [color, setColor] = useState(colors[0]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell" onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 28 }}>New goal</div>
        {[
          { label: "Title",              el: <input placeholder="e.g. Emergency Fund" value={title} onChange={e => setTitle(e.target.value)} /> },
          { label: "Emoji",              el: <input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} style={{ width: 60 }} /> },
          { label: "Target amount",      el: <input type="number" placeholder="0" value={target} onChange={e => setTarget(e.target.value)} /> },
          { label: "Already saved",      el: <input type="number" placeholder="0" value={saved} onChange={e => setSaved(e.target.value)} /> },
          { label: "Monthly allocation", el: <input type="number" placeholder="0" value={allocation} onChange={e => setAllocation(e.target.value)} /> },
        ].map(({ label, el }) => (
          <div key={label} style={{ marginBottom: 20 }}>
            <div className="section-label" style={{ marginBottom: 6 }}>{label}</div>
            {el}
          </div>
        ))}
        <div style={{ marginBottom: 24 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Colour</div>
          <div style={{ display: "flex", gap: 8 }}>
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: color === c ? "2px solid var(--ink)" : "2px solid transparent", cursor: "pointer" }} />
            ))}
          </div>
        </div>
        <button className="btn-primary" style={{ width: "100%", padding: 14, opacity: (!title || !target) ? 0.4 : 1 }}
          onClick={() => {
            if (!title || !target) return;
            onSave({ id: genId(), title, emoji, targetAmount: parseFloat(target), savedAmount: parseFloat(saved)||0, monthlyAllocation: parseFloat(allocation)||0, color });
          }}>
          Create goal
        </button>
      </div>
    </div>
  );
}

// ─── Sub Modal ────────────────────────────────────────────────────────────────
function SubModal({ categories, onSave, onClose }) {
  const [title,      setTitle]      = useState("");
  const [emoji,      setEmoji]      = useState("📦");
  const [amount,     setAmount]     = useState("");
  const [billingDay, setBillingDay] = useState(1);
  const [catId,      setCatId]      = useState(categories[0]?.id || "");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell" onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 28 }}>New subscription</div>
        {[
          { label: "Name",        el: <input placeholder="e.g. Netflix" value={title} onChange={e => setTitle(e.target.value)} /> },
          { label: "Emoji",       el: <input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} style={{ width: 60 }} /> },
          { label: "Monthly cost",el: <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} /> },
          { label: "Billing day", el: <input type="number" min="1" max="28" value={billingDay} onChange={e => setBillingDay(+e.target.value)} /> },
        ].map(({ label, el }) => (
          <div key={label} style={{ marginBottom: 20 }}>
            <div className="section-label" style={{ marginBottom: 6 }}>{label}</div>
            {el}
          </div>
        ))}
        <div style={{ marginBottom: 24 }}>
          <div className="section-label" style={{ marginBottom: 6 }}>Category</div>
          <select value={catId} onChange={e => setCatId(e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <button className="btn-primary" style={{ width: "100%", padding: 14, opacity: (!title || !amount) ? 0.4 : 1 }}
          onClick={() => { if (!title || !amount) return; onSave({ id: genId(), title, emoji, amount: parseFloat(amount), billingDay, categoryId: catId, active: true }); }}>
          Add subscription
        </button>
      </div>
    </div>
  );
}

// ─── Notification panel ───────────────────────────────────────────────────────
function NotifPanel({ notifications, onDismiss, onDismissAll, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Notifications</div>
          {notifications.length > 0 && <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={onDismissAll}>Clear all</button>}
        </div>
        {notifications.length === 0
          ? <p style={{ color: "var(--ink-faint)", fontSize: 13 }}>No notifications.</p>
          : notifications.slice(0, 20).map(n => (
              <div key={n.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--rule)" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon || "🔔"}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</p>
                  <p style={{ fontSize: 12, color: "var(--ink-mid)", marginTop: 2 }}>{n.body}</p>
                </div>
                <button onClick={() => onDismiss(n.id)} style={{ background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [s, setS]         = useState(() => {
    const saved = loadState();
    if (!saved) return INITIAL_STATE;
    // Merge in new keys if upgrading from older version
    return {
      ...INITIAL_STATE,
      ...saved,
      goals:         saved.goals         ?? INITIAL_STATE.goals,
      subscriptions: saved.subscriptions ?? INITIAL_STATE.subscriptions,
      templates:     saved.templates     ?? INITIAL_STATE.templates,
      notifications: saved.notifications ?? [],
    };
  });
  const [view,      setView]      = useState("dashboard");
  const [modal,     setModal]     = useState(null);
  const [month,     setMonth]     = useState(todayStr().slice(0, 7));
  const [toast,     setToast]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [filterCat, setFilterCat] = useState(null);
  const [loading,   setLoading]   = useState(true);

  const { expenses, categories, budgets, currency, goals, subscriptions, templates, notifications } = s;

  // Simulate load (skeleton state)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t); }, []);

  useEffect(() => { if (!s.setupDone) setModal("setup"); }, []);
  useEffect(() => { persist(s); }, [s]);

  // Auto-trigger recurring
  useEffect(() => {
    const now = todayStr();
    const due = expenses.filter(e => e.recurring && e.nextDue && e.nextDue <= now && e.nextDue !== e.date);
    if (!due.length) return;
    const next = [...expenses];
    due.forEach(e => {
      const clone = { ...e, id: genId(), date: now, nextDue: addDays(now, e.intervalDays) };
      const idx = next.findIndex(x => x.id === e.id);
      if (idx !== -1) next[idx] = { ...e, nextDue: addDays(now, e.intervalDays) };
      next.unshift(clone);
    });
    setS(p => ({ ...p, expenses: next }));
  }, []);

  const update = useCallback((patch) => setS(p => ({ ...p, ...patch })), []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const pushNotif = (icon, title, body) =>
    update({ notifications: [{ id: genId(), icon, title, body, at: Date.now() }, ...(s.notifications || [])] });

  // ── Transaction actions ────────────────────────────────────────────────────
  const addExpense = (exp) => {
    const next = [exp, ...expenses];
    update({ expenses: next });
    // Budget alert
    const cat = categories.find(c => c.id === exp.categoryId);
    if (exp.type === "expense" && cat) {
      const now = new Date();
      const monthSpent = next.filter(e => e.type === "expense" && e.categoryId === exp.categoryId && e.date.startsWith(todayStr().slice(0,7))).reduce((a, e) => a + e.amount, 0);
      const limit = budgets.perCategory?.[exp.categoryId];
      if (limit && monthSpent / limit >= 0.8) pushNotif("⚠️", `${cat.name} budget at ${Math.round(monthSpent/limit*100)}%`, `You've spent ${currency}${monthSpent.toFixed(2)} of ${currency}${limit}`);
    }
    showToast("Entry recorded");
    setModal(null);
  };

  const deleteExpense = (id) => { update({ expenses: expenses.filter(e => e.id !== id) }); showToast("Entry removed"); };

  // ── Computed ───────────────────────────────────────────────────────────────
  const monthExp   = expenses.filter(e => e.date.startsWith(month));
  const totalSpent = monthExp.filter(e => e.type !== "income").reduce((s, e) => s + e.amount, 0);
  const totalIncome= monthExp.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const remaining  = (budgets.overall || 0) - totalSpent;
  const budgetPct  = budgets.overall ? Math.min((totalSpent / budgets.overall) * 100, 100) : 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

  const totalMonthlyRecurring = subscriptions.filter(s => s.active).reduce((a, s) => a + s.amount, 0);
  const upcomingSubs          = getUpcomingSubscriptions(subscriptions);
  const upcomingSubCost       = upcomingSubs.reduce((a, s) => a + s.amount, 0);
  const totalGoalAllocations  = goals.reduce((a, g) => a + (g.monthlyAllocation || 0), 0);

  const totalBalance  = expenses.reduce((s, e) => s + (e.type === "income" ? e.amount : -e.amount), 0);
  const safeToSpend   = totalBalance - upcomingSubCost - totalGoalAllocations;

  const catData = categories.map(cat => {
    const items = monthExp.filter(e => e.categoryId === cat.id && e.type !== "income");
    const spent = items.reduce((s, e) => s + e.amount, 0);
    return { ...cat, spent, limit: budgets.perCategory?.[cat.id] || 0, count: items.length };
  }).filter(c => c.spent > 0 || c.limit > 0).sort((a, b) => b.spent - a.spent);

  const allMonths = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort().reverse();
  if (!allMonths.includes(month)) allMonths.unshift(month);

  const filteredExp = monthExp.filter(e => {
    const matchesCat    = !filterCat || e.categoryId === filterCat;
    const matchesSearch = !search || (e.note && e.note.toLowerCase().includes(search.toLowerCase())) || (categories.find(c => c.id === e.categoryId)?.name.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Spending velocity
  const now = new Date();
  const daysPassed   = now.getDate();
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const velocityPct  = budgets.overall ? Math.min((totalSpent / budgets.overall) * 100, 100) : 0;
  const monthPct     = (daysPassed / daysInMonth) * 100;
  const onTrack      = velocityPct <= monthPct + 10;
  const projected    = budgets.overall && daysPassed > 0 ? (totalSpent / daysPassed) * daysInMonth : 0;

  // Spending heatmap
  const heatmap = useMemo(() => {
    const map = {};
    for (let d = 1; d <= daysInMonth; d++) map[d] = 0;
    expenses.filter(e => e.type !== "income" && e.date.startsWith(todayStr().slice(0,7)))
      .forEach(e => { const d = parseInt(e.date.slice(8)); map[d] = (map[d]||0) + e.amount; });
    return map;
  }, [expenses, daysInMonth]);
  const heatMax = Math.max(...Object.values(heatmap), 1);

  // Financial score
  const score = Math.min(100, Math.max(0, Math.round(savingsRate * 0.6 + (savingsRate > 20 ? 20 : 0) + 20)));

  // Unread notifications
  const unreadCount = notifications.length;

  // ── Export ─────────────────────────────────────────────────────────────────
  const dl = (content, name, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click();
  };
  const exportCSV  = () => { const rows = [["Date","Amount","Category","Note","Type","Recurring"]]; expenses.forEach(e => { const cat = categories.find(c => c.id === e.categoryId); rows.push([e.date, e.amount, cat?.name||"", e.note||"", e.type||"expense", e.recurring?"Yes":"No"]); }); dl(rows.map(r => r.map(v=>`"${v}"`).join(",")).join("\n"), "expenses.csv", "text/csv"); };
  const exportJSON = () => dl(JSON.stringify({ expenses, goals, subscriptions, budgets, categories, exportedAt: new Date().toISOString() }, null, 2), "expense-ledger-backup.json", "application/json");

  // ── Navigation ─────────────────────────────────────────────────────────────
  const VIEWS = [["dashboard","Overview"],["subscriptions","Subscriptions"],["timeline","Timeline"],["monthly","History"],["analytics","Analytics"]];

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {toast && <div className="toast">{toast}</div>}

        {/* Modals */}
        {modal === "setup"    && <SetupModal onDone={(cur, name) => { update({ currency: cur, userName: name, setupDone: true }); setModal(null); }} />}
        {modal === "add"      && <AddModal categories={categories} currency={currency} onAdd={addExpense} onClose={() => setModal(null)} templates={templates} addTemplate={tpl => update({ templates: [tpl, ...templates] })} />}
        {modal === "settings" && <SettingsModal state={s} onUpdate={update} onClose={() => setModal(null)} onExportCSV={exportCSV} onExportJSON={exportJSON} showToast={showToast} />}
        {modal === "goal"     && <GoalModal onSave={g => { update({ goals: [...goals, g] }); setModal(null); showToast("Goal created"); }} onClose={() => setModal(null)} />}
        {modal === "sub"      && <SubModal categories={categories} onSave={sub => { update({ subscriptions: [...subscriptions, sub] }); setModal(null); showToast("Subscription added"); }} onClose={() => setModal(null)} />}
        {modal === "notifs"   && <NotifPanel notifications={notifications} onDismiss={id => update({ notifications: notifications.filter(n => n.id !== id) })} onDismissAll={() => update({ notifications: [] })} onClose={() => setModal(null)} />}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{ background: "var(--bg)", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid var(--rule)" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 20, paddingBottom: 12 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 3 }}>Personal Finance</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Expense Ledger</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  style={{ background: "none", border: "none", cursor: "pointer", position: "relative", padding: "6px 8px", fontSize: 16 }}
                  onClick={() => setModal("notifs")}
                  title="Notifications"
                >
                  🔔{unreadCount > 0 && <span className="notif-dot" />}
                </button>
                <button className="btn-ghost" onClick={() => setModal("settings")} style={{ padding: "6px 12px", fontSize: 11 }}>Settings</button>
                <button className="btn-primary" onClick={() => setModal("add")} style={{ padding: "8px 16px" }}>+ Add</button>
              </div>
            </div>
            <nav style={{ display: "flex", overflowX: "auto" }} className="scroll-x">
              {VIEWS.map(([k, label]) => (
                <button key={k} className={`nav-item ${view === k ? "active" : ""}`} onClick={() => setView(k)}>{label}</button>
              ))}
            </nav>
          </div>
        </header>

        {/* ── Month bar ──────────────────────────────────────────────────── */}
        {view !== "subscriptions" && (
          <div style={{ borderBottom: "1px solid var(--rule)", background: "var(--bg)" }}>
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16 }}>
              <select value={month} onChange={e => setMonth(e.target.value)} style={{ width: "auto", padding: "4px 0", fontSize: 12, fontWeight: 500, borderBottom: "none" }}>
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
        )}

        {/* ── Main ───────────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px 100px" }}>

          {/* ════════════════════ DASHBOARD ════════════════════ */}
          {view === "dashboard" && (
            <div className="screen-enter">

              {/* Safe to Spend hero */}
              <div className="fade-up fade-up-1" style={{ marginBottom: 40 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>Safe to spend</div>
                {loading
                  ? <><Sk w={260} h={64} style={{ display:"block", marginBottom: 8 }} /><Sk w={200} h={11} /></>
                  : <>
                      <div className="hero-num" style={{ fontSize: "clamp(48px,10vw,72px)", color: safeToSpend < 0 ? "var(--danger)" : "var(--ink)" }}>
                        {safeToSpend < 0 ? "−" : ""}{fmtMoney(Math.abs(safeToSpend), currency)}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 8 }}>
                        After upcoming bills &amp; goal allocations
                      </p>
                    </>
                }

                {/* Spending velocity */}
                {!loading && budgets.overall > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{Math.round(velocityPct)}% of budget used</span>
                      <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>Day {daysPassed} of {daysInMonth}</span>
                    </div>
                    <div className="bar-track" style={{ height: 4, position: "relative" }}>
                      <div className="bar-fill" style={{ "--w": `${velocityPct}%`, background: onTrack ? "var(--positive)" : "var(--danger)" }} />
                      {/* Expected pace marker */}
                      <div style={{ position: "absolute", top: -3, left: `${monthPct}%`, width: 2, height: 10, background: "var(--ink-faint)", borderRadius: 1, transform: "translateX(-50%)" }} />
                    </div>
                    {!onTrack && projected > budgets.overall && (
                      <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>
                        Projected to overspend by {fmtMoney(projected - budgets.overall, currency)} this month
                      </p>
                    )}
                  </div>
                )}
              </div>

              <hr className="rule" />

              {/* Stats strip */}
              <div className="fade-up fade-up-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, margin: "28px 0" }}>
                {loading
                  ? [1,2,3].map(i => <div key={i} style={{ padding: "0 20px 0 0" }}><Sk w={60} h={11} style={{ marginBottom:8,display:"block" }} /><Sk w={80} h={28} /></div>)
                  : [
                      { label: "Savings rate",   value: `${Math.round(savingsRate)}%` },
                      { label: "Financial score", value: score },
                      { label: "Daily average",   value: fmtMoney(monthExp.length ? totalSpent / new Set(monthExp.map(e => e.date)).size : 0, currency) },
                    ].map((stat, i) => (
                      <div key={i} style={{ paddingRight: 20, borderRight: i < 2 ? "1px solid var(--rule)" : "none", paddingLeft: i > 0 ? 20 : 0 }}>
                        <div className="section-label" style={{ marginBottom: 8 }}>{stat.label}</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 400, lineHeight: 1 }}>{stat.value}</div>
                      </div>
                    ))
                }
              </div>

              <hr className="rule" />

              {/* Goals */}
              <div className="fade-up fade-up-3" style={{ margin: "32px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div className="section-label">Goals</div>
                  <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }} onClick={() => setModal("goal")}>+ New goal</button>
                </div>
                {loading
                  ? <div style={{ display:"flex", gap:20 }}>{[1,2].map(i=><div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}><Sk w={80} h={80} style={{borderRadius:40}} /><Sk w={100} h={12} /><Sk w={70} h={11} /></div>)}</div>
                  : goals.length === 0
                    ? <p style={{ color: "var(--ink-faint)", fontSize: 13, fontStyle: "italic" }}>No goals yet.</p>
                    : (
                      <div className="scroll-x" style={{ display: "flex", gap: 24, paddingBottom: 4 }}>
                        {goals.map(goal => {
                          const pct = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
                          const remaining = goal.targetAmount - goal.savedAmount;
                          const months = goal.monthlyAllocation > 0 ? Math.ceil(remaining / goal.monthlyAllocation) : null;
                          return (
                            <div key={goal.id} className="goal-card" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, minWidth:120, padding:"8px 4px", cursor:"default" }}>
                              <ProgressRing size={80} stroke={5} pct={pct} color={goal.color} label={`${Math.round(pct)}%`} sub="funded" />
                              <span style={{ fontSize: 18 }}>{goal.emoji}</span>
                              <p style={{ fontWeight: 600, fontSize: 12, textAlign: "center", lineHeight: 1.3, color: "var(--ink)" }}>{goal.title}</p>
                              <p style={{ fontSize: 11, color: "var(--ink-mid)" }}>
                                <span style={{ fontFamily: "var(--serif)", fontWeight: 600 }}>{fmtMoney(goal.savedAmount, currency)}</span>
                                <span style={{ color: "var(--ink-faint)" }}> / {fmtMoney(goal.targetAmount, currency)}</span>
                              </p>
                              {months !== null && <p style={{ fontSize: 10, color: "var(--ink-faint)" }}>~{months}mo away</p>}
                              <button style={{ fontSize: 10, color: "var(--danger)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--sans)" }}
                                onClick={() => { if (window.confirm(`Delete "${goal.title}"?`)) update({ goals: goals.filter(g => g.id !== goal.id) }); }}>
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )
                }
              </div>

              <hr className="rule" />

              {/* Spending heatmap */}
              <div className="fade-up fade-up-3" style={{ margin: "32px 0" }}>
                <div className="section-label" style={{ marginBottom: 16 }}>{new Date().toLocaleDateString("en-US",{month:"long"})} spending</div>
                {loading
                  ? <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>{Array.from({length:28}).map((_,i)=><Sk key={i} h={28} />)}</div>
                  : <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const val = heatmap[day] || 0;
                          const intensity = val / heatMax;
                          const isToday = day === daysPassed;
                          return (
                            <div key={day} className="heat-cell" title={`${day}: ${val > 0 ? fmtMoney(val, currency) : "no spend"}`}
                              style={{ background: val === 0 ? "#F0EDE7" : `rgba(176,74,47,${0.12 + intensity * 0.88})`, outline: isToday ? "2px solid var(--ink)" : "none", outlineOffset: 1 }}>
                              <span style={{ fontSize: 9, color: "var(--ink-faint)", userSelect: "none" }}>{day}</span>
                              <div className="heat-tooltip">{day} — {val > 0 ? fmtMoney(val, currency) : "no spend"}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                        <span style={{ fontSize:9, color:"var(--ink-faint)" }}>Less</span>
                        {[0.1,0.3,0.5,0.7,1].map(v=><div key={v} style={{width:12,height:12,borderRadius:2,background:`rgba(176,74,47,${v})`}} />)}
                        <span style={{ fontSize:9, color:"var(--ink-faint)" }}>More</span>
                      </div>
                    </>
                }
              </div>

              <hr className="rule" />

              {/* Category breakdown */}
              {catData.filter(c => c.spent > 0).length > 0 && (
                <div className="fade-up fade-up-4" style={{ margin: "32px 0" }}>
                  <div className="section-label" style={{ marginBottom: 20 }}>By category</div>
                  {loading
                    ? [1,2,3].map(i=><div key={i} style={{marginBottom:20}}><Sk w={120} h={11} style={{display:"block",marginBottom:8}} /><Sk w="100%" h={3} /></div>)
                    : catData.filter(c => c.spent > 0).map((cat) => {
                        const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                        const barPct = cat.limit > 0 ? Math.min((cat.spent / cat.limit) * 100, 100) : pct;
                        const over = cat.limit > 0 && cat.spent > cat.limit;
                        return (
                          <div key={cat.id} style={{ marginBottom: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.icon} {cat.name}</span>
                              <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>
                                <span style={{ color: over ? "var(--danger)" : "var(--ink)" }}>{fmtMoney(cat.spent, currency)}</span>
                                {cat.limit > 0 && <span style={{ color: "var(--ink-faint)", fontSize: 12 }}> / {fmtMoney(cat.limit, currency)}</span>}
                              </span>
                            </div>
                            <div className="bar-track">
                              <div className="bar-fill" style={{ "--w": `${barPct}%`, background: over ? "var(--danger)" : barPct > 80 ? "#B5860A" : "var(--ink)" }} />
                            </div>
                            {over && <p style={{ fontSize: 10, color: "var(--danger)", marginTop: 4 }}>Over by {fmtMoney(cat.spent - cat.limit, currency)}</p>}
                          </div>
                        );
                      })
                  }
                </div>
              )}

              <hr className="rule" />

              {/* Recent transactions */}
              <div className="fade-up fade-up-5" style={{ marginTop: 32 }}>
                <div className="section-label" style={{ marginBottom: 20 }}>Recent</div>
                {loading
                  ? [1,2,3].map(i=><div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0"}}><Sk w={36} h={36} style={{borderRadius:18,flexShrink:0}} /><div style={{flex:1}}><Sk w="60%" h={13} style={{display:"block",marginBottom:6}} /><Sk w="40%" h={11} /></div><Sk w={60} h={13} /></div>)
                  : expenses.slice(0, 8).map((exp, i) => {
                      const cat = categories.find(c => c.id === exp.categoryId);
                      const isIncome = exp.type === "income";
                      return (
                        <div key={exp.id}>
                          <div className="tx-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}
                            onClick={() => { if (window.confirm(`Delete "${exp.note}"?`)) deleteExpense(exp.id); }}>
                            <div style={{ width:36,height:36,borderRadius:18,background:"var(--accent-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>
                              {exp.emoji || cat?.icon || "•"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight:500, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{exp.note}</p>
                              <p style={{ fontSize:11, color:"var(--ink-faint)", marginTop:2 }}>{cat?.name} · {fmtDate(exp.date)}</p>
                            </div>
                            <span style={{ fontFamily:"var(--serif)", fontSize:14, color: isIncome ? "var(--positive)" : "var(--ink)", whiteSpace:"nowrap" }}>
                              {isIncome ? "+" : "−"}{fmtMoney(exp.amount, currency)}
                            </span>
                          </div>
                          {i < 7 && <hr className="rule" />}
                        </div>
                      );
                    })
                }
              </div>

            </div>
          )}

          {/* ════════════════════ SUBSCRIPTIONS ════════════════════ */}
          {view === "subscriptions" && (
            <div className="screen-enter">

              {/* Hero: total monthly recurring */}
              <div style={{ marginBottom: 40 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>Monthly recurring</div>
                {loading
                  ? <><Sk w={200} h={56} style={{display:"block",marginBottom:8}} /><Sk w={180} h={11} /></>
                  : <>
                      <div className="hero-num" style={{ fontSize: "clamp(40px,9vw,64px)", cursor:"pointer" }}
                        title="Tap to see annual cost">
                        {fmtMoney(totalMonthlyRecurring, currency)}
                      </div>
                      <p style={{ fontSize:12, color:"var(--ink-faint)", marginTop:8 }}>
                        {fmtMoney(totalMonthlyRecurring * 12, currency)} per year ·{" "}
                        <span style={{ color: "var(--accent)" }}>{subscriptions.filter(s=>s.active).length} active</span>
                      </p>
                    </>
                }
              </div>

              <hr className="rule" />

              {/* Upcoming this month */}
              {!loading && upcomingSubs.length > 0 && (
                <div style={{ margin: "28px 0" }}>
                  <div className="section-label" style={{ marginBottom: 14 }}>Due this month</div>
                  <div className="scroll-x" style={{ display:"flex", gap:10, paddingBottom:4 }}>
                    {upcomingSubs.map(sub => {
                      const urgent = sub.daysUntil <= 3;
                      const soon   = sub.daysUntil <= 7;
                      return (
                        <div key={sub.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", border:"1px solid var(--rule)", flexShrink:0, minWidth:180 }}>
                          <span style={{ fontSize:20 }}>{sub.emoji}</span>
                          <div>
                            <p style={{ fontWeight:600, fontSize:12 }}>{sub.title}</p>
                            <p style={{ fontSize:11, color:"var(--ink-mid)", marginTop:2 }}>{fmtMoney(sub.amount, currency)}</p>
                          </div>
                          <span className="days-pill" style={{ marginLeft:"auto", background: urgent?"#F5EAEA": soon?"#FDF5E4":"var(--accent-bg)", color: urgent?"var(--danger)": soon?"#8B6A00":"var(--ink-mid)" }}>
                            {sub.daysUntil === 0 ? "Today" : `in ${sub.daysUntil}d`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <hr className="rule" />

              {/* Full subscription list */}
              <div style={{ marginTop: 28 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <div className="section-label">All subscriptions</div>
                  <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:10 }} onClick={() => setModal("sub")}>+ Add</button>
                </div>
                {loading
                  ? [1,2,3].map(i=><div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0"}}><Sk w={36} h={36} style={{borderRadius:4,flexShrink:0}} /><div style={{flex:1}}><Sk w="55%" h={13} style={{display:"block",marginBottom:6}} /><Sk w="35%" h={11} /></div><Sk w={60} h={13} /></div>)
                  : subscriptions.length === 0
                    ? <p style={{ color:"var(--ink-faint)", fontSize:13, fontStyle:"italic" }}>No subscriptions yet.</p>
                    : [...subscriptions].sort((a,b)=>a.billingDay-b.billingDay).map((sub,i) => (
                        <div key={sub.id}>
                          <div className="sub-row" style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", opacity: sub.active ? 1 : 0.4, transition:"opacity 0.2s" }}>
                            <div style={{ width:36,height:36,background:"var(--accent-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,borderRadius:2 }}>
                              {sub.emoji}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontWeight:600, fontSize:13 }}>{sub.title}</p>
                              <p style={{ fontSize:11, color:"var(--ink-faint)", marginTop:2 }}>
                                Bills on the {sub.billingDay}{sub.billingDay===1?"st":sub.billingDay===2?"nd":sub.billingDay===3?"rd":"th"} · {sub.categoryId}
                              </p>
                            </div>
                            <div style={{ textAlign:"right", flexShrink:0 }}>
                              <p style={{ fontFamily:"var(--serif)", fontSize:16, fontWeight:600 }}>{fmtMoney(sub.amount, currency)}</p>
                              <p style={{ fontSize:10, color:"var(--ink-faint)" }}>/ mo</p>
                            </div>
                            <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                              <button title={sub.active?"Pause":"Resume"} onClick={() => update({ subscriptions: subscriptions.map(s=>s.id===sub.id?{...s,active:!s.active}:s) })}
                                style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--ink-mid)",padding:"4px 6px" }}>
                                {sub.active ? "⏸" : "▶"}
                              </button>
                              <button title="Delete" onClick={() => { if(window.confirm(`Delete "${sub.title}"?`)) update({ subscriptions: subscriptions.filter(s=>s.id!==sub.id) }); }}
                                style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"var(--danger)",padding:"4px 6px" }}>
                                ×
                              </button>
                            </div>
                          </div>
                          {i < subscriptions.length-1 && <hr className="rule" />}
                        </div>
                      ))
                }
              </div>

            </div>
          )}

          {/* ════════════════════ TIMELINE ════════════════════ */}
          {view === "timeline" && (
            <div className="screen-enter">
              {/* Search + filters */}
              <div style={{ marginBottom: 24 }}>
                <div className="search-wrap" style={{ marginBottom: 16 }}>
                  <span style={{ color:"var(--ink-faint)", fontSize:13 }}>↗</span>
                  <input placeholder="Search entries…" value={search} onChange={e => setSearch(e.target.value)} />
                  {search && <button style={{ background:"none",border:"none",cursor:"pointer",color:"var(--ink-faint)",fontSize:13 }} onClick={() => setSearch("")}>×</button>}
                </div>
                <div className="scroll-x" style={{ display:"flex", gap:6, paddingBottom:4 }}>
                  <button className={`filter-pill ${!filterCat?"active":""}`} onClick={() => setFilterCat(null)}>All</button>
                  {categories.map(c => (
                    <button key={c.id} className={`filter-pill ${filterCat===c.id?"active":""}`} onClick={() => setFilterCat(filterCat===c.id?null:c.id)}>
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {filteredExp.length === 0
                ? <div className="empty-state"><p style={{ fontFamily:"var(--serif)", fontSize:20, marginBottom:8 }}>No entries found</p><p style={{ fontSize:12 }}>Try a different filter or search term.</p></div>
                : filteredExp.sort((a,b)=>b.date.localeCompare(a.date)).map((exp,i) => {
                    const cat = categories.find(c=>c.id===exp.categoryId);
                    const isIncome = exp.type === "income";
                    return (
                      <div key={exp.id}>
                        <div className="tx-row" style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0" }}
                          onClick={() => { if(window.confirm(`Delete "${exp.note}"?`)) deleteExpense(exp.id); }}>
                          <div style={{ width:38,height:38,borderRadius:19,background:"var(--accent-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>
                            {exp.emoji || cat?.icon || "•"}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontWeight:500, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{exp.note}</p>
                            <p style={{ fontSize:11, color:"var(--ink-faint)", marginTop:2 }}>{cat?.name} · {fmtDate(exp.date)}{exp.recurring ? " · 🔁" : ""}</p>
                          </div>
                          <span style={{ fontFamily:"var(--serif)", fontSize:15, color: isIncome?"var(--positive)":"var(--ink)", whiteSpace:"nowrap" }}>
                            {isIncome?"+":"−"}{fmtMoney(exp.amount, currency)}
                          </span>
                        </div>
                        {i < filteredExp.length-1 && <hr className="rule" />}
                      </div>
                    );
                  })
              }
            </div>
          )}

          {/* ════════════════════ MONTHLY HISTORY ════════════════════ */}
          {view === "monthly" && (
            <div className="screen-enter">
              <div className="section-label" style={{ marginBottom: 24 }}>Month by month</div>
              {allMonths.map((m, mi) => {
                const mExp  = expenses.filter(e => e.date.startsWith(m));
                const spent = mExp.filter(e=>e.type!=="income").reduce((s,e)=>s+e.amount,0);
                const inc   = mExp.filter(e=>e.type==="income").reduce((s,e)=>s+e.amount,0);
                const pct   = budgets.overall ? Math.min((spent/budgets.overall)*100,100) : 0;
                return (
                  <div key={m} style={{ marginBottom: 32 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12 }}>
                      <button style={{ fontFamily:"var(--serif)", fontSize:18, background:"none", border:"none", cursor:"pointer", color:"var(--ink)", padding:0 }} onClick={() => { setMonth(m); setView("timeline"); }}>
                        {fmtMonth(m)}
                      </button>
                      <div style={{ textAlign:"right" }}>
                        <span style={{ fontFamily:"var(--serif)", fontSize:18 }}>{fmtMoney(spent, currency)}</span>
                        {inc > 0 && <span style={{ fontSize:11, color:"var(--positive)", marginLeft:8 }}>+{fmtMoney(inc,currency)}</span>}
                      </div>
                    </div>
                    {budgets.overall > 0 && (
                      <div className="bar-track"><div className="bar-fill" style={{ "--w":`${pct}%`, background: pct>90?"var(--danger)":"var(--ink)" }} /></div>
                    )}
                    <p style={{ fontSize:11, color:"var(--ink-faint)", marginTop:6 }}>{mExp.length} entries</p>
                    {mi < allMonths.length-1 && <hr className="rule" style={{ marginTop:24 }} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ════════════════════ ANALYTICS ════════════════════ */}
          {view === "analytics" && (
            <div className="screen-enter">
              <div className="section-label" style={{ marginBottom: 24 }}>Analytics</div>

              {/* Summary cards */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:32 }}>
                {[
                  { label:"Total spent",      value: fmtMoney(totalSpent, currency),    sub: `${monthExp.filter(e=>e.type!=="income").length} transactions` },
                  { label:"Total income",     value: fmtMoney(totalIncome, currency),   sub: "this month", color:"var(--positive)" },
                  { label:"Net",              value: fmtMoney(totalIncome-totalSpent,currency), sub:"income − expenses", color:(totalIncome-totalSpent)>=0?"var(--positive)":"var(--danger)" },
                  { label:"Savings rate",     value: `${Math.round(savingsRate)}%`,      sub:"of income saved" },
                ].map(card => (
                  <div key={card.label} style={{ padding:"16px", border:"1px solid var(--rule)" }}>
                    <div className="section-label" style={{ marginBottom:8 }}>{card.label}</div>
                    <div style={{ fontFamily:"var(--serif)", fontSize:22, fontWeight:400, color: card.color||"var(--ink)" }}>{card.value}</div>
                    <p style={{ fontSize:11, color:"var(--ink-faint)", marginTop:4 }}>{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Bar chart by category */}
              <div className="section-label" style={{ marginBottom:16 }}>Spending by category</div>
              {catData.filter(c=>c.spent>0).map(cat => {
                const pct = totalSpent>0?(cat.spent/totalSpent)*100:0;
                return (
                  <div key={cat.id} className="bar-col" style={{ marginBottom:14 }} onClick={() => { setFilterCat(cat.id); setView("timeline"); }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
                      <span style={{ fontSize:13 }}>{cat.icon} {cat.name}</span>
                      <span style={{ fontFamily:"var(--serif)", fontSize:13 }}>{fmtMoney(cat.spent,currency)} <span style={{ fontSize:10, color:"var(--ink-faint)" }}>({Math.round(pct)}%)</span></span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ "--w":`${pct}%`, background:"var(--ink)", opacity: 0.7+pct/333 }} />
                    </div>
                  </div>
                );
              })}

              <hr className="rule" style={{ margin:"32px 0" }} />

              {/* Category trend vs last month */}
              <div className="section-label" style={{ marginBottom:16 }}>Trend vs last month</div>
              {(() => {
                const lastM = new Date(); lastM.setMonth(lastM.getMonth()-1);
                const lastMonthStr = lastM.toISOString().slice(0,7);
                return catData.filter(c=>c.spent>0).map(cat => {
                  const lastSpent = expenses.filter(e=>e.categoryId===cat.id && e.date.startsWith(lastMonthStr) && e.type!=="income").reduce((s,e)=>s+e.amount,0);
                  const change = lastSpent > 0 ? ((cat.spent-lastSpent)/lastSpent)*100 : null;
                  return (
                    <div key={cat.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid var(--rule)" }}>
                      <span style={{ fontSize:13 }}>{cat.icon} {cat.name}</span>
                      <div style={{ textAlign:"right" }}>
                        <span style={{ fontFamily:"var(--serif)", fontSize:14 }}>{fmtMoney(cat.spent,currency)}</span>
                        {change !== null && (
                          <span style={{ fontSize:11, marginLeft:8, color: change>0?"var(--danger)":"var(--positive)" }}>
                            {change>0?"↑":"↓"}{Math.abs(Math.round(change))}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              <hr className="rule" style={{ margin:"32px 0" }} />

              {/* Templates management */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div className="section-label">Quick-add templates</div>
                <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:10 }} onClick={() => setModal("add")}>+ Add template</button>
              </div>
              {templates.length === 0
                ? <p style={{ fontSize:13, color:"var(--ink-faint)", fontStyle:"italic" }}>No templates yet. Add one when logging an entry.</p>
                : templates.map((tpl,i) => (
                    <div key={tpl.id}>
                      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0" }}>
                        <span style={{ fontSize:20 }}>{tpl.emoji||"•"}</span>
                        <div style={{ flex:1 }}>
                          <p style={{ fontWeight:500, fontSize:13 }}>{tpl.title}</p>
                          <p style={{ fontSize:11, color:"var(--ink-faint)" }}>{categories.find(c=>c.id===tpl.categoryId)?.name} · {currency}{tpl.amount}</p>
                        </div>
                        <button onClick={() => update({ templates: templates.filter(t=>t.id!==tpl.id) })}
                          style={{ background:"none",border:"none",cursor:"pointer",color:"var(--danger)",fontSize:16 }}>×</button>
                      </div>
                      {i < templates.length-1 && <hr className="rule" />}
                    </div>
                  ))
              }
            </div>
          )}

        </main>
      </div>
    </>
  );
}
