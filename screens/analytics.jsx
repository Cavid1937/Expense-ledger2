// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { useMemo, useRef, useState } from "react";
import { Collapse, Swap, useLeave } from "./motion.jsx";
import { locale, t, tn } from "../i18n.js";
import { CAT, CatIcon, Icon, KEY, isEarnedCat, refundsNetted, PATTERN_BASIS_KEY, PATTERN_TITLE_KEY, PRIVACY, activateKey, addAmt, calcBudgetStatus, calcCategorySpend, calcCoach, calcHelperCards, calcMonthEndForecast, calcMonthSummary, calcPatterns, calcTxnStats, calcWalletSpend, calcWeekdayWeekend, calcWhatChanged, catName, cumulativeByDay, curMon, debtCashFlow, donutSlices, fmt, fmtDate, fmtPct, fmtShort, happenedIn, loanCashOut, localMonthStr, maskText, median, monthName, monthShort, nMon, readDebts, surplusColor, surplusLabel, today, walletName } from "../App.jsx";
import { accountsMap, readAccounts } from "../App.jsx";
// Run 70: category colours drawn darker on light themes
import { catInk } from "../App.jsx";
// Run 70: the spending calendar is tinted with the theme's own button colour (opaque, so the day number stays measurable); light themes
// tint less (--heat-scale) so the dark day number stays readable, and dark themes switch the number to the button text colour on strong days.
const heat=(x)=>`color-mix(in srgb, var(--accent-fill) calc(${Math.round(x*100)}% * var(--heat-scale, 1)), var(--bg-card))`;   // Run 57: Analytics groups spending by the same "paid from" rule as the entry filter
import { budgetCarried, readBudgetCarry, notSpentHistory } from "../App.jsx";   // Run 59

