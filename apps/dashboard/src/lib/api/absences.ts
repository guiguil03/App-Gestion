import { apiClient } from '@/lib/api/client';
import type { Absence } from '@/types/absences';

export const absencesApi = {
  list: async () => (await apiClient.get<Absence[]>('/absences')).data,
  listByStudent: async (studentId: string) =>
    (await apiClient.get<Absence[]>('/absences', { params: { studentId } })).data,
  justify: async (id: string, reason: string) => (await apiClient.patch<Absence>(`/absences/${id}/justify`, { reason })).data,
};
