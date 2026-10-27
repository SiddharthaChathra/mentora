-- Multi-branch S9: read-only policy inventory for the policy lint test (service role only).
create or replace function public.policy_inventory()
returns table (schemaname text, tablename text, policyname text, cmd text, qual text, with_check text)
language sql stable security definer set search_path = '' as $$
  select p.schemaname::text, p.tablename::text, p.policyname::text, p.cmd::text, p.qual::text, p.with_check::text
    from pg_catalog.pg_policies p
   where p.schemaname in ('public', 'storage')
   order by 1, 2, 3
$$;

create or replace function public.tables_without_rls()
returns table (tablename text)
language sql stable security definer set search_path = '' as $$
  select c.relname::text from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
$$;

revoke execute on function public.policy_inventory(), public.tables_without_rls() from public, anon, authenticated;
grant execute on function public.policy_inventory(), public.tables_without_rls() to service_role;
