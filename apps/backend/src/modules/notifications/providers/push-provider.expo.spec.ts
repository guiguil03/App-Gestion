import { ExpoPushProvider } from '@/modules/notifications/providers/push-provider.expo';

function mockFetch(response: { ok: boolean; status?: number }) {
  const fetchMock = jest.fn().mockResolvedValue(response);
  (global as any).fetch = fetchMock;
  return fetchMock;
}

describe('ExpoPushProvider.send', () => {
  it('posts the token, title and body to the Expo push API', async () => {
    const fetchMock = mockFetch({ ok: true });
    const provider = new ExpoPushProvider();

    const result = await provider.send('ExponentPushToken[xxx]', 'Absence', 'Votre enfant est absent');

    expect(result).toEqual({ status: 'sent' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(JSON.parse(init.body)).toEqual({
      to: 'ExponentPushToken[xxx]',
      title: 'Absence',
      body: 'Votre enfant est absent',
    });
  });

  it('returns a failed status without throwing when Expo responds with a non-2xx status', async () => {
    mockFetch({ ok: false, status: 400 });
    const provider = new ExpoPushProvider();

    const result = await provider.send('token', 'Titre', 'Corps');

    expect(result).toEqual({ status: 'failed' });
  });

  it('propagates the failure when the network request itself fails (caught by NotificationsService at the call site)', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const provider = new ExpoPushProvider();

    await expect(provider.send('token', 'Titre', 'Corps')).rejects.toThrow('network down');
  });
});
