export type AuditLogEntry = {
  id: string;
  schoolId: string | null;
  userId: string | null;
  username: string | null;
  role: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditLogParams = {
  startDate?: string;
  endDate?: string;
  action?: string;
};
