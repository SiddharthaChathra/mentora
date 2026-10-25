-- Audit trail, record locking, workflow guards and notification triggers.

-- ───────────────────────────── Audit ─────────────────────────────
create or replace function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_after jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_after, v_before);
  v_id text := coalesce(v_row ->> 'id', v_row ->> 'academic_semester_id', v_row ->> 'user_id', v_row ->> 'key');
begin
  if tg_op = 'UPDATE' and v_before - 'updated_at' = v_after - 'updated_at' then
    return new;
  end if;
  -- Drafts are large and noisy; never audit them.
  v_before := v_before - 'draft';
  v_after := v_after - 'draft';
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after, ip, user_agent)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    v_id,
    v_before,
    v_after,
    split_part(coalesce(app.request_header('x-forwarded-for'), app.request_header('x-real-ip'), ''), ',', 1),
    left(app.request_header('user-agent'), 300)
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['academic_semesters','student_subject_results','semester_summaries','mentor_assignments',
    'mentor_recommendations','grading_schemes','app_settings','risk_thresholds','record_change_requests','subjects']
  loop
    execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function app.audit_row()', t);
  end loop;
end $$;

create trigger audit_user_role_status after update on public.users
  for each row when (old.role is distinct from new.role or old.status is distinct from new.status)
  execute function app.audit_row();
create trigger audit_user_insert after insert on public.users for each row execute function app.audit_row();

create or replace function app.audit_logs_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_logs is append-only' using errcode = '42501';
end $$;
create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function app.audit_logs_immutable();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
  for each statement execute function app.audit_logs_immutable();

-- ───────────────────────────── Users: last HOD protection ─────────────────────────────
create or replace function app.protect_last_hod() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'HOD' and old.status = 'ACTIVE' and (new.role <> 'HOD' or new.status <> 'ACTIVE') then
    if not exists (
      select 1 from public.users u
      where u.role = 'HOD' and u.status = 'ACTIVE' and u.id <> old.id and u.department_id = old.department_id
    ) then
      raise exception 'A department must keep at least one active HOD' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger protect_last_hod before update on public.users for each row execute function app.protect_last_hod();

-- ───────────────────────────── Academic record workflow ─────────────────────────────
-- app.allow_locked_edit is set (transaction-local) only inside approved change-request application.
create or replace function app.locked_edit_allowed() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(current_setting('app.allow_locked_edit', true), '') = 'on'
$$;

create or replace function app.enforce_semester_transition() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := app.current_role();
  v_uid uuid := (select auth.uid());
begin
  if app.locked_edit_allowed() or v_uid is null then
    return new; -- approved change request or trusted server-side job
  end if;
  if new.student_id <> old.student_id or new.semester_no <> old.semester_no then
    raise exception 'Semester identity cannot change' using errcode = '42501';
  end if;

  if v_role = 'MENTEE' then
    if old.status <> 'DRAFT' then
      raise exception 'This semester is % and locked. Request a correction instead.', lower(old.status::text) using errcode = '42501';
    end if;
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'Students can only save drafts or submit' using errcode = '42501';
    end if;
    new.verified_by := old.verified_by; new.verified_at := old.verified_at;
    new.finalized_by := old.finalized_by; new.finalized_at := old.finalized_at;
    new.return_note := case when new.status = 'SUBMITTED' then null else old.return_note end;
    if new.status = 'SUBMITTED' then new.submitted_at := now(); end if;
    return new;
  end if;

  if v_role = 'MENTOR' then
    if not app.is_active_mentor_of(old.student_id) then
      raise exception 'Not the active mentor of this student' using errcode = '42501';
    end if;
    if not ((old.status = 'SUBMITTED' and new.status in ('VERIFIED', 'DRAFT'))
         or (old.status = new.status and old.status = 'VERIFIED')) then
      raise exception 'Mentors can verify or return submitted semesters only' using errcode = '42501';
    end if;
    if (to_jsonb(new) - array['status','verified_by','verified_at','return_note','updated_at'])
       is distinct from (to_jsonb(old) - array['status','verified_by','verified_at','return_note','updated_at']) then
      raise exception 'Mentors cannot edit record contents directly' using errcode = '42501';
    end if;
    if new.status = 'VERIFIED' and old.status <> 'VERIFIED' then
      new.verified_by := v_uid; new.verified_at := now(); new.return_note := null;
    end if;
    return new;
  end if;

  if v_role = 'HOD' then
    if new.status = 'FINALIZED' and old.status <> 'FINALIZED' then
      if old.status not in ('VERIFIED', 'SUBMITTED') then
        raise exception 'Only submitted or verified semesters can be finalized' using errcode = '42501';
      end if;
      new.finalized_by := v_uid; new.finalized_at := now();
      if new.verified_at is null then new.verified_by := v_uid; new.verified_at := now(); end if;
    elsif new.status = 'VERIFIED' and old.status = 'SUBMITTED' then
      new.verified_by := v_uid; new.verified_at := now();
    elsif new.status = 'DRAFT' and old.status <> 'DRAFT' then
      new.verified_by := null; new.verified_at := null; new.finalized_by := null; new.finalized_at := null;
    elsif old.status in ('VERIFIED', 'FINALIZED') and new.status = old.status
       and (to_jsonb(new) - array['updated_at']) is distinct from (to_jsonb(old) - array['updated_at']) then
      raise exception 'Verified records change only through an approved change request' using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'Not allowed' using errcode = '42501';
