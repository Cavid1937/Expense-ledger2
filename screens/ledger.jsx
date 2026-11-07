// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { useMemo, useRef, useState } from "react";
import { locale, t } from "../i18n.js";
import { CAT, CATEGORIES, CatIcon, Icon, SPLIT_MAX, lc, accId, accountName, activateKey, addAmt, buildSchedules, calcMerchantProfile, catName, catTotals, fmt, fmtDate, freshTxnId, maskText, monthName, parseLocalDate, parseMoney, splitTransaction, subName, tripName, tripTotals, walletId, walletName } from "../App.jsx";
import { LedgerArt } from "./home.jsx";

// ─── Shared transaction components ───────────────────────────────────────────
export const LEDGER_PAGE=150;   // Run 32: rows drawn at first and per "Show more" (a throttled phone froze for seconds drawing 300+ rows at once). Whole days only.
export function GroupedTxns({ txns, currency, onDelete, onEdit, onView, onLongPress, compact }) {
  const [cap,setCap]=useState(LEDGER_PAGE);
  const groups=useMemo(()=>{
    const g={}; txns.forEach(t=>{ (g[t.date]=g[t.date]||[]).push(t); });
    return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]));
  },[txns]);
  const { visible, left }=useMemo(()=>{   // the newest days until `cap` rows are reached; search and filters already ran on the full list
    let n=0; const out=[];
    for (const gr of groups) { if (n>=cap) break; out.push(gr); n+=gr[1].length; }
    return { visible:out, left:txns.length-n };
  },[groups,cap,txns.length]);
  return (
    <>
      {visible.map(([date,rows])=>{
        const dayTotal=rows.filter(t=>t.type==="expense").reduce(addAmt,0);
        return (
          <div key={date} className="txn-group">
            <div className="txn-date-hdr">
              <span className="txn-date-lbl">{fmtDate(date)}</span>
              {/* Run 31: the figure is what was SPENT that day (income is not in it); say so with a minus sign and for screen readers. */}
              {dayTotal>0&&<span className="txn-date-total" aria-label={t("ledger.daySpent",{amount:fmt(dayTotal,currency)})}>−{fmt(dayTotal,currency)}</span>}
            </div>
            <div className="txn-list">
              {rows.map(t=><TxnRow key={t.id} txn={t} currency={currency} onDelete={onDelete} onEdit={onEdit} onView={onView} onLongPress={onLongPress} compact/>)}
            </div>
          </div>
        );
      })}
      {left>0&&<button className="btn btn-ghost btn-full" data-section="tx-show-more" style={{marginTop:8}} onClick={()=>setCap(c=>c+LEDGER_PAGE)}>{t("ledger.showMore",{n:left})}</button>}
    </>
  );
}

