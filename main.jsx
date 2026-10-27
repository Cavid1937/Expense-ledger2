import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Run 10: the service worker lets the installed app open without a connection (public/sw.js). Only in the built app on a
// secure origin (https or localhost); never during development, so a stale cached copy can't hide code changes.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
