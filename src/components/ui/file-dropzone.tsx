'use client'

import * as React from 'react'
import { FileUp, FileText, X } from 'lucide-react'
import { bytes, cn } from '@/lib/utils'

export function FileDropzone({
  id,
  label,
  accept,
  maxBytes,
  file,
  onFile,
  error,
  hint,
  progress,
}: {
  id: string
  label: string
  accept: string
  maxBytes: number
  file: File | null
  onFile: (f: File | null) => void
  error?: string
  hint?: string
  progress?: number | null
}) {
  const [drag, setDrag] = React.useState(false)
  const [local, setLocal] = React.useState<string | null>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const pick = (f: File | undefined) => {
    if (!f) return
    if (f.size > maxBytes) {
      setLocal(`That file is ${bytes(f.size)}. The limit is ${bytes(maxBytes)}.`)
      return
    }
    setLocal(null)
    onFile(f)
  }
  const msg = error ?? local
  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium text-ink-900">
        {label}
      </p>
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-1">
          <span className="grid size-10 place-items-center rounded-lg bg-primary-50 text-primary-600">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">{file.name}</p>
            <p className="text-xs text-ink-500">{bytes(file.size)}</p>
            {progress != null && (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                <div className="h-full rounded-full bg-gradient-primary transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          <button type="button" onClick={() => onFile(null)} aria-label="Remove file" className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-surface-muted">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-labelledby={`${id}-label`}
          aria-describedby={msg ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            pick(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            drag ? 'border-primary-500 bg-primary-50' : msg ? 'border-danger-500 bg-danger-100/40' : 'border-line-strong bg-surface-muted hover:border-primary-500 hover:bg-primary-50/50',
          )}
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-surface text-primary-600 shadow-2">
            <FileUp className="size-5" />
          </span>
          <span className="text-sm font-medium text-ink-900">Drop a file here or browse</span>
          <span className="text-xs text-ink-500">{hint}</span>
        </button>
      )}
      <input ref={input} id={id} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
      {msg && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger-700">
          {msg}
        </p>
      )}
    </div>
  )
}
