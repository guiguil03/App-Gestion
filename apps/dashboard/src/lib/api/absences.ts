import { apiClient } from '@/lib/api/client';
import type { Absence, AbsencesPageParams, PaginatedAbsences } from '@/types/absences';

export type CreateAbsenceInput = {
  studentId: string;
  date: string;
  justified?: boolean;
  justificationReason?: string;
};

export const absencesApi = {
  list: async () => (await apiClient.get<Absence[]>('/absences')).data,
  // Déclaration à l'avance (ex. parent qui prévient par téléphone) — voir
  // AbsencesService.create côté backend.
  create: async (input: CreateAbsenceInput) => (await apiClient.post<Absence>('/absences', input)).data,
  listByStudent: async (studentId: string) =>
    (await apiClient.get<Absence[]>('/absences', { params: { studentId } })).data,
  listPaginated: async (params: AbsencesPageParams) =>
    (await apiClient.get<PaginatedAbsences>('/absences', { params })).data,
  justify: async (id: string, reason: string) => (await apiClient.patch<Absence>(`/absences/${id}/justify`, { reason })).data,
  justifyBulk: async (absenceIds: string[], reason: string) =>
    (await apiClient.patch<{ count: number }>('/absences/justify-bulk', { absenceIds, reason })).data,
};
