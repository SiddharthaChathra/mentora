-- College-size load fixture (DEV ONLY): 8 branches × 400 students × 4 semesters × 6 subjects, 25 mentors per branch.
-- Run:   docker exec -i supabase_db_mentora psql -U postgres -v ON_ERROR_STOP=1 < tests/fixtures/load.seed.sql
-- Clean: docker exec -i supabase_db_mentora psql -U postgres -v ON_ERROR_STOP=1 < tests/fixtures/load.clean.sql
-- Rows are written directly (replica mode, no audit/notification triggers), so scoping columns are set explicitly.
\set ON_ERROR_STOP 1
begin;
set local session_replication_role = replica;

create temp table load_branch as
select d.id, d.code, row_number() over (order by d.display_order, d.code) as n
  from public.departments d where d.status = 'ACTIVE' order by d.display_order, d.code limit 8;

-- Subjects: 4 semesters × 6 per branch.
insert into public.subjects (department_id, code, name, credits, semester, mse_max, see_max, is_verified)
select b.id, 'L' || b.code || s || lpad(k::text, 2, '0'), b.code || ' load subject ' || s || '.' || k, 4, s, 50, 100, true
  from load_branch b, generate_series(1, 4) s, generate_series(1, 6) k
on conflict (department_id, code) do nothing;

-- People (auth.users first: public.users references it).
create temp table load_people as
select gen_random_uuid() as id, b.id as dept, b.code, 'MENTOR'::public.user_role as role, m as n,
       'load.' || lower(b.code) || '.m' || m || '@load.mentora.test' as email
  from load_branch b, generate_series(1, 25) m
union all
select gen_random_uuid(), b.id, b.code, 'MENTEE'::public.user_role, s,
       'load.' || lower(b.code) || '.s' || s || '@load.mentora.test'
  from load_branch b, generate_series(1, 400) s;

-- GoTrue scans these token columns as strings: they must be '' (not NULL) or admin user listing breaks.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}',
  '', '', '', '', '', '', '', ''
  from load_people;

insert into public.users (id, email, role, status, department_id, onboarding_completed_at, created_at)
select id, email, role, 'ACTIVE', dept, now() - interval '200 days', now() - interval '300 days' from load_people;

insert into public.mentor_profiles (user_id, full_name, designation, capacity)
select id, 'Load Mentor ' || code || ' ' || n, 'Assistant Professor', 20 from load_people where role = 'MENTOR';

insert into public.student_profiles (user_id, full_name, usn, current_semester, program, admission_year, profile_completion)
select id, 'Load Student ' || code || ' ' || n, 'LD23' || code || lpad(n::text, 4, '0'), 5, 'B.E.', 2023, case when n % 9 = 0 then 40 else 90 end
  from load_people where role = 'MENTEE';

-- 90% of students assigned, spread over the branch's 25 mentors.
insert into public.mentor_assignments (mentor_id, student_id, department_id, reason)
select m.id, s.id, s.dept, 'load fixture'
  from load_people s
  join load_people m on m.role = 'MENTOR' and m.dept = s.dept and m.n = 1 + (s.n % 25)
 where s.role = 'MENTEE' and s.n % 10 <> 0;

-- Four semesters each: 1–2 FINALIZED, 3 VERIFIED, 4 SUBMITTED.
create temp table load_sem as
select gen_random_uuid() as id, p.id as student, p.dept, p.n, s as sem
  from load_people p, generate_series(1, 4) s where p.role = 'MENTEE';

insert into public.academic_semesters (id, student_id, department_id, semester_no, academic_year, status, submitted_at, verified_at, finalized_at)
select id, student, dept, sem, (2022 + (sem + 1) / 2) || '-' || lpad(((23 + (sem + 1) / 2) % 100)::text, 2, '0'),
       (case when sem <= 2 then 'FINALIZED' when sem = 3 then 'VERIFIED' else 'SUBMITTED' end)::public.semester_status,
       now(), case when sem <= 3 then now() end, case when sem <= 2 then now() end
  from load_sem;

insert into public.student_subject_results (academic_semester_id, subject_id, attempt, credits, mse_marks, mse_max, see_marks, see_max, result)
select ls.id, sub.id, 1, 4,
       15 + ((ls.n * 7 + ls.sem * 3 + right(sub.code, 1)::int) % 35), 50,
       30 + ((ls.n * 11 + ls.sem * 5 + right(sub.code, 1)::int * 3) % 70), 100,
       (case when (ls.n + ls.sem) % 23 = 0 and right(sub.code, 1) = '2' then 'FAIL' else 'PASS' end)::public.subject_result
  from load_sem ls
  join load_branch b on b.id = ls.dept
  join public.subjects sub on sub.department_id = ls.dept and sub.semester = ls.sem and sub.code like 'L' || b.code || '%';

insert into public.semester_summaries (academic_semester_id, sgpa, credits_registered, credits_earned, computed)
select id, round((5.5 + ((n * 13 + sem * 7) % 40) / 10.0)::numeric, 2), 24, 24, true from load_sem;

commit;
analyze;
select (select count(*) from public.users where email like '%@load.mentora.test') as load_users,
       (select count(*) from public.academic_semesters a join public.users u on u.id = a.student_id where u.email like '%@load.mentora.test') as load_semesters;
