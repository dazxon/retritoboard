import { defineConfig, devices } from '@playwright/test'

// Smoke e2e contra los emuladores de Firebase: npm run test:e2e
// (la primera vez: npx playwright install chromium)
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4174/retritoboard/',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
  webServer: {
    command:
      'vite build --mode emulator --outDir dist-e2e && vite preview --outDir dist-e2e --port 4174 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4174/retritoboard/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
