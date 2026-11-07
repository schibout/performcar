import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests-e2e",
  /* Global timeout for each test in milliseconds - increased for better stability */
  timeout: 30000,
  expect: {
    /* Timeout for each expectation in milliseconds */
    timeout: 10000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Use more parallel workers for faster test execution */
  workers: process.env.CI ? 4 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://127.0.0.1:3000",

    /* Action timeout in milliseconds */
    actionTimeout: 15000,

    /* Collect trace only on CI failures to speed up local testing */
    trace: process.env.CI ? "on-first-retry" : "off",

    /* Disable video recording for faster test execution */
    video: "off",

    /* Only take screenshots on failure */
    screenshot: "only-on-failure",
  },

  /* Configure projects for major browsers - use only chromium for faster test execution */
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});
