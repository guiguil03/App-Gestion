import { apiClient } from '@/lib/api/client';
import type { SchoolClosureDate, SchoolProfile, UpdateSchoolProfileInput } from '@/types/school';

export const schoolApi = {
  getProfile: async () => (await apiClient.get<SchoolProfile>('/schools/profile')).data,
  updateProfile: async (input: UpdateSchoolProfileInput) =>
    (await apiClient.patch<SchoolProfile>('/schools/profile', input)).data,
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return (await apiClient.post<{ logoUrl: string }>('/schools/logo', formData)).data;
  },
  listClosureDates: async () => (await apiClient.get<SchoolClosureDate[]>('/schools/closure-dates')).data,
  addClosureDate: async (input: { date: string; label?: string }) =>
    (await apiClient.post<SchoolClosureDate>('/schools/closure-dates', input)).data,
  removeClosureDate: async (id: string) => {
    await apiClient.delete(`/schools/closure-dates/${id}`);
  },
};
