'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select, Switch, TagInput } from '@/components/ui/field'
import { Segmented } from '@/components/ui/navigation'
import { Pill, StatusPill } from '@/components/ui/primitives'
import { PercentBar, ProgressTable, RankList } from '@/components/charts/dashboard'

export function StyleguideInteractive() {
  const [seg, setSeg] = React.useState<'a' | 'b'>('a')
  const [tags, setTags] = React.useState(['Python', 'React'])
  const [on, setOn] = React.useState(true)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => toast.success('Saved', { description: 'Toast example' })}>
          <Plus /> Primary
        </Button>
        <Button variant="secondary">See More</Button>
        <Button variant="secondary">
          <Sparkles className="text-primary-600" /> AI Assistant
        </Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Delete</Button>
        <Button loading>Saving</Button>
      </div>
      <Segmented label="Example" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'Overall' }, { value: 'b', label: 'Last 5' }]} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input id="sg-name" label="Full name" defaultValue="Ananya Sharma" />
        <Input id="sg-err" label="USN" defaultValue="1MT" error="USN should be 4–20 letters/numbers" />
      </div>
      <Select id="sg-sel" label="Semester" options={[{ value: '3', label: 'Semester 3' }]} defaultValue="3" />
      <TagInput id="sg-tags" label="Skills" value={tags} onChange={setTags} />
      <Checkbox id="sg-cb" label="Include in PDF report" description="Appears under mentoring records" defaultChecked />
      <Switch id="sg-sw" label="Low-bandwidth mode" checked={on} onCheckedChange={setOn} />
    </div>
  )
}

type Row = { id: string; name: string; subject: string; prev: number; cur: number; status: string }
const ROWS: Row[] = [
  { id: 'a', name: 'Sample student A', subject: 'CS302', prev: 62, cur: 78, status: 'VERIFIED' },
  { id: 'b', name: 'Sample student B', subject: 'MAT301', prev: 58, cur: 52, status: 'SUBMITTED' },
  { id: 'c', name: 'Sample student C', subject: 'CS304', prev: 40, cur: 36, status: 'DRAFT' },
]

export function StyleguideTable() {
  return (
    <div className="space-y-5">
      <ProgressTable<Row>
        title="Recent Results"
        seeMore="#"
        rows={ROWS}
        empty="No rows"
        columns={[
          { key: 'name', header: 'Mentee', render: (r) => <span className="font-semibold text-ink-900">{r.name}</span> },
          { key: 'subject', header: 'Subject', render: (r) => <span className="num">{r.subject}</span> },
          { key: 'prev', header: 'Previous', render: (r) => <Pill tone="neutral" className="num">{r.prev}%</Pill> },
          { key: 'cur', header: 'Current', render: (r) => <PercentBar value={r.cur} label={`${r.name} current`} /> },
          { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
        ]}
      />
      <RankList
        title="Most Improved"
        empty="No data"
        items={[
          { id: 'x1', name: 'Sample student A', sub: 'Sem 3 → 4', value: '8.40', change: 0.9, avatar: false },
          { id: 'x2', name: 'Sample student B', sub: 'Sem 4 → 5', value: '7.92', change: 0.6, avatar: false },
          { id: 'x3', name: 'Sample student C', sub: 'Sem 2 → 3', value: '7.10', change: 0.41, avatar: false },
        ]}
      />
    </div>
  )
}
