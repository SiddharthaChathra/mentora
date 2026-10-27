import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * MB-08: every service-role path checks the actor's scope BEFORE touching the admin client.
 * The admin client is replaced by a spy: if a guard is missing, the spy records the call and the test fails.
 */
const adminCalls: string[] = []
vi.mock('server-only', () => ({}))
vi.mock('@/server/env', () => ({ serverEnv: { siteUrl: 'http://localhost' } }))
vi.mock('@/server/email', () => ({ emailLayout: () => '', sendEmail: async () => false }))
vi.mock('@/server/admin/client', () => ({
  createAdminClient: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => {
          adminCalls.push(String(prop))
          throw new Error(`admin client used: ${String(prop)}`)
        },
      },
    ),
}))

const { inviteUser, resendInvite, setAuthBan } = await import('@/server/admin/users')
const { getScope, assertCanReadDepartment, assertCanManageDepartment, assertPrincipal } = await import('@/server/authz')

type Actor = Parameters<typeof inviteUser>[0]
const base: Actor = { id: 'u1', email: 'x@y.z', role: 'MENTEE', status: 'ACTIVE', departmentId: 'd-cse', hodActive: false, onboardingCompletedAt: null, preferences: {}, name: null, avatarPath: null, createdAt: '' }
const as = (over: Partial<Actor>): Actor => ({ ...base, ...over })

beforeEach(() => {
  adminCalls.length = 0
})

describe('admin paths refuse without a valid scope (no service-role call)', () => {
  const outsiders: [string, Actor][] = [
    ['mentee', as({ role: 'MENTEE' })],
    ['mentor', as({ role: 'MENTOR' })],
    ['HOD whose appointment ended', as({ role: 'HOD', hodActive: false, departmentId: null })],
    ['suspended Principal', as({ role: 'PRINCIPAL', status: 'SUSPENDED', departmentId: null })],
  ]
  for (const [label, actor] of outsiders) {
    it(`inviteUser: ${label}`, async () => {
      await expect(inviteUser(actor, { email: 'n@e.w', role: 'MENTEE' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
      expect(adminCalls).toEqual([])
    })
  }

  it('an HOD cannot invite an HOD or invite into another branch', async () => {
    const hod = as({ role: 'HOD', hodActive: true, departmentId: 'd-cse' })
    await expect(inviteUser(hod, { email: 'n@e.w', role: 'HOD' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(inviteUser(hod, { email: 'n@e.w', role: 'MENTOR', department_id: 'd-ece' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(adminCalls).toEqual([])
  })

  it('the Principal must name a branch before any admin call', async () => {
    await expect(inviteUser(as({ role: 'PRINCIPAL', departmentId: null }), { email: 'n@e.w', role: 'MENTEE' })).rejects.toMatchObject({ code: 'VALIDATION' })
    expect(adminCalls).toEqual([])
  })

  it('resendInvite / setAuthBan look the target up only after the role check passes', async () => {
    await expect(resendInvite(as({ role: 'MENTOR' }), 'u2')).rejects.toThrow()
    await expect(setAuthBan(as({ role: 'MENTEE' }), 'u2', true)).rejects.toThrow()
    await expect(setAuthBan(as({ role: 'HOD', hodActive: false, departmentId: null }), 'u2', true)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(adminCalls).toEqual([])
  })
})

describe('scope helpers', () => {
  it('derive the scope from the actor, never from input', () => {
    expect(getScope(as({ role: 'MENTEE' }))).toEqual({ kind: 'SELF', studentId: 'u1' })
    expect(getScope(as({ role: 'MENTOR' }))).toEqual({ kind: 'MENTOR', mentorId: 'u1' })
    expect(getScope(as({ role: 'HOD', hodActive: true }))).toEqual({ kind: 'BRANCH', departmentId: 'd-cse' })
    expect(getScope(as({ role: 'HOD', hodActive: false, departmentId: null }))).toEqual({ kind: 'NONE' })
    expect(getScope(as({ role: 'PRINCIPAL', departmentId: null }))).toEqual({ kind: 'COLLEGE' })
    expect(getScope(as({ role: 'PRINCIPAL', status: 'SUSPENDED' }))).toEqual({ kind: 'NONE' })
  })

  it('branch reads: HOD own branch only, Principal any; branch writes: never the Principal; out of scope is NOT_FOUND', () => {
    const hod = as({ role: 'HOD', hodActive: true })
    const principal = as({ role: 'PRINCIPAL', departmentId: null })
    expect(() => assertCanReadDepartment(hod, 'd-cse')).not.toThrow()
    expect(() => assertCanReadDepartment(hod, 'd-ece')).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
    expect(() => assertCanReadDepartment(principal, 'd-ece')).not.toThrow()
    expect(() => assertCanManageDepartment(principal, 'd-ece')).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
    expect(() => assertCanManageDepartment(hod, 'd-cse')).not.toThrow()
    expect(() => assertPrincipal(hod)).toThrow()
  })
})
