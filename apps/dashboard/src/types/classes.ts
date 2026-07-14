export type SchoolClass = {
  id: string;
  name: string;
  promotion: string;
  assignedTeachers: { id: string; username: string }[];
};
