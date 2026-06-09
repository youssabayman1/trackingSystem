create extension if not exists "pgcrypto";

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  department text not null check (department in ('dev', 'marketing', 'backoffice')),
  position text not null check (
    position in (
      'ceo',
      'head',
      'head_of_full_stack',
      'head_of_hr',
      'head_of_backoffice',
      'manager',
      'hr',
      'full_stack_developer',
      'front_end_developer',
      'vibe_coder',
      'ui_designer',
      'ux_designer',
      'video_creator',
      'graphic_designer',
      'backoffice_specialist'
    )
  ),
  reports_to_employee_id uuid null,
  constraint employees_reports_to_employee_id_fkey
    foreign key (reports_to_employee_id)
    references public.employees(id)
    on delete set null,
  created_at timestamptz not null default now()
);

alter table public.employees
  add column if not exists reports_to_employee_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'employees_reports_to_employee_id_fkey'
  ) then
    alter table public.employees
      add constraint employees_reports_to_employee_id_fkey
      foreign key (reports_to_employee_id)
      references public.employees(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.leave_balances (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  remaining_days integer not null default 21,
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_date date not null default current_date,
  check_in_at timestamptz not null,
  check_out_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_vacations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  leave_type text not null default 'vacation' check (leave_type in ('vacation', 'sickleave')),
  status text not null default 'pending' check (status in ('approved', 'pending', 'rejected')),
  notes text null,
  created_at timestamptz not null default now(),
  constraint employee_vacations_date_check check (end_date >= start_date)
);

alter table public.employee_vacations
  add column if not exists leave_type text not null default 'vacation' check (leave_type in ('vacation', 'sickleave'));


create index if not exists idx_attendance_employee_date
  on public.attendance_records(employee_id, attendance_date);

create index if not exists idx_attendance_date
  on public.attendance_records(attendance_date);

create index if not exists idx_employee_vacations_employee
  on public.employee_vacations(employee_id);

create index if not exists idx_employee_vacations_dates
  on public.employee_vacations(start_date, end_date);

create index if not exists idx_employees_reports_to_employee_id
  on public.employees(reports_to_employee_id);

insert into public.employees (full_name, department, position)
values
  ('Youssef CEO', 'dev', 'ceo'),
  ('Mona HR', 'backoffice', 'hr'),
  ('Ali Full Stack', 'dev', 'full_stack_developer'),
  ('Laila Front End', 'dev', 'front_end_developer'),
  ('Nour Vibe Coder', 'dev', 'vibe_coder'),
  ('Sara UI', 'marketing', 'ui_designer'),
  ('Kareem UX', 'marketing', 'ux_designer'),
  ('Hany Video', 'marketing', 'video_creator'),
  ('Dina Graphic', 'marketing', 'graphic_designer'),
  ('Omar Backoffice', 'backoffice', 'backoffice_specialist')
on conflict do nothing;

insert into public.leave_balances (employee_id, remaining_days)
select id, 21
from public.employees
on conflict (employee_id) do nothing;

-- Store periodic user-reported locations from browsers (consented)
create table if not exists public.employee_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  employee_id uuid null references public.employees(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision null,
  city text null,
  country text null,
  ip inet null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_locations_user_id on public.employee_locations(user_id);
create index if not exists idx_employee_locations_employee_id on public.employee_locations(employee_id);
create index if not exists idx_employee_locations_created_at on public.employee_locations(created_at);
