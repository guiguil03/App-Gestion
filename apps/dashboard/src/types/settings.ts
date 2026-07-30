export type GeoPoint = { lat: number; lng: number };

export type AttendanceSettings = {
  geofenceCorners: GeoPoint[] | null;
  scanWindowStart: string | null;
  scanWindowEnd: string | null;
  attendanceReferenceTime: string;
  attendanceToleranceMinutes: number;
};

export type UpdateAttendanceSettingsInput = {
  geofenceCorners?: GeoPoint[] | null;
  scanWindowStart?: string | null;
  scanWindowEnd?: string | null;
  attendanceReferenceTime?: string;
  attendanceToleranceMinutes?: number;
};
