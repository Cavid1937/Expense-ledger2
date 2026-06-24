import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── Real data ────────────────────────────────────────────────────────────────
const REAL_EXPENSES = [
  { id: 1782068705462.7368, amount: 1,     categoryId: "food",          date: "2026-06-21", note: "CYHN obyketi",       type: "expense" },
  { id: 1782068690416.8042, amount: 0.5,   categoryId: "transport",     date: "2026-06-21", note: "",                   type: "expense" },
  { id: 1782068682536.0571, amount: 2,     categoryId: "food",          date: "2026-06-21", note: "CPS+KL",             type: "expense" },
  { id: 1782068643389.329,  amount: 1,     categoryId: "transport",     date: "2026-06-21", note: "+Zkr",               type: "expense" },
  { id: 1782068617942.7224, amount: 0.6,   categoryId: "transport",     date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1782068602519.272,  amount: 0.9,   categoryId: "transport",     date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1782068551310.6436, amount: 1.7,   categoryId: "entertainment", date: "2026-06-19", note: "PS blur",            type: "expense" },
  { id: 1782068528326.2168, amount: 2.5,   categoryId: "food",          date: "2026-06-19", note: "Seyidin dönəri",    type: "expense" },
  { id: 1782068504276.0857, amount: 0.9,   categoryId: "food",          date: "2026-06-19", note: "Mirinda",            type: "expense" },
  { id: 1782068442516.2827, amount: 2.7,   categoryId: "food",          date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1782068421898.7432, amount: 0.6,   categoryId: "transport",     date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1782068411728.1655, amount: 1,     categoryId: "transport",     date: "2026-06-19", note: "",                   type: "expense" },
  { id: 1781265813419.8289, amount: 0.9,   categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265806497.5938, amount: 0.6,   categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265794615.453,  amount: 22,    categoryId: "entertainment", date: "2026-06-11", note: "SCTR",               type: "expense" },
  { id: 1781265704305.698,  amount: 0.6,   categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265695987.1382, amount: 0.54,  categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265662553.5542, amount: 14.83, categoryId: "food",          date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1781265555573.1838, amount: 1,     categoryId: "transport",     date: "2026-06-11", note: "",                   type: "expense" },
  { id: 1780737137429.9685, amount: 5,     categoryId: "transport",     date: "2026-06-05", note: "",                   type: "expense" },
  { id: 1780724491697.742,  amount: 3,     categoryId: "food",          date: "2026-06-05", note: "",                   type: "expense" },
  { id: 1780724485096.0562, amount: 1.2,   categoryId: "food",          date: "2026-06-05", note: "",                   type: "expense" },
  { id: 1780724467274.839,  amount: 30,    categoryId: "health",        date: "2026-06-05", note: "",                   type: "expense" },
  { id: 1780488739967.9233, amount: 0.6,   categoryId: "transport",     date: "2026-06-03", note: "",                   type: "expense" },
  { id: 1780488711851.9412, amount: 18.5,  categoryId: "food",          date: "2026-06-02", note: "",                   type: "expense" },
  { id: 1780488682884.7156, amount: 4,     categoryId: "food",          date: "2026-06-02", note: "DNR",                type: "expense" },
  { id: 1780488665223.7634, amount: 0.6,   categoryId: "transport",     date: "2026-06-03", note: "",                   type: "expense" },
  { id: 1780488658604.4756, amount: 0.6,   categoryId: "transport",     date: "2026-06-02", note: "",                   type: "expense" },
  { id: 1780488640982.3706, amount: 2,     categoryId: "transport",     date: "2026-06-02", note: "",                   type: "expense" },
  { id: 1780165976772.535,  amount: 11,    categoryId: "food",          date: "2026-05-30", note: "CLMİM",              type: "expense" },
  { id: 1779824679196.0632, amount: 1,     categoryId: "transport",     date: "2026-05-26", note: "",                   type: "expense" },
  { id: 1779824673208.5986, amount: 0.54,  categoryId: "transport",     date: "2026-05-26", note: "",                   type: "expense" },
  { id: 1779824662351.5425, amount: 0.5,   categoryId: "transport",     date: "2026-05-26", note: "",                   type: "expense" },
  { id: 1779824654011.0525, amount: 0.9,   categoryId: "transport",     date: "2026-05-26", note: "",                   type: "expense" },
  { id: 1779824633665.256,  amount: 7.24,  categoryId: "food",          date: "2026-05-26", note: "VIP",                type: "expense" },
  { id: 1779623148541.08,   amount: 7,     categoryId: "food",          date: "2026-05-19", note: "VİP",                type: "expense" },
  { id: 1779623095257.6038, amount: 18.33, categoryId: "food",          date: "2026-05-21", note: "ZFTGL",              type: "expense" },
  { id: 1779111889908.7778, amount: 5.29,  categoryId: "shopping",      date: "2026-05-18", note: "DDRNT",              type: "expense" },
  { id: 1779021295713.717,  amount: 1.4,   categoryId: "food",          date: "2026-05-17", note: "",                   type: "expense" },
  { id: 1779021286760.0493, amount: 1,     categoryId: "transport",     date: "2026-05-17", note: "",                   type: "expense" },
  { id: 1779021277002.8086, amount: 8.5,   categoryId: "food",          date: "2026-05-17", note: "MC 28",              type: "expense" },
  { id: 1778776123794.9604, amount: 3.5,   categoryId: "food",          date: "2026-05-14", note: "",                   type: "expense" },
  { id: 1778776110103.953,  amount: 1.5,   categoryId: "food",          date: "2026-05-14", note: "",                   type: "expense" },
  { id: 1778776095800.4822, amount: 1,     categoryId: "transport",     date: "2026-05-14", note: "",                   type: "expense" },
  { id: 1778616439110.6838, amount: 0.6,   categoryId: "transport",     date: "2026-05-12", note: "",                   type: "expense" },
  { id: 1778616430727.1868, amount: 0.9,   categoryId: "transport",     date: "2026-05-12", note: "",                   type: "expense" },
  { id: 1778616420099.6792, amount: 0.6,   categoryId: "transport",     date: "2026-05-12", note: "",                   type: "expense" },
  { id: 1778616401578.7756, amount: 0.6,   categoryId: "transport",     date: "2026-05-11", note: "",                   type: "expense" },
  { id: 1778616385804.8289, amount: 1,     categoryId: "transport",     date: "2026-05-11", note: "",                   type: "expense" },
  { id: 1778420388011.904,  amount: 29,    categoryId: "entertainment", date: "2026-05-09", note: "",                   type: "expense" },
  { id: 1778166575873.4858, amount: 0.6,   categoryId: "transport",     date: "2026-05-07", note: "",                   type: "expense" },
  { id: 1778166564384.511,  amount: 1,     categoryId: "transport",     date: "2026-05-07", note: "",                   type: "expense" },
  { id: 1778166553394.4846, amount: 0.6,   categoryId: "transport",     date: "2026-05-07", note: "",                   type: "expense" },
  { id: 1778064670006.1018, amount: 1,     categoryId: "transport",     date: "2026-05-06", note: "",                   type: "expense" },
  { id: 1778064657792.7944, amount: 0.6,   categoryId: "food",          date: "2026-05-05", note: "🧃",                 type: "expense" },
  { id: 1778012576604.0398, amount: 0.9,   categoryId: "transport",     date: "2026-05-05", note: "",                   type: "expense" },
  { id: 1778012570684.971,  amount: 0.6,   categoryId: "transport",     date: "2026-05-05", note: "",                   type: "expense" },
  { id: 1778012563282.148,  amount: 0.5,   categoryId: "transport",     date: "2026-05-05", note: "",                   type: "expense" },
  { id: 1778012550861.058,  amount: 2,     categoryId: "food",          date: "2026-05-05", note: "Dondurma",           type: "expense" },
  { id: 1777912768873.349,  amount: 6,     categoryId: "food",          date: "2026-05-04", note: "Mkn",                type: "expense" },
  { id: 1777905975470.1858, amount: 0.9,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777905968444.1235, amount: 0.6,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777905960452.8464, amount: 0.6,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777905953591.3274, amount: 1.7,   categoryId: "food",          date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777881768876.8743, amount: 0.5,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777881748382.5642, amount: 0.5,   categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777881735695.0703, amount: 1,     categoryId: "transport",     date: "2026-05-04", note: "",                   type: "expense" },
  { id: 1777843657236.1501, amount: 5,     categoryId: "food",          date: "2026-05-03", note: "Miami",              type: "expense" },
  { id: 1777798491880.278,  amount: 0.5,   categoryId: "transport",     date: "2026-05-03", note: "",                   type: "expense" },
  { id: 1777794309010.953,  amount: 0.5,   categoryId: "transport",     date: "2026-05-03", note: "",                   type: "expense" },
  { id: 1777727151638.15,   amount: 30,    categoryId: "health",        date: "2026-04-26", note: "Məşq",              type: "expense" },
  { id: 1777727128149.4734, amount: 18,    categoryId: "subscriptions", date: "2026-04-30", note: "Nar (50 GB)",        type: "expense" },
  { id: 1777727049808.2036, amount: 3.58,  categoryId: "transport",     date: "2026-04-30", note: "",                   type: "expense" },
  { id: 1777727004315.7512, amount: 0.9,   categoryId: "transport",     date: "2026-05-01", note: "",                   type: "expense" },
  { id: 1777726984240.8223, amount: 1,     categoryId: "transport",     date: "2026-05-02", note: "",                   type: "expense" },
  { id: 1777726971550.662,  amount: 5,     categoryId: "food",          date: "2026-05-01", note: "KFC Ganjlik (XLQ)", type: "expense" },
  { id: 1777726943733.0505, amount: 0.6,   categoryId: "transport",     date: "2026-05-01", note: "",                   type: "expense" },
  { id: 1777726855960.0981, amount: 0.6,   categoryId: "transport",     date: "2026-05-01", note: "",                   type: "expense" },
];

