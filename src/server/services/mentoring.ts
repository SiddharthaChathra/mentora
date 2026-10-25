import 'server-only'
import type { DB } from '@/server/supabase'
import { check } from '@/server/handle'
import type { Database } from '@/types/database'
import { viewedSet } from './content'

type Rec = Database['public']['Tables']['mentor_recommendations']['Row']
export type RecKind = Rec['kind']
export type RecStatus = Rec['status']

export type Recommendation = {
  id: string
  studentId: string
  mentorId: string
  mentorName: string | null
  mentorHasAvatar: boolean
  kind: RecKind
  category: Rec['category']
  title: string
  body: string
  subject: { id: string; code: string; name: string } | null
  status: RecStatus
  dueDate: string | null
  reviewDate: string | null
  visibility: Rec['visibility']
  includeInReport: boolean
  parentId: string | null
  targetMetric: string | null
  steps: { id: string; label: string; done: boolean }[]
  reflection: string | null
  completionConfirmedAt: string | null
  createdAt: string
  updatedAt: string
  seen: boolean
  history: { from: RecStatus | null; to: RecStatus; at: string }[]
  followUps: Recommendation[]
}

export async function listRecommendations(
  db: DB,
  studentId: string,
  viewerId: string,
  opts: { kinds?: RecKind[]; status?: RecStatus; category?: Rec['category']; withHistory?: boolean } = {},
): Promise<Recommendation[]> {
  let q = db
    .from('mentor_recommendations')
    .select('*, subjects(id, code, name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(300)
  if (opts.kinds?.length) q = q.in('kind', opts.kinds)
  if (opts.status) q = q.eq('status', opts.status)
  if (opts.category) q = q.eq('category', opts.category)
  const rows = (check(await q) ?? []) as (Rec & { subjects: { id: string; code: string; name: string } | null })[]
  const mentorIds = [...new Set(rows.map((r) => r.mentor_id))]
  const [{ data: mentors }, seen, history] = await Promise.all([
    mentorIds.length ? db.from('mentor_profiles').select('user_id, full_name, avatar_path').in('user_id', mentorIds) : Promise.resolve({ data: [] }),
    viewedSet(db, viewerId, 'recommendation', rows.map((r) => r.id)),
    opts.withHistory && rows.length
      ? db.from('recommendation_status_history').select('recommendation_id, from_status, to_status, changed_at').in('recommendation_id', rows.map((r) => r.id)).order('changed_at')
      : Promise.resolve({ data: [] }),
  ])
  const mById = new Map((mentors ?? []).map((m) => [m.user_id, m]))
  const hById = new Map<string, Recommendation['history']>()
  for (const h of (history.data ?? []) as { recommendation_id: string; from_status: RecStatus | null; to_status: RecStatus; changed_at: string }[]) {
    hById.set(h.recommendation_id, [...(hById.get(h.recommendation_id) ?? []), { from: h.from_status, to: h.to_status, at: h.changed_at }])
  }
  const all: Recommendation[] = rows.map((r) => ({
    id: r.id,
    studentId: r.student_id,
    mentorId: r.mentor_id,
    mentorName: mById.get(r.mentor_id)?.full_name ?? null,
    mentorHasAvatar: !!mById.get(r.mentor_id)?.avatar_path,
    kind: r.kind,
    category: r.category,
    title: r.title,
    body: r.body,
    subject: r.subjects,
    status: r.status,
    dueDate: r.due_date,
    reviewDate: r.review_date,
    visibility: r.visibility,
    includeInReport: r.include_in_report,
    parentId: r.parent_id,
    targetMetric: r.target_metric,
    steps: (Array.isArray(r.steps) ? r.steps : []) as Recommendation['steps'],
    reflection: r.reflection,
    completionConfirmedAt: r.completion_confirmed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    seen: viewerId === r.mentor_id || seen.has(r.id),
    history: hById.get(r.id) ?? [],
    followUps: [],
  }))
  // Thread follow-ups under their parent.
  const byId = new Map(all.map((r) => [r.id, r]))
  const roots: Recommendation[] = []
  for (const r of all) {
    const parent = r.parentId ? byId.get(r.parentId) : null
    if (parent) parent.followUps.unshift(r)
    else roots.push(r)
  }
  return roots
}

export type Resource = {
  id: string
  mentorId: string
  mentorName: string | null
  studentId: string | null
  title: string
  instructions: string
  fileName: string | null
  mime: string | null
  sizeBytes: number | null
  hasFile: boolean
  externalUrl: string | null
  subject: { id: string; code: string; name: string } | null
  createdAt: string
  seen: boolean
}

export async function listResources(db: DB, viewerId: string, opts: { mentorId?: string; studentId?: string; limit?: number } = {}): Promise<Resource[]> {
  let q = db
    .from('learning_resources')
    .select('id, mentor_id, student_id, title, instructions, file_name, file_path, mime, size_bytes, external_url, created_at, subjects(id, code, name)')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200)
  if (opts.mentorId) q = q.eq('mentor_id', opts.mentorId)
  if (opts.studentId) q = q.or(`student_id.eq.${opts.studentId},student_id.is.null`)
  const rows = check(await q) ?? []
  const mentorIds = [...new Set(rows.map((r) => r.mentor_id))]
  const [{ data: mentors }, seen] = await Promise.all([
    mentorIds.length ? db.from('mentor_profiles').select('user_id, full_name').in('user_id', mentorIds) : Promise.resolve({ data: [] }),
    viewedSet(db, viewerId, 'resource', rows.map((r) => r.id)),
  ])
  const names = new Map((mentors ?? []).map((m) => [m.user_id, m.full_name]))
  return rows.map((r) => ({
    id: r.id,
    mentorId: r.mentor_id,
    mentorName: names.get(r.mentor_id) ?? null,
    studentId: r.student_id,
    title: r.title,
    instructions: r.instructions,
    fileName: r.file_name,
    mime: r.mime,
    sizeBytes: r.size_bytes,
    hasFile: !!r.file_path,
    externalUrl: r.external_url,
    subject: r.subjects as Resource['subject'],
    createdAt: r.created_at,
    seen: viewerId === r.mentor_id || seen.has(r.id),
  }))
}

