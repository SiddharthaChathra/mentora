# PROGRESS.md

## Latest (2026-10-25)
- Finished: D1–D4 deploy. Live at https://mentora-zeta-six.vercel.app (Vercel Hobby, auto-deploys `main` from github.com/SiddharthaChathra/mentora, public repo). Cloud Supabase project `ikeauzqhzpqtsjfbrolr` (free, separate account): migrations 001–010 applied, base seed + HOD created (no demo data).
- D3: student self sign-up (`/signup`) — migration 010 trigger makes every self sign-up an ACTIVE MENTEE in the default department; HOD can disable with `app_settings.self_signup = false`.
- Gates: typecheck ✅ · lint ✅ · unit 55/55 ✅ · RLS 13/13 ✅ · e2e 6/6 local ✅ · live smoke 1/1 ✅ (`LIVE=1 E2E_BASE_URL=… pnpm exec playwright test live`).
- Decisions: public repo (user request); anon key stored as Vercel `config` (public by design), service role as `secret`; prod env values live only in gitignored `.env.production.local` + Vercel.
- Open (human): Supabase → Auth → turn off "Confirm email" OR add free SMTP (Gmail app password) — the built-in mailer only emails project team members, so confirmation/invite/reset emails won't reach students otherwise. Optional: Resend, Gemini.
- Known issues: none failing. Local dev needs Docker Desktop running.

## History
- V1: full app (auth, roles, RLS, records, mentoring, HOD admin, imports/exports, PDF, notifications, cron, demo seed).
- V2.R1–R4: tokens, Plus Jakarta Sans, 3D icons/scenes, component library, shell, mentee overview, auth pages, styleguide.
- V2.R5: mentor/HOD overviews, all remaining screens, UX2 features, lint clean.
- D1–D4: cloud DB, Vercel deploy, self sign-up, live smoke test.
- V2.R7: reference comparison + polish; rubric ≥ 9.
- V2.R6: RLS + e2e tests, DESIGN v2 (+ v1 archive), ARCHITECTURE, FEATURES, README, DEPLOY, USER_GUIDE, HANDOFF.
