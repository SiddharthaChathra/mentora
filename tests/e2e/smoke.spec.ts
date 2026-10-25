import { expect, test, type Page } from '@playwright/test'
import '../rls/env'

const DEMO = process.env.DEMO_PASSWORD!

async function login(page: Page, email: string, password = DEMO) {
  await page.goto('/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', password)
  await page.click('button[type=submit]')
}

async function skipTour(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip tour' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

test('public landing and failed login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Mentora/)
  await login(page, 'nobody@demo.mentora.edu', 'wrong-password-1')
  await expect(page.getByRole('alert').first()).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('mentee sees own dashboard and is kept out of HOD pages', async ({ page }) => {
  await login(page, 'ananya.sharma0@demo.mentora.edu')
  await page.waitForURL('**/mentee')
  await skipTour(page)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hello')
  await expect(page.getByText('Summary Report')).toBeVisible()
  // Students never see rankings.
  await expect(page.getByText('Most improved')).toHaveCount(0)
  const res = await page.goto('/hod')
  expect(page.url().includes('/hod') && res?.status() === 200 && (await page.getByText('Mentoring coverage').count()) > 0).toBe(false)
})

test('mentor overview, mentee profile and verified-data PDF', async ({ page }) => {
  await login(page, 'ramesh.rao@demo.mentora.edu')
  await page.waitForURL('**/mentor')
  await skipTour(page)
  await expect(page.getByText('Average SGPA of my mentees')).toBeVisible()
  await expect(page.getByText('Subject performance overview')).toBeVisible()
  const first = page.locator('a[href^="/mentor/mentees/"]').first()
  const href = (await first.getAttribute('href'))!.split('?')[0]!
  const id = href.split('/').pop()!
  const pdf = await page.request.get(`/api/reports/student/${id}`)
  expect(pdf.status()).toBe(200)
  expect(pdf.headers()['content-type']).toContain('application/pdf')
})

test('HOD overview and protected cron', async ({ page, request }) => {
  await login(page, process.env.SEED_HOD_EMAIL!, process.env.SEED_HOD_PASSWORD!)
  await page.waitForURL('**/hod')
  await skipTour(page)
  await expect(page.getByText('Mentoring coverage').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mentor workload' })).toBeVisible()
  const cron = await request.get('/api/cron/daily')
  expect(cron.status()).toBe(401)
})

test('mobile shows bottom navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, 'ananya.sharma0@demo.mentora.edu')
  await page.waitForURL('**/mentee')
  await expect(page.getByRole('navigation', { name: /primary|main|bottom/i }).last()).toBeVisible()
})

test('student can sign up and lands on setup', async ({ page }) => {
  await page.goto('/signup')
  await page.fill('#full_name', 'E2E Student')
  await page.fill('#email', `e2e.signup.${Date.now()}@example.com`)
  await page.fill('#password', 'Signup-Test-123')
  await page.fill('#confirm', 'Signup-Test-123')
  await page.getByRole('button', { name: /create student account/i }).click()
  await page.waitForURL('**/setup', { timeout: 60_000 })
})


test('HOD semester switcher filters department pages', async ({ page }) => {
  await login(page, process.env.SEED_HOD_EMAIL!, process.env.SEED_HOD_PASSWORD!)
  await page.waitForURL('**/hod')
  await skipTour(page)
  await page.goto('/hod/students')
  const total = Number((await page.getByText(/\d+ students? match/).first().innerText()).match(/\d+/)![0])
  await page.locator('select:has(option:text("All semesters"))').first().selectOption('3')
  await expect(page.getByText('Show all semesters')).toBeVisible()
  const scoped = Number((await page.getByText(/\d+ students? match/).first().innerText()).match(/\d+/)![0])
  expect(scoped).toBeLessThan(total)
  await page.goto('/hod/mentors')
  await expect(page.getByText('Show all semesters')).toBeVisible()
  await page.getByRole('button', { name: 'Show all semesters' }).click()
  await expect(page.getByText('Show all semesters')).toHaveCount(0)
})
