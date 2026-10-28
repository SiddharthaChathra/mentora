# PROGRESS.md

## Latest (2026-10-28) — Multi-branch ✅ LIVE
- Production (ikeauzqhzpqtsjfbrolr): backup in backups/prod-before-multibranch-2026-10-28.json; 011 applied via MCP, 012–019 run by the user in the SQL Editor (backups/prod-apply-012-to-019.sql); seed created 9 branches (existing data → ISE, HOD nmamitisehod@gmail.com heads ISE) and the Principal. main deployed (284b8b1); live smoke as Principal, ISE HOD and sign-up passed. Server time zone pinned to Asia/Kolkata (src/instrumentation.ts).
- Open (human): Principal changes the temporary password and appoints HODs for the other 8 branches; Supabase Auth email (turn off Confirm email or add SMTP); optional: enable leaked-password protection.

## Previous (2026-10-27) — Multi-branch built and verified locally
- Built: college-wide Mentora. Branches (departments + usn_code/status/order), HOD appointments with history, PRINCIPAL role (read-only on student data, never PRIVATE_MENTOR), branch transfers (HOD request → Principal approve/move), USN-based self sign-up (nnm23cs001@… → CSE), /principal portal (13 pages), HOD branch chip + transfer request + “access ended” page, branch switcher (sheet on phones).
- DB: migrations 011–018 (enum, schema + backfill, helpers + RLS rewrite, RPCs, Principal helpers, policy inventory, scope tightening, RLS performance). Dev data migrated with equal row counts (E2E_REPORT.md).
- Tests: unit 64, RLS 40 (scoping matrix, policy lint), e2e smoke 9 + crawl 4 (79 routes × 2 widths, all 4 roles) + multibranch 8. Fixtures: tests/fixtures/multibranch.seed.ts, load.seed.sql/load.clean.sql.
- Perf (8 branches × 400 students): prod build p95 < 0.75 s on every measured page; dev server 2.7–3.9 s on branch-sized pages (E2E_REPORT.md).
- Decisions: “Branch” = departments row; one HOD per branch; Principal college-wide read-only; college-default grading with optional branch override; out-of-scope = 404; Principal college pages cache digests 60 s per session (invalidated on writes).
- Dev defaults added (change freely): .env.local SEED_PRINCIPAL_EMAIL=principal@demo.mentora.edu (+ password), E2E_PASSWORD, EXISTING_DATA_BRANCH_CODE=CSE, STUDENT_EMAIL_DOMAIN=''; config/branches.json (mc=MCA, ml=AIML are guesses).
- Gaps: visual regression vs baseline, axe/Lighthouse, Rubric v2 scoring of new screens not done.

## History
- MB: multi-branch college (branches, HOD appointments, Principal, transfers, USN sign-up).
- V1: full app (auth, roles, RLS, records, mentoring, HOD admin, imports/exports, PDF, notifications, cron, demo seed).
- V2.R1–R4: tokens, Plus Jakarta Sans, 3D icons/scenes, component library, shell, mentee overview, auth pages, styleguide.
- V2.R5: mentor/HOD overviews, all remaining screens, UX2 features, lint clean.
- D1–D4: cloud DB, Vercel deploy, self sign-up, live smoke test.
- V2.R7: reference comparison + polish; rubric ≥ 9.
- V2.R6: RLS + e2e tests, DESIGN v2 (+ v1 archive), ARCHITECTURE, FEATURES, README, DEPLOY, USER_GUIDE, HANDOFF.
