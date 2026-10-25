# PROGRESS.md

## Latest (2026-10-25)
- Finished: V2.R7 rubric re-score vs design/references (M1 done). Phase V2 complete. Next: cloud deploy (human M2–M6), PR only on request.
- Gates: typecheck ✅ · lint ✅ · unit 55/55 ✅ · RLS 11/11 ✅ · e2e 5/5 ✅ · build ✅ (re-run before PR) · v1 grep `src/` = 0.
- R7 fixes from the references: wide grouped bars (ref-cognify), grey rounded header rows on ProgressTable/RankList, white % pills on the blue StatBanner (ref-kouliah), stronger glossy hero edge, `min-w-0` on dashboard grid cards (fixed 390 px overflow).
- Rubric v2 (1440 / 834 / 390, mentor·HOD·mentee): layout fidelity 9 · colour/tokens 9.5 · typography 9 · data viz 9 · states 9 · mobile 9 · a11y/contrast 9.5 → ≥ 9 everywhere.
- Decisions: earlier list unchanged (saved views per browser, snooze column, marks grid desktop-only, popover help, light only, `useSyncedState`).
- Known issues: none failing. Local dev needs Docker Desktop running (Supabase stack) — logins fail with AuthRetryableFetchError otherwise.
- Demo data: Ananya Sharma has a Semester 3 draft from grid testing; `pnpm db:seed:demo` resets it.
- Open manual steps: M2 Supabase project · M3 auth URLs/templates · M4 Resend · M5 Vercel env + cron · M6 first HOD seed (DEPLOY.md).

## History
- V1: full app (auth, roles, RLS, records, mentoring, HOD admin, imports/exports, PDF, notifications, cron, demo seed).
- V2.R1–R4: tokens, Plus Jakarta Sans, 3D icons/scenes, component library, shell, mentee overview, auth pages, styleguide.
- V2.R5: mentor/HOD overviews, all remaining screens, UX2 features, lint clean.
- V2.R7: reference comparison + polish; rubric ≥ 9.
- V2.R6: RLS + e2e tests, DESIGN v2 (+ v1 archive), ARCHITECTURE, FEATURES, README, DEPLOY, USER_GUIDE, HANDOFF.
