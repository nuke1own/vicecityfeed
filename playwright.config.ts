import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', use: { baseURL: 'http://127.0.0.1:3100', launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] } }, webServer: { command: 'VCF_UI_PREVIEW=1 npx next start -p 3100', port: 3100, reuseExistingServer: false } });
