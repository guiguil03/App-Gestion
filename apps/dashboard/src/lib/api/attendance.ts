import { apiClient } from '@/lib/api/client';
import type { ManualAttendanceInput, PresenceListParams, PresenceRecord } from '@/types/attendance';

export const attendanceApi = {
  listForDay: async (params: PresenceListParams) =>
    (await apiClient.get<PresenceRecord[]>('/attendance', { params })).data,
  recordManual: async (studentId: string, input: ManualAttendanceInput) =>
    (await apiClient.post(`/attendance/${studentId}`, input)).data,
  // Réservé aux pointages saisis manuellement (isManual) — voir
  // AttendanceService.remove/update côté backend, qui refusent un vrai scan.
  removeRecord: async (id: string) => (await apiClient.delete(`/attendance/${id}`)).data,
  updateRecord: async (id: string, input: ManualAttendanceInput) =>
    (await apiClient.patch(`/attendance/${id}`, input)).data,
};
