'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, CircleAlert, ClipboardPaste, Loader2, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveGrade, subjectPercentage, type GradingScheme } from '@/lib/grading'
import { resultRowSchema } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { saveResult } from '@/server/actions/academics'
import type { ResultRow } from '@/server/services/academics'
import { HelpTip } from '@/components/ui/help-tip'
import type { GlossaryTerm } from '@/lib/glossary'
import type { SubjectOption } from './subject-entry'

const COLS = ['credits', 'mse_marks', 'mse_max', 'see_marks', 'see_max', 'grade'] as const
type Col = (typeof COLS)[number]
const HEAD: Record<Col, string> = {
  credits: 'Credits',
  mse_marks: 'MSE',
  mse_max: 'MSE max',
  see_marks: 'SEE',
  see_max: 'SEE max',
  grade: 'Grade',
}
const HELP: Partial<Record<Col, GlossaryTerm>> = {
  credits: 'CREDITS',
  mse_marks: 'MSE',
  see_marks: 'SEE',
  grade: 'GRADE',
}

type GridRow = {
  key: string
  id?: string
  subjectId: string
  code: string
  name: string
  values: Record<Col, string>
  ia: ResultRow['ia']
  gradePoints: string
  result: ResultRow['result']
  index: number | null
  state: 'idle' | 'saving' | 'saved' | 'error'
  error?: string
}

const str = (v: number | string | null | undefined) => (v == null ? '' : String(v))
const num = (v: string) => (v.trim() === '' ? null : Number(v))

function buildRows(results: ResultRow[], subjects: SubjectOption[], semesterNo: number): GridRow[] {
  const rows: GridRow[] = results.map((r, i) => ({
    key: r.subjectId,
    id: r.id,
    subjectId: r.subjectId,
    code: r.code,
    name: r.name,
    values: {
      credits: str(r.credits),
      mse_marks: str(r.mse_marks),
      mse_max: str(r.mse_max),
      see_marks: str(r.see_marks),
      see_max: str(r.see_max),
      grade: r.grade ?? '',
    },
    ia: r.ia,
    gradePoints: str(r.grade_points),
    result: r.result,
    index: i,
    state: 'idle',
  }))
  const have = new Set(results.map((r) => r.subjectId))
  // UX2-06: auto-fill the rest of this semester's catalog so students only type marks.
  for (const s of subjects
    .filter((x) => x.semester === semesterNo && !have.has(x.id))
    .sort((a, b) => a.code.localeCompare(b.code))) {
    rows.push({
      key: s.id,
      subjectId: s.id,
      code: s.code,
      name: s.name,
      values: {
        credits: str(s.credits),
        mse_marks: '',
        mse_max: str(s.mse_max),
        see_marks: '',
        see_max: str(s.see_max),
        grade: '',
      },
      ia: [],
      gradePoints: '',
      result: 'PENDING',
      index: null,
      state: 'idle',
    })
  }
  return rows
}

const touched = (r: GridRow) =>
  !!r.id || r.values.mse_marks !== '' || r.values.see_marks !== '' || r.values.grade !== ''

