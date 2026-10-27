-- Multi-branch S9 perf (college-size fixture): read policies evaluated SECURITY DEFINER helpers per row
-- (HOD reading results: 42 s). Same rules, rewritten so every helper runs ONCE per query as an initplan:
--   my_mentees()  → the caller's active, same-branch mentees (empty unless MENTOR)
--   my_mentor()   → the caller's active mentor (null unless MENTEE)
--   results/summaries/history inherit the semester's / recommendation's policy through EXISTS.
-- Semantics are unchanged; tests/rls/matrix.test.ts proves it for every actor × table × branch.

create or replace function app.my_mentees() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(a.student_id), '{}'::uuid[])
    from public.mentor_assignments a
    join public.users s on s.id = a.student_id
    join public.users m on m.id = a.mentor_id
   where a.mentor_id = (select auth.uid()) and a.ended_at is null and s.department_id = m.department_id
     and coalesce((select app.current_role()) = 'MENTOR', false)
$$;

create or replace function app.my_mentor() returns uuid
language sql stable security definer set search_path = '' as $$
  select a.mentor_id from public.mentor_assignments a
   where a.student_id = (select auth.uid()) and a.ended_at is null
     and coalesce((select app.current_role()) = 'MENTEE', false)
$$;

grant execute on function app.my_mentees(), app.my_mentor() to authenticated, service_role;
revoke execute on function app.my_mentees(), app.my_mentor() from anon;

-- ───────────────────────────── people ─────────────────────────────
drop policy users_read on public.users;
create policy users_read on public.users for select to authenticated using (
  id = (select auth.uid())
  or (select app.is_principal())
  or department_id = (select app.hod_department())
  or id = any ((select app.my_mentees())::uuid[])
  or (role in ('MENTOR', 'HOD') and department_id = (select app.current_department()))
  or (role = 'PRINCIPAL' and (select app.has_scope()))
);

drop policy student_profiles_read on public.student_profiles;
create policy student_profiles_read on public.student_profiles for select to authenticated using (
  user_id = (select auth.uid())
  or (select app.is_principal())
  or user_id = any ((select app.my_mentees())::uuid[])
  or exists (select 1 from public.users u where u.id = user_id and u.department_id = (select app.hod_department()))
);

-- ───────────────────────────── academic records ─────────────────────────────
drop policy academic_semesters_read on public.academic_semesters;
create policy academic_semesters_read on public.academic_semesters for select to authenticated using (
  (select app.is_principal())
  or department_id = (select app.hod_department())
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
  or student_id = any ((select app.my_mentees())::uuid[])
);

-- A result/summary is readable exactly when its semester is (the semester's own policy applies inside EXISTS).
drop policy results_read on public.student_subject_results;
create policy results_read on public.student_subject_results for select to authenticated
  using (exists (select 1 from public.academic_semesters s where s.id = academic_semester_id));
drop policy summaries_read on public.semester_summaries;
create policy summaries_read on public.semester_summaries for select to authenticated
  using (exists (select 1 from public.academic_semesters s where s.id = academic_semester_id));

drop policy change_requests_read on public.record_change_requests;
create policy change_requests_read on public.record_change_requests for select to authenticated using (
  (select app.is_principal())
  or department_id = (select app.hod_department())
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
  or student_id = any ((select app.my_mentees())::uuid[])
);

-- ───────────────────────────── mentoring ─────────────────────────────
drop policy recommendations_read on public.mentor_recommendations;
create policy recommendations_read on public.mentor_recommendations for select to authenticated using (
  (student_id = (select auth.uid()) and visibility = 'SHARED' and (select app.current_role()) = 'MENTEE')
  or (student_id = any ((select app.my_mentees())::uuid[]) and (visibility = 'SHARED' or mentor_id = (select auth.uid())))
  or department_id = (select app.hod_department())
  or ((select app.is_principal()) and visibility = 'SHARED')
);

drop policy resources_read on public.learning_resources;
create policy resources_read on public.learning_resources for select to authenticated using (
  (mentor_id = (select auth.uid()) and (student_id is null or student_id = any ((select app.my_mentees())::uuid[])))
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
  or (student_id is null and mentor_id = (select app.my_mentor()))
  or department_id = (select app.hod_department())
  or (select app.is_principal())
);

drop policy sessions_read on public.mentoring_sessions;
create policy sessions_read on public.mentoring_sessions for select to authenticated using (
  (mentor_id = (select auth.uid()) and (student_id is null or student_id = any ((select app.my_mentees())::uuid[])))
  or (student_id = (select auth.uid()) and (select app.current_role()) = 'MENTEE')
  or (student_id is null and mentor_id = (select app.my_mentor()))
  or department_id = (select app.hod_department())
  or (select app.is_principal())
);

drop policy followups_read on public.intervention_followups;
create policy followups_read on public.intervention_followups for select to authenticated using (
  (select app.is_principal())
  or department_id = (select app.hod_department())
  or (mentor_id = (select auth.uid()) and student_id = any ((select app.my_mentees())::uuid[]))
);

drop policy ai_summaries_read on public.ai_summaries;
create policy ai_summaries_read on public.ai_summaries for select to authenticated using (
  student_id = any ((select app.my_mentees())::uuid[])
  or exists (select 1 from public.users u where u.id = student_id and u.department_id = (select app.hod_department()))
  or (student_id = (select auth.uid()) and status = 'APPROVED' and (select app.current_role()) = 'MENTEE')
);

drop policy rec_history_read on public.recommendation_status_history;
create policy rec_history_read on public.recommendation_status_history for select to authenticated
  using (exists (select 1 from public.mentor_recommendations r where r.id = recommendation_id));

-- Supporting indexes for the EXISTS joins and branch filters.
create index if not exists users_department_role_status_idx on public.users (department_id, role, status);
create index if not exists student_subject_results_semester_idx on public.student_subject_results (academic_semester_id);
create index if not exists academic_semesters_student_idx on public.academic_semesters (student_id, semester_no);
