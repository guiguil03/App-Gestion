import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '@/lib/api/classes';

export function useClasses() {
  return useQuery({ queryKey: ['classes'], queryFn: classesApi.list });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useAssignTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, userId }: { classId: string; userId: string }) => classesApi.assignTeacher(classId, userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useUnassignTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, userId }: { classId: string; userId: string }) => classesApi.unassignTeacher(classId, userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}
