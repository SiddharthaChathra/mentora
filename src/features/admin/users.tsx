'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Ban, MailPlus, MoreHorizontal, RotateCcw, Send, ShieldCheck, UserPlus } from 'lucide-react'
import { fmtDate, fmtRelative } from '@/lib/utils'
import { inviteSchema } from '@/lib/validators'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { ConfirmDialog, Dialog, DialogContent, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/overlay'
import { Pill, StatusPill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { changeRole, changeStatus, inviteUser, resendInvite } from '@/server/actions/admin'

export type UserRow = { id: string; email: string; name: string | null; role: 'MENTEE' | 'MENTOR' | 'HOD'; status: string; createdAt: string; lastSeenAt: string | null; hasAvatar: boolean; isSelf: boolean }

const ROLE = { MENTEE: 'Mentee', MENTOR: 'Mentor', HOD: 'HOD' } as const

export function InviteButton() {
  const sp = useSearchParams()
  const router = useRouter()
  const [open, setOpen] = React.useState(sp.get('invite') === '1')
  const [v, setV] = React.useState({ email: '', role: (sp.get('role') as UserRow['role']) ?? 'MENTEE', full_name: '' })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus /> Invite user
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Invite a user"
          description="They’ll get an email to set a password, then complete their profile. Roles are set here and can only be changed by an HOD."
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={busy}
                onClick={async () => {
                  const parsed = inviteSchema.safeParse(v)
                  if (!parsed.success) {
                    setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])))
                    return
                  }
                  setBusy(true)
                  const res = await inviteUser(parsed.data)
                  setBusy(false)
                  if (!res.ok) {
                    setErrors(Object.fromEntries(Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? ''])))
                    return toast.error(res.error.message)
                  }
                  toast.success(`Invitation sent to ${parsed.data.email}`)
                  setV({ email: '', role: v.role, full_name: '' })
                  setOpen(false)
                  router.refresh()
                }}
              >
                <MailPlus /> Send invite
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input id="inv-email" type="email" label="Email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} error={errors.email} required />
            <Input id="inv-name" label="Full name (optional)" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
            <Select
              id="inv-role"
              label="Role"
              value={v.role}
              onChange={(e) => setV({ ...v, role: e.target.value as UserRow['role'] })}
              options={[
                { value: 'MENTEE', label: 'Mentee (student)' },
                { value: 'MENTOR', label: 'Mentor (faculty)' },
                { value: 'HOD', label: 'HOD (administrator)' },
              ]}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function UsersTable({ rows }: { rows: UserRow[] }) {
  const router = useRouter()
  const [confirm, setConfirm] = React.useState<null | { kind: 'role'; user: UserRow; role: UserRow['role'] } | { kind: 'status'; user: UserRow; status: 'ACTIVE' | 'SUSPENDED' }>(null)
  const [busy, setBusy] = React.useState(false)
  if (!rows.length) return <EmptyState illustration="no-results" title="No users match" description="Try another filter, or invite someone new." />
  const run = async () => {
    if (!confirm) return
    setBusy(true)
    const res = confirm.kind === 'role' ? await changeRole(confirm.user.id, confirm.role) : await changeStatus(confirm.user.id, confirm.status)
    setBusy(false)
    if (!res.ok) return toast.error(res.error.message)
    toast.success(confirm.kind === 'role' ? `${confirm.user.name ?? confirm.user.email} is now ${ROLE[confirm.role]}` : confirm.status === 'SUSPENDED' ? 'Account suspended' : 'Account reactivated')
    setConfirm(null)
    router.refresh()
  }
  return (
    <>
      <div className="overflow-hidden rounded-xl bg-surface shadow-2">
        <ul className="divide-y divide-line/70">
          {rows.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar userId={u.id} name={u.name ?? u.email} hasImage={u.hasAvatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900">
                  {u.name ?? 'Profile pending'} {u.isSelf && <Pill tone="brand">You</Pill>}
                </p>
                <p className="truncate text-sm text-ink-500">{u.email}</p>
              </div>
              <Pill tone={u.role === 'HOD' ? 'brand' : u.role === 'MENTOR' ? 'info' : 'neutral'}>{ROLE[u.role]}</Pill>
              <StatusPill status={u.status} />
              <span className="hidden w-32 text-right text-xs text-ink-500 md:block">{u.lastSeenAt ? `Seen ${fmtRelative(u.lastSeenAt)}` : `Added ${fmtDate(u.createdAt, 'd MMM')}`}</span>
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.email}`}>
                    <MoreHorizontal />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuLabel>Change role</MenuLabel>
                  {(['MENTEE', 'MENTOR', 'HOD'] as const).map((r) => (
                    <MenuItem key={r} icon={ShieldCheck} disabled={r === u.role} onSelect={() => setConfirm({ kind: 'role', user: u, role: r })}>
                      {ROLE[r]}
                    </MenuItem>
                  ))}
                  <MenuSeparator />
                  {u.status === 'INVITED' && (
                    <MenuItem
                      icon={Send}
                      onSelect={async () => {
                        const res = await resendInvite(u.id)
                        if (res.ok) toast.success('Invitation resent')
                        else toast.error(res.error.message)
                      }}
                    >
                      Resend invite
                    </MenuItem>
                  )}
                  {u.status === 'SUSPENDED' ? (
                    <MenuItem icon={RotateCcw} onSelect={() => setConfirm({ kind: 'status', user: u, status: 'ACTIVE' })}>
                      Reactivate
                    </MenuItem>
                  ) : (
                    <MenuItem icon={Ban} destructive disabled={u.isSelf} onSelect={() => setConfirm({ kind: 'status', user: u, status: 'SUSPENDED' })}>
                      Suspend
                    </MenuItem>
                  )}
                </MenuContent>
              </Menu>
            </li>
          ))}
        </ul>
      </div>
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        loading={busy}
        destructive={confirm?.kind === 'status' && confirm.status === 'SUSPENDED'}
        title={
          confirm?.kind === 'role'
            ? `Make ${confirm.user.name ?? confirm.user.email} a ${ROLE[confirm.role]}?`
            : confirm?.kind === 'status' && confirm.status === 'SUSPENDED'
              ? `Suspend ${confirm.user.name ?? confirm.user.email}?`
              : 'Reactivate this account?'
        }
        description={
          confirm?.kind === 'role'
            ? 'Their current mentoring assignments end immediately and they’ll set up a new profile for the new role. This is recorded in the audit history.'
            : confirm?.kind === 'status' && confirm.status === 'SUSPENDED'
              ? 'They are signed out and can’t access Mentora until reactivated. Their data is kept.'
              : 'They’ll be able to sign in again.'
        }
        confirmLabel={confirm?.kind === 'role' ? 'Change role' : confirm?.kind === 'status' && confirm.status === 'SUSPENDED' ? 'Suspend' : 'Reactivate'}
        onConfirm={run}
      />
    </>
  )
}
