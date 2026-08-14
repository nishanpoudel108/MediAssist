-- Let a family member identify each patient who explicitly shared records
-- with them. The function never returns patients without a matching grant.
create or replace function public.get_shared_family_patients()
returns table (
  id uuid,
  full_name text,
  email text
)
language sql
security definer
set search_path = public
as $$
  select distinct p.id, p.full_name, p.email
  from public.patients p
  join public.permissions grant_row on grant_row.patient_id = p.id
  where grant_row.grantee_type = 'family'
    and lower(grant_row.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

revoke all on function public.get_shared_family_patients() from public;
grant execute on function public.get_shared_family_patients() to authenticated;
