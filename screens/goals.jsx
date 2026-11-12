// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { locale, t, tn } from "../i18n.js";
import { pickerCats, planRebalance, readCatPrefs, sinkingCandidates, tidyPlan, applyTidy, undoTidy, TIDY_KEY, subName, readBudgetCarry, writeBudgetCarry, budgetCarried, readLeftoverGoal, writeLeftoverGoal, readRolloverSeen, goalAddMoney, goalSetTotal, goalHistory, daysBetween, parseLocalDate, today } from "../App.jsx";import { CATEGORIES, CatIcon, Icon, calcBudgetStatus, calcCategorySpend, calcGoalProgress, catName, cleanMoneyText, curMon, fmt, fmtDate, fmtPct, formMoney, goalRequiredMonthly, goalScenario, isValidDateStr, maskText, monthName, revealFocus } from "../App.jsx";
import { CategoryOrder, MyCategories, SavingsFloorCard, TemplatesSection } from "./settings.jsx";
import { Collapse, EditSwap, useBackStep, useLeave } from "./motion.jsx";

// Budgets & Goals: budget limits and savings goals, edited here (they used to be inside Settings).
export function BudgetsGoalsPage({ state, rawState, onCatsChanged, showToast, seg, onSeg, addSignal, tidyTools, onSetBudget, onAddGoal, onUpdateGoal, onDeleteGoal, onAddTemplate, onDeleteTemplate, onUpdateTemplate, onSafeToSpendChange, onRebalance }) {
  const { transactions, budgets={}, goals=[], currency, templates=[], safeToSpend={} }=state;
  const setSeg=onSeg;
  const [editBudget,setEditBudget]=useState(null), [budgetVal,setBudgetVal]=useState("");
  const [showNewGoal,setShowNewGoal]=useState(false);
  const UNB_SHOW=4, [unbAll,setUnbAll]=useState(false);   // Run 26: the long "without a budget" list shows four, the rest one tap away
  const [updGoal,setUpdGoal]=useState(null), updKeep=useRef(null); if (updGoal) updKeep.current=updGoal;   // Run 34: remembered so the row keeps its text while it eases closed
  const { isLeaving, leave }=useLeave();   // Run 26: the saved amount is changed inline (null = closed; otherwise { id, val }), not in the browser's own pop-up
  // "New budget" form opened by the title bar's "+" on the Budgets half: pick a category without a limit, type the limit.
  const [newBudget,setNewBudget]=useState(null), nbKeep=useRef(null); if (newBudget) nbKeep.current=newBudget;   // null = closed; otherwise { catId, val } (nbKeep: kept so the card keeps its text while it eases closed)
  const nb=newBudget||nbKeep.current;
  const seenSignal=useRef(addSignal);
  useEffect(()=>{
    if (addSignal===seenSignal.current) return; seenSignal.current=addSignal;
    if (seg==="goals") setShowNewGoal(true);
    else { const free=pickerCats(false,readCatPrefs()).filter(c=>!(budgets[c.id]>0)); setNewBudget({ catId:(free[0]||CATEGORIES[0]).id, val:"" }); }
    window.scrollTo({ top:0, behavior:"smooth" });   // Run 26: a glide, not a jump (reduced motion turns it off in CSS)
  },[addSignal]);
  const [goalName,setGoalName]=useState(""), [goalTarget,setGoalTarget]=useState(""), [goalSaved,setGoalSaved]=useState("");
  const [goalMonthly,setGoalMonthly]=useState(""), [goalDate,setGoalDate]=useState(""), [editGoalId,setEditGoalId]=useState(null);
  const now=curMon();
  const catSpend=calcCategorySpend(transactions,now);
  // Run 59: optional per-budget carry of what was not used last month (off unless turned on for that budget)
  const [carry,setCarry]=useState(()=>readBudgetCarry());
  const carried=useMemo(()=>budgetCarried(transactions,budgets,carry,now),[transactions,budgets,carry,now]);
  const items=calcBudgetStatus(budgets,catSpend,now,new Date(),carried);
  const setCarryFor=(catId,on)=>{ const next={ ...carry }; if (on) next[catId]=now; else delete next[catId]; if (!writeBudgetCarry(next)) { showToast(t("carry.saveFailed")); return; } setCarry(readBudgetCarry()); showToast(t(on?"carry.on":"carry.off")); };
  const [leftoverOn,setLeftoverOn]=useState(()=>readLeftoverGoal());
  const byCat=Object.fromEntries(items.map(x=>[x.catId,x]));
  const limitTotal=items.reduce((s,x)=>s+x.limit,0), spentTotal=items.reduce((s,x)=>s+x.spent,0);
  // Run 36: the user's order; a hidden category is listed only when it already has a budget (never dropped from view silently).
  const expCats=pickerCats(false,readCatPrefs(),Object.keys(budgets).filter(k=>budgets[k]>0));
  const budgeted=expCats.filter(c=>byCat[c.id]), unbudgeted=expCats.filter(c=>!byCat[c.id]);
  const rebalance=useMemo(()=>planRebalance(items),[budgets,transactions]);   // Run 41: offered only when it covers the whole shortfall

  const saveGoal=()=>{
    const gTarget=formMoney(goalTarget,{positive:true});
    const gSaved=goalSaved.trim()===""?0:formMoney(goalSaved);
    const gMonthly=goalMonthly.trim()===""?0:formMoney(goalMonthly);
    if (!goalName.trim()||gTarget===null) { showToast(t("set.goalInvalidTarget")); return; }
    if (gSaved===null||gMonthly===null) { showToast(t("set.goalInvalidAmounts")); return; }
    if (goalDate && !isValidDateStr(goalDate)) { showToast(t("set.goalInvalidDate")); return; }
    const g={name:goalName.trim(),target:gTarget,saved:gSaved,monthlyTarget:gMonthly,targetDate:goalDate||null};
    // Run 61: a changed "saved so far" while editing is a correction: it goes into the history, so the history keeps adding up to the total;
    // a changed target can also finish (or un-finish) the goal
    if (editGoalId) { const old=goals.find(x=>x.id===editGoalId); const r=old ? goalSetTotal({ ...old, target:gTarget },gSaved) : null;
      const reachedNow=Math.round(gSaved*100)>=Math.round(gTarget*100);
      onUpdateGoal(editGoalId, { ...g, ...(r && old && r.goal.contribs!==old.contribs ? { contribs:r.goal.contribs } : {}), doneAt:reachedNow ? ((old && old.doneAt) || today()) : undefined }); }
    else onAddGoal(g);
    setGoalName("");setGoalTarget("");setGoalSaved("");setGoalMonthly("");setGoalDate("");setShowNewGoal(false);setEditGoalId(null);
  };
  // Run 40: phone Back cancels whichever of these is open (newest first), exactly like its Cancel button, before leaving the page.
  useBackStep(showNewGoal,()=>{ setEditGoalId(null); setGoalName(""); setGoalTarget(""); setGoalSaved(""); setGoalMonthly(""); setGoalDate(""); setShowNewGoal(false); });
  useBackStep(!!newBudget,()=>setNewBudget(null));
  useBackStep(editBudget!==null,()=>setEditBudget(null));
  useBackStep(!!updGoal,()=>setUpdGoal(null));
  const startEditGoal=(g)=>{ setEditGoalId(g.id); setGoalName(g.name||""); setGoalTarget(String(g.target||"")); setGoalSaved(String(g.saved||"")); setGoalMonthly(g.monthlyTarget?String(g.monthlyTarget):""); setGoalDate(g.targetDate||""); setShowNewGoal(true); };   // Run 26: the form opens in the goal's own place and eases in; no jump to the top
  // The form eases in, then the view glides to it and the first box is focused without a jump.
  const formShown=revealFocus;
  const renderGoalForm=()=>(
    <div className="card reveal" ref={formShown} data-section="goal-form">
      <div className="field" style={{marginBottom:10}}><label className="field-lbl" htmlFor="goal-name">{t("set.goalName")}</label><input id="goal-name" className="field-input" placeholder={t("set.goalNamePh")} value={goalName} onChange={e=>setGoalName(e.target.value)}/></div>
      <div className="field-row" style={{marginBottom:10}}>
        <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-target">{t("set.target",{currency})}</label><input id="goal-target" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={goalTarget} onChange={e=>setGoalTarget(cleanMoneyText(e.target.value))}/></div>
        <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-saved">{t("set.savedSoFar")}</label><input id="goal-saved" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={goalSaved} onChange={e=>setGoalSaved(cleanMoneyText(e.target.value))}/></div>
      </div>
      <div className="field-row" style={{marginBottom:10}}>
        <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-monthly">{t("set.monthlyContribution")}</label><input id="goal-monthly" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder={t("set.optionalPh")} value={goalMonthly} onChange={e=>setGoalMonthly(cleanMoneyText(e.target.value))}/></div>
        <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="goal-date">{t("set.targetDate")}</label><input id="goal-date" className="field-input" lang={locale()} type="date" value={goalDate} onChange={e=>setGoalDate(e.target.value)}/></div>
      </div>
      <button className="btn btn-primary btn-full" style={{marginTop:0}} onClick={saveGoal}>{t("set.saveGoal")}</button>
    </div>
  );
  const editRow=(cat,limit)=>(<Collapse open={editBudget===cat.id}>{editBudget===cat.id&&(
    <div style={{display:"flex",gap:7,marginTop:9}}>
      <input className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder={t("set.monthlyLimit")} aria-label={`${t("set.monthlyLimit")}: ${catName(cat.id)}`} value={budgetVal} onChange={e=>setBudgetVal(cleanMoneyText(e.target.value))} ref={revealFocus} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
      <button className="btn btn-sm btn-sm-primary" onClick={()=>{const v=budgetVal.trim()===""?0:formMoney(budgetVal); if(v===null){showToast(t("set.zeroOrMore"));return;} onSetBudget(cat.id,v);setEditBudget(null);if(v>0)showToast(t("set.budgetSaved"));}}>{t("common.save")}</button>
      <button className="btn btn-sm" onClick={()=>setEditBudget(null)} aria-label={t("common.cancel")}>✕</button>
    </div>
  )}{editBudget===cat.id&&limit>0&&(
    <label data-section="carry-toggle" style={{display:"flex",gap:10,alignItems:"flex-start",marginTop:10,lineHeight:1.45,fontSize:13}}>
      <input type="checkbox" checked={!!carry[cat.id]} onChange={e=>setCarryFor(cat.id,e.target.checked)} style={{marginTop:2,flexShrink:0}}/>
      <span><span style={{display:"block"}}>{t("carry.toggle")}</span><span className="list-sub" style={{display:"block"}}>{t("carry.help")}</span></span>
    </label>
  )}</Collapse>);
  const editBtn=(cat,limit)=>(
    <button className="btn btn-sm" onClick={()=>{setEditBudget(cat.id);setBudgetVal(limit>0?String(limit):"");}} aria-label={`${limit>0?t("common.edit"):t("set.set")}: ${catName(cat.id)}`}>{limit>0?t("common.edit"):t("set.set")}</button>
  );

  return (
    <div className="goals-page">
      <div className="seg" role="tablist" aria-label={t("goals.pageTitle")}>
        {[["budgets",t("budgets.title")],["goals",t("goals.title")]].map(([id,lbl])=>(
          <button key={id} role="tab" aria-selected={seg===id} className={`seg-btn${seg===id?" on":""}`} onClick={()=>setSeg(id)}>{lbl}</button>
        ))}
      </div>

      {seg==="budgets"&&(<>
        <Collapse open={!!newBudget}>{nb&&(
          <div className="card new-budget" ref={revealFocus}>
            <div className="card-title" style={{marginBottom:10}}>{t("goals.addBudget")}</div>
            <div className="field-row" style={{marginBottom:10}}>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="nb-cat">{t("add.category")}</label>
                <select id="nb-cat" className="field-input field-select" value={nb.catId} onChange={e=>setNewBudget(b=>({...b,catId:e.target.value}))}>
                  {expCats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}{budgets[c.id]>0?` (${fmt(budgets[c.id],currency)})`:""}</option>)}
                </select></div>
              <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="nb-val">{t("set.monthlyLimit")}</label>
                <input id="nb-val" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={nb.val} onChange={e=>setNewBudget(b=>({...b,val:cleanMoneyText(e.target.value)}))}/></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-primary" style={{flex:1,marginTop:0}} onClick={()=>{ const v=newBudget.val.trim()===""?null:formMoney(newBudget.val,{positive:true}); if(v===null){showToast(t("add.errAmount"));return;} onSetBudget(newBudget.catId,v); setNewBudget(null); showToast(t("set.budgetSaved")); }}>{t("common.save")}</button>
              <button className="btn btn-ghost" style={{flex:1,marginTop:0}} onClick={()=>setNewBudget(null)}>{t("common.cancel")}</button>
            </div>
          </div>
        )}</Collapse>
        {rebalance&&(
          <div className="card" data-section="bg-rebalance">
            <div className="card-title" style={{marginBottom:6}}>{t("budget.rebalTitle",{cat:catName(rebalance.catId),amount:fmt(rebalance.need,currency)})}</div>
            <div className="list-sub" style={{lineHeight:1.5}}>{t("budget.rebalBody",{moves:rebalance.moves.map(m=>`${catName(m.catId)} ${fmt(m.amount,currency)}`).join(", ")})}</div>
            <button className="btn btn-primary btn-full" data-action="rebalance" style={{marginTop:12}} onClick={()=>onRebalance&&onRebalance(rebalance)}>{t("budget.rebalApply")}</button>
          </div>
        )}
        {limitTotal>0&&(
          <div className="card" data-section="bg-total">
            <div className="list-sub">{t("budgets.monthTotal",{month:monthName(now)})}</div>
            <div className="big-num">{fmt(limitTotal,currency)}</div>
            <div className="bar"><div className="bar-fill" style={{width:`${Math.min(spentTotal/limitTotal*100,100)}%`,background:spentTotal>limitTotal?"var(--neg)":spentTotal>=0.8*limitTotal?"var(--warn)":"var(--pos)"}}/></div>
            <div className="list-sub" style={{marginTop:8}}>{t("budgets.spentOf",{spent:fmt(spentTotal,currency),limit:fmt(limitTotal,currency)})}</div>
            <div style={{fontSize:13,fontWeight:600,marginTop:6,color:spentTotal>limitTotal?"var(--neg)":"var(--pos)"}}>
              {spentTotal>limitTotal?t("budgets.over",{amount:fmt(spentTotal-limitTotal,currency)}):t("budgets.remaining",{amount:fmt(limitTotal-spentTotal,currency)})}
            </div>
          </div>
        )}
        <div className="section-title">{t("budgets.byCategory")}</div>
        {budgeted.length===0&&<div className="list-sub" style={{margin:"0 2px 12px"}}>{t("budgets.none")}</div>}
        {budgeted.length>0&&(
          <div className="card list-card">
            {budgeted.map(cat=>{ const x=byCat[cat.id]; const pct=Math.round(x.spent/x.limit*100); return (
              <div key={cat.id} className="bud-row">
                <div className="bud-top">
                  <span className="cat-dot" style={{background:cat.color+"26"}}><CatIcon catId={cat.id} size={16}/></span>
                  <span className="bud-name">{catName(cat.id)}</span>
                  <span className="bud-nums">{fmt(x.spent,currency)} / {fmt(x.limit,currency)}</span>
                </div>
                <div className="bud-bar-row">
                  <div className="bar"><div className="bar-fill" style={{width:`${x.pct}%`,background:x.over?"var(--neg)":x.warn?"var(--warn)":"var(--pos)"}}/></div>
                  <span className="bud-pct" style={{color:x.over?"var(--neg)":"var(--ink-3)"}}>{fmtPct(pct)}</span>
                  {editBtn(cat,x.base)}
                </div>
                <BudgetHistory catId={cat.id} limit={x.base} transactions={transactions} currency={currency} now={now}/>
                {x.carried>0&&<div className="list-sub" data-section="carry-line" style={{marginTop:4,paddingLeft:44}}>{t("carry.line",{ base:fmt(x.base,currency), carried:fmt(x.carried,currency) })}</div>}
                {editRow(cat,x.base)}
              </div>
            ); })}
          </div>
        )}
        <div className="section-title">{t("budgets.notSet")}</div>
        <div className="card list-card" data-section="bg-unbudgeted">
          {(unbAll||unbudgeted.length<=UNB_SHOW?unbudgeted:unbudgeted.filter((cat,i)=>i<UNB_SHOW||cat.id===editBudget)).map(cat=>(
            <div key={cat.id} className="bud-row">
              <div className="bud-top">
                <span className="cat-dot" style={{background:cat.color+"26"}}><CatIcon catId={cat.id} size={16}/></span>
                <span className="bud-name">{catName(cat.id)}</span>
                {editBtn(cat,0)}
              </div>
              {editRow(cat,0)}
            </div>
          ))}
          {unbudgeted.length>UNB_SHOW&&(<button className="list-row" data-section="bg-unb-toggle" aria-expanded={unbAll} onClick={()=>setUnbAll(v=>!v)} style={{justifyContent:"center",color:"var(--accent-text)",fontWeight:600,fontSize:13,minHeight:48}}>{unbAll?t("budgets.showFewer"):t("budgets.showAll",{n:unbudgeted.length})}</button>)}
        </div>
      </>)}

      {seg==="goals"&&(<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,margin:"4px 2px 10px"}}>
          <span className="section-title" style={{margin:0}}>{t("set.financialGoals")}</span>
          <button className="btn btn-sm" onClick={()=>{ if (showNewGoal) { setEditGoalId(null); setGoalName(""); setGoalTarget(""); setGoalSaved(""); setGoalMonthly(""); setGoalDate(""); } setShowNewGoal(s=>!s); }}>{showNewGoal?t("common.cancel"):t("set.add")}</button>
        </div>
        <Collapse open={showNewGoal&&!editGoalId} id="goal-new">{renderGoalForm()}</Collapse>
        {(()=>{
          // Run 50: yearly bills that have no goal yet; one tap makes the goal (target = the bill, date = its due date)
          const cands=sinkingCandidates((rawState&&rawState.transactions)||transactions, (rawState&&rawState.bills)||[], goals);
          if (!cands.length) return null;
          return (<div className="card" data-section="sinking" style={{marginBottom:10}}>
            <div className="a-card-title">{t("sinking.title")}</div>
            <div className="list-sub" style={{marginBottom:6}}>{t("sinking.sub")}</div>
            {cands.slice(0,3).map(c=>(
              <div key={c.billId} className="list-row" style={{alignItems:"center",gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div className="list-title">{c.name}</div>
                  <div className="list-sub">{tn("sinking.line",c.months,{ amount:fmt(c.perMonth,currency), total:fmt(c.amount,currency), date:fmtDate(c.due) })}</div>
                </div>
                <button type="button" className="btn btn-sm" data-section="sinking-make" data-bill={c.billId} onClick={()=>{ onAddGoal({ name:c.name, target:c.amount, saved:0, monthlyTarget:c.perMonth, targetDate:c.due }); showToast(t("sinking.made",{ name:c.name })); }}>{t("sinking.make")}</button>
              </div>
            ))}
          </div>);
        })()}
        {goals.length===0&&!showNewGoal&&<div className="list-sub" style={{margin:"0 2px"}}>{t("set.noGoals")}</div>}
        {goals.map(goal=>{
          const gp=calcGoalProgress(goal); const {pct,remaining,estCompletion}=gp; const req=goalRequiredMonthly(goal);
          const ug=(updGoal&&updGoal.id===goal.id)?updGoal:(updKeep.current&&updKeep.current.id===goal.id?updKeep.current:null);
          // Run 38: the card and its edit form trade places smoothly (Edit and Cancel used to switch in one frame)
          return (<EditSwap key={goal.id} editing={showNewGoal && editGoalId===goal.id} form={renderGoalForm} row={
            <div className={"card goal-card"+(isLeaving(goal.id)?" row-leaving":"")} data-section="goal-card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:10,alignItems:"center",minWidth:0,flex:"1 1 150px"}}>
                  <span className="cat-dot" style={{background:"var(--pos-bg)"}}><Icon name="goal" size={16} color="var(--pos)"/></span>
                  <div style={{minWidth:0}}>
                    <div className="goal-name">{maskText(goal.name)}</div>
                    <div className="list-sub">{t("goals.savedOf",{ saved:fmt(goal.saved||0,currency), target:fmt(goal.target||0,currency) })}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0,marginLeft:"auto"}}>
                  <button className="btn btn-sm" data-section="goal-update" aria-expanded={updGoal&&updGoal.id===goal.id} onClick={()=>setUpdGoal(u=>u&&u.id===goal.id?null:{ id:goal.id, val:"", note:"", mode:"add" })}>{t("goal.addMoney")}</button>
                  <button className="btn btn-sm" data-section="goal-edit" aria-label={t("common.edit")+": "+maskText(goal.name)} onClick={()=>startEditGoal(goal)}>{t("common.edit")}</button>
                  <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>leave(goal.id,()=>onDeleteGoal(goal.id))} aria-label={t("set.deleteGoal",{name:maskText(goal.name)})}><Icon name="trash" size={15}/></button>
                </div>
              </div>
              {/* Run 61 (owner batch C8): money is ADDED to a goal and each addition is kept in its history; "Set the total" stays for corrections */}
              <Collapse open={!!(updGoal&&updGoal.id===goal.id)}>{ug&&(()=>{ const setMode=ug.mode==="set";
                const save=()=>{ const v=formMoney(ug.val, setMode?{}:{ positive:true }); if (v===null || (!setMode && !(v>0))) { showToast(t("set.updateInvalid")); return; }
                  const r=setMode ? goalSetTotal(goal,v) : goalAddMoney(goal,v,ug.note);
                  if (r.goal===goal) { setUpdGoal(null); return; }
                  onUpdateGoal(goal.id,{ saved:r.goal.saved, contribs:r.goal.contribs, doneAt:r.goal.doneAt });
                  setUpdGoal(null);
                  showToast(r.reached ? t("goal.reached",{ name:maskText(goal.name) }) : setMode ? t("goal.totalSet",{ amount:fmt(r.goal.saved,currency) }) : t("goal.added",{ amount:fmt(v,currency), name:maskText(goal.name) })); };
                return (
                <div data-section="goal-update-row" data-mode={ug.mode} style={{marginTop:10}}>
                  <div style={{display:"flex",gap:7}}>
                    <input className="field-input" type="text" inputMode="decimal" autoComplete="off" data-section="goal-update-input" placeholder={setMode?"":t("goal.addPh")} aria-label={setMode?t("set.updatePrompt",{name:maskText(goal.name)}):t("goal.addPrompt",{name:maskText(goal.name)})} value={ug.val} ref={revealFocus} onChange={e=>setUpdGoal({...ug,val:cleanMoneyText(e.target.value)})}
                      onKeyDown={e=>{ if (e.key==="Enter") { e.preventDefault(); save(); } else if (e.key==="Escape") setUpdGoal(null); }} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                    <button className="btn btn-sm btn-sm-primary" data-section="goal-update-save" onClick={save}>{t(setMode?"common.save":"goal.addBtn")}</button>
                    <button className="btn btn-sm" onClick={()=>setUpdGoal(null)} aria-label={t("common.cancel")}>✕</button>
                  </div>
                  {!setMode&&<input className="field-input" type="text" autoComplete="off" data-section="goal-update-note" maxLength={80} placeholder={t("goal.notePh")} aria-label={t("goal.notePh")} value={ug.note} onChange={e=>setUpdGoal({...ug,note:e.target.value})} style={{width:"100%",marginTop:7,padding:"8px 10px",fontSize:13,boxSizing:"border-box"}}/>}
                  <button type="button" className="link-btn" data-section="goal-update-mode" onClick={()=>setUpdGoal({...ug,mode:setMode?"add":"set",val:setMode?"":String(goal.saved||0)})} style={{background:"none",border:"none",color:"var(--accent-text)",fontSize:12.5,padding:"8px 0 0",cursor:"pointer",minHeight:36}}>{t(setMode?"goal.modeAdd":"goal.modeSet")}</button>
                </div>); })()}</Collapse>
              <div className="bud-bar-row" style={{marginTop:12}}>
                <div className="bar"><div className="bar-fill" style={{width:`${pct}%`,background:"var(--accent)"}}/></div>
                <span className="bud-pct">{fmtPct(Math.round(pct))}</span>
              </div>
              {/* Run 15: the answer to "how much must I save each month?" comes first; the what-if below is optional. */}
              {(req.state==="active"||req.state==="noDate"||req.state==="overdue")&&(
                <div className={`goal-need${req.state==="active"?"":" goal-need-muted"}`} data-section="goal-need" role="note">
                  {req.state==="active"&&<>
                    <div className="goal-need-main">{req.thisMonth?t("goals.needThisMonth",{amount:fmt(req.perMonth,currency),date:fmtDate(goal.targetDate)}):t("goals.needMain",{amount:fmt(req.perMonth,currency)})}</div>
                    {!req.thisMonth&&<div className="list-sub">{tn("goals.needSub",req.periods,{date:fmtDate(goal.targetDate)})}</div>}
                    <div className="list-sub goal-need-note">{t("goals.needNote")}</div>
                  </>}
                  {req.state==="noDate"&&<div>{t("goals.needNoDate")}</div>}
                  {req.state==="overdue"&&<div>{t("goals.needOverdue",{amount:fmt(req.remaining,currency)})}</div>}
                </div>
              )}
              <div className="list-sub" style={{marginTop:6,color:gp.behindSchedule||gp.overdue?"var(--neg)":gp.onTrack||gp.complete?"var(--pos)":"var(--ink-3)"}}>
                {gp.complete?(goal.doneAt?t("goal.reachedOn",{ date:fmtDate(goal.doneAt) }):t("goals.completed"))
                  :goal.targetDate&&gp.daysToTarget!==null?<>{gp.overdue?tn("goals.overdueDays",-gp.daysToTarget):gp.daysToTarget===0?t("set.targetToday"):tn("set.daysToTarget",gp.daysToTarget)}{gp.behindSchedule?t("set.projectedAfter"):gp.onTrack?t("set.onTrackSuffix"):""}</>
                  :remaining>0?t("goals.toGo",{amount:fmt(remaining,currency)}):""}
              </div>
              {estCompletion&&<div className="list-sub" style={{marginTop:4}}>{t("set.atRate",{amount:fmt(goal.monthlyTarget||0,currency),date:estCompletion})}</div>}
              {!gp.complete&&<GoalScenario goal={goal} currency={currency}/>}
              <GoalHistory goal={goal} currency={currency}/>
            </div>
          }/>);
        })}
        {/* Run 59 (owner-approved): the month-start "add last month's leftover to a goal" question is off by default; it is only offered when turned on here */}
        {goals.length>0&&(
          <div className="card" data-section="leftover-goal" style={{marginBottom:12}}>
            <label style={{display:"flex",gap:10,alignItems:"flex-start",lineHeight:1.45}}>
              <input type="checkbox" checked={leftoverOn} onChange={e=>{ const on=e.target.checked; if (!writeLeftoverGoal(on)) { showToast(t("carry.saveFailed")); return; } setLeftoverOn(on); }} style={{marginTop:3,flexShrink:0}}/>
              <span><span style={{display:"block",fontWeight:600}}>{t("leftover.toggle")}</span><span className="list-sub" style={{display:"block"}}>{t("leftover.help")}</span>
                {!leftoverOn&&readRolloverSeen()&&<span className="list-sub" data-section="leftover-was" style={{display:"block",marginTop:4}}>{t("leftover.wasAsked")}</span>}</span>
            </label>
          </div>
        )}
        <SavingsFloorCard safeToSpend={safeToSpend} onSafeToSpendChange={onSafeToSpendChange} showToast={showToast}/>
        <TemplatesSection templates={templates} currency={currency} onAddTemplate={onAddTemplate} onDeleteTemplate={onDeleteTemplate} onUpdateTemplate={onUpdateTemplate} showToast={showToast}/>
        {/* Run 38 (owner): your own categories and the order / visibility of all of them live here, next to the quick-add templates.
            The "in use" check reads the full ledger (rawState), not the spending view, so a category used by any entry is never removable. */}
        <div data-section="gl-categories">
          <div className="section-title" style={{margin:"18px 2px 10px"}}>{t("mycat.title")}</div>
          {tidyTools&&<TidyCategories transactions={(rawState||state).transactions} currency={currency} tools={tidyTools}/>}
          <MyCategories state={rawState||state} onChanged={onCatsChanged||(()=>{})} showToast={showToast}/>
          <CategoryOrder onChanged={onCatsChanged||(()=>{})} showToast={showToast}/>
        </div>
      </>)}
    </div>
  );
}

