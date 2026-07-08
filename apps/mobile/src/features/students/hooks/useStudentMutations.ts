import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import type { StudentDetail, StudentInput } from '@/features/students/types';

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StudentInput) => {
      const { data } = await apiClient.post<StudentDetail>('/students', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUpdateStudent(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<StudentInput>) => {
      const { data } = await apiClient.patch<StudentDetail>(`/students/${studentId}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUploadStudentPhoto(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photo: { uri: string; fileName: string; mimeType: string }) => {
      const form = new FormData();
      // React Native's FormData accepts this shape directly (not a real Blob) — cast to satisfy TS.
      form.append('photo', { uri: photo.uri, name: photo.fileName, type: photo.mimeType } as unknown as Blob);
      const { data } = await apiClient.post<StudentDetail>(`/students/${studentId}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export type ProvisionedAccount = { username: string; password: string };

export function useProvisionStudentAccount(studentId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ProvisionedAccount>(`/students/${studentId}/account`);
      return data;
    },
  });
}
