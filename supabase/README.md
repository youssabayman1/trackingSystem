# Supabase schema and usage

This folder contains the SQL schema used by the app (`schema.sql`) and seeds.

Quick overview

- `public.employees` — employee records (id, full_name, department, position, reports_to_employee_id).
- `public.leave_balances` — per-employee remaining days (default 21).
- `public.attendance_records` — check-in / check-out records with timestamps.
- `public.employee_vacations` — vacation/sickleave requests (start/end, type, status).
- `public.employee_locations` — optional browser-reported locations (latitude, longitude, city, country, ip, user_agent).

Notes

- The schema requires the `pgcrypto` extension for `gen_random_uuid()`.
- `employee_locations.user_id` references `public.app_users` — ensure your auth/users table exists.
- `employee_vacations` enforces `end_date >= start_date` and currently uses whole-day dates; if you add partial-day support, add a `duration_hours` numeric column and update API logic.

Applying the schema

Use `psql` or the Supabase SQL editor. Example with `psql`:

```bash
psql "postgres://<user>:<pass>@<host>:5432/<db>" -f supabase/schema.sql
```

Seeding

The `schema.sql` includes some `INSERT ... ON CONFLICT DO NOTHING` seeds for employees and leave balances.

Migrations

If using Supabase migrations, convert `schema.sql` into migration files and apply via the Supabase CLI.

Contact

If you need changes (e.g., add `duration_hours` for partial-day leave or change location columns), open an issue or ping the repo maintainer.