// Run 63 (owner batch D10): a budget's last six finished months (spent against today's limit), folded. Only months since the first entry.
// Read-only; the limit shown is the current one, because past limits are not kept (said in the note).
export function BudgetHistory({ catId, limit, transactions, currency, now }) {
  const [open,setOpen]=useState(false);
  const rows=useMemo(()=>{
    const first=(transactions||[]).reduce((m,x)=>x&&x.date&&(!m||x.date<m)?x.date:m,"").slice(0,7);
    if (!first) return [];
    const [y,mo]=now.split("-").map(Number), out=[];
    for (let k=1;k<=6;k++) { const d=new Date(y,mo-1-k,1), ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; if (ym<first) break; out.push({ ym, spent:calcCategorySpend(transactions,ym)[catId]||0 }); }
    return out;
  },[catId,transactions,now]);
  if (!rows.length) return null;
  return (
    <div data-section="bud-history" style={{paddingLeft:44}}>
      <button type="button" data-section="bud-history-toggle" aria-expanded={open} onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"none",color:"var(--accent-text)",fontSize:12,padding:"4px 0",cursor:"pointer",minHeight:36}}>{t(open?"budget.histHide":"budget.histShow")}</button>
      <Collapse open={open}>
        <div role="list" style={{fontSize:12.5}}>
          {rows.map(r=>(
            <div role="listitem" key={r.ym} data-mon={r.ym} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"5px 0",borderTop:"1px solid var(--rule)"}}>
              <span>{monthName(r.ym)}</span>
              <span style={{whiteSpace:"nowrap",fontWeight:600,color:r.spent>limit?"var(--neg)":"var(--ink)"}}>{fmt(r.spent,currency)} / {fmt(limit,currency)}</span>
            </div>))}
          <div className="list-sub" style={{padding:"4px 0 2px"}}>{t("budget.histNote")}</div>
        </div>
      </Collapse>
    </div>
  );
}

