import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev:web -- --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev:server',
      url: 'http://127.0.0.1:3001/api/v1/health',
      reuseExistingServer: false,
    },
    {
      command: 'npm run preview -- --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
    },
  ],
});
