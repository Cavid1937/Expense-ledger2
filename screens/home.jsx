// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { useMemo, useState } from "react";
// Run 108: money figures that can be below zero show their minus sign
import { fmtSigned } from "../App.jsx";
import { createPortal } from "react-dom";
// Run 75: monthly summary
import { MonthReportCard } from "./report.jsx";
import { t, tn } from "../i18n.js";
import { CAT, CatIcon, Icon, accountBalances, unassignedSpend, unassignedEntries, creditOwed, netPosition, readDebts, buildSchedules, calcCategorySpend, calcMonthSummary, calcSafeToSpend, calcUntilPay, debtsOrNull, whatIfSpend, formMoney, calcRunOutDay, calcSpendingPace, calcSpentToDate, calcWhatChanged, reimbOwedMap, reimbOwedTotal, catName, curMon, daysBetween, fmt, fmtDate, fmtPct, fmtShort, localDateStr, maskText, monthName, monthShort, prevMon, readAccounts, scheduleNextDue, surplusLabel, today } from "../App.jsx";
import { TxnRow } from "./ledger.jsx";
import { SmartHelper, SpendDonut } from "./analytics.jsx";
import { Collapse, useRolling } from "./motion.jsx";
import { revealFocus } from "../App.jsx";
import { readFirstChoices, writeFirstChoices } from "./setup.jsx";

