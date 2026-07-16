import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { absencesApi } from '@/lib/api/absences';

export function useAbsences() {
  return useQuery({ queryKey: ['absences'], queryFn: absencesApi.list });
}

export function useStudentAbsences(studentId: string | null) {
  return useQuery({
    queryKey: ['absences', 'student', studentId],
    queryFn: () => absencesApi.listByStudent(studentId as string),
    enabled: !!studentId,
  });
}

export function useJustifyAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => absencesApi.justify(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['absences'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'alerts'] });
    },
  });
}
