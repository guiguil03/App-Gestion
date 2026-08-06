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

export type SchoolEvent = {
  id: string;
  schoolId: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  description: string | null;
  createdAt: string;
};

export type CreateSchoolEventInput = {
  date: string;
  title: string;
  description?: string;
};
