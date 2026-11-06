import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });
const slow = { timeout: 20_000 };

test('opening a page starts at the top', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto('/album/');
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
  await page.goto('/notifications/');
  await expect(page).toHaveURL(/\/login\/\?next=/, slow);
  await page.goto('/social/bookmarks/');
  await expect(page).toHaveURL(/\/login\/\?next=/, slow);
});
