-- Removes the college-size load fixture (DEV ONLY). Replica mode skips audit triggers but also FK cascades,
-- so every table is cleaned explicitly, children first.
\set ON_ERROR_STOP 1
begin;
set local session_replication_role = replica;
create temp table load_ids as select id from public.users where email like '%@load.mentora.test';
create temp table load_sems as select id from public.academic_semesters where student_id in (select id from load_ids);
delete from public.student_subject_results where academic_semester_id in (select id from load_sems);
delete from public.semester_summaries where academic_semester_id in (select id from load_sems);
delete from public.academic_semesters where id in (select id from load_sems);
delete from public.mentor_assignments where mentor_id in (select id from load_ids) or student_id in (select id from load_ids);
delete from public.notifications where user_id in (select id from load_ids);
delete from public.student_profiles where user_id in (select id from load_ids);
delete from public.mentor_profiles where user_id in (select id from load_ids);
delete from public.users where id in (select id from load_ids);
delete from auth.users where email like '%@load.mentora.test';
delete from public.subjects where name like '% load subject %';
commit;
analyze;
select (select count(*) from public.users where email like '%@load.mentora.test') as load_users_left;
