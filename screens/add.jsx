// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { useEffect, useMemo, useRef, useState } from "react";
import { locale, t } from "../i18n.js";
import { CAT, CATEGORIES, CatIcon, Icon, SUBCAT_LEN, WALLET_IDS, accId, addUserSubcat, buildSchedules, calcMerchantProfile, catName, catTile, cleanMoneyText, fmt, fmtDate, fmtLongDate, formMoney, isValidDateStr, maskText, memKey, norm, parseLocalDate, readAccounts, readSubcats, removeUserSubcat, renameUserSubcat, revealFocus, subKey, subName, today, tripName, tripTotals, validateBill, walletId, walletName, writeSubcats } from "../App.jsx";

// ─── Recurring Hub ────────────────────────────────────────────────────────────
// Run 12: the bill form — add a bill, or edit / pause / delete one. The due date is the user's: the bill is expected on it
// and then every week / two weeks / month / year (a day past a month's end falls on that month's last day).
// Deleting a bill keeps all its payments; they just stop pointing to it.
export function BillSheet({ bill, currency, onSave, onDelete, onClose, showToast }) {
  const isNew=!bill;
  const [name,setName]=useState(bill?.name||""), [type,setType]=useState(bill?.type||"expense"), [amount,setAmount]=useState(bill?String(bill.amount):"");
  const [category,setCategory]=useState(bill?.category||"housing"), [freq,setFreq]=useState(bill?.freq||"monthly");
  const [anchor,setAnchor]=useState(bill?.anchorDate||today()), [active,setActive]=useState(bill?bill.active!==false:true);
  const [endDate,setEndDate]=useState(bill?.endDate||"");
  const cats=CATEGORIES.filter(c=>type==="income"?c.income:!c.income);
  const save=()=>{
    const b=validateBill({ id:bill?.id||"tmp", name, type, category:cats.some(c=>c.id===category)?category:cats[0].id, subcategory:bill?.subcategory||"",
      amount:formMoney(amount,{positive:true}), freq, anchorDate:anchor, ...(bill && anchor===bill.anchorDate && bill.dueDay ? { dueDay:bill.dueDay } : {}), endDate, active, createdAt:bill?.createdAt||new Date().toISOString() });
    if (!b) { showToast(t(endDate && endDate<anchor ? "bill.endDateBad" : "bill.invalid"),3500); return; }
    onSave(isNew ? { ...b, id:null } : b);
  };
  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet bill-sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={t(isNew?"bill.add":"bill.edit")}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div className="sheet-title">{t(isNew?"bill.add":"bill.edit")}</div>
        <div className="type-toggle">
          {["expense","income"].map(ty=><button key={ty} className={`type-btn${type===ty?" active":""}`} aria-pressed={type===ty} onClick={()=>setType(ty)}>{t(ty==="income"?"add.income":"add.expense")}</button>)}
        </div>
        <div className="field"><label className="field-lbl" htmlFor="bill-name">{t("bill.name")}</label><input id="bill-name" className="field-input" value={name} maxLength={80} placeholder={t("bill.namePh")} onChange={e=>setName(e.target.value)}/></div>
        <div className="field-row">
          <div className="field"><label className="field-lbl" htmlFor="bill-amount">{t("add.amount")} ({currency})</label><input id="bill-amount" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} onChange={e=>setAmount(cleanMoneyText(e.target.value))}/></div>
          <div className="field"><label className="field-lbl" htmlFor="bill-freq">{t("add.frequency")}</label>
            <select id="bill-freq" className="field-input field-select" value={freq} onChange={e=>setFreq(e.target.value)}>{["weekly","biweekly","monthly","yearly"].map(f=><option key={f} value={f}>{t("freqCap."+f)}</option>)}</select></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="field-lbl" htmlFor="bill-cat">{t("add.category")}</label>
            <select id="bill-cat" className="field-input field-select" value={cats.some(c=>c.id===category)?category:cats[0].id} onChange={e=>setCategory(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}</option>)}</select></div>
          <div className="field"><label className="field-lbl" htmlFor="bill-date">{t(isNew?"bill.firstDue":"bill.dueFrom")}</label><input id="bill-date" className="field-input" type="date" lang={locale()} value={anchor} onChange={e=>setAnchor(e.target.value)}/>
            {isValidDateStr(anchor)&&<div className="list-sub" style={{marginTop:4}}>{fmtLongDate(parseLocalDate(anchor))}</div>}</div>
        </div>
        <div className="field"><label className="field-lbl" htmlFor="bill-end">{t("bill.endDate")}</label><input id="bill-end" className="field-input" type="date" lang={locale()} value={endDate} min={isValidDateStr(anchor)?anchor:undefined} onChange={e=>setEndDate(e.target.value)}/>
          <div className="list-sub" style={{marginTop:4}}>{t("bill.endDateSub")}</div></div>
        {!isNew&&(
          <div className="settings-row">
            <div><div className="settings-row-title">{t("bill.active")}</div><div className="settings-row-sub">{t("bill.activeSub")}</div></div>
            <div className={`toggle-track${active?" on":""}`} role="switch" aria-checked={active} aria-label={t("bill.active")} tabIndex={0} onClick={()=>setActive(a=>!a)} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); setActive(a=>!a); } }}><div className="toggle-knob"/></div>
          </div>
        )}
        <button className="btn btn-primary btn-full bill-save" onClick={save}>{t("common.save")}</button>
        {!isNew&&<button className="btn btn-ghost btn-full bill-delete" style={{color:"var(--neg)",borderColor:"var(--neg-bg)"}} onClick={()=>onDelete(bill.id)}>{t("bill.delete")}</button>}
        <button className="btn btn-ghost btn-full" data-closer="1" onClick={onClose}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}

