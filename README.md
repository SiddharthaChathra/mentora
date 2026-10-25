# Mentora — Smart Mentor–Mentee Management

Academic mentoring for a department: students keep verified records, mentors guide with goals and feedback, the HOD sees coverage and who needs help.

## Run locally
Prerequisites: Node 22+, pnpm, Docker (for the Supabase CLI).

```bash
pnpm install
pnpm db:start            # local Supabase (API :54321, Studio :54323, Mailpit :54324)
cp .env.example .env.local   # paste the local keys printed by db:start; set CRON_SECRET, SEED_HOD_*, DEMO_PASSWORD
pnpm db:reset && pnpm db:seed && pnpm db:seed:demo
pnpm dev                 # http://localhost:3000
```
Demo accounts are listed in `DEMO.md` (passwords come from `.env.local`).

## Scripts
`typecheck` · `lint` · `test` (unit) · `test:rls` (needs local stack + seed) · `test:e2e` (Playwright; set `E2E_BASE_URL` to reuse a running server) · `build` · `db:types`.

## Docs
DESIGN.md (v2 Sky Dashboard) · ARCHITECTURE.md · FEATURES.md · PROGRESS.md · DEPLOY.md · USER_GUIDE.md · HANDOFF.md
