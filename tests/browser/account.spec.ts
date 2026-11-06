import { test, expect } from '@playwright/test';

test('sign-up asks for date of birth first, then account details', async ({ page }) => {
  await page.goto('/signup/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create a Vice City Feed account');
  await expect(page.locator('header.header-bar')).toHaveCount(0);
  await expect(page.getByLabel('Email', { exact: true })).toBeHidden();

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Choose your birth month.')).toBeVisible();

  const year = new Date().getFullYear();
  await page.getByLabel('Birth month').selectOption('1');
  await page.getByLabel('Birth day').selectOption('1');
  await page.getByLabel('Birth year').selectOption(String(year - 5));
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('You must be at least 13 to create an account.')).toBeVisible();

  await page.getByLabel('Birth year').selectOption(String(year - 25));
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();

  for (const label of ['Email', 'Password', 'Display name', 'Handle']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await page.getByLabel('Display name', { exact: true }).fill('Lucia');
  await page.getByLabel('Handle', { exact: true }).fill('admin');
  await page.getByLabel('Email', { exact: true }).fill('not-an-email');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('That handle is reserved.')).toBeVisible();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Passwords need at least 8 characters.')).toBeVisible();
  await expect(page.getByLabel('Display name', { exact: true })).toHaveValue('Lucia');

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByLabel('Birth year')).toHaveValue(String(year - 25));
});

test('sign-in card has keep-me-signed-in, forgot password and a sign-up link', async ({ page }) => {
  await page.goto('/login/?next=https://evil.test');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign In');
  await expect(page.locator('input[name="next"]')).toHaveValue('/');
  await expect(page.getByLabel('Keep me signed in')).not.toBeChecked();
  await expect(page.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute('href', '/forgot-password/');
  await expect(page.getByRole('link', { name: 'Create a new account' })).toHaveAttribute('href', '/signup/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Enter your password.')).toBeVisible();
});

test('the site header links to sign in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Sign in or join' })).toHaveAttribute('href', '/login/');
});

test('forgot and reset password pages', async ({ page }) => {
  await page.goto('/forgot-password/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reset your password');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await page.goto('/reset-password/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This reset link has expired');
  await expect(page.getByRole('link', { name: 'Get a new link' })).toHaveAttribute('href', '/forgot-password/');
});

test('settings sidebar has Profile, Security and Social', async ({ page }) => {
  await page.goto('/settings/');
  await expect(page).toHaveURL(/\/settings\/profile\/$/);
  const nav = page.getByRole('navigation', { name: 'Account settings' });
  await expect(nav.getByRole('link')).toHaveText(['Profile', 'Security', 'Social', 'Preferences']);
  await expect(nav.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Security' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Security');
  await expect(nav.getByRole('link', { name: 'Security' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Social' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Social');
});

test('profile settings show the banner, editable detail rows and delete account', async ({ page }) => {
  await page.goto('/settings/profile/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lucia');
  await expect(page.getByText('Created on Jan 15, 2026')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change avatar' }).first()).toBeVisible();

  const details = page.getByRole('region', { name: 'Profile Details' });
  await expect(details.getByText('lucia@example.com')).toBeVisible();
  await expect(details.getByRole('link', { name: /Password/ })).toHaveAttribute('href', '/settings/security/');

  const handleRow = details.getByRole('button', { name: /Handle/ });
  await expect(handleRow).toHaveAttribute('aria-expanded', 'false');
  await handleRow.click();
  await expect(handleRow).toHaveAttribute('aria-expanded', 'true');
  await expect(details.getByLabel('Handle', { exact: true })).toHaveValue('lucia_vc');
  await details.getByRole('button', { name: 'Cancel' }).click();
  await expect(handleRow).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: 'Delete Account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
});

test('security settings offer password change and sign-out options', async ({ page }) => {
  await page.goto('/settings/security/');
  for (const label of ['Current password', 'New password', 'Confirm new password']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out everywhere' })).toBeVisible();
});

test('settings fit a 320px screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  for (const path of ['/settings/profile/', '/settings/security/', '/settings/social/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('unknown profiles and stories show the not-found screen', async ({ page }) => {
  for (const path of ['/u/nobody_here/', '/posts/not-a-real-story/']) {
    await page.goto(path);
    await expect(page.locator('[data-not-found]'), path).toBeVisible();
  }
});

test('crawlers get a real 404 status for unknown profiles and stories', async ({ request }) => {
  const headers = { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' };
  for (const path of ['/u/nobody_here/', '/posts/not-a-real-story/']) {
    const response = await request.get(path, { headers });
    expect(response.status(), path).toBe(404);
  }
});

test('expired email links that land on the home page reach the resend form', async ({ page }) => {
  await page.goto('/?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await expect(page).toHaveURL(/\/login\/\?error=link$/);
  await expect(page.getByText('That link has expired or was already used.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send new link' })).toBeVisible();
  await page.getByRole('button', { name: 'Send new link' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
});

test('auth codes that land on the home page are forwarded to the confirm route', async ({ request }) => {
  const response = await request.get('/?code=abc123', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()['location']).toMatch(/\/auth\/confirm\/\?code=abc123$/);
});
