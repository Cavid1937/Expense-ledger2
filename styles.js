// Run 27: the app's stylesheet, moved out of App.jsx unchanged (App.jsx was ~7,100 lines). It is one template string; App.jsx imports it and renders it in a <style> tag.
export const CSS = `
/* Run 25: Onest (SIL OFL 1.1), self-hosted and saved offline by the service worker. Chosen because its Latin-extended file carries the
   manat sign and every Azerbaijani letter and its Cyrillic file covers Russian (measured from the font files, not assumed). */
@font-face{font-family:"Onest";font-style:normal;font-weight:100 900;font-display:swap;src:url("/fonts/onest-latin.woff2") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Onest";font-style:normal;font-weight:100 900;font-display:swap;src:url("/fonts/onest-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"Onest";font-style:normal;font-weight:100 900;font-display:swap;src:url("/fonts/onest-cyrillic.woff2") format("woff2");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
button{font-family:inherit;cursor:pointer}
/* "Caspian Ledger" dark design (Run 9, 2026-10-27; replaces the blue redesign of the same day). Surfaces: page #07151A,
   card #0E2229, elevated #153039, border #24414A. Text #F3F7F6, muted #A5B7B8. Brand / selection: sea-glass teal #4CC9C4;
   filled teal controls carry dark text (white on teal is 2.0:1, dark is 9.3:1). Meaning colours: income #8BD97A (a clear
   green, 69° of hue away from the teal — the proposed #63D6A0 was 26° away and read as "selected"), expense #FF8188,
   warning #F0C46F, comparison #83B9F5. Every text colour is ≥ 5.5:1 on every surface. */
:root{
  color-scheme:dark;
  --font:"Onest",-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --bg:#07151A;--bg-card:#0E2229;--bg-warm:#153039;--bg-inset:#112A31;
  --ink:#F3F7F6;--ink-2:#D3DFDE;--ink-3:#A5B7B8;--ink-4:#93A7A8;--ink-5:#2A464E;
  --rule:#24414A;--rule-2:#36606A;
  --accent:#4CC9C4;--accent-light:#123C3F;--accent-mid:#85D9D0;--accent-text:#4CC9C4;--accent-fill:#4CC9C4;--on-accent:#07151A;
  --violet:#B3A1FF;--info:#83B9F5;
  --pos:#8BD97A;--pos-bg:#173622;
  --neg:#FF8188;--neg-bg:#3B1C22;
  --warn:#F0C46F;--warn-bg:#352B14;
  --radius:18px;
}
html,body{background:var(--bg);color:var(--ink);font-family:var(--font);min-height:100vh;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
input::placeholder,textarea::placeholder{color:var(--ink-4)}
.app{max-width:430px;margin:0 auto;min-height:100vh;background:var(--bg);display:flex;flex-direction:column}
.topbar{position:sticky;top:0;z-index:60;background:rgba(7,21,26,0.92);background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);padding:10px 20px 6px;min-height:60px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0}
.wordmark{font-family:var(--font);font-size:26px;font-weight:700;color:var(--ink);letter-spacing:-0.4px;line-height:1.15;min-width:0;overflow-wrap:anywhere}
.topbar-back{display:flex;align-items:center;gap:2px;min-width:0;margin-left:-8px}
.topbar-back .wordmark{font-size:22px}
.topbar-right{display:flex;align-items:center;gap:7px}
.fab-add{position:fixed;bottom:calc(72px + env(safe-area-inset-bottom,0px) + 14px);left:calc(50% + min(215px,50vw) - 72px);width:56px;height:56px;border:none;border-radius:50%;background:var(--accent-fill);color:var(--on-accent);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(0,0,0,0.38),0 2px 8px rgba(76,201,196,0.3);transition:transform 120ms,background 120ms;-webkit-tap-highlight-color:transparent;z-index:55}
.fab-add:active{transform:scale(0.92)}
.fab-add.fab-hide{transform:translateY(96px);opacity:0;pointer-events:none}
@media (prefers-reduced-motion:reduce){.fab-add{transition:none}}
.topbar-btn{width:34px;height:34px;border-radius:8px;background:transparent;border:none;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 120ms,color 120ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.topbar-btn:hover{background:var(--bg-inset);color:var(--ink)}.topbar-btn:active{transform:scale(0.88)}
.tabbar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(7,21,26,0.94);background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(24px);border-top:1px solid var(--rule);display:flex;z-index:60;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px))}
.tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0;border:none;background:transparent;cursor:pointer;color:var(--ink-3);transition:color 150ms,transform 80ms;font-family:var(--font);-webkit-tap-highlight-color:transparent}
.tab-btn.active{color:var(--ink)}.tab-btn:active{transform:scale(0.88)}
/* Sentence case, no extra tracking: upper-case labels were up to 30% wider, so long Azerbaijani and Russian words
   ("Əməliyyatlar", "Təkrarlanan", "По месяцам") filled the whole tab at 320 px and ran into their neighbours. */
.tab-btn{min-width:0;padding-left:2px;padding-right:2px}
/* Enlarged phone text (page zoom) narrows the CSS viewport: at 130–200% a 390 px phone is 300–195 px wide and the longest
   label, "Əməliyyatlar" (≈6.15 × the font size), no longer fits a fifth of it. The label shrinks with the width instead,
   so on screen it stays at least as large as at 100%. When text is enlarged without zoom (a minimum font size), it can't
   shrink, so it wraps inside its own tab rather than running into the next one. */
.tab-lbl{font-size:clamp(5.5px,2.85vw,10.5px);font-weight:600;letter-spacing:0;text-transform:none;line-height:1.15;max-width:100%;text-align:center;overflow-wrap:anywhere}
.tab-indicator{position:absolute;top:5px;left:calc((100% / var(--tab-count,5)) * var(--tab-index,0) + (100% / (var(--tab-count,5) * 2)) - 8px);width:16px;height:2px;background:var(--accent);border-radius:99px;pointer-events:none;transition:left 320ms cubic-bezier(0.22,1,0.36,1)}
.page{flex:1;overflow-y:auto;padding:20px 20px calc(148px + env(safe-area-inset-bottom,0px));animation:pageIn 240ms cubic-bezier(0.22,1,0.36,1) backwards}
/* "backwards", not "both": a transform kept after the animation makes .page the box that position:fixed sheets are placed in,
   so a sheet opened from a long list landed thousands of pixels below the screen, under the tab bar. */
@keyframes pageIn{from{opacity:.4}to{opacity:1}}   /* Run 14: a short fade only; sliding every screen in made the numbers move while being read. Run 38: from 0.4, not 0 — starting from blank looked like a refresh */
.label-sm{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3)}
/* Hero */
.hero{padding:16px 0 18px;border-bottom:1px solid var(--rule);margin-bottom:18px}
.hero-eyebrow{font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px}
.hero-amount{font-family:var(--font);font-size:clamp(34px,11.5vw,48px);font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-2px;line-height:1;color:var(--ink);margin-bottom:3px;white-space:nowrap}
.hero-sub{font-size:12px;color:var(--ink-3);margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mom-badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px}
.mom-badge.better{background:var(--pos-bg);color:var(--pos)}
.mom-badge.worse{background:var(--neg-bg);color:var(--neg)}
.hero-stats{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid var(--rule);border-radius:8px;overflow:hidden;background:var(--bg-card)}
.hero-stat{padding:11px 10px;position:relative}
.hero-stat:not(:last-child)::after{content:'';position:absolute;right:0;top:8px;bottom:8px;width:1px;background:var(--rule)}
.hero-stat-val{font-family:var(--font);font-size:clamp(12px,3.6vw,15px);font-weight:700;letter-spacing:-0.3px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hero-stat-val.pos{color:var(--pos)}.hero-stat-val.neg{color:var(--neg)}
.hero-stat-lbl{font-size:10px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-4)}
/* Cards */
.pace-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:12px 14px;margin-bottom:14px}
.pace-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
.pace-track{height:3px;background:var(--rule);border-radius:99px;overflow:hidden}
.pace-fill{height:100%;border-radius:99px;transition:width 0.5s ease}
.pace-fill.on-track{background:var(--pos)}.pace-fill.over-pace{background:var(--neg)}
.pace-sub{display:flex;justify-content:space-between;margin-top:4px}
.safe-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:14px 16px;margin-bottom:14px}
.safe-amount{font-family:var(--font);font-size:clamp(26px,8.6vw,32px);font-weight:900;letter-spacing:-1.5px;margin:4px 0}
.safe-daily{font-size:11px;color:var(--ink-3);margin-top:2px}
.safe-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px 0;border-bottom:1px solid var(--rule);font-size:11px}
.safe-row:last-child{border-bottom:none}
.safe-lbl{color:var(--ink-3)}.safe-val{font-family:var(--font);font-weight:600;color:var(--ink);white-space:nowrap;text-align:right}
/* Templates */
.tpl-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:14px;scrollbar-width:none}
.tpl-strip::-webkit-scrollbar{display:none}
.tpl-card{flex-shrink:0;display:flex;align-items:center;gap:7px;padding:8px 13px;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;cursor:pointer;transition:border-color 120ms,background 120ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.tpl-card:hover{border-color:var(--rule-2);background:var(--bg-warm)}.tpl-card:active{transform:scale(0.94)}
.tpl-name{font-size:12px;font-weight:600;color:var(--ink-2);white-space:nowrap}
.tpl-amt{font-family:var(--font);font-size:12px;color:var(--ink-3);white-space:nowrap}
/* Budgets */
.budget-item{margin-bottom:11px}
.budget-hdr{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}
.budget-name{font-size:12px;font-weight:600;color:var(--ink-2);display:flex;align-items:center;gap:5px}
.budget-nums{font-size:11px;color:var(--ink-3)}.budget-nums strong{color:var(--ink);font-weight:700}
.budget-track{height:2px;background:var(--rule);border-radius:99px;overflow:hidden}
.budget-fill{height:100%;border-radius:99px;transition:width 0.5s ease}
.budget-msg{font-size:10px;margin-top:3px;color:var(--ink-4);font-weight:500}
.budget-msg.warn{color:var(--warn)}.budget-msg.over{color:var(--neg)}
/* Goals */
.goal-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:14px;margin-bottom:10px}
.goal-name{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:3px}
.goal-progress{height:4px;background:var(--rule);border-radius:99px;overflow:hidden;margin:8px 0 5px}
.goal-fill{height:100%;border-radius:99px;background:var(--accent);transition:width 0.6s ease}
.goal-meta{display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3)}
/* Transactions */
.txn-group{margin-bottom:16px}
.txn-date-hdr{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:6px;border-bottom:1px solid var(--rule)}
.txn-date-lbl{font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:var(--ink-3)}
.txn-date-total{font-family:var(--font);font-size:13px;font-weight:600;color:var(--ink)}
.txn-list{background:var(--bg-card);border:1px solid var(--rule);border-top:none;border-radius:0 0 8px 8px}
.txn-row{display:flex;align-items:center;gap:11px;padding:11px 13px;border-bottom:1px solid var(--rule);transition:background 80ms,transform 80ms;cursor:pointer;-webkit-tap-highlight-color:transparent}
.txn-row:last-child{border-bottom:none;border-radius:0 0 8px 8px}
.txn-row:active{background:var(--bg-inset);transform:scale(0.99)}
.txn-ico{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.txn-body{flex:1;min-width:0}
.txn-name{font-size:13px;font-weight:600;color:var(--ink);white-space:normal;overflow-wrap:anywhere;line-height:1.25}
.txn-sub{font-size:11px;color:var(--ink-3);margin-top:2px;display:flex;gap:4px;align-items:center;flex-wrap:wrap;overflow:visible;line-height:1.3}
.txn-sub span{white-space:nowrap}
.txn-sub span:not(.rec-pill){white-space:normal;overflow-wrap:anywhere;min-width:0;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rec-pill{display:inline-flex;align-items:center;gap:3px;background:var(--warn-bg);color:var(--warn);font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;flex-shrink:0}
.txn-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
.txn-amt{font-family:var(--font);font-size:14px;font-weight:600}
.txn-amt.exp{color:var(--ink)}.txn-amt.inc{color:var(--pos)}
.txn-actions{display:flex;gap:1px}
.txn-act{width:28px;height:28px;border-radius:5px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink-4);transition:background 120ms,color 120ms}
.txn-act:hover{background:var(--bg-inset);color:var(--ink-2)}.txn-act.del:hover{background:var(--neg-bg);color:var(--neg)}
/* Empty */
.empty{text-align:center;padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:10px}
.empty-icon{color:var(--ink-5);margin-bottom:4px}
.empty-title{font-family:var(--font);font-size:20px;font-weight:600;color:var(--ink)}
.empty-body{font-size:13px;color:var(--ink-3);line-height:1.65;max-width:240px}
/* Add overlay */
.add-overlay{position:fixed;inset:0;background:var(--bg);z-index:100;display:flex;flex-direction:column;max-width:430px;margin:0 auto;animation:slideUp 340ms cubic-bezier(0.22,1,0.36,1);overflow-y:auto}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}   /* Run 29: transform only - at opacity 0.6 the screen behind showed through the moving sheet (a double exposure, seen in the 6 Nov phone video) */
.add-bar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--rule);flex-shrink:0}
.add-title{font-family:var(--font);font-size:17px;font-weight:700}
.add-close{width:30px;height:30px;border-radius:50%;border:1px solid var(--rule);background:transparent;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color 120ms,color 120ms}
.add-close:hover{border-color:var(--ink-3);color:var(--ink)}
.add-body{flex:1;padding:18px 20px 36px;display:flex;flex-direction:column}
/* Amount */
.amount-zone{display:flex;align-items:center;justify-content:center;padding:18px 0 20px;border-bottom:1px solid var(--rule);margin-bottom:16px}
.amount-line{display:flex;align-items:baseline;justify-content:center;gap:7px;max-width:100%;min-width:0}
.amount-input{font-family:var(--font);font-size:clamp(32px,12vw,50px);font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-1.6px;background:transparent;border:0;border-radius:8px;outline:none;color:var(--ink);min-width:0;max-width:68vw;text-align:right;caret-color:var(--accent);transition:color 160ms,text-shadow 160ms,transform 160ms;appearance:textfield;-moz-appearance:textfield}
.amount-input:focus{color:var(--ink);text-shadow:0 0 18px rgba(0,0,0,0.07)}
.amount-input::placeholder{color:var(--ink-3)}   /* Run 9: was --ink-5, 1.66:1 on the dark page — unreadable */
.numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
.numpad-key{min-height:50px;border:1px solid var(--rule);border-radius:14px;background:var(--bg-card);color:var(--ink);font-family:var(--font);font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.numpad-key{transition:transform .08s ease-out,background .12s}
.lock-screen{position:fixed;inset:0;z-index:1000;background:var(--bg);color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px 20px;overflow-y:auto;font-family:var(--font)}
.lock-card{width:100%;max-width:320px;text-align:center}
.lock-title{font-size:22px;font-weight:700;margin:0 0 4px}
.lock-sub{font-size:14px;color:var(--ink-3);margin:0 0 14px}
.lock-dots{display:flex;gap:12px;justify-content:center;min-height:18px;margin-bottom:6px}
.lock-dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--ink-3);box-sizing:border-box}
.lock-dot.on{background:var(--accent-fill);border-color:var(--accent-fill)}
.lock-msg{color:var(--neg);font-size:13px;font-weight:600;min-height:20px;margin-bottom:6px}
.lock-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%}
.lock-pad .numpad-key:disabled{opacity:.45}
.lock-screen .btn:not(.btn-primary),[data-section="lock-sheet"] .btn:not(.btn-primary){-webkit-appearance:none;appearance:none;padding:12px 18px;min-height:48px;background:var(--bg-card);color:var(--ink);border:1px solid var(--rule);border-radius:14px;font-size:15px;-webkit-tap-highlight-color:transparent}
.lock-screen .btn:not(.btn-primary):active,[data-section="lock-sheet"] .btn:not(.btn-primary):active{opacity:.7}
.lock-screen .btn[data-section="lock-forgot-btn"]{background:none;border-color:transparent;color:var(--ink-3);font-weight:500;margin-top:4px}
[data-section="lock-sheet"] .btn.lock-bio-row{justify-content:space-between;text-align:left}
.lock-switch{position:relative;flex:0 0 44px;width:44px;height:26px;border-radius:13px;background:var(--rule);transition:background .15s}
.lock-switch::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:var(--ink-3);transition:transform .15s,background .15s}
.lock-bio-row[aria-checked="true"] .lock-switch{background:var(--accent-fill)}
.lock-bio-row[aria-checked="true"] .lock-switch::after{transform:translateX(18px);background:var(--on-accent)}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.lock-switch,.lock-switch::after{transition:none}}
.numpad-key:active{background:var(--bg-warm);transform:scale(.95)}
@media (prefers-reduced-motion:reduce){.numpad-key{transition:none}.numpad-key:active{transform:none}}
.numpad-key:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.add-foot{position:sticky;bottom:0;background:var(--bg);border-top:1px solid var(--rule);padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));z-index:3;flex-shrink:0}
.more-toggle{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:10px 14px;margin:6px 0 14px;border:1px dashed var(--rule-2);border-radius:14px;background:transparent;color:var(--ink-2);text-align:left;-webkit-tap-highlight-color:transparent}
.more-toggle-main{font-weight:700;font-size:14px;color:var(--ink);white-space:nowrap}
.more-toggle-sub{flex:1;min-width:0;font-size:12px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.more-toggle:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.amount-cur{font-family:var(--font);font-size:15px;font-weight:600;color:var(--ink-3);white-space:nowrap;position:relative;top:-2px}
/* Run 39: the currency sign is a button when other currencies can be used (min 44px tall to tap) */
.amount-cur-btn{background:var(--bg-warm);border:1px solid var(--rule);border-radius:999px;padding:0 10px;min-height:44px;min-width:44px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;color:var(--ink-2);top:0}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
input[type=number]{-moz-appearance:textfield}
/* Type toggle */
.type-other-row{display:flex;flex-wrap:wrap;gap:8px;margin:-6px 0 14px}
.type-picker{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:14px}
.type-picker.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.type-pick{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;min-height:64px;padding:10px 4px;border:1px solid var(--rule);border-radius:16px;background:var(--bg-card);color:var(--ink-2);font-family:var(--font);font-size:14px;font-weight:600;line-height:1.15;text-align:center;overflow-wrap:anywhere;cursor:pointer;transition:background 160ms,border-color 160ms,color 160ms,transform 120ms}
.type-pick:active{transform:scale(0.96)}
.type-pick:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.type-pick.active{background:var(--accent-light);border-color:var(--accent);color:var(--ink)}
.type-pick.type-btn{background:var(--bg-card);color:var(--ink-2);flex:none;text-transform:none;letter-spacing:0;font-size:14px;padding:10px 4px;border:1px solid var(--rule);border-right:1px solid var(--rule)}
.type-pick.type-btn.active{border-color:var(--accent);background:var(--accent-light);color:var(--ink)}
.type-pick.type-btn:not(.active):hover{border-color:var(--rule-2)}
.type-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
@media (prefers-reduced-motion:reduce){.type-pick{transition:none}.type-pick:active{transform:none}}
.type-toggle{display:flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden;margin-bottom:14px}
.type-btn{flex:1;padding:9px;border:none;background:transparent;color:var(--ink-3);font-size:12px;font-weight:700;cursor:pointer;transition:background 120ms,color 120ms;font-family:var(--font);letter-spacing:0.3px;text-transform:uppercase}
.type-btn:not(:last-child){border-right:1px solid var(--rule)}.type-btn.active{background:var(--accent-fill);color:var(--on-accent)}
/* Cat/sub */
.cat-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}.cat-scroll::-webkit-scrollbar{display:none}
.cat-tile{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;width:auto;min-width:68px;padding:9px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--bg-card);cursor:pointer;transition:border-color 150ms,background 150ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.cat-tile.sel{border-color:var(--accent);background:var(--accent-light)}
.cat-tile:active{transform:scale(0.93)}
.cat-tile-name{font-size:9.5px;font-weight:600;color:var(--ink-3);text-align:center;line-height:1.2;white-space:nowrap;width:auto;letter-spacing:-0.1px}
.cat-tile.sel .cat-tile-name{color:var(--ink)}
.sub-strip{display:flex;gap:5px;overflow-x:auto;padding-bottom:2px;margin-bottom:12px;scrollbar-width:none}.sub-strip::-webkit-scrollbar{display:none}
.sub-chip{flex-shrink:0;padding:4px 10px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:var(--font);transition:all 120ms,transform 80ms;-webkit-tap-highlight-color:transparent}
.sub-chip.sel{background:var(--accent-fill);border-color:var(--accent-fill);color:var(--on-accent)}
.sub-chip:active{transform:scale(0.93)}
/* Merchant */
.merchant-wrap{position:relative}
.merchant-suggestions{position:absolute;top:calc(100% + 2px);left:0;right:0;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;z-index:20;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1)}
.merchant-sug-item{padding:9px 13px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--rule);color:var(--ink);transition:background 100ms}
.merchant-sug-item:last-child{border-bottom:none}.merchant-sug-item:hover{background:var(--bg-warm)}
.merchant-sug-sub{font-size:10px;color:var(--ink-3);margin-top:1px}
/* Form */
.field{margin-bottom:12px}
.field-lbl{font-size:10px;font-weight:700;letter-spacing:1.05px;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px;display:block}
.field-input{width:100%;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;padding:10px 12px;font-size:14px;color:var(--ink);font-family:var(--font);transition:border-color 150ms,box-shadow 150ms}
.field-input:focus{outline:none;border-color:var(--ink-3);box-shadow:0 0 0 3px rgba(0,0,0,0.06)}
.field-select{appearance:none;cursor:pointer}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
/* Toggle */
.toggle-track{width:44px;height:24px;border-radius:12px;background:var(--ink-5);position:relative;transition:background 100ms;flex-shrink:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.toggle-track.on{background:var(--accent)}
.toggle-knob{width:18px;height:18px;border-radius:50%;background:white;position:absolute;top:3px;left:3px;transition:transform 220ms cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 1px 4px rgba(0,0,0,0.2),0 0 0 0px rgba(0,0,0,0)}
.toggle-track.on .toggle-knob{transform:translateX(20px)}
.toggle-track:active .toggle-knob{transform:scaleX(1.15)}
.toggle-track.on:active .toggle-knob{transform:translateX(20px) scaleX(1.15)}
/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:6px;font-family:var(--font);font-weight:600;cursor:pointer;transition:opacity 120ms,background 120ms}
.btn-full{width:100%}
.btn-primary{padding:12px 20px;background:var(--accent-fill);color:var(--on-accent);border:1px solid var(--accent-fill);font-size:15px;font-weight:600;margin-top:8px;border-radius:14px;min-height:48px}.btn-primary:hover{opacity:0.87}
.btn-ghost{padding:11px 20px;background:transparent;color:var(--ink-3);border:1px solid var(--rule);font-size:13px;margin-top:6px}.btn-ghost:hover{border-color:var(--rule-2);color:var(--ink)}
.btn-sm{padding:5px 12px;font-size:11px;font-weight:700;background:transparent;border:1px solid var(--rule);color:var(--ink-2)}.btn-sm:hover{border-color:var(--rule-2)}
.btn-sm-primary{background:var(--accent-fill);color:var(--on-accent);border-color:var(--accent-fill)}
/* Search/filter */
.search-wrap{position:relative;margin-bottom:8px}
.search-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--ink-4);pointer-events:none}
.search-input{width:100%;background:var(--bg-card);border:1px solid var(--rule);border-radius:6px;padding:9px 12px 9px 34px;font-size:13px;color:var(--ink);font-family:var(--font);transition:border-color 120ms}.search-input:focus{outline:none;border-color:var(--rule-2);box-shadow:0 0 0 3px rgba(0,0,0,0.05)}
.filter-bar{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px}.filter-bar::-webkit-scrollbar{display:none}
.chip{flex-shrink:0;padding:5px 11px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;transition:all 120ms,transform 80ms;white-space:nowrap;font-family:var(--font);-webkit-tap-highlight-color:transparent}
.chip.on{background:var(--accent-fill);border-color:var(--accent-fill);color:var(--on-accent)}.chip:hover:not(.on){border-color:var(--rule-2);color:var(--ink)}.chip:active{transform:scale(0.94)}
.cat-filter-btn{display:flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-card);color:var(--ink-3);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font);white-space:nowrap;flex-shrink:0;transition:all 120ms}
.cat-filter-btn.active{border-color:var(--ink);color:var(--ink);background:var(--bg-warm)}
.cat-filter-btn:active{transform:scale(0.94)}
.date-inputs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.date-input-wrap{display:flex;flex-direction:column;gap:3px}
.date-lbl{font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-3)}
.date-input{background:var(--bg-card);border:1px solid var(--rule);border-radius:5px;padding:7px 9px;font-size:12px;color:var(--ink);font-family:var(--font);width:100%}.date-input:focus{outline:none;border-color:var(--rule-2);box-shadow:0 0 0 3px rgba(0,0,0,0.05)}
/* Sheet */
.sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:80;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 200ms cubic-bezier(0.22,1,0.36,1)}   /* Run 23: a plain dim, no blur (calmer, cheaper on phones) */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
button:not(:disabled):active,[role="button"]:active{opacity:.74}   /* Run 23: every press answers at once */
.sheet{background:var(--bg);width:100%;max-width:430px;border-radius:20px 20px 0 0;border-top:1px solid var(--rule);max-height:92vh;overflow-y:auto;animation:sheetRise 320ms cubic-bezier(0.22,1,0.36,1);padding:0 20px 48px;box-shadow:0 -4px 32px rgba(0,0,0,0.12)}
@keyframes sheetRise{from{transform:translateY(100%);opacity:0.8}to{transform:translateY(0);opacity:1}}
.sheet-handle{width:32px;height:3px;background:var(--ink-5);border-radius:99px;margin:12px auto 18px}
.sheet-title{font-family:var(--font);font-size:21px;font-weight:700;margin-bottom:16px}
.settings-section-lbl{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-3);padding:14px 0 8px;border-bottom:1px solid var(--rule)}
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--rule);gap:12px}
.settings-row:last-of-type{border-bottom:none}
.settings-row-title{font-size:13px;font-weight:600;color:var(--ink)}
.settings-row-sub{font-size:11px;color:var(--ink-3);margin-top:2px}
/* Analytics */
.a-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:15px;margin-bottom:13px}
.a-card-title{font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--ink-3);margin-bottom:12px}
.cat-bar{display:flex;align-items:center;gap:8px;margin-bottom:9px}.cat-bar:last-child{margin-bottom:0}
.cat-bar-name{font-size:11px;font-weight:600;color:var(--ink-2);width:116px;flex-shrink:0;white-space:normal;overflow:visible;text-overflow:clip;display:flex;align-items:center;gap:5px;line-height:1.25}
.cat-bar-track{flex:1;height:3px;background:var(--rule);border-radius:99px;overflow:hidden}
.cat-bar-fill{height:100%;border-radius:99px;transition:width 0.6s ease}
.cat-bar-amt{font-family:var(--font);font-size:12px;font-weight:600;color:var(--ink);width:68px;text-align:right;flex-shrink:0}
.cat-bar-pct{font-size:10px;color:var(--ink-3);width:26px;text-align:right;flex-shrink:0}
/* Month bars */
.month-bars{display:flex;align-items:flex-end;gap:4px;height:80px;padding-top:8px}
.m-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;cursor:pointer;position:relative}
.m-bar{width:100%;border-radius:2px 2px 0 0;transition:height 0.5s ease,background 150ms;min-height:2px}
.m-lbl{font-size:10px;font-weight:700;letter-spacing:0.2px}
/* Month calendar (Run 17) */
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.cal-dow{font-size:10px;font-weight:700;color:var(--ink-4);text-align:center;padding-bottom:3px}
.cal-day{min-height:40px;border:0;border-radius:8px;background:var(--bg-inset);color:var(--ink-2);font-family:inherit;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.cal-day.has-spend{color:var(--ink)}
.cal-day.future{background:transparent;color:var(--ink-3);box-shadow:inset 0 0 0 1px var(--rule)}
.cal-day.today{outline:1.5px solid var(--ink-3);outline-offset:1px}
.cal-day.sel{outline:2px solid var(--ink);outline-offset:1px}
.cal-day:focus-visible{outline:2px solid var(--accent);outline-offset:1px}/* Stats */
.stat-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:13px}
.stat-cell{background:var(--bg-card);border:1px solid var(--rule);border-radius:7px;padding:11px 12px}
.stat-val{font-family:var(--font);font-size:20px;font-weight:700;letter-spacing:-0.5px;margin-bottom:2px}
.stat-lbl{font-size:10px;font-weight:700;letter-spacing:0.65px;text-transform:uppercase;color:var(--ink-3)}
/* What Changed */
.wc-row{display:flex;align-items:flex-start;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--rule)}
.wc-row:last-child{border-bottom:none}
.wc-name{font-size:12px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:6px}
.wc-diff{font-family:var(--font);font-size:13px;font-weight:700}
.wc-diff.pos{color:var(--pos)}.wc-diff.neg{color:var(--neg)}
.wc-merchants{margin-top:5px;padding-left:19px}
.wc-m-row{display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3);padding:2px 0}
/* Pattern */
.pattern-item{background:var(--bg-warm);border-radius:6px;padding:10px 13px;margin-bottom:7px;font-size:12px;color:var(--ink-2);line-height:1.5;display:flex;align-items:flex-start;gap:8px}
/* Snackbar / Toast */
.snackbar{position:fixed;bottom:calc(72px + env(safe-area-inset-bottom,0px) + 8px);left:50%;transform:translateX(-50%);background:var(--bg-warm);color:var(--ink);border:1px solid var(--rule-2);padding:11px 18px;border-radius:14px;font-size:13px;font-weight:600;z-index:200;display:flex;align-items:center;gap:14px;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.3),0 2px 6px rgba(0,0,0,0.15);animation:snackIn 300ms cubic-bezier(0.22,1,0.36,1)}
@keyframes snackIn{from{opacity:0;transform:translateX(-50%) translateY(16px) scale(0.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
.snackbar-undo{background:none;border:1px solid rgba(76,201,196,0.45);color:var(--accent-text);border-radius:6px;padding:4px 11px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);transition:border-color 120ms}
.snackbar-undo:hover{border-color:rgba(255,255,255,0.5)}
.toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--bg-warm);color:var(--ink);border:1px solid var(--rule-2);padding:9px 18px;border-radius:12px;font-size:12px;font-weight:600;z-index:300;white-space:nowrap;pointer-events:none;animation:toastIn 260ms cubic-bezier(0.22,1,0.36,1);box-shadow:0 4px 16px rgba(0,0,0,0.25)}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px) scale(0.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
/* Staggered section entrance */
/* Run 14: the sections of a screen appear together with a short fade (no per-section delay, no sliding). The classes stay so the
   markup is unchanged; reduced-motion handling further down still switches the animation off completely. */
.section-enter{animation:sectionIn 160ms ease-out both}
.section-enter-1,.section-enter-2,.section-enter-3,.section-enter-4,.section-enter-5,.section-enter-6,.section-enter-7,.section-enter-8{animation-delay:0ms}
@keyframes sectionIn{from{opacity:0}to{opacity:1}}
.backup-banner{display:flex;align-items:center;gap:10px;padding:9px 16px;background:var(--warn-bg);border-bottom:1px solid rgba(240,196,111,0.35);font-size:11px;font-weight:600;color:var(--warn)}
.backup-banner span{flex:1}
.backup-banner-btn{flex-shrink:0;padding:4px 10px;background:var(--warn);color:var(--bg);border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font)}
.backup-dismiss{background:none;border:none;color:var(--warn);font-size:15px;cursor:pointer;padding:2px;line-height:1;flex-shrink:0}
.drop-zone{border:1.5px dashed var(--rule);border-radius:7px;padding:16px;text-align:center;cursor:pointer;transition:border-color 150ms,background 150ms;width:100%}
.drop-zone:hover{border-color:var(--rule-2);background:var(--bg-warm)}
.drop-zone input{display:none}
.dupe-warn{display:flex;align-items:center;gap:7px;background:var(--warn-bg);border:1px solid rgba(240,196,111,0.35);border-radius:10px;padding:8px 11px;font-size:12px;font-weight:600;color:var(--warn);margin-bottom:11px}
/* Monthly view */
.month-selector{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.month-nav-btn{width:34px;height:34px;border-radius:8px;background:var(--bg-card);border:1px solid var(--rule);color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 120ms;font-size:16px;line-height:1}
.month-nav-btn:hover{border-color:var(--rule-2);color:var(--ink)}
.month-name{font-family:var(--font);font-size:20px;font-weight:700;color:var(--ink)}
.month-stat{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:13px 14px}
.month-stat-val{font-family:var(--font);font-size:clamp(17px,5.8vw,22px);font-weight:900;letter-spacing:-0.5px;margin-bottom:3px}
.month-stat-lbl{font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--ink-3)}
/* Smart helper */
.helper-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:8px;padding:13px 14px;margin-bottom:10px;display:flex;gap:11px;align-items:flex-start}
.helper-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.helper-body{flex:1;min-width:0}
.helper-title{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:3px}
.helper-text{font-size:12px;color:var(--ink-2);line-height:1.55}
.helper-impact{font-size:11px;font-weight:600;margin-top:5px}
.helper-card.warn .helper-icon{background:var(--warn-bg)}
.helper-card.neg .helper-icon{background:var(--neg-bg)}
.helper-card.pos .helper-icon{background:var(--pos-bg)}
.helper-card.info .helper-icon{background:var(--bg-inset)}
/* Form validation */
.field-error{font-size:11px;color:var(--neg);font-weight:600;margin-top:3px}
.field-input.invalid{border-color:var(--neg)}
/* Enhanced transitions */
.btn-primary:active{transform:scale(0.97)}
.goal-fill{transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1)}
.budget-fill{transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1)}
.cat-bar-fill{transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1)}
@media (max-width:360px){
  .topbar{padding-left:15px;padding-right:15px}
  .page{padding-left:15px;padding-right:15px}
  .cat-tile{width:70px}
  .cat-tile-name{font-size:9px}
  .hero-stat{padding:10px 6px}
  .hero-stat-val{font-size:12px;letter-spacing:-0.45px}
  .hero-stat-lbl{font-size:9px;letter-spacing:0.7px}
  .amount-cur{font-size:14px}
}
/* Very narrow: a phone with its text enlarged to ~200% is under 280 CSS px wide. The amount column then left the
   merchant and category about 7 px, so a row wraps (amount below the name), and the three summary figures stack. */
@media (max-width:280px){
  .topbar{padding-left:10px;padding-right:10px}
  .page{padding-left:10px;padding-right:10px}
  .txn-row{flex-wrap:wrap;gap:6px 9px;padding:10px}
  .txn-body{flex:1 1 calc(100% - 43px)}
  .txn-right{flex-direction:row;flex-wrap:wrap;justify-content:flex-start;align-items:center;width:100%;padding-left:43px}
  .hero-stats{grid-template-columns:1fr}
  .hero-stat:not(:last-child)::after{left:8px;right:8px;top:auto;bottom:0;width:auto;height:1px}
  /* two-column boxes stack (inline grid styles need !important); filter chips wrap instead of scrolling out of sight */
  .stat-row,.field-row,.date-inputs{grid-template-columns:1fr}
  .month-stats,.detail-meta{grid-template-columns:1fr !important}
  .filter-bar{flex-wrap:wrap;overflow-x:visible}
  .backup-banner{flex-wrap:wrap}
  .backup-banner span{flex:1 1 100%;min-width:0}
  .safe-row{flex-wrap:wrap}.safe-val{white-space:normal;overflow-wrap:anywhere}
  .cat-bar{flex-wrap:wrap}.cat-bar-name{width:100%}
  /* an input's built-in width (~150 px) pushed the Save button beside it off the screen */
  .field-input{min-width:0}
  .settings-row{flex-wrap:wrap}
  .goal-milestones{flex-wrap:wrap}.goal-milestones>div{flex:1 1 40% !important}
}
.btn:disabled{opacity:.45;cursor:not-allowed}.btn-primary:disabled:active{transform:none}
/* First-launch language chooser */
.lang-screen{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:var(--bg)}
.lang-box{width:100%;max-width:420px}
.lang-mark{display:block;text-align:center;font-size:20px;margin-bottom:22px}
.lang-set{border:none;margin:0;padding:0;min-width:0}
.lang-title{display:flex;flex-direction:column;gap:2px;text-align:center;font-size:15px;font-weight:600;color:var(--ink);line-height:1.35;margin:0 auto 16px;padding:0}
.lang-line{display:block}
.lang-opt{position:relative;display:flex;align-items:center;gap:12px;min-height:56px;padding:14px 16px;margin-bottom:10px;background:var(--bg-card);border:1.5px solid var(--rule-2);border-radius:10px;cursor:pointer;font-size:17px;font-weight:600;color:var(--ink);transition:border-color 120ms,background 120ms}
.lang-opt input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.lang-name{flex:1;overflow-wrap:anywhere}
.lang-mark-sel{flex-shrink:0;width:22px;height:22px;border-radius:50%;border:2px solid var(--rule-2);display:inline-flex;align-items:center;justify-content:center}
.lang-opt.sel{border-color:var(--ink);background:var(--bg-warm)}
.lang-opt.sel .lang-mark-sel{border-color:var(--ink);background:var(--ink)}
.lang-opt.sel .lang-mark-sel::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--bg)}
.lang-opt:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.lang-continue{margin-top:6px;min-height:48px}
.lang-hint{display:flex;flex-direction:column;gap:2px;text-align:center;font-size:12px;color:var(--ink-2);line-height:1.45;margin:14px 0 0}
/* Language switch in Settings */
.lang-switch{display:flex;flex-wrap:wrap;gap:8px;border:none;margin:0;padding:0}
.lang-pill{position:relative;display:inline-flex;align-items:center;min-height:40px;padding:8px 14px;border:1.5px solid var(--rule-2);border-radius:20px;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;background:var(--bg-card)}
.lang-pill input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.lang-pill.sel{border-color:var(--accent-fill);background:var(--accent-fill);color:var(--on-accent)}
.lang-pill:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.fab-add:focus-visible,.topbar-btn:focus-visible,.tab-btn:focus-visible,.btn:focus-visible,.cat-tile:focus-visible,.chip:focus-visible,.sub-chip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
/* Run 14: rows, bars, the import tile and switches are keyboard-reachable now; they get the same visible ring (inside the edge for rows, which sit in clipped cards) */
.txn-row:focus-visible,.bill-row:focus-visible,.drop-zone:focus-visible,.list-row:focus-visible,.toggle-track:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.m-col:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
/* ── Design pass (from patch_H_design.py, reviewed) ── */
/* Secondary greys: --ink-3 #5F5A53 is 6.2:1 on the page background, --ink-4 #6E6961 is ≥ 4.5:1 on every surface
   (page, card, warm and inset backgrounds). They were 4.2:1 and 2.0:1. (The patch's #746F67 failed on --bg-inset: 4.15:1.) */
/* Money reads as aligned, lining figures */
.hero-amount,.hero-stat-val,.safe-amount,.safe-val,.stat-val,.month-stat-val,.txn-amt,.txn-date-total,.cat-bar-amt,.budget-nums,.amount-input,.wc-diff,.goal-meta{font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1}
/* Touch targets: the look stays, the tappable area grows to 44px */
.topbar-btn,.add-close,.toggle-track,.snackbar-undo,.backup-banner-btn,.backup-dismiss{position:relative}
.topbar-btn::after{content:"";position:absolute;inset:-5px}
.sheet .topbar-btn{z-index:1}   /* keeps the enlarged tap area above the goal progress bar drawn just below it */

.add-close::after{content:"";position:absolute;inset:-8px}
.topbar-right{gap:12px}
.backup-banner-btn::after{content:"";position:absolute;inset:-6px -2px}
.backup-dismiss::after{content:"";position:absolute;inset:-12px -15px}
.sheet .topbar-btn::after{inset:-9px}
.toggle-track::after{content:"";position:absolute;inset:-10px -4px}
.chip,.sub-chip{min-height:34px;display:inline-flex;align-items:center}
.btn-sm,.snackbar-undo{min-height:36px}
/* Sheets follow the finger while dragged (see useSheetGestures) */
.sheet-grip{margin:0 -20px;padding:12px 0 8px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.sheet-grip:active{cursor:grabbing}
.sheet-grip .sheet-handle{margin:0 auto}
.sheet.dragging{animation:none;transition:none;will-change:transform}
/* Once dragged, a sheet's entrance animation stays off: re-enabling it on release would replay the rise from the bottom. */
.sheet.settled{animation:none}
.sheet:focus{outline:none}
/* ── Redesign (2026-10-27): dark cards, larger radii, blue selection ── */
.tab-btn{color:var(--ink-3)}.tab-btn.active{color:var(--accent-text)}
.tabbar{border-top:1px solid var(--rule)}
.card,.safe-card,.a-card,.pace-card,.helper-card,.month-stat,.stat-cell,.goal-card{background:var(--bg-card);border:1px solid var(--rule);border-radius:var(--radius)}
.card{padding:16px;margin-bottom:14px}
.card-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.card-title{font-size:16px;font-weight:600;color:var(--ink)}
.card-sub-title{font-size:15px;font-weight:600;color:var(--ink);margin:16px 0 10px}
.section-title{display:block;font-size:17px;font-weight:600;color:var(--ink);margin:18px 2px 10px}
.list-title{display:block;font-size:15px;font-weight:600;color:var(--ink);overflow-wrap:anywhere}
.list-sub{display:block;font-size:12.5px;color:var(--ink-3);margin-top:2px;overflow-wrap:anywhere}
.big-num{font-size:clamp(26px,8vw,32px);font-weight:700;letter-spacing:-0.5px;color:var(--ink);margin:4px 0 12px;font-variant-numeric:tabular-nums}
.label-sm{font-size:12px;font-weight:600;letter-spacing:0.2px;text-transform:none;color:var(--ink-3)}
/* This month (the "hero") is now a card */
.hero.card{padding:16px;border-bottom:1px solid var(--rule)}
.hero .hero-eyebrow{font-size:12px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--ink-3);margin:0}
.hero-amount{font-size:clamp(30px,10vw,40px);font-weight:700;letter-spacing:-1px}
.hero-stats{border:none;background:var(--bg-inset);border-radius:12px}
.hero-stat-val{font-size:clamp(13px,3.9vw,16px);font-weight:700;letter-spacing:-0.2px}
.hero-stat-lbl{font-size:11px;letter-spacing:0.2px;text-transform:none;color:var(--ink-3)}
.hero-stat:not(:last-child)::after{background:var(--rule-2)}
/* Run 25: with Safe to Spend on, that is the one big number on Home; this month's total steps down so two figures do not compete. */
.hero.quiet .hero-amount{font-size:clamp(24px,7.5vw,30px);font-weight:600;letter-spacing:-.4px;margin-bottom:4px}
.mom-badge{border-radius:999px;padding:3px 9px}
/* Safe to Spend */
.safe-card{padding:16px;margin-bottom:14px;background:var(--bg-card)}
.safe-amount{font-size:clamp(30px,10vw,38px);font-weight:700;letter-spacing:-1px}
.safe-card .label-sm{font-size:14px;font-weight:600;color:var(--accent-text)}
.safe-row{font-size:12.5px;padding:6px 0}
.safe-toggle{display:inline-flex;align-items:center;gap:4px;min-height:36px;margin-top:6px;padding:0;background:none;border:none;color:var(--accent-text);font:inherit;font-size:13px;font-weight:600}
.safe-note{font-size:11.5px;color:var(--ink-3);line-height:1.5;margin-top:8px}
/* Spending ring */
.donut-wrap{display:flex;align-items:center;gap:16px}
.donut{position:relative;width:132px;height:132px;flex-shrink:0}
.donut-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--ink);text-align:center;padding:0 26px;font-variant-numeric:tabular-nums}
.donut{transition:transform 260ms cubic-bezier(0.22,1,0.36,1)}
.donut.has-sel{transform:scale(1.12)}
.donut-slice{transition:stroke-width 220ms,opacity 220ms}
.donut-center-sel{flex-direction:column;gap:1px;padding:0 22px;line-height:1.2}
.dc-name{font-size:10px;font-weight:600;color:var(--ink-3);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-amt{font-size:12px;font-weight:700}
.dc-pct{font-size:10px;font-weight:600;color:var(--ink-3)}
.donut-row{display:flex;align-items:center;gap:8px;width:100%;min-height:34px;padding:2px 4px;margin:0;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:13px;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.donut-row[aria-pressed="true"]{background:var(--bg-inset)}
.donut-row:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
@media (prefers-reduced-motion:reduce){.donut,.donut-slice{transition:none}}
.donut-legend{list-style:none;flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.donut-legend li{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2)}
.donut-legend .dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.donut-name{flex:1;min-width:0;overflow-wrap:anywhere}
.donut-pct{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
@media (max-width:340px){.donut-wrap{flex-direction:column;align-items:stretch}.donut{margin:0 auto}}
/* Rows with a round category icon */
.cat-dot{width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.up-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--rule)}
.up-row:first-of-type{border-top:none}
.up-body{flex:1;min-width:0}
.up-amt{font-size:15px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
/* Lists inside a card (More, Budgets) */
.list-card{padding:4px 16px}
.list-row{display:flex;align-items:center;gap:14px;width:100%;min-height:60px;padding:12px 0;background:none;border:none;border-bottom:1px solid var(--rule);text-align:left;color:var(--ink);font:inherit;cursor:pointer}
.list-row:last-child{border-bottom:none}
/* Run 24: Claude-app feel across the app: no bounce anywhere, softer presses, one decelerating curve (~0.2-0.3 s) */
.toggle-knob{transition:transform 220ms cubic-bezier(0.22,1,0.36,1)}
.toggle-track{transition:background-color 200ms ease-out}
.chip:active,.cat-filter-btn:active,.sub-chip:active,.cat-tile:active{transform:scale(0.97)}
.tpl-card:active{transform:scale(0.97)}
.tab-btn:active{transform:scale(0.94)}
.txn-row{transition:background-color 120ms ease-out,transform 120ms ease-out}
.txn-row:active{transform:none}
.bill-row[role="button"]:active{opacity:1;background:color-mix(in srgb,var(--ink) 8%,transparent);border-radius:12px}
.field-input,.date-input{transition:border-color 200ms ease-out,box-shadow 200ms ease-out,background-color 200ms ease-out}
@media (prefers-reduced-motion:reduce){.toggle-knob,.toggle-track,.txn-row{transition:none}}
.txn-row{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}   /* press-and-hold selects rows, not text */
.toast{animation:toastIn 280ms cubic-bezier(0.22,1,0.36,1),toastOut 200ms ease-in var(--toast-out,1500ms) forwards;border-radius:16px}   /* it fades out just before it is removed */
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes toastOut{to{opacity:0;transform:translateX(-50%) translateY(-8px)}}
.snackbar{animation:snackIn 300ms cubic-bezier(0.22,1,0.36,1),snackOut 200ms ease-in var(--snack-out,3800ms) forwards;border-radius:16px}   /* in-app notices rise from the bottom edge, no scale, and ease out before they go */
@keyframes snackIn{from{opacity:0;transform:translateX(-50%) translateY(24px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes snackOut{to{opacity:0;transform:translateX(-50%) translateY(12px)}}
.backup-banner{animation:bannerIn 320ms cubic-bezier(0.22,1,0.36,1) backwards}
@keyframes bannerIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.backup-banner{animation:none}}
.snackbar-undo{border-radius:999px;transition:background-color 120ms ease-out}
.snackbar-undo:active{background:color-mix(in srgb,var(--ink) 12%,transparent)}
.goal-fill,.budget-fill{transition:width 0.6s cubic-bezier(0.22,1,0.36,1)}   /* no overshoot on progress bars */
.seg-btn{transition:background-color 180ms ease-out,color 180ms ease-out}
.seg-btn:active{background:color-mix(in srgb,var(--ink) 8%,transparent)}
.seg-btn.on:active{background:var(--accent-fill)}
.empty{animation:sectionIn 320ms ease-out both}   /* calm empty states: they ease in rather than appear */
@media (prefers-reduced-motion:reduce){.seg-btn{transition:none}}
.add-overlay.leaving{animation:addOut 220ms cubic-bezier(0.4,0,1,1) forwards;pointer-events:none}
@keyframes addOut{from{transform:translateY(0)}to{transform:translateY(100%)}}
.sheet-overlay.leaving{animation:dimOut 200ms ease-in forwards;pointer-events:none}
.sheet-overlay.leaving .sheet{animation:sheetFall 200ms cubic-bezier(0.4,0,1,1) forwards}
@keyframes dimOut{from{opacity:1}to{opacity:0}}
@keyframes sheetFall{from{transform:translateY(0)}to{transform:translateY(100%)}}
.page.page-sub{overflow-x:hidden}   /* the slide moves the page's contents inside it, so it can never create a horizontal scrollbar */
.page.page-sub>*{animation:pageSlide 300ms cubic-bezier(0.22,1,0.36,1) backwards}   /* opened from a list (Recurring, Import/Export, Debts): comes in from the right */
@keyframes pageSlide{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}
.prefs-card>.settings-section-lbl:first-child{margin-top:0!important;padding-top:0}   /* Run 24: Preferences sections sit in rounded cards, like Claude's grouped settings */
.list-row{border-radius:12px;transition:background-color 120ms ease-out}
.list-row:active{opacity:1;background:color-mix(in srgb,var(--ink) 8%,transparent)}   /* Run 24: a pressed row becomes a soft rounded pill (Claude-app feel) */
@media (prefers-reduced-motion:reduce){.list-row{transition:none}}
.list-ico{width:28px;display:inline-flex;justify-content:center;flex-shrink:0}
.list-body{flex:1;min-width:0}
.more-id{display:flex;align-items:center;gap:14px}
.st-ident-top{display:flex;align-items:center;gap:14px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--rule)}   /* Run 31: identity card header */
.more-mark{width:46px;height:46px;border-radius:50%;background:var(--accent-light);border:1px solid var(--accent);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
/* Segmented control */
.seg{display:flex;background:var(--bg-card);border:1px solid var(--rule);border-radius:12px;padding:3px;margin-bottom:14px}
.seg-btn{flex:1;min-height:38px;border:none;border-radius:9px;background:transparent;color:var(--ink-3);font:inherit;font-size:14px;font-weight:600}
.seg-btn.on{background:var(--accent-fill);color:var(--on-accent)}
.seg-btn:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
/* Progress bars */
.bar{flex:1;height:8px;background:var(--bg-inset);border-radius:99px;overflow:hidden}
.bar-fill{height:100%;border-radius:99px;transition:width 0.6s ease}
.bud-row{padding:12px 0;border-bottom:1px solid var(--rule)}
.bud-row:last-child{border-bottom:none}
.bud-top{display:flex;align-items:center;gap:12px}
.bud-name{flex:1;min-width:0;font-size:15px;font-weight:600;color:var(--ink);overflow-wrap:break-word}
.bud-nums{font-size:12.5px;color:var(--ink-3);text-align:right;font-variant-numeric:tabular-nums}
.bud-bar-row{display:flex;align-items:center;gap:10px;margin-top:9px;padding-left:50px}
.goal-card .bud-bar-row{padding-left:0}
.bud-pct{font-size:12px;font-weight:600;color:var(--ink-3);min-width:36px;text-align:right;font-variant-numeric:tabular-nums}
.goal-card{padding:16px}
.goal-name{font-size:15px;font-weight:600}
/* Run 15: the required monthly amount is the first answer on a goal; the what-if below it is optional and collapsed. */
.goal-need{margin-top:12px;padding:10px 12px;border-radius:8px;background:var(--bg-inset);border:1px solid var(--rule)}
.goal-need-main{font-size:16px;font-weight:700;color:var(--ink);margin-bottom:2px}
.goal-need-muted{font-size:12px;color:var(--ink-3);line-height:1.5}
.goal-need-note{margin-top:4px}
.goal-scenario{margin-top:10px;padding-top:10px;border-top:1px solid var(--rule)}
.goal-scenario .gs-toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;background:none;border:0;cursor:pointer;font:inherit;font-size:12px;font-weight:700;color:var(--ink-3);min-height:32px;padding:2px 0;text-align:left}
.goal-scenario .gs-toggle:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.goal-scenario .field-input{margin-top:6px}
.goal-scenario-out{margin-top:8px;font-size:12px;color:var(--ink-2);line-height:1.5}
.trend-legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--ink-3)}
.trend-legend span{display:inline-flex;align-items:center;gap:6px}
.trend-legend i{display:inline-block;width:14px;height:3px;border-radius:2px}
.trend-legend i.dash{background:repeating-linear-gradient(90deg,var(--ink-4) 0 4px,transparent 4px 7px)}
.month-name{font-size:20px;font-weight:700}
/* Import / Export */
.io-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.io-card{display:flex;flex-direction:column;align-items:flex-start;margin-bottom:0;cursor:pointer}
.io-card.drop-zone{border:1px solid var(--rule);border-radius:var(--radius);padding:16px;text-align:left}
.io-card.drop-zone:hover{background:var(--bg-warm)}
.io-ico{margin-bottom:12px}
.io-backup{display:flex;justify-content:space-between;align-items:center;gap:10px}
.io-status{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--warn);white-space:nowrap}
.io-status.ok{color:var(--pos)}
@media (max-width:340px){.io-grid{grid-template-columns:1fr}}
/* Enlarged text (≤ 280 CSS px): budget rows stack, so the Edit / Set button never runs off the screen */
/* Narrow phones: the spent / limit figures get their own line, so a category name is never broken mid-word */
@media (max-width:360px){ .bud-top{flex-wrap:wrap}.bud-nums{flex-basis:100%;text-align:left;padding-left:50px;margin-top:-4px} }
@media (max-width:280px){
  .bud-bar-row{flex-wrap:wrap;padding-left:0}.bud-bar-row .bar{flex-basis:100%}
  .up-row{flex-wrap:wrap}.donut-wrap{flex-direction:column;align-items:stretch}
}
/* Transactions */
.txn-ico{border-radius:50%;width:38px;height:38px}
.txn-list{border-radius:0 0 var(--radius) var(--radius)}
.txn-row:last-child{border-radius:0 0 var(--radius) var(--radius)}
.txn-date-hdr{border-bottom:none;padding:0 2px 8px}
.txn-date-lbl{font-size:13px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink-2)}
.txn-list{border-top:1px solid var(--rule);border-radius:var(--radius)}
.txn-row:first-child{border-radius:var(--radius) var(--radius) 0 0}
.txn-row:only-child{border-radius:var(--radius)}
.txn-name{font-size:15px}.txn-sub{font-size:12.5px}
.txn-amt{font-size:15px;font-weight:600}
.txn-amt.exp{color:var(--neg)}
.search-input{border-radius:12px;padding:11px 12px 11px 36px;font-size:14px}
.chip,.cat-filter-btn{border-radius:999px;padding:6px 14px;font-size:13px}
.a-card-title,.stat-lbl,.month-stat-lbl,.field-lbl,.settings-section-lbl,.date-lbl{letter-spacing:0.3px;text-transform:none;font-size:12px;font-weight:600}
.a-card-title{font-size:15px;color:var(--ink)}
.sheet{border-radius:24px 24px 0 0;background:var(--bg-card);border-top:1px solid var(--rule-2)}
.field-input,.date-input{background:var(--bg-inset);border-radius:10px}
.btn-sm{border-radius:999px}
.btn-ghost{border-radius:14px;min-height:46px}
/* Run 9: the routine backup reminder is a compact card under the screen edge, not a full-width amber bar above the title.
   Recovery notices and storage failures keep the strong full-width banner (Master Prompt §8). Dismissing lasts for this visit. */
.backup-banner.backup-reminder{margin:8px 16px 0;border:1px solid rgba(240,196,111,0.35);border-radius:14px;background:var(--bg-card);color:var(--ink-2);font-weight:500;padding:8px 12px}
.backup-reminder .backup-banner-btn{border-radius:999px;padding:6px 12px}
/* Run 9 privacy mode: numbers and names are replaced in the text itself (see fmt / maskText); graphics that would still
   reveal proportions are blurred. Navigation, titles and buttons are never blurred. */
.privacy-toggle.on{color:var(--accent-text);background:var(--accent-light);border-radius:50%}
/* Run 34: no more smudge. A hidden chart is replaced by a calm hatched panel (its shape and proportions are not shown), and it fades in and out instead of snapping. */
.donut svg,.trend-card svg,.bar,.cat-bar-track,.budget-track,.goal-progress,.pace-track,.month-bars,.cal{transition:background-color 240ms ease-out}
.donut svg>*,.trend-card svg>*,.bar>*,.cat-bar-track>*,.budget-track>*,.goal-progress>*,.pace-track>*,.month-bars>*,.cal>*{transition:opacity 260ms ease-out}
.privacy-on .donut svg,.privacy-on .trend-card svg,.privacy-on .bar,.privacy-on .cat-bar-track,.privacy-on .budget-track,
.privacy-on .goal-progress,.privacy-on .pace-track,.privacy-on .month-bars,.privacy-on .cal{background:repeating-linear-gradient(135deg,var(--rule) 0 5px,transparent 5px 10px);border-radius:10px;pointer-events:none}
.privacy-on .donut svg>*,.privacy-on .trend-card svg>*,.privacy-on .bar>*,.privacy-on .cat-bar-track>*,.privacy-on .budget-track>*,
.privacy-on .goal-progress>*,.privacy-on .pace-track>*,.privacy-on .month-bars>*,.privacy-on .cal>*{opacity:0}
.page.pf-a{animation:pfA 300ms ease-out}.page.pf-b{animation:pfB 300ms ease-out}
@keyframes pfA{from{opacity:.35}to{opacity:1}}@keyframes pfB{from{opacity:.35}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.page.pf-a,.page.pf-b{animation:none}}
/* Run 25: layers. Tone first, then a hairline edge; shadows only on things that float (sheet, menus, toasts, the + button).
   Levels: 0 sunken (wells) - 1 page - 2 card - 3 raised - 4 floating. Everything is opaque on purpose: no blur behind numbers or lists. */
:root{--sunken-mix:#000;--sunken-pct:32%;--raise-mix:var(--ink);--raise-pct:6%;--float-pct:11%;
  --surface-sunken:color-mix(in oklab,var(--bg-card),var(--sunken-mix) var(--sunken-pct));
  --surface-raised:color-mix(in oklab,var(--bg-card),var(--raise-mix) var(--raise-pct));
  --surface-float:color-mix(in oklab,var(--bg-card),var(--raise-mix) var(--float-pct));
  --lit-edge:inset 0 1px 0 color-mix(in srgb,var(--ink) 7%,transparent);
  --shadow-card:0 0 0 0 transparent;
  --shadow-float:0 12px 32px rgba(0,0,0,0.5),0 2px 8px rgba(0,0,0,0.3)}
:root[data-theme="mist"]{--sunken-pct:5%;--raise-mix:#fff;--raise-pct:55%;--float-pct:85%;--lit-edge:0 0 0 0 transparent;
  --shadow-card:0 1px 2px rgba(25,29,35,0.10);--shadow-float:0 12px 32px rgba(25,29,35,0.20),0 2px 8px rgba(25,29,35,0.12)}
:root[data-fx="off"]{--lit-edge:0 0 0 0 transparent;--shadow-card:0 0 0 0 transparent;--shadow-float:0 0 0 0 transparent}
.card,.safe-card,.a-card,.pace-card,.helper-card,.month-stat,.stat-cell,.goal-card{box-shadow:var(--lit-edge),var(--shadow-card)}
.safe-card{background:var(--surface-raised)}
.hero-stats{background:var(--surface-sunken)}
.sheet,.snackbar,.toast,.merchant-suggestions{background:var(--surface-float);box-shadow:var(--shadow-float)}
.fab-add{box-shadow:var(--shadow-float)}
/* Run 25 "vessel": budgets, goals and the spending pace fill like a measuring cup - a sunken well with quarter-mark ticks - instead of a hairline. */
.bar,.budget-track,.goal-progress,.pace-track{height:12px;background:var(--surface-sunken);border:1px solid var(--rule);box-shadow:inset 0 1px 2px rgba(0,0,0,0.22);position:relative}
.bar::after,.budget-track::after,.goal-progress::after,.pace-track::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(25% - 1px),color-mix(in srgb,var(--ink) 18%,transparent) calc(25% - 1px),color-mix(in srgb,var(--ink) 18%,transparent) 25%)}
:root[data-fx="off"] :is(.bar,.budget-track,.goal-progress,.pace-track){box-shadow:none}
.month-stat-val{font-weight:700}
/* Run 25: a newly saved entry settles in: its row is tinted for a moment, then the tint fades (about 1.2 s, no movement). */
@keyframes txn-settle{from{background:color-mix(in oklab,var(--accent) 22%,transparent)}to{background:transparent}}
.txn-row.txn-fresh{animation:txn-settle 1200ms ease-out}
@media (prefers-reduced-motion:reduce){.txn-row.txn-fresh{animation:none}}
.hero-amount .cur,.safe-amount .cur,.month-stat-val .cur{font-size:.6em;font-weight:500;letter-spacing:0}
/* Pressed rows change tone (a layer step), not shadow, so touch feedback stays cheap. */
@media (hover:none){.txn-row:active,.setup-step:active{background:var(--surface-raised)}}
/* Run 26: movement that explains itself. Scrolling glides instead of jumping; forms ease open where they belong; cards rise in once
   when a screen opens (CSS animations only run on insertion, never on a re-render); presses give a small, quick squeeze. */
html,.page,.sheet{scroll-behavior:smooth}
/* Run 26c: identity across every screen. A faint ruled-ledger page, rules that follow section titles, one ruled summary strip on Analytics
   (net first, with a double rule), account labels on rows, grouped Settings. All of it is tone and line, no extra shadow or blur. */
.acc-pill{margin-left:6px;padding:1px 7px;border:1px solid var(--rule-2);border-radius:99px;font-size:10px;font-weight:600;color:var(--ink-3);white-space:nowrap}
.more-group-lbl{margin:20px 0 8px;border-bottom:none}
/* Run 26d: (1) the faint ruled page background was removed - the rules ran through headings and the gaps between cards and looked like a glitch.
   (2) A list row's separator is a drawn line, not a border: with the rounded press shape a border curved up at the row's corners.
   (3) Small round/square controls get a larger invisible tap area (44px) without changing how they look. */
.list-row{border-bottom:none;background-image:linear-gradient(var(--rule),var(--rule));background-size:calc(100% - 28px) 1px;background-position:center bottom;background-repeat:no-repeat}
.list-row:last-child{background-image:none}
.stat-row .stat-cell:last-child:nth-child(odd){grid-column:1 / -1}   /* an odd number of figures: the last one spans the row instead of sitting half-width beside a gap */
.io-backup{flex-direction:column;align-items:flex-start;gap:8px}   /* the status used to squeeze the text into a narrow column; it now sits above the text as a small pill */
.io-backup .io-status{order:-1;padding:3px 10px;border:1px solid currentColor;border-radius:99px;font-size:11px}
.io-backup>div{width:100%}
.month-nav-btn,.add-close,.chip{position:relative}
.month-nav-btn::after{content:"";position:absolute;inset:-6px}
.chip::after{content:"";position:absolute;inset:-6px -2px}
.section-title{display:flex;align-items:center;gap:10px}
.section-title::after{content:"";flex:1;height:1px;background:var(--rule)}
.month-stats{background:var(--bg-card);border:1px solid var(--rule);border-radius:var(--radius);box-shadow:var(--lit-edge),var(--shadow-card);overflow:hidden;gap:0 !important}
.month-stats .month-stat{background:none;border:none;box-shadow:none;border-radius:0;padding:14px 16px}
.month-stats .month-stat:nth-child(3){order:-1;grid-column:1 / -1;border-bottom:3px double var(--rule-2)}
.month-stats .month-stat:nth-child(3) .month-stat-val{font-size:clamp(26px,8vw,34px)}
.month-stats .month-stat:nth-child(2){border-left:1px solid var(--rule)}
@media (max-width:360px){.month-stats .month-stat:nth-child(2){border-left:none;border-top:1px solid var(--rule)}}
.acc-strip{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x proximity;padding:2px 2px 4px;scrollbar-width:none}
.acc-strip::-webkit-scrollbar{display:none}
.acc-card{flex:0 0 150px;min-height:96px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:14px;text-align:left;font:inherit;color:var(--ink);background:var(--surface-raised);border:1px solid var(--rule);border-radius:16px;cursor:pointer;transition:transform 90ms,background-color 120ms;-webkit-tap-highlight-color:transparent}
.acc-card:active{transform:scale(0.97)}
.acc-ico{width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--accent-light);border:1px solid var(--accent)}
.acc-name{font-size:13px;color:var(--ink-3);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.acc-bal{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums}
.acc-bal .cur{font-size:.65em;font-weight:500}
@media (prefers-reduced-motion:reduce){.acc-card{transition:none}.acc-card:active{transform:none}}
@keyframes revealIn{from{opacity:0;transform:translateY(-10px) scale(0.985)}to{opacity:1;transform:none}}
.reveal{animation:revealIn 320ms cubic-bezier(0.22,1,0.36,1);transform-origin:top center}
@keyframes rowRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.page:not(.page-sub)>.card,.page:not(.page-sub)>.section-title{animation:rowRise 340ms cubic-bezier(0.22,1,0.36,1) backwards}
.page:not(.page-sub)>:nth-child(2){animation-delay:40ms}.page:not(.page-sub)>:nth-child(3){animation-delay:80ms}
.page:not(.page-sub)>:nth-child(4){animation-delay:120ms}.page:not(.page-sub)>:nth-child(5){animation-delay:160ms}
.page:not(.page-sub)>:nth-child(n+6){animation-delay:200ms}
.btn{transition:opacity 120ms,background 120ms,transform 90ms}
.btn:active:not(:disabled){transform:scale(0.97)}
.fab-add:active{transform:scale(0.92)}
@media (prefers-reduced-motion:reduce){.reveal,.page>.card,.page>.section-title{animation:none}.btn:active:not(:disabled),.fab-add:active{transform:none}}
.topbar,.tabbar{backdrop-filter:none;-webkit-backdrop-filter:none}
.topbar{background:var(--bg)}
.tabbar{background:var(--bg-card)}
/* Materials follow the user's preferences */
@media (prefers-reduced-transparency: reduce){
  .topbar,.tabbar{background:var(--bg);backdrop-filter:none;-webkit-backdrop-filter:none}
  .sheet-overlay{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(0,0,0,0.62)}
}
@media (prefers-contrast: more){
  :root{--rule:#4E7580;--rule-2:#6E959E;--ink-3:#C6D4D4;--ink-4:#B7C7C8}
  .sheet-overlay{background:rgba(0,0,0,0.72)}
  .btn-ghost,.chip,.sub-chip,.field-input,.cat-tile,.search-input,.tpl-card{border-color:var(--rule-2)}
}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{scroll-behavior:auto!important;animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}
}
/* Run 27c: expandable Settings sections. The section title inside an opened card is already the row above, so it is kept for screen readers only. */
.fold{margin-bottom:0}.fold-card{margin-bottom:10px}.fold-body{margin:-2px 0 10px}.fold-body>.card{margin-top:0}
@keyframes fold-in{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.fold-body{animation:none}}[data-fx="off"] .fold-body{animation:none}
/* Run 27d: Safe to Spend is the hero of Home (larger, accent-edged, with the month runway); the cards below stay quieter. */
.safe-card{background:linear-gradient(165deg,color-mix(in srgb,var(--accent) 16%,var(--surface-raised)),var(--surface-raised) 62%);border-color:color-mix(in srgb,var(--accent) 38%,var(--rule));padding:18px 18px 14px}
.safe-card .safe-amount{font-size:clamp(38px,12.5vw,50px);font-weight:800;letter-spacing:-1.5px;margin:6px 0 4px}
.runway{display:flex;align-items:flex-end;gap:2px;height:16px;margin:12px 0 6px}.runway i{flex:1;height:7px;border-radius:2px;background:var(--rule-2);opacity:.55}.runway i.on{background:var(--accent);opacity:.9}.runway i.now{height:16px;background:var(--accent-text);opacity:1}
/* Run 29: inside the Android app the page draws under the status bar (clock, battery). --sat is the status-bar height: the browser's env() when it has one, else the value the Capacitor shell injects; 0 on the website. */
:root{--sat:max(env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px))}
.app{padding-top:var(--sat)}
.topbar{top:var(--sat)}
body::before{content:"";position:fixed;top:0;left:0;right:0;height:var(--sat);background:var(--bg);z-index:150;pointer-events:none}
/* Run 34 (7 Nov 2026): the Claude-app feel for everything that opens and closes INSIDE a screen. About 0.25 s, soft landing, no bounce, closing as smooth as opening. */
:root{--ease-out:cubic-bezier(0.22,1,0.36,1);--ease-in:cubic-bezier(0.4,0,1,1)}
.collapse{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:0fr;opacity:0;transition:grid-template-rows 220ms var(--ease-in),opacity 160ms ease-in}
.collapse.is-open{grid-template-rows:1fr;opacity:1;transition:grid-template-rows 260ms var(--ease-out),opacity 220ms ease-out}
.collapse-in{min-height:0;overflow:hidden}
.collapse.is-settled .collapse-in{overflow:visible}
[data-fx="off"] .collapse,[data-fx="off"] .collapse.is-open{transition:none}
@media (prefers-reduced-motion:reduce){.collapse,.collapse.is-open{transition:none}}
.swap-in{animation:swapIn 260ms var(--ease-out) backwards}
.swap-next.swap-in{animation-name:swapInNext}.swap-prev.swap-in{animation-name:swapInPrev}
@keyframes swapIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes swapInNext{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
@keyframes swapInPrev{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:none}}
[data-fx="off"] .swap-in,[data-fx="off"] .an-panel{animation:none}
@media (prefers-reduced-motion:reduce){.swap-in,.an-panel{animation:none}}
.an-panel{animation:swapIn 260ms var(--ease-out) backwards}
.an-panel[hidden]{display:none}
.row-leaving{opacity:0;transform:translateX(-14px);transition:opacity 200ms var(--ease-in),transform 200ms var(--ease-in);pointer-events:none}
@media (prefers-reduced-motion:reduce){.row-leaving{transition:none}}
.banner-leave{animation:bannerOut 220ms var(--ease-in) forwards;overflow:hidden}
@keyframes bannerOut{to{opacity:0;transform:translateY(-8px);max-height:0;margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;border-width:0}}
@media (prefers-reduced-motion:reduce){.banner-leave{animation:none;display:none}}
.page.page-out{animation:pageOut 190ms var(--ease-in) forwards;pointer-events:none}
@keyframes pageOut{to{opacity:0;transform:translateX(26px)}}
@media (prefers-reduced-motion:reduce){.page.page-out{animation:none}}
.sel-bar{animation:swapIn 220ms var(--ease-out) backwards}
.chip{transition:background-color 180ms ease-out,border-color 180ms ease-out,color 180ms ease-out,transform 120ms ease-out}
.txn-sel-row{transition:background-color 160ms ease-out}
.txn-check{transition:background-color 160ms ease-out,border-color 160ms ease-out}
.txn-check svg{transform:scale(0.4);opacity:0;transition:transform 180ms var(--ease-out),opacity 140ms ease-out}
.txn-check.on svg{transform:none;opacity:1}
/* Toggles: a calm track and a knob that stretches a little under the finger, no bounce */
.toggle-track{width:50px;height:30px;border-radius:15px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 14%,transparent);transition:background-color 220ms var(--ease-out),box-shadow 220ms ease-out}
.toggle-track.on{box-shadow:none}
.toggle-knob{width:24px;height:24px;top:3px;left:3px;transition:transform 240ms var(--ease-out),width 160ms var(--ease-out);box-shadow:0 1px 3px rgba(0,0,0,0.3)}
.toggle-track.on .toggle-knob{transform:translateX(20px)}
.toggle-track:active .toggle-knob{transform:none;width:29px}
.toggle-track.on:active .toggle-knob{transform:translateX(15px);width:29px}
@media (prefers-reduced-motion:reduce){.toggle-track,.toggle-knob{transition:none}}
.fold-chev{transition:transform 240ms var(--ease-out)}
.fold-chev{display:inline-flex}
.fold-chev.open{transform:rotate(180deg)}
.fold-chev.r90.open{transform:rotate(90deg)}
.privacy-toggle svg{animation:eyeSwap 220ms var(--ease-out)}
@keyframes eyeSwap{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:none}}
/* Run 38 (owner screenshot): a sticky element's offset counts from its scroll box, which is the page (.page scrolls), not the screen. The old
   "safe area + 60px" pushed the tab bar down inside the page: an empty gap above it and the first card hidden under it. 0 = the top of the page box,
   which already sits under the top bar; -20px cancels the page's 20px top padding (sticky offsets count inside the padding). */
.an-seg{position:sticky;top:-20px;z-index:5;background:var(--bg);padding:4px 0 8px;margin-bottom:4px}
.an-seg .seg{margin-bottom:0;flex-wrap:wrap}
/* Run 38: like .collapse, but the content stays in the page while closed (form fields keep what was typed and stay reachable for the app). */
.keep-collapse{display:grid;grid-template-rows:0fr;grid-template-columns:minmax(0,1fr);opacity:0;visibility:hidden;transition:grid-template-rows 260ms cubic-bezier(0.22,1,0.36,1),opacity 200ms ease,visibility 0s linear 260ms}
.keep-collapse.is-open{grid-template-rows:1fr;opacity:1;visibility:visible;transition:grid-template-rows 260ms cubic-bezier(0.22,1,0.36,1),opacity 220ms ease 40ms,visibility 0s}
.keep-collapse-in{min-height:0;overflow:hidden}
/* closed = not drawn at all once the motion has ended (display waits 260ms, then "none"; engines without allow-discrete simply close at once) */
.keep-collapse:not(.is-open) .keep-collapse-in{display:none;transition:display 0s linear 260ms allow-discrete}
.keep-collapse.is-open .keep-collapse-in{overflow:visible}
[data-fx="off"] .keep-collapse,[data-fx="off"] .keep-collapse.is-open{transition:none}
@media (prefers-reduced-motion:reduce){.keep-collapse,.keep-collapse.is-open{transition:none}}
.an-seg .seg-btn{flex:1 1 64px;min-width:0;padding:0 6px;overflow-wrap:anywhere}
.tab-fade{animation:swapIn 240ms var(--ease-out) backwards}
@media (prefers-reduced-motion:reduce){.tab-fade,.sel-bar,.privacy-toggle svg{animation:none}}
`;

