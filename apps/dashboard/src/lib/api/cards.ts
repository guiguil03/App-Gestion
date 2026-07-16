import { apiClient } from '@/lib/api/client';
import type { IssueBatchResult, IssueCardResult, StudentCardStatus } from '@/types/cards';

export const cardsApi = {
  list: async () => (await apiClient.get<StudentCardStatus[]>('/cards')).data,
  issue: async (studentId: string) => (await apiClient.post<IssueCardResult>(`/cards/${studentId}/issue`)).data,
  issueBatch: async (schoolClassId: string) =>
    (await apiClient.post<IssueBatchResult>('/cards/issue-batch', { schoolClassId })).data,
  revoke: async (cardId: string) => (await apiClient.post(`/cards/${cardId}/revoke`)).data,
};
