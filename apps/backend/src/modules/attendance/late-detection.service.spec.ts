import { LateDetectionService } from '@/modules/attendance/late-detection.service';

describe('LateDetectionService.isLate', () => {
  const service = new LateDetectionService();

  it('is not late exactly at the deadline (reference time + tolerance)', () => {
    const recordedAt = new Date('2026-01-15T08:10:00');
    expect(service.isLate('08:00', 10, recordedAt)).toBe(false);
  });

  it('is late one minute after the deadline', () => {
    const recordedAt = new Date('2026-01-15T08:11:00');
    expect(service.isLate('08:00', 10, recordedAt)).toBe(true);
  });

  it('is not late before the deadline', () => {
    const recordedAt = new Date('2026-01-15T08:05:00');
    expect(service.isLate('08:00', 10, recordedAt)).toBe(false);
  });

  it('evaluates the deadline on the same calendar day as the scan, regardless of server timezone/date', () => {
    const recordedAt = new Date('2026-03-20T07:59:00');
    expect(service.isLate('08:00', 0, recordedAt)).toBe(false);
  });
});
