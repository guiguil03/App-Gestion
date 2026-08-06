import { resendConfigFromEnv, ResendEmailProvider } from '@/modules/notifications/providers/email-provider.resend';

const config = { apiKey: 'key-123', fromAddress: 'ecole@example.com' };

function mockFetch(response: { ok: boolean; status?: number }) {
  const fetchMock = jest.fn().mockResolvedValue(response);
  (global as any).fetch = fetchMock;
  return fetchMock;
}

describe('ResendEmailProvider.send', () => {
  it('posts to the Resend API with Bearer auth and the message payload', async () => {
    const fetchMock = mockFetch({ ok: true });
    const provider = new ResendEmailProvider(config);

    const result = await provider.send('direction@ecole.example', 'Rapport hebdomadaire', '<p>Bonjour</p>');

    expect(result).toEqual({ status: 'sent' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer key-123');
    expect(JSON.parse(init.body)).toEqual({
      from: 'ecole@example.com',
      to: 'direction@ecole.example',
      subject: 'Rapport hebdomadaire',
      html: '<p>Bonjour</p>',
    });
  });

  it('returns a failed status without throwing when Resend responds with a non-2xx status', async () => {
    mockFetch({ ok: false, status: 400 });
    const provider = new ResendEmailProvider(config);

    const result = await provider.send('direction@ecole.example', 'Sujet', '<p>Corps</p>');

    expect(result).toEqual({ status: 'failed' });
  });

  it('returns a failed status without throwing when the network request itself fails', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const provider = new ResendEmailProvider(config);

    const result = await provider.send('direction@ecole.example', 'Sujet', '<p>Corps</p>');

    expect(result).toEqual({ status: 'failed' });
  });
});

describe('resendConfigFromEnv', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null when either env var is missing', () => {
    process.env = { ...originalEnv, RESEND_API_KEY: 'key', RESEND_FROM_EMAIL: '' };
    expect(resendConfigFromEnv()).toBeNull();
  });

  it('returns a config object when both env vars are set', () => {
    process.env = { ...originalEnv, RESEND_API_KEY: 'key', RESEND_FROM_EMAIL: 'ecole@example.com' };
    expect(resendConfigFromEnv()).toEqual({ apiKey: 'key', fromAddress: 'ecole@example.com' });
  });
});
