'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BadgeCheck, Calculator, Lock, Pencil, Plus, Save, Sparkles, Trash2, X } from 'lucide-react'
import { cn, fmtDate } from '@/lib/utils'
import { previewLine, validateScheme, type GradeBand } from '@/lib/grading'
import { Button } from '@/components/ui/button'
import { Input, Switch } from '@/components/ui/field'
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/overlay'
import { Card, CardBody, CardHeader, Pill } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/navigation'
import { deleteSection, recomputeSummaries, saveAcademicYear, saveAppSettings, saveGradingScheme, saveSection, saveSubject, saveThresholds, verifySubject } from '@/server/actions/admin'

type Scheme = { id: string; name: string; version: number; bands: GradeBand[]; pass_pct: number; mse_weight: number; active: boolean; created_at: string }
type Subject = { id: string; code: string; name: string; credits: number; semester: number | null; mse_max: number | null; see_max: number | null; is_verified: boolean }

export type SettingsProps = {
  schemes: Scheme[]
  thresholds: Record<string, number>
  sections: { id: string; name: string }[]
  years: { label: string; starts_on: string; ends_on: string; is_current: boolean }[]
  subjects: Subject[]
  app: { institutionName: string; programCredits: number | null; optionalFields: { dob?: boolean; gender?: boolean; address?: boolean }; attendanceEnabled: boolean; aiEnabled: boolean }
  aiAvailable: boolean
}

function useRun() {
  const router = useRouter()
  return async (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, msg: string) => {
    const res = await fn()
    if (res.ok) {
      toast.success(msg)
      router.refresh()
    } else toast.error(res.error?.message ?? 'Could not save')
    return res.ok
  }
}

export function SettingsWorkspace(props: SettingsProps) {
  const [tab, setTab] = React.useState<'grading' | 'thresholds' | 'structure' | 'subjects' | 'features'>('grading')
  return (
    <div>
      <Segmented
        className="mb-6 max-w-full overflow-x-auto"
        label="Settings section"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'grading', label: 'Grading' },
          { value: 'thresholds', label: 'Risk rules' },
          { value: 'structure', label: 'Structure' },
          { value: 'subjects', label: 'Subjects' },
          { value: 'features', label: 'Profile & features' },
        ]}
      />
      {tab === 'grading' && <GradingEditor schemes={props.schemes} />}
      {tab === 'thresholds' && <ThresholdsForm initial={props.thresholds} />}
      {tab === 'structure' && <Structure sections={props.sections} years={props.years} />}
      {tab === 'subjects' && <Subjects subjects={props.subjects} />}
      {tab === 'features' && <Features app={props.app} aiAvailable={props.aiAvailable} />}
    </div>
  )
}

