import { expect, test, type Page } from '@playwright/test'
import '../rls/env'

// Visits every page for each role at desktop and phone widths and reports crashes, error screens,
// console errors and horizontal overflow. Run: E2E_BASE_URL=http://localhost:3000 pnpm exec playwright test crawl
const DEMO = process.env.DEMO_PASSWORD!
const ROLES = [
  { role: 'mentee', email: 'ananya.sharma0@demo.mentora.edu', password: DEMO },
  { role: 'mentor', email: 'ramesh.rao@demo.mentora.edu', password: DEMO },
  { role: 'hod', email: process.env.SEED_HOD_EMAIL!, password: process.env.SEED_HOD_PASSWORD! },
] as const

const PROFILE_TABS = ['', '?tab=academics', '?tab=analytics', '?tab=mentoring', '?tab=resources', '?tab=sessions', '?tab=journey', '?tab=report']
const ROUTES: Record<string, string[]> = {
  mentee: ['/mentee', '/mentee/academics', '/mentee/academics/1', '/mentee/analytics', '/mentee/mentoring', '/mentee/mentoring?tab=plan', '/mentee/resources', '/mentee/sessions', '/mentee/journey', '/mentee/profile', '/notifications', '/account'],
  mentor: ['/mentor', '/mentor/mentees', '/mentor/verifications', '/mentor/verifications?tab=corrections', '/mentor/recommendations', '/mentor/resources', '/mentor/sessions', '/mentor/analytics', '/mentor/reports', '/notifications', '/account', '@mentee'],
  hod: ['/hod', '/hod/students', '/hod/mentors', '/hod/assignments', '/hod/interventions', '/hod/users', '/hod/settings', '/hod/imports', '/hod/exports', '/hod/audit', '/hod/analytics', '/notifications', '/account', '@student', '@mentorDetail'],
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/(mentee|mentor|hod|setup)/, { timeout: 90_000 })
  const skip = page.getByRole('button', { name: 'Skip tour' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

async function expand(page: Page, route: string): Promise<string[]> {
  if (!route.startsWith('@')) return [route]
  const sel = route === '@mentee' ? 'a[href^="/mentor/mentees/"]' : route === '@student' ? 'a[href^="/hod/students/"]' : 'a[href^="/hod/mentors/"]'
  await page.goto(route === '@mentee' ? '/mentor/mentees' : route === '@student' ? '/hod/students' : '/hod/mentors')
  const href = (await page.locator(sel).first().getAttribute('href'))!.split('?')[0]!
  return route === '@mentorDetail' ? [href] : PROFILE_TABS.map((t) => href + t)
}

for (const r of ROLES) {
  test(`crawl ${r.role}`, async ({ page }) => {
    test.setTimeout(600_000)
    const problems: string[] = []
    let current = ''
    page.on('pageerror', (e) => problems.push(`${current} pageerror: ${e.message.slice(0, 160)}`))
    page.on('console', (m) => {
      if (m.type() !== 'error') return
      const t = m.text()
      if (/hydrat|Download the React DevTools|favicon|Failed to load resource: the server responded with a status of 401/i.test(t)) return
      problems.push(`${current} console: ${t.slice(0, 160)}`)
    })
    await login(page, r.email, r.password)
    const routes: string[] = []
    for (const x of ROUTES[r.role]!) routes.push(...(await expand(page, x)))
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      for (const route of routes) {
        current = `[${width}] ${route}`
        const res = await page.goto(route, { waitUntil: 'networkidle', timeout: 120_000 }).catch((e) => (problems.push(`${current} nav: ${e.message.slice(0, 80)}`), null))
        if (res && res.status() >= 400) problems.push(`${current} HTTP ${res.status()}`)
        const body = await page.locator('body').innerText().catch(() => '')
        if (/Something went wrong|Application error|This page could not be found|Unhandled Runtime Error/i.test(body)) problems.push(`${current} error screen`)
        await page.waitForTimeout(600) // let entrance animations settle
        const overflow = await page.evaluate(() => {
          const W = document.documentElement.clientWidth
          if (document.documentElement.scrollWidth <= W + 1) return null
          const el = [...document.querySelectorAll('body *')].find((e) => {
            const b = e.getBoundingClientRect()
            const p = e.parentElement?.getBoundingClientRect()
            return b.width > 0 && b.right > W + 1 && !!p && p.right <= W + 1
          })
          return `${document.documentElement.scrollWidth}>${W} ${el ? el.tagName + '.' + String(el.className).slice(0, 100) : '?'}`
        })
        if (overflow) problems.push(`${current} horizontal overflow ${overflow}`)
      }
    }
    console.log(`\n${r.role}: ${routes.length} routes × 2 widths, ${problems.length} problems\n` + problems.join('\n'))
    expect(problems, problems.join('\n')).toEqual([])
  })
}
