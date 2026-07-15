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
