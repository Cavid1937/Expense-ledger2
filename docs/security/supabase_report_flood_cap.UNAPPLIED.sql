-- Expense Ledger: daily cap on the anonymous report tables (audit S3, 18 Nov 2026). NOT APPLIED. Owner approval required.
-- NEVER RUN: neither this SQL nor its test below has been executed anywhere. Syntax and behaviour are unverified. Run the rolled-back test
-- first (with approval) before applying.
--
-- Abuse scenario: the publishable key is in the app, and the 7 report tables accept INSERT from anon with "with check (true)". A script can
-- add rows without limit. Each row is small (length limits), but millions of rows would fill the free plan's 500 MB, and then saving
-- ledgers to accounts would fail as well. Today (18 Nov, read-only): 118 report rows in total, about 220 kB.
-- Mitigation: a BEFORE INSERT trigger refuses a row once that table already holds more than N rows created today (UTC).
-- Worst case after this: N rows per table per day. With the caps below, about 28,000 rows a day, about 5-10 MB a day. That is days to
-- weeks of a sustained attack before 500 MB, instead of minutes. The owner can check the size and react (section 5 of the audit).
-- Effect on real users: none until a cap is reached. When it is reached, that day's reports are refused. The app treats a refused send
-- as "not sent". It keeps nothing extra and does not retry in a loop. Ledgers are not touched.
-- Caps (rows per day): generous for today's use (largest day so far is well below 100 rows in any table).
--   usage_pings 3000, active_days 3000, screen_opens 10000, place_reports 5000, crash_reports 2000, notice_layouts 2000, feedback_reports 500.
-- Note: a cap is shared by everyone. An attacker who reaches it blocks real reports for the rest of that day (reports only; never ledgers).
-- Full isolation (moving report tables to a separate free project) remains the stronger option; see audit S3 option 3.

BEGIN;
CREATE OR REPLACE FUNCTION public.report_daily_cap() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n bigint; cap bigint := TG_ARGV[0]::bigint;
BEGIN
  EXECUTE format('SELECT count(*) FROM (SELECT 1 FROM public.%I WHERE created_at >= date_trunc(''day'', now() AT TIME ZONE ''utc'') AT TIME ZONE ''utc'' LIMIT %s) t', TG_TABLE_NAME, cap + 1) INTO n;
  IF n >= cap THEN RAISE EXCEPTION 'daily limit reached' USING ERRCODE = '54000'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.report_daily_cap() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS usage_pings_created_at ON public.usage_pings (created_at);
CREATE INDEX IF NOT EXISTS active_days_created_at ON public.active_days (created_at);
CREATE INDEX IF NOT EXISTS screen_opens_created_at ON public.screen_opens (created_at);
CREATE INDEX IF NOT EXISTS place_reports_created_at ON public.place_reports (created_at);
CREATE INDEX IF NOT EXISTS crash_reports_created_at ON public.crash_reports (created_at);
CREATE INDEX IF NOT EXISTS notice_layouts_created_at ON public.notice_layouts (created_at);
CREATE INDEX IF NOT EXISTS feedback_reports_created_at ON public.feedback_reports (created_at);

CREATE TRIGGER cap_usage_pings BEFORE INSERT ON public.usage_pings FOR EACH ROW EXECUTE FUNCTION public.report_daily_cap('3000');
CREATE TRIGGER cap_active_days BEFORE INSERT ON public.active_days FOR EACH ROW EXECUTE FUNCTION public.report_daily_cap('3000');
CREATE TRIGGER cap_screen_opens BEFORE INSERT ON public.screen_opens FOR EACH ROW EXECUTE FUNCTION public.report_daily_cap('10000');
CREATE TRIGGER cap_place_reports BEFORE INSERT ON public.place_reports FOR EACH ROW EXECUTE FUNCTION public.report_daily_cap('5000');
CREATE TRIGGER cap_crash_reports BEFORE INSERT ON public.crash_reports FOR EACH ROW EXECUTE FUNCTION public.report_daily_cap('2000');
CREATE TRIGGER cap_notice_layouts BEFORE INSERT ON public.notice_layouts FOR EACH ROW EXECUTE FUNCTION public.report_daily_cap('2000');
CREATE TRIGGER cap_feedback_reports BEFORE INSERT ON public.feedback_reports FOR EACH ROW EXECUTE FUNCTION public.report_daily_cap('500');
COMMIT;

-- Test BEFORE applying for real (runs everything, then rolls back; nothing stays). Expected: the message "TEST OK: 3 accepted, 4th refused".
-- DO $$ DECLARE ok int := 0; BEGIN
--   CREATE OR REPLACE FUNCTION public.report_daily_cap() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$
--   DECLARE n bigint; cap bigint := TG_ARGV[0]::bigint; BEGIN
--     EXECUTE format('SELECT count(*) FROM (SELECT 1 FROM public.%I WHERE created_at >= date_trunc(''day'', now() AT TIME ZONE ''utc'') AT TIME ZONE ''utc'' LIMIT %s) t', TG_TABLE_NAME, cap + 1) INTO n;
--     IF n >= cap THEN RAISE EXCEPTION 'daily limit reached' USING ERRCODE = '54000'; END IF; RETURN NEW; END $f$;
--   DELETE FROM public.crash_reports WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
--   CREATE TRIGGER cap_test BEFORE INSERT ON public.crash_reports FOR EACH ROW EXECUTE FUNCTION public.report_daily_cap('3');
--   SET LOCAL ROLE anon;
--   FOR i IN 1..3 LOOP INSERT INTO public.crash_reports(screen, message, lang, app_version) VALUES ('', 'cap test', 'en', 'test'); ok := ok + 1; END LOOP;
--   BEGIN INSERT INTO public.crash_reports(screen, message, lang, app_version) VALUES ('', 'cap test', 'en', 'test');
--         RAISE EXCEPTION 'TEST FAILED: 4th row accepted';
--   EXCEPTION WHEN SQLSTATE '54000' THEN RAISE EXCEPTION 'TEST OK: % accepted, 4th refused', ok; END;
-- END $$;
-- (crash_reports holds 0 rows today; the DELETE inside the test is rolled back with everything else.)

-- Rollback (removes the cap completely; data is untouched):
-- BEGIN;
-- DROP TRIGGER IF EXISTS cap_usage_pings ON public.usage_pings; DROP TRIGGER IF EXISTS cap_active_days ON public.active_days;
-- DROP TRIGGER IF EXISTS cap_screen_opens ON public.screen_opens; DROP TRIGGER IF EXISTS cap_place_reports ON public.place_reports;
-- DROP TRIGGER IF EXISTS cap_crash_reports ON public.crash_reports; DROP TRIGGER IF EXISTS cap_notice_layouts ON public.notice_layouts;
-- DROP TRIGGER IF EXISTS cap_feedback_reports ON public.feedback_reports; DROP FUNCTION IF EXISTS public.report_daily_cap();
-- DROP INDEX IF EXISTS public.usage_pings_created_at, public.active_days_created_at, public.screen_opens_created_at, public.place_reports_created_at,
--   public.crash_reports_created_at, public.notice_layouts_created_at, public.feedback_reports_created_at;
-- COMMIT;
