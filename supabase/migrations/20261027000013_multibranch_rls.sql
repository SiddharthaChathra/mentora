-- Multi-branch S3: scope helpers, consistency triggers and the RLS rewrite.
-- HOD = the one branch they currently head (department_heads, ended_at IS NULL). PRINCIPAL = every branch,
-- read-only on student data and never PRIVATE_MENTOR notes. Scope is always read fresh from current rows.

-- ───────────────────────────── Helpers ─────────────────────────────
create or replace function app.is_principal() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select app.current_role()) = 'PRINCIPAL', false)
$$;

create or replace function app.hod_department() returns uuid
language sql stable security definer set search_path = '' as $$
  select h.department_id from public.department_heads h join public.users u on u.id = h.user_id
   where h.user_id = (select auth.uid()) and h.ended_at is null and u.status = 'ACTIVE' and u.role = 'HOD'
$$;

create or replace function app.is_hod() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select app.hod_department()) is not null
$$;

-- An HOD's department is their appointed branch; an HOD without an active appointment has none.
create or replace function app.current_department() returns uuid
language sql stable security definer set search_path = '' as $$
  select case when u.role = 'HOD' then (select app.hod_department()) else u.department_id end
    from public.users u where u.id = (select auth.uid()) and u.status = 'ACTIVE'
$$;

create or replace function app.is_hod_of(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(app.user_department(p_user) = (select app.hod_department()), false)
$$;

create or replace function app.student_department(p_student uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select app.user_department(p_student)
$$;

create or replace function app.can_read_department(p_department uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_department is not null and ((select app.is_principal()) or p_department = (select app.hod_department()))
$$;

-- The Principal is deliberately excluded: student-data writes stay with the branch HOD.
create or replace function app.can_manage_department(p_department uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_department is not null and p_department = (select app.hod_department())
$$;

create or replace function app.is_active_mentor_of(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select app.current_role()) = 'MENTOR', false) and exists (
    select 1 from public.mentor_assignments a
      join public.users s on s.id = a.student_id
      join public.users m on m.id = a.mentor_id
     where a.student_id = p_student and a.mentor_id = (select auth.uid()) and a.ended_at is null
       and s.department_id = m.department_id
  )
$$;

-- Read access to a student's records: the student, their active mentor, their branch HOD, or the Principal.
create or replace function app.can_read_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select app.is_principal()) or app.can_view_student(p_student)
$$;

create or replace function app.setting_on(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.app_settings where key = p_key) = 'true'::jsonb, false)
$$;

grant execute on all functions in schema app to authenticated, service_role;
revoke execute on all functions in schema app from anon;

-- ───────────────────────────── Consistency triggers ─────────────────────────────
-- Mentor and mentee must be in the same branch.
create or replace function app.enforce_same_branch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.ended_at is null and app.user_department(new.mentor_id) is distinct from app.user_department(new.student_id) then
    raise exception 'MB_CROSS_BRANCH: a mentor and their mentee must be in the same branch' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger enforce_same_branch before insert or update on public.mentor_assignments
  for each row execute function app.enforce_same_branch();

-- A person changing branch: end their active mentoring links, then move their records' scope with them.
create or replace function app.on_user_branch_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.allow_locked_edit', 'on', true);
  update public.mentor_assignments set ended_at = now(), end_reason = 'BRANCH_TRANSFER', ended_by = (select auth.uid())
   where ended_at is null and (student_id = new.id or mentor_id = new.id);
  update public.academic_semesters set department_id = new.department_id where student_id = new.id;
  update public.mentor_assignments set department_id = new.department_id where student_id = new.id;
  update public.mentor_recommendations set department_id = new.department_id where student_id = new.id;
  update public.record_change_requests set department_id = new.department_id where student_id = new.id;
  update public.intervention_followups set department_id = new.department_id where student_id = new.id;
  update public.mentoring_sessions set department_id = new.department_id where student_id = new.id or (student_id is null and mentor_id = new.id);
  update public.learning_resources set department_id = new.department_id where student_id = new.id or (student_id is null and mentor_id = new.id);
  update public.notifications set department_id = new.department_id where user_id = new.id;
  perform set_config('app.allow_locked_edit', 'off', true);
  return new;
end $$;
create trigger on_user_branch_change after update of department_id on public.users
  for each row when (old.department_id is distinct from new.department_id)
  execute function app.on_user_branch_change();

-- An HOD who loses the role or changes branch loses the appointment immediately.
create or replace function app.sync_department_head() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'HOD' and (new.role <> 'HOD' or new.department_id is distinct from old.department_id) then
    update public.department_heads set ended_at = now(), ended_by = (select auth.uid()),
           end_reason = coalesce(end_reason, 'Role or branch changed')
     where user_id = old.id and ended_at is null;
  end if;
  return new;
end $$;
create trigger sync_department_head after update of role, department_id on public.users
  for each row execute function app.sync_department_head();

create or replace function app.validate_department_head() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.ended_at is null and not exists (
    select 1 from public.users u join public.departments d on d.id = u.department_id
     where u.id = new.user_id and u.role = 'HOD' and u.department_id = new.department_id and d.status = 'ACTIVE'
  ) then
    raise exception 'The head of a branch must be an HOD account in that branch' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger validate_department_head before insert or update on public.department_heads
  for each row execute function app.validate_department_head();

-- Branches may lose their HOD temporarily, but the college always keeps one active Principal.
drop trigger if exists protect_last_hod on public.users;
drop function if exists app.protect_last_hod();
create or replace function app.protect_last_principal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'PRINCIPAL' and old.status = 'ACTIVE' and (new.role <> 'PRINCIPAL' or new.status <> 'ACTIVE') then
    if not exists (select 1 from public.users u where u.role = 'PRINCIPAL' and u.status = 'ACTIVE' and u.id <> old.id) then
      raise exception 'The college must keep at least one active Principal' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger protect_last_principal before update on public.users
  for each row execute function app.protect_last_principal();

create or replace function app.guard_branch_archive() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'ARCHIVED' and old.status <> 'ARCHIVED' then
    if exists (select 1 from public.users u where u.department_id = new.id and u.role in ('MENTEE', 'MENTOR', 'HOD') and u.status <> 'SUSPENDED') then
      raise exception 'This branch still has active students or staff. Move or suspend them before archiving.' using errcode = 'P0001';
    end if;
    update public.department_heads set ended_at = now(), ended_by = (select auth.uid()), end_reason = 'Branch archived'
     where department_id = new.id and ended_at is null;
  end if;
  return new;
end $$;
create trigger guard_branch_archive before update on public.departments
  for each row execute function app.guard_branch_archive();

-- Audit: a pure scope move (department_id) is recorded once by the transfer itself, not on every row.
create or replace function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_after jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_after, v_before);
  v_id text := coalesce(v_row ->> 'id', v_row ->> 'academic_semester_id', v_row ->> 'user_id', v_row ->> 'key');
