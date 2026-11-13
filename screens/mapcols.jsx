// Run 67 (plan: "a 'match the columns' screen for layouts the app cannot work out"): when a bank's Excel or CSV file has columns the app cannot
// recognise, the person says which column is the date, what it was, and the amount. A live preview shows what would be read. Nothing is added
// here: "Continue" opens the usual statement review sheet (counts, choices, Undo).
import { useMemo, useState } from "react";
import { t, tn } from "../i18n.js";
import { readMapped } from "../statement.js";
import { fmt, fmtDate, maskText } from "../App.jsx";

const letter = (k) => { let s = "", i = k + 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

export function ColumnMapper({ grid, initial, filename, currency, onUse, onCancel }) {
  const [m, setM] = useState(() => ({ header: -1, date: -1, desc: -1, mode: "signed", amount: -1, debit: -1, credit: -1, balance: -1, ...(initial || {}) }));
  const width = Math.max(0, ...grid.map((r) => r.length));
  const head = m.header >= 0 ? grid[m.header] || [] : [];
  const sample = (k) => { const r = grid.find((row, i) => i > m.header && row[k]); return r ? String(r[k]).slice(0, 18) : ""; };
  const label = (k) => `${letter(k)}${head[k] ? " · " + String(head[k]).slice(0, 22) : sample(k) ? " · " + sample(k) : ""}`;
  const res = useMemo(() => (m.date >= 0 && (m.mode === "inout" ? m.debit >= 0 || m.credit >= 0 : m.amount >= 0) ? readMapped(grid, m) : { rows: [], problems: [] }), [grid, m]);
  const set = (k, v) => setM((p) => ({ ...p, [k]: v }));
  const Pick = ({ id, k, labelKey, optional }) => (
    <div className="field" style={{ marginBottom: 10 }}>
      <label className="field-lbl" htmlFor={id}>{t(labelKey)}</label>
      <select id={id} data-map={k} className="field-input field-select" value={m[k]} onChange={(e) => set(k, Number(e.target.value))}>
        {optional ? <option value={-1}>{t("map.none")}</option> : m[k] < 0 && <option value={-1}>{t("map.choose")}</option>}
        {Array.from({ length: width }, (_, c) => <option key={c} value={c}>{label(c)}</option>)}
      </select>
    </div>
  );
  const shown = grid.slice(Math.max(0, m.header), Math.max(0, m.header) + 6);
  return (
    <div data-section="map-cols">
      <div style={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{filename}</div>
      <div className="list-sub" style={{ margin: "4px 0 10px", lineHeight: 1.5 }}>{t("map.intro")}</div>
      <div data-section="map-preview" tabIndex={0} aria-label={t("map.previewLabel")} style={{ overflowX: "auto", border: "1px solid var(--rule)", borderRadius: 8, marginBottom: 12 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11.5, minWidth: "100%" }}>
          <thead><tr>{Array.from({ length: width }, (_, c) => <th key={c} style={{ padding: "4px 6px", textAlign: "left", color: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}>{letter(c)}</th>)}</tr></thead>
          <tbody>{shown.map((r, i) => <tr key={i}>{Array.from({ length: width }, (_, c) => <td key={c} style={{ padding: "4px 6px", whiteSpace: "nowrap", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", borderBottom: "1px solid var(--rule)" }}>{maskText(String(r[c] || ""))}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="field" style={{ marginBottom: 10 }}>
        <label className="field-lbl" htmlFor="map-header">{t("map.header")}</label>
        <select id="map-header" data-map="header" className="field-input field-select" value={m.header} onChange={(e) => set("header", Number(e.target.value))}>
          <option value={-1}>{t("map.noHeader")}</option>
          {grid.slice(0, 15).map((r, i) => <option key={i} value={i}>{t("map.row", { n: i + 1 })}: {r.filter(Boolean).slice(0, 3).join(" · ").slice(0, 40)}</option>)}
        </select>
      </div>
      <Pick id="map-date" k="date" labelKey="map.date"/>
      <Pick id="map-desc" k="desc" labelKey="map.desc" optional/>
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 10px" }}>
        <legend className="field-lbl">{t("map.how")}</legend>
        {["signed", "inout", "out"].map((md) => (
          <label key={md} style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "6px 0", fontSize: 13, lineHeight: 1.4 }}>
            <input type="radio" name="map-mode" data-map-mode={md} checked={m.mode === md} onChange={() => set("mode", md)} style={{ marginTop: 2 }}/>
            <span>{t("map.mode." + md)}</span>
          </label>
        ))}
      </fieldset>
      {m.mode === "inout" ? (<><Pick id="map-debit" k="debit" labelKey="map.debit"/><Pick id="map-credit" k="credit" labelKey="map.credit"/></>) : <Pick id="map-amount" k="amount" labelKey="map.amount"/>}
      <Pick id="map-balance" k="balance" labelKey="map.balance" optional/>
      <div data-section="map-result" role="status" style={{ background: "var(--bg-warm)", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.5, margin: "4px 0 12px" }}>
        {res.rows.length ? (<>
          <div style={{ fontWeight: 600 }}>{tn("map.found", res.rows.length)}</div>
          {res.rows.slice(0, 3).map((r, i) => <div key={i} style={{ overflowWrap: "anywhere" }}>{fmtDate(r.date)} · {maskText(r.merchant || "—")} · {r.type === "income" ? "+" : "−"}{fmt(r.cents / 100, currency)}</div>)}
          {res.problems.some((p) => /^rows:/.test(p)) && <div style={{ color: "var(--ink-3)" }}>{t("map.skipped", { n: Number(res.problems.find((p) => /^rows:/.test(p)).split(":")[1]) })}</div>}
        </>) : <div>{t("map.nothing")}</div>}
      </div>
      <button className="btn btn-primary btn-full" data-section="map-go" disabled={!res.rows.length} style={{ marginTop: 0 }} onClick={() => onUse(m)}>{t("map.continue")}</button>
      <button className="btn btn-ghost btn-full" data-closer="1" onClick={onCancel}>{t("common.cancel")}</button>
    </div>
  );
}
