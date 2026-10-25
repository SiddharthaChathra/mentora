'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#EEF2F9', color: '#0F172A', display: 'grid', placeItems: 'center', minHeight: '100dvh', margin: 0 }}>
        <main style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: '#2563EB', fontWeight: 600, letterSpacing: '0.2em' }}>500</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 40, margin: '8px 0' }}>Mentora hit a snag</h1>
          <p style={{ color: '#55647A' }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 24, height: 44, padding: '0 20px', borderRadius: 12, border: 0, background: '#2563EB', color: '#fff', fontWeight: 600 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
