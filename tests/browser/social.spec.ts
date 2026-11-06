import { test, expect } from '@playwright/test';

// Social pages query Supabase on the server; allow for slow test networks.
test.describe.configure({ timeout: 60_000 });
const slow = { timeout: 20_000 };

test('the nav has Articles and Social sections', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Secondary' });
  await expect(nav.getByRole('link', { name: 'Articles' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Social' }).click();
  await expect(page).toHaveURL(/\/social\/$/, slow);
  await expect(nav.getByRole('link', { name: 'Social' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Social', slow);
});

test('signed-out visitors can read Social and are invited to join', async ({ page }) => {
  await page.goto('/social/');
  await expect(page.locator('h1')).toHaveCount(1);
  const timeline = page.getByRole('navigation', { name: 'Timeline' });
  await expect(timeline.getByRole('link', { name: 'For you' })).toHaveAttribute('aria-current', 'page');
  await expect(timeline.getByRole('link', { name: 'Following' })).toHaveAttribute('href', /\/login\//);
  await expect(page.getByRole('link', { name: 'Join', exact: true })).toHaveAttribute('href', '/signup/');
  await expect(page.getByRole('link', { name: 'Write a post' })).toHaveCount(0);
});

test('posting, composing and messages require sign-in', async ({ page }) => {
  await page.goto('/social/compose/');
  await expect(page).toHaveURL(/\/login\/\?next=%2Fsocial%2Fcompose%2F|\/login\/\?next=\/social\/compose\//);
  await page.goto('/messages/');
  await expect(page).toHaveURL(/\/login\/\?next=/);
  await page.goto('/messages/8b7c1b7e-2f7e-4c8a-9a51-3f2a1d6c9e10/');
  await expect(page).toHaveURL(/\/login\/\?next=/);
});

test('unknown social posts are not found', async ({ request }) => {
  const headers = { 'user-agent': 'Googlebot/2.1' };
  expect((await request.get('/social/post/8b7c1b7e-2f7e-4c8a-9a51-3f2a1d6c9e10/', { headers })).status()).toBe(404);
  expect((await request.get('/social/post/not-a-uuid/', { headers })).status()).toBe(404);
});

test('phones: tab bar has Articles, Social, Search, Messages and Account', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/social/');
  const tabs = page.getByRole('navigation', { name: 'Primary' });
  await expect(tabs.getByRole('link')).toHaveText(['Articles', 'Social', 'Messages', 'Sign in']);
  await expect(tabs.getByRole('button', { name: 'Search' })).toBeVisible();
  await expect(tabs.getByRole('link', { name: 'Social' })).toHaveAttribute('aria-current', 'page');
  // Saved stories moved into the menu on phones.
  await page.getByRole('button', { name: 'Open social links' }).click();
  await expect(page.getByRole('menuitem', { name: 'Saved stories' })).toBeVisible();
});

test('post cards show author, time, staff badge, replies and likes (demo data)', async ({ page }) => {
  await page.goto('/social/');
  const posts = page.getByRole('article');
  await expect(posts).toHaveCount(2, slow);
  const first = posts.first();
  await expect(first.getByRole('link', { name: 'Lucia', exact: true })).toHaveAttribute('href', '/u/lucia_vc/');
  await expect(first.getByText('@lucia_vc')).toBeVisible();
  await expect(first.locator('time')).toHaveText('5m');
  await expect(first.getByRole('link', { name: 'Reply, 3 replies' })).toHaveAttribute('href', /\/social\/post\//);
  await expect(posts.nth(1).getByLabel('Vice City Feed staff')).toBeVisible();
  await expect(posts.nth(1).getByRole('button', { name: /Unlike, 48 likes/ })).toHaveAttribute('aria-pressed', 'true');

  // Signed out: liking sends you to sign in.
  await first.getByRole('button', { name: /^Like, 12 likes/ }).click();
  await expect(page).toHaveURL(/\/login\//, slow);
});

test('a post opens its thread with a reply box', async ({ page }) => {
  await page.goto('/social/post/00000000-0000-4000-8000-000000000001/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Post', slow);
  await expect(page.getByText('Counting down to Leonida.')).toBeVisible();
  await expect(page.getByText('Sign in to reply.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/social/');
});
