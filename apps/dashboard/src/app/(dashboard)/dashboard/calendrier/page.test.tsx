import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api/school', () => ({
  schoolApi: {
    getProfile: jest.fn(),
    listClosureDates: jest.fn(),
    listEvents: jest.fn(),
    addEvent: jest.fn(),
    removeEvent: jest.fn(),
  },
}));

import { schoolApi } from '@/lib/api/school';
import CalendrierPage from './page';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Le 15 du mois en cours existe toujours et n'est jamais un jour de
// débordement (mois précédent/suivant) — évite de dépendre d'une date système
// figée pour cibler une cellule précise de la grille.
const today = new Date();
const MID_MONTH_KEY = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-15`;
const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const CURRENT_MONTH_LABEL = `${MONTH_LABELS[today.getMonth()]} ${today.getFullYear()}`;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CalendrierPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (schoolApi.listEvents as jest.Mock).mockResolvedValue([]);
  (schoolApi.addEvent as jest.Mock).mockResolvedValue({ id: 'event-1' });
  (schoolApi.removeEvent as jest.Mock).mockResolvedValue(undefined);
});

describe('CalendrierPage', () => {
  it('renders the current month grid with weekday headers', async () => {
    renderPage();

    await waitFor(() => expect(schoolApi.listEvents).toHaveBeenCalled());
    expect(screen.getByText(CURRENT_MONTH_LABEL)).toBeInTheDocument();
    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.getByText('Dim')).toBeInTheDocument();
  });

  it('shows events on their day as chips', async () => {
    (schoolApi.listEvents as jest.Mock).mockResolvedValue([
      { id: 'event-1', schoolId: 'school-1', date: MID_MONTH_KEY, title: 'Sortie musée', description: null, createdAt: '2026-08-01T00:00:00Z' },
    ]);
    renderPage();

    expect(await screen.findByText('Sortie musée')).toBeInTheDocument();
  });

  it('opens the day panel and adds a new event', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(schoolApi.listEvents).toHaveBeenCalled());

    await user.click(screen.getByLabelText(MID_MONTH_KEY));
    await user.type(screen.getByPlaceholderText(/Titre/), 'Réunion parents');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => expect(schoolApi.addEvent).toHaveBeenCalled());
    expect((schoolApi.addEvent as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({ date: MID_MONTH_KEY, title: 'Réunion parents' }),
    );
  });

  it('removes an event from the day panel', async () => {
    (schoolApi.listEvents as jest.Mock).mockResolvedValue([
      { id: 'event-1', schoolId: 'school-1', date: MID_MONTH_KEY, title: 'Sortie musée', description: null, createdAt: '2026-08-01T00:00:00Z' },
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByLabelText(MID_MONTH_KEY));
    expect(await screen.findAllByText('Sortie musée')).toHaveLength(2); // chip in the grid + row in the day panel
    const trashButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-trash2'));
    expect(trashButton).toBeDefined();
    await user.click(trashButton!);

    await waitFor(() => expect(schoolApi.removeEvent).toHaveBeenCalled());
    expect((schoolApi.removeEvent as jest.Mock).mock.calls[0][0]).toBe('event-1');
  });

  it('navigates to the next month', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(schoolApi.listEvents).toHaveBeenCalled());

    await user.click(screen.getByLabelText('Mois suivant'));

    const nextMonthIndex = (today.getMonth() + 1) % 12;
    const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    expect(await screen.findByText(`${MONTH_LABELS[nextMonthIndex]} ${nextMonthYear}`)).toBeInTheDocument();
  });
});
