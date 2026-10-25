-- Transactional bulk imports (HOD only). Each call commits all rows or none.

create or replace function public.import_subjects(p_rows jsonb, p_update boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  v_dept uuid := app.current_department();
  v_ins int := 0; v_upd int := 0; v_skip int := 0;
  v_exists boolean;
begin
  if not app.is_hod() then raise exception 'Only the HOD can import' using errcode = '42501'; end if;
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

-- Results rows: { usn, semester_no, academic_year, subject_code, credits?, mse_marks, mse_max, see_marks, see_max, grade, grade_points, result }
-- Imported official results land as VERIFIED (HOD-verified). Existing verified/finalized semesters are never overwritten.
create or replace function public.import_results(p_rows jsonb, p_update boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  v_dept uuid := app.current_department();
  v_student uuid; v_subject uuid; v_credits numeric; v_sem uuid; v_status public.semester_status;
  v_existing uuid;
  v_ins int := 0; v_upd int := 0; v_skip int := 0;
  v_touched uuid[] := '{}';
begin
  if not app.is_hod() then raise exception 'Only the HOD can import' using errcode = '42501'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    select p.user_id into v_student from public.student_profiles p join public.users u on u.id = p.user_id
      where lower(p.usn) = lower(r ->> 'usn') and u.department_id = v_dept;
    if v_student is null then raise exception 'Row %: no student with USN %', r ->> '_row', r ->> 'usn' using errcode = 'P0001'; end if;
    select id, credits into v_subject, v_credits from public.subjects where department_id = v_dept and code = upper(r ->> 'subject_code');
    if v_subject is null then raise exception 'Row %: unknown subject code %', r ->> '_row', r ->> 'subject_code' using errcode = 'P0001'; end if;

    select id, status into v_sem, v_status from public.academic_semesters where student_id = v_student and semester_no = (r ->> 'semester_no')::smallint;
    if v_sem is null then
      insert into public.academic_semesters (student_id, semester_no, academic_year, status)
      values (v_student, (r ->> 'semester_no')::smallint, r ->> 'academic_year', 'DRAFT') returning id, status into v_sem, v_status;
    end if;
    if v_status in ('VERIFIED', 'FINALIZED') and not (v_sem = any(v_touched)) then
      v_skip := v_skip + 1; continue; -- locked records change only via correction requests
    end if;
    if v_status <> 'DRAFT' and not (v_sem = any(v_touched)) then
      update public.academic_semesters set status = 'DRAFT' where id = v_sem; -- HOD reopen for import
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

  -- Mark imported semesters as HOD-verified official results.
  update public.academic_semesters set status = 'SUBMITTED' where id = any(v_touched) and status = 'DRAFT';
  update public.academic_semesters set status = 'VERIFIED' where id = any(v_touched) and status = 'SUBMITTED';
  return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip, 'semesters', to_jsonb(v_touched));
end $$;

grant execute on function public.import_subjects(jsonb, boolean), public.import_results(jsonb, boolean) to authenticated;
revoke execute on function public.import_subjects(jsonb, boolean), public.import_results(jsonb, boolean) from anon, public;
