import { test, expect, type BrowserContext, type Locator, type Page } from '@playwright/test';

// End-to-end checks of direct messages against the in-memory Supabase
// stand-in (tests/mock-supabase/server.mjs). Real server actions run; the
// database rules themselves are tested against Postgres separately.
const MOCK = 'http://127.0.0.1:54321';
const USERS = {
  shelbys: { id: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'shelbys@example.com' },
  lucia: { id: 'bbbbbbbb-0000-4000-8000-000000000002', email: 'lucia@example.com' },
};
const CONVERSATION = 'eeeeeeee-0000-4000-8000-000000000001';
const CHAT = `/social/messages/${CONVERSATION}/`;
const FIRST = 'ffffffff-0000-4000-8000-000000000001';
const SECOND = 'ffffffff-0000-4000-8000-000000000002';

type Message = {
  id: string;
  body: string;
  sender_id: string;
  reply_to: string | null;
  attachments: { kind: string; path: string; width?: number; duration_ms?: number; peaks?: number[] }[];
};
type State = {
  messages: Message[];
  message_reactions: { message_id: string; user_id: string; emoji: string }[];
  conversation_members: { conversation_id: string; user_id: string; last_read_at: string }[];
  storage: Record<string, { size: number; type: string; owner: string }>;
  storage_cleanup: string[];
};

// A real 64x40 PNG (solid colour).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAoCAIAAADBrGu+AAAAV0lEQVR4nO3PUQkAIBTAwBfJiDbXEH4cwmABbnP2+rrhgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAseu81H1vFKJBfUAAAAAElFTkSuQmCC',
  'base64',
);

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

async function open(page: Page, path = CHAT) {
  await page.goto(path);
  await expect(page.locator('html[data-ready="true"]')).toBeAttached({ timeout: 20_000 });
  // The mic button replaces Send once the chat has hydrated in the browser.
  if (path === CHAT) await expect(page.getByRole('button', { name: 'Record a voice message' })).toBeVisible({ timeout: 20_000 });
}

const bubble = (page: Page, id: string) => page.locator(`[data-message-id="${id}"] .message-body`);
const box = (page: Page) => page.getByRole('textbox', { name: /^Message / });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Message options' });

/** Touch gestures as phones send them (pointer events with pointerType "touch"). */
async function touch(target: Locator, moves: { dx: number; dy?: number; wait?: number }[]) {
  const rect = (await target.boundingBox())!;
  const x = rect.x + 24;
  const y = rect.y + rect.height / 2;
  const init = (dx: number, dy = 0) => ({ pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true, clientX: x + dx, clientY: y + dy, buttons: 1 });
  await target.dispatchEvent('pointerdown', init(0));
  let last = { dx: 0, dy: 0 };
  for (const move of moves) {
    if (move.wait) await target.page().waitForTimeout(move.wait);
    if (move.dx || move.dy) {
      last = { dx: move.dx, dy: move.dy ?? 0 };
      await target.dispatchEvent('pointermove', init(last.dx, last.dy));
    }
  }
  await target.dispatchEvent('pointerup', { ...init(last.dx, last.dy), buttons: 0 });
}

