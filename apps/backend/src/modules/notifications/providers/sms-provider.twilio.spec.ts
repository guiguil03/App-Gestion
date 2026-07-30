import { TwilioSmsProvider, twilioConfigFromEnv } from '@/modules/notifications/providers/sms-provider.twilio';

const config = { accountSid: 'AC123', authToken: 'secret', fromNumber: '+15550001111' };

function mockFetch(response: { ok: boolean; status?: number; json: () => Promise<unknown> }) {
  const fetchMock = jest.fn().mockResolvedValue(response);
  (global as any).fetch = fetchMock;
  return fetchMock;
}

describe('TwilioSmsProvider.send', () => {
  it('posts to the Twilio Messages API with Basic Auth', async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ sid: 'SM123' }) });
    const provider = new TwilioSmsProvider(config);

    const result = await provider.send('+242060000000', 'Bonjour');

    expect(result).toEqual({ status: 'sent', providerId: 'SM123' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('AC123:secret').toString('base64')}`);
  });

  it('strips whitespace from the destination number before sending', async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ sid: 'SM123' }) });
    const provider = new TwilioSmsProvider(config);

    await provider.send('+242 06 000 0000', 'Bonjour');

    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get('To')).toBe('+242060000000');
  });

  it('returns a failed status without throwing when Twilio responds with a non-2xx status', async () => {
    mockFetch({ ok: false, status: 400, json: async () => ({ message: 'Invalid number' }) });
    const provider = new TwilioSmsProvider(config);

    const result = await provider.send('+242060000000', 'Bonjour');

    expect(result).toEqual({ status: 'failed' });
  });

  it('returns a failed status without throwing when the network request itself fails', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const provider = new TwilioSmsProvider(config);

    const result = await provider.send('+242060000000', 'Bonjour');

    expect(result).toEqual({ status: 'failed' });
  });
});

describe('twilioConfigFromEnv', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null when any of the three Twilio env vars is missing', () => {
    process.env = { ...originalEnv, TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: '', TWILIO_FROM_NUMBER: '+1' };
    expect(twilioConfigFromEnv()).toBeNull();
  });

  it('returns a config object when all three env vars are set', () => {
    process.env = { ...originalEnv, TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 'secret', TWILIO_FROM_NUMBER: '+15550001111' };
    expect(twilioConfigFromEnv()).toEqual({ accountSid: 'AC1', authToken: 'secret', fromNumber: '+15550001111' });
  });
});
