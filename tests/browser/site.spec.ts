import { test, expect } from '@playwright/test';
test('mobile home, search focus trap, and canonical', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('searchbox', {name:'Search Vice City Feed'})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button',{name:'Close search'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.goto('/album/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/album\/$/);
});
test('preview editing supports undo and redo and cannot claim publication', async ({page}) => {
  await page.goto('/admin/write/?preview=layout');
  const title = page.getByLabel('Title', {exact:true});
  await title.fill('Test story');
  await expect(title).toHaveValue('Test story');
  await title.press('Control+z');
  await expect(title).toHaveValue('');
  await title.press('Control+Shift+z');
  await expect(title).toHaveValue('Test story');
  await page.getByRole('button',{name:'Publish',exact:true}).click();
  await expect(page.getByRole('alert').first()).toContainText('Preview only');
  await expect(page.locator('[data-admin-success]')).toHaveCount(0);
});
for (const width of [320, 390, 768]) {
  test(`navigation and search fit ${width}px touch screens`, async ({page}) => {
    await page.setViewportSize({width, height:740});
    await page.goto('/');
    const search = page.getByRole('button',{name:'Search',exact:true});
    if (width < 640) {
      const box = await search.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const album = page.getByRole('navigation',{name:'Secondary'}).getByRole('link',{name:'Album'});
    await album.click();
    await expect(album).toHaveAttribute('aria-current','page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await search.click();
    const input = page.locator('#site-search');
    await input.fill('test');
    await page.setViewportSize({width,height:380});
    const dialog = page.getByRole('dialog');
    const box = await dialog.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(380);
    await dialog.getByRole('button',{name:'Clear search query'}).click();
    await expect(input).toHaveValue('');
    await dialog.getByRole('button',{name:'Close search'}).click();
    await expect(dialog).not.toBeVisible();
    await expect(search).toBeFocused();
  });
}
