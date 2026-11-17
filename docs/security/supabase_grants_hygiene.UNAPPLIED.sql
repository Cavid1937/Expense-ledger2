-- Expense Ledger: database permission tidy-up (Run 107, 18 Nov 2026). NOT APPLIED. Owner decision required.
--
-- Why: the anon and authenticated roles still hold Postgres' default extra rights (TRUNCATE, REFERENCES, TRIGGER) on the public
-- tables. The website cannot use them (the Supabase REST API has no TRUNCATE and RLS still applies), so this is hygiene, not an
-- open hole. Removing them means a future mistake (for example a new SQL function) cannot use them either.
-- What stays: anon may still INSERT anonymous counts/reports (the app's opt-in features); authenticated keeps SELECT/INSERT/UPDATE/DELETE
-- on its own ledgers row through the existing RLS policies.
--
-- How to apply (owner, after reading): Supabase dashboard > SQL editor > paste > Run. Then run supabase_rls_check.sql again; the result
-- must be unchanged. To undo: GRANT TRUNCATE, REFERENCES, TRIGGER ON <same tables> TO anon, authenticated;

BEGIN;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON
  public.ledgers, public.crash_reports, public.feedback_reports, public.notice_layouts,
  public.place_reports, public.screen_opens, public.usage_pings, public.active_days
FROM anon, authenticated;
COMMIT;

-- Separate owner action (dashboard, not SQL): Authentication > Settings > turn ON "leaked password protection"
-- (the Supabase advisor flags it as off; the app uses Google sign-in only, so it is low risk but free to enable).
