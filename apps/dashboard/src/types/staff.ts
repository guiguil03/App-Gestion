export type StaffAccount = {
  id: string;
  username: string;
  role: 'ENSEIGNANT' | 'SURVEILLANT';
  disabledAt: string | null;
  assignedClasses: { id: string; name: string }[];
};

export type ProvisionedStaffAccount = { username: string; password: string };
