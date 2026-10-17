import { defineConfig } from 'vitest/config'

// Tests de firestore.rules contra el emulador: npm run test:rules
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    // Un solo emulador compartido: los archivos no corren en paralelo
    fileParallelism: false,
  },
})
