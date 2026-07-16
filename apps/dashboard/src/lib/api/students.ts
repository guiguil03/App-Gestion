import { apiClient } from '@/lib/api/client';
import type { CreateStudentInput, ProvisionedAccount, ProvisionedParentAccount, Student } from '@/types/students';

export const studentsApi = {
  list: async () => (await apiClient.get<Student[]>('/students')).data,
  get: async (studentId: string) => (await apiClient.get<Student>(`/students/${studentId}`)).data,
  create: async (input: CreateStudentInput) => (await apiClient.post<Student>('/students', input)).data,
  provisionAccount: async (studentId: string) =>
    (await apiClient.post<ProvisionedAccount>(`/students/${studentId}/account`)).data,
  provisionParentAccount: async (studentId: string, parentGuardianId: string) =>
    (await apiClient.post<ProvisionedParentAccount>(`/students/${studentId}/parents/${parentGuardianId}/account`)).data,
};
