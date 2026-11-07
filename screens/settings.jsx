// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { LANGS, LANG_NAMES, locale, t, tIn, tn, tShell } from "../i18n.js";
import { ACC_KINDS, CATEGORIES, CCAT_COLORS, CCAT_LEN, CatIcon, Icon, PROFILE_NAME_MAX, THEMES, THEME_IDS, accountBalances, accountInUse, activateKey, addAccount, addCustomCat, addTransfer, applyCustomCats, applyFx, applyTheme, catName, cleanMoneyText, cleanProfileName, customCatInUse, editAccount, editCustomCat, fmt, fmtDate, fmtLongDate, formMoney, nativeShareHook, parseMoney, readAccounts, readCustomCats, readFxOff, readReminders, readSubcats, readTheme, remindersAvailable, fmtPct, revealFocus, storageUsage, writeReminders, subName, today, writeAccounts, writeCustomCats, writeFxOff, writeTheme, netPosition, readDebts } from "../App.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// FIRST LAUNCH — choose the interface language. Native radio buttons: nothing is preselected, arrow keys move between
// the options, and Continue stays disabled until one is chosen. The three options look identical (no flags), and the
// texts around them are shown in all three languages until a choice is made.
// ─────────────────────────────────────────────────────────────────────────────
export function LanguageChooser({ onChoose }) {
  const [sel,setSel]=useState(null);
  const inEach=(key)=>LANGS.map(l=><span key={l} lang={l} className="lang-line">{tIn(l,key)}</span>);
  return (
    <div className="lang-screen">
      <form className="lang-box" onSubmit={e=>{ e.preventDefault(); if (sel) onChoose(sel); }}>
        <div className="wordmark lang-mark">Expense Ledger</div>
        <fieldset className="lang-set">
          <legend className="lang-title">{sel ? <span lang={sel}>{tIn(sel,"lang.title")}</span> : inEach("lang.title")}</legend>
          {LANGS.map(l=>(
            <label key={l} className={`lang-opt${sel===l?" sel":""}`} lang={l}>
              <input type="radio" name="ui-language" value={l} checked={sel===l} onChange={()=>setSel(l)}/>
              <span className="lang-name">{LANG_NAMES[l]}</span>
              <span className="lang-mark-sel" aria-hidden="true"/>
            </label>
          ))}
        </fieldset>
        <button type="submit" className="btn btn-primary btn-full lang-continue" disabled={!sel} lang={sel||undefined}>
          {sel ? tIn(sel,"lang.continue") : LANGS.map(l=>tIn(l,"lang.continue")).join(" · ")}
        </button>
        <p className="lang-hint">{sel ? <span lang={sel}>{tIn(sel,"lang.hint")}</span> : inEach("lang.hint")}</p>
      </form>
    </div>
  );
}

