import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api/students';

export function useStudents() {
  return useQuery({ queryKey: ['students'], queryFn: studentsApi.list });
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
