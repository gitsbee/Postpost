import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:5175/Postpost/',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175/Postpost/',
    env: {
      VITE_FIREBASE_API_KEY: 'demo-public-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-postpost.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-postpost',
      VITE_FIREBASE_APP_ID: 'demo-public-app',
      VITE_FIREBASE_USE_EMULATORS: 'true',
    },
  },
});
