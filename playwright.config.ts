import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',            // <— nur E2E-Verzeichnis
  use: { baseURL: 'http://localhost:3000', headless: true },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000
  },
})
