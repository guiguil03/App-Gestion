import { apiClient } from '@/lib/api/client';
import type { AdminAccount, ProvisionedAdminAccount } from '@/types/admin';

export const adminAccountsApi = {
  list: async () => (await apiClient.get<AdminAccount[]>('/admin/accounts')).data,
  create: async (input: { firstName: string; lastName: string }) =>
    (await apiClient.post<ProvisionedAdminAccount>('/admin/accounts', input)).data,
  disable: async (userId: string) => (await apiClient.patch(`/admin/accounts/${userId}/disable`)).data,
};