export type Session = {
  id: string
  mentorId: string
  mentorName: string | null
  studentId: string | null
  studentName: string | null
  groupName: string | null
  scheduledAt: string
  durationMin: number
  mode: 'IN_PERSON' | 'ONLINE'
  location: string | null
  agenda: string
  summary: string | null
  actionItems: { title: string; due_date: string | null }[]
  nextFollowUp: string | null
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
}

export async function listSessions(db: DB, opts: { mentorId?: string; studentId?: string; from?: string; to?: string; limit?: number; order?: 'asc' | 'desc' } = {}): Promise<Session[]> {
  let q = db.from('mentoring_sessions').select('*').order('scheduled_at', { ascending: opts.order !== 'desc' }).limit(opts.limit ?? 200)
  if (opts.mentorId) q = q.eq('mentor_id', opts.mentorId)
  if (opts.studentId) q = q.or(`student_id.eq.${opts.studentId},student_id.is.null`)
  if (opts.from) q = q.gte('scheduled_at', opts.from)
  if (opts.to) q = q.lt('scheduled_at', opts.to)
  const rows = check(await q) ?? []
  const mentorIds = [...new Set(rows.map((r) => r.mentor_id))]
  const studentIds = [...new Set(rows.map((r) => r.student_id).filter(Boolean))] as string[]
  const [{ data: mentors }, { data: students }] = await Promise.all([
    mentorIds.length ? db.from('mentor_profiles').select('user_id, full_name').in('user_id', mentorIds) : Promise.resolve({ data: [] }),
    studentIds.length ? db.from('student_profiles').select('user_id, full_name').in('user_id', studentIds) : Promise.resolve({ data: [] }),
  ])
  const mn = new Map((mentors ?? []).map((m) => [m.user_id, m.full_name]))
  const sn = new Map((students ?? []).map((s) => [s.user_id, s.full_name]))
  return rows.map((r) => ({
    id: r.id,
    mentorId: r.mentor_id,
    mentorName: mn.get(r.mentor_id) ?? null,
    studentId: r.student_id,
    studentName: r.student_id ? (sn.get(r.student_id) ?? null) : null,
    groupName: r.group_name,
    scheduledAt: r.scheduled_at,
    durationMin: r.duration_min,
    mode: r.mode,
    location: r.location_or_link,
    agenda: r.agenda,
    summary: r.summary,
    actionItems: (Array.isArray(r.action_items) ? r.action_items : []) as Session['actionItems'],
    nextFollowUp: r.next_follow_up_date,
    status: r.status,
  }))
}

export { KIND_LABEL, CATEGORY_LABEL } from '@/lib/labels'
