-- Self sign-up: a new auth user created through the app's /signup page becomes an ACTIVE MENTEE.
-- The role is fixed here (never taken from client data), so sign-up can never grant MENTOR/HOD.
-- Invited accounts (created by the HOD with the service role) carry no `signup` marker and are untouched.
-- The HOD can turn sign-up off with app_settings key `self_signup` = false.
create or replace function app.handle_self_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
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
  select id into v_dept from public.departments order by created_at limit 1;
  if v_dept is null then
    raise exception 'Mentora is not set up yet' using errcode = 'P0001';
  end if;

  insert into public.users (id, email, role, status, department_id)
  values (new.id, lower(new.email), 'MENTEE', 'ACTIVE', v_dept);
  insert into public.student_profiles (user_id, full_name)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''))
  on conflict (user_id) do nothing;
  return new;
end $$;
revoke execute on function app.handle_self_signup() from public, anon, authenticated;

drop trigger if exists on_auth_user_self_signup on auth.users;
create trigger on_auth_user_self_signup after insert on auth.users
  for each row execute function app.handle_self_signup();
