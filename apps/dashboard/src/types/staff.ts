export type StaffAccount = {
  id: string;
  username: string;
  role: 'ENSEIGNANT' | 'SURVEILLANT' | 'DIRECTION';
  disabledAt: string | null;
  assignedClasses: { id: string; name: string }[];
};

export type ProvisionedStaffAccount = { username: string; password: string };
