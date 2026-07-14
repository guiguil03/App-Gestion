export const ABSENCE_MARKED_EVENT = 'absence.marked';

export class AbsenceMarkedEvent {
  constructor(
    public readonly absenceId: string,
    public readonly studentId: string,
    public readonly schoolId: string,
    public readonly date: string,
  ) {}
}
