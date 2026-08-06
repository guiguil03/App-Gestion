import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api/classes', () => ({ classesApi: { list: jest.fn() } }));
jest.mock('@/lib/api/students', () => ({ studentsApi: { list: jest.fn() } }));
jest.mock('@/lib/api/absences', () => ({ absencesApi: { create: jest.fn() } }));

import { classesApi } from '@/lib/api/classes';
import { studentsApi } from '@/lib/api/students';
import { absencesApi } from '@/lib/api/absences';
import { DeclareAbsencePanel } from './declare-absence-panel';

const schoolClass = { id: 'c1', name: '6e A', promotion: '2026' };
const student = {
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

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DeclareAbsencePanel />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (classesApi.list as jest.Mock).mockResolvedValue([schoolClass]);
  (studentsApi.list as jest.Mock).mockResolvedValue([student]);
  (absencesApi.create as jest.Mock).mockResolvedValue({ id: 'absence-1' });
});

describe('DeclareAbsencePanel', () => {
  it('is collapsed by default, showing only the trigger button', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /Déclarer une absence/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Déclarer' })).not.toBeInTheDocument();
  });

  it('declares an unjustified absence for the selected student and date once a class and student are picked', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: /Déclarer une absence/ }));
    const [classSelect, studentSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(classSelect, 'c1');
    await user.selectOptions(studentSelect, 's1');

    const submit = screen.getByRole('button', { name: 'Déclarer' });
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() =>
      expect(absencesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: 's1', justified: undefined, justificationReason: undefined }),
      ),
    );
  });

  it('includes the justification reason only when "déjà justifiée" is checked', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: /Déclarer une absence/ }));
    const [classSelect, studentSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(classSelect, 'c1');
    await user.selectOptions(studentSelect, 's1');
    await user.click(screen.getByRole('checkbox', { name: /déjà justifiée/ }));
    await user.type(screen.getByPlaceholderText(/Motif/), 'Rendez-vous médical');
    await user.click(screen.getByRole('button', { name: 'Déclarer' }));

    await waitFor(() =>
      expect(absencesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ justified: true, justificationReason: 'Rendez-vous médical' }),
      ),
    );
  });

  it('collapses back to the trigger button after a successful submission', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: /Déclarer une absence/ }));
    const [classSelect, studentSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(classSelect, 'c1');
    await user.selectOptions(studentSelect, 's1');
    await user.click(screen.getByRole('button', { name: 'Déclarer' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Déclarer' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Déclarer une absence/ })).toBeInTheDocument();
  });
});
