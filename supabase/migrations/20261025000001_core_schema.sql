-- Mentora core schema: enums, tables, constraints, indexes.
create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;
grant usage on schema app to authenticated, anon, service_role;

-- ───────────────────────────── Enums ─────────────────────────────
create type public.user_role as enum ('MENTEE', 'MENTOR', 'HOD');
create type public.user_status as enum ('INVITED', 'ACTIVE', 'SUSPENDED');
create type public.semester_status as enum ('DRAFT', 'SUBMITTED', 'VERIFIED', 'FINALIZED');
create type public.subject_result as enum ('PASS', 'FAIL', 'PENDING', 'ABSENT');
create type public.rec_kind as enum ('RECOMMENDATION', 'FEEDBACK', 'GOAL', 'ACTION_POINT', 'STRENGTH', 'IMPROVEMENT_AREA');
create type public.rec_category as enum ('ACADEMIC_PROGRESS', 'ATTENDANCE', 'CAREER_GUIDANCE', 'PERSONAL_DEVELOPMENT');
create type public.rec_status as enum ('PENDING', 'IN_PROGRESS', 'COMPLETED');
create type public.rec_visibility as enum ('SHARED', 'PRIVATE_MENTOR');
create type public.session_mode as enum ('IN_PERSON', 'ONLINE');
create type public.session_status as enum ('SCHEDULED', 'COMPLETED', 'CANCELLED');
create type public.review_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public.ai_status as enum ('DRAFT', 'APPROVED', 'REJECTED');
create type public.import_status as enum ('PREVIEW', 'COMMITTED', 'FAILED');
create type public.followup_status as enum ('OPEN', 'RESOLVED');

-- ─────────────────────── Shared helpers ───────────────────────
create or replace function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─────────────────────── Institution structure ───────────────────────
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  code text not null unique check (code ~ '^[A-Z0-9]{2,12}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  name text not null check (length(name) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, name)
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (label ~ '^\d{4}-\d{2}$'),
  starts_on date not null,
  ends_on date not null check (ends_on > starts_on),
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index academic_years_one_current on public.academic_years (is_current) where is_current;

-- ───────────────────────────── Users & profiles ─────────────────────────────
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null unique,
  role public.user_role not null,
  status public.user_status not null default 'INVITED',
  department_id uuid references public.departments (id) on delete set null,
  onboarding_completed_at timestamptz,
  last_seen_at timestamptz,
  preferences jsonb not null default '{"email_notifications": true, "reminder_emails": true, "low_bandwidth": false}'::jsonb,
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_department_role_idx on public.users (department_id, role);
create index users_status_idx on public.users (status);

create table public.student_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  full_name text check (full_name is null or length(full_name) between 2 and 120),
  avatar_path text,
  dob date check (dob is null or dob between '1950-01-01' and current_date),
  gender text check (gender is null or gender in ('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY')),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  address text check (address is null or length(address) <= 400),
  usn text check (usn is null or usn ~ '^[A-Za-z0-9-]{4,20}$'),
  program text check (program is null or length(program) <= 80),
  current_semester smallint check (current_semester is null or current_semester between 1 and 12),
  section_id uuid references public.sections (id) on delete set null,
  admission_year smallint check (admission_year is null or admission_year between 1990 and 2100),
  expected_graduation_year smallint check (expected_graduation_year is null or expected_graduation_year between 1990 and 2110),
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  career_goals text check (career_goals is null or length(career_goals) <= 2000),
  achievements text check (achievements is null or length(achievements) <= 2000),
  support_areas text check (support_areas is null or length(support_areas) <= 2000),
  profile_completion smallint not null default 0 check (profile_completion between 0 and 100),
  draft jsonb not null default '{}'::jsonb,
  draft_step smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_graduation_year is null or admission_year is null or expected_graduation_year >= admission_year)
);
create unique index student_profiles_usn_key on public.student_profiles (lower(usn)) where usn is not null;
create index student_profiles_section_idx on public.student_profiles (section_id, current_semester);

create table public.mentor_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  full_name text check (full_name is null or length(full_name) between 2 and 120),
  avatar_path text,
  official_email citext,
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  designation text check (designation is null or length(designation) <= 80),
  faculty_id text check (faculty_id is null or faculty_id ~ '^[A-Za-z0-9-]{2,20}$'),
  expertise text[] not null default '{}',
  capacity smallint not null default 20 check (capacity between 1 and 200),
  draft jsonb not null default '{}'::jsonb,
  draft_step smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index mentor_profiles_faculty_id_key on public.mentor_profiles (lower(faculty_id)) where faculty_id is not null;

