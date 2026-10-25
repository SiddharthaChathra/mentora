import 'server-only'

type Kind = 'resource' | 'avatar' | 'import'

const TYPES: Record<string, { mime: string; magic: 'pdf' | 'zip' | 'ole' | 'png' | 'jpeg' | 'webp' | 'text'; kinds: Kind[] }> = {
  pdf: { mime: 'application/pdf', magic: 'pdf', kinds: ['resource'] },
  doc: { mime: 'application/msword', magic: 'ole', kinds: ['resource'] },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: 'zip', kinds: ['resource'] },
  ppt: { mime: 'application/vnd.ms-powerpoint', magic: 'ole', kinds: ['resource'] },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', magic: 'zip', kinds: ['resource'] },
  xls: { mime: 'application/vnd.ms-excel', magic: 'ole', kinds: ['resource'] },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', magic: 'zip', kinds: ['resource', 'import'] },
  csv: { mime: 'text/csv', magic: 'text', kinds: ['import'] },
  txt: { mime: 'text/plain', magic: 'text', kinds: ['resource'] },
  png: { mime: 'image/png', magic: 'png', kinds: ['resource', 'avatar'] },
  jpg: { mime: 'image/jpeg', magic: 'jpeg', kinds: ['resource', 'avatar'] },
  jpeg: { mime: 'image/jpeg', magic: 'jpeg', kinds: ['resource', 'avatar'] },
  webp: { mime: 'image/webp', magic: 'webp', kinds: ['avatar'] },
}

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v)

function magicMatches(magic: (typeof TYPES)[string]['magic'], b: Uint8Array) {
  switch (magic) {
    case 'pdf':
      return startsWith(b, [0x25, 0x50, 0x44, 0x46])
    case 'zip':
      return startsWith(b, [0x50, 0x4b, 0x03, 0x04])
    case 'ole':
      return startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    case 'png':
      return startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'jpeg':
      return startsWith(b, [0xff, 0xd8, 0xff])
    case 'webp':
      return startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)
    case 'text': {
      const head = b.subarray(0, 4096)
      if (head.includes(0)) return false
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(head.subarray(0, Math.max(0, head.length - 4)))
        return true
      } catch {
        return false
      }
    }
  }
}

/** Validate extension + declared MIME + magic bytes. Returns the canonical MIME to store. */
export function sniffFile(name: string, declared: string, bytes: Uint8Array, kind: Kind): { ok: true; mime: string } | { ok: false; reason: string } {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  const t = TYPES[ext]
  if (!t || !t.kinds.includes(kind)) {
    const allowed = Object.entries(TYPES)
      .filter(([, v]) => v.kinds.includes(kind))
      .map(([k]) => k.toUpperCase())
    return { ok: false, reason: `This file type isn’t allowed. Use ${allowed.join(', ')}.` }
  }
  const declaredOk = !declared || declared === t.mime || declared === 'application/octet-stream' || (ext === 'csv' && /csv|excel|plain/.test(declared))
  if (!declaredOk) return { ok: false, reason: 'The file’s type does not match its extension.' }
  if (!magicMatches(t.magic, bytes)) return { ok: false, reason: 'The file contents don’t match its type. It may be corrupted or renamed.' }
  return { ok: true, mime: t.mime }
}
