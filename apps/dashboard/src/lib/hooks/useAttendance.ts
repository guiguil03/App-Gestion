import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance';
import type { ManualAttendanceInput, PresenceListParams } from '@/types/attendance';

/**
 * Pointages bruts d'une journée — clé sous `dashboard` pour être rafraîchie
 * automatiquement par `useDashboardStream` (invalidation SSE sur
 * `attendance.recorded`), comme le reste des données de la page d'accueil.
 */
export function usePresenceList(params: PresenceListParams) {
  return useQuery({
    queryKey: ['dashboard', 'presences', params],
    queryFn: () => attendanceApi.listForDay(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useRecordManualAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: string; input: ManualAttendanceInput }) =>
      attendanceApi.recordManual(studentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['absences'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
