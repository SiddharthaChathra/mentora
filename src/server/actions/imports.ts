'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/server/supabase'
import { actorOrThrow } from '@/server/authz'
import { AppError, check, handle, must } from '@/server/handle'
import { rateLimit } from '@/server/rate-limit'
import { sniffFile } from '@/server/files'
import { inviteUser } from '@/server/admin/users'
import { writeSummary } from '@/server/services/academics'
import { parseFile, validateRows, type ImportKind, type ParsedRow } from '@/server/imports'

const kindSchema = z.enum(['students', 'mentors', 'subjects', 'results'])

export type PreviewResult = { jobId: string; kind: ImportKind; total: number; valid: number; errors: number; duplicates: number; rows: ParsedRow[] }

export async function previewImport(form: FormData) {
  return handle(async (): Promise<PreviewResult> => {
    const actor = await actorOrThrow('HOD')
    await rateLimit(`import:${actor.id}`, 30, 60 * 60_000)
    const kind = kindSchema.parse(form.get('kind'))
    const file = form.get('file')
    if (!(file instanceof File) || !file.size) throw new AppError('VALIDATION', 'Choose a CSV or XLSX file.')
    if (file.size > 5 * 1024 * 1024) throw new AppError('VALIDATION', 'Import files must be 5 MB or smaller.')
    const bytes = new Uint8Array(await file.arrayBuffer())
    const sniff = sniffFile(file.name, file.type, bytes, 'import')
    if (!sniff.ok) throw new AppError('VALIDATION', sniff.reason)
    const raw = await parseFile(file.name, bytes)
    if (!raw.length) throw new AppError('VALIDATION', 'The file has no data rows. Use the template’s header row.')
    if (raw.length > 5000) throw new AppError('VALIDATION', 'Import at most 5,000 rows at a time.')
    const db = await createClient()
    const rows = await validateRows(db, kind, raw, actor.departmentId!)
    const errors = rows.filter((r) => r.errors.length)
    const job = must(
      await db
        .from('import_jobs')
        .insert({
          created_by: actor.id,
          kind,
          file_name: file.name.slice(-200),
          status: 'PREVIEW',
          total_rows: rows.length,
          valid_rows: rows.length - errors.length,
          error_rows: errors.length,
          duplicate_rows: rows.filter((r) => r.duplicate).length,
          errors: errors.map((r) => ({ row: r.row, errors: r.errors })) as never,
          summary: { rows } as never,
        })
        .select('id')
        .single(),
    )
    revalidatePath('/hod/imports')
    return { jobId: job.id, kind, total: rows.length, valid: rows.length - errors.length, errors: errors.length, duplicates: rows.filter((r) => r.duplicate).length, rows: rows.slice(0, 300) }
  })
}

