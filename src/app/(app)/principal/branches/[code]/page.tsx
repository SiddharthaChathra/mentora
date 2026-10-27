import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listBranches } from '@/server/services/branches'
import { BranchOverview } from '@/features/branch/overview'
import { ReadOnlyBanner } from '@/features/principal/read-only-banner'

export const metadata: Metadata = { title: 'Branch overview' }

/** The HOD overview of one branch, re-used read-only for the Principal. */
export default async function PrincipalBranch({ params }: { params: Promise<{ code: string }> }) {
  const actor = await requireRole('PRINCIPAL')
  const code = (await params).code.toUpperCase()
  const db = await createClient()
  const branch = (await listBranches(db, { includeArchived: true })).find((b) => b.code === code)
  if (!branch) notFound()
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-500">
        <Link href="/principal/branches" className="hover:text-ink-900">Branches</Link> / <span className="text-ink-900">{branch.code}</span>
      </nav>
      <ReadOnlyBanner />
      <BranchOverview
        actor={actor}
        departmentId={branch.id}
        readOnly
        intro={`${branch.code} · ${branch.name}${branch.headName ? ` · HOD ${branch.headName}` : ' · No HOD appointed'}`}
        links={{
          students: `/principal/students?branch=${branch.code}`,
          mentors: `/principal/mentors?branch=${branch.code}`,
          interventions: `/principal/interventions?branch=${branch.code}`,
          assignments: null,
          student: (id) => `/principal/students/${id}`,
        }}
      />
    </>
  )
}
