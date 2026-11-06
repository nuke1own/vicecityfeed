import { test, expect } from '@playwright/test';

const accent = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());

test('grey is the default accent', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  expect(await accent(page)).toBe('#a9a9b4');
});

test('choosing a theme applies instantly, persists, and has no first-paint flash', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/settings/preferences/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preferences');
  const nav = page.getByRole('navigation', { name: 'Account settings' });
  await expect(nav.getByRole('link')).toHaveText(['Profile', 'Security', 'Social', 'Preferences']);
  await expect(page.getByRole('radio', { name: /Overcast Grey/ })).toBeChecked();

  await page.getByText('Vice City Pink').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'vice-pink');
  expect(await accent(page)).toBe('#ff1e8e');
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();

  // The boot script must set the theme before any app JavaScript runs.
  await page.route('**/_next/static/chunks/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'vice-pink');
  expect(await accent(page)).toBe('#ff1e8e');
  await page.unroute('**/_next/static/chunks/**');

  await page.goto('/settings/preferences/');
  await page.getByText('Overcast Grey').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  expect(await accent(page)).toBe('#a9a9b4');
  expect(errors.filter((e) => !/Failed to load resource|ERR_FAILED|ChunkLoadError|Loading chunk/.test(e))).toEqual([]);
});

test('unknown saved theme values are ignored', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('vcf-theme', '"><script>alert(1)</script>'));
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
});
