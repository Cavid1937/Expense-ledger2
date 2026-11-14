// Run 75 (owner, 13 Nov: the phone's grey date and option windows look foreign in the app): the app's own pickers, as bottom sheets in the
// app's colours and languages. The real <select> / <input type="date"> stays in the page, hidden, and still holds the value: forms, saving,
// validation and the tests use it exactly as before. The visible button opens the sheet; a choice is sent through the control's own onChange.
import { Children, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../i18n.js";
import { Icon, fmtLongDate, localDateStr, parseLocalDate, isValidDateStr } from "../App.jsx";

const fire = (onChange, value, name, id) => { if (onChange) onChange({ target: { value, name, id }, currentTarget: { value, name, id }, preventDefault() {}, stopPropagation() {} }); };
// The visible button gets the field's label (the <label for=id> next to it), so screen readers announce it like the real control.
function useLabelText(id) {
  const [txt, setTxt] = useState("");
  useEffect(() => { if (!id || typeof document === "undefined") return; const l = document.querySelector(`label[for="${CSS.escape(id)}"]`); if (l) setTxt(l.textContent.trim()); }, [id]);
  return txt;
}
// The sheet is drawn at the top of the page (a portal), so a folding section or a moving form around the field can never clip or hide it.
// Run 78 (owner, 14 Nov: the calendar and the "how often" list "close and select instantly"): a choice lights up first, then the sheet slides
// down (the same 0.2 s fall every other sheet uses). While it leaves it is no longer a dialog, so screen readers and tests see it closed at once.
// children may be a function: it receives close(delay) so a choice can be shown for a moment before the sheet goes.
const reducedMotion = () => typeof window !== "undefined" && !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const PICK_SHOW_MS = 140, PICK_FALL_MS = 210;
function PickSheet({ title, onClose, children, section }) {
  const [leaving, setLeaving] = useState(false);
  const state = useRef({ going: false, timers: [] });
  const doneRef = useRef(onClose); doneRef.current = onClose;
  useEffect(() => () => state.current.timers.forEach(clearTimeout), []);
  const close = (delay = 0) => {
    const s = state.current; if (s.going) return; s.going = true;
    if (reducedMotion()) { doneRef.current(); return; }
    const fall = () => { setLeaving(true); s.timers.push(setTimeout(() => doneRef.current(), PICK_FALL_MS)); };
    if (delay > 0) s.timers.push(setTimeout(fall, delay)); else fall();
  };
  useEffect(() => { const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }; document.addEventListener("keydown", k, true); return () => document.removeEventListener("keydown", k, true); }, []);
  // A backdrop tap is first animated by the app's shared sheet handler, which then marks the overlay (data-out) and repeats the tap: close at once then.
  const onBackdrop = (e) => { if (e.target !== e.currentTarget) return; if (e.currentTarget.dataset.out === "1") { state.current.going = true; doneRef.current(); } else close(); };
  return createPortal((
    <div className={`sheet-overlay pick-overlay${leaving ? " leaving" : ""}`} aria-hidden={leaving || undefined} onClick={onBackdrop}>
      <div className="sheet pick-sheet" role={leaving ? undefined : "dialog"} aria-modal={leaving ? undefined : "true"} tabIndex={-1} aria-label={leaving ? undefined : title} data-section={leaving ? undefined : section}>
        <div className="sheet-grip"><div className="sheet-handle" /></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div className="sheet-title" style={{ margin: 0, overflowWrap: "anywhere" }}>{title}</div>
          <button type="button" className="icon-btn pick-close" aria-label={t("pick.close")} onClick={() => close()}><Icon name="close" size={18} /></button>
        </div>
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>
  ), document.body);
}

// Drop-in for <select>: same props, same <option> children.
export function PickSelect({ children, value, onChange, id, name, disabled, className, style, ...rest }) {
  const [open, setOpen] = useState(false);
  const label = useLabelText(id);
  const opts = useMemo(() => {
    const out = [];
    const walk = (ch) => Children.forEach(ch, (c) => { if (!c || typeof c !== "object") return; if (c.type === "option") out.push({ value: String(c.props.value ?? (typeof c.props.children === "string" ? c.props.children : "")), label: Children.toArray(c.props.children).join(""), disabled: !!c.props.disabled }); else if (c.props && c.props.children) walk(c.props.children); });
    walk(children); return out;
  }, [children]);
  const cur = opts.find((o) => o.value === String(value ?? "")) || opts[0];
  const [just, setJust] = useState(null);
  useEffect(() => { if (open) setJust(null); }, [open]);
  const pick = (v, close) => { setJust(v); if (v !== String(value ?? "")) fire(onChange, v, name, id); close(PICK_SHOW_MS); };
  return (
    <span className="pick-wrap" style={style && style.width ? { width: style.width } : undefined}>
      <select {...rest} id={id} name={name} value={value} onChange={onChange} disabled={disabled} className={`${className || ""} pick-native`} tabIndex={-1} aria-hidden="true">{children}</select>
      <button type="button" className={`${className || "field-input field-select"} pick-btn`} style={style} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={label ? `${label}: ${cur ? cur.label : ""}` : undefined} data-pick-for={id} onClick={() => setOpen(true)}>
        <span className="pick-text">{cur ? cur.label : ""}</span><Icon name="chevDown" size={14} />
      </button>
      {open && (
        <PickSheet title={label || t("pick.choose")} onClose={() => setOpen(false)} section="pick-select-sheet">
          {(close) => (
          <div role="listbox" aria-label={label || t("pick.choose")} className="pick-list">
            {opts.map((o) => { const on = cur && o.value === cur.value; return (
              <button key={o.value} type="button" role="option" aria-selected={on} disabled={o.disabled} data-value={o.value} className={`pick-opt${on ? " on" : ""}${just === o.value ? " just" : ""}`} onClick={() => pick(o.value, close)}>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{o.label}</span>{on && <span className="pick-check"><Icon name="check" size={16} /></span>}
              </button>); })}
          </div>
          )}
        </PickSheet>
      )}
    </span>
  );
}

