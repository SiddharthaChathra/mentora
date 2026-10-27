import 'server-only'
import path from 'node:path'
import { Circle, Defs, Document, Font, Image, LinearGradient, Page, Path, Rect, Stop, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import type { ReportData } from './data'

const FONT_DIR = path.join(process.cwd(), 'src', 'server', 'report', 'fonts')
let registered = false
function registerFonts() {
  if (registered) return
  Font.register({
    family: 'Jakarta',
    fonts: [
      { src: path.join(FONT_DIR, 'PlusJakartaSans-400.woff'), fontWeight: 400 },
      { src: path.join(FONT_DIR, 'PlusJakartaSans-500.woff'), fontWeight: 500 },
      { src: path.join(FONT_DIR, 'PlusJakartaSans-600.woff'), fontWeight: 600 },
      { src: path.join(FONT_DIR, 'PlusJakartaSans-700.woff'), fontWeight: 700 },
    ],
  })
  Font.registerHyphenationCallback((w) => [w])
  registered = true
}

const C = { ink: '#0F172A', body: '#334155', muted: '#55647A', line: '#E6EAF2', tint: '#EFF6FF', brand: '#2563EB', canvas: '#F4F6FA' }
const MM = 2.8346

const s = StyleSheet.create({
  page: { fontFamily: 'Jakarta', fontSize: 9.5, color: C.body, paddingTop: 30 * MM, paddingBottom: 22 * MM, paddingHorizontal: 19 * MM, lineHeight: 1.45 },
  header: { position: 'absolute', top: 10 * MM, left: 19 * MM, right: 19 * MM, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.75, borderBottomColor: C.line, paddingBottom: 3 * MM },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandName: { fontFamily: 'Jakarta', fontWeight: 700, fontSize: 13, color: C.ink },
  headerRight: { textAlign: 'right' },
  headerTitle: { fontSize: 8.5, fontWeight: 600, color: C.ink },
  headerMeta: { fontSize: 7.5, color: C.muted },
  footer: { position: 'absolute', bottom: 8 * MM, left: 19 * MM, right: 19 * MM, height: 9 * MM, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderTopWidth: 0.75, borderTopColor: C.line, paddingTop: 2.5 * MM },
  footerText: { fontSize: 7.5, color: C.muted },
  title: { fontFamily: 'Jakarta', fontWeight: 700, fontSize: 24, lineHeight: 1.2, height: 11 * MM, color: C.ink, marginBottom: 1 * MM },
  subtitle: { fontSize: 9, color: C.muted, marginBottom: 8 * MM },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 7 * MM, marginBottom: 3 * MM, borderBottomWidth: 1.2, borderBottomColor: C.brand, paddingBottom: 1.5 * MM },
  sectionNo: { fontFamily: 'Jakarta', fontSize: 9, color: C.brand },
  sectionTitle: { fontFamily: 'Jakarta', fontWeight: 700, fontSize: 14, color: C.brand },
  infoWrap: { flexDirection: 'row', gap: 8 * MM },
  photo: { width: 28 * MM, height: 28 * MM, borderRadius: 4 * MM, objectFit: 'cover' },
  photoFallback: { width: 28 * MM, height: 28 * MM, borderRadius: 4 * MM, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'Jakarta', fontWeight: 700, fontSize: 24, color: C.brand },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', paddingBottom: 3 * MM, paddingRight: 4 },
  label: { fontSize: 7, fontWeight: 600, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 1 },
  value: { fontSize: 10, color: C.ink },
  kpis: { flexDirection: 'row', gap: 3 * MM, marginBottom: 4 * MM },
  kpi: { flex: 1, backgroundColor: C.canvas, borderRadius: 2.5 * MM, padding: 3 * MM },
  kpiValue: { fontSize: 16, fontWeight: 600, color: C.ink },
  table: { borderWidth: 0.75, borderColor: C.line, borderRadius: 2 * MM },
  th: { flexDirection: 'row', backgroundColor: C.brand },
  thText: { fontSize: 7, fontWeight: 600, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.4, paddingVertical: 2 * MM, paddingHorizontal: 1.8 * MM },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.line },
  td: { fontSize: 8.5, paddingVertical: 1.8 * MM, paddingHorizontal: 1.8 * MM, color: C.ink },
  mono: { fontFamily: 'Jakarta', fontSize: 8.5 },
  semHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 * MM, marginBottom: 2 * MM },
  semTitle: { fontSize: 11, fontWeight: 600, color: C.ink },
  semMeta: { fontSize: 8, color: C.muted },
  note: { fontSize: 8, color: C.muted, marginTop: 2 * MM },
  rec: { borderLeftWidth: 2, borderLeftColor: C.brand, paddingLeft: 3 * MM, marginBottom: 4 * MM },
  recKind: { fontSize: 7, fontWeight: 600, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.6 },
  recTitle: { fontSize: 10.5, fontWeight: 600, color: C.ink, marginTop: 1 },
  recBody: { fontSize: 9, color: C.body, marginTop: 1.5 },
  recMeta: { fontSize: 7.5, color: C.muted, marginTop: 1.5 },
})

