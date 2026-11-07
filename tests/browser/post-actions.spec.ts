import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// End-to-end checks of every post option against the in-memory Supabase
// stand-in (tests/mock-supabase/server.mjs). Real server actions run.
const MOCK = 'http://127.0.0.1:54321';
const USERS = {
  shelbys: { id: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'shelbys@example.com' },
  lucia: { id: 'bbbbbbbb-0000-4000-8000-000000000002', email: 'lucia@example.com' },
};
const LUCIA_POST = 'dddddddd-0000-4000-8000-000000000001';
const OWN_POST = 'dddddddd-0000-4000-8000-000000000002';

type State = {
  community_posts: { id: string; body: string; reply_to: string | null; author_id: string }[];
  post_images: { post_id: string; url: string; alt: string; width: number | null; height: number | null }[];
  polls: { post_id: string; options: string[]; ends_at: string }[];
  poll_votes: { post_id: string; user_id: string; option_index: number }[];
  storage: Record<string, { size: number; type: string }>;
  storage_cleanup: string[];
  post_reactions: { post_id: string; user_id: string; reaction: string }[];
  post_reports: { post_id: string; reporter_id: string; reason: string }[];
};

test.describe.configure({ mode: 'serial', timeout: 90_000 });

async function signIn(context: BrowserContext, user: keyof typeof USERS) {
  const { id, email } = USERS[user];
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 86_400;
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, exp, role: 'authenticated', aud: 'authenticated' })}.sig`;
  const session = {
    access_token: token,
    token_type: 'bearer',
    expires_in: 86_400,
    expires_at: exp,
    refresh_token: 'refresh',
    user: { id, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() },
  };
  await context.addCookies([
    { name: 'sb-127-auth-token', value: `base64-${b64(session)}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' },
  ]);
}

async function state(page: Page): Promise<State> {
  return (await page.request.get(`${MOCK}/__state`)).json();
}

const post = (page: Page, text: string) => page.getByRole('article').filter({ hasText: text });

