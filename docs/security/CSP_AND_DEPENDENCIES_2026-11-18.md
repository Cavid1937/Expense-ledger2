# CSP enforcement plan and dependency review (Run 108, 18 Nov 2026)

Nothing here was switched on, merged or dismissed. The owner's rules: CSP enforcement is approved for later, after real sign-in, Drive,
import/export, offline and WebView checks and a look at real violations. Dependabot pull requests may be inspected and tested, not merged
or closed.

## A. Content Security Policy

**Today** (`vercel.json`, live since release 107): `Content-Security-Policy-Report-Only`. Browsers *report* violations in the console but
block nothing. There is no `report-uri`, so violations are not collected anywhere, and adding a collector would be new telemetry, which is
not approved. Real violations can only be seen in the browser console of someone using the live site.

**Checked today (static, on `dist/index.html` built 17 Nov):**
- The one inline `<script>` hashes to `sha256-KRrXit5…VNo=`, which **matches** the hash already in the policy.
- The one inline `<style>` (1,898 characters) hashes to `sha256-vlenfBFO3o0AOXRwm5820S31ECeZAPKY3pqsxIuNcaM=`.
- `screens/launch.js:50` adds a second `<style>` element (`launch-css`) at run time.
- No HTML string inserted by the app (icons, launch screen, Google "G", Drive icon) contains a `style="…"` attribute. React's `style={{…}}`
  is set through the DOM style API, which CSP does not block.
- No `eval` / `new Function` in app code; PDF reading runs with `isEvalSupported: false` (see B1).

**Correction (same day, 17:30).** The list above undercounted the inline items. There were four, not two:
1. `index.html` `<style id="launch-css">` (above). `launch.js:50` adds its copy only when this element is missing, which it never is in a
   build, so it is the same text and the same hash.
2. **The whole app stylesheet**: `App.jsx` renders `<style>{CSS}</style>` from `styles.js` (about 133 KB, static text). Missed in the first pass.
3. `public/privacy.html` had its own inline `<style>`.
4. `public/app-open.html` had an inline `<script>` (the analytics queue stub) that was not in `script-src` either.

**Done (Run 108 CSP preparation, still Report-Only, nothing enforced live):**
- 3 and 4 moved to files: `public/privacy.css`, `public/app-open.js`. Same origin, no behaviour change.
- 1 and 2 are listed by hash in `style-src`; `'unsafe-inline'` removed from the Report-Only `style-src`.
- `tests/pwa/csp-hashes.mjs` recomputes the hashes from a build plus `styles.js` and fails on a missing or stale hash or on
  `'unsafe-inline'`. `--write` updates `vercel.json`. It runs inside `offline-check.mjs`, which runs before every push, and in `csp-check.mjs`.
  **Any edit to `styles.js` or the launch CSS changes a hash**; the pre-push check then fails until `--write` is run.
- `csp-check.mjs` (policy enforced locally): an injected inline style is now blocked and reported while the app's own stylesheet applies;
  the privacy and app-open pages load with nothing blocked. 21/21.
- Not testable here: Google's sign-in script (`gsi/client`) may add inline styles or `style` attributes on the website. With the
  Report-Only header, such a case shows in the browser console only. This must be checked during the real sign-in test before enforcement.

**Defect found and fixed in the same pass: app starts from the Android app were not counted from 17 Nov (release 107).** The app loads
`app-open.html` in a hidden frame from `https://localhost` (Run 40, owner-approved counting). Release 107 sent `X-Frame-Options: DENY`
on every page, so that frame was refused (probe: the frame ended as `chrome-error://`, the analytics script was never requested).
`vercel.json` now has a separate rule for `/app-open.html`: no `X-Frame-Options`, `frame-ancestors https://localhost` (Report-Only), and
`default-src 'none'; script-src 'self'; connect-src 'self'`. Every other page keeps `DENY`. This restores the existing count. It does not add
any new tracking.

