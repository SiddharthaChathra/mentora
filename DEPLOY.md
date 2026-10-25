# DEPLOY.md

Target: Supabase (cloud project) + Vercel. Secrets go only into Vercel/Supabase dashboards or `.env.local` — never into code, commits or chat.

### MANUAL STEP M1 — Design reference images
- Why: the v2 rubric is scored against them.
- Do: save `ref-cognify.png` and `ref-kouliah.png` to `design/references/`.
- Done when: both files exist.

### MANUAL STEP M2 — Create the Supabase project
- Do: create a project (region close to users). From Settings → API copy the URL, anon key, service-role key; from Settings → Database copy the connection string.
- Then locally: `npx supabase link --project-ref <ref>` and `pnpm db:push` (applies migrations 001–008).
- Done when: tables appear in the Table editor with RLS enabled.

### MANUAL STEP M3 — Auth settings and email templates
- Auth → URL configuration: Site URL `https://<your-domain>`; redirect URLs `https://<your-domain>/auth/confirm`.
- Auth → Providers → Email: keep email login on; turn **off** "Allow new users to sign up".
- Auth → Email templates (Invite, Reset password): link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite` (or `type=recovery`).
- Optional: custom SMTP (Resend) under Auth → SMTP.

### MANUAL STEP M4 — Resend (optional email)
- Verify your sending domain in Resend, create an API key, set `RESEND_API_KEY` and `EMAIL_FROM`. Without it, in-app notifications still work.

### MANUAL STEP M5 — Vercel
- Import the repo, framework Next.js. Environment variables (Production + Preview): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (long random), `RESEND_API_KEY`, `EMAIL_FROM`, optional `GEMINI_API_KEY` + `AI_INSIGHTS_ENABLED=true`.
- `vercel.json` schedules `/api/cron/daily` at 02:30 UTC; Vercel sends `Authorization: Bearer $CRON_SECRET`.
- Done when: `/login` loads and `/api/cron/daily` returns 401 without the secret.

### MANUAL STEP M6 — First HOD and data
- Run `SEED_HOD_EMAIL=… SEED_HOD_PASSWORD=… pnpm db:seed` against the cloud project (env pointing at it) to create the department, grading scheme and HOD. Do **not** run `db:seed:demo` in production.
- Sign in as HOD → Users & roles to invite mentors and students, or use Bulk import.

## Post-deploy checks
`pnpm test:e2e` with `E2E_BASE_URL=https://<your-domain>` (demo data required) · verify a PDF report downloads · check Vercel cron logs after the first run.
