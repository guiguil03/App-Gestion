import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api/search';

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchApi.search(query),
    enabled: query.trim().length >= 2,
  });
}
