import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../rls/env'

/**
 * MB-21 end-to-end: API/page attack tests, role redirects, HOD revocation in the UI, and the Principal + HOD journeys.
 * Needs the multi-branch fixture (tests/fixtures/multibranch.seed.ts). Run: E2E_BASE_URL=http://localhost:3000 pnpm exec playwright test multibranch
 */
const D = 'e2e.mentora.test'
const E2E = process.env.E2E_PASSWORD!
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const ECE_STRINGS = ['E2E Bhavya ECE One', 'E2E23EC001', 'E2E Chetan ME One', 'E2E23ME001']

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90_000 })
  const skip = page.getByRole('button', { name: 'Skip tour' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}
const hodCse = (page: Page) => login(page, process.env.SEED_HOD_EMAIL!, process.env.SEED_HOD_PASSWORD!)
const principal = (page: Page) => login(page, `principal@${D}`, E2E)
const idOf = async (email: string) => (await admin.from('users').select('id').eq('email', email).single()).data!.id as string
const deptOf = async (code: string) => (await admin.from('departments').select('id').eq('code', code).single()).data!.id as string

/** No out-of-scope student name or USN anywhere in a response body. */
function leakFree(body: string, where: string) {
  for (const s of ECE_STRINGS) expect(body.includes(s), `${where} leaked ${s}`).toBe(false)
}

test.describe('attack tests as HOD_CSE', () => {
  test('ECE/ME data is 404 or empty on pages, PDFs, exports, files and search', async ({ page }) => {
    test.setTimeout(240_000)
    const b1 = await idOf(`b1.ece@${D}`)
    const { data: res } = await admin.from('learning_resources').select('id').eq('student_id', b1).limit(1).single()
    await hodCse(page)
    const api = page.request

    const profile = await page.goto(`/hod/students/${b1}`)
    expect(profile?.status()).toBe(404)
    leakFree(await page.content(), 'B1 profile page')

    expect((await api.get(`/api/reports/student/${b1}`)).status()).toBe(404)
    expect([403, 404]).toContain((await api.get(`/api/resources/${res!.id}/download`)).status())

    for (const kind of ['department-summary', 'assignments', 'academic-summary', 'interventions', 'mentor-workload']) {
      for (const qs of ['format=csv', 'format=csv&branch=ECE', 'format=csv&department_id=' + (await deptOf('ECE'))]) {
        const r = await api.get(`/api/exports/${kind}?${qs}`)
        expect(r.status()).toBe(200)
        leakFree(await r.text(), `export ${kind}?${qs}`)
      }
    }
    for (const path of ['/hod/students?q=Bhavya', '/hod/students?branch=ECE', '/hod/mentors?branch=ECE', '/hod/interventions', '/hod/audit', '/hod/assignments']) {
      await page.goto(path)
      leakFree(await page.content(), path)
    }
    // Command palette search is scoped by RLS too.
    await page.goto('/hod')
    await page.keyboard.press('Control+k')
    await page.keyboard.type('Bhavya')
    await page.waitForTimeout(1500)
    // The typed term itself is in the input; the result list must not contain the ECE student.
    const html = await page.content()
    for (const s of ['E2E Bhavya ECE One', 'E2E23EC001']) expect(html.includes(s), 'command palette leaked ' + s).toBe(false)
    // Principal pages are out of reach.
    await page.goto('/principal/students')
    await page.waitForURL('**/hod')
  })
})

test('mentors and mentees are redirected away from /principal', async ({ page }) => {
  await login(page, 'ramesh.rao@demo.mentora.edu', process.env.DEMO_PASSWORD!)
  await page.goto('/principal')
  await page.waitForURL('**/mentor')
  await page.context().clearCookies()
  await login(page, `b1.ece@${D}`, E2E)
  await page.goto('/principal/branches')
  await page.waitForURL('**/mentee')
})

test('an HOD whose appointment ends sees "access ended" on the next request', async ({ page, browser }) => {
  test.setTimeout(180_000)
  const ece = await deptOf('ECE')
  const hodEce = await idOf(`hod.ece@${D}`)
  await login(page, `hod.ece@${D}`, E2E)
  await expect(page.getByText('Your branch at a glance')).toBeVisible()
  const p = await browser.newPage()
  await principal(p)
  await p.goto('/principal/hods')
  await p.locator('#hod-ECE').getByRole('button', { name: 'End' }).click()
  await p.getByRole('button', { name: 'End appointment' }).click()
  await expect(p.getByText('ECE now has no HOD')).toBeVisible()
  await page.goto('/hod/students')
  await expect(page.getByRole('heading', { name: 'Your HOD access has ended' })).toBeVisible()
  // Restore through the UI: appoint HOD_ECE again.
  await p.goto('/principal/hods')
  await p.locator('#hod-ECE').getByRole('button', { name: 'Appoint HOD' }).click()
  await p.selectOption('#hod-pick', hodEce)
  await p.getByRole('button', { name: 'Appoint', exact: true }).click()
  await expect(p.getByText('New HOD appointed for ECE')).toBeVisible()
  const { data } = await admin.from('department_heads').select('user_id').eq('department_id', ece).is('ended_at', null).single()
  expect(data!.user_id).toBe(hodEce)
  await page.goto('/hod')
  await expect(page.getByText('Your branch at a glance')).toBeVisible()
})

for (const width of [1440, 834, 390]) {
  test(`Principal journey at ${width}px`, async ({ page }) => {
    test.setTimeout(300_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    await principal(page)
    await expect(page).toHaveURL(/\/principal$/)
    await page.goto('/principal?branch=ALL')
    await expect(page.getByText('College mentoring coverage')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Branch health' })).toBeVisible()
    // No student is ranked anywhere on the college overview.
    await expect(page.getByText(/top students|bottom students|rank/i)).toHaveCount(0)
    // Switch branch (URL-synced) → students grouped → read-only profile → PDF.
    await page.goto('/principal/students?branch=ECE')
    await expect(page.getByText('E2E Bhavya ECE One').locator('visible=true').first()).toBeVisible()
    await page.goto('/principal/students?branch=ALL')
    await expect(page.locator('details summary').filter({ has: page.getByText('ECE', { exact: true }) })).toBeVisible()
    const b1 = await idOf(`b1.ece@${D}`)
    await page.goto(`/principal/students/${b1}`)
    await expect(page.getByText('Viewing as Principal · read-only.')).toBeVisible()
    await expect(page.getByRole('link', { name: /Recommend/ })).toHaveCount(0)
    await expect(page.getByText('Private note B1')).toHaveCount(0)
    await page.goto(`/principal/students/${b1}?tab=mentoring`)
    await expect(page.getByText('Shared note B1')).toBeVisible()
    await expect(page.getByText('Private note B1')).toHaveCount(0)
    const pdf = await page.request.get(`/api/reports/student/${b1}`)
    expect(pdf.status()).toBe(200)
    expect(pdf.headers()['content-type']).toContain('application/pdf')
    const exp = await page.request.get('/api/exports/department-summary?format=csv&branch=ALL')
    expect(exp.status()).toBe(200)
    const csv = await exp.text()
    expect(csv).toContain('CSE')
    expect(csv).toContain('ECE')
    await page.goto('/principal/audit?entity=student_report')
    await expect(page.getByText('PDF report').locator('visible=true').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(overflow).toBe(false)
    await page.context().clearCookies()
  })
}

test('transfer journey: HOD requests, Principal approves, records move, assignment ends', async ({ page, browser }) => {
  test.setTimeout(240_000)
  const t1 = await idOf(`t1.cse@${D}`)
  const ece = await deptOf('ECE')
  await hodCse(page)
  await page.goto(`/hod/students/${t1}`)
  await page.getByRole('button', { name: 'Request branch transfer' }).click()
  await page.selectOption('#tr-to', ece)
  await page.fill('#tr-reason', 'Lateral move approved by the academic council')
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.getByText('Transfer requested')).toBeVisible()

  const p = await browser.newPage()
  await principal(p)
  await p.goto('/principal/transfers')
  await p.getByRole('button', { name: 'Approve' }).first().click()
  await p.getByRole('button', { name: 'Approve and move' }).click()
  await expect(p.getByText(/moved to ECE/)).toBeVisible()
  expect((await admin.from('users').select('department_id').eq('id', t1).single()).data!.department_id).toBe(ece)
  expect((await admin.from('mentor_assignments').select('id').eq('student_id', t1).is('ended_at', null)).data).toHaveLength(0)
  // Old HOD loses the student immediately.
  expect((await page.goto(`/hod/students/${t1}`))?.status()).toBe(404)
  // Restore via the Principal's direct move.
  const cse = await deptOf('CSE')
  await p.goto('/principal/transfers?move=1')
  await p.fill('#mv-search', 'E2E Tarun')
  await p.getByRole('button', { name: /E2E Tarun Transfer/ }).click()
  await p.selectOption('#mv-to', cse)
  await p.fill('#mv-reason', 'Restore fixture')
  await p.getByRole('button', { name: 'Move student' }).click()
  await expect(p.getByText('E2E Tarun Transfer moved')).toBeVisible()
  expect((await admin.from('users').select('department_id').eq('id', t1).single()).data!.department_id).toBe(cse)
})

test('HOD journey: branch chip, own-branch lists only, no HOD/branch options in invites', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await hodCse(page)
  await expect(page.locator('header').getByText('CSE', { exact: false }).first()).toBeVisible()
  await page.goto('/hod/students')
  leakFree(await page.content(), 'HOD students')
  await page.goto('/hod/users?invite=1')
  const roles = await page.locator('#inv-role option').allTextContents()
  expect(roles.join(' ')).not.toMatch(/HOD/)
  await expect(page.locator('#inv-branch')).toHaveCount(0)
  await page.goto('/hod/settings')
  await expect(page.getByText('Your branch uses the college grading scheme')).toBeVisible()
})