export function TxnRow({ txn, currency, onDelete, onEdit, onView, onLongPress, compact }) {
  const cat=CAT(txn.category);
  // Press and hold a row (about half a second) to start selecting several; the tap that follows the hold is ignored.
  const hold=useRef({ timer:0, x:0, y:0, fired:false });
  const holdStart=(e)=>{ if (!onLongPress || (e.pointerType==="mouse" && e.button!==0)) return; const h=hold.current; h.fired=false; h.x=e.clientX; h.y=e.clientY; clearTimeout(h.timer); h.timer=setTimeout(()=>{ h.fired=true; try { navigator.vibrate&&navigator.vibrate(12); } catch { /* no vibration here */ } onLongPress(txn); },480); };
  const holdMove=(e)=>{ const h=hold.current; if (h.timer && (Math.abs(e.clientX-h.x)>10 || Math.abs(e.clientY-h.y)>10)) { clearTimeout(h.timer); h.timer=0; } };
  const holdEnd=()=>{ const h=hold.current; clearTimeout(h.timer); h.timer=0; };
  const isInc=txn.type==="income";
  const displayName=maskText(txn.merchant||txn.note)||catName(txn.category);
  const displaySub=[
    txn.merchant&&txn.note?maskText(txn.note):null,
    catName(txn.category),
    subName(txn.subcategory)||null,
    txn.wallet?walletName(txn.wallet):null,
    tripName(txn.trip)||null,
    !compact?fmtDate(txn.date):null,
  ].filter(Boolean).join(" · ");
  return (
    <div className={"txn-row"+(txn.id===freshTxnId?" txn-fresh":"")} onClick={()=>{ if (hold.current.fired) { hold.current.fired=false; return; } onView?.(txn); }} onPointerDown={holdStart} onPointerMove={holdMove} onPointerUp={holdEnd} onPointerCancel={holdEnd} onPointerLeave={holdEnd} onContextMenu={onLongPress?e=>e.preventDefault():undefined} {...(onView ? { role:"button", tabIndex:0, onKeyDown:activateKey(()=>onView(txn)) } : {})}>
      <div className="txn-ico" style={{background:(cat?.color||"#98A5B7")+"26"}}><CatIcon catId={txn.category} size={16} color={cat?.color}/></div>
      <div className="txn-body">
        <div className="txn-name">{displayName}</div>
        <div className="txn-sub">
          <span>{displaySub}</span>
          {txn.recurring&&<span className="rec-pill"><Icon name="repeat" size={9}/>{txn.recurFreq?t("freq."+txn.recurFreq):""}</span>}
          {accountName(txn.account)&&<span className="acc-pill" data-acc-pill="1">{accountName(txn.account)}</span>}
        </div>
      </div>
      <div className="txn-right">
        {/* Run 32: a screen reader skips or mis-reads the minus character, so the row says Income or Expense in words and the sign stays visual only. */}
        <div className={`txn-amt ${isInc?"inc":"exp"}`}><span className="sr-only">{isInc?t("add.income"):t("add.expense")}: </span><span aria-hidden="true">{isInc?"+":"−"}</span>{fmt(txn.amount,currency)}</div>
        {(onEdit||onDelete)&&!onView&&(
          <div className="txn-actions">
            {onEdit&&<button className="txn-act" onClick={e=>{e.stopPropagation();onEdit(txn);}} aria-label={t("common.edit")}><Icon name="edit" size={13}/></button>}
            {onDelete&&<button className="txn-act del" onClick={e=>{e.stopPropagation();onDelete(txn.id);}} aria-label={t("common.delete")}><Icon name="trash" size={13}/></button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ledger Page ──────────────────────────────────────────────────────────────
export function LedgerPage({ transactions, currency, onDelete, onDeleteMany, onEdit, onView, onAdd }) {
  const [selMode, setSelMode] = useState(false);          // Run 24: select several entries, then delete them together (undo stays available)
  const [picked,  setPicked]  = useState(()=>new Set());
  const [onlySel, setOnlySel] = useState(false);          // Run 29: show only the selected entries, whatever the filters say
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter,  setCatFilter]  = useState("all");
  const [tripFilter, setTripFilter] = useState("all");   // Run 22: "all" or a trip name (compared without case)
  const [walletFilter, setWalletFilter] = useState("all");   // Run 16: "all", a wallet id, or "none" (entries without one)
  const [accFilter,  setAccFilter]  = useState("all");   // Run 31: "all", an account id, or "none" (entries without an account)
  const [moreOpen,   setMoreOpen]   = useState(false);   // Run 31: trip / wallet / account filters sit behind one "More filters" chip
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [showDates,  setShowDates]  = useState(false);
  const [showCatSheet, setShowCatSheet] = useState(false);

  const filtered=useMemo(()=>{
    let list=[...transactions];                       // not "t": that name is the translation function used below
    if (search) {
      const q=search.toLowerCase().trim(),asNum=parseFloat(q);
      list=list.filter(x=>{
        if ((x.note||"").toLowerCase().includes(q)) return true;
        if ((x.merchant||"").toLowerCase().includes(q)) return true;
        if (x.category.toLowerCase().includes(q)) return true;
        if ((x.subcategory||"").toLowerCase().includes(q)) return true;
        if (!isNaN(asNum)&&Math.abs(x.amount-asNum)<0.01) return true;
        if (x.date.includes(q)) return true;
        if (CAT(x.category)?.name.toLowerCase().includes(q)) return true;
        if (catName(x.category).toLowerCase().includes(q)) return true;                 // name in the interface language too
        if (subName(x.subcategory||"").toLowerCase().includes(q)) return true;
        const mn=parseLocalDate(x.date).toLocaleDateString("en-GB",{month:"long"}).toLowerCase();
        if (mn.includes(q)) return true;
        const mi=parseLocalDate(x.date).getMonth()+1;                                  // month names in the interface language
        if (t("mon."+mi).toLowerCase().includes(q) || t("monGen."+mi).toLowerCase().includes(q)) return true;
        return false;
      });
    }
    if (typeFilter!=="all") list=list.filter(x=>x.type===typeFilter);
    if (catFilter!=="all")  list=list.filter(x=>x.category===catFilter);
    if (walletFilter!=="all") list=list.filter(x=>(walletId(x.wallet)||"none")===walletFilter);
    if (tripFilter!=="all") list=list.filter(x=>lc(tripName(x.trip))===lc(tripFilter));
    if (accFilter!=="all")  list=list.filter(x=>(accId(x.account)||"none")===accFilter);
    if (dateFrom)           list=list.filter(x=>x.date>=dateFrom);
    if (dateTo)             list=list.filter(x=>x.date<=dateTo);
    return list;
  },[transactions,search,typeFilter,catFilter,walletFilter,tripFilter,accFilter,dateFrom,dateTo,locale()]);
  const usedAccs=useMemo(()=>[...new Set(transactions.map(x=>accId(x.account)).filter(Boolean))],[transactions]);
  const hasUnsetAcc=useMemo(()=>transactions.some(x=>!accId(x.account)),[transactions]);
  // Run 22: trips in use with their totals; the trip filter is offered only when at least one entry has a trip.
  const trips=useMemo(()=>tripTotals(transactions),[transactions]);
  const catSel=useMemo(()=>catFilter==="all" ? null : catTotals(transactions,catFilter),[transactions,catFilter]);   // Run 24
  const tripSel=tripFilter==="all" ? null : trips.find(x=>lc(x.name)===lc(tripFilter)) || null;
  // Run 16: the wallet filter is offered only when at least one entry has a wallet, and lists only the wallets in use.
  const usedWallets=useMemo(()=>[...new Set(transactions.map(x=>walletId(x.wallet)).filter(Boolean))],[transactions]);
  const hasUnsetWallet=useMemo(()=>transactions.some(x=>!walletId(x.wallet)),[transactions]);

  // The category list offers only categories used by the chosen type (Expenses / Income), and changing the type drops a
  // category filter that type has no transactions in, instead of leaving an empty list.
  const catsFor=(ty)=>[...new Set(transactions.filter(x=>ty==="all"||x.type===ty).map(x=>x.category))];
  const usedCats=useMemo(()=>catsFor(typeFilter).map(id=>CAT(id)).filter(Boolean),[transactions,typeFilter]);
  const chooseType=(ty)=>{ setTypeFilter(ty); if (catFilter!=="all" && !catsFor(ty).includes(catFilter)) setCatFilter("all"); };
  const hasCatFilter=catFilter!=="all",hasDateFilter=dateFrom||dateTo;
  const hasMore=trips.length>0||usedWallets.length>0||usedAccs.length>0;
  const moreActive=(tripFilter!=="all"?1:0)+(walletFilter!=="all"?1:0)+(accFilter!=="all"?1:0);   // how many of the tucked-away filters are on
  const selectedCat=CAT(catFilter);

  if (transactions.length===0) return (
    <div className="empty">
      <div className="empty-icon"><LedgerArt/></div>
      <div className="empty-title">{t("ledger.emptyTitle")}</div>
      <div className="empty-body">{t("ledger.emptyBody")}</div>
      <button className="btn btn-primary btn-full" style={{maxWidth:220,marginTop:4}} onClick={onAdd}>{t("ledger.emptyBtn")}</button>
    </div>
  );

  return (
    <div>
      <div className="search-wrap">
        <span className="search-ico"><Icon name="search" size={14}/></span>
        <input className="search-input" placeholder={t("ledger.searchPh")} value={search} onChange={e=>setSearch(e.target.value)} aria-label={t("ledger.search")}/>
      </div>
      <div className="filter-bar">
        {["all","expense","income"].map(ty=>(
          <button key={ty} className={`chip${typeFilter===ty?" on":""}`} aria-pressed={typeFilter===ty} onClick={()=>chooseType(ty)}>{t("ledger.type."+ty)}</button>
        ))}
        <button className={`cat-filter-btn${hasCatFilter?" active":""}`} onClick={()=>setShowCatSheet(true)}>
          {hasCatFilter?<><CatIcon catId={catFilter} size={12}/>{catName(catFilter)}</>:<><Icon name="filter" size={12}/>{t("ledger.category")}</>}
          <Icon name="chevDown" size={11}/>
        </button>
        <button className={`chip${(showDates||hasDateFilter)?" on":""}`} aria-pressed={!!(showDates||hasDateFilter)} onClick={()=>setShowDates(s=>!s)}>
          <Icon name="calendar" size={11}/> {t("ledger.date")}
        </button>
        {hasMore&&(
          <button className={`chip${(moreOpen||moreActive>0)?" on":""}`} aria-pressed={moreOpen} aria-expanded={moreOpen} data-section="tx-more-toggle" onClick={()=>setMoreOpen(o=>!o)}>
            {t("ledger.more")}{moreActive>0?` · ${moreActive}`:""}<Icon name={moreOpen?"chevUp":"chevDown"} size={11}/>
          </button>
        )}
        {(hasCatFilter||hasDateFilter||typeFilter!=="all"||moreActive>0)&&(
          <button className="chip on" data-section="tx-clear" style={{background:"var(--neg-bg)",borderColor:"var(--neg-bg)",color:"var(--neg)"}}
            onClick={()=>{setCatFilter("all");setDateFrom("");setDateTo("");setTypeFilter("all");setWalletFilter("all");setTripFilter("all");setAccFilter("all");}}>{t("ledger.clear")} ×</button>
        )}
      </div>
      {moreOpen&&trips.length>0&&(
        <div className="filter-bar" role="group" aria-label={t("trip.filterLabel")} data-section="tx-trip-filter">
          {["all",...trips.map(x=>x.name)].map(n=>(
            <button key={n} className={`chip${tripFilter===n?" on":""}`} aria-pressed={tripFilter===n} onClick={()=>setTripFilter(n)}>{n==="all"?t("trip.filterAll"):n}</button>
          ))}
        </div>
      )}
      {catSel&&catSel.n>0&&(
        <div className="list-sub" data-section="tx-cat-totals" style={{margin:"2px 2px 8px"}}>
          <div style={{fontWeight:600}}>{t("cat.allTime",{total:fmt(catSel.total),n:catSel.n})}</div>
          {catSel.months.slice(0,12).map(m=><div key={m.month} data-month={m.month}>{t("cat.month",{month:monthName(m.month),total:fmt(m.total)})}</div>)}
        </div>
      )}
      {tripSel&&<div className="list-sub" data-section="tx-trip-total" style={{margin:"2px 2px 8px"}}>{t("trip.total",{name:tripSel.name,total:fmt(tripSel.total),n:tripSel.n})}</div>}
      {moreOpen&&usedWallets.length>0&&(
        <div className="filter-bar" role="group" aria-label={t("wallet.filterLabel")} data-section="tx-wallet-filter">
          {["all",...usedWallets,...(hasUnsetWallet?["none"]:[])].map(w=>(
            <button key={w} className={`chip${walletFilter===w?" on":""}`} aria-pressed={walletFilter===w} onClick={()=>setWalletFilter(w)}>{w==="all"?t("wallet.filterAll"):w==="none"?t("wallet.none"):walletName(w)}</button>
          ))}
        </div>
      )}
      {moreOpen&&usedAccs.length>0&&(
        <div className="filter-bar" role="group" aria-label={t("ledger.accFilter")} data-section="tx-acc-filter">
          {["all",...usedAccs,...(hasUnsetAcc?["none"]:[])].map(a=>(
            <button key={a} className={`chip${accFilter===a?" on":""}`} aria-pressed={accFilter===a} onClick={()=>setAccFilter(a)}>{a==="all"?t("ledger.accAll"):a==="none"?t("ledger.accNone"):accountName(a)}</button>
          ))}
        </div>
      )}
      {showDates&&(
        <div className="date-inputs">
          <label className="date-input-wrap"><span className="date-lbl">{t("ledger.from")}</span><input type="date" lang={locale()} className="date-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label>
          <label className="date-input-wrap"><span className="date-lbl">{t("ledger.to")}</span><input type="date" lang={locale()} className="date-input" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label>
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,margin:"2px 2px 12px"}}>
        <div className="list-sub">{t("ledger.countOf",{shown:filtered.length,total:transactions.length})}</div>
        <button className={`chip${selMode?" on":""}`} aria-pressed={selMode} data-section="tx-select-toggle" onClick={()=>{ setSelMode(s=>!s); setPicked(new Set()); setOnlySel(false); }}>{t(selMode?"ledger.selectDone":"ledger.select")}</button>
      </div>
      {filtered.length===0&&!(selMode&&picked.size>0)?(
        <div className="empty" style={{padding:"36px 0"}}>
          <div className="empty-icon"><Icon name="search" size={28}/></div>
          <div className="empty-title">{t("ledger.noResults")}</div>
          <div className="empty-body">{t("ledger.noResultsBody")}</div>
        </div>
      ):selMode?(()=>{
        // Run 29: the selection belongs to the whole ledger, not to the current filter: it stays when the search or filters change,
        // the sum line covers every selected entry, and "Selected only" shows exactly those entries.
        const shown=transactions.filter(x=>picked.has(String(x.id)));
        const allOn=filtered.length>0 && filtered.every(x=>picked.has(String(x.id)));
        const exp=shown.filter(x=>x.type==="expense").reduce(addAmt,0), inc=shown.filter(x=>x.type==="income").reduce(addAmt,0);
        const net=Math.round((inc-exp)*100)/100;
        const list=onlySel?shown:filtered;
        return (
          <div data-section="tx-select">
            <div className="filter-bar" style={{position:"sticky",top:0,zIndex:2,background:"var(--bg)",paddingBottom:6}}>
              <button className="chip" data-section="tx-select-all" onClick={()=>setPicked(p=>{ const n=new Set(p); filtered.forEach(x=>allOn?n.delete(String(x.id)):n.add(String(x.id))); return n; })}>{t(allOn?"ledger.selectNone":"ledger.selectAll",{n:filtered.length})}</button>
              <button className={`chip${onlySel?" on":""}`} aria-pressed={onlySel} data-section="tx-select-only" disabled={!shown.length&&!onlySel} onClick={()=>setOnlySel(s=>!s)}>{t("ledger.selOnly")}</button>
              <button className="chip on" data-section="tx-select-delete" disabled={!shown.length} style={{background:"var(--neg-bg)",borderColor:"var(--neg-bg)",color:"var(--neg)",opacity:shown.length?1:0.5}}
                onClick={()=>{ onDeleteMany(shown.map(x=>x.id)); setPicked(new Set()); setOnlySel(false); setSelMode(false); }}>{t("ledger.deleteSel",{n:shown.length})}</button>
            </div>
            <div className="list-sub" data-section="tx-select-sum" aria-live="polite" style={{margin:"0 2px 8px",fontWeight:shown.length?600:400}}>{shown.length?t("ledger.selSum",{n:shown.length,exp:fmt(exp,currency),inc:fmt(inc,currency),net:fmt(net,currency)}):t("ledger.selHint")}</div>
            <div className="txn-list">
              {list.map(x=>{ const on=picked.has(String(x.id)); return (
                <button key={x.id} className="list-row" role="checkbox" aria-checked={on} data-picked={on?"1":"0"} style={{width:"100%",textAlign:"left",font:"inherit",display:"flex",alignItems:"center",gap:10,background:on?"var(--accent-bg, rgba(0,0,0,0.05))":"none",border:"none",borderBottom:"1px solid var(--rule)",padding:"10px 4px",cursor:"pointer"}}
                  onClick={()=>setPicked(p=>{ const n=new Set(p); const k=String(x.id); n.has(k)?n.delete(k):n.add(k); return n; })}>
                  <span aria-hidden="true" style={{width:20,height:20,borderRadius:6,border:"2px solid var(--ink-3)",display:"inline-flex",alignItems:"center",justifyContent:"center",flex:"none"}}>{on?<Icon name="check" size={13}/>:null}</span>
                  <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{maskText(x.merchant||x.note)||catName(x.category)}</span><span className="list-sub">{fmtDate(x.date)}</span></span>
                  <span style={{fontWeight:600}}>{x.type==="income"?"+":"−"}{fmt(x.amount,currency)}</span>
                </button>); })}
            </div>
          </div>
        );
      })():(
        <GroupedTxns txns={filtered} currency={currency} onDelete={onDelete} onEdit={onEdit} onView={onView} onLongPress={x=>{ setSelMode(true); setPicked(new Set([String(x.id)])); }}/>
      )}
      {showCatSheet&&(
        <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&setShowCatSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1}aria-label={t("ledger.filterTitle")}>
            <div className="sheet-grip"><div className="sheet-handle"/></div>
            <div className="sheet-title">{t("ledger.filterTitle")}</div>
            {[{id:"all",color:"#98A5B7"},...usedCats].map(cat=>(
              <button key={cat.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",background:"none",border:"none",borderBottom:"1px solid var(--rule)",cursor:"pointer",width:"100%",textAlign:"left",font:"inherit"}}
                onClick={()=>{setCatFilter(cat.id==="all"?"all":cat.id);setShowCatSheet(false);}}>
                <div style={{width:34,height:34,borderRadius:8,background:(cat.color||"#98A5B7")+"26",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <CatIcon catId={cat.id} size={16} color={cat.color}/>
                </div>
                <span style={{fontSize:14,fontWeight:catFilter===cat.id?700:500,color:"var(--ink)",flex:1}}>{cat.id==="all"?t("ledger.allCategories"):catName(cat.id)}</span>
                {catFilter===cat.id&&<span style={{color:"var(--accent)",fontWeight:700,fontSize:12}} aria-label={t("common.selected")}>✓</span>}
              </button>
            ))}
            <button className="btn btn-ghost btn-full" style={{marginTop:14}} onClick={()=>setShowCatSheet(false)}>{t("common.close")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── S6: Transaction Detail Sheet with Merchant Intelligence ─────────────────
// Run 24: the split form inside the entry's detail sheet: pick a category and an amount per part; Save is enabled only when the parts add up exactly.
export function SplitPanel({ txn, currency, onSplit }) {
  const sameKind=CATEGORIES.filter(c=>c.income===(txn.type==="income"));
  const other=(sameKind.find(c=>c.id!==txn.category)||sameKind[0]).id;
  const [open,setOpen]=useState(false);
  const [parts,setParts]=useState([{ category:txn.category, amount:"" },{ category:other, amount:"" }]);
  const parsed=parts.map(p=>({ category:p.category, amount:parseMoney(p.amount)||0 }));
  const check=splitTransaction(txn,parsed,()=>0);
  const left=Math.round(txn.amount*100)-parsed.reduce((s,p)=>s+Math.round(p.amount*100),0);
  const set=(i,k,v)=>setParts(ps=>ps.map((p,j)=>j===i?{...p,[k]:v}:p));
  return (
    <div style={{marginBottom:8}} data-section="split">
      <button className="btn btn-ghost btn-full" data-section="split-open" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>{t("split.btn")}</button>
      {open&&(
        <div style={{marginTop:8}}>
          <div className="list-sub" style={{marginBottom:8}}>{t("split.sub",{ total:fmt(txn.amount,currency) })}</div>
          {parts.map((p,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
              <select className="field-input" style={{flex:1,minWidth:0}} aria-label={t("split.partCat",{ n:i+1 })} value={p.category} onChange={e=>set(i,"category",e.target.value)}>
                {sameKind.map(c=><option key={c.id} value={c.id}>{catName(c.id)}</option>)}
              </select>
              <input className="field-input" style={{width:110}} inputMode="decimal" aria-label={t("split.partAmt",{ n:i+1 })} placeholder="0.00" value={p.amount} onChange={e=>set(i,"amount",e.target.value)}/>
            </div>
          ))}
          <div className="list-sub" data-section="split-left" style={{marginBottom:8,fontWeight:600,color:left===0?"var(--pos)":"var(--ink-2)"}}>{t("split.left",{ amount:fmt(left/100,currency) })}</div>
          <div style={{display:"flex",gap:8}}>
            {parts.length<SPLIT_MAX&&<button className="btn btn-ghost" style={{flex:1}} data-section="split-add" onClick={()=>setParts(ps=>[...ps,{ category:other, amount:"" }])}>{t("split.add")}</button>}
            <button className="btn btn-primary" style={{flex:1}} data-section="split-save" disabled={!check.ok} onClick={()=>onSplit(parsed)}>{t("split.save")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TxnDetailSheet({ txn, currency, transactions, bills:billList=[], onClose, onEdit, onDuplicate, onSplit, onDelete, onLinkBill, onAssignBill }) {
  // Run 9: an ordinary (non-recurring) entry can be marked as the payment of an existing bill — only when the user picks the
  // bill. Same merchant and amount are never enough to link anything automatically.
  // Run 12: once every recurring payment has a bill ("explicit"), any entry can be linked to a bill, moved to another bill,
  // or made into a new bill; before that, the Run 9 behaviour (inferred schedules, ordinary entries only) is kept.
  const [showLink,setShowLink]=useState(false);
  const all=useMemo(()=>buildSchedules(transactions,billList),[transactions,billList]);
  const explicit=!!onAssignBill && !all.some(s=>!s.billId);
  const bills=useMemo(()=>explicit ? all.filter(x=>x.billId && x.type===txn.type && x.billId!==txn.billId)
    : (txn.recurring?[]:all.filter(x=>x.isActive&&x.type===txn.type)),[all,explicit,txn]);
  const myBill=txn.billId ? billList.find(b=>b.id===txn.billId) : null;
  const cat=CAT(txn.category)||{id:"other",name:txn.category,color:"#98A5B7"};
  const isInc=txn.type==="income";
  const profile=useMemo(()=>txn.merchant?calcMerchantProfile(txn.merchant,transactions):null,[txn.merchant,transactions]);

  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1}aria-label={maskText(txn.merchant||txn.note)||catName(txn.category)}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:(cat.color)+"26",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <CatIcon catId={cat.id} size={22} color={cat.color}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"var(--font)",fontSize:18,fontWeight:700,marginBottom:2,lineHeight:1.25,overflowWrap:"anywhere"}}>{maskText(txn.merchant||txn.note)||catName(txn.category)}</div>
            <div style={{fontSize:12,color:"var(--ink-3)"}}>{catName(txn.category)}{txn.subcategory?` / ${subName(txn.subcategory)}`:""} · {fmtDate(txn.date)}</div>
          </div>
          <button data-closer="1" onClick={onClose} aria-label={t("common.close")} style={{background:"none",border:"1px solid var(--rule)",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-3)",flexShrink:0}}><Icon name="close" size={13}/></button>
        </div>

        {/* Amount */}
        <div style={{textAlign:"center",padding:"14px 0 16px",borderTop:"1px solid var(--rule)",borderBottom:"1px solid var(--rule)",marginBottom:16}}>
          <div style={{fontFamily:"var(--font)",fontSize:"clamp(32px,11vw,42px)",fontWeight:700,letterSpacing:-1,overflowWrap:"anywhere",color:isInc?"var(--pos)":"var(--ink)",fontVariantNumeric:"tabular-nums"}}>{isInc?"+":"−"}{fmt(txn.amount,currency)}</div>
          <div style={{fontSize:12,color:"var(--ink-3)",marginTop:3}}>{t(txn.type==="income"?"add.income":"add.expense")}</div>
        </div>

        {/* Meta */}
        <div className="detail-meta" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[
            [t("add.date"),      fmtDate(txn.date)],
            [t("add.merchant"),  maskText(txn.merchant)||"—"],
            [t("add.category"),  catName(txn.category)+(txn.subcategory?` / ${subName(txn.subcategory)}`:"")],
            [t("add.recurring"), txn.recurring?(txn.recurFreq?t("freqCap."+txn.recurFreq):t("common.yes")):t("common.no")],
            ...(txn.wallet?[[t(txn.type==="income"?"wallet.labelIn":"wallet.label"), walletName(txn.wallet)]]:[]),
          ].map(([lbl,val])=>(
            <div key={lbl} style={{background:"var(--bg-warm)",borderRadius:12,padding:"11px 13px"}}>
              <div style={{fontSize:12,fontWeight:500,color:"var(--ink-3)",marginBottom:3}}>{lbl}</div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--ink)",lineHeight:1.3,overflowWrap:"anywhere"}}>{val}</div>
            </div>
          ))}
        </div>

        {txn.note&&<div style={{fontSize:14,color:"var(--ink-2)",background:"var(--bg-warm)",borderRadius:12,padding:"11px 13px",marginBottom:16}}>{maskText(txn.note)}</div>}

        {/* S6: Merchant profile — frequency, timing, category stability */}
        {profile&&profile.count>1&&(
          <div style={{background:"var(--bg-card)",border:"1px solid var(--rule)",borderRadius:8,padding:"13px 14px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
              <div className="label-sm">{t("mp.title")}</div>
              {profile.hasRecurring&&(
                <span style={{fontSize:10,fontWeight:700,color:"var(--warn)",background:"var(--warn-bg)",padding:"2px 7px",borderRadius:4}}>{t("add.recurring")}</span>
              )}
            </div>
            {/* Stats grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font)",fontSize:18,fontWeight:700}}>{profile.count}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:"var(--ink-4)"}}>{t("mp.visits")}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font)",fontSize:18,fontWeight:700}}>{fmt(profile.avg,currency)}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:"var(--ink-4)"}}>{t("mp.avgSpend")}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font)",fontSize:18,fontWeight:700}}>{fmt(profile.total,currency)}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:"var(--ink-4)"}}>{t("mp.total")}</div>
              </div>
            </div>
            {/* Behaviour rows */}
            <div style={{borderTop:"1px solid var(--rule)",paddingTop:10,display:"flex",flexDirection:"column",gap:5}}>
              {profile.avgDaysBetween&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.frequency")}</span>
                  <span style={{fontWeight:600,color:"var(--ink)"}}>{t("mp.everyDays",{n:profile.avgDaysBetween})}</span>
                </div>
              )}
              {profile.typicalDay&&profile.count>=3&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.typicalDay")}</span>
                  <span style={{fontWeight:600,color:"var(--ink)"}}>{t("dow."+profile.typicalDay)}</span>
                </div>
              )}
              {profile.usualSub&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.usuallyFor")}</span>
                  <span style={{fontWeight:600,color:"var(--ink)"}}>{subName(profile.usualSub)}</span>
                </div>
              )}
              {profile.amountStable&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("add.amount")}</span>
                  <span style={{fontWeight:600,color:"var(--pos)"}}>{t("mp.consistent")}</span>
                </div>
              )}
              {profile.spendingTrend&&profile.spendingTrend!=="stable"&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.trend")}</span>
                  <span style={{fontWeight:600,color:profile.spendingTrend==="increasing"?"var(--neg)":"var(--pos)"}}>
                    {profile.spendingTrend==="increasing"?t("mp.increasing"):t("mp.decreasing")}
                  </span>
                </div>
              )}
              {profile.estimatedNextVisit&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.nextVisit")}</span>
                  <span style={{fontStyle:"italic",color:"var(--ink-3)"}}>
                    ~{fmtDate(profile.estimatedNextVisit)}
                    {profile.estimatedNextSpend&&<span style={{marginLeft:6}}>· ~{fmt(profile.estimatedNextSpend,currency)}</span>}
                  </span>
                </div>
              )}
              {profile.isRecurring&&profile.recurringFreq&&profile.recurringFreq!=="irregular"&&(
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.pattern")}</span>
                  <span style={{fontWeight:600,color:"var(--warn)"}}>{t("freqCap."+profile.recurringFreq)}</span>
                </div>
              )}
              {profile.last30>0&&(
                <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11}}>
                  <span style={{color:"var(--ink-3)"}}>{t("mp.last30")}</span>
                  <span style={{fontWeight:600,color:profile.diff30<=0?"var(--pos)":"var(--neg)",textAlign:"right"}}>
                    {fmt(profile.last30,currency)}
                    {profile.prev30total>0&&profile.diff30!==0&&<span style={{fontSize:10,marginLeft:4,fontWeight:400}}>{profile.diff30>0?"↑":"↓"}{t("mp.vsPrev",{amount:fmt(Math.abs(profile.diff30),currency)})}</span>}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button className="btn btn-sm btn-full" style={{flex:1,padding:"11px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={onEdit}><Icon name="edit" size={14}/>{t("common.edit")}</button>
          <button className="btn btn-sm btn-full" style={{flex:1,padding:"11px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={onDuplicate}><Icon name="repeat" size={14}/>{t("detail.duplicate")}</button>
        </div>
        {onSplit&&!txn.recurring&&!txn.billId&&!txn.debtLink&&txn.amount>0&&<SplitPanel key={txn.id} txn={txn} currency={currency} onSplit={onSplit}/>}
        {myBill&&<div className="list-sub bill-of" style={{margin:"0 2px 8px"}}>{t("bill.paymentOf",{name:maskText(myBill.name)})}</div>}
        {((explicit&&onAssignBill)||(onLinkBill&&bills.length>0))&&(
          <div style={{marginBottom:8}}>
            <button className="btn btn-ghost btn-full link-bill" style={{marginTop:0,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} aria-expanded={showLink} onClick={()=>setShowLink(s=>!s)}>
              <Icon name="repeat" size={14}/>{t(myBill?"bill.change":txn.type==="income"?"detail.linkIncome":"detail.linkBill")}
            </button>
            {showLink&&(
              <div className="card" style={{marginTop:8,padding:"8px 14px"}}>
                <div className="list-sub" style={{margin:"4px 0 6px",lineHeight:1.5}}>{t(explicit?"bill.linkHint":"detail.linkHint")}</div>
                {bills.map(x=>(
                  <button key={x.key} className="list-row link-bill-option" onClick={()=>x.billId&&onAssignBill?onAssignBill(x.billId):onLinkBill(x)}>
                    <span className="cat-dot" style={{background:(CAT(x.category)?.color||"#98A5B7")+"26",width:32,height:32}}><CatIcon catId={x.category} size={14}/></span>
                    <span className="list-body"><span className="list-title">{maskText(x.merchant||x.note)||catName(x.category)}</span>
                      <span className="list-sub">{fmt(x.amount,currency)} · {t("freq."+x.freq)} · {catName(x.category)}{x.subcategory?` / ${subName(x.subcategory)}`:""}</span></span>
                  </button>
                ))}
                {explicit&&<button className="list-row link-bill-option link-bill-new" onClick={()=>onAssignBill("new")}>
                  <span className="cat-dot" style={{background:"var(--accent-light)",width:32,height:32}}><Icon name="add" size={14} color="var(--accent)"/></span>
                  <span className="list-body"><span className="list-title">{t("bill.newFromThis")}</span><span className="list-sub">{fmt(txn.amount,currency)} · {t("freq."+(txn.recurFreq||"monthly"))}</span></span>
                </button>}
              </div>
            )}
          </div>
        )}
        <button className="btn btn-ghost btn-full" style={{color:"var(--neg)",borderColor:"var(--neg-bg)",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:0}} onClick={onDelete}><Icon name="trash" size={14}/>{t("common.delete")}</button>
        <button className="btn btn-ghost btn-full" data-closer="1" onClick={onClose} style={{marginTop:6}}>{t("common.close")}</button>
      </div>
    </div>
  );
}

