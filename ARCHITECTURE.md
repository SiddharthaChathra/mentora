# ARCHITECTURE.md

Next.js 16 App Router (React 19, TypeScript 6, Tailwind v4) on Supabase (Postgres + Auth + Storage + Realtime). Deployed on Vercel.

## Security model
1. **RLS on every table** (`supabase/migrations/…002_authz_rls.sql`). Helpers in schema `app` are `SECURITY DEFINER`: `current_role`, `is_hod_of`, `is_active_mentor_of`, `can_view_student`, …
2. **Server guards** (`src/server/authz.ts`): `requireRole`, `pageGuard`, `assertCanViewStudent`, `assertCanEditMentoring`. Role always comes from `public.users`, never from client data or JWT metadata.
3. **Triggers**: audit log (immutable), last-HOD protection, semester status transitions, record lock (`app.allow_locked_edit` only inside approved change requests).
4. **Service role** only in `src/server/admin/*`, after an HOD or `CRON_SECRET` check; ESLint blocks other imports.
5. Column grants: users may update only `users.preferences/last_seen_at` and `notifications.read_at/snoozed_until`.

## Route map
| Area | Routes |
|---|---|
| Public | `/`, `/login`, `/forgot-password`, `/reset-password`, `/accept-invite`, `/auth/confirm` |
| Onboarding | `/setup` |
| Mentee | `/mentee`, `/academics[/n]`, `/analytics`, `/mentoring`, `/resources`, `/sessions`, `/journey`, `/profile` |
| Mentor | `/mentor`, `/mentees[/id]`, `/verifications`, `/recommendations`, `/resources`, `/sessions`, `/analytics`, `/reports` |
| HOD | `/hod`, `/students[/id]`, `/mentors[/id]`, `/assignments`, `/interventions`, `/users`, `/settings`, `/imports`, `/exports`, `/audit`, `/analytics` |
| Shared | `/notifications`, `/account`, `/styleguide` (dev only) |
| API | `reports/student/[id]` (PDF), `exports/[kind]`, `imports/template/[kind]`, `imports/[id]/errors`, `resources/[id]/download`, `avatars/[id]`, `sessions/[id]/ics`, `cron/daily` |

## Folder layout
- `src/app` — routes; `(app)/layout.tsx` loads the actor and renders `AppShell`.
- `src/server/services` — read models (academics, roster, department, mentoring, dashboard aggregations, next-step).
- `src/server/actions` — server actions, all wrapped in `handle()` → `{ ok, data | error }`.
- `src/server/report` — @react-pdf document + pdf-lib page numbering (Plus Jakarta Sans embedded).
- `src/lib` — pure engines (`grading`, `insights`, `risk`), validators (zod 4), hooks, glossary.
- `src/features` — feature UI; `src/components` — design system (see DESIGN.md).
- `supabase/migrations` — 001 schema · 002 RLS · 003 triggers · 004 RPC · 005 storage · 006 imports · 007 sessions · 008 notification snooze.
- `tests/unit` (vitest), `tests/rls` (live local Supabase), `tests/e2e` (Playwright).

## Data rules
- PDFs contain verified records and mentor-marked mentoring items only.
- Imported results land VERIFIED; student edits after verification need an approved correction.
- Risk flags and insights are rule-based, explained, and never shown as rankings to students.
