import { useState, useEffect, useCallback, useMemo } from "react";

// ─── Your real data ───────────────────────────────────────────────────────────
const REAL_EXPENSES = [
  { "id": 1782068705462.7368, "amount": 1,     "categoryId": "food",          "date": "2026-06-21", "note": "CYHN obyketi",       "type": "expense" },
  { "id": 1782068690416.8042, "amount": 0.5,   "categoryId": "transport",     "date": "2026-06-21", "note": "",                   "type": "expense" },
  { "id": 1782068682536.0571, "amount": 2,     "categoryId": "food",          "date": "2026-06-21", "note": "CPS+KL",             "type": "expense" },
  { "id": 1782068643389.329,  "amount": 1,     "categoryId": "transport",     "date": "2026-06-21", "note": "+Zkr",               "type": "expense" },
  { "id": 1782068617942.7224, "amount": 0.6,   "categoryId": "transport",     "date": "2026-06-19", "note": "",                   "type": "expense" },
  { "id": 1782068602519.272,  "amount": 0.9,   "categoryId": "transport",     "date": "2026-06-19", "note": "",                   "type": "expense" },
  { "id": 1782068551310.6436, "amount": 1.7,   "categoryId": "entertainment", "date": "2026-06-19", "note": "PS blur",            "type": "expense" },
  { "id": 1782068528326.2168, "amount": 2.5,   "categoryId": "food",          "date": "2026-06-19", "note": "Seyidin dönəri",    "type": "expense" },
  { "id": 1782068504276.0857, "amount": 0.9,   "categoryId": "food",          "date": "2026-06-19", "note": "Mirinda",            "type": "expense" },
  { "id": 1782068442516.2827, "amount": 2.7,   "categoryId": "food",          "date": "2026-06-19", "note": "",                   "type": "expense" },
  { "id": 1782068421898.7432, "amount": 0.6,   "categoryId": "transport",     "date": "2026-06-19", "note": "",                   "type": "expense" },
  { "id": 1782068411728.1655, "amount": 1,     "categoryId": "transport",     "date": "2026-06-19", "note": "",                   "type": "expense" },
  { "id": 1781265813419.8289, "amount": 0.9,   "categoryId": "transport",     "date": "2026-06-11", "note": "",                   "type": "expense" },
  { "id": 1781265806497.5938, "amount": 0.6,   "categoryId": "transport",     "date": "2026-06-11", "note": "",                   "type": "expense" },
  { "id": 1781265794615.453,  "amount": 22,    "categoryId": "entertainment", "date": "2026-06-11", "note": "SCTR",               "type": "expense" },
  { "id": 1781265704305.698,  "amount": 0.6,   "categoryId": "transport",     "date": "2026-06-11", "note": "",                   "type": "expense" },
  { "id": 1781265695987.1382, "amount": 0.54,  "categoryId": "transport",     "date": "2026-06-11", "note": "",                   "type": "expense" },
  { "id": 1781265662553.5542, "amount": 14.83, "categoryId": "food",          "date": "2026-06-11", "note": "",                   "type": "expense" },
  { "id": 1781265555573.1838, "amount": 1,     "categoryId": "transport",     "date": "2026-06-11", "note": "",                   "type": "expense" },
  { "id": 1780737137429.9685, "amount": 5,     "categoryId": "transport",     "date": "2026-06-05", "note": "",                   "type": "expense" },
  { "id": 1780724491697.742,  "amount": 3,     "categoryId": "food",          "date": "2026-06-05", "note": "",                   "type": "expense" },
  { "id": 1780724485096.0562, "amount": 1.2,   "categoryId": "food",          "date": "2026-06-05", "note": "",                   "type": "expense" },
  { "id": 1780724467274.839,  "amount": 30,    "categoryId": "health",        "date": "2026-06-05", "note": "",                   "type": "expense" },
  { "id": 1780488739967.9233, "amount": 0.6,   "categoryId": "transport",     "date": "2026-06-03", "note": "",                   "type": "expense" },
  { "id": 1780488711851.9412, "amount": 18.5,  "categoryId": "food",          "date": "2026-06-02", "note": "",                   "type": "expense" },
  { "id": 1780488682884.7156, "amount": 4,     "categoryId": "food",          "date": "2026-06-02", "note": "DNR",                "type": "expense" },
  { "id": 1780488665223.7634, "amount": 0.6,   "categoryId": "transport",     "date": "2026-06-03", "note": "",                   "type": "expense" },
  { "id": 1780488658604.4756, "amount": 0.6,   "categoryId": "transport",     "date": "2026-06-02", "note": "",                   "type": "expense" },
  { "id": 1780488640982.3706, "amount": 2,     "categoryId": "transport",     "date": "2026-06-02", "note": "",                   "type": "expense" },
  { "id": 1780165976772.535,  "amount": 11,    "categoryId": "food",          "date": "2026-05-30", "note": "CLMİM",              "type": "expense" },
  { "id": 1779824679196.0632, "amount": 1,     "categoryId": "transport",     "date": "2026-05-26", "note": "",                   "type": "expense" },
  { "id": 1779824673208.5986, "amount": 0.54,  "categoryId": "transport",     "date": "2026-05-26", "note": "",                   "type": "expense" },
  { "id": 1779824662351.5425, "amount": 0.5,   "categoryId": "transport",     "date": "2026-05-26", "note": "",                   "type": "expense" },
  { "id": 1779824654011.0525, "amount": 0.9,   "categoryId": "transport",     "date": "2026-05-26", "note": "",                   "type": "expense" },
  { "id": 1779824633665.256,  "amount": 7.24,  "categoryId": "food",          "date": "2026-05-26", "note": "VIP",                "type": "expense" },
  { "id": 1779623148541.08,   "amount": 7,     "categoryId": "food",          "date": "2026-05-19", "note": "VİP",                "type": "expense" },
  { "id": 1779623095257.6038, "amount": 18.33, "categoryId": "food",          "date": "2026-05-21", "note": "ZFTGL",              "type": "expense" },
  { "id": 1779111889908.7778, "amount": 5.29,  "categoryId": "shopping",      "date": "2026-05-18", "note": "DDRNT",              "type": "expense" },
  { "id": 1779021295713.717,  "amount": 1.4,   "categoryId": "food",          "date": "2026-05-17", "note": "",                   "type": "expense" },
  { "id": 1779021286760.0493, "amount": 1,     "categoryId": "transport",     "date": "2026-05-17", "note": "",                   "type": "expense" },
  { "id": 1779021277002.8086, "amount": 8.5,   "categoryId": "food",          "date": "2026-05-17", "note": "MC 28",              "type": "expense" },
  { "id": 1778776123794.9604, "amount": 3.5,   "categoryId": "food",          "date": "2026-05-14", "note": "",                   "type": "expense" },
  { "id": 1778776110103.953,  "amount": 1.5,   "categoryId": "food",          "date": "2026-05-14", "note": "",                   "type": "expense" },
  { "id": 1778776095800.4822, "amount": 1,     "categoryId": "transport",     "date": "2026-05-14", "note": "",                   "type": "expense" },
  { "id": 1778616439110.6838, "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-12", "note": "",                   "type": "expense" },
  { "id": 1778616430727.1868, "amount": 0.9,   "categoryId": "transport",     "date": "2026-05-12", "note": "",                   "type": "expense" },
  { "id": 1778616420099.6792, "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-12", "note": "",                   "type": "expense" },
  { "id": 1778616401578.7756, "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-11", "note": "",                   "type": "expense" },
  { "id": 1778616385804.8289, "amount": 1,     "categoryId": "transport",     "date": "2026-05-11", "note": "",                   "type": "expense" },
  { "id": 1778420388011.904,  "amount": 29,    "categoryId": "entertainment", "date": "2026-05-09", "note": "",                   "type": "expense" },
  { "id": 1778166575873.4858, "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-07", "note": "",                   "type": "expense" },
  { "id": 1778166564384.511,  "amount": 1,     "categoryId": "transport",     "date": "2026-05-07", "note": "",                   "type": "expense" },
  { "id": 1778166553394.4846, "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-07", "note": "",                   "type": "expense" },
  { "id": 1778064670006.1018, "amount": 1,     "categoryId": "transport",     "date": "2026-05-06", "note": "",                   "type": "expense" },
  { "id": 1778064657792.7944, "amount": 0.6,   "categoryId": "food",          "date": "2026-05-05", "note": "🧃",                 "type": "expense" },
  { "id": 1778012576604.0398, "amount": 0.9,   "categoryId": "transport",     "date": "2026-05-05", "note": "",                   "type": "expense" },
  { "id": 1778012570684.971,  "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-05", "note": "",                   "type": "expense" },
  { "id": 1778012563282.148,  "amount": 0.5,   "categoryId": "transport",     "date": "2026-05-05", "note": "",                   "type": "expense" },
  { "id": 1778012550861.058,  "amount": 2,     "categoryId": "food",          "date": "2026-05-05", "note": "Dondurma",           "type": "expense" },
  { "id": 1777912768873.349,  "amount": 6,     "categoryId": "food",          "date": "2026-05-04", "note": "Mkn",                "type": "expense" },
  { "id": 1777905975470.1858, "amount": 0.9,   "categoryId": "transport",     "date": "2026-05-04", "note": "",                   "type": "expense" },
  { "id": 1777905968444.1235, "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-04", "note": "",                   "type": "expense" },
  { "id": 1777905960452.8464, "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-04", "note": "",                   "type": "expense" },
  { "id": 1777905953591.3274, "amount": 1.7,   "categoryId": "food",          "date": "2026-05-04", "note": "",                   "type": "expense" },
  { "id": 1777881768876.8743, "amount": 0.5,   "categoryId": "transport",     "date": "2026-05-04", "note": "",                   "type": "expense" },
  { "id": 1777881748382.5642, "amount": 0.5,   "categoryId": "transport",     "date": "2026-05-04", "note": "",                   "type": "expense" },
  { "id": 1777881735695.0703, "amount": 1,     "categoryId": "transport",     "date": "2026-05-04", "note": "",                   "type": "expense" },
  { "id": 1777843657236.1501, "amount": 5,     "categoryId": "food",          "date": "2026-05-03", "note": "Miami",              "type": "expense" },
  { "id": 1777798491880.278,  "amount": 0.5,   "categoryId": "transport",     "date": "2026-05-03", "note": "",                   "type": "expense" },
  { "id": 1777794309010.953,  "amount": 0.5,   "categoryId": "transport",     "date": "2026-05-03", "note": "",                   "type": "expense" },
  { "id": 1777727151638.15,   "amount": 30,    "categoryId": "health",        "date": "2026-04-26", "note": "Məşq",              "type": "expense" },
  { "id": 1777727128149.4734, "amount": 18,    "categoryId": "subscriptions", "date": "2026-04-30", "note": "Nar (50 GB)",        "type": "expense" },
  { "id": 1777727049808.2036, "amount": 3.58,  "categoryId": "transport",     "date": "2026-04-30", "note": "",                   "type": "expense" },
  { "id": 1777727004315.7512, "amount": 0.9,   "categoryId": "transport",     "date": "2026-05-01", "note": "",                   "type": "expense" },
  { "id": 1777726984240.8223, "amount": 1,     "categoryId": "transport",     "date": "2026-05-02", "note": "",                   "type": "expense" },
  { "id": 1777726971550.662,  "amount": 5,     "categoryId": "food",          "date": "2026-05-01", "note": "KFC Ganjlik (XLQ)", "type": "expense" },
  { "id": 1777726943733.0505, "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-01", "note": "",                   "type": "expense" },
  { "id": 1777726855960.0981, "amount": 0.6,   "categoryId": "transport",     "date": "2026-05-01", "note": "",                   "type": "expense" },
];

