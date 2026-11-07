// Run 34 (7 Nov 2026): the "Claude app feel" for things that open and close INSIDE a screen (explanations, editors, folds, tips, banners).
// Before this, they were drawn with `{open && ...}`: they appeared with a fade but vanished in one frame when closed.
// Rules (from the owner's recordings of the Claude Android app, design-refs/claude-app-feel): about 0.25 s, fast start and soft landing, no bounce,
// the close is as smooth as the open, and nothing jumps. Reduced motion / "Reduce effects" users get the plain instant behaviour.
import { useEffect, useRef, useState } from "react";

export const MOTION_MS=260;   // how long a closing element stays drawn (must match the CSS transition below, see styles.js ".collapse")

export function motionOff() {
  try {
    if (typeof document!=="undefined" && document.documentElement.getAttribute("data-fx")==="off") return true;
    return !!(typeof window!=="undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch { return false; }
}

// Keeps something drawn while it plays its closing motion. mounted = draw it; shown = it is in its open look.
export function usePresence(open, ms=MOTION_MS) {
  const [mounted,setMounted]=useState(!!open), [shown,setShown]=useState(!!open);
  useEffect(()=>{
    if (open) {
      setMounted(true);
      if (motionOff()) { setShown(true); return undefined; }
      let r2=0; const r1=requestAnimationFrame(()=>{ r2=requestAnimationFrame(()=>setShown(true)); });
      return ()=>{ cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    setShown(false);
    if (motionOff()) { setMounted(false); return undefined; }
    const to=setTimeout(()=>setMounted(false),ms);
    return ()=>clearTimeout(to);
  },[open,ms]);
  return { mounted, shown };
}

// Height + fade. Children stay mounted until the close finishes, so their state and their text do not vanish mid-motion.
export function Collapse({ open, children, id, className="", ms=MOTION_MS }) {
  const { mounted, shown }=usePresence(open,ms);
  const [settled,setSettled]=useState(!!open);
  useEffect(()=>{ if (!shown) { setSettled(false); return undefined; } if (motionOff()) { setSettled(true); return undefined; } const to=setTimeout(()=>setSettled(true),ms); return ()=>clearTimeout(to); },[shown,ms]);
  if (!mounted) return null;
  return (
    <div id={id} className={"collapse"+(shown?" is-open":"")+(settled?" is-settled":"")+(className?" "+className:"")} aria-hidden={shown?undefined:true}>
      <div className="collapse-in">{children}</div>
    </div>
  );
}

// A region whose content is replaced (another month, Expenses/Income, another list): the new content fades and rises in instead of snapping.
// `k` changes when the content changes. `dir` (-1, 0, 1) nudges the entry sideways for forward/back (months).
export function Swap({ k, dir=0, className="", children, ...rest }) {
  const first=useRef(true); const [n,setN]=useState(0);
  useEffect(()=>{ if (first.current) { first.current=false; return; } setN(x=>x+1); },[k]);
  return <div key={n} className={"swap"+(n>0?" swap-in":"")+(dir>0?" swap-next":dir<0?" swap-prev":"")+(className?" "+className:"")} {...rest}>{children}</div>;
}

// A row/chip that leaves smoothly before it is removed from its list (the owner's template delete: it vanished at once).
// Call leave(() => actuallyRemove()). The row gets class "row-leaving" for MOTION_MS.
export function useLeave() {
  const [leaving,setLeaving]=useState(()=>new Set());
  const timers=useRef([]);
  useEffect(()=>()=>{ timers.current.forEach(clearTimeout); },[]);
  const leave=(key,done)=>{
    if (motionOff()) { done(); return; }
    setLeaving(s=>{ const n=new Set(s); n.add(key); return n; });
    timers.current.push(setTimeout(()=>{ done(); setLeaving(s=>{ const n=new Set(s); n.delete(key); return n; }); },MOTION_MS-40));
  };
  return { isLeaving:(key)=>leaving.has(key), leave };
}
