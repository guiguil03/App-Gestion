import { apiClient } from '@/lib/api/client';
import type { AuditLogEntry, AuditLogParams } from '@/types/audit';

export const auditApi = {
  list: async (params: AuditLogParams) => (await apiClient.get<AuditLogEntry[]>('/audit-logs', { params })).data,
};
