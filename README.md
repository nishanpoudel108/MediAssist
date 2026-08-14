# MediAssist AI

A secure, cloud-based personal health record platform. Patients own their medical data, understand it via AI plain-language explanations, manage medications, and share records with any doctor or family member.

**Core principle: patient-owned records.** A patient's data stays accessible to them and shareable — even with hospitals that never adopt the platform.

> ⚠️ **Important disclaimer:** The AI is a decision-support tool only. It never provides a diagnosis. Every explanation ends with a recommendation to consult a licensed professional, and condition suggestions are phrased as risk/likelihood, never diagnostic claims.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Supabase Edge Functions |
| Auth | Supabase Auth (email/password + OAuth) |
| Database | Supabase PostgreSQL |
| File storage | Supabase Storage |
| AI / NLP | OpenAI or Gemini API |
| OCR | Tesseract OCR |
| Maps | Google Maps / OpenStreetMap links |
| Deployment | Vercel |

## User Roles

- **Patient** — upload reports, view AI explanations, manage medicines/reminders, grant/revoke sharing, find nearby care.
- **Doctor** — view only patient-authorized reports + AI summaries, download.
- **Family Member** — view only what is shared, monitor medicine adherence, receive emergency alerts.
- **Administrator** — manage users/hospitals, view analytics.

Role-based access control is enforced at the **database level** via Supabase Row Level Security (RLS), not just in the UI.

### Registration and access

- **Patients** and **family members** can create accounts from the sign-up screen. A family member sees patient data only after that patient grants access.
- **Doctors** can create an account from the same screen, but it remains pending until an administrator selects **Approve** in Admin → Users. Patients cannot share records with an unverified doctor.
- **Administrators** are provisioned by the platform and cannot be created through public sign-up.

---

## Project Structure

```
supabase/
  migrations/            # SQL schema + RLS policies
  functions/
    analyze-report/      # AI explanation (with guardrails)
    check-interactions/  # Medicine interaction checker
    ocr/                 # Tesseract OCR pipeline
    upload-report/       # Upload orchestration
    grant-access/        # Opt-in sharing grant
    revoke-access/       # Immediate share revocation
    audit-log/           # Central audit logging
    remind/              # Reminder scheduling
    _shared/             # Shared CORS, AI provider, types
src/
  components/            # Layout, route guards, language switcher
  context/               # Auth + Locale providers
  i18n/                  # EN / Nepali / Hindi (extensible)
  lib/                   # supabase, OCR, AI, guardrails
  pages/                 # Auth + role dashboards
```

---

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))
- An API key for OpenAI or Gemini

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` **or** `GEMINI_API_KEY` (plus `AI_PROVIDER=openai|gemini`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `VITE_GOOGLE_MAPS_API_KEY` (optional)

### 3. Apply the database schema

Run `supabase/migrations/0001_mediassist_schema.sql` in the Supabase SQL Editor (or `supabase db push`). This creates all tables and RLS policies.

### 4. Create the Storage bucket

```sql
insert into storage.buckets (id, name, public) values ('reports', 'reports', false);
-- Storage RLS: patients can only READ/WRITE their own folder
```

### 5. Deploy Edge Functions

```bash
supabase functions deploy analyze-report
supabase functions deploy check-interactions
supabase functions deploy ocr
supabase functions deploy upload-report
supabase functions deploy audit-log
supabase functions deploy grant-access
supabase functions deploy revoke-access
supabase functions deploy remind
supabase functions deploy delete-user
```

Set function secrets in Supabase Dashboard → Edge Functions → Secrets:
`OPENAI_API_KEY`, `GEMINI_API_KEY`, `AI_PROVIDER`, `SUPABASE_SERVICE_ROLE_KEY`.

### 6. Run locally

```bash
npm run dev
```

Visit `http://localhost:5173`.

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import into Vercel (framework: Vite).
3. Add the same `VITE_*` environment variables.
4. Deploy.

---

## Security & Privacy

- All data encrypted in transit (HTTPS) and at rest (Supabase Storage).
- **RLS on every patient-data table** — users can never query another patient's records directly.
- Sharing is **opt-in and revocable**; revocation deletes the permission row, immediately cutting off access via RLS.
- Every view/download of a patient record is written to `audit_logs`.
- Raw AI prompts/responses containing patient data never leave the secured Edge Function pipeline.

## AI Guardrails

- Never a diagnosis — always risk/likelihood language.
- Every explanation ends with a consultation disclaimer.
- Acutely dangerous findings trigger the emergency-assistance UI path.

---

## Demo Accounts

After running `0002_demo_data.sql`, you can log in with these seeded accounts (password for all: `DemoPass123!`):

| Role | Email | Notes |
|---|---|---|
| Patient | `patient@demo.com` | Anita Sharma — has reports, medicines, reminders, and shares |
| Doctor | `doctor@demo.com` | Dr. Rajesh Koirala — sees Anita's authorized reports |
| Family | `family@demo.com` | Mohan Sharma — sees shared reports + adherence |
| Admin | `admin@demo.com` | System Admin — manages users/hospitals/analytics |

The seed inserts auth users via `auth.users` (the trigger populates `public.users`), plus role profiles, medical reports with AI analyses, medicines, reminders, dose logs, permissions, audit logs, and hospitals.

---

## Multilingual Support

UI and AI-explanation output are localized to **English, Nepali, and Hindi**. The i18n structure is designed so **Maithili, Bhojpuri, Newari, and Tamang** can be added later without refactoring — just add a translation object in `src/i18n/translations.js` and register it in `src/i18n/locales.js`.
