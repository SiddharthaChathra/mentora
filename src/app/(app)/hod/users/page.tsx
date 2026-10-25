import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { PageHeader } from '@/components/ui/page-header'
import { FilterChips, Pagination, SearchInput } from '@/components/ui/navigation'
import { InviteButton, UsersTable, type UserRow } from '@/features/admin/users'

export const metadata: Metadata = { title: 'Users & roles' }
const PAGE = 25

export default async function HodUsersPage({ searchParams }: { searchParams: Promise<{ role?: string; status?: string; q?: string; page?: string }> }) {
  const actor = await requireRole('HOD')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const db = await createClient()
  let q = db
    .from('users')
    .select('id, email, role, status, created_at, last_seen_at', { count: 'exact' })
    .eq('department_id', actor.departmentId!)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1)
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
  }))
  return (
    <>
      <PageHeader title="Users &" accent="roles" description="Invite people, set roles and manage account status. Every change is audited." actions={<InviteButton />} />
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
      <UsersTable rows={rows} />
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} />
    </>
  )
}
