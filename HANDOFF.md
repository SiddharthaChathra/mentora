# HANDOFF
Date/time: 2026-10-25T16:10:00+05:30
From model: Claude Opus 5.5 · Reason: long context
Branch / last commit: feat/v2-sky-dashboard · 74f9428 V2.R6: RLS + e2e tests, v2 docs
Design version: v2 Sky Dashboard (DESIGN.md)
## Where we are
Phase V2 – Sky Dashboard redesign: slices done R1–R6; current slice R7 – score the rubric against the two reference images and polish anything below 9.
## Current slice state
- Done in this slice: nothing yet (R6 closed with all gates green).
- Not done yet:
  - Add `design/references/ref-cognify.png` + `ref-kouliah.png` (human, MANUAL STEP M1) then compare `/mentor`, `/hod`, `/mentee`, `/styleguide` at 1440/834/390.
  - Cloud deploy MANUAL STEPS M2–M6 in DEPLOY.md (human).
- Uncommitted changes: none (HANDOFF.md committed with this file).
## Gates
typecheck pass · lint pass (0) · unit pass 55/55 · rls pass 11/11 · e2e pass 5/5 (`E2E_BASE_URL=http://localhost:3000 pnpm test:e2e`) · build pass
## Next 3 actions (exact)
1. After M1: screenshot `/mentor`, `/hod`, `/mentee` at 1440/834/390 (Playwright MCP, save under `.playwright-mcp/`), score Rubric v2 in PROGRESS.md – files: `src/app/(app)/{mentor,hod,mentee}/page.tsx` – acceptance: FEATURES "Rubric re-score".
2. (Done in V2.R7a) CountUp SSR value fix.
3. Open a PR from `feat/v2-sky-dashboard` only when the user asks; deploy per DEPLOY.md M2–M6.
## Watch out
- RLS helpers in schema `app` must stay SECURITY DEFINER; never add FORCE RLS (breaks them).
- Migrations 001–008 are applied locally; add new ones as 009+, never edit applied files. Run `pnpm db:types` after schema changes.
- `'use server'` files may only export async functions (put shared helpers in `src/lib`).
- React Compiler lint: no setState in effects / Date.now in render / components defined in render — use `useSyncedState`, `useMounted`, module helpers.
- Bash heredocs in this environment halve backslashes; write such files with an editor tool.
- `[auth.email] enable_signup` must stay true in `supabase/config.toml` or email login breaks; public sign-up is off via `[auth] enable_signup=false`.
## Files to read first (max 6)
- PROGRESS.md – latest decisions and gates
- DESIGN.md – tokens, components, rules
- ARCHITECTURE.md – route map, security model
- .agent/rules/mentora-rules.md – non-negotiables
- src/components/charts/dashboard.tsx – v2 chart components
- src/server/services/dashboard.ts – overview aggregations
## Suggested model for the next work
Gemini Flash for screenshot/rubric polish (low-risk UI tweaks); original model for any schema, RLS or auth change. (TOKEN_HANDOFF.md routing table not present in repo.)
