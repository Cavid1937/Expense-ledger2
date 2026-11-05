// Run 27: moved out of App.jsx unchanged (App.jsx was ~6,400 lines). Imports are listed so each piece can be read on its own.
import { useEffect, useRef, useState } from "react";
import { setLang, t } from "../i18n.js";
import { Icon, LOCK_AFTER_KEY, LOCK_TIMEOUTS, bioAvailable, bioCheck, bioRegister, lockLang, lockShouldEngage, lockSupported, lockWaitMs, makeLockRecord, readLock, removeLock, validPin, verifyPin, writeLock } from "../App.jsx";

export function LockGate({ children }) {
  const [lock,setLock]=useState(()=>readLock());
  const [locked,setLocked]=useState(()=>readLock()!==null);
  const lockRef=useRef(lock), lockedRef=useRef(locked), seen=useRef({ hidden:0, active:Date.now() });
  lockRef.current=lock; lockedRef.current=locked;
  useEffect(()=>{
    const arm=()=>{ const l=lockRef.current; return !!(l&&l.ok)&&!lockedRef.current; };
    const onVis=()=>{
      if (document.visibilityState==="hidden") { seen.current.hidden=Date.now(); return; }
      const l=lockRef.current;
      if (seen.current.hidden && arm() && lockShouldEngage(l.rec.timeout,"away",Date.now()-seen.current.hidden)) setLocked(true);
      seen.current.hidden=0; seen.current.active=Date.now();
    };
    const touch=()=>{ seen.current.active=Date.now(); };
    const tick=setInterval(()=>{ if (arm() && lockShouldEngage(lockRef.current.rec.timeout,"idle",Date.now()-seen.current.active)) setLocked(true); },5000);
    const onChanged=()=>{ const l=readLock(); setLock(l); if (!l) setLocked(false); };
    const onNow=()=>{ const l=readLock(); setLock(l); if (l) setLocked(true); };
    document.addEventListener("visibilitychange",onVis);
    ["pointerdown","keydown","touchstart","scroll"].forEach(e=>window.addEventListener(e,touch,{ passive:true, capture:true }));
    window.addEventListener("ledger-lock-changed",onChanged); window.addEventListener("ledger-lock-now",onNow);
    return ()=>{ clearInterval(tick); document.removeEventListener("visibilitychange",onVis);
      ["pointerdown","keydown","touchstart","scroll"].forEach(e=>window.removeEventListener(e,touch,{ capture:true }));
      window.removeEventListener("ledger-lock-changed",onChanged); window.removeEventListener("ledger-lock-now",onNow); };
  },[]);
  if (locked) setLang(lockLang());
  return (
    <>
      <div style={{ display:locked?"none":"contents" }} aria-hidden={locked||undefined}>{children}</div>
      {locked&&<LockScreen lock={lock} onUnlock={()=>{ seen.current.active=Date.now(); setLock(readLock()); setLocked(false); }} onRemoved={()=>{ setLock(null); setLocked(false); }}/>}
    </>
  );
}
export function LockScreen({ lock, onUnlock, onRemoved }) {
  const damaged=!lock||!lock.ok;
  const [cur,setCur]=useState(()=>damaged?null:lock.rec);
  const [pin,setPin]=useState(""), [msg,setMsg]=useState(""), [busy,setBusy]=useState(false);
  const bioWait=useRef(false);
  const [forgot,setForgot]=useState(damaged), [forgotAt,setForgotAt]=useState(()=>Date.now()), [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{ const i=setInterval(()=>setNow(Date.now()),500); return ()=>clearInterval(i); },[]);
  const waitS=cur&&cur.until>now ? Math.ceil((cur.until-now)/1000) : 0;
  const forgotS=Math.max(0,10-Math.floor((now-forgotAt)/1000));
  const press=(d)=>{ if (busy) return; setMsg(""); setPin(p=>p.length<6?p+d:p); };
  const back=()=>{ if (!busy) { setMsg(""); setPin(p=>p.slice(0,-1)); } };
  const submit=async()=>{
    if (busy||waitS>0||!cur||!validPin(pin)) return;
    setBusy(true);
    const good=await verifyPin(cur,pin);
    if (good) { if (cur.fails||cur.until||!cur.len||cur.resetAt) writeLock({ ...cur, fails:0, until:0, resetAt:0, len:cur.len||pin.length }); onUnlock(); return; }
    const fails=cur.fails+1, w=lockWaitMs(fails), next={ ...cur, fails, until:w?Date.now()+w:0 };
    writeLock(next); setCur(next); setPin(""); setMsg(t("lock.wrong")); setNow(Date.now()); setBusy(false);
  };
  const bio=async()=>{
    // The phone's prompt may stay open or never answer; the PIN keys must keep working meanwhile, so this does not use "busy".
    if (bioWait.current||busy||!cur||!cur.bio) return;
    bioWait.current=true; let good=false; try { good=await bioCheck(cur.bio); } catch { good=false; }
    bioWait.current=false;
    if (good) { onUnlock(); return; }
    setMsg(t("lock.bioFail"));
  };
  useEffect(()=>{
    const onKey=(e)=>{ if (forgot) return; if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key==="Backspace") back(); else if (e.key==="Enter") submit(); };
    window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey);
  });
  // Opens by itself: the phone's fingerprint prompt appears as the lock screen does (it mounts on every lock), and a PIN of the saved length
  // is checked the moment its last digit is typed. Locks saved before the length was stored still use the button until their first unlock.
  useEffect(()=>{ if (cur&&cur.bio&&!forgot) bio(); },[]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{ if (cur&&cur.len&&pin.length===cur.len&&!forgot) submit(); },[pin]); // eslint-disable-line react-hooks/exhaustive-deps
  // Forgot PIN is not a quick bypass any more: with a fingerprint set up it needs that fingerprint; without one the lock can be removed only 24 h
  // after the request (stored with the lock, so closing the app does not restart or skip it; the right PIN cancels it). A damaged lock record
  // protects nothing, so it keeps the short wait. This is still a screen lock, not encryption.
  const FORGOT_DELAY_MS=24*3600*1000;
  const delayLeft=cur&&!cur.bio ? Math.max(0,(cur.resetAt||now)+FORGOT_DELAY_MS-now) : 0;
  const askForgot=()=>{ setForgot(true); setForgotAt(Date.now()); setMsg(""); if (cur&&!cur.bio&&!cur.resetAt) { const n={ ...cur, resetAt:Date.now() }; if (writeLock(n)) setCur(n); } };
  const removeBio=async()=>{
    if (bioWait.current||!cur||!cur.bio) return;
    bioWait.current=true; let good=false; try { good=await bioCheck(cur.bio); } catch { good=false; }
    bioWait.current=false;
    if (good) { removeLock(); onRemoved(); } else setMsg(t("lock.bioFail"));
  };
  const removeDelay=()=>{ if (delayLeft>0) return; removeLock(); onRemoved(); };
  const remove=()=>{ if (forgotS>0) return; removeLock(); onRemoved(); };
  return (
    <div className="lock-screen" role="dialog" aria-modal="true" aria-label={t("lock.screenTitle")} data-section="lock-screen">
      <span className="more-mark" aria-hidden="true"><Icon name="safe" size={26} color="var(--accent)"/></span>
      {forgot ? (
        <div className="lock-card" data-section="lock-forgot">
          <h1 className="lock-title">{t("lock.forgot")}</h1>
          <p className="lock-sub" style={{lineHeight:1.55}}>{damaged?t("lock.damaged"):cur.bio?t("lock.forgotBioBody"):t("lock.forgotDelayBody")}</p>
          <div className="lock-msg" role="alert" data-section="lock-msg">{msg}</div>
          {damaged
            ? <button className="btn btn-primary btn-full" data-section="lock-remove" disabled={forgotS>0} onClick={remove}>{forgotS>0?t("lock.forgotWait",{s:forgotS}):t("lock.forgotGo")}</button>
            : cur.bio
              ? <button className="btn btn-primary btn-full" data-section="lock-remove" onClick={removeBio}>{t("lock.forgotBioGo")}</button>
              : <button className="btn btn-primary btn-full" data-section="lock-remove" disabled={delayLeft>0} onClick={removeDelay}>{delayLeft>0?t("lock.forgotDelayWait",{h:Math.floor(Math.ceil(delayLeft/60000)/60),m:Math.ceil(delayLeft/60000)%60}):t("lock.forgotGo")}</button>}
          {!damaged&&<button className="btn btn-full" style={{marginTop:8}} onClick={()=>setForgot(false)}>{t("lock.back")}</button>}
        </div>
      ) : (
        <div className="lock-card">
          <h1 className="lock-title">{t("lock.screenTitle")}</h1>
          <p className="lock-sub">{t("lock.screenSub")}</p>
          <div className="lock-dots" role="img" aria-label={t("lock.entered",{n:pin.length})} data-section="lock-dots">
            {Array.from({length:Math.max((cur&&cur.len)||4,pin.length)},(_,i)=><span key={i} className={`lock-dot${i<pin.length?" on":""}`}/>)}
          </div>
          <div className="lock-msg" role="alert" data-section="lock-msg">{waitS>0?t("lock.wait",{s:waitS}):msg}</div>
          <div className="lock-pad">
            {["1","2","3","4","5","6","7","8","9"].map(d=><button key={d} type="button" className="numpad-key" onClick={()=>press(d)} disabled={waitS>0}>{d}</button>)}
            {cur&&cur.bio ? <button type="button" className="numpad-key lock-bio" data-section="lock-bio" onClick={bio} aria-label={t("lock.useBio")} title={t("lock.useBio")}><Icon name="safe" size={22}/></button> : <span/>}
            <button type="button" className="numpad-key" onClick={()=>press("0")} disabled={waitS>0}>0</button>
            <button type="button" className="numpad-key" onClick={back} aria-label={t("lock.del")} title={t("lock.del")}><Icon name="close" size={18}/></button>
          </div>
          {!(cur&&cur.len)&&<button className="btn btn-primary btn-full" data-section="lock-go" style={{marginTop:12}} disabled={waitS>0||!validPin(pin)||busy} onClick={submit}>{t("lock.screenTitle")}</button>}
          <button className="btn btn-full" data-section="lock-forgot-btn" style={{marginTop:8}} onClick={askForgot}>{t("lock.forgot")}</button>
        </div>
      )}
    </div>
  );
}
export function LockSheet({ onClose, showToast }) {
  const [lock,setLock]=useState(()=>readLock());
  const rec=lock&&lock.ok?lock.rec:null;
  const [a,setA]=useState(""), [b,setB]=useState(""), [c,setC]=useState(""), [err,setErr]=useState(""), [mode,setMode]=useState("main"), [bioOk,setBioOk]=useState(false);
  useEffect(()=>{ let alive=true; bioAvailable().then(v=>{ if (alive) setBioOk(v); }); return ()=>{ alive=false; }; },[]);
  const announce=()=>{ window.dispatchEvent(new Event("ledger-lock-changed")); setLock(readLock()); };
  const digits=(s)=>s.replace(/[^0-9]/g,"").slice(0,6);
  const reset=()=>{ setA(""); setB(""); setC(""); setErr(""); setMode("main"); };
  const save=async(timeout,bio)=>{ const next=await makeLockRecord(a,timeout,bio); if (!next) { setErr(t("lock.unsupported")); return false; }
    if (!writeLock(next)) { setErr(t("lock.saveFail")); return false; } return true; };
  const doSet=async()=>{
    if (!validPin(a)) return setErr(t("lock.badPin"));
    if (a!==b) return setErr(t("lock.mismatch"));
    if (!(await save(0,null))) return;
    announce(); reset(); showToast(t("lock.saved"));
  };
  const doChange=async()=>{
    if (!(await verifyPin(rec,c))) return setErr(t("lock.currentWrong"));
    if (!validPin(a)) return setErr(t("lock.badPin"));
    if (a!==b) return setErr(t("lock.mismatch"));
    if (!(await save(rec.timeout,rec.bio))) return;
    announce(); reset(); showToast(t("lock.changed"));
  };
  const doOff=async()=>{
    if (!(await verifyPin(rec,c))) return setErr(t("lock.currentWrong"));
    if (!removeLock()) return setErr(t("lock.saveFail"));
    announce(); reset(); showToast(t("lock.offDone"));
  };
  const setTimeoutMin=(m)=>{ if (!rec) return; if (writeLock({ ...rec, timeout:m })) announce(); else setErr(t("lock.saveFail")); };
  const toggleBio=async()=>{
    if (!rec) return; setErr("");
    if (rec.bio) { if (writeLock({ ...rec, bio:null })) announce(); return; }
    try { const id=await bioRegister(); if (!id) throw new Error("none"); if (writeLock({ ...rec, bio:id })) announce(); else setErr(t("lock.saveFail")); }
    catch { setErr(t("lock.bioSetupFail")); }
  };
  const field=(label,val,set,id)=>(
    <div style={{marginBottom:10}}>
      <label className="field-lbl" htmlFor={id}>{label}</label>
      <input id={id} className="field-input" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={val} onChange={e=>{ set(digits(e.target.value)); setErr(""); }}/>
    </div>
  );
  return (
    <div className="sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={t("lock.title")} data-section="lock-sheet">
        <div className="sheet-grip"><div className="sheet-handle"/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}>
          <div className="card-title" style={{fontSize:17}}>{t("lock.title")}</div>
          <button data-closer="1" onClick={onClose} aria-label={t("common.close")} style={{background:"none",border:"1px solid var(--rule)",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-3)",flexShrink:0}}><Icon name="close" size={13}/></button>
        </div>
        <div className="list-sub" style={{lineHeight:1.55,marginBottom:12}} data-section="lock-notenc">{t("lock.notEnc")}</div>
        {!lockSupported()&&<div className="field-error" role="alert">{t("lock.unsupported")}</div>}
        {lock&&!lock.ok&&<div className="field-error" role="alert">{t("lock.damaged")}</div>}
        {!lock&&lockSupported()&&(
          <div data-section="lock-setup">
            {field(t("lock.pin"),a,setA,"lock-pin-a")}
            {field(t("lock.pin2"),b,setB,"lock-pin-b")}
            {err&&<div className="field-error" role="alert">{err}</div>}
            <button className="btn btn-primary btn-full" data-section="lock-save" onClick={doSet}>{t("lock.set")}</button>
          </div>
        )}
        {rec&&mode==="main"&&(
          <div data-section="lock-manage">
            <div className="list-title" style={{marginBottom:6}}>{t("lock.on")}</div>
            <div className="settings-section-lbl" id="lock-when-lbl" style={{marginTop:8}}>{t("lock.when")}</div>
            <fieldset className="lang-switch" aria-labelledby="lock-when-lbl">
              {LOCK_TIMEOUTS.map(m=>(
                <label key={m} className={`lang-pill${rec.timeout===m?" sel":""}`}>
                  <input type="radio" name="lock-after" value={m} checked={rec.timeout===m} onChange={()=>setTimeoutMin(m)}/>{t(LOCK_AFTER_KEY[m])}
                </label>
              ))}
            </fieldset>
            <div className="list-sub" style={{marginTop:6}}>{t("lock.whenSub")}</div>
            <div className="settings-section-lbl" style={{marginTop:14}}>{t("lock.bio")}</div>
            {bioOk
              ? <button className="btn btn-full lock-bio-row" role="switch" aria-checked={!!rec.bio} data-section="lock-bio-toggle" onClick={toggleBio}><span>{t("lock.bio")}</span><span className="lock-switch" aria-hidden="true"/><span className="sr-only">{rec.bio?t("lock.on"):t("lock.off")}</span></button>
              : <div className="list-sub" data-section="lock-bio-no">{t("lock.bioNo")}</div>}
            <div className="list-sub" style={{marginTop:6}}>{t("lock.bioSub")}</div>
            {err&&<div className="field-error" role="alert">{err}</div>}
            <button className="btn btn-full" style={{marginTop:14}} data-section="lock-now" onClick={()=>{ onClose(); window.dispatchEvent(new Event("ledger-lock-now")); }}>{t("lock.now")}</button>
            <button className="btn btn-full" style={{marginTop:8}} data-section="lock-change-go" onClick={()=>{ reset(); setMode("change"); }}>{t("lock.change")}</button>
            <button className="btn btn-full" style={{marginTop:8}} data-section="lock-off-go" onClick={()=>{ reset(); setMode("off"); }}>{t("lock.turnOff")}</button>
          </div>
        )}
        {rec&&mode==="change"&&(
          <div data-section="lock-change">
            {field(t("lock.current"),c,setC,"lock-pin-c")}
            {field(t("lock.newPin"),a,setA,"lock-pin-a")}
            {field(t("lock.pin2"),b,setB,"lock-pin-b")}
            {err&&<div className="field-error" role="alert">{err}</div>}
            <button className="btn btn-primary btn-full" data-section="lock-change-save" onClick={doChange}>{t("lock.change")}</button>
            <button className="btn btn-full" style={{marginTop:8}} onClick={reset}>{t("common.cancel")}</button>
          </div>
        )}
        {rec&&mode==="off"&&(
          <div data-section="lock-off">
            <div className="list-sub" style={{marginBottom:10}}>{t("lock.turnOffHint")}</div>
            {field(t("lock.current"),c,setC,"lock-pin-c")}
            {err&&<div className="field-error" role="alert">{err}</div>}
            <button className="btn btn-primary btn-full" data-section="lock-off-save" onClick={doOff}>{t("lock.turnOff")}</button>
            <button className="btn btn-full" style={{marginTop:8}} onClick={reset}>{t("common.cancel")}</button>
          </div>
        )}
        {lock&&!lock.ok&&<button className="btn btn-full" style={{marginTop:10}} data-section="lock-reset-damaged" onClick={()=>{ removeLock(); announce(); }}>{t("lock.forgotGo")}</button>}
      </div>
    </div>
  );
}
