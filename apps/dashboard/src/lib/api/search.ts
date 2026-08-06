import { apiClient } from '@/lib/api/client';
import type { SearchResults } from '@/types/search';

export const searchApi = {
  search: async (query: string) => (await apiClient.get<SearchResults>('/search', { params: { q: query } })).data,
};
