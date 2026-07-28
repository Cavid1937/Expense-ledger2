import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────
const REAL_EXPENSES = [
  { id: 1782068705462.74, amount: 1,     categoryId: "food",          date: "2026-06-21", note: "CYHN obyketi",       type: "expense" },
  { id: 1782068690416.80, amount: 0.5,   categoryId: "transport",     date: "2026-06-21", note: "",                   type: "expense" },
  { id: 1782068682536.06, amount: 2,     categoryId: "food",          date: "2026-06-21", note: "CPS+KL",             type: "expense" },
  { id: 1782068643389.33, amount: 1,     categoryId: "transport",     date: "2026-06-21", note: "+Zkr",               type: "expense" },
  { id: 1782068617942.72, amount: 0.6,   categoryId: "transport",     date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1782068602519.27, amount: 0.9,   categoryId: "transport",     date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1782068551310.64, amount: 1.7,   categoryId: "entertainment", date: "2026-06-19", note: "PS blur",            type: "expense" },
  { id: 1782068528326.22, amount: 2.5,   categoryId: "food",          date: "2026-06-19", note: "Seyidin dönəri",    type: "expense" },
  { id: 1782068504276.09, amount: 0.9,   categoryId: "food",          date: "2026-06-19", note: "Mirinda",            type: "expense" },
  { id: 1782068442516.28, amount: 2.7,   categoryId: "food",          date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1782068421898.74, amount: 0.6,   categoryId: "transport",     date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1782068411728.17, amount: 1,     categoryId: "transport",     date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1781265813419.83, amount: 0.9,   categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265806497.59, amount: 0.6,   categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265794615.45, amount: 22,    categoryId: "entertainment", date: "2026-06-11", note: "SCTR",               type: "expense" },
  { id: 1781265704305.70, amount: 0.6,   categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265695987.14, amount: 0.54,  categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265662553.55, amount: 14.83, categoryId: "food",          date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265555573.18, amount: 1,     categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1780737137429.97, amount: 5,     categoryId: "transport",     date: "2026-06-05", note: "",                   type: "expense" },
  { id: 1780724491697.74, amount: 3,     categoryId: "food",          date: "2026-06-05", note: "",                   type: "expense" },
  { id: 1780724485096.06, amount: 1.2,   categoryId: "food",          date: "2026-06-05", note: "",                   type: "expense" },
  { id: 1780724467274.84, amount: 30,    categoryId: "health",        date: "2026-06-05", note: "",                   type: "expense" },
  { id: 1780488739967.92, amount: 0.6,   categoryId: "transport",     date: "2026-06-03", note: "",                   type: "expense" },
  { id: 1780488711851.94, amount: 18.5,  categoryId: "food",          date: "2026-06-02", note: "",                   type: "expense" },
  { id: 1780488682884.72, amount: 4,     categoryId: "food",          date: "2026-06-02", note: "DNR",                type: "expense" },
  { id: 1780488665223.76, amount: 0.6,   categoryId: "transport",     date: "2026-06-03", note: "",                   type: "expense" },
  { id: 1780488658604.48, amount: 0.6,   categoryId: "transport",     date: "2026-06-02", note: "",                   type: "expense" },
  { id: 1780488640982.37, amount: 2,     categoryId: "transport",     date: "2026-06-02", note: "",                   type: "expense" },
  { id: 1780165976772.54, amount: 11,    categoryId: "food",          date: "2026-05-30", note: "CLMİM",              type: "expense" },
  { id: 1779824679196.06, amount: 1,     categoryId: "transport",     date: "2026-05-26", note: "",                   type: "expense" },
  { id: 1779824673208.60, amount: 0.54,  categoryId: "transport",     date: "2026-05-26", note: "",                   type: "expense" },
  { id: 1779824662351.54, amount: 0.5,   categoryId: "transport",     date: "2026-05-26", note: "",                   type: "expense" },
  { id: 1779824654011.05, amount: 0.9,   categoryId: "transport",     date: "2026-05-26", note: "",                   type: "expense" },
  { id: 1779824633665.26, amount: 7.24,  categoryId: "food",          date: "2026-05-26", note: "VIP",                type: "expense" },
  { id: 1779623148541.08, amount: 7,     categoryId: "food",          date: "2026-05-19", note: "VİP",                type: "expense" },
  { id: 1779623095257.60, amount: 18.33, categoryId: "food",          date: "2026-05-21", note: "ZFTGL",              type: "expense" },
  { id: 1779111889908.78, amount: 5.29,  categoryId: "shopping",      date: "2026-05-18", note: "DDRNT",              type: "expense" },
  { id: 1779021295713.72, amount: 1.4,   categoryId: "food",          date: "2026-05-17", note: "",                   type: "expense" },
  { id: 1779021286760.05, amount: 1,     categoryId: "transport",     date: "2026-05-17", note: "",                   type: "expense" },
  { id: 1779021277002.81, amount: 8.5,   categoryId: "food",          date: "2026-05-17", note: "MC 28",              type: "expense" },
  { id: 1778776123794.96, amount: 3.5,   categoryId: "food",          date: "2026-05-14", note: "",                   type: "expense" },
  { id: 1778776110103.95, amount: 1.5,   categoryId: "food",          date: "2026-05-14", note: "",                   type: "expense" },
  { id: 1778776095800.48, amount: 1,     categoryId: "transport",     date: "2026-05-14", note: "",                   type: "expense" },
  { id: 1778616439110.68, amount: 0.6,   categoryId: "transport",     date: "2026-05-12", note: "",                   type: "expense" },
  { id: 1778616430727.19, amount: 0.9,   categoryId: "transport",     date: "2026-05-12", note: "",                   type: "expense" },
  { id: 1778616420099.68, amount: 0.6,   categoryId: "transport",     date: "2026-05-12", note: "",                   type: "expense" },
  { id: 1778616401578.78, amount: 0.6,   categoryId: "transport",     date: "2026-05-11", note: "",                   type: "expense" },
  { id: 1778616385804.83, amount: 1,     categoryId: "transport",     date: "2026-05-11", note: "",                   type: "expense" },
  { id: 1778420388011.90, amount: 29,    categoryId: "entertainment", date: "2026-05-09", note: "",                   type: "expense" },
  { id: 1778166575873.49, amount: 0.6,   categoryId: "transport",     date: "2026-05-07", note: "",                   type: "expense" },
  { id: 1778166564384.51, amount: 1,     categoryId: "transport",     date: "2026-05-07", note: "",                   type: "expense" },
  { id: 1778166553394.48, amount: 0.6,   categoryId: "transport",     date: "2026-05-07", note: "",                   type: "expense" },
  { id: 1778064670006.10, amount: 1,     categoryId: "transport",     date: "2026-05-06", note: "",                   type: "expense" },
  { id: 1778064657792.79, amount: 0.6,   categoryId: "food",          date: "2026-05-05", note: "🧃",                 type: "expense" },
  { id: 1778012576604.04, amount: 0.9,   categoryId: "transport",     date: "2026-05-05", note: "",                   type: "expense" },
  { id: 1778012570684.97, amount: 0.6,   categoryId: "transport",     date: "2026-05-05", note: "",                   type: "expense" },
  { id: 1778012563282.15, amount: 0.5,   categoryId: "transport",     date: "2026-05-05", note: "",                   type: "expense" },
  { id: 1778012550861.06, amount: 2,     categoryId: "food",          date: "2026-05-05", note: "Dondurma",           type: "expense" },
  { id: 1777912768873.35, amount: 6,     categoryId: "food",          date: "2026-05-04", note: "Mkn",                type: "expense" },
  { id: 1777905975470.19, amount: 0.9,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777905968444.12, amount: 0.6,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777905960452.85, amount: 0.6,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777905953591.33, amount: 1.7,   categoryId: "food",          date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777881768876.87, amount: 0.5,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777881748382.56, amount: 0.5,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777881735695.07, amount: 1,     categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777843657236.15, amount: 5,     categoryId: "food",          date: "2026-05-03", note: "Miami",              type: "expense" },
  { id: 1777798491880.28, amount: 0.5,   categoryId: "transport",     date: "2026-05-03", note: "",                   type: "expense" },
  { id: 1777794309010.95, amount: 0.5,   categoryId: "transport",     date: "2026-05-03", note: "",                   type: "expense" },
  { id: 1777727151638.15, amount: 30,    categoryId: "health",        date: "2026-04-26", note: "Məşq",              type: "expense" },
  { id: 1777727128149.47, amount: 18,    categoryId: "subscriptions", date: "2026-04-30", note: "Nar (50 GB)",        type: "expense" },
  { id: 1777727049808.20, amount: 3.58,  categoryId: "transport",     date: "2026-04-30", note: "",                   type: "expense" },
  { id: 1777727004315.75, amount: 0.9,   categoryId: "transport",     date: "2026-05-01", note: "",                   type: "expense" },
  { id: 1777726984240.82, amount: 1,     categoryId: "transport",     date: "2026-05-02", note: "",                   type: "expense" },
  { id: 1777726971550.66, amount: 5,     categoryId: "food",          date: "2026-05-01", note: "KFC Ganjlik (XLQ)", type: "expense" },
  { id: 1777726943733.05, amount: 0.6,   categoryId: "transport",     date: "2026-05-01", note: "",                   type: "expense" },
  { id: 1777726855960.10, amount: 0.6,   categoryId: "transport",     date: "2026-05-01", note: "",                   type: "expense" },
];

