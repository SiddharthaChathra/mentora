'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Archive, ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { ConfirmDialog, Dialog, DialogContent, Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/overlay'
import { Pill, ProgressRing } from '@/components/ui/primitives'
import { createBranch, reorderBranches, setBranchStatus, updateBranch } from '@/server/actions/principal'

export type BranchCard = {
  id: string
  code: string
  name: string
  usnCode: string | null
  status: 'ACTIVE' | 'ARCHIVED'
  headName: string | null
  students: number
  mentors: number
  coverage: number | null
}

type Draft = { id?: string; code: string; name: string; usn_code: string }

export function BranchManager({ branches }: { branches: BranchCard[] }) {
  const router = useRouter()
  const [edit, setEdit] = React.useState<Draft | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)
  const [archive, setArchive] = React.useState<BranchCard | null>(null)
  const active = branches.filter((b) => b.status === 'ACTIVE')

  const save = async () => {
    if (!edit) return
    setBusy(true)
    const res = edit.id ? await updateBranch(edit.id, { name: edit.name, usn_code: edit.usn_code }) : await createBranch(edit)
    setBusy(false)
    if (!res.ok) {
      setErrors(Object.fromEntries(Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? ''])))
      return toast.error(res.error.message)
    }
    toast.success(edit.id ? 'Branch updated' : `Branch ${edit.code.toUpperCase()} created`)
    setEdit(null)
    router.refresh()
  }
  const move = async (i: number, dir: -1 | 1) => {
    const ids = active.map((b) => b.id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
    const res = await reorderBranches(ids)
    if (!res.ok) return toast.error(res.error.message)
    router.refresh()
  }
  const setStatus = async (b: BranchCard, status: 'ACTIVE' | 'ARCHIVED') => {
    setBusy(true)
    const res = await setBranchStatus(b.id, status)
    setBusy(false)
    setArchive(null)
    if (!res.ok) return toast.error(res.error.message)
    toast.success(status === 'ARCHIVED' ? `${b.code} archived` : `${b.code} restored`)
    router.refresh()
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => (setErrors({}), setEdit({ code: '', name: '', usn_code: '' }))}>
          <Plus /> New branch
        </Button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {branches.map((b) => (
          <li key={b.id} className="relative flex flex-col gap-4 rounded-[24px] bg-surface p-5 shadow-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="brand">{b.code}</Pill>
                  {b.usnCode && <span className="num text-xs text-ink-500">USN · {b.usnCode}</span>}
                  {b.status === 'ARCHIVED' && <Pill tone="neutral">Archived</Pill>}
                </div>
                <Link href={`/principal/branches/${b.code}`} className="mt-2 block font-semibold text-ink-900 after:absolute after:inset-0 hover:text-primary-700">
                  {b.name}
                </Link>
                <p className="mt-1 text-sm text-ink-500">{b.headName ? `HOD ${b.headName}` : <Pill tone="accent">No HOD</Pill>}</p>
              </div>
              <ProgressRing value={b.coverage ?? 0} size={60} label={`${b.code} mentoring coverage`}>
                <span className="num text-xs font-semibold text-ink-900">{b.coverage == null ? '—' : `${b.coverage}%`}</span>
              </ProgressRing>
            </div>
            <div className="mt-auto flex items-center justify-between gap-3">
              <p className="num text-sm text-ink-700">
                <span className="font-semibold text-ink-900">{b.students}</span> students · <span className="font-semibold text-ink-900">{b.mentors}</span> mentors
              </p>
              <span className="relative z-[1]">
                <Menu>
                  <MenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${b.code}`}>
                      <MoreHorizontal />
                    </Button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem icon={Pencil} onSelect={() => (setErrors({}), setEdit({ id: b.id, code: b.code, name: b.name, usn_code: b.usnCode ?? '' }))}>
                      Rename
                    </MenuItem>
                    {b.status === 'ACTIVE' && (
                      <>
                        <MenuItem icon={ArrowUp} disabled={active[0]?.id === b.id} onSelect={() => move(active.findIndex((x) => x.id === b.id), -1)}>
                          Move up
                        </MenuItem>
                        <MenuItem icon={ArrowDown} disabled={active.at(-1)?.id === b.id} onSelect={() => move(active.findIndex((x) => x.id === b.id), 1)}>
                          Move down
                        </MenuItem>
                        <MenuItem icon={Archive} destructive onSelect={() => setArchive(b)}>
                          Archive
                        </MenuItem>
                      </>
                    )}
                    {b.status === 'ARCHIVED' && (
                      <MenuItem icon={RotateCcw} onSelect={() => setStatus(b, 'ACTIVE')}>
                        Restore
                      </MenuItem>
                    )}
                  </MenuContent>
                </Menu>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent
          title={edit?.id ? `Rename ${edit.code}` : 'New branch'}
          description="Students who sign up with a USN containing the USN code join this branch automatically."
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button loading={busy} onClick={save}>
                {edit?.id ? 'Save' : 'Create branch'}
              </Button>
            </>
          }
        >
          {edit && (
            <div className="space-y-3">
              {!edit.id && <Input id="br-code" label="Short code" placeholder="CSE" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} error={errors.code} required />}
              <Input id="br-name" label="Name" placeholder="Computer Science and Engineering" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} error={errors.name} required />
              <Input id="br-usn" label="USN code (optional)" hint="The letters after the year in a USN, e.g. cs in nnm23cs001" value={edit.usn_code} onChange={(e) => setEdit({ ...edit, usn_code: e.target.value.toLowerCase() })} error={errors.usn_code} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!archive}
        onOpenChange={(o) => !o && setArchive(null)}
        loading={busy}
        destructive
        title={`Archive ${archive?.code}?`}
        description="Only a branch with no active students or staff can be archived. Its HOD appointment ends and it disappears from switchers. You can restore it later."
        confirmLabel="Archive"
        onConfirm={() => archive && setStatus(archive, 'ARCHIVED')}
      />
    </>
  )
}
