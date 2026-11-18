# Supabase production audit: read-only (Run 108, 18 Nov 2026)

The owner approved this read-only audit on 18 Nov. Nothing was changed in production. Every check was either a catalogue read or a test inside a
`DO` block that ends with `RAISE EXCEPTION`, so Postgres rolled back everything the test touched. No rows were written, no settings were changed
and no accounts were created.

Project: `qkztocsrxhubsljtsjpd` ("expense-ledger-learning", eu-central-1, Postgres 17). Organisation plan: **free**.

## 1. Actual configuration

| Item | Finding |
|---|---|
| Exposed tables (public) | `ledgers` (2 rows), plus seven add-only tables for opt-in reports: `active_days`, `usage_pings`, `screen_opens`, `place_reports`, `crash_reports`, `feedback_reports`, `notice_layouts` |
| RLS | ON for all 8 tables. Not FORCED; FORCE only matters for the table owner role, which the app never uses. |
| `ledgers` policies | `authenticated` only. SELECT, UPDATE, DELETE and INSERT each require `auth.uid() = user_id`; UPDATE checks both before and after. `anon` has no grant at all. |
| Report tables | `anon` may only INSERT, with `with check (true)`. `active_days` uses column-level INSERT on 5 columns, and its date must be within ±2 days of today. No SELECT, UPDATE or DELETE for `anon` or `authenticated`. Every text column has a length or value limit. |
| Table grants | `anon` / `authenticated` also hold TRUNCATE, REFERENCES and TRIGGER on these tables. The REST API can't use them. |
| Default privileges | For new objects created by `postgres` and `supabase_admin` in `public`: **ALL** on tables, sequences and functions for `anon` and `authenticated`. |
| Functions | `delete_my_account()`: SECURITY DEFINER, `search_path=''`, run by `authenticated` and `service_role` only. It deletes only the caller's own row and their auth user, and refuses when nobody is signed in. `ledgers_touch()`: a trigger function, SECURITY INVOKER, `search_path=''`. |
| Views / triggers | No views. One trigger (`ledgers_touch`, stamps `updated_at`). |
| Storage | No buckets, so no files are stored on the server. Receipt photos and backups stay on the phone or in Google Drive. |
| Edge functions | None. |
| Keys in the client | Only the publishable key (`sb_publishable_…`), in `account.js:10` and `App.jsx:4579`. Searching the code for `service_role`, `sb_secret_` and JWTs found none, which matches the full-history scan in Run 107 (F8). |
| Size | Database 11 MB of the free plan's 500 MB; `ledgers` 152 kB. `ledgers.data` is capped below 8 MB. |
| Advisors (security) | 1) `delete_my_account` is SECURITY DEFINER and signed-in users can run it. 2) Leaked-password protection is off. |

## 2. Tests run (production, rolled back)

| Test | Result |
|---|---|
| A made-up signed-in user (`sub` = 00000000-…-aa) reads `ledgers` | Of 2 rows, it sees **0** |
| The same user runs UPDATE on every ledgers row | **0** rows changed |
| A signed-in user reads `screen_opens` | refused, 42501 |
| `anon` reads `ledgers` | refused, 42501 |
| `anon` runs `delete_my_account()` | refused, 42501 |
| Run 107 two-user test (`supabase_rls_check.sql`) | Owner sees own row; moving a row to another user is refused; anon reads of all report tables are refused. That result is recorded in Run 107 and was not repeated here. |

## 3. Findings

**S1. New tables would be wide open by default (confirmed weakness, latent; priority HIGH before any new table is added).**
Evidence: `pg_default_acl` grants `arwdDxtm` (every table right) to `anon` and `authenticated` for new tables in `public`. Today all 8 tables have RLS, so
nothing is exposed now. But a table created later without `enable row level security` would be fully readable and writable by anyone holding the public
key. That key is published in the app.
Proposed fix: `supabase_default_privileges.UNAPPLIED.sql`. It applies only to objects created *after* it runs, and changes nothing for existing
users or data. Limit: defaults owned by `supabase_admin` can only be changed by Supabase, so the fix covers objects that the project's
`postgres` role creates. That is what the dashboard and SQL editor use.