function GradingEditor({ schemes }: { schemes: Scheme[] }) {
  const run = useRun()
  const active = schemes.find((s) => s.active) ?? schemes[0]
  const [name, setName] = React.useState(active?.name ?? '10-point CBCS')
  const [pass, setPass] = React.useState(String(active?.pass_pct ?? 40))
  const [mse, setMse] = React.useState(Math.round((active?.mse_weight ?? 0.5) * 100))
  const [bands, setBands] = React.useState<GradeBand[]>(active?.bands ?? [{ min_pct: 0, grade: 'F', points: 0 }])
  const [pm, setPm] = React.useState('85')
  const [px, setPx] = React.useState('100')
  const [confirm, setConfirm] = React.useState<null | 'all'>(null)
  const scheme = { bands: bands.map((b) => ({ ...b, min_pct: Number(b.min_pct), points: Number(b.points) })), pass_pct: Number(pass), mse_weight: mse / 100, see_weight: 1 - mse / 100, max_grade_points: 10 }
  const problems = validateScheme(scheme)
  const sorted = [...bands].map((b, i) => ({ b, i })).sort((a, c) => Number(c.b.min_pct) - Number(a.b.min_pct))
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader title="Grading scheme" description={active ? `Active: ${active.name} · version ${active.version}` : 'No scheme yet'} />
        <CardBody className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Input id="gs-name" label="Scheme name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input id="gs-pass" label="Pass %" inputMode="decimal" value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
          <div>
            <label htmlFor="gs-weight" className="text-sm font-medium text-ink-900">
              Weighting · MSE <span className="num">{mse}%</span> / SEE <span className="num">{100 - mse}%</span>
            </label>
            <input id="gs-weight" type="range" min={0} max={100} step={5} value={mse} onChange={(e) => setMse(Number(e.target.value))} className="mt-2 w-full accent-[var(--primary-600)]" />
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <caption className="sr-only">Grade bands</caption>
              <thead className="bg-surface-muted text-left text-xs text-ink-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">From %</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Grade</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Grade points</th>
                  <th scope="col" className="px-3 py-2"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ b, i }) => (
                  <tr key={i} className="border-t border-line">
                    {(['min_pct', 'grade', 'points'] as const).map((k) => (
                      <td key={k} className="px-2 py-1.5">
                        <input
                          aria-label={`Band ${i + 1} ${k}`}
                          value={String(b[k])}
                          onChange={(e) => setBands(bands.map((x, j) => (j === i ? { ...x, [k]: k === 'grade' ? e.target.value.toUpperCase() : (e.target.value as unknown as number) } : x)))}
                          className="num h-9 w-full rounded-lg border border-transparent bg-surface-muted px-2.5 outline-none focus:border-primary-500 focus:bg-surface"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right">
                      <button type="button" aria-label="Remove band" onClick={() => setBands(bands.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-surface-muted">
                        <X className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="soft" size="sm" onClick={() => setBands([...bands, { min_pct: 0, grade: '', points: 0 }])}>
            <Plus /> Add band
          </Button>
          {problems.length > 0 && (
            <ul role="alert" className="list-disc space-y-1 rounded-lg bg-danger-100 py-3 pr-3 pl-7 text-sm text-danger-700">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 border-t border-line pt-5">
            <Button disabled={problems.length > 0} onClick={() => run(() => saveGradingScheme({ name, pass_pct: pass, mse_weight: mse / 100, bands: scheme.bands }), 'New scheme version is active')}>
              <Save /> Save as new version
            </Button>
            <Button variant="secondary" onClick={() => run(() => recomputeSummaries('drafts'), 'Draft and submitted semesters recalculated')}>
              <Calculator /> Recompute drafts
            </Button>
            <Button variant="ghost" className="text-danger-700" onClick={() => setConfirm('all')}>
              Recompute verified too…
            </Button>
          </div>
          <p className="text-xs text-ink-500">Saving never rewrites finalized history. Verified snapshots are only recalculated when you explicitly choose “Recompute verified too”, and that action is audited.</p>
        </CardBody>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Live preview" />
          <CardBody>
            <div className="flex items-end gap-2">
              <Input id="pv-m" label="Marks" inputMode="decimal" value={pm} onChange={(e) => setPm(e.target.value)} />
              <span className="pb-4 text-ink-500">/</span>
              <Input id="pv-x" label="Max" inputMode="decimal" value={px} onChange={(e) => setPx(e.target.value)} />
            </div>
            <p className="num mt-4 rounded-xl bg-primary-50 px-4 py-3 text-lg font-semibold text-primary-700" aria-live="polite">
              {problems.length ? 'Fix the scheme first' : previewLine(Number(pm), Number(px), scheme)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Versions" />
          <CardBody>
            <ol className="space-y-2 text-sm">
              {schemes.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-ink-900">
                    v{s.version} · {s.name}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-ink-500">
                    {fmtDate(s.created_at)} {s.active && <Pill tone="success">Active</Pill>}
                  </span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
      <ConfirmDialog
        open={confirm === 'all'}
        onOpenChange={(o) => !o && setConfirm(null)}
        destructive
        title="Recompute verified snapshots?"
        description="SGPA/CGPA snapshots of verified (not finalized) semesters will be recalculated with the active scheme. This is recorded in the audit history."
        confirmLabel="Recompute"
        onConfirm={async () => {
          if (await run(() => recomputeSummaries('all'), 'All non-finalized snapshots recalculated')) setConfirm(null)
        }}
      />
    </div>
  )
}

const THRESHOLD_FIELDS = [
  { key: 'STRONG_PCT', label: 'Strong subject at or above (%)', hint: 'Needs 2+ comparable assessments' },
  { key: 'LOW_PCT', label: 'Low marks below (%)', hint: 'Used for “repeated low marks”' },
  { key: 'LOW_MIN_COUNT', label: 'Low marks — minimum count', hint: 'Assessments below the low threshold' },
  { key: 'DECLINE_PCT_POINTS', label: 'Decline of at least (points)', hint: 'Between consecutive comparable assessments' },
  { key: 'SGPA_DROP', label: 'SGPA drop of at least', hint: 'Between consecutive semesters' },
  { key: 'PROFILE_INCOMPLETE_DAYS', label: 'Profile incomplete after (days)', hint: 'Since the account was created' },
]

function ThresholdsForm({ initial }: { initial: Record<string, number> }) {
  const run = useRun()
  const [v, setV] = React.useState<Record<string, string>>(Object.fromEntries(THRESHOLD_FIELDS.map((f) => [f.key, String(initial[f.key] ?? '')])))
  return (
    <Card>
      <CardHeader title="Risk & insight rules" description="These thresholds drive insights and risk indicators. Flags always show their reason." />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-2">
          {THRESHOLD_FIELDS.map((f) => (
            <Input key={f.key} id={`th-${f.key}`} label={f.label} hint={f.hint} inputMode="decimal" value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          ))}
        </div>
        <Button className="mt-6" onClick={() => run(() => saveThresholds(v), 'Rules saved')}>
          <Save /> Save rules
        </Button>
      </CardBody>
    </Card>
  )
}

function Structure({ sections, years }: { sections: { id: string; name: string }[]; years: SettingsProps['years'] }) {
  const run = useRun()
  const [sec, setSec] = React.useState('')
  const [y, setY] = React.useState({ label: '', starts_on: '', ends_on: '', is_current: false })
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Sections" />
        <CardBody>
          <ul className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <li key={s.id} className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-surface pr-1 pl-3.5 text-sm">
                Section {s.name}
                <button type="button" aria-label={`Delete section ${s.name}`} onClick={() => run(() => deleteSection(s.id), 'Section removed')} className="grid size-7 place-items-center rounded-full text-ink-500 hover:bg-surface-muted">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Input id="new-sec" label="New section" value={sec} onChange={(e) => setSec(e.target.value)} />
            <Button className="mt-1.5" variant="secondary" disabled={!sec.trim()} onClick={async () => (await run(() => saveSection(sec), 'Section added')) && setSec('')}>
              Add
            </Button>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Academic years" />
        <CardBody>
          <ul className="space-y-2 text-sm">
            {years.map((yr) => (
              <li key={yr.label} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
                <span className="num text-ink-900">{yr.label}</span>
                <span className="flex items-center gap-2 text-xs text-ink-500">
                  {fmtDate(yr.starts_on, 'MMM yyyy')} – {fmtDate(yr.ends_on, 'MMM yyyy')}
                  {yr.is_current && <Pill tone="success">Current</Pill>}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Input id="ay-label" label="Label (2026-27)" value={y.label} onChange={(e) => setY({ ...y, label: e.target.value })} />
            <Input id="ay-start" type="date" label="Starts" value={y.starts_on} onChange={(e) => setY({ ...y, starts_on: e.target.value })} />
            <Input id="ay-end" type="date" label="Ends" value={y.ends_on} onChange={(e) => setY({ ...y, ends_on: e.target.value })} />
          </div>
          <Switch id="ay-current" className="mt-3" label="Make current" checked={y.is_current} onCheckedChange={(c) => setY({ ...y, is_current: c })} />
          <Button className="mt-4" variant="secondary" onClick={async () => (await run(() => saveAcademicYear(y), 'Academic year saved')) && setY({ label: '', starts_on: '', ends_on: '', is_current: false })}>
            <Plus /> Add academic year
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

function Subjects({ subjects }: { subjects: Subject[] }) {
  const run = useRun()
  const [edit, setEdit] = React.useState<Subject | 'new' | null>(null)
  const [filter, setFilter] = React.useState<'all' | 'unverified'>('all')
  const shown = subjects.filter((s) => filter === 'all' || !s.is_verified)
  const unverified = subjects.filter((s) => !s.is_verified).length
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Subjects"
        description="Students can propose missing subjects; verify them here so grade calculations use the right credits."
        action={
          <Button size="sm" onClick={() => setEdit('new')}>
            <Plus /> Add subject
          </Button>
        }
      />
      <CardBody>
        <Segmented size="sm" label="Subject filter" value={filter} onChange={setFilter} options={[{ value: 'all', label: `All (${subjects.length})` }, { value: 'unverified', label: `Needs review (${unverified})` }]} />
        <ul className="mt-4 divide-y divide-line/70">
          {shown.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="num w-20 text-sm font-semibold text-ink-900">{s.code}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{s.name}</span>
              <span className="num text-xs text-ink-500">
                {s.credits} cr · {s.semester ? `Sem ${s.semester}` : 'Any'} · {s.mse_max ?? '—'}/{s.see_max ?? '—'}
              </span>
              {s.is_verified ? (
                <Pill tone="success">Verified</Pill>
              ) : (
                <Button size="sm" variant="soft" onClick={() => run(() => verifySubject(s.id), `${s.code} verified`)}>
                  <BadgeCheck /> Verify
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${s.code}`} onClick={() => setEdit(s)}>
                <Pencil />
              </Button>
            </li>
          ))}
        </ul>
      </CardBody>
      {edit && <SubjectDialog subject={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </Card>
  )
}

function SubjectDialog({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const run = useRun()
  const [v, setV] = React.useState({
    code: subject?.code ?? '',
    name: subject?.name ?? '',
    credits: String(subject?.credits ?? ''),
    semester: String(subject?.semester ?? ''),
    mse_max: String(subject?.mse_max ?? '50'),
    see_max: String(subject?.see_max ?? '100'),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={subject ? `Edit ${subject.code}` : 'Add subject'}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={async () => (await run(() => saveSubject({ ...v, semester: v.semester || null }, subject?.id), 'Subject saved')) && onClose()}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="sd-code" label="Code" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} />
          <Input id="sd-credits" label="Credits" inputMode="decimal" value={v.credits} onChange={(e) => setV({ ...v, credits: e.target.value })} />
          <Input id="sd-name" label="Name" className="sm:col-span-2" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          <Input id="sd-sem" label="Semester" inputMode="numeric" value={v.semester} onChange={(e) => setV({ ...v, semester: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="sd-mse" label="MSE max" inputMode="decimal" value={v.mse_max} onChange={(e) => setV({ ...v, mse_max: e.target.value })} />
            <Input id="sd-see" label="SEE max" inputMode="decimal" value={v.see_max} onChange={(e) => setV({ ...v, see_max: e.target.value })} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Features({ app, aiAvailable }: { app: SettingsProps['app']; aiAvailable: boolean }) {
  const run = useRun()
  const [v, setV] = React.useState({
    institution_name: app.institutionName,
    program_total_credits: app.programCredits == null ? '' : String(app.programCredits),
    optional_profile_fields: { dob: app.optionalFields.dob ?? true, gender: app.optionalFields.gender ?? true, address: app.optionalFields.address ?? true },
    attendance_category_enabled: app.attendanceEnabled,
    ai_insights_enabled: app.aiEnabled,
  })
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Institution" />
        <CardBody className="space-y-4">
          <Input id="ft-inst" label="Institution name (shown on PDF reports)" value={v.institution_name} onChange={(e) => setV({ ...v, institution_name: e.target.value })} />
          <Input id="ft-credits" label="Total program credits" inputMode="numeric" value={v.program_total_credits} onChange={(e) => setV({ ...v, program_total_credits: e.target.value })} hint="Used for credit completion progress" />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Optional profile fields" description="Data minimisation: collect only what mentoring needs." />
        <CardBody className="space-y-4">
          {(['dob', 'gender', 'address'] as const).map((k) => (
            <Switch
              key={k}
              id={`opt-${k}`}
              label={k === 'dob' ? 'Date of birth' : k === 'gender' ? 'Gender' : 'Address'}
              checked={v.optional_profile_fields[k]}
              onCheckedChange={(c) => setV({ ...v, optional_profile_fields: { ...v.optional_profile_fields, [k]: c } })}
            />
          ))}
          <Switch id="opt-att" label="Attendance feedback category" description="Lets mentors file feedback under “Attendance”." checked={v.attendance_category_enabled} onCheckedChange={(c) => setV({ ...v, attendance_category_enabled: c })} />
        </CardBody>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="AI-assisted summaries" description="Optional. Off by default." />
        <CardBody>
          <div className={cn('rounded-xl p-4 text-sm', aiAvailable ? 'bg-primary-50 text-ink-700' : 'bg-surface-muted text-ink-500')}>
            <p className="flex items-center gap-2 font-medium text-ink-900">
              <Sparkles className="size-4 text-violet-500" /> How privacy is protected
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Only pseudonymised academic data is sent — never names, USNs, emails, phone numbers or photos.</li>
              <li>Summaries are drafts until the mentor reviews, edits and approves them.</li>
              <li>Students see “AI-assisted, reviewed by &lt;mentor&gt;”. Summaries never appear in PDF reports.</li>
            </ul>
            {!aiAvailable && (
              <p className="mt-3 flex items-center gap-1.5 font-medium text-ink-700">
                <Lock className="size-4" /> Unavailable: set GEMINI_API_KEY and AI_INSIGHTS_ENABLED=true on the server to allow this.
              </p>
            )}
          </div>
          <Switch id="opt-ai" className="mt-4" label="Enable AI-assisted summaries" disabled={!aiAvailable} checked={v.ai_insights_enabled && aiAvailable} onCheckedChange={(c) => setV({ ...v, ai_insights_enabled: c })} />
        </CardBody>
      </Card>
      <div className="lg:col-span-2">
        <Button onClick={() => run(() => saveAppSettings({ ...v, program_total_credits: v.program_total_credits === '' ? null : v.program_total_credits }), 'Settings saved')}>
          <Save /> Save settings
        </Button>
      </div>
    </div>
  )
}