const CATEGORIES = [
  { id: "food",          name: "Food & Dining",   color: "#FF9500", bg: "#FFF3E0" },
  { id: "transport",     name: "Transport",        color: "#007AFF", bg: "#E3F2FD" },
  { id: "entertainment", name: "Entertainment",    color: "#AF52DE", bg: "#F3E5F5" },
  { id: "health",        name: "Health",           color: "#34C759", bg: "#E8F5E9" },
  { id: "shopping",      name: "Shopping",         color: "#FF2D55", bg: "#FCE4EC" },
  { id: "subscriptions", name: "Subscriptions",    color: "#5AC8FA", bg: "#E1F5FE" },
  { id: "savings",       name: "Savings",          color: "#30B0C7", bg: "#E0F7FA" },
];

const STORAGE_KEY = "expense_ledger_v4";
const CUR = "₼";
const genId = () => Date.now() + Math.random();
const todayStr = () => new Date().toISOString().slice(0, 10);

function loadState() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveState(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function fmt(n) {
  return parseFloat(Math.abs(n).toFixed(2)).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDateShort(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtMonthLong(m) {
  return new Date(m + "-02").toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function getCat(id) { return CATEGORIES.find(c => c.id === id); }

// ─── SF-style SVG icons ───────────────────────────────────────────────────────
function IcoSearch() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function IcoClose() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>;
}
function IcoPlus() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function IcoTrash() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M5 4V2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5V4M5.5 4l.5 8M9.5 4l-.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function IcoChevronRight() {
  return <svg width="8" height="13" viewBox="0 0 8 13" fill="none"><path d="M1.5 1.5l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IcoChevronLeft() {
  return <svg width="8" height="13" viewBox="0 0 8 13" fill="none"><path d="M6.5 1.5l-5 5 5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IcoSettings() {
  return <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><circle cx="8.5" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8.5 1v1.5M8.5 14.5V16M16 8.5h-1.5M2.5 8.5H1M13.77 3.23l-1.06 1.06M4.29 11.71l-1.06 1.06M13.77 13.77l-1.06-1.06M4.29 5.29l-1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function IcoDownload() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M5 8.5l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

// Category icon
function CatDot({ id, size = 36 }) {
  const cat = getCat(id);
  const initials = (cat?.name ?? id).slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: cat?.bg ?? "#E5E5EA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 700, color: cat?.color ?? "#8E8E93", letterSpacing: "-0.02em" }}>{initials}</span>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={{ position: "fixed", bottom: 36, left: "50%", transform: "translateX(-50%)", background: "rgba(44,44,46,0.94)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#fff", padding: "12px 24px", borderRadius: 24, fontSize: 14, fontWeight: 500, zIndex: 9999, whiteSpace: "nowrap", animation: "toastIn .22s cubic-bezier(.25,1,.5,1)" }}>
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

  return (
    <div style={ms.backdrop} onClick={onClose}>
      <div style={ms.sheet} onClick={e => e.stopPropagation()}>
        <div style={ms.handle} />

        <p style={ms.sheetTitle}>{type === "income" ? "New Income" : "New Expense"}</p>

        {/* Type toggle */}
        <div style={ms.seg}>
          {["expense", "income"].map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ ...ms.segBtn, background: type === t ? "#fff" : "transparent", color: type === t ? "#000" : "#8E8E93", boxShadow: type === t ? "0 2px 8px rgba(0,0,0,.12)" : "none" }}>
              {t === "expense" ? "Expense" : "Income"}
            </button>
          ))}
        </div>

        {/* Hero amount input */}
        <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#8E8E93", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 6 }}>Amount</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "#8E8E93" }}>{CUR}</span>
            <input
              autoFocus type="number" placeholder="0.00" value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 56, fontWeight: 800, color: "#000", width: "auto", maxWidth: 220, letterSpacing: "-0.03em", textAlign: "center" }}
            />
          </div>
        </div>

        {/* Form fields */}
        <div style={ms.group}>
          <div style={ms.row}>
            <span style={ms.rowLabel}>Note</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" style={ms.rowInput} />
          </div>
          <div style={ms.hairline} />
          <div style={ms.row}>
            <span style={ms.rowLabel}>Category</span>
            <select value={catId} onChange={e => setCatId(e.target.value)} style={{ ...ms.rowInput, color: getCat(catId)?.color ?? "#000" }}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={ms.hairline} />
          <div style={ms.row}>
            <span style={ms.rowLabel}>Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={ms.rowInput} />
          </div>
        </div>

        <button onClick={submit} style={{ ...ms.primaryBtn, background: type === "income" ? "#34C759" : "#007AFF" }}>
          Add {type === "income" ? "Income" : "Expense"}
        </button>
        <button onClick={onClose} style={ms.ghostBtn}>Cancel</button>
      </div>
    </div>
  );
}

