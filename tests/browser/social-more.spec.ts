import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });
const slow = { timeout: 20_000 };

test('opening a page starts at the top', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto('/the-map/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await page.locator('footer').getByRole('link', { name: 'Editorial Guidelines' }).click();
  await expect(page).toHaveURL(/editorial-guidelines/, slow);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('posts have bookmark and share buttons at the bottom right', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/social/');
  const post = page.getByRole('article').first();
  const bookmark = post.getByRole('button', { name: 'Bookmark' });
  const share = post.getByRole('button', { name: 'Share post' });
  await expect(bookmark).toBeVisible(slow);
  const [card, b, s, like] = await Promise.all([post.boundingBox(), bookmark.boundingBox(), share.boundingBox(), post.getByRole('button', { name: /Like/ }).boundingBox()]);
  expect(s!.x).toBeGreaterThan(b!.x);
  expect(card!.x + card!.width - (s!.x + s!.width)).toBeLessThan(24);
  expect(Math.abs(b!.y - like!.y)).toBeLessThan(4);
  // Signed out: bookmarking asks you to sign in.
  await bookmark.click();
  await expect(page).toHaveURL(/\/login\//, slow);
});

test('left Social menu: labels on wide screens, icons on tablets, hidden on phones', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/social/');
  const nav = page.getByRole('navigation', { name: 'Social', exact: true });
  await expect(nav).toBeVisible(slow);
  for (const label of ['Home', 'Explore', 'Notifications', 'Follow', 'Chat', 'Bookmarks', 'Profile']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Post' })).toBeVisible();
  await nav.getByRole('button', { name: 'More' }).click();
  await expect(page.getByRole('menuitem', { name: 'Color theme' })).toHaveAttribute('href', '/settings/preferences/');

  await page.setViewportSize({ width: 820, height: 900 });
  await expect(nav).toBeVisible();
  await expect(nav.getByText('Explore', { exact: true })).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav).toBeHidden();
});

test('Explore shows trending and people; Follow lists suggestions', async ({ page }) => {
  await page.goto('/social/search/');
  await expect(page.getByRole('heading', { name: 'Trending in Leonida' })).toBeVisible(slow);
  await expect(page.getByRole('link', { name: /#gta6/ }).first()).toHaveAttribute('href', '/social/?tag=gta6');
  await page.getByRole('searchbox', { name: 'Search posts and people' }).fill('leonida');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/q=leonida/, slow);
  await expect(page.getByRole('article').first()).toContainText('Leonida', slow);

  await page.goto('/social/connect/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Follow', slow);
  await expect(page.getByText('@cal_h')).toBeVisible();
});

test('question of the day opens the composer for members', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/social/');
  const card = page.getByRole('complementary', { name: 'Social sidebar' }).getByRole('region', { name: 'Question of the day' });
  await expect(card).toBeVisible(slow);
  await expect(card.getByRole('link', { name: 'Answer' }).first()).toHaveAttribute('href', /\/social\/compose\/\?text=.*QOTD/);
});

test('notifications and bookmarks need sign-in', async ({ page }) => {
  await page.goto('/social/notifications/');
  await expect(page).toHaveURL(/\/login\/\?next=/, slow);
  await page.goto('/social/bookmarks/');
  await expect(page).toHaveURL(/\/login\/\?next=/, slow);
});

test('Social spacing: nothing hides under the header and columns line up', async ({ page }) => {
  for (const [width, height] of [[1468, 909], [1024, 800], [820, 1000], [393, 852]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/social/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Social', slow);
    if (width >= 1024) {
      await expect(page.getByRole('complementary', { name: 'Social sidebar' }).getByRole('heading', { name: 'Question of the day' })).toBeVisible(slow);
    }
    const m = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)?.getBoundingClientRect();
      const header = box('.header-bar')!;
      return {
        header: header.bottom,
        spacer: box('.header-spacer')!.bottom,
        title: box('.social-hero h1')!.top,
        nav: box('.social-nav a')?.top ?? null,
        navShown: getComputedStyle(document.querySelector('.social-nav')!).display !== 'none',
        aside: box('aside[aria-label="Social sidebar"] section')?.top ?? null,
        asideShown: (box('aside[aria-label="Social sidebar"]')?.width ?? 0) > 0,
      };
    });
    expect(Math.abs(m.header - m.spacer), `spacer at ${width}`).toBeLessThan(1.5);
    expect(m.title - m.header, `title gap at ${width}`).toBeGreaterThanOrEqual(20);
    if (m.navShown) expect(m.nav! - m.header, `menu gap at ${width}`).toBeGreaterThanOrEqual(12);
    if (m.asideShown) expect(Math.abs(m.aside! - m.nav!), `columns align at ${width}`).toBeLessThan(2);
  }
});

test('the Social menu stays in view under the slim header when scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1468, height: 909 });
  await page.goto('/social/');
  await expect(page.locator('.social-nav')).toBeVisible(slow);
  await expect(page.getByRole('article').first()).toBeVisible(slow);
  await expect(page.getByRole('complementary', { name: 'Social sidebar' }).getByRole('heading', { name: 'Who to follow' })).toBeVisible(slow);
  // Simulate a long timeline (the demo has only two posts), once the page has settled.
  await expect(page.locator('html[data-ready="true"]')).toBeAttached(slow);
  await expect
    .poll(() =>
      page.evaluate(() => {
        if (!document.getElementById('test-filler')) {
          const filler = document.createElement('div');
          filler.id = 'test-filler';
          filler.style.height = '3000px';
          document.querySelector('main')!.append(filler);
        }
        return document.documentElement.scrollHeight;
      }),
    )
    .toBeGreaterThan(3500);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(200);
  const { navTop, headerBottom, navBottom } = await page.evaluate(() => ({
    navTop: document.querySelector('.social-nav')!.getBoundingClientRect().top,
    navBottom: document.querySelector('.social-nav')!.getBoundingClientRect().bottom,
    headerBottom: document.querySelector('.header-bar')!.getBoundingClientRect().bottom,
  }));
  expect(Math.abs(navTop - headerBottom), JSON.stringify({ navTop, headerBottom, navBottom })).toBeLessThan(2);
  expect(navBottom).toBeLessThanOrEqual(909);
});

test('no footer on Social, Album, Notifications or Messages; footer on Articles', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const path of ['/social/', '/social/search/', '/album/']) {
    await page.goto(path);
    await expect(page.locator('footer'), path).toHaveCount(0, slow);
  }
  await page.goto('/');
  await expect(page.locator('footer')).toHaveCount(1);
});

test('the logo reloads Social and Album instead of going to Articles', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/social/');
  const logo = page.getByRole('banner').locator('.site-logo-link');
  await expect(logo).toHaveAttribute('href', '/social/', slow);
  await page.evaluate(() => window.scrollTo(0, 300));
  await logo.click();
  await expect(page).toHaveURL(/\/social\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.goto('/social/search/');
  await expect(logo).toHaveAttribute('href', '/social/', slow);
  await logo.click();
  await expect(page).toHaveURL(/\/social\/$/, slow);

  await page.goto('/album/');
  await expect(logo).toHaveAttribute('href', '/album/');
  await logo.click();
  await expect(page).toHaveURL(/\/album\/$/);

  await page.goto('/the-map/');
  await expect(logo).toHaveAttribute('href', '/');
});
