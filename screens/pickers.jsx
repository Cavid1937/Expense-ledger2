// Run 75 (owner, 13 Nov: the phone's grey date and option windows look foreign in the app): the app's own pickers, as bottom sheets in the
// app's colours and languages. The real <select> / <input type="date"> stays in the page, hidden, and still holds the value: forms, saving,
// validation and the tests use it exactly as before. The visible button opens the sheet; a choice is sent through the control's own onChange.
import { Children, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../i18n.js";
import { Icon, fmtLongDate, localDateStr, parseLocalDate, isValidDateStr, readFxOff } from "../App.jsx";

// On the phone app a changed choice gives one short system tick (choosing what was already chosen gives none). Off with "reduce effects".
const tick = () => { try { const n = window.LedgerNative; if (n && n.haptic && !readFxOff()) n.haptic("tick"); } catch { /* no phone app */ } };
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
export function PickSheet({ title, onClose, children, section }) {
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
  // Run 108: a sheet already sliding down ignores further backdrop taps (they could run its close action a second time)
  const onBackdrop = (e) => { if (e.target !== e.currentTarget || state.current.going) return; if (e.currentTarget.dataset.out === "1") { state.current.going = true; doneRef.current(); } else close(); };
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
  const pick = (v, close) => { setJust(v); if (v !== String(value ?? "")) { tick(); fire(onChange, v, name, id); } close(PICK_SHOW_MS); };
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

// Run 105 (owner, 17 Nov: "the time picker in reminders should be improved, must be alive and better"): two scroll wheels, hours 00-23 and
// minutes 00-59. Each wheel snaps to a row, the rows curve away like a drum, the big time on top follows the finger, and every new row gives
// one short tick on the phone. Keyboard: arrows, Page Up/Down (5 at a time), Home/End; screen readers hear a spin button per wheel.
// Nothing is saved until "Save"; closing the sheet keeps the old time.
const WH_ROW = 40, WH_PAD = 2;
function Wheel({ count, value, onPick, label, wheelKey }) {
  const ref = useRef(null);
  const st = useRef({ idx: value, raf: 0, quiet: true });
  const paint = () => {
    const el = ref.current; if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 2, still = reducedMotion();
    for (const c of el.children) {
      const d = (c.offsetTop + WH_ROW / 2 - mid) / WH_ROW, a = Math.min(Math.abs(d), 3);
      c.style.opacity = String(Math.max(0.18, 1 - a * 0.32));
      c.style.transform = still ? "" : `perspective(320px) rotateX(${Math.max(-60, Math.min(60, -d * 20))}deg) scale(${1 - a * 0.05})`;
    }
  };
  useEffect(() => { const el = ref.current; if (!el) return; el.scrollTop = value * WH_ROW; paint(); requestAnimationFrame(() => { st.current.quiet = false; }); return () => cancelAnimationFrame(st.current.raf); }, []);
  const onScroll = () => {
    const s = st.current; cancelAnimationFrame(s.raf);
    s.raf = requestAnimationFrame(() => {
      paint(); const el = ref.current; if (!el) return;
      const i = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / WH_ROW)));
      if (i !== s.idx) { s.idx = i; if (!s.quiet) tick(); onPick(i); }
      if (i === s.target) s.target = null;
    });
  };
  // Quick repeated key presses add up from where the wheel is heading, not from where it is mid-glide.
  const go = (i) => { const el = ref.current; if (!el) return; i = Math.max(0, Math.min(count - 1, i)); st.current.target = i; el.scrollTo({ top: i * WH_ROW, behavior: reducedMotion() ? "auto" : "smooth" }); };
  const onKey = (e) => {
    const k = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[e.key];
    if (k) { e.preventDefault(); go((st.current.target ?? st.current.idx) + k); } else if (e.key === "Home") { e.preventDefault(); go(0); } else if (e.key === "End") { e.preventDefault(); go(count - 1); }
  };
  const txt = String(value).padStart(2, "0");
  return (
    <div className="wheel-col">
      <div ref={ref} className="wheel" tabIndex={0} role="spinbutton" aria-label={label} aria-valuemin={0} aria-valuemax={count - 1} aria-valuenow={value} aria-valuetext={txt} data-wheel={wheelKey} onScroll={onScroll} onKeyDown={onKey}
        style={{ height: WH_ROW * (WH_PAD * 2 + 1), paddingBlock: WH_ROW * WH_PAD }}>
        {Array.from({ length: count }, (_, i) => <div key={i} className={`wheel-row${i === value ? " on" : ""}`} aria-hidden="true" data-v={i} onClick={() => go(i)}>{String(i).padStart(2, "0")}</div>)}
      </div>
    </div>
  );
}
export function PickTime({ value, onChange, id, name, disabled, className, style, ...rest }) {
  const [open, setOpen] = useState(false);
  const label = useLabelText(id) || (rest["aria-labelledby"] && typeof document !== "undefined" ? (document.getElementById(rest["aria-labelledby"])?.textContent || "").trim() : "");
  const ok = /^\d{2}:\d{2}$/.test(value || "");
  const start = () => (/^\d{2}:\d{2}$/.test(value || "") ? [Math.min(23, Number(value.slice(0, 2))), Math.min(59, Number(value.slice(3)))] : [9, 0]);
  const [hm, setHm] = useState(start);
  useEffect(() => { if (open) setHm(start()); }, [open]);
  const shown = String(hm[0]).padStart(2, "0") + ":" + String(hm[1]).padStart(2, "0");
  const save = (close) => { if (shown !== value) fire(onChange, shown, name, id); close(); };
  return (
    <span className="pick-wrap" style={style && style.width ? { width: style.width } : undefined}>
      <input {...rest} type="time" id={id} name={name} value={value} onChange={onChange} disabled={disabled} className={`${className || ""} pick-native`} tabIndex={-1} aria-hidden="true" />
      <button type="button" className={`${className || "field-input"} pick-btn`} style={style} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={label ? `${label}: ${ok ? value : t("pick.noTime")}` : undefined} data-pick-time={rest["data-section"]} onClick={() => setOpen(true)}>
        <span className="pick-text" style={{ fontVariantNumeric: "tabular-nums" }}>{ok ? value : t("pick.noTime")}</span><Icon name="clock" size={15} />
      </button>
      {open && (
        <PickSheet title={label || t("pick.time")} onClose={() => setOpen(false)} section="pick-time-sheet">
          {(close) => (<>
          <div className="wheel-now" aria-live="polite" data-section="time-now">{shown}</div>
          <div className="wheel-pair">
            <div className="wheel-band" aria-hidden="true" />
            <Wheel count={24} value={hm[0]} label={t("pick.hour")} wheelKey="hour" onPick={(h) => setHm((x) => [h, x[1]])} />
            <div className="wheel-colon" aria-hidden="true">:</div>
            <Wheel count={60} value={hm[1]} label={t("pick.minute")} wheelKey="minute" onPick={(m) => setHm((x) => [x[0], m])} />
          </div>
          <button type="button" className="btn btn-primary btn-full" data-action="time-save" style={{ marginTop: 14 }} onClick={() => save(close)}>{t("common.save")}</button>
          </>)}
        </PickSheet>
      )}
    </span>
  );
}

