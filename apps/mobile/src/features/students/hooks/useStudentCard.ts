import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { apiClient } from '@/api/client';

export type StudentCard = {
  card: { id: string; studentId: string; issuedAt: string; revoked: boolean };
  qrCode: string;
};

async function fetchActiveCard(studentId: string): Promise<StudentCard | null> {
  try {
    const { data } = await apiClient.get<StudentCard>(`/cards/${studentId}`);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/** Carte active de l'élève, ou `null` s'il n'en a pas (encore) — jamais d'erreur pour ce cas. */
export function useStudentCard(studentId: string | null) {
  return useQuery({
    queryKey: ['students', 'card', studentId],
    queryFn: () => fetchActiveCard(studentId as string),
    enabled: !!studentId,
  });
}

/** Émet une nouvelle carte — révoque automatiquement l'ancienne côté backend (perte/vol/renouvellement). */
export function useIssueStudentCard(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<StudentCard>(`/cards/${studentId}/issue`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'card', studentId] });
    },
  });
}
