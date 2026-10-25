-- Private storage buckets. Downloads are served via short-lived signed URLs after a server-side check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('resources', 'resources', false, 26214400, array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'image/png', 'image/jpeg'
  ])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function app.safe_uuid(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

create or replace function app.can_view_avatar(p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_owner is not null and (
    p_owner = (select auth.uid())
    or app.can_view_student(p_owner)
    or app.is_my_active_mentor(p_owner)
    or exists (select 1 from public.users u where u.id = p_owner and u.role in ('MENTOR', 'HOD')
               and u.department_id = app.current_department())
  )
$$;

create policy avatars_read on storage.objects for select to authenticated using (
  bucket_id = 'avatars' and app.can_view_avatar(app.safe_uuid((storage.foldername(name))[1]))
);
create policy avatars_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and app.safe_uuid((storage.foldername(name))[1]) = (select auth.uid())
);
create policy avatars_owner_update on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and app.safe_uuid((storage.foldername(name))[1]) = (select auth.uid())
);
create policy avatars_owner_delete on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and app.safe_uuid((storage.foldername(name))[1]) = (select auth.uid())
);

-- A resource file is readable exactly when its learning_resources row is readable (RLS applies inside the subquery).
create policy resources_read on storage.objects for select to authenticated using (
  bucket_id = 'resources' and exists (select 1 from public.learning_resources r where r.file_path = storage.objects.name)
);
create policy resources_mentor_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'resources' and app.current_role() = 'MENTOR'
  and app.safe_uuid((storage.foldername(name))[1]) = (select auth.uid())
);
create policy resources_mentor_delete on storage.objects for delete to authenticated using (
  bucket_id = 'resources' and app.safe_uuid((storage.foldername(name))[1]) = (select auth.uid())
);
