-- Multi-branch S9 fix (found by the scoping matrix): an HOD whose appointment ended still has an ACTIVE account,
-- so "any active account" checks let them read the Principal's user/profile rows. Those rows are now visible only
-- to people who currently hold a scope (a branch, or the Principal).
create or replace function app.has_scope() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select app.is_principal()) or (select app.current_department()) is not null
$$;
grant execute on function app.has_scope() to authenticated, service_role;
revoke execute on function app.has_scope() from anon;

drop policy users_read on public.users;
create policy users_read on public.users for select to authenticated using (
  id = (select auth.uid())
  or (select app.is_principal())
  or app.is_hod_of(id)
  or app.is_active_mentor_of(id)
  or (role in ('MENTOR', 'HOD') and department_id = (select app.current_department()))
  or (role = 'PRINCIPAL' and (select app.has_scope()))
);

drop policy hod_profiles_read on public.hod_profiles;
create policy hod_profiles_read on public.hod_profiles for select to authenticated using (
  user_id = (select auth.uid()) or (select app.is_principal())
  or app.user_department(user_id) = (select app.current_department())
  or (app.user_department(user_id) is null and (select app.has_scope()))
);