const CATS = {
  food:          { name: "Food & Dining",   accent: "#E8956D", glow: "rgba(232,149,109,0.18)" },
  transport:     { name: "Transport",        accent: "#6D9EE8", glow: "rgba(109,158,232,0.18)" },
  entertainment: { name: "Entertainment",    accent: "#B06DE8", glow: "rgba(176,109,232,0.18)" },
  health:        { name: "Health",           accent: "#6DE8A0", glow: "rgba(109,232,160,0.18)" },
  shopping:      { name: "Shopping",         accent: "#E86D9E", glow: "rgba(232,109,158,0.18)" },
  subscriptions: { name: "Subscriptions",    accent: "#E8D06D", glow: "rgba(232,208,109,0.18)" },
  savings:       { name: "Savings",          accent: "#C9A96E", glow: "rgba(201,169,110,0.18)" },
};

// ─── Category SVG icons ───────────────────────────────────────────────────────
function CatIcon({ id, size = 18 }) {
  const s = { width: size, height: size, display: "block" };
  const icons = {
    food: (
      <svg style={s} viewBox="0 0 18 18" fill="none">
        <path d="M6 2v5a3 3 0 0 0 6 0V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <line x1="9" y1="7" x2="9" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M3 6h2M13 6h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    transport: (
      <svg style={s} viewBox="0 0 18 18" fill="none">
        <rect x="2" y="5" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M2 9h14" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="5.5" cy="14" r="1.5" fill="currentColor"/>
        <circle cx="12.5" cy="14" r="1.5" fill="currentColor"/>
        <path d="M7 5V3.5A.5.5 0 0 1 7.5 3h3a.5.5 0 0 1 .5.5V5" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
    entertainment: (
      <svg style={s} viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="9" y1="2.5" x2="9" y2="7" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="9" y1="11" x2="9" y2="15.5" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="2.5" y1="9" x2="7" y2="9" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="11" y1="9" x2="15.5" y2="9" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
    health: (
      <svg style={s} viewBox="0 0 18 18" fill="none">
        <path d="M9 15.5S2 11.2 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5C16 11.2 9 15.5 9 15.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M6.5 8.5h5M9 6v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    shopping: (
      <svg style={s} viewBox="0 0 18 18" fill="none">
        <path d="M3 4.5h12l-1.5 8a1 1 0 0 1-1 .5H5.5a1 1 0 0 1-1-.5L3 4.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M6.5 4.5V3.5A2.5 2.5 0 0 1 9 1v0a2.5 2.5 0 0 1 2.5 2.5v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    subscriptions: (
      <svg style={s} viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M2 7.5h14" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="5.5" cy="11" r="1" fill="currentColor"/>
        <path d="M8 11h4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    savings: (
      <svg style={s} viewBox="0 0 18 18" fill="none">
        <path d="M9 2a7 7 0 1 0 5 11.74" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M9 5.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M14.5 11.5v4M12.5 13.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  };
  return icons[id] || icons.savings;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "expense_ledger_v4";
const CUR = "₼";
const genId = () => Date.now() + Math.random();
const todayStr = () => new Date().toISOString().slice(0, 10);
function loadState() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function saveState(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }
function fmt(n) { return parseFloat(Math.abs(n).toFixed(2)).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtShort(d) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function fmtMonthLong(m) { return new Date(m + "-02").toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
function fmtDay(d) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
function getCat(id) { return CATS[id] ?? { name: id, accent: "#C9A96E", glow: "rgba(201,169,110,0.18)" }; }

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)", background:"rgba(20,20,24,0.92)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(201,169,110,0.2)", color:"#F0EBE3", padding:"12px 24px", borderRadius:24, fontSize:13, fontWeight:500, letterSpacing:"0.02em", zIndex:9999, whiteSpace:"nowrap", animation:"toastIn .22s cubic-bezier(.16,1,.3,1)" }}>
      {msg}
    </div>
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
    onAdd({ id: genId(), amount: n, categoryId: catId, note: note.trim(), date, type });
  }

  const cat = getCat(catId);

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(8,8,12,0.7)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center", animation:"fadeIn .2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:560, background:"linear-gradient(160deg,#1A1A22 0%,#141418 100%)", border:"1px solid rgba(240,235,227,0.08)", borderBottom:"none", borderRadius:"24px 24px 0 0", padding:"0 24px 48px", animation:"sheetUp .35s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ width:40, height:4, background:"rgba(240,235,227,0.15)", borderRadius:2, margin:"14px auto 24px" }} />

        {/* Type tabs */}
        <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:12, padding:3, marginBottom:28, border:"1px solid rgba(255,255,255,0.06)" }}>
          {["expense","income"].map(t => (
            <button key={t} onClick={() => setType(t)} style={{ flex:1, border:"none", borderRadius:10, padding:"9px 0", fontSize:13, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase", cursor:"pointer", transition:"all .3s cubic-bezier(.16,1,.3,1)", background: type===t ? "rgba(201,169,110,0.18)" : "transparent", color: type===t ? "#C9A96E" : "rgba(240,235,227,0.35)" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase", color:"rgba(240,235,227,0.35)", marginBottom:8 }}>Amount</div>
          <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:6 }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:28, fontWeight:400, color:"rgba(240,235,227,0.4)" }}>{CUR}</span>
            <input autoFocus type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
              style={{ border:"none", outline:"none", background:"transparent", fontFamily:"'DM Mono',monospace", fontSize:56, fontWeight:500, color:"#F0EBE3", width:"auto", maxWidth:220, letterSpacing:"-0.03em", textAlign:"center" }} />
          </div>
        </div>

        {/* Fields */}
        <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:16, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", marginBottom:16 }}>
          {[
            { label:"Note", el: <input value={note} onChange={e => setNote(e.target.value)} placeholder="What was this for?" style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:15, color:"#F0EBE3", textAlign:"right", fontFamily:"inherit" }} /> },
            { label:"Category", el: (
                <select value={catId} onChange={e => setCatId(e.target.value)} style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:15, color:cat.accent, textAlign:"right", fontFamily:"inherit", appearance:"none", WebkitAppearance:"none", cursor:"pointer" }}>
                  {Object.entries(CATS).map(([id, c]) => <option key={id} value={id}>{c.name}</option>)}
                </select>
            )},
            { label:"Date", el: <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:15, color:"rgba(240,235,227,0.6)", textAlign:"right", fontFamily:"inherit", appearance:"none", WebkitAppearance:"none" }} /> },
          ].map(({ label, el }, i) => (
            <div key={label}>
              {i > 0 && <div style={{ height:1, background:"rgba(255,255,255,0.05)", marginLeft:16 }} />}
              <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", gap:12 }}>
                <span style={{ fontSize:14, color:"rgba(240,235,227,0.4)", fontWeight:400, minWidth:80 }}>{label}</span>
                {el}
              </div>
            </div>
          ))}
        </div>

        <button onClick={submit} style={{ width:"100%", background: type==="income" ? "rgba(109,232,160,0.15)" : "rgba(201,169,110,0.15)", color: type==="income" ? "#6DE8A0" : "#C9A96E", border: `1px solid ${type==="income" ? "rgba(109,232,160,0.3)" : "rgba(201,169,110,0.3)"}`, borderRadius:14, padding:"16px", fontSize:15, fontWeight:600, letterSpacing:"0.04em", cursor:"pointer", fontFamily:"inherit", transition:"all .3s cubic-bezier(.16,1,.3,1)", marginBottom:10 }}>
          Record {type}
        </button>
        <button onClick={onClose} style={{ width:"100%", background:"transparent", color:"rgba(240,235,227,0.35)", border:"none", borderRadius:14, padding:"14px", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Settings sheet ───────────────────────────────────────────────────────────
function SettingsSheet({ expenses, onUpdate, onClose, showToast }) {
  const [importText, setImportText] = useState("");

  function exportJSON() {
    const b = new Blob([JSON.stringify({ expenses }, null, 2)], { type:"application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "expense-ledger-backup.json"; a.click();
  }
  function exportCSV() {
    const rows = [["Date","Amount","Category","Note","Type"]];
    expenses.forEach(e => rows.push([e.date, e.amount, e.categoryId, e.note||"", e.type||"expense"]));
    const b = new Blob([rows.map(r => r.map(v=>`"${v}"`).join(",")).join("\n")], { type:"text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "expenses.csv"; a.click();
  }
  function doImport() {
    try {
      const data = JSON.parse(importText);
      const arr = data.expenses ?? (Array.isArray(data) ? data : null);
      if (!arr) { showToast("Invalid format"); return; }
      onUpdate(arr); showToast(`Imported ${arr.length} entries`); onClose();
    } catch { showToast("Could not parse JSON"); }
  }

  const rowStyle = { display:"flex", alignItems:"center", padding:"14px 16px", gap:12, background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit", width:"100%", textAlign:"left" };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(8,8,12,0.7)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:560, background:"linear-gradient(160deg,#1A1A22 0%,#141418 100%)", border:"1px solid rgba(240,235,227,0.08)", borderBottom:"none", borderRadius:"24px 24px 0 0", padding:"0 24px 48px", maxHeight:"80vh", overflowY:"auto", animation:"sheetUp .35s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ width:40, height:4, background:"rgba(240,235,227,0.15)", borderRadius:2, margin:"14px auto 24px" }} />
        <p style={{ fontSize:16, fontWeight:600, color:"#F0EBE3", letterSpacing:"-0.01em", marginBottom:24 }}>Settings</p>

        <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(240,235,227,0.3)", marginBottom:8 }}>Export</p>
        <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", marginBottom:20 }}>
          {[{l:"Export JSON",fn:exportJSON},{l:"Export CSV",fn:exportCSV}].map(({l,fn},i)=>(
            <div key={l}>
              {i>0 && <div style={{height:1,background:"rgba(255,255,255,0.05)"}} />}
              <button onClick={fn} style={{...rowStyle}}>
                <span style={{fontSize:14,color:"#C9A96E",fontWeight:400,flex:1}}>{l}</span>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(240,235,227,0.25)" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>

        <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(240,235,227,0.3)", marginBottom:8 }}>Restore from backup</p>
        <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", padding:14, marginBottom:12 }}>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste your JSON backup here…"
            style={{ width:"100%", height:80, border:"none", outline:"none", resize:"none", background:"transparent", fontSize:12, color:"rgba(240,235,227,0.6)", fontFamily:"monospace", boxSizing:"border-box" }} />
          <button onClick={doImport} style={{ width:"100%", background:"rgba(201,169,110,0.12)", color:"#C9A96E", border:"1px solid rgba(201,169,110,0.25)", borderRadius:10, padding:"12px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginTop:8 }}>
            Import data
          </button>
        </div>
        <p style={{ fontSize:11, color:"rgba(240,235,227,0.25)", textAlign:"center", lineHeight:1.6 }}>Data lives only in this browser. No servers.</p>
        <button onClick={onClose} style={{ width:"100%", background:"transparent", color:"rgba(240,235,227,0.4)", border:"none", padding:"16px", fontSize:15, cursor:"pointer", fontFamily:"inherit", marginTop:8 }}>Done</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [expenses,  setExpenses]  = useState(() => loadState()?.expenses ?? REAL_EXPENSES);
  const [tab,       setTab]       = useState("overview");
  const [modal,     setModal]     = useState(null);
  const [month,     setMonth]     = useState(todayStr().slice(0, 7));
  const [toast,     setToast]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [filterCat, setFilterCat] = useState(null);
  const [prevTab,   setPrevTab]   = useState(null);

  useEffect(() => { saveState({ expenses }); }, [expenses]);

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

  function switchTab(t) { setPrevTab(tab); setTab(t); }

  const allMonths = useMemo(() => {
    const s = new Set(expenses.map(e => e.date.slice(0, 7)));
    const arr = [...s].sort().reverse();
    if (!arr.includes(month)) arr.unshift(month);
    return arr;
  }, [expenses, month]);

  const monthIdx   = allMonths.indexOf(month);
  const monthExp   = useMemo(() => expenses.filter(e => e.date.startsWith(month)), [expenses, month]);
  const totalSpent  = useMemo(() => monthExp.filter(e => e.type !== "income").reduce((s, e) => s + e.amount, 0), [monthExp]);
  const totalIncome = useMemo(() => monthExp.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0), [monthExp]);
  const uniqueDays  = new Set(monthExp.map(e => e.date)).size;
  const dailyAvg    = totalSpent / Math.max(1, uniqueDays);

  const catBreakdown = useMemo(() =>
    Object.entries(CATS).map(([id, c]) => ({
      id, ...c,
      spent: monthExp.filter(e => e.categoryId === id && e.type !== "income").reduce((s, e) => s + e.amount, 0),
    })).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent),
  [monthExp]);

  // Ledger: group by date for timeline
  const groupedByDate = useMemo(() => {
    const filtered = monthExp
      .filter(e => !filterCat || e.categoryId === filterCat)
      .filter(e => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (e.note && e.note.toLowerCase().includes(q)) || e.categoryId.includes(q) || getCat(e.categoryId).name.toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const groups = {};
    filtered.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups).sort(([a],[b]) => b.localeCompare(a));
  }, [monthExp, filterCat, search]);

  const TABS = [
    { id: "overview",  label: "Overview"  },
    { id: "ledger",    label: "Ledger"    },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"#0D0D0F", position:"relative", overflow:"hidden" }}>

        {/* Mesh gradient orbs */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
          <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"60%", paddingBottom:"60%", borderRadius:"50%", background:"radial-gradient(circle, rgba(40,40,80,0.5) 0%, transparent 70%)" }} />
          <div style={{ position:"absolute", top:"30%", right:"-15%", width:"55%", paddingBottom:"55%", borderRadius:"50%", background:"radial-gradient(circle, rgba(60,30,20,0.35) 0%, transparent 70%)" }} />
          <div style={{ position:"absolute", bottom:"-10%", left:"20%", width:"50%", paddingBottom:"50%", borderRadius:"50%", background:"radial-gradient(circle, rgba(20,30,60,0.4) 0%, transparent 70%)" }} />
        </div>

        {toast && <Toast msg={toast} />}
        {modal === "add"      && <AddModal onAdd={addExpense} onClose={() => setModal(null)} />}
        {modal === "settings" && <SettingsSheet expenses={expenses} onUpdate={setExpenses} onClose={() => setModal(null)} showToast={showToast} />}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ position:"sticky", top:0, zIndex:100, background:"rgba(13,13,15,0.75)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:"1px solid rgba(240,235,227,0.06)" }}>
          <div style={{ maxWidth:600, margin:"0 auto", padding:"16px 20px 12px" }}>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(240,235,227,0.3)", marginBottom:3 }}>Personal Finance</div>
                <div style={{ fontSize:20, fontWeight:700, color:"#F0EBE3", letterSpacing:"-0.03em" }}>Ledger</div>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <button onClick={() => setModal("settings")} style={{ background:"rgba(240,235,227,0.06)", border:"1px solid rgba(240,235,227,0.08)", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"rgba(240,235,227,0.5)", transition:"all .3s cubic-bezier(.16,1,.3,1)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1.5v1.2M8 13.3v1.2M14.5 8h-1.2M2.7 8H1.5M12.4 3.6l-.85.85M4.45 11.55l-.85.85M12.4 12.4l-.85-.85M4.45 4.45l-.85-.85" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                </button>
                <button onClick={() => setModal("add")} style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(201,169,110,0.12)", color:"#C9A96E", border:"1px solid rgba(201,169,110,0.25)", borderRadius:20, padding:"8px 16px", fontSize:13, fontWeight:600, letterSpacing:"0.04em", cursor:"pointer", transition:"all .3s cubic-bezier(.16,1,.3,1)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Add entry
                </button>
              </div>
            </div>

            {/* Segmented control */}
            <div style={{ display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:12, padding:3, border:"1px solid rgba(255,255,255,0.06)" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => switchTab(t.id)} style={{ flex:1, border:"none", borderRadius:10, padding:"8px 0", fontSize:12, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", cursor:"pointer", transition:"all .3s cubic-bezier(.16,1,.3,1)", background: tab===t.id ? "rgba(240,235,227,0.09)" : "transparent", color: tab===t.id ? "#F0EBE3" : "rgba(240,235,227,0.3)", boxShadow: tab===t.id ? "inset 0 0 0 1px rgba(240,235,227,0.08)" : "none" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Month navigator ─────────────────────────────────────────────── */}
        <div style={{ position:"sticky", top:104, zIndex:90, background:"rgba(13,13,15,0.6)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderBottom:"1px solid rgba(240,235,227,0.04)" }}>
          <div style={{ maxWidth:600, margin:"0 auto", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <button disabled={monthIdx >= allMonths.length-1} onClick={() => setMonth(allMonths[monthIdx+1])}
              style={{ background:"none", border:"none", cursor: monthIdx>=allMonths.length-1 ? "default":"pointer", color: monthIdx>=allMonths.length-1 ? "rgba(240,235,227,0.1)" : "#C9A96E", display:"flex", padding:4, transition:"color .3s" }}>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
            </button>
            <div style={{ textAlign:"center" }}>
              <span style={{ fontSize:14, fontWeight:600, color:"#F0EBE3", letterSpacing:"-0.01em" }}>{fmtMonthLong(month)}</span>
              <span style={{ fontSize:11, color:"rgba(240,235,227,0.3)", marginLeft:8 }}>{monthExp.length} entries</span>
            </div>
            <button disabled={monthIdx<=0} onClick={() => setMonth(allMonths[monthIdx-1])}
              style={{ background:"none", border:"none", cursor: monthIdx<=0 ? "default":"pointer", color: monthIdx<=0 ? "rgba(240,235,227,0.1)" : "#C9A96E", display:"flex", padding:4, transition:"color .3s" }}>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <main style={{ maxWidth:600, margin:"0 auto", padding:"28px 20px 100px", position:"relative", zIndex:1 }}>

          {/* ══════════ OVERVIEW ══════════ */}
          {tab === "overview" && (
            <div style={{ animation:"screenIn .3s cubic-bezier(.16,1,.3,1)" }}>

              {/* Hero spending number */}
              <div style={{ marginBottom:36, paddingBottom:32, borderBottom:"1px solid rgba(240,235,227,0.07)" }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(240,235,227,0.3)", marginBottom:12 }}>Total spent · {fmtMonthLong(month)}</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"clamp(48px,12vw,76px)", fontWeight:500, color:"#F0EBE3", letterSpacing:"-0.04em", lineHeight:1, marginBottom:8 }}>
                  {CUR}{fmt(totalSpent)}
                </div>
                {totalIncome > 0 && (
                  <div style={{ fontSize:13, color:"#6DE8A0", fontWeight:500 }}>+{CUR}{fmt(totalIncome)} income this month</div>
                )}
              </div>

              {/* Stat strip */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:28 }}>
                {[
                  { label:"Entries",    value: monthExp.length,        mono: false },
                  { label:"Daily avg",  value: `${CUR}${fmt(dailyAvg)}`, mono: true  },
                  { label:"Categories", value: catBreakdown.length,     mono: false },
                ].map(s => (
                  <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"16px 14px", backdropFilter:"blur(8px)" }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(240,235,227,0.3)", marginBottom:8 }}>{s.label}</div>
                    <div style={{ fontFamily: s.mono ? "'DM Mono',monospace" : "inherit", fontSize:22, fontWeight:s.mono?400:700, color:"#F0EBE3", letterSpacing: s.mono?"-0.03em":"-0.01em", lineHeight:1 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              {catBreakdown.length > 0 && (
                <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, overflow:"hidden", marginBottom:24, backdropFilter:"blur(12px)" }}>
                  <div style={{ padding:"16px 20px 12px" }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(240,235,227,0.3)" }}>By category</div>
                  </div>
                  {catBreakdown.map((cat, i) => {
                    const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                    return (
                      <div key={cat.id}>
                        {i > 0 && <div style={{ height:1, background:"rgba(255,255,255,0.05)", marginLeft:20 }} />}
                        <div style={{ padding:"14px 20px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                            <div style={{ width:36, height:36, borderRadius:10, background:cat.glow, border:`1px solid ${cat.accent}22`, display:"flex", alignItems:"center", justifyContent:"center", color:cat.accent, flexShrink:0 }}>
                              <CatIcon id={cat.id} size={17} />
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                                <span style={{ fontSize:14, fontWeight:500, color:"#F0EBE3" }}>{cat.name}</span>
                                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:400, color:"#F0EBE3", letterSpacing:"-0.02em" }}>{CUR}{fmt(cat.spent)}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ height:3, background:"rgba(255,255,255,0.07)", borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:cat.accent, borderRadius:2, transition:"width .8s cubic-bezier(.16,1,.3,1)", boxShadow:`0 0 8px ${cat.accent}66` }} />
                          </div>
                          <div style={{ fontSize:11, color:"rgba(240,235,227,0.25)", marginTop:5 }}>{Math.round(pct)}% of spending</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recent */}
              <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, overflow:"hidden", backdropFilter:"blur(12px)" }}>
                <div style={{ padding:"16px 20px 12px" }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(240,235,227,0.3)" }}>Recent entries</div>
                </div>
                {expenses.slice(0, 8).map((exp, i, arr) => {
                  const cat = getCat(exp.categoryId);
                  const c   = CATS[exp.categoryId] ?? CATS.savings;
                  const isIncome = exp.type === "income";
                  return (
                    <div key={exp.id}>
                      {i > 0 && <div style={{ height:1, background:"rgba(255,255,255,0.05)", marginLeft:68 }} />}
                      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px" }}>
                        <div style={{ width:40, height:40, borderRadius:12, background:c.glow, border:`1px solid ${c.accent}22`, display:"flex", alignItems:"center", justifyContent:"center", color:c.accent, flexShrink:0 }}>
                          <CatIcon id={exp.categoryId} size={18} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:500, color:"#F0EBE3", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{exp.note || cat.name}</div>
                          <div style={{ fontSize:12, color:"rgba(240,235,227,0.3)", marginTop:2 }}>{cat.name} · {fmtShort(exp.date)}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:400, color: isIncome ? "#6DE8A0" : "#F0EBE3", letterSpacing:"-0.02em" }}>
                            {isIncome ? "+" : "−"}{CUR}{fmt(exp.amount)}
                          </span>
                          <button onClick={() => { if (window.confirm(`Remove "${exp.note || cat.name}"?`)) deleteExpense(exp.id); }}
                            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(232,100,100,0.4)", display:"flex", padding:4, borderRadius:6, transition:"color .2s" }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M5.5 3.5l.5 7M8.5 3.5l-.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════ LEDGER — vertical timeline ══════════ */}
          {tab === "ledger" && (
            <div style={{ animation:"screenIn .3s cubic-bezier(.16,1,.3,1)" }}>

              {/* Search */}
              <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"11px 16px", marginBottom:16 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color:"rgba(240,235,227,0.3)", flexShrink:0 }}><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries…"
                  style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14, color:"#F0EBE3", fontFamily:"inherit" }} />
                {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(240,235,227,0.3)", display:"flex" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                </button>}
              </div>

              {/* Category pills */}
              <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:16, scrollbarWidth:"none" }}>
                <button onClick={() => setFilterCat(null)} style={{ flexShrink:0, border:`1px solid ${!filterCat ? "rgba(201,169,110,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius:20, padding:"6px 16px", fontSize:12, fontWeight:600, letterSpacing:"0.04em", cursor:"pointer", background: !filterCat ? "rgba(201,169,110,0.1)" : "transparent", color: !filterCat ? "#C9A96E" : "rgba(240,235,227,0.35)", transition:"all .3s cubic-bezier(.16,1,.3,1)" }}>All</button>
                {Object.entries(CATS).map(([id, c]) => (
                  <button key={id} onClick={() => setFilterCat(filterCat===id ? null : id)}
                    style={{ flexShrink:0, border:`1px solid ${filterCat===id ? c.accent+"60" : "rgba(255,255,255,0.08)"}`, borderRadius:20, padding:"6px 16px", fontSize:12, fontWeight:600, letterSpacing:"0.03em", cursor:"pointer", background: filterCat===id ? c.glow : "transparent", color: filterCat===id ? c.accent : "rgba(240,235,227,0.35)", transition:"all .3s cubic-bezier(.16,1,.3,1)" }}>
                    {c.name.split(" ")[0]}
                  </button>
                ))}
              </div>

              {/* Timeline */}
              {groupedByDate.length === 0
                ? <div style={{ textAlign:"center", padding:"64px 20px", color:"rgba(240,235,227,0.3)", fontSize:14 }}>No entries found</div>
                : (
                  <div style={{ position:"relative" }}>
                    {/* Vertical line */}
                    <div style={{ position:"absolute", left:20, top:8, bottom:8, width:1, background:"linear-gradient(to bottom, transparent, rgba(201,169,110,0.2) 10%, rgba(201,169,110,0.2) 90%, transparent)", pointerEvents:"none" }} />

                    {groupedByDate.map(([date, entries]) => {
                      const dayTotal = entries.filter(e=>e.type!=="income").reduce((s,e)=>s+e.amount,0);
                      return (
                        <div key={date} style={{ marginBottom:28 }}>
                          {/* Date axis marker */}
                          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12, paddingLeft:0 }}>
                            <div style={{ width:41, display:"flex", justifyContent:"center", flexShrink:0 }}>
                              <div style={{ width:9, height:9, borderRadius:"50%", background:"#C9A96E", border:"2px solid #0D0D0F", boxShadow:"0 0 8px rgba(201,169,110,0.6)", flexShrink:0 }} />
                            </div>
                            <div style={{ display:"flex", justifyContent:"space-between", flex:1, alignItems:"baseline" }}>
                              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(240,235,227,0.45)" }}>{fmtDay(date)}</span>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"rgba(201,169,110,0.6)", letterSpacing:"0.02em" }}>{CUR}{fmt(dayTotal)}</span>
                            </div>
                          </div>

                          {/* Entries for this date */}
                          <div style={{ marginLeft:41, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden", backdropFilter:"blur(8px)" }}>
                            {entries.map((exp, i) => {
                              const c = CATS[exp.categoryId] ?? CATS.savings;
                              const isIncome = exp.type === "income";
                              return (
                                <div key={exp.id}>
                                  {i > 0 && <div style={{ height:1, background:"rgba(255,255,255,0.05)", marginLeft:52 }} />}
                                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px" }}>
                                    <div style={{ width:36, height:36, borderRadius:10, background:c.glow, border:`1px solid ${c.accent}22`, display:"flex", alignItems:"center", justifyContent:"center", color:c.accent, flexShrink:0 }}>
                                      <CatIcon id={exp.categoryId} size={16} />
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ fontSize:14, fontWeight:500, color:"#F0EBE3", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{exp.note || c.name}</div>
                                      <div style={{ fontSize:11, color:"rgba(240,235,227,0.3)", marginTop:2 }}>{c.name}</div>
                                    </div>
                                    <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:400, color: isIncome?"#6DE8A0":"#F0EBE3", letterSpacing:"-0.02em" }}>
                                        {isIncome?"+":"−"}{CUR}{fmt(exp.amount)}
                                      </span>
                                      <button onClick={() => { if (window.confirm(`Remove this entry?`)) deleteExpense(exp.id); }}
                                        style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(232,100,100,0.35)", display:"flex", padding:4, borderRadius:6, transition:"color .2s" }}>
                                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M5.5 3.5l.5 7M8.5 3.5l-.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ══════════ ANALYTICS — asymmetric cards ══════════ */}
          {tab === "analytics" && (
            <div style={{ animation:"screenIn .3s cubic-bezier(.16,1,.3,1)" }}>

              {/* Large feature card */}
              <div style={{ background:"rgba(201,169,110,0.07)", border:"1px solid rgba(201,169,110,0.15)", borderRadius:24, padding:"28px 24px", marginBottom:16, backdropFilter:"blur(16px)", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:"-30%", right:"-10%", width:"50%", paddingBottom:"50%", borderRadius:"50%", background:"radial-gradient(circle, rgba(201,169,110,0.1) 0%, transparent 70%)", pointerEvents:"none" }} />
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(201,169,110,0.5)", marginBottom:16 }}>Monthly summary</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
                  {[
                    { label:"Spent",    value:`${CUR}${fmt(totalSpent)}`,  color:"#F0EBE3" },
                    { label:"Income",   value:`${CUR}${fmt(totalIncome)}`, color:"#6DE8A0" },
                    { label:"Net",      value:`${totalIncome>=totalSpent?"+":"−"}${CUR}${fmt(Math.abs(totalIncome-totalSpent))}`, color: totalIncome>=totalSpent?"#6DE8A0":"#E86D6D" },
                    { label:"Avg/day",  value:`${CUR}${fmt(dailyAvg)}`,    color:"rgba(240,235,227,0.6)" },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(240,235,227,0.25)", marginBottom:6 }}>{s.label}</div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22, fontWeight:400, color:s.color, letterSpacing:"-0.03em", lineHeight:1 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staggered category cards */}
              {catBreakdown.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(240,235,227,0.25)", marginBottom:14, paddingLeft:4 }}>Spending breakdown</div>
                  {catBreakdown.map((cat, i) => {
                    const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                    // Alternating slight offset for asymmetric feel
                    const isOdd = i % 2 === 1;
                    return (
                      <div key={cat.id} style={{ marginBottom:10, marginLeft: isOdd ? 20 : 0, marginRight: isOdd ? 0 : 20 }}>
                        <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${cat.accent}20`, borderRadius:18, padding:"16px 18px", backdropFilter:"blur(8px)", transition:"all .4s cubic-bezier(.16,1,.3,1)" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                            <div style={{ width:38, height:38, borderRadius:12, background:cat.glow, border:`1px solid ${cat.accent}30`, display:"flex", alignItems:"center", justifyContent:"center", color:cat.accent, flexShrink:0, boxShadow:`0 0 16px ${cat.accent}22` }}>
                              <CatIcon id={cat.id} size={18} />
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:14, fontWeight:600, color:"#F0EBE3", marginBottom:2 }}>{cat.name}</div>
                              <div style={{ fontSize:11, color:"rgba(240,235,227,0.3)" }}>{Math.round(pct)}% · {monthExp.filter(e=>e.categoryId===cat.id).length} entries</div>
                            </div>
                            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:400, color:cat.accent, letterSpacing:"-0.02em" }}>{CUR}{fmt(cat.spent)}</div>
                          </div>
                          <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg, ${cat.accent}88, ${cat.accent})`, borderRadius:2, transition:"width .9s cubic-bezier(.16,1,.3,1)", boxShadow:`0 0 10px ${cat.accent}55` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Month history */}
              <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, overflow:"hidden", backdropFilter:"blur(12px)" }}>
                <div style={{ padding:"16px 20px 12px" }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(240,235,227,0.3)" }}>History</div>
                </div>
                {allMonths.slice(0, 8).map((m, i, arr) => {
                  const mSpent = expenses.filter(e=>e.date.startsWith(m)&&e.type!=="income").reduce((s,e)=>s+e.amount,0);
                  const count  = expenses.filter(e=>e.date.startsWith(m)).length;
                  const isSelected = m === month;
                  return (
                    <div key={m}>
                      {i > 0 && <div style={{ height:1, background:"rgba(255,255,255,0.05)", marginLeft:20 }} />}
                      <div onClick={() => { setMonth(m); switchTab("overview"); }}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", cursor:"pointer", background: isSelected ? "rgba(201,169,110,0.06)" : "transparent", transition:"background .3s" }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight: isSelected?600:400, color: isSelected?"#C9A96E":"#F0EBE3", letterSpacing:"-0.01em" }}>{fmtMonthLong(m)}</div>
                          <div style={{ fontSize:11, color:"rgba(240,235,227,0.3)", marginTop:2 }}>{count} entries</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:15, fontWeight:400, color: isSelected?"#C9A96E":"#F0EBE3", letterSpacing:"-0.02em" }}>{CUR}{fmt(mSpent)}</div>
                          <svg width="6" height="11" viewBox="0 0 6 11" fill="none"><path d="M1 1l4 4.5L1 10" stroke="rgba(240,235,227,0.2)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>
                      </div>
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

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0D0D0F; }
  button, input, select, textarea { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; }
  select, input[type="date"] { -webkit-appearance: none; appearance: none; }
  input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
  ::-webkit-scrollbar { display: none; }

  @keyframes toastIn {
    from { opacity:0; transform:translateX(-50%) translateY(12px); }
    to   { opacity:1; transform:translateX(-50%) translateY(0); }
  }
  @keyframes sheetUp {
    from { transform:translateY(100%); }
    to   { transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes screenIn {
    from { opacity:0; transform:translateY(12px); }
    to   { opacity:1; transform:translateY(0); }
  }

  button:hover { opacity: 0.82; }
  button { transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
`;
