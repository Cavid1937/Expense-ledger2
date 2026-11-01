import re
p="/mnt/user-data/outputs/expense-tracker.jsx"
s=open(p,encoding="utf-8").read()
def rep(label,old,new,regex=False,count=1):
    global s
    n=len(re.findall(old,s,flags=re.S)) if regex else s.count(old)
    assert n==count,(label,n)
    s=re.sub(old,lambda m:new,s,flags=re.S) if regex else s.replace(old,new); print("  ✓",label)
def lum(h):
    h=h.lstrip("#"); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b): la,lb=lum(a),lum(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)
BG,CARD="#F7F4EE","#FDFCF9"
# choose greys (same warm hue) that clear WCAG AA 4.5:1 on BOTH surfaces; keep four distinct tiers
def pick(start_r,start_g,start_b,minr):
    r,g,b=start_r,start_g,start_b
    while min(cr(f"#{r:02X}{g:02X}{b:02X}",BG),cr(f"#{r:02X}{g:02X}{b:02X}",CARD))<minr: r-=1;g-=1;b-=1
    return f"#{r:02X}{g:02X}{b:02X}"
INK4=pick(0x8A,0x85,0x7D,4.5); INK3="#5F5A53"
print(f"  contrast: ink-3 {INK3} {cr(INK3,BG):.2f}:1 / {cr(INK3,CARD):.2f}:1 · ink-4 {INK4} {cr(INK4,BG):.2f}:1 / {cr(INK4,CARD):.2f}:1 (AA text = 4.5)")
assert cr(INK3,BG)>=4.5 and cr(INK4,BG)>=4.5 and cr(INK4,CARD)>=4.5 and cr("#3D3A35",BG)>cr(INK3,BG)>cr(INK4,BG)
rep("palette: AA-compliant secondary greys","--ink-3:#7A756D;--ink-4:#B5B0A8;",f"--ink-3:{INK3};--ink-4:{INK4};")

CSS='''/* ── Design pass ── */
/* Money reads as aligned, lining figures */
.hero-amount,.hero-stat-val,.safe-amount,.safe-val,.stat-val,.month-stat-val,.txn-amt,.txn-date-total,.cat-bar-amt,.budget-nums,.amount-input,.wc-diff,.goal-meta{font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1}
/* Touch targets: the look stays, the tappable area grows to 44px */
.topbar-btn,.add-close,.toggle-track,.snackbar-undo{position:relative}
.topbar-btn::after,.add-close::after{content:"";position:absolute;inset:-5px}
.sheet .topbar-btn::after{inset:-9px}
.toggle-track::after{content:"";position:absolute;inset:-10px -4px}
.chip,.sub-chip{min-height:34px;display:inline-flex;align-items:center}
.btn-sm,.snackbar-undo{min-height:36px}
/* Sheets follow the finger while dragged (see useSheetGestures) */
.sheet-grip{margin:0 -20px;padding:12px 0 8px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.sheet-grip:active{cursor:grabbing}
.sheet-grip .sheet-handle{margin:0 auto}
.sheet.dragging{animation:none;transition:none;will-change:transform}
.sheet:focus{outline:none}
/* Materials follow the user's preferences */
@media (prefers-reduced-transparency: reduce){
  .topbar,.tabbar{background:var(--bg);backdrop-filter:none;-webkit-backdrop-filter:none}
  .sheet-overlay{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(26,24,20,0.62)}
}
@media (prefers-contrast: more){
  :root{--rule:#8B867E;--rule-2:#5F5A53;--ink-3:#4A4640;--ink-4:#504B45}
  .sheet-overlay{background:rgba(26,24,20,0.72)}
  .btn-ghost,.chip,.sub-chip,.field-input,.cat-tile,.search-input,.tpl-card{border-color:var(--rule-2)}
}
'''
rep("CSS: figures, hit areas, grip, materials","@media (prefers-reduced-motion: reduce){",CSS+"@media (prefers-reduced-motion: reduce){")

# ── sheets: grip, labels, focusable container ──
rep("sheet grip (all sheets)",r'<div className="sheet-handle"/>','<div className="sheet-grip"><div className="sheet-handle"/></div>',regex=True,count=4)
def rep_in(fn,label,old,new):
    global s
    a=s.index(f"function {fn}("); m=re.search(r"\n(?:export default )?function ",s[a+10:]); b=a+10+m.start() if m else len(s)
    seg=s[a:b]; assert seg.count(old)==1,(label,seg.count(old)); s=s[:a]+seg.replace(old,new)+s[b:]; print("  ✓",label)
