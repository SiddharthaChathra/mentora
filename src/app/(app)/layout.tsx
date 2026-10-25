import { requireUser } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { shellBadges } from '@/server/services/content'
import { AppShell } from '@/components/shell/app-shell'
import { getSemesterScope } from '@/server/scope'
import { getSettings } from '@/server/services/people'
import { serverEnv } from '@/server/env'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser()
  const db = await createClient()
  const [badges, semester, settings] = await Promise.all([shellBadges(db, actor), getSemesterScope(), getSettings(db)])
  return (
    <AppShell
      user={{ id: actor.id, name: actor.name, email: actor.email, role: actor.role, hasAvatar: !!actor.avatarPath, avatarVersion: actor.avatarPath }}
      badges={badges}
      semester={semester}
      aiEnabled={settings.aiEnabled && serverEnv.aiEnabled}
    >
      {children}
    </AppShell>
  )
}
