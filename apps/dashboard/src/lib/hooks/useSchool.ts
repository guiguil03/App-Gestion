import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schoolApi } from '@/lib/api/school';

export function useSchoolProfile() {
  return useQuery({ queryKey: ['school', 'profile'], queryFn: schoolApi.getProfile });
}

export function useUpdateSchoolProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schoolApi.updateProfile,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['school', 'profile'] }),
  });
}

export function useUploadSchoolLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schoolApi.uploadLogo,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['school', 'profile'] }),
  });
}

export function useClosureDates() {
  return useQuery({ queryKey: ['school', 'closure-dates'], queryFn: schoolApi.listClosureDates });
}

export function useAddClosureDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schoolApi.addClosureDate,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['school', 'closure-dates'] }),
  });
}

export function useRemoveClosureDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schoolApi.removeClosureDate,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['school', 'closure-dates'] }),
  });
}

export function useSchoolEvents(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['school', 'events', startDate, endDate],
    queryFn: () => schoolApi.listEvents(startDate, endDate),
  });
}

export function useAddSchoolEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schoolApi.addEvent,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['school', 'events'] }),
  });
}

export function useRemoveSchoolEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schoolApi.removeEvent,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['school', 'events'] }),
  });
}
