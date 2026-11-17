# Expense Ledger — What to do when something goes wrong (Run 107, 18 Nov 2026)

Shaped on NIST SP 800-61 Rev. 3 and NIST CSF 2.0 (Detect → Respond → Recover), sized for a one-person product.
The first rule in every case: **never touch users' data to "fix" an incident**. The ledger is on their phones; protect that.

## 0. Who and where
- Owner decides and talks to users. Claude investigates and prepares fixes; Claude never pushes, deploys or changes live settings without the owner's yes.
- Live site: Vercel project for expense-ledger2.vercel.app. Last known-good commit is recorded at the top of PHASE_CHECKPOINT.md.
- Database: Supabase project `qkztocsrxhubsljtsjpd`.

## 1. The live site is broken (blank screen, crash on open)
1. Vercel > Deployments > previous "Ready" deployment > **Promote** (one click, undoes code and headers). This is the fastest safe step.
2. Users' data is not affected: it is on their phones. Tell them not to clear browser data.
3. Then find the cause locally (`node tests/pwa/offline-check.mjs`, the browser suite), fix, re-run the release gates.

## 2. A wrong financial figure is reported
1. Ask for: screen, the figure shown, the figure expected, release number (Settings > About). Never ask for the backup file unless the user offers; if they do, keep it in the scratchpad only, never in the repository.
2. Reproduce with synthetic data in a logic test first. Fix at the root, add the test, then release.
3. If many users could be affected, put a short notice in the next release notes.

## 3. A secret was exposed (key, token, password in a commit, chat or screenshot)
1. Rotate first, investigate second: Supabase > Settings > API keys (secret key), Google Cloud > Credentials (OAuth client), GitHub tokens.
2. The publishable Supabase key and the Google client IDs are public by design; exposure of those is not an incident.
3. Remove the secret from the code; history rewriting needs the owner's explicit approval (force-push is never done by default).

## 4. Someone may be reading other users' cloud copies
1. Run `docs/security/supabase_rls_check.sql` (rollback-only) — "other_user_sees" must be 0.
2. If not 0: Supabase > Authentication > disable new sign-ins; in SQL, `ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;` and re-check the policies. The app keeps working offline from the phone copy.
3. Check Supabase API logs for the time window; record what was reachable.
4. Owner decides on telling affected users (and any legal duty to report — this needs local legal advice; Claude cannot judge it).

## 5. Spam or abuse in the anonymous tables
Low risk: nobody can read them through the app. Delete the rows in Supabase; tighten the check constraints; rate-limit if it repeats.

## 6. A vulnerable package (Dependabot alert or npm audit)
1. Does the vulnerable code ship to users (not dev-only, not install-only)? If not, note it and plan the upgrade.
2. If it ships: is the vulnerable path reachable (e.g. PDF.js only with `isEvalSupported:true`)? Add a guard test, then upgrade with the full suite.

## 7. Content Security Policy reports blocks after a release
1. If the CSP is enforced and a feature breaks: rename the header back to `Content-Security-Policy-Report-Only` in `vercel.json` and release (or Promote the previous deployment).
2. Add the missing host to the policy only if it is a service the app is supposed to use (see DATA_FLOWS.md).

## 8. After every incident
Write a short entry at the top of PHASE_CHECKPOINT.md and the Notion Living Checkpoint: what happened, when, impact, what was done, what test now prevents it.
