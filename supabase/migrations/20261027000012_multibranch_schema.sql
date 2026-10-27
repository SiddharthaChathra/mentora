-- Multi-branch S1b + S2: branches, HOD appointments, branch transfers, scoping columns and backfill.
-- "Branch" in the UI = a row in public.departments. Existing single-department data stays in the first
-- department (the seed matches it to EXISTING_DATA_BRANCH_CODE).

-- ───────────────────────────── Branches ─────────────────────────────
create type public.branch_status as enum ('ACTIVE', 'ARCHIVED');

alter table public.departments
  add column usn_code text check (usn_code is null or usn_code ~ '^[a-z]{2,3}$'),
  add column display_order smallint not null default 0,
  add column status public.branch_status not null default 'ACTIVE',
  add column created_by uuid references public.users (id) on delete set null;
create unique index departments_usn_code_key on public.departments (usn_code) where usn_code is not null;

-- ───────────────────────────── HOD appointments ─────────────────────────────
create table public.department_heads (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  appointed_by uuid references public.users (id) on delete set null,
  ended_by uuid references public.users (id) on delete set null,
  reason text check (reason is null or length(reason) <= 500),
  end_reason text check (end_reason is null or length(end_reason) <= 500),
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create unique index department_heads_one_per_branch on public.department_heads (department_id) where ended_at is null;
create unique index department_heads_one_per_user on public.department_heads (user_id) where ended_at is null;
create index department_heads_history on public.department_heads (department_id, started_at desc);

-- ───────────────────────────── Branch transfers ─────────────────────────────
create table public.student_branch_transfers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  from_department_id uuid not null references public.departments (id) on delete cascade,
  to_department_id uuid not null references public.departments (id) on delete cascade,
  requested_by uuid references public.users (id) on delete set null,
  reason text not null check (length(reason) between 3 and 1000),
  status public.review_status not null default 'PENDING',
  decided_by uuid references public.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (decision_note is null or length(decision_note) <= 1000),
  created_at timestamptz not null default now(),
  check (from_department_id <> to_department_id)
);
create unique index student_branch_transfers_one_pending on public.student_branch_transfers (student_id) where status = 'PENDING';
create index student_branch_transfers_status_idx on public.student_branch_transfers (status, created_at desc);
create index student_branch_transfers_from_idx on public.student_branch_transfers (from_department_id, created_at desc);
create index student_branch_transfers_to_idx on public.student_branch_transfers (to_department_id, created_at desc);

-- ───────────────────────────── Users: every non-Principal belongs to one branch ─────────────────────────────
update public.users set department_id = (select id from public.departments order by created_at limit 1)
 where department_id is null;
alter table public.users drop constraint users_department_id_fkey;
alter table public.users add constraint users_department_id_fkey
  foreign key (department_id) references public.departments (id) on delete restrict;
alter table public.users add constraint users_branch_by_role check ((role = 'PRINCIPAL') = (department_id is null));
create index users_principal_idx on public.users (role) where role = 'PRINCIPAL';

-- Existing HODs become the appointed head of their branch (one per branch; extra HODs keep the role without access).
insert into public.department_heads (department_id, user_id, started_at, reason)
select distinct on (department_id) department_id, id, created_at, 'Existing HOD at multi-branch migration'
  from public.users where role = 'HOD' and status <> 'SUSPENDED'
 order by department_id, (status = 'ACTIVE') desc, created_at;

-- ───────────────────────────── Scoping columns (filled by trigger, never by the client) ─────────────────────────────
alter table public.academic_semesters add column department_id uuid references public.departments (id);
alter table public.mentor_assignments add column department_id uuid references public.departments (id);
alter table public.mentor_recommendations add column department_id uuid references public.departments (id);
alter table public.record_change_requests add column department_id uuid references public.departments (id);
alter table public.intervention_followups add column department_id uuid references public.departments (id);
alter table public.mentoring_sessions add column department_id uuid references public.departments (id);
alter table public.learning_resources add column department_id uuid references public.departments (id);
alter table public.notifications add column department_id uuid references public.departments (id);
alter table public.import_jobs add column department_id uuid references public.departments (id);
alter table public.audit_logs add column department_id uuid references public.departments (id);

create or replace function app.fill_department() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v jsonb := to_jsonb(new);
begin
  if tg_table_name in ('academic_semesters', 'mentor_assignments', 'mentor_recommendations', 'record_change_requests', 'intervention_followups') then
    new.department_id := app.user_department((v ->> 'student_id')::uuid);
  elsif tg_table_name in ('mentoring_sessions', 'learning_resources') then
    new.department_id := coalesce(app.user_department((v ->> 'student_id')::uuid), app.user_department((v ->> 'mentor_id')::uuid));
  elsif tg_table_name = 'notifications' then
    new.department_id := app.user_department((v ->> 'user_id')::uuid);
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['academic_semesters','mentor_assignments','mentor_recommendations','record_change_requests',
    'intervention_followups','mentoring_sessions','learning_resources','notifications']
  loop
    execute format('create trigger fill_department before insert or update on public.%I for each row execute function app.fill_department()', t);
  end loop;
end $$;

