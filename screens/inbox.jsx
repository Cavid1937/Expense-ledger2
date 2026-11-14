// Run 85 (owner, 14 Nov, Oppo A78 photo: the backup card "occupies too much space"; "a separate notifications section on the top of screen can be better").
// Routine notices (backup due, "do you have the file?", the iPhone note, the bill-restore offer) no longer push the page down. They live behind a
// bell in the top bar with a small count; tapping it opens a soft panel under the bar with each notice and its buttons.
// Warnings about the data's safety (cannot save, recovered data, an update ready) are NOT moved here: they stay as banners on every screen.
import { useEffect, useRef, useState } from "react";
import { t } from "../i18n.js";
import { usePresence, useBackStep } from "./motion.jsx";

// notices: [{ id, text, actions:[{ label, onClick, primary, close }], onDismiss }]
export function NoticeBell({ notices }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const n = notices.length;
  const { mounted, shown } = usePresence(open, 220);
  // A new notice makes the bell nod once, so it is noticed without taking space.
  const [nod, setNod] = useState(false);
  const prevN = useRef(n);
  useEffect(() => {
    if (n > prevN.current) { setNod(true); const to = setTimeout(() => setNod(false), 900); prevN.current = n; return () => clearTimeout(to); }
    // the last notice was answered: close the panel (an empty bell can still be opened on purpose)
    if (n === 0 && prevN.current > 0) setOpen(false);
    prevN.current = n;
    return undefined;
  }, [n]);
  useBackStep(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDoc, true); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const label = n ? t("inbox.label", { n }) : t("inbox.empty");
  return (
    <div className="inbox-wrap" ref={wrap}>
      <button type="button" className={"topbar-btn inbox-bell" + (n ? " has" : "") + (nod ? " nod" : "") + (open ? " on" : "")} aria-expanded={open} aria-controls="inbox-pop"
        aria-label={label} title={label} data-inbox-bell data-notices={notices.map((x) => x.id).join(" ")} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
        </svg>
        {n > 0 && <span className="inbox-count" aria-hidden="true">{n > 9 ? "9+" : n}</span>}
      </button>
      {mounted && (
        <div id="inbox-pop" className={"inbox-pop" + (shown ? " in" : "")} role="region" aria-label={t("inbox.title")} data-inbox-pop>
          <div className="inbox-title">{t("inbox.title")}</div>
          {n === 0 && <div className="inbox-none">{t("inbox.empty")}</div>}
          {notices.map((x) => (
            <div key={x.id} className="inbox-item" data-notice={x.id}>
              <div className="inbox-text">{x.text}</div>
              <div className="inbox-acts">
                {(x.actions || []).map((a, i) => (
                  <button key={i} type="button" className={"inbox-btn" + (a.primary ? " primary" : "")} data-act={a.key || i} onClick={() => { a.onClick(); if (a.close !== false) setOpen(false); }}>{a.label}</button>
                ))}
                {x.onDismiss && <button type="button" className="inbox-btn" data-act="later" onClick={x.onDismiss}>{t("inbox.later")}</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
