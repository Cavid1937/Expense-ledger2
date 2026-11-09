// Run 50 (owner list #1): "Set up in a minute". Optional questions that create accounts, a monthly pay bill and a goal. Opened by a button in the Home
// "Get set up" list; never forced on anyone. Every answer is optional; an invalid one is shown at its field and nothing is created until all are valid.
import { useState } from "react";
import { t } from "../i18n.js";
import { cleanMoneyText, planSetup, readAccounts } from "../App.jsx";

export function SetupSheet({ currency, onClose, onSave, onOpenDebts }) {
  const [v, setV] = useState({ cash: "", bank: "", income: "", salary: "", payDay: "", goalName: "", goalTarget: "" });
  const [errors, setErrors] = useState({});
  const set = (k, val) => { setV(s => ({ ...s, [k]: val })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)); };
  const names = { cash: t("setupq.nameCash"), bank: t("setupq.nameBank"), salary: t("setupq.nameSalary") };
  const err = (k) => errors[k] ? <div className="list-sub" role="alert" data-section={"setupq-err-" + k} style={{ color: "var(--neg)", marginTop: 4 }}>{t("setupq.err." + errors[k])}</div> : null;
  const save = () => {
    const plan = planSetup(v, names, readAccounts().accounts.map(a => a.name));
    if (!plan.ok) { setErrors(plan.errors); return; }
    onSave(plan); onClose();
  };
  const money = (k, id, label) => (
    <div className="field"><label className="field-lbl" htmlFor={id}>{label} ({currency})</label>
      <input id={id} className="field-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={v[k]} aria-invalid={!!errors[k]} onChange={e => set(k, cleanMoneyText(e.target.value))} />{err(k)}</div>
  );
  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet setup-sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={t("setupq.title")} data-section="setupq" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="sheet-grip"><div className="sheet-handle" /></div>
        <div className="sheet-title">{t("setupq.title")}</div>
        <div className="list-sub" style={{ marginBottom: 10 }}>{t("setupq.sub")}</div>

        <div className="a-card-title">{t("setupq.q1")}</div>
        <div className="list-sub">{t("setupq.q1sub")}</div>
        <div className="field-row">{money("cash", "setupq-cash", t("setupq.cash"))}{money("bank", "setupq-bank", t("setupq.bank"))}</div>

        <div className="a-card-title" style={{ marginTop: 10 }}>{t("setupq.q2")}</div>
        <div className="type-toggle" role="group" aria-label={t("setupq.q2")}>
          {["fixed", "variable", "none"].map(k => <button key={k} type="button" className={`type-btn${v.income === k ? " active" : ""}`} aria-pressed={v.income === k} data-income={k} onClick={() => set("income", v.income === k ? "" : k)}>{t("setupq.inc." + k)}</button>)}
        </div>
        {v.income === "fixed" && (<div className="field-row" data-section="setupq-pay">
          {money("salary", "setupq-salary", t("setupq.salary"))}
          <div className="field"><label className="field-lbl" htmlFor="setupq-day">{t("setupq.payDay")}</label>
            <input id="setupq-day" className="field-input" type="text" inputMode="numeric" autoComplete="off" placeholder="1-31" maxLength={2} value={v.payDay} aria-invalid={!!errors.payDay} onChange={e => set("payDay", e.target.value.replace(/[^0-9]/g, ""))} />{err("payDay")}</div>
        </div>)}

        <div className="a-card-title" style={{ marginTop: 10 }}>{t("setupq.q3")}</div>
        <div className="field-row">
          <div className="field"><label className="field-lbl" htmlFor="setupq-goal">{t("setupq.goalName")}</label>
            <input id="setupq-goal" className="field-input" maxLength={60} value={v.goalName} aria-invalid={!!errors.goalName} onChange={e => set("goalName", e.target.value)} />{err("goalName")}</div>
          {money("goalTarget", "setupq-target", t("setupq.goalTarget"))}
        </div>

        <div className="a-card-title" style={{ marginTop: 10 }}>{t("setupq.q4")}</div>
        <div className="list-sub">{t("setupq.q4sub")}</div>
        {onOpenDebts && <button type="button" className="btn btn-sm" data-section="setupq-debts" style={{ marginTop: 6 }} onClick={() => { onClose(); onOpenDebts(); }}>{t("setupq.openDebts")}</button>}

        <button className="btn btn-primary btn-full" data-section="setupq-save" style={{ marginTop: 14 }} onClick={save}>{t("common.save")}</button>
        <button className="btn btn-ghost btn-full" data-closer="1" onClick={onClose}>{t("setupq.skip")}</button>
      </div>
    </div>
  );
}
