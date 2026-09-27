import { expect, test, type Page } from '@playwright/test';

import { ok } from './support/envelope';
import { routeSession, user } from './support/session';

const BASE = '**/api/v1/agent/conversations';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  toolCalls: { id: string; name: string; input: Record<string, unknown> }[];
  toolResults: { toolUseId: string; content: string; isError: boolean }[];
}

const conversation = (messages: Message[], pendingAction: unknown = null) => ({
  id: 'conv-1',
  title: 'make a neon city clip',
  messages,
  pendingAction,
  createdAt: '2026-07-31T10:00:00.000Z',
  updatedAt: '2026-07-31T10:00:00.000Z',
});

const afterGenerate = conversation([
  { role: 'user', text: 'make a neon city clip', toolCalls: [], toolResults: [] },
  {
    role: 'assistant',
    text: '',
    toolCalls: [{ id: 'call-1', name: 'generate_video', input: { durationSeconds: 15 } }],
    toolResults: [],
  },
  {
    role: 'user',
    text: '',
    toolCalls: [],
    toolResults: [
      {
        toolUseId: 'call-1',
        content: '{"video":{"id":"vid-1","status":"processing"}}',
        isError: false,
      },
    ],
  },
  { role: 'assistant', text: 'Your video is generating now.', toolCalls: [], toolResults: [] },
]);

const awaitingApproval = conversation(
  [
    ...afterGenerate.messages,
    { role: 'user', text: 'post it to tiktok', toolCalls: [], toolResults: [] },
    {
      role: 'assistant',
      text: '',
      toolCalls: [
        { id: 'call-9', name: 'publish_video', input: { videoId: 'vid-1', platforms: ['tiktok'] } },
      ],
      toolResults: [],
    },
  ],
  {
    toolUseId: 'call-9',
    toolName: 'publish_video',
    input: { videoId: 'vid-1', platforms: ['tiktok'] },
    summary: 'Publish video vid-1 to tiktok',
  },
);

const afterApproval = conversation([
  ...awaitingApproval.messages,
  {
    role: 'user',
    text: '',
    toolCalls: [],
    toolResults: [
      {
        toolUseId: 'call-9',
        content: '{"publication":{"id":"pub-1","videoId":"vid-1","status":"completed"}}',
        isError: false,
      },
    ],
  },
  { role: 'assistant', text: 'Posted to TikTok.', toolCalls: [], toolResults: [] },
]);

const json = (data: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: ok(data),
});

/**
 * The history rail's list call. Matched by regex because it carries a query
 * string, which the glob patterns used for the other routes don't cover.
 */
async function routeHistory(page: Page, items: unknown[] = []) {
  await page.route(/\/api\/v1\/agent\/conversations\?/, (route) =>
    route.fulfill(json({ items, page: 1, limit: 30, total: items.length })),
  );
}

/**
 * The transcript says vid-1 was still generating, so the card in the chat
 * chases it. Answering with the finished video is what makes it play inline.
 */
async function routeGeneratedVideo(page: Page) {
  await page.route(/\/api\/v1\/videos\/vid-1$/, (route) =>
    route.fulfill(
      json({
        id: 'vid-1',
        source: 'generated',
        title: null,
        prompt: 'neon city clip',
        durationSeconds: 15,
        status: 'ready',
        resultUrl: 'https://cdn.example/vid-1.mp4',
        error: null,
        musicTrackId: null,
        narrationText: null,
        narrationVoice: null,
        createdAt: '2026-07-31T10:00:00.000Z',
        updatedAt: '2026-07-31T10:01:00.000Z',
      }),
    ),
  );
}

/** Signs in without a stored preference, so the chooser is shown. */
async function loginFresh(page: Page) {
  await routeSession(page);
  await page.route(/\/api\/v1\/videos(\?|$)/, (route) =>
    route.fulfill(json({ items: [], page: 1, limit: 6, total: 0 })),
  );
  await routeGeneratedVideo(page);

  await page.goto('/login');
  await page.getByLabel(/^email$/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/choose$/);
}

test('chooses the assistant, generates a video, and approves the post', async ({ page }) => {
  await page.route(BASE, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill(json(afterGenerate, 201))
      : route.fallback(),
  );
  await page.route(`${BASE}/conv-1/messages`, (route) => route.fulfill(json(awaitingApproval)));
  await page.route(`${BASE}/conv-1/actions/call-9`, (route) => route.fulfill(json(afterApproval)));
  await page.route(`${BASE}/conv-1`, (route) => route.fulfill(json(afterGenerate)));
  await routeHistory(page, [afterGenerate]);

  await loginFresh(page);

  await page.getByRole('button', { name: /assistant/i }).click();
  await expect(page).toHaveURL(/\/agent$/);

  // First turn — the agent calls a tool and reports back.
  await page.getByLabel(/^message$/i).fill('make a neon city clip');
  await page.getByRole('button', { name: /^send$/i }).click();

  await expect(page).toHaveURL(/\/agent\/conv-1$/);
  await expect(page.getByText('Started generating a video')).toBeVisible();
  await expect(page.getByText('Your video is generating now.')).toBeVisible();

  // The video plays in the chat itself — the card polled until it was ready.
  // Exact: the rail's per-chat menu button is labelled with the chat's title,
  // which contains this prompt.
  const player = page.getByLabel('neon city clip', { exact: true });
  await expect(player).toHaveAttribute('src', 'https://cdn.example/vid-1.mp4');
  await expect(page.getByRole('link', { name: /publish/i })).toHaveAttribute(
    'href',
    '/videos/vid-1/publish',
  );

  // Second turn — publishing pauses for confirmation.
  await page.getByLabel(/^message$/i).fill('post it to tiktok');
  await page.getByRole('button', { name: /^send$/i }).click();

  await expect(page.getByText('Publish video vid-1 to tiktok')).toBeVisible();
  await expect(page.getByLabel(/^message$/i)).toBeDisabled();

  await page.getByRole('button', { name: /approve/i }).click();

  await expect(page.getByText('Posted to TikTok.')).toBeVisible();
  await expect(page.getByText('Publish video vid-1 to tiktok')).toBeHidden();
  await expect(page.getByLabel(/^message$/i)).toBeEnabled();
});

