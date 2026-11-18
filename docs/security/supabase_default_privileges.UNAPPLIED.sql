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

-- Rollback (restores today's defaults exactly):
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
