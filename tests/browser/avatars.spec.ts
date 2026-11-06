import { test, expect } from '@playwright/test';

const AVATARS = ['Jason & Lucia', 'Lucia', 'Cal Hampton', 'Boobie Ike', "Dre'Quan Priest", 'Real Dimez', 'Raul Bautista', 'Brian Heder'];

test('the avatar picker offers only the preset avatars, with no upload', async ({ page }) => {
  await page.goto('/settings/profile/');
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Change avatar' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Choose your avatar' });
  await expect(dialog).toBeVisible();
  for (const name of AVATARS) await expect(dialog.getByRole('radio', { name, exact: true })).toBeAttached();
  await expect(dialog.getByRole('radio')).toHaveCount(AVATARS.length + 1); // + "No avatar"

  const save = dialog.getByRole('button', { name: 'Save avatar' });
  await expect(save).toBeDisabled();
  await dialog.getByText('Cal Hampton').click();
  await expect(dialog.getByRole('radio', { name: 'Cal Hampton' })).toBeChecked();
  await expect(save).toBeEnabled();

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
});

test('avatar images are served from our own site', async ({ page, request }) => {
  for (const id of ['jason-and-lucia', 'lucia', 'cal-hampton', 'boobie-ike', 'drequan-priest', 'real-dimez', 'raul-bautista', 'brian-heder']) {
    const response = await request.get(`/avatars/${id}.webp`);
    expect(response.status(), id).toBe(200);
    expect(response.headers()['content-type']).toContain('image/webp');
  }
  await page.goto('/settings/profile/');
  await page.getByRole('button', { name: 'Change avatar' }).first().click();
  const img = page.getByRole('dialog').locator('img').first();
  await expect(img).toHaveAttribute('src', /\/_next\/image\/?\?url=%2Favatars%2F/);
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
});
