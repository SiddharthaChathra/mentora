-- Authorization helpers + Row Level Security on every table.
-- Helpers are SECURITY DEFINER so policies can consult users / assignments without recursion.
-- A user only has a role while their account is ACTIVE; INVITED and SUSPENDED users get nothing.

create or replace function app.current_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select u.role from public.users u where u.id = (select auth.uid()) and u.status = 'ACTIVE'
$$;

create or replace function app.current_department() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.department_id from public.users u where u.id = (select auth.uid()) and u.status = 'ACTIVE'
$$;

create or replace function app.is_hod() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select app.current_role()) = 'HOD', false)
$$;

create or replace function app.user_department(p_user uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.department_id from public.users u where u.id = p_user
$$;

-- HOD of the department the given user belongs to.
create or replace function app.is_hod_of(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_hod() and exists (
    select 1 from public.users u where u.id = p_user and u.department_id = app.current_department()
  )
$$;

-- Current user is the ACTIVE mentor of the student (ended assignments grant nothing).
create or replace function app.is_active_mentor_of(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select app.current_role()) = 'MENTOR', false) and exists (
    select 1 from public.mentor_assignments a
    where a.student_id = p_student and a.mentor_id = (select auth.uid()) and a.ended_at is null
  )
$$;

-- Current user is a mentee whose ACTIVE mentor is p_mentor.
create or replace function app.is_my_active_mentor(p_mentor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select app.current_role()) = 'MENTEE', false) and exists (
    select 1 from public.mentor_assignments a
    where a.mentor_id = p_mentor and a.student_id = (select auth.uid()) and a.ended_at is null
  )
$$;

create or replace function app.can_view_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select ((select auth.uid()) = p_student and (select app.current_role()) = 'MENTEE')
      or app.is_active_mentor_of(p_student)
      or app.is_hod_of(p_student)
$$;