// Run 105 (owner, 17 Nov: "last 30/90/7 days must be inside the calendar, not outside as a suggestion; once selected there's no going back, why?").
// One sheet for a date range. Ready-made ranges sit at the top; tapping one shows it at once. Tapping the chosen one again, or "All time", takes the
// filter off: that is the way back. Below, the calendar marks a custom range: first tap = first day, second tap = last day (a tap before the first
// day starts again), then "Show". Months slide like the single-date calendar. onChange(from, to); "" = no limit on that side.
export function PickRange({ from, to, presets, onChange, label, active, className, section }) {
  const [open, setOpen] = useState(false);
  const today = localDateStr();
  const [draft, setDraft] = useState({ from: from || "", to: to || "" });
  const [view, setView] = useState(() => (from || today).slice(0, 7));
  const [dir, setDir] = useState(0);
  useEffect(() => { if (open) { setDraft({ from: from || "", to: to || "" }); setView((to || from || today).slice(0, 7)); setDir(0); } }, [open]);
  const cur = presets.find((p) => p.from === (from || "") && p.to === (to || ""));
  const apply = (f, tt, close) => { if (f !== (from || "") || tt !== (to || "")) { tick(); onChange(f, tt); } close(PICK_SHOW_MS); };
  const tapDay = (d) => { tick(); setDraft((x) => (!x.from || x.to || d < x.from) ? { from: d, to: "" } : { from: x.from, to: d }); };
  const [y, m] = view.split("-").map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), lead = (first.getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${view}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length < 42) cells.push(null);
  const move = (k) => { const d = new Date(y, m - 1 + k, 1); setDir(k > 0 ? 1 : -1); setView(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const slide = dir > 0 ? " in-next" : dir < 0 ? " in-prev" : "";
  const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const lo = draft.from, hi = draft.to || draft.from;
  return (
    <>
      <button type="button" className={className} aria-pressed={!!active} aria-haspopup="dialog" aria-expanded={open} data-section={section} onClick={() => setOpen(true)}>
        <Icon name="calendar" size={11} /> {label}
      </button>
      {open && (
        <PickSheet title={t("range.title")} onClose={() => setOpen(false)} section="pick-range-sheet">
          {(close) => (<>
          <div className="pick-quick" role="group" aria-label={t("range.quick")} data-section="tx-range-quick">
            <button type="button" className={`chip${!from && !to ? " on" : ""}`} aria-pressed={!from && !to} data-range="all" onClick={() => apply("", "", close)}>{t("range.all")}</button>
            {presets.map((p) => { const on = cur && cur.key === p.key; return (
              <button key={p.key} type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on} data-range={p.key} onClick={() => (on ? apply("", "", close) : apply(p.from, p.to, close))}>{p.label}</button>); })}
          </div>
          <div className="pick-tlabel" aria-live="polite" data-section="range-hint">{t(draft.from && !draft.to ? "range.hintEnd" : "range.hintStart")}</div>
          <div className="pick-month">
            <button type="button" className="icon-btn" aria-label={t("pick.prev")} onClick={() => move(-1)}><Icon name="chevLeft" size={18} /></button>
            <div className="pick-month-name" aria-live="polite"><span key={view} className={`pick-month-label${slide}`}>{t("date.monthYear", { m: t("mon." + m), y })}</span></div>
            <button type="button" className="icon-btn" aria-label={t("pick.next")} onClick={() => move(1)}><Icon name="chevRight" size={18} /></button>
          </div>
          <div className="pick-grid-clip">
          <div key={view} className={`pick-grid${slide}`} role="grid">
            {DOW.map((d) => <div key={d} className="pick-dow" aria-hidden="true">{t("wdShort." + d)}</div>)}
            {cells.map((d, i) => { if (d === null) return <div key={"b" + i} className="pick-blank" />;
              const edge = d === lo || d === hi, mid = lo && d > lo && d < hi;
              return <button key={d} type="button" className={`pick-day${edge ? " on" : ""}${mid ? " in-range" : ""}${d === today ? " today" : ""}`} aria-pressed={edge || !!mid} aria-label={fmtLongDate(parseLocalDate(d))} data-date={d} onClick={() => tapDay(d)}>{Number(d.slice(8))}</button>; })}
          </div>
          </div>
          <button type="button" className="btn btn-primary btn-full" data-action="range-show" disabled={!draft.from} style={{ marginTop: 12 }} onClick={() => apply(draft.from, draft.to || draft.from, close)}>{t("range.show")}</button>
          </>)}
        </PickSheet>
      )}
    </>
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
  const pick = (d, close) => { setJust(d); if (d !== value) { tick(); fire(onChange, d, name, id); } close(PICK_SHOW_MS); };
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