const ms = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  sheet: { background: "#F2F2F7", borderRadius: "22px 22px 0 0", padding: "0 20px 44px", width: "100%", maxWidth: 560, animation: "sheetUp .32s cubic-bezier(.25,1,.5,1)" },
  handle: { width: 40, height: 5, background: "#C7C7CC", borderRadius: 3, margin: "12px auto 16px" },
  sheetTitle: { fontSize: 17, fontWeight: 700, textAlign: "center", color: "#000", marginBottom: 16 },
  seg: { display: "flex", background: "#E5E5EA", borderRadius: 11, padding: 3, marginBottom: 4, gap: 2 },
  segBtn: { flex: 1, border: "none", borderRadius: 9, padding: "8px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .25s cubic-bezier(.25,1,.5,1)" },
  group: { background: "#fff", borderRadius: 14, overflow: "hidden", marginBottom: 14 },
  row: { display: "flex", alignItems: "center", padding: "14px 16px", gap: 12 },
  rowLabel: { fontSize: 16, color: "#000", fontWeight: 400, minWidth: 80, flexShrink: 0 },
  rowInput: { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, color: "#000", textAlign: "right", fontFamily: "inherit", appearance: "none", WebkitAppearance: "none" },
  hairline: { height: 1, background: "#E5E5EA", marginLeft: 16 },
  primaryBtn: { width: "100%", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10, transition: "opacity .15s" },
  ghostBtn: { width: "100%", background: "#fff", color: "#007AFF", border: "none", borderRadius: 14, padding: "16px", fontSize: 17, fontWeight: 400, cursor: "pointer", fontFamily: "inherit" },
};