create or replace function app.semester_student(p_semester uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select s.student_id from public.academic_semesters s where s.id = p_semester
$$;

create or replace function app.semester_status(p_semester uuid) returns public.semester_status
language sql stable security definer set search_path = '' as $$
  select s.status from public.academic_semesters s where s.id = p_semester
$$;

-- PostgREST exposes request headers; used to enrich audit rows.
create or replace function app.request_header(p_name text) returns text
language sql stable set search_path = '' as $$
  select nullif(current_setting('request.headers', true), '')::json ->> p_name
$$;

grant execute on all functions in schema app to authenticated, service_role;

-- ───────────────────────────── Enable RLS everywhere ─────────────────────────────
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from anon', t.tablename);
  end loop;
end $$;

-- ───────────────────────────── Structure tables ─────────────────────────────
create policy departments_read on public.departments for select to authenticated
  using ((select app.current_role()) is not null);
create policy departments_hod_write on public.departments for all to authenticated
  using (app.is_hod() and id = app.current_department()) with check (app.is_hod() and id = app.current_department());

create policy sections_read on public.sections for select to authenticated
  using (department_id = app.current_department());
create policy sections_hod_write on public.sections for all to authenticated
  using (app.is_hod() and department_id = app.current_department())
  with check (app.is_hod() and department_id = app.current_department());

create policy academic_years_read on public.academic_years for select to authenticated
  using ((select app.current_role()) is not null);
create policy academic_years_hod_write on public.academic_years for all to authenticated
  using (app.is_hod()) with check (app.is_hod());

-- ───────────────────────────── users ─────────────────────────────
-- Users may read their own row even while INVITED (needed for onboarding + suspended screen).
create policy users_read on public.users for select to authenticated using (
  id = (select auth.uid())
  or app.is_hod_of(id)
  or app.is_active_mentor_of(id)
  or (role in ('MENTOR', 'HOD') and department_id = app.current_department())
);
-- Column grants below restrict self-updates to preferences / last_seen_at.
create policy users_self_update on public.users for update to authenticated
  using (id = (select auth.uid()) and (select app.current_role()) is not null)
  with check (id = (select auth.uid()));
revoke insert, update, delete on public.users from authenticated;
grant update (preferences, last_seen_at) on public.users to authenticated;

-- ───────────────────────────── profiles ─────────────────────────────
create policy student_profiles_read on public.student_profiles for select to authenticated
  using (app.can_view_student(user_id) or (user_id = (select auth.uid())));
create policy student_profiles_self_insert on public.student_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE');
create policy student_profiles_update on public.student_profiles for update to authenticated
  using ((user_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE') or app.is_hod_of(user_id))
  with check ((user_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE') or app.is_hod_of(user_id));

create policy mentor_profiles_read on public.mentor_profiles for select to authenticated
  using (user_id = (select auth.uid()) or app.user_department(user_id) = app.current_department());
create policy mentor_profiles_self_insert on public.mentor_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and (select app.current_role()) = 'MENTOR');
create policy mentor_profiles_update on public.mentor_profiles for update to authenticated
  using ((user_id = (select auth.uid()) and (select app.current_role()) = 'MENTOR') or app.is_hod_of(user_id))
  with check ((user_id = (select auth.uid()) and (select app.current_role()) = 'MENTOR') or app.is_hod_of(user_id));

create policy hod_profiles_read on public.hod_profiles for select to authenticated
  using (user_id = (select auth.uid()) or app.user_department(user_id) = app.current_department());
create policy hod_profiles_self_write on public.hod_profiles for all to authenticated
  using (user_id = (select auth.uid()) and app.is_hod())
  with check (user_id = (select auth.uid()) and app.is_hod());

-- ───────────────────────────── assignments ─────────────────────────────
-- Read-only through RLS. Writes happen only via the audited assign_students() RPC.
create policy mentor_assignments_read on public.mentor_assignments for select to authenticated using (
  app.is_hod_of(student_id)
  or (mentor_id = (select auth.uid()) and ended_at is null and (select app.current_role()) = 'MENTOR')
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
);
revoke insert, update, delete on public.mentor_assignments from authenticated;

-- ───────────────────────────── grading & subjects ─────────────────────────────
create policy grading_schemes_read on public.grading_schemes for select to authenticated
  using (department_id = app.current_department());
create policy grading_schemes_hod_write on public.grading_schemes for all to authenticated
  using (app.is_hod() and department_id = app.current_department())
  with check (app.is_hod() and department_id = app.current_department());

create policy subjects_read on public.subjects for select to authenticated
  using (department_id = app.current_department());
-- Anyone active in the department can propose a subject; only HOD-created ones start verified.
create policy subjects_insert on public.subjects for insert to authenticated with check (
  department_id = app.current_department() and created_by = (select auth.uid())
  and (is_verified = false or app.is_hod())
);
create policy subjects_update on public.subjects for update to authenticated
  using (department_id = app.current_department() and (app.is_hod() or (created_by = (select auth.uid()) and not is_verified)))
  with check (department_id = app.current_department() and (app.is_hod() or not is_verified));
create policy subjects_delete on public.subjects for delete to authenticated
  using (department_id = app.current_department() and app.is_hod());

-- ───────────────────────────── academic records ─────────────────────────────
-- Status transitions are enforced by trigger app.enforce_semester_transition (see triggers migration).
create policy academic_semesters_read on public.academic_semesters for select to authenticated
  using (app.can_view_student(student_id));
create policy academic_semesters_insert on public.academic_semesters for insert to authenticated with check (
  status = 'DRAFT' and (
    (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE') or app.is_hod_of(student_id)
  )
);
create policy academic_semesters_update on public.academic_semesters for update to authenticated
  using (app.can_view_student(student_id)) with check (app.can_view_student(student_id));
create policy academic_semesters_delete on public.academic_semesters for delete to authenticated using (
  status = 'DRAFT' and ((student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE') or app.is_hod_of(student_id))
);

-- Results are writable only while the parent semester is DRAFT (trigger also enforces the lock).
create policy results_read on public.student_subject_results for select to authenticated
  using (app.can_view_student(app.semester_student(academic_semester_id)));
create policy results_write on public.student_subject_results for all to authenticated
  using (
    app.semester_status(academic_semester_id) = 'DRAFT' and (
      (app.semester_student(academic_semester_id) = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
      or app.is_hod_of(app.semester_student(academic_semester_id))
    )
  )
  with check (
    app.semester_status(academic_semester_id) = 'DRAFT' and (
      (app.semester_student(academic_semester_id) = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
      or app.is_hod_of(app.semester_student(academic_semester_id))
    )
  );

create policy summaries_read on public.semester_summaries for select to authenticated
  using (app.can_view_student(app.semester_student(academic_semester_id)));
create policy summaries_write on public.semester_summaries for all to authenticated
  using (
    (app.semester_student(academic_semester_id) = (select auth.uid()) and (select app.current_role()) = 'MENTEE'
      and app.semester_status(academic_semester_id) = 'DRAFT')
    or app.is_active_mentor_of(app.semester_student(academic_semester_id))
    or app.is_hod_of(app.semester_student(academic_semester_id))
  )
  with check (
    (app.semester_student(academic_semester_id) = (select auth.uid()) and (select app.current_role()) = 'MENTEE'
      and app.semester_status(academic_semester_id) = 'DRAFT')
    or app.is_active_mentor_of(app.semester_student(academic_semester_id))
    or app.is_hod_of(app.semester_student(academic_semester_id))
  );

create policy change_requests_read on public.record_change_requests for select to authenticated
  using (app.can_view_student(student_id));
create policy change_requests_insert on public.record_change_requests for insert to authenticated with check (
  created_by = (select auth.uid()) and status = 'PENDING'
  and app.semester_student(academic_semester_id) = student_id
  and app.semester_status(academic_semester_id) in ('VERIFIED', 'FINALIZED')
  and ((student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE') or app.is_hod_of(student_id))
);
revoke update, delete on public.record_change_requests from authenticated;

-- ───────────────────────────── mentoring ─────────────────────────────
-- PRIVATE_MENTOR notes: visible only to the authoring mentor (while active) and the HOD. Never to the student.
create policy recommendations_read on public.mentor_recommendations for select to authenticated using (
  (student_id = (select auth.uid()) and visibility = 'SHARED' and (select app.current_role()) = 'MENTEE')
  or (app.is_active_mentor_of(student_id) and (visibility = 'SHARED' or mentor_id = (select auth.uid())))
  or app.is_hod_of(student_id)
);
create policy recommendations_insert on public.mentor_recommendations for insert to authenticated
  with check (mentor_id = (select auth.uid()) and app.is_active_mentor_of(student_id));
-- Students may update their own shared goals/action points; column limits enforced by trigger.
create policy recommendations_update on public.mentor_recommendations for update to authenticated using (
  (app.is_active_mentor_of(student_id) and (visibility = 'SHARED' or mentor_id = (select auth.uid())))
  or (student_id = (select auth.uid()) and visibility = 'SHARED' and (select app.current_role()) = 'MENTEE')
) with check (
  app.is_active_mentor_of(student_id)
  or (student_id = (select auth.uid()) and visibility = 'SHARED' and (select app.current_role()) = 'MENTEE')
);
create policy recommendations_delete on public.mentor_recommendations for delete to authenticated
  using (mentor_id = (select auth.uid()) and app.is_active_mentor_of(student_id));

create policy rec_history_read on public.recommendation_status_history for select to authenticated using (
  exists (select 1 from public.mentor_recommendations r where r.id = recommendation_id)
);
revoke insert, update, delete on public.recommendation_status_history from authenticated;

create policy resources_read on public.learning_resources for select to authenticated using (
  (mentor_id = (select auth.uid()) and (student_id is null or app.is_active_mentor_of(student_id)))
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
  or (student_id is null and app.is_my_active_mentor(mentor_id))
  or app.is_hod_of(mentor_id)
);
create policy resources_insert on public.learning_resources for insert to authenticated with check (
  mentor_id = (select auth.uid()) and (select app.current_role()) = 'MENTOR'
  and (student_id is null or app.is_active_mentor_of(student_id))
);
create policy resources_update on public.learning_resources for update to authenticated
  using (mentor_id = (select auth.uid()) and (student_id is null or app.is_active_mentor_of(student_id)))
  with check (mentor_id = (select auth.uid()) and (student_id is null or app.is_active_mentor_of(student_id)));
create policy resources_delete on public.learning_resources for delete to authenticated
  using (mentor_id = (select auth.uid()) and (student_id is null or app.is_active_mentor_of(student_id)));

create policy sessions_read on public.mentoring_sessions for select to authenticated using (
  (mentor_id = (select auth.uid()) and (student_id is null or app.is_active_mentor_of(student_id)))
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
  or (student_id is null and app.is_my_active_mentor(mentor_id))
  or app.is_hod_of(mentor_id)
);
create policy sessions_write on public.mentoring_sessions for all to authenticated
  using (mentor_id = (select auth.uid()) and (select app.current_role()) = 'MENTOR' and (student_id is null or app.is_active_mentor_of(student_id)))
  with check (mentor_id = (select auth.uid()) and (select app.current_role()) = 'MENTOR' and (student_id is null or app.is_active_mentor_of(student_id)));

create policy ai_summaries_read on public.ai_summaries for select to authenticated using (
  app.is_active_mentor_of(student_id) or app.is_hod_of(student_id)
  or (student_id = (select auth.uid()) and status = 'APPROVED' and (select app.current_role()) = 'MENTEE')
);
create policy ai_summaries_mentor_write on public.ai_summaries for all to authenticated
  using (app.is_active_mentor_of(student_id)) with check (app.is_active_mentor_of(student_id));

create policy followups_read on public.intervention_followups for select to authenticated
  using (app.is_hod_of(student_id) or (mentor_id = (select auth.uid()) and app.is_active_mentor_of(student_id)));
create policy followups_hod_insert on public.intervention_followups for insert to authenticated
  with check (app.is_hod_of(student_id) and requested_by = (select auth.uid()));
create policy followups_update on public.intervention_followups for update to authenticated
  using (app.is_hod_of(student_id) or (mentor_id = (select auth.uid()) and app.is_active_mentor_of(student_id)))
  with check (app.is_hod_of(student_id) or (mentor_id = (select auth.uid()) and app.is_active_mentor_of(student_id)));

-- ───────────────────────────── notifications & views ─────────────────────────────
create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_own_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert on public.notifications from authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy content_views_own on public.content_views for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────────────────────────── audit (insert-only) ─────────────────────────────
create policy audit_hod_read on public.audit_logs for select to authenticated using (
  app.is_hod() and (actor_id is null or app.user_department(actor_id) = app.current_department())
);
create policy audit_self_insert on public.audit_logs for insert to authenticated
  with check (actor_id = (select auth.uid()) and (select app.current_role()) is not null);
revoke update, delete, truncate on public.audit_logs from authenticated, service_role;

-- ───────────────────────────── settings & admin ─────────────────────────────
create policy risk_thresholds_read on public.risk_thresholds for select to authenticated
  using (department_id = app.current_department());
create policy risk_thresholds_hod_write on public.risk_thresholds for all to authenticated
  using (app.is_hod() and department_id = app.current_department())
  with check (app.is_hod() and department_id = app.current_department());

create policy app_settings_read on public.app_settings for select to authenticated
  using ((select app.current_role()) is not null);
create policy app_settings_hod_write on public.app_settings for all to authenticated
  using (app.is_hod()) with check (app.is_hod());

create policy import_jobs_hod on public.import_jobs for all to authenticated
  using (app.is_hod() and created_by = (select auth.uid()))
  with check (app.is_hod() and created_by = (select auth.uid()));
