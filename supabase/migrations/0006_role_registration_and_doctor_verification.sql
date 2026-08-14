-- Safe public role registration: patients and family members can enroll;
-- doctors require administrator verification before they can receive shares.

alter table public.doctors add column if not exists is_verified boolean not null default false;

grant select, insert on public.users, public.patients, public.family_members to authenticated;
grant select, update on public.doctors to authenticated;

-- Existing doctor accounts are treated as approved legacy accounts.
update public.doctors set is_verified = true
where id in (select id from public.users where role = 'doctor');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_role text := case new.raw_user_meta_data ->> 'role'
    when 'doctor' then 'doctor'
    when 'family' then 'family'
    else 'patient'
  end;
  display_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, display_name, requested_role);

  if requested_role = 'doctor' then
    insert into public.doctors (id, full_name, email, is_verified)
    values (new.id, display_name, new.email, false);
  elsif requested_role = 'family' then
    insert into public.family_members (id, full_name, email)
    values (new.id, display_name, new.email);
  else
    insert into public.patients (id, full_name, email)
    values (new.id, display_name, new.email);
  end if;
  return new;
end;
$$;

drop policy if exists "doctors admin update" on public.doctors;
create policy "doctors admin update" on public.doctors
  for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.valid_permission_grantee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.users
    where lower(email) = lower(new.grantee_email) and role = new.grantee_type
  ) then
    raise exception 'The recipient does not have the selected role';
  end if;
  if new.grantee_type = 'doctor' and not exists (
    select 1 from public.doctors d
    join public.users u on u.id = d.id
    where lower(u.email) = lower(new.grantee_email) and d.is_verified
  ) then
    raise exception 'This doctor is awaiting administrator verification';
  end if;
  new.grantee_email := lower(new.grantee_email);
  return new;
end;
$$;