const CATEGORIES = [
  { id: "food",          name: "Food",          color: "#FF9500" },
  { id: "transport",     name: "Transport",     color: "#007AFF" },
  { id: "entertainment", name: "Entertainment", color: "#AF52DE" },
  { id: "health",        name: "Health",        color: "#34C759" },
  { id: "shopping",      name: "Shopping",      color: "#FF2D55" },
  { id: "subscriptions", name: "Subscriptions", color: "#5AC8FA" },
  { id: "savings",       name: "Savings",       color: "#30B0C7" },
];

const STORAGE_KEY = "expense_ledger_v4";
const CURRENCY    = "₼";
const genId       = () => Date.now() + Math.random();
const todayStr    = () => new Date().toISOString().slice(0, 10);

function load() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}
function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function fmt(n) {
  return parseFloat(Math.abs(n).toFixed(2)).toLocaleString("en", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}
function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtMonth(m) {
  return new Date(m + "-02").toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── SF-Symbol-style SVG icons ────────────────────────────────────────────────
const Icon = {
  plus: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5.5 4.5l.5 8h4l.5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  gear: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 1.5v1.25M8 13.25V14.5M14.5 8h-1.25M2.75 8H1.5M12.45 3.55l-.88.88M4.43 11.57l-.88.88M12.45 12.45l-.88-.88M4.43 4.43l-.88-.88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 12.5l3.5-4 3 2.5 3.5-5 2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v9M5 8l3 3 3-3M2.5 13.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// ─── Category icon map ────────────────────────────────────────────────────────
function CatIcon({ id, size = 20, color = "#fff" }) {
  const icons = {
    food: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <path d="M7 2v5a3 3 0 0 0 3 3 3 3 0 0 0 3-3V2M10 10v8M4 6h2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    transport: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <rect x="3" y="6" width="14" height="9" rx="2" stroke={color} strokeWidth="1.5"/>
        <path d="M3 10h14M6.5 15v1.5M13.5 15v1.5M7 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="6.5" cy="12.5" r="1" fill={color}/>
        <circle cx="13.5" cy="12.5" r="1" fill={color}/>
      </svg>
    ),
    entertainment: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5"/>
        <path d="M8 7.5l5 2.5-5 2.5V7.5Z" fill={color}/>
      </svg>
    ),
    health: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <path d="M10 17S3 12.5 3 7.5a4 4 0 0 1 7-2.6A4 4 0 0 1 17 7.5C17 12.5 10 17 10 17Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    shopping: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14l-1.5 8.5a1 1 0 0 1-1 .5H5.5a1 1 0 0 1-1-.5L3 5Z" stroke={color} strokeWidth="1.5"/>
        <path d="M7 5V4a3 3 0 0 1 6 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    subscriptions: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <rect x="3" y="5" width="14" height="10" rx="2" stroke={color} strokeWidth="1.5"/>
        <path d="M3 8.5h14" stroke={color} strokeWidth="1.5"/>
        <circle cx="6.5" cy="12" r="1" fill={color}/>
      </svg>
    ),
    savings: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <path d="M10 3a7 7 0 1 0 4.95 11.95" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 7v3l2 1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 12v5M17.5 14.5h-5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  };
  return icons[id] || (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="6" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ w = "100%", h = 16, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg,#E5E5EA 25%,#F2F2F7 50%,#E5E5EA 75%)",
      backgroundSize: "600px 100%",
      animation: "shimmer 1.4s infinite linear",
      flexShrink: 0,
    }} />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={{
      position: "fixed", bottom: 32, left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(30,30,32,0.92)",
      backdropFilter: "blur(12px)",
      color: "#fff", padding: "11px 22px",
      borderRadius: 20, fontSize: 14, fontWeight: 500,
      zIndex: 9999, whiteSpace: "nowrap",
      animation: "toastIn .22s cubic-bezier(.25,1,.5,1)",
    }}>{msg}</div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ onAdd, onClose }) {
  const [type,   setType]   = useState("expense");
  const [amount, setAmount] = useState("");
  const [catId,  setCatId]  = useState("food");
  const [note,   setNote]   = useState("");
  const [date,   setDate]   = useState(todayStr());

  function submit() {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    onAdd({ id: genId(), amount: n, categoryId: catId, note, date, type });
  }

  return (
    <div style={m.backdrop} onClick={onClose}>
      <div style={m.sheet} onClick={e => e.stopPropagation()}>
        <div style={m.handle} />

        {/* Type toggle */}
        <div style={m.seg}>
          {["expense","income"].map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ ...m.segBtn, background: type === t ? "#fff" : "transparent", color: type === t ? "#000" : "#8E8E93", boxShadow: type === t ? "0 1px 4px rgba(0,0,0,.12)" : "none" }}>
              {t === "expense" ? "Expense" : "Income"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div style={{ textAlign: "center", margin: "24px 0 20px" }}>
          <span style={{ fontSize: 13, color: "#8E8E93", fontWeight: 500 }}>{CURRENCY}</span>
          <input
            autoFocus type="number" placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 48, fontWeight: 700, color: "#000", width: "100%", textAlign: "center", marginTop: 4 }}
          />
        </div>

        {/* Fields */}
        <div style={m.fieldGroup}>
          <div style={m.fieldRow}>
            <span style={m.fieldLabel}>Note</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" style={m.fieldInput} />
          </div>
          <div style={m.divider} />
          <div style={m.fieldRow}>
            <span style={m.fieldLabel}>Category</span>
            <select value={catId} onChange={e => setCatId(e.target.value)} style={{ ...m.fieldInput, textAlign: "right" }}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={m.divider} />
          <div style={m.fieldRow}>
            <span style={m.fieldLabel}>Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={m.fieldInput} />
          </div>
        </div>

        <button onClick={submit} style={m.addBtn}>Add {type}</button>
        <button onClick={onClose} style={m.cancelBtn}>Cancel</button>
      </div>
    </div>
  );
}

