import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import type { StudentDetail } from '@/features/students/types';
import { readCache, writeCache } from '@/services/offlineCache';

const MY_STUDENT_CACHE_KEY = 'students.me';

async function fetchStudents(schoolClassId: string | null): Promise<StudentDetail[]> {
  const { data } = await apiClient.get<StudentDetail[]>('/students', {
    params: schoolClassId ? { schoolClassId } : undefined,
  });
  return data;
}

/** Liste des élèves d'une classe (DIRECTION uniquement, en ligne). */
export function useStudents(schoolClassId: string | null) {
  return useQuery({
    queryKey: ['students', schoolClassId],
    queryFn: () => fetchStudents(schoolClassId),
    enabled: !!schoolClassId,
  });
}

async function searchStudents(search: string): Promise<StudentDetail[]> {
  const { data } = await apiClient.get<{ items: StudentDetail[] }>('/students', {
    params: { page: 1, pageSize: 50, search },
  });
  return data.items;
}

/** Recherche par nom (toutes classes confondues) — bascule utilisée quand la recherche texte est active plutôt que le filtre par classe. */
export function useSearchStudents(search: string) {
  const trimmed = search.trim();
  return useQuery({
    queryKey: ['students', 'search', trimmed],
    queryFn: () => searchStudents(trimmed),
    enabled: trimmed.length > 0,
  });
}

async function fetchStudent(studentId: string): Promise<StudentDetail> {
  const { data } = await apiClient.get<StudentDetail>(`/students/${studentId}`);
  return data;
}

export function useStudent(studentId: string | null) {
  return useQuery({
    queryKey: ['students', 'detail', studentId],
    queryFn: () => fetchStudent(studentId as string),
    enabled: !!studentId,
  });
}

// `Ma carte` doit rester consultable hors ligne (l'élève peut vouloir la
// montrer sans réseau au portail) : on retente le cache local dès que le
// réseau échoue, plutôt que de laisser l'écran planté sur un état d'erreur.
async function fetchMyStudent(): Promise<StudentDetail> {
  try {
    const { data } = await apiClient.get<StudentDetail>('/students/me');
    void writeCache(MY_STUDENT_CACHE_KEY, data);
    return data;
  } catch (error) {
    const cached = await readCache<StudentDetail>(MY_STUDENT_CACHE_KEY);
    if (cached) return cached;
    throw error;
  }
}

/** Fiche d'identité de l'élève actuellement connecté (rôle ELEVE). */
export function useMyStudent() {
  return useQuery({
    queryKey: ['students', 'me'],
    queryFn: fetchMyStudent,
  });
}
