'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function useReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

// ───────────── localStorage-backed state (per-viewer conveniences only) ─────────────
const lsListeners = new Set<() => void>()
function lsSubscribe(cb: () => void) {
  lsListeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    lsListeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}
function lsRead(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** A string value persisted in localStorage; SSR-safe and always falls back gracefully. */
/**
 * Local state seeded from a prop and re-seeded whenever that prop changes (e.g. after router.refresh()).
 * Uses React's "adjust state during render" pattern instead of a syncing effect.
 */
export function useSyncedState<T>(value: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(value)
  const [prev, setPrev] = useState(value)
  if (!Object.is(prev, value)) {
    setPrev(value)
    setState(value)
  }
  return [state, setState]
}

const noopSubscribe = () => () => {}
/** True only after hydration — keeps client-only UI out of the server HTML without a setState-in-effect. */
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

export function useLocalStorage(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    lsSubscribe,
    () => lsRead(key) ?? fallback,
    () => fallback,
  )
  const set = useCallback(
    (v: string) => {
      try {
        localStorage.setItem(key, v)
      } catch {}
      lsListeners.forEach((l) => l())
    },
    [key],
  )
  return [value, set]
}

export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)
  const f = useRef(fn)
  useEffect(() => {
    f.current = fn
  }, [fn])
  useEffect(
    () => () => {
      if (t.current) clearTimeout(t.current)
    },
    [],
  )
  return (...args: A) => {
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => f.current(...args), ms)
  }
}

/** Warn before leaving the page with unsaved changes. */
export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const on = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', on)
    return () => window.removeEventListener('beforeunload', on)
  }, [dirty])
}

/** Track an element's content width (for SVG charts that need pixel geometry). */
export function useElementWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.max(200, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}
