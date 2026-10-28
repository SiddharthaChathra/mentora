'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertCircle, ArrowLeft, CheckCircle2, Copy, Download, FileSpreadsheet, GraduationCap, LifeBuoy, ListChecks, Upload, Users } from 'lucide-react'
import { cn, fmtRelative } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox, Select } from '@/components/ui/field'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { Card, CardBody, CardHeader, IconChip, Pill, StatusPill } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/navigation'
import { EmptyState } from '@/components/ui/states'
import { commitImport, discardImport, previewImport, type PreviewResult } from '@/server/actions/imports'

const KINDS = [
  { kind: 'students', label: 'Students', icon: Users, desc: 'Create student accounts with USN, semester and section.' },
  { kind: 'mentors', label: 'Mentors', icon: LifeBuoy, desc: 'Create faculty accounts with designation and capacity.' },
  { kind: 'subjects', label: 'Subjects', icon: GraduationCap, desc: 'Branch subjects with credits and max marks.' },
  { kind: 'results', label: 'Results', icon: ListChecks, desc: 'Official marks; imported as HOD-verified semesters.' },
] as const

export type JobRow = { id: string; kind: string; fileName: string; status: string; total: number; valid: number; errors: number; createdAt: string; summary: Record<string, unknown> }

/** HOD: imports into their own branch. Principal: passes `branches` and must choose the target branch. */
export function ImportWizard({ jobs, branches }: { jobs: JobRow[]; branches?: { id: string; code: string; name: string }[] }) {
  const router = useRouter()
  const [branchId, setBranchId] = React.useState(branches?.[0]?.id ?? '')
  const [kind, setKind] = React.useState<(typeof KINDS)[number]['kind']>('students')
  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<PreviewResult | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [dup, setDup] = React.useState<'skip' | 'update'>('skip')
  const importCount = preview ? preview.valid - (dup === 'skip' ? preview.rows.filter((r) => !r.errors.length && r.duplicate).length : 0) : 0
  const [invites, setInvites] = React.useState(true)
  const [only, setOnly] = React.useState<'all' | 'problems'>('all')
  const [done, setDone] = React.useState<{ summary: Record<string, unknown>; jobId: string; failures: number } | null>(null)
  const step = done ? 3 : preview ? 2 : 1

  const upload = async () => {
    if (!file) return toast.error('Choose a file first')
    setBusy(true)
    const fd = new FormData()
    fd.set('kind', kind)
    fd.set('file', file)
    if (branches) fd.set('department_id', branchId)
    const res = await previewImport(fd)
    setBusy(false)
    if (!res.ok) return toast.error(res.error.message)
    setPreview(res.data)
  }
  const commit = async () => {
    if (!preview) return
    setBusy(true)
    const res = await commitImport(preview.jobId, { duplicates: dup, sendInvites: invites })
    setBusy(false)
    if (!res.ok) return toast.error(res.error.message)
    setDone({ summary: res.data.summary, jobId: preview.jobId, failures: res.data.failures })
    router.refresh()
  }
  const reset = () => {
    setFile(null)
    setPreview(null)
    setDone(null)
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Import steps">
        {['Choose & upload', 'Preview & validate', 'Done'].map((s, i) => (
          <li key={s} className={cn('inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium', step === i + 1 ? 'bg-primary-600 text-white shadow-glow' : step > i + 1 ? 'bg-success-100 text-success-700' : 'bg-surface-muted text-ink-500')}>
            <span className="num">{i + 1}</span> {s}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader title="What are you importing?" />
            <CardBody>
              {branches && (
                <div className="mb-4 max-w-sm">
                  <Select
                    id="imp-branch"
                    label="Into branch"
                    hint="Rows with a branch column must match this branch."
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    options={branches.map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` }))}
                  />
                </div>
              )}
              <div role="radiogroup" aria-label="Import type" className="grid gap-3 sm:grid-cols-2">
                {KINDS.map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    role="radio"
                    aria-checked={kind === k.kind}
                    onClick={() => setKind(k.kind)}
                    className={cn('flex items-start gap-3 rounded-xl border p-4 text-left transition-colors', kind === k.kind ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-100' : 'border-line hover:border-line-strong')}
                  >
                    <IconChip icon={k.icon} tone={kind === k.kind ? 'brand' : 'neutral'} size="sm" />
                    <span>
                      <span className="block font-semibold text-ink-900">{k.label}</span>
                      <span className="mt-0.5 block text-sm text-ink-500">{k.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <FileDropzone id="import-file" label="Upload file" accept=".csv,.xlsx" maxBytes={5 * 1024 * 1024} file={file} onFile={setFile} hint="CSV or XLSX · up to 5,000 rows · 5 MB" />
              </div>
              <Button className="mt-5" size="lg" onClick={upload} loading={busy} disabled={!file}>
                <Upload /> Upload & preview
              </Button>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Templates" description="Start from a template so the columns match." />
            <CardBody className="space-y-2">
              {KINDS.map((k) => (
                <div key={k.kind} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm text-ink-900">
                    <FileSpreadsheet className="size-4 text-success-700" /> {k.label}
                  </span>
                  <span className="flex gap-1">
                    <a className={buttonVariants({ variant: 'ghost', size: 'sm' })} href={`/api/imports/template/${k.kind}`}>
                      CSV
                    </a>
                    <a className={buttonVariants({ variant: 'ghost', size: 'sm' })} href={`/api/imports/template/${k.kind}?format=xlsx`}>
                      XLSX
                    </a>
                  </span>
                </div>
              ))}
              <p className="pt-2 text-xs text-ink-500">Nothing is saved until you confirm the preview. Results imports never overwrite verified or finalized semesters.</p>
            </CardBody>
          </Card>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { l: 'Rows', v: preview.total, t: 'text-ink-900' },
              { l: 'Valid', v: preview.valid, t: 'text-success-700' },
              { l: 'With errors', v: preview.errors, t: preview.errors ? 'text-danger-700' : 'text-ink-900' },
              { l: 'Duplicates', v: preview.duplicates, t: preview.duplicates ? 'text-warning-700' : 'text-ink-900' },
            ].map((s) => (
              <Card key={s.l} className="p-4">
                <p className="eyebrow">{s.l}</p>
                <p className={cn('num-display mt-1 text-3xl font-semibold', s.t)}>{s.v}</p>
              </Card>
            ))}
          </div>
          <Card className="overflow-hidden">
            <CardHeader
              title="Preview"
              description={preview.total > preview.rows.length ? `Showing the first ${preview.rows.length} of ${preview.total} rows` : `${preview.total} ${preview.total === 1 ? 'row' : 'rows'}`}
              action={<Segmented size="sm" label="Row filter" value={only} onChange={setOnly} options={[{ value: 'all', label: 'All rows' }, { value: 'problems', label: 'Problems' }]} />}
            />
            <CardBody>
              <div className="max-h-[52dvh] overflow-auto rounded-lg border border-line">
                <table className="w-full text-sm">
                  <caption className="sr-only">Import preview</caption>
                  <thead className="sticky top-0 bg-surface-muted text-left text-xs text-ink-500">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">Row</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                      {Object.keys(preview.rows[0]?.data ?? {})
                        .slice(0, 6)
                        .map((c) => (
                          <th key={c} scope="col" className="px-3 py-2 font-semibold">
                            {c}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows
                      .filter((r) => only === 'all' || r.errors.length || r.duplicate)
                      .map((r) => (
                        <tr key={r.row} className={cn('border-t border-line align-top', r.errors.length && 'bg-danger-100/40')}>
                          <td className="num px-3 py-2 text-ink-500">{r.row}</td>
                          <td className="px-3 py-2">
                            {r.errors.length ? (
                              <span className="inline-flex items-start gap-1 text-xs text-danger-700">
                                <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {r.errors.join('; ')}
                              </span>
                            ) : r.duplicate ? (
                              <Pill tone="warning">
                                <Copy className="size-3" /> {r.duplicate === 'file' ? 'Repeated in file' : 'Already exists'}
                              </Pill>
                            ) : (
                              <Pill tone="success">Valid</Pill>
                            )}
                          </td>
                          {Object.keys(preview.rows[0]?.data ?? {})
                            .slice(0, 6)
                            .map((c) => (
                              <td key={c} className="max-w-48 truncate px-3 py-2 text-ink-700">
                                {String(r.data[c] ?? '')}
                              </td>
                            ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                {preview.duplicates > 0 && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-ink-700">
                    Rows that already exist:
                    <Segmented size="sm" label="Duplicate handling" value={dup} onChange={setDup} options={[{ value: 'skip', label: 'Skip them' }, { value: 'update', label: 'Update them' }]} />
                  </div>
                )}
                {(preview.kind === 'students' || preview.kind === 'mentors') && <Checkbox id="send-invites" label="Send invitation emails to new users" description="Otherwise accounts are created and you can send invites later from Users & roles." checked={invites} onCheckedChange={(v) => setInvites(v === true)} />}
                {preview.errors > 0 && <p className="text-sm text-danger-700">{preview.errors} {preview.errors === 1 ? 'row has errors and' : 'rows with errors'} will be skipped. Fix them and import again, or download the error report afterwards.</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await discardImport(preview.jobId)
                    reset()
                  }}
                >
                  <ArrowLeft /> Start over
                </Button>
                <Button size="lg" onClick={commit} loading={busy} disabled={preview.valid === 0}>
                  <CheckCircle2 /> Import {importCount} {importCount === 1 ? 'row' : 'rows'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {step === 3 && done && (
        <Card>
          <EmptyState
            illustration="success"
            title="Import complete"
            description={Object.entries(done.summary)
              .filter(([k, v]) => k !== 'semesters' && typeof v !== 'object')
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
            action={<Button onClick={reset}>Import another file</Button>}
            secondary={
              done.failures > 0 || (preview?.errors ?? 0) > 0 ? (
                <a className={buttonVariants({ variant: 'secondary' })} href={`/api/imports/${done.jobId}/errors`}>
                  <Download /> Error report
                </a>
              ) : undefined
            }
          />
        </Card>
      )}

      <Card>
        <CardHeader title="Recent imports" />
        <CardBody>
          {jobs.length === 0 ? (
            <p className="text-sm text-ink-500">No imports yet.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {jobs.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="font-medium text-ink-900">{j.fileName}</span>
                  <Pill tone="outline">{j.kind}</Pill>
                  <StatusPill status={j.status} />
                  <span className="num text-xs text-ink-500">
                    {j.valid}/{j.total} valid · {j.errors} errors
                  </span>
                  <span className="ml-auto text-xs text-ink-500">{fmtRelative(j.createdAt)}</span>
                  {j.errors > 0 && (
                    <a className="text-xs font-medium text-primary-600 hover:underline" href={`/api/imports/${j.id}/errors`}>
                      Errors CSV
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
