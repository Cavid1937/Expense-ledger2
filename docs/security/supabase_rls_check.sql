-- Expense Ledger: two-user Row Level Security check for public.ledgers (Run 107, 18 Nov 2026).
-- Safe to run on any copy of the database: every block ends with RAISE EXCEPTION, so Postgres rolls the whole block back
-- and nothing is ever saved. The result is printed in the error message ("RLSTEST ...").
-- Run in the Supabase SQL editor as the postgres role. Two invented user ids are used; no real user or row is read or changed.
--
-- Note: this file is a cleaned-up copy of the two blocks run on 17 Nov; this exact text has not itself been run. If auth.users needs more
-- columns on a newer Supabase version, add them to the first INSERT; the checks themselves do not change.
-- Result on production, 17 Nov 2026 (project qkztocsrxhubsljtsjpd):
--   RLSTEST total=2 other_user_sees=0 other_user_updates=0 other_user_deletes=0 insert_as_someone_else=42501 ... anon_select=42501 anon_insert=42501
--   RLSTEST2 owner_sees_own=1 owner_moves_row_to_other_user=42501 anon_reads: crash_reports=42501 feedback_reports=42501 notice_layouts=42501
--            place_reports=42501 screen_opens=42501 usage_pings=42501 active_days=42501
-- 42501 = "permission denied / row-level security violation" = the expected refusal.

DO $$
DECLARE a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); n int; seen int; upd int; del int; ins text := 'allowed'; asel text := 'allowed'; ains text := 'allowed';
BEGIN
  INSERT INTO auth.users (id, aud, role, email) VALUES (a, 'authenticated', 'authenticated', 'rls-a@example.invalid'), (b, 'authenticated', 'authenticated', 'rls-b@example.invalid');
  INSERT INTO public.ledgers (user_id, data) VALUES (a, '{"transactions":[]}'::jsonb), (b, '{"transactions":[]}'::jsonb);
  SELECT count(*) INTO n FROM public.ledgers WHERE user_id IN (a, b);

  -- act as user A
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO seen FROM public.ledgers WHERE user_id = b;
  UPDATE public.ledgers SET data = '{"x":1}'::jsonb WHERE user_id = b; GET DIAGNOSTICS upd = ROW_COUNT;
  DELETE FROM public.ledgers WHERE user_id = b; GET DIAGNOSTICS del = ROW_COUNT;
  BEGIN INSERT INTO public.ledgers (user_id, data) VALUES (b, '{}'::jsonb); EXCEPTION WHEN others THEN ins := SQLSTATE || ' ' || SQLERRM; END;
  RESET ROLE;

  -- act as a visitor with only the public key
  SET LOCAL ROLE anon;
  BEGIN PERFORM 1 FROM public.ledgers LIMIT 1; EXCEPTION WHEN others THEN asel := SQLSTATE; END;
  BEGIN INSERT INTO public.ledgers (user_id, data) VALUES (a, '{}'::jsonb); EXCEPTION WHEN others THEN ains := SQLSTATE; END;
  RESET ROLE;

  RAISE EXCEPTION 'RLSTEST total=% other_user_sees=% other_user_updates=% other_user_deletes=% insert_as_someone_else=% anon_select=% anon_insert=%', n, seen, upd, del, ins, asel, ains;
END $$;

-- Expected: other_user_sees=0, other_user_updates=0, other_user_deletes=0, every other field 42501. Anything else is a P0 finding.