// Run 59 (owner-approved): money not spent = money in minus money out, from what was recorded (notSpentHistory in App.jsx has the exact rule).
// A quiet line for the chosen month and a running total over FINISHED months, with its working one tap away. Never called savings; unused
// budget never enters it. Shown only once there is at least one finished month.
function NotSpentCard({ raw, mon, currency }) {
  const h=useMemo(()=>notSpentHistory(raw),[raw]);
  const [open,setOpen]=useState(false);
  if (!h.months.length) return null;
  const cur=curMon(), row=mon===cur ? h.current : h.months.find(r=>r.mon===mon);
  const sign=(n)=>(n<0?"−":"")+fmt(Math.abs(n),currency);
  const line=(r,isCur)=>!r ? "" : r.net>0 ? t(isCur?"notspent.soFarPos":"notspent.monthPos",{ month:monthName(r.mon), amount:fmt(r.net,currency) })
    : r.net<0 ? t(isCur?"notspent.soFarNeg":"notspent.monthNeg",{ month:monthName(r.mon), amount:fmt(-r.net,currency) }) : t(isCur?"notspent.soFarZero":"notspent.monthZero",{ month:monthName(r.mon) });
  return (
    <div className="a-card" data-section="an-notspent">
      {row&&<div data-section="notspent-month" style={{fontSize:13,marginBottom:10,color:row.net<0?"var(--neg)":"var(--ink)"}}>{line(row,mon===cur)}</div>}
      <div className="a-card-title">{t("notspent.title")}</div>
      <div className="big-num" data-section="notspent-total" style={{color:h.total<0?"var(--neg)":"var(--ink)"}}><MoneyText v={sign(h.total)}/></div>
      <div className="list-sub" style={{marginTop:4,lineHeight:1.5}}>{t("notspent.note")}</div>
      <button type="button" className="btn btn-sm" data-section="notspent-toggle" aria-expanded={open} style={{marginTop:10}} onClick={()=>setOpen(o=>!o)}>{t(open?"notspent.hide":"notspent.show")}</button>
      <Collapse open={open}>
        <div data-section="notspent-rows" role="list" style={{marginTop:10}}>
          {h.months.slice().reverse().map(r=>(
            <div key={r.mon} role="listitem" data-mon={r.mon} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"6px 0",borderTop:"1px solid var(--rule)",fontSize:12.5,lineHeight:1.4}}>
              <span style={{minWidth:0}}><span style={{display:"block",fontWeight:600}}>{monthName(r.mon)}</span><span className="list-sub">{t("notspent.inOut",{ inn:fmt(r.in,currency), out:fmt(r.out,currency) })}</span></span>
              <span style={{fontWeight:600,whiteSpace:"nowrap",color:r.net<0?"var(--neg)":"var(--ink)"}}>{sign(r.net)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",gap:8,padding:"8px 0 0",borderTop:"1px solid var(--rule)",fontWeight:700,fontSize:13}}><span>{t("notspent.total")}</span><span style={{whiteSpace:"nowrap"}}>{sign(h.total)}</span></div>
        </div>
      </Collapse>
    </div>
  );
}
import { LedgerArt, MoneyText, PlannedNote, cmpPrev, cmpText, cmpTitle } from "./home.jsx";

// ─── Redesign pages (2026-10-27) ─────────────────────────────────────────────────────────────────────────────────────

export function SpendDonut({ catSpend, total, currency }) {
  // Run 17: tap a slice (or its legend row) to focus it: the ring grows, that slice thickens, the rest fade and the centre names it;
  // tap it again to go back. One selection at a time.
  const [sel,setSel]=useState(null);
  const slices=donutSlices(catSpend);
  if (!slices.length) return null;
  const cur=slices.find(s=>s.id===sel)||null;
  const toggle=(id)=>setSel(s=>s===id?null:id);
  const R=46, C=2*Math.PI*R; let off=0;
  return (
    <div className="donut-wrap">
      <div className={`donut${cur?" has-sel":""}`} role="img" aria-label={t("home.breakdown")+": "+slices.map(s=>`${s.name} ${fmtPct(s.pct)}`).join(", ")}>
        <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--bg-inset)" strokeWidth="14"/>
          {slices.map(s=>{ const len=C*s.amt/total, gap=slices.length>1?Math.min(2,len/3):0; const on=cur&&cur.id===s.id; const el=(
            <circle key={s.id} className="donut-slice" data-id={s.id} cx="60" cy="60" r={R} fill="none" strokeWidth={on?20:14} strokeDasharray={`${Math.max(len-gap,0.01)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 60 60)"
              style={{stroke:catInk(s.color),opacity:cur&&!on?0.35:1,cursor:"pointer"}} onClick={()=>toggle(s.id)}/>
          ); off+=len; return el; })}
        </svg>
        {cur
          ? <div className="donut-center donut-center-sel"><span className="dc-name">{cur.name}</span><span className="dc-amt">{fmt(cur.amt,currency)}</span><span className="dc-pct">{fmtPct(cur.pct)}</span></div>
          : <div className="donut-center">{fmtShort(total,currency)}</div>}
      </div>
      <ul className="donut-legend">
        {slices.map(s=>(
          <li key={s.id}><button type="button" className="donut-row" data-id={s.id} aria-pressed={!!cur&&cur.id===s.id} onClick={()=>toggle(s.id)} style={{opacity:cur&&cur.id!==s.id?0.55:1}}>
            <span className="dot" style={{background:catInk(s.color)}}/><span className="donut-name">{s.name}</span><span className="donut-pct">{fmtPct(s.pct)}</span></button></li>
        ))}
      </ul>
    </div>
  );
}

// Run 40 (owner: "smoother and more understandable chart"): a smooth curve through the daily points that never dips below a day it has
// passed (monotone cubic, Fritsch–Carlson), so a running total never looks as if it went down.
export function smoothPath(pts) {
  if (pts.length<2) return "";
  const n=pts.length, dx=[], m=[], tg=new Array(n).fill(0);
  for (let i=0;i<n-1;i++) { dx[i]=pts[i+1][0]-pts[i][0]; m[i]=dx[i]?(pts[i+1][1]-pts[i][1])/dx[i]:0; }
  tg[0]=m[0]; tg[n-1]=m[n-2];
  for (let i=1;i<n-1;i++) tg[i]=m[i-1]*m[i]<=0 ? 0 : (m[i-1]+m[i])/2;
  for (let i=0;i<n-1;i++) {
    if (m[i]===0) { tg[i]=0; tg[i+1]=0; continue; }
    const a=tg[i]/m[i], b=tg[i+1]/m[i], s=a*a+b*b;
    if (s>9) { const k=3/Math.sqrt(s); tg[i]=k*a*m[i]; tg[i+1]=k*b*m[i]; }
  }
  const f=(v)=>v.toFixed(1);
  let d=`M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i=0;i<n-1;i++) { const h=dx[i]/3; d+=` C${f(pts[i][0]+h)},${f(pts[i][1]+tg[i]*h)} ${f(pts[i+1][0]-h)},${f(pts[i+1][1]-tg[i+1]*h)} ${f(pts[i+1][0])},${f(pts[i+1][1])}`; }
  return d;
}
// Run 40: the one-line answer above the chart: this month so far against the same day of last month (cents compared, so 0.1+0.2 is not "more").
export function trendCompare(cur, prev) {
  const li=cur.reduce((m,v,i)=>v!==null?i:m,-1); if (li<0 || !prev.length) return null;
  const a=cur[li], b=prev[Math.min(li,prev.length-1)]; if (!(b>0) && !(a>0)) return null;
  const diff=Math.round(a*100)-Math.round((b||0)*100);
  return { kind:diff<0?"less":diff>0?"more":"same", amount:Math.abs(diff)/100, day:li+1 };
}
const axisMoney=(v,sym)=>PRIVACY ? fmt(v,sym) : fmtShort(Math.round(v),sym).replace(/[.,]00(?=\D|$)/,"");

// Analytics "Spending trend": this month's running total, with the previous month's as a faint line for comparison.
export function SpendingTrend({ transactions, mon, prv, currency }) {
  const [sel,setSel]=useState(null);   // Run 38: the day (0-based) picked on the chart, or null
  const cur=cumulativeByDay(transactions,mon), prev=cumulativeByDay(transactions,prv);
  const curLast=[...cur].reverse().find(v=>v!==null)??0, prevLast=prev[prev.length-1]??0;
  if (!(curLast>0) && !(prevLast>0)) return null;
  const W=320, H=120, n=Math.max(cur.length,prev.length), max=Math.max(curLast,prevLast,1)*1.08;   // 8% headroom so the top label never touches the line
  const x=i=>(i/(n-1))*W, y=v=>H-(v/max)*(H-8);
  const pts=arr=>arr.map((v,i)=>v===null?null:[x(i),y(v)]).filter(Boolean);
  const cpt=pts(cur), ppt=pts(prev);
  const curD=smoothPath(cpt), prevD=smoothPath(ppt);
  const cmp=trendCompare(cur,prev);
  const ticks=[1,8,15,22,n];
  // Run 38 (owner: "the user moves his finger along the line and sees what he spent on that date"): touch / drag / arrow keys pick a day.
  // Horizontal drags only (touch-action: pan-y), so scrolling the page still works. The readout stays after the finger lifts.
  const lastIdx=Math.max(0,cur.reduce((m,v,i)=>v!==null?i:m,-1));
  const pick=(e)=>{ const r=e.currentTarget.getBoundingClientRect(); if (!r.width) return; const i=Math.round(((e.clientX-r.left)/r.width)*(n-1)); setSel(Math.max(0,Math.min(n-1,i))); };
  const onKey=(e)=>{ if (e.key==="ArrowRight"||e.key==="ArrowLeft") { e.preventDefault(); setSel(s=>{ const b=s===null?lastIdx:s; return Math.max(0,Math.min(n-1,b+(e.key==="ArrowRight"?1:-1))); }); } else if (e.key==="Escape") setSel(null); };
  const si=sel!==null&&sel<n?sel:null;
  const curV=si!==null&&si<cur.length?cur[si]:null, prevV=si!==null&&si<prev.length?prev[si]:null;
  const dayV=curV!==null ? Math.round((curV-(si>0&&cur[si-1]!==null?cur[si-1]:0))*100)/100 : null;
  const dayDate=si!==null?`${mon}-${String(si+1).padStart(2,"0")}`:"";
  return (
    <div className="card trend-card">
      <div className="card-head"><span className="card-title">{t("an.trendTitle")}</span></div>
      <div className="big-num" style={{marginBottom:2}}>{fmt(curLast,currency)}</div>
      {cmp&&<div className={"trend-cmp trend-cmp-"+cmp.kind} data-section="trend-cmp">{cmp.kind==="same" ? t("an.trendSame") : t(cmp.kind==="less"?"an.trendLess":"an.trendMore",{ amount:fmt(cmp.amount,currency) })}</div>}
      <div className="list-sub" style={{marginBottom:6}}>{t("an.trendSub",{month:monthName(prv)})}</div>
      <div className="list-sub" data-section="trend-readout" aria-live="polite" style={{minHeight:58,marginBottom:4,lineHeight:1.45,color:si!==null?"var(--ink)":"var(--ink-3)"}}>
        {si===null ? t("an.scrubHint")
          : <>{curV!==null ? t("an.scrubDay",{ date:fmtDate(dayDate), day:fmt(dayV,currency), total:fmt(curV,currency) }) : t("an.scrubFuture",{ date:fmtDate(dayDate) })}
              {prevV!==null&&<><br/>{t("an.scrubPrev",{ total:fmt(prevV,currency) })}</>}</>}
      </div>
      <svg viewBox={`0 0 ${W} ${H+18}`} width="100%" role="img" data-section="trend-chart" tabIndex={0} aria-label={t("an.trendAria",{amount:fmt(curLast,currency),prev:fmt(prevLast,currency)})+" "+t("an.scrubHint")}
        style={{touchAction:"pan-y",cursor:"crosshair",outline:"none"}}
        onPointerDown={e=>{ try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} pick(e); }} onPointerMove={e=>{ if (e.buttons || e.pointerType==="touch") pick(e); }} onKeyDown={onKey}>
        <defs><linearGradient id={"trend-fill-"+mon} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.28"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0.02"/></linearGradient></defs>
        {[0.5,1].map(f=><g key={f}><line x1="0" x2={W} y1={y(max*f/1.08)} y2={y(max*f/1.08)} stroke="var(--rule)" strokeWidth="1" strokeDasharray={f<1?"2 4":undefined}/>
          <text className="trend-axis" x={W-2} y={y(max*f/1.08)-4} textAnchor="end" fontSize="10" fill="var(--ink-3)">{axisMoney(max*f/1.08,currency)}</text></g>)}
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--rule-2)" strokeWidth="1"/>
        {/* keyed by month: a new month draws itself in again (CSS .trend-draw; instant with reduced motion) */}
        <g key={mon} className="trend-draw">
          {ppt.length>1&&<path className="trend-prev" d={prevD} fill="none" stroke="var(--ink-4)" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round"/>}
          {cpt.length>1&&<>
            <path className="trend-area" d={`${curD} L${cpt[cpt.length-1][0].toFixed(1)},${H} L${cpt[0][0].toFixed(1)},${H} Z`} fill={`url(#trend-fill-${mon})`}/>
            <path className="trend-line" d={curD} pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
            {si===null&&<circle className="trend-end" cx={cpt[cpt.length-1][0]} cy={cpt[cpt.length-1][1]} r="4" fill="var(--accent)" stroke="var(--bg-card)" strokeWidth="2"/>}
          </>}
        </g>
        {ticks.map(d=><text key={d} x={Math.min(Math.max(x(d-1),8),W-8)} y={H+15} textAnchor="middle" fontSize="11" fill="var(--ink-3)">{d}</text>)}
        {si!==null&&<g data-section="trend-cursor" pointerEvents="none">
          <line className="trend-glide" x1="0" x2="0" y1="0" y2={H} stroke="var(--ink-3)" strokeWidth="1" style={{transform:`translateX(${x(si)}px)`}}/>
          {prevV!==null&&<circle className="trend-glide" cx="0" cy="0" r="3.5" fill="var(--bg-card)" stroke="var(--ink-4)" strokeWidth="1.5" style={{transform:`translate(${x(si)}px,${y(prevV)}px)`}}/>}
          {curV!==null&&<circle className="trend-glide" cx="0" cy="0" r="4.5" fill="var(--accent)" stroke="var(--bg-card)" strokeWidth="2" style={{transform:`translate(${x(si)}px,${y(curV)}px)`}}/>}
        </g>}
      </svg>
      <div className="trend-legend"><span><i style={{background:"var(--accent)"}}/>{monthName(mon)}</span><span><i className="dash"/>{monthName(prv)}</span></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY VIEW — browse any month, see full breakdown
// ─────────────────────────────────────────────────────────────────────────────
// ─── Monthly (Run 7: Monthly and Analytics merged into one month-aware screen) ──────────────────────────────────────
// One selected month drives every month figure on the page: summary and comparison, what changed, statistics, budgets,
// categories, merchants, top expenses and the transaction list. The "Trends" section below them covers recent months up
// to today and says so; it does not change with the selected month. Every calendar month from the first entry to today
// (or to the last month with planned entries) can be selected, including months with no entries.
export function monthsBetween(from, to) {   // "YYYY-MM" inclusive, newest first
  const out=[]; let [y,m]=to.split("-").map(Number); const [fy,fm]=from.split("-").map(Number);
  while (y>fy || (y===fy && m>=fm)) { out.push(`${y}-${String(m).padStart(2,"0")}`); m--; if (m===0) { m=12; y--; } }
  return out;
}
// Run 34: Analytics was one very long page ("pure chaos"). It now has four sections under the month picker; every section stays mounted (only hidden), so nothing is lost when you switch.
const AN_SEGS=["overview","spending","trends","insights"];
const AN_SEG_KEY={ overview:"an.seg.overview", spending:"an.seg.spending", trends:"an.seg.trends", insights:"an.seg.insights" };
function AnPanel({ id, seg, children }) { return <div className="an-panel" data-panel={id} hidden={seg!==id}>{children}</div>; }
export function MonthlyView({ transactions, rawTransactions, currency, budgets, bills=[], onView }) {
  const [selectedMon, setSelectedMon] = useState(curMon());
  const [seg, setSeg] = useState("overview"), [dir, setDir] = useState(0);
  const [activeBar,  setActiveBar]  = useState(null), barKeep=useRef(null); if (activeBar!==null) barKeep.current=activeBar;
  const [calDay, setCalDay] = useState(null), calKeep=useRef(null); if (calDay) calKeep.current=calDay;
  const { isLeaving, leave }=useLeave();
  const lc=locale();
  const patternsData=useMemo(()=>calcPatterns(transactions,currency),[transactions,currency,lc]);   // insight text follows the language

  const allMonths = useMemo(() => {
    const ms=transactions.map(t=>t.date.slice(0,7)).sort(), cur=curMon();
    const first=ms.length && ms[0]<cur ? ms[0] : cur, last=ms.length && ms[ms.length-1]>cur ? ms[ms.length-1] : cur;
    return monthsBetween(first,last);
  }, [transactions]);
  const idx=allMonths.indexOf(selectedMon);
  const prevM = () => { if (idx < allMonths.length - 1) { setDir(-1); setSelectedMon(allMonths[idx + 1]); } };
  const nextM = () => { if (idx > 0) { setDir(1); setSelectedMon(allMonths[idx - 1]); } };
  const prv = useMemo(() => { const [y,m]=selectedMon.split("-").map(Number); return localMonthStr(new Date(y,m-2,1)); }, [selectedMon]);

  const { curExp, curInc, curNet, curRefundIn, curSavOut, hasSpread, surplusRate, prevExp, prevFullExp, momDiff, plannedExp, plannedInc, cmpKind, cmpDays } = calcMonthSummary(transactions, selectedMon, prv);
  const catSpend    = calcCategorySpend(transactions, selectedMon);
  const budgetItems = calcBudgetStatus(budgets || {}, catSpend, selectedMon, new Date(), budgetCarried(transactions, budgets || {}, readBudgetCarry(), selectedMon));   // Run 59: same limits as Budgets
  const budgetTotal = Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const forecast    = useMemo(()=>calcMonthEndForecast(transactions,bills,new Date()),[transactions,bills]);   // Run 17
  const debtCash    = useMemo(()=>debtCashFlow(rawTransactions||[],selectedMon),[rawTransactions,selectedMon]);   // Run 18
  const loanCash    = useMemo(()=>loanCashOut(rawTransactions||[],selectedMon),[rawTransactions,selectedMon]);   // Run 17
  const refundLow   = useMemo(()=>refundsNetted(rawTransactions||[],selectedMon),[rawTransactions,selectedMon]);   // Run 36
  // Run 18g: the user can hide a coach tip they do not want (stored only on this device; due-date warnings cannot be hidden).
  const COACH_MUTE_KEY=`${KEY}__coachmute`, COACH_ACTIONS=["loanDue","loanOverdue","owedLate"];
  const [muted,setMuted]=useState(()=>{ try { const v=JSON.parse(localStorage.getItem(COACH_MUTE_KEY)||"[]"); return Array.isArray(v)?v.filter(x=>typeof x==="string"):[]; } catch { return []; } });
  const setMute=(next)=>{ setMuted(next); try { if (next.length) localStorage.setItem(COACH_MUTE_KEY,JSON.stringify(next)); else localStorage.removeItem(COACH_MUTE_KEY); } catch {} };
  // Run 20: Patterns lines can be hidden one by one and brought back, like the coach cards (own key, ledger untouched).
  const PAT_MUTE_KEY=`${KEY}__patmute`;
  const [patMuted,setPatMuted]=useState(()=>{ try { const v=JSON.parse(localStorage.getItem(PAT_MUTE_KEY)||"[]"); return Array.isArray(v)?v.filter(x=>typeof x==="string"):[]; } catch { return []; } });
  const setPatMute=(next)=>{ setPatMuted(next); try { if (next.length) localStorage.setItem(PAT_MUTE_KEY,JSON.stringify(next)); else localStorage.removeItem(PAT_MUTE_KEY); } catch {} };
  const coach       = useMemo(()=>calcCoach(transactions,readDebts(),new Date(),bills),[transactions,bills]);             // Run 17: Debts-page data is read when the ledger changes
  const txnStats    = calcTxnStats(transactions,selectedMon);
  const perDay      = calcWeekdayWeekend(transactions,selectedMon);
  const wc          = calcWhatChanged(transactions,selectedMon,prv);
  const expenses    = transactions.filter(t => t.type === "expense");
  const done        = happenedIn(selectedMon);
  const isCurrentMon = selectedMon === curMon();

  const catData = Object.entries(catSpend).map(([id, amt]) => ({ ...CAT(id) || { id, name: id, color:"#98A5B7" }, amt })).sort((a,b) => b.amt - a.amt);
  const maxCat = catData[0]?.amt || 1;
  const merchantTotals = {};
  expenses.filter(t => done(t) && t.merchant).forEach(t => { merchantTotals[t.merchant] = (merchantTotals[t.merchant]||0) + t.amount; });
  const topMerchants = Object.entries(merchantTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const monTxns = transactions.filter(t => t.date.startsWith(selectedMon));
  const walletSpend = calcWalletSpend(transactions, selectedMon, new Date(), accountsMap(readAccounts()));   // Run 16; Run 57: same "paid from" rule as the entry filter
  const recurringCount = transactions.filter(x=>x.recurring&&x.date.startsWith(selectedMon)).length;

  // Trends: recent months up to today, independent of the selected month.
  const WEEKDAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const wdName=(i,style)=>t(style==="long"?"dow."+WEEKDAYS[i]:style==="short"?"wdShort."+WEEKDAYS[i]:"wdNarrow."+WEEKDAYS[i]);
  const { insights:patterns, anomalies, dayOfWeek, correlations } = patternsData;
  const now=curMon();
  const months6=Array.from({length:6},(_,i)=>nMon(5-i));
  // Run 18g: each month shows what was spent AND what came in, so a month is read as a pair, not just a cost.
  const monthlyData=months6.map(m=>({label:monthShort(m),exp:expenses.filter(happenedIn(m)).reduce(addAmt,0),inc:transactions.filter(t=>t.type==="income"&&happenedIn(m)(t)).reduce(addAmt,0),isCur:m===now,ym:m}));
  const maxMonth=Math.max(...monthlyData.map(m=>Math.max(m.exp,m.inc)),1);
  const monthAvg=monthlyData.filter(m=>!m.isCur&&m.exp>0).reduce((s,m,_,a)=>s+m.exp/a.length,0);
  const DAY_LBLS=WEEKDAYS.map((_,i)=>wdName(i,"narrow"));
  // Run 17: month calendar for the selected month (replaces the 8-week heatmap): spending per day, Monday first.
  const [cy,cm]=selectedMon.split("-").map(Number);
  const calDim=new Date(cy,cm,0).getDate(), calLead=(new Date(cy,cm-1,1).getDay()+6)%7;
  const calDays=Array.from({length:calDim},(_,i)=>{ const ds=`${selectedMon}-${String(i+1).padStart(2,"0")}`;
    const items=expenses.filter(x=>x.date===ds&&done(x));
    return { date:ds, day:i+1, amt:items.reduce(addAmt,0), cats:items.map(x=>catName(x.category)).filter((v,j,arr)=>arr.indexOf(v)===j).join(", "), future:ds>today(), isToday:ds===today() }; });
  const maxDay=Math.max(...calDays.map(c=>c.amt),1);  const hasTrends = expenses.length>0;

  return (
    <div onClick={()=>{setActiveBar(null);setCalDay(null);}}>
      {/* Month selector — the one month setting for everything above the Trends section */}
      <div className="month-selector" data-section="an-month">
        <button className="month-nav-btn" onClick={prevM} disabled={idx===allMonths.length-1} aria-label={t("month.prev")} style={{opacity:idx===allMonths.length-1?0.3:1}}>‹</button>
        <div style={{textAlign:"center"}}>
          <h1 className="month-name" style={{margin:0}}>{monthName(selectedMon)}</h1>
          {isCurrentMon && <div style={{fontSize:10,color:"var(--accent)",fontWeight:700,letterSpacing:"0.5px",marginTop:2,textTransform:"uppercase"}}>{t("month.current")}</div>}
        </div>
        <button className="month-nav-btn" onClick={nextM} disabled={idx===0} aria-label={t("month.next")} style={{opacity:idx===0?0.3:1}}>›</button>
      </div>

      <div className="an-seg" onClick={e=>e.stopPropagation()}>
        <div className="seg" role="tablist" aria-label={t("an.segLabel")} data-section="an-seg">
          {AN_SEGS.map(id=>(<button key={id} role="tab" id={"an-tab-"+id} aria-selected={seg===id} className={`seg-btn${seg===id?" on":""}`} data-seg={id} onClick={()=>{ setSeg(id); setActiveBar(null); setCalDay(null); }}>{t(AN_SEG_KEY[id])}</button>))}
        </div>
      </div>
      <Swap k={selectedMon} dir={dir}>
      <AnPanel id="overview" seg={seg}>
      {/* Summary stats */}
      <div className="month-stats" data-section="an-summary" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        <div className="month-stat">
          <div className="month-stat-val" style={{color:"var(--neg)"}}><MoneyText v={fmt(curExp,currency)}/></div>
          <div className="month-stat-lbl">{t("home.spent")}</div>
          {momDiff!==null&&<div className="month-cmp" style={{fontSize:11,color:momDiff<=0?"var(--pos)":"var(--neg)",fontWeight:600,marginTop:4}}>
            {momDiff<=0?"↓":"↑"} {cmpText(momDiff,cmpKind,currency)}
          </div>}
        </div>
        <div className="month-stat">
          <div className="month-stat-val" style={{color:"var(--pos)"}}><MoneyText v={fmt(curInc,currency)}/></div>
          <div className="month-stat-lbl">{t("home.income")}</div>
          {surplusRate!==null&&<div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>
            {fmtPct(surplusRate)} {t("surplus."+surplusLabel(curNet,0)).toLowerCase()}
          </div>}
        </div>
        {/* Run 65 (owner decision 13 Nov): the monthly surplus / deficit = earned income minus spending (money taken from savings is not income) */}
        <div className="month-stat" style={{gridColumn:"1 / -1"}} data-section="an-month-net">
          <div className="month-stat-val" style={{color:surplusColor(curNet,0)}}><MoneyText v={fmt(Math.abs(curNet),currency)}/></div>
          <div className="month-stat-lbl">{t("month.net."+(curNet>0?"Net surplus":curNet<0?"Net deficit":"Break-even"))}</div>
          {curRefundIn>0&&<div className="list-sub" data-section="an-other-in" style={{marginTop:4}}>{t("month.otherIn",{amount:fmt(curRefundIn,currency)})}</div>}
          {curSavOut>0&&<div className="list-sub" data-section="an-savings-out" style={{marginTop:4}}>{t("month.savingsOut",{amount:fmt(curSavOut,currency)})}</div>}
          {hasSpread&&<div className="list-sub" data-section="an-spread-note" style={{marginTop:4}}>{t("month.spreadNote")}</div>}
          {refundLow>0&&<div className="list-sub" data-section="an-refund-net" style={{marginTop:4}}>{t("month.refundNet",{amount:fmt(refundLow,currency)})}</div>}
          {momDiff!==null&&prevExp>0&&<div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>{cmpPrev(cmpKind,prevExp,currency)}</div>}
          {momDiff!==null&&cmpKind==="same"&&<div className="cmp-window" style={{fontSize:11,color:"var(--ink-3)",marginTop:2}}>{t("cmp.window",{d:cmpDays})}</div>}
        </div>
      </div>
      <PlannedNote plannedExp={plannedExp} plannedInc={plannedInc} currency={currency} style={{marginTop:-8,marginBottom:16}}/>
      {debtCash.n>0&&(
        <div className="list-sub" data-section="an-debtcash" style={{margin:"-4px 2px 14px",lineHeight:1.5}}>
          {t("an.debtCash",{out:fmt(debtCash.out,currency),inn:fmt(debtCash.in,currency)})}
        </div>
      )}
      {loanCash.n>0&&(
        <div className="list-sub" data-section="an-loancash" style={{margin:"-4px 2px 14px",lineHeight:1.5}}>
          {t("an.loanCash",{paid:fmt(loanCash.paid,currency),interest:fmt(loanCash.interest,currency)})}
          {loanCash.unknown>0&&<> {t("an.loanCashUnknown",{n:loanCash.unknown})}</>}
        </div>
      )}
      <NotSpentCard raw={rawTransactions||transactions} mon={selectedMon} currency={currency}/>
      <div data-section="an-trend"><SpendingTrend transactions={transactions} mon={selectedMon} prv={prv} currency={currency}/></div>
      {isCurrentMon&&(
        <div className="a-card" data-section="an-forecast">
          <div className="a-card-title">{t("an.forecast")}</div>
          {forecast.available?(<>
            <div className="big-num" style={{marginBottom:2}}>{fmt(forecast.point,currency)}</div>
            {forecast.rangeShown
              ? <div style={{fontSize:12,color:"var(--ink-2)",fontWeight:600}}>{t("an.forecastRange",{low:fmt(forecast.low,currency),high:fmt(forecast.high,currency)})}</div>
              : <div className="list-sub">{t("an.forecastSingle")}</div>}
            <div className="list-sub" style={{marginTop:6,lineHeight:1.5}}>{t("an.forecastHow",{daily:fmt(forecast.usualDaily,currency)})}</div>
          </>):<div className="list-sub">{t("an.forecastNeed")}</div>}
        </div>
      )}
      {recurringCount>0&&(
        <div style={{background:"var(--bg-warm)",borderRadius:8,padding:"10px 13px",marginBottom:14,fontSize:12,color:"var(--ink-3)"}}>
          <Icon name="repeat" size={12} color="var(--ink-4)"/> {tn("month.recurringCount",recurringCount)}
        </div>
      )}
      </AnPanel>

      <AnPanel id="insights" seg={seg}>
      {isCurrentMon&&coach.length>0&&(
        <div className="a-card" data-section="an-coach">
          <div className="a-card-title">{t("coach.title")}</div>
          {coach.filter(c=>COACH_ACTIONS.includes(c.id)||!muted.includes(c.id)).map((c,i)=>{
            const num=(n)=>PRIVACY?"••":n, amt=(q)=>fmt(q/100,currency);
            const line = c.id==="incomplete" ? t("coach.incomplete",{days:c.days})
              : c.id==="noIncome" ? t("coach.noIncome")
              : c.id==="spent" ? t("coach.spent",{pct:num(c.pct),kept:num(c.kept)})
              : c.id==="over" ? t("coach.over",{pct:num(c.pct)})
              : c.id==="future" ? t("coach.future",{n:c.n})
              : c.id==="welcome" ? t("coach.welcome")
              : c.id==="incomeDip" ? t("coach.incomeDip",{have:c.have,of:c.of,pct:num(c.pct)})
              : c.id==="loanShare" ? t("coach.loanShare",{pct:num(c.pct)})
              : c.id==="loanShareHigh" ? t("coach.loanShareHigh",{pct:num(c.pct)})
              : c.id==="billsShare" ? t("coach.billsShare",{pct:num(c.pct)})
              : c.id==="catUp" ? t("coach.catUp",{cat:catName(c.cat),pct:num(c.pct)})
              : c.id==="loanInterest" ? t("coach.loanInterest",{lender:maskText(c.lender),amount:amt(c.amount)})
              : c.id==="microSpill" ? t("coach.microSpill",{n:num(c.n),total:amt(c.total)})
              : c.id==="lifestyle" ? t("coach.lifestyle",{inc:num(c.inc),spend:num(c.spend),share:num(c.share)})
              : c.id==="windfall" ? t("coach.windfall",{amount:amt(c.amount),cat:catName(c.cat)})
              : c.id==="monthLeft" ? t("coach.monthLeft",{amount:amt(c.amount)})
              : c.id==="incomeHill" ? t("coach.incomeHill",{pct:num(c.pct)})
              : c.id==="priceUp" ? t("coach.priceUp",{merchant:maskText(c.merchant),from:amt(c.from),to:amt(c.to),pct:num(c.pct)})
              : c.id==="noCover" ? t("coach.noCover",{lender:maskText(c.lender)})
              : c.id==="loanDue" ? t("coach.loanDue",{lender:maskText(c.lender),amount:amt(c.amount),date:fmtDate(c.date)})
              : c.id==="loanOverdue" ? t("coach.loanOverdue",{lender:maskText(c.lender),amount:amt(c.amount),date:fmtDate(c.date)})
              : t("coach.owedLate",{name:maskText(c.name),amount:amt(c.amount),date:fmtDate(c.date)});
            return (
              <div key={c.id+i} className={"coach-line"+(isLeaving("c-"+c.id)?" row-leaving":"")} data-coach={c.id} style={{fontSize:13,lineHeight:1.5,padding:"8px 0",borderTop:i?"1px solid var(--rule)":"none",color:"var(--ink)"}}>
                {line}
                {!COACH_ACTIONS.includes(c.id)&&<div><button className="btn btn-sm coach-hide" style={{marginTop:4}} onClick={()=>leave("c-"+c.id,()=>setMute([...muted,c.id]))}>{t("coach.hide")}</button></div>}
              </div>
            );
          })}
          <div className="list-sub" style={{marginTop:6}}>{t("coach.window")}</div>
          {muted.length>0&&<button className="btn btn-sm coach-unhide" style={{marginTop:6}} onClick={()=>setMute([])}>{t("coach.showHidden",{n:muted.length})}</button>}
        </div>
      )}
      </AnPanel>

      <AnPanel id="spending" seg={seg}>
      {/* What changed — same comparison window as the summary */}
      {(wc.totalDiff!==0||wc.catChanges.length>0)&&prevExp>0&&momDiff!==null&&(
        <div className="a-card" data-section="an-changes">
          <div className="a-card-title">{cmpTitle(wc.cmpKind)}</div>
          <div className="wc-row" style={{paddingTop:0}}>
            <span className="wc-name" style={{fontWeight:700}}>{t("an.totalSpending")}</span>
            <div style={{textAlign:"right"}}>
              <div className={`wc-diff ${wc.totalDiff<=0?"pos":"neg"}`}>{wc.totalDiff>0?"+":""}{fmt(wc.totalDiff,currency)}</div>
              <div style={{fontSize:10,color:"var(--ink-3)"}}>{t("an.vs",{a:fmt(wc.curExp,currency),b:fmt(wc.prevExp,currency)})}</div>
            </div>
          </div>
          {wc.catChanges.slice(0,5).map(({catId,cur,prev,diff,merchantDiffs})=>{
            const cat=CAT(catId);
            return (
              <div key={catId}>
                <div className="wc-row">
                  <div className="wc-name"><CatIcon catId={catId} size={13} color={cat?.color}/>{catName(catId)}</div>
                  <div style={{textAlign:"right"}}>
                    <div className={`wc-diff ${diff<=0?"pos":"neg"}`}>{diff>0?"+":""}{fmt(diff,currency)}</div>
                    <div style={{fontSize:10,color:"var(--ink-3)"}}>{t("an.vs",{a:fmt(cur,currency),b:fmt(prev,currency)})}</div>
                  </div>
                </div>
                {merchantDiffs.length>0&&(
                  <div className="wc-merchants">
                    {merchantDiffs.map(m=>(
                      <div key={m.merchant} className="wc-m-row">
                        <span style={{display:"flex",alignItems:"center",gap:4}}>
                          <Icon name="merchant" size={10} color="var(--ink-4)"/>
                          {maskText(m.merchant)}
                          <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:m.isRecurring?"var(--warn-bg)":"var(--bg-inset)",color:m.isRecurring?"var(--warn)":"var(--ink-4)"}}>
                            {m.isRecurring?t("wc.recurring"):t("wc.oneOff")}
                          </span>
                        </span>
                        <span style={{color:m.diff<=0?"var(--pos)":"var(--neg)",fontWeight:600}}>{m.diff>0?"+":""}{fmt(m.diff,currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {wc.catChanges.slice(0,5).some(c=>c.merchantDiffs.length>0)&&<div className="list-sub" data-section="an-changes-tags" style={{marginTop:10}}>{t("wc.tagHelp")}</div>}
        </div>
      )}

      {/* Transaction stats for the month */}
      {txnStats.count>0&&(
        <div className="stat-row">
          <div className="stat-cell"><div className="stat-val">{txnStats.count}</div><div className="stat-lbl">{t("an.transactions")}</div></div>
          <div className="stat-cell"><div className="stat-val">{fmt(txnStats.avgTxn,currency)}</div><div className="stat-lbl">{t("an.avgPerTxn")}</div></div>
          <div className="stat-cell"><div className="stat-val">{fmt(txnStats.medTxn,currency)}</div><div className="stat-lbl">{t("an.median")}</div></div>
          <div className="stat-cell" title={t("an.perDayTitle")}>
            <div className="stat-val">{perDay.heavier===null?"—":fmt(perDay.heavier==="weekday"?perDay.wdAvg:perDay.weAvg,currency)}</div>
            <div className="stat-lbl">{t(perDay.heavier===null?"an.perDay.null":"an.perDay."+perDay.heavier)}</div>
          </div>
        </div>
      )}

      {/* Budget status for the month */}
      {budgetItems.length>0&&(
        <div className="a-card" data-section="an-budget">
          <div className="a-card-title">{t("an.budgetStatus",{month:monthName(selectedMon)})}</div>
          {budgetItems.map(({catId,limit,spent,pct,over,warn,aheadOfPace,daysLeft,state})=>{
            const cat=CAT(catId);
            return (
              <div key={catId} style={{marginBottom:13,paddingBottom:13,borderBottom:"1px solid var(--rule)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6,minWidth:0}}><CatIcon catId={catId} size={13}/>{catName(catId)}</div>
                  <div style={{fontSize:11,color:over?"var(--neg)":warn?"var(--warn)":"var(--ink-3)",fontWeight:600,flexShrink:0}}>{t("an.pctUsed",{pct:PRIVACY?"••":Math.round(pct)})}</div>
                </div>
                <div style={{height:3,background:"var(--rule)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",width:`${pct}%`,background:over?"var(--neg)":warn?"var(--warn)":catInk(cat?.color),borderRadius:99}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:over?"var(--neg)":warn?"var(--warn)":"var(--ink-3)",fontWeight:over||warn?600:400}}>
                    {over?t("budgets.over",{amount:fmt(spent-limit,currency)}):t("budgets.remaining",{amount:fmt(limit-spent,currency)})}
                  </span>
                  {state==="current"&&<span style={{color:"var(--ink-4)",flexShrink:0}}>{over?t("an.exceeded"):t("an.daysLeft",{n:daysLeft})}</span>}
                </div>
                {aheadOfPace&&!over&&<div style={{fontSize:10,color:"var(--warn)",fontWeight:600,marginTop:2}}>{t("an.aheadOfPace")}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Category breakdown */}
      {catData.length>0&&(
        <div className="a-card" data-section="an-category">
          <div className="a-card-title">{t("an.byCategory")}</div>
          {catData.map((cat,i)=>(
            <div key={i} className="cat-bar">
              <div className="cat-bar-name"><CatIcon catId={cat.id} size={13} color={cat.color}/>{catName(cat.id)}</div>
              <div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(cat.amt/maxCat)*100}%`,background:catInk(cat.color)}}/></div>
              <div className="cat-bar-amt">{fmt(cat.amt,currency)}</div>
              <div className="cat-bar-pct">{fmtPct(curExp>0?Math.round((cat.amt/curExp)*100):0)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Run 16: spending by wallet for the selected month; shown only when at least one entry has a wallet */}
      {walletSpend.used&&walletSpend.total>0&&(
        <div className="a-card" data-section="an-wallet">
          <div className="a-card-title">{t("wallet.analyticsTitle")}</div>
          {Object.entries(walletSpend.byWallet).sort((a,b)=>b[1]-a[1]).map(([w,amt])=>(
            <div key={w} className="cat-bar">
              <div className="cat-bar-name">{w==="none"?t("wallet.none"):t("paid.short."+w)}</div>
              <div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(amt/walletSpend.total)*100}%`,background:"var(--accent)"}}/></div>
              <div className="cat-bar-amt">{fmt(amt,currency)}</div>
              <div className="cat-bar-pct">{fmtPct(Math.round((amt/walletSpend.total)*100))}</div>
            </div>
          ))}
        </div>
      )}

      {/* Merchant breakdown */}
      {topMerchants.length>0&&(
        <div className="a-card" data-section="an-merchant">
          <div className="a-card-title">{t("month.byMerchant")}</div>
          {topMerchants.map(([merchant,amt],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i<topMerchants.length-1?"1px solid var(--rule)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                <div style={{width:28,height:28,borderRadius:6,background:"var(--bg-inset)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name="merchant" size={13} color="var(--ink-3)"/>
                </div>
                <span style={{fontSize:13,fontWeight:600,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{maskText(merchant)}</span>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"var(--font)",fontSize:14,fontWeight:700}}>−{fmt(amt,currency)}</div>
                {curExp>0&&<div style={{fontSize:10,color:"var(--ink-4)"}}>{fmtPct(Math.round((amt/curExp)*100))}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      </AnPanel>

      {/* Run 15: the "Top expenses" and "All transactions" lists were removed from Analytics. They repeated rows of the Transactions
          tab (which can be searched by month name and filtered by date). Analytics keeps what Transactions cannot show: totals,
          comparisons, categories, merchants and trends. */}

      {/* A month without entries says so (the list of entries lives in Transactions) */}
      {monTxns.length===0&&(seg==="overview"||seg==="spending")&&(
        <div className="empty" style={{padding:"32px 0"}} data-section="an-empty">
          <div className="empty-icon"><LedgerArt/></div>
          <div className="empty-title">{t("month.emptyTitle")}</div>
          <div className="empty-body">{t("month.emptyBody",{month:monthName(selectedMon)})}</div>
        </div>
      )}

      {/* Run 27d: the all-time overview sits with the other not-month-specific part (Trends), below the selected month, so the page starts with the month the picker shows */}
      <AnPanel id="trends" seg={seg}>
        {transactions.length>0&&(()=>{
          // Run 65: the all-time surplus uses the same rule as the month (earned income and refunds in; money taken from savings is not income)
          const allIn=transactions.filter(x=>x.type==="income"&&(isEarnedCat(x.category)||x.category==="refund")).reduce(addAmt,0), totalInc=transactions.filter(x=>x.type==="income"&&isEarnedCat(x.category)).reduce(addAmt,0), totalExp=transactions.filter(x=>x.type==="expense").reduce(addAmt,0);
          return (
            <div className="a-card" data-section="an-overview">
              <div className="a-card-title">{t("set.overview")}</div>
              {[[t("set.totalIncome"),fmt(totalInc,currency),"var(--pos)"],[t("set.totalExpenses"),fmt(totalExp,currency),"var(--neg)"],[t("surplus."+surplusLabel(allIn,totalExp)),fmt(Math.abs(allIn-totalExp),currency),surplusColor(allIn,totalExp)],[t("an.transactions"),String(transactions.length),"var(--ink)"]].map(([lbl,val,col])=>(
                <div key={lbl} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"6px 0",borderBottom:"1px solid var(--rule)"}}>
                  <span style={{fontSize:12,color:"var(--ink-3)"}}>{lbl}</span>
                  <span style={{fontSize:13,fontWeight:700,color:col,whiteSpace:"nowrap"}}>{val}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </AnPanel>

      {/* Trends — recent months up to today; not affected by the month selected above */}
      {hasTrends&&(<>
        <AnPanel id="trends" seg={seg}>
        <div className="trends-head" data-section="an-trends" style={{marginTop:22,marginBottom:10}}>
          <div className="label-sm">{t("month.trendsTitle")}</div>
          <div style={{fontSize:11,color:"var(--ink-3)",lineHeight:1.5,marginTop:4}}>{t("month.trendsSub")}</div>
        </div>

        <div className="a-card">
          <div className="a-card-title">{t("an.sixMonth")}</div>
          {monthAvg>0&&<div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10}}>{t("an.sixMonthAvg")} <strong style={{fontFamily:"var(--font)",color:"var(--ink)"}}>{fmt(monthAvg,currency)}</strong></div>}
          <Collapse open={activeBar!==null&&!!monthlyData[activeBar]}>{(()=>{ const ab=activeBar!==null?activeBar:barKeep.current; return ab!==null&&monthlyData[ab]&&(
            <div data-section="an-sixmonth-detail" style={{background:"var(--ink)",color:"var(--bg)",borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:600,marginBottom:10,display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
              <span>{monthName(monthlyData[ab].ym)}</span>
              <span style={{fontFamily:"var(--font)",fontSize:13}}>{t("an.sixSpent")} {fmt(monthlyData[ab].exp,currency)} · {t("an.sixIncome")} {fmt(monthlyData[ab].inc,currency)} · {t("an.sixNet")} {monthlyData[ab].inc-monthlyData[ab].exp<0?"−":""}{fmt(Math.abs(monthlyData[ab].inc-monthlyData[ab].exp),currency)}</span>
            </div>
          ); })()}</Collapse>
          <div className="month-bars">
            {monthlyData.map((m,i)=>(
              <div key={i} className="m-col" role="button" tabIndex={0} aria-pressed={activeBar===i} aria-label={`${monthName(m.ym)}: ${fmt(m.exp,currency)}`}
                onKeyDown={activateKey(()=>{setActiveBar(activeBar===i?null:i);})}
                onClick={e=>{e.stopPropagation();setActiveBar(activeBar===i?null:i);}}>
                <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end",gap:2}}>
                  <div className="m-bar" style={{height:m.exp>0?`${Math.max(5,(m.exp/maxMonth)*100)}%`:"3px",background:activeBar===i?"var(--accent-mid)":m.isCur?"var(--accent)":"var(--ink-4)",width:"100%",outline:activeBar===i?"2px solid var(--accent)":"none",outlineOffset:"1px"}}/>
                  <div className="m-bar m-bar-inc" style={{height:m.inc>0?`${Math.max(5,(m.inc/maxMonth)*100)}%`:"3px",background:"var(--pos)",opacity:0.75,width:"100%"}}/>
                </div>
                <div className="m-lbl" style={{color:activeBar===i?"var(--accent-mid)":m.isCur?"var(--accent)":"var(--ink-4)",fontWeight:m.isCur||activeBar===i?700:600}}>{m.label}</div>
              </div>
            ))}
          </div>
          <div className="trend-legend" data-section="an-sixmonth-legend"><span><i style={{background:"var(--ink-4)"}}/>{t("an.sixSpent")}</span><span><i style={{background:"var(--pos)",opacity:0.75}}/>{t("an.sixIncome")}</span></div>
        </div>
        </AnPanel>

        <AnPanel id="insights" seg={seg}>
        {patterns.length>0&&(
          <div className="a-card">
            <div className="a-card-title">{t("an.patterns")}</div>
            {patterns.filter(p=>!patMuted.includes(p.id)).map(p=>{
              const titleKey=PATTERN_TITLE_KEY[p.id.startsWith("trend-")?"trend":p.id];
              return (
                <div key={p.id} className={"pattern-item"+(isLeaving("p-"+p.id)?" row-leaving":"")} data-section="pattern-item" data-id={p.id}>
                  <Icon name="pattern" size={14} color="var(--ink-3)"/>
                  <div style={{flex:1,minWidth:0}}>
                    {titleKey&&<div style={{fontWeight:700,color:"var(--ink)",marginBottom:2}}>{t(titleKey)}</div>}
                    <span>{PRIVACY?t("privacy.hiddenText"):p.text}</span>{p.basis&&<div className="list-sub pattern-basis" style={{marginTop:4}}>{tn(PATTERN_BASIS_KEY[p.basis.per],p.basis.n)}</div>}
                    <div><button className="btn btn-sm pattern-hide" style={{marginTop:6}} onClick={()=>leave("p-"+p.id,()=>setPatMute([...patMuted,p.id]))}>{t("coach.hide")}</button></div>
                  </div>
                </div>
              );
            })}
            {patMuted.length>0&&<button className="btn btn-sm pattern-unhide" style={{marginTop:2}} onClick={()=>setPatMute([])}>{t("coach.showHidden",{n:patMuted.length})}</button>}
          </div>
        )}
        </AnPanel>

        <AnPanel id="trends" seg={seg}>
        {Object.values(dayOfWeek).some(d=>d.count>0)&&(
          <div className="a-card">
            <div className="a-card-title">{t("an.byDay",{month:monthName(now)})}</div>
            <div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10,lineHeight:1.5}}>{t("an.byDaySub")}</div>
            {WEEKDAYS.map((day,di)=>{
              const d=dayOfWeek[day];
              if (!d||d.count===0) return null;
              // the typical (median) transaction, as in the insight: one unusual purchase must not make a day's bar tower over the rest
              const maxMed=Math.max(...Object.values(dayOfWeek).filter(x=>x.count>0).map(x=>x.median),1);
              return (
                <div key={day} className="dow-row" style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <div style={{minWidth:28,fontSize:11,color:"var(--ink-3)",fontWeight:600,flexShrink:0}} title={wdName(di,"long")}>{wdName(di,"short")}</div>
                  <div style={{flex:1,height:3,background:"var(--rule)",borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(d.median/maxMed)*100}%`,background:"var(--accent)",borderRadius:99}}/>
                  </div>
                  <div style={{minWidth:60,textAlign:"right",fontSize:11,fontFamily:"var(--font)",fontWeight:600,color:"var(--ink)",flexShrink:0,whiteSpace:"nowrap"}}>{fmt(d.median,currency)}</div>
                  <div style={{width:24,textAlign:"right",fontSize:10,color:"var(--ink-4)",flexShrink:0}}>{d.count}×</div>
                </div>
              );
            })}
          </div>
        )}
        </AnPanel>

        <AnPanel id="insights" seg={seg}>
        {anomalies.length>0&&(
          <div className="a-card">
            <div className="a-card-title">{t("an.unusual")}</div>
            {anomalies.slice(0,5).map((a,i)=>{
              const cat=CAT(a.category)||{color:"#98A5B7"};
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<Math.min(anomalies.length,5)-1?"1px solid var(--rule)":"none"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:(cat.color)+"26",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <CatIcon catId={a.category} size={14} color={cat.color}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{maskText(a.merchant)||catName(a.category)}</div>
                    <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmtDate(a.date)} · {PRIVACY?t("privacy.hiddenText"):a.reason}</div>
                  </div>
                  <div style={{fontFamily:"var(--font)",fontSize:14,fontWeight:700,color:"var(--neg)",flexShrink:0}}>−{fmt(a.amount,currency)}</div>
                </div>
              );
            })}
          </div>
        )}

        {correlations.length>0&&(
          <div className="a-card">
            <div className="a-card-title">{t("an.together")}</div>
            <div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10,lineHeight:1.5}}>{t("an.togetherSub")}</div>
            {correlations.map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 0",borderBottom:i<correlations.length-1?"1px solid var(--rule)":"none"}}>
                <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6,fontSize:12,fontWeight:600,color:"var(--ink)",minWidth:0}}>
                  <CatIcon catId={c.category1} size={13}/>
                  {catName(c.category1)}
                  <span style={{color:"var(--ink-4)",fontWeight:400}}>+</span>
                  <CatIcon catId={c.category2} size={13}/>
                  {catName(c.category2)}
                </div>
                <div style={{fontSize:11,color:"var(--ink-3)",flexShrink:0}}>{t("an.ofDays",{pct:PRIVACY?"••":Math.round(c.correlation*100)})}</div>
              </div>
            ))}
          </div>
        )}

        </AnPanel>

        <AnPanel id="trends" seg={seg}>
        <div className="a-card" data-section="an-calendar">
          <div className="a-card-title">{t("an.calendar")}</div>
          <div style={{fontSize:11,color:"var(--ink-3)",marginBottom:10,lineHeight:1.5}}>{t("an.calendarHint")}</div>
          <div className="cal" onClick={e=>e.stopPropagation()}>
            {DAY_LBLS.map((d,i)=><div key={i} className="cal-dow">{d}</div>)}
            {Array.from({length:calLead},(_,i)=><div key={"b"+i} className="cal-blank"/>)}
            {calDays.map(c=>{
              const on=calDay===c.date, intensity=c.amt>0?Math.max(0.15,(c.amt/maxDay)*0.85):0;
              return <button key={c.date} type="button" data-date={c.date} className={`cal-day${c.amt>0?" has-spend":""}${intensity>=0.5?" hot":""}${c.future?" future":""}${c.isToday?" today":""}${on?" sel":""}`}
                aria-current={c.isToday?"date":undefined} aria-pressed={on} aria-label={`${fmtDate(c.date)}: ${c.amt>0?fmt(c.amt,currency):t("an.noSpending")}`}
                style={c.amt>0?{background:heat(intensity)}:undefined}
                onClick={e=>{ e.stopPropagation(); setCalDay(on?null:c.date); setActiveBar(null); }}>{c.day}</button>;
            })}
          </div>
          <Collapse open={!!calDay}>{(()=>{ const c=calDays.find(x=>x.date===(calDay||calKeep.current)); if(!c) return null; return (
            <div data-section="an-calendar-detail" role="status" style={{background:"var(--bg-inset)",borderRadius:10,padding:"10px 12px",marginTop:10,fontSize:12,fontWeight:600}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}><span>{fmtDate(c.date)}</span><span style={{fontFamily:"var(--font)",fontSize:14}}>{c.amt>0?fmt(c.amt,currency):t("an.noSpending")}</span></div>
              {c.cats&&<div style={{fontSize:11,color:"var(--ink-3)",marginTop:3,fontWeight:500}}>{c.cats}</div>}
            </div>); })()}</Collapse>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10,justifyContent:"flex-end"}}>
            <span style={{fontSize:9,color:"var(--ink-4)"}}>{t("an.less")}</span>
            {[0.15,0.35,0.6,0.85].map(o=><div key={o} style={{width:10,height:10,borderRadius:2,background:heat(o)}}/>)}
            <span style={{fontSize:9,color:"var(--ink-4)"}}>{t("an.moreTap")}</span>
          </div>
        </div>
        </AnPanel>
      </>)}
      </Swap>
    </div>
  );
}

export function SmartHelper({ transactions, bills=[], budgets, goals, safeToSpend, currency }) {
  const lc = locale();
  const cards = useMemo(
    () => calcHelperCards(transactions, budgets, goals, safeToSpend, currency, bills),
    [transactions, bills, budgets, goals, safeToSpend, currency, lc]   // card text follows the interface language
  );

  if (cards.length === 0) return null;

  const ICON_COLOR = { warn:"var(--warn)", neg:"var(--neg)", pos:"var(--pos)", info:"var(--ink-3)" };

  return (
    <div style={{marginBottom:18}}>
      <div className="label-sm" style={{marginBottom:10}}>{t("help.title")}</div>
      {cards.map(card=>(
        <div key={card.id} className={`helper-card ${card.type}`}>
          <div className="helper-icon">
            <Icon name={card.icon} size={16} color={ICON_COLOR[card.type]}/>
          </div>
          <div className="helper-body">
            <div className="helper-title">{card.title}</div>
            <div className="helper-text">{PRIVACY?t("privacy.hiddenText"):card.text}</div>
            <div className="helper-impact" style={{color:ICON_COLOR[card.type]}}>{PRIVACY?"":card.impact}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
