# HANDOFF
Date/time: 2026-10-25T16:10:00+05:30
From model: Claude Opus 5.5 · Reason: long context
Branch / last commit: feat/v2-sky-dashboard · 7c38333 V2.R7: reference-driven polish + rubric score
Design version: v2 Sky Dashboard (DESIGN.md)
## Where we are
Phase D – Deploy: done (live). Optional next: email delivery setup (human) and any user-requested features.
## Current slice state
- Done: cloud Supabase (001–010), Vercel production at https://mentora-zeta-six.vercel.app, self sign-up, live smoke test.
- Not done: email delivery (human: disable "Confirm email" or add SMTP in Supabase Auth).
- Uncommitted changes: none.
## Gates
typecheck pass · lint pass · unit 55/55 · rls 13/13 · e2e 6/6 · live 1/1 · build pass (Vercel)
## Next 3 actions (exact)
1. New cloud migrations: add file `supabase/migrations/0011_*.sql`, apply locally (`npx supabase migration up --local`) and to cloud project `ikeauzqhzpqtsjfbrolr` (Supabase MCP `apply_migration`; avoid `drop` statements — they need human confirmation).
2. Deploy = `git push origin HEAD:main` (Vercel auto-builds); check with `npx vercel ls mentora --scope sid-941f`; then `LIVE=1 E2E_BASE_URL=https://mentora-zeta-six.vercel.app pnpm exec playwright test live`.
3. Env changes: `npx vercel env add <KEY> --environment production --type config|secret --value … --yes --force --scope sid-941f`, then redeploy.
## Watch out
- Never print or commit `.env.production.local` (prod secrets). Vercel MCP is read/write-forbidden for this team — use the Vercel CLI (logged in).
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
