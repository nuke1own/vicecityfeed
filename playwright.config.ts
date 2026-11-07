import { defineConfig } from '@playwright/test';

// Fake microphone so voice messages can be recorded in tests.
const chromium = {
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
};
const MOCK = 'http://127.0.0.1:54321';

export default defineConfig({
  testDir: './tests/browser',
  // One worker: the action tests share one mock Supabase whose state they reset.
  workers: 1,
  use: { launchOptions: chromium },
  projects: [
    // The site as built for production, with Supabase unreachable (demo data via VCF_UI_PREVIEW).
    { name: 'site', testIgnore: /actions\.spec\.ts/, use: { baseURL: 'http://127.0.0.1:3100' } },
    // A second build wired to the in-memory Supabase stand-in, so real server actions run.
    { name: 'actions', testMatch: /actions\.spec\.ts/, use: { baseURL: 'http://127.0.0.1:3101' } },
  ],
  webServer: [
    { command: 'VCF_UI_PREVIEW=1 npx next start -p 3100', port: 3100, reuseExistingServer: false },
    { command: 'node tests/mock-supabase/server.mjs', port: 54321, reuseExistingServer: false },
    {
      command: `NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_SUPABASE_URL=${MOCK} NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npx next build && NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_SUPABASE_URL=${MOCK} NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npx next start -p 3101`,
      port: 3101,
      reuseExistingServer: false,
      timeout: 600_000,
    },
  ],
});
