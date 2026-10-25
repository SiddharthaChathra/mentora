-- Transactional, audited RPCs. Each one re-checks authorization itself.

-- ───────────────────────────── Account lifecycle ─────────────────────────────
create or replace function public.activate_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.users set status = 'ACTIVE' where id = (select auth.uid()) and status = 'INVITED';
end $$;

create or replace function public.complete_onboarding() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := app.current_role();
  v_ok boolean;
begin
  if v_role is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v_role = 'MENTEE' then
    select full_name is not null and usn is not null and current_semester is not null and section_id is not null
       and program is not null and admission_year is not null and phone is not null
      into v_ok from public.student_profiles where user_id = (select auth.uid());
  elsif v_role = 'MENTOR' then
    select full_name is not null and designation is not null and faculty_id is not null and official_email is not null
      into v_ok from public.mentor_profiles where user_id = (select auth.uid());
  else
    select full_name is not null into v_ok from public.hod_profiles where user_id = (select auth.uid());
  end if;
  if not coalesce(v_ok, false) then
    raise exception 'Required profile fields are missing' using errcode = 'P0001';
  end if;
  update public.users set onboarding_completed_at = coalesce(onboarding_completed_at, now()) where id = (select auth.uid());
end $$;

create or replace function public.mark_all_notifications_read() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.notifications set read_at = now() where user_id = (select auth.uid()) and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ───────────────────────────── Assignments ─────────────────────────────
create or replace function app.assign_one(p_student uuid, p_mentor uuid, p_reason text, p_group text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_current public.mentor_assignments%rowtype;
begin
  if not exists (select 1 from public.users where id = p_student and role = 'MENTEE' and status <> 'SUSPENDED'
                 and department_id = app.current_department()) then
    raise exception 'Student % is not an active mentee in your department', p_student using errcode = 'P0001';
  end if;

  select * into v_current from public.mentor_assignments where student_id = p_student and ended_at is null for update;
  if found and v_current.mentor_id is not distinct from p_mentor then
    return null; -- already assigned there
  end if;
  if found then
    update public.mentor_assignments
       set ended_at = now(), end_reason = coalesce(nullif(p_reason, ''), 'Reassigned'), ended_by = (select auth.uid())
     where id = v_current.id;
    perform app.notify(v_current.mentor_id, 'assignment.removed',
      coalesce(app.display_name(p_student), 'A mentee') || ' is no longer assigned to you',
      coalesce(p_reason, ''), '/mentor/mentees', 'user', p_student);
  end if;
  if p_mentor is not null then
    insert into public.mentor_assignments (mentor_id, student_id, group_name, assigned_by, reason)
    values (p_mentor, p_student, nullif(p_group, ''), (select auth.uid()), nullif(p_reason, ''));
    perform app.notify(p_student, 'assignment.new',
      'Your mentor is ' || coalesce(app.display_name(p_mentor), 'assigned'),
      'Assigned by your HOD.', '/mentee', 'user', p_mentor);
  else
    perform app.notify(p_student, 'assignment.removed', 'Your mentor assignment was removed',
      'Your HOD will assign a new mentor soon.', '/mentee', 'user', p_student);
  end if;
  return jsonb_build_object('student_id', p_student, 'previous_mentor_id', v_current.mentor_id);
end $$;
revoke execute on function app.assign_one(uuid, uuid, text, text) from public, authenticated, anon;

create or replace function public.assign_students(p_student_ids uuid[], p_mentor uuid, p_reason text default null, p_group text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_sid uuid;
  v_change jsonb;
  v_changes jsonb := '[]'::jsonb;
begin
  if not app.is_hod() then raise exception 'Only the HOD can manage assignments' using errcode = '42501'; end if;
  if coalesce(array_length(p_student_ids, 1), 0) = 0 then raise exception 'No students selected' using errcode = 'P0001'; end if;
  if array_length(p_student_ids, 1) > 500 then raise exception 'Too many students in one change' using errcode = 'P0001'; end if;
  if p_mentor is not null and not exists (
    select 1 from public.users where id = p_mentor and role = 'MENTOR' and status = 'ACTIVE' and department_id = app.current_department()
  ) then
    raise exception 'Mentor is not active in your department' using errcode = 'P0001';
  end if;

  foreach v_sid in array p_student_ids loop
    v_change := app.assign_one(v_sid, p_mentor, p_reason, p_group);
    if v_change is not null then v_changes := v_changes || v_change; end if;
  end loop;

  if p_mentor is not null and jsonb_array_length(v_changes) > 0 then
    perform app.notify(p_mentor, 'assignment.added',
      case when jsonb_array_length(v_changes) = 1 then '1 new mentee was assigned to you'
           else jsonb_array_length(v_changes) || ' new mentees were assigned to you' end,
      coalesce(p_reason, ''), '/mentor/mentees', null, null);
  end if;
  return jsonb_build_object('changed', v_changes, 'mentor_id', p_mentor);
end $$;

-- Undo support: restore each student's previous mentor (null = unassigned).
create or replace function public.restore_assignments(p_previous jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  if not app.is_hod() then raise exception 'Only the HOD can manage assignments' using errcode = '42501'; end if;
  for v_item in select * from jsonb_array_elements(p_previous) loop
    if app.assign_one((v_item ->> 'student_id')::uuid, nullif(v_item ->> 'previous_mentor_id', '')::uuid, 'Undo of previous change', null) is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

-- ───────────────────────────── Change requests ─────────────────────────────
create or replace function public.review_change_request(p_id uuid, p_approve boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cr public.record_change_requests%rowtype;
  v_status public.semester_status;
  p jsonb;
begin
  select * into v_cr from public.record_change_requests where id = p_id for update;
  if not found then raise exception 'Change request not found' using errcode = 'P0002'; end if;
  if v_cr.status <> 'PENDING' then raise exception 'This request was already reviewed' using errcode = 'P0001'; end if;
  v_status := app.semester_status(v_cr.academic_semester_id);
  if not ((app.is_active_mentor_of(v_cr.student_id) and v_status = 'VERIFIED') or app.is_hod_of(v_cr.student_id)) then
    raise exception 'You cannot review this request' using errcode = '42501';
  end if;
  if (select auth.uid()) = v_cr.created_by and not app.is_hod() then
    raise exception 'You cannot approve your own request' using errcode = '42501';
  end if;

  if p_approve then
    p := v_cr.proposed;
    perform set_config('app.allow_locked_edit', 'on', true);
    if v_cr.target_table = 'student_subject_results' then
      update public.student_subject_results r set
        mse_marks = case when p ? 'mse_marks' then (p ->> 'mse_marks')::numeric else r.mse_marks end,
        mse_max = case when p ? 'mse_max' then (p ->> 'mse_max')::numeric else r.mse_max end,
        see_marks = case when p ? 'see_marks' then (p ->> 'see_marks')::numeric else r.see_marks end,
        see_max = case when p ? 'see_max' then (p ->> 'see_max')::numeric else r.see_max end,
        ia = case when p ? 'ia' then p -> 'ia' else r.ia end,
        grade = case when p ? 'grade' then p ->> 'grade' else r.grade end,
        grade_points = case when p ? 'grade_points' then (p ->> 'grade_points')::numeric else r.grade_points end,
        result = case when p ? 'result' then (p ->> 'result')::public.subject_result else r.result end,
        credits_earned = case when p ? 'credits_earned' then (p ->> 'credits_earned')::numeric else r.credits_earned end
      where r.id = v_cr.target_id and r.academic_semester_id = v_cr.academic_semester_id;
    else
      update public.academic_semesters s set
        academic_year = case when p ? 'academic_year' then p ->> 'academic_year' else s.academic_year end,
        manual_sgpa = case when p ? 'manual_sgpa' then (p ->> 'manual_sgpa')::numeric else s.manual_sgpa end,
        manual_cgpa = case when p ? 'manual_cgpa' then (p ->> 'manual_cgpa')::numeric else s.manual_cgpa end
      where s.id = v_cr.target_id and s.id = v_cr.academic_semester_id;
    end if;
    if not found then raise exception 'The record to correct no longer exists' using errcode = 'P0002'; end if;
    perform set_config('app.allow_locked_edit', 'off', true);
  end if;

  update public.record_change_requests
     set status = case when p_approve then 'APPROVED'::public.review_status else 'REJECTED'::public.review_status end,
         reviewer_id = (select auth.uid()), reviewed_at = now(), review_note = nullif(p_note, '')
   where id = p_id;

  perform app.notify(v_cr.student_id, 'change_request.decided',
    'Your correction request was ' || case when p_approve then 'approved' else 'rejected' end,
    coalesce(p_note, ''), '/mentee/academics?semester=' || v_cr.academic_semester_id, 'change_request', v_cr.id);
  return jsonb_build_object('id', p_id, 'approved', p_approve, 'academic_semester_id', v_cr.academic_semester_id);
end $$;

-- ───────────────────────────── Roles & status ─────────────────────────────
create or replace function public.set_user_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.user_role;
begin
  if not app.is_hod_of(p_user) then raise exception 'Only the HOD of this department can change roles' using errcode = '42501'; end if;
  select role into v_old from public.users where id = p_user for update;
  if v_old = p_role then return; end if;
  -- A role change ends every active mentoring relationship the user is part of.
  update public.mentor_assignments set ended_at = now(), end_reason = 'Role changed', ended_by = (select auth.uid())
   where ended_at is null and (mentor_id = p_user or student_id = p_user);
  update public.users set role = p_role, onboarding_completed_at = null where id = p_user;
  perform app.notify(p_user, 'account.role', 'Your role was changed to ' || initcap(p_role::text),
    'Sign in again to see your new workspace.', '/', 'user', p_user);
end $$;

create or replace function public.set_user_status(p_user uuid, p_status public.user_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_hod_of(p_user) then raise exception 'Only the HOD of this department can change account status' using errcode = '42501'; end if;
  if p_user = (select auth.uid()) and p_status = 'SUSPENDED' then
    raise exception 'You cannot suspend your own account' using errcode = 'P0001';
  end if;
  update public.users set status = p_status where id = p_user;
end $$;

grant execute on function public.activate_my_account(), public.complete_onboarding(), public.mark_all_notifications_read(),
  public.assign_students(uuid[], uuid, text, text), public.restore_assignments(jsonb),
  public.review_change_request(uuid, boolean, text), public.set_user_role(uuid, public.user_role),
  public.set_user_status(uuid, public.user_status) to authenticated;
revoke execute on function public.activate_my_account(), public.complete_onboarding(), public.mark_all_notifications_read(),
  public.assign_students(uuid[], uuid, text, text), public.restore_assignments(jsonb),
  public.review_change_request(uuid, boolean, text), public.set_user_role(uuid, public.user_role),
  public.set_user_status(uuid, public.user_status) from anon, public;

-- ───────────────────────────── Realtime ─────────────────────────────
alter publication supabase_realtime add table public.notifications;
