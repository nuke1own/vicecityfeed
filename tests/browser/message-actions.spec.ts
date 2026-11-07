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
  // The mic button replaces Send once the chat has hydrated (or a block banner shows instead).
  if (path === CHAT) {
    const ready = page
      .getByRole('button', { name: 'Record a voice message' })
      .or(page.getByText(/You blocked @|You can't reply to this conversation/));
    await expect(ready.first()).toBeVisible({ timeout: 20_000 });
  }
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

test.describe('inbox and conversation extras', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });

  test('inbox shows unread counts, search filters it, and New message finds a member', async ({ page }) => {
    await open(page, '/social/messages/');
    await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible();
    await expect(page.getByText('1 unread conversation')).toBeVisible();
    const row = page.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /Lucia/ });
    await expect(row).toContainText('2 unread');

    await page.getByRole('searchbox', { name: 'Search conversations' }).fill('nobody');
    await expect(page.getByText('No conversations match “nobody”.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(row).toBeVisible();

    await page.getByRole('button', { name: 'New message' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New message' });
    await dialog.getByRole('searchbox', { name: 'Search people' }).fill('@luc');
    await dialog.getByRole('button', { name: /Lucia @lucia/ }).click();
    // Opens the existing one-to-one conversation (no duplicate is created).
    await expect(page).toHaveURL(new RegExp(`${CHAT}$`));
    expect((await state(page)).conversation_members.filter((m) => m.user_id === USERS.shelbys.id)).toHaveLength(1);
  });

  test('a "New messages" line marks where unread messages start, then the inbox is read', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('separator', { name: 'New messages' })).toBeVisible();
    await open(page, '/social/messages/');
    await expect(page.getByText('Private conversations with members')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /Lucia/ })).not.toContainText('unread');
    await open(page);
    await expect(page.getByRole('separator', { name: 'New messages' })).toHaveCount(0);
  });

  test('edit a message from the sheet: text changes, shows Edited, and is saved', async ({ page }) => {
    await open(page);
    await box(page).fill('See you at 8');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect.poll(async () => (await state(page)).messages.find((m) => m.body === 'See you at 8')?.id ?? '').not.toBe('');
    const id = (await state(page)).messages.find((m) => m.body === 'See you at 8')!.id;
    await open(page);
    await bubble(page, id).dispatchEvent('contextmenu');
    await sheet(page).getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByText('Editing message')).toBeVisible();
    await expect(box(page)).toHaveValue('See you at 8');
    await expect(page.getByRole('button', { name: 'Add photos' })).toHaveCount(0);
    await box(page).fill('See you at 9');
    await page.getByRole('button', { name: 'Save edit' }).click();
    await expect(page.locator(`[data-message-id="${id}"]`)).toContainText('See you at 9');
    await expect(page.locator(`[data-message-id="${id}"]`).getByText('· Edited')).toBeVisible();
    await expect.poll(async () => (await state(page)).messages.find((m) => m.id === id)?.body).toBe('See you at 9');
    // Others' messages cannot be edited.
    await bubble(page, FIRST).dispatchEvent('contextmenu');
    await expect(sheet(page).getByRole('button', { name: 'Edit' })).toHaveCount(0);
  });

  test('scrolling up loads earlier messages until the start of the conversation', async ({ page }) => {
    await page.request.post(`${MOCK}/__seed_messages?count=80`);
    await open(page);
    const rows = page.locator('[data-message-id]');
    await expect(rows).toHaveCount(50);
    await expect(page.getByText('This is the start of your conversation')).toHaveCount(0);
    for (let i = 0; i < 4 && (await rows.count()) < 82; i += 1) {
      await page.locator('.chat-list').evaluate((list) => list.scrollTo({ top: 0 }));
      await page.waitForTimeout(700);
    }
    await expect(rows).toHaveCount(82);
    await expect(page.getByText('Old message 1', { exact: true })).toBeAttached();
    await expect(page.getByText('This is the start of your conversation')).toBeVisible();
  });

  test('photo viewer zooms with double-tap and the zoom button', async ({ page }) => {
    await open(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect.poll(async () => (await state(page)).messages.filter((m) => m.attachments.length).length).toBe(1);
    await open(page);
    await page.getByRole('button', { name: 'View photo' }).click();
    const viewer = page.getByRole('dialog', { name: 'Image' });
    const stage = viewer.locator('[data-zoom]');
    await expect(stage).toHaveAttribute('data-zoom', '1.00');
    await viewer.getByRole('button', { name: 'Zoom in' }).click();
    await expect(stage).toHaveAttribute('data-zoom', '2.50');
    await viewer.getByRole('button', { name: 'Zoom out' }).click();
    await expect(stage).toHaveAttribute('data-zoom', '1.00');
    // Double tap zooms in at that spot, and again zooms back out.
    await touch(stage, []);
    await touch(stage, []);
    await expect(stage).toHaveAttribute('data-zoom', '2.50');
    await page.waitForTimeout(400);
    await touch(stage, []);
    await touch(stage, []);
    await expect(stage).toHaveAttribute('data-zoom', '1.00');
  });
});

