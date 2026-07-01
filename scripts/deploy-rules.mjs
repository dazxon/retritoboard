#!/usr/bin/env node
// Deploya firestore.rules al proyecto Firebase via la Firebase Rules REST API,
// usando la misma service account que scripts/feedback-list.mjs. No necesita
// firebase-tools ni dependencias nuevas (firebase-admin ya mintea el token).
//
// Idempotente: compara el contenido vivo con firestore.rules local y solo crea
// + publica un ruleset nuevo si cambio. Corre tanto local como en GitHub Actions.
//
// Uso:
//   npm run rules:deploy             # deploya solo si hay cambios
//   npm run rules:deploy -- --dry    # muestra si cambiaria, no escribe nada
//   npm run rules:deploy -- --force  # re-publica aunque no haya cambios
//
// Service account (mismo orden que feedback-list.mjs, + inline para CI):
//   1. env FIREBASE_SERVICE_ACCOUNT_JSON  (JSON crudo — lo usa GitHub Actions)
//   2. env FIREBASE_SERVICE_ACCOUNT_KEY   (path a un .json)
//   3. ~/.config/retritoboard/firebase-admin.json
//   4. ./.secrets/firebase-admin.json

import { initializeApp, cert } from 'firebase-admin/app'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RULES_PATH = resolve(__dirname, '..', 'firestore.rules')
const RULES_FILENAME = 'firestore.rules'

const args = process.argv.slice(2)
const force = args.includes('--force')
const dry = args.includes('--dry')

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    } catch {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON no es JSON valido')
      process.exit(1)
    }
  }
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    resolve(homedir(), '.config/retritoboard/firebase-admin.json'),
    resolve('.secrets/firebase-admin.json'),
  ].filter(Boolean)
  const path = candidates.find((p) => existsSync(p))
  if (!path) {
    console.error('\nNo encontre la service account key. Busque en:')
    console.error('  - env FIREBASE_SERVICE_ACCOUNT_JSON (inline, para CI)')
    for (const p of candidates) console.error(`  - ${p}`)
    console.error(
      '\nGenerala en https://console.firebase.google.com/project/retritoboard/settings/serviceaccounts/adminsdk',
    )
    console.error(
      `y dejala en ${resolve(homedir(), '.config/retritoboard/firebase-admin.json')}\n`,
    )
    process.exit(1)
  }
  return JSON.parse(readFileSync(path, 'utf-8'))
}

const sa = loadServiceAccount()
const projectId = sa.project_id
if (!projectId) {
  console.error('La service account no tiene project_id')
  process.exit(1)
}

const credential = cert(sa)
initializeApp({ credential })
const { access_token: token } = await credential.getAccessToken()

const BASE = `https://firebaserules.googleapis.com/v1/projects/${projectId}`

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body.error?.message || JSON.stringify(body)
    throw new Error(`${opts.method || 'GET'} ${path} -> ${res.status}: ${msg}`)
  }
  return body
}

const localSource = readFileSync(RULES_PATH, 'utf-8')

// Leer las rules actualmente en vivo (release cloud.firestore -> su ruleset)
let liveSource = null
let currentRulesetName = null
try {
  const release = await api('/releases/cloud.firestore')
  currentRulesetName = release.rulesetName // projects/<pid>/rulesets/<id>
  const rulesetId = currentRulesetName.split('/').pop()
  const ruleset = await api(`/rulesets/${rulesetId}`)
  const files = ruleset.source?.files || []
  const file = files.find((f) => f.name === RULES_FILENAME) || files[0]
  liveSource = file?.content ?? null
} catch (e) {
  console.warn(`No pude leer las rules vivas (¿primer deploy?): ${e.message}`)
}

const changed = liveSource === null || liveSource.trim() !== localSource.trim()

if (!changed && !force) {
  console.log('✓ Rules sin cambios respecto de las vivas. No-op.')
  if (currentRulesetName) console.log(`  ruleset vivo: ${currentRulesetName}`)
  process.exit(0)
}

if (dry) {
  console.log(
    changed
      ? '≠ Las rules locales DIFIEREN de las vivas → se deployarian.'
      : '= Iguales (con --force se re-publicarian).',
  )
  process.exit(0)
}

console.log(
  changed ? 'Rules cambiaron. Creando ruleset...' : '--force: re-publicando...',
)
const created = await api('/rulesets', {
  method: 'POST',
  body: JSON.stringify({
    source: { files: [{ name: RULES_FILENAME, content: localSource }] },
  }),
})
const newRulesetName = created.name // projects/<pid>/rulesets/<id>
console.log(`  ruleset creado: ${newRulesetName}`)

const releaseName = `projects/${projectId}/releases/cloud.firestore`
if (currentRulesetName) {
  await api('/releases/cloud.firestore', {
    method: 'PATCH',
    body: JSON.stringify({
      release: { name: releaseName, rulesetName: newRulesetName },
    }),
  })
} else {
  await api('/releases', {
    method: 'POST',
    body: JSON.stringify({ name: releaseName, rulesetName: newRulesetName }),
  })
}
console.log('✓ Release cloud.firestore apuntado al ruleset nuevo. Rules en vivo.')
process.exit(0)
