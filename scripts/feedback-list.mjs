#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const KEY_CANDIDATES = [
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  resolve(homedir(), '.config/retritoboard/firebase-admin.json'),
  resolve('.secrets/firebase-admin.json'),
].filter(Boolean)

const KEY_PATH = KEY_CANDIDATES.find((p) => existsSync(p))

if (!KEY_PATH) {
  console.error('\nNo encontre la service account key. Busque en:')
  for (const p of KEY_CANDIDATES) console.error(`  - ${p}`)
  console.error('\nPasos para generarla (una sola vez):')
  console.error('  1. https://console.firebase.google.com/project/retritoboard/settings/serviceaccounts/adminsdk')
  console.error('  2. "Generar nueva clave privada" → descarga un JSON')
  console.error(`  3. Movelo a ${resolve(homedir(), '.config/retritoboard/firebase-admin.json')}`)
  console.error('     (asi queda disponible para todos los worktrees y nunca entra al repo)\n')
  process.exit(1)
}

const args = process.argv.slice(2)
const getArg = (name, def) => {
  const found = args.find((a) => a.startsWith(`--${name}=`))
  return found ? found.slice(name.length + 3) : def
}

const limit = Number(getArg('limit', '50'))
const full = args.includes('--full')
const json = args.includes('--json')
const sinceArg = getArg('since', null)
const uidFilter = getArg('uid', null)
const since = sinceArg ? new Date(sinceArg) : null

if (sinceArg && Number.isNaN(since.getTime())) {
  console.error(`--since invalido: "${sinceArg}". Usa formato ISO, ej: --since=2026-05-01`)
  process.exit(1)
}

const cred = JSON.parse(readFileSync(KEY_PATH, 'utf-8'))
initializeApp({ credential: cert(cred) })
const db = getFirestore()

const snap = await db
  .collection('feedback')
  .orderBy('createdAt', 'desc')
  .limit(limit)
  .get()

let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
if (since) docs = docs.filter((d) => d.createdAt?.toDate?.() >= since)
if (uidFilter) docs = docs.filter((d) => d.uid?.startsWith(uidFilter))

if (json) {
  console.log(
    JSON.stringify(
      docs.map((d) => ({
        ...d,
        createdAt: d.createdAt?.toDate?.().toISOString() ?? null,
      })),
      null,
      2,
    ),
  )
  process.exit(0)
}

const filters = [
  since && `desde ${sinceArg}`,
  uidFilter && `uid~${uidFilter}`,
].filter(Boolean)
const filterTxt = filters.length ? ` (${filters.join(', ')})` : ''
console.log(`\n${docs.length} feedback(s)${filterTxt}\n`)

const fmt = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  dateStyle: 'short',
  timeStyle: 'short',
})

for (const d of docs) {
  const date = d.createdAt?.toDate ? fmt.format(d.createdAt.toDate()) : '???'
  const uidShort = (d.uid ?? '????????').slice(0, 8)
  const route = d.route || '-'
  const msg = (d.message ?? '').toString()
  console.log(`--- ${date}  uid:${uidShort}  ruta:${route}`)
  if (full) {
    console.log(msg)
  } else {
    const oneLine = msg.replace(/\s+/g, ' ').slice(0, 140)
    console.log(`  ${oneLine}${msg.length > 140 ? '...' : ''}`)
  }
  console.log()
}