// ─── Settings bottom sheet ────────────────────────────────────────────────────
function SettingsSheet({ expenses, onUpdate, onClose, showToast }) {
  const [importText, setImportText] = useState("");

  function exportJSON() {
    const b = new Blob([JSON.stringify({ expenses }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "expense-ledger-backup.json"; a.click();
  }
  function exportCSV() {
    const rows = [["Date","Amount","Category","Note","Type"]];
    expenses.forEach(e => rows.push([e.date, e.amount, e.categoryId, e.note || "", e.type || "expense"]));
    const b = new Blob([rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")], { type: "text/csv" });
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

  return (
    <div style={ms.backdrop} onClick={onClose}>
      <div style={{ ...ms.sheet, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={ms.handle} />
        <p style={{ fontSize: 17, fontWeight: 700, textAlign: "center", color: "#000", marginBottom: 20 }}>Settings</p>

        <p style={ss.groupHeader}>Export</p>
        <div style={ss.group}>
          {[
            { label: "Export as JSON", icon: <IcoDownload />, fn: exportJSON },
            { label: "Export as CSV",  icon: <IcoDownload />, fn: exportCSV  },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <button onClick={item.fn} style={ss.row}>
                <span style={{ color: "#007AFF", display: "flex" }}>{item.icon}</span>
                <span style={ss.rowLabel}>{item.label}</span>
                <span style={{ color: "#C7C7CC", display: "flex" }}><IcoChevronRight /></span>
              </button>
              {i < arr.length - 1 && <div style={ss.hairline} />}
            </div>
          ))}
        </div>

        <p style={ss.groupHeader}>Import / Restore</p>
        <div style={{ ...ss.group, padding: 14 }}>
          <textarea value={importText} onChange={e => setImportText(e.target.value)}
            placeholder="Paste your JSON backup here…"
            style={{ width: "100%", height: 90, border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 13, color: "#3C3C43", fontFamily: "monospace", boxSizing: "border-box" }} />
          <button onClick={doImport} style={{ ...ms.primaryBtn, marginBottom: 0, background: "#007AFF", fontSize: 15 }}>Import</button>
        </div>

        <p style={{ fontSize: 12, color: "#8E8E93", textAlign: "center", lineHeight: 1.6, margin: "16px 0" }}>
          All data is saved locally in this browser.{"\n"}No servers. No tracking.
        </p>
        <button onClick={onClose} style={ms.ghostBtn}>Done</button>
      </div>
    </div>
  );
}

const ss = {
  groupHeader: { fontSize: 13, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8, paddingLeft: 4 },
  group: { background: "#fff", borderRadius: 14, overflow: "hidden", marginBottom: 10 },
  row: { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  rowLabel: { flex: 1, fontSize: 16, color: "#000" },
  hairline: { height: 1, background: "#E5E5EA", marginLeft: 16 },
};

// ─── Transaction row ──────────────────────────────────────────────────────────
function TxRow({ exp, onDelete, isLast }) {
  const cat = getCat(exp.categoryId);
  const isIncome = exp.type === "income";
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px" }}>
        <CatDot id={exp.categoryId} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 500, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
            {exp.note || cat?.name || "—"}
          </p>
          <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 2 }}>
            {cat?.name}{exp.note ? "" : ""} · {fmtDateShort(exp.date)}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: isIncome ? "#34C759" : "#000", letterSpacing: "-0.02em" }}>
            {isIncome ? "+" : "−"}{CUR}{fmt(exp.amount)}
          </span>
          <button
            onClick={() => { if (window.confirm(`Remove "${exp.note || cat?.name}"?`)) onDelete(exp.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#FF3B30", display: "flex", padding: "4px", borderRadius: 8, opacity: 0.7 }}>
            <IcoTrash />
          </button>
        </div>
      </div>
      {!isLast && <div style={{ height: 1, background: "#E5E5EA", marginLeft: 68 }} />}
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [expenses, setExpenses] = useState(() => loadState()?.expenses ?? REAL_EXPENSES);
  const [tab,      setTab]      = useState("overview");
  const [modal,    setModal]    = useState(null);
  const [month,    setMonth]    = useState(todayStr().slice(0, 7));
  const [toast,    setToast]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [filterCat,setFilterCat]= useState(null);
  const searchRef = useRef(null);

  useEffect(() => { saveState({ expenses }); }, [expenses]);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const addExpense = useCallback(exp => {
    setExpenses(p => [exp, ...p]);
    showToast(exp.type === "income" ? "Income added" : "Expense added");
    setModal(null);
  }, []);

  const deleteExpense = useCallback(id => {
    setExpenses(p => p.filter(e => e.id !== id));
    showToast("Removed");
  }, []);

  // Months list
  const allMonths = useMemo(() => {
    const s = new Set(expenses.map(e => e.date.slice(0, 7)));
    const arr = [...s].sort().reverse();
    if (!arr.includes(month)) arr.unshift(month);
    return arr;
  }, [expenses, month]);

  const monthIdx = allMonths.indexOf(month);

  // Month filtered expenses
  const monthExp = useMemo(() => expenses.filter(e => e.date.startsWith(month)), [expenses, month]);

  const totalSpent  = useMemo(() => monthExp.filter(e => e.type !== "income").reduce((s, e) => s + e.amount, 0), [monthExp]);
  const totalIncome = useMemo(() => monthExp.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0), [monthExp]);

  const catBreakdown = useMemo(() =>
    CATEGORIES.map(c => ({
      ...c,
      spent: monthExp.filter(e => e.categoryId === c.id && e.type !== "income").reduce((s, e) => s + e.amount, 0),
    })).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent),
  [monthExp]);

  const filteredExp = useMemo(() =>
    monthExp
      .filter(e => !filterCat || e.categoryId === filterCat)
      .filter(e => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (e.note && e.note.toLowerCase().includes(q)) || e.categoryId.includes(q) || (getCat(e.categoryId)?.name.toLowerCase().includes(q));
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
  [monthExp, filterCat, search]);

  const uniqueDays = new Set(monthExp.map(e => e.date)).size;
  const dailyAvg   = totalSpent / Math.max(1, uniqueDays);

  const TABS = [
    { id: "overview",  label: "Overview"  },
    { id: "ledger",    label: "Ledger"    },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", background: "#F2F2F7", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", WebkitFontSmoothing: "antialiased" }}>

        {toast && <Toast msg={toast} />}
        {modal === "add"      && <AddModal onAdd={addExpense} onClose={() => setModal(null)} />}
        {modal === "settings" && <SettingsSheet expenses={expenses} onUpdate={setExpenses} onClose={() => setModal(null)} showToast={showToast} />}

        {/* ── Sticky header ──────────────────────────────────────────────── */}
        <div style={{ position: "sticky", top: 0, zIndex: 200, background: "rgba(242,242,247,.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,.1)" }}>
          <div style={{ maxWidth: 600, margin: "0 auto", padding: "14px 20px 10px" }}>

            {/* Title row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#000", letterSpacing: "-0.03em" }}>Expense Ledger</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => setModal("settings")} style={{ background: "none", border: "none", cursor: "pointer", color: "#007AFF", display: "flex", padding: 4 }}>
                  <IcoSettings />
                </button>
                <button onClick={() => setModal("add")} style={{ display: "flex", alignItems: "center", gap: 6, background: "#007AFF", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.01em" }}>
                  <IcoPlus /> Add
                </button>
              </div>
            </div>

            {/* Segmented control */}
            <div style={{ display: "flex", background: "#E5E5EA", borderRadius: 11, padding: 3, gap: 2 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex: 1, border: "none", borderRadius: 9, padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .25s cubic-bezier(.25,1,.5,1)", background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#000" : "#8E8E93", boxShadow: tab === t.id ? "0 1px 6px rgba(0,0,0,.14)" : "none" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Month navigator ─────────────────────────────────────────────── */}
        <div style={{ background: "rgba(242,242,247,.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,.07)", position: "sticky", top: 98, zIndex: 100 }}>
          <div style={{ maxWidth: 600, margin: "0 auto", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              disabled={monthIdx >= allMonths.length - 1}
              onClick={() => setMonth(allMonths[monthIdx + 1])}
              style={{ background: "none", border: "none", cursor: monthIdx >= allMonths.length - 1 ? "default" : "pointer", color: monthIdx >= allMonths.length - 1 ? "#C7C7CC" : "#007AFF", display: "flex", padding: 4 }}>
              <IcoChevronLeft />
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#000", letterSpacing: "-0.01em" }}>{fmtMonthLong(month)}</span>
            <button
              disabled={monthIdx <= 0}
              onClick={() => setMonth(allMonths[monthIdx - 1])}
              style={{ background: "none", border: "none", cursor: monthIdx <= 0 ? "default" : "pointer", color: monthIdx <= 0 ? "#C7C7CC" : "#007AFF", display: "flex", padding: 4 }}>
              <IcoChevronRight />
            </button>
          </div>
        </div>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 100px" }}>

          {/* ══════════ OVERVIEW ══════════ */}
          {tab === "overview" && (
            <div key="overview" style={{ animation: "screenIn .22s cubic-bezier(.25,1,.5,1)", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Hero balance — no card, just raw type */}
              <div style={{ paddingBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
                  Total spent · {fmtMonthLong(month)}
                </p>
                <p style={{ fontSize: 58, fontWeight: 800, color: "#000", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>
                  {CUR}{fmt(totalSpent)}
                </p>
                {totalIncome > 0 && (
                  <p style={{ fontSize: 15, fontWeight: 500, color: "#34C759" }}>+{CUR}{fmt(totalIncome)} income</p>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Transactions", value: monthExp.length },
                  { label: "Daily avg",    value: `${CUR}${fmt(dailyAvg)}` },
                  { label: "Categories",   value: catBreakdown.length },
                ].map(s => (
                  <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: "14px 14px 12px" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#000", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              {catBreakdown.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".06em", padding: "14px 16px 10px" }}>By Category</p>
                  {catBreakdown.map((cat, i) => {
                    const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                    return (
                      <div key={cat.id}>
                        <div style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <CatDot id={cat.id} size={32} />
                              <span style={{ fontSize: 15, fontWeight: 500, color: "#000" }}>{cat.name}</span>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#000", letterSpacing: "-0.01em" }}>{CUR}{fmt(cat.spent)}</span>
                          </div>
                          <div style={{ height: 5, background: "#F2F2F7", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 3, transition: "width .7s cubic-bezier(.25,1,.5,1)" }} />
                          </div>
                          <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 4 }}>{Math.round(pct)}% of spending</p>
                        </div>
                        {i < catBreakdown.length - 1 && <div style={{ height: 1, background: "#E5E5EA", marginLeft: 58 }} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recent transactions */}
              {monthExp.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".06em", padding: "14px 16px 6px" }}>Recent</p>
                  {expenses.slice(0, 8).map((exp, i, arr) => (
                    <TxRow key={exp.id} exp={exp} onDelete={deleteExpense} isLast={i === arr.slice(0, 8).length - 1} />
                  ))}
                </div>
              )}

              {monthExp.length === 0 && (
                <div style={{ background: "#fff", borderRadius: 16, padding: "48px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 17, fontWeight: 600, color: "#3C3C43", marginBottom: 6 }}>No entries this month</p>
                  <p style={{ fontSize: 14, color: "#8E8E93" }}>Tap + Add to record an expense.</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════ LEDGER ══════════ */}
          {tab === "ledger" && (
            <div key="ledger" style={{ animation: "screenIn .22s cubic-bezier(.25,1,.5,1)", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Search bar */}
              <div style={{ background: "#fff", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#8E8E93", display: "flex" }}><IcoSearch /></span>
                <input
                  ref={searchRef}
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by note or category…"
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, color: "#000", fontFamily: "inherit" }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8E93", display: "flex", padding: 2 }}>
                    <IcoClose />
                  </button>
                )}
              </div>

              {/* Category filter pills */}
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                <button onClick={() => setFilterCat(null)}
                  style={{ flexShrink: 0, border: "none", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: !filterCat ? "#000" : "#fff", color: !filterCat ? "#fff" : "#3C3C43", transition: "all .2s cubic-bezier(.25,1,.5,1)" }}>
                  All
                </button>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
                    style={{ flexShrink: 0, border: "none", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filterCat === cat.id ? cat.color : "#fff", color: filterCat === cat.id ? "#fff" : "#3C3C43", transition: "all .2s cubic-bezier(.25,1,.5,1)" }}>
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Entry count */}
              <p style={{ fontSize: 13, color: "#8E8E93", paddingLeft: 4 }}>
                {filteredExp.length} {filteredExp.length === 1 ? "entry" : "entries"}
              </p>

              {/* Transaction list */}
              {filteredExp.length > 0
                ? (
                  <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
                    {filteredExp.map((exp, i) => (
                      <TxRow key={exp.id} exp={exp} onDelete={deleteExpense} isLast={i === filteredExp.length - 1} />
                    ))}
                  </div>
                )
                : (
                  <div style={{ background: "#fff", borderRadius: 16, padding: "48px 20px", textAlign: "center" }}>
                    <p style={{ fontSize: 17, fontWeight: 600, color: "#3C3C43", marginBottom: 6 }}>No entries found</p>
                    <p style={{ fontSize: 14, color: "#8E8E93" }}>Try a different search or filter.</p>
                  </div>
                )
              }
            </div>
          )}

          {/* ══════════ ANALYTICS ══════════ */}
          {tab === "analytics" && (
            <div key="analytics" style={{ animation: "screenIn .22s cubic-bezier(.25,1,.5,1)", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Summary grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Spent",      value: `${CUR}${fmt(totalSpent)}`,                        color: "#FF3B30" },
                  { label: "Income",     value: `${CUR}${fmt(totalIncome)}`,                       color: "#34C759" },
                  { label: "Net",        value: `${totalIncome >= totalSpent ? "+" : "−"}${CUR}${fmt(Math.abs(totalIncome - totalSpent))}`, color: totalIncome >= totalSpent ? "#34C759" : "#FF3B30" },
                  { label: "Avg / day",  value: `${CUR}${fmt(dailyAvg)}`,                         color: "#007AFF" },
                ].map(card => (
                  <div key={card.label} style={{ background: "#fff", borderRadius: 16, padding: "16px" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{card.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: card.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Breakdown bars */}
              {catBreakdown.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, padding: "16px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 16 }}>Breakdown</p>
                  {catBreakdown.map((cat, i) => {
                    const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                    return (
                      <div key={cat.id} style={{ marginBottom: i < catBreakdown.length - 1 ? 18 : 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 15, fontWeight: 500, color: "#000" }}>{cat.name}</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#000" }}>
                            {CUR}{fmt(cat.spent)}{" "}
                            <span style={{ fontSize: 12, color: "#8E8E93", fontWeight: 400 }}>({Math.round(pct)}%)</span>
                          </span>
                        </div>
                        <div style={{ height: 6, background: "#F2F2F7", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 3, transition: "width .7s cubic-bezier(.25,1,.5,1)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Month history */}
              <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: ".06em", padding: "14px 16px 6px" }}>History</p>
                {allMonths.slice(0, 8).map((m, i, arr) => {
                  const mSpent = expenses.filter(e => e.date.startsWith(m) && e.type !== "income").reduce((s, e) => s + e.amount, 0);
                  const count  = expenses.filter(e => e.date.startsWith(m)).length;
                  const isSelected = m === month;
                  return (
                    <div key={m}>
                      <div
                        onClick={() => { setMonth(m); setTab("overview"); }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", cursor: "pointer", background: isSelected ? "#F2F2F7" : "transparent", transition: "background .2s" }}>
                        <div>
                          <p style={{ fontSize: 16, fontWeight: isSelected ? 700 : 500, color: isSelected ? "#007AFF" : "#000" }}>{fmtMonthLong(m)}</p>
                          <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 2 }}>{count} entries</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <p style={{ fontSize: 17, fontWeight: 700, color: "#000", letterSpacing: "-0.02em" }}>{CUR}{fmt(mSpent)}</p>
                          <span style={{ color: "#C7C7CC", display: "flex" }}><IcoChevronRight /></span>
                        </div>
                      </div>
                      {i < arr.length - 1 && <div style={{ height: 1, background: "#E5E5EA", marginLeft: 16 }} />}
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
  html, body { background: #F2F2F7; }
  button { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  input, select, textarea { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  select, input[type="date"] { -webkit-appearance: none; appearance: none; }
  input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
  ::-webkit-scrollbar { display: none; }

  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(12px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes screenIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
