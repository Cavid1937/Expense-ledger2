// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { useMemo, useState } from "react";
import { t, tn } from "../i18n.js";
import { CAT, CatIcon, Icon, accountBalances, netPosition, readDebts, buildSchedules, calcCategorySpend, calcMonthSummary, calcSafeToSpend, calcSpendingPace, calcSpentToDate, calcWhatChanged, catName, curMon, daysBetween, fmt, fmtDate, fmtPct, fmtShort, localDateStr, maskText, monthName, monthShort, prevMon, readAccounts, scheduleNextDue, surplusLabel, today } from "../App.jsx";
import { TxnRow } from "./ledger.jsx";
import { SmartHelper, SpendDonut } from "./analytics.jsx";

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
export function HomeAccounts({ transactions, currency, onManage }) {
  const data=readAccounts(), shown=data.accounts.filter(a=>!a.hidden);
  if (!shown.length) return null;
  const bal=accountBalances(data,transactions);
  const np=netPosition(data,transactions,readDebts());   // Run 28: null unless some debt or loan exists
  const kindName={ cash:t("acc.kind.cash"), card:t("acc.kind.card"), wallet:t("acc.kind.wallet"), bank:t("acc.kind.bank"), other:t("acc.kind.other") };
  const kindIcon={ cash:"finance", card:"card", wallet:"wallet", bank:"safe", other:"list" };
  const totalCents=shown.reduce((s,a)=>s+Math.round((bal[a.id]||0)*100),0);
  return (
    <div className="section-enter section-enter-1" data-section="home-accounts" style={{marginBottom:14}}>
      <div className="card-head" style={{padding:"0 2px",marginBottom:8}}><span className="card-title">{t("acc.homeTitle")}</span><button className="btn btn-sm" data-section="home-accounts-manage" onClick={onManage}>{t("acc.manage")}</button></div>
      <div className="acc-strip">
        {shown.map(a=>(
          <button key={a.id} className="acc-card" data-acc-card={a.id} onClick={onManage} aria-label={a.name+", "+kindName[a.kind]+", "+fmt(bal[a.id]||0,currency)}>
            <span className="acc-ico" aria-hidden="true"><Icon name={kindIcon[a.kind]||"list"} size={16} color="var(--accent)"/></span>
            <span className="acc-name">{a.name}</span>
            <span className="acc-bal"><MoneyText v={fmt(bal[a.id]||0,currency)}/></span>
          </button>
        ))}
      </div>
      {shown.length>1&&<div className="list-sub" style={{margin:"8px 2px 0"}}>{t("acc.total",{ amount:fmt(totalCents/100,currency) })}</div>}
      {np&&<div className="list-sub" data-section="home-netpos" style={{margin:"4px 2px 0"}}>{t("acc.net",{ amount:fmt(np.net/100,currency) })}</div>}
    </div>
  );
}
export function HomePage({ transactions, accountTxns, latest=[], bills=[], budgets, templates, currency, safeToSpend, goals, setup, onSetupHide, onSetupGo, onAdd, onTemplate, onView, onOpenLedger, onInfo, onAccounts }) {
  const now=curMon(), prv=prevMon();
  const { curExp,curInc,prevExp,momDiff,surplusRate,plannedExp,plannedInc,cmpKind }=calcMonthSummary(transactions,now,prv);
  const catSpend    =calcCategorySpend(transactions,now);
  const budgetTotal =Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const spentToDate =calcSpentToDate(transactions,now);
  const paceInfo    =calcSpendingPace(spentToDate,now,budgetTotal);
  const safeInfo   =calcSafeToSpend(transactions,safeToSpend,goals,new Date(),bills);
  const wc          =calcWhatChanged(transactions,now,prv);
  const hasIncome   =curInc>0;

  // Upcoming recurring (due within 7 days)
  const upcomingSchedules=useMemo(()=>{
    const nowD=new Date();
    return buildSchedules(transactions,bills).filter(x=>x.isActive&&x.type==="expense")
      .map(x=>({...x,nextDue:scheduleNextDue(x,transactions,nowD)}))
      .filter(x=>x.nextDue&&daysBetween(nowD,x.nextDue)<=7)
      .sort((a,b)=>a.nextDue-b.nextDue);
  },[transactions,bills]);

  return (
    <div>
      {/* LEVEL 1 (redesign order): Safe to Spend first, then this month's position, then what is due soon. */}
      <SafeToSpendCard safeToSpend={safeToSpend} safeInfo={safeInfo} currency={currency} now={now}/>
      <div className={`hero card${safeToSpend?.enabled?" quiet":""}`} data-section="home-month">
        <div className="card-head"><span className="card-title">{t("home.thisMonth")}</span><span className="hero-eyebrow">{monthName(now)}</span></div>
        <div className="hero-amount"><MoneyText v={fmt(curExp,currency)}/></div>
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
            {hasIncome?(
              <><div className={`hero-stat-val${(surplusRate||0)>=20?" pos":(surplusRate||0)<0?" neg":""}`}>{fmtPct(surplusRate??0)}</div><div className="hero-stat-lbl">{t("surplus."+surplusLabel(curInc,curExp))}</div></>
            ):(
              <><div className={`hero-stat-val${curInc>curExp?" pos":curInc<curExp?" neg":""}`}>{curInc<curExp?"−":""}{fmtShort(Math.abs(curInc-curExp),currency)}</div><div className="hero-stat-lbl">{t("home.balance")}</div></>
            )}
          </div>
        </div>
        <PlannedNote plannedExp={plannedExp} plannedInc={plannedInc} currency={currency} style={{marginTop:10}}/>
      </div>

      <HomeAccounts transactions={accountTxns||transactions} currency={currency} onManage={onAccounts}/>

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

      {/* Run 18: the five most recent entries (all of them, including loan and debt repayments), newest first */}
      {latest.length>0&&(
        <div className="card section-enter section-enter-2" data-section="home-latest">
          <div className="card-head"><span className="card-title">{t("home.latest")}</span><button className="btn btn-sm" data-section="home-latest-all" onClick={onOpenLedger}>{t("home.seeAllTxns")}</button></div>
          {latest.map(x=><TxnRow key={x.id} txn={x} currency={currency} onView={onView} compact/>)}
        </div>
      )}

      {/* Run 25: the donut is long, so it follows the latest entries instead of pushing them off the first screen. */}
      {curExp>0&&<div className="card section-enter section-enter-2" data-section="home-breakdown">
        <div className="card-title" style={{marginBottom:8}}>{t("home.breakdown")}</div>
        <SpendDonut catSpend={catSpend} total={curExp} currency={currency}/>
      </div>}

      {/* Smart Helper — deterministic advice cards */}
      <div className="section-enter section-enter-2" data-section="home-coach">
        <SmartHelper transactions={transactions} bills={bills} budgets={budgets} goals={goals} safeToSpend={safeToSpend} currency={currency}/>
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
            <button type="button" className="btn btn-ghost btn-sm setup-hide" style={{marginTop:6}} onClick={onSetupHide}>{t("setup.hide")}</button>
          </div>
        );
      })()}
      <HomeDetails hasTxns={transactions.length>0} onAdd={onAdd} onOpenLedger={onOpenLedger} onInfo={onInfo}/>
    </div>
  );
}

