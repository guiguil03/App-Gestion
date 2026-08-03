import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { apiClient } from '@/api/client';
import { readCache, writeCache } from '@/services/offlineCache';

const MY_CARD_CACHE_KEY = 'students.card.me';

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

// Comme `fetchMyStudent` (useStudents.ts) : la carte doit rester affichable
// hors ligne. Un 404 est un état légitime ("pas encore de carte émise", pas
// un problème réseau) — seule une vraie panne réseau retente le cache local.
async function fetchMyCard(): Promise<StudentCard | null> {
  try {
    const { data } = await apiClient.get<StudentCard>('/cards/me');
    void writeCache(MY_CARD_CACHE_KEY, data);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    const cached = await readCache<StudentCard>(MY_CARD_CACHE_KEY);
    if (cached) return cached;
    throw error;
  }
}

/** Carte active de l'élève actuellement connecté (rôle ELEVE). */
export function useMyStudentCard() {
  return useQuery({
    queryKey: ['students', 'card', 'me'],
    queryFn: fetchMyCard,
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
