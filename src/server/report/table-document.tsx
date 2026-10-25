import 'server-only'
import path from 'node:path'
import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ExportTable } from '@/server/exports'

const FONT_DIR = path.join(process.cwd(), 'src', 'server', 'report', 'fonts')
let done = false
function fonts() {
  if (done) return
  Font.register({ family: 'Jakarta', fonts: [{ src: path.join(FONT_DIR, 'PlusJakartaSans-400.woff') }, { src: path.join(FONT_DIR, 'PlusJakartaSans-600.woff'), fontWeight: 600 }, { src: path.join(FONT_DIR, 'PlusJakartaSans-700.woff'), fontWeight: 700 }] })
  Font.registerHyphenationCallback((w) => [w])
  done = true
}

const MM = 2.8346
const s = StyleSheet.create({
  page: { fontFamily: 'Jakarta', fontSize: 8, color: '#334155', paddingTop: 24 * MM, paddingBottom: 20 * MM, paddingHorizontal: 15 * MM },
  header: { position: 'absolute', top: 9 * MM, left: 15 * MM, right: 15 * MM, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.75, borderBottomColor: '#E6EAF2', paddingBottom: 2.5 * MM },
  brand: { fontFamily: 'Jakarta', fontWeight: 700, fontSize: 12, color: '#0F172A' },
  meta: { fontSize: 7.5, color: '#55647A', textAlign: 'right' },
  footer: { position: 'absolute', bottom: 8 * MM, left: 15 * MM, right: 15 * MM, height: 8 * MM, borderTopWidth: 0.75, borderTopColor: '#E6EAF2', paddingTop: 2 * MM },
  footerText: { fontSize: 7, color: '#55647A' },
  title: { fontFamily: 'Jakarta', fontWeight: 700, fontSize: 18, color: '#0F172A', height: 10 * MM, marginBottom: 3 * MM },
  th: { flexDirection: 'row', backgroundColor: '#2563EB' },
  thText: { fontSize: 6.8, fontWeight: 600, color: '#FFFFFF', textTransform: 'uppercase', padding: 1.6 * MM },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E6EAF2' },
  td: { fontSize: 8, color: '#0F172A', padding: 1.6 * MM },
})

/** Generic landscape table report for HOD exports (no charts, no insights). */
export function TableReport({ table, institution, generatedAt }: { table: ExportTable; institution: string; generatedAt: Date }) {
  fonts()
  const total = table.columns.reduce((a, c) => a + (c.width ?? 14), 0)
  return (
    <Document title={table.title} author="Mentora" creator="Mentora">
      <Page size="A4" orientation="landscape" style={s.page} wrap>
        <View style={s.header} fixed>
          <Text style={s.brand}>Mentora</Text>
          <Text style={s.meta}>
            {institution} · {table.title} · Generated {generatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Confidential — for authorised department staff only.</Text>
        </View>
        <Text style={s.title}>{table.title}</Text>
        <View>
          <View style={s.th} fixed>
            {table.columns.map((c) => (
              <Text key={c.key} style={[s.thText, { width: `${((c.width ?? 14) / total) * 100}%` }]}>
                {c.header}
              </Text>
            ))}
          </View>
          {table.rows.map((r, i) => (
            <View key={i} style={s.tr} wrap={false}>
              {table.columns.map((c) => (
                <Text key={c.key} style={[s.td, { width: `${((c.width ?? 14) / total) * 100}%` }]}>
                  {r[c.key] == null ? '—' : String(r[c.key])}
                </Text>
              ))}
            </View>
          ))}
          {table.rows.length === 0 && <Text style={s.td}>No rows.</Text>}
        </View>
      </Page>
    </Document>
  )
}
