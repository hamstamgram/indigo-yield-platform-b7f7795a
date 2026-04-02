import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
loadEnv();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'https://indigo-yield-platform.lovable.app',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
  },
  timeout: 600000, // 10 min — epochs with 3 full exits each taking 60-90s on Supabase hosted
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
