// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { useState } from "react";
import { locale, t, tn } from "../i18n.js";
import { Icon, LOAN_KINDS, LOAN_RATE_TYPES, askConfirm, cleanDebtData, cleanMoneyText, debtCanPay, debtRemaining, debtsHealth, fmt, fmtDate, fmtPct, formMoney, impliedNominalPct, isQapik, isValidDateStr, loanExtraEffect, loanSchedule, maskText, readDebts, today, txt, writeDebts } from "../App.jsx";
import { LedgerArt } from "./home.jsx";
import { Collapse, Reveal, Swap, useBackStep } from "./motion.jsx";   // Run 38: forms, edits and the Debts / Loans switch ease in and out

// ─── Debts & loans page (Run 17) ──────────────────────────────────────────────
// Settings → Debts & loans. Debts are person-to-person (no interest); loans have a rate and a schedule (an ESTIMATE from the typed terms).
// Money is stored as whole qapik under its own key (see cleanDebtData). Marking a loan payment adds ONE ordinary expense to Transactions
// (category Finance, merchant = the lender) and remembers its id; deleting the payment record removes that entry too.
export const LOAN_KIND_KEY={ cash:"loan.kind.cash", card:"loan.kind.card", taksit:"loan.kind.taksit", other:"loan.kind.other" };
export const LOAN_RT_KEY={ annuity:"loan.rt.annuity", equal:"loan.rt.equal", flat:"loan.rt.flat", none:"loan.rt.none" };
export function DebtsPage({ currency, onAddEntry, onRemoveEntry, showToast, showSnackbar, initialSeg="debts" }) {
  const [data,setData]=useState(()=>readDebts());
  const [seg,setSeg]=useState(initialSeg==="loans"?"loans":"debts");
  const [showDebt,setShowDebt]=useState(false), [showLoan,setShowLoan]=useState(false);
  const [dForm,setDForm]=useState({ dir:"owe", name:"", amt:"", due:"" }), [dMsg,setDMsg]=useState("");
  const [lForm,setLForm]=useState({ lender:"", kind:"cash", amt:"", type:"annuity", rate:"", months:"", first:"", bank:"" }), [lMsg,setLMsg]=useState("");
  const [pay,setPay]=useState({}), [payMsg,setPayMsg]=useState({}), [intr,setIntr]=useState({}), [ext,setExt]=useState({});
  const uid=(p)=>`${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
  const q=(v)=>fmt(v/100,currency);
  const [health,setHealth]=useState(()=>debtsHealth());
  const blocked=health.status==="corrupt"||health.status==="unreadable";
  // Nothing is shown as saved unless it was really written; a refused write leaves the screen and the stored data as they were.
  const save=(next)=>{ if (writeDebts(next)) { setData(next); setHealth(debtsHealth()); return true; } setHealth(debtsHealth()); showToast(t(blocked?"debt.blockedToast":"banner.saveFailed")); return false; };
  const [ask,setAsk]=useState(null);   // Run 18: { id, amt } while the "also record in transactions?" question is open
  const toQ=(text,opts)=>{ const v=formMoney(text,opts); return v===null ? null : Math.round(v*100); };

  const addDebt=()=>{
    const principal=toQ(dForm.amt,{positive:true}), name=dForm.name.trim();
    if (!name || principal===null || !isQapik(principal)) { setDMsg(t("debt.invalid")); return; }
    if (save({ ...data, debts:[...data.debts,{ id:uid("d"), direction:dForm.dir, name, principal, dueDate:dForm.due, note:"", payments:[] }] })) showToast(t("debt.addedToast"));
    setDForm({ dir:"owe", name:"", amt:"", due:"" }); setDMsg(""); setShowDebt(false);
  };
  // Run 18 (owner decision "ask each time"): a repayment always reduces the debt; the user chooses whether it ALSO becomes a cash-flow entry
  // (money paid out when you repay, received when you are repaid). The entry is the principal only; it is not spending or income.
  const addPayment=(d)=>{
    const amt=toQ(pay[d.id]||"",{positive:true});
    if (amt===null || !debtCanPay(d,amt)) { setPayMsg(m=>({...m,[d.id]:t("debt.tooMuch",{left:q(debtRemaining(d))})})); return; }
    setPayMsg(m=>({...m,[d.id]:""})); setAsk({ id:d.id, amt });
  };
  const entryFor=(d,pid,amt,date)=>({ type:d.direction==="owe"?"expense":"income", amount:amt/100, category:d.direction==="owe"?"finance":"income", subcategory:"", merchant:d.name, note:t(d.direction==="owe"?"debt.entryNoteOwe":"debt.entryNoteOwed"), date, recurring:false, recurFreq:null, isActive:true, debtLink:{ debtId:d.id, paymentId:pid } });
  const recordPayment=(d,link)=>{
    if (!ask || ask.id!==d.id) return;
    const amt=ask.amt, pid=uid("p"), date=today();
    if (!debtCanPay(d,amt)) { setAsk(null); return; }
    const txnId=link ? onAddEntry(entryFor(d,pid,amt,date)) : undefined;
    const row={ id:pid, date, amount:amt, ...(txnId!==undefined?{ txnId }:{}) };
    if (!save({ ...data, debts:data.debts.map(x=>x.id===d.id?{...x,payments:[...x.payments,row]}:x) })) { if (txnId!==undefined) onRemoveEntry(txnId); return; }
    setAsk(null); setPay(p=>({...p,[d.id]:""}));
    showSnackbar(t("debt.recorded"),()=>{   // Undo removes the repayment AND its linked entry together
      const cur=readDebts(), cd=cur.debts.find(x=>x.id===d.id), cp=cd&&cd.payments.find(x=>x.id===pid);
      if (!cp) return;
      if (writeDebts({ ...cur, debts:cur.debts.map(x=>x.id===d.id?{...x,payments:x.payments.filter(y=>y.id!==pid)}:x) })) { if (txnId!==undefined) onRemoveEntry(txnId); setData(readDebts()); }
    },6000,"debtpay");
  };
  const delPayment=(d,pid)=>{
    const p=d.payments.find(x=>x.id===pid); if (!p) return;
    if (!save({ ...data, debts:data.debts.map(x=>x.id===d.id?{...x,payments:x.payments.filter(y=>y.id!==pid)}:x) })) return;
    if (p.txnId!==undefined) { onRemoveEntry(p.txnId);
      showSnackbar(t("debt.payRemoved"),()=>{   // Undo puts the repayment back with a fresh linked entry (same amount and date)
        const cur=readDebts(), cd=cur.debts.find(x=>x.id===d.id); if (!cd || cd.payments.some(x=>x.id===pid) || !debtCanPay(cd,p.amount)) return;
        const e=entryFor(d,pid,p.amount,p.date), newId=onAddEntry(e);
        if (writeDebts({ ...cur, debts:cur.debts.map(x=>x.id===d.id?{...x,payments:[...x.payments,{ ...p, txnId:newId }]}:x) })) setData(readDebts()); else onRemoveEntry(newId);
      },6000,"debtpay");
    }
  };
  // Edit a debt's name, amount and due date. The amount can never drop below what has already been repaid.
  const [dEdit,setDEdit]=useState(null), [lEdit,setLEdit]=useState(null);
  // Run 40: phone Back cancels an open form, edit or question first (newest first), the same as its Cancel button; nothing is saved.
  useBackStep(showDebt,()=>{ setShowDebt(false); setDMsg(""); });
  useBackStep(showLoan,()=>{ setShowLoan(false); setLMsg(""); });
  useBackStep(!!dEdit,()=>setDEdit(null));
  useBackStep(!!lEdit,()=>setLEdit(null));
  useBackStep(!!ask,()=>setAsk(null));
  const saveDebtEdit=()=>{
    const d=data.debts.find(x=>x.id===dEdit.id); if (!d) { setDEdit(null); return; }
    const principal=toQ(dEdit.amt,{positive:true}), name=dEdit.name.trim(), paid=d.principal-debtRemaining(d);
    if (!name || principal===null || !isQapik(principal) || principal<paid || (dEdit.due && !isValidDateStr(dEdit.due))) { showToast(t("debt.invalid")); return; }
    if (save({ ...data, debts:data.debts.map(x=>x.id===d.id?{...x,name,principal,dueDate:dEdit.due||""}:x) })) { setDEdit(null); showToast(t("acc.edited")); }
  };
  const saveLoanEdit=()=>{
    // Terms (amount, yearly rate, number of payments) can be changed too, but the new loan must still produce a valid schedule and
    // cannot have fewer payments than were already marked paid. Recorded payments keep the amounts they were recorded with.
    const old=data.loans.find(x=>x.id===lEdit.id); if (!old) { setLEdit(null); return; }
    const lender=lEdit.lender.trim(), principal=toQ(lEdit.amt,{positive:true}), months=Number(lEdit.months);
    const ratePct=old.rateType==="none" ? 0 : Number(String(lEdit.rate).replace(",","."));
    const next={ ...old, lender, principal, months, ratePct };
    if (!lender || principal===null || !isQapik(principal) || !Number.isInteger(months) || months<old.payments.length || (old.rateType!=="none" && (String(lEdit.rate).trim()==="" || !Number.isFinite(ratePct))) || loanSchedule(next)===null) { showToast(t("loan.invalid")); return; }
    if (save({ ...data, loans:data.loans.map(x=>x.id===old.id?next:x) })) { setLEdit(null); showToast(t("acc.edited")); }
  };
  const delDebt=(d)=>{
    const linked=d.payments.filter(p=>p.txnId!==undefined);
    askConfirm(t(linked.length?"debt.confirmDeleteLinked":"debt.confirmDelete")).then(yes=>{ if (!yes) return;
      if (save({ ...data, debts:data.debts.filter(x=>x.id!==d.id) })) { linked.forEach(p=>onRemoveEntry(p.txnId)); showToast(t("debt.removedToast")); } });
  };

  const addLoan=()=>{
    const principal=toQ(lForm.amt,{positive:true}), months=Number(lForm.months), bank=lForm.bank.trim()===""?null:toQ(lForm.bank,{positive:true});
    const rate=lForm.type==="none" ? 0 : Number(String(lForm.rate).replace(",","."));
    const loan={ id:uid("l"), lender:lForm.lender.trim(), kind:lForm.kind, principal, ratePct:rate, rateType:lForm.type, months, firstPayment:lForm.first, bankPayment:bank, payments:[] };
    if (!loan.lender || principal===null || (lForm.type!=="none" && lForm.rate.trim()==="") || (lForm.bank.trim()!=="" && bank===null) || loanSchedule(loan)===null) { setLMsg(t("loan.invalid")); return; }
    if (save({ ...data, loans:[...data.loans,loan] })) showToast(t("loan.addedToast"));
    setLForm({ lender:"", kind:"cash", amt:"", type:"annuity", rate:"", months:"", first:"", bank:"" }); setLMsg(""); setShowLoan(false);
  };
  const markPaid=(l,sched)=>{
    const k=l.payments.length; if (k>=sched.payments.length) return;
    const row=sched.payments[k], date=today();
    // The interest part defaults to the schedule's estimate and can be edited; empty means "I do not know the split" (nothing is invented).
    const text=(intr[l.id]!==undefined ? intr[l.id] : (row.interest/100).toFixed(2)).trim();
    const iv=text==="" ? null : formMoney(text);
    if (text!=="" && (iv===null || Math.round(iv*100)>row.payment)) { showToast(t("loan.interestInvalid")); return; }
    const txnId=onAddEntry({ type:"expense", amount:row.payment/100, loan:{ interest:iv },  category:"finance", subcategory:"", merchant:l.lender, note:t("loan.entryNote"), date, recurring:false, recurFreq:null, isActive:true });
    save({ ...data, loans:data.loans.map(x=>x.id===l.id?{...x,payments:[...x.payments,{ id:uid("p"), date, amount:row.payment, txnId }]}:x) });
    showToast(t("loan.paidToast"));
  };
  const delLoanPayment=(l,p)=>{
    askConfirm(t("loan.confirmDeletePay")).then(yes=>{ if (!yes) return;
      if (p.txnId!==undefined) onRemoveEntry(p.txnId);
      if (save({ ...data, loans:data.loans.map(x=>x.id===l.id?{...x,payments:x.payments.filter(y=>y.id!==p.id)}:x) })) showToast(t("loan.payRemovedToast")); });
  };
  const delLoan=(l)=>{ askConfirm(t("debt.confirmDelete")).then(yes=>{ if (yes && save({ ...data, loans:data.loans.filter(x=>x.id!==l.id) })) showToast(t("loan.removedToast")); }); };

  const owe=data.debts.filter(d=>d.direction==="owe").reduce((s,d)=>s+debtRemaining(d),0), owed=data.debts.filter(d=>d.direction==="owed").reduce((s,d)=>s+debtRemaining(d),0);
  const loanLeft=data.loans.reduce((s,l)=>{ const sc=loanSchedule(l), k=l.payments.length; return s+(sc ? (k===0 ? l.principal : k>=sc.payments.length ? 0 : sc.payments[k-1].balance) : 0); },0);
  const upd=(setter)=>(e)=>{ const k=e.target.name; const v=e.target.value; setter(f=>({...f,[k]:v})); };

  return (
    <div className="goals-page" data-section="debts-page">
      {blocked&&(<div className="card" role="alert" data-section="debts-blocked" style={{borderColor:"var(--neg)",background:"var(--neg-bg)"}}><strong>{t(health.status==="corrupt"?"debt.corrupt":"debt.unreadable")}</strong></div>)}
      {health.status==="partial"&&(<div className="card" role="status" data-section="debts-partial">{t("debt.partial",{n:health.dropped})}</div>)}
      <div className="card" data-section="debts-summary">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
          {[[t("debt.totalOwe"),q(owe)],[t("debt.totalOwed"),q(owed)],[t("debt.totalLoans"),q(loanLeft)]].map(([lbl,val])=>(
            <div key={lbl}><div className="list-sub">{lbl}</div><div style={{fontSize:14,fontWeight:700,color:"var(--ink)"}}>{val}</div></div>
          ))}
        </div>
      </div>
      <div className="seg" role="tablist" aria-label={t("debt.title")}>
        {[["debts",t("debt.segDebts")],["loans",t("debt.segLoans")]].map(([id,lbl])=>(
          <button key={id} role="tab" aria-selected={seg===id} className={`seg-btn${seg===id?" on":""}`} onClick={()=>setSeg(id)}>{lbl}</button>
        ))}
      </div>

      <Swap k={seg} dir={seg==="loans"?1:-1}>
      {seg==="debts"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",margin:"4px 2px 10px"}}>
          <button className="btn btn-sm" data-section="debt-add-btn" onClick={()=>setShowDebt(s=>!s)}>{showDebt?t("common.cancel"):t("set.add")}</button>
        </div>
        <Collapse open={showDebt}>
          <div className="card" data-section="debt-form">
            <fieldset className="lang-switch" style={{marginBottom:10}} aria-label={t("debt.dirLabel")}>
              {[["owe",t("debt.dirOwe")],["owed",t("debt.dirOwed")]].map(([v,lbl])=>(
                <label key={v} className={`lang-pill${dForm.dir===v?" sel":""}`}><input type="radio" name="debt-dir" value={v} checked={dForm.dir===v} onChange={()=>setDForm(f=>({...f,dir:v}))}/>{lbl}</label>
              ))}
            </fieldset>
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="debt-name">{t("debt.person")}</label><input id="debt-name" name="name" className="field-input" value={dForm.name} maxLength={60} onChange={upd(setDForm)}/></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="debt-amt">{t("debt.amount")}</label><input id="debt-amt" name="amt" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={dForm.amt} onChange={e=>setDForm(f=>({...f,amt:cleanMoneyText(e.target.value)}))}/></div>
            </div>
            <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="debt-due">{t("debt.due")}</label><input id="debt-due" name="due" className="field-input" lang={locale()} type="date" value={dForm.due} onChange={upd(setDForm)}/></div>
            {dMsg&&<div role="alert" className="list-sub" style={{color:"var(--neg)",marginBottom:8}}>{dMsg}</div>}
            <button className="btn btn-primary btn-full" style={{marginTop:0}} data-section="debt-save" onClick={addDebt}>{t("common.save")}</button>
          </div>
        </Collapse>
        {data.debts.length===0&&!showDebt&&<div className="empty" style={{padding:"28px 0"}} data-section="debts-empty"><div className="empty-icon"><LedgerArt/></div><div className="empty-body">{t("debt.none")}</div></div>}
        {data.debts.map(d=>{ const left=debtRemaining(d); return (
          <div key={d.id} className="card" data-section="debt-card" data-id={d.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{minWidth:0}}>
                <div className="goal-name">{maskText(d.name)}</div>
                <div className="list-sub">{t(d.direction==="owe"?"debt.badgeOwe":"debt.badgeOwed")}{d.dueDate?` · ${t("debt.dueOn",{date:fmtDate(d.dueDate)})}`:""}</div>
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                <button className="btn btn-sm" data-section="debt-edit" aria-label={t("common.edit")+": "+maskText(d.name)} onClick={()=>setDEdit({ id:d.id, name:d.name, amt:(d.principal/100).toFixed(2), due:d.dueDate||"" })}>{t("common.edit")}</button>
                <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>delDebt(d)} aria-label={t("debt.delete",{name:maskText(d.name)})}><Icon name="trash" size={15}/></button>
              </div>
            </div>
            <Reveal when={dEdit&&dEdit.id===d.id?dEdit:null}>{de=>(
              <div data-section="debt-edit-form" style={{marginTop:10}}>
                <div className="field-row" style={{marginBottom:10}}>
                  <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="debt-edit-name">{t("debt.person")}</label><input id="debt-edit-name" className="field-input" value={de.name} maxLength={60} onChange={e=>setDEdit({...de,name:e.target.value})}/></div>
                  <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="debt-edit-amt">{t("debt.amount")}</label><input id="debt-edit-amt" className="field-input" type="text" inputMode="decimal" autoComplete="off" value={de.amt} onChange={e=>setDEdit({...de,amt:cleanMoneyText(e.target.value)})}/></div>
                </div>
                <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="debt-edit-due">{t("debt.due")}</label><input id="debt-edit-due" className="field-input" lang={locale()} type="date" value={de.due} onChange={e=>setDEdit({...de,due:e.target.value})}/></div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setDEdit(null)}>{t("common.cancel")}</button>
                  <button className="btn btn-primary" style={{flex:1}} data-section="debt-edit-save" onClick={saveDebtEdit}>{t("common.save")}</button>
                </div>
              </div>
            )}</Reveal>
            <div style={{marginTop:8}}>
              <div className="list-sub">{t("debt.remaining")}</div>
              {left>0 ? <div className="big-num debt-remaining">{q(left)} <span className="list-sub">{t("debt.of",{total:q(d.principal)})}</span></div> : <div className="big-num debt-remaining" style={{color:"var(--pos)"}}>{t("debt.settled")}</div>}
              <div className="bar" style={{marginTop:6}}><div className="bar-fill" style={{width:`${Math.min(100,(d.principal-left)/d.principal*100)}%`,background:"var(--accent)"}}/></div>
            </div>
            {left>0&&(
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <input className="field-input debt-pay-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" aria-label={t("debt.payAmount")} value={pay[d.id]||""} onChange={e=>setPay(p=>({...p,[d.id]:cleanMoneyText(e.target.value)}))} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                <button className="btn btn-sm btn-sm-primary debt-pay-btn" onClick={()=>addPayment(d)}>{t("debt.pay")}</button>
              </div>
            )}
            <Reveal when={ask&&ask.id===d.id?ask:null}>{ak=>(
              <div className="card debt-ask" role="group" aria-label={t("debt.askTitle")} data-section="debt-ask" style={{marginTop:8}}>
                <div style={{fontSize:13,fontWeight:600}}>{t(d.direction==="owe"?"debt.askOwe":"debt.askOwed",{amount:q(ak.amt)})}</div>
                <div className="list-sub" style={{margin:"4px 0 8px"}}>{t("debt.askHint")}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button className="btn btn-sm btn-sm-primary debt-ask-yes" onClick={()=>recordPayment(d,true)}>{t("debt.askYes")}</button>
                  <button className="btn btn-sm debt-ask-no" onClick={()=>recordPayment(d,false)}>{t("debt.askNo")}</button>
                  <button className="btn btn-sm debt-ask-cancel" onClick={()=>setAsk(null)}>{t("common.cancel")}</button>
                </div>
              </div>
            )}</Reveal>
            {payMsg[d.id]&&<div role="alert" className="list-sub" style={{color:"var(--neg)",marginTop:6}}>{payMsg[d.id]}</div>}
            {d.payments.map(p=>(
              <div key={p.id} className="debt-pay-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"6px 0",borderTop:"1px solid var(--rule)",marginTop:6}}>
                <span className="list-sub">{fmtDate(p.date)}{p.txnId!==undefined?` · ${t("debt.linkedTag")}`:""}</span><span style={{fontSize:13,fontWeight:600}}>{q(p.amount)}</span>
                <button className="topbar-btn debt-pay-del" style={{color:"var(--ink-4)"}} onClick={()=>delPayment(d,p.id)} aria-label={t("debt.deletePay",{amount:q(p.amount)})}><Icon name="trash" size={14}/></button>
              </div>
            ))}
          </div>
        ); })}
      </>)}

      {seg==="loans"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",margin:"4px 2px 10px"}}>
          <button className="btn btn-sm" data-section="loan-add-btn" onClick={()=>setShowLoan(s=>!s)}>{showLoan?t("common.cancel"):t("set.add")}</button>
        </div>
        <Collapse open={showLoan}>
          <div className="card" data-section="loan-form">
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-lender">{t("loan.lender")}</label><input id="loan-lender" name="lender" className="field-input" value={lForm.lender} maxLength={60} onChange={upd(setLForm)}/></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-kind">{t("loan.kind")}</label><select id="loan-kind" name="kind" className="field-input field-select" value={lForm.kind} onChange={upd(setLForm)}>{LOAN_KINDS.map(k=><option key={k} value={k}>{t(LOAN_KIND_KEY[k])}</option>)}</select></div>
            </div>
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-amt">{t("loan.amount")}</label><input id="loan-amt" name="amt" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={lForm.amt} onChange={e=>setLForm(f=>({...f,amt:cleanMoneyText(e.target.value)}))}/></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-months">{t("loan.months")}</label><input id="loan-months" name="months" className="field-input" type="text" inputMode="numeric" autoComplete="off" value={lForm.months} onChange={e=>setLForm(f=>({...f,months:e.target.value.replace(/[^0-9]/g,"")}))}/></div>
            </div>
            <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="loan-type">{t("loan.rateType")}</label><select id="loan-type" name="type" className="field-input field-select" value={lForm.type} onChange={upd(setLForm)}>{LOAN_RATE_TYPES.map(k=><option key={k} value={k}>{t(LOAN_RT_KEY[k])}</option>)}</select></div>
            <div className="field-row" style={{marginBottom:10}}>
              {lForm.type!=="none"&&<div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-rate">{t("loan.rate")}</label><input id="loan-rate" name="rate" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={lForm.rate} onChange={e=>setLForm(f=>({...f,rate:cleanMoneyText(e.target.value)}))}/></div>}
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-first">{t("loan.first")}</label><input id="loan-first" name="first" className="field-input" lang={locale()} type="date" value={lForm.first} onChange={upd(setLForm)}/></div>
            </div>
            <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="loan-bank">{t("loan.bank")}</label><input id="loan-bank" name="bank" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={lForm.bank} onChange={e=>setLForm(f=>({...f,bank:cleanMoneyText(e.target.value)}))}/><div className="list-sub" style={{marginTop:4}}>{t("loan.bankHint")}</div></div>
            {lMsg&&<div role="alert" className="list-sub" style={{color:"var(--neg)",marginBottom:8}}>{lMsg}</div>}
            <button className="btn btn-primary btn-full" style={{marginTop:0}} data-section="loan-save" onClick={addLoan}>{t("common.save")}</button>
          </div>
        </Collapse>
        {data.loans.length===0&&!showLoan&&<div className="empty" style={{padding:"28px 0"}} data-section="loans-empty"><div className="empty-icon"><LedgerArt/></div><div className="empty-body">{t("loan.none")}</div></div>}
        {data.loans.map(l=>{
          const sc=loanSchedule(l); if (!sc) return null;
          const k=l.payments.length, done=k>=sc.payments.length, next=done?null:sc.payments[k], balance=k===0?l.principal:done?0:sc.payments[k-1].balance;
          const implied=l.rateType==="flat" ? impliedNominalPct(l.principal,l.months,sc.payments[0].payment) : null;
          return (
            <div key={l.id} className="card" data-section="loan-card" data-id={l.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{minWidth:0}}><div className="goal-name">{maskText(l.lender)}</div><div className="list-sub">{t(LOAN_KIND_KEY[l.kind])} · {q(l.principal)}</div></div>
                <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                  <button className="btn btn-sm" data-section="loan-edit" aria-label={t("common.edit")+": "+maskText(l.lender)} onClick={()=>setLEdit({ id:l.id, lender:l.lender, amt:(l.principal/100).toFixed(2), months:String(l.months), rate:String(l.ratePct) })}>{t("common.edit")}</button>
                  <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>delLoan(l)} aria-label={t("debt.delete",{name:maskText(l.lender)})}><Icon name="trash" size={15}/></button>
                </div>
              </div>
              <Reveal when={lEdit&&lEdit.id===l.id?lEdit:null}>{le=>(
                <div data-section="loan-edit-form" style={{marginTop:10}}>
                  <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="loan-edit-lender">{t("loan.lender")}</label><input id="loan-edit-lender" className="field-input" value={le.lender} maxLength={60} onChange={e=>setLEdit({...le,lender:e.target.value})}/></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-edit-amt">{t("loan.amount")}</label><input id="loan-edit-amt" className="field-input" type="text" inputMode="decimal" autoComplete="off" value={le.amt} onChange={e=>setLEdit({...le,amt:cleanMoneyText(e.target.value)})}/></div>
                    <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="loan-edit-months">{t("loan.months")}</label><input id="loan-edit-months" className="field-input" type="text" inputMode="numeric" autoComplete="off" value={le.months} onChange={e=>setLEdit({...le,months:e.target.value.replace(/[^0-9]/g,"")})}/></div>
                  </div>
                  {l.rateType!=="none"&&<div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="loan-edit-rate">{t("loan.rate")}</label><input id="loan-edit-rate" className="field-input" type="text" inputMode="decimal" autoComplete="off" value={le.rate} onChange={e=>setLEdit({...le,rate:cleanMoneyText(e.target.value)})}/></div>}
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setLEdit(null)}>{t("common.cancel")}</button>
                    <button className="btn btn-primary" style={{flex:1}} data-section="loan-edit-save" onClick={saveLoanEdit}>{t("common.save")}</button>
                  </div>
                </div>
              )}</Reveal>
              <div style={{marginTop:8}}>
                <div className="list-sub">{t("loan.monthly")}</div>
                <div className="big-num loan-monthly">{q(sc.payments[0].payment)}</div>
                <div className="list-sub loan-next" style={{marginTop:2}}>{done ? t("loan.allPaid") : t("loan.next",{amount:q(next.payment),date:fmtDate(next.date)})}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
                <div><div className="list-sub">{t("loan.balance")}</div><div className="loan-balance" style={{fontSize:14,fontWeight:700}}>{q(balance)}</div></div>
                <div><div className="list-sub">{t("loan.totalInterest")}</div><div className="loan-interest" style={{fontSize:14,fontWeight:700}}>{q(sc.totalInterest)}</div></div>
              </div>
              {implied!==null&&<div className="list-sub" style={{marginTop:8}}>{t("loan.flatReal",{pct:fmtPct(Math.round(implied*10)/10)})}</div>}
              <div className="list-sub" style={{marginTop:8,lineHeight:1.5}}>{t("loan.estimate")}</div>
              {!done&&(
                <div className="field" style={{marginTop:10,marginBottom:0}}>
                  <label className="field-lbl" htmlFor={"loan-int-"+l.id}>{t("loan.interestPart")}</label>
                  <input id={"loan-int-"+l.id} className="field-input loan-interest-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00"
                    value={intr[l.id]!==undefined ? intr[l.id] : (next.interest/100).toFixed(2)} onChange={e=>setIntr(m=>({...m,[l.id]:cleanMoneyText(e.target.value)}))}/>
                  <div className="list-sub" style={{marginTop:4,lineHeight:1.5}}>{t("loan.interestHint")}</div>
                </div>
              )}
              {!done&&l.rateType==="annuity"&&(()=>{
                const txt=(ext[l.id]||"").trim(), v=txt===""?null:formMoney(txt), cents=v===null?0:Math.round(v*100), eff=cents>0?loanExtraEffect(l,cents):null;
                const msg=cents<=0 ? "" : eff===null ? (cents>=balance?t("loan.extraClears"):"")
                  : eff.monthsSaved>0 ? t("loan.extraResult",{ amount:q(cents), months:tn("loan.extraMonths",eff.monthsSaved), interest:q(eff.interestSaved) })
                  : eff.interestSaved>0 ? t("loan.extraNoMonths",{ amount:q(cents), interest:q(eff.interestSaved) }) : t("loan.extraNone",{ amount:q(cents) });
                return (
                  <div className="field loan-extra" style={{marginTop:10,marginBottom:0}} data-section="loan-extra">
                    <label className="field-lbl" htmlFor={"loan-ext-"+l.id}>{t("loan.extra")}</label>
                    <input id={"loan-ext-"+l.id} className="field-input loan-extra-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00"
                      value={ext[l.id]||""} onChange={e=>setExt(m=>({...m,[l.id]:cleanMoneyText(e.target.value)}))}/>
                    {msg&&<div className="list-sub loan-extra-result" role="status" style={{marginTop:4,lineHeight:1.5,color:"var(--ink)"}}>{msg}</div>}
                    <div className="list-sub" style={{marginTop:4,lineHeight:1.5}}>{t("loan.extraHint")}</div>
                  </div>
                );
              })()}
              {!done&&<button className="btn btn-primary btn-full loan-paid-btn" style={{marginTop:10}} onClick={()=>markPaid(l,sc)}>{t("loan.markPaid")}</button>}
              {l.payments.length>0&&<div className="list-sub" style={{marginTop:12}}>{t("loan.paymentsTitle")}</div>}
              {l.payments.map(p=>(
                <div key={p.id} className="loan-pay-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"6px 0",borderTop:"1px solid var(--rule)",marginTop:6}}>
                  <span className="list-sub">{fmtDate(p.date)}{p.txnId!==undefined?` · ${t("debt.linkedTag")}`:""}</span><span style={{fontSize:13,fontWeight:600}}>{q(p.amount)}</span>
                  <button className="topbar-btn loan-pay-del" style={{color:"var(--ink-4)"}} onClick={()=>delLoanPayment(l,p)} aria-label={t("loan.deletePay",{amount:q(p.amount)})}><Icon name="trash" size={14}/></button>
                </div>
              ))}
            </div>
          );
        })}
      </>)}
      </Swap>
    </div>
  );
}

