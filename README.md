<div align="center">

# 🎓 Mentora

### Smart Mentor–Mentee Management for a Whole Engineering College

<br>

<p>
  <a href="https://mentora-zeta-six.vercel.app/"><img alt="Live App" src="https://img.shields.io/badge/🚀_Live_App-mentora--zeta--six.vercel.app-2563EB?style=for-the-badge&labelColor=0f172a"></a>
  <a href="https://mentora-zeta-six.vercel.app/signup"><img alt="Create a student account" src="https://img.shields.io/badge/🎓_Sign_up-Free_for_students-2563EB?style=for-the-badge&labelColor=0f172a"></a>
</p>

<p>
  <img alt="Tests" src="https://img.shields.io/badge/tests-125_passing-22C55E?style=flat-square&labelColor=0f172a">
  <img alt="Pages checked" src="https://img.shields.io/badge/E2E_crawl-79_routes_×_2_widths-22C55E?style=flat-square&labelColor=0f172a">
  <img alt="Last Commit" src="https://img.shields.io/github/last-commit/SiddharthaChathra/mentora?style=flat-square&color=2563EB&labelColor=0f172a">
  <img alt="Stars" src="https://img.shields.io/github/stars/SiddharthaChathra/mentora?style=flat-square&color=2563EB&labelColor=0f172a">
</p>

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white&labelColor=0f172a">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=0f172a">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=0f172a">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20RLS-3ECF8E?style=flat-square&logo=supabase&logoColor=white&labelColor=0f172a">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white&labelColor=0f172a">
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white&labelColor=0f172a">
</p>

<p>
  <a href="#-why-mentora"><b>Why</b></a> ·
  <a href="#-one-site-for-the-whole-college"><b>Multi-branch</b></a> ·
  <a href="#-screenshots"><b>Screenshots</b></a> ·
  <a href="#-try-it"><b>Try it</b></a> ·
  <a href="#%EF%B8%8F-architecture"><b>Architecture</b></a> ·
  <a href="#-technology-stack"><b>Stack</b></a> ·
  <a href="#-quick-start"><b>Quick Start</b></a> ·
  <a href="#%EF%B8%8F-security-model"><b>Security</b></a> ·
  <a href="#-testing"><b>Testing</b></a> ·
  <a href="#-documentation"><b>Docs</b></a> ·
  <a href="#-appendix-a-build-prompt"><b>Build prompt</b></a>
</p>

</div>

<br>

<div align="center">
  <a href="https://mentora-zeta-six.vercel.app/">
    <img src="screenshots/mentor-dashboard.png" alt="Mentora mentor dashboard: average SGPA hero card, students needing attention, pending follow-ups, sessions this week, subject performance bars and recommendation summary" width="100%">
  </a>
</div>

<br>

Mentora gives a whole engineering college one place for mentoring, organised by **branch** (CSE, ISE, ECE, …). **Students** keep their semester records — subjects, mid-semester and semester-end marks, grades — and see their SGPA, CGPA and progress. **Mentors** verify those records, set goals with concrete steps, schedule sessions and share study material with the students assigned to them. Each **HOD** runs their own branch: coverage, mentor workload, who needs help, assignments, users and branch settings. The **Principal** sees every branch side by side, appoints HODs and approves branch transfers — read-only on student records.

**Every number is computed from verified data, and every flag explains itself.** If an SGPA can't be calculated yet, Mentora says why instead of guessing. Risk indicators name the rule and the marks behind them. Students never see other students' data or rankings.