rep_in("LedgerPage","category sheet dialog attributes",'<div className="sheet">','<div className="sheet" role="dialog" aria-modal="true" aria-label="Filter by category" tabIndex={-1}>')
rep_in("TxnDetailSheet","detail sheet dialog attributes",'<div className="sheet">','<div className="sheet" role="dialog" aria-modal="true" aria-label="Transaction details" tabIndex={-1}>')
rep_in("SettingsSheet","settings sheet dialog attributes",'<div className="sheet">','<div className="sheet" role="dialog" aria-modal="true" aria-label="Settings" tabIndex={-1}>')
rep("import sheet focusable",'aria-label="Restore backup">','aria-label="Restore backup" tabIndex={-1}>')

# ── switches: keyboard + names ──
rep("recurring switch: keyboard",'<div className={`toggle-track${recur?" on":""}`} onClick={()=>setRecur(r=>!r)} role="switch" aria-checked={recur} tabIndex={0}>',
 '<div className={`toggle-track${recur?" on":""}`} onClick={()=>setRecur(r=>!r)} onKeyDown={e=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); setRecur(r=>!r); } }} role="switch" aria-label="Recurring" aria-checked={recur} tabIndex={0}>')
rep("Safe to Spend switch: keyboard",'<div className={`toggle-track${safeToSpend.enabled?" on":""}`} onClick={()=>onSafeToSpendChange({enabled:!safeToSpend.enabled})} role="switch" aria-checked={safeToSpend.enabled} tabIndex={0}>',
 '<div className={`toggle-track${safeToSpend.enabled?" on":""}`} onClick={()=>onSafeToSpendChange({enabled:!safeToSpend.enabled})} onKeyDown={e=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); onSafeToSpendChange({enabled:!safeToSpend.enabled}); } }} role="switch" aria-label="Safe to Spend" aria-checked={!!safeToSpend.enabled} tabIndex={0}>')