end $$;
create trigger enforce_semester_transition before update on public.academic_semesters
  for each row execute function app.enforce_semester_transition();

-- Results of a non-draft semester are frozen (defence in depth on top of RLS).
create or replace function app.enforce_result_lock() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_sem uuid := coalesce(new.academic_semester_id, old.academic_semester_id);
begin
  if app.locked_edit_allowed() or (select auth.uid()) is null then
    return coalesce(new, old);
  end if;
  if app.semester_status(v_sem) <> 'DRAFT' then
    raise exception 'Results are locked once a semester is submitted' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.academic_semester_id <> old.academic_semester_id then
    raise exception 'Results cannot move between semesters' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger enforce_result_lock before insert or update or delete on public.student_subject_results
  for each row execute function app.enforce_result_lock();

-- ───────────────────────────── Recommendations ─────────────────────────────
create or replace function app.guard_recommendation_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if app.current_role() = 'MENTEE' then
    if old.kind not in ('GOAL', 'ACTION_POINT', 'RECOMMENDATION') then
      raise exception 'You can only update goals, action points and recommendations' using errcode = '42501';
    end if;
    -- A student may change status, tick steps (labels fixed) and write a reflection — nothing else.
    if (to_jsonb(new) - array['status','steps','reflection','updated_at'])
       is distinct from (to_jsonb(old) - array['status','steps','reflection','updated_at']) then
      raise exception 'Students cannot edit mentor-authored fields' using errcode = '42501';
    end if;
    if jsonb_array_length(new.steps) <> jsonb_array_length(old.steps) or exists (
      select 1 from jsonb_array_elements(new.steps) with ordinality n(v, i)
      join jsonb_array_elements(old.steps) with ordinality o(v, i) using (i)
      where n.v ->> 'id' is distinct from o.v ->> 'id' or n.v ->> 'label' is distinct from o.v ->> 'label'
    ) then
      raise exception 'Students cannot add or rename plan steps' using errcode = '42501';
    end if;
  elsif app.current_role() = 'MENTOR' then
    if new.student_id <> old.student_id then
      raise exception 'Cannot move a record to another student' using errcode = '42501';
    end if;
    if new.mentor_id <> old.mentor_id then
      new.mentor_id := old.mentor_id;
    end if;
  end if;
  return new;
end $$;
create trigger guard_recommendation_update before update on public.mentor_recommendations
  for each row execute function app.guard_recommendation_update();

create or replace function app.track_recommendation_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.recommendation_status_history (recommendation_id, from_status, to_status, changed_by)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, (select auth.uid()));
  end if;
  return new;
end $$;
create trigger track_recommendation_status after insert or update on public.mentor_recommendations
  for each row execute function app.track_recommendation_status();

-- ───────────────────────────── Notifications ─────────────────────────────
create or replace function app.notify(
  p_user uuid, p_type text, p_title text, p_body text, p_link text, p_entity_type text default null, p_entity_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (p_user, p_type, p_title, coalesce(p_body, ''), p_link, p_entity_type, p_entity_id);
end $$;
revoke execute on function app.notify(uuid, text, text, text, text, text, uuid) from public, authenticated, anon;

create or replace function app.display_name(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select full_name from public.mentor_profiles where user_id = p_user),
    (select full_name from public.student_profiles where user_id = p_user),
    (select full_name from public.hod_profiles where user_id = p_user),
    (select split_part(email::text, '@', 1) from public.users where id = p_user)
  )
$$;

