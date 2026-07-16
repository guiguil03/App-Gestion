import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cardsApi } from '@/lib/api/cards';

export function useCards() {
  return useQuery({ queryKey: ['cards'], queryFn: cardsApi.list });
}

export function useIssueCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => cardsApi.issue(studentId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });
}

export function useIssueBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (schoolClassId: string) => cardsApi.issueBatch(schoolClassId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });
}

export function useRevokeCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => cardsApi.revoke(cardId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });
}