> **The live app requires an account.** Students can [sign up free](https://mentora-zeta-six.vercel.app/signup) with their **USN email** (e.g. `nnm23cs001@…`) and become students in the branch named by their USN. Mentor, HOD and Principal accounts are created by invitation, so no one can grant themselves elevated access.

<br>

## 🎯 Why Mentora?

<table>
<tr>
<td width="50%" valign="top">

**📊 Verified Academic Records**
Semester-wise marks with a configurable 10-point grading engine. Students submit, mentors verify, records lock; corrections go through an audited request.

**⌨️ Spreadsheet-Fast Marks Entry**
Subjects auto-filled from the branch catalogue. Tab / Enter navigation, paste a block straight from Excel or Sheets, per-row autosave.

**🎯 Goals With Real Steps**
Mentors set goals and action points with checklists and due dates; students tick steps, reflect and update status — with Undo.

**🚨 Explained Risk Flags**
Declining SGPA, failed subjects, repeated low marks, incomplete profiles — each with its reason and the evidence. Thresholds are the HOD's to tune.

</td>
<td width="50%" valign="top">

**👥 Branch Control (HOD)**
Drag-and-drop mentor assignments with undo and history, capacity-aware workload, bulk invites, CSV/XLSX imports with row-level validation — all limited to the HOD's own branch.

**🏫 College Oversight (Principal)**
College coverage and branch health, students grouped by branch, branch comparisons, HOD appointments with history and branch transfers. Branches are compared; students are never ranked.

**📅 Sessions & Resources**
Schedule one-to-one or group sessions (calendar `.ics` included), record summaries, share files and links through private, short-lived download links.

**📄 Official PDF Reports**
Print-ready reports built only from verified records and mentor-approved notes. Never charts, insights, risk flags or AI text.

**🔐 Database-Enforced Access**
Row-Level Security on every table: a mentor sees only their active mentees, a student only themselves. Every sensitive change is audited.

</td>
</tr>
</table>

<br>

## 🏫 One site for the whole college

Mentora runs a whole college: every student, mentor, subject and record belongs to exactly one **branch**, and the database enforces who sees what.

| Role | Sees | Can change |
|---|---|---|
| **Student** | Only their own records and shared feedback | Their profile, drafts, goal steps |
| **Mentor** | Only students actively assigned to them (same branch) | Verifications, recommendations, sessions, resources |
| **HOD** | Only the branch they currently head | Assignments, users (students/mentors), sections, subjects, branch grading override when allowed |
| **Principal** | Every branch, read-only on student data — never private mentor notes | Branches, HOD appointments, branch transfers, college settings, imports/exports |

- **Sign-up by USN** — `nnm23cs001@…` → branch code `cs` → CSE. Non-USN emails and unknown branch codes are refused with a clear message; the Principal can require the college email domain or turn sign-up off.
- **Branches** — create, rename, reorder, archive (only when empty). Configured in `config/branches.json` (`code`, `name`, `usn_code`).
- **HOD appointments** — one active HOD per branch, with history. When an appointment ends, access ends on the next request ("Your HOD access has ended"). A branch can be temporarily without an HOD; suspended heads are flagged.
- **Branch transfers** — an HOD requests, the Principal approves (or moves a student directly). The student's records move with them, their mentor assignment ends, and everyone involved is notified.
- **Branch switcher** — the Principal narrows any page to one branch (a sheet on phones); HODs see a fixed branch chip.
- **Grading** — one college-default grading scheme and risk rules; HODs may override for their branch only when the Principal allows it. Finalized history is never recalculated.
- **Out of scope = not found** — opening another branch's student, PDF or file returns 404, and searches, counts and exports only ever include your scope.

<table>
<tr>
<td width="50%" valign="top">

**🏫 Principal — College overview**

<img src="screenshots/principal-overview.png" alt="Principal college overview: coverage hero, branch tiles, branch comparison chart, students by branch donut, branch health table and needs-attention list">

</td>
<td width="50%" valign="top">

**📚 Principal — Students by branch**

<img src="screenshots/principal-students.png" alt="Students grouped by branch with coverage and flagged counts per branch">

</td>
</tr>
<tr>
<td width="50%" valign="top">

**👑 Principal — Heads of department**

<img src="screenshots/principal-hods.png" alt="One HOD per branch with change/end actions and appointment history">

</td>
<td width="50%" valign="top">

**🧭 HOD — Branch overview**

<img src="screenshots/hod-branch-overview.png" alt="HOD overview limited to their own branch with the branch chip in the header">

</td>
</tr>
</table>

Verification details — scoping matrix, attack tests, revocation, college-size performance — are in [E2E_REPORT.md](E2E_REPORT.md).

<br>

## 📸 Screenshots

<table>
<tr>
<td width="50%" valign="top">

**🏠 Landing**

<a href="https://mentora-zeta-six.vercel.app/"><img src="screenshots/landing.png" alt="Mentora landing page"></a>

What Mentora is, at a glance — with a path straight to sign-in or student sign-up.

</td>
<td width="50%" valign="top">

**🎓 Student sign-up**

<a href="https://mentora-zeta-six.vercel.app/signup"><img src="screenshots/signup.png" alt="Student sign-up page"></a>

Free for students, with live password rules. The account is created as a student by the database itself — the role is never taken from the form.

</td>
</tr>
<tr>
<td width="50%" valign="top">

**📈 Student dashboard**

<img src="screenshots/student-dashboard.png" alt="Student dashboard">

Credits, goals and subjects in one banner; an SGPA trend with values per semester; CGPA with personal best; a single **Next step** chosen from your own data; mentor feedback and upcoming sessions.

</td>
<td width="50%" valign="top">

**📚 Academic records**

<img src="screenshots/student-academics.png" alt="Academic records page">

Every semester with its status — Draft, Submitted, Verified — and the reason whenever an SGPA can't be calculated yet. Verified semesters are locked.

</td>
</tr>
<tr>
<td width="50%" valign="top">

**🎯 Improvement plan**

<img src="screenshots/student-plan.png" alt="Improvement plan with goals and action points">

Goals and action points from your mentor, with steps you tick off, due dates and status you update yourself.

</td>
<td width="50%" valign="top">

**🧑‍🏫 Student profile (mentor view)**

<img src="screenshots/student-profile.png" alt="Student profile seen by a mentor">

Everything about one student — records, analytics, mentoring, resources, sessions, journey and report — with Recommend, Schedule and Download report one click away.

</td>
</tr>
<tr>
<td width="50%" valign="top">

**✅ Verifications**

<img src="screenshots/verifications.png" alt="Record verification queue">

Submitted semesters to check against official results. Verify in bulk, or return with a note. Correction requests show current versus proposed values.

</td>
<td width="50%" valign="top">

**📅 Sessions**

<img src="screenshots/sessions.png" alt="Sessions agenda with mini calendar">

Upcoming and past sessions with a calendar that filters by day. Each session has an `.ics` file, a meeting link and a summary once it's done.

</td>
</tr>
<tr>
<td width="50%" valign="top">

**🏛️ HOD dashboard**

<img src="screenshots/hod-dashboard.png" alt="HOD branch overview">

Mentoring coverage, students needing intervention, SGPA by section, risk overview and mentor workload — every tile and bar opens the matching filtered list.

</td>
<td width="50%" valign="top">

**🔀 Mentor assignments**

<img src="screenshots/assignments.png" alt="Drag and drop mentor assignment board">

Drag students between mentors or move several at once. Each change notifies the people involved, is recorded in history, and can be undone.

</td>
</tr>
<tr>
<td width="50%" valign="top">

**📊 Branch analytics**

<img src="screenshots/analytics.png" alt="Branch analytics">

Pass rate, SGPA distribution, trends by section and the subjects that need support — every chart has a **View as table** option.

</td>
<td width="50%" valign="top">

**📱 Built for phones**

<p align="center"><img src="screenshots/mobile.png" alt="Student dashboard on a phone" width="60%"></p>

Designed separately for mobile: bottom navigation, a quick-action sheet, swipeable stat cards and one-subject-at-a-time marks entry.

</td>
</tr>
</table>

<br>

## 🚀 Try it

1. Open **[mentora-zeta-six.vercel.app](https://mentora-zeta-six.vercel.app/)** and choose **Create an account** (students) with your USN email — your branch is taken from it.
2. Complete the five-step setup — your details save as you go.
3. Add a semester and enter your marks. Submit it when it matches your official result; your mentor verifies it.

Mentors, HODs and the Principal receive an email invitation and set their own password.

<br>

## 🏗️ Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI["Next.js 16 App Router<br/>React 19 · Tailwind v4"]
  end
  subgraph Vercel
    RSC["Server Components<br/>& Server Actions"]
    API["Route handlers<br/>PDF · exports · imports · .ics · cron"]
    PROXY["proxy.ts<br/>session refresh"]
  end
  subgraph Supabase
    AUTH["Auth<br/>email + invites"]
    DB[("Postgres<br/>RLS on every table<br/>audit triggers · RPCs")]
    ST["Private Storage<br/>avatars · resources"]
    RT["Realtime<br/>notifications"]
  end
  UI --> PROXY --> RSC
  UI --> API
  RSC --> DB
  API --> DB
  RSC --> AUTH
  API --> ST
  RT -.-> UI
  CRON["Vercel Cron<br/>daily reminders"] --> API
```

- **Server-first.** Pages are Server Components; mutations are Server Actions that return `{ ok, data | error }`.
- **Rules in pure TypeScript.** The grading, insight and risk engines are framework-free and unit-tested.
- **The database is the source of truth for access.** Row-Level Security, `SECURITY DEFINER` helpers and triggers enforce who can see and change what; the app adds a second layer of checks on top.

More in [ARCHITECTURE.md](ARCHITECTURE.md).

<br>

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, `proxy.ts`), React 19, TypeScript (strict) |
| UI | Tailwind CSS v4, Radix UI, Motion, Recharts, cmdk, dnd-kit, Plus Jakarta Sans |
| Forms & validation | react-hook-form, Zod 4 |
| Data & auth | Supabase — Postgres with RLS, Auth, Storage, Realtime |
| Documents | @react-pdf/renderer + pdf-lib (PDF reports), ExcelJS and PapaParse (imports / exports) |
| Testing | Vitest (unit + RLS against a live database), Playwright (end-to-end) |
| Hosting | Vercel (app + daily cron), Supabase Cloud (database) |

<br>

## ⚡ Quick Start

**Prerequisites:** Node 22+, pnpm, Docker Desktop (for the local Supabase stack).

```bash
git clone https://github.com/SiddharthaChathra/mentora.git
cd mentora
pnpm install

pnpm db:start                    # local Supabase: API :54321 · Studio :54323 · Mailpit :54324
cp .env.example .env.local       # paste the local keys printed by db:start; set CRON_SECRET, SEED_HOD_*, SEED_PRINCIPAL_*, DEMO_PASSWORD, E2E_PASSWORD
# edit config/branches.json with your branches (code, name, usn_code)
pnpm db:reset && pnpm db:seed && pnpm db:seed:demo
pnpm exec tsx tests/fixtures/multibranch.seed.ts   # optional: ECE/ME test branches + accounts for the multi-branch tests

pnpm dev                         # http://localhost:3000
```

The base seed creates every branch from `config/branches.json`, the first HOD and the Principal; the demo seed adds 6 mentors and 60 students with realistic records to the first branch. Their logins are listed in [DEMO.md](DEMO.md); passwords come from your `.env.local`.

| Script | What it does |
|---|---|
| `pnpm dev` / `pnpm build` | Develop / production build |
| `pnpm typecheck` · `pnpm lint` | TypeScript and ESLint (React Compiler rules) |
| `pnpm test` | Unit tests for the grading, insight and risk engines |
| `pnpm test:rls` | Row-Level Security tests against the local database, incl. the multi-branch scoping matrix and policy lint |
| `pnpm test:e2e` | Playwright journeys + a crawl of every page at desktop and phone widths |
| `pnpm db:types` | Regenerate database types after a migration |
| `docker exec -i supabase_db_mentora psql -U postgres < tests/fixtures/load.seed.sql` | College-size load data (8 branches × 400 students) for performance checks; `load.clean.sql` removes it |

Deploying your own copy: see [DEPLOY.md](DEPLOY.md).

<br>

## 🛡️ Security Model

- **Row-Level Security on every table.** A mentor can read only students *actively* assigned to them; a student only their own data; an HOD only the branch they currently head; the Principal every branch, read-only, and never private mentor notes. Out-of-scope pages are a plain 404.
- **Branches are enforced in the database.** Mentor and mentee must share a branch (`MB_CROSS_BRANCH`); changing an HOD or moving a student revokes old access on the very next request.
- **Roles live in the database.** They are read from `public.users`, never from anything the browser sends. Self sign-up can only ever create a student account, in the branch named by the USN email; HOD appointments and role changes are audited.
- **Locked records.** Once a semester is verified, its marks can change only through an approved correction request, applied in a single transaction.
- **Service-role key is fenced off.** It is used only in server code under `src/server/admin/*`, after an HOD or cron-secret check, and ESLint blocks it everywhere else.
- **Private files.** Avatars and resources live in private buckets and are served through short-lived signed links after a permission check.
- **Append-only audit log.** Changes to marks, assignments, roles, settings and every PDF or export download are recorded and cannot be edited.
- **Hardened delivery.** Strict Content-Security-Policy, HSTS and related headers; rate-limited sign-in, sign-up and password flows.

<br>

## 🧪 Testing

| Suite | Count | Covers |
|---|---|---|
| Unit (Vitest) | 64 | Grade resolution, SGPA/CGPA, insights, risk rules, scope helpers, admin paths refuse before any service-role call |
| RLS (Vitest + live Postgres) | 40 | Scoping matrix (10 actors × every student-data table × 3 branches), cross-branch writes, storage, HOD-change and transfer revocation, policy lint, sign-up |
| End-to-end (Playwright) | 21 | Smoke journeys, multi-branch attack tests (404s, leak scan of pages/PDFs/exports/search), Principal journeys at 1440/834/390, transfer and HOD-revocation flows, plus a crawl of **79 routes × 2 screen widths** for all four roles |

<br>

## 📚 Documentation

| Document | Contents |
|---|---|
| [USER_GUIDE.md](USER_GUIDE.md) | How students, mentors, HODs and the Principal use Mentora |
| [E2E_REPORT.md](E2E_REPORT.md) | Multi-branch verification: migration checks, scoping matrix, fixes, performance |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Route map, folder layout, security model, data rules |
| [DESIGN.md](DESIGN.md) | The "Sky Dashboard" design system: tokens, type, components, contrast |
| [FEATURES.md](FEATURES.md) | Feature checklist with verification status |
| [DEPLOY.md](DEPLOY.md) | Deploying to Supabase Cloud and Vercel |

<br>

## 📎 Appendix A: Build Prompt

Mentora was built with AI coding agents (Google Antigravity, then Claude Code) working from my prompts. Over the project I wrote many prompts: a long first build prompt with nine phases and a feature checklist, a redesign prompt for the "Sky Dashboard" look, a multi-branch prompt that turned it into a college-wide system with a Principal role, and a series of follow-up requests. The prompt below combines all of them into one, written so that it describes the finished project.

<details>
<summary><b>Show the full build prompt</b></summary>

```text
# MISSION
Build "Mentora", a production-quality Smart Mentor–Mentee Management System for a whole
engineering college with many branches (CSE, ISE, AIML, MCA, ECE, EEE, ME, CV, AIDS, …) and
four roles: MENTEE (student), MENTOR (faculty), HOD (Head of one branch, who administers that
branch) and PRINCIPAL (college-wide oversight). Every student, mentor, subject and academic
record belongs to exactly one branch. Treat the UI/UX as a core requirement, not a finishing
step. Build it fully, test it as a real user of every role, deploy it at no cost, and document it.

# 1. NON-NEGOTIABLE RULES
1. Every button and page works with real backend data. No mock dashboards, hard-coded arrays,
   placeholder text or TODOs in shipped screens.
2. Access control is enforced in the backend: PostgreSQL Row Level Security on every table plus
   server-side guard functions. Hiding something in the UI is never the only protection.
3. Scopes: MENTEE = self. MENTOR = active assigned mentees (always in the mentor's branch).
   HOD = only the one branch they currently head. PRINCIPAL = every branch, read-only on
   student data. This holds on every surface: pages, server actions, API routes, RPCs, file
   downloads, signed links, searches, counts, exports, imports, notes, analytics and PDFs.
4. Mentors see only their ACTIVE assigned mentees. Reassigning a student, changing an HOD or
   moving a student to another branch removes the old access on the very next request.
5. A role or branch is never read from anything the client can edit (URL, local storage,
   cookies, user metadata, request body). A ?branch= parameter may only NARROW what the server
   already allows. Role changes and HOD appointments go through audited flows.
6. Out-of-scope records look like "not found" (404) — never a 403 with details — and never
   leak through counts, totals, search suggestions, error messages or notification text.
7. Students can never change their mentor, role, branch, verified records or anyone else's data.
8. Edits to verified academic records go through a correction request that a mentor or HOD
   approves. Never overwrite silently.
9. Important changes (marks, assignments, roles, mentoring records, settings, HOD appointments,
   branch transfers, branch changes, downloads) are written to an append-only audit log with
   actor, action, before, after, time and branch.
10. SGPA, CGPA, percentages and grades are calculated only when the grading scheme and every
    required input exist. Otherwise show "Not calculated" with the reason. Never label a
    student weak when data is missing or not comparable.
11. Charts, automated insights, risk flags and AI text are website-only and never appear in PDFs.
12. Students never see other students' data, rankings or their own risk flags. Branches may be
    compared with each other; individual students are never ranked for anyone.
13. The Principal never sees PRIVATE_MENTOR notes and cannot edit marks, verify or finalize
    records, write mentoring notes or change mentor assignments.
14. Collect only the personal data mentoring needs; DOB, gender and address are optional.

# 2. STACK
Next.js (App Router, Server Components, Server Actions, Route Handlers, proxy.ts) with
TypeScript strict; Tailwind CSS v4 with design tokens; Radix UI primitives; Motion for
animation; Recharts plus custom SVG charts; dnd kit; TanStack Query (client interactivity
only); React Hook Form + Zod; Sonner toasts; date-fns; Lucide icons; cmdk command palette.
Supabase for PostgreSQL, Auth, private Storage and Realtime; SQL migrations in
/supabase/migrations with generated types. @react-pdf/renderer (server-side) and pdf-lib for
PDFs; PapaParse (CSV) and ExcelJS (XLSX); Sharp and react-easy-crop for photos; Resend for
optional email; Vercel Cron for scheduled jobs; optional Gemini AI behind a feature flag.
Tests: Vitest (unit), Vitest against a local Supabase (RLS), Playwright (end-to-end).
Hosting: Vercel + Supabase.

# 3. ENGINEERING RULES
- Validate every input on the server with Zod. One response shape: { ok, data } or
  { ok: false, error: { code, message, fieldErrors } }, through one handle() wrapper.
- Use database functions (transactions) for multi-row writes: assignments, imports,
  verification, correction approval, HOD appointments and branch transfers.
- SQL helper functions are SECURITY DEFINER, STABLE, search_path = '' and called in policies
  as (select app.helper()) so they run once per query, not once per row.
- One server-side scope function (getScope: SELF / MENTOR / BRANCH / COLLEGE / NONE) read fresh
  from the database on every request, plus assertCanViewStudent, assertCanReadDepartment,
  assertCanManageDepartment and assertPrincipal guards.
- The service-role key is used only in server admin code AFTER a scope check, and only for
  the branch the actor may act on. A unit test proves no admin call happens without one.
- Files live in private buckets; check type, extension and size on the server; serve them
  through signed links that last at most 60 seconds, issued only after an access check.
- Server-rendered clock times use the college time zone (servers run in UTC).
- No secrets in code, logs, commits or chat. Keep .env.example with names only.

# 4. BRANCHES, APPOINTMENTS AND TRANSFERS (data model)
- departments = branches: code, name, usn_code (the letters after the year in a USN),
  display order, status ACTIVE/ARCHIVED. Seeded from config/branches.json. A branch can only
  be archived when it has no active students or staff.
- department_heads: appointment history; one active HOD per branch and one branch per HOD;
  a branch may temporarily have no HOD (the Principal covers it).
- student_branch_transfers: PENDING -> APPROVED/REJECTED. Approval runs one transaction that
  moves the student, ends their mentor assignment, re-scopes all their records to the new
  branch, and notifies the student, both HODs and the old mentor.
- Mentor and mentee must be in the same branch (database trigger, error MB_CROSS_BRANCH).
- Every scoped table carries a department_id filled by a trigger from the student or mentor,
  never from the client, and kept in sync on transfer.
- Grading scheme and risk thresholds: one college default; an HOD may add a branch override
  only while the Principal allows "branch-specific grading". Finalized history is never
  recalculated.
- Migrating the earlier single-department data: back up first, move it into one named branch
  (EXISTING_DATA_BRANCH_CODE) with equal row counts, and make the existing HOD its head.

# 5. AUTHENTICATION AND ROLES
- Email + password sign-in, forgot and reset password, invitation acceptance.
- After sign-in, the server reads role, status and (for HODs) the active appointment and sends
  the user to /mentee, /mentor, /hod or /principal, to /setup if the profile is incomplete, to
  /suspended, or to "Your HOD access has ended" when an HOD's appointment has ended.
- Students sign up themselves at /signup with their USN email (e.g. nnm23cs001@…): a database
  trigger always makes them an ACTIVE MENTEE in the branch named by the USN code (cs → CSE).
  Non-USN emails, unknown branch codes and (when set) other email domains are refused with a
  clear reason; the Principal can turn self sign-up off.
- Mentors are invited by their HOD (own branch only); HODs and mentors in any branch can be
  invited by the Principal, who can appoint an invited HOD as branch head straight away.
- A Principal following an /hod link lands on the matching /principal page; every other role
  is redirected away from /principal.
- Account page: photo, password change, signed-in devices with "sign out everywhere",
  notification preferences, low-bandwidth mode.
- Suspended, 403, 404, offline, error and "HOD access ended" pages.

# 6. FIRST-TIME SETUP WIZARD (role-aware)
- Student: personal details and photo; academic identity (USN, branch shown read-only,
  program, semester, section, admission year, expected graduation); academic history; skills,
  interests, career goals, achievements and support areas; review and finish. The mentor is
  shown read-only.
- Mentor: name, photo, official email, phone, branch (read-only), designation, faculty ID,
  expertise.
- HOD and Principal: short profile.
- Autosave every change, resume where the user left, list missing required fields, inline
  validation, a progress indicator and a small celebration at the end.

# 7. STUDENT (MENTEE) FEATURES
- Overview: CGPA hero card, credit progress, current semester, mentor card, next session,
  latest feedback, and one data-driven "next step" card.
- Academic records: semesters with SGPA, credits and status. Per subject: name, code, credits,
  MSE and SEE with maximum marks, internal assessment components, grade, grade points, result.
  Marks, percentages, grades, SGPA and CGPA are kept clearly separate.
- Marks entry grid: subjects filled in from the branch catalogue, Tab and Enter navigation,
  paste from Excel or Google Sheets, per-row autosave; one subject per screen on phones.
- Workflow: DRAFT -> SUBMITTED -> VERIFIED (mentor or HOD) -> FINALIZED (HOD). A returned
  semester goes back to DRAFT with a note. Verified marks are locked; changes need a correction
  request.
- Analytics: SGPA trend, MSE vs SEE per subject, credit completion, result summary, filters.
  Rule-based insights (strengths, needs attention, suggested focus, improved, declined), each
  with a "Why am I seeing this?" list of evidence. Personal bests only, no rankings.
- Feedback and improvement plan, resources library with "new" markers, sessions with calendar
  (.ics) files, an Academic Journey timeline, notifications. The profile shows the branch
  read-only.

# 8. MENTOR FEATURES
- Overview: average SGPA, students who need attention (with reasons), pending follow-ups,
  sessions this week, subject performance with drill-down.
- My mentees: search, filters (semester, section, risk, follow-ups), saved views as chips.
- Mentee profile with tabs: overview, academics, analytics and insights, mentoring, resources,
  sessions, journey, report.
- Verifications: queue of submitted semesters, bulk verify, return with a note, review
  correction requests side by side.
- Recommendations and feedback: kind (recommendation, feedback, goal, action point, strength,
  improvement area), category, due and review dates, visibility shared or private to the
  mentor, "include in report", follow-ups and status history.
- Upload study materials, schedule sessions (in person or online), record summaries and action
  items, cohort analytics, PDF reports per mentee, and an optional AI summary that the mentor
  must review and approve before the student sees it.

# 9. HOD FEATURES (own branch only)
- The header shows a fixed branch chip (e.g. "ISE · Information Science and Engineering");
  there is no branch filter anywhere on HOD screens.
- Branch overview: coverage, mentor workload, risk overview, section SGPA comparison, mentoring
  constellation, students with missing records or incomplete profiles; every number opens the
  students behind it.
- Student and mentor directories with search, filters, sorting and saved views; mentor detail
  with capacity and activity.
- Assignment board: drag students between mentor columns (keyboard accessible), bulk reassign,
  confirmation, Undo, and a history of every change — mentors and students of the same branch only.
- Interventions: flagged students with reasons, follow-up requests to mentors.
- Users: invite, resend, change role between Mentee and Mentor, suspend and reactivate — for
  their own branch only; HODs and the Principal are managed by the Principal.
- Student profile: "Request branch transfer" (target branch + reason) for the Principal.
- Settings: sections and subjects catalogue; grading scheme and risk thresholds only as a
  branch override while the Principal allows it (otherwise shown read-only with the reason).
- Bulk import of students, mentors, subjects and results from CSV/XLSX into their own branch:
  templates, preview with per-row errors (rows naming another branch are rejected), duplicate
  detection, skip or update, confirmation, downloadable error report.
- Exports, branch analytics, and a searchable audit log of their own branch with before/after.

# 10. PRINCIPAL FEATURES (/principal, whole college, read-only on student data)
- Shell: same icon rail and floating header as the other roles, plus a branch switcher pill
  ("All branches ▾" then each branch) next to the semester switcher. The choice lives in the
  URL (?branch=CSE), is remembered per user, and only narrows what the server allows. On
  phones it becomes a bottom sheet.
- College overview: hero card "College mentoring coverage" with "See branches"; tiles for
  branches (and how many have no active HOD), students, mentors, unassigned students, flagged
  students and pending transfers; a branch comparison chart that toggles average SGPA
  (previous vs latest semester), mentoring coverage and missing records — click a bar to open
  the branch; a "Students by branch" donut; a branch health table (branch, HOD or "No HOD" /
  "Suspended", students, mentors, coverage bar, flagged, incomplete profiles, last activity);
  and a "Needs your attention" card listing branches without an active HOD, pending
  transfers and branches below 80% coverage. Choosing one branch shows that branch's HOD
  overview read-only with a "Viewing as Principal · read-only" banner.
- Branches: cards with code, USN code, name, HOD and coverage ring; create, rename, reorder
  and archive (archive refused while the branch has active people); open a branch to see its
  read-only overview.
- Students by branch: collapsible branch sections (header: name, HOD, student count, coverage
  bar, flagged count; branches with students start open) with the first rows and "See all in
  <branch>"; a toggle to one flat table with a Branch column and branch chips. Search by name
  or USN; filters for academic year, mentor assigned/unassigned, risk and profile completion;
  sort by name, branch or semester (never by rank or CGPA); saved views. Rows open the
  existing student profile read-only: no Recommend, Schedule, Verify or assignment actions,
  private mentor notes hidden, PDF download allowed and audited.
- Mentors by branch: workload bars, 30-day activity, flagged mentees and last activity;
  read-only, with a per-branch preview and "See all".
- Analytics: college trends by semester with one line per branch, SGPA distribution, pass
  rate, subjects needing support, plus per-branch bars (average SGPA, pass rate, mentoring
  activity, coverage). Every chart has "View as table".
- Interventions: flagged students across branches, grouped by branch, reasons always shown,
  read-only, with a "Notify HOD" button that sends the branch HOD an in-app notification.
- HODs: one card per branch with the current HOD (and a warning if their account is
  suspended), Appoint / Change HOD (pick a faculty member of that branch, or invite someone new
  as HOD), End appointment, and the full appointment history. The old HOD loses access
  immediately; both people are notified; everything is audited. A mentor appointed HOD hands
  back their mentees so the new HOD can reassign them.
- Transfers: pending requests from HODs with Approve / Reject and a note, a "Move a student"
  action (search by name or USN, target branch, reason), and the decided history.
- Users: every account in the college or one branch, with a Branch column; invite
  HOD / MENTOR / MENTEE into any branch (optionally appointing an HOD at once); change roles
  between Mentee and Mentor; suspend or reactivate; the last active Principal can never be
  removed.
- Imports: same wizard as the HOD, but the Principal chooses the target branch first.
- Exports: college-wide or one branch (CSV, XLSX and a PDF summary grouped by branch).
- Settings: college grading scheme and risk rules; academic years; the "Allow branch-specific
  grading" switch; student self sign-up on/off; optional required student email domain;
  profile fields and features.
- Audit history: every entry in the college, filterable by branch, entity, action and date.
- Mobile: bottom navigation (Overview · Students · Branches · Analytics) and a "+" sheet with
  Appoint an HOD, Move a student and Export.

# 11. RISK FLAGS (mentor, HOD and Principal only; each with its reason)
Failed subject in the latest semester; SGPA drop of 0.5 or more (or MSE to SEE drops in two or
more subjects); missing results for the last semester; two or more assessments below 40%;
profile incomplete after 14 days. Thresholds come from the college default or, when allowed,
the branch override.

# 12. PDF REPORT
Only the student's active mentor, their branch HOD or the Principal can download it, and every
download is audited. Header "<College> · <Branch>". Sections: student information (with photo),
academic summary, semester-wise performance, and mentoring records marked "include in report".
A4, branded header and footer, "Page X of Y", tables that never split a row badly. No charts,
insights, risk flags or AI text.

# 13. NOTIFICATIONS AND REMINDERS
Realtime bell with unread count; notification centre grouped Today / This week / Earlier with
Mark done, Open and Snooze. New events: HOD appointed or ended, transfer requested or decided,
student moved in or out, "Principal asked you to review flagged students". A daily Vercel Cron
job (protected by a secret) reminds mentors of follow-ups and students of incomplete profiles,
missing results and drafts; email via Resend or the Supabase SMTP sender when configured.

# 14. DESIGN: "SKY DASHBOARD"
Match the two reference dashboards I provided: a pale blue canvas, floating white rounded
cards, a slim left icon rail, one glossy blue gradient hero card per page, pastel stat tiles
with corner icon badges, smooth line charts with soft fill, rounded bars, donut charts with a
centre total, and roomy tables with progress bars. Use only design tokens. Every data view
has a skeleton, a designed empty state, an error state with retry, and success feedback.
UX additions: a global semester switcher that filters every page (with a "Filtered to Semester
N · Show all" chip), a branch switcher for the Principal, a Ctrl+K command palette with recent
searches (scoped like everything else), a next-step card, drill-down from every number, delta
chips that say what they compare, Undo on quick actions, a replayable first-visit tour for
every role (including the Principal), keyboard shortcuts, "?" help on terms like SGPA and MSE,
and friendly copy that says how to fix an error.
Mobile is designed separately: bottom navigation, a "+" quick-action button, cards instead of
wide tables, no horizontal scrolling. Accessibility: WCAG 2.2 AA contrast, visible focus,
full keyboard use, labels, reduced motion, and a "View as table" option on every chart.

# 15. PERFORMANCE AT COLLEGE SIZE
Load a test college of 8 branches × 400 students × 4 semesters. Pages must stay under 2.5 s
(p95) on the production build: read policies use once-per-query helpers instead of per-row
function calls, rosters load in parallel with a slim select, and the Principal's
college-wide pages use short-lived per-session summaries that are cleared on every write.

# 16. HOW TO WORK (the loop)
For every slice: plan -> build -> run typecheck, lint, tests and build -> open the screens at
390, 834 and 1440 px -> score them against a 10-point UI rubric -> fix anything below 9 ->
repeat -> tick FEATURES.md, update PROGRESS.md and commit. Keep DESIGN.md, ARCHITECTURE.md
(including the role × permission matrix), FEATURES.md, PROGRESS.md and E2E_REPORT.md up to
date. If something needs me (an account, a key, a dashboard setting, a production change),
stop and give click-by-click instructions.

# 17. TESTING
Unit tests for the grading, insights and risk engines (including missing data), the scope
helpers, and the admin paths (no service-role call without a valid scope). Database access
tests that sign in as each role. A multi-branch scoping matrix signs in as the Principal, two
branch HODs, a former HOD, a suspended HOD, mentors and students of different branches, and
anonymous, and checks every student-data table for every branch, cross-branch write attempts,
storage files, the Principal never seeing private notes, and revocation after an HOD change
and a branch transfer. A policy lint test fails the build if any policy trusts is_hod()
without a branch condition or any table has RLS off. End-to-end tests for the main journeys
plus attack tests (another branch's profile, PDF, file, export and search must be 404 or
empty, with a leak scan of every response), the HOD-revocation and transfer journeys, and a
crawl of every page for all four roles at desktop and phone widths that fails on errors,
error screens or horizontal overflow. Then test every page and button by hand as a real user
of each role, fix everything that fails, and keep going until two complete runs in a row are
green.

# 18. DEMO DATA, DEPLOYMENT AND HANDOVER
- Base seed: every branch from config/branches.json with sections, the college grading scheme
  and risk rules, the first HOD (appointed to the existing branch) and the Principal.
- Demo seed: several mentors and about 60 students in one branch with realistic subjects,
  varied results, feedback, goals, resources, sessions and risk cases. A multi-branch test
  fixture adds more branches and every kind of account for the tests.
- Deploy at no cost: a Supabase project, a public GitHub repository and Vercel with
  auto-deploy from main; set environment variables; back up production before migrating it;
  run a smoke test against the live site as every role.
- Documentation: README written as a showcase of the live website with screenshots, plus
  DEPLOY.md, USER_GUIDE.md, ARCHITECTURE.md, E2E_REPORT.md and a handover file.
```

</details>

<br>

## 📎 Appendix B: Running the Project

```bash
pnpm install
pnpm db:start        # local Supabase in Docker
pnpm db:reset        # apply all 19 migrations (001–010 single department, 011–019 multi-branch)
pnpm db:seed         # branches from config/branches.json, grading scheme, first HOD, Principal
pnpm db:seed:demo    # optional demo students and mentors
pnpm exec tsx tests/fixtures/multibranch.seed.ts   # optional: extra branches + accounts for the multi-branch tests
pnpm dev             # http://localhost:3000

pnpm typecheck && pnpm lint && pnpm test && pnpm test:rls && pnpm test:e2e
```

Before seeding, copy `.env.example` to `.env.local` and fill in the local Supabase keys, `SEED_HOD_*`, `SEED_PRINCIPAL_*`, `DEMO_PASSWORD` and `E2E_PASSWORD`, and list your branches (`code`, `name`, `usn_code`) in `config/branches.json`.

<br>

<div align="center">

Built with Next.js, Supabase and a lot of care for the people who mentor.

<a href="https://mentora-zeta-six.vercel.app/"><b>mentora-zeta-six.vercel.app</b></a>

</div>
