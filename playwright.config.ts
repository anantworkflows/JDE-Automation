import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['html', { outputFolder: './reports/playwright-report' }],
    ['json', { outputFile: './reports/test-results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'https://demo.steltix.com',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 30000,
    navigationTimeout: 60000,
    launchOptions: {
      slowMo: 100,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chromium'
      },
    },
  ],
  outputDir: './test-results/',
});
