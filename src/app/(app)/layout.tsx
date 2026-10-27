import { requireUser } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { shellBadges } from '@/server/services/content'
import { AppShell } from '@/components/shell/app-shell'
import { getSemesterScope } from '@/server/scope'
import { getSettings } from '@/server/services/people'
import { serverEnv } from '@/server/env'
import { BRANCH_COOKIE, listBranches } from '@/server/services/branches'
import { cookies } from 'next/headers'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser()
  const db = await createClient()
  const [badges, semester, settings, branches, jar] = await Promise.all([
    shellBadges(db, actor),
    getSemesterScope(),
    getSettings(db),
    actor.role === 'HOD' || actor.role === 'PRINCIPAL' ? listBranches(db) : Promise.resolve([]),
    cookies(),
  ])
  const own = actor.role === 'HOD' ? branches.find((b) => b.id === actor.departmentId) : null
  return (
    <AppShell
      user={{ id: actor.id, name: actor.name, email: actor.email, role: actor.role, hasAvatar: !!actor.avatarPath, avatarVersion: actor.avatarPath }}
      badges={badges}
      semester={semester}
      branchChip={own ? { code: own.code, name: own.name } : null}
      branches={actor.role === 'PRINCIPAL' ? branches.map((b) => ({ code: b.code, name: b.name })) : null}
      branch={actor.role === 'PRINCIPAL' ? (jar.get(BRANCH_COOKIE)?.value ?? null) : null}
      aiEnabled={settings.aiEnabled && serverEnv.aiEnabled}
    >
      {children}
    </AppShell>
  )
}
