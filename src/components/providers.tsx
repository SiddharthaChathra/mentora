'use client'

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from 'react'
import { MotionConfig } from 'motion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useMediaQuery } from '@/lib/hooks'

type LowBandwidthCtx = { lowBandwidth: boolean; setLowBandwidth: (v: boolean) => void; suggested: boolean }
const LowBandwidthContext = createContext<LowBandwidthCtx>({ lowBandwidth: false, setLowBandwidth: () => {}, suggested: false })
export const useLowBandwidth = () => useContext(LowBandwidthContext)

type NetworkInformation = { saveData?: boolean; effectiveType?: string }
const noop = () => () => {}
const slowConnection = () => {
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection
  return !!conn && (!!conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType ?? ''))
}

export function Providers({ children, lowBandwidth: initial }: { children: React.ReactNode; lowBandwidth: boolean }) {
  const [lowBandwidth, setLow] = useState(initial)
  // Suggest low-bandwidth mode on slow or data-saver connections (client-only; false during SSR).
  const suggested = useSyncExternalStore(noop, () => !initial && slowConnection(), () => false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: initial ? 5 * 60_000 : 30_000, refetchOnWindowFocus: !initial, retry: 1 } },
      }),
  )

  const setLowBandwidth = useCallback((v: boolean) => {
    setLow(v)
    document.documentElement.dataset.lowBandwidth = v ? 'true' : 'false'
    document.cookie = `m_lowbw=${v ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
  }, [])

  return (
    <QueryClientProvider client={client}>
      <LowBandwidthContext.Provider value={{ lowBandwidth, setLowBandwidth, suggested }}>
        <MotionConfig reducedMotion={lowBandwidth ? 'always' : 'user'} transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}>
          {children}
        </MotionConfig>
      </LowBandwidthContext.Provider>
      <Toaster
        position={isDesktop ? 'bottom-right' : 'top-center'}
        toastOptions={{
          classNames: {
            toast: '!rounded-xl !border !border-line !bg-surface !text-ink-900 !shadow-3 !font-sans',
            description: '!text-ink-500',
            actionButton: '!bg-primary-600 !text-on-primary !rounded-lg',
          },
        }}
      />
    </QueryClientProvider>
  )
}
