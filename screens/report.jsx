// Run 75 (owner chose the phone-only monthly report, 13 Nov): last month's summary, worked out on the phone. Nothing is sent anywhere:
// "Share or e-mail it to myself" hands the text to the phone's own share menu or mail app, and only when the person presses it.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { t, tn } from "../i18n.js";
import { Icon, fmt, monthName, monthReport, monthReportText, nativeShareHook, catName, localMonthStr } from "../App.jsx";

// Run 76 hotfix: written out, not built from KEY at load time. This file and App.jsx import each other, and in the real website build
// KEY was not ready yet when this line ran, which stopped the whole app from opening ("Cannot access … before initialization").
const SEEN_KEY = "expense_ledger_v5__reportseen";
const lastMonth = (now = new Date()) => localMonthStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));

async function shareText(title, text) {
  const native = nativeShareHook();
  if (native) { try { await native(`${title}.txt`, text, "text/plain"); return "shared"; } catch { /* fall through to the other ways */ } }
  if (typeof navigator !== "undefined" && navigator.share) { try { await navigator.share({ title, text }); return "shared"; } catch (e) { if (e && e.name === "AbortError") return "cancelled"; } }
  try { window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`; return "mail"; } catch { return "failed"; }
}

export function MonthReportSheet({ state, mon, currency, onClose, showToast }) {
  const r = useMemo(() => monthReport(state, mon), [state, mon]);
  const text = useMemo(() => monthReportText(r, currency), [r, currency]);
  const title = t("report.heading", { month: monthName(mon) });
  const Line = ({ label, v, color, sec }) => <div className="list-row" data-section={sec} style={{ justifyContent: "space-between", gap: 8 }}><span className="list-sub" style={{ margin: 0 }}>{label}</span><span style={{ fontWeight: 700, color: color || "var(--ink)", whiteSpace: "nowrap" }}>{v}</span></div>;
  return createPortal((
    <div className="sheet-overlay pick-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-label={title} data-section="report-sheet">
        <div className="sheet-grip"><div className="sheet-handle" /></div>
        <div className="sheet-title">{title}</div>
        <Line label={t("report.lblEarned")} v={fmt(r.earned, currency)} color="var(--pos)" sec="report-earned" />
        {r.refunds > 0 && <Line label={t("report.lblRefunds")} v={fmt(r.refunds, currency)} />}
        <Line label={t("report.lblSpent")} v={fmt(r.spent, currency)} color="var(--neg)" sec="report-spent" />
        <Line label={t(r.net >= 0 ? "report.lblSurplus" : "report.lblDeficit")} v={(r.net < 0 ? "−" : "") + fmt(Math.abs(r.net), currency)} color={r.net < 0 ? "var(--neg)" : "var(--pos)"} sec="report-net" />
        {r.top.length > 0 && (<><div className="label-sm" style={{ margin: "14px 0 4px" }}>{t("report.top")}</div>{r.top.map((x) => <Line key={x.cat} label={catName(x.cat)} v={fmt(x.amt, currency)} />)}</>)}
        {r.over.length > 0 && (<><div className="label-sm" style={{ margin: "14px 0 4px", color: "var(--warn)" }}>{t("report.over")}</div>{r.over.map((x) => <Line key={x.cat} label={catName(x.cat)} v={`${fmt(x.spent, currency)} / ${fmt(x.limit, currency)}`} color="var(--warn)" />)}</>)}
        <div className="list-sub" style={{ marginTop: 10 }}>{tn("report.count", r.count)}</div>
        <div className="list-sub" style={{ marginTop: 6, lineHeight: 1.5 }}>{t("report.privacy")}</div>
        <button type="button" className="btn btn-primary btn-full" data-section="report-share" style={{ marginTop: 12 }} onClick={async () => { const res = await shareText(title, text); if (res === "failed") showToast && showToast(t("report.shareFailed"), 5000); }}><Icon name="upload" size={15} /> {t("report.share")}</button>
        <button type="button" className="btn btn-ghost btn-full" data-section="report-copy" style={{ marginTop: 8 }} onClick={async () => { try { await navigator.clipboard.writeText(text); showToast && showToast(t("report.copied")); } catch { showToast && showToast(t("report.shareFailed"), 5000); } }}>{t("report.copy")}</button>
        <button type="button" className="btn btn-ghost btn-full" data-closer="1" onClick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  ), document.body);
}

// Home: in the first 7 days of a month, when last month has entries, offer last month's summary until it is opened or dismissed.
export function MonthReportCard({ transactions = [], budgets = {}, goals = [], currency, showToast, now = new Date() }) {
  const mon = lastMonth(now);
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; } });
  const [open, setOpen] = useState(false);
  const has = useMemo(() => transactions.some((x) => x && typeof x.date === "string" && x.date.startsWith(mon)), [transactions, mon]);
  const markSeen = () => { try { localStorage.setItem(SEEN_KEY, mon); } catch { /* shown again next time */ } setSeen(mon); };
  if (now.getDate() > 7 || !has || (seen === mon && !open)) return null;
  return (<>
    {seen !== mon && (
      <div className="card" data-section="home-report" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="list-title">{t("report.ready", { month: monthName(mon) })}</div>
          <div className="list-sub">{t("report.readySub")}</div>
        </div>
        <button type="button" className="btn btn-sm btn-sm-primary" data-section="home-report-open" onClick={() => { setOpen(true); markSeen(); }}>{t("report.open")}</button>
        <button type="button" className="btn btn-ghost btn-sm" data-section="home-report-dismiss" aria-label={t("report.dismiss")} onClick={markSeen}><Icon name="close" size={14} /></button>
      </div>
    )}
    {open && <MonthReportSheet state={{ transactions, budgets, goals }} mon={mon} currency={currency} showToast={showToast} onClose={() => setOpen(false)} />}
  </>);
}
