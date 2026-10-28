# FEATURES.md

`[x]` = built and verified (tests, gates or browser check) · `[ ]` = not done / needs a manual step.

## Auth & roles
- [x] Email/password login, forgot/reset, invite acceptance (`/auth/confirm`)
- [x] Student self sign-up (`/signup`): DB trigger always creates an ACTIVE MENTEE in the branch named by the USN email (`nnm23cs001@…` → CSE); non-USN emails and unknown branch codes refused; mentors/HODs only by invite; the Principal can disable it or require a college domain
- [x] Roles MENTEE / MENTOR / HOD / PRINCIPAL from the `users` table (+ active `department_heads` row for HODs) only; `proxy.ts` + `pageGuard` + RLS
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
- [x] Branch overview, students/mentors directories, mentor detail and capacity (own branch only)
- [x] Assignments board (drag, bulk, undo, history), interventions with follow-up requests
- [x] Users & roles (invite MENTEE/MENTOR into own branch, resend, suspend), settings (grading + risk rules as a branch override when allowed, sections, subjects)
- [x] Imports (CSV/XLSX preview → commit, error report), exports, audit log
- [x] Daily cron reminders (`CRON_SECRET`)

## Platform
- [x] Notifications (Realtime bell + center), audit triggers, rate limits, CSP/HSTS headers
- [x] Unit tests (55), RLS tests (11), e2e smoke (5), production build
- [ ] Cloud deploy — MANUAL STEPS in DEPLOY.md

## UX v2 (Sky Dashboard)
- [x] UX2-01 Global semester switcher (cookie): mentor/HOD pages filter to students currently in that semester (rosters, counts, workload, charts, verifications, recommendations, reports); student overview/academics/analytics focus on it; "Filtered to Semester N · Show all" chip; hidden on pages it doesn't affect; visible on mobile
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
- [x] Rubric re-score against the reference images (≥ 9 at 1440/834/390)

## Multi-branch (MB)
Evidence: `tests/rls/matrix.test.ts` (M), `tests/rls/policy-lint.test.ts` (L), `tests/unit/admin-guards.test.ts` (G), `tests/e2e/multibranch.spec.ts` (E), `tests/e2e/crawl.spec.ts` (C), `E2E_REPORT.md` (R).
- [x] MB-01 Branches table seeded from config/branches.json; create, rename, reorder, archive (archive blocked while active people exist) — seed + /principal/branches; M "branch with active students cannot be archived"
- [x] MB-02 PRINCIPAL role: seeded account, server-side role recognition, redirect to /principal — seed.ts; E "Principal journey"; C principal crawl
- [x] MB-03 HOD appointments with history; one active HOD per branch and one branch per HOD; "No HOD" state — migration 012 unique indexes; /principal/hods; E "access ended"
- [x] MB-04 Existing data migrated to EXISTING_DATA_BRANCH_CODE with equal row counts; NOT NULL branch on scoped tables — R "Data migration"
- [x] MB-05 RLS rewrite: HOD reads/writes only own branch on every table, bucket and RPC; policy lint test — M, L, tests/rls/policy-inventory.md
- [x] MB-06 Principal read-only on student data across all branches; never sees PRIVATE_MENTOR notes — M "Principal cannot write", "never sees a PRIVATE_MENTOR note"; L
- [x] MB-07 Same-branch mentor assignment enforced in the DB (MB_CROSS_BRANCH) — M "cross-branch mentor assignments are refused"
- [x] MB-08 Server guards: getScope, scoped queries, admin paths guarded, out-of-scope → 404, no leaks in counts/search/errors — G; E "attack tests"; M "counts and totals"
- [x] MB-09 Immediate revocation on HOD change and on student branch transfer — M "revocation"; E "access ended", "transfer journey"
- [x] MB-10 Branch transfer: HOD request → Principal approve/reject → transactional move, assignment ended, notifications, audit — M, E "transfer journey"
- [x] MB-11 HOD screens locked to own branch (branch chip, no branch filter, invite limited to MENTEE/MENTOR in own branch) — E "HOD journey"; C hod crawl
- [x] MB-12 Principal College overview: coverage hero, KPI tiles, branch comparison chart, branch health table, needs-attention card — /principal; E; C
- [x] MB-13 Principal students grouped by branch (collapsible sections + flat table toggle), search/filters/saved views, read-only profile + PDF — /principal/students; E
- [x] MB-14 Principal mentors, interventions and analytics per branch and college-wide, every chart with "View as table" — /principal/{mentors,interventions,analytics}; C
- [x] MB-15 Branch switcher pill (URL-synced, remembered, only narrows scope) — app-shell BranchSwitcher/BranchSheet; E "switch branch"
- [x] MB-16 Principal HOD management, transfers, users, imports (branch chosen; rows naming another branch rejected), exports, settings, audit — /principal/*; C
- [x] MB-17 Grading/threshold resolution: branch override → college default; Principal toggle for branch grading — services/academics loadScheme/loadThresholds; E "HOD journey" (locked note)
- [x] MB-18 Scoped audit log (HOD = own branch, Principal = all) and scoped notifications for new events — M "audit log"; RPC notifications
- [x] MB-19 PDF header shows college + branch; Principal downloads audited; still no charts/insights/risk/AI — report/document.tsx; E "Principal journey" (PDF 200)
- [x] MB-20 Mobile Principal navigation (bottom nav, quick-action sheet, branch sheet) — nav.ts MOBILE_NAV/QUICK_ACTIONS, BranchSheet; C 390px 0 problems. Rubric v2 not formally scored (screenshots in screenshots/multibranch/)
- [ ] MB-21 E2E: scoping matrix ✅, API attack ✅, revocation ✅, role journeys ✅, full regression ✅, perf at college size ✅ (prod build), 2 consecutive green runs (see R) — **visual regression vs baseline, axe and Lighthouse not run**
- [x] MB-22 No student rankings anywhere; branch comparisons only for HOD/Principal — Principal students sort by name/branch/semester only; E "no student is ranked"