create table public.hod_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  full_name text check (full_name is null or length(full_name) between 2 and 120),
  avatar_path text,
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  designation text check (designation is null or length(designation) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── Assignments ─────────────────────────────
create table public.mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.users (id) on delete restrict,
  student_id uuid not null references public.users (id) on delete cascade,
  group_name text check (group_name is null or length(group_name) <= 60),
  assigned_by uuid references public.users (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  reason text check (reason is null or length(reason) <= 500),
  end_reason text check (end_reason is null or length(end_reason) <= 500),
  ended_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (mentor_id <> student_id),
  check (ended_at is null or ended_at >= started_at)
);
create unique index mentor_assignments_one_active on public.mentor_assignments (student_id) where ended_at is null;
create index mentor_assignments_mentor_active on public.mentor_assignments (mentor_id) where ended_at is null;
create index mentor_assignments_student_hist on public.mentor_assignments (student_id, started_at desc);

-- ───────────────────────────── Academics ─────────────────────────────
create table public.grading_schemes (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  name text not null,
  version integer not null default 1,
  bands jsonb not null check (jsonb_typeof(bands) = 'array' and jsonb_array_length(bands) > 0),
  pass_pct numeric(5,2) not null default 40 check (pass_pct between 0 and 100),
  mse_weight numeric(4,3) not null default 0.5 check (mse_weight between 0 and 1),
  see_weight numeric(4,3) not null default 0.5 check (see_weight between 0 and 1),
  sgpa_formula text not null default 'CREDIT_WEIGHTED' check (sgpa_formula in ('CREDIT_WEIGHTED')),
  max_grade_points numeric(4,2) not null default 10,
  active boolean not null default false,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (round(mse_weight + see_weight, 3) = 1),
  unique (department_id, version)
);
create unique index grading_schemes_one_active on public.grading_schemes (department_id) where active;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9-]{2,16}$'),
  name text not null check (length(name) between 2 and 140),
  credits numeric(4,1) not null check (credits between 0 and 30),
  semester smallint check (semester is null or semester between 1 and 12),
  has_mse boolean not null default true,
  has_see boolean not null default true,
  mse_max numeric(6,2) check (mse_max is null or mse_max > 0),
  see_max numeric(6,2) check (see_max is null or see_max > 0),
  ia_components jsonb not null default '[]'::jsonb check (jsonb_typeof(ia_components) = 'array'),
  is_verified boolean not null default false,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subjects add constraint subjects_dept_code_key unique (department_id, code);
create index subjects_semester_idx on public.subjects (department_id, semester);

create table public.academic_semesters (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  semester_no smallint not null check (semester_no between 1 and 12),
  academic_year text not null check (academic_year ~ '^\d{4}-\d{2}$'),
  status public.semester_status not null default 'DRAFT',
  manual_sgpa numeric(4,2) check (manual_sgpa is null or manual_sgpa between 0 and 10),
  manual_cgpa numeric(4,2) check (manual_cgpa is null or manual_cgpa between 0 and 10),
  submitted_at timestamptz,
  verified_by uuid references public.users (id) on delete set null,
  verified_at timestamptz,
  finalized_by uuid references public.users (id) on delete set null,
  finalized_at timestamptz,
  return_note text check (return_note is null or length(return_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, semester_no)
);
create index academic_semesters_status_idx on public.academic_semesters (status);

create table public.student_subject_results (
  id uuid primary key default gen_random_uuid(),
  academic_semester_id uuid not null references public.academic_semesters (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  attempt smallint not null default 1 check (attempt between 1 and 10),
  credits numeric(4,1) not null check (credits between 0 and 30),
  mse_marks numeric(6,2),
  mse_max numeric(6,2) check (mse_max is null or mse_max > 0),
  see_marks numeric(6,2),
  see_max numeric(6,2) check (see_max is null or see_max > 0),
  ia jsonb not null default '[]'::jsonb check (jsonb_typeof(ia) = 'array'),
  grade text check (grade is null or length(grade) <= 4),
  grade_points numeric(4,2) check (grade_points is null or grade_points between 0 and 10),
  result public.subject_result not null default 'PENDING',
  credits_earned numeric(4,1) check (credits_earned is null or credits_earned between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mse_marks is null or (mse_marks >= 0 and (mse_max is null or mse_marks <= mse_max))),
  check (see_marks is null or (see_marks >= 0 and (see_max is null or see_marks <= see_max))),
  check (credits_earned is null or credits_earned <= credits),
  unique (academic_semester_id, subject_id, attempt)
);
create index student_subject_results_subject_idx on public.student_subject_results (subject_id);

create table public.semester_summaries (
  academic_semester_id uuid primary key references public.academic_semesters (id) on delete cascade,
  sgpa numeric(4,2) check (sgpa is null or sgpa between 0 and 10),
  cgpa_snapshot numeric(4,2) check (cgpa_snapshot is null or cgpa_snapshot between 0 and 10),
  credits_registered numeric(5,1) not null default 0,
  credits_earned numeric(5,1) not null default 0,
  computed boolean not null default false,
  computation_note text,
  grading_scheme_id uuid references public.grading_schemes (id) on delete set null,
  computed_at timestamptz not null default now()
);

create table public.record_change_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  academic_semester_id uuid not null references public.academic_semesters (id) on delete cascade,
  target_table text not null check (target_table in ('student_subject_results', 'academic_semesters')),
  target_id uuid not null,
  current_values jsonb not null default '{}'::jsonb,
  proposed jsonb not null check (jsonb_typeof(proposed) = 'object'),
  reason text not null check (length(reason) between 5 and 1000),
  status public.review_status not null default 'PENDING',
  created_by uuid not null references public.users (id) on delete cascade,
  reviewer_id uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or length(review_note) <= 1000),
  created_at timestamptz not null default now()
);
create index record_change_requests_student_idx on public.record_change_requests (student_id, status);

