import { isWithinScanWindow } from '@/modules/attendance/geofence';

describe('isWithinScanWindow', () => {
  it('returns true when now is inside the window', () => {
    expect(isWithinScanWindow('06:00', '18:00', new Date('2026-07-15T10:00:00'))).toBe(true);
  });

  it('returns false when now is before the window', () => {
    expect(isWithinScanWindow('06:00', '18:00', new Date('2026-07-15T05:00:00'))).toBe(false);
  });

  it('returns false when now is after the window', () => {
    expect(isWithinScanWindow('06:00', '18:00', new Date('2026-07-15T19:00:00'))).toBe(false);
  });
});
