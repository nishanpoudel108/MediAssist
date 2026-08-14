-- One-time repair for accounts created while the old trigger forced every
-- signup to patient. Only explicit doctor/family metadata is honored; admin
-- metadata is intentionally ignored.

update public.users u
set role = case a.raw_user_meta_data ->> 'role'
  when 'doctor' then 'doctor'
  when 'family' then 'family'
  else u.role
end
from auth.users a
where a.id = u.id
  and a.raw_user_meta_data ->> 'role' in ('doctor', 'family');

insert into public.doctors (id, full_name, email, is_verified)
select a.id,
       coalesce(a.raw_user_meta_data ->> 'full_name', u.full_name, ''),
       a.email,
       false
from auth.users a
join public.users u on u.id = a.id
left join public.doctors d on d.id = a.id
where u.role = 'doctor' and d.id is null;

insert into public.family_members (id, full_name, email)
select a.id,
       coalesce(a.raw_user_meta_data ->> 'full_name', u.full_name, ''),
       a.email
from auth.users a
join public.users u on u.id = a.id
left join public.family_members f on f.id = a.id
where u.role = 'family' and f.id is null;
