-- ============================================================
-- MediAssist AI — Initial Schema + RLS Policies
-- Run this in Supabase SQL Editor (or via supabase db push).
-- ============================================================

-- -------------------------------
-- Extensions
-- -------------------------------
create extension if not exists "uuid-ossp";

-- -------------------------------
-- users (mirrors auth.users, holds role)
-- -------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null check (role in ('patient','doctor','family','admin')) default 'patient',
  created_at timestamptz not null default now()
);

-- -------------------------------
-- patients
-- -------------------------------
create table public.patients (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  date_of_birth date,
  blood_group text,
  created_at timestamptz not null default now()
);

-- -------------------------------
-- doctors
-- -------------------------------
create table public.doctors (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  specialty text,
  license_number text,
  created_at timestamptz not null default now()
);

-- -------------------------------
-- family_members
-- -------------------------------
create table public.family_members (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  relationship text,
  created_at timestamptz not null default now()
);

-- -------------------------------
-- medical_reports
-- -------------------------------
create table public.medical_reports (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  title text,
  file_path text,
  file_url text,
  extracted_text text,          -- OCR output (kept inside secured pipeline)
  status text default 'uploaded',
  created_at timestamptz not null default now()
);

-- -------------------------------
-- ai_analysis
-- -------------------------------
create table public.ai_analysis (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references public.medical_reports(id) on delete cascade,
  summary text,
  flagged_values jsonb default '[]',
  next_steps jsonb default '[]',
  disclaimer text,
  is_emergency boolean default false,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------
-- medicines
-- -------------------------------
create table public.medicines (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null,
  dosage text,
  schedule text,
  created_at timestamptz not null default now()
);

-- -------------------------------
-- reminders
-- -------------------------------
create table public.reminders (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  medicine_name text,
  frequency text default 'daily',
  time text,
  created_at timestamptz not null default now()
);

-- -------------------------------
-- dose_logs (adherence tracking)
-- -------------------------------
create table public.dose_logs (
  id uuid primary key default uuid_generate_v4(),
  reminder_id uuid references public.reminders(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  status text default 'taken',
  logged_at timestamptz not null default now()
);

-- -------------------------------
-- permissions (opt-in, revocable sharing)
-- -------------------------------
create table public.permissions (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  grantee_email text not null,
  grantee_type text not null check (grantee_type in ('doctor','family')),
  scope text not null default 'full',  -- 'full' or specific report id
  created_at timestamptz not null default now()
);

-- -------------------------------
-- hospitals
-- -------------------------------
create table public.hospitals (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text default 'hospital',
  address text,
  phone text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

-- -------------------------------
-- audit_logs
-- -------------------------------
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references auth.users(id),
  patient_id uuid references public.patients(id),
  action text not null,           -- view / download / grant / revoke
  resource text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — the core of patient-owned data privacy
-- ============================================================
alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.family_members enable row level security;
alter table public.medical_reports enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.medicines enable row level security;
alter table public.reminders enable row level security;
alter table public.dose_logs enable row level security;
alter table public.permissions enable row level security;
alter table public.hospitals enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: is the current user admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce((select role from public.users where id = auth.uid()), '') = 'admin';
$$;

-- -------------------------------
-- users
-- -------------------------------
create policy "users read self or admin" on public.users
  for select using (auth.uid() = id or public.is_admin());
create policy "users insert self" on public.users
  for insert with check (auth.uid() = id);
create policy "users update self or admin" on public.users
  for update using (auth.uid() = id or public.is_admin());

-- -------------------------------
-- patients
-- -------------------------------
create policy "patients read self" on public.patients
  for select using (auth.uid() = id);
create policy "patients insert self" on public.patients
  for insert with check (auth.uid() = id);
create policy "patients read shared via permission" on public.patients
  for select using (
    exists (
      select 1 from public.permissions p
      where p.patient_id = id
        and p.grantee_email = (select email from auth.users where id = auth.uid())
    )
  );
create policy "patients admin" on public.patients
  for select using (public.is_admin());

-- -------------------------------
-- doctors / family_members (self + admin)
-- -------------------------------
create policy "doctors self and admin" on public.doctors
  for select using (auth.uid() = id or public.is_admin());
create policy "doctors insert self" on public.doctors
  for insert with check (auth.uid() = id);
create policy "family self and admin" on public.family_members
  for select using (auth.uid() = id or public.is_admin());
create policy "family insert self" on public.family_members
  for insert with check (auth.uid() = id);

-- -------------------------------
-- medical_reports: patient owns; shared grantees can view
-- -------------------------------
create policy "reports patient owns" on public.medical_reports
  for all using (auth.uid() = patient_id);
create policy "reports shared via permission" on public.medical_reports
  for select using (
    exists (
      select 1 from public.permissions p
      where p.patient_id = medical_reports.patient_id
        and p.grantee_email = (select email from auth.users where id = auth.uid())
        and (p.scope = 'full' or p.scope::text = medical_reports.id::text)
    )
  );
create policy "reports admin" on public.medical_reports
  for select using (public.is_admin());

-- -------------------------------
-- ai_analysis: via owning report or shared access
-- -------------------------------
create policy "analysis via report owner" on public.ai_analysis
  for all using (
    exists (
      select 1 from public.medical_reports r
      where r.id = ai_analysis.report_id and r.patient_id = auth.uid()
    )
  );
create policy "analysis via shared report" on public.ai_analysis
  for select using (
    exists (
      select 1 from public.medical_reports r
      join public.permissions p on p.patient_id = r.patient_id
      where r.id = ai_analysis.report_id
        and p.grantee_email = (select email from auth.users where id = auth.uid())
        and (p.scope = 'full' or p.scope::text = r.id::text)
    )
  );

-- -------------------------------
-- medicines / reminders / dose_logs: patient owns
-- -------------------------------
create policy "medicines patient owns" on public.medicines
  for all using (auth.uid() = patient_id);
create policy "reminders patient owns" on public.reminders
  for all using (auth.uid() = patient_id);
create policy "dose_logs patient owns" on public.dose_logs
  for all using (auth.uid() = patient_id);
-- family can read dose_logs / adherence for shared patients
create policy "dose_logs family shared" on public.dose_logs
  for select using (
    exists (
      select 1 from public.permissions p
      where p.patient_id = dose_logs.patient_id
        and p.grantee_type = 'family'
        and p.grantee_email = (select email from auth.users where id = auth.uid())
    )
  );

-- -------------------------------
-- permissions: patient manages own grants; grantees read their own grants
-- -------------------------------
create policy "permissions patient owns" on public.permissions
  for all using (auth.uid() = patient_id);
create policy "permissions grantee read own" on public.permissions
  for select using (
    grantee_email = (select email from auth.users where id = auth.uid())
  );
create policy "permissions admin" on public.permissions
  for select using (public.is_admin());

-- -------------------------------
-- hospitals: public read, admin write
-- -------------------------------
create policy "hospitals public read" on public.hospitals
  for select using (true);
create policy "hospitals admin write" on public.hospitals
  for all using (public.is_admin()) with check (public.is_admin());

-- -------------------------------
-- audit_logs: admin can read; insert by any authenticated (RLS handles write)
-- -------------------------------
create policy "audit_logs admin read" on public.audit_logs
  for select using (public.is_admin());
create policy "audit_logs insert" on public.audit_logs
  for insert with check (auth.uid() is not null);

-- -------------------------------
-- Trigger: create users row on auth.users insert
-- -------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'patient')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed: a few hospitals for the finder
insert into public.hospitals (name, type, address, phone) values
  ('Kathmandu General Hospital', 'hospital', 'Kathmandu, Nepal', '+977-1-4XXXXXX'),
  ('Bir Hospital', 'emergency', 'Kathmandu, Nepal', '+977-1-4XXXXXX'),
  ('Nepal Medicare Clinic', 'clinic', 'Lalitpur, Nepal', '+977-1-5XXXXXX'),
  ('CityCare Pharmacy', 'pharmacy', 'Pokhara, Nepal', '+977-61-4XXXXX');