**Proposed enforced policy (draft; the hash values must come from the release build):**
```
default-src 'self'; script-src 'self' 'sha256-<inline script>' https://accounts.google.com/gsi/client;
style-src 'self' 'sha256-<launch css>' 'sha256-<app stylesheet>' https://accounts.google.com/gsi/style; img-src 'self' data: blob:; font-src 'self';
connect-src 'self' https://qkztocsrxhubsljtsjpd.supabase.co https://www.googleapis.com https://accounts.google.com/gsi/ https://api.frankfurter.dev;
frame-src https://accounts.google.com/gsi/; worker-src 'self' blob:; manifest-src 'self' blob:; media-src 'self' blob:; object-src 'none';
base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```
No `'unsafe-inline'` and no `'unsafe-eval'`. The APK does not use this header: its pages are bundled and served by the WebView. Native CSP
for the APK would be a separate `<meta>` decision.

**Order before enforcing** (owner's list): (1) real Google sign-in on the site and the APK, (2) Drive backup and restore, (3) import/export incl. PDF
statements, (4) offline/PWA reload, (5) a week of the report-only header with the console checked on Chrome, Firefox and Safari on the main
screens. Then send the exact header for approval. Rollback: rename the header back to `-Report-Only` and push. Vercel serves it from the next
deployment in about a minute.

Status: inline-item preparation **IMPLEMENTED BUT UNVERIFIED** on live (verified locally under enforcement; the live Report-Only console and
the Google sign-in path are not yet checked). Enforcement **DEFERRED WITH REASON** (owner order).

## B. Dependencies

`npm audit` in the worktree (18 Nov): 5 findings, 1 critical, 3 high and 1 moderate. Checked one by one:

| # | Package (version) | Shipped to users? | Finding | Real exposure | Action |
|---|---|---|---|---|---|
| B1 | `pdfjs-dist` 3.11.174 (direct) | **Yes**: PDF statement import | GHSA-wgrm-67xf-hhpq: JavaScript runs when a malicious PDF is opened (fixed in 4.2.67) | **Mitigated**: the advisory's own workaround, `isEvalSupported: false`, is set in `pdfText.js:10`. The proposed CSP without `unsafe-eval` would block it a second time. | Upgrade to pdfjs-dist 4.x+ in a planned run (worker path, APK bundling and statement tests need re-checking). Priority medium. |
| B2 | `vite` 5.4.21, `esbuild` (dev) | No: tools on this PC only | Dev-server path traversal, cross-origin reads, launch-editor issues (Windows) | Only while `npm run dev` is running on this PC; the published site is plain built files. | Fixed by Vite 7/8 (major). Planned upgrade, not urgent. Avoid running the dev server with untrusted sites open. |
| B3 | `tar` + `@mapbox/node-pre-gyp` (dev, through an optional native build) | No | Path traversal and denial of service when extracting a hostile tar file | Install-time only, from npm's own registry | `npm audit fix` (no major change) in the next run, then the full test run. |

**Dependabot pull requests (all three opened 18 Nov 02:39, before the Run 108 rule that skips major versions; that rule is not pushed yet):**

| PR | Change | Recommendation |
|---|---|---|
| #1 | vite 5.4.21 → 8.3.8 | **Do not merge now.** Three majors at once, and the bundler changes to Rolldown. Plan it as its own run with the full test suite and an APK check. It also removes B2. |
| #2 | @vitejs/plugin-react 4.7.0 → 6.3.0 | **Do not merge alone.** Its release notes are about Rolldown and Vite 8 parts, so treat it as belonging with #1. |
| #3 | react-dom 18.3.1 → 19.3.1 | **Do not merge: it would break the app.** It raises only `react-dom`; `react` stays at 18, and the two must be the same version. A React 19 move needs both together, as a planned upgrade. |

After the dependabot.yml change is pushed, these three can be closed. Closing is the owner's action; nothing was dismissed.

**Finding B4 (confirmed): Dependabot *alerts* are switched off for this repository.** The GitHub API answered "Dependabot alerts are disabled for this repository" (HTTP 403).
So the comment in `.github/dependabot.yml` ("security fixes still arrive as their own alerts") is **not true today**: with majors skipped, a
security fix that needs a major version would arrive nowhere. Fix (owner action, a repository setting): GitHub > repository > Settings >
Code security > turn on **Dependabot alerts** and **Dependabot security updates**. It's free. Until then, `npm audit` runs here each release.

Status: dependency review **VERIFIED** (npm audit read, code checked for B1). B1 **IMPLEMENTED BUT UNVERIFIED** as a mitigation (setting
present; no malicious-PDF test was run). B4 **BLOCKED**: it needs the owner to change the repo setting.
