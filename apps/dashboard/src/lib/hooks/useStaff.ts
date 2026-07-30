import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '@/lib/api/staff';

export function useStaff() {
  return useQuery({ queryKey: ['staff'], queryFn: staffApi.list });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useResetStaffPassword() {
  return useMutation({ mutationFn: (userId: string) => staffApi.resetPassword(userId) });
}

export function useDisableStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffApi.disable,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });
}