// Run 61 (owner batch C7/C8): every addition to a goal, newest first, with what it held before the history began; folded by default.
// A reached goal also says how long it took, counted from the first recorded addition.
export function GoalHistory({ goal, currency }) {
  const [open,setOpen]=useState(false);
  const h=goalHistory(goal);
  if (!h.lines.length) return null;
  const took=goal.doneAt && h.first ? daysBetween(parseLocalDate(h.first), parseLocalDate(goal.doneAt)) : null;
  const signed=(n)=>(n<0?"−":"+")+fmt(Math.abs(n),currency);
  const label=(c)=>c.src==="leftover" ? t("goal.srcLeftover") : c.src==="set" ? t("goal.srcSet") : (c.note ? maskText(c.note) : t("goal.srcAdd"));
  return (
    <div data-section="goal-history" style={{marginTop:8}}>
      {took!==null&&took>0&&Math.round(h.before*100)===0&&<div className="list-sub" data-section="goal-took" style={{marginBottom:4}}>{tn("goal.took",took,{ amount:fmt(goal.saved||0,currency) })}</div>}
      <button type="button" className="link-btn" data-section="goal-history-toggle" aria-expanded={open} onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"none",color:"var(--accent-text)",fontSize:12.5,padding:"4px 0",cursor:"pointer",minHeight:36}}>{t(open?"goal.histHide":"goal.histShow",{ n:h.lines.length })}</button>
      <Collapse open={open}>
        <div role="list" data-section="goal-history-rows" style={{fontSize:12.5}}>
          {h.lines.map(c=>(
            <div role="listitem" key={c.id} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"5px 0",borderTop:"1px solid var(--rule)"}}>
              <span style={{minWidth:0,overflowWrap:"anywhere"}}>{fmtDate(c.date)} · {label(c)}</span>
              <span style={{whiteSpace:"nowrap",fontWeight:600,color:c.amount<0?"var(--neg)":"var(--ink)"}}>{signed(c.amount)}</span>
            </div>))}
          {Math.round(h.before*100)!==0&&<div role="listitem" data-section="goal-history-before" style={{display:"flex",justifyContent:"space-between",gap:8,padding:"5px 0",borderTop:"1px solid var(--rule)",color:"var(--ink-3)"}}><span>{t("goal.histBefore")}</span><span style={{whiteSpace:"nowrap"}}>{fmt(h.before,currency)}</span></div>}
        </div>
      </Collapse>
    </div>
  );
}

