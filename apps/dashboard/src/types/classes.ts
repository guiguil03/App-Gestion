export type SchoolClass = {
  id: string;
  name: string;
  promotion: string;
  assignedTeachers: { id: string; username: string }[];
};

export type ImportClassesResult = { created: number; skipped: number; errors: { row: number; message: string }[] };