**S2. Extra rights on existing tables (confirmed, low).** `anon`/`authenticated` have TRUNCATE, REFERENCES and TRIGGER on all 8 tables. TRUNCATE skips
RLS, but the REST API has no way to call it, so the only route would be a future SQL function. The fix is the existing
`supabase_grants_hygiene.UNAPPLIED.sql`; its effect on users is none.

**S3. The report tables can be flooded (likely risk, medium).** Anyone with the public key can add unlimited rows, because the policy is `with check (true)`
and there's no rate limit. The length limits keep each row small. But a flood could eventually fill the free plan's 500 MB, and **then saving
ledgers to the account would fail too**. Cheap mitigations:
1. Watch the database size now and then (a read-only query in §5).
2. A daily cap per table: a BEFORE INSERT trigger that refuses once today's row count passes, say, 5,000. That needs a SECURITY DEFINER count, so it's proposed only after the owner approves.
3. Move the report tables to a separate free project, so a flood can never touch `ledgers`.

Option 3 gives the strongest isolation. It needs a new project, which is free on the current plan, but that is still the owner's decision.

**S4. `delete_my_account` is SECURITY DEFINER (advisor warning; intended and acceptable).** It must delete from `auth.users`, which a normal user can't do.
It is safe because `search_path` is empty, it acts only on `auth.uid()`, it raises an error when nobody is signed in, and `anon` can't run it (verified). No change
is proposed. The advisor warning stays, accepted with this reason.

**S5. Leaked-password protection is off (BLOCKED, cost).** Supabase offers it only on the Pro plan and above; this organisation is on the free plan. Owner rule:
no upgrade without approval. Exposure is low while accounts use Google sign-in only. If e-mail and password sign-up is ever switched on, this
becomes HIGH, and the choice is Pro (about $25 a month) or a password check in the app (the HaveIBeenPwned range API, free, with no password ever
sent in full).

**S6. Screen-open counts exist (decision for the owner, not new).** `screen_opens` (77 rows) receives per-screen open counts, only while
"Help improve the app" is switched on. They hold no ids, no amounts and no names. They were added before the 18 Nov rule "no screen-by-screen tracking"; nothing
new was added in Run 108. **Owner decision:** keep them (opt-in, anonymous), or stop sending them and empty the table. Stopping them is a small
app change plus `truncate public.screen_opens`, a production data change that needs approval.

**S7. Very large ledgers can't be saved to the account (confirmed limit, low).** `ledgers.data` must stay under 8 MB, while a local file import may be up to
50 MB. A ledger larger than 8 MB fails to save with a conflict or error message; nothing local is lost. Most ledgers are far below this (the
largest now is about 150 kB).

## 4. Proposed SQL (NOT applied; each needs the owner's separate approval)

1. `docs/security/supabase_default_privileges.UNAPPLIED.sql` (S1)
2. `docs/security/supabase_grants_hygiene.UNAPPLIED.sql` (S2, from Run 107)

Expected effect on users of both: none. The app uses only SELECT, INSERT, UPDATE and DELETE through RLS, plus INSERT on report tables, and those all stay.
How to verify after applying: run `supabase_rls_check.sql` again (the result must be unchanged), then sign in on the site and in the APK, save,
and reopen.
Rollback: each file contains its exact reverse GRANT statements.

## 5. Read-only checks to repeat

```sql
select pg_size_pretty(pg_database_size(current_database()));
select defaclrole::regrole, defaclobjtype, defaclacl from pg_default_acl where defaclnamespace = 'public'::regnamespace;
select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public';
```

Status: Supabase configuration review **VERIFIED (read-only)**. S1 and S2 **NEEDS WORK** (SQL ready, awaiting approval). S3 **NEEDS WORK**
(owner choice). S5 **BLOCKED** (plan). S6 awaits an owner decision.
