-- Let a signed-in user see and revoke ONLY their own auth sessions (account page).
create or replace function public.my_sessions()
returns table (id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, ip text, current boolean)
language sql stable security definer set search_path = '' as $$
  select s.id, s.created_at, s.updated_at, s.user_agent, host(s.ip), s.id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
  from auth.sessions s
  where s.user_id = (select auth.uid())
  order by s.updated_at desc nulls last
  limit 20
$$;

create or replace function public.revoke_my_session(p_session uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.sessions where id = p_session and user_id = (select auth.uid());
end $$;

grant execute on function public.my_sessions(), public.revoke_my_session(uuid) to authenticated;
revoke execute on function public.my_sessions(), public.revoke_my_session(uuid) from anon, public;
