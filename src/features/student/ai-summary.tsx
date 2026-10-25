import { Sparkles } from 'lucide-react'
import type { DB } from '@/server/supabase'
import { serverEnv } from '@/server/env'
import { fmtRelative } from '@/lib/utils'
import { Card, CardBody, CardHeader, IconChip, Pill, StatusPill } from '@/components/ui/primitives'
import { AiSummaryActions } from './ai-summary-actions'

/** Optional, human-reviewed AI summary. Website only — never in PDFs. Hidden when no API key is configured. */
export async function AiSummaryPanel({ db, studentId, viewer }: { db: DB; studentId: string; viewer: 'MENTEE' | 'MENTOR' | 'HOD' }) {
  if (!serverEnv.aiEnabled) return null
  const { data } = await db.from('ai_summaries').select('id, status, edited_text, generated_text, created_at, reviewed_at, reviewed_by').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1)
  const s = data?.[0]
  let reviewer: string | null = null
  if (s?.reviewed_by) {
    const { data: m } = await db.from('mentor_profiles').select('full_name').eq('user_id', s.reviewed_by).maybeSingle()
    reviewer = m?.full_name ?? null
  }
  if (viewer === 'MENTEE' && (!s || s.status !== 'APPROVED')) return null
  return (
    <Card>
      <CardHeader
        title="AI-assisted summary"
        icon={<Sparkles />}
        description={s?.status === 'APPROVED' ? `AI-assisted, reviewed by ${reviewer ?? 'your mentor'} · ${fmtRelative(s.reviewed_at)}` : 'Drafted from pseudonymised data. A mentor must review it before the student sees it.'}
        action={s && <StatusPill status={s.status} label={s.status === 'DRAFT' ? 'Needs review' : undefined} />}
      />
      <CardBody>
        {viewer === 'MENTOR' ? (
          <AiSummaryActions studentId={studentId} summary={s ? { id: s.id, status: s.status, text: s.edited_text ?? s.generated_text } : null} />
        ) : s ? (
          <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">{s.edited_text ?? s.generated_text}</p>
        ) : (
          <p className="text-sm text-ink-500">No AI summary has been generated.</p>
        )}
        <Pill tone="outline" className="mt-4">
          Not included in PDF reports
        </Pill>
      </CardBody>
    </Card>
  )
}