-- Audit rows are scoped to the branch of the record they describe (falling back to the actor's branch).
create or replace function app.fill_audit_department() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := coalesce(new.after, new.before, '{}'::jsonb);
begin
  if new.department_id is not null then return new; end if;
  new.department_id := coalesce(
    app.safe_uuid(r ->> 'department_id'),
    app.safe_uuid(r ->> 'from_department_id'),
    case when new.entity_type = 'departments' then app.safe_uuid(new.entity_id) end,
    case when new.entity_type = 'users' then app.user_department(app.safe_uuid(new.entity_id)) end,
    app.user_department(app.safe_uuid(r ->> 'student_id')),
    app.user_department(app.safe_uuid(r ->> 'user_id')),
    app.user_department(app.semester_student(app.safe_uuid(r ->> 'academic_semester_id'))),
    app.user_department(new.actor_id)
  );
  return new;
end $$;
create trigger fill_audit_department before insert on public.audit_logs
  for each row execute function app.fill_audit_department();

-- Backfill without firing audit / workflow triggers.
set session_replication_role = replica;
update public.academic_semesters x set department_id = u.department_id from public.users u where u.id = x.student_id;
update public.mentor_assignments x set department_id = u.department_id from public.users u where u.id = x.student_id;
update public.mentor_recommendations x set department_id = u.department_id from public.users u where u.id = x.student_id;
update public.record_change_requests x set department_id = u.department_id from public.users u where u.id = x.student_id;
update public.intervention_followups x set department_id = u.department_id from public.users u where u.id = x.student_id;
update public.mentoring_sessions x set department_id = u.department_id from public.users u where u.id = coalesce(x.student_id, x.mentor_id);
update public.learning_resources x set department_id = u.department_id from public.users u where u.id = coalesce(x.student_id, x.mentor_id);
update public.notifications x set department_id = u.department_id from public.users u where u.id = x.user_id;
update public.import_jobs x set department_id = u.department_id from public.users u where u.id = x.created_by;
update public.audit_logs l set department_id = coalesce(
    app.safe_uuid(coalesce(l.after, l.before) ->> 'department_id'),
    case when l.entity_type = 'users' then app.user_department(app.safe_uuid(l.entity_id)) end,
    app.user_department(app.safe_uuid(coalesce(l.after, l.before) ->> 'student_id')),
    app.user_department(app.safe_uuid(coalesce(l.after, l.before) ->> 'user_id')),
    app.user_department(app.semester_student(app.safe_uuid(coalesce(l.after, l.before) ->> 'academic_semester_id'))),
    app.user_department(l.actor_id));
set session_replication_role = origin;

-- Callers never send department_id: the default marks it optional, the BEFORE trigger sets the real value.
create or replace function app.department_from_trigger() returns uuid language sql immutable set search_path = '' as $$ select null::uuid $$;
do $$
declare t text;
begin
  foreach t in array array['academic_semesters','mentor_assignments','mentor_recommendations','record_change_requests',
    'intervention_followups','mentoring_sessions','learning_resources']
  loop
    execute format('alter table public.%I alter column department_id set default app.department_from_trigger()', t);
  end loop;
end $$;

alter table public.academic_semesters alter column department_id set not null;
alter table public.mentor_assignments alter column department_id set not null;
alter table public.mentor_recommendations alter column department_id set not null;
alter table public.record_change_requests alter column department_id set not null;
alter table public.intervention_followups alter column department_id set not null;
alter table public.mentoring_sessions alter column department_id set not null;
alter table public.learning_resources alter column department_id set not null;

create index academic_semesters_dept_idx on public.academic_semesters (department_id, created_at);
create index mentor_assignments_dept_active on public.mentor_assignments (department_id) where ended_at is null;
create index mentor_assignments_dept_idx on public.mentor_assignments (department_id, created_at);
create index mentor_recommendations_dept_idx on public.mentor_recommendations (department_id, created_at);
create index record_change_requests_dept_idx on public.record_change_requests (department_id, created_at);
create index intervention_followups_dept_idx on public.intervention_followups (department_id, created_at);
create index mentoring_sessions_dept_idx on public.mentoring_sessions (department_id, created_at);
create index learning_resources_dept_idx on public.learning_resources (department_id, created_at);
create index notifications_dept_idx on public.notifications (department_id, created_at);
create index import_jobs_dept_idx on public.import_jobs (department_id, created_at);
create index audit_logs_dept_idx on public.audit_logs (department_id, created_at desc);
create index student_profiles_semester_idx on public.student_profiles (current_semester, section_id);

-- ───────────────────────────── Grading + risk thresholds: college default (NULL) + optional branch override ─────────────────────────────
alter table public.grading_schemes alter column department_id drop not null;
alter table public.grading_schemes drop constraint grading_schemes_department_id_version_key;
alter table public.grading_schemes add constraint grading_schemes_department_id_version_key unique nulls not distinct (department_id, version);
drop index public.grading_schemes_one_active;
create unique index grading_schemes_one_active on public.grading_schemes (department_id) nulls not distinct where active;

alter table public.risk_thresholds alter column department_id drop not null;
alter table public.risk_thresholds drop constraint risk_thresholds_department_id_rule_key_key;
alter table public.risk_thresholds add constraint risk_thresholds_department_id_rule_key_key unique nulls not distinct (department_id, rule_key);

-- The existing department's scheme and thresholds become the college default.
set session_replication_role = replica;
update public.grading_schemes set department_id = null where department_id = (select id from public.departments order by created_at limit 1);
update public.risk_thresholds set department_id = null where department_id = (select id from public.departments order by created_at limit 1);
set session_replication_role = origin;

insert into public.app_settings (key, value) values
  ('allow_branch_grading', 'false'::jsonb),
  ('student_email_domain', '""'::jsonb)
on conflict (key) do nothing;

-- audit the new structure tables
do $$
declare t text;
begin
  foreach t in array array['departments','department_heads','student_branch_transfers'] loop
    execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function app.audit_row()', t);
  end loop;
end $$;
