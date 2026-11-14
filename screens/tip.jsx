// Run 83 (owner, 14 Nov: "instead of invading app with texts ... small ℹ️ button to some of the important places. It will come smoothly
// and fade back smoothly when touched and explain that feature"). A heading with a small info button; the explanation opens under it as a
// soft bubble and closes by tapping the button or the bubble, tapping elsewhere, Escape or Android Back.
// Never use it to hide something a person must read before acting (privacy or account disclosures, warnings, errors).
import { useEffect, useRef, useState } from "react";
import { t } from "../i18n.js";
import { Collapse, useBackStep } from "./motion.jsx";

let tipSeq = 0;

export function TipHead({ id, text, className = "", style, children }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const uid = useRef(null);
  if (uid.current === null) { tipSeq += 1; uid.current = "tip-" + (id || tipSeq); }
  useBackStep(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDoc, true); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={wrap} className="tip-wrap" data-tip={id}>
      <div className={"tip-head " + className} style={style}>
        <span className="tip-head-text">{children}</span>
        <button type="button" className={"tip-btn" + (open ? " on" : "")} aria-expanded={open} aria-controls={uid.current} aria-label={t("tip.more")} data-tip-btn={id} onClick={() => setOpen((o) => !o)}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 10.6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="7.6" r="1.15" fill="currentColor" />
          </svg>
        </button>
      </div>
      <Collapse open={open} id={uid.current}>
        <div className={"tip-pop" + (open ? " in" : "")} role="note" data-tip-pop={id} onClick={() => setOpen(false)}>{text}</div>
      </Collapse>
    </div>
  );
}