test('desktop: the conversation list stays beside the open chat, and Up arrow edits your last message', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/social/messages/');
  await expect(page.getByText('Your messages')).toBeVisible();
  await page.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /Lucia/ }).click();
  await expect(page).toHaveURL(new RegExp(`${CHAT}$`));
  const sidebar = page.getByRole('complementary', { name: 'Conversations' });
  await expect(sidebar.getByRole('link', { name: /Lucia/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Back to messages' })).toBeHidden();

  await expect(page.getByRole('button', { name: 'Record a voice message' })).toBeVisible({ timeout: 20_000 });
  await box(page).fill('Meet at the pier');
  await box(page).press('Enter');
  await expect.poll(async () => (await state(page)).messages.map((m) => m.body)).toContain('Meet at the pier');
  await expect(page.getByText('Meet at the pier', { exact: true })).toBeVisible();
  // The list beside the chat updates too.
  await expect(sidebar.getByRole('link', { name: /Lucia/ })).toContainText('You: Meet at the pier');
  await box(page).press('ArrowUp');
  await expect(page.getByText('Editing message')).toBeVisible();
  await expect(box(page)).toHaveValue('Meet at the pier');
  await box(page).press('Escape');
  await expect(page.getByText('Editing message')).toHaveCount(0);
  await expect(box(page)).toHaveValue('');
});

test.describe('bug fixes', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });

  test('a message can be reacted to and unsent straight after sending (before any refresh)', async ({ page }) => {
    await open(page);
    // No refreshes from focus or the poll during this test.
    await page.evaluate(() => window.removeEventListener('focus', () => undefined));
    await box(page).fill('Oops wrong chat');
    await page.getByRole('button', { name: 'Send message' }).click();
    const row = page.getByRole('listitem').filter({ hasText: 'Oops wrong chat' });
    await expect(row.getByText('· Sent')).toBeVisible();
    const id = (await row.locator('[data-message-id]').getAttribute('data-message-id'))!;
    expect(id.startsWith('local-')).toBe(false);

    await row.locator('.message-body').dispatchEvent('contextmenu');
    await sheet(page).getByRole('button', { name: 'React with 😂' }).click();
    await expect(row.getByRole('button', { name: /Reactions: 😂 1/ })).toBeVisible();

    await row.locator('.message-body').dispatchEvent('contextmenu');
    await sheet(page).getByRole('button', { name: 'Unsend' }).click();
    await sheet(page).getByRole('button', { name: 'Tap again to unsend for everyone' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Oops wrong chat' })).toHaveCount(0);
    await expect.poll(async () => (await state(page)).messages.some((m) => m.id === id)).toBe(false);
    // Still gone after the next refresh.
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(1500);
    await expect(page.getByRole('listitem').filter({ hasText: 'Oops wrong chat' })).toHaveCount(0);
  });

  test('people search ignores commas and brackets instead of breaking', async ({ page }) => {
    await open(page, '/social/messages/');
    await page.getByRole('button', { name: 'New message' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New message' });
    await dialog.getByRole('searchbox', { name: 'Search people' }).fill('(lucia,');
    await expect(dialog.getByRole('button', { name: /Lucia @lucia/ })).toBeVisible();
    await dialog.getByRole('searchbox', { name: 'Search people' }).fill('x,id.neq.0');
    await expect(dialog.getByText('No members match “x,id.neq.0”.')).toBeVisible();
  });
});

/**
 * A stand-in for Supabase Realtime (the browser's WebSocket is intercepted):
 * joins succeed, and presence reports who is on the site / in this chat.
 */
async function fakeRealtime(page: Page, presence: { online?: string[]; inChat?: string[] }) {
  const sockets: { send: (frame: unknown[]) => void }[] = [];
  await page.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
    const send = (frame: unknown[]) => ws.send(JSON.stringify(frame));
    sockets.push({ send });
    ws.onMessage((raw) => {
      if (typeof raw !== 'string') return;
      let frame: unknown[];
      try {
        frame = JSON.parse(raw);
      } catch {
        return;
      }
      const [joinRef, ref, topic, event, payload] = frame as [string, string, string, string, { config?: { postgres_changes?: object[] } }];
      if (event === 'phx_join') {
        const changes = (payload?.config?.postgres_changes ?? []).map((change, i) => ({ ...change, id: i + 1 }));
        send([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: changes } }]);
        const ids = topic === 'realtime:online' ? presence.online ?? [] : topic.startsWith('realtime:dm:') ? presence.inChat ?? [] : [];
        const state = Object.fromEntries(ids.map((id) => [id, { metas: [{ phx_ref: `ref-${id}`, at: new Date().toISOString() }] }]));
        setTimeout(() => send([null, null, topic, 'presence_state', state]), 50);
      } else if (ref) {
        send([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]);
      }
    });
  });
  return {
    /** Sends a broadcast (e.g. typing) on the conversation channel. */
    broadcast: (event: string, payload: object) =>
      sockets.forEach((socket) => socket.send([null, null, `realtime:dm:${CONVERSATION}`, 'broadcast', { type: 'broadcast', event, payload }])),
  };
}

