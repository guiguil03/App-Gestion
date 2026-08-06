import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
jest.mock('@/lib/api/search', () => ({ searchApi: { search: jest.fn() } }));

import { searchApi } from '@/lib/api/search';
import { GlobalSearch } from './global-search';

function renderSearch() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <GlobalSearch />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GlobalSearch', () => {
  it('does not search for a single character', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByPlaceholderText(/Rechercher/), 'a');

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(searchApi.search).not.toHaveBeenCalled();
  });

  it('shows categorized results and navigates to a student on click', async () => {
    (searchApi.search as jest.Mock).mockResolvedValue({
      students: [{ id: 's1', fullName: 'Jane Doe', schoolClassName: '6e A' }],
      classes: [],
      staff: [],
    });
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByPlaceholderText(/Rechercher/), 'doe');

    const result = await screen.findByText('Jane Doe');
    await user.click(result);

    expect(pushMock).toHaveBeenCalledWith('/dashboard/eleves/s1');
  });

  it('navigates to the classes list page when clicking a class result', async () => {
    (searchApi.search as jest.Mock).mockResolvedValue({
      students: [],
      classes: [{ id: 'c1', name: '6e A', promotion: '2026' }],
      staff: [],
    });
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByPlaceholderText(/Rechercher/), '6e a');
    await user.click(await screen.findByText('6e A'));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/classes');
  });

  it('shows "Aucun résultat" when nothing matches', async () => {
    (searchApi.search as jest.Mock).mockResolvedValue({ students: [], classes: [], staff: [] });
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByPlaceholderText(/Rechercher/), 'zzz');

    expect(await screen.findByText('Aucun résultat.')).toBeInTheDocument();
  });
});