// ─── Preferences sheet ────────────────────────────────────────────────────────
// Run 17: language and the profile name live on the Settings page itself, the all-time overview is on Analytics, and the savings floor
// and the quick-add templates are on Goals. What remains here: the currency and the Safe to Spend on/off switch.
// Run 24: the user's own categories — add (name, expense or income, colour) and remove one that no entry or budget uses.
export function MyCategories({ state, onChanged, showToast }) {
  const [list,setList]=useState(()=>readCustomCats());
  const [name,setName]=useState(""), [income,setIncome]=useState(false), [color,setColor]=useState(CCAT_COLORS[5]), [editing,setEditing]=useState(null);
  const commit=(next)=>{ if (!writeCustomCats(next)) { showToast(t("mycat.saveFailed"),5000); return false; } applyCustomCats(next); setList(readCustomCats()); onChanged(); return true; };
  const add=()=>{
    const r=addCustomCat(list,name,income,color);
    if (!r.added) { showToast({ empty:t("mycat.err.empty"), long:t("mycat.err.long"), dup:t("mycat.err.dup"), full:t("mycat.err.full") }[r.reason],4000); return; }
    if (commit(r.list)) { setName(""); showToast(t("mycat.added")); }
  };
  const saveEdit=()=>{
    const r=editCustomCat(list,editing.id,editing.name,editing.color);
    if (!r.edited) { showToast({ empty:t("mycat.err.empty"), long:t("mycat.err.long"), dup:t("mycat.err.dup"), missing:t("mycat.err.empty") }[r.reason],4000); return; }
    if (commit(r.list)) { setEditing(null); showToast(t("acc.edited")); }
  };
  const remove=(c)=>{
    if (customCatInUse(c.id,state.transactions,state.budgets)) { showToast(t("mycat.inUse"),5000); return; }
    if (commit(list.filter(x=>x.id!==c.id))) showToast(t("mycat.removed"));
  };
  return (
    <div className="card prefs-card" data-section="my-categories">
      <div className="list-sub" style={{marginBottom:8}}>{t("mycat.sub")}</div>
      {list.map(c=>editing&&editing.id===c.id ? (
        <div key={c.id} data-cat-edit={c.id} style={{padding:"8px 0"}}>
          <div className="field"><label className="field-lbl" htmlFor="mycat-edit-name">{t("mycat.name")}</label>
            <input id="mycat-edit-name" className="field-input" value={editing.name} maxLength={CCAT_LEN} onChange={e=>setEditing({...editing,name:e.target.value})}/></div>
          <div className="filter-bar" role="group" aria-label={t("mycat.color")}>
            {CCAT_COLORS.map(col=>(<button key={col} aria-label={col} aria-pressed={editing.color===col} onClick={()=>setEditing({...editing,color:col})} style={{width:44,minWidth:44,height:44,flex:"none",background:"none",border:"none",padding:0,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><span aria-hidden="true" style={{width:28,height:28,borderRadius:99,background:col,border:editing.color===col?"3px solid var(--ink)":"2px solid transparent",boxSizing:"border-box"}}/></button>))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setEditing(null)}>{t("common.cancel")}</button>
            <button className="btn btn-primary" style={{flex:1}} data-section="mycat-edit-save" disabled={!editing.name.trim()} onClick={saveEdit}>{t("common.save")}</button>
          </div>
        </div>
      ) : (
        <div key={c.id} className="settings-row" data-cat={c.id}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            <span aria-hidden="true" style={{width:14,height:14,borderRadius:99,background:c.color,flex:"none"}}/>
            <div style={{minWidth:0}}><div className="settings-row-title" style={{overflowWrap:"anywhere"}}>{c.name}</div><div className="settings-row-sub">{t(c.income?"add.income":"add.expense")}</div></div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button className="chip" aria-label={t("mycat.remove",{name:c.name})} onClick={()=>remove(c)}>{t("mycat.removeBtn")}</button>
            <button className="chip" data-section="mycat-edit" aria-label={t("common.edit")+": "+c.name} onClick={()=>setEditing({ id:c.id, name:c.name, color:c.color })}>{t("common.edit")}</button>
          </div>
        </div>
      ))}
      <div className="field"><label className="field-lbl" htmlFor="mycat-name">{t("mycat.name")}</label>
        <input id="mycat-name" className="field-input" value={name} maxLength={CCAT_LEN} onChange={e=>setName(e.target.value)} onKeyDown={e=>{ if (e.key==="Enter") add(); }}/></div>
      <div className="filter-bar" role="group" aria-label={t("mycat.type")}>
        {[false,true].map(v=>(<button key={String(v)} className={`chip${income===v?" on":""}`} aria-pressed={income===v} onClick={()=>setIncome(v)}>{t(v?"add.income":"add.expense")}</button>))}
      </div>
      <div className="filter-bar" role="group" aria-label={t("mycat.color")}>
        {CCAT_COLORS.map(c=>(<button key={c} aria-label={c} aria-pressed={color===c} onClick={()=>setColor(c)} style={{width:44,minWidth:44,height:44,flex:"none",background:"none",border:"none",padding:0,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><span aria-hidden="true" style={{width:28,height:28,borderRadius:99,background:c,border:color===c?"3px solid var(--ink)":"2px solid transparent",boxSizing:"border-box"}}/></button>))}
      </div>
      <button className="btn btn-ghost btn-full" data-section="mycat-add" disabled={!name.trim()} onClick={add} style={{marginTop:6}}>{t("mycat.add")}</button>
    </div>
  );
}

// Run 24: accounts with derived balances, and transfers between them (a transfer is never income or spending).
export function MyAccounts({ state, currency, showToast }) {
  const [data,setData]=useState(()=>readAccounts());
  const [name,setName]=useState(""), [kind,setKind]=useState("card"), [opening,setOpening]=useState("");
  const [from,setFrom]=useState(""), [to,setTo]=useState(""), [amt,setAmt]=useState(""), [editing,setEditing]=useState(null);
  const bal=useMemo(()=>accountBalances(data,state.transactions),[data,state.transactions]);
  const shown=data.accounts.filter(a=>!a.hidden), kindName={ cash:t("acc.kind.cash"), card:t("acc.kind.card"), wallet:t("acc.kind.wallet"), bank:t("acc.kind.bank"), other:t("acc.kind.other") };
  const presetName={ cash:t("acc.preset.cash"), card:t("acc.preset.card"), wallet:t("acc.preset.wallet"), savings:t("acc.preset.savings") };
  const PRESETS=[["cash","cash"],["card","card"],["wallet","wallet"],["savings","bank"]].filter(([k])=>!data.accounts.some(a=>a.name.toLowerCase()===presetName[k].toLowerCase()));
  const totalCents=shown.reduce((s,a)=>s+Math.round((bal[a.id]||0)*100),0);
  const np=useMemo(()=>netPosition(data,state.transactions,readDebts()),[data,state.transactions]);   // Run 28: null unless some debt or loan exists
  const errs=()=>({ empty:t("acc.err.empty"), long:t("acc.err.long"), full:t("acc.err.full"), dup:t("acc.err.dup"), amount:t("acc.err.amount"), same:t("acc.err.same"), account:t("acc.err.account"), date:t("acc.err.date") });
  const commit=(next)=>{ if (!writeAccounts(next)) { showToast(t("acc.saveFailed"),5000); return false; } setData(readAccounts()); return true; };
  const add=()=>{
    const op=opening.trim()==="" ? 0 : parseMoney(opening);
    if (op===null) { showToast(t("acc.err.amount"),4000); return; }
    const r=addAccount(data,name,kind,op,op?today():"");
    if (!r.added) { showToast(errs()[r.reason],4000); return; }
    if (commit(r.data)) { setName(""); setOpening(""); showToast(t("acc.added")); }
  };
  // The box shows the balance as it is now; the opening amount is moved by the difference, so entries and transfers stay counted.
  const saveEdit=()=>{
    const v=editing.bal.trim()==="" ? 0 : parseMoney(editing.bal);
    if (v===null) { showToast(t("acc.err.amount"),4000); return; }
    const a=data.accounts.find(x=>x.id===editing.id); if (!a) { setEditing(null); return; }
    const open=(Math.round(v*100)-Math.round((bal[a.id]||0)*100)+Math.round(a.opening.amount*100))/100;
    const r=editAccount(data,a.id,editing.name,open,today());
    if (!r.edited) { showToast(errs()[r.reason],4000); return; }
    if (commit(r.data)) { setEditing(null); showToast(t("acc.edited")); }
  };
  const toggleHidden=(a)=>commit({ accounts:data.accounts.map(x=>x.id===a.id?{...x,hidden:!x.hidden}:x), transfers:data.transfers });
  const remove=(a)=>{
    if (accountInUse(data,a.id,state.transactions)) { showToast(t("acc.inUse"),5000); return; }
    if (commit({ accounts:data.accounts.filter(x=>x.id!==a.id), transfers:data.transfers })) showToast(t("acc.removed"));
  };
  const transfer=()=>{
    const v=parseMoney(amt);
    const r=addTransfer(data,from||shown[0]?.id,to||shown[1]?.id,v===null?0:v,today());
    if (!r.added) { showToast(errs()[r.reason],4000); return; }
    if (commit(r.data)) { setAmt(""); showToast(t("acc.transferDone")); }
  };
  const nameOf=(id)=>(data.accounts.find(a=>a.id===id)||{}).name||"?";
  return (
    <div className="card prefs-card" data-section="my-accounts" style={{marginTop:14}}>
      <div className="list-sub" style={{marginBottom:8}}>{t("acc.sub")}</div>
      {data.accounts.map(a=>editing&&editing.id===a.id ? (
        <div key={a.id} className="reveal" data-account-edit={a.id} style={{padding:"8px 0"}}>
          <div className="field"><label className="field-lbl" htmlFor="acc-edit-name">{t("acc.name")}</label>
            <input id="acc-edit-name" className="field-input" value={editing.name} maxLength={40} onChange={e=>setEditing({...editing,name:e.target.value})}/></div>
          <div className="field"><label className="field-lbl" htmlFor="acc-edit-bal">{t("acc.opening")}</label>
            <input id="acc-edit-bal" className="field-input" inputMode="decimal" value={editing.bal} onChange={e=>setEditing({...editing,bal:cleanMoneyText(e.target.value)})}/></div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setEditing(null)}>{t("common.cancel")}</button>
            <button className="btn btn-primary" style={{flex:1}} data-section="acc-edit-save" disabled={!editing.name.trim()} onClick={saveEdit}>{t("common.save")}</button>
          </div>
        </div>
      ) : (
        <div key={a.id} className="settings-row" data-account={a.id} style={{flexDirection:"column",alignItems:"stretch",gap:10,padding:"14px 0",...(a.hidden?{opacity:0.7}:null)}}>
          <div style={{minWidth:0}}>
            <div className="settings-row-title" style={{overflowWrap:"anywhere"}}>{a.name}{a.hidden?" · "+t("acc.hidden"):""}</div>
            <div className="settings-row-sub">{kindName[a.kind]} · <strong data-balance={a.id}>{fmt(bal[a.id]||0,currency)}</strong></div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="chip" onClick={()=>toggleHidden(a)}>{t(a.hidden?"acc.show":"acc.hide")}</button>
            <button className="chip" aria-label={t("acc.remove",{name:a.name})} onClick={()=>remove(a)}>{t("mycat.removeBtn")}</button>
            <button className="chip" data-section="acc-edit" aria-label={t("acc.edit")+": "+a.name} onClick={()=>setEditing({ id:a.id, name:a.name, bal:String(bal[a.id]||0) })}>{t("acc.edit")}</button>
          </div>
        </div>
      ))}
      {shown.length>1&&(<div className="list-sub" data-section="acc-total" style={{margin:"4px 2px 8px"}}><strong>{t("acc.total",{ amount:fmt(totalCents/100,currency) })}</strong><br/>{t("acc.totalNote")}</div>)}
      {np&&(<div className="list-sub" data-section="acc-net" style={{margin:"4px 2px 8px"}}><strong>{t("acc.net",{ amount:fmt(np.net/100,currency) })}</strong><br/>{t("acc.netNote")}</div>)}
      {PRESETS.length>0&&(<div data-section="acc-presets"><div className="list-sub" style={{margin:"6px 2px"}}>{t("acc.presetHint")}</div>
        <div className="filter-bar" role="group" aria-label={t("acc.presetHint")}>
          {PRESETS.map(([k,kd])=>(<button key={k} className="chip" data-preset={k} onClick={()=>{ setName(presetName[k]); setKind(kd); }}>{presetName[k]}</button>))}
        </div></div>)}
      <div className="field"><label className="field-lbl" htmlFor="acc-name">{t("acc.name")}</label>
        <input id="acc-name" className="field-input" value={name} maxLength={40} onChange={e=>setName(e.target.value)}/></div>
      <div className="filter-bar" role="group" aria-label={t("acc.kind")}>
        {ACC_KINDS.map(k=>(<button key={k} className={`chip${kind===k?" on":""}`} aria-pressed={kind===k} onClick={()=>setKind(k)}>{kindName[k]}</button>))}
      </div>
      <div className="field"><label className="field-lbl" htmlFor="acc-open">{t("acc.opening")}</label>
        <input id="acc-open" className="field-input" inputMode="decimal" placeholder="0.00" value={opening} onChange={e=>setOpening(cleanMoneyText(e.target.value))}/></div>
      <button className="btn btn-ghost btn-full" data-section="acc-add" disabled={!name.trim()} onClick={add}>{t("acc.add")}</button>
      {shown.length>1&&(
        <div data-section="acc-transfer" style={{marginTop:14}}>
          <div className="settings-section-lbl">{t("acc.transferTitle")}</div>
          <div className="list-sub" style={{marginBottom:8}}>{t("acc.transferSub")}</div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <select className="field-input" style={{flex:1,minWidth:0}} aria-label={t("acc.from")} value={from||shown[0].id} onChange={e=>setFrom(e.target.value)}>{shown.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
            <select className="field-input" style={{flex:1,minWidth:0}} aria-label={t("acc.to")} value={to||shown[1].id} onChange={e=>setTo(e.target.value)}>{shown.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
          </div>
          <div style={{display:"flex",gap:8}}>
            <input className="field-input" style={{flex:1}} inputMode="decimal" aria-label={t("acc.amount")} placeholder="0.00" value={amt} onChange={e=>setAmt(cleanMoneyText(e.target.value))}/>
            <button className="btn btn-primary" data-section="acc-transfer-go" disabled={!amt.trim()} onClick={transfer}>{t("acc.transferGo")}</button>
          </div>
        </div>
      )}
      {data.transfers.slice(0,5).map(x=>(
        <div key={x.id} className="settings-row" data-transfer={x.id}>
          <div style={{minWidth:0}}><div className="settings-row-title">{fmt(x.amount,currency)}</div><div className="settings-row-sub">{nameOf(x.from)} → {nameOf(x.to)} · {fmtDate(x.date)}</div></div>
          <button className="chip" aria-label={t("acc.removeTransfer")} onClick={()=>{ if (commit({ accounts:data.accounts, transfers:data.transfers.filter(y=>y.id!==x.id) })) showToast(t("acc.transferRemoved")); }}>{t("mycat.removeBtn")}</button>
        </div>
      ))}
    </div>
  );
}

// Run 27c: a Settings section the user opens by choice. Closed it is a single row; open, the section appears under it.
// Run 31 (own design after the Figma prototype review): a closed row also says where things stand in one short line (`sub`),
// so the page can be read without opening anything. The line is hidden while the section is open (its content says it better).
export function Fold({ id, icon, title, sub, open, onToggle, children }) {
  return (
    <div className="fold" data-fold={id}>
      <div className="card list-card fold-card">
        <button className="list-row fold-head" aria-expanded={!!open} aria-controls={`fold-${id}`} data-fold-head={id} onClick={onToggle}>
          <span className="list-ico" style={{color:"var(--accent-text)"}}><Icon name={icon} size={20}/></span>
          <span className="list-body"><span className="list-title">{title}</span>{sub&&!open&&<span className="list-sub" data-fold-sub={id}>{sub}</span>}</span>
          <Icon name={open?"chevUp":"chevDown"} size={16} color="var(--ink-4)"/>
        </button>
      </div>
      {open && <div className="fold-body" id={`fold-${id}`}>{children}</div>}
    </div>
  );
}
// Run 27b: Preferences is no longer a sheet behind a row. Its contents sit directly on the Settings tab, in two parts:
// MoneySettings (accounts, categories, Safe to Spend switch, currency) and LookSettings (colour theme, reduce effects).
export function MoneySettings({ state, onCatsChanged, onCurrencyChange, onSafeToSpendChange, showToast, open, toggle }) {
  const { currency,safeToSpend={} }=state;
  const [curSym, setCurSym]=useState(currency);
  // One-line summaries for the closed rows, read from what is saved now (they are rebuilt each time a row closes).
  const accData=readAccounts(), shownAcc=accData.accounts.filter(a=>!a.hidden);
  const accBal=shownAcc.length?accountBalances(accData,state.transactions):{};
  const accSum=shownAcc.length?t("st.sumAcc",{amount:fmt(shownAcc.reduce((s,a)=>s+Math.round((accBal[a.id]||0)*100),0)/100,currency)}):t("st.sumAccNone");
  const catN=readCustomCats().length;
  const catSum=catN>0?t("st.sumCat",{n:catN}):t("st.sumCatNone");
  const moneySum=t(safeToSpend.enabled?"st.sumMoneyOn":"st.sumMoneyOff",{c:currency});
  return (
    <>
      <Fold id="accounts" icon="wallet" title={t("acc.title")} sub={accSum} open={open.accounts} onToggle={()=>toggle("accounts")}><MyAccounts state={state} currency={state.currency} showToast={showToast}/></Fold>
      <Fold id="categories" icon="list" title={t("mycat.title")} sub={catSum} open={open.categories} onToggle={()=>toggle("categories")}><MyCategories state={state} onChanged={onCatsChanged} showToast={showToast}/></Fold>
      <Fold id="money" icon="settings" title={t("st.foldMoney")} sub={moneySum} open={open.money} onToggle={()=>toggle("money")}>
      <div className="card st-card" data-section="st-money-options">
        {/* Safe to Spend: the switch only. The monthly savings floor is on Goals. */}
        <div className="settings-section-lbl" style={{marginTop:0}}>{t("safe.title")}</div>
        <div className="settings-row">
          <div><div className="settings-row-title" id="set-safe-lbl">{t("set.safeEnable")}</div><div className="settings-row-sub">{t("set.safeEnableSub")}</div></div>
          <div className={`toggle-track${safeToSpend.enabled?" on":""}`} onClick={()=>onSafeToSpendChange({enabled:!safeToSpend.enabled})} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); onSafeToSpendChange({enabled:!safeToSpend.enabled}); } }} role="switch" aria-checked={!!safeToSpend.enabled} aria-label={t("safe.title")} tabIndex={0}><div className="toggle-knob"/></div>
        </div>
        {/* Currency */}
        <div className="settings-section-lbl" style={{marginTop:14}}>{t("set.currency")}</div>
        {/* Run 24: common currencies are one tap, so nobody has to find the symbol on the keyboard; the box below still takes any other symbol. */}
        <div className="filter-bar" role="group" aria-label={t("set.currencyPick")} data-section="currency-chips">
          {["₼","$","€","₽","£","₺","¥","₸","₴"].map(c=>(
            <button key={c} className={`chip${currency===c?" on":""}`} aria-pressed={currency===c} onClick={()=>{ setCurSym(c); onCurrencyChange(c); showToast(t("set.currencyUpdated")); }}>{c}</button>
          ))}
        </div>
        <div className="settings-row">
          <div><div className="settings-row-title" id="set-cur-lbl">{t("set.currency")}</div><div className="settings-row-sub">{t("set.currencySub",{currency})}</div></div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <input className="field-input" value={curSym} onChange={e=>setCurSym(e.target.value)} maxLength={3} aria-labelledby="set-cur-lbl" style={{width:52,minHeight:38,textAlign:"center",padding:"7px 8px"}}/>
            <button className="btn btn-sm btn-sm-primary" onClick={()=>{if(!curSym.trim()){showToast(t("set.currencyEmpty"));return;} onCurrencyChange(curSym.trim());showToast(t("set.currencyUpdated"));}}>{t("common.save")}</button>
          </div>
        </div>
      </div>
      </Fold>
    </>
  );
}

export function LookSettings({ showToast, open, toggle }) {
  const [theme, setTheme]=useState(()=>readTheme());
  const [fxOff, setFxOff]=useState(()=>readFxOff());
  const toggleFx=()=>{ const n=!fxOff; if (!writeFxOff(n)) { showToast(t("theme.saveFailed"),5000); return; } applyFx(n); setFxOff(n); };
  return (
    <Fold id="look" icon="eye" title={t("st.foldLook")} sub={fxOff?t("st.sumLookFx",{theme:t("theme."+theme)}):t("theme."+theme)} open={open.look} onToggle={()=>toggle("look")}>
    <div className="card st-card" data-section="st-look">
      {/* Colour theme (Run 25): palettes supplied by the owner; a plain preference, separate from the ledger */}
      <div className="settings-section-lbl" style={{marginTop:0}}>{t("theme.title")}</div>
      <div className="filter-bar" role="radiogroup" aria-label={t("theme.title")} data-section="theme-chips" style={{flexWrap:"wrap"}}>
        {THEME_IDS.map(id=>(
          <button key={id} role="radio" aria-checked={theme===id} data-theme-id={id} className={`chip${theme===id?" on":""}`} style={{display:"inline-flex",alignItems:"center",gap:7}}
            onClick={()=>{ if (theme===id) return; if (!writeTheme(id)) { showToast(t("theme.saveFailed"),5000); return; } applyTheme(id); setTheme(id); showToast(t("theme.changed")); }}>
            <span aria-hidden="true" style={{display:"inline-block",width:16,height:16,borderRadius:"50%",background:`linear-gradient(135deg,${THEMES[id].swatch[0]} 50%,${THEMES[id].swatch[1]} 50%)`,border:"1px solid var(--rule-2)"}}/>
            {t("theme."+id)}
          </button>
        ))}
      </div>
      {/* Run 25: Reduce effects - shadows and highlights off; layers stay readable through tone and edges */}
      <div className="settings-row" style={{marginTop:6}}>
        <div><div className="settings-row-title" id="set-fx-lbl">{t("fx.title")}</div><div className="settings-row-sub">{t("fx.sub")}</div></div>
        <div className={`toggle-track${fxOff?" on":""}`} data-section="fx-toggle" onClick={toggleFx} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); toggleFx(); } }} role="switch" aria-checked={fxOff} aria-labelledby="set-fx-lbl" tabIndex={0}><div className="toggle-knob"/></div>
      </div>
    </div>
    </Fold>
  );
}
// Run 30: reminders (Android app only; the section does not exist on the website). Turning a reminder ON asks Android for notification permission first;
// if it is refused the switch stays off and the user is told how to allow it. The schedule itself is rebuilt by App.jsx (reminderPlan).
export function RemindersSettings({ showToast, open, toggle }) {
  const [p, setP]=useState(()=>readReminders());
  const [blocked, setBlocked]=useState(false);
  if (!remindersAvailable()) return null;
  // Always build the new value from what is saved NOW, not from the copy this render closed over: the permission question below takes a moment
  // and the user may change another switch or the time meanwhile (found on an emulator: the time change was overwritten by a late "Allow").
  const save=(patch)=>{ if (!writeReminders({ ...readReminders(), ...patch })) { showToast(t("theme.saveFailed"),5000); return; } setP(readReminders()); };
  const flip=(k)=>{
    if (readReminders()[k]) { save({ [k]:false }); return; }
    Promise.resolve(window.LedgerNative.reminders.requestPermission()).then(r=>{
      if (r && r.granted) { setBlocked(false); save({ [k]:true }); } else setBlocked(true);
    }).catch(()=>setBlocked(true));
  };
  const Row=({k,title,sub})=>(
    <div className="settings-row">
      <div><div className="settings-row-title" id={`set-rem-${k}`}>{title}</div><div className="settings-row-sub">{sub}</div></div>
      <div className={`toggle-track${p[k]?" on":""}`} data-section={`rem-${k}`} onClick={()=>flip(k)} onKeyDown={e=>{ if (e.key===" "||e.key==="Enter") { e.preventDefault(); flip(k); } }} role="switch" aria-checked={!!p[k]} aria-labelledby={`set-rem-${k}`} tabIndex={0}><div className="toggle-knob"/></div>
    </div>
  );
  return (
    <Fold id="reminders" icon="calendar" title={t("remind.title")} sub={(()=>{ const n=["bills","recurring","daily"].filter(k=>p[k]).length; return n?t("st.sumRem",{n}):t("st.sumRemNone"); })()} open={open.reminders} onToggle={()=>toggle("reminders")}>
      <div className="card st-card" data-section="st-reminders">
        <div className="list-sub" style={{marginBottom:8}}>{t("remind.sub")}</div>
        <Row k="bills" title={t("remind.bills")} sub={t("remind.billsSub")}/>
        <Row k="recurring" title={t("remind.recurring")} sub={t("remind.recurringSub")}/>
        <Row k="daily" title={t("remind.daily")} sub={t("remind.dailySub")}/>
        <div className="settings-row">
          <div><div className="settings-row-title" id="set-rem-time">{t("remind.time")}</div></div>
          <input className="field-input" type="time" value={p.time} aria-labelledby="set-rem-time" data-section="rem-time" onChange={e=>{ if (e.target.value) save({ time:e.target.value }); }} style={{width:110,minHeight:38,padding:"7px 8px"}}/>
        </div>
        <Row k="hideAmount" title={t("remind.hide")} sub={t("remind.hideSub")}/>
        {blocked && <div className="list-sub" role="alert" data-section="rem-denied" style={{marginTop:8}}>{t("remind.denied")}</div>}
        <div className="list-sub" style={{marginTop:8}}>{t("remind.battery")}</div>
      </div>
    </Fold>
  );
}
export function SavingsFloorCard({ safeToSpend={}, onSafeToSpendChange, showToast }) {
  const [savingsT,setSavingsT]=useState(String(safeToSpend.savingsTarget||0));
  if (!safeToSpend.enabled) return null;
  return (
    <div className="card" data-section="gl-floor">
      <div className="settings-row-title" id="set-floor-lbl">{t("set.floor")}</div>
      <div className="settings-row-sub" style={{marginBottom:8}}>{t("set.floorSub")}</div>
      <div style={{display:"flex",gap:8,width:"100%"}}>
        <input className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={savingsT} onChange={e=>setSavingsT(cleanMoneyText(e.target.value))} aria-labelledby="set-floor-lbl" style={{flex:1,padding:"8px 10px",fontSize:13}}/>
        <button className="btn btn-sm btn-sm-primary" onClick={()=>{const v=savingsT.trim()===""?0:formMoney(savingsT); if(v===null){showToast(t("set.zeroOrMore"));return;} onSafeToSpendChange({savingsTarget:v});showToast(t("set.saved"));}}>{t("common.save")}</button>
      </div>
    </div>
  );
}

