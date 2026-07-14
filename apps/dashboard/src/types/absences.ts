export type Absence = {
  id: string;
  date: string;
  justified: boolean;
  justificationReason: string | null;
  student: { id: string; firstName: string; lastName: string; schoolClassId: string };
};