test.describe('presence, blocking and muting', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });

  test('"Active now" as soon as they have the site open, with a dot in the inbox', async ({ page }) => {
    await fakeRealtime(page, { online: [USERS.lucia.id] });
    await open(page);
    await expect(page.locator('header').getByText('Active now')).toBeVisible();
    await expect(page.locator('[data-in-chat]')).toHaveCount(0);
    await open(page, '/social/messages/');
    await expect(page.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /Lucia/ })).toContainText('Active now');
  });

  test('like Snapchat: their avatar shows in the chat while they have it open, and types', async ({ page }) => {
    const realtime = await fakeRealtime(page, { online: [USERS.lucia.id], inChat: [USERS.lucia.id] });
    await open(page);
    await expect(page.locator('header').getByText('In the chat')).toBeVisible();
    await expect(page.locator('[data-in-chat]')).toContainText('Lucia is in the chat');
    await expect(page.locator('[data-in-chat]').getByRole('img', { name: /Lucia/ })).toBeVisible();
    realtime.broadcast('typing', { userId: USERS.lucia.id });
    await expect(page.locator('header').getByText('typing…')).toBeVisible();
    await expect(page.locator('.typing-dots')).toBeVisible();
  });

  test('the avatar lines up with the bubble, not the time under it', async ({ page }) => {
    await open(page);
    const row = page.locator(`[data-message-id="${SECOND}"]`);
    const avatar = await row.locator('.message-avatar').boundingBox();
    const text = await row.locator('.message-text').boundingBox();
    expect(Math.abs(avatar!.y + avatar!.height - (text!.y + text!.height))).toBeLessThan(2);
  });

  test('block: the composer gives way, they cannot message or start a chat, and unblock restores it', async ({ page, context }) => {
    await fakeRealtime(page, { online: [USERS.lucia.id], inChat: [USERS.lucia.id] });
    await open(page);
    await page.getByRole('button', { name: 'Conversation options' }).click();
    const options = page.getByRole('dialog', { name: 'Conversation options' });
    await options.getByRole('button', { name: 'Block @lucia' }).click();
    await expect(options.getByText("They won't be able to message you")).toBeVisible();
    await options.getByRole('button', { name: 'Block', exact: true }).click();
    await expect(page.getByText('You blocked @lucia')).toBeVisible();
    await expect(box(page)).toHaveCount(0);
    // No activity either way while blocked.
    await expect(page.locator('header').getByText(/Active now|In the chat/)).toHaveCount(0);
    await expect.poll(async () => (await page.request.get(`${MOCK}/__state`).then((r) => r.json())).blocks).toEqual([
      expect.objectContaining({ blocker_id: USERS.shelbys.id, blocked_id: USERS.lucia.id }),
    ]);

    // Lucia's side: cannot reply, and cannot open a new chat either.
    await context.clearCookies();
    await signIn(context, 'lucia');
    await open(page);
    await expect(page.getByText("You can't reply to this conversation")).toBeVisible();
    await expect(box(page)).toHaveCount(0);
    await open(page, '/social/messages/');
    await expect(page.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /shelbys/ })).toContainText('Blocked');

    // Back as shelbys: unblock brings the message box back.
    await context.clearCookies();
    await signIn(context, 'shelbys');
    await open(page);
    await page.getByRole('button', { name: 'Unblock' }).click();
    await expect(box(page)).toBeVisible();
    await expect.poll(async () => (await page.request.get(`${MOCK}/__state`).then((r) => r.json())).blocks).toEqual([]);
  });

  test('mute: no unread badge, a muted icon, and it saves', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Conversation options' }).click();
    await page.getByRole('dialog', { name: 'Conversation options' }).getByRole('button', { name: 'Mute messages' }).click();
    await expect(page.getByRole('status')).toHaveText('Messages muted');
    await expect(page.locator('header').getByRole('img', { name: 'Muted' })).toBeVisible();
    await expect
      .poll(async () => (await state(page)).conversation_members.find((m) => m.user_id === USERS.shelbys.id) as unknown as { muted: boolean })
      .toMatchObject({ muted: true });
    await page.getByRole('button', { name: 'Conversation options' }).click();
    await expect(page.getByRole('dialog', { name: 'Conversation options' }).getByRole('button', { name: 'Unmute messages' })).toBeVisible();
  });

  test('delete chat: hidden for you until a new message, which then shows on its own', async ({ page, context }) => {
    await open(page);
    await page.getByRole('button', { name: 'Conversation options' }).click();
    const options = page.getByRole('dialog', { name: 'Conversation options' });
    await options.getByRole('button', { name: 'Delete chat' }).click();
    await expect(options.getByText('The messages disappear for you only.')).toBeVisible();
    await options.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page).toHaveURL(/\/social\/messages\/$/);
    await expect(page.getByText('No messages yet')).toBeVisible();

    // Lucia still has her copy, and writes again.
    await context.clearCookies();
    await signIn(context, 'lucia');
    await open(page);
    await expect(page.getByText('Did you see the new trailer?')).toBeVisible();
    await box(page).fill('Still there?');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect.poll(async () => (await state(page)).messages.map((m) => m.body)).toContain('Still there?');

    await context.clearCookies();
    await signIn(context, 'shelbys');
    await open(page, '/social/messages/');
    await expect(page.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /Lucia/ })).toContainText('Still there?');
    await open(page);
    const thread = page.getByRole('list', { name: 'Messages with Lucia' });
    await expect(thread.getByText('Still there?')).toBeVisible();
    await expect(thread.getByText('Did you see the new trailer?')).toHaveCount(0);
  });
});