const fmt = (n: number | null | undefined, d = 2) => (n == null ? '—' : Number(n).toFixed(d))
const marks = (m: number | null, max: number | null) => (m == null ? '—' : `${Number.isInteger(m) ? m : m.toFixed(1)}`) + (max != null ? `/${max}` : '')
const date = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const initials = (n: string) => n.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

const PERF_COLS = [
  { key: 'name', label: 'Subject', w: '30%' },
  { key: 'code', label: 'Code', w: '11%' },
  { key: 'mse', label: 'MSE', w: '11%' },
  { key: 'see', label: 'SEE', w: '11%' },
  { key: 'max', label: 'Max (MSE/SEE)', w: '13%' },
  { key: 'credits', label: 'Credits', w: '8%' },
  { key: 'grade', label: 'Grade', w: '7%' },
  { key: 'result', label: 'Result', w: '9%' },
] as const

function Mark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2563EB" />
          <Stop offset="0.55" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#60A5FA" />
        </LinearGradient>
      </Defs>
      <Rect width={32} height={32} rx={9} fill="url(#g)" />
      <Path d="M8 22V11.5l8 6 8-6V22" stroke="#FFFFFF" strokeWidth={2.6} fill="none" />
      <Circle cx={24} cy={8.5} r={2.4} fill="#F5B300" />
    </Svg>
  )
}

function SectionHead({ no, title }: { no: string; title: string }) {
  return (
    <View style={s.sectionHead} minPresenceAhead={60}>
      <Text style={s.sectionNo}>{no}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  )
}

