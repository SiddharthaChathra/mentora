# Mentora workspace rules

## Security (never relax)
- Never disable RLS, weaken a policy or loosen a test to make something pass.
- Service-role key only in `src/server/admin/*`, after an HOD or `CRON_SECRET` check.
- Roles come from `public.users` only — never from client-editable data or JWT metadata.
- Mentors see only ACTIVE assigned mentees. Students never see other students' data, rankings or "most improved".
- PDFs: verified records + mentor-marked mentoring items only. No charts, insights, risk flags or AI text.
- No secrets in code, logs, commits or chat; `.env.local` only.
- New tables: RLS + policies + audit trigger in the same migration; add an RLS test.

## Design v2 "Sky Dashboard" (see DESIGN.md)
- Light only. Tokens only (no raw hex in components). Plus Jakarta Sans only.
- Cards 24px radius, white on the shell; KPI tiles are pastel inside one white container.
- Every view has skeleton, empty, error and success states. Mobile designed separately (bottom nav, swipe rows).
- Every chart has "View as table". Progress bars always show the number. Delta chips say what they compare.
- WCAG AA contrast, including white on blue (use `.frost` chips on blue).

## Process
- Commit after every slice as `<phase>.<slice>: <what>`; update PROGRESS.md "Latest" and tick FEATURES.md.
- Gates before a slice is done: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (+ `test:rls` for DB changes).
- Human-only work is written as `### MANUAL STEP Mx — title` with Why / Do / Done when.
