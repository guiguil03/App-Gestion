import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api/classes', () => ({ classesApi: { list: jest.fn() } }));
jest.mock('@/lib/api/students', () => ({ studentsApi: { list: jest.fn() } }));
jest.mock('@/lib/api/attendance', () => ({
  attendanceApi: { listForDay: jest.fn(), recordManual: jest.fn(), removeRecord: jest.fn(), updateRecord: jest.fn() },
}));
jest.mock('@/lib/reports/export', () => ({
  exportPresenceListPdf: jest.fn(),
  exportPresenceListExcel: jest.fn(),
}));

import { classesApi } from '@/lib/api/classes';
import { studentsApi } from '@/lib/api/students';
import { attendanceApi } from '@/lib/api/attendance';
import { exportPresenceListExcel, exportPresenceListPdf } from '@/lib/reports/export';
import PresencesPage from './page';

const schoolClass = { id: 'c1', name: '6e A', promotion: '2026' };
const scanRecord = {
  id: 'r1',
  student: { id: 's1', lastName: 'Doe', middleName: null, firstName: 'Jane', schoolClass },
  checkpoint: 'PORTAIL' as const,
  direction: 'ENTREE' as const,
  recordedAt: '2026-08-06T07:00:00.000Z',
  isLate: false,
  isManual: false,
};
const manualRecord = {
  id: 'r2',
  student: { id: 's2', lastName: 'Martin', middleName: null, firstName: 'Paul', schoolClass },
  checkpoint: 'PORTAIL' as const,
  direction: 'ENTREE' as const,
  recordedAt: '2026-08-06T07:05:00.000Z',
  isLate: false,
  isManual: true,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PresencesPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (classesApi.list as jest.Mock).mockResolvedValue([schoolClass]);
  (studentsApi.list as jest.Mock).mockResolvedValue([]);
  (attendanceApi.listForDay as jest.Mock).mockResolvedValue([scanRecord, manualRecord]);
  (attendanceApi.removeRecord as jest.Mock).mockResolvedValue({ success: true });
  (attendanceApi.updateRecord as jest.Mock).mockResolvedValue({ success: true });
  window.confirm = jest.fn().mockReturnValue(true);
});

describe('PresencesPage — delete a manual record', () => {
  it('only shows a delete button for manual entries, not real scans', async () => {
    renderPage();

    await screen.findByText('Jane Doe');
    const deleteButtons = screen.getAllByTitle('Supprimer ce pointage manuel erroné');
    expect(deleteButtons).toHaveLength(1);
  });

  it('deletes the record after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Jane Doe');
    await user.click(screen.getByTitle('Supprimer ce pointage manuel erroné'));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(attendanceApi.removeRecord).toHaveBeenCalledWith('r2'));
  });

  it('does not delete when the confirmation is dismissed', async () => {
    window.confirm = jest.fn().mockReturnValue(false);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Jane Doe');
    await user.click(screen.getByTitle('Supprimer ce pointage manuel erroné'));

    expect(attendanceApi.removeRecord).not.toHaveBeenCalled();
  });
});

describe('PresencesPage — edit a manual record', () => {
  it('only shows an edit button for manual entries, not real scans', async () => {
    renderPage();

    await screen.findByText('Jane Doe');
    expect(screen.getAllByTitle("Corriger l'heure/le retard de ce pointage manuel")).toHaveLength(1);
  });

  it('saves the new time and late status, for the date currently selected on the page', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Jane Doe');
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-08-06' } });

    await user.click(screen.getByTitle("Corriger l'heure/le retard de ce pointage manuel"));
    const timeInput = screen.getByDisplayValue(/^\d{2}:\d{2}$/);
    fireEvent.change(timeInput, { target: { value: '08:30' } });
    await user.click(screen.getByRole('checkbox', { name: /En retard/ }));
    await user.click(screen.getByTitle('Enregistrer'));

    await waitFor(() =>
      expect(attendanceApi.updateRecord).toHaveBeenCalledWith('r2', { date: '2026-08-06', time: '08:30', isLate: true }),
    );
  });

  it('closes the editor without saving when cancelled', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Jane Doe');
    await user.click(screen.getByTitle("Corriger l'heure/le retard de ce pointage manuel"));
    await user.click(screen.getByTitle('Annuler'));

    expect(attendanceApi.updateRecord).not.toHaveBeenCalled();
    expect(screen.queryByTitle('Enregistrer')).not.toBeInTheDocument();
  });
});

describe('PresencesPage — export', () => {
  it('exports the currently loaded rows to PDF', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Jane Doe');
    await user.click(screen.getByRole('button', { name: /PDF/ }));

    expect(exportPresenceListPdf).toHaveBeenCalledWith([scanRecord, manualRecord], expect.any(String), expect.stringContaining('.pdf'));
  });

  it('exports the currently loaded rows to Excel', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Jane Doe');
    await user.click(screen.getByRole('button', { name: /Excel/ }));

    expect(exportPresenceListExcel).toHaveBeenCalledWith([scanRecord, manualRecord], expect.stringContaining('.xlsx'));
  });

  it('disables the export buttons when there is nothing to export', async () => {
    (attendanceApi.listForDay as jest.Mock).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole('button', { name: /PDF/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Excel/ })).toBeDisabled();
  });
});
