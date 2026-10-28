# ARCHITECTURE.md

Next.js 16 App Router (React 19, TypeScript 6, Tailwind v4) on Supabase (Postgres + Auth + Storage + Realtime). Deployed on Vercel.
Mentora serves a whole college: many **branches** (rows in `departments`), four roles (MENTEE, MENTOR, HOD, PRINCIPAL).

## 1. Security model
1. **RLS on every table** (`supabase/migrations/…002_authz_rls.sql`, rewritten for branches in `…013`, `…017`, `…018`). Helpers in schema `app` are `SECURITY DEFINER`, `STABLE`, `search_path = ''`, and policies call them as `(select app.helper())` so they run once per query.
2. **Server guards** (`src/server/authz.ts`): `getScope` (SELF / MENTOR / BRANCH / COLLEGE / NONE, read fresh per request), `requireRole`, `pageGuard`, `assertCanViewStudent`, `assertCanReadDepartment`, `assertCanManageDepartment`, `assertPrincipal`. Role and branch always come from `public.users` + `department_heads`, never from client data, cookies, URL or JWT metadata.
3. **Out of scope = not found.** Student profile URLs outside the viewer's scope are a real 404 from `proxy.ts` (an RLS-scoped lookup); guards throw `NOT_FOUND`; route handlers return 404. Nothing echoes another branch's names or counts.
4. **Triggers**: audit log (immutable, branch-scoped), semester status transitions, record lock (`app.allow_locked_edit` only inside approved corrections/imports/transfers), same-branch mentor assignments (`MB_CROSS_BRANCH`), HOD appointment consistency, last-Principal protection, branch archive guard.
5. **Service role** only in `src/server/admin/*` and the cron route, always after a scope check (`tests/unit/admin-guards.test.ts` proves no admin call happens without one). The Principal's imports write derived rows for records the authorised import RPC just created.
6. Column grants: users may update only `users.preferences/last_seen_at` and `notifications.read_at/snoozed_until`.

## 2. Route map
| Area | Routes |
|---|---|
| Public | `/`, `/login`, `/signup` (USN email → branch), `/forgot-password`, `/reset-password`, `/accept-invite`, `/auth/confirm` |
| Onboarding | `/setup`, `/hod-access-ended` |
| Mentee | `/mentee`, `/academics[/n]`, `/analytics`, `/mentoring`, `/resources`, `/sessions`, `/journey`, `/profile` |
| Mentor | `/mentor`, `/mentees[/id]`, `/verifications`, `/recommendations`, `/resources`, `/sessions`, `/analytics`, `/reports` |
| HOD (own branch) | `/hod`, `/students[/id]`, `/mentors[/id]`, `/assignments`, `/interventions`, `/users`, `/settings`, `/imports`, `/exports`, `/audit`, `/analytics` |
| Principal (college) | `/principal`, `/students[/id]`, `/branches[/code]`, `/mentors`, `/analytics`, `/interventions`, `/hods`, `/transfers`, `/users`, `/imports`, `/exports`, `/settings`, `/audit` |
| Shared | `/notifications`, `/account`, `/styleguide` (dev only) |
| API | `reports/student/[id]` (PDF), `exports/[kind]` (`?branch=` narrows for the Principal), `imports/template/[kind]`, `imports/[id]/errors`, `resources/[id]/download`, `avatars/[id]`, `sessions/[id]/ics`, `cron/daily` |

A Principal following a `/hod/...` link lands on the matching `/principal/...` page; every other role is redirected away from `/principal/**`.

## 3. Roles, scope and permissions (source of truth)
| Resource / action | MENTEE | MENTOR | HOD (own branch only) | PRINCIPAL (all branches) |
|---|---|---|---|---|
| Own profile, own drafts | read/write own | read own | read own | read own |
| Student profiles & records | own only | active mentees: read, verify | read, verify, finalize, approve corrections | read only |
| Mentor profiles, workload | own mentor card | own | read, manage capacity | read only |
| Mentor assignments | own | own | create/reassign/bulk/undo inside branch | read only (history included) |
| SHARED recommendations, plans, sessions, resources | own | own mentees | read | read only |
| PRIVATE_MENTOR notes | never | author while active mentor | read (own branch) | **never** |
| Analytics, insights, risk, interventions | own (no rankings) | own mentees | branch | college + per branch + branch comparison |
| Student PDF report | — | active mentees | branch students | any student (audited) |
| Imports | — | — | own branch (rows naming another branch rejected) | any branch (chosen in the wizard) |
| Exports | — | own mentee list | branch | college-wide or one branch |
| Users & invites | — | — | MENTEE/MENTOR in own branch | HOD/MENTOR/MENTEE in any branch; cannot remove the last Principal |
| Branches (create, rename, reorder, archive) | — | — | read | full |
| HOD appointments | — | — | read | appoint/change/end, with history |
| Move a student to another branch | — | — | request ("Request branch transfer") | approve/reject/move (ends the mentor link) |
| Grading scheme / risk thresholds | — | — | branch override, only if the Principal allows it | college default + "Allow branch-specific grading" |
| College settings (academic years, sign-up, features) | — | — | read | full |
| Audit log | — | — | own branch | everything (branch filter) |

