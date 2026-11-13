// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { useEffect, useMemo, useRef, useState } from "react";
// Run 75: the app's own date and option pickers
import { PickSelect, PickDate } from "./pickers.jsx";
import { locale, t, tn } from "../i18n.js";
import { parseQuickText, frequentFirst, hasManualOrder, pickerCats, readCatPrefs, searchCats, FX_CODES, cleanFx, fetchLedgerRate, lastSavedRate, ledgerCode, fxToBase, hoursOfWork, incomePerHour, readWorkHours, spreadMonths, evalAmountExpr, slotCategory, knownMerchants, knownMerchantExact, cleanReimb, offerUndo, catHint } from "../App.jsx";
import { Collapse, Reveal } from "./motion.jsx";
import { CAT, CATEGORIES, CatIcon, Icon, SUBCAT_LEN, lc, WALLET_IDS, accId, addUserSubcat, buildSchedules, calcMerchantProfile, catName, catTile, cleanMoneyText, fmt, fmtDate, fmtLongDate, formMoney, isValidDateStr, maskText, memKey, norm, parseLocalDate, readAccounts, readSubcats, removeUserSubcat, renameUserSubcat, revealFocus, subKey, subName, today, tripName, tripTotals, validateBill, walletId, walletName, writeSubcats } from "../App.jsx";

