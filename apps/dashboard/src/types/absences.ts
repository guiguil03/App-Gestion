export type Absence = {
  id: string;
  date: string;
  justified: boolean;
  justificationReason: string | null;
  student: { id: string; firstName: string; lastName: string; schoolClassId: string };
};

export type PaginatedAbsences = { items: Absence[]; total: number; page: number; pageSize: number };

export type AbsencesPageParams = {
  schoolClassId?: string;
  search?: string;
  page: number;
  pageSize: number;
};
