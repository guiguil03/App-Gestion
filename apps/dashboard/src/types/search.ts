export type SearchResults = {
  students: { id: string; fullName: string; schoolClassName: string }[];
  classes: { id: string; name: string; promotion: string }[];
  staff: { id: string; username: string; role: string; disabled: boolean }[];
};
