import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "expense_ledger_v2";
const DEFAULT_CATEGORIES = [
  { id: "food",          name: "Food & Dining",  icon: "🍽️", color: "#FF6B6B" },
  { id: "transport",     name: "Transport",       icon: "🚗", color: "#4ECDC4" },
  { id: "entertainment", name: "Entertainment",   icon: "🎬", color: "#FFE66D" },
  { id: "health",        name: "Health",          icon: "💊", color: "#95E1D3" },
  { id: "shopping",      name: "Shopping",        icon: "🛍️", color: "#F38181" },
  { id: "subscriptions", name: "Subscriptions",   icon: "📱", color: "#A8D8EA" },
  { id: "savings",       name: "Savings",         icon: "💰", color: "#AA96DA" },
];

const INITIAL_STATE = {
  expenses: [],
  categories: DEFAULT_CATEGORIES,
  budgets: { overall: 0, perCategory: {} },
  currency: "$",
  setupDone: false,
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0C0C0F; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #16161C; }
  ::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 2px; }
  .app { min-height: 100vh; background: #0C0C0F; color: #F0EEF8; font-family: 'Outfit', sans-serif; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .fade-up { animation: fadeUp 0.4s ease forwards; }
  .fade-up-1 { animation-delay: 0.05s; opacity: 0; }
  .fade-up-2 { animation-delay: 0.12s; opacity: 0; }
  .fade-up-3 { animation-delay: 0.19s; opacity: 0; }
  .fade-up-4 { animation-delay: 0.26s; opacity: 0; }
  @keyframes barFill { from { width: 0%; } to { width: var(--w); } }
  .nav-btn { transition: color 0.2s; }
  .nav-btn:hover { color: #C9B8FF !important; }
  .card { transition: transform 0.18s, box-shadow 0.18s; }
  .card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
  .exp-row { transition: background 0.15s; }
  .exp-row:hover { background: #1C1C24 !important; }
  .btn-primary { transition: opacity 0.15s, transform 0.15s; }
  .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }
  input, select, textarea { font-family: 'Outfit', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
  input:focus, select:focus, textarea:focus { border-color: #7C6BFF !important; box-shadow: 0 0 0 3px rgba(124,107,255,0.15); }
  .tab-active { position: relative; }
  .tab-active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #7C6BFF, #C9B8FF); border-radius: 1px; }
`;

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [s, setS]         = useState(() => loadState() || INITIAL_STATE);
  const [view, setView]   = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [toast, setToast] = useState(null);

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

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const addExpense = (exp) => { update({ expenses: [exp, ...expenses] }); showToast("Expense added!"); setModal(null); };
  const deleteExpense = (id) => { update({ expenses: expenses.filter(e => e.id !== id) }); showToast("Deleted", "error"); };

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

  const exportCSV = () => {
    const rows = [["Date","Amount","Category","Note","Recurring","Interval(days)"]];
    expenses.forEach(e => { const cat = categories.find(c => c.id === e.categoryId); rows.push([e.date, e.amount, cat?.name||"", e.note||"", e.recurring?"Yes":"No", e.intervalDays||""]); });
    dl(rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n"), "expenses.csv", "text/csv");
  };
  const exportJSON = () => dl(JSON.stringify(expenses, null, 2), "expenses.json", "application/json");
  const dl = (content, name, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content],{type})); a.download = name; a.click(); };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {toast && (
          <div style={{ position:"fixed", top:20, right:20, zIndex:9999, background: toast.type==="error"?"#FF6B6B":"#7C6BFF", color:"white", padding:"12px 20px", borderRadius:8, fontSize:14, fontWeight:500, boxShadow:"0 8px 24px rgba(0,0,0,0.4)", animation:"fadeUp 0.3s ease" }}>{toast.msg}</div>
        )}

        {modal === "setup"    && <SetupModal onDone={(cur) => { update({ currency: cur, setupDone: true }); setModal(null); }} />}
        {modal === "add"      && <AddModal categories={categories} currency={currency} onAdd={addExpense} onClose={() => setModal(null)} />}
        {modal === "settings" && <SettingsModal state={s} onUpdate={update} onClose={() => setModal(null)} onExportCSV={exportCSV} onExportJSON={exportJSON} showToast={showToast} />}

        {/* Header */}
        <header style={{ background:"linear-gradient(180deg,#13131A 0%,#0C0C0F 100%)", borderBottom:"1px solid #1E1E28", padding:"0 20px", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ maxWidth:700, margin:"0 auto" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0 0" }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.3em", color:"#7C6BFF", fontWeight:600, textTransform:"uppercase", marginBottom:2 }}>Personal Finance</div>
                <div style={{ fontSize:24, fontFamily:"'Syne',sans-serif", fontWeight:800, background:"linear-gradient(135deg,#F0EEF8 0%,#C9B8FF 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Expense Ledger</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <GhostBtn onClick={() => setModal("settings")}>⚙️</GhostBtn>
                <button className="btn-primary" onClick={() => setModal("add")} style={{ background:"linear-gradient(135deg,#7C6BFF,#A78BFA)", color:"white", border:"none", padding:"10px 18px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'Outfit',sans-serif", boxShadow:"0 4px 16px rgba(124,107,255,0.35)" }}>+ Add</button>
              </div>
            </div>
            <div style={{ display:"flex", gap:4, marginTop:12 }}>
              {[["dashboard","Overview"],["timeline","Timeline"],["monthly","Monthly"]].map(([k,label]) => (
                <button key={k} className={`nav-btn ${view===k?"tab-active":""}`} onClick={() => setView(k)} style={{ background:"transparent", border:"none", borderBottom:"2px solid transparent", color:view===k?"#C9B8FF":"#555566", padding:"10px 16px 12px", cursor:"pointer", fontSize:13, fontWeight:view===k?600:400, fontFamily:"'Outfit',sans-serif", position:"relative" }}>{label}</button>
              ))}
            </div>
          </div>
        </header>

        <main style={{ maxWidth:700, margin:"0 auto", padding:"24px 20px 80px" }}>
          <div className="fade-up fade-up-1" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
            <select value={month} onChange={e => setMonth(e.target.value)} style={{ background:"#16161C", border:"1px solid #2A2A35", color:"#F0EEF8", padding:"9px 14px", borderRadius:8, fontSize:14, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
              {allMonths.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
            <span style={{ fontSize:12, color:"#555566" }}>{monthExp.length} transactions</span>
          </div>

          {/* OVERVIEW */}
          {view === "dashboard" && (
            <div>
              <div className="fade-up fade-up-1" style={{ background:"linear-gradient(135deg,#1A1A2E 0%,#16213E 100%)", border:"1px solid #2A2A45", borderRadius:16, padding:24, marginBottom:16, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, background:"radial-gradient(circle,rgba(124,107,255,0.15) 0%,transparent 70%)", borderRadius:"50%" }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                  <div>
                    <div style={{ fontSize:11, color:"#7C6BFF", letterSpacing:"0.2em", textTransform:"uppercase", fontWeight:600, marginBottom:4 }}>Total Spent</div>
                    <div style={{ fontSize:42, fontFamily:"'Syne',sans-serif", fontWeight:700, lineHeight:1 }}>{fmtMoney(totalSpent,currency)}</div>
                  </div>
                  {budgets.overall > 0 && (
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11, color:"#555566", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:4 }}>Budget</div>
                      <div style={{ fontSize:20, fontWeight:600, color:remaining>=0?"#95E1D3":"#FF6B6B" }}>{remaining>=0?fmtMoney(remaining,currency)+" left":fmtMoney(Math.abs(remaining),currency)+" over"}</div>
                    </div>
                  )}
                </div>
                {budgets.overall > 0 && (
                  <>
                    <div style={{ height:6, background:"#0C0C0F", borderRadius:3, marginBottom:8, overflow:"hidden" }}>
                      <div style={{ "--w":`${budgetPct}%`, height:"100%", borderRadius:3, background:budgetPct>90?"linear-gradient(90deg,#FF6B6B,#FF8E8E)":budgetPct>70?"linear-gradient(90deg,#FFE66D,#FFD93D)":"linear-gradient(90deg,#7C6BFF,#C9B8FF)", animation:"barFill 0.8s cubic-bezier(.4,0,.2,1) forwards" }} />
                    </div>
                    <div style={{ fontSize:12, color:"#555566" }}>{Math.round(budgetPct)}% of {fmtMoney(budgets.overall,currency)} used</div>
                  </>
                )}
              </div>

              <div className="fade-up fade-up-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
                {[
                  { label:"Transactions", value:monthExp.length, icon:"📋" },
                  { label:"Daily Avg", value:fmtMoney(monthExp.length?totalSpent/new Set(monthExp.map(e=>e.date)).size:0,currency), icon:"📅" },
                  { label:"Categories Used", value:catData.filter(c=>c.spent>0).length, icon:"🏷️" },
                ].map((stat,i) => (
                  <div key={i} className="card" style={{ background:"#13131A", border:"1px solid #1E1E28", borderRadius:12, padding:"14px 16px" }}>
                    <div style={{ fontSize:18, marginBottom:6 }}>{stat.icon}</div>
                    <div style={{ fontSize:18, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{stat.value}</div>
                    <div style={{ fontSize:11, color:"#555566", marginTop:2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {catData.length > 0 && (
                <div className="fade-up fade-up-3" style={{ background:"#13131A", border:"1px solid #1E1E28", borderRadius:16, padding:20, marginBottom:16 }}>
                  <div style={{ fontSize:12, color:"#555566", letterSpacing:"0.2em", textTransform:"uppercase", fontWeight:600, marginBottom:16 }}>By Category</div>
                  <div style={{ display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
                    <DonutChart data={catData} total={totalSpent} currency={currency} />
                    <div style={{ flex:1, minWidth:180 }}>
                      {catData.map(cat => {
                        const pct = totalSpent > 0 ? (cat.spent/totalSpent)*100 : 0;
                        const over = cat.limit > 0 && cat.spent > cat.limit;
                        return (
                          <div key={cat.id} style={{ marginBottom:10 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ fontSize:14 }}>{cat.icon}</span>
                                <span style={{ fontSize:13, fontWeight:500 }}>{cat.name}</span>
                                {over && <span style={{ fontSize:9, background:"#FF6B6B22", color:"#FF6B6B", padding:"2px 6px", borderRadius:4, fontWeight:600 }}>OVER</span>}
                              </div>
                              <span style={{ fontSize:13, fontWeight:600, color:over?"#FF6B6B":"#F0EEF8" }}>{fmtMoney(cat.spent,currency)}</span>
                            </div>
                            <div style={{ height:3, background:"#1E1E28", borderRadius:2, overflow:"hidden" }}>
                              <div style={{ "--w":cat.limit>0?`${Math.min((cat.spent/cat.limit)*100,100)}%`:`${pct}%`, height:"100%", borderRadius:2, background:over?"#FF6B6B":cat.color, animation:"barFill 0.7s ease forwards" }} />
                            </div>
                            {cat.limit > 0 && <div style={{ fontSize:10, color:"#555566", marginTop:2 }}>{fmtMoney(cat.spent,currency)} / {fmtMoney(cat.limit,currency)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="fade-up fade-up-4">
                <div style={{ fontSize:12, color:"#555566", letterSpacing:"0.2em", textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Recent Transactions</div>
                {monthExp.length === 0 ? <EmptyState text="No transactions this month" /> : monthExp.slice(0,10).map(exp => <ExpRow key={exp.id} exp={exp} categories={categories} currency={currency} onDelete={deleteExpense} />)}
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {view === "timeline" && (
            <div>
              {monthExp.length === 0 ? <EmptyState text="No transactions this month" /> : (
                <>
                  <BarChart expenses={monthExp} currency={currency} />
                  {Object.entries(monthExp.reduce((acc,e) => { (acc[e.date]=acc[e.date]||[]).push(e); return acc; },{})).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,exps],gi) => (
                    <div key={date} className="fade-up" style={{ animationDelay:`${gi*0.05}s`, opacity:0, marginBottom:20 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#C9B8FF" }}>{fmtDate(date)}</div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{fmtMoney(exps.reduce((s,e)=>s+e.amount,0),currency)}</div>
                      </div>
                      {exps.map(exp => <ExpRow key={exp.id} exp={exp} categories={categories} currency={currency} onDelete={deleteExpense} />)}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* MONTHLY */}
          {view === "monthly" && (
            <div>
              {allMonths.filter(m => expenses.some(e => e.date.startsWith(m))).length === 0 ? <EmptyState text="No data yet — start adding expenses!" /> :
                allMonths.filter(m => expenses.some(e => e.date.startsWith(m))).map((m,i) => {
                  const mExp   = expenses.filter(e => e.date.startsWith(m));
                  const mTotal = mExp.reduce((s,e)=>s+e.amount,0);
                  const mCats  = categories.map(cat => ({ ...cat, spent:mExp.filter(e=>e.categoryId===cat.id).reduce((s,e)=>s+e.amount,0) })).filter(c=>c.spent>0).sort((a,b)=>b.spent-a.spent);
                  return (
                    <div key={m} className="card fade-up" style={{ animationDelay:`${i*0.07}s`, opacity:0, background:"#13131A", border:"1px solid #1E1E28", borderRadius:16, padding:20, marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                        <div>
                          <div style={{ fontSize:18, fontFamily:"'Syne',sans-serif", fontWeight:700 }}>{fmtMonth(m)}</div>
                          {mCats[0] && <div style={{ fontSize:12, color:"#555566", marginTop:2 }}>Top: {mCats[0].icon} {mCats[0].name}</div>}
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:24, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{fmtMoney(mTotal,currency)}</div>
                          <div style={{ fontSize:12, color:"#555566" }}>{mExp.length} transactions</div>
                        </div>
                      </div>
                      <div style={{ height:8, display:"flex", borderRadius:4, overflow:"hidden", gap:1, marginBottom:10 }}>
                        {mCats.map(c => <div key={c.id} title={`${c.name}: ${fmtMoney(c.spent,currency)}`} style={{ flex:c.spent, background:c.color, opacity:0.85, minWidth:2 }} />)}
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {mCats.map(c => (
                          <div key={c.id} style={{ display:"flex", alignItems:"center", gap:4, background:"#1E1E28", padding:"4px 10px", borderRadius:20 }}>
                            <span style={{ fontSize:12 }}>{c.icon}</span>
                            <span style={{ fontSize:12, color:"#AAA" }}>{fmtMoney(c.spent,currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, total, currency }) {
  const size=120, stroke=18, r=(size-stroke)/2, circ=2*Math.PI*r;
  let offset=0;
  const segs = data.filter(d=>d.spent>0).map(d => {
    const pct=d.spent/total, seg={ ...d, dashArray:`${pct*circ} ${circ}`, dashOffset:-offset*circ };
    offset+=pct; return seg;
  });
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E1E28" strokeWidth={stroke} />
        {segs.map((seg,i) => (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke-2}
            strokeDasharray={seg.dashArray} strokeDashoffset={seg.dashOffset} strokeLinecap="round"
          />
        ))}
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:10, color:"#555566", fontWeight:600 }}>TOTAL</div>
        <div style={{ fontSize:13, fontWeight:700 }}>{currency}{Math.round(total)}</div>
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ expenses, currency }) {
  const byDay = expenses.reduce((acc,e) => { acc[e.date]=(acc[e.date]||0)+e.amount; return acc; },{});
  const days  = Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0]));
  if (!days.length) return null;
  const max = Math.max(...days.map(d=>d[1]));
  return (
    <div style={{ background:"#13131A", border:"1px solid #1E1E28", borderRadius:16, padding:20, marginBottom:20 }}>
      <div style={{ fontSize:12, color:"#555566", letterSpacing:"0.2em", textTransform:"uppercase", fontWeight:600, marginBottom:16 }}>Daily Spending</div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:80 }}>
        {days.map(([d,amt]) => (
          <div key={d} title={`${fmtDate(d)}: ${fmtMoney(amt,currency)}`} style={{ flex:1, borderRadius:"3px 3px 0 0", background:"linear-gradient(180deg,#7C6BFF,#A78BFA)", height:`${(amt/max)*100}%`, minHeight:4, opacity:0.8, cursor:"pointer", transition:"opacity 0.15s" }}
            onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=0.8} />
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
        <span style={{ fontSize:10, color:"#555566" }}>{fmtDate(days[0][0])}</span>
        <span style={{ fontSize:10, color:"#555566" }}>{fmtDate(days[days.length-1][0])}</span>
      </div>
    </div>
  );
}

// ─── Expense Row ──────────────────────────────────────────────────────────────
function ExpRow({ exp, categories, currency, onDelete }) {
  const [open, setOpen] = useState(false);
  const cat = categories.find(c=>c.id===exp.categoryId) || {};
  return (
    <div className="exp-row" style={{ background:"#13131A", borderRadius:12, marginBottom:6, overflow:"hidden", border:"1px solid #1E1E28" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", cursor:"pointer" }} onClick={() => setOpen(o=>!o)}>
        <div style={{ width:36, height:36, borderRadius:10, background:(cat.color||"#7C6BFF")+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat.icon||"💸"}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
            {cat.name||"Unknown"}
            {exp.recurring && <span style={{ fontSize:10, background:"#7C6BFF22", color:"#A78BFA", padding:"2px 6px", borderRadius:4 }}>↻ {exp.intervalDays}d</span>}
          </div>
          <div style={{ fontSize:12, color:"#555566", marginTop:1 }}>{exp.date}{exp.note?` · ${exp.note.slice(0,30)}${exp.note.length>30?"…":""}`:""}</div>
        </div>
        <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{fmtMoney(exp.amount,currency)}</div>
        <div style={{ fontSize:12, color:"#333", transition:"transform 0.2s", transform:open?"rotate(180deg)":"rotate(0deg)" }}>▾</div>
      </div>
      {open && (
        <div style={{ padding:"0 14px 14px", display:"flex", gap:12, alignItems:"flex-start", borderTop:"1px solid #1E1E28", paddingTop:12 }}>
          {exp.receiptImg && <img src={exp.receiptImg} alt="receipt" style={{ width:70, height:70, objectFit:"cover", borderRadius:8, border:"1px solid #2A2A35" }} />}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, color:"#AAA", marginBottom:8 }}>{exp.note||"No note attached."}</div>
            {exp.recurring && <div style={{ fontSize:12, color:"#7C6BFF" }}>Recurring every {exp.intervalDays} day{exp.intervalDays!==1?"s":""} · Next: {exp.nextDue}</div>}
          </div>
          <button onClick={() => onDelete(exp.id)} style={{ background:"#FF6B6B22", border:"none", color:"#FF6B6B", padding:"6px 12px", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Outfit',sans-serif" }}>Delete</button>
        </div>
      )}
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ categories, currency, onAdd, onClose }) {
  const [amount,setAmount]     = useState("");
  const [catId,setCatId]       = useState(categories[0]?.id||"");
  const [date,setDate]         = useState(todayStr());
  const [note,setNote]         = useState("");
  const [recur,setRecur]       = useState(false);
  const [interval,setInterval] = useState(30);
  const [img,setImg]           = useState(null);

  const handleImg = (e) => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>setImg(ev.target.result); r.readAsDataURL(f); };

  const submit = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    onAdd({ id:Date.now()+Math.random(), amount:n, categoryId:catId, date, note:note.trim(), recurring:recur, intervalDays:recur?Number(interval):null, nextDue:recur?addDays(date,Number(interval)):null, receiptImg:img });
  };

  return (
    <ModalShell title="Add Expense" onClose={onClose}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div style={{ gridColumn:"1/-1" }}>
          <FLabel>Amount</FLabel>
          <div style={{ display:"flex", alignItems:"center", background:"#16161C", border:"1px solid #2A2A35", borderRadius:8 }}>
            <span style={{ padding:"0 12px", color:"#7C6BFF", fontWeight:700, fontSize:16 }}>{currency}</span>
            <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus style={{ ...iStyle, background:"transparent", border:"none", flex:1, fontSize:20, fontWeight:600, boxShadow:"none" }} />
          </div>
        </div>
        <div>
          <FLabel>Category</FLabel>
          <select value={catId} onChange={e=>setCatId(e.target.value)} style={iStyle}>
            {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div>
          <FLabel>Date</FLabel>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={iStyle} />
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <FLabel>Note</FLabel>
          <input placeholder="Optional note…" value={note} onChange={e=>setNote(e.target.value)} style={iStyle} />
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <FLabel>Receipt Photo</FLabel>
          <input type="file" accept="image/*" onChange={handleImg} style={{ fontSize:13, color:"#AAA", fontFamily:"'Outfit',sans-serif" }} />
          {img && <img src={img} alt="preview" style={{ marginTop:8, width:80, height:80, objectFit:"cover", borderRadius:8 }} />}
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14 }}>
            <input type="checkbox" checked={recur} onChange={e=>setRecur(e.target.checked)} style={{ accentColor:"#7C6BFF", width:16, height:16 }} />
            <span>Recurring expense</span>
          </label>
        </div>
        {recur && (
          <div style={{ gridColumn:"1/-1" }}>
            <FLabel>Repeat every (days)</FLabel>
            <input type="number" min={1} value={interval} onChange={e=>setInterval(e.target.value)} style={iStyle} />
          </div>
        )}
      </div>
      <button className="btn-primary" onClick={submit} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#7C6BFF,#A78BFA)", color:"white", border:"none", borderRadius:10, cursor:"pointer", fontSize:15, fontWeight:700, fontFamily:"'Outfit',sans-serif", boxShadow:"0 4px 20px rgba(124,107,255,0.4)" }}>Add Expense</button>
    </ModalShell>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ state, onUpdate, onClose, onExportCSV, onExportJSON, showToast }) {
  const { categories, budgets, currency } = state;
  const [cur,setCur]         = useState(currency);
  const [overall,setOverall] = useState(budgets.overall||"");
  const [perCat,setPerCat]   = useState({ ...budgets.perCategory });
  const [newCat,setNewCat]   = useState("");

  const save = () => {
    onUpdate({ currency:cur, budgets:{ overall:Number(overall)||0, perCategory:Object.fromEntries(Object.entries(perCat).map(([k,v])=>[k,Number(v)||0])) } });
    showToast("Settings saved!"); onClose();
  };

  const addCat = () => {
    if (!newCat.trim()) return;
    const id = newCat.toLowerCase().replace(/\s+/g,"_")+"_"+Date.now();
    const icons=["📦","🎯","⭐","🔑","🌿","🎪","🏠","✈️","📚","🎵"];
    const colors=["#FF6B6B","#4ECDC4","#FFE66D","#95E1D3","#F38181","#A8D8EA","#AA96DA","#FCBAD3"];
    const i=categories.length%icons.length;
    onUpdate({ categories:[...categories,{ id, name:newCat.trim(), icon:icons[i], color:colors[i] }] });
    setNewCat(""); showToast("Category added!");
  };

  return (
    <ModalShell title="Settings" onClose={onClose}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <div>
          <FLabel>Currency Symbol</FLabel>
          <input value={cur} onChange={e=>setCur(e.target.value)} maxLength={3} style={{ ...iStyle, textAlign:"center", fontWeight:700 }} />
        </div>
        <div>
          <FLabel>Monthly Budget</FLabel>
          <input type="number" value={overall} onChange={e=>setOverall(e.target.value)} placeholder="0" style={iStyle} />
        </div>
      </div>
      <FLabel>Per-Category Budgets</FLabel>
      <div style={{ background:"#0C0C0F", borderRadius:10, padding:12, marginBottom:16, maxHeight:200, overflowY:"auto" }}>
        {categories.map(cat => (
          <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:16, width:24 }}>{cat.icon}</span>
            <span style={{ flex:1, fontSize:13 }}>{cat.name}</span>
            <input type="number" value={perCat[cat.id]||""} onChange={e=>setPerCat(p=>({ ...p,[cat.id]:e.target.value }))} placeholder="0" style={{ ...iStyle, width:90, textAlign:"right", padding:"6px 10px" }} />
          </div>
        ))}
      </div>
      <FLabel>Add Category</FLabel>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Category name" style={{ ...iStyle, flex:1 }} onKeyDown={e=>e.key==="Enter"&&addCat()} />
        <button onClick={addCat} style={{ background:"#7C6BFF22", border:"1px solid #7C6BFF44", color:"#A78BFA", padding:"0 16px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'Outfit',sans-serif" }}>Add</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        {[["Export CSV",onExportCSV],["Export JSON",onExportJSON]].map(([label,fn]) => (
          <button key={label} onClick={fn} style={{ background:"#16161C", border:"1px solid #2A2A35", color:"#AAA", padding:10, borderRadius:8, cursor:"pointer", fontSize:13, fontFamily:"'Outfit',sans-serif", fontWeight:500 }}>{label}</button>
        ))}
      </div>
      <button className="btn-primary" onClick={save} style={{ width:"100%", padding:13, background:"linear-gradient(135deg,#7C6BFF,#A78BFA)", color:"white", border:"none", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Save Settings</button>
    </ModalShell>
  );
}

// ─── Setup Modal ──────────────────────────────────────────────────────────────
function SetupModal({ onDone }) {
  const [cur,setCur] = useState("$");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)" }}>
      <div className="fade-up" style={{ background:"#13131A", border:"1px solid #2A2A35", padding:36, maxWidth:340, width:"90%", borderRadius:20, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>💸</div>
        <div style={{ fontSize:24, fontFamily:"'Syne',sans-serif", fontWeight:800, marginBottom:6 }}>Welcome!</div>
        <div style={{ fontSize:14, color:"#555566", marginBottom:24 }}>Set your preferred currency symbol to get started.</div>
        <input value={cur} onChange={e=>setCur(e.target.value)} maxLength={3} style={{ ...iStyle, textAlign:"center", fontSize:28, fontWeight:700, width:80, marginBottom:20, borderRadius:10 }} autoFocus />
        <button className="btn-primary" onClick={()=>cur&&onDone(cur)} style={{ display:"block", width:"100%", padding:14, background:"linear-gradient(135deg,#7C6BFF,#A78BFA)", color:"white", border:"none", borderRadius:10, cursor:"pointer", fontSize:15, fontWeight:700, fontFamily:"'Outfit',sans-serif", boxShadow:"0 4px 20px rgba(124,107,255,0.4)" }}>Get Started →</button>
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="fade-up" style={{ background:"#13131A", border:"1px solid #2A2A35", width:"100%", maxWidth:560, borderRadius:"20px 20px 0 0", padding:"24px 20px 32px", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:700 }}>{title}</div>
          <button onClick={onClose} style={{ background:"#1E1E28", border:"none", color:"#AAA", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:16 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function GhostBtn({ children, onClick }) {
  return <button onClick={onClick} style={{ background:"#16161C", border:"1px solid #2A2A35", color:"#AAA", width:40, height:40, borderRadius:8, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>{children}</button>;
}

function FLabel({ children }) {
  return <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.2em", color:"#555566", textTransform:"uppercase", marginBottom:6, fontFamily:"'Outfit',sans-serif" }}>{children}</div>;
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:"#333344" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
      <div style={{ fontSize:14, fontWeight:500 }}>{text}</div>
    </div>
  );
}

const iStyle = { width:"100%", background:"#16161C", border:"1px solid #2A2A35", color:"#F0EEF8", padding:"10px 12px", borderRadius:8, fontSize:14, fontFamily:"'Outfit',sans-serif", boxSizing:"border-box" };