// Goals: quick-add templates (the buttons on Home). A template can carry a subcategory.
export function TemplatesSection({ templates, currency, onAddTemplate, onDeleteTemplate, onUpdateTemplate, showToast }) {
  const [showNewTpl,  setShowNewTpl]  = useState(false);
  const [editTplId,   setEditTplId]   = useState(null);
  const [tplName,     setTplName]     = useState("");
  const [tplAmt,      setTplAmt]      = useState("");
  const [tplCatId,    setTplCatId]    = useState("food");
  const [tplSubcat,   setTplSubcat]   = useState("");
  const [tplMerchant, setTplMerchant] = useState("");
  const [tplNote,     setTplNote]     = useState("");
  const expCats=CATEGORIES.filter(c=>!c.income);
  const myOwn=useMemo(()=>showNewTpl?((readSubcats()[tplCatId])||[]):[],[showNewTpl,tplCatId]);
  const builtIn=(CATEGORIES.find(c=>c.id===tplCatId)||{}).subs||[];
  const saveTpl=()=>{
    const tAmt=formMoney(tplAmt,{positive:true});
    if (!tplName.trim()||tAmt===null) { showToast(t("set.tplInvalid")); return; }
    const data={name:tplName.trim(),amount:tAmt,catId:tplCatId,subcat:tplSubcat,merchant:tplMerchant.trim(),note:tplNote.trim()};
    if (editTplId) onUpdateTemplate(editTplId,data); else onAddTemplate(data);
    setTplName("");setTplAmt("");setTplSubcat("");setTplMerchant("");setTplNote("");setShowNewTpl(false);setEditTplId(null);
  };
  const startEdit=(tpl)=>{ setEditTplId(tpl.id); setTplName(tpl.name||""); setTplAmt(String(tpl.amount)); setTplCatId(tpl.catId||"food"); setTplSubcat(tpl.subcat||""); setTplMerchant(tpl.merchant||""); setTplNote(tpl.note||""); setShowNewTpl(true); };
  const tplForm=(inList)=>(
        <div className={"reveal"+(inList?"":" card")} ref={revealFocus} data-section="tpl-form" style={inList?{padding:"12px 14px",borderBottom:"1px solid var(--rule)"}:undefined}>
          <div className="field-row" style={{marginBottom:10}}>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-name">{t("set.name")}</label><input id="tpl-name" className="field-input" placeholder={t("set.tplNamePh")} value={tplName} onChange={e=>setTplName(e.target.value)}/></div>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-amt">{t("add.amount")}</label><input id="tpl-amt" className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={tplAmt} onChange={e=>setTplAmt(cleanMoneyText(e.target.value))}/></div>
          </div>
          <div className="field-row" style={{marginBottom:10}}>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-cat">{t("add.category")}</label><select id="tpl-cat" className="field-input field-select" value={tplCatId} onChange={e=>{ setTplCatId(e.target.value); setTplSubcat(""); }}>{expCats.map(c=><option key={c.id} value={c.id}>{catName(c.id)}</option>)}</select></div>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-subcat">{t("add.subcategory")}</label>
              <select id="tpl-subcat" className="field-input field-select" value={tplSubcat} onChange={e=>setTplSubcat(e.target.value)}>
                <option value="">{t("set.noSubcat")}</option>
                {myOwn.map(s=><option key={"my-"+s} value={s}>{s}</option>)}
                {builtIn.map(s=><option key={s} value={s}>{subName(s)}</option>)}
              </select></div>
          </div>
          <div className="field-row" style={{marginBottom:10}}>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-merchant">{t("add.merchant")}</label><input id="tpl-merchant" className="field-input" placeholder={t("set.optionalPh")} value={tplMerchant} onChange={e=>setTplMerchant(e.target.value)}/></div>
            <div className="field" style={{marginBottom:0}}><label className="field-lbl" htmlFor="tpl-note">{t("set.noteOptional")}</label><input id="tpl-note" className="field-input" placeholder={t("set.tplNotePh")} value={tplNote} onChange={e=>setTplNote(e.target.value)}/></div>
          </div>
          <button className="btn btn-primary btn-full" style={{marginTop:0,padding:"10px"}} onClick={saveTpl}>{t("set.saveTemplate")}</button>
        </div>
  );
  return (
    <div data-section="gl-templates">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,margin:"14px 2px 10px"}}>
        <span className="section-title" style={{margin:0}}>{t("set.templates")}</span>
        <button className="btn btn-sm" onClick={()=>{ if (showNewTpl) { setEditTplId(null); setTplName(""); setTplAmt(""); setTplSubcat(""); setTplMerchant(""); setTplNote(""); } setShowNewTpl(s=>!s); }}>{showNewTpl?t("common.cancel"):t("set.add")}</button>
      </div>
      {showNewTpl&&!editTplId&&tplForm(false)}
      {templates.length===0&&!showNewTpl&&<div className="list-sub" style={{margin:"0 2px"}}>{t("set.noTemplates")}</div>}
      {templates.length>0&&(
        <div className="card list-card">
          {templates.map((tpl,ti)=>showNewTpl&&editTplId===tpl.id ? <Fragment key={tpl.id}>{tplForm(true)}</Fragment> : (
            <div key={tpl.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderBottom:ti<templates.length-1?"1px solid var(--rule)":"none"}}>
              <CatIcon catId={tpl.catId} size={14}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{tpl.name}</div>
                <div style={{fontSize:11,color:"var(--ink-3)"}}>{fmt(tpl.amount,currency)}{tpl.merchant?` · ${tpl.merchant}`:""} · {catName(tpl.catId)}{tpl.subcat?` › ${subName(tpl.subcat)}`:""}</div>
              </div>
              <button className="chip" data-section="tpl-edit" aria-label={t("common.edit")+": "+tpl.name} onClick={()=>startEdit(tpl)}>{t("common.edit")}</button>
              <button className="topbar-btn" style={{color:"var(--ink-4)"}} onClick={()=>onDeleteTemplate(tpl.id)} aria-label={t("set.deleteTemplate",{name:tpl.name})}><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A row in an inset list (More page, Import / Export): icon, title, optional subtitle, chevron.
export function ListRow({ icon, title, sub, onClick, color="var(--accent-text)", className="", id }) {
  return (
    <button className={`list-row ${className}`} data-more={id} onClick={onClick}>
      <span className="list-ico" style={{color}}><Icon name={icon} size={20}/></span>
      <span className="list-body"><span className="list-title">{title}</span>{sub&&<span className="list-sub">{sub}</span>}</span>
      <Icon name="chevRight" size={16} color="var(--ink-4)"/>
    </button>
  );
}

// More: the pages that do not have a tab of their own. There is no account, profile, dark-mode switch or help centre in
// this app, so none is shown; the card at the top says where the data lives, which is true and useful.
// Run 16: "How it works" (four short steps) and the privacy notice, one simple sheet each. The notice describes what the app does
// today (no account, no analytics, nothing sent); it is not legal advice and must be kept true if the app ever changes.
export function InfoSheet({ kind, onClose }) {
  const n=kind==="how"?4:kind==="safe"?6:8;
  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={t("info."+kind+".title")} data-section={"info-"+kind}>
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:14}}>
          <div className="card-title" style={{fontSize:17}}>{t("info."+kind+".title")}</div>
          <button data-closer="1" onClick={onClose} aria-label={t("common.close")} style={{background:"none",border:"1px solid var(--rule)",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-3)",flexShrink:0}}><Icon name="close" size={13}/></button>
        </div>
        {Array.from({length:n},(_,i)=>i+1).map(i=>(
          <div key={i} style={{marginBottom:14}}>
            <div className="list-title">{tShell("info."+kind+"."+i+".h")}</div>
            <div className="list-sub" style={{lineHeight:1.55,marginTop:2}}>{tShell("info."+kind+"."+i+".b")}</div>
          </div>
        ))}
        <button className="btn btn-primary btn-full" style={{marginTop:4}} data-closer="1" onClick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  );
}

export function MorePage({ language, profileName="", onLanguageChange, onProfileName, onOpen, onInfo, onLock, version, state, onCatsChanged, onCurrencyChange, onSafeToSpendChange, showToast, scrollTo="", onScrolled }) {
  const [name,setName]=useState(profileName);
  // Opened from Home (Accounts > Manage): glide down to that section once the page has settled (never a jump).
  const [open,setOpen]=useState({});   // which Settings sections are expanded (all closed to start)
  const toggle=(k)=>setOpen(o=>({...o,[k]:!o[k]}));
  useEffect(()=>{ if (!scrollTo) return; const k=scrollTo==="my-accounts"?"accounts":scrollTo; setOpen(o=>({...o,[k]:true})); const id=setTimeout(()=>{ const el=document.querySelector(`[data-section="${scrollTo}"]`); if (el && el.scrollIntoView) el.scrollIntoView({ behavior:"smooth", block:"start" }); if (onScrolled) onScrolled(); },340); return ()=>clearTimeout(id); },[scrollTo]);
  return (
    <div className="more-page">
      {/* Run 17: this tab is Settings. Profile name (used in the Home greeting) and the interface language are set here. */}
      <div className="card st-card st-ident" data-section="st-profile" role="group" aria-label={t("st.profile")}>
        {/* Run 31: one identity card (it replaces three separate cards: name, brand and "stored on this device"). */}
        <div className="st-ident-top">
          <span className="more-mark" aria-hidden="true"><span style={{fontSize:22,fontWeight:700,color:"var(--accent)",lineHeight:1}}>{cleanProfileName(profileName)?Array.from(cleanProfileName(profileName))[0].toLocaleUpperCase(locale()):"₼"}</span></span>
          <div><div className="list-title">{cleanProfileName(profileName)||"Expense Ledger"}</div><div className="list-sub" data-section="st-local">{tShell("more.localData")}</div></div>
        </div>
        <label className="field-lbl" htmlFor="profile-name">{t("st.profileName")}</label>
        <div style={{display:"flex",gap:8}}>
          <input id="profile-name" className="field-input" autoComplete="off" maxLength={PROFILE_NAME_MAX*2} placeholder={t("st.profilePh")} value={name} onChange={e=>setName(e.target.value)} style={{flex:1}}/>
          <button className="btn btn-sm btn-sm-primary" data-section="st-name-save" disabled={cleanProfileName(name)===cleanProfileName(profileName)} onClick={()=>{ onProfileName(name); setName(cleanProfileName(name)); }}>{t("common.save")}</button>
        </div>
        <div className="list-sub" style={{marginTop:6}}>{t("st.profileSub")}</div>
      </div>
      <div className="settings-section-lbl more-group-lbl">{t("st.groupMoney")}</div>
      <MoneySettings state={state} onCatsChanged={onCatsChanged} onCurrencyChange={onCurrencyChange} onSafeToSpendChange={onSafeToSpendChange} showToast={showToast} open={open} toggle={toggle}/>
      <div className="card list-card" data-section="more-money">
        {/* Run 26/27: grouped (Money / Data and safety / App); every row has a name for tests and links. Accounts and Preferences are no longer rows: they are open on this page. */}
        <ListRow id="recurring" icon="repeat" title={t("rec.title")} sub={t("more.recurringSub")} onClick={()=>onOpen("recurring")}/>
        <ListRow id="debts" icon="finance" title={t("debt.title")} sub={t("debt.rowSub")} onClick={()=>onOpen("debts")}/>
      </div>
      {/* Run 31: language moved next to Appearance: both are about how the app looks and reads, not about money. */}
      <div className="settings-section-lbl more-group-lbl">{t("st.groupLook")}</div>
      <div className="card st-card st-lang" data-section="st-language">
        <div className="settings-section-lbl" id="set-lang-lbl" style={{marginTop:0}}>{t("lang.setting")}</div>
        <fieldset className="lang-switch" aria-labelledby="set-lang-lbl">
          {LANGS.map(l=>(
            <label key={l} className={`lang-pill${language===l?" sel":""}`} lang={l}>
              <input type="radio" name="settings-language" value={l} checked={language===l} onChange={()=>onLanguageChange(l)}/>
              {LANG_NAMES[l]}
            </label>
          ))}
        </fieldset>
        <div className="list-sub" style={{marginTop:6}}>{t("lang.settingSub")}</div>
      </div>
      <LookSettings showToast={showToast} open={open} toggle={toggle}/>
      <RemindersSettings showToast={showToast} open={open} toggle={toggle}/>
      <div className="settings-section-lbl more-group-lbl">{t("st.groupData")}</div>
      <div className="card list-card" data-section="more-data">
        <ListRow id="io" icon="upload" title={t("io.title")} sub={t("more.ioSub")} onClick={()=>onOpen("io")}/>
        <ListRow id="lock" icon="safe" title={t("lock.title")} sub={t("lock.rowSub")} onClick={onLock}/>
        <ListRow id="safe" icon="safe" title={t("info.safe.title")} sub={t("more.safeSub")} onClick={()=>onInfo("safe")}/>
        <ListRow id="privacy" icon="safe" title={t("info.privacy.title")} sub={t("more.privacySub")} onClick={()=>onInfo("privacy")}/>
      </div>
      <div className="settings-section-lbl more-group-lbl">{t("st.groupApp")}</div>
      <div className="card list-card" data-section="more-app">
        <ListRow id="how" icon="list" title={t("info.how.title")} sub={t("more.howSub")} onClick={()=>onInfo("how")}/>
      </div>
      {version&&<div className="list-sub app-version" style={{textAlign:"center",marginTop:4}}>{t("more.version",{v:version})}</div>}
    </div>
  );
}

// Import / Export: the same import, export and backup functions Settings used to hold, on a page of their own.
// There is no import history in the data, so no "recent imports" list is shown.
// Run 32: asks for the passphrase of an encrypted backup file before it is read (shown inside the import sheet).
export function ImportUnlock({ filename, onUnlock, onCancel }) {
  const [pass,setPass]=useState(""), [err,setErr]=useState(""), [busy,setBusy]=useState(false);
  const go=async (e)=>{ e&&e.preventDefault(); if (busy||!pass) return; setBusy(true); setErr(""); const r=await onUnlock(pass); setBusy(false); if (r) { setErr(t(r==="wrong"?"enc.wrong":r==="newer"?"enc.newer":r==="unsupported"?"enc.errUnsupported":"enc.damaged")); setPass(""); } };
  return (
    <form onSubmit={go} data-section="import-unlock">
      <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10,overflowWrap:"anywhere"}}>{filename}</div>
      <input className="field-input" type="password" autoComplete="off" autoFocus aria-label={t("enc.unlockPass")} placeholder={t("enc.unlockPass")} value={pass} onChange={e=>setPass(e.target.value)} aria-invalid={!!err} aria-describedby={err?"enc-unlock-err":undefined}/>
      {err&&<div id="enc-unlock-err" role="alert" style={{color:"var(--neg)",fontSize:13,marginTop:8,lineHeight:1.5}}>{err}</div>}
      <button type="submit" className="btn btn-primary btn-full" disabled={busy||!pass} style={{marginTop:12}}>{busy?"…":t("enc.unlock")}</button>
      <button type="button" className="btn btn-ghost btn-full" onClick={onCancel}>{t("common.cancel")}</button>
    </form>
  );
}

