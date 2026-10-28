-- Sign-up UX: Supabase Auth hides trigger messages behind "Database error saving new user", so the sign-up form
-- asks this first. It answers only rule questions (sign-up open? right domain? USN shape? known branch code?) and
-- never whether an account or USN already exists, so it can't be used to probe accounts.
create or replace function public.signup_email_problem(p_email text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_local text := lower(split_part(coalesce(p_email, ''), '@', 1));
  v_domain text := lower(split_part(coalesce(p_email, ''), '@', 2));
  v_required text := lower(coalesce((select value #>> '{}' from public.app_settings where key = 'student_email_domain'), ''));
  m text[];
begin
  if coalesce((select value from public.app_settings where key = 'self_signup'), 'true'::jsonb) = 'false'::jsonb then
    return 'Sign-up is turned off. Ask your HOD for an invitation.';
  end if;
  if v_required <> '' and v_domain <> v_required then
    return format('Use your college email address (…@%s).', v_required);
  end if;
  m := regexp_match(v_local, '^([a-z]{1,4})([0-9]{2})([a-z]{2,3})([0-9]{3})$');
  if m is null then
    return 'Sign up with your USN email, for example nnm23cs001@… — the part before @ must be your USN.';
  end if;
  if not exists (select 1 from public.departments where usn_code = m[3] and status = 'ACTIVE') then
    return format('The branch code "%s" in your USN isn’t set up in Mentora yet. Ask your HOD for an invitation.', m[3]);
  end if;
  return null;
end $$;
revoke execute on function public.signup_email_problem(text) from public;
grant execute on function public.signup_email_problem(text) to anon, authenticated;