-- ───────────────────────────── Mentoring ─────────────────────────────
create table public.mentor_recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete restrict,
  kind public.rec_kind not null,
  category public.rec_category not null default 'ACADEMIC_PROGRESS',
  title text not null check (length(title) between 2 and 160),
  body text not null default '' check (length(body) <= 8000),
  subject_id uuid references public.subjects (id) on delete set null,
  status public.rec_status not null default 'PENDING',
  due_date date,
  review_date date,
  visibility public.rec_visibility not null default 'SHARED',
  include_in_report boolean not null default false,
  parent_id uuid references public.mentor_recommendations (id) on delete cascade,
  target_metric text check (target_metric is null or length(target_metric) <= 200),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  reflection text check (reflection is null or length(reflection) <= 2000),
  completion_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (visibility = 'PRIVATE_MENTOR' and include_in_report))
);
create index mentor_recommendations_student_idx on public.mentor_recommendations (student_id, created_at desc);
create index mentor_recommendations_mentor_status_idx on public.mentor_recommendations (mentor_id, status);
create index mentor_recommendations_parent_idx on public.mentor_recommendations (parent_id);

create table public.recommendation_status_history (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.mentor_recommendations (id) on delete cascade,
  from_status public.rec_status,
  to_status public.rec_status not null,
  changed_by uuid references public.users (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index recommendation_status_history_rec_idx on public.recommendation_status_history (recommendation_id, changed_at);

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.users (id) on delete restrict,
  student_id uuid references public.users (id) on delete cascade,
  title text not null check (length(title) between 2 and 160),
  instructions text not null default '' check (length(instructions) <= 4000),
  file_path text,
  file_name text,
  mime text,
  size_bytes bigint check (size_bytes is null or size_bytes between 1 and 26214400),
  external_url text check (external_url is null or external_url ~ '^https?://'),
  subject_id uuid references public.subjects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (file_path is not null or external_url is not null)
);
create index learning_resources_mentor_idx on public.learning_resources (mentor_id, created_at desc);
create index learning_resources_student_idx on public.learning_resources (student_id, created_at desc);

create table public.mentoring_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.users (id) on delete restrict,
  student_id uuid references public.users (id) on delete cascade,
  group_name text check (group_name is null or length(group_name) <= 60),
  scheduled_at timestamptz not null,
  duration_min smallint not null default 30 check (duration_min between 5 and 480),
  mode public.session_mode not null default 'IN_PERSON',
  location_or_link text check (location_or_link is null or length(location_or_link) <= 300),
  agenda text not null default '' check (length(agenda) <= 4000),
  summary text check (summary is null or length(summary) <= 8000),
  action_items jsonb not null default '[]'::jsonb check (jsonb_typeof(action_items) = 'array'),
  next_follow_up_date date,
  status public.session_status not null default 'SCHEDULED',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mentoring_sessions_mentor_idx on public.mentoring_sessions (mentor_id, scheduled_at);
create index mentoring_sessions_student_idx on public.mentoring_sessions (student_id, scheduled_at);

create table public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  generated_text text not null,
  edited_text text,
  status public.ai_status not null default 'DRAFT',
  model text not null,
  created_by uuid references public.users (id) on delete set null,
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index ai_summaries_student_idx on public.ai_summaries (student_id, created_at desc);

create table public.intervention_followups (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete cascade,
  requested_by uuid not null references public.users (id) on delete cascade,
  note text not null check (length(note) between 2 and 1000),
  status public.followup_status not null default 'OPEN',
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index intervention_followups_mentor_idx on public.intervention_followups (mentor_id, status);

-- ─────────────────────── Notifications, views, audit ───────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.content_views (
  user_id uuid not null references public.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('recommendation', 'resource', 'session', 'ai_summary')),
  entity_id uuid not null,
  viewed_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ─────────────────────── Settings & admin ───────────────────────
create table public.risk_thresholds (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  rule_key text not null check (rule_key in ('STRONG_PCT', 'DECLINE_PCT_POINTS', 'SGPA_DROP', 'LOW_PCT', 'LOW_MIN_COUNT', 'PROFILE_INCOMPLETE_DAYS')),
  value numeric not null,
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (department_id, rule_key)
);

create table public.app_settings (
  key text primary key check (key ~ '^[a-z_]{2,60}$'),
  value jsonb not null,
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('students', 'mentors', 'subjects', 'results')),
  file_name text not null,
  status public.import_status not null default 'PREVIEW',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  options jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  committed_at timestamptz,
  created_at timestamptz not null default now()
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['departments','sections','academic_years','users','student_profiles','mentor_profiles','hod_profiles',
    'subjects','academic_semesters','student_subject_results','mentor_recommendations','learning_resources','mentoring_sessions']
  loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function app.touch_updated_at()', t);
  end loop;
end $$;
