-- Multi-branch S3b: role/status/import RPCs re-scoped, HOD appointments, branch transfers, USN-based self sign-up.

create or replace function app.notify_principals(p_type text, p_title text, p_body text, p_link text, p_entity_type text default null, p_entity_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  for v in select id from public.users where role = 'PRINCIPAL' and status = 'ACTIVE' loop
    perform app.notify(v, p_type, p_title, p_body, p_link, p_entity_type, p_entity_id);
  end loop;
end $$;

create or replace function app.branch_head(p_department uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select user_id from public.department_heads where department_id = p_department and ended_at is null
$$;

create or replace function app.branch_name(p_department uuid) returns text
language sql stable security definer set search_path = '' as $$
  select code from public.departments where id = p_department
$$;
revoke execute on function app.notify_principals(text, text, text, text, text, uuid) from public, authenticated, anon;

-- ───────────────────────────── Roles & status ─────────────────────────────
-- HOD: MENTEE <-> MENTOR inside their branch. Principal: same, for any branch. HOD appointments go through appoint_hod().
create or replace function public.set_user_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.user_role;
begin
  select role into v_old from public.users where id = p_user for update;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;
  if not ((select app.is_principal()) or app.is_hod_of(p_user)) then
    raise exception 'You cannot change this account' using errcode = '42501';
  end if;
  if p_role in ('HOD', 'PRINCIPAL') then
    raise exception 'Heads of department are appointed by the Principal from the HOD page' using errcode = 'P0001';
  end if;
  if v_old = 'PRINCIPAL' then raise exception 'The Principal account cannot be changed here' using errcode = '42501'; end if;
  if v_old = 'HOD' and not (select app.is_principal()) then
    raise exception 'Only the Principal can change an HOD account' using errcode = '42501';
  end if;
  if v_old = p_role then return; end if;
  update public.mentor_assignments set ended_at = now(), end_reason = 'Role changed', ended_by = (select auth.uid())
   where ended_at is null and (mentor_id = p_user or student_id = p_user);
  update public.users set role = p_role, onboarding_completed_at = null where id = p_user;
  perform app.notify(p_user, 'account.role', 'Your role was changed to ' || initcap(p_role::text),
    'Sign in again to see your new workspace.', '/', 'user', p_user);
end $$;

create or replace function public.set_user_status(p_user uuid, p_status public.user_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_role public.user_role;
begin
  select role into v_role from public.users where id = p_user;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;
  if not ((select app.is_principal()) or (app.is_hod_of(p_user) and v_role in ('MENTEE', 'MENTOR'))) then
    raise exception 'You cannot change this account' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) and p_status = 'SUSPENDED' then
    raise exception 'You cannot suspend your own account' using errcode = 'P0001';
  end if;
  update public.users set status = p_status where id = p_user;
end $$;

-- ───────────────────────────── Imports (branch-scoped) ─────────────────────────────
create or replace function app.import_department(p_department uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.is_principal() then
    if p_department is null or not exists (select 1 from public.departments where id = p_department and status = 'ACTIVE') then
      raise exception 'Choose an active branch for this import' using errcode = 'P0001';
    end if;
    return p_department;
  end if;
  if app.is_hod() then
    if p_department is not null and p_department <> app.hod_department() then
      raise exception 'Rows for other branches cannot be imported' using errcode = '42501';
    end if;
    return app.hod_department();
  end if;
  raise exception 'Only an HOD or the Principal can import' using errcode = '42501';
end $$;

drop function public.import_subjects(jsonb, boolean);
drop function public.import_results(jsonb, boolean);

create or replace function public.import_subjects(p_rows jsonb, p_update boolean default false, p_department uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  v_dept uuid := app.import_department(p_department);
  v_ins int := 0; v_upd int := 0; v_skip int := 0;
  v_exists boolean;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    select exists(select 1 from public.subjects where department_id = v_dept and code = upper(r ->> 'code')) into v_exists;
    if v_exists and not p_update then v_skip := v_skip + 1; continue; end if;
    insert into public.subjects (department_id, code, name, credits, semester, mse_max, see_max, has_mse, has_see, is_verified, created_by)
    values (v_dept, upper(r ->> 'code'), r ->> 'name', (r ->> 'credits')::numeric, nullif(r ->> 'semester', '')::smallint,
            nullif(r ->> 'mse_max', '')::numeric, nullif(r ->> 'see_max', '')::numeric,
            nullif(r ->> 'mse_max', '') is not null, nullif(r ->> 'see_max', '') is not null, true, (select auth.uid()))
    on conflict (department_id, code) do update set name = excluded.name, credits = excluded.credits, semester = excluded.semester,
      mse_max = excluded.mse_max, see_max = excluded.see_max, has_mse = excluded.has_mse, has_see = excluded.has_see, is_verified = true;
    if v_exists then v_upd := v_upd + 1; else v_ins := v_ins + 1; end if;
  end loop;
  return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip);
end $$;

-- Imported official results land as VERIFIED. Existing verified/finalized semesters are never overwritten.
create or replace function public.import_results(p_rows jsonb, p_update boolean default false, p_department uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  v_dept uuid := app.import_department(p_department);
  v_student uuid; v_subject uuid; v_credits numeric; v_sem uuid; v_status public.semester_status;
  v_existing uuid;
  v_ins int := 0; v_upd int := 0; v_skip int := 0;
  v_touched uuid[] := '{}';
begin
  -- Status moves below are trusted server-side steps of an authorised import.
  perform set_config('app.allow_locked_edit', 'on', true);
  for r in select * from jsonb_array_elements(p_rows) loop
    select p.user_id into v_student from public.student_profiles p join public.users u on u.id = p.user_id
      where lower(p.usn) = lower(r ->> 'usn') and u.department_id = v_dept;
    if v_student is null then raise exception 'Row %: no student with USN % in this branch', r ->> '_row', r ->> 'usn' using errcode = 'P0001'; end if;
    select id, credits into v_subject, v_credits from public.subjects where department_id = v_dept and code = upper(r ->> 'subject_code');
    if v_subject is null then raise exception 'Row %: unknown subject code %', r ->> '_row', r ->> 'subject_code' using errcode = 'P0001'; end if;

    select id, status into v_sem, v_status from public.academic_semesters where student_id = v_student and semester_no = (r ->> 'semester_no')::smallint;
    if v_sem is null then
      insert into public.academic_semesters (student_id, semester_no, academic_year, status)
      values (v_student, (r ->> 'semester_no')::smallint, r ->> 'academic_year', 'DRAFT') returning id, status into v_sem, v_status;
    end if;
    if v_status in ('VERIFIED', 'FINALIZED') and not (v_sem = any(v_touched)) then
      v_skip := v_skip + 1; continue;
    end if;
    if v_status <> 'DRAFT' and not (v_sem = any(v_touched)) then
      update public.academic_semesters set status = 'DRAFT' where id = v_sem;
    end if;
    v_touched := array_append(v_touched, v_sem);

    select id into v_existing from public.student_subject_results where academic_semester_id = v_sem and subject_id = v_subject and attempt = 1;
    if v_existing is not null and not p_update then v_skip := v_skip + 1; continue; end if;
    insert into public.student_subject_results (academic_semester_id, subject_id, attempt, credits, mse_marks, mse_max, see_marks, see_max, grade, grade_points, result)
    values (v_sem, v_subject, 1, coalesce(nullif(r ->> 'credits', '')::numeric, v_credits),
      nullif(r ->> 'mse_marks', '')::numeric, nullif(r ->> 'mse_max', '')::numeric, nullif(r ->> 'see_marks', '')::numeric, nullif(r ->> 'see_max', '')::numeric,
      nullif(upper(r ->> 'grade'), ''), nullif(r ->> 'grade_points', '')::numeric, coalesce(nullif(upper(r ->> 'result'), ''), 'PENDING')::public.subject_result)
    on conflict (academic_semester_id, subject_id, attempt) do update set credits = excluded.credits, mse_marks = excluded.mse_marks, mse_max = excluded.mse_max,
      see_marks = excluded.see_marks, see_max = excluded.see_max, grade = excluded.grade, grade_points = excluded.grade_points, result = excluded.result;
    if v_existing is not null then v_upd := v_upd + 1; else v_ins := v_ins + 1; end if;
  end loop;

  update public.academic_semesters set status = 'SUBMITTED', submitted_at = coalesce(submitted_at, now()) where id = any(v_touched) and status = 'DRAFT';
  update public.academic_semesters set status = 'VERIFIED', verified_by = (select auth.uid()), verified_at = now() where id = any(v_touched) and status = 'SUBMITTED';
  perform set_config('app.allow_locked_edit', 'off', true);
  return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip, 'semesters', to_jsonb(v_touched));
end $$;

-- ───────────────────────────── HOD appointments (Principal only) ─────────────────────────────
create or replace function public.appoint_hod(p_department uuid, p_user uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user public.users%rowtype;
  v_old uuid;
  v_branch text;
begin
  if not app.is_principal() then raise exception 'Only the Principal can appoint an HOD' using errcode = '42501'; end if;
  select code into v_branch from public.departments where id = p_department and status = 'ACTIVE';
  if v_branch is null then raise exception 'Branch not found or archived' using errcode = 'P0002'; end if;
  select * into v_user from public.users where id = p_user for update;
  if not found or v_user.department_id is distinct from p_department or v_user.role not in ('MENTOR', 'HOD') or v_user.status = 'SUSPENDED' then
    raise exception 'Pick an active faculty member of this branch' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.department_heads where user_id = p_user and department_id = p_department and ended_at is null) then
    return;
  end if;

  select user_id into v_old from public.department_heads where department_id = p_department and ended_at is null for update;
  update public.department_heads set ended_at = now(), ended_by = (select auth.uid()),
         end_reason = coalesce(nullif(trim(p_reason), ''), 'New HOD appointed')
   where department_id = p_department and ended_at is null;

  if v_user.role = 'MENTOR' then
    update public.mentor_assignments set ended_at = now(), end_reason = 'Mentor appointed HOD', ended_by = (select auth.uid())
     where mentor_id = p_user and ended_at is null;
    update public.users set role = 'HOD' where id = p_user;
    insert into public.hod_profiles (user_id, full_name, avatar_path, phone, designation)
    select user_id, full_name, avatar_path, phone, designation from public.mentor_profiles where user_id = p_user
    on conflict (user_id) do nothing;
  end if;

  insert into public.department_heads (department_id, user_id, appointed_by, reason)
  values (p_department, p_user, (select auth.uid()), nullif(trim(p_reason), ''));

  perform app.notify(p_user, 'hod.appointed', 'You are now HOD of ' || v_branch, coalesce(p_reason, ''), '/hod', 'department', p_department);
  if v_old is not null then
    perform app.notify(v_old, 'hod.ended', 'Your HOD appointment for ' || v_branch || ' has ended', coalesce(p_reason, ''), '/', 'department', p_department);
  end if;
end $$;

create or replace function public.end_hod_appointment(p_department uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old uuid;
begin
  if not app.is_principal() then raise exception 'Only the Principal can end an HOD appointment' using errcode = '42501'; end if;
  update public.department_heads set ended_at = now(), ended_by = (select auth.uid()),
         end_reason = coalesce(nullif(trim(p_reason), ''), 'Appointment ended')
   where department_id = p_department and ended_at is null
  returning user_id into v_old;
  if v_old is not null then
    perform app.notify(v_old, 'hod.ended', 'Your HOD appointment for ' || app.branch_name(p_department) || ' has ended',
      coalesce(p_reason, ''), '/', 'department', p_department);
  end if;
end $$;

-- ───────────────────────────── Branch transfers ─────────────────────────────
create or replace function app.perform_branch_transfer(p_student uuid, p_to uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_from uuid := app.user_department(p_student);
  v_mentor uuid := app.active_mentor_of(p_student);
  v_old_hod uuid := app.branch_head(v_from);
  v_new_hod uuid := app.branch_head(p_to);
  v_name text := coalesce(app.display_name(p_student), 'A student');
begin
  if not exists (select 1 from public.departments where id = p_to and status = 'ACTIVE') then
    raise exception 'The target branch is not active' using errcode = 'P0001';
  end if;
  update public.student_profiles set section_id = null where user_id = p_student;
  update public.users set department_id = p_to where id = p_student; -- ends the mentor link, moves record scope
  perform app.notify(p_student, 'branch.moved', 'You moved to ' || app.branch_name(p_to),
    'Your records moved with you. Your new HOD will assign a mentor.', '/mentee', 'user', p_student);
  perform app.notify(v_old_hod, 'branch.moved_out', v_name || ' moved to ' || app.branch_name(p_to), '', '/hod/students', null, null);
  perform app.notify(v_new_hod, 'branch.moved_in', v_name || ' joined ' || app.branch_name(p_to) || ' from ' || app.branch_name(v_from),
    'Assign a mentor.', '/hod/assignments?filter=unassigned', 'user', p_student);
  perform app.notify(v_mentor, 'assignment.removed', v_name || ' is no longer assigned to you', 'Branch transfer.', '/mentor/mentees', null, null);
end $$;
revoke execute on function app.perform_branch_transfer(uuid, uuid) from public, authenticated, anon;

create or replace function public.request_branch_transfer(p_student uuid, p_to uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_from uuid := app.user_department(p_student);
begin
  if not app.is_hod_of(p_student) or not exists (select 1 from public.users where id = p_student and role = 'MENTEE') then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;
  if p_to = v_from then raise exception 'The student is already in that branch' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.departments where id = p_to and status = 'ACTIVE') then
    raise exception 'Choose an active branch' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.student_branch_transfers where student_id = p_student and status = 'PENDING') then
    raise exception 'A transfer for this student is already waiting for the Principal' using errcode = 'P0001';
  end if;
  insert into public.student_branch_transfers (student_id, from_department_id, to_department_id, requested_by, reason)
  values (p_student, v_from, p_to, (select auth.uid()), trim(p_reason)) returning id into v_id;
  perform app.notify_principals('transfer.requested',
    'Transfer request: ' || app.branch_name(v_from) || ' → ' || app.branch_name(p_to),
    coalesce(app.display_name(p_student), '') || ' · ' || trim(p_reason), '/principal/transfers', 'transfer', v_id);
  return v_id;
end $$;

create or replace function public.decide_branch_transfer(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.student_branch_transfers%rowtype;
begin
  if not app.is_principal() then raise exception 'Only the Principal can decide transfers' using errcode = '42501'; end if;
  select * into v from public.student_branch_transfers where id = p_id for update;
  if not found then raise exception 'Transfer not found' using errcode = 'P0002'; end if;
  if v.status <> 'PENDING' then raise exception 'This transfer was already decided' using errcode = 'P0001'; end if;
  if p_approve then
    if app.user_department(v.student_id) <> v.from_department_id then
      raise exception 'The student is no longer in the original branch' using errcode = 'P0001';
    end if;
    perform app.perform_branch_transfer(v.student_id, v.to_department_id);
  end if;
  update public.student_branch_transfers
     set status = case when p_approve then 'APPROVED'::public.review_status else 'REJECTED'::public.review_status end,
         decided_by = (select auth.uid()), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where id = p_id;
  perform app.notify(v.requested_by, 'transfer.decided',
    'Transfer ' || case when p_approve then 'approved' else 'rejected' end || ': ' || coalesce(app.display_name(v.student_id), 'student'),
    coalesce(p_note, ''), '/hod/students', 'transfer', p_id);
end $$;

create or replace function public.move_student_branch(p_student uuid, p_to uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_from uuid := app.user_department(p_student);
begin
  if not app.is_principal() then raise exception 'Only the Principal can move a student' using errcode = '42501'; end if;
  if not exists (select 1 from public.users where id = p_student and role = 'MENTEE') then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;
  if p_to = v_from then raise exception 'The student is already in that branch' using errcode = 'P0001'; end if;
  update public.student_branch_transfers set status = 'REJECTED', decided_by = (select auth.uid()), decided_at = now(),
         decision_note = 'Superseded by a direct move'
   where student_id = p_student and status = 'PENDING';
  insert into public.student_branch_transfers (student_id, from_department_id, to_department_id, requested_by, reason, status, decided_by, decided_at)
  values (p_student, v_from, p_to, (select auth.uid()), trim(p_reason), 'APPROVED', (select auth.uid()), now()) returning id into v_id;
  perform app.perform_branch_transfer(p_student, p_to);
  return v_id;
end $$;

grant execute on function public.set_user_role(uuid, public.user_role), public.set_user_status(uuid, public.user_status),
  public.import_subjects(jsonb, boolean, uuid), public.import_results(jsonb, boolean, uuid),
  public.appoint_hod(uuid, uuid, text), public.end_hod_appointment(uuid, text),
  public.request_branch_transfer(uuid, uuid, text), public.decide_branch_transfer(uuid, boolean, text),
  public.move_student_branch(uuid, uuid, text) to authenticated;
revoke execute on function public.import_subjects(jsonb, boolean, uuid), public.import_results(jsonb, boolean, uuid),
  public.appoint_hod(uuid, uuid, text), public.end_hod_appointment(uuid, text),
  public.request_branch_transfer(uuid, uuid, text), public.decide_branch_transfer(uuid, boolean, text),
  public.move_student_branch(uuid, uuid, text) from anon, public;

-- ───────────────────────────── Self sign-up: branch comes from the USN in the email ─────────────────────────────
-- Student emails look like nnm23cs111@<domain>: college prefix, 2-digit admission year, branch code, roll number.
create or replace function app.handle_self_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_local text := lower(split_part(new.email, '@', 1));
  v_domain text := lower(split_part(new.email, '@', 2));
  v_required text := lower(coalesce((select value #>> '{}' from public.app_settings where key = 'student_email_domain'), ''));
  m text[];
  v_dept uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'signup', '') <> 'self' then
    return new;
  end if;
  if exists (select 1 from public.users where id = new.id) then
    return new;
  end if;
  if coalesce((select value from public.app_settings where key = 'self_signup'), 'true'::jsonb) = 'false'::jsonb then
    raise exception 'Self sign-up is turned off. Ask your HOD for an invitation.' using errcode = '42501';
  end if;
  if v_required <> '' and v_domain <> v_required then
    raise exception 'Use your college email address (…@%).', v_required using errcode = 'P0001';
  end if;
  m := regexp_match(v_local, '^([a-z]{1,4})([0-9]{2})([a-z]{2,3})([0-9]{3})$');
  if m is null then
    raise exception 'Sign up with your USN email, for example nnm23cs001@…' using errcode = 'P0001';
  end if;
  select id into v_dept from public.departments where usn_code = m[3] and status = 'ACTIVE';
  if v_dept is null then
    raise exception 'The branch code "%" in your USN is not set up in Mentora. Ask your HOD for an invitation.', m[3] using errcode = 'P0001';
  end if;
  if exists (select 1 from public.student_profiles where lower(usn) = v_local) then
    raise exception 'An account with this USN already exists. Sign in instead.' using errcode = 'P0001';
  end if;

  insert into public.users (id, email, role, status, department_id)
  values (new.id, lower(new.email), 'MENTEE', 'ACTIVE', v_dept);
  insert into public.student_profiles (user_id, full_name, usn, admission_year)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''), upper(v_local), 2000 + m[2]::int)
  on conflict (user_id) do nothing;
  return new;
end $$;
revoke execute on function app.handle_self_signup() from public, anon, authenticated;