// Run 32: optional passphrase-protected backup. Two fields, checked here; the file is made (and re-opened as a check) by onExportEncrypted.
function EncryptedBackup({ onExportEncrypted }) {
  const [p1,setP1]=useState(""), [p2,setP2]=useState(""), [err,setErr]=useState(""), [busy,setBusy]=useState(false);
  const go=async (e)=>{
    e.preventDefault(); if (busy) return;
    if ([...p1].length<8) { setErr(t("enc.errShort")); return; }
    if (p1!==p2) { setErr(t("enc.errMismatch")); return; }
    setErr(""); setBusy(true);
    const r=await onExportEncrypted(p1);
    setBusy(false);
    if (r==="ok") { setP1(""); setP2(""); }
    else if (r==="unsupported") setErr(t("enc.errUnsupported"));
    else if (r==="short") setErr(t("enc.errShort"));
    else if (r==="failed") setErr(t("enc.errFail"));
  };
  return (
    <form onSubmit={go} data-section="enc-backup" style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--rule)"}}>
      <div className="list-title">{t("enc.title")}</div>
      <div className="list-sub" style={{lineHeight:1.5,marginBottom:8}}>{t("enc.sub")}</div>
      <input className="field-input" type="password" autoComplete="new-password" aria-label={t("enc.pass")} placeholder={t("enc.pass")} value={p1} onChange={e=>setP1(e.target.value)} style={{marginBottom:8}}/>
      <input className="field-input" type="password" autoComplete="new-password" aria-label={t("enc.repeat")} placeholder={t("enc.repeat")} value={p2} onChange={e=>setP2(e.target.value)}/>
      {err&&<div role="alert" style={{color:"var(--neg)",fontSize:13,marginTop:8,lineHeight:1.5}}>{err}</div>}
      <button type="submit" className="btn btn-ghost btn-full" disabled={busy||!p1} style={{marginTop:10}}><Icon name="backup" size={16}/>{busy?"…":t("enc.create")}</button>
    </form>
  );
}