// Run 58: "Tidy up categories". Older entries recorded where a thing used to live (a haircut under Gifts, fuel under Transport) can be moved
// to the new place. Nothing is ticked at first and nothing moves until the person presses the button; Undo is offered right after.
// Repeating entries, bill payments, loan and debt payments are never offered (tidyPlan). "Not now" hides the moves shown at that moment.
export function TidyCategories({ transactions, currency, tools }) {
  const plan=useMemo(()=>tidyPlan(transactions),[transactions]);
  const [hidden,setHidden]=useState(()=>{ try { const v=JSON.parse(localStorage.getItem(TIDY_KEY)||"[]"); return Array.isArray(v)?v:[]; } catch { return []; } });
  const [picked,setPicked]=useState([]);
  const shown=plan.filter(g=>!hidden.includes(g.key));
  if (!shown.length) return null;
  const place=([c,s])=>catName(c)+(s?" / "+subName(s):"");
  const chosen=shown.filter(g=>picked.includes(g.key));
  const monthLines=chosen.filter(g=>g.monthTotal>0).map(g=>t("tidy.month",{ from:catName(g.from[0]), to:catName(g.to[0]), amount:fmt(g.monthTotal,currency) }));
  const move=()=>{
    const r=applyTidy(tools.getTransactions(),shown,picked);
    if (!r.moved) return;
    tools.setTransactions(()=>r.transactions);
    setPicked([]);
    tools.showSnackbar(tn("tidy.done",r.moved),()=>tools.setTransactions(list=>undoTidy(list,r.before)),8000,"tidy");
  };
  const notNow=()=>{ const next=[...new Set([...hidden,...shown.map(g=>g.key)])]; setHidden(next); try { localStorage.setItem(TIDY_KEY,JSON.stringify(next)); } catch { /* shown again next time */ } };
  return (
    <div className="card" data-section="tidy-cats" style={{marginBottom:12}}>
      <div className="a-card-title">{t("tidy.title")}</div>
      <div className="list-sub" style={{marginBottom:8,lineHeight:1.5}}>{t("tidy.intro")}</div>
      {shown.map(g=>(
        <label key={g.key} data-tidy={g.key} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 0",borderTop:"1px solid var(--rule)",lineHeight:1.45}}>
          <input type="checkbox" checked={picked.includes(g.key)} onChange={e=>setPicked(p=>e.target.checked?[...p,g.key]:p.filter(k=>k!==g.key))} style={{marginTop:3,flexShrink:0}}/>
          <span style={{minWidth:0}}>
            <span style={{display:"block",overflowWrap:"anywhere",fontSize:13.5,fontWeight:600}}>{t("tidy.row",{ from:place(g.from), to:place(g.to) })}</span>
            <span className="list-sub" style={{display:"block"}}>{tn("tidy.total",g.count,{ amount:fmt(g.total,currency) })}{g.example&&g.example.merchant?" · "+t("tidy.example",{ name:maskText(g.example.merchant) }):""}</span>
          </span>
        </label>
      ))}
      <Collapse open={monthLines.length>0}><div className="list-sub" data-section="tidy-month" style={{marginTop:6,lineHeight:1.5}}>{monthLines.map((l,i)=><div key={i}>{l}</div>)}</div></Collapse>
      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
        <button type="button" className="btn btn-sm btn-sm-primary" data-section="tidy-move" disabled={!chosen.length} onClick={move}>{t("tidy.move")}</button>
        <button type="button" className="btn btn-sm" data-section="tidy-later" onClick={notNow}>{t("tidy.later")}</button>
      </div>
    </div>
  );
}

