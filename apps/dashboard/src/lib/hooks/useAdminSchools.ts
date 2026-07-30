import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export function useAdminSchools() {
  return useQuery({ queryKey: ['admin', 'schools'], queryFn: adminApi.listSchools });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createSchool,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'schools'] }),
  });
}

export function useRenameSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, name }: { schoolId: string; name: string }) => adminApi.renameSchool(schoolId, name),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'schools'] }),
  });
}

export function useDeactivateSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (schoolId: string) => adminApi.deactivateSchool(schoolId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'schools'] }),
  });
}
