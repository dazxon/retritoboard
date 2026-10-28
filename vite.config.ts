import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Datos de emojis en español (nombres y palabras para buscar) del picker de
// reacciones. Se publican con el sitio en emojibase/es/ en vez de bajarlos del
// CDN que usa frimousse por default. Solo se piden al abrir el picker.
function emojibaseData(): Plugin {
  const require = createRequire(import.meta.url)
  const read = (file: string) => readFileSync(require.resolve(`emojibase-data/es/${file}`))
  const FILES = ['data.json', 'messages.json']
  return {
    name: 'emojibase-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = FILES.find((f) => req.url?.split('?')[0].endsWith(`/emojibase/es/${f}`))
        if (!file) return next()
        res.setHeader('Content-Type', 'application/json')
        res.end(read(file))
      })
    },
    generateBundle() {
      for (const file of FILES) {
        this.emitFile({ type: 'asset', fileName: `emojibase/es/${file}`, source: read(file) })
      }
    },
  }
}

export default defineConfig({
  base: '/retritoboard/',
  plugins: [react(), tailwindcss(), emojibaseData()],
  test: {
    // Logica pura de src/. Las reglas y el e2e corren aparte (ver tests/)
    include: ['src/**/*.test.ts'],
  },
})
