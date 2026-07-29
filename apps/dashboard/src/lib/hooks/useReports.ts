import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import type { AttendanceSummaryParams } from '@/types/reports';

export function useAttendanceSummary(params: AttendanceSummaryParams) {
  return useQuery({
    queryKey: ['reports', 'attendance-summary', params],
    queryFn: () => reportsApi.attendanceSummary(params),
  });
}
