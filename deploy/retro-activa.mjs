#!/usr/bin/env node
// ¿Hay una retro en curso en retritoboard? Lo usa retritoboard-autodeploy antes de publicar.
//
// Retro en curso = una sala con 2 o más personas con heartbeat en los últimos RB_ACTIVE_MIN
// minutos (default 5; el front late cada 30 s). Una sola pestaña olvidada no frena el deploy.
//
// Lee la presencia con firebase-admin del checkout de deploy (RB_REPO) y la service account
// de ~/.config/retritoboard/firebase-admin.json (o FIREBASE_SERVICE_ACCOUNT_KEY).
//
// Salida: 0 = no hay retro · 3 = hay retro (imprime las salas) · 1 = no se pudo saber.
//
// Canónico: dazxon/retritoboard deploy/retro-activa.mjs (antes vivía en ~/server-setup, SDD-2026-067).

import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const repo = process.env.RB_REPO || resolve(homedir(), 'apps/retritoboard')
const activeMin = Number(process.env.RB_ACTIVE_MIN || 5)
const saPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
  resolve(homedir(), '.config/retritoboard/firebase-admin.json')

if (!existsSync(saPath)) {
  console.error(`sin service account en ${saPath}`)
  process.exit(1)
}

try {
  const require = createRequire(resolve(repo, 'package.json'))
  const { initializeApp, cert } = require('firebase-admin/app')
  const { getFirestore } = require('firebase-admin/firestore')

  initializeApp({ credential: cert(JSON.parse(readFileSync(saPath, 'utf-8'))) })
  const since = Date.now() - activeMin * 60_000
  // Sin filtro del lado del server: un where() de rango en collectionGroup pide un índice
  // que el proyecto no tiene. Sólo corre cuando hay algo para publicar, así que las lecturas sobran.
  const snap = await getFirestore().collectionGroup('users').select('lastSeen').get()
  const perRoom = new Map()
  for (const doc of snap.docs) {
    const seen = doc.get('lastSeen')?.toMillis?.() ?? 0
    if (seen < since) continue
    const room = doc.ref.parent.parent.id
    perRoom.set(room, (perRoom.get(room) || 0) + 1)
  }
  const busy = [...perRoom].filter(([, n]) => n >= 2)
  if (busy.length) {
    console.log(busy.map(([room, n]) => `${room}:${n}`).join(' '))
    process.exit(3)
  }
  console.log(`sin retro en curso (${snap.size} presencias leídas)`)
  process.exit(0)
} catch (e) {
  console.error(`no pude leer la presencia: ${e.message}`)
  process.exit(1)
}
