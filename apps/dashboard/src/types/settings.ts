export type AttendanceSettings = {
  scanWindowStart: string | null;
  scanWindowEnd: string | null;
  attendanceReferenceTime: string;
  attendanceToleranceMinutes: number;
  // Jours de la semaine fermés (0=dimanche ... 6=samedi), tableau vide =
  // ouvert 7j/7.
  closedWeekdays: number[];
  // Seuil d'absences consécutives à partir duquel un élève remonte dans les
  // alertes du dashboard. `null` = alertes désactivées.
  consecutiveAbsenceAlertThreshold: number | null;
};

export type UpdateAttendanceSettingsInput = {
  scanWindowStart?: string | null;
  scanWindowEnd?: string | null;
  attendanceReferenceTime?: string;
  attendanceToleranceMinutes?: number;
  closedWeekdays?: number[];
  consecutiveAbsenceAlertThreshold?: number | null;
};
