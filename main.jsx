import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Run 10: the service worker lets the installed app open without a connection (public/sw.js). Only in the built app on a
// secure origin (https or localhost); never during development, so a stale cached copy can't hide code changes.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}

// Run 21: Vercel Web Analytics (page visits only: cookieless, no ledger data, the address has no query or hash). Same script the
// @vercel/analytics package adds, without the package. Only in the built app on the live https site, never on localhost / file / dev.
if (import.meta.env.PROD && location.protocol === 'https:' && location.hostname !== 'localhost') {
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments) }
  const s = document.createElement('script')
  s.defer = true; s.src = '/_vercel/insights/script.js'
  s.onerror = () => {}
  document.head.appendChild(s)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
