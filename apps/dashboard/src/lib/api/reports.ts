import { apiClient } from '@/lib/api/client';
import type {
  AttendanceHistoryEntry,
  AttendanceHistoryParams,
  AttendanceSummaryParams,
  StudentAttendanceSummary,
} from '@/types/reports';

export const reportsApi = {
  attendanceSummary: async (params: AttendanceSummaryParams) =>
    (await apiClient.get<StudentAttendanceSummary[]>('/reports/attendance-summary', { params })).data,
  attendanceHistory: async (params: AttendanceHistoryParams) =>
    (await apiClient.get<AttendanceHistoryEntry[]>('/reports/history', { params })).data,
};
