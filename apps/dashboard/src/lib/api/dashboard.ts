import { apiClient } from '@/lib/api/client';
import type { ClassComparison, DashboardAlerts, DashboardOverview, TrendPoint } from '@/types/dashboard';

export const dashboardApi = {
  getOverview: async () => (await apiClient.get<DashboardOverview>('/dashboard/overview')).data,
  getTrend: async (period: 'week' | 'month') =>
    (await apiClient.get<TrendPoint[]>('/dashboard/trend', { params: { period } })).data,
  getClassesComparison: async () => (await apiClient.get<ClassComparison[]>('/dashboard/classes-comparison')).data,
  getAlerts: async () => (await apiClient.get<DashboardAlerts>('/dashboard/alerts')).data,
};
