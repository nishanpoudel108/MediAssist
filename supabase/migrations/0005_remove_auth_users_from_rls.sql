-- RLS policies run as the authenticated database role, which must not query
-- auth.users. Use the caller's JWT email instead.

drop policy if exists "patients read shared via permission" on public.patients;
create policy "patients read shared via permission" on public.patients for select using (
  exists (
    select 1 from public.permissions p
    where p.patient_id = id
      and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "reports shared via permission" on public.medical_reports;
create policy "reports shared via permission" on public.medical_reports for select using (
  exists (
    select 1 from public.permissions p
    where p.patient_id = medical_reports.patient_id
      and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (p.scope = 'full' or p.scope = medical_reports.id::text)
  )
);

drop policy if exists "analysis via shared report" on public.ai_analysis;
create policy "analysis via shared report" on public.ai_analysis for select using (
  exists (
    select 1 from public.medical_reports r
    join public.permissions p on p.patient_id = r.patient_id
    where r.id = ai_analysis.report_id
      and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (p.scope = 'full' or p.scope = r.id::text)
  )
);

drop policy if exists "dose_logs family shared" on public.dose_logs;
create policy "dose_logs family shared" on public.dose_logs for select using (
  exists (
    select 1 from public.permissions p
    where p.patient_id = dose_logs.patient_id
      and p.grantee_type = 'family'
      and lower(p.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "permissions grantee read own" on public.permissions;
create policy "permissions grantee read own" on public.permissions for select using (
  lower(grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "reports objects read" on storage.objects;
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
