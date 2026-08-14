# Build Prompt: MediAssist AI

Use this prompt with an AI coding assistant (e.g. Claude Code) to scaffold and build the MediAssist AI platform.

---

## Project Brief

Build **MediAssist AI**, a secure, cloud-based personal health record platform that lets patients own their medical data, understand it via AI-generated plain-language explanations, manage medications, and share records with any doctor or family member.

Core principle: **patient-owned records**. A patient's data must remain accessible and shareable even with hospitals that never adopt the platform.

The AI is a **decision-support tool only** — it must never present output as a diagnosis. Every AI explanation of a report must end with a clear disclaimer recommending professional consultation, and every "possible condition" suggestion must be phrased as risk/likelihood language, not a diagnostic claim.

## Tech Stack (use exactly this unless a substitution is justified and noted)

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Supabase Edge Functions (preferred) or Node.js/Express |
| Auth | Supabase Auth (email/password + OAuth) |
| Database | Supabase PostgreSQL |
| File storage | Supabase Storage (encrypted buckets) |
| AI / NLP | OpenAI or Gemini API for report explanation, translation, and interaction analysis |
| OCR | Tesseract OCR for extracting text from uploaded scans/photos |
| Maps | Google Maps API or OpenStreetMap for hospital/pharmacy discovery |
| Deployment | Vercel |

## User Roles (build distinct portals/views for each)

1. **Patient** — register/login, upload reports, view AI explanations, manage medicines, set reminders, grant/revoke sharing permissions, view nearby hospitals.
2. **Doctor** — secure login, view only patient-authorized reports, view AI summaries, download reports.
3. **Family Member** — view only what the patient explicitly shares, monitor medicine adherence, receive emergency alerts.
4. **Administrator** — manage users and hospital directory, monitor platform health, view usage analytics.

Enforce role-based access control (RBAC) at the database level (Supabase Row Level Security), not just in the UI.

## Feature List (build in this order)

### Phase 1 — Foundation
- Auth flows for all four roles (signup, login, password reset, session handling via Supabase Auth).
- Patient dashboard shell + Doctor dashboard shell + Family dashboard shell + Admin dashboard shell.
- Database schema (see below) with RLS policies.

### Phase 2 — Core Health Records
- Report upload (PDF/image) to Supabase Storage, tied to the uploading patient.
- OCR pipeline: extract text from uploaded reports via Tesseract.
- AI report analysis pipeline: send extracted text to the AI API, return a structured explanation (plain-language summary, flagged abnormal values, suggested next steps, mandatory disclaimer).
- Store AI Analysis results linked to the source report.
- Patient view for browsing report history and AI explanations.

### Phase 3 — Medicine Management
- Medicine list per patient (name, dosage, schedule).
- Medicine interaction checker: given a patient's active medicine list, call the AI API to flag interactions, duplicates, side effects, and food interactions.
- Reminder scheduling (daily/weekly) with notifications (push or email) and missed-dose logging.
- Adherence report generation (simple % adherence over time).

### Phase 4 — Sharing & Collaboration
- Permission system: patients grant/revoke doctor and family-member access to specific reports or their full history.
- Doctor view of authorized patient reports and AI summaries, with download.
- Family view of shared reports and medicine adherence, with emergency alert subscription.
- Audit log: every access to a patient's record is logged (who, what, when).

### Phase 5 — Location & Emergency
- Hospital/clinic/pharmacy/emergency-center finder based on patient location, with navigation links.
- Emergency assistance flow: if AI analysis flags a potentially dangerous finding, surface an immediate, prominent "seek emergency care" prompt (never a diagnosis) and optionally notify authorized family members.

### Phase 6 — Multilingual Support
- UI and AI-explanation output localized into English, Nepali, and Hindi (structure translation so Maithili, Bhojpuri, Newari, and Tamang can be added later without refactoring).

### Phase 7 — Admin & Polish
- Admin panel for user/hospital management and basic analytics.
- Responsive design pass, empty states, loading states, error handling.
- Security hardening pass (see below).

## Database Schema (starting point — adjust as needed)

Tables: `users`, `doctors`, `patients`, `family_members`, `medical_reports`, `ai_analysis`, `medicines`, `reminders`, `permissions`, `hospitals`, `audit_logs`.

Key relationships:
- `medical_reports.patient_id → patients.id`
- `ai_analysis.report_id → medical_reports.id`
- `medicines.patient_id → patients.id`
- `permissions` maps `patient_id` to a `grantee_id` (doctor or family member) and a scope (which reports / full history).
- `audit_logs` records `actor_id`, `patient_id`, `action`, `resource`, `timestamp`.

## Security & Privacy Requirements (non-negotiable)

- All data encrypted at rest (Supabase Storage) and in transit (HTTPS only).
- Supabase Row Level Security on every table containing patient data — a user must never be able to query another patient's records directly.
- Sharing is opt-in and revocable at any time by the patient; revocation must immediately cut off access, not just hide it in the UI.
- Every access to a patient record (view, download) is written to `audit_logs`.
- Do not log or expose raw AI prompts/responses containing patient data outside of the secured pipeline.

## AI Output Guardrails (enforce in the prompt sent to the AI API and in post-processing)

- Never phrase output as a diagnosis. Use language like "this could indicate," "may suggest," "increased risk of."
- Every report explanation must end with a recommendation to consult a licensed professional.
- If findings look acutely dangerous, the response must trigger the emergency-assistance UI path in addition to the explanation.

## Deliverables Expected from the AI Coder

1. A working Vite + React + Tailwind frontend with routing for all four role dashboards.
2. Supabase project schema (SQL migrations) with RLS policies matching the table above.
3. Edge functions (or Node/Express routes) for: report upload + OCR trigger, AI analysis call, medicine interaction check, reminder scheduling, permission grant/revoke, audit logging.
4. Environment-variable-driven config for OpenAI/Gemini key, Google Maps key, and Supabase keys — never hardcoded.
5. A README explaining setup, environment variables, and how to run locally and deploy to Vercel.

Build incrementally phase by phase, and after each phase, summarize what was built and any decisions/assumptions made before continuing.