begin
  if tg_op = 'UPDATE' and v_before - 'updated_at' - 'department_id' = v_after - 'updated_at' - 'department_id'
     and tg_table_name not in ('users', 'departments', 'department_heads') then
    return new;
  end if;
  if tg_op = 'UPDATE' and v_before - 'updated_at' = v_after - 'updated_at' then
    return new;
  end if;
  v_before := v_before - 'draft';
  v_after := v_after - 'draft';
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after, ip, user_agent)
  values (
    (select auth.uid()), lower(tg_op), tg_table_name, v_id, v_before, v_after,
    split_part(coalesce(app.request_header('x-forwarded-for'), app.request_header('x-real-ip'), ''), ',', 1),
    left(app.request_header('user-agent'), 300)
  );
  return coalesce(new, old);
end $$;
create trigger audit_user_branch after update on public.users
  for each row when (old.department_id is distinct from new.department_id)
  execute function app.audit_row();

-- Import jobs: an HOD's job is always their branch; the Principal's job carries the chosen branch.
create or replace function app.fill_import_department() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_principal() then
    new.department_id := app.current_department();
  end if;
  return new;
end $$;
create trigger fill_import_department before insert or update on public.import_jobs
  for each row execute function app.fill_import_department();

-- ───────────────────────────── RLS: new tables ─────────────────────────────
alter table public.department_heads enable row level security;
alter table public.student_branch_transfers enable row level security;
revoke all on public.department_heads, public.student_branch_transfers from anon;

create policy department_heads_read on public.department_heads for select to authenticated
  using ((select app.current_role()) is not null);
revoke insert, update, delete on public.department_heads from authenticated;

create policy transfers_read on public.student_branch_transfers for select to authenticated using (
  (select app.is_principal())
  or from_department_id = (select app.hod_department())
  or to_department_id = (select app.hod_department())
);
revoke insert, update, delete on public.student_branch_transfers from authenticated;

-- ───────────────────────────── RLS rewrite: structure ─────────────────────────────
drop policy departments_read on public.departments;
drop policy departments_hod_write on public.departments;
create policy departments_read on public.departments for select to authenticated
  using ((select app.current_role()) is not null);