/** Open a page and wait until it is interactive and the posts are shown. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('html[data-ready="true"]')).toBeAttached({ timeout: 20_000 });
}

test.beforeEach(async ({ context, page }) => {
  await page.request.post(`${MOCK}/__reset`);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await signIn(context, 'shelbys');
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('the options menu opens above the bookmark and share buttons', async ({ page }) => {
  await open(page, '/social/');
  const own = post(page, 'Hi');
  await own.getByRole('button', { name: /More options/ }).click();
  const menu = page.getByRole('menu', { name: 'Post options' });
  await expect(menu).toBeVisible();
  // Whatever is on top at the bookmark button's position must be the menu.
  const box = await own.getByRole('button', { name: 'Bookmark' }).boundingBox();
  const topmost = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return Boolean(el?.closest('[role="menu"]'));
  }, [box!.x + box!.width / 2, box!.y + box!.height / 2]);
  expect(topmost).toBe(true);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await own.getByRole('button', { name: /More options/ }).click();
  await page.mouse.click(5, 400);
  await expect(menu).toBeHidden();
});

test('own posts offer Copy link and Delete; others offer Copy link and Report', async ({ page }) => {
  await open(page, '/social/');
  await post(page, 'Hi').getByRole('button', { name: /More options/ }).click();
  await expect(page.getByRole('menuitem')).toHaveText(['Copy link', 'Delete post']);
  await page.keyboard.press('Escape');
  await post(page, 'Hello from Lucia').getByRole('button', { name: /More options/ }).click();
  await expect(page.getByRole('menuitem')).toHaveText(['Copy link', 'Report as spam', 'Report as harassment', 'Report as misinformation']);
});

test('Copy link copies the post URL', async ({ page }) => {
  await open(page, '/social/');
  await post(page, 'Hello from Lucia').getByRole('button', { name: /More options/ }).click();
  await page.getByRole('menuitem', { name: 'Copy link' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://127.0.0.1:3101/social/post/${LUCIA_POST}/`);
});

test('Share copies the link on desktop', async ({ page }) => {
  await open(page, '/social/');
  await post(page, 'Hello from Lucia').getByRole('button', { name: 'Share post' }).click();
  await expect(page.getByText('Link copied')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/social/post/${LUCIA_POST}/`);
});

test('Like and unlike update the count and are saved', async ({ page }) => {
  await open(page, '/social/');
  const target = post(page, 'Hello from Lucia');
  await target.getByRole('button', { name: 'Like, 0 likes' }).click();
  await expect(target.getByRole('button', { name: 'Unlike, 1 like' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await state(page)).post_reactions.filter((r) => r.reaction === 'like').length).toBe(1);

  await page.reload();
  await expect(page.locator('html[data-ready="true"]')).toBeAttached({ timeout: 20_000 });
  await expect(post(page, 'Hello from Lucia').getByRole('button', { name: 'Unlike, 1 like' })).toBeVisible();

  await post(page, 'Hello from Lucia').getByRole('button', { name: 'Unlike, 1 like' }).click();
  await expect(post(page, 'Hello from Lucia').getByRole('button', { name: 'Like, 0 likes' })).toBeVisible();
  await expect.poll(async () => (await state(page)).post_reactions.length).toBe(0);
});

test('Bookmark saves the post to Bookmarks and can be removed', async ({ page }) => {
  await open(page, '/social/');
  await post(page, 'Hello from Lucia').getByRole('button', { name: 'Bookmark' }).click();
  await expect(post(page, 'Hello from Lucia').getByRole('button', { name: 'Remove bookmark' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await state(page)).post_reactions.filter((r) => r.reaction === 'bookmark').length).toBe(1);

  await open(page, '/social/bookmarks/');
  await expect(post(page, 'Hello from Lucia')).toBeVisible();
  await post(page, 'Hello from Lucia').getByRole('button', { name: 'Remove bookmark' }).click();
  await expect(page.getByText('Save posts for later')).toBeVisible();
  expect((await state(page)).post_reactions).toHaveLength(0);
});

test('Delete removes your own post', async ({ page }) => {
  await open(page, '/social/');
  page.once('dialog', (dialog) => void dialog.accept());
  await post(page, 'Hi').getByRole('button', { name: /More options/ }).click();
  await page.getByRole('menuitem', { name: 'Delete post' }).click();
  await expect(post(page, 'Hi')).toHaveCount(0);
  expect((await state(page)).community_posts.map((p) => p.id)).not.toContain(OWN_POST);
});

test('Cancelling delete keeps the post', async ({ page }) => {
  await open(page, '/social/');
  page.once('dialog', (dialog) => void dialog.dismiss());
  await post(page, 'Hi').getByRole('button', { name: /More options/ }).click();
  await page.getByRole('menuitem', { name: 'Delete post' }).click();
  await expect(post(page, 'Hi')).toBeVisible();
  expect((await state(page)).community_posts.map((p) => p.id)).toContain(OWN_POST);
});

test('Report sends a report once', async ({ page }) => {
  await open(page, '/social/');
  await post(page, 'Hello from Lucia').getByRole('button', { name: /More options/ }).click();
  await page.getByRole('menuitem', { name: 'Report as spam' }).click();
  await expect(page.getByText('Thanks. Our team will review it.')).toBeVisible();
  const reports = (await state(page)).post_reports;
  expect(reports).toEqual([expect.objectContaining({ post_id: LUCIA_POST, reporter_id: USERS.shelbys.id, reason: 'spam' })]);
});

test('Posting from the composer adds the post to the top', async ({ page }) => {
  await open(page, '/social/');
  const box = page.locator('#compose').getByRole('textbox', { name: 'Write a post' });
  await box.fill('Leonida here I come');
  await page.locator('#compose').getByRole('button', { name: '#GTA6' }).click();
  await expect(box).toHaveValue('Leonida here I come #GTA6 ');
  await page.locator('#compose').getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByRole('article').first()).toContainText('Leonida here I come');
  await expect(box).toHaveValue('');
  expect((await state(page)).community_posts.some((p) => p.body === 'Leonida here I come #GTA6' && p.author_id === USERS.shelbys.id)).toBe(true);
});

test('Replying from a thread adds the reply and the count', async ({ page }) => {
  await open(page, `/social/post/${LUCIA_POST}/`);
  await page.locator('#reply').getByRole('textbox').fill('Same here');
  await page.locator('#reply').getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Replies' }).getByRole('article')).toContainText('Same here');
  await open(page, '/social/');
  await expect(post(page, 'Hello from Lucia').getByRole('link', { name: 'Reply, 1 reply' })).toBeVisible();
  expect((await state(page)).community_posts.find((p) => p.body === 'Same here')?.reply_to).toBe(LUCIA_POST);
});

test('Over-long posts cannot be sent', async ({ page }) => {
  await open(page, '/social/');
  await page.locator('#compose').getByRole('textbox', { name: 'Write a post' }).fill('x'.repeat(281));
  await expect(page.locator('#compose').getByRole('button', { name: 'Post', exact: true })).toBeDisabled();
});

// A real 64x40 PNG (solid colour), generated once.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAoCAIAAADBrGu+AAAAV0lEQVR4nO3PUQkAIBTAwBfJiDbXEH4cwmABbnP2+rrhgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAseu81H1vFKJBfUAAAAAElFTkSuQmCC',
  'base64',
);

test('Posting with an image uploads it to our storage with its description', async ({ page }) => {
  await open(page, '/social/');
  const compose = page.locator('#compose');
  await compose.getByRole('textbox', { name: 'Write a post' }).fill('Look at this sunset');
  await compose.locator('input[type="file"]').setInputFiles({ name: 'sunset.png', mimeType: 'image/png', buffer: PNG });
  const description = compose.getByRole('textbox', { name: 'Describe image 1' });
  await expect(description).toBeVisible();
  await description.fill('Orange sunset over Ocean Drive');
  await expect(compose.getByRole('button', { name: 'Add a poll' })).toBeDisabled();
  await compose.getByRole('button', { name: 'Post', exact: true }).click();

  const card = post(page, 'Look at this sunset');
  await expect(card.getByRole('img', { name: 'Orange sunset over Ocean Drive' })).toBeVisible();
  const saved = await state(page);
  expect(saved.post_images).toEqual([expect.objectContaining({ alt: 'Orange sunset over Ocean Drive', width: 64, height: 40 })]);
  expect(saved.post_images[0].url).toContain('/storage/v1/object/public/post-images/' + USERS.shelbys.id + '/');
  expect(Object.keys(saved.storage)).toHaveLength(1);
  await expect(compose.getByRole('list', { name: 'Attached images' })).toHaveCount(0);

  // Clicking the image opens it here on the site, not the raw file URL.
  const startUrl = page.url();
  await card.getByRole('button', { name: 'View image' }).click();
  const viewer = page.getByRole('dialog', { name: 'Image' });
  await expect(viewer.getByRole('img', { name: 'Orange sunset over Ocean Drive' })).toBeVisible();
  expect(page.url()).toBe(startUrl);
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'View image' })).toBeFocused();
});

test('Creating a poll, then another member votes once and sees results', async ({ page, context }) => {
  await open(page, '/social/');
  const compose = page.locator('#compose');
  await compose.getByRole('textbox', { name: 'Write a post' }).fill('Who are you playing first?');
  await compose.getByRole('button', { name: 'Add a poll' }).click();
  await compose.getByRole('textbox', { name: 'Choice 1' }).fill('Jason');
  await compose.getByRole('textbox', { name: 'Choice 2' }).fill('Lucia');
  await compose.getByRole('button', { name: 'Add a choice' }).click();
  await compose.getByRole('combobox', { name: 'Poll length' }).selectOption('3');
  await expect(compose.getByRole('button', { name: 'Add images' })).toBeDisabled();
  await compose.getByRole('button', { name: 'Post', exact: true }).click();

  const card = post(page, 'Who are you playing first?');
  // The author sees results straight away (0 votes).
  await expect(card.getByText('0 votes · 3 days left')).toBeVisible();
  const saved = await state(page);
  expect(saved.polls).toEqual([expect.objectContaining({ options: ['Jason', 'Lucia'] })]);
  const days = (new Date(saved.polls[0].ends_at).getTime() - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(2.9);
  expect(days).toBeLessThan(3.1);

  // Lucia votes.
  await context.clearCookies();
  await signIn(context, 'lucia');
  await open(page, '/social/');
  const theirs = post(page, 'Who are you playing first?');
  await theirs.getByRole('button', { name: 'Lucia', exact: true }).click();
  await expect(theirs.getByText('1 vote · 3 days left')).toBeVisible();
  await expect(theirs.getByLabel('Your vote')).toBeVisible();
  await expect(theirs.getByRole('button', { name: 'Jason', exact: true })).toHaveCount(0);
  await expect.poll(async () => (await state(page)).poll_votes).toEqual([{ post_id: saved.polls[0].post_id, user_id: USERS.lucia.id, option_index: 1 }]);

  await page.reload();
  await expect(post(page, 'Who are you playing first?').getByText('1 vote · 3 days left')).toBeVisible({ timeout: 20_000 });
  await expect(post(page, 'Who are you playing first?').getByText('100%')).toBeVisible();
});

test('Polls need two choices before posting works', async ({ page }) => {
  await open(page, '/social/');
  const compose = page.locator('#compose');
  await compose.getByRole('textbox', { name: 'Write a post' }).fill('Quick poll');
  await compose.getByRole('button', { name: 'Add a poll' }).click();
  await compose.getByRole('textbox', { name: 'Choice 1' }).fill('Only one');
  await compose.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(compose.getByRole('alert')).toHaveText('Fill in every poll choice.');
  expect((await state(page)).polls).toHaveLength(0);
});

test('Deleting a post removes everything: replies, likes, poll, images and the image files', async ({ page, context }) => {
  await open(page, '/social/');
  const compose = page.locator('#compose');
  await compose.getByRole('textbox', { name: 'Write a post' }).fill('Temporary post');
  await compose.locator('input[type="file"]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
  await compose.getByRole('textbox', { name: 'Describe image 1' }).fill('A test image');
  await compose.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(post(page, 'Temporary post').getByRole('img', { name: 'A test image' })).toBeVisible();
  const postId = (await state(page)).community_posts.find((p) => p.body === 'Temporary post')!.id;

  // Lucia likes, bookmarks and replies to it.
  await context.clearCookies();
  await signIn(context, 'lucia');
  await open(page, `/social/post/${postId}/`);
  await page.locator('#reply').getByRole('textbox').fill('Nice one');
  await page.locator('#reply').getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Replies' }).getByRole('article')).toContainText('Nice one');
  const focus = page.getByRole('article').filter({ hasText: 'Temporary post' });
  await focus.getByRole('button', { name: /^Like/ }).click();
  await focus.getByRole('button', { name: 'Bookmark' }).click();
  await expect.poll(async () => (await state(page)).post_reactions.length).toBe(2);

  // The author deletes it.
  await context.clearCookies();
  await signIn(context, 'shelbys');
  await open(page, '/social/');
  page.once('dialog', (dialog) => void dialog.accept());
  await post(page, 'Temporary post').getByRole('button', { name: /More options/ }).click();
  await page.getByRole('menuitem', { name: 'Delete post' }).click();
  await expect(post(page, 'Temporary post')).toHaveCount(0);

  const after = await state(page);
  expect(after.community_posts.some((p) => p.id === postId || p.reply_to === postId)).toBe(false);
  expect(after.post_reactions.filter((r) => r.post_id === postId)).toEqual([]);
  expect(after.post_images).toEqual([]);
  expect(after.storage).toEqual({});
  expect(after.storage_cleanup).toEqual([]);
});
