import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

export type NotificationHistoryEntry = {
  id: string;
  createdAt: string;
  channel: 'SMS' | 'PUSH';
  status: 'SENT' | 'FAILED';
  kind: string | null;
  student: { id: string; firstName: string; lastName: string } | null;
};

/** Historique des SMS/push envoyés pour les enfants du parent connecté — voir /audit-logs/my-notifications (scopé côté backend, aucun id à fournir). */
export function useMyNotificationHistory() {
  return useQuery({
    queryKey: ['audit-logs', 'my-notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationHistoryEntry[]>('/audit-logs/my-notifications');
      return data;
    },
  });
}
