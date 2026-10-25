'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { KeyRound, Laptop, LogOut, Monitor, Smartphone, Wifi } from 'lucide-react'
import { fmtRelative } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Switch } from '@/components/ui/field'
import { Card, CardBody, CardHeader, IconChip, Pill } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/overlay'
import { useLowBandwidth } from '@/components/providers'
import { changePassword, revokeSession, updatePreferences } from '@/server/actions/profile'
import { signOut } from '@/server/actions/shell'

export type SessionInfo = { id: string; createdAt: string; updatedAt: string | null; userAgent: string | null; ip: string | null; current: boolean }

function device(ua: string | null) {
  if (!ua) return { label: 'Unknown device', icon: Monitor }
  const mobile = /Mobile|Android|iPhone/i.test(ua)
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : ''
  return { label: `${browser}${os ? ` on ${os}` : ''}`, icon: mobile ? Smartphone : Laptop }
}

export function PasswordCard() {
  const [v, setV] = React.useState({ current: '', password: '', confirm: '' })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)
  return (
    <Card>
      <CardHeader title="Password" icon={<KeyRound />} description="At least 10 characters with upper and lowercase letters and a number." />
      <CardBody className="space-y-3">
        <Input id="pw-current" type="password" autoComplete="current-password" label="Current password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} error={errors.current} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="pw-new" type="password" autoComplete="new-password" label="New password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={errors.password} />
          <Input id="pw-confirm" type="password" autoComplete="new-password" label="Confirm new password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} error={errors.confirm} />
        </div>
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true)
            const res = await changePassword(v)
            setBusy(false)
            if (!res.ok) {
              setErrors(Object.fromEntries(Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? ''])))
              return toast.error(res.error.message)
            }
            setErrors({})
            setV({ current: '', password: '', confirm: '' })
            toast.success('Password updated')
          }}
        >
          Update password
        </Button>
      </CardBody>
    </Card>
  )
}

export function SessionsCard({ sessions }: { sessions: SessionInfo[] }) {
  const router = useRouter()
  const [confirm, setConfirm] = React.useState(false)
  return (
    <Card>
      <CardHeader
        title="Signed-in devices"
        description="Sign out anywhere you don’t recognise."
        action={
          <Button variant="secondary" size="sm" onClick={() => setConfirm(true)}>
            <LogOut /> Sign out everywhere
          </Button>
        }
      />
      <CardBody>
        <ul className="divide-y divide-line/70">
          {sessions.map((s) => {
            const d = device(s.userAgent)
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <IconChip icon={d.icon} tone={s.current ? 'brand' : 'neutral'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">
                    {d.label} {s.current && <Pill tone="brand">This device</Pill>}
                  </p>
                  <p className="text-xs text-ink-500">
                    Active {fmtRelative(s.updatedAt ?? s.createdAt)}
                    {s.ip ? ` · ${s.ip}` : ''}
                  </p>
                </div>
                {!s.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const res = await revokeSession(s.id)
                      if (res.ok) {
                        toast.success('Signed out that device')
                        router.refresh()
                      } else toast.error(res.error.message)
                    }}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            )
          })}
          {sessions.length === 0 && <li className="py-3 text-sm text-ink-500">No other sessions.</li>}
        </ul>
      </CardBody>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Sign out of all devices?" description="You’ll be signed out here too and need to sign in again." confirmLabel="Sign out everywhere" destructive onConfirm={() => void signOut('global')} />
    </Card>
  )
}

export function PreferencesCard({ prefs }: { prefs: { email_notifications?: boolean; reminder_emails?: boolean } }) {
  const router = useRouter()
  const { lowBandwidth, setLowBandwidth } = useLowBandwidth()
  const [p, setP] = React.useState({ email_notifications: prefs.email_notifications ?? true, reminder_emails: prefs.reminder_emails ?? true })
  const save = async (patch: Partial<typeof p> & { low_bandwidth?: boolean }) => {
    const res = await updatePreferences(patch)
    if (res.ok) {
      toast.success('Preferences saved')
      router.refresh()
    } else toast.error(res.error.message)
  }
  return (
    <Card>
      <CardHeader title="Preferences" description="Mentora uses one light theme, tuned for readability." />
      <CardBody className="space-y-5">
        <Switch
          id="pref-email"
          label="Email me about important updates"
          description="New feedback, verified records, assignment changes. In-app notifications always stay on."
          checked={p.email_notifications}
          onCheckedChange={(c) => {
            setP({ ...p, email_notifications: c })
            void save({ email_notifications: c })
          }}
        />
        <Switch
          id="pref-reminders"
          label="Daily reminder emails"
          description="Pending follow-ups, incomplete profile or records, upcoming sessions."
          checked={p.reminder_emails}
          onCheckedChange={(c) => {
            setP({ ...p, reminder_emails: c })
            void save({ reminder_emails: c })
          }}
        />
        <Switch
          id="pref-lowbw"
          label="Low-bandwidth mode"
          description="Turns off animations and decorative graphics and keeps data cached longer — useful on slow connections."
          checked={lowBandwidth}
          onCheckedChange={(c) => {
            setLowBandwidth(c)
            void save({ low_bandwidth: c })
          }}
        />
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <Wifi className="size-3.5" /> Low-bandwidth mode is also suggested automatically when your connection is slow.
        </p>
      </CardBody>
    </Card>
  )
}