export function StudentReport({ data }: { data: NonNullable<ReportData> }) {
  registerFonts()
  const st = data.student
  return (
    <Document title={`Student Mentoring Report — ${st.name}`} author="Mentora" subject="Student Mentoring Report" creator="Mentora" producer="Mentora">
      <Page size="A4" style={s.page} wrap>
        <View style={s.header} fixed>
          <View style={s.brand}>
            <Mark />
            <Text style={s.brandName}>Mentora</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Student Mentoring Report</Text>
            <Text style={s.headerMeta}>
              {data.institution}
              {st.department ? ` · ${st.department}` : ''} · Generated {date(data.generatedAt)}
            </Text>
          </View>
        </View>
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Confidential — for the student, assigned mentor and authorised branch staff only.</Text>
        </View>

        <Text style={s.title}>{st.name}</Text>
        <Text style={s.subtitle}>Academic and mentoring record based on verified data as of {date(data.generatedAt)}.</Text>

        <SectionHead no="01" title="Student Information" />
        <View style={s.infoWrap} wrap={false}>
          {st.photo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={s.photo} src={{ data: st.photo, format: 'png' }} />
          ) : (
            <View style={s.photoFallback}>
              <Text style={s.initials}>{initials(st.name)}</Text>
            </View>
          )}
          <View style={s.grid}>
            {[
              ['Name', st.name],
              ['USN', st.usn ?? '—'],
              ['Branch', st.department ?? '—'],
              ['Program', st.program ?? '—'],
              ['Current semester', st.semester ? `Semester ${st.semester}${st.section ? ` · Section ${st.section}` : ''}` : '—'],
              ['Academic year', st.academicYear ?? '—'],
              ['Assigned mentor', st.mentor ? `${st.mentor}${st.mentorDesignation ? `, ${st.mentorDesignation}` : ''}` : 'Not assigned'],
              ['Email', st.email],
            ].map(([l, v]) => (
              <View key={l} style={s.cell}>
                <Text style={s.label}>{l}</Text>
                <Text style={s.value}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <SectionHead no="02" title="Academic Summary" />
        <View style={s.kpis} wrap={false}>
          <View style={s.kpi}>
            <Text style={s.label}>Current CGPA</Text>
            <Text style={s.kpiValue}>{fmt(data.summary.cgpa)}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.label}>Credits completed</Text>
            <Text style={s.kpiValue}>{data.summary.creditsCompleted}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.label}>Verified semesters</Text>
            <Text style={s.kpiValue}>{data.summary.verifiedSemesters}</Text>
          </View>
        </View>
        {data.semesters.length === 0 ? (
          <Text style={s.note}>No semesters have been verified yet. Only verified or finalized records are included in this report.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.th} fixed>
              {['Semester', 'Academic year', 'Credits registered', 'Credits earned', 'SGPA', 'Record status'].map((h) => (
                <Text key={h} style={[s.thText, { width: '16.66%' }]}>
                  {h}
                </Text>
              ))}
            </View>
            {data.semesters.map((sem) => (
              <View key={sem.semesterNo} style={s.tr} wrap={false}>
                <Text style={[s.td, { width: '16.66%' }]}>Semester {sem.semesterNo}</Text>
                <Text style={[s.td, s.mono, { width: '16.66%' }]}>{sem.academicYear}</Text>
                <Text style={[s.td, s.mono, { width: '16.66%' }]}>{sem.creditsRegistered}</Text>
                <Text style={[s.td, s.mono, { width: '16.66%' }]}>{sem.creditsEarned}</Text>
                <Text style={[s.td, s.mono, { width: '16.66%', fontWeight: 600 }]}>{fmt(sem.sgpa)}</Text>
                <Text style={[s.td, { width: '16.66%' }]}>{sem.status === 'FINALIZED' ? 'Finalized' : 'Verified'}</Text>
              </View>
            ))}
          </View>
        )}
        {data.summary.cgpa == null && data.semesters.length > 0 && <Text style={s.note}>CGPA not stated: {data.summary.cgpaNote}</Text>}

        <SectionHead no="03" title="Semester-wise Performance" />
        {data.semesters.length === 0 && <Text style={s.note}>No verified semester results to show.</Text>}
        {data.semesters.map((sem) => (
          <View key={sem.semesterNo} style={{ marginBottom: 3 * MM }}>
            <View style={s.semHead} minPresenceAhead={70} wrap={false}>
              <Text style={s.semTitle}>Semester {sem.semesterNo}</Text>
              <Text style={s.semMeta}>
                {sem.academicYear} · SGPA {fmt(sem.sgpa)} · {sem.rows.length} subjects
              </Text>
            </View>
            <View style={s.table}>
              <View style={s.th} fixed>
                {PERF_COLS.map((c) => (
                  <Text key={c.key} style={[s.thText, { width: c.w }]}>
                    {c.label}
                  </Text>
                ))}
              </View>
              {sem.rows.map((r, i) => (
                <View key={`${r.code}-${i}`} style={s.tr} wrap={false}>
                  <Text style={[s.td, { width: '30%' }]}>{r.name}</Text>
                  <Text style={[s.td, s.mono, { width: '11%' }]}>{r.code}</Text>
                  <Text style={[s.td, s.mono, { width: '11%' }]}>{r.mse == null ? '—' : marks(r.mse, null)}</Text>
                  <Text style={[s.td, s.mono, { width: '11%' }]}>{r.see == null ? '—' : marks(r.see, null)}</Text>
                  <Text style={[s.td, s.mono, { width: '13%' }]}>
                    {r.mseMax ?? '—'}/{r.seeMax ?? '—'}
                  </Text>
                  <Text style={[s.td, s.mono, { width: '8%' }]}>{r.credits}</Text>
                  <Text style={[s.td, { width: '7%', fontWeight: 600 }]}>{r.grade ?? '—'}</Text>
                  <Text style={[s.td, { width: '9%' }]}>{r.result === 'PASS' ? 'Pass' : r.result === 'FAIL' ? 'Fail' : r.result === 'ABSENT' ? 'Absent' : 'Pending'}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <SectionHead no="04" title="Mentoring Records" />
        {data.mentoring.length === 0 ? (
          <Text style={s.note}>No mentoring records were selected for this report.</Text>
        ) : (
          data.mentoring.map((r, i) => (
            <View key={i} style={s.rec} wrap={false}>
              <Text style={s.recKind}>{r.kind}</Text>
              <Text style={s.recTitle}>{r.title}</Text>
              {r.body ? <Text style={s.recBody}>{r.body}</Text> : null}
              <Text style={s.recMeta}>
                Status: {r.status === 'IN_PROGRESS' ? 'In progress' : r.status === 'COMPLETED' ? 'Completed' : 'Pending'} · Recorded {date(r.createdAt)}
                {r.dueDate ? ` · Due ${date(r.dueDate)}` : ''}
                {r.reviewDate ? ` · Review ${date(r.reviewDate)}` : ''}
              </Text>
            </View>
          ))
        )}
      </Page>
    </Document>
  )
}
