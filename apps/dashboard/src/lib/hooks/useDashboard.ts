import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';

export function useOverview() {
  return useQuery({ queryKey: ['dashboard', 'overview'], queryFn: dashboardApi.getOverview, refetchInterval: 30_000 });
}

export function useTrend(period: 'week' | 'month') {
  return useQuery({ queryKey: ['dashboard', 'trend', period], queryFn: () => dashboardApi.getTrend(period) });
}

export function useClassesComparison() {
  return useQuery({
    queryKey: ['dashboard', 'classes-comparison'],
    queryFn: dashboardApi.getClassesComparison,
    refetchInterval: 30_000,
  });
}

export function useAlerts() {
  return useQuery({ queryKey: ['dashboard', 'alerts'], queryFn: dashboardApi.getAlerts, refetchInterval: 30_000 });
}