Scope helpers: `app.is_principal()`, `app.hod_department()` (active appointment + ACTIVE account), `app.is_hod()`, `app.current_department()`, `app.can_read_department()`, `app.can_manage_department()` (Principal excluded), `app.my_mentees()`, `app.my_mentor()`, `app.has_scope()`. Changing an appointment or a student's branch revokes access on the next request (no cached scope).

## 4. Data model (multi-branch additions)
- `departments` + `usn_code` (letters after the year in a USN), `display_order`, `status` (ACTIVE/ARCHIVED), `created_by`. `config/branches.json` seeds them.
- `department_heads` (history): one active head per branch, one branch per head; a branch may have none.
- `student_branch_transfers`: PENDING → APPROVED/REJECTED; approval runs `app.perform_branch_transfer` (moves the student, ends the mentor assignment, re-scopes their records, notifies student/old HOD/new HOD/old mentor; audited).
- `users.department_id` is the branch of every non-Principal (`CHECK`: Principal ⇔ NULL). `department_id` scoping columns (trigger-filled from the student/mentor, never from the client) on `academic_semesters`, `mentor_assignments`, `mentor_recommendations`, `record_change_requests`, `intervention_followups`, `mentoring_sessions`, `learning_resources`, `notifications`, `import_jobs`, `audit_logs`, all indexed.
- `grading_schemes` / `risk_thresholds`: `department_id NULL` = college default; resolution = branch override (when allowed) → college default. Finalized history is never recalculated.
- RPCs: `appoint_hod`, `end_hod_appointment`, `request_branch_transfer`, `decide_branch_transfer`, `move_student_branch`, `notify_branch_hod`, `seed_branch_sections`, branch-scoped `import_subjects/results(…, p_department)`, re-scoped `set_user_role/status`.
- Self sign-up (`app.handle_self_signup`): the branch comes from the USN in the email (`nnm23cs001@…` → `cs` → CSE); unknown codes, non-USN emails and (when set) other domains are refused.

## 5. Folder layout
- `src/app` — routes; `(app)/layout.tsx` loads the actor and renders `AppShell` (HOD branch chip, Principal branch switcher/sheet).
- `src/server/services` — read models (academics, roster, department, **branches**, mentoring, dashboard, next-step).
- `src/server/actions` — server actions wrapped in `handle()`; roster-changing writes call `updateTag(ROSTER_TAG)`.
- `src/features/branch` — the shared branch overview (HOD live, Principal read-only) and transfer request; `src/features/principal` — Principal-only UI.
- `supabase/migrations` — 001–010 (single department) · 011 PRINCIPAL enum · 012 branches/appointments/transfers/scoping columns/backfill · 013 helpers + RLS rewrite · 014 role/import/appointment/transfer RPCs + USN sign-up · 015 Principal helpers · 016 policy inventory · 017 scope tightening · 018 RLS performance.
- `tests/unit` (vitest), `tests/rls` (matrix, policy lint, policies), `tests/e2e` (smoke, crawl, multibranch), `tests/fixtures` (multibranch seed, college-size load SQL).

## 6. Performance at college size
8 branches × 400 students × 4 semesters (`tests/fixtures/load.seed.sql`). Read policies run their helpers once per query (an HOD reading every result: 41 s → 0.28 s). Rosters load in parallel with a slim select. The Principal's college-wide pages use per-branch digests cached 60 s per session (`unstable_cache`, run with the caller's own token so RLS still applies) and dropped on every roster write. Numbers in `E2E_REPORT.md`.

## 7. Data rules
- PDFs contain verified records and mentor-marked mentoring items only (never charts, insights, risk flags or AI text). Header: college · branch.
- Imported results land VERIFIED; student edits after verification need an approved correction.
- Risk flags and insights are rule-based and explained. Branches may be compared; individual students are never ranked for anyone.