create policy departments_principal_insert on public.departments for insert to authenticated
  with check ((select app.is_principal()));
create policy departments_principal_update on public.departments for update to authenticated
  using ((select app.is_principal())) with check ((select app.is_principal()));
revoke delete on public.departments from authenticated;

drop policy sections_read on public.sections;
drop policy sections_hod_write on public.sections;
create policy sections_read on public.sections for select to authenticated
  using ((select app.is_principal()) or department_id = (select app.current_department()));
create policy sections_hod_write on public.sections for all to authenticated
  using (app.can_manage_department(department_id)) with check (app.can_manage_department(department_id));

drop policy academic_years_hod_write on public.academic_years;
create policy academic_years_principal_write on public.academic_years for all to authenticated
  using ((select app.is_principal())) with check ((select app.is_principal()));

-- ───────────────────────────── users & profiles ─────────────────────────────
drop policy users_read on public.users;
create policy users_read on public.users for select to authenticated using (
  id = (select auth.uid())
  or (select app.is_principal())
  or app.is_hod_of(id)
  or app.is_active_mentor_of(id)
  or (role in ('MENTOR', 'HOD') and department_id = (select app.current_department()))
  or (role = 'PRINCIPAL' and (select app.current_role()) is not null)
);

drop policy student_profiles_read on public.student_profiles;
create policy student_profiles_read on public.student_profiles for select to authenticated
  using (user_id = (select auth.uid()) or app.can_read_student(user_id));

drop policy mentor_profiles_read on public.mentor_profiles;
create policy mentor_profiles_read on public.mentor_profiles for select to authenticated using (
  user_id = (select auth.uid()) or (select app.is_principal())
  or app.user_department(user_id) = (select app.current_department())
);

drop policy hod_profiles_read on public.hod_profiles;
drop policy hod_profiles_self_write on public.hod_profiles;
create policy hod_profiles_read on public.hod_profiles for select to authenticated using (
  user_id = (select auth.uid()) or (select app.is_principal())
  or app.user_department(user_id) = (select app.current_department())
  or (app.user_department(user_id) is null and (select app.current_role()) is not null)
);
create policy hod_profiles_self_write on public.hod_profiles for all to authenticated
  using (user_id = (select auth.uid()) and (select app.current_role()) in ('HOD', 'PRINCIPAL'))
  with check (user_id = (select auth.uid()) and (select app.current_role()) in ('HOD', 'PRINCIPAL'));

drop policy mentor_assignments_read on public.mentor_assignments;
create policy mentor_assignments_read on public.mentor_assignments for select to authenticated using (
  (select app.is_principal())
  or department_id = (select app.hod_department())
  or (mentor_id = (select auth.uid()) and ended_at is null and (select app.current_role()) = 'MENTOR')
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
);

-- ───────────────────────────── grading, thresholds, subjects ─────────────────────────────
drop policy grading_schemes_read on public.grading_schemes;
drop policy grading_schemes_hod_write on public.grading_schemes;
create policy grading_schemes_read on public.grading_schemes for select to authenticated using (
  (select app.current_role()) is not null
  and (department_id is null or (select app.is_principal()) or department_id = (select app.current_department()))
);
create policy grading_schemes_write on public.grading_schemes for all to authenticated using (
  (department_id is null and (select app.is_principal()))
  or (app.can_manage_department(department_id) and app.setting_on('allow_branch_grading'))
) with check (
  (department_id is null and (select app.is_principal()))
  or (app.can_manage_department(department_id) and app.setting_on('allow_branch_grading'))
);

drop policy risk_thresholds_read on public.risk_thresholds;
drop policy risk_thresholds_hod_write on public.risk_thresholds;
create policy risk_thresholds_read on public.risk_thresholds for select to authenticated using (
  (select app.current_role()) is not null
  and (department_id is null or (select app.is_principal()) or department_id = (select app.current_department()))
);
create policy risk_thresholds_write on public.risk_thresholds for all to authenticated using (
  (department_id is null and (select app.is_principal()))
  or (app.can_manage_department(department_id) and app.setting_on('allow_branch_grading'))
) with check (
  (department_id is null and (select app.is_principal()))
  or (app.can_manage_department(department_id) and app.setting_on('allow_branch_grading'))
);

