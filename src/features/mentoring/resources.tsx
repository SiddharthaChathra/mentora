'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Search, Trash2, Upload, Users } from 'lucide-react'
import { bytes, fmtDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { ConfirmDialog, Dialog, DialogContent, Sheet, SheetContent } from '@/components/ui/overlay'
import { Pill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { createResource, deleteResource, markSeen } from '@/server/actions/mentoring'
import type { Resource } from '@/server/services/mentoring'
import { ResourceActions, ResourceTile } from './cards'

const ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg'

export function ResourcesWorkspace({
  items,
  viewer,
  mentees = [],
  subjects,
  fixedStudentId,
  basePath,
}: {
  items: Resource[]
  viewer: 'MENTEE' | 'MENTOR' | 'HOD'
  mentees?: { id: string; name: string | null }[]
  subjects: { id: string; code: string; name: string }[]
  fixedStudentId?: string
  basePath: string
}) {
  const sp = useSearchParams()
  const router = useRouter()
  const [q, setQ] = React.useState('')
  const [subject, setSubject] = React.useState('all')
  const [openId, setOpenId] = React.useState<string | null>(sp.get('item'))
  const [upload, setUpload] = React.useState(sp.get('new') === '1' && viewer === 'MENTOR')
  const [del, setDel] = React.useState<Resource | null>(null)
  const open = items.find((i) => i.id === openId) ?? null
  const unseen = items.filter((i) => !i.seen)

  React.useEffect(() => {
    if (open && !open.seen && viewer === 'MENTEE') void markSeen('resource', [open.id]).then(() => router.refresh())
  }, [open, viewer, router])

  const shown = items.filter(
    (i) =>
      (subject === 'all' || i.subject?.id === subject) &&
      (!q || `${i.title} ${i.instructions} ${i.subject?.code ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  )
  const usedSubjects = subjects.filter((s) => items.some((i) => i.subject?.id === s.id))

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:max-w-xs">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" />
            <input
              type="search"
              aria-label="Search resources"
              placeholder="Search resources…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm shadow-1 outline-none focus:border-primary-500 focus:shadow-[0_0_0_4px_var(--primary-100)]"
            />
          </div>
          {usedSubjects.length > 0 && (
            <select aria-label="Filter by subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded-full border border-line bg-surface px-4 text-sm shadow-1">
              <option value="all">All subjects</option>
              {usedSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          {viewer === 'MENTEE' && unseen.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const res = await markSeen('resource', unseen.map((u) => u.id))
                if (res.ok) {
                  toast.success('All marked as seen')
                  router.refresh()
                }
              }}
            >
              <CheckCircle2 /> Mark all as seen
            </Button>
          )}
          {viewer === 'MENTOR' && (
            <Button onClick={() => setUpload(true)}>
              <Upload /> Upload material
            </Button>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          illustration={q ? 'no-results' : 'no-resources'}
          title={q ? 'No matches' : 'No resources yet'}
          description={q ? 'Try a different search or subject.' : viewer === 'MENTOR' ? 'Upload notes, slides or links with instructions for your mentees.' : 'Study material your mentor shares will appear here.'}
          action={viewer === 'MENTOR' && !q && <Button onClick={() => setUpload(true)}>Upload the first resource</Button>}
        />
      ) : (
        <ul className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((r) => (
            <li key={r.id} onClickCapture={(e) => { e.preventDefault(); setOpenId(r.id) }}>
              <ResourceTile r={r} href={`${basePath}?item=${r.id}`} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <SheetContent title={open.title} description={`Shared by ${open.mentorName ?? 'your mentor'} · ${fmtDate(open.createdAt)}`}>
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {open.subject && (
                  <Pill tone="outline">
                    {open.subject.code} · {open.subject.name}
                  </Pill>
                )}
                <Pill tone={open.studentId ? 'brand' : 'info'}>{open.studentId ? 'Shared with one student' : 'Shared with all mentees'}</Pill>
                {open.hasFile && <Pill>{bytes(open.sizeBytes)}</Pill>}
              </div>
              <section>
                <h3 className="eyebrow">Instructions</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink-700">{open.instructions || 'No instructions were added.'}</p>
              </section>
              {open.fileName && <p className="truncate text-sm text-ink-500">File: {open.fileName}</p>}
              <ResourceActions r={open} />
              {viewer === 'MENTOR' && (
                <Button variant="ghost" size="sm" className="text-danger-700" onClick={() => setDel(open)}>
                  <Trash2 /> Delete resource
                </Button>
              )}
            </div>
          </SheetContent>
        )}
      </Sheet>

      {viewer === 'MENTOR' && <UploadDialog open={upload} onOpenChange={setUpload} mentees={mentees} subjects={subjects} fixedStudentId={fixedStudentId} />}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete this resource?"
        description="Students will no longer see it, and the file is removed from storage."
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!del) return
          const res = await deleteResource(del.id)
          if (res.ok) {
            toast.success('Resource deleted')
            setDel(null)
            setOpenId(null)
            router.refresh()
          } else toast.error(res.error.message)
        }}
      />
    </div>
  )
}

function UploadDialog({
  open,
  onOpenChange,
  mentees,
  subjects,
  fixedStudentId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mentees: { id: string; name: string | null }[]
  subjects: { id: string; code: string; name: string }[]
  fixedStudentId?: string
}) {
  const router = useRouter()
  const [file, setFile] = React.useState<File | null>(null)
  const [v, setV] = React.useState({ title: '', instructions: '', student_id: fixedStudentId ?? '', subject_id: '', external_url: '' })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [progress, setProgress] = React.useState<number | null>(null)

  const submit = async () => {
    const fd = new FormData()
    for (const [k, val] of Object.entries(v)) fd.set(k, val)
    if (file) fd.set('file', file)
    setProgress(file ? 15 : null)
    const tick = file ? setInterval(() => setProgress((p) => (p == null ? p : Math.min(90, p + 8))), 250) : null
    const res = await createResource(fd)
    if (tick) clearInterval(tick)
    if (!res.ok) {
      setProgress(null)
      setErrors(Object.fromEntries(Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? ''])))
      toast.error(res.error.message)
      return
    }
    setProgress(100)
    toast.success('Uploaded — your mentees have been notified')
    onOpenChange(false)
    setFile(null)
    setProgress(null)
    setV({ title: '', instructions: '', student_id: fixedStudentId ?? '', subject_id: '', external_url: '' })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Upload study material"
        description="PDF, slides, documents, spreadsheets, text or images up to 25 MB — or share a link."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={progress != null && progress < 100}>
              <Upload /> Share
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input id="r-title" label="Title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} error={errors.title} required />
          <Textarea id="r-instr" label="Instructions & context" rows={4} value={v.instructions} onChange={(e) => setV({ ...v, instructions: e.target.value })} hint="Tell the student how and when to use this." />
          <div className="grid gap-3 sm:grid-cols-2">
            {!fixedStudentId && (
              <Select
                id="r-target"
                label="Share with"
                value={v.student_id}
                onChange={(e) => setV({ ...v, student_id: e.target.value })}
                options={mentees.map((m) => ({ value: m.id, label: m.name ?? 'Unnamed' }))}
                placeholder="All my mentees"
              />
            )}
            <Select id="r-subject" label="Subject" value={v.subject_id} onChange={(e) => setV({ ...v, subject_id: e.target.value })} options={subjects.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} placeholder="Not subject-specific" />
          </div>
          <FileDropzone id="r-file" label="File" accept={ACCEPT} maxBytes={25 * 1024 * 1024} file={file} onFile={setFile} error={errors.file} hint="PDF, PPT(X), DOC(X), XLS(X), TXT, PNG, JPG · max 25 MB" progress={progress} />
          <Input id="r-url" label="…or a link" type="url" placeholder="https://" value={v.external_url} onChange={(e) => setV({ ...v, external_url: e.target.value })} error={errors.external_url} />
          {!v.student_id && !fixedStudentId && (
            <p className="flex items-center gap-2 text-xs text-ink-500">
              <Users className="size-3.5" /> Everyone currently assigned to you will see this.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
