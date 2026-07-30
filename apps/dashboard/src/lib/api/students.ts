import { apiClient } from '@/lib/api/client';
import type {
  CreateStudentInput,
  ImportStudentsResult,
  PaginatedStudents,
  ProvisionedAccount,
  ProvisionedParentAccount,
  Student,
  StudentsPageParams,
} from '@/types/students';

export const studentsApi = {
  list: async () => (await apiClient.get<Student[]>('/students')).data,
  listPaginated: async (params: StudentsPageParams) =>
    (await apiClient.get<PaginatedStudents>('/students', { params })).data,
  get: async (studentId: string) => (await apiClient.get<Student>(`/students/${studentId}`)).data,
  create: async (input: CreateStudentInput) => (await apiClient.post<Student>('/students', input)).data,
  importBulk: async (rows: Record<string, string>[]) =>
    (await apiClient.post<ImportStudentsResult>('/students/import', { rows })).data,
  remove: async (studentId: string) => (await apiClient.delete(`/students/${studentId}`)).data,
  provisionAccount: async (studentId: string) =>
    (await apiClient.post<ProvisionedAccount>(`/students/${studentId}/account`)).data,
  provisionParentAccount: async (studentId: string, parentGuardianId: string) =>
    (await apiClient.post<ProvisionedParentAccount>(`/students/${studentId}/parents/${parentGuardianId}/account`)).data,
};
