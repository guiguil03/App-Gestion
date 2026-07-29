import { apiClient } from '@/lib/api/client';
import type { AttendanceSummaryParams, StudentAttendanceSummary } from '@/types/reports';

export const reportsApi = {
  attendanceSummary: async (params: AttendanceSummaryParams) =>
    (await apiClient.get<StudentAttendanceSummary[]>('/reports/attendance-summary', { params })).data,
};
