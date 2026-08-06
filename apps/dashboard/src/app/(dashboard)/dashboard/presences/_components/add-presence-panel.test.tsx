import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api/students', () => ({ studentsApi: { list: jest.fn() } }));
jest.mock('@/lib/api/attendance', () => ({ attendanceApi: { listForDay: jest.fn(), recordManual: jest.fn() } }));

import { studentsApi } from '@/lib/api/students';
import { attendanceApi } from '@/lib/api/attendance';
import { AddPresencePanel } from './add-presence-panel';
import type { PresenceRecord } from '@/types/attendance';

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

function renderPanel(existingRecords: PresenceRecord[] = []) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AddPresencePanel date="2026-08-06" schoolClassId="c1" className="6e A" existingRecords={existingRecords} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (studentsApi.list as jest.Mock).mockResolvedValue([studentA, studentB]);
  (attendanceApi.recordManual as jest.Mock).mockResolvedValue({});
  window.confirm = jest.fn().mockReturnValue(true);
});

describe('AddPresencePanel', () => {
  it('lists students of the class with no record yet for the selected date', async () => {
    renderPanel([]);

    expect(await screen.findByText('Doe Jane')).toBeInTheDocument();
    expect(screen.getByText('Martin Paul')).toBeInTheDocument();
  });

  it('excludes a student who already has a record for that date', async () => {
    renderPanel([
      {
        id: 'r1',
        student: studentA,
        checkpoint: 'CLASSE',
        direction: 'ENTREE',
        recordedAt: '2026-08-06T08:00:00.000Z',
        isLate: false,
        isManual: true,
      },
    ]);

    expect(await screen.findByText('Martin Paul')).toBeInTheDocument();
    expect(screen.queryByText('Doe Jane')).not.toBeInTheDocument();
  });

  it('records a manual attendance for the selected date when clicking "Présent"', async () => {
    const user = userEvent.setup();
    renderPanel([]);

    const row = (await screen.findByText('Doe Jane')).closest('div')!.parentElement!;
    await user.click(within(row).getByRole('button', { name: 'Présent' }));

    await waitFor(() =>
      expect(attendanceApi.recordManual).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ date: '2026-08-06', isLate: false }),
      ),
    );
  });

  it('bulk-marks every unmarked student present after confirmation', async () => {
    const user = userEvent.setup();
    renderPanel([]);

    const bulkButton = await screen.findByRole('button', { name: 'Marquer les 2 restant(s) présent(s)' });
    await user.click(bulkButton);

    await waitFor(() => expect(attendanceApi.recordManual).toHaveBeenCalledTimes(2));
    expect(attendanceApi.recordManual).toHaveBeenCalledWith('s1', expect.objectContaining({ date: '2026-08-06', isLate: false }));
    expect(attendanceApi.recordManual).toHaveBeenCalledWith('s2', expect.objectContaining({ date: '2026-08-06', isLate: false }));
  });

  it('renders nothing when the class has no students at all', () => {
    (studentsApi.list as jest.Mock).mockResolvedValue([]);
    const { container } = renderPanel([]);

    expect(container).toBeEmptyDOMElement();
  });
});