test.beforeEach(async ({ context, page }) => {
  await page.request.post(`${MOCK}/__reset`);
  await context.grantPermissions(['clipboard-read', 'clipboard-write', 'microphone']);
  await signIn(context, 'shelbys');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });

  test('the conversation is full screen and a text message appears at once, is saved and marks the chat read', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Lucia' })).toBeVisible();
    await expect(page.locator('header.header-bar')).toBeHidden();
    await expect(page.locator('[data-mobile-tab-bar]')).toBeHidden();
    const screen = await page.locator('.chat-screen').boundingBox();
    expect(screen).toMatchObject({ x: 0, y: 0, width: 393 });
    expect(Math.round(screen!.height)).toBe(852);

    // Opening it marked Lucia's messages read.
    await expect.poll(async () => (await state(page)).conversation_members.find((m) => m.user_id === USERS.shelbys.id)!.last_read_at > new Date(Date.now() - 60_000).toISOString()).toBe(true);

    // Links in messages are tappable.
    await expect(bubble(page, SECOND).getByRole('link', { name: 'https://www.rockstargames.com/VI' })).toHaveAttribute('target', '_blank');

    await box(page).fill('That beach drive though 🌴');
    // Enter adds a line on phones instead of sending.
    await box(page).press('Enter');
    await expect(box(page)).toHaveValue('That beach drive though 🌴\n');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(box(page)).toHaveValue('');
    const mine = page.getByRole('listitem').filter({ hasText: 'That beach drive though' });
    await expect(mine).toBeVisible();
    await expect(mine.getByText('· Sent')).toBeVisible();
    await expect.poll(async () => (await state(page)).messages.map((m) => m.body)).toContain('That beach drive though 🌴');

    // Emoji-only messages show large, without a bubble.
    await box(page).fill('🔥🔥');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('p.text-\\[2\\.75rem\\]', { hasText: '🔥🔥' })).toBeVisible();
  });

  test('photos: preview, caption, private upload, shown from a signed link, open in the viewer', async ({ page }) => {
    await open(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'sunset.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByRole('list', { name: 'Photos to send' }).getByRole('img')).toHaveCount(1);
    await expect(box(page)).toHaveAttribute('placeholder', 'Add a caption…');
    await box(page).fill('Ocean Drive tonight');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('list', { name: 'Photos to send' })).toHaveCount(0);

    await expect.poll(async () => (await state(page)).messages.find((m) => m.body === 'Ocean Drive tonight')?.attachments.length).toBe(1);
    const saved = (await state(page)).messages.find((m) => m.body === 'Ocean Drive tonight')!;
    expect(saved.attachments[0]).toMatchObject({ kind: 'image', width: 64 });
    expect(saved.attachments[0].path.startsWith(`${CONVERSATION}/`)).toBe(true);
    expect((await state(page)).storage[`message-media/${saved.attachments[0].path}`]).toMatchObject({ owner: USERS.shelbys.id });

    // After a reload it comes from a private signed link, and really loads.
    await open(page);
    const photo = page.locator(`[data-message-id="${saved.id}"]`).getByRole('img', { name: 'Photo from @shelbys' });
    await expect(photo).toHaveAttribute('src', /\/storage\/v1\/object\/sign\/message-media\/.+token=/);
    await expect.poll(() => photo.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(64);
    // Live refreshes sign new links; the page keeps the first one so the photo does not reload.
    const src = await photo.getAttribute('src');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(2500);
    await expect(photo).toHaveAttribute('src', src!);
    await page.locator(`[data-message-id="${saved.id}"]`).getByRole('button', { name: 'View photo' }).click();
    await expect(page.getByRole('dialog', { name: 'Image' }).getByRole('img', { name: 'Photo from @shelbys' })).toBeVisible();
  });

  test('swipe right to reply: quote banner, saved reply, and the quote jumps to the original', async ({ page }) => {
    await open(page);
    await touch(bubble(page, FIRST), [{ dx: 20 }, { dx: 50 }, { dx: 80 }]);
    await expect(page.getByText('Replying to Lucia')).toBeVisible();
    await expect(box(page)).toBeFocused();
    await box(page).fill('Yes! Twice already');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect.poll(async () => (await state(page)).messages.find((m) => m.body === 'Yes! Twice already')?.reply_to).toBe(FIRST);
    await expect(page.getByText('Replying to Lucia')).toHaveCount(0);

    const quote = page.getByRole('button', { name: /You replied to Lucia/ });
    await expect(quote).toContainText('Did you see the new trailer?');
    await quote.click();
    await expect(page.locator(`[data-message-id="${FIRST}"] .message-flash`)).toBeVisible();

    // A vertical drag is a scroll, not a reply.
    await touch(bubble(page, SECOND), [{ dx: 4, dy: 30 }, { dx: 6, dy: 60 }]);
    await expect(page.getByText('Replying to Lucia')).toHaveCount(0);
  });

  test('long-press opens the action sheet: react, change and remove a reaction; double-tap hearts', async ({ page }) => {
    await open(page);
    await touch(bubble(page, FIRST), [{ dx: 0, wait: 650 }]);
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).getByText('Lucia:')).toBeVisible();
    // Others' messages can be replied to and copied, not unsent.
    await expect(sheet(page).getByRole('button', { name: 'Unsend' })).toHaveCount(0);
    await sheet(page).getByRole('button', { name: 'React with 🔥' }).click();
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.locator(`[data-message-id="${FIRST}"]`).getByRole('button', { name: /Reactions: 🔥 1/ })).toBeVisible();
    await expect.poll(async () => (await state(page)).message_reactions).toEqual([
      expect.objectContaining({ message_id: FIRST, user_id: USERS.shelbys.id, emoji: '🔥' }),
    ]);

    // Double-tap switches it to a heart (one reaction per person).
    await touch(bubble(page, FIRST), []);
    await touch(bubble(page, FIRST), []);
    await expect.poll(async () => (await state(page)).message_reactions.map((r) => r.emoji)).toEqual(['❤️']);

    // Tapping the reactions opens the sheet; tapping the selected one removes it.
    await page.locator(`[data-message-id="${FIRST}"]`).getByRole('button', { name: /Reactions:/ }).click();
    await sheet(page).getByRole('button', { name: 'Remove ❤️ reaction' }).click();
    await expect.poll(async () => (await state(page)).message_reactions).toEqual([]);
    await expect(page.locator(`[data-message-id="${FIRST}"]`).getByRole('button', { name: /Reactions:/ })).toHaveCount(0);
  });

  test('unsend asks for a second tap, then deletes the message and its photo from storage', async ({ page }) => {
    await open(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect.poll(async () => (await state(page)).messages.filter((m) => m.attachments.length).length).toBe(1);
    const sent = (await state(page)).messages.find((m) => m.attachments.length)!;
    expect(Object.keys((await state(page)).storage)).toHaveLength(1);
    await open(page);

    await page.locator(`[data-message-id="${sent.id}"] .message-body`).dispatchEvent('contextmenu');
    const unsend = sheet(page).getByRole('button', { name: 'Unsend' });
    await unsend.click();
    await expect(sheet(page).getByRole('button', { name: 'Tap again to unsend for everyone' })).toBeVisible();
    expect((await state(page)).messages.some((m) => m.id === sent.id)).toBe(true);
    await sheet(page).getByRole('button', { name: 'Tap again to unsend for everyone' }).click();

    await expect(page.locator(`[data-message-id="${sent.id}"]`)).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText('Message unsent');
    await expect.poll(async () => (await state(page)).messages.some((m) => m.id === sent.id)).toBe(false);
    const after = await state(page);
    expect(after.storage).toEqual({});
    expect(after.storage_cleanup).toEqual([]);
  });

  test('voice message: record with a live meter, send, saved privately with its waveform, and a player', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Record a voice message' }).click();
    await expect(page.getByText(/Recording/)).toBeAttached();
    await expect(page.getByRole('button', { name: 'Delete recording' })).toBeVisible();
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: 'Send voice message' }).click();

    await expect.poll(async () => (await state(page)).messages.find((m) => m.attachments[0]?.kind === 'audio')?.attachments[0].duration_ms ?? 0).toBeGreaterThan(1000);
    const voice = (await state(page)).messages.find((m) => m.attachments[0]?.kind === 'audio')!;
    expect(voice.body).toBe('');
    expect(voice.attachments[0].peaks!.length).toBe(40);
    expect(voice.attachments[0].path).toMatch(new RegExp(`^${CONVERSATION}/[0-9a-f-]{36}\\.(m4a|webm|ogg)$`));
    expect((await state(page)).storage[`message-media/${voice.attachments[0].path}`].type).toMatch(/^audio\//);

    await open(page);
    const player = page.locator(`[data-message-id="${voice.id}"] [data-voice-message]`);
    await expect(player.getByRole('button', { name: 'Play voice message' })).toBeVisible();
    await expect(player.getByRole('slider', { name: 'Voice message position' })).toBeVisible();
    await player.getByRole('button', { name: 'Playback speed 1x' }).click();
    await expect(player.getByRole('button', { name: 'Playback speed 1.5x' })).toBeVisible();

    // Cancelling a recording sends nothing.
    await page.getByRole('button', { name: 'Record a voice message' }).click();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Delete recording' }).click();
    await page.waitForTimeout(800);
    expect((await state(page)).messages.filter((m) => m.attachments[0]?.kind === 'audio')).toHaveLength(1);
  });

  test('emoji picker inserts at the cursor and remembers recent picks', async ({ page }) => {
    await open(page);
    await box(page).fill('GTA  soon');
    await box(page).evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(4, 4));
    await page.getByRole('button', { name: 'Add emoji' }).click();
    const picker = page.getByRole('dialog', { name: 'Emoji' });
    await picker.getByRole('tab', { name: 'Vice City' }).click();
    await picker.getByRole('button', { name: '🌴' }).click();
    await expect(box(page)).toHaveValue('GTA 🌴 soon');
    await page.keyboard.press('Escape');
    await expect(picker).toHaveCount(0);
    await page.getByRole('button', { name: 'Add emoji' }).click();
    await expect(picker.getByRole('tab', { name: 'Recent' })).toHaveAttribute('aria-selected', 'true');
    await expect(picker.getByRole('tabpanel').getByRole('button', { name: '🌴' })).toBeVisible();
  });
});

test('desktop: Enter sends, hover actions reply, and the inbox previews photos and voice messages', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  await expect(page.locator('header.header-bar')).toBeVisible();
  await box(page).fill('Sent with Enter');
  await box(page).press('Enter');
  await expect.poll(async () => (await state(page)).messages.map((m) => m.body)).toContain('Sent with Enter');

  await page.locator(`[data-message-id="${SECOND}"]`).hover();
  await page.locator(`[data-message-id="${SECOND}"]`).getByRole('button', { name: 'Reply to this message' }).click();
  await expect(page.getByText('Replying to Lucia')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel reply' }).click();
  await expect(page.getByText('Replying to Lucia')).toHaveCount(0);

  await page.locator('input[type="file"]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect.poll(async () => (await state(page)).messages.filter((m) => m.attachments.length).length).toBe(1);

  await open(page, '/social/messages/');
  await expect(page.getByRole('link', { name: /Lucia/ })).toContainText('You: 📷 Photo');
});
