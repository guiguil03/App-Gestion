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

export function useImportClasses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: Record<string, string>[]) => classesApi.importBulk(rows),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; promotion?: string } }) => classesApi.update(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useRemoveClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classesApi.remove(id),
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
