-- Expense Ledger: deny-by-default for NEW database objects (Run 108, 18 Nov 2026). NOT APPLIED. Owner approval required.
--
-- Why (audit S1, SUPABASE_AUDIT_2026-11-18.md): any table, sequence or function created later in schema public automatically gives
-- anon and authenticated every right. A table forgotten without row level security would be open to anyone holding the public key.
-- Effect on today's users and data: none. Existing tables keep their grants and RLS. Only objects created after this runs
-- start with no rights for anon / authenticated, so each new table must get an explicit GRANT (and RLS), as least privilege requires.
-- Limit: defaults owned by supabase_admin can only be changed by Supabase; this covers objects the project's postgres role creates
-- (the dashboard and SQL editor).
--
-- Apply: Supabase dashboard > SQL editor > paste > Run. Check: the third query in the audit's section 5 shows postgres rows without anon/authenticated.

BEGIN;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
COMMIT;

-- Test (run BEFORE and AFTER applying; it creates a probe table and rolls everything back, nothing stays):
-- DO $$ BEGIN
--   CREATE TABLE public._s1_probe (x int);
--   RAISE EXCEPTION 'anon select=%, anon insert=%, authenticated delete=%',
--     has_table_privilege('anon', 'public._s1_probe', 'SELECT'), has_table_privilege('anon', 'public._s1_probe', 'INSERT'),
--     has_table_privilege('authenticated', 'public._s1_probe', 'DELETE');
-- END $$;
-- Before: "anon select=t, anon insert=t, authenticated delete=t" (the weakness). After: all three "f".
-- Existing tables are not affected: run supabase_rls_check.sql before and after; its result must be identical.

-- Rollback (restores today's defaults exactly):
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
