-- Repair family-member sharing for deployments that missed the earlier RLS
-- migrations. A recipient can only read permission rows, patient metadata,
-- reports, analyses, and stored files explicitly shared with their JWT email.

grant usage on schema public to authenticated, service_role;
grant select on table public.permissions, public.patients, public.medical_reports,
  public.ai_analysis, public.dose_logs to authenticated, service_role;

alter table public.permissions enable row level security;
alter table public.patients enable row level security;
alter table public.medical_reports enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.dose_logs enable row level security;

drop policy if exists "permissions grantee read own" on public.permissions;
create policy "permissions grantee read own" on public.permissions
  for select using (
    lower(grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "patients read shared via permission" on public.patients;
create policy "patients read shared via permission" on public.patients
  for select using (
    exists (
      select 1 from public.permissions p
      where p.patient_id = patients.id
        and p.grantee_type in ('family', 'doctor')
        and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "reports shared via permission" on public.medical_reports;
create policy "reports shared via permission" on public.medical_reports
  for select using (
    exists (
      select 1 from public.permissions p
      where p.patient_id = medical_reports.patient_id
        and p.grantee_type in ('family', 'doctor')
        and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and (p.scope = 'full' or p.scope = medical_reports.id::text)
    )
  );

drop policy if exists "analysis via shared report" on public.ai_analysis;
create policy "analysis via shared report" on public.ai_analysis
  for select using (
    exists (
      select 1 from public.medical_reports r
      join public.permissions p on p.patient_id = r.patient_id
      where r.id = ai_analysis.report_id
        and p.grantee_type in ('family', 'doctor')
        and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and (p.scope = 'full' or p.scope = r.id::text)
    )
  );

drop policy if exists "dose_logs family shared" on public.dose_logs;
create policy "dose_logs family shared" on public.dose_logs
  for select using (
    exists (
      select 1 from public.permissions p
      where p.patient_id = dose_logs.patient_id
        and p.grantee_type = 'family'
        and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

update storage.buckets set public = false where id = 'reports';
drop policy if exists "reports objects read" on storage.objects;
create policy "reports objects read" on storage.objects
  for select using (
    bucket_id = 'reports' and (
      (storage.foldername(name))[1] = auth.uid()::text or
      exists (
        select 1 from public.medical_reports r
        join public.permissions p on p.patient_id = r.patient_id
        where r.file_path = name
          and p.grantee_type in ('family', 'doctor')
          and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          and (p.scope = 'full' or p.scope = r.id::text)
      )
    )
  );
