export type ParentGuardian = {
  id: string;
  fullName: string;
  relationship: string;
  phoneNumber: string;
  secondaryPhoneNumber: string | null;
  address: string | null;
  notificationChannel: 'PUSH' | 'SMS' | 'BOTH';
};

export type Student = {
  id: string;
  lastName: string;
  middleName: string | null;
  firstName: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
  photoUrl: string | null;
  schoolClassId: string;
  schoolClass: { id: string; name: string; promotion: string };
  parents: ParentGuardian[];
};

export type CreateStudentInput = {
  lastName: string;
  middleName?: string;
  firstName: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
  schoolClassId: string;
  parent?: {
    fullName: string;
    relationship: string;
    phoneNumber: string;
  };
};

export type ProvisionedAccount = { username: string; password: string };
export type ProvisionedParentAccount = { username: string; password: string | null; reused: boolean };
