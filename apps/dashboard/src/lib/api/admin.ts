import { apiClient } from '@/lib/api/client';
import type { AdminSchool, CreatedSchool } from '@/types/admin';

export const adminApi = {
  listSchools: async () => (await apiClient.get<AdminSchool[]>('/admin/schools')).data,
  createSchool: async (name: string) => (await apiClient.post<CreatedSchool>('/admin/schools', { name })).data,
  selectSchool: (schoolId: string) => fetch('/api/admin/select-school', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ schoolId }),
  }),
  exitSchool: () => fetch('/api/admin/select-school', { method: 'DELETE', credentials: 'include' }),
};
