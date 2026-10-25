import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Live smoke test against production: `LIVE=1 E2E_BASE_URL=https://… pnpm exec playwright test live`
// Credentials come from the gitignored .env.production.local and are never printed.
const env = Object.fromEntries(
  (existsSync('.env.production.local') ? readFileSync('.env.production.local', 'utf8') : '')
    .split(/\r?\n/)
    .map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => [m[1]!, m[2]!]),
)

test.skip(!process.env.LIVE || !env.SEED_HOD_EMAIL, 'live checks run only with LIVE=1 and .env.production.local')

test('live: pages, cron guard and HOD sign-in', async ({ page, request }) => {
  expect((await request.get('/')).status()).toBe(200)
  expect((await request.get('/signup')).status()).toBe(200)
  expect((await request.get('/api/cron/daily')).status()).toBe(401)
  await page.goto('/login')
  await page.fill('input[type=email]', env.SEED_HOD_EMAIL!)
  await page.fill('input[type=password]', env.SEED_HOD_PASSWORD!)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/(hod|setup)/, { timeout: 60_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
