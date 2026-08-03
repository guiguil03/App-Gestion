// apps/mobile/src/features/absences/hooks/useAbsences.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

export type Absence = {
  id: string;
  date: string;
  justified: boolean;
  justificationReason: string | null;
  student: { id: string; firstName: string; lastName: string; schoolClassId: string };
};

export type PaginatedAbsences = { items: Absence[]; total: number; page: number; pageSize: number };

export type AbsencesPageParams = {
  schoolClassId?: string;
  search?: string;
  justified?: boolean;
  page: number;
  pageSize: number;
};

/** Liste paginée + recherche — miroir de la page Absences du dashboard (DIRECTION/ADMIN). */
export function useAbsencesPaginated(params: AbsencesPageParams) {
  return useQuery({
    queryKey: ['absences', 'paginated', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedAbsences>('/absences', { params });
      return data;
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useJustifyAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await apiClient.patch(`/absences/${id}/justify`, { reason });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['absences'] });
    },
  });
}

export function useJustifyAbsencesBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ absenceIds, reason }: { absenceIds: string[]; reason: string }) => {
      const { data } = await apiClient.patch('/absences/justify-bulk', { absenceIds, reason });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['absences'] });
    },
  });
}
