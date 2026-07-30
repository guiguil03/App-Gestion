import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAccountsApi } from '@/lib/api/admin-accounts';

export function useAdminAccounts() {
  return useQuery({ queryKey: ['admin', 'accounts'], queryFn: adminAccountsApi.list });
}

export function useCreateAdminAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAccountsApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] }),
  });
}

export function useDisableAdminAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAccountsApi.disable,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] }),
  });
}
