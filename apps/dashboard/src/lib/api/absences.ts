import { apiClient } from '@/lib/api/client';
import type { Absence, AbsencesPageParams, PaginatedAbsences } from '@/types/absences';

export const absencesApi = {
  list: async () => (await apiClient.get<Absence[]>('/absences')).data,
  listByStudent: async (studentId: string) =>
    (await apiClient.get<Absence[]>('/absences', { params: { studentId } })).data,
  listPaginated: async (params: AbsencesPageParams) =>
    (await apiClient.get<PaginatedAbsences>('/absences', { params })).data,
  justify: async (id: string, reason: string) => (await apiClient.patch<Absence>(`/absences/${id}/justify`, { reason })).data,
};
