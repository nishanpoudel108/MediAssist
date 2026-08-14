-- Family sharing requires two steps: the patient creates a recipient-bound,
-- single-use code after recent password confirmation in the UI; the intended
-- family account redeems it. Codes are stored only as bcrypt hashes.
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  recipient_email text not null,
  scope text not null default 'full',
  code_hash text not null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.family_invites enable row level security;
grant select, insert, delete on public.family_invites to authenticated;

create policy "family invites patient manages" on public.family_invites
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- Family permissions are created only by redeeming a valid invitation.
drop policy if exists "permissions patient insert" on public.permissions;
create policy "permissions patient insert doctor only" on public.permissions
  for insert with check (auth.uid() = patient_id and grantee_type = 'doctor');

create or replace function public.create_family_invite(
  recipient text,
  access_scope text default 'full'
)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text := upper(substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 12));
  valid_recipient text := lower(trim(recipient));
  invite_expiry timestamptz := now() + interval '24 hours';
begin
  if auth.uid() is null or not exists (select 1 from patients where id = auth.uid()) then
    raise exception 'Only the patient who owns the records can create an invitation';
  end if;
  if not exists (select 1 from users where lower(email) = valid_recipient and role = 'family') then
    raise exception 'The recipient must first register a Family Member account';
  end if;
  if access_scope <> 'full' and not exists (
    select 1 from medical_reports where id::text = access_scope and patient_id = auth.uid()
  ) then
    raise exception 'The selected report does not belong to this patient';
  end if;

  insert into family_invites (patient_id, recipient_email, scope, code_hash, expires_at)
  values (auth.uid(), valid_recipient, access_scope, md5(generated_code), invite_expiry);
  return query select generated_code, invite_expiry;
end;
$$;

create or replace function public.redeem_family_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row family_invites%rowtype;
  recipient text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or not exists (select 1 from users where id = auth.uid() and role = 'family') then
    raise exception 'A Family Member account is required to redeem this code';
  end if;

  select * into invite_row from family_invites
  where recipient_email = recipient
    and redeemed_at is null
    and expires_at > now()
    and code_hash = md5(upper(trim(invite_code)))
  order by created_at desc
  limit 1
  for update;

  if invite_row.id is null then
    raise exception 'This code is invalid, expired, or was created for a different email address';
  end if;

  insert into permissions (patient_id, grantee_email, grantee_type, scope)
  values (invite_row.patient_id, recipient, 'family', invite_row.scope)
  on conflict (patient_id, grantee_email, scope) do nothing;
  update family_invites set redeemed_at = now() where id = invite_row.id;
  return invite_row.patient_id;
end;
$$;

revoke all on function public.create_family_invite(text, text) from public;
revoke all on function public.redeem_family_invite(text) from public;
grant execute on function public.create_family_invite(text, text), public.redeem_family_invite(text) to authenticated;
