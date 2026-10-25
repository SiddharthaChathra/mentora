'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { useSyncedState } from '@/lib/hooks'
import { generateAiSummary, reviewAiSummary } from '@/server/actions/ai'

export function AiSummaryActions({ studentId, summary }: { studentId: string; summary: { id: string; status: string; text: string } | null }) {
  const router = useRouter()
  const [text, setText] = useSyncedState(summary?.text ?? '')
  const [busy, setBusy] = React.useState<string | null>(null)

  const generate = async () => {
    setBusy('gen')
    const res = await generateAiSummary(studentId)
    setBusy(null)
    if (res.ok) {
      toast.success('Draft summary ready for your review')
      router.refresh()
    } else toast.error(res.error.message)
  }
  const review = async (d: 'APPROVED' | 'REJECTED') => {
    if (!summary) return
    setBusy(d)
    const res = await reviewAiSummary(summary.id, d, text)
    setBusy(null)
    if (res.ok) {
      toast.success(d === 'APPROVED' ? 'Approved — the student can now see it' : 'Draft rejected')
      router.refresh()
    } else toast.error(res.error.message)
  }

  return (
    <div className="space-y-3">
      {summary && summary.status === 'DRAFT' ? (
        <>
          <Textarea id="ai-text" label="Review and edit before approving" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => review('APPROVED')} loading={busy === 'APPROVED'}>
              <Check /> Approve & share
            </Button>
            <Button variant="secondary" onClick={() => review('REJECTED')} loading={busy === 'REJECTED'}>
              <X /> Reject
            </Button>
          </div>
        </>
      ) : (
        <>
          {summary && <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">{summary.text}</p>}
          <Button variant="soft" onClick={generate} loading={busy === 'gen'}>
            <Sparkles /> {summary ? 'Generate a new draft' : 'Generate draft summary'}
          </Button>
        </>
      )}
    </div>
  )
}
