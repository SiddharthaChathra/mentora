import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listBranches, principalBranch } from '@/server/services/branches'
import { PageHeader } from '@/components/ui/page-header'
import { FilterChips, Pagination, SearchInput } from '@/components/ui/navigation'
import { InviteButton, UsersTable, type UserRow } from '@/features/admin/users'

export const metadata: Metadata = { title: 'Users' }
const PAGE = 25

/** Every account in the college (or one branch via the switcher). Invite HOD/MENTOR/MENTEE into any branch. */
export default async function PrincipalUsersPage({ searchParams }: { searchParams: Promise<{ role?: string; status?: string; q?: string; page?: string; branch?: string }> }) {
  const actor = await requireRole('PRINCIPAL')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const db = await createClient()
  const [branches, selected] = await Promise.all([listBranches(db), principalBranch(db, sp.branch)])
  let q = db
    .from('users')
    .select('id, email, role, status, created_at, last_seen_at, department_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1)
  if (selected) q = q.eq('department_id', selected.id)
  if (sp.role && sp.role !== 'all') q = q.eq('role', sp.role as 'MENTEE')
  if (sp.status && sp.status !== 'all') q = q.eq('status', sp.status as 'ACTIVE')
  if (sp.q) q = q.ilike('email', `%${sp.q.replace(/[%_]/g, '')}%`)
  const { data: users, count } = await q
  const ids = (users ?? []).map((u) => u.id)
  const [{ data: sp1 }, { data: mp }, { data: hp }] = await Promise.all([
    ids.length ? db.from('student_profiles').select('user_id, full_name, avatar_path').in('user_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from('mentor_profiles').select('user_id, full_name, avatar_path').in('user_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from('hod_profiles').select('user_id, full_name, avatar_path').in('user_id', ids) : Promise.resolve({ data: [] }),
  ])
  const prof = new Map([...(sp1 ?? []), ...(mp ?? []), ...(hp ?? [])].map((p) => [p.user_id, p]))
  const code = new Map(branches.map((b) => [b.id, b.code]))
  const rows: UserRow[] = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    name: prof.get(u.id)?.full_name ?? null,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
    lastSeenAt: u.last_seen_at,
    hasAvatar: !!prof.get(u.id)?.avatar_path,
    isSelf: u.id === actor.id,
    branch: u.department_id ? (code.get(u.department_id) ?? null) : 'College',
  }))
  return (
    <>
      <PageHeader
        title="Users &"
        accent="roles"
        description={`${count ?? 0} account${count === 1 ? '' : 's'} ${selected ? `in ${selected.code}` : 'across the college'}. HODs are appointed on the HOD page; every change is audited.`}
        actions={<InviteButton branches={branches.map((b) => ({ id: b.id, code: b.code, name: b.name }))} />}
      />
      <div className="mb-5 space-y-3">
        <SearchInput placeholder="Search by email…" className="sm:max-w-sm" />
        <FilterChips
          param="role"
          label="Role"
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'MENTEE', label: 'Mentees' },
            { value: 'MENTOR', label: 'Mentors' },
            { value: 'HOD', label: 'HODs' },
            { value: 'PRINCIPAL', label: 'Principal' },
          ]}
        />
        <FilterChips
          param="status"
          label="Status"
          options={[
            { value: 'all', label: 'Any status' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INVITED', label: 'Invited' },
            { value: 'SUSPENDED', label: 'Suspended' },
          ]}
        />
      </div>
      <UsersTable rows={rows} college />
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} />
    </>
  )
}