// Run 42: the amount box also takes simple arithmetic ("45 - 20", "12.5 x 3"); amountOf gives the number either way (null when not valid).
const EXPR_TEXT=/[+*\/×÷]|[0-9.,)]\s*[-−]\s*[0-9.,(]/;
export const isExprText=(s)=>EXPR_TEXT.test(String(s||""));
const cleanExprText=(s)=>String(s||"").replace(/[^0-9.,+\-−*\/×÷() ]/g,"").slice(0,40);
const amountOf=(txt)=>isExprText(txt) ? evalAmountExpr(txt) : formMoney(txt,{positive:true});
// ─── Recurring Hub ────────────────────────────────────────────────────────────
// Run 12: the bill form — add a bill, or edit / pause / delete one. The due date is the user's: the bill is expected on it
// and then every week / two weeks / month / year (a day past a month's end falls on that month's last day).
// Deleting a bill keeps all its payments; they just stop pointing to it.
export function BillSheet({ bill, currency, onSave, onDelete, onClose, showToast }) {
  const isNew=!bill || bill.prefill===true;   // Run 50: a suggested bill arrives pre-filled but is still a NEW bill
  const [name,setName]=useState(bill?.name||""), [type,setType]=useState(bill?.type||"expense"), [amount,setAmount]=useState(bill?String(bill.amount):"");
  const [category,setCategory]=useState(bill?.category||"housing"), [freq,setFreq]=useState(bill?.freq||"monthly");
  const [anchor,setAnchor]=useState(bill?.anchorDate||today()), [active,setActive]=useState(bill?bill.active!==false:true);
  const [endDate,setEndDate]=useState(bill?.endDate||"");
  // Run 75: subscription, other repeating payment, or decided by the app ("auto": no kind stored)
  const [kind,setKind]=useState(bill?.kind==="sub"||bill?.kind==="bill" ? bill.kind : "auto");
  const cats=pickerCats(type==="income",readCatPrefs(),[bill?.category,category]);   // Run 36: user's order; hidden ones only if this bill uses it
  const save=()=>{
    const b=validateBill({ id:bill?.id||"tmp", name, type, category:cats.some(c=>c.id===category)?category:cats[0].id, subcategory:bill?.subcategory||"",
      amount:formMoney(amount,{positive:true}), freq, anchorDate:anchor, ...(bill && anchor===bill.anchorDate && bill.dueDay ? { dueDay:bill.dueDay } : {}), endDate, active, createdAt:bill?.createdAt||new Date().toISOString(), ...(type==="expense"&&kind!=="auto" ? { kind } : {}) });
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
            <PickSelect id="bill-freq" className="field-input field-select" value={freq} onChange={e=>setFreq(e.target.value)}>{["weekly","biweekly","monthly","yearly"].map(f=><option key={f} value={f}>{t("freqCap."+f)}</option>)}</PickSelect></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="field-lbl" htmlFor="bill-cat">{t("add.category")}</label>
            <PickSelect id="bill-cat" className="field-input field-select" value={cats.some(c=>c.id===category)?category:cats[0].id} onChange={e=>setCategory(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}</option>)}</PickSelect></div>
          <div className="field"><label className="field-lbl" htmlFor="bill-date">{t(isNew?"bill.firstDue":"bill.dueFrom")}</label><PickDate id="bill-date" className="field-input" lang={locale()} value={anchor} onChange={e=>setAnchor(e.target.value)}/>
            </div>
        </div>
        {type==="expense"&&(
          <div className="field"><label className="field-lbl" htmlFor="bill-kind">{t("bill.kind")}</label>
            <PickSelect id="bill-kind" className="field-input field-select" value={kind} onChange={e=>setKind(e.target.value)}>{["auto","sub","bill"].map(k=><option key={k} value={k}>{t("bill.kind."+k)}</option>)}</PickSelect>
            <div className="list-sub" style={{marginTop:4}}>{t("bill.kindSub")}</div></div>
        )}
        <div className="field"><label className="field-lbl" htmlFor="bill-end">{t("bill.endDate")}</label><PickDate id="bill-end" className="field-input" lang={locale()} value={endDate} min={isValidDateStr(anchor)?anchor:undefined} onChange={e=>setEndDate(e.target.value)}/>
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
// Run 50 (owner list #2): "bolt 12, market 25 yesterday" -> a review list -> one tap saves them all. Nothing is saved before that tap;
// a row the parser could not read is shown with the reason and is never saved. Local parsing only.
function QuickTextPanel({ currency, memory, onSaveMany }) {
  const [open, setOpen] = useState(false), [text, setText] = useState("");
  const rows=useMemo(()=>open&&text.trim() ? parseQuickText(text,memory||{}) : [],[open,text,memory]);
  const good=rows.filter(r=>r.ok);
  return (
    <div className="qt" data-section="qt" style={{margin:"0 0 12px"}}>
      <button type="button" className="btn btn-ghost btn-sm" data-section="qt-toggle" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>{t(open?"qt.hide":"qt.show")}</button>
      <Collapse open={open} id="qt-body">
        <div className="field" style={{marginTop:8}}>
          <label className="field-lbl" htmlFor="qt-text">{t("qt.label")}</label>
          <textarea id="qt-text" data-section="qt-input" className="input" rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder={t("qt.example")} style={{width:"100%",resize:"vertical"}}/>
          <div className="list-sub">{t("qt.help")}</div>
        </div>
        {rows.length>0&&(<div data-section="qt-rows" role="list" aria-label={t("qt.review")}>
          {rows.map((r,i)=>(
            <div key={i} role="listitem" className="list-row" data-ok={r.ok} style={{opacity:r.ok?1:0.7,alignItems:"center"}}>
              <div style={{flex:1,minWidth:0}}>
                <div className="list-title">{r.ok ? (r.merchant||t(r.type==="income"?"qt.income":"qt.noName")) : r.raw}</div>
                <div className="list-sub">{r.ok ? `${r.type==="income"?"+":"−"}${fmt(r.amount,currency)} · ${catName(r.category)} · ${fmtDate(r.date)}${r.warn?" · "+t("qt.check"):""}` : t(r.reason==="noAmount"?"qt.noAmount":"qt.badAmount")}</div>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-primary btn-full" data-section="qt-save" disabled={!good.length} style={{marginTop:8}} onClick={()=>{ onSaveMany(good); setText(""); }}>{tn("qt.save",good.length)}</button>
        </div>)}
      </Collapse>
    </div>
  );
}

export function AddEditOverlay({ leaving, templates, currency, transactions, bills=[], prefill, editId, merchantMemory, onSave, onSaveMany, onClose, onOtherKind, onRenameSub }) {
  // Run 12: which bill a recurring entry pays. Offered only when every recurring payment is already linked to a bill
  // (nothing inferred the old way); otherwise the entry is grouped as before, so it can't start a second copy of a bill
  // that is still inferred. "new" makes a bill from this entry; an id links to that bill.
  const hasInferred=useMemo(()=>buildSchedules(transactions,bills).some(s=>!s.billId),[transactions,bills]);
  const [billChoice, setBillChoice] = useState(prefill?.billId||(hasInferred?"auto":"new"));
  const [askBill, setAskBill] = useState(null);   // a same-name bill exists: ask before making another one
  const isEditing=!!editId;
  const [type,     setType]     = useState(prefill?.type||"expense");
  // Run 39: paid in another currency. fxCur "" = the ledger's own currency. An entry that already has fx opens in that currency and rate.
  const baseCode=ledgerCode(currency), fxOk=!!baseCode, pfx0=fxOk?cleanFx(prefill?.fx):null, pfx=pfx0&&pfx0.cur!==baseCode?pfx0:null;   // Run 53: any ledger currency a rate exists for
  const fxCodes=(baseCode==="AZN"?FX_CODES:["AZN",...FX_CODES]).filter(c=>c!==baseCode);
  const [fxSaved, setFxSaved]=useState(null);   // Run 53: no internet: the newest rate this phone already holds, offered with its date
  const [amount,   setAmount]   = useState(pfx?String(pfx.amt):prefill?.amount?String(prefill.amount):"");
  // Run 75: the largest the amount may be drawn; smaller on narrow phones so it never hides behind the calculator keys
  const amtCap=(typeof window!=="undefined" && window.innerWidth<=360) ? 38 : 50;
  const [fxCur, setFxCur]=useState(pfx?pfx.cur:"");
  const [fxPick, setFxPick]=useState(false);
  const [fxRate, setFxRate]=useState(pfx?{ rate:pfx.rate, on:pfx.on, src:pfx.src }:null);
  const [fxState, setFxState]=useState(pfx?"ok":"idle");   // idle | loading | ok | fail
  const [fxOwn, setFxOwn]=useState(!!(pfx&&pfx.src==="manual"));   // the person types the rate
  const [fxManual, setFxManual]=useState(pfx&&pfx.src==="manual"?String(pfx.rate):"");
  const fxKey=useRef(pfx?pfx.cur+"|"+(prefill?.date||""):"");
  // Run 36: a new entry starts on the first category the user shows (Food / Salary unless they reordered or hid them).
  // Run 38: the picker order = the user's own order if they arranged one, otherwise most used in the last 90 days first (fixed while the form is open).
  const deskOrder=(ty,keep)=>{ const prefs=readCatPrefs(), inc=ty==="income", l=pickerCats(inc,prefs,keep); return hasManualOrder(prefs,inc) ? l : frequentFirst(l,transactions); };
  const deskIds=useMemo(()=>({ expense:deskOrder("expense",[]).map(c=>c.id), income:deskOrder("income",[]).map(c=>c.id) }),[]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Run 42: with no order of their own, a new expense starts on what this person usually spends on at this time of day (slotCategory); an own order always wins.
  const slotCat=useMemo(()=>prefill||editId||hasManualOrder(readCatPrefs(),false) ? null : slotCategory(transactions),[]);   // eslint-disable-line react-hooks/exhaustive-deps
  const firstCat=(ty)=>{ const ids=deskIds[ty==="income"?"income":"expense"]; return (ty!=="income" && slotCat && ids.includes(slotCat)) ? slotCat : (ids[0]||(ty==="income"?"salary":"food")); };
  const [catId,    setCatId]    = useState(()=>prefill?.category||firstCat(prefill?.type||"expense"));
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
  const [spreadOwn, setSpreadOwn] = useState(false), [spreadText, setSpreadText] = useState("");   // Run 53: "Other": a typed number of months
  const [spread, setSpread] = useState(spreadMonths(prefill?.spread));   // Run 41: 0 = not spread; otherwise the number of months the cost is shown over
  // Run 43: part of an expense others will pay back (reimb = { amt, who }). Text while typing; empty = none.
  const [reimbAmt, setReimbAmt] = useState(cleanReimb(prefill?.reimb) ? String(cleanReimb(prefill.reimb).amt) : "");
  const [reimbWho, setReimbWho] = useState(cleanReimb(prefill?.reimb)?.who || "");
  const accData=useMemo(()=>readAccounts(),[]);   // Run 24: optional account (card, cash...) the entry belongs to
  const [account, setAccount] = useState(accId(prefill?.account));
  // Run 36: a refund can say which kind of spending it gives money back to; then it lowers that category's spending instead of counting as money in.
  const [refundFor, setRefundFor] = useState(typeof prefill?.refundFor==="string" ? prefill.refundFor : "");
  const knownTrips=useMemo(()=>tripTotals(transactions).map(x=>x.name),[transactions]);
  // Run 16: the user's own subcategory suggestions (separate storage key; entries keep the text itself).
  const [mySubs, setMySubs] = useState(()=>readSubcats());
  const [newSub, setNewSub] = useState(null);   // null = closed; otherwise the text being typed
  const [subMsg, setSubMsg] = useState("");
  const saveMySubs=(m)=>{ setMySubs(m); if (!writeSubcats(m)) setSubMsg(t("subcat.saveFailed")); };
  // Run 51: removing one of your own subcategories can be undone; it goes back to the place it had in the list.
  const removeMySub=(s)=>{
    const cat=catId, index=(mySubs[cat]||[]).findIndex(x=>subKey(x)===subKey(s));
    saveMySubs(removeUserSubcat(mySubs,cat,s));
    offerUndo(t("subcat.removed",{name:s}),()=>{
      const cur=readSubcats(), mine=cur[cat]||[];
      if (mine.some(x=>subKey(x)===subKey(s))) return;
      const list=mine.slice(); list.splice(Math.min(Math.max(index,0),list.length),0,s);
      const next={ ...cur, [cat]:list };
      if (writeSubcats(next)) setMySubs(readSubcats()); else setSubMsg(t("subcat.saveFailed"));
    });
  };
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
  const initial=useRef({ type, amount, catId, subcat, merchant, note, date, recur, freq, wallet, trip, account, refundFor, fxCur, spread, reimbAmt, reimbWho }).current;
  const [askDiscard, setAskDiscard] = useState(false);
  const defaultCat=type===initial.type ? initial.catId : firstCat(type);
  const dirty=amount!==initial.amount || subcat!==initial.subcat || merchant!==initial.merchant || note!==initial.note ||
    date!==initial.date || recur!==initial.recur || (recur && freq!==initial.freq) || catId!==defaultCat || wallet!==initial.wallet || trip!==initial.trip || account!==initial.account || refundFor!==initial.refundFor || fxCur!==initial.fxCur || spread!==initial.spread || reimbAmt!==initial.reimbAmt || reimbWho!==initial.reimbWho;
  const requestClose=()=>{ if (dirty) setAskDiscard(true); else onClose(); };

  const expCats=CATEGORIES.filter(c=>!c.income);
  // Run 36: the pickers follow the user's order and hide what they hid; the entry's own category (when editing) is always offered.
  const pickList=(()=>{ const l=pickerCats(type==="income",readCatPrefs(),[prefill?.category,catId]), pos=new Map(deskIds[type==="income"?"income":"expense"].map((id,i)=>[id,i])); return l.map((c,i)=>({c,k:pos.has(c.id)?pos.get(c.id):1e6+i})).sort((a,b)=>a.k-b.k).map(x=>x.c); })();
  const [catQ,setCatQ]=useState("");
  const catHits=searchCats(pickList,catQ,mySubs);
  const displayCats=catHits.map(h=>h.cat);
  const selectedCat=CAT(catId);
  const moreSummary=[merchant.trim(), note.trim(), wallet?walletName(wallet):"", date&&date!==today()&&isValidDateStr(date)?fmtDate(date):"", recur?t("freqCap."+freq):""].filter(Boolean).join(" · ");

  useEffect(()=>{ setTimeout(()=>amtRef.current?.focus(),60); },[]);
  // Run 58: the subcategory resets with the category (it used to stay, so an expense's "Coffee" could be saved on a Salary entry)
  useEffect(()=>{ if(!prefill) { setCatId(firstCat(type)); setSubcat(""); } setCatQ(""); },[type]);

  const merchantMatches=useMemo(()=>{
    if (!merchant.trim()) return [];
    const q=lc(merchant);
    // Only suggest what the user previously recorded as this same transaction type
    const wantType=type==="income"?"income":"expense";
    // the person's own history first; the built-in list (Run 42) only fills what is left
    const own=Object.values(merchantMemory).filter(m=>m.type===wantType&&lc(m.merchant).startsWith(q)).slice(0,4), seen=new Set(own.map(m=>lc(m.merchant)));
    return [...own, ...knownMerchants(merchant,wantType).filter(m=>!seen.has(lc(m.merchant)))].slice(0,4);
  },[merchant,merchantMemory,type]);

  // Run 42: when the whole merchant name is one this person has used before (or a well-known place) and the category is still the untouched default, the category follows at once.
  const [autoNote,setAutoNote]=useState("");   // the category that was set from the name; the note below the field shows only while it is still the chosen one
  const autoCategory=()=>{
    if (isEditing || prefill || catId!==defaultCat || subcat || !merchant.trim()) return;
    const hit=merchantMemory[memKey(type,merchant)] || (type!=="income" ? knownMerchantExact(merchant) : null);
    if (hit && hit.category && hit.category!==catId && CAT(hit.category)) { setCatId(hit.category); setSubcat(hit.subcategory||""); setAutoNote(hit.category); }
  };
  const applySuggestion=(sug)=>{
    setMerchant(sug.merchant);
    setCatId(sug.category||catId);
    setSubcat(sug.subcategory||"");
    setShowMerchantSugs(false);
  };

  // S0: Duplicate detection uses createdAt, not date
  const isDupe=useMemo(()=>{
    const amt=amountOf(amount);
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

  // Run 39: the rate for the entry's day, looked up once per currency and day (or typed by the person).
  useEffect(()=>{
    if (!fxCur) return undefined;
    const k=fxCur+"|"+date; if (k===fxKey.current && fxRate) return undefined;
    fxKey.current=k; let alive=true; setFxState("loading");
    setFxSaved(null);
    fetchLedgerRate(fxCur,date,baseCode).then(r=>{ if (alive) { setFxRate({ ...r, src:"cbar" }); setFxState("ok"); } }).catch(()=>{ if (alive) { setFxRate(null); setFxState("fail"); setFxSaved(lastSavedRate(fxCur,baseCode)); } });
    return ()=>{ alive=false; };
  },[fxCur,date]);   // eslint-disable-line react-hooks/exhaustive-deps
  const fxManualRate=(()=>{ const s=String(fxManual||"").trim().replace(",","."); if (!/^\d{1,6}(\.\d{1,6})?$/.test(s)) return null; const n=Number(s); return n>0 ? n : null; })();   // a rate may have up to 6 decimals
  const fxEff=!fxCur ? null : (fxOwn||fxState==="fail") ? (fxManualRate>0 && fxManualRate<=1e5 ? { rate:Number(fxManualRate.toPrecision(6)), on:isValidDateStr(date)?date:today(), src:"manual" } : null) : (fxState==="ok" ? fxRate : null);
  const fxAmt=fxCur ? amountOf(amount) : null;
  const fxBase=fxEff && fxAmt!==null ? fxToBase(fxAmt,fxEff.rate) : null;
  // Run 41: "how many hours of my work is this?" Only for expenses, only when the user set their monthly hours and has earned income on record.
  const perHour=useMemo(()=>incomePerHour(transactions,readWorkHours()),[transactions]);
  const hoursTxt=(()=>{ if (type!=="expense" || !perHour) return ""; const b=fxCur ? fxBase : amountOf(amount); const h=hoursOfWork(b,perHour); return h===null ? "" : t("work.line",{ hours:String(h) }); })();

  const submit=(override)=>{
    const typed=amountOf(amount);
    if (typed===null) { setErr(t("add.errAmount")); return; }
    if (!isValidDateStr(String(date||""))) { setErr(t("add.errDate")); return; }
    // Run 39: in another currency the ledger keeps the manat amount and remembers what was paid and at which rate
    if (fxCur && !fxEff) { setErr(t(fxState==="loading"?"fx.waitRate":"fx.needRate")); return; }
    const amt=fxCur ? fxToBase(typed,fxEff.rate) : typed;
    if (!(amt>0)) { setErr(t("add.errAmount")); return; }
    const fx=fxCur ? { cur:fxCur, amt:typed, rate:fxEff.rate, on:fxEff.on, src:fxEff.src } : null;
    // Run 43: money others will pay back. Empty = none; a typed amount must be a real amount and at most the total.
    const rTyped=reimbAmt.trim() ? amountOf(reimbAmt) : 0;
    if (type==="expense" && !recur && reimbAmt.trim()) {
      if (rTyped===null) { setErr(t("reimb.errAmt")); return; }
      if (Math.round(rTyped*100)>Math.round(amt*100)) { setErr(t("reimb.errMore")); return; }
    }
    const reimb=type==="expense" && !recur && rTyped>0 ? { amt:rTyped, who:reimbWho.trim().slice(0,40) } : null;
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
    onSave({type,amount:amt,category:catId,subcategory:subcat,merchant:merchant.trim(),note:note.trim(),date,recurring:recur,recurFreq:recur?(chosenBill?chosenBill.freq:freq):null,isActive,wallet,trip:tripName(trip),account,refundFor:type==="income"&&catId==="refund"?refundFor:"",fx,spread:type==="expense"&&!recur?spread:0,reimb,reimbFor:isEditing&&type==="income"&&catId==="refund"?prefill?.reimbFor:undefined,
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
        {!editId&&!prefill&&onSaveMany&&<QuickTextPanel currency={currency} memory={merchantMemory} onSaveMany={onSaveMany}/>}
        {/* Run 75: on narrow phones (≤360 px) the amount is drawn at most 38 px tall, so "0.00" fits beside the calculator keys (it was cut off) */}
        <div className="amount-zone" onClick={()=>amtRef.current?.focus()}>
          <div className="amount-line">
            <input ref={amtRef} className="amount-input" type="text" inputMode="decimal" autoComplete="off" autoFocus={!editId}
              placeholder="0.00" value={amount} onChange={e=>{ const v=e.target.value; setAmount(isExprText(v) ? cleanExprText(v) : cleanMoneyText(v)); setErr(""); }}
              onPaste={e=>{ const p=(e.clipboardData&&e.clipboardData.getData("text"))||""; if (!p) return; e.preventDefault(); setAmount(isExprText(p) ? cleanExprText(p) : cleanMoneyText(p,{paste:true})); setErr(""); }}
              min="0" step="0.01" aria-label={t("add.amount")} aria-invalid={!!err&&err===t("add.errAmount")}
              style={{width:`${Math.max(4.3,Math.min(14,String(amount||"0.00").length*1.08))}ch`,fontSize:`${Math.max(30,Math.min(amtCap,240/(Math.max(4,String(amount||"0.00").length)*0.62)))}px`}}/>
            {fxOk
              ? <button type="button" className="amount-cur amount-cur-btn" data-section="fx-cur" aria-expanded={fxPick} aria-label={t("fx.choose")+": "+(fxCur||currency)} onClick={e=>{ e.stopPropagation(); setFxPick(p=>!p); }}>{fxCur||currency} <Icon name={fxPick?"chevUp":"chevDown"} size={11}/></button>
              : <span className="amount-cur">{currency}</span>}
          </div>
          {/* Run 42: simple arithmetic in the amount (45 - 20): the four sign buttons add to the text, the line under it shows the result as you type */}
          {isExprText(amount) && <div className="list-sub" data-section="amt-expr" role="status" style={{textAlign:"center",marginTop:2}}>{(()=>{ const v=evalAmountExpr(amount); return v===null ? t("calc.bad") : "= "+fmt(v,fxCur||currency); })()}</div>}
          <div className="calc-row" data-section="amt-ops" role="group" aria-label={t("calc.group")} onClick={e=>e.stopPropagation()}>
            {[["+","calc.plus"],["−","calc.minus"],["×","calc.times"],["÷","calc.divide"]].map(([sym,k])=>(
              <button key={sym} type="button" className="calc-key" data-op={sym} aria-label={t(k)} disabled={!/[0-9)]$/.test(String(amount).trim())}
                onClick={()=>{ setAmount(a=>cleanExprText(String(a).trim()+sym)); setErr(""); amtRef.current?.focus(); }}>{sym}</button>
            ))}
          </div>
        </div>
        {/* Run 39: paid in another currency — choose it; the official rate of that day turns it into manat */}
        <Collapse open={fxPick} id="fx-pick">
          <div className="sub-strip" role="radiogroup" aria-label={t("fx.choose")} data-section="fx-list" style={{flexWrap:"wrap",overflowX:"visible",justifyContent:"center",marginBottom:8}}>
            {["",...fxCodes].map(c=>(<button key={c||"base"} type="button" role="radio" aria-checked={fxCur===c} data-fx={c||"base"} className={`sub-chip${fxCur===c?" sel":""}`} onClick={()=>{ setFxCur(c); setFxPick(false); if (!c) { setFxOwn(false); setFxState("idle"); } }}>{c||currency}</button>))}
          </div>
        </Collapse>
        {/* Run 40: the conversion line eases open and closed with the currency (it used to pop in and vanish) */}
        <Reveal when={fxCur} id="fx-line-wrap">{(fxCur)=>(
          <div className="list-sub" data-section="fx-line" role="status" style={{textAlign:"center",marginBottom:10,lineHeight:1.5}}>
            {fxBase!==null ? t("fx.line",{ base:fmt(fxBase,currency), cur:fxCur, rate:String(fxEff.rate), sym:currency, date:fxEff.on?fmtDate(fxEff.on):"" }) : fxState==="loading" ? t("fx.loading") : fxState==="ok"&&!fxOwn ? t("fx.rateOnly",{ cur:fxCur, rate:String(fxRate.rate), sym:currency, date:fxRate.on?fmtDate(fxRate.on):"" }) : ""}
            {fxEff&&<div style={{fontSize:11}}>{t(fxEff.src==="manual"?"fx.srcOwn":baseCode==="AZN"?"fx.srcCbar":"fx.srcCross")}</div>}
            {fxState==="fail"&&!fxOwn&&<div role="alert" style={{color:"var(--warn)"}}>{t("fx.fail")}</div>}
            {/* Run 53: no internet, but the phone holds an earlier official rate: it is offered with its date, and used only on a tap */}
            {fxState==="fail"&&!fxOwn&&fxSaved&&(
              <button type="button" className="chip" data-section="fx-saved" style={{marginTop:6,whiteSpace:"normal",height:"auto",minHeight:36,textAlign:"center"}} onClick={()=>{ setFxRate({ rate:fxSaved.rate, on:fxSaved.on, src:"cbar" }); setFxState("ok"); }}>{t("fx.useSaved",{ cur:fxCur, rate:String(fxSaved.rate), sym:currency, date:fmtDate(fxSaved.on) })}</button>)}
            {(fxOwn||fxState==="fail") ? (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:6}}>
                <label htmlFor="fx-manual">{t("fx.ownLabel",{ cur:fxCur })}</label>
                <input id="fx-manual" className="field-input" inputMode="decimal" autoComplete="off" style={{width:110,minHeight:36,padding:"6px 8px"}} value={fxManual} placeholder={fxRate?String(fxRate.rate):"0.0000"} onChange={e=>setFxManual(e.target.value.replace(/[^0-9.,]/g,""))}/>
                <span>{currency}</span>
              </div>
            ) : fxState==="ok"&&<button type="button" className="chip" data-section="fx-own" style={{marginTop:6}} onClick={()=>{ setFxOwn(true); setFxManual(String(fxRate.rate)); }}>{t("fx.useOwn")}</button>}
          </div>
        )}</Reveal>
        <Reveal when={hoursTxt} id="work-line-wrap">{(txt)=>(<div className="list-sub" data-section="work-line" style={{textAlign:"center",marginBottom:10}}>{txt}</div>)}</Reveal>
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
          {pickList.length>10&&(
            <input type="search" className="field-input" data-section="add-cat-search" aria-label={t("cat.search")} placeholder={t("cat.search")} value={catQ} onChange={e=>setCatQ(e.target.value)} style={{marginBottom:8}}/>
          )}
          <div className="cat-scroll">
            {catHits.map(({cat,sub})=>(
              <button key={cat.id} className={`cat-tile${catId===cat.id?" sel":""}`} aria-pressed={catId===cat.id} aria-label={catName(cat.id)+(sub?" · "+subName(sub):"")} onClick={()=>{setCatId(cat.id);setSubcat(sub||"");}}>
                <CatIcon catId={cat.id} size={18} color={catId===cat.id?cat.color:undefined}/>
                <span className="cat-tile-name">{catTile(cat.id)}</span>
                {sub&&<span className="cat-tile-name" style={{fontSize:10,opacity:0.75}}>{subName(sub)}</span>}
              </button>
            ))}
          </div>
          {/* Run 40: these notes and the refund link ease in and out (they used to pop) */}
          <Collapse open={!!catQ.trim()&&!catHits.length}><div className="list-sub" role="status" data-section="add-cat-none" style={{marginTop:6}}>{t("cat.searchNone")}</div></Collapse>
          {/* Run 58: where people often look for something that lives in another category ("Electricity, gas and water are under Home") */}
          <Collapse open={!catQ.trim()&&!!catHint(catId)}><div className="list-sub" data-section="add-cat-hint" style={{marginTop:6}}>{catHint(catId)}</div></Collapse>
          <Collapse open={type==="income"&&CAT(catId).earned===false}><div className="list-sub" data-section="add-not-income" style={{marginTop:6}}>{t(catId==="refund"&&refundFor?"add.refundNets":"add.notIncome")}</div></Collapse>
          <Collapse open={type==="income"&&catId==="refund"}>
            <div className="field" data-section="add-refund-for" style={{marginTop:8,marginBottom:0}}>
              <label className="field-lbl" htmlFor="txn-refund-for">{t("add.refundFor")} {optional}</label>
              <PickSelect id="txn-refund-for" className="field-input field-select" value={expCats.some(c=>c.id===refundFor)?refundFor:""} onChange={e=>setRefundFor(e.target.value)}>
                <option value="">{t("add.refundForNone")}</option>
                {expCats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}</option>)}
              </PickSelect>
            </div>
          </Collapse>
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
                    <button type="button" className="sub-chip-x" aria-label={t("subcat.remove",{name:s})} style={{background:"none",border:"none",color:"var(--ink-4)",cursor:"pointer",padding:"6px 4px",minWidth:24,minHeight:24}} onClick={()=>removeMySub(s)}>×</button>
                  </span>
                ))}
                {/* Run 58: an older entry whose subcategory is no longer offered here (e.g. "Fuel" under Transport) keeps it, shown and selected */}
                {subcat&&!(selectedCat?.subs||[]).includes(subcat)&&!(mySubs[catId]||[]).includes(subcat)&&(
                  <button key={"keep-"+subcat} className="sub-chip sel" data-section="add-subcat-kept" aria-pressed={true} onClick={()=>setSubcat("")}>{subName(subcat)}</button>
                )}
                {(selectedCat?.subs||[]).map(s=>(
                  <button key={s} className={`sub-chip${subcat===s?" sel":""}`} aria-pressed={subcat===s} onClick={()=>setSubcat(subcat===s?"":s)}>{subName(s)}</button>
                ))}
              </div>
              <Reveal when={renSub}>{(r)=>(
                <div style={{display:"flex",gap:7,marginTop:8}} data-section="add-subcat-rename-form">
                  <input className="field-input" ref={revealFocus} aria-label={t("subcat.rename",{name:r.from})} maxLength={SUBCAT_LEN} value={r.text} onChange={e=>{ setRenSub({...r,text:e.target.value}); setSubMsg(""); }} onKeyDown={e=>{ if (e.key==="Enter") { e.preventDefault(); renameMySub(); } }} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                  <button type="button" className="btn btn-sm btn-sm-primary" data-section="add-subcat-rename-save" onClick={renameMySub}>{t("common.save")}</button>
                  <button type="button" className="btn btn-sm" onClick={()=>{ setRenSub(null); setSubMsg(""); }} aria-label={t("common.cancel")}>✕</button>
                </div>
              )}</Reveal>
              <Collapse open={newSub!==null}>
                <div style={{display:"flex",gap:7,marginTop:8}}>
                  <input className="field-input" ref={revealFocus} aria-label={t("subcat.mine")} placeholder={t("subcat.ph")} maxLength={SUBCAT_LEN} value={newSub||""} onChange={e=>{ setNewSub(e.target.value); setSubMsg(""); }} onKeyDown={e=>{ if (e.key==="Enter") { e.preventDefault(); addMySub(); } }} style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                  <button type="button" className="btn btn-sm btn-sm-primary" onClick={addMySub}>{t("common.save")}</button>
                  <button type="button" className="btn btn-sm" onClick={()=>{ setNewSub(null); setSubMsg(""); }} aria-label={t("common.cancel")}>✕</button>
                </div>
              </Collapse>
              <Collapse open={!!subMsg}><div role="alert" className="list-sub" style={{marginTop:6,color:"var(--neg)"}}>{subMsg}</div></Collapse>
            </div>
          )}
        </div>

        {/* Run 17: the form shows what most entries need; the rest sits under one toggle (open when editing). */}
        <button type="button" className="more-toggle" data-section="add-more-toggle" aria-expanded={more} aria-controls="add-more-body" onClick={()=>setMore(m=>!m)}>
          <span className="more-toggle-main">{t(more?"add.lessDetails":"add.moreDetails")}</span>
          <span className="more-toggle-sub">{moreSummary||t("add.moreHint")}</span>
          <Icon name={more?"chevUp":"chevDown"} size={16}/>
        </button>
        {/* Run 38 (owner: "More details opens and closes instantly, and there's chaos"): the details ease open and closed (kept in the page, so
            what was typed stays), in a calm order: when, paid from, who, note, repeats, trip. */}
        <div id="add-more-body" data-section="add-more" className={"keep-collapse"+(more?" is-open":"")} aria-hidden={more?undefined:true}><div className="keep-collapse-in">
        <div className="field">
          <label className="field-lbl" htmlFor="txn-date">{t("add.date")}</label>
          <PickDate id="txn-date" className="field-input" lang={locale()} value={date} onChange={e=>setDate(e.target.value)}/>
          {/* Run 7, V3: the date box is the phone's own control and follows the phone's language, not the app's, so the chosen date is
              repeated here in the interface language. Display only: the stored value stays YYYY-MM-DD. */}
          
        </div>

        {/* Run 38 (owner: why offer cash / card / wallet when I added my own accounts?): with accounts, "Paid from" lists them (one tap);
            the plain cash / card / mobile choice is offered only to people without accounts. An entry's old payment tag is kept and shown. */}
        {accData.accounts.length>0 ? (
          <div className="field" role="radiogroup" aria-labelledby="txn-acc-lbl" data-section="add-account">
            <div className="field-lbl" id="txn-acc-lbl">{t(type==="income"?"wallet.labelIn":"acc.paidFrom")} {optional}</div>
            <div className="sub-strip" style={{flexWrap:"wrap",overflowX:"visible"}}>
              {accData.accounts.filter(a=>!a.hidden||a.id===account).map(a=>(
                <button key={a.id} type="button" role="radio" aria-checked={account===a.id} data-acc-pick={a.id} className={`sub-chip${account===a.id?" sel":""}`} onClick={()=>setAccount(account===a.id?"":a.id)}>{a.name}</button>
              ))}
              {wallet&&<button type="button" role="radio" aria-checked="true" className="sub-chip sel" data-section="add-old-wallet" title={t("wallet.label")} onClick={()=>setWallet("")}>{walletName(wallet)} ×</button>}
            </div>
          </div>
        ) : (
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
        )}

        <div className="field merchant-wrap">
          <label className="field-lbl" htmlFor="txn-merchant">{t(type==="income"?"add.merchantIn":"add.merchant")} {optional}</label>
          <input id="txn-merchant" className="field-input" placeholder={t("add.merchantPh")} autoComplete="off"
            value={merchant}
            onChange={e=>{setMerchant(e.target.value);setShowMerchantSugs(true);}}
            onBlur={()=>setTimeout(()=>{ setShowMerchantSugs(false); autoCategory(); },150)}
            onFocus={()=>setShowMerchantSugs(true)}/>
          {/* Merchant intelligence hint — shown when merchant is recognised */}
          {merchant.trim()&&!showMerchantSugs&&(()=>{
            const ml=lc(merchant.trim());
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
          {autoNote&&autoNote===catId&&!showMerchantSugs&&<div className="list-sub" data-section="auto-cat-note" role="status" style={{marginTop:4}}>{t("add.autoCat",{ cat:catName(catId) })}</div>}
          {showMerchantSugs&&merchantMatches.length>0&&(
            <div className="merchant-suggestions">
              {merchantMatches.map((m,i)=>(
                <div key={i} className="merchant-sug-item" onMouseDown={()=>applySuggestion(m)}>
                  <div>{m.merchant}</div>
                  <div className="merchant-sug-sub">{catName(m.category)}{m.subcategory?` / ${subName(m.subcategory)}`:""} · {m.builtin?t("add.knownPlace"):t("add.usedTimes",{n:m.count})}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label className="field-lbl" htmlFor="txn-note">{t("add.note")} {optional}</label>
          <input id="txn-note" className="field-input" placeholder={t("add.notePh")}
            value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>

        {/* Repeats: one row with its switch; the choices for a repeating entry slide open underneath (full width, no squeezing) */}
        <div className="field" style={{marginBottom:14}}>
          <div className="settings-row" style={{padding:"4px 0"}}>
            <div className="field-lbl" id="txn-rec-lbl" style={{margin:0}}>{t("add.recurring")}</div>
            <div className={`toggle-track${recur?" on":""}`} onClick={()=>setRecur(r=>!r)} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); setRecur(r=>!r); } }} role="switch" aria-checked={recur} aria-label={t("add.recurring")} tabIndex={0}>
              <div className="toggle-knob"/>
            </div>
          </div>
          <div className={"keep-collapse"+(recur?" is-open":"")} aria-hidden={recur?undefined:true}><div className="keep-collapse-in">
            {!bills.some(b=>b.id===billChoice&&b.type===type)&&(
              <div className="field" style={{marginTop:8,marginBottom:0}}>
                <label className="field-lbl" htmlFor="txn-freq">{t("add.frequency")}</label>
                <PickSelect id="txn-freq" className="field-input field-select" value={freq} onChange={e=>setFreq(e.target.value)} aria-label={t("add.frequency")}>
                  {["weekly","biweekly","monthly","yearly"].map(f=><option key={f} value={f}>{t("freqCap."+f)}</option>)}
                </PickSelect>
              </div>
            )}
            {(!hasInferred||bills.some(b=>b.type===type))&&(
              <div className="field" style={{marginTop:10,marginBottom:0}}>
                <label className="field-lbl" htmlFor="txn-bill">{t("bill.which")}</label>
                <PickSelect id="txn-bill" className="field-input field-select bill-choice" value={bills.some(b=>b.id===billChoice&&b.type===type)?billChoice:(hasInferred?"auto":"new")} onChange={e=>setBillChoice(e.target.value)}>
                  {hasInferred ? <option value="auto">{t("bill.autoGroup")}</option> : <option value="new">{t("bill.newFromEntry")}</option>}
                  {bills.filter(b=>b.type===type).map(b=><option key={b.id} value={b.id}>{maskText(b.name)} · {fmt(b.amount,currency)} · {t("freq."+b.freq)}</option>)}
                </PickSelect>
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
          </div></div>
        </div>

        {/* Run 22: optional trip / group, e.g. "Baku trip". Suggestions are the names already used. (Run 38: last, the rarest detail) */}
        <div className="field" data-section="add-trip">
          <label className="field-lbl" htmlFor="txn-trip">{t("trip.label")} {optional}</label>
          <input id="txn-trip" className="field-input" list="txn-trip-list" value={trip} maxLength={40} autoComplete="off" placeholder={t("trip.placeholder")} onChange={e=>setTrip(e.target.value)}/>
          <datalist id="txn-trip-list">{knownTrips.map(n=><option key={n} value={n}/>)}</datalist>
        </div>
        {/* Run 41: spread a big one-off cost over several months in the analytics; the cash still leaves on the date above */}
        <Collapse open={type==="expense"&&!recur} id="add-spread-wrap">
          <div className="field" data-section="add-spread">
            <label className="field-lbl" id="txn-spread-lbl">{t("spread.label")} {optional}</label>
            <div className="filter-bar" role="group" aria-labelledby="txn-spread-lbl" style={{flexWrap:"wrap",overflowX:"visible"}}>
              {[...new Set([0,3,6,12,spread])].sort((a,b)=>a-b).map(n=>(<button key={n} type="button" className={`chip${spread===n&&!spreadOwn?" on":""}`} aria-pressed={spread===n&&!spreadOwn} data-spread={n} onClick={()=>{ setSpread(n); setSpreadOwn(false); setSpreadText(""); }}>{n===0?t("spread.off"):tn("spread.months",n)}</button>))}
              {/* Run 53 (owner: "what if the user wants 4 months?"): any whole number of months from 2 to 24 */}
              <button type="button" className={`chip${spreadOwn?" on":""}`} aria-pressed={spreadOwn} aria-expanded={spreadOwn} data-spread="own" onClick={()=>{ setSpreadOwn(o=>!o); setSpreadText(spread>0?String(spread):""); }}>{t("spread.other")}</button>
            </div>
            <Collapse open={spreadOwn} id="add-spread-own-wrap">
              <div style={{marginTop:8}}>
                <label className="field-lbl" htmlFor="txn-spread-own">{t("spread.ownLabel")}</label>
                <input id="txn-spread-own" className="field-input" inputMode="numeric" autoComplete="off" maxLength={2} value={spreadText} aria-invalid={spreadText!==""&&!spreadMonths(spreadText)} aria-describedby="txn-spread-own-msg"
                  onChange={e=>{ const v=e.target.value.replace(/\D/g,"").slice(0,2); setSpreadText(v); setSpread(spreadMonths(v)); }}/>
                <div id="txn-spread-own-msg" role={spreadText!==""&&!spreadMonths(spreadText)?"alert":undefined} className="list-sub" style={{marginTop:4,color:spreadText!==""&&!spreadMonths(spreadText)?"var(--neg)":undefined}}>{spreadText!==""&&!spreadMonths(spreadText) ? t("spread.ownErr") : ""}</div>
              </div>
            </Collapse>
            <div className="list-sub" style={{lineHeight:1.5,marginTop:6}}>{spread>0 ? t("spread.on",{ months:spread, each:fmt(Math.floor(Math.round((amountOf(amount)||0)*100)/spread)/100,currency) }) : t("spread.hint")}</div>
          </div>
        </Collapse>
        {/* Run 43: part of this expense is for someone else who will pay it back; only the user's share counts in spending */}
        <Collapse open={type==="expense"&&!recur} id="add-reimb-wrap">
          <div className="field" data-section="add-reimb">
            <label className="field-lbl" htmlFor="txn-reimb-amt">{t("reimb.label")} {optional}</label>
            <div style={{display:"flex",gap:8}}>
              <input id="txn-reimb-amt" className="field-input" style={{flex:1,minWidth:0}} inputMode="decimal" autoComplete="off" placeholder={t("reimb.amt")} aria-label={t("reimb.amt")} value={reimbAmt} onChange={e=>setReimbAmt(e.target.value)}/>
              <input id="txn-reimb-who" className="field-input" style={{flex:1,minWidth:0}} maxLength={40} autoComplete="off" placeholder={t("reimb.who")} aria-label={t("reimb.who")} value={reimbWho} onChange={e=>setReimbWho(e.target.value)}/>
            </div>
            <div className="list-sub" data-section="add-reimb-note" style={{lineHeight:1.5,marginTop:6}}>{(()=>{ const a=amountOf(amount), r=reimbAmt.trim()?amountOf(reimbAmt):null; return a!==null && r!==null && r>0 && Math.round(r*100)<=Math.round(a*100) ? t("reimb.share",{ share:fmt(Math.round(a*100-r*100)/100,currency), back:fmt(r,currency) }) : t("reimb.hint"); })()}</div>
          </div>
        </Collapse>

        </div></div>
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

