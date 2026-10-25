import 'server-only'
import { createAdminClient } from './client'
import { emailLayout, sendEmail } from '@/server/email'
import { serverEnv } from '@/server/env'

type Prefs = { email_notifications?: boolean; reminder_emails?: boolean }

/**
 * Daily reminders (called only by the cron route after the CRON_SECRET check).
 * At most one reminder of each type per user per day; email only when the user opted in.
 */
export async function runDailyReminders(now = new Date()) {
  const admin = createAdminClient()
  const today = now.toISOString().slice(0, 10)
  const dayStart = `${today}T00:00:00Z`
  const in24h = new Date(now.getTime() + 24 * 3600_000).toISOString()

  const { data: users } = await admin.from('users').select('id, email, role, status, onboarding_completed_at, preferences, created_at').eq('status', 'ACTIVE')
  const byId = new Map((users ?? []).map((u) => [u.id, u]))
  const { data: sentToday } = await admin.from('notifications').select('user_id, type').like('type', 'reminder.%').gte('created_at', dayStart)
  const already = new Set((sentToday ?? []).map((n) => `${n.user_id}|${n.type}`))
  const counts = { followups: 0, profiles: 0, records: 0, sessions: 0, emails: 0 }

  const remind = async (userId: string, type: string, title: string, body: string, link: string, emailHeading: string) => {
    if (already.has(`${userId}|${type}`)) return
    already.add(`${userId}|${type}`)
    await admin.from('notifications').insert({ user_id: userId, type, title, body, link })
    const u = byId.get(userId)
    const prefs = (u?.preferences ?? {}) as Prefs
    if (u && prefs.reminder_emails !== false) {
      const ok = await sendEmail(u.email, title, emailLayout({ heading: emailHeading, intro: body, cta: { label: 'Open Mentora', href: `${serverEnv.siteUrl}${link}` } }))
      if (ok) counts.emails++
    }
  }

  // Mentors: follow-ups due (open goals/action points whose review or due date has passed).
  const { data: due } = await admin
    .from('mentor_recommendations')
    .select('mentor_id, student_id, review_date, due_date')
    .in('kind', ['GOAL', 'ACTION_POINT'])
    .neq('status', 'COMPLETED')
    .or(`review_date.lte.${today},due_date.lte.${today}`)
  const { data: active } = await admin.from('mentor_assignments').select('mentor_id, student_id').is('ended_at', null)
  const activePairs = new Set((active ?? []).map((a) => `${a.mentor_id}|${a.student_id}`))
  const perMentor = new Map<string, number>()
  for (const r of due ?? []) if (activePairs.has(`${r.mentor_id}|${r.student_id}`)) perMentor.set(r.mentor_id, (perMentor.get(r.mentor_id) ?? 0) + 1)
  for (const [mentorId, n] of perMentor) {
    await remind(mentorId, 'reminder.followups', `${n} follow-up${n === 1 ? '' : 's'} due`, 'Goals or action points have reached their review date. Check in with your mentees.', '/mentor/recommendations?status=due', 'Follow-ups are due')
    counts.followups++
  }

  // Students: incomplete profile, missing records, unsubmitted drafts.
  const students = (users ?? []).filter((u) => u.role === 'MENTEE')
  const { data: profiles } = await admin.from('student_profiles').select('user_id, current_semester')
  const sem = new Map((profiles ?? []).map((p) => [p.user_id, p.current_semester]))
  const { data: semesters } = await admin.from('academic_semesters').select('student_id, semester_no, status, updated_at')
  const bySt = new Map<string, { semester_no: number; status: string; updated_at: string }[]>()
  for (const s of semesters ?? []) bySt.set(s.student_id, [...(bySt.get(s.student_id) ?? []), s])
  for (const u of students) {
    if (!u.onboarding_completed_at) {
      await remind(u.id, 'reminder.profile', 'Finish setting up your profile', 'A few required details are still missing. It only takes a couple of minutes.', '/setup', 'Your profile is almost ready')
      counts.profiles++
      continue
    }
    const cur = sem.get(u.id)
    const recs = bySt.get(u.id) ?? []
    if (cur && cur > 1 && !recs.some((r) => r.semester_no === cur - 1)) {
      await remind(u.id, 'reminder.records', `Add your semester ${cur - 1} results`, 'Your mentor can only guide you with up-to-date marks. Add your latest results.', '/mentee/academics?new=1', 'Your latest results are missing')
      counts.records++
    } else if (recs.some((r) => r.status === 'DRAFT' && now.getTime() - new Date(r.updated_at).getTime() > 7 * 86400000)) {
      await remind(u.id, 'reminder.records', 'Submit your draft semester', 'You have a draft semester that hasn’t been submitted for verification yet.', '/mentee/academics', 'A draft is waiting to be submitted')
      counts.records++
    }
  }

  // Sessions in the next 24 hours: remind student(s) and mentor.
  const { data: soon } = await admin.from('mentoring_sessions').select('id, mentor_id, student_id, scheduled_at').eq('status', 'SCHEDULED').gte('scheduled_at', now.toISOString()).lte('scheduled_at', in24h)
  for (const s of soon ?? []) {
    const when = new Date(s.scheduled_at).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    const students = s.student_id ? [s.student_id] : (active ?? []).filter((a) => a.mentor_id === s.mentor_id).map((a) => a.student_id)
    for (const st of students) await remind(st, 'reminder.session', `Mentoring session ${when}`, 'You have a mentoring session in the next 24 hours.', `/mentee/sessions?item=${s.id}`, 'Session coming up')
    await remind(s.mentor_id, 'reminder.session', `Session ${when}`, 'You have a mentoring session in the next 24 hours.', `/mentor/sessions?item=${s.id}`, 'Session coming up')
    counts.sessions++
  }
  await admin.from('audit_logs').insert({ actor_id: null, action: 'cron.daily_reminders', entity_type: 'cron', entity_id: today, after: counts })
  return counts
}
