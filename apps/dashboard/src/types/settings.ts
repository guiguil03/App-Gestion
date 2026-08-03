export type AttendanceSettings = {
  scanWindowStart: string | null;
  scanWindowEnd: string | null;
  attendanceReferenceTime: string;
  attendanceToleranceMinutes: number;
};

export type UpdateAttendanceSettingsInput = {
  scanWindowStart?: string | null;
  scanWindowEnd?: string | null;
  attendanceReferenceTime?: string;
  attendanceToleranceMinutes?: number;
};
