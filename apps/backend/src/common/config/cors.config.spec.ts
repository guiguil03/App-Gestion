import { corsOptions } from '@/common/config/cors.config';

function callCallback(origin: string | undefined): Promise<boolean> {
  const options = corsOptions();
  const originFn = options.origin as (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void;
  return new Promise((resolve, reject) => {
    originFn(origin, (err, allow) => (err ? reject(err) : resolve(!!allow)));
  });
}

describe('corsOptions', () => {
  const originalEnv = process.env.CORS_ALLOWED_ORIGINS;

  afterEach(() => {
    process.env.CORS_ALLOWED_ORIGINS = originalEnv;
  });

  it('always allows requests with no Origin header (server-to-server, native clients)', async () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    await expect(callCallback(undefined)).resolves.toBe(true);
  });

  it('falls back to local dev origins when CORS_ALLOWED_ORIGINS is unset', async () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    await expect(callCallback('http://localhost:3001')).resolves.toBe(true);
    await expect(callCallback('https://evil.example.com')).resolves.toBe(false);
  });

  it('allows only origins listed in CORS_ALLOWED_ORIGINS when set', async () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com, https://admin.example.com';
    await expect(callCallback('https://app.example.com')).resolves.toBe(true);
    await expect(callCallback('https://admin.example.com')).resolves.toBe(true);
    await expect(callCallback('http://localhost:3001')).resolves.toBe(false);
  });
});