create or replace function app.active_mentor_of(p_student uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select mentor_id from public.mentor_assignments where student_id = p_student and ended_at is null
$$;

create or replace function app.on_recommendation_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_label text := case new.kind
    when 'FEEDBACK' then 'feedback' when 'GOAL' then 'goal' when 'ACTION_POINT' then 'action point'
    when 'STRENGTH' then 'strength note' when 'IMPROVEMENT_AREA' then 'improvement area' else 'recommendation' end;
begin
  if new.visibility <> 'SHARED' then return new; end if;
  if tg_op = 'INSERT' then
    perform app.notify(new.student_id, 'recommendation.new',
      'New ' || v_label || ' from ' || coalesce(app.display_name(new.mentor_id), 'your mentor'),
      new.title, '/mentee/mentoring?item=' || new.id, 'recommendation', new.id);
  elsif old.status is distinct from new.status then
    if app.current_role() = 'MENTEE' then
      perform app.notify(new.mentor_id, 'recommendation.status',
        coalesce(app.display_name(new.student_id), 'A mentee') || ' marked “' || new.title || '” ' || replace(lower(new.status::text), '_', ' '),
        '', '/mentor/mentees/' || new.student_id || '?tab=mentoring', 'recommendation', new.id);
    else
      perform app.notify(new.student_id, 'recommendation.status',
        '“' || new.title || '” is now ' || replace(lower(new.status::text), '_', ' '),
        '', '/mentee/mentoring?item=' || new.id, 'recommendation', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger on_recommendation_change after insert or update on public.mentor_recommendations
  for each row execute function app.on_recommendation_change();

create or replace function app.on_resource_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_student uuid;
begin
  for v_student in
    select new.student_id where new.student_id is not null
    union all
    select a.student_id from public.mentor_assignments a
    where new.student_id is null and a.mentor_id = new.mentor_id and a.ended_at is null
  loop
    perform app.notify(v_student, 'resource.new', 'New study material: ' || new.title,
      coalesce(app.display_name(new.mentor_id), 'Your mentor') || ' shared a resource with you.',
      '/mentee/resources?item=' || new.id, 'resource', new.id);
  end loop;
  return new;
end $$;
create trigger on_resource_insert after insert on public.learning_resources
  for each row execute function app.on_resource_insert();

create or replace function app.on_session_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid;
  v_title text;
begin
  if tg_op = 'INSERT' then
    v_title := 'Mentoring session scheduled';
  elsif new.status = 'CANCELLED' and old.status <> 'CANCELLED' then
    v_title := 'Mentoring session cancelled';
  elsif new.status = 'COMPLETED' and old.status <> 'COMPLETED' then
    v_title := 'Session summary and action items are ready';
  elsif new.scheduled_at <> old.scheduled_at or new.location_or_link is distinct from old.location_or_link then
    v_title := 'Mentoring session updated';
  else
    return new;
  end if;
  for v_student in
    select new.student_id where new.student_id is not null
    union all
    select a.student_id from public.mentor_assignments a
    where new.student_id is null and a.mentor_id = new.mentor_id and a.ended_at is null
  loop
    perform app.notify(v_student, 'session.' || lower(tg_op), v_title,
      to_char(new.scheduled_at at time zone 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM'),
      '/mentee/sessions?item=' || new.id, 'session', new.id);
  end loop;
  return new;
end $$;
create trigger on_session_change after insert or update on public.mentoring_sessions
  for each row execute function app.on_session_change();

create or replace function app.on_semester_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = new.status then return new; end if;
  if new.status = 'SUBMITTED' then
    perform app.notify(app.active_mentor_of(new.student_id), 'record.submitted',
      coalesce(app.display_name(new.student_id), 'A mentee') || ' submitted semester ' || new.semester_no || ' for verification',
      '', '/mentor/verifications', 'semester', new.id);
  elsif new.status = 'VERIFIED' then
    perform app.notify(new.student_id, 'record.verified', 'Semester ' || new.semester_no || ' has been verified',
      'Your records are now locked. Use “Request correction” if anything is wrong.', '/mentee/academics/' || new.semester_no, 'semester', new.id);
  elsif new.status = 'FINALIZED' then
    perform app.notify(new.student_id, 'record.finalized', 'Semester ' || new.semester_no || ' has been finalized',
      '', '/mentee/academics/' || new.semester_no, 'semester', new.id);
  elsif new.status = 'DRAFT' then
    perform app.notify(new.student_id, 'record.returned', 'Semester ' || new.semester_no || ' was returned for changes',
      coalesce(new.return_note, ''), '/mentee/academics/' || new.semester_no, 'semester', new.id);
  end if;
  return new;
end $$;
create trigger on_semester_status after update on public.academic_semesters
  for each row execute function app.on_semester_status();

create or replace function app.on_change_request_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.notify(app.active_mentor_of(new.student_id), 'change_request.new',
    coalesce(app.display_name(new.student_id), 'A mentee') || ' requested a record correction',
    new.reason, '/mentor/verifications?tab=corrections', 'change_request', new.id);
  return new;
end $$;
create trigger on_change_request_insert after insert on public.record_change_requests
  for each row execute function app.on_change_request_insert();

create or replace function app.on_followup_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.notify(new.mentor_id, 'intervention.followup',
    'Follow-up requested for ' || coalesce(app.display_name(new.student_id), 'a mentee'),
    new.note, '/mentor/mentees/' || new.student_id, 'followup', new.id);
  return new;
end $$;
create trigger on_followup_insert after insert on public.intervention_followups
  for each row execute function app.on_followup_insert();
