// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { useMemo, useState } from "react";
import { t, tn } from "../i18n.js";
import { Collapse } from "./motion.jsx";
import { CAT, CatIcon, Icon, activateKey, billPaymentsLeft, billsToIcs, buildSchedules, catName, daysBetween, downloadFile, fmt, fmtDate, localDateStr, localMonthStr, maskText, scheduleMonthStatus, scheduleMonthly, scheduleNextDue, subName, today } from "../App.jsx";

// Run 63 (owner batch D10): every payment recorded for a repeating bill, newest first, folded under the bill. Read-only; tapping one opens it.
function PaymentsFold({ ids, byId, currency, onView }) {
  const [open,setOpen]=useState(false);
  const list=(ids||[]).map(id=>byId.get(String(id))).filter(Boolean).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  if (!list.length) return null;
  return (
    <div data-section="rec-payments" style={{padding:"0 14px",borderBottom:open?"1px solid var(--rule)":"none"}}>
      <button type="button" data-section="rec-payments-toggle" aria-expanded={open} onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"none",color:"var(--accent-text)",fontSize:12,padding:"6px 0",cursor:"pointer",minHeight:32,fontFamily:"var(--font)"}}>{t(open?"rec.histHide":"rec.histShow",{ n:list.length })}</button>
      <Collapse open={open}>
        <div role="list" style={{paddingBottom:8}}>
          {list.map(p=>(
            <button type="button" role="listitem" key={String(p.id)} data-section="rec-payment" onClick={()=>onView&&onView(p)} style={{display:"flex",justifyContent:"space-between",gap:8,width:"100%",background:"none",border:"none",borderTop:"1px solid var(--rule)",padding:"6px 0",fontSize:12.5,color:"var(--ink)",cursor:"pointer",textAlign:"left",fontFamily:"var(--font)"}}>
              <span>{fmtDate(p.date)}</span><span style={{fontWeight:600,whiteSpace:"nowrap"}}>{p.type==="income"?"+":"−"}{fmt(p.amount,currency)}</span>
            </button>))}
        </div>
      </Collapse>
    </div>
  );
}

