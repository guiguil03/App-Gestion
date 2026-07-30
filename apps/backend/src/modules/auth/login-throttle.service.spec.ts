import { LoginThrottleService } from '@/modules/auth/login-throttle.service';

describe('LoginThrottleService', () => {
  it('allows up to the attempt limit, then locks out', () => {
    const throttle = new LoginThrottleService();

    for (let i = 0; i < 5; i++) {
      expect(() => throttle.assertNotLocked('user-a')).not.toThrow();
      throttle.registerFailure('user-a');
    }

    expect(() => throttle.assertNotLocked('user-a')).toThrow('Trop de tentatives');
  });

  it('tracks each username independently', () => {
    const throttle = new LoginThrottleService();

    for (let i = 0; i < 5; i++) throttle.registerFailure('user-a');
    expect(() => throttle.assertNotLocked('user-a')).toThrow();
    expect(() => throttle.assertNotLocked('user-b')).not.toThrow();
  });

  it('clears the lockout on reset', () => {
    const throttle = new LoginThrottleService();

    for (let i = 0; i < 5; i++) throttle.registerFailure('user-a');
    expect(() => throttle.assertNotLocked('user-a')).toThrow();

    throttle.reset('user-a');

    expect(() => throttle.assertNotLocked('user-a')).not.toThrow();
  });

  it('expires the window after the configured duration', () => {
    const throttle = new LoginThrottleService();
    const realNow = Date.now;

    try {
      let now = 1_000_000;
      Date.now = () => now;

      for (let i = 0; i < 5; i++) throttle.registerFailure('user-a');
      expect(() => throttle.assertNotLocked('user-a')).toThrow();

      now += 16 * 60 * 1000; // > 15 min window
      expect(() => throttle.assertNotLocked('user-a')).not.toThrow();
    } finally {
      Date.now = realNow;
    }
  });
});