# ── gesture layer + haptic helper ──
HOOK=r'''// Small physical confirmation where the device supports it (no-op elsewhere).
function haptic(ms=10) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} }

// ─── Sheet gestures ──────────────────────────────────────────────────────────
// • Swipe down on a sheet's grip: the sheet follows the finger 1:1; on release the finger's velocity is handed to a spring that
//   either dismisses it or settles it back. The motion starts from where the sheet visibly is, so it can be grabbed again mid-flight.
// • Escape closes the top-most layer. Focus moves into a layer when it opens and returns to where it was when it closes;
//   Tab stays inside the open layer. Reduced-motion users get no spring (the sheet simply closes or resets).
function useSheetGestures() {
  useEffect(()=>{
    const reduced=()=>!!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let drag=null, anim=null;
    const stop=()=>{ if (anim) { cancelAnimationFrame(anim.raf); anim=null; } };
    const apply=(sheet,overlay,y,h)=>{ sheet.style.transform=`translateY(${y}px)`; overlay.style.background=`rgba(26,24,20,${0.5*(1-Math.min(1,Math.max(0,y)/h))})`; };
    const spring=(sheet,overlay,from,to,v0,h,done)=>{
      stop(); if (reduced()) { apply(sheet,overlay,to,h); done(); return; }
      let x=from, v=v0, last=performance.now(); const k=380, c=2*Math.sqrt(k)*0.92;
      const step=(now)=>{ const dt=Math.min(0.032,(now-last)/1000); last=now; v+=(-k*(x-to)-c*v)*dt; x+=v*dt; apply(sheet,overlay,x,h);
        if (Math.abs(x-to)<0.4 && Math.abs(v)<8) { apply(sheet,overlay,to,h); anim=null; done(); } else anim.raf=requestAnimationFrame(step); };
      anim={ raf:requestAnimationFrame(step) };
    };
    const onDown=(e)=>{
      const grip=e.target.closest && e.target.closest(".sheet-grip"); if (!grip) return;
      const sheet=grip.closest(".sheet"), overlay=grip.closest(".sheet-overlay"); if (!sheet||!overlay) return;
      stop(); let cur=0; try { cur=new DOMMatrix(getComputedStyle(sheet).transform).m42||0; } catch {}
      drag={ sheet, overlay, pid:e.pointerId, startY:e.clientY-cur, y:cur, h:sheet.getBoundingClientRect().height, samples:[{t:e.timeStamp,y:cur}] };
      sheet.classList.add("dragging"); try { grip.setPointerCapture(e.pointerId); } catch {}
    };
    const onMove=(e)=>{
      if (!drag || e.pointerId!==drag.pid) return;
      let y=e.clientY-drag.startY; if (y<0) y*=0.2;                                  // resist pulling up
      drag.y=y; drag.samples.push({t:e.timeStamp,y}); if (drag.samples.length>6) drag.samples.shift();
      apply(drag.sheet,drag.overlay,y,drag.h);
    };
    const onUp=(e)=>{
      if (!drag || e.pointerId!==drag.pid) return;
      const d=drag; drag=null; d.sheet.classList.remove("dragging");
      const a=d.samples[0], b=d.samples[d.samples.length-1], v=(b.t-a.t)>0 ? ((b.y-a.y)/(b.t-a.t))*1000 : 0;   // px/s
      if (d.y+v*0.2>d.h*0.45 || v>900) spring(d.sheet,d.overlay,d.y,d.h,v,d.h,()=>{ d.overlay.click(); });        // closes through the sheet's own handler
      else spring(d.sheet,d.overlay,d.y,0,v,d.h,()=>{ d.sheet.style.transform=""; d.overlay.style.background=""; });
    };
    const onKey=(e)=>{
      if (e.key==="Escape" && !e.defaultPrevented) {
        const add=document.querySelector(".add-overlay .add-close"); if (add) { add.click(); e.preventDefault(); return; }
        const sheets=document.querySelectorAll(".sheet-overlay"); if (sheets.length) { sheets[sheets.length-1].click(); e.preventDefault(); }
      } else if (e.key==="Tab") {
        const layers=document.querySelectorAll(".add-overlay,.sheet"); const top=layers[layers.length-1]; if (!top) return;
        const f=[...top.querySelectorAll('button,[href],input:not([type=file]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled && x.offsetParent!==null);
        if (!f.length) return;
        const first=f[0], last=f[f.length-1], inside=top.contains(document.activeElement);
        if (!inside || (e.shiftKey && document.activeElement===first)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); }
      }
    };
    const stack=[];
    const sync=()=>{
      document.querySelectorAll(".sheet,.add-overlay").forEach(el=>{
        if (stack.some(x=>x.el===el)) return;
        stack.push({ el, prev:document.activeElement });
        if (el.classList.contains("sheet")) el.focus({ preventScroll:true });
      });
      for (let i=stack.length-1;i>=0;i--) if (!document.contains(stack[i].el)) { const { prev }=stack.splice(i,1)[0]; if (prev && document.contains(prev) && prev.focus) prev.focus({ preventScroll:true }); }
    };
    const mo=new MutationObserver(sync); mo.observe(document.body,{ childList:true, subtree:true });
    document.addEventListener("pointerdown",onDown); document.addEventListener("pointermove",onMove);
    document.addEventListener("pointerup",onUp); document.addEventListener("pointercancel",onUp); document.addEventListener("keydown",onKey);
    return ()=>{ stop(); mo.disconnect(); document.removeEventListener("pointerdown",onDown); document.removeEventListener("pointermove",onMove);
      document.removeEventListener("pointerup",onUp); document.removeEventListener("pointercancel",onUp); document.removeEventListener("keydown",onKey); };
  },[]);
}

'''
rep("insert gesture hook + haptic helper","// ─────────────────────────────────────────────────────────────────────────────\n// ROOT APP",HOOK+"// ─────────────────────────────────────────────────────────────────────────────\n// ROOT APP")
rep("mount the hook","  stateRef.current = state;   // always the latest committed state, for callbacks that must not close over a stale copy",
 "  stateRef.current = state;   // always the latest committed state, for callbacks that must not close over a stale copy\n  useSheetGestures();")
rep("haptic: recorded","showToast(\"Transaction recorded\");","haptic(); showToast(\"Transaction recorded\");")
rep("haptic: updated","showToast(\"Transaction updated\");","haptic(); showToast(\"Transaction updated\");")
rep("haptic: deleted","    if (!removed) return;\n    setState(s=>({...s,transactions:s.transactions.filter(t=>t.id!==id)}));","    if (!removed) return;\n    haptic(14);\n    setState(s=>({...s,transactions:s.transactions.filter(t=>t.id!==id)}));")
open(p,"w",encoding="utf-8").write(s)
