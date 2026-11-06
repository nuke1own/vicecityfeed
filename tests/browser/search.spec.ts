import { test, expect, devices, type Page } from '@playwright/test';

const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['iPhone 15'];
test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Primary' });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search' });
const input = (page: Page) => page.getByRole('searchbox', { name: 'Search Vice City Feed' });

async function openFromTabBar(page: Page) {
  await tabs(page).getByRole('button', { name: 'Search' }).tap();
  await expect(dialog(page)).toBeVisible();
  await expect(input(page)).toBeFocused();
}

test('opens from the tab bar, covers the whole screen and locks page scroll', async ({ page }) => {
  await page.goto('/');
  await expect(dialog(page)).toBeHidden();
  await openFromTabBar(page);
  await expect(tabs(page).getByRole('button', { name: 'Search' })).toHaveAttribute('aria-expanded', 'true');

  const overlay = await page.locator('.search-overlay').boundingBox();
  expect(overlay).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');

  await input(page).fill('jason');
  await expect(dialog(page).getByRole('status')).toHaveText(/stories found/);
});

test('closes with the close button and clears the query', async ({ page }) => {
  await page.goto('/');
  await openFromTabBar(page);
  await input(page).fill('leonida');
  await dialog(page).getByRole('button', { name: 'Close search' }).tap();
  await expect(dialog(page)).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');

  await openFromTabBar(page);
  await expect(input(page)).toHaveValue('');
});

test('closes when tapping outside the panel', async ({ page }) => {
  await page.goto('/');
  await openFromTabBar(page);
  await page.touchscreen.tap(viewport.width / 2, viewport.height - 120);
  await expect(dialog(page)).toBeHidden();
});

test('closes with Escape and when navigating away', async ({ page }) => {
  await page.goto('/');
  await openFromTabBar(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();

  await openFromTabBar(page);
  await page.goBack().catch(() => {});
  await page.goto('/saved/');
  await expect(dialog(page)).toBeHidden();
});

test('works on the phone settings pages, where the site header is hidden', async ({ page }) => {
  await page.goto('/settings/preferences/');
  await expect(page.locator('header.header-bar')).toBeHidden();
  await openFromTabBar(page);
  await dialog(page).getByRole('button', { name: 'Close search' }).tap();
  await expect(dialog(page)).toBeHidden();
});

test('can be opened and closed repeatedly', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 4; i++) {
    await openFromTabBar(page);
    await dialog(page).getByRole('button', { name: 'Close search' }).tap();
    await expect(dialog(page)).toBeHidden();
  }
});

test('the input is focused inside the tap itself, so the iPhone keyboard opens', async ({ page }) => {
  await page.goto('/');
  await expect(tabs(page).getByRole('button', { name: 'Search' })).toBeVisible();
  // iOS only raises the keyboard for focus() called during the user gesture.
  const focusedDuringTap = await page.evaluate(() => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('[data-mobile-tab-bar] button')].find((b) => b.textContent?.includes('Search'))!;
    button.click();
    return document.activeElement?.id;
  });
  expect(focusedDuringTap).toBe('site-search');
});
