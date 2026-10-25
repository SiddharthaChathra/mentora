# FEATURES.md

`[x]` = built and verified (tests, gates or browser check) · `[ ]` = not done / needs a manual step.

## Auth & roles
- [x] Email/password login, forgot/reset, invite acceptance (`/auth/confirm`); public sign-up disabled
- [x] Roles MENTEE / MENTOR / HOD from the `users` table only; `proxy.ts` + `pageGuard` + RLS
- [x] Sessions list and revoke, password change, sign out everywhere
- [x] Suspended / 403 / offline / not-found pages

## Mentee
- [x] Setup wizard (autosave, review, celebration) and profile with photo crop
- [x] Academic records: semesters, subjects, MSE/SEE/IA, grade engine, SGPA/CGPA with "not calculated" reasons
- [x] Submit for verification; correction requests on verified records; locked records
- [x] Feedback & plan (goals, steps, reflection), resources, sessions (+ .ics), journey timeline, analytics & insights
- [x] Verified-data PDF report (no charts/insights/risk/AI)

## Mentor
- [x] Only ACTIVE assigned mentees (RLS-tested); roster with filters and saved views
- [x] Verifications (bulk verify, return with note), corrections review
- [x] Recommendations/feedback/goals with follow-ups, private notes, status history
- [x] Resources (private bucket, 60 s signed downloads), sessions with summaries and action items
- [x] Cohort analytics, reports, optional human-reviewed AI summary (flagged off without key)

## HOD
- [x] Department overview, students/mentors directories, mentor detail and capacity
- [x] Assignments board (drag, bulk, undo, history), interventions with follow-up requests
- [x] Users & roles (invite, resend, suspend; last-HOD protection), settings (grading, risk rules, structure, subjects, features)
- [x] Imports (CSV/XLSX preview → commit, error report), exports, audit log
- [x] Daily cron reminders (`CRON_SECRET`)

## Platform
- [x] Notifications (Realtime bell + center), audit triggers, rate limits, CSP/HSTS headers
- [x] Unit tests (55), RLS tests (11), e2e smoke (5), production build
- [ ] Cloud deploy — MANUAL STEPS in DEPLOY.md

## UX v2 (Sky Dashboard)
- [x] UX2-01 Global semester switcher (cookie, every dashboard respects it)
- [x] UX2-02 Command palette with recent searches
- [x] UX2-03 Next-step card (one, dismissible, data-driven, per role)
- [x] UX2-04 Drill-down: tiles, subject/section bars and donut slices open filtered lists
- [x] UX2-05 Delta chips that state the comparison
- [x] UX2-06 Marks grid: catalog autofill, Tab/Enter, paste from Excel/Sheets, per-row autosave; mobile one-subject flow
- [x] UX2-07 Optimistic updates with Undo (status, notifications, saved views, reassignment)
- [x] UX2-08 First-visit product tour, re-openable ("Show me around")
- [x] UX2-09 Quick actions: mobile "+" sheet, keyboard shortcuts (`?` lists them)
- [x] UX2-10 Notification center: Today / This week / Earlier, Mark done, Open, Snooze 1 day
- [x] UX2-11 Saved views as pill chips (directories + mentee list)
- [x] UX2-12 Friendly microcopy from real data; errors say how to fix
- [x] UX2-13 Students see only personal bests; rankings are mentor/HOD-only
- [x] UX2-14 "?" help on SGPA/CGPA/credits/MSE/SEE/grade; "Why am I seeing this?" on every insight
- [x] UX2-15 Card-shaped skeletons; Link prefetch; server-rendered charts
- [ ] Rubric re-score against the reference images (needs M1)
