import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardBody, CardHeader, Pill } from '@/components/ui/primitives'
import { buttonVariants } from '@/components/ui/button'
import { PasswordCard, PreferencesCard, SessionsCard, type SessionInfo } from '@/features/profile/account'
import { StaffProfileEditor } from '@/features/profile/profile-editor'

export const metadata: Metadata = { title: 'Account & preferences' }
const s = (v: unknown) => (v == null ? '' : String(v))

export default async function AccountPage() {
  const actor = await requireUser()
  const db = await createClient()
  const [{ data: sessions }, { data: dept }] = await Promise.all([db.rpc('my_sessions'), actor.departmentId ? db.from('departments').select('name').eq('id', actor.departmentId).maybeSingle() : Promise.resolve({ data: null })])
  const list: SessionInfo[] = ((sessions ?? []) as { id: string; created_at: string; updated_at: string | null; user_agent: string | null; ip: string | null; current: boolean }[]).map((x) => ({
    id: x.id,
    createdAt: x.created_at,
    updatedAt: x.updated_at,
    userAgent: x.user_agent,
    ip: x.ip,
    current: x.current,
  }))
  let staff: React.ReactNode = null
  if (actor.role === 'MENTOR') {
    const { data: p } = await db.from('mentor_profiles').select('*').eq('user_id', actor.id).maybeSingle()
    staff = <StaffProfileEditor role="MENTOR" userId={actor.id} avatarPath={actor.avatarPath} departmentName={dept?.name ?? null} mentor={{ full_name: s(p?.full_name), phone: s(p?.phone), official_email: s(p?.official_email), designation: s(p?.designation), faculty_id: s(p?.faculty_id), expertise: p?.expertise ?? [] }} />
  } else if (actor.role === 'HOD' || actor.role === 'PRINCIPAL') {
    const { data: p } = await db.from('hod_profiles').select('*').eq('user_id', actor.id).maybeSingle()
    staff = <StaffProfileEditor role="HOD" userId={actor.id} avatarPath={actor.avatarPath} departmentName={dept?.name ?? null} hod={{ full_name: s(p?.full_name), phone: s(p?.phone), designation: s(p?.designation) }} />
  }
  return (
    <>
      <PageHeader title="Account &" accent="preferences" description={`${actor.email} · ${actor.role === 'PRINCIPAL' ? 'Principal · all branches' : (dept?.name ?? 'No branch')}`} />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {staff ?? (
            <Card>
              <CardHeader title="Your profile" />
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-700">Edit your personal details, academic identity, photo and interests.</p>
                <Link href="/mentee/profile" className={buttonVariants({ variant: 'secondary' })}>
                  Open my profile
                </Link>
              </CardBody>
            </Card>
          )}
          <PasswordCard />
        </div>
        <div className="space-y-4">
          <PreferencesCard prefs={actor.preferences} />
          <SessionsCard sessions={list} />
          <Card>
            <CardBody className="text-sm text-ink-700">
              <p className="font-medium text-ink-900">Your role</p>
              <p className="mt-1">
                <Pill tone="brand">{actor.role === 'MENTEE' ? 'Mentee' : actor.role === 'MENTOR' ? 'Mentor' : 'Head of Department'}</Pill>
              </p>
              <p className="mt-2 text-xs text-ink-500">Roles are assigned by your HOD and can’t be changed here.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
