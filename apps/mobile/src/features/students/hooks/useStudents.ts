import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import type { StudentDetail } from '@/features/students/types';

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

async function fetchMyStudent(): Promise<StudentDetail> {
  const { data } = await apiClient.get<StudentDetail>('/students/me');
  return data;
}

/** Fiche d'identité de l'élève actuellement connecté (rôle ELEVE). */
export function useMyStudent() {
  return useQuery({
    queryKey: ['students', 'me'],
    queryFn: fetchMyStudent,
  });
}