// The Safe to Spend card and its note (redesign: shown first on Home). A separate function only to keep HomePage readable.
export function SafeToSpendCard({ safeToSpend, safeInfo, currency, now }) {
  // Run 9: the number first; the explanation (what was deducted and why) opens on tap — it is long and pushed the month
  // summary and upcoming bills out of the first screen.
  const [open,setOpen]=useState(false);
  return (
    <>
      {safeToSpend?.enabled&&safeInfo.feasible&&(
        <div className="safe-card section-enter section-enter-2" data-section="home-safe">
          <div className="label-sm" style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <Icon name="safe" size={12} color="var(--ink-3)"/>{t("safe.title")}
          </div>
          <div className="safe-amount" style={{color:safeInfo.remaining>=0?"var(--ink)":"var(--neg)"}}>
            <MoneyText v={fmt(safeInfo.remaining,currency)}/>
          </div>
          {safeInfo.daysRemaining>0&&(
            <div className="safe-daily">
              {safeInfo.remaining>0?t("safe.perDay",{amount:fmt(safeInfo.dailyAllowance,currency)}):""}
              {tn("safe.daysLeft",safeInfo.daysRemaining,{month:monthShort(now)})}
            </div>
          )}
          {safeInfo.daysRemaining>0&&(()=>{ const t0=new Date(), dim=new Date(t0.getFullYear(),t0.getMonth()+1,0).getDate(), left=Math.min(safeInfo.daysRemaining,dim), gone=dim-left; return (   /* Run 27d: the month as a row of day-ticks: days gone are filled, today is taller, days ahead are faint */
            <div className="runway" aria-hidden="true">{Array.from({length:dim},(_,i)=><i key={i} className={i<gone?"on":i===gone?"now":""}/>)}</div>
          ); })()}
          <button className="safe-toggle" aria-expanded={open} aria-controls="safe-breakdown" onClick={()=>setOpen(o=>!o)}>
            {t(open?"safe.hideHow":"safe.showHow")}<Icon name={open?"chevDown":"chevRight"} size={14}/>
          </button>
          {open&&<div id="safe-breakdown">
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
            <div className="safe-row" style={{borderBottom:"none",paddingTop:8,marginTop:2,borderTop:"3px double var(--rule-2)"}}>
              <span className="safe-lbl" style={{fontWeight:700,color:"var(--ink)"}}>{t("safe.discretionary")}</span>
              <span className="safe-val" style={{color:safeInfo.remaining>=0?"var(--pos)":"var(--neg)",fontSize:13}}>
                {safeInfo.remaining>=0?"+":""}{fmt(safeInfo.remaining,currency)}
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
          </div>}
          {/* Always visible, open or not: without recurring bills the number is optimistic, and the user must not have to tap to learn that. */}
          {safeInfo.scheduleCount===0&&<div className="safe-note safe-caveat" role="note">{t("safe.noteNoRecurring")}</div>}
        </div>
      )}

      {/* Safe to Spend is on but no income has arrived yet this month: say so instead of showing nothing. */}
      {safeToSpend?.enabled&&!safeInfo.feasible&&(
        <div className="safe-card section-enter section-enter-2" role="status" data-section="home-safe">
          <div className="label-sm" style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
            <Icon name="safe" size={12} color="var(--ink-3)"/>{t("safe.title")}
          </div>
          <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.5}}>
            {t("safe.waiting")}{safeInfo.expectedInc>0?" "+t("safe.waitingExpected",{ amount:fmt(safeInfo.expectedInc,currency) }):""}
          </div>
        </div>
      )}
    </>
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

