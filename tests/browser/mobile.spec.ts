import { test, expect, devices } from '@playwright/test';

const PAGES = ['/', '/the-map/', '/album/', '/saved/', '/editorial-guidelines/', '/login/', '/signup/', '/settings/profile/', '/settings/preferences/'];

for (const [name, width] of [['iPhone SE (1st gen)', 320], ['iPhone SE', 375], ['iPhone 15', 393], ['iPhone 15 Pro Max', 430]] as const) {
  test(`${name}: every page fits the screen with no sideways scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(() => {
        const w = window.innerWidth;
        const wide = [...document.querySelectorAll('main *, footer *')].filter((el) => {
          const box = el.getBoundingClientRect();
          return box.width > 0 && box.right > w + 1 && !el.closest('.nav-pills, .header-nav-wrap');
        });
        return { scroll: document.documentElement.scrollWidth - w, clipped: wide.length };
      });
      expect(overflow, `${path} at ${width}px`).toEqual({ scroll: 0, clipped: 0 });
    }
  });
}

test.describe('iPhone navigation', () => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['iPhone 15'];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test('bottom tab bar replaces header buttons and opens search', async ({ page }) => {
    await page.goto('/');
    const tabs = page.getByRole('navigation', { name: 'Primary' });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Articles' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('banner').getByRole('button', { name: 'Search' })).toBeHidden();
    await expect(page.locator('.header-countdown, [data-countdown]')).toHaveCount(0);

    await tabs.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search Vice City Feed' })).toBeFocused();
    await page.keyboard.press('Escape');

    await tabs.getByRole('link', { name: 'Social' }).click();
    await expect(page).toHaveURL(/\/social\/$/, { timeout: 20_000 });
    await expect(tabs.getByRole('link', { name: 'Social' })).toHaveAttribute('aria-current', 'page');
    await expect(tabs.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/login/?next=/messages/');
    await expect(tabs.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login/');
  });

  test('tap targets in the header, tab bar and footer are at least 44px', async ({ page }) => {
    await page.goto('/');
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('header a, header button, [data-mobile-tab-bar] a, [data-mobile-tab-bar] button, footer nav a, footer button, footer input')]
        .filter((el) => {
          const box = el.getBoundingClientRect();
          return box.width > 0 && (box.width < 44 || box.height < 44);
        })
        .map((el) => `${el.textContent?.trim() || el.getAttribute('aria-label')}`),
    );
    expect(small).toEqual([]);
  });

  test('content is not hidden behind the tab bar', async ({ page }) => {
    await page.goto('/editorial-guidelines/');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const gap = await page.evaluate(() => {
      const bar = document.querySelector('[data-mobile-tab-bar]')!.getBoundingClientRect();
      const footerText = [...document.querySelectorAll('footer p')].at(-1)!.getBoundingClientRect();
      return bar.top - footerText.bottom;
    });
    expect(gap).toBeGreaterThanOrEqual(0);
  });

  test('home screen app support is declared', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]').first()).toHaveAttribute('content', 'yes');
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest.display).toBe('standalone');
  });
});

test('the phone header centres the logo', async ({ page }) => {
  for (const width of [320, 375, 393, 430]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const offset = await page.evaluate(() => {
      const logo = document.querySelector('.header-primary .site-logo-link')!.getBoundingClientRect();
      return Math.abs(logo.left + logo.width / 2 - window.innerWidth / 2);
    });
    expect(offset, `${width}px`).toBeLessThan(4);
  }
});

test('no countdown anywhere, and the logo shrinks smoothly as you scroll', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  for (const path of ['/', '/login/', '/signup/']) {
    await page.goto(path);
    await expect(page.locator('[data-countdown], .countdown-chip')).toHaveCount(0);
  }

  await page.goto('/editorial-guidelines/');
  const logo = page.locator('.header-bar .site-logo-mark');
  const height = () => logo.evaluate((el) => el.getBoundingClientRect().height);
  expect(await height()).toBeCloseTo(64, 0);

  // The spacer reserves exactly the header's height, so content starts below it.
  const [header, spacer] = await page.evaluate(() => [
    document.querySelector('.header-bar')!.getBoundingClientRect().height,
    document.querySelector('.header-spacer')!.getBoundingClientRect().height,
  ]);
  expect(Math.abs(header - spacer)).toBeLessThan(1.5);

  const sizes: number[] = [];
  for (const y of [0, 30, 60, 90, 120, 300]) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
    sizes.push(await height());
  }
  // Shrinks step by step (no jump), from 64px down to 40px.
  for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1] + 0.5);
  expect(sizes[1]).toBeLessThan(64);
  expect(sizes[1]).toBeGreaterThan(40);
  expect(sizes.at(-1)).toBeCloseTo(40, 0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(height).toBeCloseTo(64, 0);
});

test('desktop header keeps the large logo and shrinks it on scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/editorial-guidelines/');
  const logo = page.locator('.header-bar .site-logo-mark');
  expect(await logo.evaluate((el) => el.getBoundingClientRect().height)).toBeCloseTo(84, 0);
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(() => logo.evaluate((el) => el.getBoundingClientRect().height)).toBeCloseTo(52, 0);
});
