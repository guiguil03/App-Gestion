import { apiClient } from '@/lib/api/client';
import type { SchoolClass } from '@/types/classes';

export const classesApi = {
  list: async () => (await apiClient.get<SchoolClass[]>('/classes')).data,
  create: async (input: { name: string; promotion: string }) => (await apiClient.post<SchoolClass>('/classes', input)).data,
  update: async (id: string, input: { name?: string; promotion?: string }) =>
    (await apiClient.patch<SchoolClass>(`/classes/${id}`, input)).data,
  remove: async (id: string) => (await apiClient.delete(`/classes/${id}`)).data,
  assignTeacher: async (classId: string, userId: string) => (await apiClient.post(`/classes/${classId}/teachers/${userId}`)).data,
  unassignTeacher: async (classId: string, userId: string) => (await apiClient.delete(`/classes/${classId}/teachers/${userId}`)).data,
};