export async function commitImport(jobId: string, opts: { duplicates: 'skip' | 'update'; sendInvites: boolean }) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD')
    const o = z.object({ duplicates: z.enum(['skip', 'update']), sendInvites: z.boolean() }).parse(opts)
    const db = await createClient()
    const job = must(await db.from('import_jobs').select('*').eq('id', z.uuid().parse(jobId)).maybeSingle())
    if (job.status !== 'PREVIEW') throw new AppError('CONFLICT', 'This import was already processed.')
    const rows = ((job.summary as { rows?: ParsedRow[] }).rows ?? []).filter((r) => !r.errors.length)
    const take = rows.filter((r) => o.duplicates === 'update' || r.duplicate !== 'existing').filter((r) => r.duplicate !== 'file')
    const failures: { row: number; errors: string[] }[] = []
    let summary: Record<string, unknown> = {}

    if (job.kind === 'subjects') {
      const res = await db.rpc('import_subjects', { p_rows: take.map((r) => r.data) as never, p_update: o.duplicates === 'update' })
      check(res)
      summary = res.data as Record<string, unknown>
    } else if (job.kind === 'results') {
      const res = await db.rpc('import_results', { p_rows: take.map((r) => ({ ...r.data, _row: r.row })) as never, p_update: o.duplicates === 'update' })
      check(res)
      summary = res.data as Record<string, unknown>
      const sems = (summary.semesters as string[]) ?? []
      if (sems.length) {
        const { data: s } = await db.from('academic_semesters').select('id, student_id').in('id', sems)
        for (const sem of s ?? []) await writeSummary(db, sem.student_id, sem.id, actor.departmentId)
      }
    } else {
      const role = job.kind === 'students' ? 'MENTEE' : 'MENTOR'
      const { data: sections } = await db.from('sections').select('id, name').eq('department_id', actor.departmentId!)
      const secBy = new Map((sections ?? []).map((s) => [s.name.toUpperCase(), s.id]))
      let created = 0
      let updated = 0
      for (const r of take) {
        try {
          const d = r.data as Record<string, string | number | null>
          let userId: string
          if (r.duplicate === 'existing') {
            const { data: u } = await db.from('users').select('id, role').eq('email', String(d.email)).maybeSingle()
            if (!u) {
              if (role === 'MENTEE') {
                const { data: p } = await db.from('student_profiles').select('user_id').ilike('usn', String(d.usn)).maybeSingle()
                if (!p) throw new Error('could not match existing student')
                userId = p.user_id
              } else throw new Error('could not match existing user')
            } else {
              if (u.role !== role) throw new Error(`existing account is a ${u.role.toLowerCase()}`)
              userId = u.id
            }
            updated++
          } else {
            userId = (await inviteUser(actor, { email: String(d.email), role, full_name: String(d.full_name) }, { sendEmail: o.sendInvites })).id
            created++
          }
          if (role === 'MENTEE') {
            const section = d.section ? secBy.get(String(d.section).toUpperCase()) : undefined
            check(
              await db
                .from('student_profiles')
                .update({
                  full_name: String(d.full_name),
                  usn: String(d.usn),
                  program: d.program ? String(d.program) : undefined,
                  current_semester: d.current_semester != null ? Number(d.current_semester) : undefined,
                  section_id: section,
                  admission_year: d.admission_year != null ? Number(d.admission_year) : undefined,
                  expected_graduation_year: d.expected_graduation_year != null ? Number(d.expected_graduation_year) : undefined,
                })
                .eq('user_id', userId),
            )
          } else {
            check(
              await db
                .from('mentor_profiles')
                .update({
                  full_name: String(d.full_name),
                  official_email: String(d.email),
                  designation: d.designation ? String(d.designation) : undefined,
                  faculty_id: d.faculty_id ? String(d.faculty_id) : undefined,
                  phone: d.phone ? String(d.phone) : undefined,
                  capacity: d.capacity != null ? Number(d.capacity) : undefined,
                })
                .eq('user_id', userId),
            )
          }
        } catch (e) {
          failures.push({ row: r.row, errors: [e instanceof Error ? e.message : 'failed'] })
        }
      }
      summary = { created, updated, skipped: rows.length - take.length, failed: failures.length, invitesSent: o.sendInvites }
    }

    check(
      await db
        .from('import_jobs')
        .update({
          status: failures.length && failures.length === take.length ? 'FAILED' : 'COMMITTED',
          committed_at: new Date().toISOString(),
          options: o as never,
          summary: { ...summary, rows: undefined } as never,
          errors: [...((job.errors as { row: number; errors: string[] }[]) ?? []), ...failures] as never,
        })
        .eq('id', job.id),
    )
    await db.from('audit_logs').insert({ actor_id: actor.id, action: 'import.commit', entity_type: 'import_jobs', entity_id: job.id, after: { kind: job.kind, ...summary } as never })
    revalidatePath('/hod', 'layout')
    return { summary, failures: failures.length }
  })
}

export async function discardImport(jobId: string) {
  return handle(async () => {
    await actorOrThrow('HOD')
    const db = await createClient()
    check(await db.from('import_jobs').update({ status: 'FAILED', summary: { discarded: true } }).eq('id', z.uuid().parse(jobId)).eq('status', 'PREVIEW'))
    revalidatePath('/hod/imports')
    return null
  })
}