const m = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  sheet: { background: "#F2F2F7", borderRadius: "20px 20px 0 0", padding: "12px 20px 40px", width: "100%", maxWidth: 560, animation: "sheetIn .3s cubic-bezier(.25,1,.5,1)" },
  handle: { width: 36, height: 4, background: "#C7C7CC", borderRadius: 2, margin: "0 auto 20px" },
  seg: { display: "flex", background: "#E5E5EA", borderRadius: 10, padding: 3, marginBottom: 4 },
  segBtn: { flex: 1, border: "none", borderRadius: 8, padding: "7px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .2s cubic-bezier(.25,1,.5,1)" },
  fieldGroup: { background: "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 12 },
  fieldRow: { display: "flex", alignItems: "center", padding: "13px 16px", gap: 12 },
  fieldLabel: { fontSize: 15, color: "#000", fontWeight: 400, flexShrink: 0, minWidth: 80 },
  fieldInput: { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "#3C3C43", textAlign: "right", fontFamily: "inherit" },
  divider: { height: 1, background: "#F2F2F7", marginLeft: 16 },
  addBtn: { width: "100%", background: "#007AFF", color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontSize: 16, fontWeight: 600, cursor: "pointer", marginBottom: 10, fontFamily: "inherit", transition: "opacity .15s" },
  cancelBtn: { width: "100%", background: "#fff", color: "#007AFF", border: "none", borderRadius: 12, padding: "15px", fontSize: 16, fontWeight: 400, cursor: "pointer", fontFamily: "inherit" },
};

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ expenses, onUpdate, onClose, showToast }) {
  const [budget, setBudget] = useState("");
  const [importTxt, setImportTxt] = useState("");

  function doExportJSON() {
    const blob = new Blob([JSON.stringify({ expenses }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "expense-ledger-backup.json"; a.click();
  }
  function doExportCSV() {
    const rows = [["Date","Amount","Category","Note","Type"]];
    expenses.forEach(e => rows.push([e.date, e.amount, e.categoryId, e.note || "", e.type || "expense"]));
    const blob = new Blob([rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "expenses.csv"; a.click();
  }
  function doImport() {
    try {
      const data = JSON.parse(importTxt);
      const incoming = data.expenses || (Array.isArray(data) ? data : null);
      if (!incoming) { showToast("Invalid format"); return; }
      onUpdate(incoming);
      showToast(`Imported ${incoming.length} entries`);
      onClose();
    } catch { showToast("Could not parse JSON"); }
  }

  return (
    <div style={m.backdrop} onClick={onClose}>
      <div style={{ ...m.sheet, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={m.handle} />
        <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Settings</p>

        <p style={st.groupLabel}>Data</p>
        <div style={st.group}>
          {[
            { label: "Export JSON", icon: Icon.download, action: doExportJSON },
            { label: "Export CSV",  icon: Icon.download, action: doExportCSV  },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <button onClick={item.action} style={st.settingsRow}>
                <span style={st.settingsRowIcon}>{item.icon}</span>
                <span style={st.settingsRowLabel}>{item.label}</span>
              </button>
              {i < arr.length - 1 && <div style={st.innerDivider} />}
            </div>
          ))}
        </div>

        <p style={st.groupLabel}>Import / Restore</p>
        <div style={{ ...st.group, padding: 14 }}>
          <textarea
            value={importTxt} onChange={e => setImportTxt(e.target.value)}
            placeholder='Paste your JSON backup here, then tap Import…'
            style={{ width: "100%", height: 100, border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 13, color: "#3C3C43", fontFamily: "monospace", boxSizing: "border-box" }}
          />
          <button onClick={doImport} style={{ ...m.addBtn, marginTop: 8, marginBottom: 0 }}>Import</button>
        </div>

        <p style={{ fontSize: 12, color: "#8E8E93", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
          Data is stored locally in this browser.{"\n"}No servers, no tracking.
        </p>
        <button onClick={onClose} style={{ ...m.cancelBtn, marginTop: 12 }}>Done</button>
      </div>
    </div>
  );
}

const st = {
  group: { background: "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 8 },
  groupLabel: { fontSize: 13, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8, marginTop: 20, paddingLeft: 4 },
  settingsRow: { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  settingsRowIcon: { color: "#007AFF", display: "flex" },
  settingsRowLabel: { fontSize: 15, color: "#000" },
  innerDivider: { height: 1, background: "#F2F2F7", marginLeft: 16 },
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [expenses, setExpenses] = useState(() => load()?.expenses ?? REAL_EXPENSES);
  const [tab,      setTab]      = useState("overview");
  const [modal,    setModal]    = useState(null);
  const [month,    setMonth]    = useState(todayStr().slice(0, 7));
  const [toast,    setToast]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [filterCat,setFilterCat]= useState(null);
  const [search,   setSearch]   = useState("");

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  useEffect(() => { save({ expenses }); }, [expenses]);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  const addExpense = useCallback(exp => {
    setExpenses(p => [exp, ...p]);
    showToast(exp.type === "income" ? "Income recorded" : "Expense recorded");
    setModal(null);
  }, []);

  const deleteExpense = useCallback(id => {
    setExpenses(p => p.filter(e => e.id !== id));
    showToast("Entry removed");
  }, []);

  const importExpenses = useCallback(incoming => {
    setExpenses(incoming);
  }, []);

  // ── Computed ───────────────────────────────────────────────────────────────
  const monthExp = useMemo(() =>
    expenses.filter(e => e.date.startsWith(month)), [expenses, month]);

  const totalSpent = useMemo(() =>
    monthExp.filter(e => e.type !== "income").reduce((s, e) => s + e.amount, 0), [monthExp]);

  const totalIncome = useMemo(() =>
    monthExp.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0), [monthExp]);

  const catBreakdown = useMemo(() =>
    CATEGORIES.map(cat => {
      const spent = monthExp.filter(e => e.categoryId === cat.id && e.type !== "income").reduce((s, e) => s + e.amount, 0);
      return { ...cat, spent };
    }).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent),
  [monthExp]);

  const allMonths = useMemo(() => {
    const months = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort().reverse();
    if (!months.includes(month)) months.unshift(month);
    return months;
  }, [expenses, month]);

  const filteredExp = useMemo(() =>
    monthExp
      .filter(e => !filterCat || e.categoryId === filterCat)
      .filter(e => !search || (e.note && e.note.toLowerCase().includes(search.toLowerCase())) || e.categoryId.includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date)),
  [monthExp, filterCat, search]);

  const TABS = [
    { id: "overview",  label: "Overview"  },
    { id: "ledger",    label: "Ledger"    },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={a.root}>

        {toast && <Toast msg={toast} />}
        {modal === "add"      && <AddModal onAdd={addExpense} onClose={() => setModal(null)} />}
        {modal === "settings" && <SettingsModal expenses={expenses} onUpdate={importExpenses} onClose={() => setModal(null)} showToast={showToast} />}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={a.header}>
          <div style={a.headerInner}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={a.appTitle}>Expense Ledger</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={a.iconBtn} onClick={() => setModal("settings")} title="Settings">
                  {Icon.gear}
                </button>
                <button style={a.addBtn} onClick={() => setModal("add")}>
                  {Icon.plus} <span>Add</span>
                </button>
              </div>
            </div>

            {/* Segmented control */}
            <div style={a.segWrap}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ ...a.segBtn, background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#000" : "#8E8E93", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.12)" : "none" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Month picker ────────────────────────────────────────────────── */}
        <div style={a.monthBar}>
          <div style={a.monthBarInner}>
            <select value={month} onChange={e => setMonth(e.target.value)} style={a.monthSelect}>
              {allMonths.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
            <span style={{ fontSize: 13, color: "#8E8E93" }}>{monthExp.length} entries</span>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <main style={a.main}>

          {/* ══════════ OVERVIEW ══════════ */}
          {tab === "overview" && (
            <div key="overview" style={a.screenWrap}>

              {/* Balance card */}
              <div style={a.balanceCard}>
                <p style={a.balanceLabel}>Total spent</p>
                {loading
                  ? <Sk w={180} h={52} r={12} />
                  : <p style={a.balanceAmount}>{CURRENCY}{fmt(totalSpent)}</p>
                }
                {!loading && totalIncome > 0 && (
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", marginTop: 6 }}>
                    Income this month: {CURRENCY}{fmt(totalIncome)}
                  </p>
                )}
              </div>

              {/* Stats row */}
              <div style={a.statsRow}>
                {loading
                  ? [1,2,3].map(i => <div key={i} style={a.statCard}><Sk w={60} h={12} r={6} /><Sk w={80} h={28} r={8} style={{ marginTop: 8 }} /></div>)
                  : [
                      { label: "Transactions", value: monthExp.length },
                      { label: "Categories",   value: catBreakdown.length },
                      { label: "Daily avg",    value: `${CURRENCY}${fmt(totalSpent / Math.max(1, new Set(monthExp.map(e => e.date)).size))}` },
                    ].map(s => (
                      <div key={s.label} style={a.statCard}>
                        <p style={a.statLabel}>{s.label}</p>
                        <p style={a.statValue}>{s.value}</p>
                      </div>
                    ))
                }
              </div>

              {/* Category breakdown */}
              {catBreakdown.length > 0 && (
                <div style={a.card}>
                  <p style={a.cardTitle}>By category</p>
                  {loading
                    ? [1,2,3].map(i => <div key={i} style={{ display:"flex",gap:12,alignItems:"center",padding:"10px 0" }}><Sk w={36} h={36} r={10} /><div style={{flex:1}}><Sk w="55%" h={13} r={6} /><Sk w="35%" h={10} r={5} style={{marginTop:6}} /></div><Sk w={50} h={13} r={6} /></div>)
                    : catBreakdown.map((cat, i) => {
                        const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                        return (
                          <div key={cat.id}>
                            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0" }}>
                              <div style={{ width:36, height:36, borderRadius:10, background:cat.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                <CatIcon id={cat.id} size={18} color="#fff" />
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
                                  <span style={{ fontSize:15, fontWeight:500, color:"#000" }}>{cat.name}</span>
                                  <span style={{ fontSize:15, fontWeight:600, color:"#000" }}>{CURRENCY}{fmt(cat.spent)}</span>
                                </div>
                                <div style={{ height:4, background:"#F2F2F7", borderRadius:2, overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${pct}%`, background:cat.color, borderRadius:2, transition:"width .6s cubic-bezier(.25,1,.5,1)" }} />
                                </div>
                              </div>
                            </div>
                            {i < catBreakdown.length - 1 && <div style={a.innerDivider} />}
                          </div>
                        );
                      })
                  }
                </div>
              )}

              {/* Recent transactions */}
              <div style={a.card}>
                <p style={a.cardTitle}>Recent</p>
                {loading
                  ? [1,2,3,4].map(i => (
                      <div key={i} style={{ display:"flex",gap:12,alignItems:"center",padding:"10px 0" }}>
                        <Sk w={40} h={40} r={12} />
                        <div style={{flex:1}}><Sk w="60%" h={14} r={6} /><Sk w="40%" h={11} r={5} style={{marginTop:5}} /></div>
                        <Sk w={55} h={14} r={6} />
                      </div>
                    ))
                  : expenses.slice(0, 10).map((exp, i, arr) => {
                      const cat = CATEGORIES.find(c => c.id === exp.categoryId);
                      const isIncome = exp.type === "income";
                      return (
                        <div key={exp.id}>
                          <div style={a.txRow}>
                            <div style={{ ...a.txIcon, background: cat?.color ?? "#8E8E93" }}>
                              <CatIcon id={exp.categoryId} size={18} color="#fff" />
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={a.txNote}>{exp.note || cat?.name || "—"}</p>
                              <p style={a.txMeta}>{cat?.name} · {fmtDate(exp.date)}</p>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:15, fontWeight:600, color: isIncome ? "#34C759" : "#000" }}>
                                {isIncome ? "+" : "−"}{CURRENCY}{fmt(exp.amount)}
                              </span>
                              <button onClick={() => { if (window.confirm("Remove this entry?")) deleteExpense(exp.id); }} style={a.deleteBtn}>
                                {Icon.trash}
                              </button>
                            </div>
                          </div>
                          {i < arr.length - 1 && <div style={a.innerDivider} />}
                        </div>
                      );
                    })
                }
              </div>
            </div>
          )}

          {/* ══════════ LEDGER ══════════ */}
          {tab === "ledger" && (
            <div key="ledger" style={a.screenWrap}>

              {/* Search */}
              <div style={a.searchCard}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color:"#8E8E93", flexShrink:0 }}>
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search entries…"
                  style={{ border:"none", outline:"none", background:"transparent", fontSize:15, flex:1, fontFamily:"inherit", color:"#000" }}
                />
                {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", color:"#8E8E93", cursor:"pointer", display:"flex" }}>{Icon.close}</button>}
              </div>

              {/* Category filters */}
              <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
                <button
                  onClick={() => setFilterCat(null)}
                  style={{ ...a.pill, background: !filterCat ? "#000" : "#fff", color: !filterCat ? "#fff" : "#000" }}>
                  All
                </button>
                {CATEGORIES.map(cat => (
                  <button key={cat.id}
                    onClick={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
                    style={{ ...a.pill, background: filterCat === cat.id ? cat.color : "#fff", color: filterCat === cat.id ? "#fff" : "#000" }}>
                    {cat.name}
                  </button>
                ))}
              </div>

              {filteredExp.length === 0
                ? (
                  <div style={a.empty}>
                    <p style={{ fontSize:17, fontWeight:600, color:"#3C3C43", marginBottom:6 }}>No entries</p>
                    <p style={{ fontSize:14, color:"#8E8E93" }}>Try a different filter or add a new entry.</p>
                  </div>
                )
                : (
                  <div style={a.card}>
                    {filteredExp.map((exp, i, arr) => {
                      const cat = CATEGORIES.find(c => c.id === exp.categoryId);
                      const isIncome = exp.type === "income";
                      return (
                        <div key={exp.id}>
                          <div style={a.txRow}>
                            <div style={{ ...a.txIcon, background: cat?.color ?? "#8E8E93" }}>
                              <CatIcon id={exp.categoryId} size={18} color="#fff" />
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={a.txNote}>{exp.note || cat?.name || "—"}</p>
                              <p style={a.txMeta}>{cat?.name} · {fmtDate(exp.date)}</p>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:15, fontWeight:600, color: isIncome ? "#34C759" : "#000" }}>
                                {isIncome ? "+" : "−"}{CURRENCY}{fmt(exp.amount)}
                              </span>
                              <button onClick={() => { if (window.confirm("Remove this entry?")) deleteExpense(exp.id); }} style={a.deleteBtn}>
                                {Icon.trash}
                              </button>
                            </div>
                          </div>
                          {i < arr.length - 1 && <div style={a.innerDivider} />}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ══════════ ANALYTICS ══════════ */}
          {tab === "analytics" && (
            <div key="analytics" style={a.screenWrap}>

              {/* Summary cards */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                {[
                  { label:"Spent",    value:`${CURRENCY}${fmt(totalSpent)}`,               color:"#FF3B30" },
                  { label:"Income",   value:`${CURRENCY}${fmt(totalIncome)}`,              color:"#34C759" },
                  { label:"Net",      value:`${totalIncome >= totalSpent ? "+" : "−"}${CURRENCY}${fmt(Math.abs(totalIncome - totalSpent))}`, color: totalIncome >= totalSpent ? "#34C759" : "#FF3B30" },
                  { label:"Entries",  value: monthExp.length,                              color:"#007AFF" },
                ].map(card => (
                  <div key={card.label} style={a.card}>
                    <p style={{ fontSize:13, color:"#8E8E93", marginBottom:6, fontWeight:500 }}>{card.label}</p>
                    <p style={{ fontSize:22, fontWeight:700, color:card.color }}>{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              {catBreakdown.length > 0 && (
                <div style={a.card}>
                  <p style={a.cardTitle}>Spending breakdown</p>
                  {catBreakdown.map((cat, i) => {
                    const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                    return (
                      <div key={cat.id} style={{ marginBottom: i < catBreakdown.length - 1 ? 16 : 0 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:10, height:10, borderRadius:"50%", background:cat.color, flexShrink:0 }} />
                            <span style={{ fontSize:14, fontWeight:500, color:"#000" }}>{cat.name}</span>
                          </div>
                          <span style={{ fontSize:14, fontWeight:600, color:"#000" }}>
                            {CURRENCY}{fmt(cat.spent)} <span style={{ fontSize:12, color:"#8E8E93", fontWeight:400 }}>({Math.round(pct)}%)</span>
                          </span>
                        </div>
                        <div style={{ height:6, background:"#F2F2F7", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:cat.color, borderRadius:3, transition:"width .7s cubic-bezier(.25,1,.5,1)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Month history */}
              <div style={a.card}>
                <p style={a.cardTitle}>Month history</p>
                {allMonths.slice(0, 6).map((m, i, arr) => {
                  const mSpent = expenses.filter(e => e.date.startsWith(m) && e.type !== "income").reduce((s, e) => s + e.amount, 0);
                  const mInc   = expenses.filter(e => e.date.startsWith(m) && e.type === "income").reduce((s, e) => s + e.amount, 0);
                  const count  = expenses.filter(e => e.date.startsWith(m)).length;
                  return (
                    <div key={m}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0" }}
                        onClick={() => { setMonth(m); setTab("ledger"); }}>
                        <div>
                          <p style={{ fontSize:15, fontWeight:500, color:"#000" }}>{fmtMonth(m)}</p>
                          <p style={{ fontSize:13, color:"#8E8E93", marginTop:2 }}>{count} entries</p>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <p style={{ fontSize:15, fontWeight:600, color:"#000" }}>{CURRENCY}{fmt(mSpent)}</p>
                          {mInc > 0 && <p style={{ fontSize:12, color:"#34C759", marginTop:2 }}>+{CURRENCY}{fmt(mInc)}</p>}
                        </div>
                      </div>
                      {i < arr.length - 1 && <div style={a.innerDivider} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #F2F2F7; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  button { font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  select { -webkit-appearance: none; appearance: none; }
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
  ::-webkit-scrollbar { display: none; }

  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes sheetIn {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes screenIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  * { transition: background 0.3s cubic-bezier(0.25,1,0.5,1), color 0.3s cubic-bezier(0.25,1,0.5,1), box-shadow 0.3s cubic-bezier(0.25,1,0.5,1), opacity 0.3s cubic-bezier(0.25,1,0.5,1); }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────
const a = {
  root: { minHeight: "100vh", background: "#F2F2F7", color: "#000" },

  header: { background: "rgba(242,242,247,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid rgba(0,0,0,.08)" },
  headerInner: { maxWidth: 640, margin: "0 auto", padding: "16px 20px 12px" },
  appTitle: { fontSize: 17, fontWeight: 700, color: "#000", letterSpacing: "-.02em" },

  iconBtn: { background: "rgba(0,0,0,.06)", border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#007AFF" },
  addBtn:  { display: "flex", alignItems: "center", gap: 6, background: "#007AFF", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 15, fontWeight: 600, cursor: "pointer" },

  segWrap: { display: "flex", background: "rgba(0,0,0,.06)", borderRadius: 10, padding: 3, gap: 2 },
  segBtn:  { flex: 1, border: "none", borderRadius: 8, padding: "7px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "-.01em" },

  monthBar:      { background: "rgba(242,242,247,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,.06)", position: "sticky", top: 82, zIndex: 90 },
  monthBarInner: { maxWidth: 640, margin: "0 auto", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  monthSelect:   { border: "none", outline: "none", background: "transparent", fontSize: 15, fontWeight: 600, color: "#007AFF", cursor: "pointer" },

  main:       { maxWidth: 640, margin: "0 auto", padding: "20px 20px 80px" },
  screenWrap: { display: "flex", flexDirection: "column", gap: 16, animation: "screenIn .25s cubic-bezier(.25,1,.5,1)" },

  balanceCard:   { background: "linear-gradient(135deg,#007AFF 0%,#0055D4 100%)", borderRadius: 20, padding: "28px 24px", color: "#fff" },
  balanceLabel:  { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 },
  balanceAmount: { fontSize: 48, fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1 },

  statsRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  statCard: { background: "#fff", borderRadius: 16, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 12, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".04em" },
  statValue: { fontSize: 22, fontWeight: 700, color: "#000", letterSpacing: "-.02em" },

  card:         { background: "#fff", borderRadius: 16, padding: "16px" },
  cardTitle:    { fontSize: 13, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 },
  innerDivider: { height: 1, background: "#F2F2F7", margin: "0 -16px", marginLeft: 52 },

  txRow:    { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: "default" },
  txIcon:   { width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  txNote:   { fontSize: 15, fontWeight: 500, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  txMeta:   { fontSize: 13, color: "#8E8E93", marginTop: 2 },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", color: "#FF3B30", display: "flex", padding: 4, borderRadius: 6, opacity: 0.6 },

  searchCard: { background: "#fff", borderRadius: 12, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 },

  pill: { flexShrink: 0, border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },

  empty: { textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16 },
};
