// apps/mobile/src/features/reports/hooks/useReports.ts
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

export type ReportStudentRef = {
  id: string;
  lastName: string;
  middleName: string | null;
  firstName: string;
  schoolClass: { id: string; name: string; promotion: string };
};

export type AttendanceHistoryStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export type AttendanceHistoryEntry = {
  student: ReportStudentRef;
  date: string;
  status: AttendanceHistoryStatus;
  justified: boolean | null;
  justificationReason: string | null;
  recordedAt: string | null;
};

export type StudentAttendanceSummary = {
  student: ReportStudentRef;
  presencesCount: number;
  lateCount: number;
  absencesJustifiedCount: number;
  absencesUnjustifiedCount: number;
};

/** Historique jour par jour de tous les enfants du parent connecté, sur une période — voir /reports/my-children (scopé côté backend, aucun id à fournir). */
export function useMyChildrenHistory(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', 'my-children', startDate, endDate],
    queryFn: async () => {
      const { data } = await apiClient.get<AttendanceHistoryEntry[]>('/reports/my-children', {
        params: { startDate, endDate },
      });
      return data;
    },
  });
}

/** Résumé présences/retards/absences par élève, sur une période — DIRECTION/ADMIN uniquement. */
export function useAttendanceSummary(schoolClassId: string | null, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', 'attendance-summary', schoolClassId, startDate, endDate],
    queryFn: async () => {
      const { data } = await apiClient.get<StudentAttendanceSummary[]>('/reports/attendance-summary', {
        params: { startDate, endDate, schoolClassId: schoolClassId ?? undefined },
      });
      return data;
    },
  });
}
