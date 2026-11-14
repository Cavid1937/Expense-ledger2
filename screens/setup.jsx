// Run 50 (owner list #1): "Set up in a minute". Optional questions that create accounts, a monthly pay bill and a goal. Never forced on anyone;
// every answer is optional, an invalid one is shown at its field and nothing is created until all are valid (planSetup, App.jsx).
// Run 79 (owner, 14 Nov: the quick questions "look disgusting compared to the app"): one question per page, big type, progress dots,
// Back / Next / Skip. The same steps are the last part of the first launch (screens/onboard.jsx) and the Home "Set up in a minute" sheet.
import { useEffect, useRef, useState } from "react";
import { t } from "../i18n.js";
import { cleanMoneyText, planSetup, readAccounts } from "../App.jsx";

const STEPS = ["money", "income", "goal", "debts"];
// which page holds each answer, so a refused answer can be shown on its own page
const PAGE_OF = { cash: 0, bank: 0, salary: 1, payDay: 1, goalName: 2, goalTarget: 2 };

// Run 83 (owner, 14 Nov: choosing "bank statement" or "I have a loan" jumped straight there with no guide and skipped the other
// questions; "App must remember user's first choices and remind them in appropriate time"). The answers are kept here, on this phone only.
// stmt / debts: what was chosen; stmtState / debtsState: "now" (done from the guide), "later", "done" or "dismissed"; laterAt: when "later" was chosen.
export const FIRST_KEY = "expense_ledger_v5__first_choices";
export function readFirstChoices() { try { const r = JSON.parse(localStorage.getItem(FIRST_KEY) || "null"); return r && typeof r === "object" && !Array.isArray(r) ? r : null; } catch { return null; } }
export function writeFirstChoices(patch) { try { localStorage.setItem(FIRST_KEY, JSON.stringify({ ...(readFirstChoices() || {}), ...patch })); } catch { /* storage full or blocked: the reminder is only a convenience */ } }

