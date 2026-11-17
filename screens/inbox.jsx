// Run 85 (owner, 14 Nov, Oppo A78 photo: the backup card "occupies too much space"; "a separate notifications section on the top of screen can be better").
// Routine notices (backup due, "do you have the file?", the iPhone note, the bill-restore offer) no longer push the page down. They live behind a
// bell in the top bar with a small count; tapping it opens a soft panel under the bar with each notice and its buttons.
// Warnings about the data's safety (cannot save, recovered data, an update ready) are NOT moved here: they stay as banners on every screen.
// Run 106 (owner: "in-app notifications still don't satisfy me"): what needs the person comes first, each notice shows what kind it is,
// tips sit back, long texts fold to three lines, and a notice put off with "Later" slides away instead of vanishing.
import { useEffect, useRef, useState } from "react";
import { t } from "../i18n.js";
import { usePresence, useBackStep, motionOff } from "./motion.jsx";

// Which kind a notice is, from its id: something to fix, money waiting, a question, or a tip. The order of KINDS is the order shown.
const KINDS = ["warn", "money", "ask", "tip"];
export function noticeKind(id) {
  const s = String(id || "");
  if (/^(storage-low|drive-fail|notices-missed|acc-loose|backup-due)$/.test(s)) return "warn";
  if (/^(bank-pay|bill-restore)$/.test(s)) return "money";
  if (/^(learn-ask|backup-confirm)$/.test(s)) return "ask";
  return "tip";
}
const LONG = 170;
const KindIcon = ({ kind }) => (
  <span className={"inbox-ico k-" + kind} aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      {kind === "warn" && <><path d="M12 4l9 16H3z" /><path d="M12 10v4" /><path d="M12 17.2v.1" /></>}
      {kind === "money" && <><rect x="3" y="6" width="18" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /></>}
      {kind === "ask" && <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4" /><path d="M12 16.8v.1" /></>}
      {kind === "tip" && <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" /></>}
    </svg>
  </span>
);

function NoticeItem({ x, i, onAct }) {
  const kind = noticeKind(x.id);
  const [more, setMore] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const long = String(x.text || "").length > LONG;
  // "Later" lets the card slide away first; the list closes the gap as it goes
  const later = () => { if (motionOff()) { x.onDismiss(); return; } setLeaving(true); setTimeout(x.onDismiss, 240); };
  return (
    <div className={"inbox-item k-" + kind + (leaving ? " leaving" : "")} data-notice={x.id} data-kind={kind} style={{ "--i": i }}>
      <KindIcon kind={kind} />
      <div className="inbox-body">
        <div className={"inbox-text" + (long && !more ? " clamp" : "")} key={more ? "all" : "short"}>{x.text}</div>
        {long && <button type="button" className="inbox-more" aria-expanded={more} onClick={() => setMore((v) => !v)}>{more ? t("inbox.less") : t("inbox.more")}</button>}
        <div className="inbox-acts">
          {(x.actions || []).map((a, k) => (
            <button key={k} type="button" className={"inbox-btn" + (a.primary ? " primary" : "")} data-act={a.key || k} onClick={() => onAct(a)}>{a.label}</button>
          ))}
          {x.onDismiss && <button type="button" className="inbox-btn" data-act="later" disabled={leaving} onClick={later}>{t("inbox.later")}</button>}
        </div>
      </div>
    </div>
  );
}

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
  // what needs the person first; within a kind, the order the app gave
  const sorted = notices.map((x, k) => [x, k]).sort((a, b) => (KINDS.indexOf(noticeKind(a[0].id)) - KINDS.indexOf(noticeKind(b[0].id))) || (a[1] - b[1])).map((p) => p[0]);
  const act = (a) => { a.onClick(); if (a.close !== false) setOpen(false); };
  return (
    <div className="inbox-wrap" ref={wrap}>
      <button type="button" className={"topbar-btn inbox-bell" + (n ? " has" : "") + (nod ? " nod" : "") + (open ? " on" : "")} aria-expanded={open} aria-controls="inbox-pop"
        aria-label={label} title={label} data-inbox-bell data-notices={sorted.map((x) => x.id).join(" ")} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
        </svg>
        {n > 0 && <span className="inbox-count" aria-hidden="true">{n > 9 ? "9+" : n}</span>}
      </button>
      {mounted && (
        <div id="inbox-pop" className={"inbox-pop" + (shown ? " in" : "")} role="region" aria-label={t("inbox.title")} data-inbox-pop>
          <div className="inbox-title">{t("inbox.title")}{n > 0 && <span className="inbox-title-n">{n}</span>}</div>
          {n === 0 && <div className="inbox-none">{t("inbox.empty")}</div>}
          {sorted.map((x, i) => <NoticeItem key={x.id} x={x} i={i} onAct={act} />)}
        </div>
      )}
    </div>
  );
}