test('rejecting the request leaves nothing published', async ({ page }) => {
  const afterRejection = conversation([
    ...awaitingApproval.messages,
    {
      role: 'user',
      text: '',
      toolCalls: [],
      toolResults: [
        { toolUseId: 'call-9', content: 'The user declined this action.', isError: true },
      ],
    },
    { role: 'assistant', text: 'No problem — nothing was posted.', toolCalls: [], toolResults: [] },
  ]);

  let publishCalled = false;
  await page.route(BASE, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill(json(awaitingApproval, 201))
      : route.fallback(),
  );
  await page.route(`${BASE}/conv-1/actions/call-9`, async (route) => {
    publishCalled = true;
    return route.fulfill(json(afterRejection));
  });
  await page.route(`${BASE}/conv-1`, (route) => route.fulfill(json(awaitingApproval)));
  await routeHistory(page, [awaitingApproval]);

  await loginFresh(page);
  await page.getByRole('button', { name: /assistant/i }).click();

  await page.getByLabel(/^message$/i).fill('post it to tiktok');
  await page.getByRole('button', { name: /^send$/i }).click();

  await expect(page.getByText('Publish video vid-1 to tiktok')).toBeVisible();
  await page.getByRole('button', { name: /reject/i }).click();

  await expect(page.getByText('No problem — nothing was posted.')).toBeVisible();
  expect(publishCalled).toBe(true);
});

test('resumes an earlier conversation from the history rail', async ({ page }) => {
  const earlier = { ...afterGenerate, id: 'conv-2', title: 'sunset promo' };

  await page.route(`${BASE}/conv-1`, (route) => route.fulfill(json(afterGenerate)));
  await page.route(`${BASE}/conv-2`, (route) => route.fulfill(json(earlier)));
  await routeHistory(page, [afterGenerate, earlier]);

  await loginFresh(page);
  await page.getByRole('button', { name: /assistant/i }).click();

  const rail = page.getByRole('navigation', { name: /conversations/i });
  await expect(rail.getByRole('link', { name: 'make a neon city clip' })).toBeVisible();

  await rail.getByRole('link', { name: 'sunset promo' }).click();

  await expect(page).toHaveURL(/\/agent\/conv-2$/);
  await expect(page.getByText('Your video is generating now.')).toBeVisible();
  await expect(rail.getByRole('link', { name: 'sunset promo' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('deletes the open conversation from the rail and leaves it', async ({ page }) => {
  const earlier = { ...afterGenerate, id: 'conv-2', title: 'sunset promo' };
  let items: unknown[] = [afterGenerate, earlier];
  let deleted: string | null = null;

  await page.route(`${BASE}/conv-1`, (route) => {
    if (route.request().method() !== 'DELETE') return route.fulfill(json(afterGenerate));
    deleted = 'conv-1';
    items = [earlier];
    return route.fulfill({ status: 204, body: '' });
  });
  await page.route(`${BASE}/conv-2`, (route) => route.fulfill(json(earlier)));
  // Served from `items` so the rail reflects the delete when it refetches.
  await page.route(/\/api\/v1\/agent\/conversations\?/, (route) =>
    route.fulfill(json({ items, page: 1, limit: 30, total: items.length })),
  );

  await loginFresh(page);
  await page.getByRole('button', { name: /assistant/i }).click();

  const rail = page.getByRole('navigation', { name: /conversations/i });
  await rail.getByRole('link', { name: 'make a neon city clip' }).click();
  await expect(page).toHaveURL(/\/agent\/conv-1$/);

  await page.getByRole('button', { name: /options for make a neon city clip/i }).click();
  await page.getByRole('menuitem', { name: /^delete chat$/i }).click();

  // Asking is not doing — the request only goes out after the confirm.
  expect(deleted).toBeNull();
  await page.getByRole('menuitem', { name: /yes, delete it/i }).click();

  await expect.poll(() => deleted).toBe('conv-1');
  // The chat it was showing is gone, so the page cannot stay on it.
  await expect(page).toHaveURL(/\/agent$/);
  await expect(rail.getByRole('link', { name: 'make a neon city clip' })).toBeHidden();
  await expect(rail.getByRole('link', { name: 'sunset promo' })).toBeVisible();
});

test('the mode switch moves between experiences and is remembered', async ({ page }) => {
  await page.route(`${BASE}/conv-1`, (route) => route.fulfill(json(afterGenerate)));
  await routeHistory(page);

  await loginFresh(page);
  await page.getByRole('button', { name: /assistant/i }).click();
  await expect(page).toHaveURL(/\/agent$/);

  await page.getByRole('tab', { name: /studio/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // The switch updated the stored preference, so a reload of the app root
  // sends this user to the studio rather than back to the chooser.
  await page.goto('/login');
  await page.getByLabel(/^email$/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
