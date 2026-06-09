create extension if not exists "pgcrypto";

create table if not exists public.app_users (
	id uuid primary key default gen_random_uuid(),
	full_name text not null,
	email text not null unique,
	password_hash text not null,
	role text not null check (role in ('ceo', 'head', 'manager', 'hr', 'employee')),
	access_level text not null default 'employee',
	employee_id uuid null,
	department text null,
	position text null,
	reports_to_user_id uuid null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.app_users
	add column if not exists access_level text not null default 'employee',
	add column if not exists department text null,
	add column if not exists position text null,
	add column if not exists reports_to_user_id uuid null;

update public.app_users
set access_level = case
	when role = 'hr' then 'hr'
	when role = 'ceo' then 'admin'
	else 'employee'
end
where access_level is null or trim(access_level) = '';

alter table public.app_users
	drop constraint if exists app_users_access_level_check;

alter table public.app_users
	add constraint app_users_access_level_check
	check (trim(lower(access_level)) in ('employee', 'hr', 'admin'));

update public.app_users
set
	department = nullif(trim(lower(department)), ''),
	position = nullif(trim(lower(position)), '');

alter table public.app_users
	drop constraint if exists app_users_department_check;

alter table public.app_users
	add constraint app_users_department_check
	check (department is null or trim(lower(department)) in ('dev', 'marketing', 'backoffice'));

alter table public.app_users
	drop constraint if exists app_users_position_check;

alter table public.app_users
	add constraint app_users_position_check
	check (
		position is null or trim(lower(position)) in (
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
	);

do $$
begin
	if not exists (
		select 1
		from pg_catalog.pg_constraint
		where conname = 'app_users_reports_to_user_id_fkey'
	) then
		alter table public.app_users
			add constraint app_users_reports_to_user_id_fkey
			foreign key (reports_to_user_id)
			references public.app_users(id)
			on delete set null;
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_catalog.pg_constraint
		where conname = 'app_users_email_company_check'
	) then
		alter table public.app_users
			add constraint app_users_email_company_check
			check (
				lower(email) like '%@dbinvesting'
				or lower(email) like '%@dbinvesting.com'
			)
			not valid;
	end if;
end $$;

do $$
begin
	if exists (
		select 1
		from pg_catalog.pg_constraint
		where conname = 'app_users_email_company_check'
		and convalidated = false
	) and not exists (
		select 1
		from public.app_users
		where not (
			lower(email) like '%@dbinvesting'
			or lower(email) like '%@dbinvesting.com'
		)
	) then
		alter table public.app_users
			validate constraint app_users_email_company_check;
	end if;
end $$;

do $$
begin
	if exists (
		select 1
		from pg_catalog.pg_class c
		join pg_catalog.pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'public' and c.relname = 'employees' and c.relkind = 'r'
	) then
		if not exists (
			select 1
			from pg_catalog.pg_constraint
			where conname = 'app_users_employee_id_fkey'
		) then
			alter table public.app_users
				add constraint app_users_employee_id_fkey
				foreign key (employee_id)
				references public.employees(id)
				on delete set null;
		end if;
	end if;
end $$;

do $$
begin
	if exists (
		select 1
		from pg_catalog.pg_class c
		join pg_catalog.pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'public' and c.relname = 'employees' and c.relkind = 'r'
	) then
		alter table public.employees
			add column if not exists reports_to_employee_id uuid null;

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

		create index if not exists idx_employees_reports_to_employee_id
			on public.employees(reports_to_employee_id);
	end if;
end $$;

create unique index if not exists idx_app_users_employee_id_unique
	on public.app_users(employee_id)
	where employee_id is not null;

create table if not exists public.auth_refresh_tokens (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.app_users(id) on delete cascade,
	token_hash text not null unique,
	expires_at timestamptz not null,
	revoked_at timestamptz null,
	created_at timestamptz not null default now()
);

create index if not exists idx_auth_refresh_tokens_user_id
	on public.auth_refresh_tokens(user_id);

create index if not exists idx_auth_refresh_tokens_expires_at
	on public.auth_refresh_tokens(expires_at);
