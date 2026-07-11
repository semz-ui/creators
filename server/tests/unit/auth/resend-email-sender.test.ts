import { ResendEmailSender } from '@modules/auth/infrastructure/resend-email-sender';

const CONFIG = { apiKey: 're_test_key', from: 'Reelo <no-reply@reelo.app>' };
const EMAIL = { to: 'a@b.com', resetUrl: 'http://localhost:3000/reset-password?token=tok-1' };

function mockFetch(init: { ok?: boolean; status?: number; body?: string } = {}) {
  const fn = jest.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: 'OK',
    text: async () => init.body ?? '',
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => jest.restoreAllMocks());

describe('ResendEmailSender', () => {
  it('posts the reset email to the Resend API', async () => {
    const fetchMock = mockFetch();

    await new ResendEmailSender(CONFIG).sendPasswordResetEmail(EMAIL);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
    });
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe(CONFIG.from);
    expect(body.to).toEqual(['a@b.com']);
    expect(body.subject).toMatch(/reset/i);
    expect(body.html).toContain(EMAIL.resetUrl);
    expect(body.text).toContain(EMAIL.resetUrl);
  });

  it('rejects with the HTTP status when the API answers non-2xx', async () => {
    mockFetch({ ok: false, status: 422, body: 'invalid from address' });

    await expect(new ResendEmailSender(CONFIG).sendPasswordResetEmail(EMAIL)).rejects.toThrow(
      /HTTP 422.*invalid from address/,
    );
  });
});
