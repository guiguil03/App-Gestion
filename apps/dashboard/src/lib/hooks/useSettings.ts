import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';

export function useAttendanceSettings() {
  return useQuery({ queryKey: ['settings', 'attendance'], queryFn: settingsApi.get });
}

export function useUpdateAttendanceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['settings', 'attendance'] }),
  });
}