// Run 25 (owner decision): the in-app number pad is gone; the amount box opens the phone's own number keyboard (no space lost to a pad).
export function AddEditOverlay({ leaving, templates, currency, transactions, bills=[], prefill, editId, merchantMemory, onSave, onClose, onOtherKind, onRenameSub }) {
  // Run 12: which bill a recurring entry pays. Offered only when every recurring payment is already linked to a bill
  // (nothing inferred the old way); otherwise the entry is grouped as before, so it can't start a second copy of a bill
  // that is still inferred. "new" makes a bill from this entry; an id links to that bill.
  const hasInferred=useMemo(()=>buildSchedules(transactions,bills).some(s=>!s.billId),[transactions,bills]);
  const [billChoice, setBillChoice] = useState(prefill?.billId||(hasInferred?"auto":"new"));
  const [askBill, setAskBill] = useState(null);   // a same-name bill exists: ask before making another one
  const isEditing=!!editId;
  const [type,     setType]     = useState(prefill?.type||"expense");
  const [amount,   setAmount]   = useState(prefill?.amount?String(prefill.amount):"");
  const [catId,    setCatId]    = useState(prefill?.category||"food");
  const [subcat,   setSubcat]   = useState(prefill?.subcategory||"");
  const [merchant, setMerchant] = useState(prefill?.merchant||"");
  const [note,     setNote]     = useState(prefill?.note||"");
  const [date,     setDate]     = useState(prefill?.date||today());
  const [recur,    setRecur]    = useState(prefill?.recurring||false);
  const [freq,     setFreq]     = useState(prefill?.recurFreq||"monthly");
  // Run 16: how it was paid. A new entry starts with the wallet used last (one tap fewer); editing keeps the entry's own.
  const [wallet,   setWallet]   = useState(isEditing ? walletId(prefill?.wallet) : (prefill && "wallet" in prefill ? walletId(prefill.wallet) : ""));   // Run 25: a new entry never starts with a wallet chosen for you (it used to repeat the last one, unseen under "More details")
  // Run 22: optional trip / group name (free text; earlier names are suggested). Editing keeps the entry's own.
  const [trip, setTrip] = useState(tripName(prefill?.trip));
  const accData=useMemo(()=>readAccounts(),[]);   // Run 24: optional account (card, cash...) the entry belongs to
  const [account, setAccount] = useState(accId(prefill?.account));
  const knownTrips=useMemo(()=>tripTotals(transactions).map(x=>x.name),[transactions]);
  // Run 16: the user's own subcategory suggestions (separate storage key; entries keep the text itself).
  const [mySubs, setMySubs] = useState(()=>readSubcats());
  const [newSub, setNewSub] = useState(null);   // null = closed; otherwise the text being typed
  const [subMsg, setSubMsg] = useState("");
  const saveMySubs=(m)=>{ setMySubs(m); if (!writeSubcats(m)) setSubMsg(t("subcat.saveFailed")); };
  const [renSub, setRenSub] = useState(null);   // { from, text } while one of the user's own subcategories is being renamed
  const renameMySub=()=>{
    const r=renameUserSubcat(mySubs,catId,renSub.from,renSub.text);
    if (!r.edited) { setSubMsg(t("subcat.err."+(r.reason==="missing"?"empty":r.reason))); return; }
    if (!writeSubcats(r.map)) { setSubMsg(t("subcat.saveFailed")); return; }
    setMySubs(r.map); if (subKey(subcat)===subKey(renSub.from)) setSubcat(r.name);
    if (onRenameSub) onRenameSub(catId,renSub.from,r.name);
    setRenSub(null); setSubMsg("");
  };
  const addMySub=()=>{
    const r=addUserSubcat(mySubs,catId,newSub||"");
    if (!r.added) { setSubMsg(t("subcat.err."+r.reason)); return; }
    saveMySubs(r.map); setSubcat(newSub.trim().replace(/\s+/g," ")); setNewSub(null); setSubMsg("");
  };
  // Run 17: details (merchant, note, date, wallet, repeat) are folded away unless editing or already filled; the pad is open until a text field needs the room.
  const [more, setMore] = useState(!!(editId || prefill?.recurring || prefill?.billId || prefill?.merchant || prefill?.note));
  const [err,      setErr]      = useState("");
  const [showMerchantSugs, setShowMerchantSugs] = useState(false);
  const amtRef=useRef();

  // Unsaved-input guard: every close route (×, Cancel, Escape, phone Back) goes through requestClose. When something was
  // entered it asks first; an untouched form closes at once. Switching Expense/Income alone is not input: the category then
  // changes to that type's default by itself, so the category only counts as changed when it differs from that default.
  const initial=useRef({ type, amount, catId, subcat, merchant, note, date, recur, freq, wallet, trip, account }).current;
  const [askDiscard, setAskDiscard] = useState(false);
  const defaultCat=type===initial.type ? initial.catId : (type==="income"?"salary":"food");
  const dirty=amount!==initial.amount || subcat!==initial.subcat || merchant!==initial.merchant || note!==initial.note ||
    date!==initial.date || recur!==initial.recur || (recur && freq!==initial.freq) || catId!==defaultCat || wallet!==initial.wallet || trip!==initial.trip || account!==initial.account;
  const requestClose=()=>{ if (dirty) setAskDiscard(true); else onClose(); };

  const expCats=CATEGORIES.filter(c=>!c.income);
  const incCats=CATEGORIES.filter(c=>c.income);
  const displayCats=type==="income"?incCats:expCats;
  const selectedCat=CAT(catId);
  const moreSummary=[merchant.trim(), note.trim(), wallet?walletName(wallet):"", date&&date!==today()&&isValidDateStr(date)?fmtDate(date):"", recur?t("freqCap."+freq):""].filter(Boolean).join(" · ");

  useEffect(()=>{ setTimeout(()=>amtRef.current?.focus(),60); },[]);
  useEffect(()=>{ if(!prefill) setCatId(type==="income"?"salary":"food"); },[type]);

  const merchantMatches=useMemo(()=>{
    if (!merchant.trim()) return [];
    const q=merchant.toLowerCase();
    // Only suggest what the user previously recorded as this same transaction type
    const wantType=type==="income"?"income":"expense";
    return Object.values(merchantMemory)
      .filter(m=>m.type===wantType&&m.merchant.toLowerCase().startsWith(q))
      .slice(0,4);
  },[merchant,merchantMemory,type]);

  const applySuggestion=(sug)=>{
    setMerchant(sug.merchant);
    setCatId(sug.category||catId);
    setSubcat(sug.subcategory||"");
    setShowMerchantSugs(false);
  };

  // S0: Duplicate detection uses createdAt, not date
  const isDupe=useMemo(()=>{
    const amt=formMoney(amount,{positive:true});
    if (isEditing||amt===null) return false;
    const tenMinAgo=Date.now()-10*60*1000;
    return transactions.some(t=>
      t.category===catId &&
      Math.abs(t.amount-amt)<0.01 &&
      (t.note||"").trim()===(note||"").trim() &&
      t.createdAt &&
      new Date(t.createdAt).getTime()>tenMinAgo
    );
  },[amount,catId,note,transactions,isEditing]);

  const submit=(override)=>{
    const amt=formMoney(amount,{positive:true});
    if (amt===null) { setErr(t("add.errAmount")); return; }
    if (!isValidDateStr(String(date||""))) { setErr(t("add.errDate")); return; }
    // S0: Preserve isActive when editing — never silently reactivate a paused recurring
    const isActive=isEditing?(prefill?.isActive!==undefined?prefill.isActive:true):true;
    // A bill that exists always links (also while old-style groups remain); only "a new bill" is held back until none remain.
    const choice=typeof override==="string" ? override : billChoice;
    const chosenBill=recur ? bills.find(b=>b.id===choice&&b.type===type) : null;
    if (recur && !chosenBill && !hasInferred && override===undefined) {
      const who=norm(merchant.trim()||note.trim());
      const same=who ? bills.find(b=>b.type===type && norm(b.name)===who) : null;
      if (same) { setAskBill(same); return; }   // payment of that bill, or a separate bill? Never decided silently.
    }
    onSave({type,amount:amt,category:catId,subcategory:subcat,merchant:merchant.trim(),note:note.trim(),date,recurring:recur,recurFreq:recur?(chosenBill?chosenBill.freq:freq):null,isActive,wallet,trip:tripName(trip),account,
      billChoice: recur ? (chosenBill ? chosenBill.id : (hasInferred ? null : "new")) : null});
  };

  const relevantTpls=!isEditing?templates.filter(tp=>!CATEGORIES.find(c=>c.id===tp.catId)?.income&&type==="expense"):[];
  const optional=<span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ink-4)"}}>({t("add.optional")})</span>;
  const title=isEditing?t("add.titleEdit"):t("add.titleNew");

  return (
    <div className={leaving?"add-overlay leaving":"add-overlay"} role="dialog" aria-modal="true" aria-label={title}>
      <div className="add-bar">
        <span className="add-title">{title}</span>
        <button className="add-close" onClick={requestClose} aria-label={t("common.close")}><Icon name="close" size={14}/></button>
      </div>
      <div className="add-body">
        {/* Run 25: the first choice is WHAT you are recording (expense, income, loan, debt), as four equal tiles; editing an entry offers only expense/income */}
        <div className={`type-picker${!editId&&onOtherKind?"":" two"}`} role="group" aria-label={t("add.kindPrompt")} data-section="add-type-picker">
          <button type="button" className={`type-pick type-btn${type==="expense"?" active":""}`} aria-pressed={type==="expense"} onClick={()=>setType("expense")}><span className="type-dot" style={{background:"var(--neg)"}} aria-hidden="true"/>{t("add.expense")}</button>
          <button type="button" className={`type-pick type-btn${type==="income"?" active":""}`} aria-pressed={type==="income"} onClick={()=>setType("income")}><span className="type-dot" style={{background:"var(--pos)"}} aria-hidden="true"/>{t("add.income")}</button>
          {!editId&&onOtherKind&&["loans","debts"].map(k=><button key={k} type="button" className="type-pick" data-section={"add-other-"+k} onClick={()=>onOtherKind(k)}><span className="type-dot" style={{background:k==="loans"?"var(--info)":"var(--warn)"}} aria-hidden="true"/>{t(k==="loans"?"add.loan":"add.debt")}</button>)}
        </div>
        <div className="amount-zone" onClick={()=>amtRef.current?.focus()}>
          <div className="amount-line">
            <input ref={amtRef} className="amount-input" type="text" inputMode="decimal" autoComplete="off" autoFocus={!editId}
              placeholder="0.00" value={amount} onChange={e=>{setAmount(cleanMoneyText(e.target.value));setErr("");}}
              min="0" step="0.01" aria-label={t("add.amount")} aria-invalid={!!err&&err===t("add.errAmount")}
              style={{width:`${Math.max(4.3,Math.min(14,String(amount||"0.00").length*1.08))}ch`,fontSize:`${Math.max(30,Math.min(50,240/(Math.max(4,String(amount||"0.00").length)*0.62)))}px`}}/>
            <span className="amount-cur">{currency}</span>
          </div>
        </div>
        {err&&<div role="alert" style={{color:"var(--neg)",fontSize:12,textAlign:"center",marginBottom:10,fontWeight:600}}>{err}</div>}
        {isDupe&&<div className="dupe-warn" role="status"><Icon name="other" size={13}/>{t("add.dupe")}</div>}

        {relevantTpls.length>0&&(
          <div style={{marginBottom:12}}>
            <div className="field-lbl">{t("add.quickFill")}</div>
            <div className="tpl-strip" style={{marginBottom:0}}>
              {relevantTpls.map(tpl=>(
                <button key={tpl.id} className="tpl-card" onClick={()=>{setAmount(String(tpl.amount));setCatId(tpl.catId);setSubcat(tpl.subcat||"");setMerchant(tpl.merchant||"");setNote(tpl.note||tpl.name);}}>
                  <CatIcon catId={tpl.catId} size={12}/><span className="tpl-name">{tpl.name}</span><span className="tpl-amt">{fmt(tpl.amount,currency)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field" role="group" aria-labelledby="txn-cat-lbl">
          <div className="field-lbl" id="txn-cat-lbl">{t("add.category")} <span style={{fontWeight:600,color:"var(--ink-2)",letterSpacing:0.4}}>· {catName(catId)}</span></div>
          <div className="cat-scroll">
            {displayCats.map(cat=>(
              <button key={cat.id} className={`cat-tile${catId===cat.id?" sel":""}`} aria-pressed={catId===cat.id} aria-label={catName(cat.id)} onClick={()=>{setCatId(cat.id);setSubcat("");}}>
                <CatIcon catId={cat.id} size={18} color={catId===cat.id?cat.color:undefined}/>
                <span className="cat-tile-name">{catTile(cat.id)}</span>
              </button>
            ))}
          </div>
          {(selectedCat?.subs?.length>0 || (mySubs[catId]||[]).length>0 || selectedCat)&&(
            <div data-section="add-subcat">
              <div className="field-lbl" style={{marginBottom:5,marginTop:4}}>{t("add.subcategory")} {optional}</div>
              <div className="sub-strip">
                {/* "+ My own" comes first, then the user's own, then the built-in ones: the strip scrolls sideways, so the button must not hide at its far end */}
                {newSub===null&&<button type="button" className="sub-chip" data-section="add-subcat-new" onClick={()=>{ setNewSub(""); setSubMsg(""); }}>+ {t("subcat.mine")}</button>}
                {(mySubs[catId]||[]).map(s=>(
                  <span key={"my-"+s} className="sub-chip-wrap" style={{display:"inline-flex",alignItems:"center",gap:2}}>
                    <button className={`sub-chip${subcat===s?" sel":""}`} aria-pressed={subcat===s} onClick={()=>setSubcat(subcat===s?"":s)}>{s}</button>
                    <button type="button" className="sub-chip-ren" data-section="add-subcat-rename" aria-label={t("subcat.rename",{name:s})} style={{background:"none",border:"none",color:"var(--ink-4)",cursor:"pointer",padding:"6px 4px",minWidth:24,minHeight:24}} onClick={()=>{ setRenSub({ from:s, text:s }); setNewSub(null); setSubMsg(""); }}>✎</button>
                    <button type="button" className="sub-chip-x" aria-label={t("subcat.remove",{name:s})} style={{background:"none",border:"none",color:"var(--ink-4)",cursor:"pointer",padding:"6px 4px",minWidth:24,minHeight:24}} onClick={()=>saveMySubs(removeUserSubcat(mySubs,catId,s))}>×</button>
                  </span>
                ))}
                {(selectedCat?.subs||[]).map(s=>(
                  <button key={s} className={`sub-chip${subcat===s?" sel":""}`} aria-pressed={subcat===s} onClick={()=>setSubcat(subcat===s?"":s)}>{subName(s)}</button>
                ))}
              </div>
              {renSub&&(
                <div style={{display:"flex",gap:7,marginTop:8}} data-section="add-subcat-rename-form">
                  <input className="field-input" ref={revealFocus} aria-label={t("subcat.rename",{name:renSub.from})} maxLength={SUBCAT_LEN} value={renSub.text} onChange={e=>{ setRenSub({...renSub,text:e.target.value}); setSubMsg(""); }} onKeyDown={e=>{ if (e.key==="Enter") { e.preventDefault(); renameMySub(); } }} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                  <button type="button" className="btn btn-sm btn-sm-primary" data-section="add-subcat-rename-save" onClick={renameMySub}>{t("common.save")}</button>
                  <button type="button" className="btn btn-sm" onClick={()=>{ setRenSub(null); setSubMsg(""); }} aria-label={t("common.cancel")}>✕</button>
                </div>
              )}
              {newSub!==null&&(
                <div style={{display:"flex",gap:7,marginTop:8}}>
                  <input className="field-input" ref={revealFocus} aria-label={t("subcat.mine")} placeholder={t("subcat.ph")} maxLength={SUBCAT_LEN} value={newSub} onChange={e=>{ setNewSub(e.target.value); setSubMsg(""); }} onKeyDown={e=>{ if (e.key==="Enter") { e.preventDefault(); addMySub(); } }} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                  <button type="button" className="btn btn-sm btn-sm-primary" onClick={addMySub}>{t("common.save")}</button>
                  <button type="button" className="btn btn-sm" onClick={()=>{ setNewSub(null); setSubMsg(""); }} aria-label={t("common.cancel")}>✕</button>
                </div>
              )}
              {subMsg&&<div role="alert" className="list-sub" style={{marginTop:6,color:"var(--neg)"}}>{subMsg}</div>}
            </div>
          )}
        </div>

        {/* Run 17: the form shows what most entries need; the rest sits under one toggle (open when editing). */}
        <button type="button" className="more-toggle" data-section="add-more-toggle" aria-expanded={more} aria-controls="add-more-body" onClick={()=>setMore(m=>!m)}>
          <span className="more-toggle-main">{t(more?"add.lessDetails":"add.moreDetails")}</span>
          <span className="more-toggle-sub">{moreSummary||t("add.moreHint")}</span>
          <Icon name={more?"chevUp":"chevDown"} size={16}/>
        </button>
        <div id="add-more-body" data-section="add-more" style={more?undefined:{display:"none"}}>        <div className="field merchant-wrap">
          <label className="field-lbl" htmlFor="txn-merchant">{t("add.merchant")} {optional}</label>
          <input id="txn-merchant" className="field-input" placeholder={t("add.merchantPh")} autoComplete="off"
            value={merchant}
            onChange={e=>{setMerchant(e.target.value);setShowMerchantSugs(true);}}
            onBlur={()=>setTimeout(()=>setShowMerchantSugs(false),150)}
            onFocus={()=>setShowMerchantSugs(true)}/>
          {/* Merchant intelligence hint — shown when merchant is recognised */}
          {merchant.trim()&&!showMerchantSugs&&(()=>{
            const ml=merchant.trim().toLowerCase();
            const match=merchantMemory[memKey(type,ml)];
            if (!match||match.count<2) return null;
            const profile=calcMerchantProfile(merchant.trim(),transactions);
            if (!profile) return null;
            const hints=[];
            if (profile.avg>0) hints.push(t("add.hintUsually",{amount:fmt(profile.avg,currency)}));
            if (profile.typicalDay&&profile.count>=3) hints.push(t("add.hintDay",{day:t("dow."+profile.typicalDay)}));
            if (profile.estimatedNextVisit) hints.push(t("add.hintNext",{date:fmtDate(profile.estimatedNextVisit)}));
            if (!hints.length) return null;
            return (
              <div style={{fontSize:11,color:"var(--ink-4)",marginTop:4,display:"flex",alignItems:"center",gap:5,fontStyle:"italic"}}>
                <Icon name="merchant" size={11} color="var(--ink-4)"/>
                {hints.join(" · ")}
              </div>
            );
          })()}
          {showMerchantSugs&&merchantMatches.length>0&&(
            <div className="merchant-suggestions">
              {merchantMatches.map((m,i)=>(
                <div key={i} className="merchant-sug-item" onMouseDown={()=>applySuggestion(m)}>
                  <div>{m.merchant}</div>
                  <div className="merchant-sug-sub">{catName(m.category)}{m.subcategory?` / ${subName(m.subcategory)}`:""} · {t("add.usedTimes",{n:m.count})}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run 16: how it was paid (cash, bank card, mobile wallet, other). One tap; tapping the chosen one again clears it. */}
        <div className="field" role="radiogroup" aria-labelledby="txn-wal-lbl" data-section="add-wallet">
          <div className="field-lbl" id="txn-wal-lbl">{t(type==="income"?"wallet.labelIn":"wallet.label")} {optional}</div>
          <div className="sub-strip" style={{flexWrap:"wrap",overflowX:"visible"}}>
            {WALLET_IDS.map(id=>(
              <button key={id} type="button" role="radio" aria-checked={wallet===id} className={`sub-chip${wallet===id?" sel":""}`} onClick={()=>setWallet(wallet===id?"":id)}>{t("wallet."+id)}</button>
            ))}
            {wallet&&!WALLET_IDS.includes(wallet)&&(
              <button type="button" role="radio" aria-checked="true" className="sub-chip sel" onClick={()=>setWallet("")}>{walletName(wallet)}</button>
            )}
          </div>
        </div>

        {/* Run 22: optional trip / group, e.g. "Baku trip". Suggestions are the names already used. */}
        <div className="field" data-section="add-trip">
          <label className="field-lbl" htmlFor="txn-trip">{t("trip.label")} {optional}</label>
          <input id="txn-trip" className="field-input" list="txn-trip-list" value={trip} maxLength={40} autoComplete="off" placeholder={t("trip.placeholder")} onChange={e=>setTrip(e.target.value)}/>
          <datalist id="txn-trip-list">{knownTrips.map(n=><option key={n} value={n}/>)}</datalist>
        </div>
        {accData.accounts.length>0&&(<div className="field" data-section="add-account">
          <label className="field-lbl" htmlFor="txn-account">{t("acc.field")} {optional}</label>
          <select id="txn-account" className="field-input" value={account} onChange={e=>setAccount(e.target.value)}>
            <option value="">{t("acc.none")}</option>
            {accData.accounts.filter(a=>!a.hidden||a.id===account).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>)}

        <div className="field">
          <label className="field-lbl" htmlFor="txn-note">{t("add.note")} {optional}</label>
          <input id="txn-note" className="field-input" placeholder={t("add.notePh")}
            value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>

        <div className="field-row" style={{marginBottom:14}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="field-lbl" htmlFor="txn-date">{t("add.date")}</label>
            <input id="txn-date" className="field-input" lang={locale()} type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            {/* Run 7, V3: the date box is the phone's own control and follows the phone's language, not the app's (Chrome on
                Android ignores lang), so it can read 10/27/2026 in the Azerbaijani interface. The chosen date is repeated
                here in the interface language. Display only: the stored value stays YYYY-MM-DD. */}
            {isValidDateStr(date)&&<div className="date-readout" style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>{fmtLongDate(parseLocalDate(date))}</div>}
          </div>
          <div className="field" style={{marginBottom:0}}>
            <div className="field-lbl" id="txn-rec-lbl">{t("add.recurring")}</div>
            <div style={{display:"flex",alignItems:"center",gap:9,marginTop:9}}>
              <div className={`toggle-track${recur?" on":""}`} onClick={()=>setRecur(r=>!r)} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); setRecur(r=>!r); } }} role="switch" aria-checked={recur} aria-label={t("add.recurring")} tabIndex={0}>
                <div className="toggle-knob"/>
              </div>
              {recur&&!bills.some(b=>b.id===billChoice&&b.type===type)&&(
                <select className="field-select" value={freq} onChange={e=>setFreq(e.target.value)} aria-label={t("add.frequency")}
                  style={{fontSize:12,color:"var(--ink)",background:"transparent",border:"none",outline:"none",cursor:"pointer"}}>
                  {["weekly","biweekly","monthly","yearly"].map(f=><option key={f} value={f}>{t("freqCap."+f)}</option>)}
                </select>
              )}
            </div>
            {recur&&(!hasInferred||bills.some(b=>b.type===type))&&(
              <div className="field" style={{marginTop:10,marginBottom:0}}>
                <label className="field-lbl" htmlFor="txn-bill">{t("bill.which")}</label>
                <select id="txn-bill" className="field-input field-select bill-choice" value={bills.some(b=>b.id===billChoice&&b.type===type)?billChoice:(hasInferred?"auto":"new")} onChange={e=>setBillChoice(e.target.value)}>
                  {hasInferred ? <option value="auto">{t("bill.autoGroup")}</option> : <option value="new">{t("bill.newFromEntry")}</option>}
                  {bills.filter(b=>b.type===type).map(b=><option key={b.id} value={b.id}>{maskText(b.name)} · {fmt(b.amount,currency)} · {t("freq."+b.freq)}</option>)}
                </select>
              </div>
            )}
            {recur&&hasInferred&&<div className="list-sub" style={{marginTop:8,lineHeight:1.45}}>{t("bill.convertFirst")}</div>}
            {askBill&&(
              <div className="card bill-ask" role="alert" style={{marginTop:10,marginBottom:0}}>
                <div className="list-title" style={{marginBottom:4}}>{t("bill.askTitle",{name:maskText(askBill.name)})}</div>
                <div className="list-sub" style={{lineHeight:1.5,marginBottom:10}}>{t("bill.askText",{amount:fmt(askBill.amount,currency),freq:t("freq."+askBill.freq)})}</div>
                <button className="btn btn-primary btn-full bill-ask-pay" style={{marginTop:0}} onClick={()=>submit(askBill.id)}>{t("bill.askPay",{name:maskText(askBill.name)})}</button>
                <button className="btn btn-ghost btn-full bill-ask-new" onClick={()=>submit("new")}>{t("bill.askNew")}</button>
              </div>
            )}
          </div>
        </div>

        </div>
        <button className="btn btn-ghost btn-full" onClick={requestClose}>{t("common.cancel")}</button>
      </div>
      <div className="add-foot">
        <button className="btn btn-primary btn-full" style={{marginTop:0}} onClick={()=>submit()}>
          {isEditing?t("add.saveChanges"):t(type==="income"?"add.recordIncome":"add.recordExpense")}
        </button>
      </div>      {askDiscard&&(
        <div className="sheet-overlay discard-overlay" onClick={e=>e.target===e.currentTarget&&setAskDiscard(false)}>
          <div className="sheet" role="alertdialog" aria-modal="true" tabIndex={-1} aria-labelledby="discard-title" aria-describedby="discard-body">
            <div className="sheet-grip"><div className="sheet-handle"/></div>
            <div className="sheet-title" id="discard-title">{t("add.discardTitle")}</div>
            <p id="discard-body" style={{fontSize:14,color:"var(--ink-3)",margin:"0 0 16px",lineHeight:1.5}}>{t("add.discardBody")}</p>
            <button className="btn btn-primary btn-full discard-keep" onClick={()=>setAskDiscard(false)}>{t("add.keepEditing")}</button>
            <button className="btn btn-ghost btn-full" style={{marginTop:8,color:"var(--neg)"}} onClick={onClose}>{t("add.discard")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

