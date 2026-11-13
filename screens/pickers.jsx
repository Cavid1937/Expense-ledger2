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
function PickSheet({ title, onClose, children, section }) {
  useEffect(() => { const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }; document.addEventListener("keydown", k, true); return () => document.removeEventListener("keydown", k, true); }, [onClose]);
  return createPortal((
    <div className="sheet-overlay pick-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet pick-sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={title} data-section={section}>
        <div className="sheet-grip"><div className="sheet-handle" /></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div className="sheet-title" style={{ margin: 0, overflowWrap: "anywhere" }}>{title}</div>
          <button type="button" className="icon-btn pick-close" aria-label={t("pick.close")} onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        {children}
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
  const pick = (v) => { setOpen(false); if (v !== String(value ?? "")) fire(onChange, v, name, id); };
  return (
    <span className="pick-wrap" style={style && style.width ? { width: style.width } : undefined}>
      <select {...rest} id={id} name={name} value={value} onChange={onChange} disabled={disabled} className={`${className || ""} pick-native`} tabIndex={-1} aria-hidden="true">{children}</select>
      <button type="button" className={`${className || "field-input field-select"} pick-btn`} style={style} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={label ? `${label}: ${cur ? cur.label : ""}` : undefined} data-pick-for={id} onClick={() => setOpen(true)}>
        <span className="pick-text">{cur ? cur.label : ""}</span><Icon name="chevDown" size={14} />
      </button>
      {open && (
        <PickSheet title={label || t("pick.choose")} onClose={() => setOpen(false)} section="pick-select-sheet">
          <div role="listbox" aria-label={label || t("pick.choose")} className="pick-list">
            {opts.map((o) => { const on = cur && o.value === cur.value; return (
              <button key={o.value} type="button" role="option" aria-selected={on} disabled={o.disabled} data-value={o.value} className={`pick-opt${on ? " on" : ""}`} onClick={() => pick(o.value)}>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{o.label}</span>{on && <Icon name="check" size={16} />}
              </button>); })}
          </div>
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
  const pick = (d) => { setOpen(false); if (d !== value) fire(onChange, d, name, id); };
  const [y, m] = view.split("-").map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), lead = (first.getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${view}-${String(i + 1).padStart(2, "0")}`)];
  const move = (k) => { const d = new Date(y, m - 1 + k, 1); setView(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
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
          <div className="pick-quick">
            {ok(today) && <button type="button" className={`chip${value === today ? " on" : ""}`} data-quick="today" onClick={() => pick(today)}>{t("pick.today")}</button>}
            {ok(yest) && <button type="button" className={`chip${value === yest ? " on" : ""}`} data-quick="yesterday" onClick={() => pick(yest)}>{t("pick.yesterday")}</button>}
            {!required && value && <button type="button" className="chip" data-quick="clear" onClick={() => pick("")}>{t("pick.clear")}</button>}
          </div>
          <div className="pick-month">
            <button type="button" className="icon-btn" aria-label={t("pick.prev")} onClick={() => move(-1)}><Icon name="chevLeft" size={18} /></button>
            <div className="pick-month-name" aria-live="polite">{t("date.monthYear", { m: t("mon." + m), y })}</div>
            <button type="button" className="icon-btn" aria-label={t("pick.next")} onClick={() => move(1)}><Icon name="chevRight" size={18} /></button>
          </div>
          <div className="pick-grid" ref={gridRef} role="grid">
            {DOW.map((d) => <div key={d} className="pick-dow" aria-hidden="true">{t("wdShort." + d)}</div>)}
            {cells.map((d, i) => d === null ? <div key={"b" + i} /> : (
              <button key={d} type="button" className={`pick-day${d === value ? " on" : ""}${d === today ? " today" : ""}`} disabled={!ok(d)} aria-pressed={d === value} aria-label={fmtLongDate(parseLocalDate(d))} data-date={d} onClick={() => pick(d)}>{Number(d.slice(8))}</button>))}
          </div>
        </PickSheet>
      )}
    </span>
  );
}
