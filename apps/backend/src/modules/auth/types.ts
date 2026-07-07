export type Role = 'ADMIN' | 'DIRECTION' | 'ENSEIGNANT' | 'SURVEILLANT' | 'PARENT';

export type AuthenticatedUser = {
  userId: string;
  username: string;
  role: Role;
  schoolId: string | null;
};
