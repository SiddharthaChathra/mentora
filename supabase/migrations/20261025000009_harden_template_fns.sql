-- Newer Supabase projects ship a SECURITY DEFINER helper (public.rls_auto_enable) callable through the API.
-- It is not part of Mentora; keep it unreachable from client roles.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
