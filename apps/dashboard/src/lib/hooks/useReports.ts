import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import type { AttendanceHistoryParams, AttendanceSummaryParams } from '@/types/reports';

export function useAttendanceSummary(params: AttendanceSummaryParams) {
  return useQuery({
    queryKey: ['reports', 'attendance-summary', params],
    queryFn: () => reportsApi.attendanceSummary(params),
  });
}

export function useAttendanceHistory(params: AttendanceHistoryParams) {
  return useQuery({
    queryKey: ['reports', 'attendance-history', params],
    queryFn: () => reportsApi.attendanceHistory(params),
  });
}