export function RecurringHub({ transactions, bills=[], currency, onView, onToggleSchedule, onRecordPayment, onConvert, onEditBill, onToggleBill, onAddBill, suggestions=[], onReviewSuggestion, onDismissSuggestion }) {
  const schedules=useMemo(()=>{
    const nowD=new Date();
    return buildSchedules(transactions,bills).map(x=>{
      const st=x.isActive ? scheduleMonthStatus(x,transactions,localMonthStr(nowD),nowD) : null;
      return { ...x, nextDue:scheduleNextDue(x,transactions,nowD), monthly:scheduleMonthly(x), left:billPaymentsLeft(x,transactions,nowD), unrecordedThisMonth:st?st.overdue.length:0 };
    }).sort((a,b)=>{ if (a.isActive!==b.isActive) return a.isActive?-1:1; return (a.nextDue?a.nextDue.getTime():Infinity)-(b.nextDue?b.nextDue.getTime():Infinity); });
  },[transactions,bills]);
  const inferred=schedules.filter(x=>!x.billId).length;
  const active=schedules.filter(x=>x.isActive), paused=schedules.filter(x=>!x.isActive);
  const outgoing=active.filter(x=>x.type==="expense");
  const monthlyOut=outgoing.reduce((a,x)=>a+x.monthly,0);
  const monthlyIn=active.filter(x=>x.type==="income").reduce((a,x)=>a+x.monthly,0);
  const nowD=new Date();
  const upcoming=outgoing.filter(x=>x.nextDue&&daysBetween(nowD,x.nextDue)<=7);

  const sugCard = (suggestions&&suggestions.length>0&&onReviewSuggestion) ? (
    <div className="card" data-section="rec-suggest" style={{marginBottom:12}}>
      <div className="a-card-title">{t("recsug.title")}</div>
      <div className="list-sub" style={{marginBottom:6}}>{t("recsug.sub")}</div>
      {suggestions.slice(0,3).map(s=>(
        <div key={s.name} className="list-row" style={{alignItems:"center",gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div className="list-title">{s.name}</div>
            <div className="list-sub">{tn(s.freq==="yearly"?"recsug.lineYearly":"recsug.lineMonthly",s.count,{ amount:fmt(s.amount,currency) })}</div>
          </div>
          <button type="button" className="btn btn-sm btn-sm-primary" data-section="rec-suggest-review" data-name={s.name} onClick={()=>onReviewSuggestion(s)}>{t("recsug.review")}</button>
          <button type="button" className="btn btn-ghost btn-sm" data-section="rec-suggest-dismiss" data-name={s.name} aria-label={t("recsug.dismiss")+": "+s.name} onClick={()=>onDismissSuggestion(s)}>{t("recsug.dismiss")}</button>
        </div>
      ))}
    </div>
  ) : null;
  if (schedules.length===0) return (
    <div className="empty">
      <div className="empty-icon"><Icon name="repeat" size={30}/></div>
      <div className="empty-title">{t("rec.emptyTitle")}</div>
      <div className="empty-body">{t("rec.emptyBody")}</div>
      {sugCard}
      {/* Run 31: an empty screen is an invitation to act: the same "Add bill" the header action opens */}
      {onAddBill&&<button className="btn btn-primary btn-full" data-section="rec-empty-add" style={{maxWidth:220,marginTop:4}} onClick={onAddBill}>{t("bill.add")}</button>}
    </div>
  );

  const ics=billsToIcs(outgoing,transactions,nowD,{ label:x=>maskText(x.merchant||x.note)||catName(x.category), amountText:x=>fmt(x.amount,currency) });   // Run 24
  const dueText=(x)=>{ if (!x.nextDue) return t("rec.noDate"); const d=daysBetween(nowD,x.nextDue); return d===0?t("rec.dueToday"):d===1?t("rec.dueTomorrow"):d<=60?tn("rec.dueInDays",d):t("rec.dueOn",{date:fmtDate(localDateStr(x.nextDue))}); };
  const byId=new Map((transactions||[]).map(x=>[String(x.id),x]));
  const Row=({x})=>{
    const cat=CAT(x.category)||{id:"other",color:"#98A5B7"};
    const isInc=x.type==="income";
    const near=x.nextDue && daysBetween(nowD,x.nextDue)<=3;
    return (<div data-section="rec-item">
      {/* A paused schedule is marked by its "Paused" text and a faded icon; its text keeps full contrast (fading the whole row
          made it 2.2–3.9:1, including the Reactivate button the user needs). */}
      <div style={{display:"flex",alignItems:"center",gap:11,padding:"12px 14px",borderBottom:"1px solid var(--rule)"}}>
        <div aria-hidden="true" onClick={()=>x.billId?onEditBill?.(x.bill):onView?.(x.latest)} style={{width:38,height:38,borderRadius:"50%",background:(cat.color)+"26",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",opacity:x.isActive?1:0.5}}>
          <CatIcon catId={cat.id} size={16} color={cat.color}/>
        </div>
        <div className={x.billId?"bill-row":undefined} role="button" tabIndex={0} onKeyDown={activateKey(()=>x.billId?onEditBill?.(x.bill):onView?.(x.latest))} onClick={()=>x.billId?onEditBill?.(x.bill):onView?.(x.latest)} style={{flex:1,minWidth:0,cursor:"pointer"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",overflowWrap:"anywhere"}}>{maskText(x.merchant||x.note)||catName(x.category)}</div>
          <div style={{fontSize:11,color:"var(--ink-3)",marginTop:1,lineHeight:1.4}}>
            {catName(x.category)}{x.subcategory?` / ${subName(x.subcategory)}`:""} · {t("freq."+x.freq)} · {tn("rec.paymentsRecorded",x.occurrences.length)}
          </div>
          <div style={{fontSize:11,marginTop:1,color:near&&x.isActive?"var(--warn)":"var(--ink-4)",fontWeight:near&&x.isActive?700:400}}>
            {x.isActive?dueText(x):t("rec.paused")}{x.left!=null&&x.isActive&&<span> · {x.left>0?tn("bill.paymentsLeft",x.left):t("bill.endedOn",{date:fmtDate(x.bill.endDate)})}</span>} · {x.occurrences.length?t("rec.last",{date:fmtDate(x.occurrences[x.occurrences.length-1])}):t("bill.noPayments")}
            {x.unrecordedThisMonth>0&&<span style={{color:"var(--warn)",fontWeight:700}}> · {tn("rec.notRecorded",x.unrecordedThisMonth)}</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          <div style={{fontFamily:"var(--font)",fontSize:14,fontWeight:600,color:isInc?"var(--pos)":"var(--ink)"}}>{isInc?"+":"−"}{fmt(x.amount,currency)}</div>
          {x.freq!=="monthly"&&x.isActive&&<div style={{fontSize:10,color:"var(--ink-4)",fontStyle:"italic"}}>{t("rec.perMonthApprox",{amount:fmt(x.monthly,currency)})}</div>}
          {/* Run 41: what it costs over a year (the monthly estimate x 12), so a small monthly charge is seen for its real size */}
          {!isInc&&x.isActive&&<div style={{fontSize:10,color:"var(--ink-4)",fontStyle:"italic"}} data-yearly="1">{t("rec.perYearApprox",{amount:fmt(x.monthly*12,currency)})}</div>}
          {/* Run 6 (D20): a payment only settles a bill when it is recorded as that bill (same details, Recurring on).
              This opens the Add form filled in exactly that way, dated today; the user can still change anything. */}
          {x.isActive&&onRecordPayment&&(
            <button className="rec-record" onClick={e=>{e.stopPropagation();onRecordPayment(x);}} style={{fontSize:11,fontWeight:700,color:"var(--ink)",background:"none",border:"none",cursor:"pointer",padding:"8px 0",minHeight:36,fontFamily:"var(--font)",textDecoration:"underline",textUnderlineOffset:2}}>
              {t(isInc?"rec.recordIncome":"rec.recordPayment")}
            </button>
          )}
          <button onClick={e=>{e.stopPropagation(); if (x.billId) onToggleBill(x.billId,!x.isActive); else onToggleSchedule(x.memberIds,!x.isActive);}} style={{fontSize:11,fontWeight:700,color:x.isActive?"var(--warn)":"var(--pos)",background:"none",border:"none",cursor:"pointer",padding:"8px 0",minHeight:36,fontFamily:"var(--font)",textDecoration:"underline",textUnderlineOffset:2}}>
            {x.isActive?t("rec.pause"):t("rec.reactivate")}
          </button>
        </div>
      </div>
      <PaymentsFold ids={x.memberIds} byId={byId} currency={currency} onView={onView}/>
    </div>);
  };

  return (
    <div>
      <div style={{fontSize:11,color:"var(--ink-4)",fontStyle:"italic",marginBottom:14,lineHeight:1.5}}>{t("rec.intro")}</div>
      {sugCard}
      {inferred>0&&onConvert&&(
        <div className="card bill-convert">
          <div className="card-title" style={{marginBottom:6}}>{t("bill.legacyTitle")}</div>
          <div className="list-sub" style={{lineHeight:1.5}}>{tn("bill.legacyText",inferred)}</div>
          <button className="btn btn-primary btn-full rec-convert" onClick={onConvert} style={{marginTop:12}}>{t("bill.convertBtn")}</button>
        </div>
      )}
      <div className="stat-row">
        <div className="stat-cell"><div className="stat-val" style={{color:"var(--neg)"}}>{fmt(monthlyOut,currency)}</div><div className="stat-lbl">{t("rec.monthlyOut")}</div></div>
        <div className="stat-cell"><div className="stat-val">{fmt(monthlyOut*12,currency)}</div><div className="stat-lbl">{t("rec.yearly")}</div></div>
        {monthlyIn>0&&<div className="stat-cell"><div className="stat-val" style={{color:"var(--pos)"}}>{fmt(monthlyIn,currency)}</div><div className="stat-lbl">{t("rec.monthlyIn")}</div></div>}
        <div className="stat-cell"><div className="stat-val">{active.length}</div><div className="stat-lbl">{t("rec.activeSchedules")}</div></div>
      </div>
      {upcoming.length>0&&(
        <div className="card">
          <div className="card-head"><span className="card-title">{t("home.dueWithin7")}</span></div>
          {upcoming.map(x=>{ const c=CAT(x.category); return (
            <div key={x.key} className="up-row">
              <span className="cat-dot" style={{background:(c?.color||"#98A5B7")+"26"}}><CatIcon catId={x.category} size={16}/></span>
              <div className="up-body"><div className="list-title">{maskText(x.merchant||x.note)||catName(x.category)}</div><div className="list-sub">{catName(x.category)}</div></div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div className="up-amt">{fmt(x.amount,currency)}</div>
                <div style={{fontSize:11,color:"var(--warn)",fontWeight:600}}>{dueText(x)}</div>
              </div>
            </div>
          ); })}
        </div>
      )}
      {active.length>0&&(<>
        <div className="label-sm" style={{marginBottom:8}}>{t("rec.active")}</div>
        <div className="rec-hint" style={{fontSize:12,color:"var(--ink-3)",lineHeight:1.5,margin:"-2px 2px 10px"}}>{t("rec.recordHint")}</div>
        <div style={{background:"var(--bg-card)",border:"1px solid var(--rule)",borderRadius:8,overflow:"hidden",marginBottom:14}}>{active.map(x=><Row key={x.key} x={x}/>)}</div>
      </>)}
      {paused.length>0&&(<>
        <div className="label-sm" style={{marginBottom:8}}>{t("rec.paused")}</div>
        <div style={{background:"var(--bg-card)",border:"1px solid var(--rule)",borderRadius:8,overflow:"hidden",marginBottom:14}}>{paused.map(x=><Row key={x.key} x={x}/>)}</div>
      </>)}
      {outgoing.length>0&&(
        <>
          <button className="btn btn-ghost btn-full" data-section="bills-ics" disabled={!ics.count} style={{marginBottom:ics.count?14:4}} onClick={()=>downloadFile(ics.text,"text/calendar;charset=utf-8","expense-ledger-bills.ics")}>{t("bill.icsBtn")}</button>
          {!ics.count&&<div className="list-sub" style={{marginBottom:14}}>{t("bill.icsNone")}</div>}
        </>
      )}
      {monthlyOut>0&&(
        <div className="a-card" style={{marginTop:4}}>
          <div className="a-card-title">{t("rec.yearlyByCat")}</div>
          {(()=>{
            const ct={}; outgoing.forEach(x=>{ ct[x.category]=(ct[x.category]||0)+x.monthly; });
            const sorted=Object.entries(ct).sort((a,b)=>b[1]-a[1]); const maxV=sorted[0]?.[1]||1;
            return sorted.map(([catId,mo])=>{
              const cat=CAT(catId)||{id:"other",color:"#98A5B7"};
              return (<div key={catId} className="cat-bar"><div className="cat-bar-name"><CatIcon catId={cat.id} size={12} color={cat.color}/>{catName(catId)}</div><div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(mo/maxV)*100}%`,background:cat.color}}/></div><div className="cat-bar-amt">{fmt(mo*12,currency)}</div></div>);
            });
          })()}
        </div>
      )}
    </div>
  );
}

