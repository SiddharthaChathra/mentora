-- Multi-branch S8: small Principal-only helpers.

-- A new branch starts with sections A–C (sections are otherwise managed by the branch HOD).
create or replace function public.seed_branch_sections(p_department uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_principal() then raise exception 'Only the Principal can set up a branch' using errcode = '42501'; end if;
  insert into public.sections (department_id, name)
  select p_department, s from unnest(array['A', 'B', 'C']) s
  on conflict (department_id, name) do nothing;
end $$;

-- "Notify HOD" from the Principal's interventions view. Returns how many people were notified (0 when the branch has no HOD).
create or replace function public.notify_branch_hod(p_department uuid, p_title text, p_body text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_head uuid := app.branch_head(p_department);
begin
  if not app.is_principal() then raise exception 'Only the Principal can do this' using errcode = '42501'; end if;
  if v_head is null then return 0; end if;
  perform app.notify(v_head, 'intervention.principal', left(p_title, 200), left(coalesce(p_body, ''), 500), '/hod/interventions', 'department', p_department);
  return 1;
end $$;

grant execute on function public.seed_branch_sections(uuid), public.notify_branch_hod(uuid, text, text) to authenticated;
revoke execute on function public.seed_branch_sections(uuid), public.notify_branch_hod(uuid, text, text) from anon, public;

-- Audit scope is derived from the record, never trusted from a client insert (only the Principal may label a row,
-- e.g. a college export narrowed to one branch).
create or replace function app.fill_audit_department() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := coalesce(new.after, new.before, '{}'::jsonb);
begin
  if new.department_id is not null and app.is_principal() then return new; end if;
  new.department_id := coalesce(
    app.safe_uuid(r ->> 'department_id'),
    app.safe_uuid(r ->> 'from_department_id'),
    case when new.entity_type = 'departments' then app.safe_uuid(new.entity_id) end,
    case when new.entity_type in ('users', 'student_report') then app.user_department(app.safe_uuid(new.entity_id)) end,
    app.user_department(app.safe_uuid(r ->> 'student_id')),
    app.user_department(app.safe_uuid(r ->> 'user_id')),
    app.user_department(app.semester_student(app.safe_uuid(r ->> 'academic_semester_id'))),
    case when app.current_role() = 'HOD' then app.hod_department() end,
    app.user_department(new.actor_id)
  );
  return new;
end $$;