// Drop-in for <input type="date">: value "YYYY-MM-DD" (or ""), min / max respected, required means no Clear.
export function PickDate({ value, onChange, id, name, min, max, required, disabled, className, style, ...rest }) {
  const [open, setOpen] = useState(false);
  const label = useLabelText(id);
  const today = localDateStr(), yest = localDateStr(new Date(Date.now() - 864e5));
  const valid = isValidDateStr(value || "");
  const [view, setView] = useState(() => (valid ? value : today).slice(0, 7));
  useEffect(() => { if (open) setView((isValidDateStr(value || "") ? value : today).slice(0, 7)); }, [open]);
  const ok = (d) => (!min || d >= min) && (!max || d <= max);
  const [just, setJust] = useState(null);
  const pick = (d, close) => { setJust(d); if (d !== value) fire(onChange, d, name, id); close(PICK_SHOW_MS); };
  const [y, m] = view.split("-").map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), lead = (first.getDay() + 6) % 7;
  // Always six weeks of cells, so the sheet keeps its height when the month changes instead of jumping.
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${view}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length < 42) cells.push(null);
  // The month slides in from the side it was asked for (next: from the right, back: from the left); the first month just appears.
  const [dir, setDir] = useState(0);
  useEffect(() => { if (open) { setDir(0); setJust(null); } }, [open]);
  const move = (k) => { const d = new Date(y, m - 1 + k, 1); setDir(k > 0 ? 1 : -1); setView(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const slide = dir > 0 ? " in-next" : dir < 0 ? " in-prev" : "";
  const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const gridRef = useRef(null);
  return (
    <span className="pick-wrap" style={style && style.width ? { width: style.width } : undefined}>
      <input {...rest} type="date" id={id} name={name} value={value} onChange={onChange} min={min} max={max} required={required} disabled={disabled} className={`${className || ""} pick-native`} tabIndex={-1} aria-hidden="true" />
      <button type="button" className={`${className || "field-input"} pick-btn`} style={style} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={label ? `${label}: ${valid ? fmtLongDate(parseLocalDate(value)) : t("pick.none")}` : undefined} data-pick-for={id} onClick={() => setOpen(true)}>
        <span className="pick-text">{valid ? fmtLongDate(parseLocalDate(value)) : t("pick.none")}</span><Icon name="calendar" size={15} />
      </button>
      {open && (
        <PickSheet title={label || t("pick.date")} onClose={() => setOpen(false)} section="pick-date-sheet">
          {(close) => (<>
          <div className="pick-quick">
            {ok(today) && <button type="button" className={`chip${value === today ? " on" : ""}`} data-quick="today" onClick={() => pick(today, close)}>{t("pick.today")}</button>}
            {ok(yest) && <button type="button" className={`chip${value === yest ? " on" : ""}`} data-quick="yesterday" onClick={() => pick(yest, close)}>{t("pick.yesterday")}</button>}
            {!required && value && <button type="button" className="chip" data-quick="clear" onClick={() => pick("", close)}>{t("pick.clear")}</button>}
          </div>
          <div className="pick-month">
            <button type="button" className="icon-btn" aria-label={t("pick.prev")} onClick={() => move(-1)}><Icon name="chevLeft" size={18} /></button>
            <div className="pick-month-name" aria-live="polite"><span key={view} className={`pick-month-label${slide}`}>{t("date.monthYear", { m: t("mon." + m), y })}</span></div>
            <button type="button" className="icon-btn" aria-label={t("pick.next")} onClick={() => move(1)}><Icon name="chevRight" size={18} /></button>
          </div>
          <div className="pick-grid-clip">
          <div key={view} className={`pick-grid${slide}`} ref={gridRef} role="grid">
            {DOW.map((d) => <div key={d} className="pick-dow" aria-hidden="true">{t("wdShort." + d)}</div>)}
            {cells.map((d, i) => d === null ? <div key={"b" + i} className="pick-blank" /> : (
              <button key={d} type="button" className={`pick-day${d === value ? " on" : ""}${d === today ? " today" : ""}${d === just ? " just" : ""}`} disabled={!ok(d)} aria-pressed={d === value} aria-label={fmtLongDate(parseLocalDate(d))} data-date={d} onClick={() => pick(d, close)}>{Number(d.slice(8))}</button>))}
          </div>
          </div>
          </>)}
        </PickSheet>
      )}
    </span>
  );
}
