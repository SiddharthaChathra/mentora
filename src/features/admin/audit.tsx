'use client'

import * as React from 'react'
import { fmtDate } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/overlay'
import { Pill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'

export type AuditRow = {
  id: number
  actor: string
  action: string
  entityType: string
  entityId: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip: string | null
  createdAt: string
}

const NOISE = new Set(['updated_at', 'created_at', 'draft'])
const show = (v: unknown) => (v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))

export function diff(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter((k) => !NOISE.has(k))
  return keys
    .map((k) => ({ key: k, before: before?.[k], after: after?.[k] }))
    .filter((d) => JSON.stringify(d.before ?? null) !== JSON.stringify(d.after ?? null))
}

const ENTITY_LABEL: Record<string, string> = {
  academic_semesters: 'Semester',
  student_subject_results: 'Subject result',
  semester_summaries: 'SGPA/CGPA snapshot',
  mentor_assignments: 'Assignment',
  mentor_recommendations: 'Mentoring record',
  grading_schemes: 'Grading scheme',
  app_settings: 'Setting',
  risk_thresholds: 'Risk rule',
  record_change_requests: 'Correction request',
  subjects: 'Subject',
  users: 'User account',
  student_report: 'PDF report',
}

export function AuditList({ rows }: { rows: AuditRow[] }) {
  const [open, setOpen] = React.useState<AuditRow | null>(null)
  if (!rows.length) return <EmptyState illustration="no-results" title="No matching events" description="Adjust the filters or date range." />
  return (
    <>
      <div className="overflow-hidden rounded-xl bg-surface shadow-2">
        <ul className="divide-y divide-line/70">
          {rows.map((r) => {
            const changes = diff(r.before, r.after)
            return (
              <li key={r.id}>
                <button type="button" onClick={() => setOpen(r)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted sm:px-5">
                  <Pill tone={r.action === 'delete' ? 'danger' : r.action === 'insert' ? 'success' : r.action.includes('.') ? 'info' : 'brand'}>{r.action}</Pill>
                  <span className="text-sm font-medium text-ink-900">{ENTITY_LABEL[r.entityType] ?? r.entityType}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-500">
                    {changes.length ? changes.slice(0, 3).map((c) => c.key).join(', ') : r.entityId}
                  </span>
                  <span className="text-sm text-ink-700">{r.actor}</span>
                  <span className="num w-36 text-right text-xs text-ink-500">{fmtDate(r.createdAt, 'd MMM yyyy, HH:mm')}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <SheetContent title={`${ENTITY_LABEL[open.entityType] ?? open.entityType} · ${open.action}`} description={`${open.actor} · ${fmtDate(open.createdAt, 'd MMM yyyy, HH:mm:ss')}`} className="max-w-xl">
            <dl className="mb-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-ink-500">Record</dt>
                <dd className="num break-all text-ink-900">{open.entityId ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-500">IP</dt>
                <dd className="num text-ink-900">{open.ip || '—'}</dd>
              </div>
            </dl>
            <table className="w-full text-sm">
              <caption className="sr-only">Changed fields</caption>
              <thead className="text-left text-xs text-ink-500">
                <tr>
                  <th scope="col" className="py-2 pr-2 font-semibold">Field</th>
                  <th scope="col" className="py-2 pr-2 font-semibold">Before</th>
                  <th scope="col" className="py-2 font-semibold">After</th>
                </tr>
              </thead>
              <tbody>
                {diff(open.before, open.after).map((d) => (
                  <tr key={d.key} className="border-t border-line align-top">
                    <th scope="row" className="py-2 pr-2 text-left font-medium text-ink-900">{d.key}</th>
                    <td className="num py-2 pr-2 break-all text-danger-700">{show(d.before)}</td>
                    <td className="num py-2 break-all text-success-700">{show(d.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SheetContent>
        )}
      </Sheet>
    </>
  )
}
