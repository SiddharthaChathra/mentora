import { readFileSync } from 'node:fs'
import path from 'node:path'

// Load .env.local (local Supabase keys + demo passwords) without printing anything.
const file = path.resolve(import.meta.dirname, '../../.env.local')
for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line)
  if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '')
}
