# PROGRESS.md

## Latest (2026-10-25)
- Finished: V2.R5 re-skin of every screen + UX2-01…15, V2.R6 tests & docs. Next: V2.R7 rubric re-score against the reference images (after M1), then cloud deploy (M2–M6).
- Gates: typecheck ✅ · lint ✅ (0 problems) · unit 55/55 ✅ · RLS 11/11 ✅ · e2e 5/5 ✅ · build ✅ · v1 grep over `src/` = 0.
- Decisions:
  - Reference images missing → built from the prompt's written analysis (M1 open).
  - Saved views stored per browser (localStorage); filters aren't sensitive.
  - Notification snooze = `notifications.snoozed_until` (migration 008) with a column-level grant.
  - Marks grid only on desktop drafts; mobile keeps the one-subject dialog.
  - Help tips use popovers (work on touch) fed by `src/lib/glossary.ts`.
  - Dark theme removed (light only); `m_theme` cookie no longer written.
  - React Compiler lint: prop→state sync via `useSyncedState` (adjust-during-render), not effects.
- Known issues: none failing. Viewport rubric checked at 1440/834/390 on dashboards; full reference comparison pending M1.
- Demo data note: Ananya Sharma now has a Semester 3 draft (created while testing the marks grid); `pnpm db:seed:demo` resets it.
- Open manual steps: M1 reference images · M2 Supabase project · M3 auth URLs/templates · M4 Resend · M5 Vercel env + cron · M6 first HOD seed (see DEPLOY.md).

## History
- V1: full app (auth, roles, RLS, records, mentoring, HOD admin, imports/exports, PDF, notifications, cron, demo seed).
- V2.R1–R4: tokens, Plus Jakarta Sans, 3D icons/scenes, component library, shell, mentee overview, auth pages, styleguide.
- V2.R5: mentor/HOD overviews, all remaining screens, UX2 features, lint clean.
- V2.R6: RLS + e2e tests, DESIGN v2 (+ v1 archive), ARCHITECTURE, FEATURES, README, DEPLOY, USER_GUIDE, HANDOFF.
