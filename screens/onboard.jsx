// Run 79 (owner, 14 Nov, with a recording of another app's first start): the first launch as one continuous scene.
//   1. The opening mark (screens/launch.js) lands in a dark brand band at the top: the name and one line about the app, shown in turn in all
//      three languages until one is chosen.
//   2. A panel rises from below with a curved top edge and asks for the language (the same native radio choices as before).
//   3. The panel's content slides to the next page: keep a copy with Google (the person's own Google Drive, drive.appdata) or go on as a guest.
//   4. The quick questions (screens/setup.jsx), one per page. Then the panel falls away and Home rises.
// Where it is: expense_ledger_v5__onboard holds "account" or "setup" while the person is in steps 3-4, so a reload resumes there. A phone that
// already had the app has no such key and never sees these steps (their language is already set). The main data key is never touched here.
import { useEffect, useState } from "react";
import { LANGS, LANG_NAMES, t, tIn } from "../i18n.js";
import { LAUNCH_GLYPH } from "./launch.js";
import { motionOff, useBackStep } from "./motion.jsx";
import { SetupSteps } from "./setup.jsx";

// written out in full: App.jsx and this file load each other, so App's KEY is not defined yet when this line runs
export const OB_KEY = "expense_ledger_v5__onboard";
export function readOnboard() { try { const v = localStorage.getItem(OB_KEY); return v === "account" || v === "setup" ? v : "done"; } catch { return "done"; } }
export function writeOnboard(v) { try { localStorage.setItem(OB_KEY, v === "account" || v === "setup" ? v : "done"); return true; } catch { return false; } }

const GOOGLE_G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

// The brand band: mark, name, one line. Before a language is chosen the line changes language every 2.4 s.
function Brand({ lang }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (lang || motionOff()) return undefined; const id = setInterval(() => setI(n => (n + 1) % LANGS.length), 2400); return () => clearInterval(id); }, [lang]);
  const l = lang || LANGS[i];
  return (
    <div className="ob-brand">
      <span className="lang-glyph ob-glyph" data-launch-target="1" aria-hidden="true" dangerouslySetInnerHTML={{ __html: LAUNCH_GLYPH }} />
      <div className="wordmark lang-mark ob-name">Expense Ledger</div>
      <p className="ob-tag" aria-live="off"><span key={l} lang={l} className="ob-tag-in">{tIn(l, "ob.tagline")}</span></p>
    </div>
  );
}

function LanguagePage({ onChoose }) {
  const [sel, setSel] = useState(null);
  const inEach = (key) => LANGS.map(l => <span key={l} lang={l} className="lang-line">{tIn(l, key)}</span>);
  return (
    <form className="lang-box ob-page" onSubmit={e => { e.preventDefault(); if (sel) onChoose(sel); }}>
      <fieldset className="lang-set">
        <legend className="lang-title">{sel ? <span key={sel} lang={sel} className="lang-swap">{tIn(sel, "lang.title")}</span> : inEach("lang.title")}</legend>
        {LANGS.map(l => (
          <label key={l} className={`lang-opt${sel === l ? " sel" : ""}`} lang={l}>
            <input type="radio" name="ui-language" value={l} checked={sel === l} onChange={() => setSel(l)} />
            <span className="lang-name">{LANG_NAMES[l]}</span>
            <span className="lang-mark-sel" aria-hidden="true" />
          </label>
        ))}
      </fieldset>
      <button type="submit" className="btn btn-primary btn-full lang-continue" disabled={!sel} lang={sel || undefined}>
        {sel ? <span key={sel} className="lang-swap">{tIn(sel, "lang.continue")}</span> : LANGS.map(l => tIn(l, "lang.continue")).join(" · ")}
      </button>
      <p className="lang-hint">{sel ? <span key={sel} lang={sel} className="lang-swap">{tIn(sel, "lang.hint")}</span> : inEach("lang.hint")}</p>
    </form>
  );
}

function AccountPage({ onGoogle, onGuest, busy, error }) {
  return (
    <div className="ob-page ob-account" data-section="ob-account">
      <h2 className="setup-q">{t("ob.acc.title")}</h2>
      <p className="setup-sub">{t("ob.acc.sub")}</p>
      <button type="button" className="ob-choice ob-google" data-ob="google" disabled={!!busy} aria-busy={!!busy} onClick={onGoogle}>
        <span className="ob-choice-ic ob-g" dangerouslySetInnerHTML={{ __html: GOOGLE_G }} />
        <span className="ob-choice-txt"><span className="ob-choice-name">{busy ? t("ob.busy") : t("ob.google")}</span><span className="ob-choice-sub">{t("ob.googleSub")}</span></span>
      </button>
      <button type="button" className="ob-choice ob-guest" data-ob="guest" disabled={!!busy} onClick={onGuest}>
        <span className="ob-choice-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></svg></span>
        <span className="ob-choice-txt"><span className="ob-choice-name">{t("ob.guest")}</span><span className="ob-choice-sub">{t("ob.guestSub")}</span></span>
      </button>
      {error && <div className="setup-err ob-err" role="alert" data-section="ob-error">{error}</div>}
    </div>
  );
}

// step: "lang" (rendered on its own, before the app) · "account" · "setup" (drawn over the app, so its sheets and messages work).
export function Onboarding({ step, lang, onLanguage, onGoogle, onGuest, busy, error, currency, onSetupSave, onSetupSkip, onBackToAccount, onOpenDebts }) {
  const [leaving, setLeaving] = useState(false);
  // Android Back in the questions goes to the previous page of the scene, never out of the app halfway through
  useBackStep(step === "setup" && !leaving, () => onBackToAccount && onBackToAccount());
  const out = (fn) => { if (motionOff()) { fn(); return; } setLeaving(true); setTimeout(fn, 420); };
  return (
    <div className={`ob-screen lang-screen ob-${step}${leaving ? " ob-leaving" : ""}`} lang={lang || undefined} data-section="onboarding" role={step === "lang" ? undefined : "dialog"} aria-modal={step === "lang" ? undefined : "true"} aria-label={step === "lang" ? undefined : "Expense Ledger"}>
      <Brand lang={lang} />
      <div className="ob-panel">
        <div key={step} className={`ob-slide${step === "lang" ? "" : " in-next"}`}>
          {step === "lang" && <LanguagePage onChoose={onLanguage} />}
          {step === "account" && <AccountPage onGoogle={onGoogle} onGuest={onGuest} busy={busy} error={error} />}
          {step === "setup" && <SetupSteps currency={currency} onOpenDebts={onOpenDebts}
            onSkip={() => out(onSetupSkip)}
            onSave={(plan, extra) => out(() => onSetupSave(plan, extra))} />}
        </div>
      </div>
    </div>
  );
}