/** Desktop spreadsheet entry: Tab/Enter navigation, paste a block from Excel/Sheets, per-row autosave. */
export function MarksGrid({
  semesterId,
  semesterNo,
  results,
  subjects,
  scheme,
  onOpenDetails,
}: {
  semesterId: string
  semesterNo: number
  results: ResultRow[]
  subjects: SubjectOption[]
  scheme: GradingScheme | null
  onOpenDetails: (index: number | null) => void
}) {
  const router = useRouter()
  const [rows, setRows] = React.useState(() => buildRows(results, subjects, semesterNo))
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const rowsRef = React.useRef(rows)
  const tableRef = React.useRef<HTMLTableElement>(null)

  React.useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  // Re-sync from the server only for rows that aren't mid-edit.
  const sig = results
    .map((r) => [r.id, r.credits, r.mse_marks, r.mse_max, r.see_marks, r.see_max, r.grade].join(':'))
    .join('|')
  React.useEffect(() => {
    setRows((cur) => {
      const fresh = buildRows(results, subjects, semesterNo)
      return fresh.map((f) => {
        const c = cur.find((x) => x.key === f.key)
        return c && (c.state === 'saving' || timers.current.has(c.key))
          ? { ...c, id: c.id ?? f.id, index: f.index }
          : { ...f, state: c?.state === 'saved' ? 'saved' : 'idle' }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, subjects, semesterNo])

  const save = React.useCallback(
    async (key: string) => {
      timers.current.delete(key)
      const r = rowsRef.current.find((x) => x.key === key)
      if (!r || !touched(r)) return
      const payload = {
        id: r.id,
        subject_id: r.subjectId,
        credits: r.values.credits,
        mse_marks: r.values.mse_marks,
        mse_max: r.values.mse_max,
        see_marks: r.values.see_marks,
        see_max: r.values.see_max,
        ia: r.ia.map((c) => ({ key: c.key, label: c.label, marks: str(c.marks), max: str(c.max) })),
        grade: r.values.grade,
        grade_points: r.gradePoints,
        result: r.result,
      }
      const parsed = resultRowSchema.safeParse(payload)
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? 'Check this row'
        setRows((cur) => cur.map((x) => (x.key === key ? { ...x, state: 'error', error: msg } : x)))
        return
      }
      setRows((cur) => cur.map((x) => (x.key === key ? { ...x, state: 'saving', error: undefined } : x)))
      const res = await saveResult(semesterId, payload)
      setRows((cur) =>
        cur.map((x) =>
          x.key === key
            ? res.ok
              ? { ...x, id: res.data.id, state: 'saved' }
              : { ...x, state: 'error', error: res.error.message }
            : x,
        ),
      )
      if (res.ok) router.refresh()
    },
    [router, semesterId],
  )

  const schedule = (key: string) => {
    const t = timers.current.get(key)
    if (t) clearTimeout(t)
    timers.current.set(
      key,
      setTimeout(() => void save(key), 900),
    )
  }

  const setCell = (key: string, col: Col, value: string) => {
    const next = rowsRef.current.map((x) =>
      x.key === key
        ? {
            ...x,
            values: { ...x.values, [col]: col === 'grade' ? value.toUpperCase() : value },
            state: 'idle' as const,
            error: undefined,
          }
        : x,
    )
    rowsRef.current = next
    setRows(next)
    schedule(key)
  }

  const focusCell = (r: number, c: number) => {
    const el = tableRef.current?.querySelector<HTMLInputElement>(`input[data-r="${r}"][data-c="${c}"]`)
    if (el) {
      el.focus()
      el.select()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      focusCell(e.shiftKey ? r - 1 : r + 1, c)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusCell(r - 1, c)
    }
  }

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, r: number, c: number) => {
    const text = e.clipboardData.getData('text/plain')
    if (!/[\t\n]/.test(text.trim())) return // single value: let the input handle it
    e.preventDefault()
    const grid = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((line, i, all) => line !== '' || i < all.length - 1)
      .map((line) => line.split('\t'))
    const next = [...rowsRef.current]
    const changed: string[] = []
    grid.forEach((cells, dr) => {
      const row = next[r + dr]
      if (!row) return
      const values = { ...row.values }
      cells.forEach((v, dc) => {
        const col = COLS[c + dc]
        if (col) values[col] = col === 'grade' ? v.trim().toUpperCase() : v.trim()
      })
      next[r + dr] = { ...row, values, state: 'idle', error: undefined }
      changed.push(row.key)
    })
    rowsRef.current = next
    setRows(next)
    changed.forEach(schedule)
    toast.success(`Pasted ${grid.length} row${grid.length === 1 ? '' : 's'}`, {
      description: 'Each row saves automatically.',
    })
  }

  const saving = rows.some((r) => r.state === 'saving')
  const failed = rows.filter((r) => r.state === 'error').length

  return (
    <div className="hidden md:block">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 sm:px-6">
        <p className="text-ink-500 flex items-center gap-2 text-xs">
          <ClipboardPaste className="text-primary-600 size-4" /> Type or paste marks straight from Excel or
          Sheets. Tab moves right, Enter moves down.
        </p>
        <span
          aria-live="polite"
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold',
            failed ? 'text-danger-700' : 'text-ink-500',
          )}
        >
          {saving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Saving…
            </>
          ) : failed ? (
            <>
              <CircleAlert className="size-3.5" /> {failed} row{failed === 1 ? '' : 's'} need attention
            </>
          ) : rows.some((r) => r.state === 'saved') ? (
            <>
              <Check className="text-success-700 size-3.5" /> All changes saved
            </>
          ) : null}
        </span>
      </div>
      <div className="overflow-x-auto px-3 pt-2 pb-3">
        <table ref={tableRef} className="w-full text-sm">
          <caption className="sr-only">Semester {semesterNo} marks entry</caption>
          <thead>
            <tr className="text-ink-500 text-left text-[0.6875rem] tracking-[0.04em] uppercase">
              <th scope="col" className="w-[30%] px-3 py-2.5 font-semibold">
                Subject
              </th>
              {COLS.map((c) => (
                <th key={c} scope="col" className="px-1.5 py-2.5 text-right font-semibold">
                  <span className="inline-flex items-center justify-end gap-0.5">
                    {HEAD[c]}
                    {HELP[c] && <HelpTip term={HELP[c]} label={HEAD[c]} />}
                  </span>
                </th>
              ))}
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Preview
              </th>
              <th scope="col" className="px-3 py-2.5">
                <span className="sr-only">Status and details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const input = {
                subjectId: row.subjectId,
                credits: Number(row.values.credits) || 0,
                mse_marks: num(row.values.mse_marks),
                mse_max: num(row.values.mse_max),
                see_marks: num(row.values.see_marks),
                see_max: num(row.values.see_max),
                grade: row.values.grade || null,
                grade_points: num(row.gradePoints),
                result: row.result,
              }
              const pct = scheme ? subjectPercentage(input, scheme).value : null
              const grade = scheme ? resolveGrade(input, scheme).value : null
              const draft = !row.id && !touched(row)
              return (
                <tr key={row.key} className={cn('group', draft && 'text-ink-500')}>
                  <td className="group-focus-within:bg-primary-50 rounded-l-[14px] px-3 py-1.5">
                    <p className={cn('font-semibold', draft ? 'text-ink-700' : 'text-ink-900')}>{row.name}</p>
                    <p className="num text-ink-500 text-xs">
                      {row.code}
                      {draft && ' · not added yet'}
                    </p>
                  </td>
                  {COLS.map((c, ci) => (
                    <td key={c} className="group-focus-within:bg-primary-50 px-1 py-1.5">
                      <input
                        data-r={ri}
                        data-c={ci}
                        value={row.values[c]}
                        inputMode={c === 'grade' ? 'text' : 'decimal'}
                        aria-label={`${row.code} ${HEAD[c]}`}
                        aria-invalid={row.state === 'error' || undefined}
                        onChange={(e) => setCell(row.key, c, e.target.value)}
                        onKeyDown={(e) => onKeyDown(e, ri, ci)}
                        onPaste={(e) => onPaste(e, ri, ci)}
                        onBlur={() => timers.current.has(row.key) && void save(row.key)}
                        className={cn(
                          'num bg-surface text-ink-900 placeholder:text-ink-400 focus:border-primary-500 h-10 w-full min-w-16 rounded-[12px] border px-2.5 text-right transition-colors outline-none focus:shadow-[0_0_0_3px_var(--primary-100)]',
                          row.state === 'error' ? 'border-danger-500' : 'border-line',
                        )}
                        placeholder={c === 'grade' ? 'auto' : '—'}
                      />
                    </td>
                  ))}
                  <td className="num group-focus-within:bg-primary-50 px-3 py-1.5 text-right whitespace-nowrap">
                    {grade ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-ink-500 text-xs">
                          {pct != null ? `${pct.toFixed(1)}%` : ''}
                        </span>
                        <span className="bg-primary-100 text-primary-700 inline-grid min-w-8 place-items-center rounded-full px-2 py-0.5 text-xs font-semibold">
                          {grade.grade}
                        </span>
                      </span>
                    ) : (
                      <span className="text-ink-500 text-xs">{pct != null ? `${pct.toFixed(1)}%` : '—'}</span>
                    )}
                  </td>
                  <td className="group-focus-within:bg-primary-50 rounded-r-[14px] px-2 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <span className="grid size-6 place-items-center" title={row.error}>
                        {row.state === 'saving' ? (
                          <Loader2 aria-label="Saving" className="text-ink-500 size-4 animate-spin" />
                        ) : row.state === 'saved' ? (
                          <Check aria-label="Saved" className="text-success-700 size-4" />
                        ) : row.state === 'error' ? (
                          <CircleAlert
                            aria-label={`Not saved: ${row.error}`}
                            className="text-danger-700 size-4"
                          />
                        ) : null}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`More options for ${row.code}: internal assessments, result`}
                        disabled={row.index == null}
                        onClick={() => onOpenDetails(row.index)}
                      >
                        <SlidersHorizontal />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {failed > 0 && (
          <ul className="text-danger-700 mt-2 space-y-1 px-3 text-xs">
            {rows
              .filter((r) => r.state === 'error')
              .map((r) => (
                <li key={r.key}>
                  {r.code}: {r.error}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}
