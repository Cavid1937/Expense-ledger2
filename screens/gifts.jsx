// Run 50 (owner list #3): gift ledger. A read-only view over existing entries (see giftLedger in App.jsx); adding goes through the normal Add screen.
import { useMemo, useState } from "react";
import { t } from "../i18n.js";
import { buildCsv, saveTextFile, fmt, fmtDate, giftLedger, today } from "../App.jsx";

export function GiftsPage({ transactions, currency, onView, onAdd, showToast }) {
  const [q, setQ] = useState("");
  const L = useMemo(() => giftLedger(transactions, q), [transactions, q]);
  const all = useMemo(() => giftLedger(transactions), [transactions]);
  return (
    <div className="gifts-page" data-section="gifts-page">
      <div className="card" data-section="gifts-summary">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div><div className="list-sub">{t("gifts.given")}</div><div className="hero-amount" style={{ fontSize: 24 }} data-section="gifts-given">{fmt(all.given, currency)}</div></div>
          <div><div className="list-sub">{t("gifts.received")}</div><div className="hero-amount" style={{ fontSize: 24 }} data-section="gifts-received">{fmt(all.received, currency)}</div></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-sm btn-sm-primary" data-section="gifts-add-given" onClick={() => onAdd("given")}>{t("gifts.addGiven")}</button>
          <button type="button" className="btn btn-sm" data-section="gifts-add-received" onClick={() => onAdd("received")}>{t("gifts.addReceived")}</button>
        </div>
      </div>
      {all.rows.length === 0
        ? <div className="list-sub" data-section="gifts-empty" style={{ margin: "12px 2px" }}>{t("gifts.empty")}</div>
        : (<>
          <div className="field" style={{ margin: "12px 0" }}>
            <label className="field-lbl" htmlFor="gifts-q">{t("gifts.search")}</label>
            <input id="gifts-q" data-section="gifts-search" className="input" type="search" value={q} onChange={e => setQ(e.target.value)} style={{ width: "100%" }} />
          </div>
          {L.people.length > 0 && (<div className="card" data-section="gifts-people">
            <div className="a-card-title">{t("gifts.people")}</div>
            {L.people.map((p, i) => (
              <div key={i} className="list-row" data-section="gifts-person">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="list-title">{p.name || t("gifts.noPerson")}</div>
                  <div className="list-sub">{t("gifts.gave")} {fmt(p.given, currency)} · {t("gifts.got")} {fmt(p.received, currency)}</div>
                </div>
              </div>
            ))}
          </div>)}
          <div className="card" data-section="gifts-entries" style={{ marginTop: 12 }}>
            <div className="a-card-title">{t("gifts.entries")}</div>
            {L.rows.length === 0 && <div className="list-sub">{t("gifts.noMatch")}</div>}
            {L.rows.map(r => (
              <button type="button" key={r.txn.id} className="list-row" data-section="gifts-row" data-kind={r.kind} onClick={() => onView(r.txn)} style={{ width: "100%", textAlign: "left" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="list-title">{r.person || t("gifts.noPerson")}</div>
                  <div className="list-sub">{[r.event, fmtDate(r.txn.date)].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="list-amount" style={{ color: r.kind === "received" ? "var(--pos)" : "var(--ink)" }}>{(r.kind === "received" ? "+" : "−") + fmt(r.txn.amount, currency)}</div>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-full" data-section="gifts-export" style={{ marginTop: 12 }} onClick={async () => { const r = await saveTextFile(`gifts-${today()}.csv`, buildCsv(L.rows.map(r => r.txn))); if (r === "failed") showToast(t("io.saveFailed"), 6000); else if (r !== "cancelled") showToast(t("gifts.exported")); }}>{t("gifts.export")}</button>
        </>)}
    </div>
  );
}
