import type { Metadata } from 'next'
import { SystemPage } from '@/components/system-page'

export const metadata: Metadata = { title: 'Offline' }

export default function OfflinePage() {
  return <SystemPage title="You’re offline" description="Mentora needs a connection to load your data. Anything you were typing in a form is kept on this device and restored when you’re back." illustration="offline" />
}