export function SetupSteps({ currency, onSave, onSkip, onOpenDebts, onStatement, inSheet = false }) {
  // onStatement: only whether the bank-statement option is offered. Choosing it is now an answer like the others, not a jump.
  const [v, setV] = useState({ cash: "", bank: "", income: "", salary: "", payDay: "", goalName: "", goalTarget: "", debts: false, stmt: false });
  const [next, setNext] = useState(null);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(0);
  const body = useRef(null);
  const set = (k, val) => { setV(s => ({ ...s, [k]: val })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)); };
  const names = { cash: t("setupq.nameCash"), bank: t("setupq.nameBank"), salary: t("setupq.nameSalary") };
  const err = (k) => errors[k] ? <div className="setup-err" role="alert" data-section={"setupq-err-" + k}>{t("setupq.err." + errors[k])}</div> : null;
  const go = (n) => { if (n < 0 || n >= STEPS.length) return; setDir(n > step ? 1 : -1); setStep(n); };
  // the first field of a new page gets the focus only after it slid in (a keyboard opening mid-slide jumps the page)
  useEffect(() => { if (!dir) return; const id = setTimeout(() => { const f = body.current && body.current.querySelector("input"); if (f && window.matchMedia && !window.matchMedia("(pointer:coarse)").matches) f.focus(); }, 320); return () => clearTimeout(id); }, [step]);
  const finish = () => {
    const plan = planSetup(v, names, readAccounts().accounts.map(a => a.name));
    if (!plan.ok) { setErrors(plan.errors); const first = Math.min(...Object.keys(plan.errors).map(k => PAGE_OF[k] ?? 0)); go(first); return; }
    writeFirstChoices({ stmt: !!v.stmt, debts: !!v.debts, income: v.income || "", at: Date.now() });
    if (v.stmt || v.debts) { setDir(1); setNext(plan); return; }
    onSave(plan, { go: null });
  };
  // the last page: a short guide for each thing chosen, with "now" or "later"
  const done = (go) => {
    const later = Date.now();
    writeFirstChoices({ stmtState: v.stmt ? (go === "io" ? "now" : "later") : undefined, debtsState: v.debts ? (go === "debts" ? "now" : "later") : undefined, laterAt: later });
    onSave(next, { go, debts: go === "debts" });
  };
  const money = (k, id, label) => (
    <div className="setup-field"><label className="setup-lbl" htmlFor={id}>{label}</label>
      <div className={`setup-money${errors[k] ? " bad" : ""}`}>
        <input id={id} className="setup-input" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={v[k]} aria-invalid={!!errors[k]} onChange={e => set(k, cleanMoneyText(e.target.value))} />
        <span className="setup-cur" aria-hidden="true">{currency}</span>
      </div>{err(k)}</div>
  );
  const page = STEPS[step], last = step === STEPS.length - 1;
  return (
    <div className={`setup-steps${inSheet ? " in-sheet" : ""}`}>
      <div className="setup-top">
        <div className="setup-dots" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label={t("setupq.progress", { n: step + 1, of: STEPS.length })}>
          {STEPS.map((s, i) => <span key={s} className={`setup-dot${i === step ? " on" : i < step ? " done" : ""}`} />)}
        </div>
        <button type="button" className="setup-skipall" data-closer="1" data-section="setupq-skip" onClick={onSkip}>{t("setupq.skip")}</button>
      </div>
      <div className="setup-clip" ref={body}>
        {next ? (
        <div key="next" className="setup-page in-next" data-step="next" data-section="setupq-next-steps">
          <h2 className="setup-q">{t("setupq.nextQ")}</h2>
          <p className="setup-sub">{t("setupq.nextSub")}</p>
          {v.stmt && (<div className="setup-guide" data-section="setupq-guide-stmt">
            <div className="setup-guide-t">{t("setupq.gStmtT")}</div>
            <ol className="setup-guide-l"><li>{t("setupq.gStmt1")}</li><li>{t("setupq.gStmt2")}</li><li>{t("setupq.gStmt3")}</li></ol>
            <button type="button" className="btn btn-primary setup-guide-go" data-section="setupq-stmt-now" onClick={() => done("io")}>{t("setupq.gStmtNow")}</button>
          </div>)}
          {v.debts && (<div className="setup-guide" data-section="setupq-guide-debts">
            <div className="setup-guide-t">{t("setupq.gDebtT")}</div>
            <ol className="setup-guide-l"><li>{t("setupq.gDebt1")}</li><li>{t("setupq.gDebt2")}</li><li>{t("setupq.gDebt3")}</li></ol>
            <button type="button" className="btn btn-primary setup-guide-go" data-section="setupq-debts-now" onClick={() => done("debts")}>{t("setupq.gDebtNow")}</button>
          </div>)}
        </div>
        ) : (
        <div key={page} className={`setup-page${dir > 0 ? " in-next" : dir < 0 ? " in-prev" : ""}`} data-step={page}>
          {page === "money" && (<>
            <h2 className="setup-q">{t("setupq.q1")}</h2>
            <p className="setup-sub">{t("setupq.q1sub")}</p>
            {money("cash", "setupq-cash", t("setupq.cash"))}
            {money("bank", "setupq-bank", t("setupq.bank"))}
            {/* Run 80 (owner: "import and use that data instead of starting from zero"): a bank statement can bring the history in */}
            {onStatement && (
              <button type="button" className={`setup-stmt${v.stmt ? " on" : ""}`} aria-pressed={!!v.stmt} data-section="setupq-statement" onClick={() => set("stmt", !v.stmt)}>
                <span className="setup-stmt-t">{t("setupq.statement")}</span>
                <span className="setup-stmt-s">{v.stmt ? t("setupq.stmtNoted") : t("setupq.statementSub")}</span>
              </button>)}
          </>)}
          {page === "income" && (<>
            <h2 className="setup-q">{t("setupq.q2")}</h2>
            <div className="setup-choices" role="group" aria-label={t("setupq.q2")}>
              {["fixed", "variable", "none"].map(k => (
                <button key={k} type="button" className={`setup-choice${v.income === k ? " on" : ""}`} aria-pressed={v.income === k} data-income={k} onClick={() => set("income", v.income === k ? "" : k)}>
                  <span>{t("setupq.inc." + k)}</span><span className="setup-radio" aria-hidden="true" />
                </button>))}
            </div>
            {v.income === "fixed" && (<div className="setup-pay" data-section="setupq-pay">
              {money("salary", "setupq-salary", t("setupq.salary"))}
              <div className="setup-field"><label className="setup-lbl" htmlFor="setupq-day">{t("setupq.payDay")}</label>
                <div className={`setup-money${errors.payDay ? " bad" : ""}`}><input id="setupq-day" className="setup-input" type="text" inputMode="numeric" autoComplete="off" placeholder="1-31" maxLength={2} value={v.payDay} aria-invalid={!!errors.payDay} onChange={e => set("payDay", e.target.value.replace(/[^0-9]/g, ""))} /></div>{err("payDay")}</div>
            </div>)}
          </>)}
          {page === "goal" && (<>
            <h2 className="setup-q">{t("setupq.q3")}</h2>
            <p className="setup-sub">{t("setupq.q3sub")}</p>
            <div className="setup-field"><label className="setup-lbl" htmlFor="setupq-goal">{t("setupq.goalName")}</label>
              <div className={`setup-money${errors.goalName ? " bad" : ""}`}><input id="setupq-goal" className="setup-input setup-text" maxLength={60} value={v.goalName} aria-invalid={!!errors.goalName} onChange={e => set("goalName", e.target.value)} /></div>{err("goalName")}</div>
            {money("goalTarget", "setupq-target", t("setupq.goalTarget"))}
          </>)}
          {page === "debts" && (<>
            <h2 className="setup-q">{t("setupq.q4")}</h2>
            <p className="setup-sub">{t("setupq.q4sub")}</p>
            {onOpenDebts && (
              <div className="setup-choices" role="group" aria-label={t("setupq.q4")}>
                {[true, false].map(k => (
                  <button key={String(k)} type="button" className={`setup-choice${v.debts === k ? " on" : ""}`} aria-pressed={v.debts === k} data-debts={k ? "yes" : "no"} onClick={() => set("debts", k)}>
                    <span>{t(k ? "setupq.debtsYes" : "setupq.debtsNo")}</span><span className="setup-radio" aria-hidden="true" />
                  </button>))}
              </div>)}
          </>)}
        </div>
        )}
      </div>
      <div className="setup-nav">
        {next ? (<>
          <button type="button" className="btn btn-ghost setup-back" data-section="setupq-back" onClick={() => { setDir(-1); setNext(null); }}>{t("setupq.back")}</button>
          <button type="button" className="btn btn-ghost setup-next" data-section="setupq-later" onClick={() => done(null)}>{t("setupq.gLater")}</button>
        </>) : (<>
        {step > 0 ? <button type="button" className="btn btn-ghost setup-back" data-section="setupq-back" onClick={() => go(step - 1)}>{t("setupq.back")}</button> : <span />}
        {last
          ? <button type="button" className="btn btn-primary setup-next" data-section="setupq-save" onClick={finish}>{t("setupq.finish")}</button>
          : <button type="button" className="btn btn-primary setup-next" data-section="setupq-next" onClick={() => go(step + 1)}>{t("setupq.next")}</button>}
        </>)}
      </div>
    </div>
  );
}

// The Home checklist's "Set up in a minute": the same steps in a sheet.
export function SetupSheet({ currency, onClose, onSave, onOpenDebts, onStatement }) {
  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet setup-sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={t("setupq.title")} data-section="setupq">
        <div className="sheet-grip"><div className="sheet-handle" /></div>
        <SetupSteps inSheet currency={currency} onSkip={onClose} onOpenDebts={onOpenDebts} onStatement={onStatement}
          onSave={(plan, extra) => { const ok = onSave(plan); if (ok === false) return; onClose(); const go = extra && extra.go; if (go === "debts" && onOpenDebts) onOpenDebts(); else if (go === "io" && onStatement) onStatement(); }} />
      </div>
    </div>
  );
}