/**
 * A tiny stand-in for Supabase Realtime shared by several pages: joins succeed
 * and broadcasts (WebSocket or REST httpSend) reach the other pages on the
 * same topic, like the real service.
 */
function realtimeBroker() {
  const sockets: { topics: Set<string>; send: (frame: unknown[]) => void }[] = [];
  const deliver = (from: object | null, topic: string, event: string, payload: unknown) => {
    for (const socket of sockets) {
      if (socket === from || !socket.topics.has(topic)) continue;
      socket.send([null, null, topic, 'broadcast', { type: 'broadcast', event, payload }]);
    }
  };
  const decode = (buffer: Buffer) => {
    // kind(3) | joinRef, ref, topic, event, meta lengths | encoding | strings | payload
    if (buffer[0] !== 3) return null;
    const [joinLen, refLen, topicLen, eventLen, metaLen] = [buffer[1], buffer[2], buffer[3], buffer[4], buffer[5]];
    let offset = 7 + joinLen + refLen;
    const topic = buffer.subarray(offset, offset + topicLen).toString();
    offset += topicLen;
    const event = buffer.subarray(offset, offset + eventLen).toString();
    offset += eventLen + metaLen;
    return { topic, event, payload: JSON.parse(buffer.subarray(offset).toString() || '{}') };
  };
  return {
    async attach(page: Page) {
      await page.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
        const socket = { topics: new Set<string>(), send: (frame: unknown[]) => ws.send(JSON.stringify(frame)) };
        sockets.push(socket);
        ws.onMessage((raw) => {
          if (typeof raw !== 'string') {
            const push = decode(Buffer.from(raw));
            if (push) deliver(socket, push.topic, push.event, push.payload);
            return;
          }
          const [joinRef, ref, topic, event, payload] = JSON.parse(raw) as [string, string, string, string, { config?: { postgres_changes?: object[] } }];
          if (event === 'phx_join') {
            socket.topics.add(topic);
            const changes = (payload?.config?.postgres_changes ?? []).map((change, i) => ({ ...change, id: i + 1 }));
            socket.send([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: changes } }]);
          } else if (event === 'phx_leave') {
            socket.topics.delete(topic);
          } else if (ref) {
            socket.send([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]);
          }
        });
      });
      await page.route('**/realtime/v1/api/broadcast/**', async (route) => {
        const match = new URL(route.request().url()).pathname.match(/\/broadcast\/([^/]+)\/events\/([^/]+)$/)!;
        deliver(null, `realtime:${decodeURIComponent(match[1])}`, decodeURIComponent(match[2]), route.request().postDataJSON());
        await route.fulfill({ status: 202, body: '' });
      });
    },
  };
}