// Run 83: one quiet reminder on Home for something the person said at the start (a bank statement to bring in, a loan to add) and chose
// "Later" for. It appears from the next day, only once per thing: "Not needed" or doing it ends it for good. Rule-based, no AI, on this phone only.
export const FIRST_NUDGE_DELAY = 20 * 3600 * 1000;
export function firstNudge(choices, debtsCount, now = Date.now()) {
  const c = choices; if (!c) return null;
  const due = typeof c.laterAt === "number" && now - c.laterAt >= FIRST_NUDGE_DELAY;
  if (!due) return null;
  if (c.stmt && c.stmtState === "later") return "stmt";
  if (c.debts && c.debtsState === "later" && !(debtsCount > 0)) return "debts";
  return null;
}
function FirstNudge({ onGo }) {
  const [choices, setChoices] = useState(() => readFirstChoices());
  const debtsCount = useMemo(() => { try { const d = readDebts(); return (d.debts || []).length + (d.loans || []).length; } catch { return 0; } }, []);
  const kind = firstNudge(choices, debtsCount);
  const [open, setOpen] = useState(true);
  if (!kind) return null;
  const end = (state, go) => {
    writeFirstChoices(kind === "stmt" ? { stmtState: state } : { debtsState: state });
    setOpen(false);
    setTimeout(() => { setChoices(readFirstChoices()); setOpen(true); if (go && onGo) onGo(go); }, 280);
  };
  return (
    <Collapse open={open} id="home-first-nudge">
      <div className="card nudge-card" data-section="home-first-nudge" data-kind={kind} role="group" aria-label={t(kind === "stmt" ? "nudge.stmtT" : "nudge.debtT")}>
        <div className="a-card-title">{t(kind === "stmt" ? "nudge.stmtT" : "nudge.debtT")}</div>
        <div className="list-sub" style={{ marginBottom: 10 }}>{t(kind === "stmt" ? "nudge.stmtB" : "nudge.debtB")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary btn-sm" data-section="nudge-go" onClick={() => end("done", kind === "stmt" ? "io" : "debts")}>{t(kind === "stmt" ? "setupq.gStmtNow" : "setupq.gDebtNow")}</button>
          <button type="button" className="btn btn-ghost btn-sm" data-section="nudge-dismiss" onClick={() => end("dismissed")}>{t("nudge.dismiss")}</button>
        </div>
      </div>
    </Collapse>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// S2: HOME PAGE — Financial hierarchy
// Level 1: Where am I? (position)
// Level 2: Am I on track? (pace)
// Level 3: What changed? (compact)
// Level 4: What's coming? (recurring preview)
// Level 5: What am I working toward? (goals)
// Level 6: Raw data (recent activity)
// ─────────────────────────────────────────────────────────────────────────────
// Amounts dated later in the month: shown, but kept apart from what has been spent or received so far.
export function PlannedNote({ plannedExp, plannedInc, currency, style }) {
  if (!(plannedExp>0) && !(plannedInc>0)) return null;
  return (
    <div className="planned-note" style={{fontSize:12,color:"var(--ink-3)",lineHeight:1.5,...style}}>
      {plannedExp>0&&<div>{t("month.plannedExp",{amount:fmt(plannedExp,currency)})}</div>}
      {plannedInc>0&&<div>{t("month.plannedInc",{amount:fmt(plannedInc,currency)})}</div>}
    </div>
  );
}

// Comparison sentences (Run 7, V1/V9). They name the window ("the same days last month" / "the previous month") instead of
// slotting a short month name into a sentence, which read as a word in Azerbaijani ("sen ilə müqayisədə").
export function cmpText(diff, kind, currency) {
  const key=diff<=0 ? (kind==="same"?"cmp.lessSame":"cmp.lessFull") : (kind==="same"?"cmp.moreSame":"cmp.moreFull");
  return t(key,{ amount:fmt(Math.abs(diff),currency) });
}
export const cmpTitle = (kind) => t(kind==="same" ? "cmp.titleSame" : "cmp.titleFull");
export const cmpPrev  = (kind, amount, currency) => t(kind==="same" ? "cmp.prevSame" : "cmp.prevFull", { amount:fmt(amount,currency) });

// Run 25: the currency sign after a big figure is set smaller and lighter, so the number is the brand and the sign stays quiet.
// The text is unchanged ("816.90 ₼"): the space and sign are the same characters, only wrapped.
export function MoneyText({ v }) { const i=typeof v==="string"?v.lastIndexOf(" "):-1; return i<0?v:<>{v.slice(0,i)}<span className="cur">{v.slice(i)}</span></>; }
// Run 85: the month's big figure rolls to its new value when it changes (see useRolling in motion.jsx)
export function RollingMoney({ v, currency }) { const x=useRolling(v); return <MoneyText v={fmt(x,currency)}/>; }

// Run 25: the empty-state picture - an open ledger page with ruled lines, a double rule and one accent mark. Drawn once, in the theme's own colours.
export function LedgerArt() {
  const line=(y,w)=><line x1="26" y1={y} x2={26+w} y2={y} style={{stroke:"var(--rule-2)"}} strokeWidth="2" strokeLinecap="round"/>;
  return (
    <svg width="124" height="88" viewBox="0 0 124 88" fill="none" aria-hidden="true" focusable="false" style={{display:"block"}}>
      <rect x="6" y="6" width="112" height="76" rx="12" style={{fill:"var(--bg-card)",stroke:"var(--rule-2)"}} strokeWidth="2"/>
      <line x1="62" y1="12" x2="62" y2="76" style={{stroke:"var(--rule)"}} strokeWidth="2"/>
      {line(26,24)}{line(40,32)}{line(54,20)}
      <line x1="72" y1="62" x2="104" y2="62" style={{stroke:"var(--rule-2)"}} strokeWidth="1.5"/>
      <line x1="72" y1="66" x2="104" y2="66" style={{stroke:"var(--rule-2)"}} strokeWidth="1.5"/>
      <path d="M74 34l5 5 11-12" style={{stroke:"var(--accent)"}} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Run 26 (designed in Figma, frame "Home - Accounts strip"): balances of the person's own accounts as a row of cards, shown only when
// at least one visible account exists. Balances are derived (opening + entries + transfers), the same numbers as in Settings.
// Run 38 (owner: tapping an account "panics"): an account opens its own calm sheet here, on Home: balance, how it is made up, and the latest
// entries and transfers of that account. "Manage accounts" opens the Accounts page. Read only; the numbers are the same as everywhere else.
export function AccountSheet({ id, transactions, currency, onClose, onManage, onView }) {
  const data=readAccounts(), a=data.accounts.find(x=>x.id===id);
  if (!a) return null;
  const bal=accountBalances(data,transactions)[a.id]||0;
  const mine=(transactions||[]).filter(x=>x && x.account===a.id).sort((p,q)=>String(q.date).localeCompare(String(p.date))).slice(0,12);
  const moves=data.transfers.filter(x=>x.from===a.id||x.to===a.id).sort((p,q)=>q.date.localeCompare(p.date)).slice(0,6);
  const name=(i)=>(data.accounts.find(x=>x.id===i)||{}).name||"—";
  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={a.name} data-section="acc-sheet">
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div className="sheet-title" style={{overflowWrap:"anywhere"}}>{a.name}</div>
        <div className="list-sub">{t("acc.kind."+(["cash","card","wallet","bank","credit"].includes(a.kind)?a.kind:"other"))}</div>
        <div className="hero-amount" data-section="acc-sheet-balance" style={{margin:"10px 0 4px"}}><MoneyText v={fmtSigned(bal,currency)}/></div>
        <div className="list-sub" style={{lineHeight:1.5,marginBottom:12}}>{t("acc.sheetHow",{ opening:fmtSigned(a.opening.amount||0,currency) })}</div>
        <div className="section-title" style={{marginTop:6}}>{t("acc.sheetLatest")}</div>
        {mine.length ? mine.map(x=>(
          <button key={x.id} type="button" className="settings-row" data-acc-txn={String(x.id)} onClick={()=>onView(x)} style={{width:"100%",background:"none",border:"none",borderBottom:"1px solid var(--rule)",padding:"10px 0",textAlign:"left",cursor:"pointer"}}>
            <span style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><CatIcon catId={x.category} size={16}/><span style={{minWidth:0}}><span className="settings-row-title" style={{display:"block",overflowWrap:"anywhere"}}>{maskText(x.merchant)||catName(x.category)}</span><span className="settings-row-sub">{fmtDate(x.date)}</span></span></span>
            <span style={{fontWeight:600,color:x.type==="income"?"var(--pos)":"var(--ink)",flexShrink:0}}>{x.type==="income"?"+":"−"}<MoneyText v={fmt(x.amount,currency)}/></span>
          </button>
        )) : <div className="list-sub" style={{padding:"6px 0"}}>{t("acc.sheetNone")}</div>}
        {moves.length>0&&<>
          <div className="section-title">{t("acc.transferTitle")}</div>
          {moves.map(m=>(
            <div key={m.id} className="settings-row" style={{padding:"8px 0",borderBottom:"1px solid var(--rule)"}}>
              <span className="settings-row-sub" style={{overflowWrap:"anywhere"}}>{fmtDate(m.date)} · {name(m.from)} → {name(m.to)}</span>
              <span style={{fontWeight:600,flexShrink:0}}><MoneyText v={fmt(m.amount,currency)}/></span>
            </div>
          ))}
        </>}
        <button className="btn btn-primary btn-full" data-section="acc-sheet-manage" style={{marginTop:16}} onClick={onManage}>{t("acc.manage")}</button>
        <button className="btn btn-ghost btn-full" data-closer="1" onClick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  );
}
// Run 99: the entries that are in no balance, each with the person's accounts as one-tap choices. Nothing is decided for them:
// an entry paid with money that is not tracked here is simply left as it is. Every change can be undone from the bar that follows.
export function LooseSheet({ loose, accounts, currency, onAssign, onClose }) {
  const rows=loose.list.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);
  // Run 101: privacy mode hides the shop name and note here too, as it does in the list of entries
  const words=(x)=>[maskText(x.merchant||x.note),x.subcategory,catName(x.category)].filter(Boolean).join(", ");
  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={t("loose.title")} data-section="loose-sheet">
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div className="sheet-title">{t("loose.title")}</div>
        {rows.length===0 ? (
          <div className="list-sub" data-section="loose-empty" style={{margin:"4px 0 14px",lineHeight:1.5}}>{t("loose.empty")}</div>
        ) : (<>
          <div className="list-sub" style={{margin:"0 0 10px",lineHeight:1.5}}>{t("loose.intro",{ date:fmtDate(loose.since) })}</div>
          <div data-section="loose-all" style={{marginBottom:10}}>
            <div className="field-lbl">{tn("loose.all",loose.list.length)}</div>
            <div className="sub-strip" style={{flexWrap:"wrap",overflowX:"visible"}}>
              {accounts.map(a=><button key={a.id} type="button" className="sub-chip" data-loose-all={a.id} onClick={()=>onAssign(loose.list.map(x=>x.id),a.id)}>{a.name}</button>)}
            </div>
          </div>
          <div role="list" style={{maxHeight:"46vh",overflowY:"auto",borderTop:"1px solid var(--rule)"}}>
            {rows.map(x=>(
              <div key={x.id} role="listitem" data-loose-row={x.id} style={{padding:"8px 0",borderBottom:"1px solid var(--rule)"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:13}}>
                  <span style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fmtDate(x.date)} · {words(x)}</span>
                  <span style={{flexShrink:0,fontVariantNumeric:"tabular-nums"}}><MoneyText v={fmt(x.amount,currency)}/></span>
                </div>
                <div className="sub-strip" style={{flexWrap:"wrap",overflowX:"visible",marginTop:6}}>
                  {accounts.map(a=><button key={a.id} type="button" className="sub-chip" data-loose-pick={a.id} aria-label={a.name+": "+words(x)+", "+fmt(x.amount,currency)} onClick={()=>onAssign([x.id],a.id)}>{a.name}</button>)}
                </div>
              </div>
            ))}
          </div>
          {loose.list.length>rows.length&&<div className="list-sub" style={{marginTop:6}}>{t("st.moreRows",{n:loose.list.length-rows.length})}</div>}
        </>)}
        <button type="button" className="btn btn-ghost btn-full" data-closer="1" style={{marginTop:12}} onClick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  );
}
export function HomeAccounts({ transactions, currency, onManage, onAccount, onAssign }) {
  const [fix,setFix]=useState(false);
  const data=readAccounts(), shown=data.accounts.filter(a=>!a.hidden);
  if (!shown.length) return null;
  // Run 99: spending with no account is in none of the balances below; say so where the balances are shown, with a way to put it right
  let loose={ known:false, since:"", list:[] }; try { loose=unassignedEntries(data,transactions); } catch { loose={ known:false, since:"", list:[] }; }
  const looseSum=loose.list.reduce((c,x)=>c+Math.round((Number(x.amount)||0)*100),0)/100;
  const bal=accountBalances(data,transactions);
  const np=netPosition(data,transactions,readDebts());   // Run 28: null unless some debt or loan exists
  const kindName={ cash:t("acc.kind.cash"), card:t("acc.kind.card"), wallet:t("acc.kind.wallet"), bank:t("acc.kind.bank"), credit:t("acc.kind.credit"), other:t("acc.kind.other") };
  const kindIcon={ cash:"finance", card:"card", wallet:"wallet", bank:"safe", credit:"card", other:"list" };
  const owedCredit=creditOwed(data,transactions);   // Run 41
  const totalCents=shown.reduce((s,a)=>s+Math.round((bal[a.id]||0)*100),0);
  return (
    <div className="section-enter section-enter-1" data-section="home-accounts" style={{marginBottom:14}}>
      <div className="card-head" style={{padding:"0 2px",marginBottom:8}}><span className="card-title">{t("acc.homeTitle")}</span><button className="btn btn-sm" data-section="home-accounts-manage" onClick={onManage}>{t("acc.manage")}</button></div>
      <div className="acc-strip">
        {shown.map(a=>(
          <button key={a.id} className="acc-card" data-acc-card={a.id} onClick={()=>(onAccount?onAccount(a.id):onManage())} aria-label={a.name+", "+kindName[a.kind]+", "+fmtSigned(bal[a.id]||0,currency)}>
            <span className="acc-ico" aria-hidden="true"><Icon name={kindIcon[a.kind]||"list"} size={16} color="var(--accent)"/></span>
            <span className="acc-name">{a.name}</span>
            <span className="acc-bal"><MoneyText v={fmtSigned(bal[a.id]||0,currency)}/></span>
          </button>
        ))}
      </div>
      {shown.length>1&&<div className="list-sub" style={{margin:"8px 2px 0"}}>{t("acc.total",{ amount:fmtSigned(totalCents/100,currency) })}</div>}
      {owedCredit>0&&<div className="list-sub" data-section="home-credit-owed" style={{margin:"4px 2px 0"}}>{t("acc.creditOwed",{ amount:fmt(owedCredit,currency) })}</div>}
      {np&&<div className="list-sub" data-section="home-netpos" style={{margin:"4px 2px 0"}}>{t("acc.net",{ amount:(np.net<0?"−":"")+fmt(Math.abs(np.net)/100,currency) })}</div>}
      {/* Run 106: the full reminder now lives in the bell; here only a quiet line, since the total above leaves this money out */}
      {loose.known&&loose.list.length>0&&(
        <div className="list-sub" data-section="home-loose" role="note" title={tn("acc.loose",loose.list.length,{ amount:fmt(looseSum,currency), date:fmtDate(loose.since) })} style={{margin:"4px 2px 0",lineHeight:1.45}}>
          {tn("acc.looseShort",loose.list.length,{ amount:fmt(looseSum,currency) })}
          {onAssign&&<> · <button type="button" className="link-btn" data-section="home-loose-fix" onClick={()=>setFix(true)}>{t("acc.looseFix")}</button></>}
        </div>
      )}
      {/* drawn at the top of the page: inside this card it would sit behind the cards that follow */}
      {fix&&typeof document!=="undefined"&&createPortal(<LooseSheet loose={loose} accounts={shown} currency={currency} onAssign={onAssign} onClose={()=>setFix(false)}/>,document.body)}
    </div>
  );
}
// Run 54 (owner: "explain the app in simple language: what is this, what do I gain"): three plain sentences for a person who has recorded
// nothing yet. Shown above everything on Home until they tap "Got it" (remembered on this phone under its own key) or record a first entry.
const WELCOME_KEY="expense_ledger_v5__welcome";
export function WelcomeCard({ show }) {
  const [gone,setGone]=useState(()=>{ try { return localStorage.getItem(WELCOME_KEY)==="1"; } catch { return false; } });
  if (!show || gone) return null;
  return (
    <div className="card" data-section="home-welcome" style={{marginBottom:14}}>
      <div className="card-title" style={{marginBottom:8}}>{t("welcome.title")}</div>
      <ul style={{margin:0,paddingLeft:18,lineHeight:1.55,fontSize:14,color:"var(--ink-2)"}}>
        <li>{t("welcome.1")}</li><li>{t("welcome.2")}</li><li>{t("welcome.3")}</li>
      </ul>
      <button type="button" className="btn btn-sm" data-section="welcome-ok" style={{marginTop:10}} onClick={()=>{ try { localStorage.setItem(WELCOME_KEY,"1"); } catch {} setGone(true); }}>{t("welcome.ok")}</button>
    </div>
  );
}

export function HomePage({ showToast, transactions, accountTxns, latest=[], bills=[], budgets, templates, currency, safeToSpend, goals, setup, rollover=null, onSetupWizard, onSetupHide, onSetupGo, onAdd, onTemplate, onView, onOpenLedger, onFirstGo, onInfo, onAccounts, onAccount, onAssignAccount }) {
  const now=curMon(), prv=prevMon();
  const { curExp,curInc,curIn,curNet,curRefundIn,curSavOut,prevExp,momDiff,surplusRate,plannedExp,plannedInc,cmpKind }=calcMonthSummary(transactions,now,prv);
  const catSpend    =calcCategorySpend(transactions,now);
  const budgetTotal =Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const spentToDate =calcSpentToDate(transactions,now);
  const paceInfo    =calcSpendingPace(spentToDate,now,budgetTotal);
  // Run 103 (owner decision D9): loan instalments from the Debts page, and the principal of loan payments, are part of the figures
  const debts       =useMemo(()=>debtsOrNull(),[transactions,accountTxns]);
  const safeInfo   =calcSafeToSpend(transactions,safeToSpend,goals,new Date(),bills,{ debtData:debts, cashTx:accountTxns||transactions });
  const runOut      =useMemo(()=>safeInfo.feasible&&safeToSpend?.enabled ? calcRunOutDay(transactions,bills,safeInfo.remaining,safeInfo.daysRemaining) : { show:false },[transactions,bills,safeInfo.feasible,safeInfo.remaining,safeInfo.daysRemaining,safeToSpend?.enabled]);   // Run 43
  // Run 97: before this month's income arrives, Safe to Spend has nothing to count; show what the accounts cover until the income instead.
  const held        =accountsHeld(accountTxns||transactions);
  // Run 98: spending with no account moves no balance; the "until" card names how much, so its figure is not read as more certain than it is.
  const loose=useMemo(()=>{ try { return unassignedSpend(readAccounts(),accountTxns||transactions); } catch { return { known:false, count:0, sum:0 }; } },[accountTxns,transactions]);
  // Run 102: entries dated ahead are taken off the "until" figure as money; one paid from a hidden account is left out, as that account's money is
  const cashTx      =useMemo(()=>{ const all=accountTxns||transactions; let hid; try { hid=new Set(readAccounts().accounts.filter(a=>a.hidden).map(a=>a.id)); } catch { return all; } return hid.size ? all.filter(x=>!(x && x.account && hid.has(x.account))) : all; },[accountTxns,transactions]);
  // Run 103 (owner decision D1): "Until your next income" is the main figure whenever it can be worked out (before or after this
  // month's income); Safe to Spend stays below it as the calendar-month figure. When it cannot be worked out, `reason` says why.
  const untilPay    =useMemo(()=>{ if (!safeToSpend?.enabled) return { show:false }; return calcUntilPay(transactions,bills,held,debts,new Date(),{ afterIncome:true, cashTx }); },[transactions,cashTx,bills,held,debts,safeToSpend?.enabled]);
  const wc          =calcWhatChanged(transactions,now,prv);
  const hasIncome   =curIn>0;   // Run 35b: any money in (a refund or savings withdrawal is spendable too); the Income figure itself is earnings only

  // Upcoming recurring (due within 7 days)
  const owedMap=useMemo(()=>reimbOwedMap(accountTxns||transactions),[accountTxns,transactions]), owedTotal=useMemo(()=>reimbOwedTotal(accountTxns||transactions),[accountTxns,transactions]);   // the full list: the spending list already has the repayments folded in   // Run 43
  const upcomingSchedules=useMemo(()=>{
    const nowD=new Date();
    return buildSchedules(transactions,bills).filter(x=>x.isActive&&x.type==="expense")
      .map(x=>({...x,nextDue:scheduleNextDue(x,transactions,nowD)}))
      .filter(x=>x.nextDue&&daysBetween(nowD,x.nextDue)<=7)
      .sort((a,b)=>a.nextDue-b.nextDue);
  },[transactions,bills]);

  return (
    <div>
      <WelcomeCard show={!(accountTxns||transactions).length}/>
      {/* Run 75: last month's summary, in the first week of a month */}
      <MonthReportCard transactions={transactions} budgets={budgets} goals={goals} currency={currency} showToast={showToast}/>
      {/* LEVEL 1 (redesign order): Safe to Spend first, then this month's position, then what is due soon. */}
      <SafeToSpendCard safeToSpend={safeToSpend} safeInfo={safeInfo} runOut={runOut} currency={currency} now={now} held={held} untilPay={untilPay} loose={loose}/>
      <div className={`hero card${safeToSpend?.enabled?" quiet":""}`} data-section="home-month">
        <div className="card-head"><span className="card-title">{t("home.thisMonth")}</span><span className="hero-eyebrow">{monthName(now)}</span></div>
        <div className="hero-amount" data-section="hero-spent"><RollingMoney v={curExp} currency={currency}/></div>
        <div className="hero-sub">
          <span>{t("home.spentThisMonth")}</span>
          {momDiff!==null&&(
            <span className={`mom-badge ${momDiff<=0?"better":"worse"}`}>
              <Icon name={momDiff<=0?"arrowDown":"arrowUp"} size={10}/>
              {cmpText(momDiff,cmpKind,currency)}
            </span>
          )}
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className={`hero-stat-val${curInc>0?" pos":""}`}>{fmtShort(curInc,currency)}</div>
            <div className="hero-stat-lbl">{t("home.income")}</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val neg">{fmtShort(curExp,currency)}</div>
            <div className="hero-stat-lbl">{t("home.spent")}</div>
          </div>
          <div className="hero-stat">
            {/* Run 65 (owner decision 13 Nov): one monthly surplus / deficit, earned income minus spending (money taken from savings is not income) */}
            {surplusRate!==null?(
              <><div className={`hero-stat-val${surplusRate>=20?" pos":surplusRate<0?" neg":""}`}>{fmtPct(surplusRate)}</div><div className="hero-stat-lbl">{t("surplus."+surplusLabel(curNet,0))}</div></>
            ):(
              <><div className={`hero-stat-val${curNet>0?" pos":curNet<0?" neg":""}`}>{curNet<0?"−":""}{fmtShort(Math.abs(curNet),currency)}</div><div className="hero-stat-lbl">{curNet===0&&!(curExp>0) ? t("home.netNone") : t("month.net."+(curNet>0?"Net surplus":curNet<0?"Net deficit":"Break-even"))}</div></>
            )}
          </div>
        </div>
        {hasIncome&&curRefundIn>0&&<div className="list-sub" data-section="home-other-in" style={{marginTop:8}}>{t("month.otherIn",{amount:fmt(curRefundIn,currency)})}</div>}
        {curSavOut>0&&<div className="list-sub" data-section="home-savings-out" style={{marginTop:4}}>{t("month.savingsOut",{amount:fmt(curSavOut,currency)})}</div>}
        <PlannedNote plannedExp={plannedExp} plannedInc={plannedInc} currency={currency} style={{marginTop:10}}/>
      </div>

      <HomeAccounts transactions={accountTxns||transactions} currency={currency} onManage={onAccounts} onAccount={onAccount} onAssign={onAssignAccount}/>

      {/* Due within 7 days */}
      {upcomingSchedules.length>0&&(
        <div className="card section-enter section-enter-1" data-section="home-upcoming">
          <div className="card-head"><span className="card-title">{t("home.dueWithin7")}</span></div>
          {upcomingSchedules.slice(0,3).map(s=>{
            const daysLeft=daysBetween(new Date(),s.nextDue); const cat=CAT(s.category);
            return (
              <div key={s.key} className="up-row">
                <span className="cat-dot" style={{background:(cat?.color||"#98A5B7")+"26"}}><CatIcon catId={s.category} size={16}/></span>
                <div className="up-body">
                  <div className="list-title">{maskText(s.merchant||s.note)||catName(s.category)}</div>
                  <div className="list-sub">{fmtDate(localDateStr(s.nextDue))} · {catName(s.category)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div className="up-amt">{fmt(s.amount,currency)}</div>
                  <div style={{fontSize:11,color:daysLeft<=1?"var(--warn)":"var(--ink-3)",fontWeight:600}}>{daysLeft===0?t("date.today"):daysLeft===1?t("date.tomorrow"):t("date.inDays",{n:daysLeft})}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Run 43: money others still owe the user for things the user paid (only when something is owed) */}
      {owedTotal.total>0&&<div className="list-sub" data-section="home-reimb" style={{margin:"0 4px 12px",fontWeight:600}}>{t("reimb.home",{ amount:fmt(owedTotal.total,currency) })}</div>}

      {/* Run 18: the five most recent entries (all of them, including loan and debt repayments), newest first */}
      {latest.length>0&&(
        <div className="card section-enter section-enter-2" data-section="home-latest">
          <div className="card-head"><span className="card-title">{t("home.latest")}</span><button className="btn btn-sm" data-section="home-latest-all" onClick={onOpenLedger}>{t("home.seeAllTxns")}</button></div>
          {latest.map(x=><TxnRow key={x.id} txn={x} owed={owedMap.get(String(x.id))} currency={currency} onView={onView} compact/>)}
        </div>
      )}

      {/* Run 25: the donut is long, so it follows the latest entries instead of pushing them off the first screen. */}
      {curExp>0&&<div className="card section-enter section-enter-2" data-section="home-breakdown">
        <div className="card-title" style={{marginBottom:8}}>{t("home.breakdown")}</div>
        <SpendDonut catSpend={catSpend} total={curExp} currency={currency}/>
      </div>}

      {rollover&&rollover.offer&&(
        <div className="card section-enter section-enter-2" data-section="home-rollover" role="group" aria-label={t("rollover.title",{ amount:fmt(rollover.offer.kept,currency) })}>
          <div className="a-card-title">{t("rollover.title",{ amount:fmt(rollover.offer.kept,currency) })}</div>
          <div className="list-sub" style={{marginBottom:8}}>{t("rollover.sub")}</div>
          {rollover.offer.goals.map(g=>(
            <button key={g.id} type="button" className="btn btn-full" style={{marginBottom:6}} data-section="rollover-add" data-goal={g.id} onClick={()=>rollover.onApply(g)}>
              {t("rollover.add",{ amount:fmt(g.amount,currency), goal:g.name||t("rollover.goalFallback") })}
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" data-section="rollover-skip" onClick={rollover.onSkip}>{t("rollover.skip")}</button>
        </div>
      )}
      {onFirstGo&&<FirstNudge onGo={onFirstGo}/>}
      {/* Smart Helper — deterministic advice cards */}
      <div className="section-enter section-enter-2" data-section="home-coach">
        <SmartHelper transactions={transactions} rawTransactions={accountTxns||transactions} bills={bills} budgets={budgets} goals={goals} safeToSpend={safeToSpend} currency={currency}/>
      </div>
      {setup&&!setup.hidden&&(()=>{
        // Run 17: first-run checklist. Each step ticks itself from what the person has actually done; nothing is stored except "hidden".
        const steps=[
          { id:"txn",    done:transactions.length>0,                                          label:t("setup.s1") },
          { id:"income", done:transactions.some(x=>x.type==="income"),                       label:t("setup.s2") },
          { id:"plan",   done:Object.values(budgets||{}).some(v=>v>0)||(goals||[]).length>0, label:t("setup.s3") },
          { id:"backup", done:!!setup.backedUp,                                              label:t("setup.s4") },
        ];
        if (steps.every(x=>x.done)) return null;
        return (
          <div className="card section-enter section-enter-2" data-section="home-setup" role="group" aria-label={t("setup.title")}>
            <div className="a-card-title">{t("setup.title")}</div>
            <div className="list-sub" style={{marginBottom:6}}>{t("setup.sub")}</div>
            {steps.map(x=>(
              <button key={x.id} type="button" className="setup-step" data-step={x.id} data-done={x.done} disabled={x.done} onClick={()=>onSetupGo(x.id)}
                aria-label={x.done?`${x.label} — ${t("setup.stepDone")}`:x.label}
                style={{display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",background:"none",border:"none",borderTop:"1px solid var(--rule)",padding:"10px 2px",minHeight:44,fontSize:14,color:x.done?"var(--ink-3)":"var(--ink)",cursor:x.done?"default":"pointer"}}>
                <span aria-hidden="true" style={{width:20,textAlign:"center",color:x.done?"var(--pos)":"var(--ink-3)"}}>{x.done?"✓":"○"}</span>
                <span style={{flex:1,textDecoration:x.done?"line-through":"none"}}>{x.label}</span>
              </button>
            ))}
            {onSetupWizard&&<button type="button" className="btn btn-sm" data-section="setup-wizard" style={{marginTop:8}} onClick={onSetupWizard}>{t("setupq.open")}</button>}
            <button type="button" className="btn btn-ghost btn-sm setup-hide" style={{marginTop:6}} onClick={onSetupHide}>{t("setup.hide")}</button>
          </div>
        );
      })()}
      <HomeDetails hasTxns={transactions.length>0} onAdd={onAdd} onOpenLedger={onOpenLedger} onInfo={onInfo}/>
    </div>
  );
}

// The Safe to Spend card and its note (redesign: shown first on Home). A separate function only to keep HomePage readable.
// GPT review P0: Safe to Spend (this month's recorded income less spending and commitments) and the money sitting in the accounts are
// different things. Total of the visible accounts' balances, or null when there are none. Display only; no formula changes.
export function accountsHeld(transactions) {
  const data=readAccounts(), shown=data.accounts.filter(a=>!a.hidden);
  if (!shown.length) return null;
  const bal=accountBalances(data,transactions);
  return shown.reduce((s,a)=>s+Math.round((bal[a.id]||0)*100),0)/100;
}
// Run 99: "What if I buy something?" under the figure it is about. A hypothetical: it reads the figure on the card and shows what it
// would be after the purchase. Nothing is saved; closing clears it.
export function WhatIf({ kind, left, days, currency }) {
  const [on,setOn]=useState(false), [txt,setTxt]=useState("");
  const amt=formMoney(txt,{positive:true}), r=amt ? whatIfSpend(amt,kind,left,days) : { ok:false };
  // Run 106 (owner: "What if I buy something? is instant"): it now unfolds like every other panel, and the keyboard rises after the motion
  const close=()=>{ setOn(false); setTxt(""); };
  return (<>
    <button type="button" className={"whatif-toggle"+(on?" on":"")} data-section="whatif-open" data-kind={kind} aria-expanded={on} aria-controls={"whatif-box-"+kind} onClick={()=>(on?close():setOn(true))}>{t("whatif.open")}<svg className="whatif-chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
    <Collapse open={on} id={"whatif-box-"+kind}>
    <div data-section="whatif" data-kind={kind} role="group" aria-label={t("whatif.open")} style={{marginTop:10,borderTop:"1px solid var(--rule)",paddingTop:8}}>
      <label className="field-lbl" htmlFor={"whatif-"+kind}>{t("whatif.label")}</label>
      <input id={"whatif-"+kind} ref={revealFocus} className="field-input" data-section="whatif-amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={txt} onChange={e=>setTxt(e.target.value)}/>
      <div data-section="whatif-result" role="status" aria-live="polite" style={{marginTop:8,minHeight:20}}>
        {r.ok&&(<>
          <div className="safe-row">
            <span className="safe-lbl">{t(kind==="safe"?"whatif.leftSafe":"whatif.leftUntil")}</span>
            <span className="safe-val" style={{color:r.covers?"var(--ink)":"var(--neg)"}}>{fmtSigned(r.after,currency)}</span>
          </div>
          <div className="list-sub" style={{lineHeight:1.45}}>{r.covers ? (r.perDayAfter>0 ? t("whatif.perDay",{ a:fmt(r.perDayAfter,currency), b:fmt(r.perDayBefore,currency) }) : "") : t("whatif.short",{ amount:fmt(r.short,currency) })}</div>
        </>)}
      </div>
      <div className="safe-note">{t("whatif.note")}</div>
      <button type="button" className="btn btn-sm" data-section="whatif-close" style={{marginTop:8}} onClick={close}>{t("common.close")}</button>
    </div>
    </Collapse>
  </>);
}
// Run 103 (owner decision D1): reasons "Until your next income" can name when it cannot be worked out (calcUntilPay `reason`)
const UNTIL_WHY=["accounts","noDate","overdue","dueToday","far"];
export function SafeToSpendCard({ safeToSpend, safeInfo, runOut=null, currency, now, held=null, untilPay=null, loose=null }) {
  // Run 9: the number first; the explanation (what was deducted and why) opens on tap — it is long and pushed the month
  // summary and upcoming bills out of the first screen.
  const [open,setOpen]=useState(false);
  // Run 103 (D1): the pay-cycle figure leads whenever it can be worked out; Safe to Spend follows as the calendar-month figure
  const until=!!(safeToSpend?.enabled && untilPay && untilPay.show);
  // Video review, 17 Nov ("every question has to change something"): whoever answered "No income now" in the first questions is not told to add their next income
  const noIncome=untilPay && untilPay.reason==="noDate" && (readFirstChoices()||{}).income==="none";
  const why=!until && !noIncome && safeToSpend?.enabled && untilPay && UNTIL_WHY.includes(untilPay.reason) ? untilPay.reason : "";
  return (
    <>
      {until&&<UntilPayCard untilPay={untilPay} loose={loose} currency={currency}/>}
      {safeToSpend?.enabled&&safeInfo.feasible&&(
        <div className={"safe-card section-enter section-enter-2"+(until?" safe-secondary":"")} data-section="home-safe">
          <div className="label-sm" style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <Icon name="safe" size={12} color="var(--ink-3)"/>{t(until?"safe.titleMonth":"safe.title")}
          </div>
          <div className="safe-amount" style={{color:safeInfo.remaining>=0?"var(--ink)":"var(--neg)"}}>
            <MoneyText v={fmtSigned(safeInfo.remaining,currency)}/>
          </div>
          {/* Run 54: one plain sentence saying what this number is, for someone who has never met the term */}
          <div className="list-sub" data-section="safe-plain" style={{marginTop:2,marginBottom:4,lineHeight:1.45}}>{t(until?"safe.monthNote":safeInfo.remaining>=0?"safe.plain":"safe.plainOver")}</div>
          {safeInfo.daysRemaining>0&&(
            <div className="safe-daily">
              {safeInfo.remaining>0?t("safe.perDay",{amount:fmt(safeInfo.dailyAllowance,currency)}):""}
              {tn("safe.daysLeft",safeInfo.daysRemaining,{month:monthShort(now)})}
            </div>
          )}
          {runOut&&runOut.show&&<div className="list-sub" data-section="safe-runout" style={{marginTop:4,color:"var(--warn)",fontWeight:600}}>{t("safe.runOut",{ day:runOut.day, month:t("monGen."+Number(now.slice(5,7))), daily:fmt(runOut.usualDaily,currency) })}</div>}
          {!until&&safeInfo.daysRemaining>0&&(()=>{ const t0=new Date(), dim=new Date(t0.getFullYear(),t0.getMonth()+1,0).getDate(), left=Math.min(safeInfo.daysRemaining,dim), gone=dim-left; return (   /* Run 27d: the month as a row of day-ticks: days gone are filled, today is taller, days ahead are faint */
            <div className="runway" aria-hidden="true">{Array.from({length:dim},(_,i)=><i key={i} className={i<gone?"on":i===gone?"now":""}/>)}</div>
          ); })()}
          {!until&&safeInfo.daysRemaining>0&&<WhatIf kind="safe" left={safeInfo.remaining} days={safeInfo.daysRemaining} currency={currency}/>}
          <button className="safe-toggle" aria-expanded={open} aria-controls="safe-breakdown" onClick={()=>setOpen(o=>!o)}>
            {t(open?"safe.hideHow":"safe.showHow")}<span className={"fold-chev r90"+(open?" open":"")}><Icon name="chevRight" size={14}/></span>
          </button>
          <Collapse open={open} id="safe-breakdown">
          {/* Four explicit lines — planning engine, not just a number */}
          <div style={{marginTop:10,borderTop:"1px solid var(--rule)",paddingTop:8}}>
            <div className="safe-row">
              <span className="safe-lbl">{t("safe.incomeReceived")}</span>
              <span className="safe-val">{fmt(safeInfo.curInc,currency)}</span>
            </div>
            {safeInfo.expectedInc>0&&(
              <div className="safe-row">
                <span className="safe-lbl">{t("safe.expectedLater")}</span>
                <span className="safe-val" style={{color:"var(--ink-4)"}}>{fmt(safeInfo.expectedInc,currency)}</span>
              </div>
            )}
            {/* Fix 4: Show goal contributions if they exceed manual savings target */}
            {safeInfo.goalContributionActive?(
              <div className="safe-row">
                <span className="safe-lbl">{t("safe.goalContributions")}</span>
                <span className="safe-val" style={{color:"var(--ink-3)"}}>−{fmt(safeInfo.goalContributions,currency)}</span>
              </div>
            ):safeInfo.effectiveSavingsTarget>0&&(
              <div className="safe-row">
                <span className="safe-lbl">{t("safe.savingsTarget")}</span>
                <span className="safe-val" style={{color:"var(--ink-3)"}}>−{fmt(safeInfo.effectiveSavingsTarget,currency)}</span>
              </div>
            )}
            <div className="safe-row">
              <span className="safe-lbl">{t("safe.recordedSpend")}</span>
              <span className="safe-val" style={{color:"var(--neg)"}}>−{fmt(safeInfo.curExp,currency)}</span>
            </div>
            {/* Part of the row above, not a further deduction: expenses entered for later this month are set aside, not spent. */}
            {safeInfo.laterExp>0&&(
              <div className="safe-row">
                <span className="safe-lbl">{t("safe.laterExpenses")}</span>
                <span className="safe-val" style={{color:"var(--ink-4)"}}>{fmt(safeInfo.laterExp,currency)}</span>
              </div>
            )}
            {/* De-emphasised by colour (still ≥ 4.5:1), not by opacity: at 40% opacity this row was 1.8:1 and hard to read. */}
            <div className="safe-row">
              <span className="safe-lbl" style={safeInfo.futureCommitments>0?undefined:{color:"var(--ink-4)"}}>{t("safe.upcoming")}</span>
              <span className="safe-val" style={{color:safeInfo.futureCommitments>0?"var(--warn)":"var(--ink-4)"}}>
                {safeInfo.futureCommitments>0?`−${fmt(safeInfo.futureCommitments,currency)}`:t("safe.noneThisMonth")}
              </span>
            </div>
            {/* Run 103 (owner decision D9): loan instalments from the Debts page, in full; and the principal of loan payments made this month */}
            {safeInfo.loanDue>0&&(
              <div className="safe-row safe-loan-due" data-section="safe-loan-due">
                <span className="safe-lbl">{t("safe.loanDue")}{safeInfo.loanDueCount>0?` (${safeInfo.loanDueCount})`:""}</span>
                <span className="safe-val" style={{color:"var(--warn)"}}>−{fmt(safeInfo.loanDue,currency)}</span>
              </div>
            )}
            {safeInfo.loanPrincipalPaid>0&&(
              <div className="safe-row safe-loan-paid" data-section="safe-loan-paid">
                <span className="safe-lbl">{t("safe.loanPrincipalPaid")}</span>
                <span className="safe-val" style={{color:"var(--ink-3)"}}>−{fmt(safeInfo.loanPrincipalPaid,currency)}</span>
              </div>
            )}
            <div className="safe-row" style={{borderBottom:"none",paddingTop:8,marginTop:2,borderTop:"3px double var(--rule-2)"}}>
              <span className="safe-lbl" style={{fontWeight:700,color:"var(--ink)"}}>{t("safe.discretionary")}</span>
              <span className="safe-val" style={{color:safeInfo.remaining>=0?"var(--pos)":"var(--neg)",fontSize:13}}>
                {safeInfo.remaining>=0?"+":""}{fmtSigned(safeInfo.remaining,currency)}
              </span>
            </div>
            {/* Explain which is driving the deduction */}
            {safeInfo.goalContributionActive&&safeInfo.savingsTarget>0&&(
              <div style={{fontSize:10,color:"var(--ink-4)",marginTop:4,fontStyle:"italic"}}>
                {t("safe.goalsExceedFloor",{ goals:fmt(safeInfo.goalContributions,currency), floor:fmt(safeInfo.savingsTarget,currency) })}
              </div>
            )}
          </div>
          <div className="safe-note">
            {t("safe.noteIncome")}{" "}
            {safeInfo.scheduleCount>0&&t("safe.noteSchedules",{ up:safeInfo.upcomingCount, un:safeInfo.unrecordedCount, s:safeInfo.scheduleCount, payments:tn("unit.payments",safeInfo.upcomingCount+safeInfo.unrecordedCount), schedules:tn("unit.schedules",safeInfo.scheduleCount) })}
          </div>
          </Collapse>
          {/* Always visible, open or not: without recurring bills the number is optimistic, and the user must not have to tap to learn that. */}
          {/* Run 31: the caveats share ONE quiet block (two stacked boxes competed with the number). The balance paragraph keeps its own hook. */}
          {(()=>{ const noRec=safeInfo.scheduleCount===0, lowHeld=held!==null&&safeInfo.remaining>0&&held<safeInfo.remaining; if (!noRec&&!lowHeld) return null; return (
            <div className="safe-note safe-caveat" role="note" data-section="home-safe-notes">
              {noRec&&<div>{t("safe.noteNoRecurring")}</div>}
              {/* The figure is a month-flow plan, not a bank balance: when the accounts hold less than it, say so (always visible). */}
              {lowHeld&&<div data-section="home-safe-held" style={noRec?{marginTop:6}:undefined}>{t("safe.noteBalance",{ held:fmtSigned(held,currency) })}</div>}
            </div>); })()}
          {why&&<div className="safe-note until-why" role="note" data-section="until-why">{t("until.why."+why)}</div>}
        </div>
      )}
      {/* Safe to Spend is on but no income has arrived yet this month: say so instead of showing nothing. */}
      {safeToSpend?.enabled&&!safeInfo.feasible&&(
        <div className={"safe-card section-enter section-enter-2"+(until?" safe-secondary":"")} role="status" data-section="home-safe">
          <div className="label-sm" style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
            <Icon name="safe" size={12} color="var(--ink-3)"/>{t(until?"safe.titleMonth":"safe.title")}
          </div>
          <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.5}}>
            {t("safe.waiting")}{safeInfo.expectedInc>0?" "+t("safe.waitingExpected",{ amount:fmt(safeInfo.expectedInc,currency) }):""}
          </div>
          {why&&<div className="safe-note until-why" role="note" data-section="until-why">{t("until.why."+why)}</div>}
        </div>
      )}
    </>
  );
}
// Run 97: what the visible accounts cover until the next income. Run 103 (owner decision D1): the main Home figure whenever it can be
// worked out, before or after this month's income; Safe to Spend is shown below it as the calendar-month figure.
function UntilPayCard({ untilPay, loose, currency }) {
  return (
        <div className="safe-card section-enter section-enter-2 until-main" data-section="home-untilpay">
          <div className="label-sm" style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <Icon name="safe" size={12} color="var(--ink-3)"/>{t("until.title")}
          </div>
          <div className="safe-amount" style={{color:untilPay.left>=0?"var(--ink)":"var(--neg)"}}>
            <MoneyText v={fmtSigned(untilPay.left,currency)}/>
          </div>
          <div className="list-sub" data-section="until-plain" style={{marginTop:2,marginBottom:4,lineHeight:1.45}}>{t(untilPay.left>=0?"until.plain":"until.plainOver",{ date:fmtDate(untilPay.payDate) })}</div>
          <div className="safe-daily" data-section="until-daily">
            {untilPay.left>0?t("safe.perDay",{amount:fmt(untilPay.perDay,currency)}):""}
            {tn("until.days",untilPay.days,{ date:fmtDate(untilPay.payDate) })}
          </div>
          <div style={{marginTop:10,borderTop:"1px solid var(--rule)",paddingTop:8}}>
            <div className="safe-row">
              <span className="safe-lbl">{t("until.held")}</span>
              <span className="safe-val">{fmtSigned(untilPay.held,currency)}</span>
            </div>
            <div className="safe-row">
              <span className="safe-lbl" style={untilPay.due>0?undefined:{color:"var(--ink-4)"}}>{t("until.due")}{untilPay.dueCount>0?` (${untilPay.dueCount})`:""}</span>
              <span className="safe-val" style={{color:untilPay.due>0?"var(--warn)":"var(--ink-4)"}}>{untilPay.due>0?`−${fmt(untilPay.due,currency)}`:t("until.none")}</span>
            </div>
            {untilPay.planned>0&&(
              <div className="safe-row">
                <span className="safe-lbl">{t("until.planned")}</span>
                <span className="safe-val" style={{color:"var(--ink-3)"}}>−{fmt(untilPay.planned,currency)}</span>
              </div>
            )}
          </div>
          <WhatIf kind="until" left={untilPay.left} days={untilPay.days} currency={currency}/>
          {loose&&loose.known&&loose.count>0&&(
            <div data-section="until-loose" role="note" style={{marginTop:8,borderTop:"1px solid var(--rule)",paddingTop:8}}>
              <div className="safe-row">
                <span className="safe-lbl">{t("until.loose",{ date:fmtDate(loose.since) })} ({loose.count})</span>
                <span className="safe-val" style={{color:"var(--warn)"}}>{fmt(loose.sum,currency)}</span>
              </div>
              <div className="list-sub" style={{lineHeight:1.45}}>{t("until.looseNote")}</div>
            </div>
          )}
          <div className="safe-note">{t("until.note")}</div>
        </div>
  );
}

// The rest of Home. Run 15: Home is the quick answer, not a second ledger. The full Goals and Budgets lists and the long
// recent-transactions list were removed from here: each lives in its own tab (Goals, Transactions), and the coach cards above
// still raise a goal or budget only when it needs attention. With entries, one route leads to the full list; without, the empty state.
export function HomeDetails({ hasTxns, onAdd, onOpenLedger, onInfo }) {
  return hasTxns?(
    <div className="section-enter section-enter-8" data-section="home-see-all">
      <button className="btn btn-ghost btn-full" onClick={onOpenLedger}>{t("home.seeAll")}<Icon name="chevRight" size={14}/></button>
    </div>
  ):(
    <div className="empty section-enter section-enter-8" data-section="home-empty">
      <div className="empty-icon"><LedgerArt/></div>
      <div className="empty-title">{t("home.emptyTitle")}</div>
      <div className="empty-body">{t("home.emptyBody")}</div>
      <button className="btn btn-primary btn-full" style={{maxWidth:220,marginTop:4}} onClick={onAdd}>{t("home.emptyBtn")}</button>
      <button className="btn btn-ghost btn-full" data-section="home-how" style={{maxWidth:220,marginTop:8}} onClick={()=>onInfo&&onInfo("how")}>{t("home.howBtn")}</button>
    </div>
  );
}

