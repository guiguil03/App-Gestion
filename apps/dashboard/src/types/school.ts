export type SchoolProfile = {
  name: string;
  address: string | null;
  directorName: string | null;
  logoUrl: string | null;
};

export type UpdateSchoolProfileInput = {
  name?: string;
  address?: string | null;
  directorName?: string | null;
};

export type SchoolClosureDate = {
  id: string;
  schoolId: string;
  date: string; // "YYYY-MM-DD"
  label: string | null;
};
