'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/server/supabase'
import { actorOrThrow, assertCanEditMentoring } from '@/server/authz'
import { AppError, check, handle, must } from '@/server/handle'
import { serverEnv } from '@/server/env'
import { rateLimit } from '@/server/rate-limit'
import { loadStudentAcademics, loadThresholds, toInsightSemesters } from '@/server/services/academics'
import { getSettings } from '@/server/services/people'
import { generateInsights } from '@/lib/insights'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

/** Builds a pseudonymised academic snapshot: no name, USN, email, phone or photo leaves the server. */
async function snapshot(studentId: string, departmentId: string | null) {
  const db = await createClient()
  const academics = await loadStudentAcademics(db, studentId, departmentId)
  const thresholds = await loadThresholds(db, departmentId)
  const insights = generateInsights(toInsightSemesters(academics.semesters), thresholds)
  return {
    cgpa: academics.cgpa.value?.cgpa ?? null,
    semesters: academics.semesters.map((s) => ({
      semester: s.semesterNo,
      sgpa: s.displaySgpa,
      subjects: s.results.map((r) => ({ subject: r.name, msePct: r.mse_max ? Math.round(((r.mse_marks ?? 0) / r.mse_max) * 100) : null, seePct: r.see_max && r.see_marks != null ? Math.round((r.see_marks / r.see_max) * 100) : null, grade: r.resolvedGrade, result: r.derivedResult })),
    })),
    ruleBasedInsights: insights.insights.map((i) => i.message),
  }
}

export async function generateAiSummary(studentId: string) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    const sid = z.uuid().parse(studentId)
    await assertCanEditMentoring(actor, sid)
    const db = await createClient()
    const settings = await getSettings(db)
    if (!settings.aiEnabled || !serverEnv.aiEnabled || !serverEnv.geminiKey) throw new AppError('BAD_REQUEST', 'AI summaries are turned off.')
    await rateLimit(`ai:${actor.id}`, 10, 60 * 60_000)
    const { data: u } = await db.from('users').select('department_id').eq('id', sid).maybeSingle()
    const data = await snapshot(sid, u?.department_id ?? actor.departmentId)

    const prompt = [
      'You are assisting a university faculty mentor. Write a short, supportive academic progress summary (max 120 words) for a student, addressed to the mentor.',
      'Use only the data provided. Do not guess causes, do not mention personal circumstances, health or family, and do not label the student. If data is missing, say so.',
      'End with two concrete, practical next steps. Plain text, no markdown headings.',
      `DATA: ${JSON.stringify(data)}`,
    ].join('\n')

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': serverEnv.geminiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 400 } }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) throw new AppError('INTERNAL', 'The AI service did not respond. Try again later.')
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim()
    if (!text) throw new AppError('INTERNAL', 'The AI service returned an empty summary.')
    const row = must(await db.from('ai_summaries').insert({ student_id: sid, generated_text: text, edited_text: text, status: 'DRAFT', model: MODEL, created_by: actor.id }).select('id').single())
    revalidatePath(`/mentor/mentees/${sid}`)
    return row
  })
}

export async function reviewAiSummary(id: string, decision: 'APPROVED' | 'REJECTED', editedText?: string) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    const db = await createClient()
    const row = must(await db.from('ai_summaries').select('id, student_id').eq('id', z.uuid().parse(id)).maybeSingle())
    await assertCanEditMentoring(actor, row.student_id, db)
    const text = z.string().trim().min(10).max(3000).optional().parse(editedText)
    check(
      await db
        .from('ai_summaries')
        .update({ status: decision, edited_text: text, reviewed_by: actor.id, reviewed_at: new Date().toISOString() })
        .eq('id', row.id),
    )
    revalidatePath(`/mentor/mentees/${row.student_id}`)
    return null
  })
}
