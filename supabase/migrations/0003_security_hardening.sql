-- Security hardening for production deployments. Apply after 0001.

-- Public registration creates patients only. Do not trust mutable auth metadata
-- for privileged roles.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'patient');
  insert into public.patients (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email);
  return new;
end;
$$;

-- Repair patient profiles for accounts created before this migration.
insert into public.patients (id, full_name, email)
select u.id, u.full_name, u.email
from public.users u
left join public.patients p on p.id = u.id
where u.role = 'patient' and p.id is null;

-- Users must not be able to promote themselves or modify their own identity.
drop policy if exists "users update self or admin" on public.users;
create policy "users update admin only" on public.users
  for update using (public.is_admin()) with check (public.is_admin());

-- Keep grants unique and ensure recipients have the selected account type.
create unique index if not exists permissions_patient_grantee_scope_key
  on public.permissions (patient_id, grantee_email, scope);

create or replace function public.valid_permission_grantee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.users
    where lower(email) = lower(new.grantee_email) and role = new.grantee_type
  ) then
    raise exception 'The recipient does not have the selected role';
  end if;
  new.grantee_email := lower(new.grantee_email);
  return new;
end;
$$;

drop trigger if exists validate_permission_grantee on public.permissions;
create trigger validate_permission_grantee
  before insert or update on public.permissions
  for each row execute procedure public.valid_permission_grantee();

-- The reports bucket must be private. Owners can write their folder; a grantee
-- can read a file only while the associated database grant remains active.
update storage.buckets set public = false where id = 'reports';
drop policy if exists "reports objects read" on storage.objects;
drop policy if exists "reports objects insert" on storage.objects;
drop policy if exists "reports objects delete" on storage.objects;
create policy "reports objects read" on storage.objects for select using (
  bucket_id = 'reports' and (
    (storage.foldername(name))[1] = auth.uid()::text or
    exists (
      select 1 from public.medical_reports r
      join public.permissions p on p.patient_id = r.patient_id
      where r.file_path = name
        and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and (p.scope = 'full' or p.scope = r.id::text)
    )
  )
);
create policy "reports objects insert" on storage.objects for insert with check (
  bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "reports objects delete" on storage.objects for delete using (
  bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text
);