export function ImportExportPage({ state, onExportCSV, onExportJSON, onImportFile, onConfirmBackup, onShareBackup, onExportEncrypted, protection, onProtect, onInstall }) {
  const fileRef=useRef();
  const { transactions, lastBackup, backupConfirmedAt }=state;
  const confirmed=!!(lastBackup && backupConfirmedAt && Date.parse(backupConfirmedAt)>=Date.parse(lastBackup));
  // Can this device hand a file to the share menu? (Android and iPhone: yes; many desktop browsers: no.)
  const canShareFiles=useMemo(()=>{ try { if (nativeShareHook()) return true; return typeof navigator.canShare==="function" && typeof File!=="undefined" && navigator.canShare({files:[new File(["{}"],"x.json",{type:"application/json"})]}); } catch { return false; } },[]);
  const usage=useMemo(()=>storageUsage(),[transactions.length]);   // Run 32: measured when the page opens and when the number of entries changes
  const standalone=typeof window!=="undefined" && ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone===true);
  return (
    <div className="io-page">
      {/* Run 10: how safe the data is on this phone, and what makes it safer */}
      <div className="section-title" style={{marginTop:0}}>{t("io.safety")}</div>
      <div className="card io-safety">
        <div className="io-backup">
          <div style={{minWidth:0}}>
            <div className="list-title">{t("io.protectTitle")}</div>
            <div className="list-sub" style={{lineHeight:1.5}}>{t(protection==="on"?"io.protectOn":protection==="off"?"io.protectOff":"io.protectUnsupported")}</div>
          </div>
          <span className={`io-status${protection==="on"?" ok":""}`}>{protection==="on"?<><Icon name="check" size={12}/>{t("io.on")}</>:protection==="off"?t("io.off"):"—"}</span>
        </div>
        {protection==="off"&&<button className="btn btn-ghost btn-full io-protect" onClick={onProtect}>{t("io.protectBtn")}</button>}
        {usage&&(
          <div data-section="storage-usage" data-level={usage.level} style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--rule)"}}>
            <div className="list-title">{t("io.storage")}</div>
            <div className="list-sub" style={{lineHeight:1.5}}>{t("io.storageUsed",{pct:fmtPct(usage.pct).replace(/%$/,"")})}</div>
            {usage.level!=="ok"&&<div role="alert" style={{color:usage.level==="full"?"var(--neg)":"var(--warn)",fontSize:13,marginTop:6,lineHeight:1.5}}>{t(usage.level==="full"?"io.storageFull":"io.storageWarn")}</div>}
          </div>
        )}
        {!standalone&&(
          <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--rule)"}}>
            <div className="list-title">{t("io.installTitle")}</div>
            <div className="list-sub" style={{lineHeight:1.5}}>{t("io.installHow")}</div>
            {onInstall&&<button className="btn btn-ghost btn-full io-install" onClick={onInstall}>{t("io.installBtn")}</button>}
          </div>
        )}
      </div>
      <div className="io-grid">
        <div className="card io-card drop-zone" role="button" tabIndex={0} aria-label={`${t("io.import")}. ${t("io.importSub")}`} onKeyDown={activateKey(()=>fileRef.current?.click())} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onImportFile(e.dataTransfer.files[0]);}}>
          <input ref={fileRef} type="file" accept={nativeShareHook()?undefined:".json,.csv,application/json,text/csv"} aria-label={t("import.title")} onClick={e=>e.stopPropagation()} onChange={e=>{onImportFile(e.target.files[0]);e.target.value="";}}/>
          <span className="io-ico" style={{color:"var(--accent-text)"}}><Icon name="upload" size={24}/></span>
          <div className="list-title">{t("io.import")}</div>
          <div className="list-sub">{t("io.importSub")}</div>
        </div>
        <div className="card io-card">
          <span className="io-ico" style={{color:"var(--violet)"}}><Icon name="download" size={24}/></span>
          <div className="list-title">{t("io.export")}</div>
          <div className="list-sub">{t("set.exportCsvSub")}</div>
          <button className="btn btn-sm" onClick={onExportCSV} style={{marginTop:10}}><Icon name="download" size={12}/>{t("io.exportCsv")}</button>
        </div>
      </div>
      <div className="section-title">{t("io.backups")}</div>
      <div className="card">
        {lastBackup?(
          <div className="io-backup">
            <div style={{minWidth:0}}>
              <div className="list-sub">{t("set.lastBackup")}</div>
              <div className="list-title">{fmtLongDate(lastBackup)}</div>
            </div>
            <span className={`io-status${confirmed?" ok":""}`}>{confirmed?<><Icon name="check" size={12}/>{t("io.confirmed")}</>:t("io.unconfirmed")}</span>
          </div>
        ):(
          <div className="list-title" style={{color:"var(--neg)"}}>{t("set.noBackup")}</div>
        )}
        <div className="list-sub" style={{marginTop:8,lineHeight:1.5}}>
          {lastBackup && (confirmed ? t("set.confirmedOn",{date:fmtLongDate(backupConfirmedAt)}) : t("set.notConfirmed"))}{lastBackup?" ":""}{t("set.cantTell")}
        </div>
        {canShareFiles&&onShareBackup&&<>
          <button className="btn btn-primary btn-full io-share" onClick={onShareBackup} style={{marginTop:12}}><Icon name="upload" size={16}/>{t("io.shareBackup")}</button>
          <div className="list-sub" style={{marginTop:6,lineHeight:1.5}}>{t("io.shareHint")}</div>
        </>}
        <button className={`btn ${canShareFiles&&onShareBackup?"btn-ghost":"btn-primary"} btn-full`} onClick={onExportJSON} style={{marginTop:canShareFiles&&onShareBackup?8:12}}><Icon name="backup" size={16}/>{t("io.createBackup")}</button>
        {lastBackup && !confirmed && <button className="btn btn-ghost btn-full" onClick={onConfirmBackup}>{t("banner.haveFile")}</button>}
        <div className="list-sub" style={{marginTop:8}}>{tn("set.jsonBackupSub",transactions.length)}</div>
        {onExportEncrypted&&<EncryptedBackup onExportEncrypted={onExportEncrypted}/>}
      </div>
    </div>
  );
}