// Run 15: the optional what-if, replacing the fixed 60% / 100% / 140% rows. The user types an amount; the answer uses the same
// month-start rule and cents as the required monthly amount, says whether it meets the deadline, and says it is an estimate.
export function GoalScenario({ goal, currency }) {
  const [val,setVal]=useState("");
  const amt=val.trim()===""?null:formMoney(val,{positive:true});
  const s=amt!==null ? goalScenario(goal,amt) : null;
  const id="gs-"+String(goal.id).replace(/[^a-zA-Z0-9_-]/g,"");
  const [open,setOpen]=useState(false);   // Run 34: was a native <details> (opened and closed in one frame); now it eases both ways
  return (
    <div className="goal-scenario" data-section="goal-scenario">
      <button type="button" className="gs-toggle" aria-expanded={open} aria-controls={id+"-body"} onClick={()=>setOpen(o=>!o)}>
        <span>{t("goals.scenarioTitle")}</span><span className={"fold-chev"+(open?" open":"")}><Icon name="chevDown" size={14} color="var(--ink-4)"/></span>
      </button>
      <Collapse open={open} id={id+"-body"}>
        <label className="field-lbl" htmlFor={id}>{t("goals.scenarioLabel")}</label>
        <input id={id} className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={val} onChange={e=>setVal(cleanMoneyText(e.target.value))}/>
        {val.trim()!==""&&amt===null&&<div className="list-sub" role="status">{t("add.errAmount")}</div>}
        {s&&s.valid&&(
          <div className="goal-scenario-out" role="status" aria-live="polite">
            <div>{t("goals.scenarioResult",{amount:fmt(amt,currency),months:tn("set.months",s.months),date:s.completion})}</div>
            {s.meetsDeadline!==null&&<div className="list-sub" style={{color:s.meetsDeadline?"var(--pos)":"var(--neg)",fontWeight:600}}>{t(s.meetsDeadline?"goals.scenarioMeets":"goals.scenarioMisses")}</div>}
            <div className="list-sub">{t("goals.scenarioEstimate")}</div>
          </div>
        )}
      </Collapse>
    </div>
  );
}

