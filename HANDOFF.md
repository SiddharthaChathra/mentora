# HANDOFF
Date/time: 2026-10-25T16:10:00+05:30
From model: Claude Opus 5.5 · Reason: long context
Branch / last commit: feat/v2-sky-dashboard · 7c38333 V2.R7: reference-driven polish + rubric score
Design version: v2 Sky Dashboard (DESIGN.md)
## Where we are
Phase V2 – Sky Dashboard redesign: slices R1–R7 done (phase complete). Next phase: deploy (human MANUAL STEPS M2–M6).
## Current slice state
- Done: R7 reference comparison (design/references present), polish, rubric ≥ 9 at 1440/834/390.
- Not done yet: cloud deploy M2–M6 in DEPLOY.md (human); PR from `feat/v2-sky-dashboard` only when the user asks.
- Uncommitted changes: none.
## Gates
typecheck pass · lint pass · unit 55/55 · rls 11/11 · e2e 5/5 · build pass (all re-run 2026-10-25)
## Next 3 actions (exact)
1. If the user asks for a PR: push `feat/v2-sky-dashboard` and open it (body ends with the Claude Code line) – no code changes.
2. Assist the user through DEPLOY.md M2–M6; after deploy run `E2E_BASE_URL=<prod> pnpm test:e2e` – acceptance: FEATURES "Cloud deploy".
3. Only on request: further UI polish — screenshot touched routes at 1440 + 390, keep rubric ≥ 9, never edit applied migrations.
## Watch out
- Local dev needs Docker Desktop running; otherwise Supabase is down and logins fail (AuthRetryableFetchError).
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
