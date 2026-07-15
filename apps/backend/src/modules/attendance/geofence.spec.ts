import { isWithinGeofence, isWithinScanWindow } from '@/modules/attendance/geofence';

const SQUARE = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 10 },
  { lat: 10, lng: 10 },
  { lat: 10, lng: 0 },
];

describe('isWithinGeofence', () => {
  it('returns true for a point inside the polygon', () => {
    expect(isWithinGeofence(SQUARE, { lat: 5, lng: 5 })).toBe(true);
  });

  it('returns false for a point outside the polygon', () => {
    expect(isWithinGeofence(SQUARE, { lat: 50, lng: 50 })).toBe(false);
  });

  it('returns false when fewer than 3 corners are configured', () => {
    expect(isWithinGeofence([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }], { lat: 0.5, lng: 0.5 })).toBe(false);
  });
});

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
