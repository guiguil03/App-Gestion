import { apiClient } from '@/lib/api/client';
import type { ProvisionedStaffAccount, StaffAccount } from '@/types/staff';

export const staffApi = {
  list: async () => (await apiClient.get<StaffAccount[]>('/staff')).data,
  create: async (input: { role: 'ENSEIGNANT' | 'SURVEILLANT'; firstName: string; lastName: string }) =>
    (await apiClient.post<ProvisionedStaffAccount>('/staff', input)).data,
  disable: async (userId: string) => (await apiClient.patch(`/staff/${userId}/disable`)).data,
};
