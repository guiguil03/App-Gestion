import { apiClient } from '@/lib/api/client';
import type { ManualAttendanceInput, PresenceListParams, PresenceRecord } from '@/types/attendance';

export const attendanceApi = {
  listForDay: async (params: PresenceListParams) =>
    (await apiClient.get<PresenceRecord[]>('/attendance', { params })).data,
  recordManual: async (studentId: string, input: ManualAttendanceInput) =>
    (await apiClient.post(`/attendance/${studentId}`, input)).data,
};
