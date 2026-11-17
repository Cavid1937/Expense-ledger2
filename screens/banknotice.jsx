// Run 105 (owner, 17 Nov, screenshot of the old review: "Too much confusion in this suggestion, it has to be polished and renewed. And instead of
// directly showing it to user, I think it should come as a notification and then user decides"). Payments read from bank notifications wait behind
// the bell; this sheet opens only when the person taps Review. It shows each payment as one calm row (what, when, category, amount) with a
// Spent / Received switch, one account choice, and the result. No file, statement or running-balance wording: those belong to file imports.
// All the logic stays in App.jsx (the same plan, duplicate check and Undo as a statement); this file only draws it.
import { useRef } from "react";
import { t, tn } from "../i18n.js";
import { PickSheet, PickSelect } from "./pickers.jsx";
import { fmt, fmtDate, maskText, catName, pickerCats, readCatPrefs } from "../App.jsx";

export function BankNoticeSheet({ plan, currency, accounts, balances, skipSim, onSkipSim, onRow, onAccount, onAdd, onDiscard, onClose }) {
  const rows = plan.transactions;
  // Add and Remove act after the sheet has slid down (the same fall as every sheet), never by cutting it off mid-screen
  const after = useRef(null);
  const end = (close, fn) => { after.current = fn; close(); };
  const mi = plan.mergeInfo || { identical: 0, sameId: 0, similar: 0, fresh: rows.length };
  const here = (mi.identical || 0) + (mi.sameId || 0);
  const adding = Math.max(0, (mi.fresh || 0) + (skipSim ? 0 : mi.similar || 0));
  const s = plan.statement || {};
  const prefs = readCatPrefs();
  return (
    <PickSheet title={tn("bq.title", rows.length)} onClose={() => (after.current || onClose)()} section="bank-notice-sheet">
      {(close) => (<>
        <p className="bq-sub">{t("bq.sub")}</p>
        {s.sign && <p className="bq-note" data-bq="sign">{t("bq.signHint")}</p>}
        <ul className="bq-list" data-bq="rows">
          {rows.map((x) => {
            const id = String(x.id), what = maskText(x.merchant || x.note || catName(x.category)), inc = x.type === "income";
            return (
              <li key={id} className="bq-row" data-bq-row={id}>
                <div className="bq-top">
                  <span className="bq-what">{what}</span>
                  <span className={"bq-amt" + (inc ? " in" : "")}>{inc ? "+" : "−"}{fmt(x.amount, currency)}</span>
                </div>
                <div className="bq-bottom">
                  <span className="bq-when">{fmtDate(x.date)}</span>
                  <PickSelect className="bq-cat" aria-label={t("bq.catLabel", { what })} value={x.category} onChange={(e) => onRow(id, { category: e.target.value })}>
                    {pickerCats(inc, prefs, [x.category]).map((c) => <option key={c.id} value={c.id}>{catName(c.id)}</option>)}
                  </PickSelect>
                  <span className="bq-dir" role="group" aria-label={t("bq.dirLabel", { what })}>
                    <button type="button" data-dir="expense" aria-pressed={!inc} className={!inc ? "on" : ""} onClick={() => inc && onRow(id, { type: "expense" })}>{t("bq.spent")}</button>
                    <button type="button" data-dir="income" aria-pressed={inc} className={inc ? "on" : ""} onClick={() => !inc && onRow(id, { type: "income" })}>{t("bq.received")}</button>
                  </span>
                </div>
              </li>);
          })}
        </ul>
        {accounts.length > 0 && (
          <label className="bq-acc">{t("bq.paidFrom")}
            <PickSelect className="field-input" data-bq="account" value={plan.stOpts.account} onChange={(e) => onAccount(e.target.value)}>
              <option value="">{t("acc.rm.noAccount")}</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </PickSelect>
          </label>)}
        {here > 0 && <p className="bq-note quiet" data-bq="dup">{tn("bq.dup", here)}</p>}
        {mi.similar > 0 && <label className="bq-check" data-bq="sim-row"><input type="checkbox" data-bq="sim" checked={skipSim} onChange={(e) => onSkipSim(e.target.checked)} /><span>{tn("bq.sim", mi.similar)}</span></label>}
        {s.check && s.check.has && !s.check.ok && <p className="bq-note" data-bq="gap">{t("bq.gap")}</p>}
        {adding > 0 && balances.map((r) => <p key={r.id} className="bq-note quiet" data-bq-bal={r.id}>{t("bq.after", { name: maskText(r.name), after: (r.after < 0 ? "−" : "") + fmt(Math.abs(r.after), currency) })}</p>)}
        {adding === 0 && <p className="bq-note quiet" data-bq="all-here">{t("bq.allHere")}</p>}
        <div className="bq-acts">
          {adding > 0
            ? <button type="button" className="btn btn-primary btn-full" data-bq="add" onClick={() => end(close, onAdd)}>{tn("bq.add", adding)}</button>
            : <button type="button" className="btn btn-primary btn-full" data-bq="clear" onClick={() => end(close, onDiscard)}>{t("bq.clear")}</button>}
          {adding > 0 && <button type="button" className="btn btn-ghost btn-full" data-bq="discard" onClick={() => end(close, onDiscard)}>{t("bq.discard")}</button>}
          <button type="button" className="btn btn-ghost btn-full" data-bq="later" onClick={() => close()}>{t("bq.later")}</button>
        </div>
      </>)}
    </PickSheet>
  );
}
