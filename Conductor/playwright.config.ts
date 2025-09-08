import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot only when test fails */
    screenshot: 'only-on-failure',

    /* Record video only when test fails */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'conductor-e2e',
      testMatch: '**/conductor*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173', // Conductor client
      },
    },
    {
      name: 'audience-e2e',
      testMatch: '**/audience*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4000', // Conductor server (audience page)
      },
    },
    {
      name: 'mobile-audience-e2e',
      testMatch: '**/mobile-audience*.spec.ts',
      use: {
        ...devices['iPhone 12'],
        baseURL: 'http://localhost:4000', // Conductor server (audience page)
      },
    },
  ],

  /* Run your local dev servers before starting the tests */
  webServer: [
    {
      command: 'npm run conductor:server',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    },
    {
      command: 'npm run conductor:client',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    },
  ],
});
