import { apiClient } from '@/lib/api/client';
import type { ManualAttendanceInput } from '@/types/attendance';

export const attendanceApi = {
  recordManual: async (studentId: string, input: ManualAttendanceInput) =>
    (await apiClient.post(`/attendance/${studentId}`, input)).data,
};
