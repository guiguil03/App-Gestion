import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api/students';
import type { StudentsPageParams } from '@/types/students';

export function useStudents() {
  return useQuery({ queryKey: ['students'], queryFn: studentsApi.list });
}

/** Utilisée par la page Élèves (pagination + recherche côté serveur). Le
 * roster complet (useStudents) reste utilisé ailleurs (mobile, filtres). */
export function useStudentsPaginated(params: StudentsPageParams) {
  return useQuery({
    queryKey: ['students', 'paginated', params],
    queryFn: () => studentsApi.listPaginated(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useStudent(studentId: string | null) {
  return useQuery({
    queryKey: ['students', studentId],
    queryFn: () => studentsApi.get(studentId as string),
    enabled: !!studentId,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useProvisionStudentAccount() {
  return useMutation({ mutationFn: (studentId: string) => studentsApi.provisionAccount(studentId) });
}

export function useProvisionParentAccount() {
  return useMutation({
    mutationFn: ({ studentId, parentGuardianId }: { studentId: string; parentGuardianId: string }) =>
      studentsApi.provisionParentAccount(studentId, parentGuardianId),
  });
}
