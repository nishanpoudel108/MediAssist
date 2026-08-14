-- Repair client write access for the authenticated Supabase role.
-- This migration is safe to run on existing projects where tables were created
-- without the standard PostgREST grants or where early policies were incomplete.

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.medical_reports,
  public.ai_analysis,
  public.medicines,
  public.reminders,
  public.dose_logs,
  public.permissions
to authenticated;

alter table public.medical_reports enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.medicines enable row level security;
alter table public.reminders enable row level security;
alter table public.dose_logs enable row level security;
alter table public.permissions enable row level security;

-- Explicit command policies avoid relying on implicit WITH CHECK behavior.
drop policy if exists "medicines patient owns" on public.medicines;
create policy "medicines patient select" on public.medicines for select using (auth.uid() = patient_id);
create policy "medicines patient insert" on public.medicines for insert with check (auth.uid() = patient_id);
create policy "medicines patient update" on public.medicines for update using (auth.uid() = patient_id) with check (auth.uid() = patient_id);
create policy "medicines patient delete" on public.medicines for delete using (auth.uid() = patient_id);

drop policy if exists "reminders patient owns" on public.reminders;
create policy "reminders patient select" on public.reminders for select using (auth.uid() = patient_id);
create policy "reminders patient insert" on public.reminders for insert with check (auth.uid() = patient_id);
create policy "reminders patient update" on public.reminders for update using (auth.uid() = patient_id) with check (auth.uid() = patient_id);
create policy "reminders patient delete" on public.reminders for delete using (auth.uid() = patient_id);

drop policy if exists "dose_logs patient owns" on public.dose_logs;
create policy "dose logs patient select" on public.dose_logs for select using (auth.uid() = patient_id);
create policy "dose logs patient insert" on public.dose_logs for insert with check (auth.uid() = patient_id);
create policy "dose logs patient delete" on public.dose_logs for delete using (auth.uid() = patient_id);

drop policy if exists "reports patient owns" on public.medical_reports;
create policy "reports patient select" on public.medical_reports for select using (auth.uid() = patient_id);
create policy "reports patient insert" on public.medical_reports for insert with check (auth.uid() = patient_id);
create policy "reports patient update" on public.medical_reports for update using (auth.uid() = patient_id) with check (auth.uid() = patient_id);
create policy "reports patient delete" on public.medical_reports for delete using (auth.uid() = patient_id);

drop policy if exists "analysis via report owner" on public.ai_analysis;
create policy "analysis patient select" on public.ai_analysis for select using (
  exists (select 1 from public.medical_reports r where r.id = report_id and r.patient_id = auth.uid())
);
create policy "analysis patient insert" on public.ai_analysis for insert with check (
  exists (select 1 from public.medical_reports r where r.id = report_id and r.patient_id = auth.uid())
);

drop policy if exists "permissions patient owns" on public.permissions;
create policy "permissions patient select" on public.permissions for select using (auth.uid() = patient_id);
create policy "permissions patient insert" on public.permissions for insert with check (auth.uid() = patient_id);
create policy "permissions patient delete" on public.permissions for delete using (auth.uid() = patient_id);
