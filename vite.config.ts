import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/retritoboard/',
  plugins: [react(), tailwindcss()],
  test: {
    // Logica pura de src/. Las reglas y el e2e corren aparte (ver tests/)
    include: ['src/**/*.test.ts'],
  },
})