/** Holds back a page's own refreshes, to prove something arrived live. */
async function slowRefreshes(page: Page, ms: number) {
  await page.route(/127\.0\.0\.1:3101\/.*/, async (route) => {
    const request = route.request();
    const headers = request.headers();
    // Page refreshes are GETs with the RSC header (server actions are POSTs).
    if (request.method() === 'GET' && (headers['rsc'] || headers['next-router-state-tree'])) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    await route.fallback();
  });
}

test.describe('instant delivery', () => {
  test('a message appears in their open chat the instant Send is tapped, and Seen comes straight back', async ({ browser }) => {
    const broker = realtimeBroker();
    const mine = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
    const theirs = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
    await signIn(mine, 'shelbys');
    await signIn(theirs, 'lucia');
    const me = await mine.newPage();
    const her = await theirs.newPage();
    await me.request.post(`${MOCK}/__reset`);
    await broker.attach(me);
    await broker.attach(her);
    await open(her);
    await open(me);
    await slowRefreshes(her, 8000);
    await slowRefreshes(me, 8000);

    await box(me).fill('Instant?');
    const sentAt = Date.now();
    await me.getByRole('button', { name: 'Send message' }).click();
    const arrived = her.getByRole('list', { name: 'Messages with shelbys' }).getByText('Instant?', { exact: true });
    await expect(arrived).toBeVisible({ timeout: 2000 });
    expect(Date.now() - sentAt).toBeLessThan(2000);
    // Her chat marked it read, and told me live.
    await expect(me.getByRole('listitem').filter({ hasText: 'Instant?' }).getByText('Seen')).toBeVisible({ timeout: 2000 });
    // The saved copy took over without a duplicate.
    await expect.poll(async () => (await state(me)).messages.filter((m) => m.body === 'Instant?').length).toBe(1);
    await expect(arrived).toHaveCount(1);

    // Reactions travel live too.
    await arrived.locator('xpath=ancestor::*[contains(@class,"message-body")]').dispatchEvent('contextmenu');
    await her.getByRole('dialog', { name: 'Message options' }).getByRole('button', { name: 'React with 🔥' }).click();
    await expect(me.getByRole('listitem').filter({ hasText: 'Instant?' }).getByRole('button', { name: /Reactions: 🔥 1/ })).toBeVisible({ timeout: 2000 });
    await mine.close();
    await theirs.close();
  });

  test('outside the chat: the inbox, unread badge and a banner update at once', async ({ browser }) => {
    const broker = realtimeBroker();
    const mine = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
    const theirs = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
    await signIn(mine, 'shelbys');
    await signIn(theirs, 'lucia');
    const me = await mine.newPage();
    const her = await theirs.newPage();
    await me.request.post(`${MOCK}/__reset`);
    await broker.attach(me);
    await broker.attach(her);
    await open(her, '/social/messages/');
    await open(me);
    await slowRefreshes(her, 8000);

    await box(me).fill('Check your inbox');
    await me.getByRole('button', { name: 'Send message' }).click();
    const row = her.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /shelbys/ });
    await expect(row).toContainText('Check your inbox', { timeout: 2000 });
    await expect(row).toContainText('1 unread');
    await expect(her.locator('[data-mobile-tab-bar]').getByRole('link', { name: /Messages, 1 unread/ })).toBeVisible({ timeout: 3000 });

    // On another page, a banner shows the message and opens the chat.
    await her.unroute(/127\.0\.0\.1:3101\/.*/);
    await open(her, '/social/');
    await box(me).fill('Over here');
    await me.getByRole('button', { name: 'Send message' }).click();
    const banner = her.locator('.dm-banner');
    await expect(banner).toContainText('Over here', { timeout: 2000 });
    await banner.getByRole('button', { name: /shelbys/ }).click();
    await expect(her).toHaveURL(new RegExp(`${CHAT}$`));
    await mine.close();
    await theirs.close();
  });
});
