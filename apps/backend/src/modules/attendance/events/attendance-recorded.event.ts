export const ATTENDANCE_RECORDED_EVENT = 'attendance.recorded';

export class AttendanceRecordedEvent {
  constructor(
    public readonly attendanceRecordId: string,
    public readonly studentId: string,
    public readonly schoolId: string,
    public readonly isLate: boolean,
    public readonly recordedAt: Date,
  ) {}
}