-- The subject catalogue is curriculum, not student data: every active account can read it (a transferred
-- student's old results keep their subject names). Writes stay inside the writer's own branch.
drop policy subjects_read on public.subjects;
create policy subjects_read on public.subjects for select to authenticated
  using ((select app.current_role()) is not null);
drop policy subjects_insert on public.subjects;
drop policy subjects_update on public.subjects;
drop policy subjects_delete on public.subjects;
create policy subjects_insert on public.subjects for insert to authenticated with check (
  department_id = (select app.current_department()) and created_by = (select auth.uid())
  and (select app.current_role()) <> 'PRINCIPAL'
  and (is_verified = false or (select app.is_hod()))
);
create policy subjects_update on public.subjects for update to authenticated
  using (department_id = (select app.current_department()) and ((select app.is_hod()) or (created_by = (select auth.uid()) and not is_verified)))
  with check (department_id = (select app.current_department()) and ((select app.is_hod()) or not is_verified));
create policy subjects_delete on public.subjects for delete to authenticated
  using (app.can_manage_department(department_id));

-- ───────────────────────────── academic records (Principal: read only) ─────────────────────────────
drop policy academic_semesters_read on public.academic_semesters;
create policy academic_semesters_read on public.academic_semesters for select to authenticated using (
  (select app.is_principal()) or department_id = (select app.hod_department()) or app.can_view_student(student_id)
);
drop policy results_read on public.student_subject_results;
create policy results_read on public.student_subject_results for select to authenticated
  using (app.can_read_student(app.semester_student(academic_semester_id)));
drop policy summaries_read on public.semester_summaries;
create policy summaries_read on public.semester_summaries for select to authenticated
  using (app.can_read_student(app.semester_student(academic_semester_id)));
drop policy change_requests_read on public.record_change_requests;
create policy change_requests_read on public.record_change_requests for select to authenticated using (
  (select app.is_principal()) or department_id = (select app.hod_department()) or app.can_view_student(student_id)
);

-- ───────────────────────────── mentoring (Principal: SHARED only, read only) ─────────────────────────────
drop policy recommendations_read on public.mentor_recommendations;
create policy recommendations_read on public.mentor_recommendations for select to authenticated using (
  (student_id = (select auth.uid()) and visibility = 'SHARED' and (select app.current_role()) = 'MENTEE')
  or (app.is_active_mentor_of(student_id) and (visibility = 'SHARED' or mentor_id = (select auth.uid())))
  or department_id = (select app.hod_department())
  or ((select app.is_principal()) and visibility = 'SHARED')
);

drop policy resources_read on public.learning_resources;
create policy resources_read on public.learning_resources for select to authenticated using (
  (mentor_id = (select auth.uid()) and (student_id is null or app.is_active_mentor_of(student_id)))
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
  or (student_id is null and app.is_my_active_mentor(mentor_id))
  or department_id = (select app.hod_department())
  or (select app.is_principal())
);

drop policy sessions_read on public.mentoring_sessions;
create policy sessions_read on public.mentoring_sessions for select to authenticated using (
  (mentor_id = (select auth.uid()) and (student_id is null or app.is_active_mentor_of(student_id)))
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
  or (student_id is null and app.is_my_active_mentor(mentor_id))
  or department_id = (select app.hod_department())
  or (select app.is_principal())
);

drop policy followups_read on public.intervention_followups;
create policy followups_read on public.intervention_followups for select to authenticated using (
  (select app.is_principal()) or app.is_hod_of(student_id)
  or (mentor_id = (select auth.uid()) and app.is_active_mentor_of(student_id))
);

-- ───────────────────────────── audit, settings, imports ─────────────────────────────
drop policy audit_hod_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated using (
  (select app.is_principal()) or (department_id is not null and department_id = (select app.hod_department()))
);

drop policy app_settings_hod_write on public.app_settings;
create policy app_settings_principal_write on public.app_settings for all to authenticated
  using ((select app.is_principal())) with check ((select app.is_principal()));

drop policy import_jobs_hod on public.import_jobs;
create policy import_jobs_own on public.import_jobs for all to authenticated
  using (created_by = (select auth.uid()) and ((select app.is_hod()) or (select app.is_principal())))
  with check (created_by = (select auth.uid()) and ((select app.is_hod()) or (select app.is_principal())));

-- ───────────────────────────── storage ─────────────────────────────
create or replace function app.can_view_avatar(p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_owner is not null and (
    p_owner = (select auth.uid())
    or (select app.is_principal())
    or app.can_view_student(p_owner)
    or app.is_my_active_mentor(p_owner)
    or exists (select 1 from public.users u where u.id = p_owner and u.role in ('MENTOR', 'HOD')
               and u.department_id = (select app.current_department()))
  )
$$;
