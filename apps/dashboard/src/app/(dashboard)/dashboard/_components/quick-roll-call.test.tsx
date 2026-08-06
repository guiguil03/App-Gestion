import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api/classes', () => ({ classesApi: { list: jest.fn() } }));
jest.mock('@/lib/api/students', () => ({ studentsApi: { list: jest.fn() } }));
jest.mock('@/lib/api/attendance', () => ({ attendanceApi: { listForDay: jest.fn(), recordManual: jest.fn() } }));

import { classesApi } from '@/lib/api/classes';
import { studentsApi } from '@/lib/api/students';
import { attendanceApi } from '@/lib/api/attendance';
import { QuickRollCall } from './quick-roll-call';

const schoolClass = { id: 'c1', name: '6e A', promotion: '2026' };
const studentA = {
  id: 's1',
  lastName: 'Doe',
  middleName: null,
  firstName: 'Jane',
  sex: 'F' as const,
  dateOfBirth: '2015-01-01',
  photoUrl: null,
  schoolClassId: 'c1',
  schoolClass,
  parents: [],
};
const studentB = {
  id: 's2',
  lastName: 'Martin',
  middleName: null,
  firstName: 'Paul',
  sex: 'M' as const,
  dateOfBirth: '2015-02-01',
  photoUrl: null,
  schoolClassId: 'c1',
  schoolClass,
  parents: [],
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

async function selectClass(user: ReturnType<typeof userEvent.setup>) {
  const option = await screen.findByRole('option', { name: schoolClass.name });
  const select = screen.getByRole('combobox');
  await user.selectOptions(select, option);
}

beforeEach(() => {
  jest.clearAllMocks();
  (classesApi.list as jest.Mock).mockResolvedValue([schoolClass]);
  (studentsApi.list as jest.Mock).mockResolvedValue([studentA, studentB]);
  (attendanceApi.listForDay as jest.Mock).mockResolvedValue([]);
  (attendanceApi.recordManual as jest.Mock).mockResolvedValue({});
  window.confirm = jest.fn().mockReturnValue(true);
});

describe('QuickRollCall — mark all present', () => {
  it('records manual attendance for every unmarked student in the selected class after confirmation', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<QuickRollCall />);
    await selectClass(user);

    const bulkButton = await screen.findByRole('button', { name: 'Marquer les 2 restant(s) présent(s)' });
    await user.click(bulkButton);

    await waitFor(() => expect(attendanceApi.recordManual).toHaveBeenCalledTimes(2));
    expect(attendanceApi.recordManual).toHaveBeenCalledWith('s1', expect.objectContaining({ isLate: false }));
    expect(attendanceApi.recordManual).toHaveBeenCalledWith('s2', expect.objectContaining({ isLate: false }));
  });

  it('does nothing when the confirmation dialog is dismissed', async () => {
    window.confirm = jest.fn().mockReturnValue(false);
    const user = userEvent.setup();
    renderWithQueryClient(<QuickRollCall />);
    await selectClass(user);

    const bulkButton = await screen.findByRole('button', { name: 'Marquer les 2 restant(s) présent(s)' });
    await user.click(bulkButton);

    expect(attendanceApi.recordManual).not.toHaveBeenCalled();
  });

  it('surfaces a summary error when some students fail to be marked', async () => {
    (attendanceApi.recordManual as jest.Mock).mockImplementation((studentId: string) =>
      studentId === 's2' ? Promise.reject(new Error('boom')) : Promise.resolve({}),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<QuickRollCall />);
    await selectClass(user);

    const bulkButton = await screen.findByRole('button', { name: 'Marquer les 2 restant(s) présent(s)' });
    await user.click(bulkButton);

    expect(await screen.findByText('1 pointage(s) sur 2 ont échoué. Réessaie pour les élèves concernés.')).toBeInTheDocument();
  });

  it('hides the bulk-mark button once every student in the class already has a record today', async () => {
    (attendanceApi.listForDay as jest.Mock).mockResolvedValue([
      { id: 'r1', student: studentA, checkpoint: 'CLASSE', direction: 'ENTREE', recordedAt: new Date().toISOString(), isLate: false, isManual: true },
      { id: 'r2', student: studentB, checkpoint: 'CLASSE', direction: 'ENTREE', recordedAt: new Date().toISOString(), isLate: false, isManual: true },
    ]);
    const user = userEvent.setup();
    renderWithQueryClient(<QuickRollCall />);
    await selectClass(user);

    await screen.findByText('Doe Jane');
    expect(screen.queryByRole('button', { name: /Marquer les/ })).not.toBeInTheDocument();
  });
});
